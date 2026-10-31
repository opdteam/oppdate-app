import { FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import rawBody from 'fastify-raw-body'
import websocket from '@fastify/websocket'
import { getDb } from '../db'
import { sql } from 'drizzle-orm'
import IORedis from 'ioredis'

export async function registerPlugins(server: FastifyInstance) {
  // Cookie parsing (must register before CORS/JWT)
  await server.register(cookie)

  // Security headers
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })

  // CORS
  await server.register(cors, {
    origin: process.env.NODE_ENV === 'production'
      ? [
          process.env.WEB_URL || 'https://oppdate.com',
          'https://oppdate.com',
          'https://www.oppdate.com',
        ]
      : (origin, cb) => {
          // In dev, allow localhost and any LAN IP (192.168.x.x, 10.x.x.x, 172.x.x.x)
          if (!origin || /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)) {
            cb(null, true)
          } else {
            cb(new Error('Not allowed by CORS'), false)
          }
        },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  // JWT authentication - reads from Authorization header first, falls back to cookie
  await server.register(jwt, {
    secret: process.env.JWT_SECRET!,
    sign: { expiresIn: process.env.JWT_EXPIRES_IN || '120m' },
    cookie: {
      cookieName: 'oppdate_token',
      signed: false,
    },
  })

  // Rate limiting
  await server.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
    timeWindow: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    errorResponseBuilder: () => ({
      success: false,
      error: 'Too many requests. Please slow down.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    }),
  })

  // Raw body support (needed for Stripe/Paystack webhook signature verification)
  await server.register(rawBody, {
    field: 'rawBody',
    global: false, // only attach rawBody where routes opt in via config.rawBody
    encoding: 'utf8',
    runFirst: true,
  })

  // File uploads (multipart)
  await server.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max per file
      files: 5,                    // max 5 files per request
    },
  })

  // WebSocket support (for real-time messaging)
  await server.register(websocket)

  // Health check - registered as a plugin so it bypasses rate limiting
  server.get('/health', async (_request, reply) => {
    const checks: Record<string, string> = {}

    // DB check
    try {
      const database = await getDb()
      await database.execute(sql`SELECT 1`)
      checks.database = 'ok'
    } catch {
      checks.database = 'error'
    }

    // Redis check
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    try {
      const redis = new IORedis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 2000, lazyConnect: true })
      await redis.connect()
      await redis.ping()
      checks.redis = 'ok'
      redis.disconnect()
    } catch {
      checks.redis = 'error'
    }

    const allHealthy = Object.values(checks).every((v) => v === 'ok')

    return reply.status(allHealthy ? 200 : 503).send({
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      checks,
    })
  })
}
