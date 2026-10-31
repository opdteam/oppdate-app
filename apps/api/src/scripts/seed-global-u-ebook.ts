import 'dotenv/config'
import { eq } from 'drizzle-orm'

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.')
  }

  const isNeon = process.env.DATABASE_URL.includes('neon.tech')
  let db: any
  let pool: any = null

  if (isNeon) {
    const { neon }    = await import('@neondatabase/serverless')
    const { drizzle } = await import('drizzle-orm/neon-http')
    const schema      = await import('../db/schema')
    db = drizzle(neon(process.env.DATABASE_URL!), { schema })
  } else {
    const { Pool }    = await import('pg')
    const { drizzle } = await import('drizzle-orm/node-postgres')
    const schema      = await import('../db/schema')
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
    db   = drizzle(pool, { schema })
  }

  const schema = await import('../db/schema')

  const slug = 'global-u-your-ultimate-study-abroad-guide'

  const existing = await db
    .select({ id: schema.ebooks.id })
    .from(schema.ebooks)
    .where(eq(schema.ebooks.slug, slug))
    .limit(1)

  if (existing.length > 0) {
    console.log('Global U ebook already exists - updating to published.')
    await db
      .update(schema.ebooks)
      .set({ status: 'published' })
      .where(eq(schema.ebooks.slug, slug))
    if (pool) await pool.end()
    process.exit(0)
  }

  await db.insert(schema.ebooks).values({
    title: 'Global U: Your Ultimate Study Abroad Guide',
    slug,
    author: 'Emmanuella Biodun Awele',
    pageCount: 214,
    category: 'Scholarships',
    description: 'A complete guide for students pursuing study abroad independently, without relying on agents. Covers the admission and visa process, how to find and win scholarships, cost-effective financing, and interview preparation: everything needed to navigate the journey with confidence.',
    whatsInside: [
      { title: 'Navigating University Admissions', description: 'Step-by-step guidance on applications, essays, and interviews.' },
      { title: 'Scholarship Research & Applications', description: 'How to find, shortlist, and win scholarships.' },
      { title: 'Visa & Immigration', description: 'Student visa requirements, documentation, and timelines.' },
      { title: 'Cost-Effective Financing', description: 'Budgeting, loans, grants, and managing finances abroad.' },
      { title: 'Interview Preparation', description: 'Practice frameworks and real examples for scholarship and admissions interviews.' },
    ],
    coverImageUrl: 'https://oppdate.com/assets/global-u-cover.png',
    fileUrl: 'https://oppdate.com/assets/global-u-guide.pdf',
    fileFormat: 'pdf',
    priceUsd: 2299,
    premiumPriceUsd: 1899,
    status: 'published',
  })

  console.log('Seeded: Global U ebook (published, $22.99 standard / $18.99 premium)')
  if (pool) await pool.end()
  process.exit(0)
}

seed().catch((e) => { console.error(e); process.exit(1) })
