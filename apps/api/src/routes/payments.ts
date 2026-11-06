import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import Stripe from 'stripe'
import { db, schema } from '../db'
import { eq, and, desc, sql } from 'drizzle-orm'
import { ok, badRequest, unauthorised, notFound, serverError } from '../utils/response'
import { requireAuth, requireRole } from '../middleware/auth'
import { generateApplicationRef } from '../utils/referenceId'
import { initializeTransaction, verifyTransaction, verifyWebhookSignature } from '../utils/paystack'
import { enqueueEmail } from '../jobs/queue'
import { broadcastToUser } from './messaging'
import {
  paymentConfirmationEmail,
  consultationBookingEmail,
  mentorshipWelcomeEmail,
} from '../utils/email'

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key)
}

// Subscription pricing IDs are set in Stripe Dashboard and stored in env vars
const STRIPE_PRICES = {
  premium_monthly_general: process.env.STRIPE_PRICE_PREMIUM_MONTHLY_GENERAL || '',
  premium_yearly_general: process.env.STRIPE_PRICE_PREMIUM_YEARLY_GENERAL || '',
  premium_monthly_regional: process.env.STRIPE_PRICE_PREMIUM_MONTHLY_REGIONAL || '',
  premium_yearly_regional: process.env.STRIPE_PRICE_PREMIUM_YEARLY_REGIONAL || '',
}

const createCheckoutSchema = z.object({
  purpose: z.enum(['premium', 'oppdate_apply', 'consultation', 'mentorship']),
  gateway: z.enum(['stripe', 'paystack']).default('stripe'),
  // For premium subscriptions
  plan: z.enum(['monthly', 'yearly']).optional(),
  tier: z.enum(['general', 'regional']).optional(),
  // For OppDate Apply / consultation / mentorship -- the ID of what's being paid for
  referenceId: z.string().uuid().optional(),
})

const webhookSignatureHeader = 'stripe-signature'

