import 'dotenv/config'
import path from 'path'
import fs from 'fs'

const MIGRATIONS_FOLDER = path.join(__dirname, 'migrations')

// Reads all *.sql files in the migrations folder, sorted by filename (which is
// the natural execution order). Runs each one that hasn't been applied yet,
// tracking state in a simple `_migrations` table that we own -- no Drizzle
// snapshot machinery required.

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required')
  }

  const isNeon = process.env.DATABASE_URL.includes('neon.tech')
  console.log('Running database migrations...')
  console.log(`Driver: ${isNeon ? 'Neon HTTP (production)' : 'pg Pool (local)'}`)

  const files = fs
    .readdirSync(MIGRATIONS_FOLDER)
    .filter(f => f.endsWith('.sql'))
    .sort()

  if (isNeon) {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.DATABASE_URL!)
    await applyNeon(sql, files)
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
// pg (local Docker)
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
// Neon serverless HTTP (production)
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function applyNeon(sql: any, files: string[]) {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  for (const file of files) {
    const existing = await sql`SELECT 1 FROM _migrations WHERE name = ${file}`
    if (existing.length > 0) {
      console.log(`  skip  ${file}`)
      continue
    }

    const ddl = readSql(file)
    console.log(`  apply ${file}`)
    // Neon HTTP driver does not support multi-statement transactions in a
    // single call, so we split on the Drizzle breakpoint marker.
    const statements = ddl
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(Boolean)

    for (const stmt of statements) {
      await sql.unsafe(stmt)
    }
    await sql`INSERT INTO _migrations (name) VALUES (${file})`
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readSql(file: string): string {
  const raw = fs.readFileSync(path.join(MIGRATIONS_FOLDER, file), 'utf8')
  // Strip the Drizzle breakpoint comment lines so pg doesn't choke on them
  return raw.replace(/^--> statement-breakpoint\s*$/gm, '')
}

runMigrations().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
