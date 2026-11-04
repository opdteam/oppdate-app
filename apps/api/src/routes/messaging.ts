import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, schema } from '../db'
import { eq, and, desc, sql, inArray, lt } from 'drizzle-orm'
import { ok, created, notFound, forbidden, badRequest } from '../utils/response'
import { requireAuth, requireRole } from '../middleware/auth'
import { WebSocket } from 'ws'
import { enqueueEmail } from '../jobs/queue'
import { newMessageEmail } from '../utils/email'

// Active WebSocket connections: userId -> Set of WebSocket clients
const activeConnections = new Map<string, Set<WebSocket>>()

// Admin-only connections for unassigned thread broadcasts
const adminConnections = new Map<string, Set<WebSocket>>()

// Per-thread typing state: threadId -> { userId, expiresAt }
const typingState = new Map<string, { userId: string; timer: ReturnType<typeof setTimeout> }>()

export function broadcastToUser(userId: string, event: object) {
  const connections = activeConnections.get(userId)
  if (!connections) return
  const payload = JSON.stringify(event)
  connections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload)
    }
  })
}

function broadcastToAllAdmins(event: object) {
  const payload = JSON.stringify(event)
  adminConnections.forEach((connections) => {
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload)
      }
    })
  })
}

const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  attachments: z.array(z.object({
    name: z.string(),
    fileUrl: z.string().url(),
    fileSize: z.number(),
    mimeType: z.string(),
  })).default([]),
})

