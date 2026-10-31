import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, schema } from '../db'
import { eq, desc, count, sql } from 'drizzle-orm'
import { ok, created, notFound, badRequest, forbidden } from '../utils/response'
import { requireAuth, requirePremium, requireRole } from '../middleware/auth'

const saveSearchSchema = z.object({
  name: z.string().min(1).max(255),
  filters: z.record(z.any()).default({}),
  alertsEnabled: z.boolean().default(true),
})

export async function savedSearchRoutes(server: FastifyInstance) {
  // GET /api/v1/saved-searches -list user's saved searches
  server.get('/', { preHandler: [requirePremium] }, async (request, reply) => {
    const payload = request.user as { id: string }

    const searches = await db
      .select()
      .from(schema.savedSearches)
      .where(eq(schema.savedSearches.userId, payload.id))
      .orderBy(desc(schema.savedSearches.createdAt))

    return ok(reply, searches)
  })

  // POST /api/v1/saved-searches -save a search
  server.post('/', { preHandler: [requirePremium] }, async (request, reply) => {
    const payload = request.user as { id: string }
    const body = saveSearchSchema.safeParse(request.body)
    if (!body.success) return badRequest(reply, body.error.errors[0].message)

    const [search] = await db
      .insert(schema.savedSearches)
      .values({
        userId: payload.id,
        name: body.data.name,
        filters: body.data.filters,
        alertsEnabled: body.data.alertsEnabled,
      })
      .returning()

    return created(reply, search, 'Search saved.')
  })

  // PATCH /api/v1/saved-searches/:id -update alerts toggle or name
  server.patch('/:id', { preHandler: [requirePremium] }, async (request, reply) => {
    const payload = request.user as { id: string }
    const { id } = request.params as { id: string }
    const body = saveSearchSchema.partial().safeParse(request.body)
    if (!body.success) return badRequest(reply, body.error.errors[0].message)

    const [existing] = await db
      .select({ id: schema.savedSearches.id, userId: schema.savedSearches.userId })
      .from(schema.savedSearches)
      .where(eq(schema.savedSearches.id, id))
      .limit(1)

    if (!existing) return notFound(reply, 'Saved search')
    if (existing.userId !== payload.id) return forbidden(reply)

    const [updated] = await db
      .update(schema.savedSearches)
      .set({ ...body.data, updatedAt: new Date() })
      .where(eq(schema.savedSearches.id, id))
      .returning()

    return ok(reply, updated, 'Saved search updated.')
  })

  // DELETE /api/v1/saved-searches/:id -remove a saved search
  server.delete('/:id', { preHandler: [requirePremium] }, async (request, reply) => {
    const payload = request.user as { id: string }
    const { id } = request.params as { id: string }

    const [existing] = await db
      .select({ id: schema.savedSearches.id, userId: schema.savedSearches.userId })
      .from(schema.savedSearches)
      .where(eq(schema.savedSearches.id, id))
      .limit(1)

    if (!existing) return notFound(reply, 'Saved search')
    if (existing.userId !== payload.id) return forbidden(reply)

    await db.delete(schema.savedSearches).where(eq(schema.savedSearches.id, id))

    return ok(reply, null, 'Saved search deleted.')
  })

  // GET /api/v1/saved-searches/admin/insights - admin: aggregate stats
  server.get('/admin/insights', { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] }, async (_request, reply) => {
    const [totals] = await db
      .select({
        total: count(),
        alertsOn: sql<number>`count(*) filter (where ${schema.savedSearches.alertsEnabled} = true)`,
      })
      .from(schema.savedSearches)

    // Top filter combinations (type field only, top 8)
    const filterRows = await db
      .select({ filters: schema.savedSearches.filters })
      .from(schema.savedSearches)
      .limit(500)

    const typeCounts: Record<string, number> = {}
    for (const row of filterRows) {
      const f = row.filters as Record<string, unknown>
      const t = typeof f.type === 'string' ? f.type : 'any'
      typeCounts[t] = (typeCounts[t] ?? 0) + 1
    }
    const topTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([type, count]) => ({ type, count }))

    return ok(reply, {
      total: Number(totals?.total ?? 0),
      alertsOn: Number(totals?.alertsOn ?? 0),
      topTypes,
    })
  })
}
