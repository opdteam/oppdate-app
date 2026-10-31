import 'dotenv/config'
import * as Sentry from '@sentry/node'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  })
}

import Fastify from 'fastify'
import { registerPlugins } from './plugins'
import { registerRoutes } from './routes'
import { initDb, closeDb } from './db'
import { startWorkers, stopWorkers } from './jobs/workers'
import { closeQueues, registerScheduledJobs } from './jobs/queue'

// Fail fast if required env vars are missing
const REQUIRED_ENV_VARS: Array<{ key: string; description: string }> = [
  { key: 'DATABASE_URL',   description: 'PostgreSQL connection string' },
  { key: 'JWT_SECRET',     description: 'JWT signing secret (min 32 chars)' },
  { key: 'JWT_REFRESH_SECRET', description: 'JWT refresh token secret' },
  { key: 'ENCRYPTION_KEY', description: '64-char hex key for AES-256 encryption' },
]

const missingVars = REQUIRED_ENV_VARS.filter(v => !process.env[v.key])
if (missingVars.length > 0) {
  console.error('\n[startup] Missing required environment variables:')
  missingVars.forEach(v => console.error(`  - ${v.key}: ${v.description}`))
  console.error('\nAdd the missing variables to apps/api/.env and restart.\n')
  process.exit(1)
}

// Warn about optional-but-important vars
const OPTIONAL_WARN_VARS: Array<{ key: string; feature: string }> = [
  { key: 'ANTHROPIC_API_KEY',     feature: 'AI Guide and eligibility assessment' },
  { key: 'RESEND_API_KEY',        feature: 'transactional email' },
  { key: 'STRIPE_SECRET_KEY',     feature: 'Stripe payments' },
  { key: 'PAYSTACK_SECRET_KEY',   feature: 'Paystack payments' },
  { key: 'R2_ACCOUNT_ID',         feature: 'file uploads (Cloudflare R2)' },
  { key: 'REDIS_URL',             feature: 'background jobs and queues' },
  { key: 'GOOGLE_CLIENT_ID',      feature: 'Google OAuth login' },
]

const missingOptional = OPTIONAL_WARN_VARS.filter(v => !process.env[v.key])
if (missingOptional.length > 0) {
  console.warn('\n[startup] The following optional features are not configured:')
  missingOptional.forEach(v => console.warn(`  - ${v.key} (${v.feature})`))
  console.warn('  These features will be disabled or return errors at runtime.\n')
}

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
  trustProxy: true,
  ajv: {
    customOptions: {
      removeAdditional: 'all',
      coerceTypes: true,
      useDefaults: true,
    },
  },
})

async function start() {
  try {
    // Initialise database connection first
    const dbType = process.env.DATABASE_URL?.includes('neon.tech') ? 'Neon (production)' : 'Local PostgreSQL (development)'
    server.log.info(`Connecting to database: ${dbType}`)
    await initDb()
    server.log.info('Database connected successfully')

    await registerPlugins(server)
    await registerRoutes(server)

    const port = Number(process.env.PORT) || 4000
    const host = process.env.HOST || '0.0.0.0'

    await server.listen({ port, host })
    server.log.info(`OppDate API running on ${host}:${port}`)
    server.log.info(`Environment: ${process.env.NODE_ENV || 'development'}`)

    // Start background job workers (BullMQ + Redis)
    if (process.env.REDIS_URL || process.env.NODE_ENV !== 'test') {
      startWorkers()
      await registerScheduledJobs()
      server.log.info('BullMQ workers and scheduled jobs started')
    }
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

let isShuttingDown = false
const shutdown = async (signal: string) => {
  if (isShuttingDown) return
  isShuttingDown = true
  console.log(`Received ${signal}, shutting down gracefully...`)
  try { await stopWorkers() } catch {}
  try { await closeQueues() } catch {}
  try { await server.close() } catch {}
  try { await closeDb() } catch {}
  console.log('Shutdown complete')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGBREAK', () => shutdown('SIGBREAK'))

start()
