import 'dotenv/config'
import argon2 from 'argon2'

const EMAIL    = 'premium@oppdate.app'
const PASSWORD = 'PremiumTest@2026'
const NAME     = 'Premium Tester'

async function seedPremiumUser() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.')
  }

  const { drizzle } = await import('drizzle-orm/node-postgres')
  const { Pool } = await import('pg')
  const schema = await import('../db/schema/index.js')

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const db = drizzle(pool, { schema })

  const passwordHash = await argon2.hash(PASSWORD)

  const premiumUntil = new Date()
  premiumUntil.setFullYear(premiumUntil.getFullYear() + 1)

  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where((await import('drizzle-orm')).eq(schema.users.email, EMAIL))
    .limit(1)

  if (existing) {
    const { eq } = await import('drizzle-orm')
    await db
      .update(schema.users)
      .set({ isPremium: true, premiumSince: new Date(), premiumUntil, passwordHash })
      .where(eq(schema.users.id, existing.id))
    console.log('Updated existing user to premium: ' + EMAIL)
  } else {
    await db.insert(schema.users).values({
      email: EMAIL,
      name: NAME,
      passwordHash,
      isEmailVerified: true,
      isPremium: true,
      premiumSince: new Date(),
      premiumUntil,
    })
    console.log('Created premium user: ' + EMAIL)
  }

  console.log('Email:    ' + EMAIL)
  console.log('Password: ' + PASSWORD)
  console.log('Premium until: ' + premiumUntil.toDateString())

  await pool.end()
}

seedPremiumUser().catch(e => { console.error(e); process.exit(1) })
