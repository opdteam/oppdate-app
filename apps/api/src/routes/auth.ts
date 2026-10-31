import crypto, { randomUUID } from 'crypto'
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import argon2 from 'argon2'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { db, schema } from '../db'
import { eq, and, gt, asc } from 'drizzle-orm'
import { ok, created, badRequest, unauthorised, conflict, notFound } from '../utils/response'
import { setAuthCookies, clearAuthCookies } from '../utils/cookies'
import { requireAuth } from '../middleware/auth'
import { enqueueEmail } from '../jobs/queue'
import { securityAlertEmail } from '../utils/email'
import { parseExpiryToMs } from '../utils/time'

const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const AVATAR_MAX_BYTES = 2 * 1024 * 1024 // 2 MB

function getR2Client(): S3Client | null {
  const endpoint = process.env.R2_ENDPOINT
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!endpoint || !accessKeyId || !secretAccessKey) return null
  return new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId, secretAccessKey } })
}

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'oppdate'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const refreshSchema = z.object({
  refreshToken: z.string(),
})

const updateMeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  avatarUrl: z.string().url('Invalid URL').optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(150).optional(),
  fieldOfStudy: z.string().max(150).optional(),
  educationLevel: z.string().max(100).optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

const googleSchema = z.object({
  accessToken: z.string(),
})

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

async function createRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(48).toString('hex')
  const idleMs = parseExpiryToMs(process.env.SESSION_IDLE_TIMEOUT, 60 * 60 * 1000) // default 1h
  const expiresAt = new Date(Date.now() + idleMs)

  await db.insert(schema.refreshTokens).values({ userId, token, expiresAt })
  return token
}

async function sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
  const expiry = process.env.PASSWORD_RESET_EXPIRES_IN || '15m'
  await enqueueEmail({
    to: email,
    subject: 'Reset your password',
    html: `<p>Use the link below to reset your password. It expires in ${expiry}.</p><p><a href="${resetLink}">${resetLink}</a></p>`,
  })
}

