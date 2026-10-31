import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, schema } from '../db'
import { eq, desc, and, count, sql } from 'drizzle-orm'
import { ok, created, badRequest, notFound } from '../utils/response'
import { requireAuth, requireRole } from '../middleware/auth'

const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  ts: z.string(),
})

const saveSessionSchema = z.object({
  messages: z.array(messageSchema).min(1).max(200),
  opportunitySlug: z.string().optional(),
  eligTriggered: z.boolean().default(false),
  eligVerdict: z.enum(['eligible', 'borderline', 'ineligible']).optional(),
  startedAt: z.string(),
})

const flagSchema = z.object({
  sessionId: z.string().uuid(),
  messageIndex: z.number().int().min(0),
  reason: z.enum(['inaccurate', 'off_brand', 'harmful', 'other']),
  notes: z.string().max(1000).optional(),
})

const insightsQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().uuid().optional(),
  opportunitySlug: z.string().optional(),
  sentiment: z.enum(['positive', 'neutral', 'concerned']).optional(),
  eligTriggered: z.coerce.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

// Rule-based sentiment heuristic - no AI call
function computeSentiment(
  eligTriggered: boolean,
  eligVerdict: string | undefined,
  messages: Array<{ role: string; content: string }>
): 'positive' | 'neutral' | 'concerned' {
  if (eligTriggered && eligVerdict) {
    if (eligVerdict === 'eligible') return 'positive'
    if (eligVerdict === 'borderline') return 'neutral'
    if (eligVerdict === 'ineligible') return 'concerned'
  }
  // Scan last AI message for negative signal words
  const lastAi = [...messages].reverse().find(m => m.role === 'assistant')
  if (lastAi) {
    const lower = lastAi.content.toLowerCase()
    const negativeSignals = ['unfortunately', 'unable', "doesn't meet", 'not eligible', 'not qualify', 'do not qualify', 'ineligible']
    if (negativeSignals.some(s => lower.includes(s))) return 'concerned'
  }
  return 'neutral'
}

