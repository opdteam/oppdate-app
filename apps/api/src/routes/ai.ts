import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, schema } from "../db";
import { eq, desc, and, gt, notInArray, ilike, or } from "drizzle-orm";
import { ok, badRequest } from "../utils/response";
import { requireAuth, requirePremium } from "../middleware/auth";
import Anthropic from "@anthropic-ai/sdk";

function makeAnthropicClient(apiKey: string): Anthropic {
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID
  return new Anthropic({
    apiKey,
    ...(workspaceId ? { defaultHeaders: { 'anthropic-workspace-id': workspaceId } } : {}),
  })
}

// ─── Tavily web search ────────────────────────────────────────────────────────

interface TavilyResult {
  title: string
  url: string
  content: string
  score: number
}

async function tavilySearch(query: string, maxResults = 4): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return []
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        search_depth: 'basic',
        include_answer: false,
        include_raw_content: false,
      }),
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    const data = await res.json() as { results?: TavilyResult[] }
    const results = (data.results ?? []).slice(0, maxResults)
    console.log('tavily search: ' + query + ' -> ' + results.length + ' results')
    return results
  } catch (err) {
    console.log('tavily search failed: ' + (err instanceof Error ? err.message : String(err)))
    return []
  }
}

// ─── Opportunity search against OppDate DB ───────────────────────────────────

interface OppCard {
  slug: string
  title: string
  institution: string
  country: string
  type: string
  deadline: string | null
  fundingLabel: string | null
  oppDateApply: boolean
}

async function searchOppDateOpportunities(query: string, userId: string, limit = 4): Promise<OppCard[]> {
  const now = new Date()
  // Search by keyword in title, institution, or country — fast trgm path
  const rows = await db
    .select({
      slug: schema.opportunities.slug,
      title: schema.opportunities.title,
      institution: schema.opportunities.institution,
      country: schema.opportunities.country,
      type: schema.opportunities.type,
      deadline: schema.opportunities.deadline,
      awardValueUsd: schema.opportunities.awardValueUsd,
      oppDateApply: schema.opportunities.oppDateApply,
    })
    .from(schema.opportunities)
    .where(
      and(
        eq(schema.opportunities.status, 'published'),
        gt(schema.opportunities.deadline, now),
        or(
          ilike(schema.opportunities.title, `%${query}%`),
          ilike(schema.opportunities.institution, `%${query}%`),
          ilike(schema.opportunities.country, `%${query}%`),
          ilike(schema.opportunities.type, `%${query}%`),
        )
      )
    )
    .orderBy(desc(schema.opportunities.deadline))
    .limit(limit)

  return rows.map(r => ({
    slug: r.slug,
    title: r.title,
    institution: r.institution,
    country: r.country,
    type: r.type,
    deadline: r.deadline ? r.deadline.toISOString() : null,
    fundingLabel: r.awardValueUsd
      ? r.awardValueUsd >= 10_000_000 ? 'Fully funded' : `USD ${(r.awardValueUsd / 100).toLocaleString()}`
      : null,
    oppDateApply: r.oppDateApply ?? false,
  }))
}

// ─── Richer application context ──────────────────────────────────────────────

interface ApplicationContext {
  applications: Array<{ title: string; status: string; referenceId: string | null; updatedAt: string }>
  credentials: Array<{ name: string; type: string; timesReused: number }>
}