export async function paymentRoutes(server: FastifyInstance) {
  // GET /api/v1/payments -- list user's payments (or all for admin)
  server.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string; role: string }

    const isAdmin = ['staff_admin', 'manager_admin', 'super_admin'].includes(user.role)

    const rows = isAdmin
      ? await db
          .select()
          .from(schema.payments)
          .orderBy(desc(schema.payments.createdAt))
          .limit(100)
      : await db
          .select()
          .from(schema.payments)
          .where(eq(schema.payments.userId, user.id))
          .orderBy(desc(schema.payments.createdAt))

    return ok(reply, rows)
  })

  // GET /api/v1/payments/:id -- payment detail
  server.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string; role: string }
    const { id } = request.params as { id: string }

    const [payment] = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.id, id))
      .limit(1)

    if (!payment) return notFound(reply, 'Payment')

    const isAdmin = ['staff_admin', 'manager_admin', 'super_admin'].includes(user.role)
    if (!isAdmin && payment.userId !== user.id) return notFound(reply, 'Payment')

    return ok(reply, payment)
  })

  // GET /api/v1/payments/pricing-tier -- IP-based regional pricing determination
  server.get('/pricing-tier', async (request, reply) => {
    const geoip = await import('geoip-lite')

    // Regional countries by ISO code (matches SOW pricing structure)
    const REGIONAL_COUNTRIES = new Set([
      'NG', 'GH', 'KE', 'UG', 'TZ', 'RW', 'ET', 'ZM', 'ZW', 'MW',
      'CM', 'SN', 'CI', 'EG', 'BW', 'NA',
      'IN', 'PK', 'BD', 'NP', 'LK', 'PH', 'ID', 'VN', 'KH', 'MM',
    ])

    const ip = request.ip
    const geo = geoip.default.lookup(ip)
    const country = geo?.country ?? null
    const tier = country && REGIONAL_COUNTRIES.has(country) ? 'regional' : 'general'

    return ok(reply, { tier, country })
  })

  // POST /api/v1/payments/verify-session -- called by frontend after Stripe redirect to confirm payment
  // Idempotent: runs the same activation logic as the webhook. Works for all purposes.
  server.post('/verify-session', { preHandler: [requireAuth] }, async (request, reply) => {
    const { sessionId } = request.body as { sessionId?: string }

    if (!sessionId) return badRequest(reply, 'sessionId is required.')

    const stripe = getStripeClient()
    if (!stripe) return badRequest(reply, 'Stripe not configured.')

    let session: import('stripe').default.Checkout.Session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId)
    } catch {
      return badRequest(reply, 'Could not retrieve Stripe session.')
    }

    if (session.payment_status !== 'paid') {
      return reply.status(202).send({ success: false, retryable: true, error: 'Payment not yet confirmed by Stripe.' })
    }

    // Check if already processed via payment record status
    const [existing] = await db
      .select({ status: schema.payments.status })
      .from(schema.payments)
      .where(eq(schema.payments.gatewayPaymentId, session.id))
      .limit(1)

    if (existing?.status === 'succeeded') {
      return ok(reply, { alreadyProcessed: true })
    }

    // Payment confirmed — run the same handler as the webhook
    await handleCheckoutCompleted(server, session)

    return ok(reply, { alreadyProcessed: false })
  })

  // POST /api/v1/payments/checkout -- create Stripe Checkout Session
  server.post('/checkout', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string; email: string }
    const body = createCheckoutSchema.safeParse(request.body)
    if (!body.success) return badRequest(reply, body.error.errors[0].message)

    const { purpose, gateway, plan, tier, referenceId } = body.data

    const webUrl = process.env.WEB_URL || 'http://localhost:3000'

    // Paystack checkout flow
    if (gateway === 'paystack') {
      return handlePaystackCheckout(request, reply, {
        userId: user.id,
        email: user.email,
        purpose,
        plan,
        tier,
        referenceId,
        webUrl,
      })
    }

    const stripe = getStripeClient()
    if (!stripe) return badRequest(reply, 'Stripe payments are not configured. Please contact support.')

    if (purpose === 'premium') {
      if (!plan || !tier) return badRequest(reply, 'plan and tier are required for premium subscriptions.')

      const priceKey = `premium_${plan}_${tier}` as keyof typeof STRIPE_PRICES
      const priceId = STRIPE_PRICES[priceKey]
      if (!priceId) return badRequest(reply, 'Invalid subscription plan configuration.')

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: user.email,
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: {
          userId: user.id,
          purpose: 'premium',
          plan,
          tier,
        },
        success_url: `${webUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${webUrl}/pricing?payment=cancelled`,
      })

      // Record pending payment
      await db.insert(schema.payments).values({
        userId: user.id,
        purpose: 'premium',
        referenceId: user.id, // for premium, reference is the user themselves
        gateway: 'stripe',
        gatewayPaymentId: session.id,
        amountUsd: 0, // updated on webhook confirmation
        status: 'pending',
        metadata: { plan, tier, checkoutSessionId: session.id },
      })

      return ok(reply, { checkoutUrl: session.url, sessionId: session.id })
    }

    // One-time payments (OppDate Apply, Consultation, Mentorship)
    if (!referenceId) return badRequest(reply, 'referenceId is required for this payment type.')

    let amountCents = 0
    let productName = ''

    if (purpose === 'oppdate_apply') {
      const [app] = await db
        .select({
          id: schema.applications.id,
          opportunityId: schema.applications.opportunityId,
          status: schema.applications.status,
        })
        .from(schema.applications)
        .where(
          and(
            eq(schema.applications.id, referenceId),
            eq(schema.applications.userId, user.id)
          )
        )
        .limit(1)

      if (!app) return notFound(reply, 'Application')
      if (app.status !== 'awaiting_payment') {
        return badRequest(reply, 'Application is not in awaiting_payment state.')
      }

      const [opp] = await db
        .select({
          title: schema.opportunities.title,
          oppdateServiceFeeUsd: schema.opportunities.oppdateServiceFeeUsd,
          institutionFeeUsd: schema.opportunities.institutionFeeUsd,
        })
        .from(schema.opportunities)
        .where(eq(schema.opportunities.id, app.opportunityId))
        .limit(1)

      if (!opp) return notFound(reply, 'Opportunity')

      amountCents = opp.oppdateServiceFeeUsd + opp.institutionFeeUsd
      productName = `OppDate Apply - ${opp.title}`
    } else if (purpose === 'consultation') {
      const [booking] = await db
        .select()
        .from(schema.consultations)
        .where(
          and(
            eq(schema.consultations.id, referenceId),
            eq(schema.consultations.userId, user.id)
          )
        )
        .limit(1)

      if (!booking) return notFound(reply, 'Consultation')

      amountCents = booking.priceUsd
      productName = `Strategy Session - ${booking.durationMinutes} minutes`
    } else if (purpose === 'mentorship') {
      const [enrollment] = await db
        .select()
        .from(schema.mentorships)
        .where(
          and(
            eq(schema.mentorships.id, referenceId),
            eq(schema.mentorships.userId, user.id)
          )
        )
        .limit(1)

      if (!enrollment) return notFound(reply, 'Mentorship')

      // Fetch programme for pricing
      if (!enrollment.programmeId) return badRequest(reply, 'Mentorship has no programme assigned.')

      const [programme] = await db
        .select({ monthlyPriceUsd: schema.mentorshipProgrammes.monthlyPriceUsd })
        .from(schema.mentorshipProgrammes)
        .where(eq(schema.mentorshipProgrammes.id, enrollment.programmeId))
        .limit(1)

      if (!programme) return notFound(reply, 'Programme')

      amountCents = programme.monthlyPriceUsd
      productName = '30-Day Guidance Membership'
    }

    if (amountCents <= 0) return badRequest(reply, 'Invalid payment amount.')

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: { name: productName },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        purpose,
        referenceId,
      },
      success_url: purpose === 'oppdate_apply'
        ? `${webUrl}/apply/confirm?applicationId=${referenceId}&session_id={CHECKOUT_SESSION_ID}`
        : purpose === 'mentorship'
        ? `${webUrl}/services/mentorship/enrol?enrolment=${referenceId}&payment=success&session_id={CHECKOUT_SESSION_ID}`
        : purpose === 'consultation'
        ? `${webUrl}/services/consultations/book?bookingId=${referenceId}&payment=success`
        : `${webUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: purpose === 'oppdate_apply'
        ? `${webUrl}/opportunities?payment=cancelled`
        : purpose === 'mentorship'
        ? `${webUrl}/services/mentorship/enrol?enrolment=${referenceId}&payment=cancelled`
        : purpose === 'consultation'
        ? `${webUrl}/services/consultations/book?bookingId=${referenceId}&payment=cancelled`
        : `${webUrl}/dashboard?payment=cancelled`,
    })

    // Record pending payment
    await db.insert(schema.payments).values({
      userId: user.id,
      purpose,
      referenceId,
      gateway: 'stripe',
      gatewayPaymentId: session.id,
      amountUsd: amountCents,
      status: 'pending',
      metadata: { checkoutSessionId: session.id },
    })

    return ok(reply, { checkoutUrl: session.url, sessionId: session.id })
  })

  // POST /api/v1/payments/webhook/stripe -- Stripe webhook handler
  server.post(
    '/webhook/stripe',
    {
      config: { rawBody: true },
    },
    async (request, reply) => {
      const sig = request.headers[webhookSignatureHeader] as string
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

      if (!webhookSecret) {
        server.log.error('STRIPE_WEBHOOK_SECRET not configured')
        return serverError(reply, 'Webhook not configured.')
      }

      const stripe = getStripeClient()
      if (!stripe) {
        server.log.error('STRIPE_SECRET_KEY not configured')
        return serverError(reply, 'Stripe is not configured.')
      }

      let event: Stripe.Event
      try {
        event = stripe.webhooks.constructEvent(
          (request as any).rawBody || request.body,
          sig,
          webhookSecret
        )
      } catch (err) {
        server.log.warn('Stripe webhook signature verification failed')
        return badRequest(reply, 'Invalid webhook signature.')
      }

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          await handleCheckoutCompleted(server, session)
          break
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription
          await handleSubscriptionCancelled(subscription)
          break
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice
          await handlePaymentFailed(server, invoice)
          break
        }
      }

      return reply.status(200).send({ received: true })
    }
  )

  // POST /api/v1/payments/webhook/lemonsqueezy -- Lemon Squeezy webhook (HMAC SHA256 verified)
  server.post(
    '/webhook/lemonsqueezy',
    { config: { rawBody: true } },
    async (request, reply) => {
      const sig = request.headers['x-signature'] as string
      const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET
      const rawBody = (request as any).rawBody || JSON.stringify(request.body)

      if (!webhookSecret) {
        server.log.error('LEMONSQUEEZY_WEBHOOK_SECRET not configured')
        return serverError(reply, 'Webhook not configured.')
      }

      // Verify HMAC SHA256 signature
      const { createHmac } = await import('crypto')
      const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex')
      if (!sig || sig !== expected) {
        server.log.warn('Lemon Squeezy webhook signature verification failed')
        return badRequest(reply, 'Invalid webhook signature.')
      }

      const event = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
      const eventName = event?.meta?.event_name as string
      const orderId = String(event?.data?.id ?? '')
      const status = event?.data?.attributes?.status as string
      const custom = event?.meta?.custom_data as Record<string, string> | undefined
      // LS sends total in cents (USD)
      const totalCents = Number(event?.data?.attributes?.total ?? 0)

      if (eventName === 'order_created' && status === 'paid') {
        const userId = custom?.userId
        const ebookId = custom?.ebookId

        // Upsert payments row for revenue tracking
        if (userId && ebookId) {
          const [existingPayment] = await db
            .select({ id: schema.payments.id })
            .from(schema.payments)
            .where(eq(schema.payments.gatewayPaymentId, orderId))
            .limit(1)

          if (!existingPayment) {
            await db.insert(schema.payments).values({
              userId,
              referenceId: ebookId,
              gateway: 'lemon_squeezy' as any,
              gatewayPaymentId: orderId,
              amountUsd: totalCents,
              purpose: 'ebook' as any,
              status: 'succeeded',
            }).catch(() => {})
          } else {
            await db
              .update(schema.payments)
              .set({ status: 'succeeded', updatedAt: new Date() })
              .where(eq(schema.payments.gatewayPaymentId, orderId))
              .catch(() => {})
          }

          // Create ebookPurchases row
          const [existing] = await db
            .select({ id: schema.ebookPurchases.id })
            .from(schema.ebookPurchases)
            .where(and(eq(schema.ebookPurchases.userId, userId), eq(schema.ebookPurchases.ebookId, ebookId)))
            .limit(1)

          if (!existing) {
            await db.insert(schema.ebookPurchases).values({
              userId,
              ebookId,
              paymentId: orderId,
            }).catch(() => {})

            await db
              .update(schema.ebooks)
              .set({ purchaseCount: sql`${schema.ebooks.purchaseCount} + 1`, updatedAt: new Date() })
              .where(eq(schema.ebooks.id, ebookId))
              .catch(() => {})
          }
        }
      }

      if (eventName === 'order_refunded') {
        await db
          .update(schema.payments)
          .set({ status: 'refunded', updatedAt: new Date() })
          .where(eq(schema.payments.gatewayPaymentId, orderId))
      }

      return reply.status(200).send({ received: true })
    }
  )

  // POST /api/v1/payments/webhook/paystack -- Paystack webhook (HMAC SHA512 verified)
  server.post(
    '/webhook/paystack',
    { config: { rawBody: true } },
    async (request, reply) => {
      const sig = request.headers['x-paystack-signature'] as string
      const body = (request as any).rawBody || JSON.stringify(request.body)

      if (!sig || !verifyWebhookSignature(body, sig)) {
        server.log.warn('Paystack webhook signature verification failed')
        return badRequest(reply, 'Invalid webhook signature.')
      }

      const event = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
      const eventType = event?.event as string

      if (eventType === 'charge.success') {
        const data = event.data
        const reference = data?.reference as string
        if (!reference) return reply.status(200).send({ received: true })

        // Verify the transaction with Paystack
        try {
          const verified = await verifyTransaction(reference)
          if (verified.status === 'success') {
            const meta = verified.metadata || {}
            // Reuse the same post-payment handler as Stripe
            await handlePaystackSuccess(server, {
              reference,
              userId: meta.userId as string,
              purpose: meta.purpose as string,
              referenceId: meta.referenceId as string,
              plan: meta.plan as string,
              tier: meta.tier as string,
              amountCents: Math.round(verified.amount / 100), // Paystack amount is in kobo/cents
            })
          }
        } catch (err) {
          server.log.error('Paystack verification failed: ' + (err as Error).message)
        }
      }

      return reply.status(200).send({ received: true })
    }
  )
}

// Webhook handlers

async function handleCheckoutCompleted(server: FastifyInstance, session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const purpose = session.metadata?.purpose as string
  const referenceId = session.metadata?.referenceId

  if (!userId) return

  // Update payment record
  await db
    .update(schema.payments)
    .set({
      status: 'succeeded',
      amountUsd: session.amount_total || 0,
      updatedAt: new Date(),
    })
    .where(eq(schema.payments.gatewayPaymentId, session.id))

  if (purpose === 'premium') {
    const plan = session.metadata?.plan
    const now = new Date()
    const premiumUntil = plan === 'yearly'
      ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    await db
      .update(schema.users)
      .set({
        isPremium: true,
        premiumSince: now,
        premiumUntil,
        updatedAt: now,
      })
      .where(eq(schema.users.id, userId))

    // Create notification
    const [premiumNotif] = await db.insert(schema.notifications).values({
      userId,
      type: 'payment_confirmed',
      title: 'Premium subscription activated',
      body: `Your Premium subscription is now active until ${premiumUntil.toLocaleDateString()}.`,
      referenceId: userId,
      referenceType: 'premium',
    }).returning()
    broadcastToUser(userId, { type: 'new_notification', notification: premiumNotif })

    // Send confirmation email
    const [premUser] = await db
      .select({ name: schema.users.name, email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1)

    if (premUser) {
      const gateway = session.id?.startsWith('ps_') ? 'paystack' : 'stripe'
      const email = paymentConfirmationEmail({
        userName: premUser.name,
        amount: `$${((session.amount_total || 0) / 100).toFixed(2)}`,
        purpose: 'Premium subscription',
        gatewayPaymentId: session.id,
        gateway,
      })
      email.to = premUser.email
      await enqueueEmail(email)
    }
  }

  if (purpose === 'oppdate_apply' && referenceId) {
    // Fetch opportunity for reference ID generation
    const [app] = await db
      .select({
        id: schema.applications.id,
        opportunityId: schema.applications.opportunityId,
      })
      .from(schema.applications)
      .where(eq(schema.applications.id, referenceId))
      .limit(1)

    if (app) {
      const [opp] = await db
        .select({ institution: schema.opportunities.institution })
        .from(schema.opportunities)
        .where(eq(schema.opportunities.id, app.opportunityId))
        .limit(1)

      const instCode = opp?.institution?.slice(0, 3).toUpperCase() || 'GEN'
      const appRef = generateApplicationRef(new Date(), instCode)

      // Update application status and reference ID — only if still awaiting_payment
      // (idempotent: if already advanced, a prior call already ran this handler)
      const [existingApp] = await db
        .select({ status: schema.applications.status, referenceId: schema.applications.referenceId })
        .from(schema.applications)
        .where(eq(schema.applications.id, referenceId))
        .limit(1)

      if (existingApp?.status === 'awaiting_payment') {
        await db
          .update(schema.applications)
          .set({
            status: 'payment_confirmed',
            currentStep: 4,
            referenceId: appRef,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.applications.id, referenceId),
              eq(schema.applications.status, 'awaiting_payment')
            )
          )
      }

      // Create message thread only if one doesn't already exist for this application
      const [existingThread] = await db
        .select({ id: schema.messageThreads.id })
        .from(schema.messageThreads)
        .where(eq(schema.messageThreads.referenceId, referenceId))
        .limit(1)

      if (!existingThread) {
        await db.insert(schema.messageThreads).values({
          userId,
          type: 'oppdate_apply',
          referenceId,
          status: 'active',
        })
      }

      // Send automated first message
      const [thread] = await db
        .select({ id: schema.messageThreads.id })
        .from(schema.messageThreads)
        .where(
          and(
            eq(schema.messageThreads.userId, userId),
            eq(schema.messageThreads.referenceId, referenceId)
          )
        )
        .limit(1)

      // Fetch user name early so we can use it in the automated message
      const [applyUser] = await db
        .select({ name: schema.users.name, email: schema.users.email })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1)

      const firstName = applyUser?.name?.split(' ')[0] || 'there'

      if (thread) {
        // Only insert the welcome message if the thread has no messages yet
        const [existingMsg] = await db
          .select({ id: schema.messages.id })
          .from(schema.messages)
          .where(eq(schema.messages.threadId, thread.id))
          .limit(1)

        if (!existingMsg) {
          const confirmedRef = existingApp?.status === 'awaiting_payment' ? appRef : (existingApp?.referenceId ?? appRef)
          await db.insert(schema.messages).values({
            threadId: thread.id,
            senderId: userId,
            senderType: 'system',
            content: `Hi ${firstName}, your application has been confirmed - reference ${confirmedRef}.\n\nHere's what to expect next:\n- Our team will review your profile and reach out within 24-48 hours with a document checklist tailored to this opportunity\n- Once your documents are in order, we handle the full submission on your behalf\n- You'll receive a status update at each stage\n\nIn the meantime, make sure your profile is up to date - we pull your details from there when preparing your application. You can update it here: /profile\n\nQuestions? Just reply here - a real person will respond.`,
          })

          await db
            .update(schema.messageThreads)
            .set({ lastMessageAt: new Date() })
            .where(eq(schema.messageThreads.id, thread.id))
        }
      }

      // Create notification
      const [applyNotif] = await db.insert(schema.notifications).values({
        userId,
        type: 'payment_confirmed',
        title: 'Application payment confirmed',
        body: `Your application ${appRef} has been confirmed. Open Messages to see next steps.`,
        referenceId,
        referenceType: 'application',
      }).returning()
      broadcastToUser(userId, { type: 'new_notification', notification: applyNotif })

      // Send confirmation email (applyUser already fetched above)
      if (applyUser) {
        const gateway = session.id?.startsWith('ps_') ? 'paystack' : 'stripe'
        const confirmedRef = existingApp?.status === 'awaiting_payment' ? appRef : (existingApp?.referenceId ?? appRef)
        const email = paymentConfirmationEmail({
          userName: applyUser.name,
          amount: `$${((session.amount_total || 0) / 100).toFixed(2)}`,
          purpose: 'OppDate Apply',
          referenceId: confirmedRef,
          gatewayPaymentId: session.id,
          gateway,
        })
        email.to = applyUser.email
        await enqueueEmail(email)
      }
    }
  }

  if (purpose === 'consultation' && referenceId) {
    await db
      .update(schema.consultations)
      .set({ status: 'confirmed', updatedAt: new Date() })
      .where(eq(schema.consultations.id, referenceId))

    const [consultNotif] = await db.insert(schema.notifications).values({
      userId,
      type: 'consultation_confirmed',
      title: 'Consultation booking confirmed',
      body: 'Your Strategy Session has been confirmed. The meeting link will be provided shortly.',
      referenceId,
      referenceType: 'consultation',
    }).returning()
    broadcastToUser(userId, { type: 'new_notification', notification: consultNotif })

    // Send consultation booking email
    const [conBooking] = await db
      .select({ durationMinutes: schema.consultations.durationMinutes, scheduledAt: schema.consultations.scheduledAt })
      .from(schema.consultations)
      .where(eq(schema.consultations.id, referenceId))
      .limit(1)

    const [conUser] = await db
      .select({ name: schema.users.name, email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1)

    if (conUser && conBooking) {
      const email = consultationBookingEmail(
        conUser.name,
        conBooking.scheduledAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        conBooking.durationMinutes
      )
      email.to = conUser.email
      await enqueueEmail(email)
    }
  }

  if (purpose === 'mentorship' && referenceId) {
    await db
      .update(schema.mentorships)
      .set({ status: 'active', startedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.mentorships.id, referenceId))

    // Fetch user and mentor name early — needed for automated message and email
    const [mentUser] = await db
      .select({ name: schema.users.name, email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1)

    const [mentorship] = await db
      .select({ mentorProfileId: schema.mentorships.mentorProfileId })
      .from(schema.mentorships)
      .where(eq(schema.mentorships.id, referenceId))
      .limit(1)

    let mentorName = 'your mentor'
    if (mentorship?.mentorProfileId) {
      const [mentor] = await db
        .select({ name: schema.mentorProfiles.name })
        .from(schema.mentorProfiles)
        .where(eq(schema.mentorProfiles.id, mentorship.mentorProfileId))
        .limit(1)
      if (mentor) mentorName = mentor.name
    }

    const firstName = mentUser?.name?.split(' ')[0] || 'there'

    // Create mentorship thread
    await db.insert(schema.messageThreads).values({
      userId,
      type: 'mentorship',
      referenceId,
      status: 'active',
    })

    // Insert automated first message
    const [mentThread] = await db
      .select({ id: schema.messageThreads.id })
      .from(schema.messageThreads)
      .where(
        and(
          eq(schema.messageThreads.userId, userId),
          eq(schema.messageThreads.referenceId, referenceId)
        )
      )
      .limit(1)

    if (mentThread) {
      await db.insert(schema.messages).values({
        threadId: mentThread.id,
        senderId: userId,
        senderType: 'system',
        content: `Hi ${firstName}, your 30-Day Guidance membership is now active.\n\nYou've been matched with ${mentorName}. Here's what happens next:\n- Your mentor will reach out within 24 hours to schedule your first session\n- Sessions are conducted via the meeting link shared in this thread\n- You have 30 days of dedicated guidance - use this thread to ask questions, share documents, or request feedback at any time\n\nQuestions before your first session? Just reply here.`,
      })

      await db
        .update(schema.messageThreads)
        .set({ lastMessageAt: new Date() })
        .where(eq(schema.messageThreads.id, mentThread.id))
    }

    const [mentorshipNotif] = await db.insert(schema.notifications).values({
      userId,
      type: 'mentorship_update',
      title: 'Mentorship membership activated',
      body: 'Your 30-Day Guidance membership is now active. Open Messages to connect with your mentor.',
      referenceId,
      referenceType: 'mentorship',
    }).returning()
    broadcastToUser(userId, { type: 'new_notification', notification: mentorshipNotif })

    if (mentUser) {
      const email = mentorshipWelcomeEmail(mentUser.name, mentorName)
      email.to = mentUser.email
      await enqueueEmail(email)
    }
  }

  if (purpose === 'ebook' && referenceId) {
    const [existing] = await db
      .select({ id: schema.ebookPurchases.id })
      .from(schema.ebookPurchases)
      .where(and(eq(schema.ebookPurchases.userId, userId), eq(schema.ebookPurchases.ebookId, referenceId)))
      .limit(1)

    if (!existing) {
      await db.insert(schema.ebookPurchases).values({
        userId,
        ebookId: referenceId,
        paymentId: session.id,
      })

      await db
        .update(schema.ebooks)
        .set({ purchaseCount: sql`${schema.ebooks.purchaseCount} + 1`, updatedAt: new Date() })
        .where(eq(schema.ebooks.id, referenceId))
    }
  }
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  // Find the payment record to get the userId
  const [payment] = await db
    .select({ userId: schema.payments.userId })
    .from(schema.payments)
    .where(eq(schema.payments.gatewayPaymentId, subscription.id))
    .limit(1)

  if (!payment) return

  await db
    .update(schema.users)
    .set({ isPremium: false, updatedAt: new Date() })
    .where(eq(schema.users.id, payment.userId))
}

async function handlePaymentFailed(server: FastifyInstance, invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return

  const [payment] = await db
    .select({ userId: schema.payments.userId })
    .from(schema.payments)
    .where(eq(schema.payments.gatewayPaymentId, subscriptionId))
    .limit(1)

  if (!payment) return

  server.log.warn('Payment failed for user ' + payment.userId)

  const [failedNotif] = await db.insert(schema.notifications).values({
    userId: payment.userId,
    type: 'payment_confirmed',
    title: 'Payment failed',
    body: 'Your subscription payment failed. Please update your payment method to maintain Premium access.',
    referenceId: payment.userId,
    referenceType: 'premium',
  }).returning()
  broadcastToUser(payment.userId, { type: 'new_notification', notification: failedNotif })
}

// Paystack checkout flow
async function handlePaystackCheckout(
  request: any,
  reply: any,
  params: {
    userId: string
    email: string
    purpose: string
    plan?: string
    tier?: string
    referenceId?: string
    webUrl: string
  }
) {
  const { userId, email, purpose, plan, tier, referenceId, webUrl } = params
  const paystackRef = `ps_${userId.slice(0, 8)}_${Date.now()}`

  let amountKobo = 0 // Paystack uses kobo (NGN smallest unit) -- we convert USD cents to kobo at checkout

  if (purpose === 'premium') {
    if (!plan || !tier) return badRequest(reply, 'plan and tier are required for premium subscriptions.')

    // Pricing in USD cents
    const prices: Record<string, number> = {
      monthly_general: 2900,
      yearly_general: 19900,
      monthly_regional: 1200,
      yearly_regional: 9900,
    }
    const key = `${plan}_${tier}`
    const usdCents = prices[key]
    if (!usdCents) return badRequest(reply, 'Invalid plan/tier combination.')

    amountKobo = usdCents // Paystack converts currency; amount in smallest unit
  } else if (purpose === 'oppdate_apply' && referenceId) {
    const [app] = await db
      .select({ opportunityId: schema.applications.opportunityId, status: schema.applications.status })
      .from(schema.applications)
      .where(and(eq(schema.applications.id, referenceId), eq(schema.applications.userId, userId)))
      .limit(1)

    if (!app) return notFound(reply, 'Application')
    if (app.status !== 'awaiting_payment') return badRequest(reply, 'Application is not in awaiting_payment state.')

    const [opp] = await db
      .select({
        oppdateServiceFeeUsd: schema.opportunities.oppdateServiceFeeUsd,
        institutionFeeUsd: schema.opportunities.institutionFeeUsd,
      })
      .from(schema.opportunities)
      .where(eq(schema.opportunities.id, app.opportunityId))
      .limit(1)

    if (!opp) return notFound(reply, 'Opportunity')
    amountKobo = opp.oppdateServiceFeeUsd + opp.institutionFeeUsd
  } else if (purpose === 'consultation' && referenceId) {
    const [booking] = await db
      .select({ priceUsd: schema.consultations.priceUsd })
      .from(schema.consultations)
      .where(and(eq(schema.consultations.id, referenceId), eq(schema.consultations.userId, userId)))
      .limit(1)

    if (!booking) return notFound(reply, 'Consultation')
    amountKobo = booking.priceUsd
  } else if (purpose === 'mentorship' && referenceId) {
    const [enrollment] = await db
      .select({ programmeId: schema.mentorships.programmeId })
      .from(schema.mentorships)
      .where(and(eq(schema.mentorships.id, referenceId), eq(schema.mentorships.userId, userId)))
      .limit(1)

    if (!enrollment?.programmeId) return notFound(reply, 'Mentorship')

    const [programme] = await db
      .select({ monthlyPriceUsd: schema.mentorshipProgrammes.monthlyPriceUsd })
      .from(schema.mentorshipProgrammes)
      .where(eq(schema.mentorshipProgrammes.id, enrollment.programmeId))
      .limit(1)

    if (!programme) return notFound(reply, 'Programme')
    amountKobo = programme.monthlyPriceUsd
  }

  if (amountKobo <= 0) return badRequest(reply, 'Invalid payment amount.')

  try {
    const result = await initializeTransaction({
      email,
      amount: amountKobo, // Paystack will handle currency conversion
      currency: 'USD',
      reference: paystackRef,
      callbackUrl: purpose === 'oppdate_apply' && referenceId
        ? `${webUrl}/apply/confirm?applicationId=${referenceId}&reference=${paystackRef}`
        : purpose === 'consultation' && referenceId
        ? `${webUrl}/services/consultations/book?bookingId=${referenceId}&payment=success&reference=${paystackRef}`
        : `${webUrl}/dashboard?payment=success&reference=${paystackRef}`,
      metadata: { userId, purpose, referenceId: referenceId || userId, plan: plan || '', tier: tier || '' },
    })

    // Record pending payment
    await db.insert(schema.payments).values({
      userId,
      purpose: purpose as any,
      referenceId: referenceId || userId,
      gateway: 'paystack',
      gatewayPaymentId: paystackRef,
      amountUsd: amountKobo,
      status: 'pending',
      metadata: { paystackReference: paystackRef, accessCode: result.access_code },
    })

    return ok(reply, { checkoutUrl: result.authorization_url, reference: paystackRef })
  } catch (err) {
    return serverError(reply, 'Failed to initialize Paystack transaction.')
  }
}

// Paystack post-payment handler (reuses same logic as Stripe)
async function handlePaystackSuccess(
  server: FastifyInstance,
  params: {
    reference: string
    userId: string
    purpose: string
    referenceId: string
    plan: string
    tier: string
    amountCents: number
  }
) {
  const { reference, userId, purpose, referenceId, plan, amountCents } = params

  // Update payment record
  await db
    .update(schema.payments)
    .set({ status: 'succeeded', amountUsd: amountCents, updatedAt: new Date() })
    .where(eq(schema.payments.gatewayPaymentId, reference))

  // Reuse the same post-payment logic by constructing a mock Stripe-like session
  // This avoids duplicating all the business logic
  const mockSession = {
    id: reference,
    metadata: { userId, purpose, referenceId, plan },
    amount_total: amountCents,
  } as any

  await handleCheckoutCompleted(server, mockSession)
}
