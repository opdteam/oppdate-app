import 'dotenv/config'
import path from 'path'
import fs from 'fs'

const MIGRATIONS_FOLDER = path.join(__dirname, 'migrations')

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required')
  }

  const isNeon = process.env.DATABASE_URL.includes('neon.tech')
  console.log('Running database migrations...')
  console.log(`Driver: ${isNeon ? 'Neon WebSocket Pool (production)' : 'pg Pool (local)'}`)

  const files = fs
    .readdirSync(MIGRATIONS_FOLDER)
    .filter(f => f.endsWith('.sql'))
    .sort()

  if (isNeon) {
    const { Pool, neonConfig } = await import('@neondatabase/serverless')
    const { WebSocket } = await import('ws')
    neonConfig.webSocketConstructor = WebSocket
    const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
    const client = await pool.connect()
    try {
      await applyPg(client as any, files)
    } finally {
      (client as any).release()
      await pool.end()
    }
  } else {
    const { Pool } = await import('pg')
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const client = await pool.connect()
    try {
      await applyPg(client, files)
    } finally {
      client.release()
      await pool.end()
    }
  }

  console.log('Migrations completed successfully.')
  process.exit(0)
}

// ---------------------------------------------------------------------------
// pg-compatible client (works for both pg and @neondatabase/serverless Pool)
// ---------------------------------------------------------------------------
async function applyPg(client: import('pg').PoolClient, files: string[]) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  for (const file of files) {
    const { rows } = await client.query(
      'SELECT 1 FROM _migrations WHERE name = $1',
      [file]
    )
    if (rows.length > 0) {
      console.log(`  skip  ${file}`)
      continue
    }

    const sql = readSql(file)
    console.log(`  apply ${file}`)
    await client.query('BEGIN')
    try {
      await client.query(sql)
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file])
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readSql(file: string): string {
  const raw = fs.readFileSync(path.join(MIGRATIONS_FOLDER, file), 'utf8')
  return raw.replace(/^--> statement-breakpoint\s*$/gm, '')
}

runMigrations().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