export async function guideSessionRoutes(server: FastifyInstance) {
  // POST /api/v1/guide-sessions — user saves session on panel close
  server.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const parsed = saveSessionSchema.safeParse(request.body)
    if (!parsed.success) return badRequest(reply, parsed.error.errors[0].message)

    const { messages, opportunitySlug, eligTriggered, eligVerdict, startedAt } = parsed.data

    const sentiment = computeSentiment(eligTriggered, eligVerdict, messages)
    const messageCount = messages.length
    const endedAt = new Date()

    const [session] = await db
      .insert(schema.guideSessionLogs)
      .values({
        userId: user.id,
        opportunitySlug: opportunitySlug ?? null,
        startedAt: new Date(startedAt),
        endedAt,
        messageCount,
        eligTriggered,
        eligVerdict: (eligVerdict ?? null) as 'eligible' | 'borderline' | 'ineligible' | null,
        sentiment,
        messages: messages as unknown as Record<string, unknown>[],
        flagCount: 0,
      })
      .returning()

    return created(reply, { id: session.id })
  })

  // ─── ADMIN ROUTES ────────────────────────────────────────────────────────────

  // GET /api/v1/guide-sessions/admin/list — paginated session list
  server.get('/admin/list', { preHandler: [requireAuth, requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query)
    if (!parsed.success) return badRequest(reply, 'Invalid query parameters.')

    const { page, limit, userId, opportunitySlug, sentiment, eligTriggered, dateFrom, dateTo } = parsed.data
    const offset = (page - 1) * limit

    const conditions = []
    if (userId) conditions.push(eq(schema.guideSessionLogs.userId, userId))
    if (opportunitySlug) conditions.push(eq(schema.guideSessionLogs.opportunitySlug, opportunitySlug))
    if (sentiment) conditions.push(eq(schema.guideSessionLogs.sentiment, sentiment))
    if (eligTriggered !== undefined) conditions.push(eq(schema.guideSessionLogs.eligTriggered, eligTriggered))
    if (dateFrom) conditions.push(sql`${schema.guideSessionLogs.createdAt} >= ${new Date(dateFrom)}`)
    if (dateTo) conditions.push(sql`${schema.guideSessionLogs.createdAt} <= ${new Date(dateTo)}`)

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [sessions, [{ total }]] = await Promise.all([
      db
        .select({
          id: schema.guideSessionLogs.id,
          userId: schema.guideSessionLogs.userId,
          userName: schema.users.name,
          userEmail: schema.users.email,
          userAvatarUrl: schema.users.avatarUrl,
          opportunitySlug: schema.guideSessionLogs.opportunitySlug,
          startedAt: schema.guideSessionLogs.startedAt,
          endedAt: schema.guideSessionLogs.endedAt,
          messageCount: schema.guideSessionLogs.messageCount,
          eligTriggered: schema.guideSessionLogs.eligTriggered,
          eligVerdict: schema.guideSessionLogs.eligVerdict,
          sentiment: schema.guideSessionLogs.sentiment,
          flagCount: schema.guideSessionLogs.flagCount,
          createdAt: schema.guideSessionLogs.createdAt,
        })
        .from(schema.guideSessionLogs)
        .leftJoin(schema.users, eq(schema.guideSessionLogs.userId, schema.users.id))
        .where(where)
        .orderBy(desc(schema.guideSessionLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(schema.guideSessionLogs)
        .where(where),
    ])

    return ok(reply, {
      sessions,
      pagination: { page, limit, total: total, pages: Math.ceil(total / limit) },
    })
  })

  // GET /api/v1/guide-sessions/admin/insights — aggregate stats
  server.get('/admin/insights', { preHandler: [requireAuth, requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (request, reply) => {
    const parsed = insightsQuerySchema.safeParse(request.query)
    if (!parsed.success) return badRequest(reply, 'Invalid query parameters.')

    const { dateFrom, dateTo } = parsed.data

    const conditions = []
    if (dateFrom) conditions.push(sql`${schema.guideSessionLogs.createdAt} >= ${new Date(dateFrom)}`)
    if (dateTo) conditions.push(sql`${schema.guideSessionLogs.createdAt} <= ${new Date(dateTo)}`)
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const [totals, thisWeek, topOpportunities, topTopics] = await Promise.all([
      // Total sessions + elig check rate + flag rate
      db
        .select({
          total: count(),
          eligChecked: sql<number>`sum(case when ${schema.guideSessionLogs.eligTriggered} then 1 else 0 end)`,
          totalFlags: sql<number>`sum(${schema.guideSessionLogs.flagCount})`,
        })
        .from(schema.guideSessionLogs)
        .where(where),

      // Sessions this week
      db
        .select({ total: count() })
        .from(schema.guideSessionLogs)
        .where(sql`${schema.guideSessionLogs.createdAt} >= ${weekAgo}`),

      // Top opportunity slugs by session count
      db
        .select({
          opportunitySlug: schema.guideSessionLogs.opportunitySlug,
          sessionCount: count(),
        })
        .from(schema.guideSessionLogs)
        .where(and(where, sql`${schema.guideSessionLogs.opportunitySlug} is not null`))
        .groupBy(schema.guideSessionLogs.opportunitySlug)
        .orderBy(desc(count()))
        .limit(5),

      // Topic keyword counts using pg_trgm-style keyword matching
      db.execute(sql`
        select topic, count(*)::int as hit_count from (
          select unnest(array[
            case when messages::text ilike '%financial aid%' or messages::text ilike '%funding%' then 'financial aid' end,
            case when messages::text ilike '%deadline%' or messages::text ilike '%due date%' then 'deadlines' end,
            case when messages::text ilike '%document%' or messages::text ilike '%transcript%' then 'documents' end,
            case when messages::text ilike '%eligib%' then 'eligibility' end,
            case when messages::text ilike '%visa%' then 'visa' end,
            case when messages::text ilike '%requirem%' then 'requirements' end,
            case when messages::text ilike '%language%' or messages::text ilike '%ielts%' or messages::text ilike '%toefl%' then 'language' end,
            case when messages::text ilike '%age limit%' or messages::text ilike '%age require%' then 'age limit' end
          ]) as topic
          from guide_session_logs
          ${conditions.length > 0 ? sql`where ${and(...conditions)}` : sql``}
        ) t
        where topic is not null
        group by topic
        order by hit_count desc
        limit 8
      `),
    ])

    const stats = totals[0]
    const total = Number(stats?.total ?? 0)
    const eligChecked = Number(stats?.eligChecked ?? 0)
    const totalFlags = Number(stats?.totalFlags ?? 0)

    return ok(reply, {
      totalSessions: total,
      sessionsThisWeek: Number(thisWeek[0]?.total ?? 0),
      eligCheckRate: total > 0 ? Math.round((eligChecked / total) * 100) : 0,
      flagRate: total > 0 ? Math.round((totalFlags / total) * 100) : 0,
      topOpportunities: topOpportunities.filter(r => r.opportunitySlug),
      topTopics: (topTopics.rows as Array<{ topic: string; hit_count: number }>),
    })
  })

  // GET /api/v1/guide-sessions/admin/:id — full session detail
  server.get('/admin/:id', { preHandler: [requireAuth, requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const [session] = await db
      .select({
        id: schema.guideSessionLogs.id,
        userId: schema.guideSessionLogs.userId,
        userName: schema.users.name,
        userEmail: schema.users.email,
        userAvatarUrl: schema.users.avatarUrl,
        opportunitySlug: schema.guideSessionLogs.opportunitySlug,
        startedAt: schema.guideSessionLogs.startedAt,
        endedAt: schema.guideSessionLogs.endedAt,
        messageCount: schema.guideSessionLogs.messageCount,
        eligTriggered: schema.guideSessionLogs.eligTriggered,
        eligVerdict: schema.guideSessionLogs.eligVerdict,
        sentiment: schema.guideSessionLogs.sentiment,
        messages: schema.guideSessionLogs.messages,
        flagCount: schema.guideSessionLogs.flagCount,
        createdAt: schema.guideSessionLogs.createdAt,
      })
      .from(schema.guideSessionLogs)
      .leftJoin(schema.users, eq(schema.guideSessionLogs.userId, schema.users.id))
      .where(eq(schema.guideSessionLogs.id, id))
      .limit(1)

    if (!session) return notFound(reply, 'Session not found.')

    const flags = await db
      .select({
        id: schema.guideResponseFlags.id,
        messageIndex: schema.guideResponseFlags.messageIndex,
        reason: schema.guideResponseFlags.reason,
        notes: schema.guideResponseFlags.notes,
        adminId: schema.guideResponseFlags.adminId,
        adminName: schema.users.name,
        createdAt: schema.guideResponseFlags.createdAt,
      })
      .from(schema.guideResponseFlags)
      .leftJoin(schema.users, eq(schema.guideResponseFlags.adminId, schema.users.id))
      .where(eq(schema.guideResponseFlags.sessionId, id))
      .orderBy(schema.guideResponseFlags.messageIndex)

    return ok(reply, { session, flags })
  })

  // POST /api/v1/guide-sessions/admin/flags — flag a message in a session
  server.post('/admin/flags', { preHandler: [requireAuth, requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (request, reply) => {
    const admin = request.user as { id: string }
    const parsed = flagSchema.safeParse(request.body)
    if (!parsed.success) return badRequest(reply, parsed.error.errors[0].message)

    const { sessionId, messageIndex, reason, notes } = parsed.data

    const [session] = await db
      .select({ id: schema.guideSessionLogs.id, messageCount: schema.guideSessionLogs.messageCount })
      .from(schema.guideSessionLogs)
      .where(eq(schema.guideSessionLogs.id, sessionId))
      .limit(1)

    if (!session) return notFound(reply, 'Session not found.')
    if (messageIndex >= session.messageCount) return badRequest(reply, 'Message index out of range.')

    const [newFlag] = await db
      .insert(schema.guideResponseFlags)
      .values({
        sessionId,
        messageIndex,
        reason,
        notes: notes ?? null,
        adminId: admin.id,
      })
      .returning()

    // Increment flag count on the session
    await db
      .update(schema.guideSessionLogs)
      .set({ flagCount: sql`${schema.guideSessionLogs.flagCount} + 1` })
      .where(eq(schema.guideSessionLogs.id, sessionId))

    return created(reply, { id: newFlag.id })
  })
}
