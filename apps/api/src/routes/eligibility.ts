import { FastifyInstance } from 'fastify'
import { db, schema } from '../db'
import { eq, and } from 'drizzle-orm'
import { ok, created, notFound, badRequest } from '../utils/response'
import { requireAuth, requireRole } from '../middleware/auth'
import Anthropic from '@anthropic-ai/sdk'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CriterionOption {
  text: string
  score: number
}

interface Criterion {
  question: string
  options: CriterionOption[]
  weightRationale?: string
}

type EligibilityTier = 'eligible' | 'borderline' | 'ineligible'

function scoreTier(score: number): EligibilityTier {
  if (score >= 0) return 'eligible'
  if (score > -50) return 'borderline'
  return 'ineligible'
}

// ─── AI generation ────────────────────────────────────────────────────────────

async function generateCriteria(listing: {
  title: string
  description: string
  whoItsFor: string
  eligibilityLevel: string | null
  fieldOfStudy: string | null
  country: string
}): Promise<{ criteria: Criterion[]; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { criteria: [], error: 'ANTHROPIC_API_KEY is not set on the server.' }

  const anthropic = new Anthropic({
    apiKey,
    defaultHeaders: process.env.ANTHROPIC_WORKSPACE_ID
      ? { 'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID }
      : undefined,
  })

  const prompt = `You are an eligibility screening assistant for OppDate, an international opportunity platform.

Based on the opportunity below, generate a set of self-assessment screening questions for applicants.

Opportunity: ${listing.title}
Country: ${listing.country}
Eligibility level: ${listing.eligibilityLevel ?? 'Not specified'}
Field of study: ${listing.fieldOfStudy ?? 'Not specified'}
Who it is for: ${listing.whoItsFor}
Description: ${listing.description}

Rules:
- Generate between 4 and 8 questions.
- Each question maps to one eligibility criterion: nationality, age, degree level, GPA, field of study, work experience, language proficiency, funding eligibility, etc.
- Options use a score system. Scores are 0 or negative integers only.
  - 0 = neutral, does not affect eligibility.
  - -30 = soft weakness, stacks with other negatives but not fatal alone.
  - -100 = hard disqualifier on its own.
  - Use intermediate values (-20, -50, -80) where the criterion has nuance.
- Assign scores that reflect the actual weight of each criterion for this specific opportunity.
  For example: citizenship is typically -100 on "No" for country-restricted programmes.
  Work experience may be -20 on "None" if preferred but not required.
- Each question must have between 2 and 5 options. Use as many as the criterion requires.
- weightRationale must be one plain sentence explaining why you scored it this way.
- Do not generate duplicate questions.
- Return ONLY valid JSON with no markdown, no explanation, no preamble.

Return a JSON array in this exact shape:
[
  {
    "question": "...",
    "options": [
      { "text": "...", "score": 0 },
      { "text": "...", "score": -100 }
    ],
    "weightRationale": "..."
  }
]`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content.find(b => b.type === 'text')?.text ?? ''
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) {
      console.log('eligibility generation: no JSON array in response. Raw text: ' + text.slice(0, 300))
      return { criteria: [], error: 'AI response did not contain a valid JSON array.' }
    }
    const parsed = JSON.parse(match[0]) as Criterion[]
    if (!Array.isArray(parsed)) return { criteria: [], error: 'AI response parsed but was not an array.' }
    const valid = parsed.filter(q =>
      q.question?.trim() &&
      Array.isArray(q.options) &&
      q.options.length >= 2 &&
      q.options.every(o => typeof o.text === 'string' && typeof o.score === 'number')
    )
    return { criteria: valid }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log('eligibility generation failed: ' + msg)
    return { criteria: [], error: msg }
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function eligibilityRoutes(server: FastifyInstance) {

  // POST /api/v1/opportunities/:id/generate-eligibility (admin)
  // Generates questions for a listing and writes them into opportunities.eligibility_criteria.
  // keepQuestions: string[] of question texts the admin wants to preserve unchanged.
  // Questions not in keepQuestions are replaced by AI output.
  server.post(
    '/:id/generate-eligibility',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { keepQuestions = [] } = request.body as { keepQuestions?: string[] }

      const [listing] = await db
        .select({
          id: schema.opportunities.id,
          title: schema.opportunities.title,
          description: schema.opportunities.description,
          whoItsFor: schema.opportunities.whoItsFor,
          eligibilityCriteria: schema.opportunities.eligibilityCriteria,
          eligibilityLevel: schema.opportunities.eligibilityLevel,
          fieldOfStudy: schema.opportunities.fieldOfStudy,
          country: schema.opportunities.country,
        })
        .from(schema.opportunities)
        .where(eq(schema.opportunities.id, id))
        .limit(1)

      if (!listing) return notFound(reply, 'Opportunity')

      const existing = Array.isArray(listing.eligibilityCriteria)
        ? (listing.eligibilityCriteria as Criterion[])
        : []

      const kept = existing.filter(q => keepQuestions.includes(q.question))

      const { criteria: generated, error: genError } = await generateCriteria(listing)
      if (generated.length === 0) {
        return badRequest(reply, genError ?? 'AI could not generate questions. Add more eligibility detail to the listing and try again.')
      }

      // Merge: kept questions first, then generated (deduplicated against kept)
      const keptTexts = new Set(kept.map(q => q.question.toLowerCase()))
      const fresh = generated.filter(q => !keptTexts.has(q.question.toLowerCase()))
      const merged = [...kept, ...fresh]

      await db
        .update(schema.opportunities)
        .set({ eligibilityCriteria: merged, updatedAt: new Date() })
        .where(eq(schema.opportunities.id, id))

      return ok(reply, { criteria: merged, generated: fresh.length, kept: kept.length })
    }
  )

  // POST /api/v1/opportunities/:id/eligibility-check (authenticated user)
  // Evaluates answers against the listing's criteria using score summing.
  // answers = [{ question, answer }] matching the question text and chosen option text.
  server.post(
    '/:id/eligibility-check',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const payload = request.user as { id: string }
      const { answers } = request.body as { answers: Array<{ question: string; answer: string }> }

      if (!Array.isArray(answers) || answers.length === 0) {
        return badRequest(reply, 'Answers are required.')
      }

      const [listing] = await db
        .select({ eligibilityCriteria: schema.opportunities.eligibilityCriteria })
        .from(schema.opportunities)
        .where(eq(schema.opportunities.id, id))
        .limit(1)

      if (!listing) return notFound(reply, 'Opportunity')

      const criteria = Array.isArray(listing.eligibilityCriteria)
        ? (listing.eligibilityCriteria as Criterion[])
        : []

      if (criteria.length === 0) {
        return badRequest(reply, 'This listing has no eligibility questions.')
      }

      // Score each answer
      const scored = answers.map(a => {
        const q = criteria.find(c => c.question === a.question)
        if (!q) return { question: a.question, answer: a.answer, score: 0 }
        const opt = q.options.find(o => o.text === a.answer)
        return { question: a.question, answer: a.answer, score: opt?.score ?? 0 }
      })

      const totalScore = scored.reduce((sum, a) => sum + a.score, 0)
      const tier = scoreTier(totalScore)

      await db
        .insert(schema.eligibilityChecks)
        .values({
          userId: payload.id,
          listingId: id,
          answers: scored,
          score: totalScore,
          tier,
        })
        .onConflictDoUpdate({
          target: [schema.eligibilityChecks.userId, schema.eligibilityChecks.listingId],
          set: { answers: scored, score: totalScore, tier, checkedAt: new Date() },
        })

      return ok(reply, { score: totalScore, tier })
    }
  )

  // GET /api/v1/opportunities/:id/eligibility-check
  // Returns a check result for this listing.
  // Authenticated users fetch their own result.
  // Admins can pass ?userId=<id> to fetch any user's result for the application review panel.
  server.get(
    '/:id/eligibility-check',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const payload = request.user as { id: string; role: string }
      const { userId: queryUserId } = request.query as { userId?: string }

      const isAdmin = ['staff_admin', 'manager_admin', 'super_admin'].includes(payload.role)
      const targetUserId = isAdmin && queryUserId ? queryUserId : payload.id

      const [check] = await db
        .select()
        .from(schema.eligibilityChecks)
        .where(and(
          eq(schema.eligibilityChecks.userId, targetUserId),
          eq(schema.eligibilityChecks.listingId, id),
        ))
        .limit(1)

      return ok(reply, check ?? null)
    }
  )
}

