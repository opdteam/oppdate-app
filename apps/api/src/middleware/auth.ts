import { FastifyRequest, FastifyReply } from 'fastify'
import { db, schema } from '../db'
import { eq } from 'drizzle-orm'

// Attach to any route that requires authentication.
// Tries Authorization header and oppdate_token cookie (via jwtVerify),
// then falls back to oppdate_admin_token cookie for admin sessions.
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    // Fall back to admin cookie if present
    const adminToken = request.cookies?.['oppdate_admin_token']
    if (adminToken) {
      try {
        const decoded = request.server.jwt.verify(adminToken)
        request.user = decoded
        return
      } catch {
        // invalid token - fall through to 401
      }
    }
    return reply.status(401).send({
      success: false,
      error: 'Unauthorised. Please log in.',
      code: 'UNAUTHORISED',
      statusCode: 401,
    })
  }
}

// Require specific roles
export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply)

    const payload = request.user as { id: string; role: string }

    if (!roles.includes(payload.role)) {
      return reply.status(403).send({
        success: false,
        error: 'You do not have permission to access this resource.',
        code: 'FORBIDDEN',
        statusCode: 403,
      })
    }
  }
}

// Require active Premium subscription (isPremium = true and premiumUntil in the future)
export async function requirePremium(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply)

  const payload = request.user as { id: string }
  const now = new Date()

  const [user] = await db
    .select({ isPremium: schema.users.isPremium, premiumUntil: schema.users.premiumUntil })
    .from(schema.users)
    .where(eq(schema.users.id, payload.id))
    .limit(1)

  if (!user || !user.isPremium || (user.premiumUntil && user.premiumUntil < now)) {
    return reply.status(403).send({
      success: false,
      error: 'This feature requires an active Premium subscription.',
      code: 'PREMIUM_REQUIRED',
      statusCode: 403,
    })
  }
}

// Helpers
export const isAdmin = (role: string) =>
  ['staff_admin', 'manager_admin', 'super_admin'].includes(role)

export const isSuperAdmin = (role: string) => role === 'super_admin'
