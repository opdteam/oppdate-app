import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, schema } from '../db'
import { eq, and, gt, asc, desc, sql } from 'drizzle-orm'
import { ok, created, badRequest, notFound } from '../utils/response'
import { requireAuth, requireRole } from '../middleware/auth'
import { createCalendarEvent } from '../utils/googleCalendar'

interface Schedule { days: number[]; startTime: string; endTime: string; slotInterval: number }

export function computeSlots(schedule: Schedule, windowDays = 28): Date[] {
  const now = new Date()
  const [startH, startM] = schedule.startTime.split(':').map(Number)
  const [endH, endM] = schedule.endTime.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM
  if (endMinutes <= startMinutes) return []
  const daysSet = new Set(schedule.days)
  const slots: Date[] = []
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  const limit = new Date(cursor)
  limit.setDate(limit.getDate() + windowDays)
  while (cursor <= limit) {
    if (daysSet.has(cursor.getDay())) {
      for (let min = startMinutes; min < endMinutes; min += schedule.slotInterval) {
        const slot = new Date(cursor)
        slot.setHours(Math.floor(min / 60), min % 60, 0, 0)
        if (slot > now) slots.push(new Date(slot))
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return slots
}

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

    // Batch-fetch all active bookings to subtract from computed slots
    const activeBookings = await db
      .select({ sessionId: schema.consultations.sessionId, scheduledAt: schema.consultations.scheduledAt })
      .from(schema.consultations)
      .where(and(
        sql`${schema.consultations.status} IN ('pending', 'confirmed')`,
        gt(schema.consultations.scheduledAt, new Date())
      ))

    const bookedMap: Record<string, Set<string>> = {}
    activeBookings.forEach(b => {
      if (!b.sessionId) return
      if (!bookedMap[b.sessionId]) bookedMap[b.sessionId] = new Set()
      bookedMap[b.sessionId].add(new Date(b.scheduledAt).toISOString())
    })

    const result = sessions.map(s => {
      const schedule = s.schedule as Schedule | null
      if (!schedule) return { ...s, availableSlots: 0 }
      const allSlots = computeSlots(schedule)
      const booked = bookedMap[s.id] ?? new Set()
      const available = allSlots.filter(slot => !booked.has(slot.toISOString()))
      return { ...s, availableSlots: available.length }
    })

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

    const schedule = session.schedule as Schedule | null
    if (!schedule) return ok(reply, [])

    const allSlots = computeSlots(schedule)

    // Fetch already-booked times for this session
    const booked = await db
      .select({ scheduledAt: schema.consultations.scheduledAt })
      .from(schema.consultations)
      .where(and(
        eq(schema.consultations.sessionId, sessionId),
        sql`${schema.consultations.status} IN ('pending', 'confirmed')`,
        gt(schema.consultations.scheduledAt, new Date())
      ))

    const bookedSet = new Set(booked.map(b => new Date(b.scheduledAt).toISOString()))

    const available = allSlots
      .filter(slot => !bookedSet.has(slot.toISOString()))
      .map(slot => ({ id: `${sessionId}_${slot.toISOString()}`, startsAt: slot.toISOString() }))

    return ok(reply, available)
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

  // POST /api/v1/consultations -- book a consultation
  server.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const body = z.object({
      sessionId: z.string().uuid(),
      scheduledAt: z.string(),
    }).safeParse(request.body)
    if (!body.success) return badRequest(reply, body.error.errors[0].message)

    const { sessionId } = body.data
    const scheduledAt = new Date(body.data.scheduledAt)
    if (isNaN(scheduledAt.getTime())) return badRequest(reply, 'Invalid date.')

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

    // Validate scheduledAt against session schedule
    const schedule = session.schedule as Schedule | null
    if (!schedule) return badRequest(reply, 'This session has no schedule configured.')

    const now = new Date()
    if (scheduledAt <= now) return badRequest(reply, 'Cannot book a time in the past.')

    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 28)
    if (scheduledAt > maxDate) return badRequest(reply, 'Cannot book more than 28 days in advance.')

    const dayOfWeek = scheduledAt.getDay()
    if (!schedule.days.includes(dayOfWeek)) return badRequest(reply, 'This day is not available for bookings.')

    const [startH, startM] = schedule.startTime.split(':').map(Number)
    const [endH, endM] = schedule.endTime.split(':').map(Number)
    const slotMinutes = scheduledAt.getHours() * 60 + scheduledAt.getMinutes()
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM
    if (slotMinutes < startMinutes || slotMinutes >= endMinutes) return badRequest(reply, 'This time is outside the available window.')
    if ((slotMinutes - startMinutes) % schedule.slotInterval !== 0) return badRequest(reply, 'This time does not align with the schedule interval.')

    // Insert booking -- unique partial index on (sessionId, scheduledAt) for active bookings guards against races
    try {
      const [booking] = await db
        .insert(schema.consultations)
        .values({
          userId: user.id,
          sessionId,
          durationMinutes: session.durationMinutes,
          priceUsd: session.priceUsd,
          scheduledAt,
          status: 'pending',
        })
        .returning()

      return created(reply, booking, 'Consultation booked. Proceed to payment.')
    } catch (err: any) {
      if (err.code === '23505') return badRequest(reply, 'This time slot was just taken. Please choose another time.')
      throw err
    }
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

      // No slot release needed -- dynamic computation excludes cancelled bookings automatically

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