// ─── Background trigger (called from opportunities routes after save) ──────────

export async function triggerEligibilityGeneration(listingId: string): Promise<void> {
  const [listing] = await db
    .select({
      id: schema.opportunities.id,
      title: schema.opportunities.title,
      description: schema.opportunities.description,
      whoItsFor: schema.opportunities.whoItsFor,
      eligibilityCriteria: schema.opportunities.eligibilityCriteria,
      eligibilityLevel: schema.opportunities.eligibilityLevel,
      fieldOfStudy: schema.opportunities.fieldOfStudy,
      country: schema.opportunities.country,
    })
    .from(schema.opportunities)
    .where(eq(schema.opportunities.id, listingId))
    .limit(1)

  if (!listing) return

  // Only auto-generate if the listing has no criteria yet
  const existing = Array.isArray(listing.eligibilityCriteria)
    ? (listing.eligibilityCriteria as Criterion[])
    : []

  if (existing.length > 0) return

  const { criteria: generated, error: genError } = await generateCriteria(listing)
  if (generated.length === 0) {
    console.log('eligibility: auto-generation failed for ' + listingId + ': ' + (genError ?? 'empty result'))
    return
  }

  await db
    .update(schema.opportunities)
    .set({ eligibilityCriteria: generated, updatedAt: new Date() })
    .where(eq(schema.opportunities.id, listingId))

  console.log('eligibility: generated ' + generated.length + ' questions for ' + listingId)
}
