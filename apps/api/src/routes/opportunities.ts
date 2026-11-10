import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, schema } from '../db'
import { eq, and, gte, lte, ilike, or, sql, desc, asc } from 'drizzle-orm'
import { ok, created, notFound, badRequest } from '../utils/response'
import { requireRole, requireAuth } from '../middleware/auth'
import { triggerEligibilityGeneration } from './eligibility'


const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  type: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  eligibilityLevel: z.string().optional(),
  search: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  pinned: z.coerce.boolean().optional(),
  sortBy: z.enum(['deadline', 'createdAt', 'viewCount']).default('deadline'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  deadlineAfter: z.string().optional(),
  deadlineBefore: z.string().optional(),
  minFee: z.coerce.number().optional(),
  maxFee: z.coerce.number().optional(),
  minAwardUsd: z.coerce.number().optional(),
})

const createOpportunitySchema = z.object({
  title: z.string().min(1).max(500),
  type: z.enum(['internship', 'scholarship', 'training_bootcamp', 'entry_level_job', 'fellowship', 'grant', 'volunteering', 'competition', 'relocation']),
  institution: z.string().min(1).max(500),
  country: z.string().min(1).max(100),
  region: z.string().min(1).max(100),
  summary: z.string().min(1),
  description: z.string().min(1),
  whoItsFor: z.string().min(1),
  whatIsOffered: z.string().min(1),
  eligibilityCriteria: z.array(z.any()).default([]),
  requiredDocuments: z.array(z.any()).default([]),
  fieldOfStudy: z.string().max(255).optional(),
  eligibilityLevel: z.string().max(100).optional(),
  awardValueUsd: z.number().int().positive().optional(),
  deadline: z.string().datetime(),
  applicationOpenDate: z.string().datetime().optional(),
  oppdateServiceFeeUsd: z.number().int().min(0).default(0),
  institutionFeeUsd: z.number().int().min(0).default(0),
  postSubmissionMessage: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived', 'expired']).default('draft'),
  featured: z.boolean().default(false),
  pinned: z.boolean().default(false),
  institutionLogoUrl: z.string().url().optional().nullable(),
  tags: z.array(z.string()).default([]),
  oppDateApply: z.boolean().optional(),
  applyDisabledNote: z.string().nullable().optional(),
  complianceCategory: z.enum(['A', 'B']).nullable().optional(),
  institutionCode: z.string().max(3).nullable().optional(),
})

