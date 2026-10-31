import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, schema } from '../db'
import { eq, and, desc } from 'drizzle-orm'
import { ok, created, badRequest, notFound, forbidden } from '../utils/response'
import { requireAuth, requireRole } from '../middleware/auth'

export async function ebookRoutes(server: FastifyInstance) {
  // GET /api/v1/ebooks -- list published ebooks (public)
  server.get('/', async (request, reply) => {
    const user = (request as any).user as { id: string; role: string } | undefined

    const rows = await db
      .select()
      .from(schema.ebooks)
      .where(eq(schema.ebooks.status, 'published'))
      .orderBy(desc(schema.ebooks.createdAt))

    // If user is premium, include premium pricing
    const isPremium = user ? await checkPremium(user.id) : false

    const mapped = rows.map((ebook) => ({
      ...ebook,
      effectivePrice: isPremium && ebook.premiumPriceUsd != null ? ebook.premiumPriceUsd : ebook.priceUsd,
    }))

    return ok(reply, mapped)
  })

  // GET /api/v1/ebooks/library -- user's purchased ebooks (must be before /:slug)
  server.get('/library', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }

    const purchases = await db
      .select({
        id: schema.ebookPurchases.id,
        ebookId: schema.ebookPurchases.ebookId,
        readingProgress: schema.ebookPurchases.readingProgress,
        downloadCount: schema.ebookPurchases.downloadCount,
        purchasedAt: schema.ebookPurchases.purchasedAt,
        lastReadAt: schema.ebookPurchases.lastReadAt,
        title: schema.ebooks.title,
        author: schema.ebooks.author,
        category: schema.ebooks.category,
        coverImageUrl: schema.ebooks.coverImageUrl,
        fileUrl: schema.ebooks.fileUrl,
        pageCount: schema.ebooks.pageCount,
        slug: schema.ebooks.slug,
      })
      .from(schema.ebookPurchases)
      .leftJoin(schema.ebooks, eq(schema.ebookPurchases.ebookId, schema.ebooks.id))
      .where(eq(schema.ebookPurchases.userId, user.id))
      .orderBy(desc(schema.ebookPurchases.purchasedAt))

    return ok(reply, purchases)
  })

  // GET /api/v1/ebooks/:slug -- ebook detail
  server.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }

    const [ebook] = await db
      .select()
      .from(schema.ebooks)
      .where(and(eq(schema.ebooks.slug, slug), eq(schema.ebooks.status, 'published')))
      .limit(1)

    if (!ebook) return notFound(reply, 'eBook')

    return ok(reply, ebook)
  })

  // POST /api/v1/ebooks/:id/checkout -- create Lemon Squeezy checkout URL
  server.post('/:id/checkout', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string; email: string }
    const { id } = request.params as { id: string }

    const apiKey = process.env.LEMONSQUEEZY_API_KEY
    const storeId = process.env.LEMONSQUEEZY_STORE_ID
    const webUrl = process.env.WEB_URL || 'http://localhost:3000'

    if (!apiKey || !storeId) {
      return badRequest(reply, 'Lemon Squeezy is not configured.')
    }

    const [ebook] = await db
      .select()
      .from(schema.ebooks)
      .where(and(eq(schema.ebooks.id, id), eq(schema.ebooks.status, 'published')))
      .limit(1)

    if (!ebook) return notFound(reply, 'eBook')
    if (!ebook.lsVariantId) return badRequest(reply, 'This eBook is not available for purchase yet.')

    // Check not already purchased
    const [existing] = await db
      .select({ id: schema.ebookPurchases.id })
      .from(schema.ebookPurchases)
      .where(and(eq(schema.ebookPurchases.userId, user.id), eq(schema.ebookPurchases.ebookId, id)))
      .limit(1)
    if (existing) return ok(reply, { alreadyPurchased: true })

    const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: user.email,
              custom: { userId: user.id, ebookId: id },
            },
            checkout_options: { embed: false },
            product_options: {
              redirect_url: `${webUrl}/services/ebooks/checkout?book=${ebook.slug}&purchase=success`,
              receipt_link_url: `${webUrl}/services/ebooks/library`,
            },
          },
          relationships: {
            store: { data: { type: 'stores', id: storeId } },
            variant: { data: { type: 'variants', id: ebook.lsVariantId } },
          },
        },
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      server.log.error({ err }, 'Lemon Squeezy checkout creation failed')
      return badRequest(reply, 'Could not create checkout. Please try again.')
    }

    const data = await res.json() as { data?: { attributes?: { url?: string } } }
    const checkoutUrl = data?.data?.attributes?.url
    if (!checkoutUrl) return badRequest(reply, 'Could not create checkout. Please try again.')

    return ok(reply, { checkoutUrl })
  })

  // POST /api/v1/ebooks/:id/purchase -- record ebook purchase (called after Lemon Squeezy webhook)
  server.post(
    '/:id/purchase',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user as { id: string }
      const { id } = request.params as { id: string }
      const body = z.object({ paymentId: z.string() }).safeParse(request.body)
      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      // Check ebook exists
      const [ebook] = await db
        .select()
        .from(schema.ebooks)
        .where(eq(schema.ebooks.id, id))
        .limit(1)

      if (!ebook) return notFound(reply, 'eBook')

      // Check not already purchased
      const [existing] = await db
        .select()
        .from(schema.ebookPurchases)
        .where(
          and(
            eq(schema.ebookPurchases.userId, user.id),
            eq(schema.ebookPurchases.ebookId, id)
          )
        )
        .limit(1)

      if (existing) return ok(reply, existing, 'Already purchased.')

      const rows = await db
        .insert(schema.ebookPurchases)
        .values({
          userId: user.id,
          ebookId: id,
          paymentId: body.data.paymentId,
        })
        .returning()

      // Increment purchase count
      await db
        .update(schema.ebooks)
        .set({ purchaseCount: ebook.purchaseCount + 1, updatedAt: new Date() })
        .where(eq(schema.ebooks.id, id))

      return created(reply, rows[0], 'eBook purchased.')
    }
  )

  // POST /api/v1/ebooks/:id/download -- generate download URL
  server.post(
    '/:id/download',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user as { id: string }
      const { id } = request.params as { id: string }

      // Verify purchase
      const [purchase] = await db
        .select()
        .from(schema.ebookPurchases)
        .where(
          and(
            eq(schema.ebookPurchases.userId, user.id),
            eq(schema.ebookPurchases.ebookId, id)
          )
        )
        .limit(1)

      if (!purchase) return forbidden(reply, 'You have not purchased this eBook.')

      const [ebook] = await db
        .select({ fileUrl: schema.ebooks.fileUrl })
        .from(schema.ebooks)
        .where(eq(schema.ebooks.id, id))
        .limit(1)

      if (!ebook) return notFound(reply, 'eBook')

      // Increment download counts
      await db
        .update(schema.ebookPurchases)
        .set({ downloadCount: purchase.downloadCount + 1 })
        .where(eq(schema.ebookPurchases.id, purchase.id))

      await db
        .update(schema.ebooks)
        .set({ downloadCount: (await db.select({ c: schema.ebooks.downloadCount }).from(schema.ebooks).where(eq(schema.ebooks.id, id)).limit(1))[0].c + 1 })
        .where(eq(schema.ebooks.id, id))

      return ok(reply, { downloadUrl: ebook.fileUrl })
    }
  )

  // PATCH /api/v1/ebooks/:id/progress -- update reading progress
  server.patch(
    '/:id/progress',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user as { id: string }
      const { id } = request.params as { id: string }
      const body = z.object({ progress: z.number().min(0).max(100) }).safeParse(request.body)
      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const rows = await db
        .update(schema.ebookPurchases)
        .set({
          readingProgress: body.data.progress,
          lastReadAt: new Date(),
        })
        .where(
          and(
            eq(schema.ebookPurchases.userId, user.id),
            eq(schema.ebookPurchases.ebookId, id)
          )
        )
        .returning()

      if (!rows[0]) return notFound(reply, 'Purchase')

      return ok(reply, rows[0])
    }
  )

  // Admin: manage ebooks

  // GET /api/v1/ebooks/admin/all -- list all ebooks (including unpublished)
  server.get(
    '/admin/all',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (_request, reply) => {
      const rows = await db.select().from(schema.ebooks).orderBy(desc(schema.ebooks.createdAt))
      return ok(reply, rows)
    }
  )

  // POST /api/v1/ebooks/admin -- create ebook
  server.post(
    '/admin',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const body = z
        .object({
          title: z.string().min(2),
          author: z.string().min(2),
          pageCount: z.number().int().positive().optional(),
          category: z.string().optional(),
          description: z.string().min(10),
          whatsInside: z.array(z.object({ title: z.string(), description: z.string().optional() })).default([]),
          coverImageUrl: z.string().url(),
          fileUrl: z.string().url(),
          fileFormat: z.enum(['pdf', 'epub']).default('pdf'),
          priceUsd: z.number().int().positive(),
          premiumPriceUsd: z.number().int().positive().optional(),
          status: z.enum(['published', 'unpublished']).default('unpublished'),
        })
        .safeParse(request.body)

      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const slug = body.data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + Date.now().toString(36)

      const rows = await db
        .insert(schema.ebooks)
        .values({ ...body.data, slug })
        .returning()

      return created(reply, rows[0])
    }
  )

  // PATCH /api/v1/ebooks/admin/:id -- update ebook
  server.patch(
    '/admin/:id',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = z
        .object({
          title: z.string().min(2).optional(),
          author: z.string().min(2).optional(),
          pageCount: z.number().int().positive().optional(),
          category: z.string().optional(),
          description: z.string().min(10).optional(),
          whatsInside: z.array(z.object({ title: z.string(), description: z.string().optional() })).optional(),
          coverImageUrl: z.string().url().optional(),
          fileUrl: z.string().url().optional(),
          fileFormat: z.enum(['pdf', 'epub']).optional(),
          priceUsd: z.number().int().positive().optional(),
          premiumPriceUsd: z.number().int().positive().optional(),
          status: z.enum(['published', 'unpublished']).optional(),
        })
        .safeParse(request.body)

      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const rows = await db
        .update(schema.ebooks)
        .set({ ...body.data, updatedAt: new Date() })
        .where(eq(schema.ebooks.id, id))
        .returning()

      if (!rows[0]) return notFound(reply, 'eBook')

      return ok(reply, rows[0])
    }
  )

  // DELETE /api/v1/ebooks/admin/:id -- delete ebook (only zero-sales drafts)
  server.delete(
    '/admin/:id',
    { preHandler: [requireRole('super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const [ebook] = await db
        .select()
        .from(schema.ebooks)
        .where(eq(schema.ebooks.id, id))
        .limit(1)

      if (!ebook) return notFound(reply, 'eBook')

      if (ebook.purchaseCount > 0) {
        return badRequest(reply, 'Cannot delete an eBook with existing purchases. Unpublish it instead.')
      }

      await db.delete(schema.ebooks).where(eq(schema.ebooks.id, id))

      return ok(reply, null, 'eBook deleted.')
    }
  )
}

async function checkPremium(userId: string): Promise<boolean> {
  const [user] = await db
    .select({ isPremium: schema.users.isPremium, premiumUntil: schema.users.premiumUntil })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1)

  if (!user) return false
  if (!user.isPremium) return false
  if (user.premiumUntil && user.premiumUntil < new Date()) return false
  return true
}
