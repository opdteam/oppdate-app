import { FastifyInstance } from 'fastify'
import { db, schema } from '../db'
import { eq, and, desc, ne, count, notInArray } from 'drizzle-orm'
import { ok, created, notFound, badRequest, forbidden } from '../utils/response'
import { sql } from 'drizzle-orm'
import { requireAuth, requireRole } from '../middleware/auth'
import { broadcastToUser } from './messaging'
import { enqueueEmail, enqueueNotification } from '../jobs/queue'
import { applicationStatusEmail } from '../utils/email'

// Valid status transitions -- maps current status to allowed next statuses
const VALID_TRANSITIONS: Record<string, string[]> = {
  eligibility_screening: ['document_collection', 'withdrawn'],
  document_collection: ['awaiting_payment', 'withdrawn'],
  awaiting_payment: ['payment_confirmed', 'withdrawn'],
  payment_confirmed: ['submitted', 'withdrawn'],
  submitted: ['under_review', 'withdrawn'],
  under_review: ['decision_pending', 'withdrawn'],
  decision_pending: ['accepted', 'rejected', 'withdrawn'],
  // Terminal states -- no further transitions
  accepted: [],
  rejected: [],
  withdrawn: [],
}

export async function applicationRoutes(server: FastifyInstance) {
  // GET /api/v1/applications -get user's applications
  server.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const payload = request.user as { id: string }

    const applications = await db
      .select({
        id: schema.applications.id,
        status: schema.applications.status,
        referenceId: schema.applications.referenceId,
        opportunityId: schema.applications.opportunityId,
        submittedAt: schema.applications.submittedAt,
        createdAt: schema.applications.createdAt,
        updatedAt: schema.applications.updatedAt,
        opportunityTitle: schema.opportunities.title,
        opportunityInstitution: schema.opportunities.institution,
        opportunityType: schema.opportunities.type,
        opportunityCountry: schema.opportunities.country,
        opportunityEligibilityLevel: schema.opportunities.eligibilityLevel,
        opportunityDeadline: schema.opportunities.deadline,
        opportunityLogoUrl: schema.opportunities.institutionLogoUrl,
      })
      .from(schema.applications)
      .leftJoin(schema.opportunities, eq(schema.applications.opportunityId, schema.opportunities.id))
      .where(and(
        eq(schema.applications.userId, payload.id),
        notInArray(schema.applications.status, ['withdrawn', 'eligibility_screening', 'document_collection', 'awaiting_payment'] as any[]),
      ))
      .orderBy(desc(schema.applications.createdAt))

    const [{ withdrawnCount }] = await db
      .select({ withdrawnCount: count() })
      .from(schema.applications)
      .where(and(
        eq(schema.applications.userId, payload.id),
        eq(schema.applications.status, 'withdrawn' as any),
      ))

    return ok(reply, { applications, withdrawnCount })
  })

  // GET /api/v1/applications/:id
  server.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const payload = request.user as { id: string; role: string }
    const isAdmin = ['staff_admin', 'manager_admin', 'super_admin'].includes(payload.role)

    const [row] = await db
      .select({
        id: schema.applications.id,
        userId: schema.applications.userId,
        opportunityId: schema.applications.opportunityId,
        status: schema.applications.status,
        referenceId: schema.applications.referenceId,
        currentStep: schema.applications.currentStep,
        paymentId: schema.applications.paymentId,
        adminNotes: schema.applications.adminNotes,
        eligibilityResponses: schema.applications.eligibilityResponses,
        submittedAt: schema.applications.submittedAt,
        createdAt: schema.applications.createdAt,
        updatedAt: schema.applications.updatedAt,
        opportunityTitle: schema.opportunities.title,
        opportunityInstitution: schema.opportunities.institution,
        opportunityType: schema.opportunities.type,
        opportunityCountry: schema.opportunities.country,
        opportunityDeadline: schema.opportunities.deadline,
        complianceCategory: schema.opportunities.complianceCategory,
        assignedTo: schema.applications.assignedTo,
        assigneeName: sql<string | null>`(SELECT name FROM users WHERE id = ${schema.applications.assignedTo})`,
      })
      .from(schema.applications)
      .leftJoin(schema.opportunities, eq(schema.applications.opportunityId, schema.opportunities.id))
      .where(eq(schema.applications.id, id))
      .limit(1)

    if (!row) return notFound(reply, 'Application')
    if (!isAdmin && row.userId !== payload.id) return forbidden(reply)

    return ok(reply, row)
  })

  // POST /api/v1/applications/start - fetch opportunity data to begin the apply flow
  // No DB record is created here. The application is only persisted after payment (POST /submit).
  server.post('/start', { preHandler: [requireAuth] }, async (request, reply) => {
    const payload = request.user as { id: string }
    const { opportunityId } = request.body as { opportunityId: string }

    const [opportunity] = await db
      .select()
      .from(schema.opportunities)
      .where(eq(schema.opportunities.id, opportunityId))
      .limit(1)

    if (!opportunity) return notFound(reply, 'Opportunity')

    db.insert(schema.opportunityEvents)
      .values({ opportunityId: opportunity.id, eventType: 'apply_start', userId: payload.id })
      .catch(() => {})

    // Check for an existing application so the frontend can resume at the right step
    const [existing] = await db
      .select({ id: schema.applications.id, status: schema.applications.status })
      .from(schema.applications)
      .where(and(
        eq(schema.applications.userId, payload.id),
        eq(schema.applications.opportunityId, opportunityId),
      ))
      .limit(1)

    return ok(reply, {
      eligibilityCriteria: opportunity.eligibilityCriteria,
      requiredDocuments: opportunity.requiredDocuments,
      opportunityTitle: opportunity.title,
      opportunityType: opportunity.type,
      opportunityInstitution: opportunity.institution,
      opportunityCountry: opportunity.country,
      oppdateServiceFeeUsd: opportunity.oppdateServiceFeeUsd,
      institutionFeeUsd: opportunity.institutionFeeUsd,
      complianceCategory: opportunity.complianceCategory,
      ...(existing ? { applicationId: existing.id, status: existing.status, resumed: true } : {}),
    })
  })

  // POST /api/v1/applications/submit - create the application record after all steps are complete
  // Called immediately before payment. Creates the DB record, document slots, and sets status to awaiting_payment.
  server.post('/submit', { preHandler: [requireAuth] }, async (request, reply) => {
    const payload = request.user as { id: string }
    const { opportunityId, eligibilityResponses, documentSlots, authorizationAgreement } = request.body as {
      opportunityId: string
      eligibilityResponses: Array<{
        questionIndex: number
        question: string
        answer: string
        selectedOptionIndex: number
      }>
      documentSlots: Array<{
        documentType: string
        slotLabel: string
        readinessStatus: 'ready' | 'needs_refinement' | 'needs_creation'
        documentId?: string
      }>
      authorizationAgreement?: {
        complianceCategory: 'A' | 'B'
        userApprovalRecord: string
        agreementVersion: string
      }
    }

    const [opportunity] = await db
      .select({ id: schema.opportunities.id, title: schema.opportunities.title })
      .from(schema.opportunities)
      .where(eq(schema.opportunities.id, opportunityId))
      .limit(1)

    if (!opportunity) return notFound(reply, 'Opportunity')

    // Prevent duplicate submissions for the same opportunity
    const [existing] = await db
      .select({ id: schema.applications.id, status: schema.applications.status })
      .from(schema.applications)
      .where(and(
        eq(schema.applications.userId, payload.id),
        eq(schema.applications.opportunityId, opportunityId)
      ))
      .limit(1)

    if (existing) {
      // Already submitted - return the existing application so payment can proceed
      return ok(reply, { applicationId: existing.id, status: existing.status, resumed: true })
    }

    const [application] = await db
      .insert(schema.applications)
      .values({
        userId: payload.id,
        opportunityId,
        status: 'awaiting_payment',
        currentStep: 3,
        eligibilityResponses: eligibilityResponses ?? [],
      })
      .returning()

    if (documentSlots && documentSlots.length > 0) {
      await db.insert(schema.applicationDocuments).values(
        documentSlots.map((slot) => ({
          applicationId: application.id,
          documentId: slot.documentId ?? null,
          documentType: slot.documentType as any,
          readinessStatus: slot.readinessStatus,
          slotLabel: slot.slotLabel,
        }))
      )
    }

    let agreementId: string | undefined
    if (authorizationAgreement) {
      const [agreement] = await db
        .insert(schema.authorizationAgreements)
        .values({
          applicationId: application.id,
          userId: payload.id,
          agreementVersion: authorizationAgreement.agreementVersion,
          complianceCategory: authorizationAgreement.complianceCategory as any,
          userApprovalRecord: authorizationAgreement.userApprovalRecord,
        })
        .returning()
      agreementId = agreement.id
      await db
        .update(schema.applications)
        .set({ authorizationAgreementId: agreement.id })
        .where(eq(schema.applications.id, application.id))
    }

    await db
      .update(schema.opportunities)
      .set({ applyCount: sql`${schema.opportunities.applyCount} + 1` })
      .where(eq(schema.opportunities.id, opportunityId))

    return created(reply, { applicationId: application.id, status: application.status, authorizationAgreementId: agreementId ?? null })
  })

  // PATCH /api/v1/applications/:id/status -- admin updates application status
  server.patch(
    '/:id/status',
    { preHandler: [requireRole('staff_admin', 'manager_admin', 'super_admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { status, adminNotes } = request.body as {
        status: string
        adminNotes?: string
      }

      // Fetch current application to validate transition
      const [current] = await db
        .select({ id: schema.applications.id, status: schema.applications.status, userId: schema.applications.userId })
        .from(schema.applications)
        .where(eq(schema.applications.id, id))
        .limit(1)

      if (!current) return notFound(reply, 'Application')

      const allowed = VALID_TRANSITIONS[current.status]
      if (!allowed || !allowed.includes(status)) {
        return badRequest(reply, `Cannot transition from "${current.status}" to "${status}".`)
      }

      const [application] = await db
        .update(schema.applications)
        .set({
          status: status as any,
          ...(adminNotes && { adminNotes }),
          ...(status === 'submitted' && { submittedAt: new Date() }),
          updatedAt: new Date(),
        })
        .where(eq(schema.applications.id, id))
        .returning()

      if (!application) return notFound(reply, 'Application')

      broadcastToUser(application.userId, {
        type: 'application_status_change',
        applicationId: id,
        status,
      })

      // Fetch user preferences alongside name/email for preference-gated notifications
      const [appUser] = await db
        .select({ name: schema.users.name, email: schema.users.email, preferences: schema.users.preferences })
        .from(schema.users)
        .where(eq(schema.users.id, application.userId))
        .limit(1)

      const prefs = (appUser?.preferences as Record<string, unknown>) ?? {}

      // Send in-app notification (gated on inapp_pipeline preference, default on)
      if (prefs.inapp_pipeline !== false) {
        await enqueueNotification({
          userId: application.userId,
          type: 'application_update',
          title: 'Application status updated',
          body: `Your application ${application.referenceId || id} has been updated to: ${status.replace(/_/g, ' ')}.`,
          referenceId: id,
          referenceType: 'application',
        })
      }

      // Send email notification (gated on email_app_status preference, default on)
      if (appUser && prefs.email_app_status !== false) {
        const email = applicationStatusEmail(appUser.name, application.referenceId || id, status)
        email.to = appUser.email
        await enqueueEmail(email)
      }

      return ok(reply, application, 'Application status updated.')
    }
  )

  // POST /api/v1/applications/:id/withdraw -- user withdraws their application
  server.post(
    '/:id/withdraw',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const payload = request.user as { id: string }

      const [current] = await db
        .select({ id: schema.applications.id, status: schema.applications.status, userId: schema.applications.userId })
        .from(schema.applications)
        .where(and(eq(schema.applications.id, id), eq(schema.applications.userId, payload.id)))
        .limit(1)

      if (!current) return notFound(reply, 'Application')

      const terminal = ['accepted', 'rejected', 'withdrawn']
      if (terminal.includes(current.status)) {
        return badRequest(reply, 'This application cannot be withdrawn.')
      }

      const [application] = await db
        .update(schema.applications)
        .set({ status: 'withdrawn' as any, updatedAt: new Date() })
        .where(eq(schema.applications.id, id))
        .returning()

      return ok(reply, application, 'Application withdrawn.')
    }
  )
}
