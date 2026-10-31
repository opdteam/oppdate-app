import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, schema } from '../db'
import { eq, and, gt, asc, desc } from 'drizzle-orm'
import { ok, created, badRequest, notFound } from '../utils/response'
import { requireAuth, requireRole } from '../middleware/auth'
import { createCalendarEvent } from '../utils/googleCalendar'

const setMeetingSchema = z.object({
  meetingLink: z.string().url(),
  meetingType: z.enum(['google_meet', 'zoom']),
})

const updateStatusSchema = z.object({
  status: z.enum(['confirmed', 'completed', 'cancelled']),
})

export async function consultationRoutes(server: FastifyInstance) {
  // GET /api/v1/consultations/pricing -- legacy public pricing tiers (kept for compat)
  server.get('/pricing', async (_request, reply) => {
    const tiers = await db
      .select()
      .from(schema.consultationPricing)
      .where(eq(schema.consultationPricing.active, true))
      .orderBy(schema.consultationPricing.durationMinutes)

    return ok(reply, tiers)
  })

  // GET /api/v1/consultations/sessions -- public list of active bookable sessions
  server.get('/sessions', async (_request, reply) => {
    const sessions = await db
      .select()
      .from(schema.consultationSessions)
      .where(eq(schema.consultationSessions.active, true))
      .orderBy(asc(schema.consultationSessions.createdAt))

    // Count available slots per session
    const allSlots = await db
      .select()
      .from(schema.consultationSlots)
      .where(
        and(
          eq(schema.consultationSlots.claimed, false),
          gt(schema.consultationSlots.startsAt, new Date())
        )
      )

    const slotCountMap: Record<string, number> = {}
    allSlots.forEach(s => {
      slotCountMap[s.sessionId] = (slotCountMap[s.sessionId] ?? 0) + 1
    })

    const result = sessions.map(s => ({
      ...s,
      availableSlots: slotCountMap[s.id] ?? 0,
    }))

    return ok(reply, result)
  })

  // GET /api/v1/consultations/sessions/:sessionId/slots -- available slots for a session (public)
  server.get('/sessions/:sessionId/slots', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string }

    const [session] = await db
      .select()
      .from(schema.consultationSessions)
      .where(
        and(
          eq(schema.consultationSessions.id, sessionId),
          eq(schema.consultationSessions.active, true)
        )
      )
      .limit(1)

    if (!session) return notFound(reply, 'Session')

    const slots = await db
      .select({ id: schema.consultationSlots.id, startsAt: schema.consultationSlots.startsAt })
      .from(schema.consultationSlots)
      .where(
        and(
          eq(schema.consultationSlots.sessionId, sessionId),
          eq(schema.consultationSlots.claimed, false),
          gt(schema.consultationSlots.startsAt, new Date())
        )
      )
      .orderBy(asc(schema.consultationSlots.startsAt))

    return ok(reply, slots)
  })

  // GET /api/v1/consultations -- list bookings (user sees own, admin sees all)
  server.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string; role: string }
    const isAdmin = ['staff_admin', 'manager_admin', 'super_admin'].includes(user.role)

    if (isAdmin) {
      const rows = await db
        .select({
          id: schema.consultations.id,
          userId: schema.consultations.userId,
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
        })
        .from(schema.consultations)
        .leftJoin(schema.consultationSessions, eq(schema.consultations.sessionId, schema.consultationSessions.id))
        .orderBy(desc(schema.consultations.scheduledAt))
      return ok(reply, rows)
    }

    const rows = await db
      .select({
        id: schema.consultations.id,
        userId: schema.consultations.userId,
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
      })
      .from(schema.consultations)
      .leftJoin(schema.consultationSessions, eq(schema.consultations.sessionId, schema.consultationSessions.id))
      .where(eq(schema.consultations.userId, user.id))
      .orderBy(desc(schema.consultations.scheduledAt))

    return ok(reply, rows)
  })

  // POST /api/v1/consultations -- book a consultation by claiming a slot
  server.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const body = z.object({
      sessionId: z.string().uuid(),
      slotId: z.string().uuid(),
    }).safeParse(request.body)
    if (!body.success) return badRequest(reply, body.error.errors[0].message)

    const { sessionId, slotId } = body.data

    // Verify session is active
    const [session] = await db
      .select()
      .from(schema.consultationSessions)
      .where(
        and(
          eq(schema.consultationSessions.id, sessionId),
          eq(schema.consultationSessions.active, true)
        )
      )
      .limit(1)

    if (!session) return notFound(reply, 'Session')

    // Verify slot belongs to session, is unclaimed, and is in the future
    const [slot] = await db
      .select()
      .from(schema.consultationSlots)
      .where(
        and(
          eq(schema.consultationSlots.id, slotId),
          eq(schema.consultationSlots.sessionId, sessionId),
          eq(schema.consultationSlots.claimed, false),
          gt(schema.consultationSlots.startsAt, new Date())
        )
      )
      .limit(1)

    if (!slot) return badRequest(reply, 'This slot is no longer available. Please choose another time.')

    // Atomically claim slot and create booking
    const result = await db.transaction(async (tx) => {
      // Re-check inside transaction to prevent race conditions
      const [freshSlot] = await tx
        .select()
        .from(schema.consultationSlots)
        .where(
          and(
            eq(schema.consultationSlots.id, slotId),
            eq(schema.consultationSlots.claimed, false)
          )
        )
        .limit(1)

      if (!freshSlot) return null

      const [booking] = await tx
        .insert(schema.consultations)
        .values({
          userId: user.id,
          sessionId,
          slotId,
          durationMinutes: session.durationMinutes,
          priceUsd: session.priceUsd,
          scheduledAt: slot.startsAt,
          status: 'pending',
        })
        .returning()

      await tx
        .update(schema.consultationSlots)
        .set({ claimed: true, consultationId: booking.id })
        .where(eq(schema.consultationSlots.id, slotId))

      return booking
    })

    if (!result) return badRequest(reply, 'This slot was just taken. Please choose another time.')

    return created(reply, result, 'Consultation booked. Proceed to payment.')
  })

  // GET /api/v1/consultations/:id -- booking detail
  server.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string; role: string }
    const { id } = request.params as { id: string }

    const [booking] = await db
      .select()
      .from(schema.consultations)
      .where(eq(schema.consultations.id, id))
      .limit(1)

    if (!booking) return notFound(reply, 'Consultation')

    const isAdmin = ['staff_admin', 'manager_admin', 'super_admin'].includes(user.role)
    if (!isAdmin && booking.userId !== user.id) return notFound(reply, 'Consultation')

    return ok(reply, booking)
  })

  // PATCH /api/v1/consultations/:id/meeting -- admin sets meeting link + type
  server.patch(
    '/:id/meeting',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = setMeetingSchema.safeParse(request.body)
      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const [booking] = await db
        .select({
          scheduledAt: schema.consultations.scheduledAt,
          durationMinutes: schema.consultations.durationMinutes,
          userId: schema.consultations.userId,
        })
        .from(schema.consultations)
        .where(eq(schema.consultations.id, id))
        .limit(1)

      if (!booking) return notFound(reply, 'Consultation')

      const rows = await db
        .update(schema.consultations)
        .set({
          meetingLink: body.data.meetingLink,
          meetingType: body.data.meetingType,
          updatedAt: new Date(),
        })
        .where(eq(schema.consultations.id, id))
        .returning()

      if (!rows[0]) return notFound(reply, 'Consultation')

      const [user] = await db
        .select({ email: schema.users.email, name: schema.users.name })
        .from(schema.users)
        .where(eq(schema.users.id, booking.userId))
        .limit(1)

      if (user) {
        createCalendarEvent({
          title: `OppDate Strategy Session - ${user.name || user.email}`,
          startTime: booking.scheduledAt,
          durationMinutes: booking.durationMinutes,
          attendeeEmail: user.email,
          meetLink: body.data.meetingLink,
        }).then(eventId => {
          if (eventId) {
            db.update(schema.consultations)
              .set({ calendarEventId: eventId })
              .where(eq(schema.consultations.id, id))
              .catch(() => {})
          }
        }).catch(() => {})
      }

      return ok(reply, rows[0], 'Meeting link set.')
    }
  )

  // PATCH /api/v1/consultations/:id/status -- admin updates status
  server.patch(
    '/:id/status',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = updateStatusSchema.safeParse(request.body)
      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const rows = await db
        .update(schema.consultations)
        .set({ status: body.data.status, updatedAt: new Date() })
        .where(eq(schema.consultations.id, id))
        .returning()

      if (!rows[0]) return notFound(reply, 'Consultation')

      return ok(reply, rows[0])
    }
  )

  // PATCH /api/v1/consultations/pricing/:id -- admin updates legacy pricing tier
  server.patch(
    '/pricing/:id',
    { preHandler: [requireRole('super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = z
        .object({
          priceUsd: z.number().int().positive().optional(),
          description: z.string().optional(),
          active: z.boolean().optional(),
        })
        .safeParse(request.body)

      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const rows = await db
        .update(schema.consultationPricing)
        .set({ ...body.data, updatedAt: new Date() })
        .where(eq(schema.consultationPricing.id, id))
        .returning()

      if (!rows[0]) return notFound(reply, 'Pricing tier')

      return ok(reply, rows[0])
    }
  )
}
