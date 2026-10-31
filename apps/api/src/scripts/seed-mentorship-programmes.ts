/**
 * Seed script -- inserts the two core mentorship programmes.
 * Run with: npx tsx src/scripts/seed-mentorship-programmes.ts
 * Safe to re-run: uses onConflictDoNothing on title.
 */

import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { initDb } from '../db'
import * as schema from '../db/schema'

const PROGRAMMES = [
  {
    title: '30-Day Personalized Mentorship (BSC)',
    description:
      'With this program, you get a dedicated private mentor for a full 30-day cycle. One-on-one, intentional, and fully involved. This isn\'t group advice or recycled templates. A matched mentor works with you directly on your documents, materials, recommendations, and the positioning choices that actually move the needle.',
    monthlyPriceUsd: 25000, // $250 in cents
    active: true,
  },
  {
    title: '30-Day Personalized Mentorship (MSC)',
    description:
      'With this program, you get a dedicated private mentor for a full 30-day cycle. One-on-one, intentional, and fully involved. This isn\'t group advice or recycled templates. A matched mentor works with you directly on your documents, materials, recommendations, and the positioning choices that actually move the needle.',
    monthlyPriceUsd: 35000, // $350 in cents
    active: true,
  },
]

async function main() {
  const db = await initDb()

  const [creator] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.role, 'super_admin'))
    .limit(1)

  if (!creator) {
    console.error('No super_admin user found. Run yarn db:seed-admin first.')
    process.exit(1)
  }

  console.log(`Seeding ${PROGRAMMES.length} mentorship programmes (created_by: ${creator.id})...`)

  for (const prog of PROGRAMMES) {
    await db
      .insert(schema.mentorshipProgrammes)
      .values({ ...prog, createdBy: creator.id })
      .onConflictDoNothing()

    console.log(`  inserted: ${prog.title}`)
  }

  console.log('Done.')
  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
