import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, schema } from "../db";
import { eq, desc, and, gt, notInArray } from "drizzle-orm";
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
});

export async function aiRoutes(server: FastifyInstance) {
  server.post(
    "/chat",
    { preHandler: [requirePremium] },
    async (request, reply) => {
      const user = request.user as { id: string };
      const body = chatSchema.safeParse(request.body);
      if (!body.success) return badRequest(reply, body.error.errors[0].message);

      const { message, history, opportunitySlug } = body.data;

      // Fetch user profile + preferences for context
      const [userRow] = await db
        .select({ name: schema.users.name, preferences: schema.users.preferences })
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1);

      // Fetch active applications (last 5)
      const applications = await db
        .select({
          id: schema.applications.id,
          status: schema.applications.status,
          opportunityId: schema.applications.opportunityId,
        })
        .from(schema.applications)
        .where(eq(schema.applications.userId, user.id))
        .orderBy(desc(schema.applications.createdAt))
        .limit(5);

      // Fetch opportunity context if slug provided
      let opportunityContext = "";
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
          })
          .from(schema.opportunities)
          .where(eq(schema.opportunities.slug, opportunitySlug))
          .limit(1);

        if (opp) {
          opportunityContext = `
The user is viewing this opportunity:
- Title: ${opp.title}
- Institution: ${opp.institution}
- Country: ${opp.country}
- Type: ${opp.type}
- Summary: ${opp.summary}
- Who it's for: ${opp.whoItsFor}
- Deadline: ${opp.deadline ? new Date(opp.deadline).toDateString() : "Not specified"}
- Award value: ${opp.awardValueUsd ? `$${opp.awardValueUsd}` : "Not specified"}
- Eligibility criteria: ${JSON.stringify(opp.eligibilityCriteria)}
`;
        }
      }

      const prefs = (userRow?.preferences as Record<string, unknown>) ?? {};
      const userName = userRow?.name || null;
      const systemPrompt = `You are the OppDate Guide, an expert in international scholarships, fellowships, internships, and opportunities. You help users find and apply for opportunities that match their background.

User context:
- Name: ${userName || "not provided"}
- Country of residence: ${prefs.country || "not specified"}
- Nationality: ${prefs.nationality || "not specified"}
- Goal: ${prefs.goal || "not specified"}
- Role / background: ${prefs.role || "not specified"}
- Interests: ${Array.isArray(prefs.interests) ? (prefs.interests as string[]).join(', ') : prefs.interests || "not specified"}
- Education level: ${prefs.educationLevel || "not specified"}
- Field of study: ${prefs.fieldOfStudy || "not specified"}
- Active applications: ${applications.length > 0 ? `${applications.length} in progress` : "none yet"}
${opportunityContext}
When the user's name is known, use it occasionally but not in every message. Use the background context to give specific, relevant answers without asking for details the user has already provided.

Guidelines:
- If the user sends a greeting (e.g. "hi", "hello", "hey"), respond with a single short sentence greeting back and wait. Do not explain what you can do or list your capabilities unprompted.
- Only offer help when the user asks a question or makes a request.
- If the user says they want to apply or start the application, move them forward immediately. Do not re-ask eligibility questions they have already answered or that they are clearly bypassing.
- Match the user's language and tone. If they write in Pidgin, Creole, informal slang, or any language other than English, respond naturally in the same style. Never ask them to clarify just because their phrasing is informal or non-standard.
- Be concise and practical. Avoid lengthy disclaimers.
- When asked about eligibility, ask clarifying questions about the user's citizenship, degree, and work experience.
- When discussing OppDate Apply, explain it is the done-for-you application service where OppDate prepares and submits the application on the user's behalf.
- If you don't know something specific, say so and point to the official programme website.
- Keep responses under 150 words unless the user asks for a detailed breakdown.

Writing rules (follow strictly):
- Plain prose only. No markdown formatting: no bold (**), no italics (*), no headers (#), no bullet points with hyphens or asterisks, no code blocks.
- Use numbered lists only when steps have a clear order and the user asked for steps.
- No em dashes, no en dashes, no double hyphens (--), no semicolons, no rhetorical questions.
- No filler words: just, very, really, actually, certainly, basically, may, could.
- No buzzwords: craft, unlock, discover, pivotal, harness, groundbreaking, navigate, tailored, ensure, leverage.
- No transitional crutches: however, furthermore, moreover, in summary, in conclusion.
- Write short, direct sentences. Active voice. Address the user as "you".
- When listing items in a sentence, use commas and "and" rather than formatting.`;

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return ok(reply, {
          reply:
            "AI Guide is not configured. Please check the API key settings.",
        });
      }

      const anthropic = makeAnthropicClient(apiKey);

      const completion = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          ...history.map((h) => ({
            role: h.role as "user" | "assistant",
            content: h.content,
          })),
          { role: "user", content: message },
        ],
      });

      const rawReply =
        completion.content[0]?.type === "text"
          ? completion.content[0].text
          : "I could not generate a response. Please try again."

      // Strip em/en dashes the model occasionally still produces despite instructions
      const aiReply = rawReply
        .replace(/\u2014/g, ',') // em dash
        .replace(/\u2013/g, '-') // en dash
        .replace(/--/g, '-')     // double hyphen used as dash

      return ok(reply, { reply: aiReply });
    },
  );

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
      });

      const body = bodySchema.safeParse(request.body);
      if (!body.success) return badRequest(reply, body.error.errors[0].message);

      const { opportunityTitle, opportunityType, responses, verdict } =
        body.data;

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return ok(reply, {
          summary:
            "Our team will review your profile against this opportunity's requirements. You can still proceed with your application.",
          concerns: [],
          canProceed: true,
        });
      }

      const negativeResponses = responses.filter((r) => r.score < 0);
      const passingResponses = responses.filter((r) => r.score >= 0);

      const formatResponses = (arr: typeof responses) =>
        arr.map((r) => `  - Criterion: "${r.question}"\n    User answered: "${r.answer}"`).join("\n");

      const prompt = `You are an eligibility advisor for OppDate, a global opportunity application platform. Your role is to give users honest, specific, and actionable feedback on their eligibility for "${opportunityTitle}" (${opportunityType}).

VERDICT: ${verdict === "borderline" ? "BORDERLINE — the user meets some criteria but falls short on others" : "INELIGIBLE — the user does not meet one or more key criteria"}

CRITERIA THE USER PASSED (${passingResponses.length}):
${passingResponses.length > 0 ? formatResponses(passingResponses) : "  None"}

CRITERIA THE USER DID NOT MEET (${negativeResponses.length}):
${formatResponses(negativeResponses)}

Writing rules (follow strictly):
- Short, plain sentences. Active voice. No em dashes, no semicolons, no rhetorical questions.
- No filler words: just, very, really, actually, certainly, basically, may, could.
- No buzzwords: craft, unlock, discover, pivotal, harness, groundbreaking, navigate, tailored, ensure.
- No transitional crutches: however, furthermore, moreover, in summary, in conclusion.
- Address the user directly using "you" and "your".

Your task:
1. Write a "summary": 2-3 short sentences. Name exactly what fell short and why. ${verdict === "borderline" ? "Acknowledge what they got right, then state the gaps plainly. End by telling them they can ask OppDate Guide (the AI assistant on the platform) to explore options." : "State the gaps plainly. Tell them eligibility results never block an application and the OppDate team reviews every submission."} Under 60 words.

2. Write one "concern" per criterion the user did NOT meet:
   - "criterion": 3-5 word label naming the specific gap (e.g. "Age Requirement", "Nationality Restriction", "Work Experience Gap")
   - "detail": one sentence, max 20 words. State what the criterion requires, what the user answered, and one concrete action they can take. Do not mention contacting anyone — suggest a tangible step (e.g. gaining experience, obtaining a document, checking eligibility requirements).

Return ONLY raw JSON — no markdown fences, no code blocks, no preamble, no explanation:
{
  "summary": "...",
  "concerns": [
    { "criterion": "...", "detail": "..." }
  ],
  "canProceed": true
}`;

      const anthropic = makeAnthropicClient(apiKey);

      try {
        const completion = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        });

        const rawText =
          completion.content[0]?.type === "text"
            ? completion.content[0].text
            : "{}";
        console.log('[eligibility-assessment] Claude raw response:', rawText.slice(0, 300))
        // Strip markdown code fences if Claude wraps the JSON
        const raw = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
        const parsed = JSON.parse(raw);

        return ok(reply, {
          summary:
            typeof parsed.summary === "string"
              ? parsed.summary
              : "Our team will review your application carefully.",
          concerns: Array.isArray(parsed.concerns)
            ? parsed.concerns.slice(0, 5)
            : [],
          canProceed: true,
        });
      } catch (err) {
        console.error('[eligibility-assessment] Claude call failed:', err)
        return ok(reply, {
          summary:
            "Our team will review your profile against this opportunity's requirements. You can still proceed with your application.",
          concerns: [],
          canProceed: true,
        });
      }
    },
  );

  // GET /api/v1/ai/recommendations?limit=6
  server.get(
    "/recommendations",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user as { id: string; isPremium?: boolean };
      const limit = Math.min(
        parseInt((request.query as { limit?: string }).limit || "6", 10),
        20,
      );

      // Fetch user preferences and premium status
      const [userRow] = await db
        .select({
          preferences: schema.users.preferences,
          isPremium: schema.users.isPremium,
        })
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1);

      if (!userRow?.isPremium) {
        return ok(
          reply,
          [],
          "Recommendations are available for Premium members.",
        );
      }

      const prefs = (userRow.preferences as Record<string, unknown>) ?? {};
      const prefCountry = ((prefs.country as string) || "").toLowerCase();
      const prefGoal = prefs.goal as string | undefined;
      const prefLevel = ((prefs.educationLevel as string) || "").toLowerCase();
      const prefField = ((prefs.fieldOfStudy as string) || "").toLowerCase();

      // Fetch IDs already applied to and already saved - exclude both from candidates
      const [applied, saved] = await Promise.all([
        db
          .select({ opportunityId: schema.applications.opportunityId })
          .from(schema.applications)
          .where(eq(schema.applications.userId, user.id)),
        db
          .select({ opportunityId: schema.savedOpportunities.opportunityId })
          .from(schema.savedOpportunities)
          .where(eq(schema.savedOpportunities.userId, user.id)),
      ]);

      const excludeIds = [
        ...new Set([
          ...applied.map((a) => a.opportunityId),
          ...saved.map((s) => s.opportunityId),
        ]),
      ];

      const now = new Date()
      const whereClause =
        excludeIds.length > 0
          ? and(
              eq(schema.opportunities.status, "published"),
              gt(schema.opportunities.deadline, now),
              notInArray(schema.opportunities.id, excludeIds),
            )
          : and(
              eq(schema.opportunities.status, "published"),
              gt(schema.opportunities.deadline, now),
            );

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
        .limit(100);

      const goalTypeMap: Record<string, string> = {
        scholarship: "scholarship",
        fellowship: "fellowship",
        internship: "internship",
        job: "entry_level_job",
        training: "training_bootcamp",
      };
      const prefType = prefGoal ? goalTypeMap[prefGoal] : undefined;

      // Score each opportunity - track which signals matched for "why this?" tooltip
      const scored = opps.map((opp) => {
        const matchReasons: string[] = [];
        let score = 0;

        if (prefCountry && opp.country.toLowerCase().includes(prefCountry)) {
          score += 2;
          matchReasons.push("country");
        }
        if (prefType && opp.type === prefType) {
          score += 2;
          matchReasons.push("goal");
        }
        if (
          prefLevel &&
          opp.eligibilityLevel &&
          opp.eligibilityLevel.toLowerCase().includes(prefLevel)
        ) {
          score += 1;
          matchReasons.push("level");
        }
        if (
          prefField &&
          opp.fieldOfStudy &&
          opp.fieldOfStudy.toLowerCase().includes(prefField)
        ) {
          score += 1;
          matchReasons.push("field");
        }

        const daysLeft = opp.deadline
          ? Math.max(
              0,
              Math.ceil((opp.deadline.getTime() - Date.now()) / 86400000),
            )
          : null;

        const fundingLabel = opp.awardValueUsd
          ? opp.awardValueUsd >= 10000000
            ? "Fully funded"
            : `USD ${(opp.awardValueUsd / 100).toLocaleString()}`
          : null;

        return {
          id: opp.id,
          slug: opp.slug,
          title: opp.title,
          institution: opp.institution,
          institutionLogoUrl: opp.institutionLogoUrl,
          country: opp.country,
          type: opp.type,
          summary: opp.summary,
          deadline: opp.deadline,
          eligibilityLevel: opp.eligibilityLevel,
          oppDateApply: opp.oppDateApply,
          fundingLabel,
          closesIn: daysLeft,
          matchScore: score,
          matchReasons,
        };
      });

      scored.sort(
        (a, b) =>
          b.matchScore - a.matchScore ||
          (a.deadline?.getTime() ?? 0) - (b.deadline?.getTime() ?? 0),
      );

      return ok(reply, scored.slice(0, limit));
    },
  );

  server.get("/", { preHandler: [requireAuth] }, async (_request, reply) => {
    return ok(reply, [], "AI Guide ready.");
  });
}
