import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, schema } from '../db'
import { eq, and, desc } from 'drizzle-orm'
import { ok, created, badRequest, notFound } from '../utils/response'
import { requireAuth, requireRole } from '../middleware/auth'

const enrollSchema = z.object({
  programmeId: z.string().uuid(),
  mentorProfileId: z.string().uuid().optional(), // admin assigns mentor after enrolment
})

const sessionSchema = z.object({
  scheduledAt: z.string().datetime(),
  notes: z.string().optional(),
})

export async function mentorshipRoutes(server: FastifyInstance) {
  // GET /api/v1/mentorships/programmes -- list active programmes
  server.get('/programmes', async (_request, reply) => {
    const programmes = await db
      .select()
      .from(schema.mentorshipProgrammes)
      .where(eq(schema.mentorshipProgrammes.active, true))

    return ok(reply, programmes)
  })

  // GET /api/v1/mentorships/mentors -- list published mentor profiles
  server.get('/mentors', async (_request, reply) => {
    const mentors = await db
      .select()
      .from(schema.mentorProfiles)
      .where(eq(schema.mentorProfiles.published, true))

    return ok(reply, mentors)
  })

  // POST /api/v1/mentorships -- enrol in mentorship
  server.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const body = enrollSchema.safeParse(request.body)
    if (!body.success) return badRequest(reply, body.error.errors[0].message)

    const { programmeId, mentorProfileId } = body.data

    // Verify programme exists and is active
    const [programme] = await db
      .select()
      .from(schema.mentorshipProgrammes)
      .where(and(eq(schema.mentorshipProgrammes.id, programmeId), eq(schema.mentorshipProgrammes.active, true)))
      .limit(1)

    if (!programme) return notFound(reply, 'Programme')

    // Verify mentor profile if provided
    if (mentorProfileId) {
      const [mentor] = await db
        .select()
        .from(schema.mentorProfiles)
        .where(and(eq(schema.mentorProfiles.id, mentorProfileId), eq(schema.mentorProfiles.published, true)))
        .limit(1)

      if (!mentor) return notFound(reply, 'Mentor profile')
    }

    const rows = await db
      .insert(schema.mentorships)
      .values({
        userId: user.id,
        mentorProfileId: mentorProfileId ?? null,
        programmeId,
        status: 'pending',
      })
      .returning()

    return created(reply, rows[0], 'Enrolled in mentorship. Proceed to payment.')
  })

  // GET /api/v1/mentorships -- list user's mentorships (admin sees all)
  server.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string; role: string }
    const isAdmin = ['staff_admin', 'manager_admin', 'super_admin'].includes(user.role)

    const rows = isAdmin
      ? await db.select().from(schema.mentorships).orderBy(desc(schema.mentorships.createdAt))
      : await db
          .select()
          .from(schema.mentorships)
          .where(eq(schema.mentorships.userId, user.id))
          .orderBy(desc(schema.mentorships.createdAt))

    return ok(reply, rows)
  })

  // GET /api/v1/mentorships/:id -- mentorship detail
  server.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string; role: string }
    const { id } = request.params as { id: string }

    const [mentorship] = await db
      .select()
      .from(schema.mentorships)
      .where(eq(schema.mentorships.id, id))
      .limit(1)

    if (!mentorship) return notFound(reply, 'Mentorship')

    const isAdmin = ['staff_admin', 'manager_admin', 'super_admin'].includes(user.role)
    if (!isAdmin && mentorship.userId !== user.id) return notFound(reply, 'Mentorship')

    return ok(reply, mentorship)
  })

  // PATCH /api/v1/mentorships/:id/status -- admin updates membership status
  server.patch(
    '/:id/status',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = z.object({ status: z.enum(['active', 'paused', 'completed', 'cancelled']) }).safeParse(request.body)
      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const update: Record<string, any> = { status: body.data.status, updatedAt: new Date() }
      if (body.data.status === 'completed' || body.data.status === 'cancelled') {
        update.completedAt = new Date()
      }

      const rows = await db
        .update(schema.mentorships)
        .set(update)
        .where(eq(schema.mentorships.id, id))
        .returning()

      if (!rows[0]) return notFound(reply, 'Mentorship')

      return ok(reply, rows[0])
    }
  )

  // PATCH /api/v1/mentorships/:id/reassign -- admin reassigns mentor
  server.patch(
    '/:id/reassign',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = z.object({ mentorProfileId: z.string().uuid() }).safeParse(request.body)
      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const rows = await db
        .update(schema.mentorships)
        .set({ mentorProfileId: body.data.mentorProfileId, updatedAt: new Date() })
        .where(eq(schema.mentorships.id, id))
        .returning()

      if (!rows[0]) return notFound(reply, 'Mentorship')

      return ok(reply, rows[0], 'Mentor reassigned.')
    }
  )

  // GET /api/v1/mentorships/:id/sessions -- list sessions for a mentorship
  server.get('/:id/sessions', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const sessions = await db
      .select()
      .from(schema.mentorshipSessions)
      .where(eq(schema.mentorshipSessions.mentorshipId, id))
      .orderBy(desc(schema.mentorshipSessions.scheduledAt))

    return ok(reply, sessions)
  })

  // POST /api/v1/mentorships/:id/sessions -- schedule a session
  server.post(
    '/:id/sessions',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = sessionSchema.safeParse(request.body)
      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const rows = await db
        .insert(schema.mentorshipSessions)
        .values({
          mentorshipId: id,
          scheduledAt: new Date(body.data.scheduledAt),
          notes: body.data.notes,
        })
        .returning()

      return created(reply, rows[0])
    }
  )

  // PATCH /api/v1/mentorships/sessions/:sessionId/status -- mark session completed/cancelled
  server.patch(
    '/sessions/:sessionId/status',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string }
      const body = z.object({ status: z.enum(['completed', 'cancelled']) }).safeParse(request.body)
      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const rows = await db
        .update(schema.mentorshipSessions)
        .set({ status: body.data.status, updatedAt: new Date() })
        .where(eq(schema.mentorshipSessions.id, sessionId))
        .returning()

      if (!rows[0]) return notFound(reply, 'Session')

      return ok(reply, rows[0])
    }
  )

  // Admin: manage mentor profiles

  // POST /api/v1/mentorships/mentors -- create mentor profile
  server.post(
    '/mentors',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const body = z
        .object({
          name: z.string().min(2),
          specialty: z.string().min(2),
          bio: z.string().min(10),
          headshotUrl: z.string().url().optional(),
          userId: z.string().uuid().optional(),
          published: z.boolean().default(false),
        })
        .safeParse(request.body)

      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const rows = await db.insert(schema.mentorProfiles).values(body.data).returning()

      return created(reply, rows[0])
    }
  )

  // PATCH /api/v1/mentorships/mentors/:id -- update mentor profile
  server.patch(
    '/mentors/:id',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = z
        .object({
          name: z.string().min(2).optional(),
          specialty: z.string().min(2).optional(),
          bio: z.string().min(10).optional(),
          headshotUrl: z.string().url().optional(),
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

      return ok(reply, rows[0])
    }
  )

  // DELETE /api/v1/mentorships/mentors/:id -- delete mentor profile
  server.delete(
    '/mentors/:id',
    { preHandler: [requireRole('super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const rows = await db
        .delete(schema.mentorProfiles)
        .where(eq(schema.mentorProfiles.id, id))
        .returning()

      if (!rows[0]) return notFound(reply, 'Mentor profile')

      return ok(reply, null, 'Mentor profile deleted.')
    }
  )

  // Admin: manage programmes

  // POST /api/v1/mentorships/programmes -- create programme
  server.post(
    '/programmes',
    { preHandler: [requireRole('super_admin')] },
    async (request, reply) => {
      const user = request.user as { id: string }
      const body = z
        .object({
          title: z.string().min(2),
          description: z.string().min(10),
          monthlyPriceUsd: z.number().int().positive(),
        })
        .safeParse(request.body)

      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const rows = await db
        .insert(schema.mentorshipProgrammes)
        .values({ ...body.data, createdBy: user.id })
        .returning()

      return created(reply, rows[0])
    }
  )

  // PATCH /api/v1/mentorships/programmes/:id -- update programme
  server.patch(
    '/programmes/:id',
    { preHandler: [requireRole('super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = z
        .object({
          title: z.string().min(2).optional(),
          description: z.string().min(10).optional(),
          monthlyPriceUsd: z.number().int().positive().optional(),
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

      return ok(reply, rows[0])
    }
  )
}
