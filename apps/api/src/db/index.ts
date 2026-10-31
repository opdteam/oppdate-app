import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

const isNeon = process.env.DATABASE_URL.includes('neon.tech')

let _pool: import('pg').Pool | null = null

async function createDb() {
  if (isNeon) {
    // Production: Neon serverless HTTP driver
    const { neon } = await import('@neondatabase/serverless')
    const { drizzle } = await import('drizzle-orm/neon-http')
    const sql = neon(process.env.DATABASE_URL!)
    return drizzle(sql, { schema, logger: false })
  } else {
    // Development: standard node-postgres driver (local Docker)
    const { Pool } = await import('pg')
    const { drizzle } = await import('drizzle-orm/node-postgres')
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
    return drizzle(_pool, {
      schema,
      logger: process.env.NODE_ENV === 'development',
    })
  }
}

// Singleton - initialised once at startup, reused across all requests
let _db: Awaited<ReturnType<typeof createDb>> | null = null

export async function getDb() {
  if (!_db) _db = await createDb()
  return _db
}

export let db: Awaited<ReturnType<typeof createDb>>

export async function initDb() {
  db = await getDb()
  return db
}

export async function closeDb() {
  if (_pool) await _pool.end()
}

export type Database = typeof db
export { schema }