async function getUserApplicationContext(userId: string): Promise<ApplicationContext> {
  const [apps, docs] = await Promise.all([
    db
      .select({
        status: schema.applications.status,
        referenceId: schema.applications.referenceId,
        updatedAt: schema.applications.updatedAt,
        title: schema.opportunities.title,
      })
      .from(schema.applications)
      .leftJoin(schema.opportunities, eq(schema.applications.opportunityId, schema.opportunities.id))
      .where(eq(schema.applications.userId, userId))
      .orderBy(desc(schema.applications.updatedAt))
      .limit(8),
    db
      .select({
        name: schema.documents.name,
        type: schema.documents.type,
        timesReused: schema.documents.timesReused,
      })
      .from(schema.documents)
      .where(eq(schema.documents.userId, userId))
      .orderBy(desc(schema.documents.timesReused))
      .limit(10),
  ])

  return {
    applications: apps.map(a => ({
      title: a.title ?? 'Unknown opportunity',
      status: a.status,
      referenceId: a.referenceId ?? null,
      updatedAt: a.updatedAt.toISOString(),
    })),
    credentials: docs.map(d => ({
      name: d.name,
      type: d.type,
      timesReused: d.timesReused,
    })),
  }
}

// ─── Tool definitions for the agentic loop ───────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_web',
    description: 'Search the web for information about any opportunity, programme, scholarship, fellowship, internship, institution, or organisation the user mentions by name. ALWAYS call this tool first when the user asks you to "look up", "find", "search", or "check" something specific by name — even if it sounds unfamiliar, local, or like a business. Never decide from your own knowledge whether something is a scholarship or not; search first, then answer. Also use this for eligibility details, deadlines, requirements, or any external fact that may have changed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'A specific, targeted search query. Include the name the user mentioned plus "scholarship", "fellowship", "internship", or "programme" to narrow results. Add country or year if known.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_opportunities',
    description: 'Search OppDate listings to find published opportunities matching a keyword, country, type, or institution. Use when the user asks for similar opportunities, alternatives, or opportunities in a specific field or region.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Keyword to search for across opportunity title, institution, country, and type.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_application_context',
    description: "Fetch the user's current active applications with real titles and statuses, and their credential library. Use when the user asks about their application progress, what stage they are at, what documents they have, or what to do next.",
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
]

