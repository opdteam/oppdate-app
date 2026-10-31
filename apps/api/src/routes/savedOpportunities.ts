import { FastifyInstance } from 'fastify'
import { db, schema } from '../db'
import { eq, and, desc } from 'drizzle-orm'
import { ok, created, notFound } from '../utils/response'
import { requireAuth } from '../middleware/auth'

export async function savedOpportunityRoutes(server: FastifyInstance) {
  // GET /api/v1/saved-opportunities -list user's saved opportunities
  server.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const payload = request.user as { id: string }

    const saved = await db
      .select({
        id: schema.savedOpportunities.id,
        savedAt: schema.savedOpportunities.savedAt,
        opportunityId: schema.opportunities.id,
        title: schema.opportunities.title,
        slug: schema.opportunities.slug,
        type: schema.opportunities.type,
        institution: schema.opportunities.institution,
        country: schema.opportunities.country,
        deadline: schema.opportunities.deadline,
        oppdateServiceFeeUsd: schema.opportunities.oppdateServiceFeeUsd,
        institutionFeeUsd: schema.opportunities.institutionFeeUsd,
        institutionLogoUrl: schema.opportunities.institutionLogoUrl,
        status: schema.opportunities.status,
      })
      .from(schema.savedOpportunities)
      .leftJoin(schema.opportunities, eq(schema.savedOpportunities.opportunityId, schema.opportunities.id))
      .where(eq(schema.savedOpportunities.userId, payload.id))
      .orderBy(desc(schema.savedOpportunities.savedAt))

    return ok(reply, saved)
  })

  // POST /api/v1/saved-opportunities/:opportunityId -save an opportunity
  server.post('/:opportunityId', { preHandler: [requireAuth] }, async (request, reply) => {
    const payload = request.user as { id: string }
    const { opportunityId } = request.params as { opportunityId: string }

    const [opportunity] = await db
      .select({ id: schema.opportunities.id })
      .from(schema.opportunities)
      .where(eq(schema.opportunities.id, opportunityId))
      .limit(1)

    if (!opportunity) return notFound(reply, 'Opportunity')

    // Upsert - ignore if already saved
    const [saved] = await db
      .insert(schema.savedOpportunities)
      .values({ userId: payload.id, opportunityId })
      .onConflictDoNothing()
      .returning()

    if (!saved) {
      return ok(reply, null, 'Already saved.')
    }

    // Record save event (fire and forget)
    db.insert(schema.opportunityEvents)
      .values({ opportunityId, eventType: 'save', userId: payload.id })
      .catch(() => {})

    return created(reply, saved, 'Opportunity saved.')
  })

  // DELETE /api/v1/saved-opportunities/:opportunityId -unsave an opportunity
  server.delete('/:opportunityId', { preHandler: [requireAuth] }, async (request, reply) => {
    const payload = request.user as { id: string }
    const { opportunityId } = request.params as { opportunityId: string }

    await db
      .delete(schema.savedOpportunities)
      .where(
        and(
          eq(schema.savedOpportunities.userId, payload.id),
          eq(schema.savedOpportunities.opportunityId, opportunityId)
        )
      )

    // Record unsave event (fire and forget)
    db.insert(schema.opportunityEvents)
      .values({ opportunityId, eventType: 'unsave', userId: payload.id })
      .catch(() => {})

    return ok(reply, null, 'Opportunity removed from saved.')
  })
}
