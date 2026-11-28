import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import crypto from 'crypto'
import { db, schema } from '../db'
import { eq, and, desc, sql, ilike, or } from 'drizzle-orm'
import { ok, created, badRequest, notFound, paginated } from '../utils/response'
import { requireRole } from '../middleware/auth'
import { enqueueEmail } from '../jobs/queue'
import { newsletterEditionEmail } from '../utils/email'

// 1x1 transparent GIF (tracking pixel)
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function newsletterRoutes(server: FastifyInstance) {

  // ─── PUBLIC ──────────────────────────────────────────────────────────────────

  // POST /subscribe -- subscribe email (idempotent, re-activates if unsubscribed)
  server.post('/subscribe', async (request, reply) => {
    const body = z.object({
      email: z.string().email().max(255),
      name: z.string().max(255).optional(),
    }).safeParse(request.body)

    if (!body.success) return badRequest(reply, 'Please enter a valid email address.')

    const email = body.data.email.toLowerCase().trim()

    const [existing] = await db
      .select()
      .from(schema.newsletterSubscribers)
      .where(eq(schema.newsletterSubscribers.email, email))
      .limit(1)

    if (existing) {
      if (existing.status === 'active') {
        return ok(reply, { subscribed: true }, 'Already subscribed.')
      }
      // Re-activate
      await db.update(schema.newsletterSubscribers).set({
        status: 'active',
        unsubscribedAt: null,
        subscribedAt: new Date(),
      }).where(eq(schema.newsletterSubscribers.id, existing.id))

      return ok(reply, { subscribed: true }, 'Welcome back! You have been re-subscribed.')
    }

    await db.insert(schema.newsletterSubscribers).values({
      email,
      name: body.data.name || null,
      source: 'footer_form',
      unsubscribeToken: generateToken(),
    })

    return created(reply, { subscribed: true }, 'Successfully subscribed.')
  })

  // GET /unsubscribe -- unsubscribe via token
  server.get('/unsubscribe', async (request, reply) => {
    const { token } = request.query as { token?: string }
    if (!token) {
      reply.type('text/html')
      return reply.status(400).send('<html><body><h1>Invalid unsubscribe link.</h1></body></html>')
    }

    const [sub] = await db
      .select()
      .from(schema.newsletterSubscribers)
      .where(eq(schema.newsletterSubscribers.unsubscribeToken, token))
      .limit(1)

    if (!sub) {
      reply.type('text/html')
      return reply.status(404).send('<html><body><h1>Subscriber not found.</h1></body></html>')
    }

    if (sub.status !== 'active') {
      reply.type('text/html')
      return reply.send('<html><body><h1>You have already been unsubscribed.</h1></body></html>')
    }

    await db.update(schema.newsletterSubscribers).set({
      status: 'unsubscribed',
      unsubscribedAt: new Date(),
    }).where(eq(schema.newsletterSubscribers.id, sub.id))

    reply.type('text/html')
    return reply.send(`<!DOCTYPE html>
<html><head><title>Unsubscribed - OppDate</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fdf7f2;color:#1a0a00}
.card{text-align:center;padding:48px;border-radius:16px;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,0.06);max-width:420px}
h1{font-size:24px;margin:0 0 12px}p{color:#666;line-height:1.6;margin:0}</style>
</head><body><div class="card"><h1>You have been unsubscribed</h1><p>You will no longer receive newsletter emails from OppDate. If this was a mistake, you can re-subscribe from our website.</p></div></body></html>`)
  })

  // GET /track/:editionId/:subscriberId.png -- open tracking pixel
  server.get('/track/:editionId/:subscriberId.png', async (request, reply) => {
    const { editionId, subscriberId } = request.params as { editionId: string; subscriberId: string }

    // Update open timestamp (fire-and-forget)
    ;(async () => {
      try {
        await db.update(schema.newsletterSendLog)
          .set({ openedAt: new Date() })
          .where(
            and(
              eq(schema.newsletterSendLog.editionId, editionId),
              eq(schema.newsletterSendLog.subscriberId, subscriberId),
              sql`${schema.newsletterSendLog.openedAt} IS NULL`
            )
          )
        await db.update(schema.newsletterEditions)
          .set({ openCount: sql`${schema.newsletterEditions.openCount} + 1` })
          .where(eq(schema.newsletterEditions.id, editionId))
      } catch {}
    })()

    reply.type('image/gif')
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    reply.header('Pragma', 'no-cache')
    reply.header('Expires', '0')
    return reply.send(TRANSPARENT_GIF)
  })

  // ─── ADMIN ───────────────────────────────────────────────────────────────────

  // GET /admin/subscribers -- list subscribers (paginated, filterable)
  server.get('/admin/subscribers', { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (request, reply) => {
    const query = request.query as Record<string, string>
    const page = Math.max(Number(query.page) || 1, 1)
    const limit = Math.min(Number(query.limit) || 50, 100)
    const offset = (page - 1) * limit
    const status = query.status as 'active' | 'unsubscribed' | 'bounced' | undefined
    const search = query.search

    const conditions: ReturnType<typeof eq>[] = []
    if (status) conditions.push(eq(schema.newsletterSubscribers.status, status))
    if (search) {
      conditions.push(
        or(
          ilike(schema.newsletterSubscribers.email, `%${search}%`),
          ilike(schema.newsletterSubscribers.name, `%${search}%`),
        )!
      )
    }

    const where = conditions.length ? and(...conditions) : undefined

    const rows = await db
      .select()
      .from(schema.newsletterSubscribers)
      .where(where)
      .orderBy(desc(schema.newsletterSubscribers.createdAt))
      .limit(limit)
      .offset(offset)

    const [total] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.newsletterSubscribers)
      .where(where)

    // Also fetch aggregate stats
    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${schema.newsletterSubscribers.status} = 'active')::int`,
        unsubscribed: sql<number>`count(*) filter (where ${schema.newsletterSubscribers.status} = 'unsubscribed')::int`,
      })
      .from(schema.newsletterSubscribers)

    return reply.status(200).send({
      success: true,
      data: rows,
      total: total?.count || 0,
      page,
      limit,
      hasMore: page * limit < (total?.count || 0),
      stats: stats || { total: 0, active: 0, unsubscribed: 0 },
    })
  })

  // POST /admin/subscribers/import -- bulk import emails (paste-box format)
  server.post('/admin/subscribers/import', { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (request, reply) => {
    const body = z.object({
      emails: z.string().min(1),
    }).safeParse(request.body)

    if (!body.success) return badRequest(reply, 'Please provide a list of emails.')

    const lines = body.data.emails.split(/[\n,;]+/).map(e => e.trim().toLowerCase()).filter(Boolean)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    let imported = 0
    let skipped = 0

    for (const email of lines) {
      if (!emailRegex.test(email)) { skipped++; continue }

      const [existing] = await db
        .select({ id: schema.newsletterSubscribers.id })
        .from(schema.newsletterSubscribers)
        .where(eq(schema.newsletterSubscribers.email, email))
        .limit(1)

      if (existing) { skipped++; continue }

      await db.insert(schema.newsletterSubscribers).values({
        email,
        source: 'admin_import',
        unsubscribeToken: generateToken(),
      })
      imported++
    }

    return ok(reply, { imported, skipped, total: lines.length }, `Imported ${imported} subscribers.`)
  })

  // DELETE /admin/subscribers/:id -- remove subscriber
  server.delete('/admin/subscribers/:id', { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const [existing] = await db
      .select({ id: schema.newsletterSubscribers.id })
      .from(schema.newsletterSubscribers)
      .where(eq(schema.newsletterSubscribers.id, id))
      .limit(1)
    if (!existing) return notFound(reply, 'Subscriber')

    await db.delete(schema.newsletterSubscribers).where(eq(schema.newsletterSubscribers.id, id))
    return ok(reply, null, 'Subscriber removed.')
  })

  // GET /admin/editions -- list editions with stats
  server.get('/admin/editions', { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (request, reply) => {
    const query = request.query as Record<string, string>
    const page = Math.max(Number(query.page) || 1, 1)
    const limit = Math.min(Number(query.limit) || 20, 100)
    const offset = (page - 1) * limit

    const rows = await db
      .select({
        id: schema.newsletterEditions.id,
        subject: schema.newsletterEditions.subject,
        preheaderText: schema.newsletterEditions.preheaderText,
        status: schema.newsletterEditions.status,
        sentAt: schema.newsletterEditions.sentAt,
        sentCount: schema.newsletterEditions.sentCount,
        openCount: schema.newsletterEditions.openCount,
        createdAt: schema.newsletterEditions.createdAt,
        createdByName: schema.users.name,
      })
      .from(schema.newsletterEditions)
      .leftJoin(schema.users, eq(schema.newsletterEditions.createdBy, schema.users.id))
      .orderBy(desc(schema.newsletterEditions.createdAt))
      .limit(limit)
      .offset(offset)

    const [total] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.newsletterEditions)

    return paginated(reply, rows, total?.count || 0, page, limit)
  })

  // POST /admin/editions -- create edition
  server.post('/admin/editions', { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (request, reply) => {
    const body = z.object({
      subject: z.string().min(1).max(500),
      preheaderText: z.string().max(300).optional(),
      bodyHtml: z.string().optional(),
      blogPostId: z.string().uuid().optional(),
    }).safeParse(request.body)

    if (!body.success) return badRequest(reply, body.error.errors[0].message)

    const user = (request as any).user
    const [edition] = await db.insert(schema.newsletterEditions).values({
      subject: body.data.subject,
      preheaderText: body.data.preheaderText || null,
      bodyHtml: body.data.bodyHtml || null,
      blogPostId: body.data.blogPostId || null,
      createdBy: user.id,
    }).returning()

    return created(reply, edition, 'Edition created.')
  })

  // POST /admin/editions/from-post/:postId -- convert blog post to newsletter
  server.post('/admin/editions/from-post/:postId', { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (request, reply) => {
    const { postId } = request.params as { postId: string }

    const [post] = await db
      .select()
      .from(schema.blogPosts)
      .where(eq(schema.blogPosts.id, postId))
      .limit(1)
    if (!post) return notFound(reply, 'Post')

    const user = (request as any).user
    const [edition] = await db.insert(schema.newsletterEditions).values({
      subject: post.title,
      preheaderText: post.excerpt || null,
      bodyHtml: post.content || null,
      blogPostId: post.id,
      createdBy: user.id,
    }).returning()

    return created(reply, edition, 'Newsletter edition created from blog post.')
  })

  // PATCH /admin/editions/:id -- update edition (draft only)
  server.patch('/admin/editions/:id', { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const [edition] = await db
      .select()
      .from(schema.newsletterEditions)
      .where(eq(schema.newsletterEditions.id, id))
      .limit(1)
    if (!edition) return notFound(reply, 'Edition')
    if (edition.status !== 'draft') return badRequest(reply, 'Only draft editions can be edited.')

    const body = z.object({
      subject: z.string().min(1).max(500).optional(),
      preheaderText: z.string().max(300).optional().nullable(),
      bodyHtml: z.string().optional().nullable(),
      blogPostId: z.string().uuid().optional().nullable(),
    }).safeParse(request.body)

    if (!body.success) return badRequest(reply, body.error.errors[0].message)

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (body.data.subject !== undefined) updates.subject = body.data.subject
    if (body.data.preheaderText !== undefined) updates.preheaderText = body.data.preheaderText
    if (body.data.bodyHtml !== undefined) updates.bodyHtml = body.data.bodyHtml
    if (body.data.blogPostId !== undefined) updates.blogPostId = body.data.blogPostId

    const [updated] = await db
      .update(schema.newsletterEditions)
      .set(updates)
      .where(eq(schema.newsletterEditions.id, id))
      .returning()

    return ok(reply, updated, 'Edition updated.')
  })

  // POST /admin/editions/:id/send -- send newsletter to all active subscribers
  server.post('/admin/editions/:id/send', { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const [edition] = await db
      .select()
      .from(schema.newsletterEditions)
      .where(eq(schema.newsletterEditions.id, id))
      .limit(1)
    if (!edition) return notFound(reply, 'Edition')
    if (edition.status !== 'draft') return badRequest(reply, 'This edition has already been sent or is currently sending.')
    if (!edition.bodyHtml) return badRequest(reply, 'Edition has no content.')

    // Mark as sending
    await db.update(schema.newsletterEditions)
      .set({ status: 'sending', updatedAt: new Date() })
      .where(eq(schema.newsletterEditions.id, id))

    // Fetch linked blog post if any
    let blogPost: { title: string; excerpt: string; coverImageUrl: string | null; slug: string } | undefined
    if (edition.blogPostId) {
      const [post] = await db
        .select({
          title: schema.blogPosts.title,
          excerpt: schema.blogPosts.excerpt,
          coverImageUrl: schema.blogPosts.coverImageUrl,
          slug: schema.blogPosts.slug,
        })
        .from(schema.blogPosts)
        .where(eq(schema.blogPosts.id, edition.blogPostId))
        .limit(1)
      if (post) {
        blogPost = {
          title: post.title,
          excerpt: post.excerpt || '',
          coverImageUrl: post.coverImageUrl,
          slug: post.slug,
        }
      }
    }

    // Fetch all active subscribers
    const subscribers = await db
      .select()
      .from(schema.newsletterSubscribers)
      .where(eq(schema.newsletterSubscribers.status, 'active'))

    const webUrl = process.env.WEB_URL || 'https://oppdate.app'
    const apiUrl = process.env.API_URL || 'http://localhost:4000'
    let sentCount = 0

    // Batch enqueue emails
    for (const sub of subscribers) {
      const unsubscribeUrl = `${apiUrl}/api/v1/newsletter/unsubscribe?token=${sub.unsubscribeToken}`
      const trackingPixelUrl = `${apiUrl}/api/v1/newsletter/track/${id}/${sub.id}.png`

      const { subject, html } = newsletterEditionEmail({
        subject: edition.subject,
        bodyHtml: edition.bodyHtml,
        preheaderText: edition.preheaderText || '',
        unsubscribeUrl,
        trackingPixelUrl,
        blogPost: blogPost ? {
          title: blogPost.title,
          excerpt: blogPost.excerpt,
          coverImageUrl: blogPost.coverImageUrl || '',
          slug: blogPost.slug,
          webUrl,
        } : undefined,
      })

      await enqueueEmail({ to: sub.email, subject, html })

      // Log the send
      await db.insert(schema.newsletterSendLog).values({
        editionId: id,
        subscriberId: sub.id,
      }).onConflictDoNothing()

      sentCount++
    }

    // Mark as sent
    await db.update(schema.newsletterEditions)
      .set({
        status: 'sent',
        sentAt: new Date(),
        sentCount,
        updatedAt: new Date(),
      })
      .where(eq(schema.newsletterEditions.id, id))

    return ok(reply, { sentCount }, `Newsletter sent to ${sentCount} subscribers.`)
  })

  // POST /admin/editions/:id/preview -- send preview to one email
  server.post('/admin/editions/:id/preview', { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const body = z.object({
      email: z.string().email(),
    }).safeParse(request.body)
    if (!body.success) return badRequest(reply, 'Please provide a valid email.')

    const [edition] = await db
      .select()
      .from(schema.newsletterEditions)
      .where(eq(schema.newsletterEditions.id, id))
      .limit(1)
    if (!edition) return notFound(reply, 'Edition')
    if (!edition.bodyHtml) return badRequest(reply, 'Edition has no content.')

    let blogPost: { title: string; excerpt: string; coverImageUrl: string | null; slug: string } | undefined
    if (edition.blogPostId) {
      const [post] = await db
        .select({
          title: schema.blogPosts.title,
          excerpt: schema.blogPosts.excerpt,
          coverImageUrl: schema.blogPosts.coverImageUrl,
          slug: schema.blogPosts.slug,
        })
        .from(schema.blogPosts)
        .where(eq(schema.blogPosts.id, edition.blogPostId))
        .limit(1)
      if (post) {
        blogPost = {
          title: post.title,
          excerpt: post.excerpt || '',
          coverImageUrl: post.coverImageUrl,
          slug: post.slug,
        }
      }
    }

    const webUrl = process.env.WEB_URL || 'https://oppdate.app'

    const { subject, html } = newsletterEditionEmail({
      subject: `[PREVIEW] ${edition.subject}`,
      bodyHtml: edition.bodyHtml,
      preheaderText: edition.preheaderText || '',
      unsubscribeUrl: '#',
      trackingPixelUrl: '',
      blogPost: blogPost ? {
        title: blogPost.title,
        excerpt: blogPost.excerpt,
        coverImageUrl: blogPost.coverImageUrl || '',
        slug: blogPost.slug,
        webUrl,
      } : undefined,
    })

    await enqueueEmail({ to: body.data.email, subject, html })

    return ok(reply, null, `Preview sent to ${body.data.email}.`)
  })

  // GET /admin/editions/:id -- single edition detail with send log
  server.get('/admin/editions/:id', { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const [edition] = await db
      .select({
        id: schema.newsletterEditions.id,
        subject: schema.newsletterEditions.subject,
        preheaderText: schema.newsletterEditions.preheaderText,
        bodyHtml: schema.newsletterEditions.bodyHtml,
        blogPostId: schema.newsletterEditions.blogPostId,
        status: schema.newsletterEditions.status,
        sentAt: schema.newsletterEditions.sentAt,
        sentCount: schema.newsletterEditions.sentCount,
        openCount: schema.newsletterEditions.openCount,
        createdAt: schema.newsletterEditions.createdAt,
        createdByName: schema.users.name,
      })
      .from(schema.newsletterEditions)
      .leftJoin(schema.users, eq(schema.newsletterEditions.createdBy, schema.users.id))
      .where(eq(schema.newsletterEditions.id, id))
      .limit(1)

    if (!edition) return notFound(reply, 'Edition')

    // Fetch send log entries
    const sendLog = await db
      .select({
        subscriberEmail: schema.newsletterSubscribers.email,
        subscriberName: schema.newsletterSubscribers.name,
        sentAt: schema.newsletterSendLog.sentAt,
        openedAt: schema.newsletterSendLog.openedAt,
      })
      .from(schema.newsletterSendLog)
      .leftJoin(schema.newsletterSubscribers, eq(schema.newsletterSendLog.subscriberId, schema.newsletterSubscribers.id))
      .where(eq(schema.newsletterSendLog.editionId, id))
      .orderBy(desc(schema.newsletterSendLog.sentAt))
      .limit(200)

    return ok(reply, { ...edition, sendLog })
  })

  // GET /admin/stats -- newsletter dashboard stats
  server.get('/admin/stats', { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (_request, reply) => {
    const [subStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${schema.newsletterSubscribers.status} = 'active')::int`,
      })
      .from(schema.newsletterSubscribers)

    const [editionStats] = await db
      .select({
        totalEditions: sql<number>`count(*)::int`,
        totalSent: sql<number>`coalesce(sum(${schema.newsletterEditions.sentCount}), 0)::int`,
        totalOpens: sql<number>`coalesce(sum(${schema.newsletterEditions.openCount}), 0)::int`,
      })
      .from(schema.newsletterEditions)
      .where(eq(schema.newsletterEditions.status, 'sent'))

    const totalSent = editionStats?.totalSent || 0
    const totalOpens = editionStats?.totalOpens || 0
    const avgOpenRate = totalSent > 0 ? Math.round((totalOpens / totalSent) * 100) : 0

    return ok(reply, {
      subscribers: subStats || { total: 0, active: 0 },
      editions: {
        sent: editionStats?.totalEditions || 0,
        avgOpenRate,
      },
    })
  })
}
