import { FastifyInstance } from 'fastify'
import { db, schema } from '../db'
import { eq, and, desc, sql } from 'drizzle-orm'
import { ok, notFound, noContent } from '../utils/response'
import { requireAuth } from '../middleware/auth'

export async function notificationRoutes(server: FastifyInstance) {
  // GET /api/v1/notifications -- list user's notifications
  server.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const query = request.query as { unread?: string; limit?: string; offset?: string }

    const limit = Math.min(Number(query.limit) || 50, 100)
    const offset = Number(query.offset) || 0

    const conditions = [eq(schema.notifications.userId, user.id)]
    if (query.unread === 'true') {
      conditions.push(eq(schema.notifications.read, false))
    }

    const rows = await db
      .select()
      .from(schema.notifications)
      .where(and(...conditions))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(limit)
      .offset(offset)

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.userId, user.id),
          eq(schema.notifications.read, false)
        )
      )

    return ok(reply, {
      notifications: rows,
      unreadCount: countResult?.count || 0,
    })
  })

  // PATCH /api/v1/notifications/:id/read -- mark single notification as read
  server.patch('/:id/read', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const { id } = request.params as { id: string }

    const rows = await db
      .update(schema.notifications)
      .set({ read: true })
      .where(
        and(
          eq(schema.notifications.id, id),
          eq(schema.notifications.userId, user.id)
        )
      )
      .returning()

    if (!rows[0]) return notFound(reply, 'Notification')

    return ok(reply, rows[0])
  })

  // POST /api/v1/notifications/read-all -- mark all as read
  server.post('/read-all', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }

    await db
      .update(schema.notifications)
      .set({ read: true })
      .where(
        and(
          eq(schema.notifications.userId, user.id),
          eq(schema.notifications.read, false)
        )
      )

    return ok(reply, null, 'All notifications marked as read.')
  })

  // DELETE /api/v1/notifications/:id -- dismiss a notification
  server.delete('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: string }
    const { id } = request.params as { id: string }

    const rows = await db
      .delete(schema.notifications)
      .where(
        and(
          eq(schema.notifications.id, id),
          eq(schema.notifications.userId, user.id)
        )
      )
      .returning()

    if (!rows[0]) return notFound(reply, 'Notification')

    return noContent(reply)
  })
}
