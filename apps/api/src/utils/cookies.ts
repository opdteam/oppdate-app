import { FastifyReply } from 'fastify'
import { parseExpiryToSeconds } from './time'

const isProd = process.env.NODE_ENV === 'production'

// Access token cookie maxAge matches JWT_EXPIRES_IN exactly (default 15 min = 900s)
const ACCESS_TOKEN_MAX_AGE = parseExpiryToSeconds(process.env.JWT_EXPIRES_IN, 15 * 60)

export function setAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
  reply.setCookie('oppdate_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE,
  })

  reply.setCookie('oppdate_refresh', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: 30 * 24 * 60 * 60, // 30 days - safety ceiling; real gate is DB expiresAt
  })
}

export function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie('oppdate_token', { path: '/' })
  reply.clearCookie('oppdate_refresh', { path: '/api/v1/auth' })
}

export function setAdminAuthCookies(reply: FastifyReply, accessToken: string) {
  reply.setCookie('oppdate_admin_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60, // 8 hours - matches JWT expiry
  })
}

export function clearAdminAuthCookies(reply: FastifyReply) {
  reply.clearCookie('oppdate_admin_token', { path: '/' })
}