// ─── Schemas ──────────────────────────────────────────────────────────────────

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(20)
    .default([]),
  opportunitySlug: z.string().optional(),
})

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function aiRoutes(server: FastifyInstance) {
  server.post(
    "/chat",
    { preHandler: [requirePremium] },
    async (request, reply) => {
      const user = request.user as { id: string }
      const body = chatSchema.safeParse(request.body)
      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const { message, history, opportunitySlug } = body.data

      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        return ok(reply, {
          reply: "AI Guide is not configured. Please check the API key settings.",
          cards: [],
        })
      }

      // ── Fetch user profile + preferences ──────────────────────────────────
      const [userRow] = await db
        .select({ name: schema.users.name, preferences: schema.users.preferences })
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1)

      // ── Fetch active applications with titles and statuses (richer context) ─
      const recentApps = await db
        .select({
          status: schema.applications.status,
          referenceId: schema.applications.referenceId,
          updatedAt: schema.applications.updatedAt,
          title: schema.opportunities.title,
        })
        .from(schema.applications)
        .leftJoin(schema.opportunities, eq(schema.applications.opportunityId, schema.opportunities.id))
        .where(eq(schema.applications.userId, user.id))
        .orderBy(desc(schema.applications.updatedAt))
        .limit(5)

      // ── Fetch credential library summary ──────────────────────────────────
      const credSummary = await db
        .select({ type: schema.documents.type, name: schema.documents.name })
        .from(schema.documents)
        .where(eq(schema.documents.userId, user.id))
        .orderBy(desc(schema.documents.timesReused))
        .limit(8)

      // ── Fetch opportunity context if slug provided ─────────────────────────
      let opportunityContext = ""
      if (opportunitySlug) {
        const [opp] = await db
          .select({
            title: schema.opportunities.title,
            institution: schema.opportunities.institution,
            country: schema.opportunities.country,
            type: schema.opportunities.type,
            summary: schema.opportunities.summary,
            whoItsFor: schema.opportunities.whoItsFor,
            eligibilityCriteria: schema.opportunities.eligibilityCriteria,
            deadline: schema.opportunities.deadline,
            awardValueUsd: schema.opportunities.awardValueUsd,
            requiredDocuments: schema.opportunities.requiredDocuments,
            oppdateServiceFeeUsd: schema.opportunities.oppdateServiceFeeUsd,
            institutionFeeUsd: schema.opportunities.institutionFeeUsd,
            oppDateApply: schema.opportunities.oppDateApply,
            complianceCategory: schema.opportunities.complianceCategory,
          })
          .from(schema.opportunities)
          .where(eq(schema.opportunities.slug, opportunitySlug))
          .limit(1)

        if (opp) {
          const totalFeeUsd = ((opp.oppdateServiceFeeUsd ?? 0) + (opp.institutionFeeUsd ?? 0)) / 100
          opportunityContext = `
The user is currently viewing this opportunity on OppDate:
- Title: ${opp.title}
- Institution: ${opp.institution}
- Country: ${opp.country}
- Type: ${opp.type}
- Summary: ${opp.summary}
- Who it's for: ${opp.whoItsFor}
- Deadline: ${opp.deadline ? new Date(opp.deadline).toDateString() : 'Not specified'}
- Award value: ${opp.awardValueUsd ? (opp.awardValueUsd >= 10_000_000 ? 'Fully funded' : `USD ${(opp.awardValueUsd / 100).toLocaleString()}`) : 'Not specified'}
- Required documents: ${Array.isArray(opp.requiredDocuments) ? (opp.requiredDocuments as string[]).join(', ') : 'Not specified'}
- OppDate Apply available: ${opp.oppDateApply ? 'Yes' : 'No'}
- Compliance category: ${opp.complianceCategory ?? 'N/A'}
- Total OppDate Apply fee: ${totalFeeUsd > 0 ? `USD ${totalFeeUsd.toFixed(0)}` : 'Free'}
- Eligibility criteria: ${JSON.stringify(opp.eligibilityCriteria)}

Note: The listing above is what was entered by the OppDate admin. For the most current and complete information about this opportunity (interviews, additional requirements, recent updates), use the search_web tool.`
        }
      }

      // ── Build application context string ──────────────────────────────────
      const appContextStr = recentApps.length > 0
        ? recentApps.map(a =>
            `  - ${a.title ?? 'Unknown'}: ${a.status.replace(/_/g, ' ')}${a.referenceId ? ` (ref: ${a.referenceId})` : ''}`
          ).join('\n')
        : '  None yet'

      const credContextStr = credSummary.length > 0
        ? credSummary.map(d => `  - ${d.name} (${d.type.replace(/_/g, ' ')})`).join('\n')
        : '  None uploaded yet'

      const prefs = (userRow?.preferences as Record<string, unknown>) ?? {}
      const userName = userRow?.name || null

      const systemPrompt = `You are the OppDate Guide, an expert in international scholarships, fellowships, internships, and opportunities. You help users find and apply for opportunities that match their background.

User profile:
- Name: ${userName || 'not provided'}
- Country of residence: ${prefs.country || 'not specified'}
- Nationality: ${prefs.nationality || 'not specified'}
- Goal: ${prefs.goal || 'not specified'}
- Role / background: ${prefs.role || 'not specified'}
- Interests: ${Array.isArray(prefs.interests) ? (prefs.interests as string[]).join(', ') : prefs.interests || 'not specified'}
- Education level: ${prefs.educationLevel || 'not specified'}
- Field of study: ${prefs.fieldOfStudy || 'not specified'}

Active applications (most recent first):
${appContextStr}

Credential library (documents already uploaded):
${credContextStr}
${opportunityContext}
When the user's name is known, use it occasionally but not in every message. Use the profile and application context to give specific, relevant answers without asking for details the user has already provided.

Tool use guidance:
- If the user asks to "look up", "find", "search", "check", or "tell me about" anything by name, call search_web immediately. Do not decide from your own knowledge whether the name sounds like an opportunity or not. Search first, always.
- Use search_web for eligibility details, interview processes, specific programme requirements, recent changes, or any external fact not covered by the listing data above.
- Use search_opportunities when the user asks for similar or alternative opportunities, or when browsing without a specific listing open.
- Use get_application_context mid-conversation when the user asks what stage they are at, what to do next, or whether they have a specific document — this fetches their live pipeline state.
- Never invent facts or make assumptions about what something is. If you do not know, search the web.
- When web results are used, briefly cite the source domain (e.g. "according to chevening.org").
- OppDate listing data takes precedence over web results if they conflict.

Guidelines:
- If the user sends a greeting, respond with one short sentence and wait. Do not list your capabilities unprompted.
- Only offer help when the user asks a question or makes a request.
- If the user wants to apply, move them forward immediately. Do not re-ask questions they have already answered.
- Match the user's language and tone. If they write in Pidgin, Creole, informal slang, or any other language, respond naturally in the same style.
- Be concise and practical. Avoid lengthy disclaimers.
- When discussing OppDate Apply, explain it is the done-for-you service where OppDate prepares and submits the application on the user's behalf.
- Keep responses under 150 words unless the user asks for a detailed breakdown.

Writing rules (follow strictly):
- Plain prose only. No markdown: no bold, no italics, no headers, no bullet points.
- Use numbered lists only when steps have a clear order and the user asked for steps.
- No em dashes, en dashes, double hyphens, semicolons, or rhetorical questions.
- No filler words: just, very, really, actually, certainly, basically, may, could.
- No buzzwords: craft, unlock, discover, pivotal, harness, groundbreaking, navigate, tailored, ensure, leverage.
- No transitional crutches: however, furthermore, moreover, in summary, in conclusion.
- Write short, direct sentences. Active voice. Address the user as "you".
- When listing items in a sentence, use commas and "and" rather than formatting.`

      const anthropic = makeAnthropicClient(apiKey)

      // ── Agentic tool-use loop ──────────────────────────────────────────────
      const messages: Anthropic.MessageParam[] = [
        ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
        { role: 'user' as const, content: message },
      ]

      interface WebSource { title: string; url: string }
      let collectedCards: OppCard[] = []
      let collectedSources: WebSource[] = []
      let finalText = ''
      const MAX_TOOL_ROUNDS = 4 // prevent runaway loops

      // Detect if the user's message is clearly a lookup/search/find intent
      const lowerMsg = message.toLowerCase()
      const isSearchIntent = /\b(lookup|look up|find|search|check|tell me about|what is|who is|show me|get me|fetch)\b/.test(lowerMsg)

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        // Force a tool call on round 0 when user clearly wants a search
        const toolChoice: Anthropic.Messages.ToolChoiceAuto | Anthropic.Messages.ToolChoiceAny =
          round === 0 && isSearchIntent
            ? { type: 'any' }
            : { type: 'auto' }

        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: systemPrompt,
          tools: TOOLS,
          tool_choice: toolChoice,
          messages,
        })

        // If Claude returned a final text response, we're done
        if (response.stop_reason === 'end_turn') {
          const textBlock = response.content.find(b => b.type === 'text')
          finalText = textBlock?.type === 'text' ? textBlock.text : ''
          break
        }

        // If Claude wants to use tools, execute them all in parallel
        if (response.stop_reason === 'tool_use') {
          const toolUseBlocks = response.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[]

          // Add Claude's response (with tool use requests) to message history
          messages.push({ role: 'assistant', content: response.content })

          // Execute all requested tools in parallel
          const toolResults = await Promise.all(
            toolUseBlocks.map(async (block): Promise<Anthropic.ToolResultBlockParam> => {
              try {
                if (block.name === 'search_web') {
                  const input = block.input as { query: string }
                  const results = await tavilySearch(input.query)
                  if (results.length === 0) {
                    return { type: 'tool_result', tool_use_id: block.id, content: 'No results found.' }
                  }
                  // Collect sources for frontend attribution
                  collectedSources.push(...results.map(r => ({ title: r.title, url: r.url })))
                  const formatted = results.map(r =>
                    `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.content}`
                  ).join('\n\n---\n\n')
                  return { type: 'tool_result', tool_use_id: block.id, content: formatted }
                }

                if (block.name === 'search_opportunities') {
                  const input = block.input as { query: string }
                  const opps = await searchOppDateOpportunities(input.query, user.id)
                  if (opps.length === 0) {
                    return { type: 'tool_result', tool_use_id: block.id, content: 'No matching opportunities found on OppDate right now.' }
                  }
                  // Collect cards to return to frontend
                  collectedCards = opps
                  const formatted = opps.map(o =>
                    `${o.title} at ${o.institution} (${o.country}) — ${o.type} — closes ${o.deadline ? new Date(o.deadline).toDateString() : 'TBD'}${o.fundingLabel ? ` — ${o.fundingLabel}` : ''}${o.oppDateApply ? ' — OppDate Apply available' : ''}`
                  ).join('\n')
                  return { type: 'tool_result', tool_use_id: block.id, content: formatted }
                }

                if (block.name === 'get_application_context') {
                  const ctx = await getUserApplicationContext(user.id)
                  const appsStr = ctx.applications.length > 0
                    ? ctx.applications.map(a =>
                        `${a.title}: ${a.status.replace(/_/g, ' ')}${a.referenceId ? ` (ref: ${a.referenceId})` : ''}, last updated ${new Date(a.updatedAt).toDateString()}`
                      ).join('\n')
                    : 'No active applications.'
                  const credsStr = ctx.credentials.length > 0
                    ? ctx.credentials.map(d => `${d.name} (${d.type.replace(/_/g, ' ')})`).join(', ')
                    : 'No documents uploaded yet.'
                  return {
                    type: 'tool_result',
                    tool_use_id: block.id,
                    content: `Applications:\n${appsStr}\n\nCredential library:\n${credsStr}`,
                  }
                }

                return { type: 'tool_result', tool_use_id: block.id, content: 'Unknown tool.' }
              } catch {
                return { type: 'tool_result', tool_use_id: block.id, content: 'Tool execution failed. Proceed without this information.' }
              }
            })
          )

          // Add tool results to message history and loop
          messages.push({ role: 'user', content: toolResults })
          continue
        }

        // Any other stop reason (max_tokens, etc.) — extract whatever text exists
        const textBlock = response.content.find(b => b.type === 'text')
        finalText = textBlock?.type === 'text' ? textBlock.text : ''
        break
      }

      if (!finalText) {
        finalText = 'I could not generate a response. Please try again.'
      }

      // Strip em/en dashes the model occasionally still produces despite instructions
      const aiReply = finalText
        .replace(/\u2014/g, ',')
        .replace(/\u2013/g, '-')
        .replace(/--/g, '-')

      // Deduplicate sources by URL
      const seenUrls = new Set<string>()
      const dedupedSources = collectedSources.filter(s => {
        if (seenUrls.has(s.url)) return false
        seenUrls.add(s.url)
        return true
      })

      return ok(reply, { reply: aiReply, cards: collectedCards, sources: dedupedSources })
    },
  )

  // POST /api/v1/ai/eligibility-assessment
  server.post(
    "/eligibility-assessment",
    { preHandler: [requirePremium] },
    async (request, reply) => {
      const bodySchema = z.object({
        opportunityTitle: z.string().min(1).max(500),
        opportunityType: z.string().min(1).max(100),
        responses: z
          .array(
            z.object({
              question: z.string(),
              answer: z.string(),
              score: z.number(),
            }),
          )
          .min(1)
          .max(20),
        verdict: z.enum(["borderline", "ineligible"]),
      })

      const body = bodySchema.safeParse(request.body)
      if (!body.success) return badRequest(reply, body.error.errors[0].message)

      const { opportunityTitle, opportunityType, responses, verdict } = body.data

      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        return ok(reply, {
          summary: "Our team will review your profile against this opportunity's requirements. You can still proceed with your application.",
          concerns: [],
          canProceed: true,
        })
      }

      const negativeResponses = responses.filter(r => r.score < 0)
      const passingResponses = responses.filter(r => r.score >= 0)

      const formatResponses = (arr: typeof responses) =>
        arr.map(r => `  - Criterion: "${r.question}"\n    User answered: "${r.answer}"`).join('\n')

      const prompt = `You are an eligibility advisor for OppDate, a global opportunity application platform. Your role is to give users honest, specific, and actionable feedback on their eligibility for "${opportunityTitle}" (${opportunityType}).

VERDICT: ${verdict === 'borderline' ? 'BORDERLINE — the user meets some criteria but falls short on others' : 'INELIGIBLE — the user does not meet one or more key criteria'}

CRITERIA THE USER PASSED (${passingResponses.length}):
${passingResponses.length > 0 ? formatResponses(passingResponses) : '  None'}

CRITERIA THE USER DID NOT MEET (${negativeResponses.length}):
${formatResponses(negativeResponses)}

Writing rules (follow strictly):
- Short, plain sentences. Active voice. No em dashes, no semicolons, no rhetorical questions.
- No filler words: just, very, really, actually, certainly, basically, may, could.
- No buzzwords: craft, unlock, discover, pivotal, harness, groundbreaking, navigate, tailored, ensure.
- No transitional crutches: however, furthermore, moreover, in summary, in conclusion.
- Address the user directly using "you" and "your".

Your task:
1. Write a "summary": 2-3 short sentences. Name exactly what fell short and why. ${verdict === 'borderline' ? 'Acknowledge what they got right, then state the gaps plainly. End by telling them they can ask OppDate Guide (the AI assistant on the platform) to explore options.' : 'State the gaps plainly. Tell them eligibility results never block an application and the OppDate team reviews every submission.'} Under 60 words.

2. Write one "concern" per criterion the user did NOT meet:
   - "criterion": 3-5 word label naming the specific gap (e.g. "Age Requirement", "Nationality Restriction", "Work Experience Gap")
   - "detail": one sentence, max 20 words. State what the criterion requires, what the user answered, and one concrete action they can take. Do not mention contacting anyone — suggest a tangible step.

Return ONLY raw JSON — no markdown fences, no code blocks, no preamble, no explanation:
{
  "summary": "...",
  "concerns": [
    { "criterion": "...", "detail": "..." }
  ],
  "canProceed": true
}`

      const anthropic = makeAnthropicClient(apiKey)

      try {
        const completion = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        })

        const rawText = completion.content[0]?.type === 'text' ? completion.content[0].text : '{}'
        const raw = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
        const parsed = JSON.parse(raw)

        return ok(reply, {
          summary: typeof parsed.summary === 'string' ? parsed.summary : 'Our team will review your application carefully.',
          concerns: Array.isArray(parsed.concerns) ? parsed.concerns.slice(0, 5) : [],
          canProceed: true,
        })
      } catch {
        return ok(reply, {
          summary: "Our team will review your profile against this opportunity's requirements. You can still proceed with your application.",
          concerns: [],
          canProceed: true,
        })
      }
    },
  )

  // GET /api/v1/ai/recommendations?limit=6
  server.get(
    "/recommendations",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user as { id: string; isPremium?: boolean }
      const limit = Math.min(
        parseInt((request.query as { limit?: string }).limit || '6', 10),
        20,
      )

      const [userRow] = await db
        .select({ preferences: schema.users.preferences, isPremium: schema.users.isPremium })
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1)

      if (!userRow?.isPremium) {
        return ok(reply, [], 'Recommendations are available for Premium members.')
      }

      const prefs = (userRow.preferences as Record<string, unknown>) ?? {}
      const prefCountry = ((prefs.country as string) || '').toLowerCase()
      const prefGoal = prefs.goal as string | undefined
      const prefLevel = ((prefs.educationLevel as string) || '').toLowerCase()
      const prefField = ((prefs.fieldOfStudy as string) || '').toLowerCase()

      const [applied, saved] = await Promise.all([
        db.select({ opportunityId: schema.applications.opportunityId }).from(schema.applications).where(eq(schema.applications.userId, user.id)),
        db.select({ opportunityId: schema.savedOpportunities.opportunityId }).from(schema.savedOpportunities).where(eq(schema.savedOpportunities.userId, user.id)),
      ])

      const excludeIds = [...new Set([...applied.map(a => a.opportunityId), ...saved.map(s => s.opportunityId)])]

      const now = new Date()
      const whereClause = excludeIds.length > 0
        ? and(eq(schema.opportunities.status, 'published'), gt(schema.opportunities.deadline, now), notInArray(schema.opportunities.id, excludeIds))
        : and(eq(schema.opportunities.status, 'published'), gt(schema.opportunities.deadline, now))

      const opps = await db
        .select({
          id: schema.opportunities.id,
          slug: schema.opportunities.slug,
          title: schema.opportunities.title,
          institution: schema.opportunities.institution,
          institutionLogoUrl: schema.opportunities.institutionLogoUrl,
          country: schema.opportunities.country,
          type: schema.opportunities.type,
          summary: schema.opportunities.summary,
          deadline: schema.opportunities.deadline,
          awardValueUsd: schema.opportunities.awardValueUsd,
          eligibilityLevel: schema.opportunities.eligibilityLevel,
          fieldOfStudy: schema.opportunities.fieldOfStudy,
          oppDateApply: schema.opportunities.oppDateApply,
        })
        .from(schema.opportunities)
        .where(whereClause)
        .orderBy(desc(schema.opportunities.deadline))
        .limit(100)

      const goalTypeMap: Record<string, string> = {
        scholarship: 'scholarship', fellowship: 'fellowship',
        internship: 'internship', job: 'entry_level_job', training: 'training_bootcamp',
      }
      const prefType = prefGoal ? goalTypeMap[prefGoal] : undefined

      const scored = opps.map(opp => {
        const matchReasons: string[] = []
        let score = 0
        if (prefCountry && opp.country.toLowerCase().includes(prefCountry)) { score += 2; matchReasons.push('country') }
        if (prefType && opp.type === prefType) { score += 2; matchReasons.push('goal') }
        if (prefLevel && opp.eligibilityLevel?.toLowerCase().includes(prefLevel)) { score += 1; matchReasons.push('level') }
        if (prefField && opp.fieldOfStudy?.toLowerCase().includes(prefField)) { score += 1; matchReasons.push('field') }

        const daysLeft = opp.deadline ? Math.max(0, Math.ceil((opp.deadline.getTime() - Date.now()) / 86400000)) : null
        const fundingLabel = opp.awardValueUsd
          ? opp.awardValueUsd >= 10_000_000 ? 'Fully funded' : `USD ${(opp.awardValueUsd / 100).toLocaleString()}`
          : null

        return { id: opp.id, slug: opp.slug, title: opp.title, institution: opp.institution, institutionLogoUrl: opp.institutionLogoUrl, country: opp.country, type: opp.type, summary: opp.summary, deadline: opp.deadline, eligibilityLevel: opp.eligibilityLevel, oppDateApply: opp.oppDateApply, fundingLabel, closesIn: daysLeft, matchScore: score, matchReasons }
      })

      scored.sort((a, b) => b.matchScore - a.matchScore || (a.deadline?.getTime() ?? 0) - (b.deadline?.getTime() ?? 0))
      return ok(reply, scored.slice(0, limit))
    },
  )

  server.get('/', { preHandler: [requireAuth] }, async (_request, reply) => {
    return ok(reply, [], 'AI Guide ready.')
  })
}