export async function messagingRoutes(server: FastifyInstance) {
  // GET /api/v1/messages/ws-ticket - issue a short-lived token for WS auth
  server.get('/ws-ticket', { preHandler: [requireAuth] }, async (request, reply) => {
    const payload = request.user as { id: string; email: string; role: string }
    const ticket = server.jwt.sign(
      { id: payload.id, email: payload.email, role: payload.role },
      { expiresIn: '60s' }
    )
    return ok(reply, { ticket })
  })

  // WebSocket endpoint - real-time message delivery
  server.get('/ws', { websocket: true }, async (socket, request) => {
    try {
      const token = (request.query as any).token
      if (!token) {
        socket.close(1008, 'Unauthorised')
        return
      }

      const payload = server.jwt.verify(token) as { id: string; role: string }
      const userId = payload.id
      const isAdminUser = ['staff_admin', 'manager_admin', 'super_admin'].includes(payload.role)

      // Register connection
      if (!activeConnections.has(userId)) {
        activeConnections.set(userId, new Set())
      }
      activeConnections.get(userId)!.add(socket)

      if (isAdminUser) {
        if (!adminConnections.has(userId)) {
          adminConnections.set(userId, new Set())
        }
        adminConnections.get(userId)!.add(socket)
      }

      // Ping/pong keepalive every 30 seconds
      const pingInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.ping()
        } else {
          clearInterval(pingInterval)
        }
      }, 30000)

      function cleanupConnection() {
        clearInterval(pingInterval)
        const connections = activeConnections.get(userId)
        if (connections) {
          connections.delete(socket)
          if (connections.size === 0) activeConnections.delete(userId)
        }
        if (isAdminUser) {
          const adminConns = adminConnections.get(userId)
          if (adminConns) {
            adminConns.delete(socket)
            if (adminConns.size === 0) adminConnections.delete(userId)
          }
        }
      }

      socket.on('close', cleanupConnection)
      socket.on('error', cleanupConnection)

      socket.on('message', async (raw: Buffer) => {
        try {
          const data = JSON.parse(raw.toString())
          const isAdmin = ['staff_admin', 'manager_admin', 'super_admin'].includes(payload.role)

          if (data.type === 'mark_read' && data.threadId) {
            if (isAdmin) {
              await db
                .update(schema.messageThreads)
                .set({ unreadByTeam: 0 })
                .where(eq(schema.messageThreads.id, data.threadId))
            } else {
              await db
                .update(schema.messageThreads)
                .set({ unreadByUser: 0 })
                .where(eq(schema.messageThreads.id, data.threadId))
            }
          }

          if ((data.type === 'typing_start' || data.type === 'typing') && data.threadId) {
            try {
              const [thread] = await db
                .select()
                .from(schema.messageThreads)
                .where(eq(schema.messageThreads.id, data.threadId))
                .limit(1)

              if (thread) {
                const recipientId = isAdmin ? thread.userId : thread.assignedTo
                if (recipientId) {
                  broadcastToUser(recipientId, { type: 'typing_start', threadId: data.threadId, userId })
                } else if (isAdmin) {
                  // user is admin, no assignedTo — skip
                } else {
                  broadcastToAllAdmins({ type: 'typing_start', threadId: data.threadId, userId })
                }

                // Auto-expire typing indicator after 4s
                const stateKey = `${data.threadId}:${userId}`
                const existing = typingState.get(stateKey)
                if (existing) clearTimeout(existing.timer)
                const timer = setTimeout(() => {
                  typingState.delete(stateKey)
                  if (recipientId) {
                    broadcastToUser(recipientId, { type: 'typing_stop', threadId: data.threadId, userId })
                  } else if (!isAdmin) {
                    broadcastToAllAdmins({ type: 'typing_stop', threadId: data.threadId, userId })
                  }
                }, 4000)
                typingState.set(stateKey, { userId, timer })
              }
            } catch {
              // fire-and-forget
            }
          }

          if (data.type === 'typing_stop' && data.threadId) {
            try {
              const stateKey = `${data.threadId}:${userId}`
              const existing = typingState.get(stateKey)
              if (existing) {
                clearTimeout(existing.timer)
                typingState.delete(stateKey)
              }

              const [thread] = await db
                .select()
                .from(schema.messageThreads)
                .where(eq(schema.messageThreads.id, data.threadId))
                .limit(1)

              if (thread) {
                const recipientId = isAdmin ? thread.userId : thread.assignedTo
                if (recipientId) {
                  broadcastToUser(recipientId, { type: 'typing_stop', threadId: data.threadId, userId })
                } else if (!isAdmin) {
                  broadcastToAllAdmins({ type: 'typing_stop', threadId: data.threadId, userId })
                }
              }
            } catch {
              // fire-and-forget
            }
          }
        } catch {
          // ignore malformed messages
        }
      })

      socket.send(JSON.stringify({ type: 'connected', userId }))
    } catch {
      socket.close(1008, 'Invalid token')
    }
  })

  // GET /api/v1/messages/threads - get all threads for current user
  server.get('/threads', { preHandler: [requireAuth] }, async (request, reply) => {
    const payload = request.user as { id: string; role: string }
    const isAdmin = ['staff_admin', 'manager_admin', 'super_admin'].includes(payload.role)

    const threads = isAdmin
      ? await db
          .select()
          .from(schema.messageThreads)
          .orderBy(desc(schema.messageThreads.lastMessageAt))
          .limit(100)
      : await db
          .select()
          .from(schema.messageThreads)
          .where(eq(schema.messageThreads.userId, payload.id))
          .orderBy(desc(schema.messageThreads.lastMessageAt))

    if (threads.length === 0) return ok(reply, threads)

    const threadIds = threads.map(t => t.id)

    // Fetch last message preview for all threads in one query
    const lastMsgs = await db.execute(
      sql`SELECT DISTINCT ON (thread_id) thread_id, content
          FROM messages
          WHERE thread_id = ANY(${sql.raw(`ARRAY[${threadIds.map(id => `'${id}'`).join(',')}]::uuid[]`)})
          ORDER BY thread_id, created_at DESC`
    )
    const previewMap: Record<string, string> = {}
    for (const row of lastMsgs.rows as { thread_id: string; content: string }[]) {
      previewMap[row.thread_id] = row.content
    }

    // Enrich oppdate_apply threads with the opportunity title + country
    const applyThreads = threads.filter(t => t.type === 'oppdate_apply' && t.referenceId)
    let appInfoMap: Record<string, { title: string | null; country: string | null }> = {}
    if (applyThreads.length > 0) {
      const appIds = applyThreads.map(t => t.referenceId!)
      const apps = await db
        .select({
          id: schema.applications.id,
          opportunityTitle: schema.opportunities.title,
          opportunityCountry: schema.opportunities.country,
        })
        .from(schema.applications)
        .leftJoin(schema.opportunities, eq(schema.applications.opportunityId, schema.opportunities.id))
        .where(inArray(schema.applications.id, appIds))
      appInfoMap = Object.fromEntries(apps.map(a => [a.id, { title: a.opportunityTitle, country: a.opportunityCountry }]))
    }

    const enriched = threads.map(t => ({
      ...t,
      lastMessagePreview: previewMap[t.id] ?? null,
      ...(t.type === 'oppdate_apply' && t.referenceId && appInfoMap[t.referenceId]
        ? {
            opportunityTitle: appInfoMap[t.referenceId].title,
            opportunityCountry: appInfoMap[t.referenceId].country,
          }
        : {}),
    }))

    return ok(reply, enriched)
  })

  // GET /api/v1/messages/threads/:threadId - get thread with paginated messages
  server.get('/threads/:threadId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { threadId } = request.params as { threadId: string }
    const { before, limit: limitStr } = request.query as { before?: string; limit?: string }
    const payload = request.user as { id: string; role: string }
    const isAdmin = ['staff_admin', 'manager_admin', 'super_admin'].includes(payload.role)

    const pageLimit = Math.min(parseInt(limitStr ?? '50', 10) || 50, 100)

    const [thread] = await db
      .select()
      .from(schema.messageThreads)
      .where(eq(schema.messageThreads.id, threadId))
      .limit(1)

    if (!thread) return notFound(reply, 'Thread')
    if (!isAdmin && thread.userId !== payload.id) return forbidden(reply)

    // Cursor-based pagination: if `before` is provided, fetch messages created before that message
    const baseWhere = and(
      eq(schema.messages.threadId, threadId),
      isAdmin ? undefined : eq(schema.messages.isInternal, false)
    )

    let messagesQuery = db
      .select()
      .from(schema.messages)
      .where(
        before
          ? and(
              baseWhere,
              lt(schema.messages.createdAt,
                db.select({ createdAt: schema.messages.createdAt })
                  .from(schema.messages)
                  .where(eq(schema.messages.id, before))
                  .limit(1) as any
              )
            )
          : baseWhere
      )
      .orderBy(desc(schema.messages.createdAt))
      .limit(pageLimit + 1) // fetch one extra to determine if more exist

    const rawMessages = await messagesQuery
    const hasMore = rawMessages.length > pageLimit
    const messages = hasMore ? rawMessages.slice(0, pageLimit) : rawMessages

    // Mark as read
    if (!isAdmin) {
      await db
        .update(schema.messageThreads)
        .set({ unreadByUser: 0 })
        .where(eq(schema.messageThreads.id, threadId))
    } else {
      await db
        .update(schema.messageThreads)
        .set({ unreadByTeam: 0 })
        .where(eq(schema.messageThreads.id, threadId))
    }

    return ok(reply, { thread, messages: messages.reverse(), hasMore })
  })

  // POST /api/v1/messages/threads/:threadId/messages - send a message
  server.post('/threads/:threadId/messages', { preHandler: [requireAuth] }, async (request, reply) => {
    const { threadId } = request.params as { threadId: string }
    const payload = request.user as { id: string; role: string }
    const isAdmin = ['staff_admin', 'manager_admin', 'super_admin'].includes(payload.role)

    const body = sendMessageSchema.safeParse(request.body)
    if (!body.success) return badRequest(reply, body.error.errors[0].message)

    const [thread] = await db
      .select()
      .from(schema.messageThreads)
      .where(eq(schema.messageThreads.id, threadId))
      .limit(1)

    if (!thread) return notFound(reply, 'Thread')
    if (!isAdmin && thread.userId !== payload.id) return forbidden(reply)

    const senderType = isAdmin ? 'team' : 'user'

    const [message] = await db
      .insert(schema.messages)
      .values({
        threadId,
        senderId: payload.id,
        senderType,
        content: body.data.content,
        attachments: body.data.attachments,
      })
      .returning()

    await db
      .update(schema.messageThreads)
      .set({
        lastMessageAt: new Date(),
        status: isAdmin ? 'awaiting_user' : 'awaiting_team',
        ...(isAdmin && { unreadByUser: sql`${schema.messageThreads.unreadByUser} + 1` }),
        ...(!isAdmin && { unreadByTeam: sql`${schema.messageThreads.unreadByTeam} + 1` }),
        updatedAt: new Date(),
      })
      .where(eq(schema.messageThreads.id, threadId))

    // Broadcast via WebSocket
    if (isAdmin) {
      broadcastToUser(thread.userId, { type: 'new_message', threadId, message })

      const [threadUser] = await db
        .select({ name: schema.users.name, email: schema.users.email, preferences: schema.users.preferences })
        .from(schema.users)
        .where(eq(schema.users.id, thread.userId))
        .limit(1)

      const prefs = (threadUser?.preferences as Record<string, unknown>) ?? {}
      if (threadUser && prefs.email_new_message !== false) {
        const email = newMessageEmail(threadUser.name)
        email.to = threadUser.email
        await enqueueEmail(email)
      }
    } else if (thread.assignedTo) {
      broadcastToUser(thread.assignedTo, { type: 'new_message', threadId, message })
    } else {
      broadcastToAllAdmins({ type: 'new_message', threadId, message })
    }

    return created(reply, message)
  })

  // PATCH /api/v1/messages/threads/:threadId/read - update read cursor
  server.patch('/threads/:threadId/read', { preHandler: [requireAuth] }, async (request, reply) => {
    const { threadId } = request.params as { threadId: string }
    const payload = request.user as { id: string; role: string }
    const isAdmin = ['staff_admin', 'manager_admin', 'super_admin'].includes(payload.role)

    const [thread] = await db
      .select()
      .from(schema.messageThreads)
      .where(eq(schema.messageThreads.id, threadId))
      .limit(1)

    if (!thread) return notFound(reply, 'Thread')
    if (!isAdmin && thread.userId !== payload.id) return forbidden(reply)

    if (!isAdmin) {
      await db
        .update(schema.messageThreads)
        .set({ unreadByUser: 0, updatedAt: new Date() })
        .where(eq(schema.messageThreads.id, threadId))
    } else {
      await db
        .update(schema.messageThreads)
        .set({ unreadByTeam: 0, updatedAt: new Date() })
        .where(eq(schema.messageThreads.id, threadId))
    }

    return ok(reply, null, 'Marked as read.')
  })

  // GET /api/v1/messages/threads/:threadId/document-requests - fetch all doc requests for a thread
  server.get('/threads/:threadId/document-requests', { preHandler: [requireAuth] }, async (request, reply) => {
    const { threadId } = request.params as { threadId: string }
    const payload = request.user as { id: string; role: string }
    const isAdmin = ['staff_admin', 'manager_admin', 'super_admin'].includes(payload.role)

    const [thread] = await db
      .select()
      .from(schema.messageThreads)
      .where(eq(schema.messageThreads.id, threadId))
      .limit(1)

    if (!thread) return notFound(reply, 'Thread')
    if (!isAdmin && thread.userId !== payload.id) return forbidden(reply)

    const requests = await db
      .select()
      .from(schema.documentRequests)
      .where(eq(schema.documentRequests.threadId, threadId))
      .orderBy(schema.documentRequests.createdAt)

    if (requests.length === 0) return ok(reply, [])

    const requestIds = requests.map(r => r.id)
    const itemRows = await db
      .select({
        id: schema.documentRequestItems.id,
        requestId: schema.documentRequestItems.requestId,
        label: schema.documentRequestItems.label,
        documentId: schema.documentRequestItems.documentId,
        status: schema.documentRequestItems.status,
        updatedAt: schema.documentRequestItems.updatedAt,
        createdAt: schema.documentRequestItems.createdAt,
        documentFileUrl: schema.documents.fileUrl,
        documentName: schema.documents.name,
      })
      .from(schema.documentRequestItems)
      .leftJoin(schema.documents, eq(schema.documentRequestItems.documentId, schema.documents.id))
      .where(inArray(schema.documentRequestItems.requestId, requestIds))
      .orderBy(schema.documentRequestItems.createdAt)

    const itemsByRequest: Record<string, typeof itemRows> = {}
    for (const item of itemRows) {
      if (!itemsByRequest[item.requestId]) itemsByRequest[item.requestId] = []
      itemsByRequest[item.requestId].push(item)
    }

    return ok(reply, requests.map(r => ({ ...r, items: itemsByRequest[r.id] ?? [] })))
  })

  // POST /api/v1/messages/threads/:threadId/document-requests - admin creates a document request
  server.post(
    '/threads/:threadId/document-requests',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { threadId } = request.params as { threadId: string }
      const payload = request.user as { id: string }

      const body = z.object({
        items: z.array(z.string().min(1).max(200)).min(1).max(20),
      }).safeParse(request.body)
      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const [thread] = await db
        .select()
        .from(schema.messageThreads)
        .where(eq(schema.messageThreads.id, threadId))
        .limit(1)

      if (!thread) return notFound(reply, 'Thread')

      // Insert request
      const [docRequest] = await db
        .insert(schema.documentRequests)
        .values({ threadId, createdBy: payload.id })
        .returning()

      // Insert items
      const insertedItems = await db
        .insert(schema.documentRequestItems)
        .values(body.data.items.map(label => ({ requestId: docRequest.id, label })))
        .returning()

      // Insert a message referencing this request
      const [message] = await db
        .insert(schema.messages)
        .values({
          threadId,
          senderId: payload.id,
          senderType: 'team',
          content: JSON.stringify({ type: 'document_request', requestId: docRequest.id }),
        })
        .returning()

      // Update thread metadata
      await db
        .update(schema.messageThreads)
        .set({
          lastMessageAt: new Date(),
          status: 'awaiting_user',
          unreadByUser: sql`${schema.messageThreads.unreadByUser} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.messageThreads.id, threadId))

      // Broadcast to user
      broadcastToUser(thread.userId, {
        type: 'new_message',
        threadId,
        message,
      })

      return created(reply, { request: docRequest, items: insertedItems, message })
    }
  )

  // POST /api/v1/messages/threads - create a thread (system use)
  server.post('/threads', { preHandler: [requireAuth] }, async (request, reply) => {
    const payload = request.user as { id: string }
    const body = request.body as {
      type: 'oppdate_apply' | 'mentorship'
      referenceId: string
    }

    const [thread] = await db
      .insert(schema.messageThreads)
      .values({
        userId: payload.id,
        type: body.type,
        referenceId: body.referenceId,
        status: 'active',
      })
      .returning()

    return created(reply, thread)
  })

  // PATCH /api/v1/messages/threads/:threadId/assign - admin assigns thread
  server.patch(
    '/threads/:threadId/assign',
    { preHandler: [requireRole('manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { threadId } = request.params as { threadId: string }
      const { adminId } = request.body as { adminId: string }

      const [thread] = await db
        .update(schema.messageThreads)
        .set({ assignedTo: adminId, updatedAt: new Date() })
        .where(eq(schema.messageThreads.id, threadId))
        .returning()

      if (!thread) return notFound(reply, 'Thread')

      return ok(reply, thread, 'Thread assigned.')
    }
  )

  // PATCH /api/v1/messages/threads/:threadId/status - admin updates thread status
  server.patch(
    '/threads/:threadId/status',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { threadId } = request.params as { threadId: string }
      const { status } = request.body as { status: string }

      const [thread] = await db
        .update(schema.messageThreads)
        .set({ status: status as any, updatedAt: new Date() })
        .where(eq(schema.messageThreads.id, threadId))
        .returning()

      if (!thread) return notFound(reply, 'Thread')

      return ok(reply, thread, `Thread marked as ${status}.`)
    }
  )
}