export async function authRoutes(server: FastifyInstance) {
  const strictRateLimit = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }
  const forgotRateLimit = { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }

  // POST /api/v1/auth/register
  server.post('/register', strictRateLimit, async (request, reply) => {
    const body = registerSchema.safeParse(request.body)
    if (!body.success) return badRequest(reply, body.error.errors[0].message)

    const { email, password, name } = body.data

    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1)

    if (existing.length > 0) {
      return conflict(reply, 'An account with this email already exists.')
    }

    const passwordHash = await argon2.hash(password, {
      memoryCost: process.env.NODE_ENV === 'production' ? 65536 : 8192,
      timeCost: process.env.NODE_ENV === 'production' ? 3 : 2,
      parallelism: 1,
    })

    const rows = await db
      .insert(schema.users)
      .values({
        email: email.toLowerCase(),
        name,
        passwordHash,
        role: 'user',
      })
      .returning()

    const inserted = rows[0]
    const user = {
      id: inserted.id,
      email: inserted.email,
      name: inserted.name,
      role: inserted.role,
      createdAt: inserted.createdAt,
    }

    const accessToken = server.jwt.sign({ id: user.id, email: user.email, role: user.role })
    const refreshToken = await createRefreshToken(user.id)

    setAuthCookies(reply, accessToken, refreshToken)

    return created(reply, { user, accessToken, refreshToken }, 'Account created successfully.')
  })

  // POST /api/v1/auth/login
  server.post('/login', strictRateLimit, async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) return badRequest(reply, body.error.errors[0].message)

    const { email, password } = body.data

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1)

    if (!user || !user.passwordHash) {
      return unauthorised(reply, 'Invalid email or password.')
    }

    const validPassword = await argon2.verify(user.passwordHash, password)
    if (!validPassword) {
      return unauthorised(reply, 'Invalid email or password.')
    }

    if (['staff_admin', 'manager_admin', 'super_admin'].includes(user.role)) {
      return unauthorised(reply, 'Invalid email or password.')
    }

    if (user.suspendedAt) {
      return unauthorised(reply, 'Your account has been suspended. Contact support at support@oppdate.com')
    }

    await db
      .update(schema.users)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.users.id, user.id))

    const accessToken = server.jwt.sign({ id: user.id, email: user.email, role: user.role })
    const refreshToken = await createRefreshToken(user.id)

    setAuthCookies(reply, accessToken, refreshToken)

    return ok(
      reply,
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
          isPremium: user.isPremium,
        },
        accessToken,
        refreshToken,
      },
      'Logged in successfully.'
    )
  })

  // POST /api/v1/auth/refresh
  server.post('/refresh', async (request, reply) => {
    // Accept refresh token from body or httpOnly cookie
    const body = refreshSchema.safeParse(request.body)
    const refreshToken = body.success
      ? body.data.refreshToken
      : request.cookies?.oppdate_refresh

    if (!refreshToken) return badRequest(reply, 'refreshToken is required.')
    const now = new Date()

    const [stored] = await db
      .select()
      .from(schema.refreshTokens)
      .where(
        and(
          eq(schema.refreshTokens.token, refreshToken),
          gt(schema.refreshTokens.expiresAt, now)
        )
      )
      .limit(1)

    if (!stored) return unauthorised(reply, 'Invalid or expired refresh token.')

    const [user] = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        role: schema.users.role,
        suspendedAt: schema.users.suspendedAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, stored.userId))
      .limit(1)

    if (!user || user.suspendedAt) return unauthorised(reply, 'Account is not active.')

    // Rotate: delete old, issue new
    await db.delete(schema.refreshTokens).where(eq(schema.refreshTokens.id, stored.id))
    const newRefreshToken = await createRefreshToken(user.id)

    const accessToken = server.jwt.sign({ id: user.id, email: user.email, role: user.role })

    setAuthCookies(reply, accessToken, newRefreshToken)

    return ok(reply, { accessToken, refreshToken: newRefreshToken })
  })

  // POST /api/v1/auth/logout
  server.post('/logout', { preHandler: [requireAuth] }, async (request, reply) => {
    // Accept refresh token from body or cookie
    const body = refreshSchema.safeParse(request.body)
    const refreshToken = body.success
      ? body.data.refreshToken
      : request.cookies?.oppdate_refresh

    if (refreshToken) {
      await db
        .delete(schema.refreshTokens)
        .where(eq(schema.refreshTokens.token, refreshToken))
    }

    clearAuthCookies(reply)

    return ok(reply, null, 'Logged out successfully.')
  })

  // GET /api/v1/auth/me
  server.get('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const payload = request.user as { id: string }

    const [user] = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        role: schema.users.role,
        avatarUrl: schema.users.avatarUrl,
        isEmailVerified: schema.users.isEmailVerified,
        isPremium: schema.users.isPremium,
        premiumUntil: schema.users.premiumUntil,
        preferences: schema.users.preferences,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, payload.id))
      .limit(1)

    if (!user) return unauthorised(reply)

    return ok(reply, user)
  })

  // PATCH /api/v1/auth/me
  server.patch('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = updateMeSchema.safeParse(request.body)
    if (!body.success) return badRequest(reply, body.error.errors[0].message)

    const payload = request.user as { id: string }

    // Fetch current preferences so we can merge bio/location without wiping other fields
    const [current] = await db
      .select({ preferences: schema.users.preferences })
      .from(schema.users)
      .where(eq(schema.users.id, payload.id))
      .limit(1)

    const existingPrefs = (current?.preferences as Record<string, unknown>) ?? {}
    const prefsPatch: Record<string, unknown> = { ...existingPrefs }
    if (body.data.bio !== undefined) prefsPatch.bio = body.data.bio
    if (body.data.location !== undefined) prefsPatch.location = body.data.location
    if (body.data.fieldOfStudy !== undefined) prefsPatch.fieldOfStudy = body.data.fieldOfStudy
    if (body.data.educationLevel !== undefined) prefsPatch.educationLevel = body.data.educationLevel

    const prefsChanged = body.data.bio !== undefined || body.data.location !== undefined ||
      body.data.fieldOfStudy !== undefined || body.data.educationLevel !== undefined

    const rows = await db
      .update(schema.users)
      .set({
        ...(body.data.name !== undefined && { name: body.data.name }),
        ...(body.data.avatarUrl !== undefined && { avatarUrl: body.data.avatarUrl }),
        ...(prefsChanged && { preferences: prefsPatch }),
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, payload.id))
      .returning()

    if (!rows[0]) return notFound(reply, 'User')

    const u = rows[0]
    return ok(
      reply,
      { id: u.id, email: u.email, name: u.name, role: u.role, avatarUrl: u.avatarUrl, preferences: u.preferences },
      'Profile updated.'
    )
  })

  // PATCH /api/v1/auth/me/preferences -- save onboarding / personalisation answers
  server.patch('/me/preferences', { preHandler: [requireAuth] }, async (request, reply) => {
    const payload = request.user as { id: string }

    const schema_v = z.object({
      role: z.number().int().min(0).max(10).nullable().optional(),
      interests: z.array(z.number().int()).optional(),
      goal: z.number().int().min(0).max(10).nullable().optional(),
      country: z.string().max(100).optional(),
      nationality: z.string().max(100).optional(),
      fieldOfStudy: z.string().max(150).optional(),
      educationLevel: z.string().max(100).optional(),
      skipped: z.boolean().optional(),
      // Notification toggles
      email_app_status: z.boolean().optional(),
      email_new_message: z.boolean().optional(),
      email_deadline: z.boolean().optional(),
      email_matching: z.boolean().optional(),
      email_security: z.boolean().optional(),
      inapp_pipeline: z.boolean().optional(),
      inapp_messages: z.boolean().optional(),
      inapp_reminders: z.boolean().optional(),
      inapp_announcements: z.boolean().optional(),
    })

    const body = schema_v.safeParse(request.body)
    if (!body.success) return badRequest(reply, body.error.errors[0].message)

    // Merge with existing preferences to avoid wiping bio/location or other fields
    const [current] = await db
      .select({ preferences: schema.users.preferences })
      .from(schema.users)
      .where(eq(schema.users.id, payload.id))
      .limit(1)

    const merged = { ...((current?.preferences as Record<string, unknown>) ?? {}), ...body.data }

    const rows = await db
      .update(schema.users)
      .set({ preferences: merged as any, updatedAt: new Date() })
      .where(eq(schema.users.id, payload.id))
      .returning()

    if (!rows[0]) return notFound(reply, 'User')

    return ok(reply, rows[0], 'Preferences saved.')
  })

  // POST /api/v1/auth/me/avatar -- upload profile picture
  server.post('/me/avatar', { preHandler: [requireAuth] }, async (request, reply) => {
    const payload = request.user as { id: string }

    const data = await request.file()
    if (!data) return badRequest(reply, 'No file provided.')

    if (!AVATAR_ALLOWED_TYPES.includes(data.mimetype)) {
      return badRequest(reply, 'Only JPEG, PNG, and WebP images are allowed.')
    }

    const chunks: Buffer[] = []
    for await (const chunk of data.file) { chunks.push(chunk) }
    const buffer = Buffer.concat(chunks)

    if (buffer.length > AVATAR_MAX_BYTES) {
      return badRequest(reply, 'Image exceeds the 2MB limit.')
    }

    const r2 = getR2Client()
    if (!r2) return badRequest(reply, 'File storage is not configured. Contact support.')

    const ext = data.mimetype === 'image/png' ? 'png' : data.mimetype === 'image/webp' ? 'webp' : 'jpg'
    const fileKey = `avatars/${payload.id}/${randomUUID()}.${ext}`

    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: fileKey,
      Body: buffer,
      ContentType: data.mimetype,
      ContentLength: buffer.length,
    }))

    const avatarUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL}/${fileKey}`
      : `${process.env.R2_ENDPOINT}/${R2_BUCKET}/${fileKey}`

    const rows = await db
      .update(schema.users)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(eq(schema.users.id, payload.id))
      .returning()

    if (!rows[0]) return notFound(reply, 'User')

    return ok(reply, { avatarUrl }, 'Avatar updated.')
  })

  // POST /api/v1/auth/me/password -- change password (requires current password)
  server.post('/me/password', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = changePasswordSchema.safeParse(request.body)
    if (!body.success) return badRequest(reply, body.error.errors[0].message)

    const payload = request.user as { id: string }

    const [user] = await db
      .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, passwordHash: schema.users.passwordHash, preferences: schema.users.preferences })
      .from(schema.users)
      .where(eq(schema.users.id, payload.id))
      .limit(1)

    if (!user) return notFound(reply, 'User')

    if (!user.passwordHash) {
      return badRequest(reply, 'Your account uses Google sign-in. Password cannot be changed here.')
    }

    const valid = await argon2.verify(user.passwordHash, body.data.currentPassword)
    if (!valid) return badRequest(reply, 'Current password is incorrect.')

    const newHash = await argon2.hash(body.data.newPassword, {
      memoryCost: process.env.NODE_ENV === 'production' ? 65536 : 8192,
      timeCost: process.env.NODE_ENV === 'production' ? 3 : 2,
      parallelism: 1,
    })

    await db
      .update(schema.users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(schema.users.id, payload.id))

    const prefs = (user.preferences as Record<string, unknown>) ?? {}
    if (prefs.email_security !== false) {
      const email = securityAlertEmail(user.name, 'Your password was changed')
      email.to = user.email
      await enqueueEmail(email)
    }

    return ok(reply, null, 'Password updated successfully.')
  })

  // DELETE /api/v1/auth/me -- permanently delete the caller's account and all associated data
  server.delete('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const payload = request.user as { id: string }

    const [user] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.id, payload.id))
      .limit(1)

    if (!user) return notFound(reply, 'User')

    await db.delete(schema.users).where(eq(schema.users.id, payload.id))

    return ok(reply, null, 'Account deleted.')
  })

  // POST /api/v1/auth/google
  server.post('/google', async (request, reply) => {
    const body = googleSchema.safeParse(request.body)
    if (!body.success) return badRequest(reply, 'accessToken is required.')

    const { accessToken: googleAccessToken } = body.data

    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
    })
    if (!res.ok) return unauthorised(reply, 'Invalid Google token.')

    const tokenInfo = (await res.json()) as {
      sub: string
      email: string
      name: string
      picture?: string
    }

    let [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, tokenInfo.email.toLowerCase()))
      .limit(1)

    let isNew = false
    if (!user) {
      isNew = true
      const newRows = await db
        .insert(schema.users)
        .values({
          email: tokenInfo.email.toLowerCase(),
          name: tokenInfo.name,
          googleId: tokenInfo.sub,
          avatarUrl: tokenInfo.picture ?? null,
          isEmailVerified: true,
          role: 'user',
        })
        .returning()
      user = newRows[0]
    } else {
      await db
        .update(schema.users)
        .set({
          ...(!user.googleId && { googleId: tokenInfo.sub, isEmailVerified: true }),
          lastLoginAt: new Date(),
        })
        .where(eq(schema.users.id, user.id))
    }

    const accessToken = server.jwt.sign({ id: user.id, email: user.email, role: user.role })
    const refreshToken = await createRefreshToken(user.id)

    setAuthCookies(reply, accessToken, refreshToken)

    return ok(
      reply,
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
        accessToken,
        refreshToken,
        isNew,
      },
      'Logged in with Google.'
    )
  })

  // POST /api/v1/auth/forgot-password
  server.post('/forgot-password', forgotRateLimit, async (request, reply) => {
    const body = forgotPasswordSchema.safeParse(request.body)
    if (!body.success) return badRequest(reply, body.error.errors[0].message)

    const { email } = body.data
    const genericResponse = 'If an account exists with that email, a reset link has been sent.'

    const [user] = await db
      .select({ id: schema.users.id, passwordHash: schema.users.passwordHash })
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1)

    if (!user || !user.passwordHash) {
      return ok(reply, null, genericResponse)
    }

    const resetToken = server.jwt.sign(
      { type: 'password_reset', userId: user.id },
      { expiresIn: process.env.PASSWORD_RESET_EXPIRES_IN || '15m' }
    )

    const webUrl = process.env.WEB_URL || 'http://localhost:3000'
    const resetLink = `${webUrl}/reset-password?token=${resetToken}`

    await sendPasswordResetEmail(email, resetLink)

    return ok(reply, null, genericResponse)
  })

  // POST /api/v1/auth/reset-password
  server.post('/reset-password', forgotRateLimit, async (request, reply) => {
    const body = resetPasswordSchema.safeParse(request.body)
    if (!body.success) return badRequest(reply, body.error.errors[0].message)

    const { token, newPassword } = body.data

    let payload: { type: string; userId: string }
    try {
      payload = server.jwt.verify(token) as { type: string; userId: string }
    } catch {
      return badRequest(reply, 'Invalid or expired reset token.')
    }

    if (payload.type !== 'password_reset') {
      return badRequest(reply, 'Invalid reset token.')
    }

    const passwordHash = await argon2.hash(newPassword, {
      memoryCost: process.env.NODE_ENV === 'production' ? 65536 : 8192,
      timeCost: process.env.NODE_ENV === 'production' ? 3 : 2,
      parallelism: 1,
    })

    const rows = await db
      .update(schema.users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(schema.users.id, payload.userId))
      .returning()

    if (!rows[0]) return notFound(reply, 'User')

    // Invalidate all refresh tokens for this user
    await db.delete(schema.refreshTokens).where(eq(schema.refreshTokens.userId, payload.userId))

    return ok(reply, null, 'Password reset successfully. Please log in again.')
  })

  // GET /auth/avatar-presets -- public; returns all presets ordered by createdAt
  server.get('/avatar-presets', async (_request, reply) => {
    const presets = await db
      .select()
      .from(schema.avatarPresets)
      .orderBy(asc(schema.avatarPresets.createdAt))
    return ok(reply, presets)
  })
}