export async function opportunityRoutes(server: FastifyInstance) {
  // GET /api/v1/opportunities
  server.get('/', async (request, reply) => {
    const query = listQuerySchema.safeParse(request.query)
    if (!query.success) return badRequest(reply, query.error.errors[0].message)

    const {
      page, limit, type, region, country, fieldOfStudy, eligibilityLevel,
      search, featured, pinned, sortBy, sortOrder,
      deadlineAfter, deadlineBefore, minFee, maxFee, minAwardUsd,
    } = query.data

    const offset = (page - 1) * limit

    const conditions = [eq(schema.opportunities.status, 'published')]

    if (type) conditions.push(eq(schema.opportunities.type, type as any))
    if (region) conditions.push(ilike(schema.opportunities.region, `%${region}%`))
    if (country) conditions.push(ilike(schema.opportunities.country, `%${country}%`))
    if (fieldOfStudy) conditions.push(ilike(schema.opportunities.fieldOfStudy, `%${fieldOfStudy}%`))
    if (eligibilityLevel) conditions.push(ilike(schema.opportunities.eligibilityLevel, `%${eligibilityLevel}%`))
    if (featured !== undefined) conditions.push(eq(schema.opportunities.featured, featured))
    if (pinned !== undefined) conditions.push(eq(schema.opportunities.pinned, pinned))
    if (deadlineAfter) conditions.push(gte(schema.opportunities.deadline, new Date(deadlineAfter)))
    if (deadlineBefore) conditions.push(lte(schema.opportunities.deadline, new Date(deadlineBefore)))
    if (minFee !== undefined) conditions.push(gte(schema.opportunities.oppdateServiceFeeUsd, minFee))
    if (maxFee !== undefined) conditions.push(lte(schema.opportunities.oppdateServiceFeeUsd, maxFee))
    if (minAwardUsd !== undefined) conditions.push(gte(schema.opportunities.awardValueUsd, minAwardUsd))

    if (search) {
      // pg_trgm fuzzy search -- matches partial words and typos
      // Falls back to ILIKE for very short queries where trigram matching is weak
      if (search.length >= 3) {
        conditions.push(
          sql`(
            ${schema.opportunities.title} % ${search}
            OR ${schema.opportunities.institution} % ${search}
            OR word_similarity(${search}, ${schema.opportunities.title}) > 0.3
            OR word_similarity(${search}, ${schema.opportunities.institution}) > 0.3
            OR ${schema.opportunities.title} ILIKE ${'%' + search + '%'}
            OR ${schema.opportunities.institution} ILIKE ${'%' + search + '%'}
            OR ${schema.opportunities.summary} ILIKE ${'%' + search + '%'}
          )`
        )
      } else {
        conditions.push(
          or(
            ilike(schema.opportunities.title, `%${search}%`),
            ilike(schema.opportunities.institution, `%${search}%`),
            ilike(schema.opportunities.summary, `%${search}%`),
          )!
        )
      }
    }

    // When searching with pg_trgm, sort by relevance first unless user explicitly chose another sort
    const useRelevanceSort = search && search.length >= 3 && sortBy === 'deadline'

    const orderBy = useRelevanceSort
      ? sql`greatest(
          similarity(${schema.opportunities.title}, ${search}),
          similarity(${schema.opportunities.institution}, ${search})
        ) DESC`
      : sortOrder === 'asc'
        ? asc(schema.opportunities[sortBy as keyof typeof schema.opportunities] as any)
        : desc(schema.opportunities[sortBy as keyof typeof schema.opportunities] as any)

    const [opportunities, [{ count }]] = await Promise.all([
      db
        .select({
          id: schema.opportunities.id,
          title: schema.opportunities.title,
          slug: schema.opportunities.slug,
          type: schema.opportunities.type,
          institution: schema.opportunities.institution,
          country: schema.opportunities.country,
          region: schema.opportunities.region,
          summary: schema.opportunities.summary,
          deadline: schema.opportunities.deadline,
          oppdateServiceFeeUsd: schema.opportunities.oppdateServiceFeeUsd,
          institutionFeeUsd: schema.opportunities.institutionFeeUsd,
          awardValueUsd: schema.opportunities.awardValueUsd,
          institutionLogoUrl: schema.opportunities.institutionLogoUrl,
          tags: schema.opportunities.tags,
          featured: schema.opportunities.featured,
          pinned: schema.opportunities.pinned,
          oppDateApply: schema.opportunities.oppDateApply,
          applyDisabledNote: schema.opportunities.applyDisabledNote,
        })
        .from(schema.opportunities)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.opportunities)
        .where(and(...conditions)),
    ])

    // Gate all listings behind Premium - free users see only locked skeletons
    let isPremium = false
    try {
      await request.jwtVerify()
      const payload = request.user as { id: string }
      const [u] = await db
        .select({ isPremium: schema.users.isPremium })
        .from(schema.users)
        .where(eq(schema.users.id, payload.id))
        .limit(1)
      isPremium = !!u?.isPremium
    } catch { /* unauthenticated - treat as non-premium */ }

    const gated = opportunities.map(opp => {
      if (isPremium) return { ...opp, isLocked: false }
      return { id: opp.id, isLocked: true }
    })

    return reply.status(200).send({
      success: true,
      data: gated,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      hasMore: page * limit < count,
      tier: isPremium ? 'premium' : 'free',
    })
  })

  // GET /api/v1/opportunities/:slug - requires premium
  server.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }

    // Gate detail view behind premium
    let viewerIsPremium = false
    let viewerId: string | null = null
    try {
      await request.jwtVerify()
      const payload = request.user as { id: string }
      viewerId = payload.id
      const [u] = await db
        .select({ isPremium: schema.users.isPremium })
        .from(schema.users)
        .where(eq(schema.users.id, payload.id))
        .limit(1)
      viewerIsPremium = !!u?.isPremium
    } catch { /* unauthenticated */ }

    if (!viewerIsPremium) {
      return reply.status(403).send({ success: false, code: 'PREMIUM_REQUIRED', error: 'Premium subscription required.' })
    }

    const [opportunity] = await db
      .select()
      .from(schema.opportunities)
      .where(
        and(
          eq(schema.opportunities.slug, slug),
          eq(schema.opportunities.status, 'published')
        )
      )
      .limit(1)

    if (!opportunity) return notFound(reply, 'Opportunity')

    // Increment view count and record event (fire and forget)
    db.update(schema.opportunities)
      .set({ viewCount: sql`${schema.opportunities.viewCount} + 1` })
      .where(eq(schema.opportunities.id, opportunity.id))
      .catch(() => {})
    db.insert(schema.opportunityEvents)
      .values({ opportunityId: opportunity.id, eventType: 'view_detail', userId: viewerId ?? null })
      .catch(() => {})

    return ok(reply, opportunity)
  })

  // POST /api/v1/opportunities -admin only
  server.post(
    '/',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const payload = request.user as { id: string }
      const body = createOpportunitySchema.safeParse(request.body)
      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const [opportunity] = await db
        .insert(schema.opportunities)
        .values({
          ...body.data,
          deadline: new Date(body.data.deadline),
          applicationOpenDate: body.data.applicationOpenDate ? new Date(body.data.applicationOpenDate) : null,
          createdBy: payload.id,
          slug: generateSlug(body.data.title),
        })
        .returning()

      // Trigger AI eligibility question generation in background (non-blocking)
      triggerEligibilityGeneration(opportunity.id).catch(() => {})

      return created(reply, opportunity, 'Opportunity created successfully.')
    }
  )

  // PATCH /api/v1/opportunities/:id -admin only
  server.patch(
    '/:id',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = createOpportunitySchema.partial().safeParse(request.body)
      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const { deadline, applicationOpenDate, ...rest } = body.data

      const [updated] = await db
        .update(schema.opportunities)
        .set({
          ...rest,
          ...(deadline !== undefined && { deadline: new Date(deadline) }),
          ...(applicationOpenDate !== undefined && { applicationOpenDate: new Date(applicationOpenDate) }),
          updatedAt: new Date(),
        })
        .where(eq(schema.opportunities.id, id))
        .returning()

      if (!updated) return notFound(reply, 'Opportunity')

      // Re-generate eligibility questions in background when listing content changes
      triggerEligibilityGeneration(id).catch(() => {})

      return ok(reply, updated, 'Opportunity updated.')
    }
  )

  // DELETE /api/v1/opportunities/:id -super admin only (hard delete)
  server.delete(
    '/:id',
    { preHandler: [requireRole('super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      await db.delete(schema.opportunities).where(eq(schema.opportunities.id, id))

      return ok(reply, null, 'Opportunity deleted.')
    }
  )

  // GET /api/v1/opportunities/placements?zone= -- public: fetch active ad placement for a zone
  server.get('/placements', async (request, reply) => {
    const { zone } = request.query as { zone?: string }
    if (!zone) return ok(reply, null)

    const [placement] = await db
      .select()
      .from(schema.adPlacements)
      .where(
        and(
          eq(schema.adPlacements.zone, zone as any),
          eq(schema.adPlacements.active, true)
        )
      )
      .limit(1)

    return ok(reply, placement ?? null)
  })
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 200)
    + '-' + Date.now().toString(36)
}
