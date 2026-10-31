import 'dotenv/config'
import argon2 from 'argon2'
import { eq } from 'drizzle-orm'

// Default credentials - override with env vars before running
const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    || 'admin@oppdate.com'
const ADMIN_NAME     = process.env.SEED_ADMIN_NAME     || 'Super Admin'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'OppDate@Admin1'
const ADMIN_ROLE     = (process.env.SEED_ADMIN_ROLE    || 'super_admin') as
  'super_admin' | 'manager_admin' | 'staff_admin'

async function seedAdmin() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required. Copy apps/api/.env and set it.')
  }

  // Reuse the same driver selection logic as migrate.ts
  const isNeon = process.env.DATABASE_URL.includes('neon.tech')

  let db: Awaited<ReturnType<typeof import('drizzle-orm/node-postgres').drizzle>>
  let pool: import('pg').Pool | null = null

  if (isNeon) {
    const { neon }    = await import('@neondatabase/serverless')
    const { drizzle } = await import('drizzle-orm/neon-http')
    const schema      = await import('./schema')
    db = drizzle(neon(process.env.DATABASE_URL!), { schema }) as any
  } else {
    const { Pool }    = await import('pg')
    const { drizzle } = await import('drizzle-orm/node-postgres')
    const schema      = await import('./schema')
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
    db   = drizzle(pool, { schema }) as any
  }

  const schema = await import('./schema')

  // Check if an admin with this email already exists
  const existing = await (db as any)
    .select({ id: schema.users.id, role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.email, ADMIN_EMAIL.toLowerCase()))
    .limit(1)

  if (existing.length > 0) {
    const user = existing[0]
    if (['super_admin', 'manager_admin', 'staff_admin'].includes(user.role)) {
      console.log(`Admin account already exists: ${ADMIN_EMAIL} (${user.role})`)
      console.log('No changes made. Use the existing credentials to log in at /admin/login.')
    } else {
      // Exists as a regular user - promote to admin
      const passwordHash = await argon2.hash(ADMIN_PASSWORD, {
        memoryCost: 8192, timeCost: 2, parallelism: 1,
      })
      await (db as any)
        .update(schema.users)
        .set({ role: ADMIN_ROLE, passwordHash, isEmailVerified: true })
        .where(eq(schema.users.email, ADMIN_EMAIL.toLowerCase()))
      console.log(`Promoted existing user ${ADMIN_EMAIL} to ${ADMIN_ROLE}.`)
    }
    if (pool) await pool.end()
    process.exit(0)
  }

  const passwordHash = await argon2.hash(ADMIN_PASSWORD, {
    memoryCost: 8192, timeCost: 2, parallelism: 1,
  })

  await (db as any).insert(schema.users).values({
    email:           ADMIN_EMAIL.toLowerCase(),
    name:            ADMIN_NAME,
    passwordHash,
    role:            ADMIN_ROLE,
    isEmailVerified: true,
  })

  console.log('Admin account created.')
  console.log(`  Email:    ${ADMIN_EMAIL}`)
  console.log(`  Password: ${ADMIN_PASSWORD}`)
  console.log(`  Role:     ${ADMIN_ROLE}`)
  console.log('')
  console.log('Log in at /admin/login. Change the password after first login.')

  if (pool) await pool.end()
  process.exit(0)
}

seedAdmin().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
