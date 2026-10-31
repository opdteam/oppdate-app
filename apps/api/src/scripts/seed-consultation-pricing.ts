/**
 * Seed script -- inserts the 3 consultation pricing tiers (30, 60, 90 min).
 * Run with: npx tsx src/scripts/seed-consultation-pricing.ts
 * Safe to re-run: updates existing rows by duration, inserts if missing.
 */

import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { initDb } from '../db'
import * as schema from '../db/schema'

const TIERS = [
  { durationMinutes: 30, priceUsd: 4900, description: '30-minute focused strategy session. Best for a single question or quick directional advice.' },
  { durationMinutes: 60, priceUsd: 8900, description: '60-minute full strategy session with written action points after the call.' },
  { durationMinutes: 90, priceUsd: 12900, description: '90-minute deep-dive session covering profile, documents, and full application strategy.' },
]

async function main() {
  const db = await initDb()

  for (const tier of TIERS) {
    const existing = await db
      .select()
      .from(schema.consultationPricing)
      .where(eq(schema.consultationPricing.durationMinutes, tier.durationMinutes))
      .limit(1)

    if (existing.length) {
      await db
        .update(schema.consultationPricing)
        .set({ priceUsd: tier.priceUsd, description: tier.description, active: true })
        .where(eq(schema.consultationPricing.durationMinutes, tier.durationMinutes))
      console.log(`Updated ${tier.durationMinutes}-min tier at $${tier.priceUsd / 100}`)
    } else {
      await db.insert(schema.consultationPricing).values({ ...tier, active: true })
      console.log(`Inserted ${tier.durationMinutes}-min tier at $${tier.priceUsd / 100}`)
    }
  }

  console.log('Done.')
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
