import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import { db, schema } from '../db'
import { eq, and, desc, asc, sql, ilike, or, gte, lte, lt, notInArray, gt } from 'drizzle-orm'
import { ok, created, badRequest, notFound, forbidden, paginated, unauthorised } from '../utils/response'
import { requireRole } from '../middleware/auth'
import { setAdminAuthCookies, clearAdminAuthCookies } from '../utils/cookies'
import argon2 from 'argon2'
import crypto from 'crypto'
import { sendEmail, applicationStatusEmail, adminInviteEmail } from '../utils/email'

const LOGO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
const LOGO_MAX_BYTES = 2 * 1024 * 1024
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'oppdate'

function getR2Client(): S3Client | null {
  const endpoint = process.env.R2_ENDPOINT
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!endpoint || !accessKeyId || !secretAccessKey) return null
  return new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId, secretAccessKey } })
}

// Helper to log admin actions
async function auditLog(adminId: string, action: string, targetType: string, targetId: string | null, metadata: Record<string, unknown> = {}, ipAddress?: string) {
  await db.insert(schema.adminAuditLog).values({
    adminId,
    action,
    targetType,
    targetId,
    metadata,
    ipAddress,
  })
}

export async function adminRoutes(server: FastifyInstance) {
  // ─── AUTH ────────────────────────────────────────────────────────────────────

  // POST /api/v1/admin/login -- admin-only login, sets oppdate_admin_token cookie
  server.post('/login', async (request, reply) => {
    const body = z
      .object({ email: z.string().email(), password: z.string() })
      .safeParse(request.body)
    if (!body.success) return badRequest(reply, body.error.errors[0].message)

    const { email, password } = body.data

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1)

    if (!user || !user.passwordHash) return unauthorised(reply, 'Invalid email or password.')

    const validPassword = await argon2.verify(user.passwordHash, password)
    if (!validPassword) return unauthorised(reply, 'Invalid email or password.')

    if (!['staff_admin', 'manager_admin', 'super_admin'].includes(user.role)) {
      return unauthorised(reply, 'Access denied.')
    }

    if (user.suspendedAt) return unauthorised(reply, 'This account has been suspended.')

    await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, user.id))

    const accessToken = server.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '8h' })

    setAdminAuthCookies(reply, accessToken)

    return ok(reply, {
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl },
      accessToken,
    }, 'Logged in.')
  })

  // POST /api/v1/admin/logout -- clear admin session cookies
  server.post('/logout', async (request, reply) => {
    clearAdminAuthCookies(reply)
    return ok(reply, null, 'Logged out.')
  })

  // PATCH /api/v1/admin/me -- update own name/email and optionally change password
  server.patch(
    '/me',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const body = z.object({
        name: z.string().min(1).max(120).optional(),
        email: z.string().email().optional(),
        newPassword: z.string().min(8).optional(),
      }).safeParse(request.body)

      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const payload = request.user as { id: string }
      const updates: Record<string, unknown> = { updatedAt: new Date() }

      if (body.data.name !== undefined) updates.name = body.data.name
      if (body.data.email !== undefined) {
        const [existing] = await db
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(and(eq(schema.users.email, body.data.email.toLowerCase()), sql`id != ${payload.id}`))
          .limit(1)
        if (existing) return badRequest(reply, 'That email is already in use.')
        updates.email = body.data.email.toLowerCase()
      }
      if (body.data.newPassword) {
        updates.passwordHash = await argon2.hash(body.data.newPassword, {
          memoryCost: process.env.NODE_ENV === 'production' ? 65536 : 8192,
          timeCost: process.env.NODE_ENV === 'production' ? 3 : 2,
          parallelism: 1,
        })
      }

      const rows = await db.update(schema.users).set(updates).where(eq(schema.users.id, payload.id)).returning()
      if (!rows[0]) return notFound(reply, 'User')

      const u = rows[0]
      return ok(reply, { id: u.id, email: u.email, name: u.name, role: u.role }, 'Account updated.')
    }
  )

  // ─── DASHBOARD / STATS ──────────────────────────────────────────────────────

  // GET /api/v1/admin/dashboard -- overview stats
  server.get(
    '/dashboard',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const user = request.user as { id: string; role: string }

      const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.users)
        .where(notInArray(schema.users.role, ['staff_admin', 'manager_admin', 'super_admin']))
      const [oppCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.opportunities).where(eq(schema.opportunities.status, 'published'))
      const [appCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.applications)

      const stats: Record<string, unknown> = {
        totalUsers: userCount?.count || 0,
        publishedOpportunities: oppCount?.count || 0,
        totalApplications: appCount?.count || 0,
      }

      // Revenue: founder only
      if (user.role === 'super_admin') {
        const [revenue] = await db
          .select({ total: sql<number>`coalesce(sum(amount_usd), 0)::int` })
          .from(schema.payments)
          .where(eq(schema.payments.status, 'succeeded'))
        stats.totalRevenueCents = revenue?.total || 0
      }

      // Recent applications (pipeline)
      const recentApps = await db
        .select({
          status: schema.applications.status,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.applications)
        .groupBy(schema.applications.status)

      stats.pipeline = recentApps

      // Platform health metrics
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      const now = new Date()

      const [stalledApps] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.applications)
        .where(
          and(
            sql`${schema.applications.status} not in ('accepted','rejected','withdrawn')`,
            lt(schema.applications.updatedAt, threeDaysAgo)
          )
        )

      const [unreadMessages] = await db
        .select({ total: sql<number>`coalesce(sum(unread_by_team), 0)::int` })
        .from(schema.messageThreads)

      const [expiringListings] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.opportunities)
        .where(
          and(
            eq(schema.opportunities.status, 'published'),
            gte(schema.opportunities.deadline, now),
            lte(schema.opportunities.deadline, sevenDaysFromNow)
          )
        )

      const [adminSessionCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.users)
        .where(sql`${schema.users.role} in ('staff_admin','manager_admin','super_admin')`)

      stats.health = {
        stalledApplications: stalledApps?.count ?? 0,
        unreadMessages: unreadMessages?.total ?? 0,
        expiringListings: expiringListings?.count ?? 0,
        adminUserCount: adminSessionCount?.count ?? 0,
      }

      // Signup delta: new non-admin users in last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const [newUsers] = await db.select({ count: sql<number>`count(*)::int` })
        .from(schema.users)
        .where(and(
          notInArray(schema.users.role, ['staff_admin', 'manager_admin', 'super_admin']),
          gte(schema.users.createdAt, sevenDaysAgo)
        ))
      stats.signupDelta = newUsers?.count ?? 0

      // 7-day trend arrays (index 0 = 6 days ago, index 6 = today)
      const appTrend = await db.execute(sql`
        SELECT d::date AS day, COUNT(a.id)::int AS cnt
        FROM generate_series(now() - interval '6 days', now(), interval '1 day') AS d
        LEFT JOIN applications a ON a.created_at::date = d::date
        GROUP BY d ORDER BY d
      `)
      const userTrend = await db.execute(sql`
        SELECT d::date AS day, COUNT(u.id)::int AS cnt
        FROM generate_series(now() - interval '6 days', now(), interval '1 day') AS d
        LEFT JOIN users u ON u.created_at::date = d::date
          AND u.role NOT IN ('staff_admin','manager_admin','super_admin')
        GROUP BY d ORDER BY d
      `)
      const oppTrend = await db.execute(sql`
        SELECT d::date AS day, COUNT(o.id)::int AS cnt
        FROM generate_series(now() - interval '6 days', now(), interval '1 day') AS d
        LEFT JOIN opportunities o ON o.created_at::date = d::date
          AND o.status = 'published'
        GROUP BY d ORDER BY d
      `)
      const revTrend = await db.execute(sql`
        SELECT d::date AS day, COALESCE(SUM(p.amount_usd),0)::int AS cnt
        FROM generate_series(now() - interval '6 days', now(), interval '1 day') AS d
        LEFT JOIN payments p ON p.created_at::date = d::date
          AND p.status = 'succeeded'
        GROUP BY d ORDER BY d
      `)
      stats.trends = {
        applications: (appTrend.rows as { cnt: number }[]).map(r => r.cnt),
        users: (userTrend.rows as { cnt: number }[]).map(r => r.cnt),
        opportunities: (oppTrend.rows as { cnt: number }[]).map(r => r.cnt),
        revenue: (revTrend.rows as { cnt: number }[]).map(r => r.cnt),
      }

      // Needs-attention items
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const [oldUnread] = await db.select({ count: sql<number>`count(*)::int` })
        .from(schema.messageThreads)
        .where(and(
          sql`${schema.messageThreads.unreadByTeam} > 0`,
          lt(schema.messageThreads.lastMessageAt, oneDayAgo)
        ))
      const [missingLinks] = await db.select({ count: sql<number>`count(*)::int` })
        .from(schema.consultations)
        .where(and(
          sql`${schema.consultations.status} in ('pending','confirmed')`,
          sql`${schema.consultations.meetingLink} IS NULL`
        ))
      stats.needsAttention = {
        stalledApplications: stalledApps?.count ?? 0,
        oldUnreadThreads: oldUnread?.count ?? 0,
        missingMeetingLinks: missingLinks?.count ?? 0,
        expiringListings: expiringListings?.count ?? 0,
      }

      return ok(reply, stats)
    }
  )

  // ─── OPPORTUNITIES (ADMIN) ──────────────────────────────────────────────────

  // GET /api/v1/admin/opportunities -- all statuses + app counts
  server.get(
    '/opportunities',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const query = request.query as { status?: string; type?: string; search?: string; page?: string; limit?: string }
      const page = Math.max(Number(query.page) || 1, 1)
      const limit = Math.min(Number(query.limit) || 50, 100)
      const offset = (page - 1) * limit

      const conditions: ReturnType<typeof eq>[] = []
      if (query.status && query.status !== 'all') {
        conditions.push(eq(schema.opportunities.status, query.status as any))
      }
      if (query.type && query.type !== 'all') {
        conditions.push(eq(schema.opportunities.type, query.type as any))
      }
      if (query.search) {
        const s = `%${query.search}%`
        conditions.push(or(
          ilike(schema.opportunities.title, s),
          ilike(schema.opportunities.institution, s),
        )!)
      }

      const rows = await db
        .select({
          id: schema.opportunities.id,
          title: schema.opportunities.title,
          slug: schema.opportunities.slug,
          type: schema.opportunities.type,
          status: schema.opportunities.status,
          institution: schema.opportunities.institution,
          country: schema.opportunities.country,
          region: schema.opportunities.region,
          complianceCategory: schema.opportunities.complianceCategory,
          deadline: schema.opportunities.deadline,
          oppdateServiceFeeUsd: schema.opportunities.oppdateServiceFeeUsd,
          institutionFeeUsd: schema.opportunities.institutionFeeUsd,
          oppDateApply: schema.opportunities.oppDateApply,
          applyDisabledNote: schema.opportunities.applyDisabledNote,
          featured: schema.opportunities.featured,
          pinned: schema.opportunities.pinned,
          summary: schema.opportunities.summary,
          description: schema.opportunities.description,
          whoItsFor: schema.opportunities.whoItsFor,
          whatIsOffered: schema.opportunities.whatIsOffered,
          eligibilityCriteria: schema.opportunities.eligibilityCriteria,
          requiredDocuments: schema.opportunities.requiredDocuments,
          tags: schema.opportunities.tags,
          createdAt: schema.opportunities.createdAt,
          updatedAt: schema.opportunities.updatedAt,
          viewCount: schema.opportunities.viewCount,
          saveCount: sql<number>`(
            SELECT COUNT(*)::int FROM saved_opportunities s WHERE s.opportunity_id = opportunities.id
          )`,
          appCount: sql<number>`(
            SELECT COUNT(*)::int FROM applications a WHERE a.opportunity_id = opportunities.id
          )`,
          inProgressCount: sql<number>`(
            SELECT COUNT(*)::int FROM applications a
            WHERE a.opportunity_id = opportunities.id
              AND a.status NOT IN ('submitted','accepted','rejected','withdrawn')
          )`,
          submittedCount: sql<number>`(
            SELECT COUNT(*)::int FROM applications a
            WHERE a.opportunity_id = opportunities.id
              AND a.status IN ('submitted','accepted')
          )`,
        })
        .from(schema.opportunities)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(schema.opportunities.createdAt))
        .limit(limit)
        .offset(offset)

      return ok(reply, rows)
    }
  )

  // PATCH /api/v1/admin/opportunities/:id/apply-toggle -- toggle oppDateApply
  server.patch(
    '/opportunities/:id/apply-toggle',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = request.body as { enabled: boolean; note?: string }

      const [updated] = await db
        .update(schema.opportunities)
        .set({
          oppDateApply: body.enabled,
          applyDisabledNote: body.note ?? null,
          updatedAt: new Date(),
        })
        .where(eq(schema.opportunities.id, id))
        .returning()

      if (!updated) return notFound(reply, 'Opportunity')
      return ok(reply, updated)
    }
  )

  // GET /api/v1/admin/opportunities/:id/metrics?period=7d|30d|90d
  server.get(
    '/opportunities/:id/metrics',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { period = '30d' } = request.query as { period?: string }

      const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
      const since = new Date(Date.now() - days * 86400000)

      const [opp] = await db
        .select({ id: schema.opportunities.id, viewCount: schema.opportunities.viewCount })
        .from(schema.opportunities)
        .where(eq(schema.opportunities.id, id))
        .limit(1)

      if (!opp) return notFound(reply, 'Opportunity')

      // Views in period (from events table)
      const [viewsRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.opportunityEvents)
        .where(
          and(
            eq(schema.opportunityEvents.opportunityId, id),
            eq(schema.opportunityEvents.eventType, 'view_detail'),
            gte(schema.opportunityEvents.occurredAt, since)
          )
        )

      // Net saves (current count from savedOpportunities)
      const [savesRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.savedOpportunities)
        .where(eq(schema.savedOpportunities.opportunityId, id))

      // Applications total + status breakdown
      const appRows = await db
        .select({
          status: schema.applications.status,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.applications)
        .where(eq(schema.applications.opportunityId, id))
        .groupBy(schema.applications.status)

      const totalApps = appRows.reduce((s, r) => s + r.count, 0)

      // Guide opens (sessions referencing this opp's slug)
      const [guideRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.guideSessionLogs)
        .innerJoin(schema.opportunities, eq(schema.guideSessionLogs.opportunitySlug, schema.opportunities.slug))
        .where(
          and(
            eq(schema.opportunities.id, id),
            gte(schema.guideSessionLogs.startedAt, since)
          )
        )

      // Daily trend: views + applies grouped by day
      const trendRows = await db.execute(sql`
        SELECT
          date_trunc('day', occurred_at)::date AS day,
          COUNT(*) FILTER (WHERE event_type = 'view_detail') AS views,
          COUNT(*) FILTER (WHERE event_type = 'apply_start') AS applies
        FROM opportunity_events
        WHERE opportunity_id = ${id}
          AND occurred_at >= ${since}
        GROUP BY 1
        ORDER BY 1 ASC
      `)

      // Platform average conversion (apps / views across all published opps, last 30d)
      const platformRaw = await db.execute(sql`
        SELECT
          ROUND(
            100.0 * COUNT(DISTINCT a.id) / NULLIF(COUNT(DISTINCT e.id), 0),
            1
          ) AS avg_conversion
        FROM opportunities o
        LEFT JOIN applications a ON a.opportunity_id = o.id
        LEFT JOIN opportunity_events e ON e.opportunity_id = o.id
          AND e.event_type = 'view_detail'
          AND e.occurred_at >= NOW() - INTERVAL '30 days'
        WHERE o.status = 'published'
      `)
      const platformRows = (platformRaw as unknown as { rows: Record<string, unknown>[] }).rows ?? (platformRaw as unknown as Record<string, unknown>[])
      const platformRow = platformRows[0]

      const trendData = (trendRows as unknown as { rows: Record<string, unknown>[] }).rows ?? (trendRows as unknown as Record<string, unknown>[])

      const views = Number(viewsRow?.count ?? 0)
      const saves = Number(savesRow?.count ?? 0)
      const conversionRate = views > 0 ? Math.round((totalApps / views) * 1000) / 10 : 0
      const platformAvgConversion = parseFloat(String(platformRow?.avg_conversion ?? '0')) || 0

      return ok(reply, {
        views,
        saves,
        applications: totalApps,
        conversionRate,
        guideOpens: Number(guideRow?.count ?? 0),
        platformAvgConversion,
        statusBreakdown: appRows,
        trend: trendData.map(r => ({
          date: String(r.day),
          views: Number(r.views ?? 0),
          applies: Number(r.applies ?? 0),
        })),
      })
    }
  )

  // ─── USERS ──────────────────────────────────────────────────────────────────

  // GET /api/v1/admin/users -- list users with search/filter
  server.get(
    '/users',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const query = request.query as { search?: string; role?: string; isPremium?: string; page?: string; limit?: string }
      const page = Math.max(Number(query.page) || 1, 1)
      const limit = Math.min(Number(query.limit) || 20, 100)
      const offset = (page - 1) * limit

      const conditions = []
      if (query.search) {
        conditions.push(
          or(
            ilike(schema.users.email, `%${query.search}%`),
            ilike(schema.users.name, `%${query.search}%`)
          )
        )
      }
      if (query.role) {
        conditions.push(eq(schema.users.role, query.role as any))
      }
      if (query.isPremium === 'true') {
        conditions.push(eq(schema.users.isPremium, true))
      } else if (query.isPremium === 'false') {
        conditions.push(eq(schema.users.isPremium, false))
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      const rows = await db
        .select({
          id: schema.users.id,
          email: schema.users.email,
          name: schema.users.name,
          role: schema.users.role,
          avatarUrl: schema.users.avatarUrl,
          isPremium: schema.users.isPremium,
          premiumUntil: schema.users.premiumUntil,
          isEmailVerified: schema.users.isEmailVerified,
          suspendedAt: schema.users.suspendedAt,
          lastLoginAt: schema.users.lastLoginAt,
          createdAt: schema.users.createdAt,
          applicationCount: sql<number>`(SELECT COUNT(*)::int FROM applications WHERE user_id = users.id)`,
          totalSpentCents: sql<number>`(SELECT COALESCE(SUM(amount_usd),0)::int FROM payments WHERE user_id = users.id AND status = 'succeeded')`,
        })
        .from(schema.users)
        .where(whereClause)
        .orderBy(desc(schema.users.createdAt))
        .limit(limit)
        .offset(offset)

      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.users)
        .where(whereClause)

      return paginated(reply, rows, total?.count || 0, page, limit)
    }
  )

  // GET /api/v1/admin/users/:id -- user detail
  server.get(
    '/users/:id',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const [user] = await db
        .select({
          id: schema.users.id,
          email: schema.users.email,
          name: schema.users.name,
          role: schema.users.role,
          avatarUrl: schema.users.avatarUrl,
          isPremium: schema.users.isPremium,
          premiumSince: schema.users.premiumSince,
          premiumUntil: schema.users.premiumUntil,
          isEmailVerified: schema.users.isEmailVerified,
          suspendedAt: schema.users.suspendedAt,
          lastLoginAt: schema.users.lastLoginAt,
          createdAt: schema.users.createdAt,
          preferences: schema.users.preferences,
        })
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .limit(1)

      if (!user) return notFound(reply, 'User')

      // Fetch related counts and payment history
      const [appCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.applications)
        .where(eq(schema.applications.userId, id))

      const [docCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.documents)
        .where(eq(schema.documents.userId, id))

      const paymentHistory = await db
        .select({
          id: schema.payments.id,
          purpose: schema.payments.purpose,
          amountUsd: schema.payments.amountUsd,
          status: schema.payments.status,
          gateway: schema.payments.gateway,
          createdAt: schema.payments.createdAt,
        })
        .from(schema.payments)
        .where(eq(schema.payments.userId, id))
        .orderBy(desc(schema.payments.createdAt))
        .limit(20)

      return ok(reply, {
        ...user,
        applicationCount: appCount?.count || 0,
        documentCount: docCount?.count || 0,
        paymentHistory,
      })
    }
  )

  // PATCH /api/v1/admin/users/:id/suspend -- suspend a user
  server.patch(
    '/users/:id/suspend',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const { id } = request.params as { id: string }

      const rows = await db
        .update(schema.users)
        .set({ suspendedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.users.id, id))
        .returning()

      if (!rows[0]) return notFound(reply, 'User')

      await auditLog(admin.id, 'user.suspend', 'user', id, {}, request.ip)

      // Invalidate all refresh tokens
      await db.delete(schema.refreshTokens).where(eq(schema.refreshTokens.userId, id))

      return ok(reply, rows[0], 'User suspended.')
    }
  )

  // PATCH /api/v1/admin/users/:id/unsuspend -- unsuspend a user
  server.patch(
    '/users/:id/unsuspend',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const { id } = request.params as { id: string }

      const rows = await db
        .update(schema.users)
        .set({ suspendedAt: null, updatedAt: new Date() })
        .where(eq(schema.users.id, id))
        .returning()

      if (!rows[0]) return notFound(reply, 'User')

      await auditLog(admin.id, 'user.unsuspend', 'user', id, {}, request.ip)

      return ok(reply, rows[0], 'User unsuspended.')
    }
  )

  // PATCH /api/v1/admin/users/:id/premium -- grant or revoke premium
  server.patch(
    '/users/:id/premium',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const { id } = request.params as { id: string }
      const body = z.object({
        isPremium: z.boolean(),
        plan: z.enum(['monthly', 'yearly']).optional(),
      }).safeParse(request.body)
      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const now = new Date()
      let premiumUntil: Date | null = null
      if (body.data.isPremium) {
        premiumUntil = new Date(now)
        if (body.data.plan === 'yearly') {
          premiumUntil.setFullYear(premiumUntil.getFullYear() + 1)
        } else {
          premiumUntil.setDate(premiumUntil.getDate() + 30)
        }
      }

      const [updated] = await db
        .update(schema.users)
        .set({
          isPremium: body.data.isPremium,
          premiumSince: body.data.isPremium ? now : null,
          premiumUntil,
        })
        .where(eq(schema.users.id, id))
        .returning()

      if (!updated) return notFound(reply, 'User')
      await auditLog(admin.id, 'user.premium_toggle', 'user', id, { isPremium: body.data.isPremium, plan: body.data.plan }, request.ip)
      return ok(reply, updated)
    }
  )

  // DELETE /api/v1/admin/users/:id -- hard delete user (founder only, requires email confirmation)
  server.delete(
    '/users/:id',
    { preHandler: [requireRole('super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const { id } = request.params as { id: string }
      const body = z.object({ confirmEmail: z.string().email() }).safeParse(request.body)
      if (!body.success) return badRequest(reply, 'confirmEmail is required to delete a user.')

      const [user] = await db
        .select({ email: schema.users.email })
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .limit(1)

      if (!user) return notFound(reply, 'User')

      if (body.data.confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
        return badRequest(reply, 'Email confirmation does not match. Deletion aborted.')
      }

      // Cascade delete (most FKs have onDelete: cascade)
      await db.delete(schema.users).where(eq(schema.users.id, id))

      await auditLog(admin.id, 'user.delete', 'user', id, { email: user.email }, request.ip)

      return ok(reply, null, 'User permanently deleted.')
    }
  )

  // PATCH /api/v1/admin/users/:id/role -- change an admin's role (super_admin only)
  server.patch(
    '/users/:id/role',
    { preHandler: [requireRole('super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const { id } = request.params as { id: string }
      const body = z
        .object({ role: z.enum(['staff_admin', 'manager_admin']) })
        .safeParse(request.body)
      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      if (id === admin.id) return badRequest(reply, 'You cannot change your own role.')

      const [user] = await db
        .select({ id: schema.users.id, role: schema.users.role, email: schema.users.email })
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .limit(1)

      if (!user) return notFound(reply, 'User')
      if (user.role === 'super_admin') return badRequest(reply, 'Super admin role cannot be changed.')
      if (!['staff_admin', 'manager_admin', 'super_admin'].includes(user.role)) {
        return badRequest(reply, 'This user is not an admin.')
      }

      const prevRole = user.role
      const [updated] = await db
        .update(schema.users)
        .set({ role: body.data.role, updatedAt: new Date() })
        .where(eq(schema.users.id, id))
        .returning()

      await auditLog(admin.id, 'admin.role_change', 'user', id, { from: prevRole, to: body.data.role, email: user.email }, request.ip)

      return ok(reply, updated, 'Role updated.')
    }
  )

  // ─── ADMIN ACCOUNTS ─────────────────────────────────────────────────────────

  // POST /api/v1/admin/invite -- invite new admin (founder only)
  server.post(
    '/invite',
    { preHandler: [requireRole('super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const body = z
        .object({
          email: z.string().email(),
          name: z.string().min(2),
          role: z.enum(['staff_admin', 'manager_admin', 'super_admin']),
        })
        .safeParse(request.body)

      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      // Check email not already in use
      const [existing] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, body.data.email.toLowerCase()))
        .limit(1)

      if (existing) return badRequest(reply, 'This email is already registered. Use a different email address for admin access.')

      // Create admin account with no password (they set it via invite link)
      const inviteToken = crypto.randomBytes(32).toString('hex')

      const rows = await db
        .insert(schema.users)
        .values({
          email: body.data.email.toLowerCase(),
          name: body.data.name,
          role: body.data.role,
        })
        .returning()

      await auditLog(admin.id, 'admin.invite', 'user', rows[0].id, { role: body.data.role }, request.ip)

      // Generate invite link (admin sets password via this)
      const webUrl = process.env.WEB_URL || 'http://localhost:3000'
      const inviteLink = `${webUrl}/admin/accept-invite?token=${server.jwt.sign({ type: 'admin_invite', userId: rows[0].id }, { expiresIn: '48h' })}`

      const emailParams = adminInviteEmail(body.data.name, inviteLink)
      sendEmail({ ...emailParams, to: body.data.email }).catch(() => {})

      return created(reply, { user: rows[0], inviteLink }, 'Admin invited.')
    }
  )

  // POST /api/v1/admin/accept-invite -- set password via invite link
  server.post('/accept-invite', async (request, reply) => {
    const body = z
      .object({
        token: z.string(),
        password: z.string().min(8),
      })
      .safeParse(request.body)

    if (!body.success) return badRequest(reply, body.error.errors[0].message)

    let payload: { type: string; userId: string }
    try {
      payload = server.jwt.verify(body.data.token) as { type: string; userId: string }
    } catch {
      return badRequest(reply, 'Invalid or expired invite token.')
    }

    if (payload.type !== 'admin_invite') return badRequest(reply, 'Invalid invite token.')

    const passwordHash = await argon2.hash(body.data.password)

    const rows = await db
      .update(schema.users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(schema.users.id, payload.userId))
      .returning()

    if (!rows[0]) return notFound(reply, 'User')

    return ok(reply, null, 'Password set. You can now log in.')
  })

  // ─── OPPORTUNITIES (admin-specific) ─────────────────────────────────────────

  // POST /api/v1/admin/opportunities/import -- CSV bulk import
  server.post(
    '/opportunities/import',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      // CSV import - accepts JSON array for now, CSV parsing to come with BullMQ
      const body = z
        .array(
          z.object({
            title: z.string(),
            type: z.string(),
            institution: z.string(),
            country: z.string(),
            region: z.string(),
            summary: z.string(),
            description: z.string(),
            whoItsFor: z.string(),
            whatIsOffered: z.string(),
            deadline: z.string().datetime(),
          })
        )
        .safeParse(request.body)

      if (!body.success) return badRequest(reply, 'Invalid import data format.')

      const admin = request.user as { id: string }
      const batchId = crypto.randomUUID()
      let imported = 0

      for (const item of body.data) {
        const slug = item.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          + '-' + Date.now().toString(36)

        await db.insert(schema.opportunities).values({
          ...item,
          type: item.type as any,
          deadline: new Date(item.deadline),
          slug,
          status: 'draft',
          eligibilityCriteria: [],
          requiredDocuments: [],
          tags: [],
          csvImportBatchId: batchId,
          createdBy: admin.id,
        })
        imported++
      }

      await auditLog(admin.id, 'opportunities.import', 'opportunity', null, { batchId, count: imported }, request.ip)

      return ok(reply, { batchId, imported }, `${imported} opportunities imported as drafts.`)
    }
  )

  // GET /api/v1/admin/opportunities/archive-settings
  server.get(
    '/opportunities/archive-settings',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (_request, reply) => {
      const row = await db
        .select()
        .from(schema.platformConfig)
        .where(eq(schema.platformConfig.key, 'auto_archive_settings'))
        .limit(1)
      const defaults = { enabled: false, daysAfterDeadline: 7, applyToStatuses: ['expired'] }
      return ok(reply, row[0] ? (row[0].value as object) : defaults)
    }
  )

  // PATCH /api/v1/admin/opportunities/archive-settings
  server.patch(
    '/opportunities/archive-settings',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const body = z.object({
        enabled: z.boolean(),
        daysAfterDeadline: z.number().int().min(1).max(365),
        applyToStatuses: z.array(z.enum(['expired', 'draft'])),
      }).safeParse(request.body)

      if (!body.success) return badRequest(reply, 'Invalid settings.')

      const admin = request.user as { id: string }
      await db
        .insert(schema.platformConfig)
        .values({ key: 'auto_archive_settings', value: body.data, updatedBy: admin.id, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: schema.platformConfig.key,
          set: { value: body.data, updatedBy: admin.id, updatedAt: new Date() },
        })

      await auditLog(admin.id, 'opportunities.archive_settings_updated', 'platform_config', null, body.data, request.ip)
      return ok(reply, body.data, 'Auto-archive settings saved.')
    }
  )

  // ─── APPLICATIONS (admin pipeline) ──────────────────────────────────────────

  // GET /api/v1/admin/applications -- all applications with user + opportunity joins
  server.get(
    '/applications',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const query = request.query as { status?: string; page?: string; limit?: string; search?: string; id?: string; sort?: string; opportunityId?: string; assignedTo?: string }
      const page = Math.max(Number(query.page) || 1, 1)
      const limit = Math.min(Number(query.limit) || 20, 100)
      const offset = (page - 1) * limit

      const conditions = []
      if (query.id) {
        conditions.push(eq(schema.applications.id, query.id))
      }
      if (query.status) {
        conditions.push(eq(schema.applications.status, query.status as any))
      }
      if (query.opportunityId) {
        conditions.push(eq(schema.applications.opportunityId, query.opportunityId))
      }
      if (query.assignedTo === 'unassigned') {
        conditions.push(sql`${schema.applications.assignedTo} IS NULL`)
      } else if (query.assignedTo) {
        conditions.push(eq(schema.applications.assignedTo, query.assignedTo))
      }
      if (query.search) {
        const s = `%${query.search}%`
        conditions.push(or(
          ilike(schema.users.name, s),
          ilike(schema.users.email, s),
          ilike(schema.applications.referenceId, s),
        ))
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined
      const orderCol = query.sort === 'asc'
        ? asc(schema.applications.createdAt)
        : desc(schema.applications.createdAt)

      const rows = await db
        .select({
          id: schema.applications.id,
          userId: schema.applications.userId,
          opportunityId: schema.applications.opportunityId,
          status: schema.applications.status,
          currentStep: schema.applications.currentStep,
          eligibilityResponses: schema.applications.eligibilityResponses,
          paymentId: schema.applications.paymentId,
          referenceId: schema.applications.referenceId,
          authorizationAgreementId: schema.applications.authorizationAgreementId,
          assignedTo: schema.applications.assignedTo,
          submittedAt: schema.applications.submittedAt,
          resolvedAt: schema.applications.resolvedAt,
          adminNotes: schema.applications.adminNotes,
          createdAt: schema.applications.createdAt,
          updatedAt: schema.applications.updatedAt,
          userName: schema.users.name,
          userEmail: schema.users.email,
          userAvatarUrl: schema.users.avatarUrl,
          oppTitle: schema.opportunities.title,
          oppType: schema.opportunities.type,
          oppInstitution: schema.opportunities.institution,
          oppCountry: schema.opportunities.country,
          oppDeadline: schema.opportunities.deadline,
          oppComplianceCategory: schema.opportunities.complianceCategory,
          oppServiceFeeUsd: schema.opportunities.oppdateServiceFeeUsd,
          oppInstitutionFeeUsd: schema.opportunities.institutionFeeUsd,
          assigneeName: sql<string | null>`(SELECT name FROM users WHERE id = ${schema.applications.assignedTo})`,
          assigneeEmail: sql<string | null>`(SELECT email FROM users WHERE id = ${schema.applications.assignedTo})`,
          assigneeAvatarUrl: sql<string | null>`(SELECT avatar_url FROM users WHERE id = ${schema.applications.assignedTo})`,
        })
        .from(schema.applications)
        .leftJoin(schema.users, eq(schema.applications.userId, schema.users.id))
        .leftJoin(schema.opportunities, eq(schema.applications.opportunityId, schema.opportunities.id))
        .where(whereClause)
        .orderBy(orderCol)
        .limit(limit)
        .offset(offset)

      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.applications)
        .leftJoin(schema.users, eq(schema.applications.userId, schema.users.id))
        .where(whereClause)

      // Always count across all statuses (ignoring the current status filter) for tab badges
      const statusCountRows = await db
        .select({
          status: schema.applications.status,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.applications)
        .groupBy(schema.applications.status)

      const stageCounts: Record<string, number> = {}
      for (const row of statusCountRows) {
        stageCounts[row.status] = row.count
      }

      const count = total?.count || 0
      return reply.status(200).send({
        success: true,
        data: rows,
        total: count,
        page,
        limit,
        hasMore: page * limit < count,
        totalPages: Math.ceil(count / limit) || 1,
        stageCounts,
      })
    }
  )

  // PATCH /api/v1/admin/applications/:id/status -- advance/update application status
  server.patch(
    '/applications/:id/status',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = z.object({ status: z.string(), adminNotes: z.string().optional() }).safeParse(request.body)
      if (!body.success) return badRequest(reply, 'Invalid body.')

      const admin = request.user as { id: string }
      const [row] = await db
        .update(schema.applications)
        .set({ status: body.data.status as any, adminNotes: body.data.adminNotes, updatedAt: new Date() })
        .where(eq(schema.applications.id, id))
        .returning()

      if (!row) return notFound(reply, 'Application not found.')

      await auditLog(admin.id, 'applications.status_updated', 'application', id, { status: body.data.status }, request.ip)

      // Send status update email to the applicant (fire-and-forget)
      const [applicant] = await db
        .select({ name: schema.users.name, email: schema.users.email })
        .from(schema.users)
        .where(eq(schema.users.id, row.userId))
      if (applicant) {
        const emailParams = applicationStatusEmail(applicant.name ?? 'there', row.referenceId ?? row.id, body.data.status)
        sendEmail({ ...emailParams, to: applicant.email }).catch(() => {})
      }

      return ok(reply, row, 'Status updated.')
    }
  )

  // PATCH /api/v1/admin/applications/:id/notes -- save admin notes
  server.patch(
    '/applications/:id/notes',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = z.object({ adminNotes: z.string() }).safeParse(request.body)
      if (!body.success) return badRequest(reply, 'Invalid body.')

      const [row] = await db
        .update(schema.applications)
        .set({ adminNotes: body.data.adminNotes, updatedAt: new Date() })
        .where(eq(schema.applications.id, id))
        .returning()

      if (!row) return notFound(reply, 'Application not found.')
      return ok(reply, row, 'Notes saved.')
    }
  )

  // PATCH /api/v1/admin/applications/:id/assign -- assign or unassign a team member
  server.patch(
    '/applications/:id/assign',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = z.object({ assignedTo: z.string().uuid().nullable() }).safeParse(request.body)
      if (!body.success) return badRequest(reply, 'Invalid body.')

      // Verify assignee is an admin if provided
      if (body.data.assignedTo) {
        const [assignee] = await db.select({ role: schema.users.role }).from(schema.users).where(eq(schema.users.id, body.data.assignedTo))
        if (!assignee) return badRequest(reply, 'Assignee not found.')
        if (!['staff_admin', 'manager_admin', 'super_admin'].includes(assignee.role)) return badRequest(reply, 'Assignee must be an admin team member.')
      }

      const [row] = await db
        .update(schema.applications)
        .set({ assignedTo: body.data.assignedTo, updatedAt: new Date() })
        .where(eq(schema.applications.id, id))
        .returning()

      if (!row) return notFound(reply, 'Application not found.')
      return ok(reply, row, 'Application assigned.')
    }
  )

  // GET /api/v1/admin/team-members -- list all admin users for the assignee picker
  server.get(
    '/team-members',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (_request, reply) => {
      const rows = await db
        .select({
          id: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
          role: schema.users.role,
          avatarUrl: schema.users.avatarUrl,
        })
        .from(schema.users)
        .where(sql`${schema.users.role} IN ('staff_admin', 'manager_admin', 'super_admin')`)
        .orderBy(asc(schema.users.name))
      return ok(reply, rows)
    }
  )

  // GET /api/v1/admin/applications/:id/documents -- fetch document slots with file metadata
  server.get(
    '/applications/:id/documents',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const rows = await db
        .select({
          id: schema.applicationDocuments.id,
          slotLabel: schema.applicationDocuments.slotLabel,
          documentType: schema.applicationDocuments.documentType,
          readinessStatus: schema.applicationDocuments.readinessStatus,
          documentId: schema.applicationDocuments.documentId,
          fileName: schema.documents.name,
          fileUrl: schema.documents.fileUrl,
          fileSize: schema.documents.fileSize,
          mimeType: schema.documents.mimeType,
          uploadedAt: schema.documents.uploadedAt,
        })
        .from(schema.applicationDocuments)
        .leftJoin(schema.documents, eq(schema.applicationDocuments.documentId, schema.documents.id))
        .where(eq(schema.applicationDocuments.applicationId, id))

      return ok(reply, rows)
    }
  )

  // ─── PAYMENTS (admin view) ──────────────────────────────────────────────────

  // GET /api/v1/admin/payments -- unified transaction ledger
  server.get(
    '/payments',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const user = request.user as { id: string; role: string }
      const query = request.query as {
        status?: string
        purpose?: string
        gateway?: string
        page?: string
        limit?: string
      }

      const page = Math.max(Number(query.page) || 1, 1)
      const limit = Math.min(Number(query.limit) || 50, 100)
      const offset = (page - 1) * limit

      const conditions = []
      if (query.status) conditions.push(eq(schema.payments.status, query.status as any))
      if (query.purpose) conditions.push(eq(schema.payments.purpose, query.purpose as any))
      if (query.gateway) conditions.push(eq(schema.payments.gateway, query.gateway as any))

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      const rows = await db
        .select({
          id: schema.payments.id,
          userId: schema.payments.userId,
          purpose: schema.payments.purpose,
          referenceId: schema.payments.referenceId,
          gateway: schema.payments.gateway,
          gatewayPaymentId: schema.payments.gatewayPaymentId,
          amountUsd: schema.payments.amountUsd,
          status: schema.payments.status,
          metadata: schema.payments.metadata,
          createdAt: schema.payments.createdAt,
          updatedAt: schema.payments.updatedAt,
          userName: schema.users.name,
          userEmail: schema.users.email,
          userAvatarUrl: schema.users.avatarUrl,
          opportunityTitle: schema.opportunities.title,
        })
        .from(schema.payments)
        .leftJoin(schema.users, eq(schema.payments.userId, schema.users.id))
        .leftJoin(
          schema.applications,
          eq(schema.payments.referenceId, schema.applications.id)
        )
        .leftJoin(
          schema.opportunities,
          eq(schema.applications.opportunityId, schema.opportunities.id)
        )
        .where(whereClause)
        .orderBy(desc(schema.payments.createdAt))
        .limit(limit)
        .offset(offset)

      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.payments)
        .where(whereClause)

      // Revenue summary: founder only
      let revenueSummary = null
      if (user.role === 'super_admin') {
        const [rev] = await db
          .select({
            gross: sql<number>`coalesce(sum(amount_usd), 0)::int`,
            count: sql<number>`count(*)::int`,
          })
          .from(schema.payments)
          .where(
            whereClause
              ? and(whereClause, eq(schema.payments.status, 'succeeded'))
              : eq(schema.payments.status, 'succeeded')
          )
        revenueSummary = { grossCents: rev?.gross || 0, transactionCount: rev?.count || 0 }
      }

      return ok(reply, {
        payments: rows,
        total: total?.count || 0,
        page,
        limit,
        hasMore: page * limit < (total?.count || 0),
        revenueSummary,
      })
    }
  )

  // POST /api/v1/admin/payments/:id/refund -- initiate refund (founder only)
  server.post(
    '/payments/:id/refund',
    { preHandler: [requireRole('super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const { id } = request.params as { id: string }

      const [payment] = await db
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.id, id))
        .limit(1)

      if (!payment) return notFound(reply, 'Payment')
      if (payment.status !== 'succeeded') {
        return badRequest(reply, 'Only succeeded payments can be refunded.')
      }

      await db
        .update(schema.payments)
        .set({ status: 'refunded', updatedAt: new Date() })
        .where(eq(schema.payments.id, id))

      await auditLog(admin.id, 'payment.refund', 'payment', id, {
        amount: payment.amountUsd,
        gateway: payment.gateway,
      }, request.ip)

      return ok(reply, null, 'Payment marked as refunded. Process the actual refund in the gateway dashboard.')
    }
  )

  // ─── ANALYTICS ──────────────────────────────────────────────────────────────

  // GET /api/v1/admin/analytics -- platform analytics
  server.get(
    '/analytics',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const user = request.user as { id: string; role: string }

      const [activeUsers] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.users)
        .where(eq(schema.users.role, 'user'))

      const [premiumUsers] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.users)
        .where(eq(schema.users.isPremium, true))

      const [publishedOps] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.opportunities)
        .where(eq(schema.opportunities.status, 'published'))

      const [totalApps] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.applications)

      const stats: Record<string, unknown> = {
        activeUsers: activeUsers?.count || 0,
        premiumUsers: premiumUsers?.count || 0,
        publishedOpportunities: publishedOps?.count || 0,
        totalApplications: totalApps?.count || 0,
      }

      // Application funnel
      const funnel = await db
        .select({
          status: schema.applications.status,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.applications)
        .groupBy(schema.applications.status)

      stats.applicationFunnel = funnel

      // Time-series: applications over last 90 days (daily counts)
      const appsTimeSeries = await db.execute(sql`
        SELECT d::date AS day, COUNT(a.id)::int AS cnt
        FROM generate_series(now() - interval '89 days', now(), interval '1 day') AS d
        LEFT JOIN applications a ON a.created_at::date = d::date
        GROUP BY d ORDER BY d
      `)
      stats.appsOverTime = (appsTimeSeries.rows as { cnt: number }[]).map(r => r.cnt)

      // Time-series: user registrations over last 90 days
      const regTimeSeries = await db.execute(sql`
        SELECT d::date AS day, COUNT(u.id)::int AS cnt
        FROM generate_series(now() - interval '89 days', now(), interval '1 day') AS d
        LEFT JOIN users u ON u.created_at::date = d::date AND u.role = 'user'
        GROUP BY d ORDER BY d
      `)
      stats.registrationsOverTime = (regTimeSeries.rows as { cnt: number }[]).map(r => r.cnt)

      // Top 10 opportunities by application count
      const topOpps = await db.execute(sql`
        SELECT o.id, o.title, o.institution, o.country, o.type,
               COUNT(a.id)::int AS app_count
        FROM opportunities o
        LEFT JOIN applications a ON a.opportunity_id = o.id
        GROUP BY o.id, o.title, o.institution, o.country, o.type
        ORDER BY app_count DESC
        LIMIT 10
      `)
      stats.topOpportunities = topOpps.rows

      // OppDate Apply drop-off funnel -- derive from already-fetched applicationFunnel
      const FUNNEL_STAGES = [
        'payment_confirmed', 'under_review', 'decision_pending', 'submitted', 'accepted',
      ]
      const funnelMap = Object.fromEntries((funnel as { status: string; count: number }[]).map(r => [r.status, r.count]))
      stats.funnelDropOff = FUNNEL_STAGES.map(s => ({ status: s, count: funnelMap[s] ?? 0 }))

      // eBook stats -- ebook purchases go through Lemon Squeezy and don't create payments rows,
      // so we read directly from ebookPurchases joined with ebooks for accurate count and revenue
      const ebookSalesRows = await db.execute(sql`
        SELECT count(ep.id)::int AS sales_count, coalesce(sum(e.price_usd), 0)::int AS revenue_cents
        FROM ebook_purchases ep
        LEFT JOIN ebooks e ON ep.ebook_id = e.id
      `)
      const ebookSales = (ebookSalesRows.rows as { sales_count: number; revenue_cents: number }[])[0]

      const [ebookCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.ebooks).where(eq(schema.ebooks.status, 'published'))
      stats.ebookStats = {
        revenueCents: Number(ebookSales?.revenue_cents ?? 0),
        salesCount: Number(ebookSales?.sales_count ?? 0),
        listingCount: ebookCount?.count ?? 0,
      }

      // Revenue: founder only
      if (user.role === 'super_admin') {
        const [revenue] = await db
          .select({ total: sql<number>`coalesce(sum(amount_usd), 0)::int` })
          .from(schema.payments)
          .where(eq(schema.payments.status, 'succeeded'))

        stats.totalRevenueCents = revenue?.total || 0

        // Revenue by purpose
        const byPurpose = await db
          .select({
            purpose: schema.payments.purpose,
            total: sql<number>`coalesce(sum(amount_usd), 0)::int`,
            count: sql<number>`count(*)::int`,
          })
          .from(schema.payments)
          .where(eq(schema.payments.status, 'succeeded'))
          .groupBy(schema.payments.purpose)

        stats.revenueByPurpose = byPurpose

        // Revenue time-series: last 90 days
        const revTimeSeries = await db.execute(sql`
          SELECT d::date AS day, COALESCE(SUM(p.amount_usd), 0)::int AS cents
          FROM generate_series(now() - interval '89 days', now(), interval '1 day') AS d
          LEFT JOIN payments p ON p.created_at::date = d::date AND p.status = 'succeeded'
          GROUP BY d ORDER BY d
        `)
        stats.revenueOverTime = (revTimeSeries.rows as { cents: number }[]).map(r => r.cents)
      }

      return ok(reply, stats)
    }
  )

  // ─── SETTINGS ───────────────────────────────────────────────────────────────

  // GET /api/v1/admin/settings/public -- public-safe subset (no auth required)
  server.get('/settings/public', async (_request, reply) => {
    const rows = await db
      .select()
      .from(schema.platformConfig)
      .where(eq(schema.platformConfig.key, 'socials'))
    const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    return ok(reply, settings)
  })

  // GET /api/v1/admin/settings -- platform config
  server.get(
    '/settings',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (_request, reply) => {
      const config = await db.select().from(schema.platformConfig)
      const settings = Object.fromEntries(config.map((c) => [c.key, c.value]))
      return ok(reply, settings)
    }
  )

  // PUT /api/v1/admin/settings/:key -- update a config value
  server.put(
    '/settings/:key',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const { key } = request.params as { key: string }
      const body = z.object({ value: z.any() }).safeParse(request.body)
      if (!body.success) return badRequest(reply, 'value is required.')

      // Upsert
      await db
        .insert(schema.platformConfig)
        .values({ key, value: body.data.value, updatedBy: admin.id, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: schema.platformConfig.key,
          set: { value: body.data.value, updatedBy: admin.id, updatedAt: new Date() },
        })

      await auditLog(admin.id, 'settings.update', 'platform_config', null, { key }, request.ip)

      return ok(reply, null, `Setting "${key}" updated.`)
    }
  )

  // ─── AD PLACEMENTS ──────────────────────────────────────────────────────────

  // GET /api/v1/admin/ads -- list ad placements
  server.get(
    '/placements',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (_request, reply) => {
      const placements = await db.select().from(schema.adPlacements)
      return ok(reply, placements)
    }
  )

  // PATCH /api/v1/admin/ads/:id -- toggle or configure ad placement
  server.patch(
    '/placements/:id',
    { preHandler: [requireRole('super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = z
        .object({
          active: z.boolean().optional(),
          config: z.record(z.unknown()).optional(),
        })
        .safeParse(request.body)

      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const rows = await db
        .update(schema.adPlacements)
        .set({ ...body.data, updatedAt: new Date() })
        .where(eq(schema.adPlacements.id, id))
        .returning()

      if (!rows[0]) return notFound(reply, 'Ad placement')

      return ok(reply, rows[0])
    }
  )

  // ─── MESSAGES (admin inbox) ─────────────────────────────────────────────────

  // GET /api/v1/admin/messages -- all message threads with last message preview
  server.get(
    '/messages',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const query = request.query as { status?: string; type?: string; assignedTo?: string; page?: string; limit?: string }
      const page = Math.max(Number(query.page) || 1, 1)
      const limit = Math.min(Number(query.limit) || 30, 100)
      const offset = (page - 1) * limit

      const conditions: ReturnType<typeof eq>[] = []
      if (query.status) conditions.push(eq(schema.messageThreads.status, query.status as any))
      if (query.type) conditions.push(eq(schema.messageThreads.type, query.type as any))
      if (query.assignedTo) conditions.push(eq(schema.messageThreads.assignedTo, query.assignedTo))

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      const threads = await db
        .select({
          id: schema.messageThreads.id,
          type: schema.messageThreads.type,
          status: schema.messageThreads.status,
          unreadByTeam: schema.messageThreads.unreadByTeam,
          lastMessageAt: schema.messageThreads.lastMessageAt,
          assignedTo: schema.messageThreads.assignedTo,
          userId: schema.messageThreads.userId,
          userName: schema.users.name,
          userEmail: schema.users.email,
          userAvatarUrl: schema.users.avatarUrl,
          createdAt: schema.messageThreads.createdAt,
          referenceId: schema.messageThreads.referenceId,
          opportunityTitle: schema.opportunities.title,
        })
        .from(schema.messageThreads)
        .leftJoin(schema.users, eq(schema.messageThreads.userId, schema.users.id))
        .leftJoin(schema.applications, eq(schema.messageThreads.referenceId, schema.applications.id))
        .leftJoin(schema.opportunities, eq(schema.applications.opportunityId, schema.opportunities.id))
        .where(whereClause)
        .orderBy(desc(schema.messageThreads.lastMessageAt))
        .limit(limit)
        .offset(offset)

      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.messageThreads)
        .where(whereClause)

      // Fetch last message for each thread
      const threadIds = threads.map(t => t.id)
      const lastMessages = threadIds.length > 0
        ? await db
            .select({
              threadId: schema.messages.threadId,
              content: schema.messages.content,
              senderType: schema.messages.senderType,
              createdAt: schema.messages.createdAt,
            })
            .from(schema.messages)
            .where(sql`${schema.messages.threadId} = any(${sql.raw(`array[${threadIds.map(id => `'${id}'`).join(',')}]::uuid[]`)})`)
            .orderBy(desc(schema.messages.createdAt))
        : []

      // Group: keep only the latest per thread
      const previewMap: Record<string, typeof lastMessages[0]> = {}
      for (const m of lastMessages) {
        if (!previewMap[m.threadId]) previewMap[m.threadId] = m
      }

      // Compute avg response time: avg ms between user message and next team message per thread
      let responseTimeMap: Record<string, number | null> = {}
      if (threadIds.length > 0) {
        const rtRows = await db.execute(
          sql`SELECT thread_id,
              AVG(EXTRACT(EPOCH FROM (team_time - user_time)) * 1000)::bigint AS avg_ms
          FROM (
            SELECT
              u.thread_id,
              u.created_at AS user_time,
              MIN(t.created_at) AS team_time
            FROM messages u
            JOIN messages t ON t.thread_id = u.thread_id
              AND t.created_at > u.created_at
              AND t.sender_type = 'team'
            WHERE u.sender_type = 'user'
              AND u.thread_id = ANY(${sql.raw(`ARRAY[${threadIds.map(id => `'${id}'`).join(',')}]::uuid[]`)})
            GROUP BY u.thread_id, u.created_at
          ) pairs
          GROUP BY thread_id`
        )
        for (const row of rtRows.rows as { thread_id: string; avg_ms: string | null }[]) {
          responseTimeMap[row.thread_id] = row.avg_ms ? parseInt(row.avg_ms, 10) : null
        }
      }

      const rows = threads.map(t => ({
        ...t,
        preview: previewMap[t.id]?.content?.slice(0, 120) ?? null,
        previewSender: previewMap[t.id]?.senderType ?? null,
        previewAt: previewMap[t.id]?.createdAt ?? null,
        avgResponseTimeMs: responseTimeMap[t.id] ?? null,
      }))

      return paginated(reply, rows, total?.count || 0, page, limit)
    }
  )

  // GET /api/v1/admin/messages/:threadId -- thread detail with all messages
  server.get(
    '/messages/:threadId',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { threadId } = request.params as { threadId: string }

      const [thread] = await db
        .select({
          id: schema.messageThreads.id,
          type: schema.messageThreads.type,
          status: schema.messageThreads.status,
          unreadByTeam: schema.messageThreads.unreadByTeam,
          assignedTo: schema.messageThreads.assignedTo,
          userId: schema.messageThreads.userId,
          userName: schema.users.name,
          userEmail: schema.users.email,
          lastMessageAt: schema.messageThreads.lastMessageAt,
          createdAt: schema.messageThreads.createdAt,
        })
        .from(schema.messageThreads)
        .leftJoin(schema.users, eq(schema.messageThreads.userId, schema.users.id))
        .where(eq(schema.messageThreads.id, threadId))

      if (!thread) return notFound(reply, 'Thread')

      const msgs = await db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.threadId, threadId))
        .orderBy(schema.messages.createdAt)

      // Reset unread count for team
      await db
        .update(schema.messageThreads)
        .set({ unreadByTeam: 0 })
        .where(eq(schema.messageThreads.id, threadId))

      return ok(reply, { thread, messages: msgs })
    }
  )

  // POST /api/v1/admin/messages/:threadId/reply -- send a team message
  server.post(
    '/messages/:threadId/reply',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const { threadId } = request.params as { threadId: string }
      const body = z.object({
        content: z.string().min(1).max(5000),
        isInternal: z.boolean().optional().default(false),
      }).safeParse(request.body)
      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const [thread] = await db
        .select()
        .from(schema.messageThreads)
        .where(eq(schema.messageThreads.id, threadId))

      if (!thread) return notFound(reply, 'Thread')
      if (thread.status === 'closed') return badRequest(reply, 'Thread is closed.')

      const [msg] = await db
        .insert(schema.messages)
        .values({
          threadId,
          senderId: admin.id,
          senderType: 'team',
          content: body.data.content,
          isInternal: body.data.isInternal,
        })
        .returning()

      // Internal notes do not increment unread for the user or shift thread status
      if (!body.data.isInternal) {
        await db
          .update(schema.messageThreads)
          .set({
            lastMessageAt: new Date(),
            unreadByUser: sql`${schema.messageThreads.unreadByUser} + 1`,
            status: 'awaiting_user',
            updatedAt: new Date(),
          })
          .where(eq(schema.messageThreads.id, threadId))
      }

      await auditLog(admin.id, 'message.reply', 'thread', threadId, { isInternal: body.data.isInternal }, request.ip)

      return created(reply, msg)
    }
  )

  // PATCH /api/v1/admin/messages/:threadId -- update thread (status, assignedTo)
  server.patch(
    '/messages/:threadId',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const { threadId } = request.params as { threadId: string }
      const body = z
        .object({
          status: z.enum(['active', 'awaiting_user', 'awaiting_team', 'resolved', 'closed']).optional(),
          assignedTo: z.string().uuid().nullable().optional(),
        })
        .safeParse(request.body)

      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const rows = await db
        .update(schema.messageThreads)
        .set({ ...body.data, updatedAt: new Date() })
        .where(eq(schema.messageThreads.id, threadId))
        .returning()

      if (!rows[0]) return notFound(reply, 'Thread')

      await auditLog(admin.id, 'thread.update', 'thread', threadId, body.data, request.ip)

      return ok(reply, rows[0])
    }
  )

  // ─── EBOOKS (admin CRUD) ─────────────────────────────────────────────────────

  // GET /api/v1/admin/ebooks -- all ebooks with purchase stats
  server.get(
    '/ebooks',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const query = request.query as { status?: string; page?: string; limit?: string }
      const page = Math.max(Number(query.page) || 1, 1)
      const limit = Math.min(Number(query.limit) || 30, 100)
      const offset = (page - 1) * limit

      const conditions = []
      if (query.status) conditions.push(eq(schema.ebooks.status, query.status as any))
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      const rows = await db
        .select()
        .from(schema.ebooks)
        .where(whereClause)
        .orderBy(desc(schema.ebooks.createdAt))
        .limit(limit)
        .offset(offset)

      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.ebooks)
        .where(whereClause)

      return paginated(reply, rows, total?.count || 0, page, limit)
    }
  )

  // GET /api/v1/admin/ebooks/:id -- ebook detail with purchaser list
  server.get(
    '/ebooks/:id',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const [ebook] = await db.select().from(schema.ebooks).where(eq(schema.ebooks.id, id))
      if (!ebook) return notFound(reply, 'Ebook')

      const purchasers = await db
        .select({
          id: schema.ebookPurchases.id,
          userId: schema.ebookPurchases.userId,
          userName: schema.users.name,
          userEmail: schema.users.email,
          downloadCount: schema.ebookPurchases.downloadCount,
          readingProgress: schema.ebookPurchases.readingProgress,
          purchasedAt: schema.ebookPurchases.purchasedAt,
        })
        .from(schema.ebookPurchases)
        .leftJoin(schema.users, eq(schema.ebookPurchases.userId, schema.users.id))
        .where(eq(schema.ebookPurchases.ebookId, id))
        .orderBy(desc(schema.ebookPurchases.purchasedAt))

      return ok(reply, { ...ebook, purchasers })
    }
  )

  // POST /api/v1/admin/ebooks -- create ebook
  server.post(
    '/ebooks',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const body = z
        .object({
          title: z.string().min(1).max(500),
          slug: z.string().min(1).max(600),
          author: z.string().min(1).max(255),
          description: z.string().min(1),
          coverImageUrl: z.string().url(),
          fileUrl: z.string().url(),
          priceUsd: z.number().int().min(0),
          premiumPriceUsd: z.number().int().min(0).nullable().optional(),
          pageCount: z.number().int().min(1).nullable().optional(),
          category: z.string().max(255).nullable().optional(),
          whatsInside: z.array(z.object({ title: z.string(), description: z.string().optional().default('') })).optional(),
          lsVariantId: z.string().max(255).nullable().optional(),
          status: z.enum(['published', 'unpublished']).optional(),
        })
        .safeParse(request.body)

      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const [row] = await db
        .insert(schema.ebooks)
        .values({ ...body.data, whatsInside: body.data.whatsInside ?? [] })
        .returning()

      await auditLog(admin.id, 'ebook.create', 'ebook', row.id, { title: row.title }, request.ip)

      return created(reply, row)
    }
  )

  // PATCH /api/v1/admin/ebooks/:id -- update ebook
  server.patch(
    '/ebooks/:id',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const { id } = request.params as { id: string }
      const body = z
        .object({
          title: z.string().min(1).max(500).optional(),
          slug: z.string().min(1).max(600).optional(),
          author: z.string().min(1).max(255).optional(),
          description: z.string().min(1).optional(),
          coverImageUrl: z.string().url().optional(),
          fileUrl: z.string().url().optional(),
          priceUsd: z.number().int().min(0).optional(),
          premiumPriceUsd: z.number().int().min(0).nullable().optional(),
          pageCount: z.number().int().min(1).nullable().optional(),
          category: z.string().max(255).nullable().optional(),
          whatsInside: z.array(z.object({ title: z.string(), description: z.string().optional().default('') })).optional(),
          lsVariantId: z.string().max(255).nullable().optional(),
          status: z.enum(['published', 'unpublished']).optional(),
        })
        .safeParse(request.body)

      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const rows = await db
        .update(schema.ebooks)
        .set({ ...body.data, updatedAt: new Date() })
        .where(eq(schema.ebooks.id, id))
        .returning()

      if (!rows[0]) return notFound(reply, 'Ebook')

      await auditLog(admin.id, 'ebook.update', 'ebook', id, body.data, request.ip)

      return ok(reply, rows[0])
    }
  )

  // DELETE /api/v1/admin/ebooks/:id -- delete ebook (unpublished only)
  server.delete(
    '/ebooks/:id',
    { preHandler: [requireRole('super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const { id } = request.params as { id: string }

      const [ebook] = await db.select().from(schema.ebooks).where(eq(schema.ebooks.id, id))
      if (!ebook) return notFound(reply, 'Ebook')
      if (ebook.status === 'published') return badRequest(reply, 'Unpublish the ebook before deleting.')

      await db.delete(schema.ebooks).where(eq(schema.ebooks.id, id))
      await auditLog(admin.id, 'ebook.delete', 'ebook', id, { title: ebook.title }, request.ip)

      return ok(reply, null, 'Ebook deleted.')
    }
  )

  // ─── MENTORSHIP (admin view) ─────────────────────────────────────────────────

  // GET /api/v1/admin/mentorships -- all enrolments
  server.get(
    '/mentorships',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const query = request.query as { status?: string; page?: string; limit?: string }
      const page = Math.max(Number(query.page) || 1, 1)
      const limit = Math.min(Number(query.limit) || 30, 100)
      const offset = (page - 1) * limit

      const conditions = []
      if (query.status) conditions.push(eq(schema.mentorships.status, query.status as any))
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      const rows = await db
        .select({
          id: schema.mentorships.id,
          status: schema.mentorships.status,
          startedAt: schema.mentorships.startedAt,
          completedAt: schema.mentorships.completedAt,
          createdAt: schema.mentorships.createdAt,
          updatedAt: schema.mentorships.updatedAt,
          userId: schema.mentorships.userId,
          userName: schema.users.name,
          userEmail: schema.users.email,
          mentorProfileId: schema.mentorships.mentorProfileId,
          mentorName: schema.mentorProfiles.name,
          mentorSpecialty: schema.mentorProfiles.specialty,
          programmeId: schema.mentorships.programmeId,
          programmeTitle: schema.mentorshipProgrammes.title,
          programmeMonthlyPrice: schema.mentorshipProgrammes.monthlyPriceUsd,
        })
        .from(schema.mentorships)
        .leftJoin(schema.users, eq(schema.mentorships.userId, schema.users.id))
        .leftJoin(schema.mentorProfiles, eq(schema.mentorships.mentorProfileId, schema.mentorProfiles.id))
        .leftJoin(schema.mentorshipProgrammes, eq(schema.mentorships.programmeId, schema.mentorshipProgrammes.id))
        .where(whereClause)
        .orderBy(desc(schema.mentorships.createdAt))
        .limit(limit)
        .offset(offset)

      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.mentorships)
        .where(whereClause)

      return paginated(reply, rows, total?.count || 0, page, limit)
    }
  )

  // PATCH /api/v1/admin/mentorships/:id -- update enrolment (status, assign mentor)
  server.patch(
    '/mentorships/:id',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const { id } = request.params as { id: string }
      const body = z
        .object({
          status: z.enum(['pending', 'active', 'completed', 'cancelled']).optional(),
          mentorProfileId: z.string().uuid().nullable().optional(),
          startedAt: z.string().datetime().nullable().optional(),
          completedAt: z.string().datetime().nullable().optional(),
        })
        .safeParse(request.body)

      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      // If assigning a mentor, verify it exists and is published
      if (body.data.mentorProfileId) {
        const [mentor] = await db
          .select()
          .from(schema.mentorProfiles)
          .where(and(eq(schema.mentorProfiles.id, body.data.mentorProfileId), eq(schema.mentorProfiles.published, true)))
        if (!mentor) return notFound(reply, 'Mentor profile')
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() }
      if (body.data.status !== undefined) updates.status = body.data.status
      if (body.data.mentorProfileId !== undefined) updates.mentorProfileId = body.data.mentorProfileId
      if (body.data.startedAt !== undefined) updates.startedAt = body.data.startedAt ? new Date(body.data.startedAt) : null
      if (body.data.completedAt !== undefined) updates.completedAt = body.data.completedAt ? new Date(body.data.completedAt) : null

      // Auto-set startedAt when activating
      if (body.data.status === 'active' && !body.data.startedAt) updates.startedAt = new Date()

      const rows = await db
        .update(schema.mentorships)
        .set(updates)
        .where(eq(schema.mentorships.id, id))
        .returning()

      if (!rows[0]) return notFound(reply, 'Mentorship')

      await auditLog(admin.id, 'mentorship.update', 'mentorship', id, body.data, request.ip)

      return ok(reply, rows[0])
    }
  )

  // GET /api/v1/admin/mentor-profiles -- all mentor profiles (admin view)
  server.get(
    '/mentor-profiles',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (_request, reply) => {
      const rows = await db
        .select()
        .from(schema.mentorProfiles)
        .orderBy(desc(schema.mentorProfiles.createdAt))

      return ok(reply, rows)
    }
  )

  // POST /api/v1/admin/mentor-profiles -- create mentor profile
  server.post(
    '/mentor-profiles',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const body = z
        .object({
          name: z.string().min(1).max(255),
          specialty: z.string().min(1).max(255),
          bio: z.string().min(1),
          headshotUrl: z.string().url().nullable().optional(),
          published: z.boolean().optional(),
        })
        .safeParse(request.body)

      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const [row] = await db.insert(schema.mentorProfiles).values(body.data).returning()
      await auditLog(admin.id, 'mentor_profile.create', 'mentor_profile', row.id, { name: row.name }, request.ip)

      return created(reply, row)
    }
  )

  // PATCH /api/v1/admin/mentor-profiles/:id -- update mentor profile
  server.patch(
    '/mentor-profiles/:id',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const { id } = request.params as { id: string }
      const body = z
        .object({
          name: z.string().min(1).max(255).optional(),
          specialty: z.string().min(1).max(255).optional(),
          bio: z.string().min(1).optional(),
          headshotUrl: z.string().url().nullable().optional(),
          published: z.boolean().optional(),
        })
        .safeParse(request.body)

      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const rows = await db
        .update(schema.mentorProfiles)
        .set({ ...body.data, updatedAt: new Date() })
        .where(eq(schema.mentorProfiles.id, id))
        .returning()

      if (!rows[0]) return notFound(reply, 'Mentor profile')

      await auditLog(admin.id, 'mentor_profile.update', 'mentor_profile', id, body.data, request.ip)

      return ok(reply, rows[0])
    }
  )

  // DELETE /api/v1/admin/mentor-profiles/:id -- delete mentor profile
  server.delete(
    '/mentor-profiles/:id',
    { preHandler: [requireRole('super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const { id } = request.params as { id: string }

      const [profile] = await db.select().from(schema.mentorProfiles).where(eq(schema.mentorProfiles.id, id))
      if (!profile) return notFound(reply, 'Mentor profile')

      await db.delete(schema.mentorProfiles).where(eq(schema.mentorProfiles.id, id))
      await auditLog(admin.id, 'mentor_profile.delete', 'mentor_profile', id, { name: profile.name }, request.ip)

      return ok(reply, null, 'Mentor profile deleted.')
    }
  )

  // GET /api/v1/admin/mentorship-programmes -- all programmes
  server.get(
    '/mentorship-programmes',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (_request, reply) => {
      const rows = await db
        .select()
        .from(schema.mentorshipProgrammes)
        .orderBy(desc(schema.mentorshipProgrammes.createdAt))

      return ok(reply, rows)
    }
  )

  // POST /api/v1/admin/mentorship-programmes -- create programme
  server.post(
    '/mentorship-programmes',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const body = z
        .object({
          title: z.string().min(1).max(255),
          description: z.string().min(1),
          monthlyPriceUsd: z.number().int().min(0),
          headerImageUrl: z.string().url().nullable().optional(),
          active: z.boolean().optional(),
        })
        .safeParse(request.body)

      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const [row] = await db
        .insert(schema.mentorshipProgrammes)
        .values({ ...body.data, createdBy: admin.id })
        .returning()

      await auditLog(admin.id, 'programme.create', 'mentorship_programme', row.id, { title: row.title }, request.ip)

      return created(reply, row)
    }
  )

  // PATCH /api/v1/admin/mentorship-programmes/:id -- update programme
  server.patch(
    '/mentorship-programmes/:id',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const { id } = request.params as { id: string }
      const body = z
        .object({
          title: z.string().min(1).max(255).optional(),
          description: z.string().min(1).optional(),
          monthlyPriceUsd: z.number().int().min(0).optional(),
          headerImageUrl: z.string().url().nullable().optional(),
          active: z.boolean().optional(),
        })
        .safeParse(request.body)

      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const rows = await db
        .update(schema.mentorshipProgrammes)
        .set({ ...body.data, updatedAt: new Date() })
        .where(eq(schema.mentorshipProgrammes.id, id))
        .returning()

      if (!rows[0]) return notFound(reply, 'Programme')

      await auditLog(admin.id, 'programme.update', 'mentorship_programme', id, body.data, request.ip)

      return ok(reply, rows[0])
    }
  )

  // ─── CONSULTATIONS (admin view) ──────────────────────────────────────────────

  // GET /api/v1/admin/consultations -- all bookings
  server.get(
    '/consultations',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const query = request.query as { status?: string; page?: string; limit?: string }
      const page = Math.max(Number(query.page) || 1, 1)
      const limit = Math.min(Number(query.limit) || 30, 100)
      const offset = (page - 1) * limit

      const conditions = []
      if (query.status) conditions.push(eq(schema.consultations.status, query.status as any))
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      const rows = await db
        .select({
          id: schema.consultations.id,
          sessionId: schema.consultations.sessionId,
          slotId: schema.consultations.slotId,
          sessionTitle: schema.consultationSessions.title,
          durationMinutes: schema.consultations.durationMinutes,
          priceUsd: schema.consultations.priceUsd,
          scheduledAt: schema.consultations.scheduledAt,
          status: schema.consultations.status,
          meetingLink: schema.consultations.meetingLink,
          meetingType: schema.consultations.meetingType,
          notes: schema.consultations.notes,
          createdAt: schema.consultations.createdAt,
          updatedAt: schema.consultations.updatedAt,
          userId: schema.consultations.userId,
          userName: schema.users.name,
          userEmail: schema.users.email,
          userAvatarUrl: schema.users.avatarUrl,
        })
        .from(schema.consultations)
        .leftJoin(schema.users, eq(schema.consultations.userId, schema.users.id))
        .leftJoin(schema.consultationSessions, eq(schema.consultations.sessionId, schema.consultationSessions.id))
        .where(whereClause)
        .orderBy(desc(schema.consultations.scheduledAt))
        .limit(limit)
        .offset(offset)

      const [total] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.consultations)
        .where(whereClause)

      return paginated(reply, rows, total?.count || 0, page, limit)
    }
  )

  // PATCH /api/v1/admin/consultations/:id -- update booking (status, link, notes)
  server.patch(
    '/consultations/:id',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const { id } = request.params as { id: string }
      const body = z
        .object({
          status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
          meetingLink: z.string().min(1).nullable().optional(),
          meetingType: z.enum(['google_meet', 'zoom']).nullable().optional(),
          notes: z.string().nullable().optional(),
          scheduledAt: z.string().datetime().optional(),
        })
        .safeParse(request.body)

      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const { scheduledAt, ...rest } = body.data
      const updates = {
        ...rest,
        ...(scheduledAt !== undefined ? { scheduledAt: new Date(scheduledAt) } : {}),
        updatedAt: new Date(),
      }

      const rows = await db
        .update(schema.consultations)
        .set(updates)
        .where(eq(schema.consultations.id, id))
        .returning()

      if (!rows[0]) return notFound(reply, 'Consultation')

      await auditLog(admin.id, 'consultation.update', 'consultation', id, body.data, request.ip)

      return ok(reply, rows[0])
    }
  )

  // ─── CONSULTATION SESSIONS ──────────────────────────────────────────────────

  // GET /api/v1/admin/consultation-sessions -- list all sessions with slot counts
  server.get(
    '/consultation-sessions',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (_request, reply) => {
      const sessions = await db
        .select()
        .from(schema.consultationSessions)
        .orderBy(desc(schema.consultationSessions.createdAt))

      const allSlots = await db
        .select()
        .from(schema.consultationSlots)

      const result = sessions.map(s => {
        const sessionSlots = allSlots.filter(sl => sl.sessionId === s.id)
        return {
          ...s,
          totalSlots: sessionSlots.length,
          claimedSlots: sessionSlots.filter(sl => sl.claimed).length,
        }
      })

      return ok(reply, result)
    }
  )

  // POST /api/v1/admin/consultation-sessions -- create a new session
  server.post(
    '/consultation-sessions',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const body = z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        durationMinutes: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(90), z.literal(120)]),
        priceUsd: z.number().int().positive(),
        active: z.boolean().optional().default(true),
        groupKey: z.string().max(100).optional().nullable(),
      }).safeParse(request.body)

      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const [session] = await db
        .insert(schema.consultationSessions)
        .values({
          title: body.data.title,
          description: body.data.description ?? null,
          durationMinutes: body.data.durationMinutes,
          priceUsd: body.data.priceUsd,
          active: body.data.active,
          groupKey: body.data.groupKey ?? null,
        })
        .returning()

      await auditLog(admin.id, 'consultation_session.created', 'consultation_session', session.id, body.data, request.ip)

      return created(reply, session, 'Session created.')
    }
  )

  // PATCH /api/v1/admin/consultation-sessions/:id -- update a session
  server.patch(
    '/consultation-sessions/:id',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const { id } = request.params as { id: string }
      const body = z.object({
        title: z.string().min(1).max(255).optional(),
        description: z.string().nullable().optional(),
        durationMinutes: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(90), z.literal(120)]).optional(),
        priceUsd: z.number().int().positive().optional(),
        active: z.boolean().optional(),
        groupKey: z.string().max(100).nullable().optional(),
      }).safeParse(request.body)

      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const rows = await db
        .update(schema.consultationSessions)
        .set({ ...body.data, updatedAt: new Date() })
        .where(eq(schema.consultationSessions.id, id))
        .returning()

      if (!rows[0]) return notFound(reply, 'Session')

      await auditLog(admin.id, 'consultation_session.updated', 'consultation_session', id, body.data, request.ip)

      return ok(reply, rows[0])
    }
  )

  // DELETE /api/v1/admin/consultation-sessions/:id -- delete a session (only if no claimed slots)
  server.delete(
    '/consultation-sessions/:id',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const { id } = request.params as { id: string }

      const claimedSlots = await db
        .select({ id: schema.consultationSlots.id })
        .from(schema.consultationSlots)
        .where(
          and(
            eq(schema.consultationSlots.sessionId, id),
            eq(schema.consultationSlots.claimed, true)
          )
        )
        .limit(1)

      if (claimedSlots.length > 0) {
        return badRequest(reply, 'Cannot delete a session with confirmed bookings.')
      }

      // Delete unclaimed slots first, then the session
      await db.delete(schema.consultationSlots).where(eq(schema.consultationSlots.sessionId, id))
      await db.delete(schema.consultationSessions).where(eq(schema.consultationSessions.id, id))

      await auditLog(admin.id, 'consultation_session.deleted', 'consultation_session', id, {}, request.ip)

      return ok(reply, null, 'Session deleted.')
    }
  )

  // GET /api/v1/admin/consultation-slots -- all slots (date dots for calendar view)
  server.get(
    '/consultation-slots',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (_request, reply) => {
      const slots = await db
        .select({ id: schema.consultationSlots.id, startsAt: schema.consultationSlots.startsAt, sessionId: schema.consultationSlots.sessionId, claimed: schema.consultationSlots.claimed })
        .from(schema.consultationSlots)
        .orderBy(asc(schema.consultationSlots.startsAt))
      return ok(reply, slots)
    }
  )

  // POST /api/v1/admin/consultation-sessions/:id/slots -- add time slots to a session
  server.post(
    '/consultation-sessions/:id/slots',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const { id } = request.params as { id: string }
      const body = z.object({
        slots: z.array(z.string().datetime()).min(1).max(50),
      }).safeParse(request.body)

      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const [session] = await db
        .select()
        .from(schema.consultationSessions)
        .where(eq(schema.consultationSessions.id, id))
        .limit(1)

      if (!session) return notFound(reply, 'Session')

      // Fetch existing slots to deduplicate
      const existing = await db
        .select({ startsAt: schema.consultationSlots.startsAt })
        .from(schema.consultationSlots)
        .where(eq(schema.consultationSlots.sessionId, id))

      const existingTimes = new Set(existing.map(s => s.startsAt.toISOString()))

      const toInsert = body.data.slots
        .map(dt => new Date(dt))
        .filter(dt => !existingTimes.has(dt.toISOString()))

      if (toInsert.length === 0) {
        return ok(reply, { inserted: 0 }, 'No new slots to add (duplicates skipped).')
      }

      await db.insert(schema.consultationSlots).values(
        toInsert.map(startsAt => ({ sessionId: id, startsAt }))
      )

      await auditLog(admin.id, 'consultation_slots.added', 'consultation_session', id, { count: toInsert.length }, request.ip)

      return created(reply, { inserted: toInsert.length }, `${toInsert.length} slot${toInsert.length !== 1 ? 's' : ''} added.`)
    }
  )

  // DELETE /api/v1/admin/consultation-slots/:slotId -- delete an unclaimed slot
  server.delete(
    '/consultation-slots/:slotId',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const admin = request.user as { id: string }
      const { slotId } = request.params as { slotId: string }

      const [slot] = await db
        .select()
        .from(schema.consultationSlots)
        .where(eq(schema.consultationSlots.id, slotId))
        .limit(1)

      if (!slot) return notFound(reply, 'Slot')
      if (slot.claimed) return badRequest(reply, 'Cannot delete a slot that has already been claimed.')

      await db.delete(schema.consultationSlots).where(eq(schema.consultationSlots.id, slotId))

      await auditLog(admin.id, 'consultation_slot.deleted', 'consultation_slot', slotId, {}, request.ip)

      return ok(reply, null, 'Slot deleted.')
    }
  )

  // ─── AUDIT LOG ──────────────────────────────────────────────────────────────

  // GET /api/v1/admin/audit-log -- view admin audit trail
  server.get(
    '/audit-log',
    { preHandler: [requireRole('super_admin')] },
    async (request, reply) => {
      const query = request.query as { page?: string; limit?: string }
      const page = Math.max(Number(query.page) || 1, 1)
      const limit = Math.min(Number(query.limit) || 50, 100)
      const offset = (page - 1) * limit

      const rows = await db
        .select()
        .from(schema.adminAuditLog)
        .orderBy(desc(schema.adminAuditLog.createdAt))
        .limit(limit)
        .offset(offset)

      const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.adminAuditLog)

      return paginated(reply, rows, total?.count || 0, page, limit)
    }
  )

  // POST /api/v1/admin/ebook-cover-upload -- upload ebook cover image to R2, returns URL
  server.post(
    '/ebook-cover-upload',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const data = await request.file()
      if (!data) return badRequest(reply, 'No file provided.')

      const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
      if (!ALLOWED.includes(data.mimetype)) return badRequest(reply, 'Only JPEG, PNG, or WebP images are allowed.')

      const chunks: Buffer[] = []
      for await (const chunk of data.file) chunks.push(chunk)
      const buffer = Buffer.concat(chunks)

      if (buffer.length > 5 * 1024 * 1024) return badRequest(reply, 'Image exceeds the 5MB limit.')

      const r2 = getR2Client()
      if (!r2) return badRequest(reply, 'File storage is not configured. Contact support.')

      const ext = data.mimetype === 'image/png' ? 'png' : data.mimetype === 'image/webp' ? 'webp' : 'jpg'
      const fileKey = `ebook-covers/${randomUUID()}.${ext}`

      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET, Key: fileKey, Body: buffer,
        ContentType: data.mimetype, ContentLength: buffer.length,
      }))

      const url = process.env.R2_PUBLIC_URL
        ? `${process.env.R2_PUBLIC_URL}/${fileKey}`
        : `${process.env.R2_ENDPOINT}/${R2_BUCKET}/${fileKey}`

      return ok(reply, { url }, 'Cover uploaded.')
    }
  )

  // POST /api/v1/admin/ebook-file-upload -- upload ebook PDF/ePub file to R2, returns URL
  server.post(
    '/ebook-file-upload',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const data = await request.file()
      if (!data) return badRequest(reply, 'No file provided.')

      const ALLOWED: Record<string, string> = {
        'application/pdf': 'pdf',
        'application/epub+zip': 'epub',
      }
      const ext = ALLOWED[data.mimetype]
      if (!ext) return badRequest(reply, 'Only PDF or ePub files are allowed.')

      const chunks: Buffer[] = []
      for await (const chunk of data.file) chunks.push(chunk)
      const buffer = Buffer.concat(chunks)

      if (buffer.length > 100 * 1024 * 1024) return badRequest(reply, 'File exceeds the 100MB limit.')

      const r2 = getR2Client()
      if (!r2) return badRequest(reply, 'File storage is not configured. Contact support.')

      const fileKey = `ebook-files/${randomUUID()}.${ext}`

      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET, Key: fileKey, Body: buffer,
        ContentType: data.mimetype, ContentLength: buffer.length,
      }))

      const url = process.env.R2_PUBLIC_URL
        ? `${process.env.R2_PUBLIC_URL}/${fileKey}`
        : `${process.env.R2_ENDPOINT}/${R2_BUCKET}/${fileKey}`

      return ok(reply, { url, format: ext }, 'File uploaded.')
    }
  )

  // POST /api/v1/admin/mentor-header-upload -- upload a mentorship programme header image to R2, returns URL
  server.post(
    '/mentor-header-upload',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const data = await request.file()
      if (!data) return badRequest(reply, 'No file provided.')

      const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
      if (!ALLOWED.includes(data.mimetype)) return badRequest(reply, 'Only JPEG, PNG, or WebP images are allowed.')

      const chunks: Buffer[] = []
      for await (const chunk of data.file) chunks.push(chunk)
      const buffer = Buffer.concat(chunks)

      if (buffer.length > 5 * 1024 * 1024) return badRequest(reply, 'Image exceeds the 5MB limit.')

      const r2 = getR2Client()
      if (!r2) return badRequest(reply, 'File storage is not configured. Contact support.')

      const ext = data.mimetype === 'image/png' ? 'png' : data.mimetype === 'image/webp' ? 'webp' : 'jpg'
      const fileKey = `mentor-headers/${randomUUID()}.${ext}`

      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET, Key: fileKey, Body: buffer,
        ContentType: data.mimetype, ContentLength: buffer.length,
      }))

      const url = process.env.R2_PUBLIC_URL
        ? `${process.env.R2_PUBLIC_URL}/${fileKey}`
        : `${process.env.R2_ENDPOINT}/${R2_BUCKET}/${fileKey}`

      return ok(reply, { url }, 'Header image uploaded.')
    }
  )

  // POST /api/v1/admin/consultant-headshot-upload -- upload a consultant headshot to R2, returns URL
  server.post(
    '/consultant-headshot-upload',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const data = await request.file()
      if (!data) return badRequest(reply, 'No file provided.')

      const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
      if (!ALLOWED.includes(data.mimetype)) return badRequest(reply, 'Only JPEG, PNG, or WebP images are allowed.')

      const chunks: Buffer[] = []
      for await (const chunk of data.file) chunks.push(chunk)
      const buffer = Buffer.concat(chunks)

      if (buffer.length > 5 * 1024 * 1024) return badRequest(reply, 'Image exceeds the 5MB limit.')

      const r2 = getR2Client()
      if (!r2) return badRequest(reply, 'File storage is not configured. Contact support.')

      const ext = data.mimetype === 'image/png' ? 'png' : data.mimetype === 'image/webp' ? 'webp' : 'jpg'
      const fileKey = `consultant-headshots/${randomUUID()}.${ext}`

      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET, Key: fileKey, Body: buffer,
        ContentType: data.mimetype, ContentLength: buffer.length,
      }))

      const url = process.env.R2_PUBLIC_URL
        ? `${process.env.R2_PUBLIC_URL}/${fileKey}`
        : `${process.env.R2_ENDPOINT}/${R2_BUCKET}/${fileKey}`

      return ok(reply, { url }, 'Headshot uploaded.')
    }
  )

  // POST /api/v1/admin/logo-upload -- upload an institution logo image to R2, returns URL
  server.post(
    '/logo-upload',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const data = await request.file()
      if (!data) return badRequest(reply, 'No file provided.')

      if (!LOGO_ALLOWED_TYPES.includes(data.mimetype)) {
        return badRequest(reply, 'Only JPEG, PNG, WebP, and SVG images are allowed.')
      }

      const chunks: Buffer[] = []
      for await (const chunk of data.file) chunks.push(chunk)
      const buffer = Buffer.concat(chunks)

      if (buffer.length > LOGO_MAX_BYTES) {
        return badRequest(reply, 'Image exceeds the 2MB limit.')
      }

      const ext = data.mimetype === 'image/svg+xml' ? 'svg'
        : data.mimetype === 'image/png' ? 'png'
        : data.mimetype === 'image/webp' ? 'webp'
        : 'jpg'

      const r2 = getR2Client()
      if (!r2) return badRequest(reply, 'File storage is not configured. Contact support.')

      const fileKey = `logos/${randomUUID()}.${ext}`

      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: fileKey,
        Body: buffer,
        ContentType: data.mimetype,
        ContentLength: buffer.length,
      }))

      const logoUrl = process.env.R2_PUBLIC_URL
        ? `${process.env.R2_PUBLIC_URL}/${fileKey}`
        : `${process.env.R2_ENDPOINT}/${R2_BUCKET}/${fileKey}`

      return ok(reply, { url: logoUrl }, 'Logo uploaded.')
    }
  )

  // -------------------------------------------------------------------------
  // AVATAR PRESETS
  // -------------------------------------------------------------------------

  // GET /admin/avatar-presets -- list all presets (manager_admin+)
  server.get('/avatar-presets', { preHandler: [requireRole('manager_admin', 'super_admin')] }, async (_request, reply) => {
    const presets = await db
      .select()
      .from(schema.avatarPresets)
      .orderBy(asc(schema.avatarPresets.createdAt))
    return ok(reply, presets)
  })

  // POST /admin/avatar-presets -- upload image to R2 and create preset record (manager_admin+)
  server.post(
    '/avatar-presets',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const data = await request.file()
      if (!data) return badRequest(reply, 'No file uploaded.')

      const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
      if (!ALLOWED.includes(data.mimetype)) return badRequest(reply, 'Only JPEG, PNG, and WebP images are allowed.')

      const MAX = 2 * 1024 * 1024
      const chunks: Buffer[] = []
      for await (const chunk of data.file) chunks.push(chunk)
      const buffer = Buffer.concat(chunks)
      if (buffer.length > MAX) return badRequest(reply, 'Image exceeds the 2MB limit.')

      const label = (data.fields?.label as { value?: string } | undefined)?.value?.trim() || 'Avatar'

      const ext = data.mimetype === 'image/png' ? 'png' : data.mimetype === 'image/webp' ? 'webp' : 'jpg'
      const r2 = getR2Client()
      if (!r2) return badRequest(reply, 'File storage is not configured.')

      const fileKey = `avatars/presets/${randomUUID()}.${ext}`
      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: fileKey,
        Body: buffer,
        ContentType: data.mimetype,
        ContentLength: buffer.length,
      }))

      const url = process.env.R2_PUBLIC_URL
        ? `${process.env.R2_PUBLIC_URL}/${fileKey}`
        : `${process.env.R2_ENDPOINT}/${R2_BUCKET}/${fileKey}`

      const [preset] = await db
        .insert(schema.avatarPresets)
        .values({ url, label })
        .returning()

      return created(reply, preset, 'Avatar preset created.')
    }
  )

  // DELETE /admin/avatar-presets/:id -- remove preset (manager_admin+)
  server.delete(
    '/avatar-presets/:id',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const [existing] = await db
        .select({ id: schema.avatarPresets.id })
        .from(schema.avatarPresets)
        .where(eq(schema.avatarPresets.id, id))
        .limit(1)

      if (!existing) return notFound(reply, 'Avatar preset')

      await db.delete(schema.avatarPresets).where(eq(schema.avatarPresets.id, id))

      return ok(reply, null, 'Avatar preset deleted.')
    }
  )
}
