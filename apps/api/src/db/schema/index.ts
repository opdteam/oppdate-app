import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  uuid,
  varchar,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── ENUMS ───────────────────────────────────────────────────────────────────

export const adPlacementZoneEnum = pgEnum('ad_placement_zone', [
  'listings_feed',
  'listing_page',
  'dashboard',
])

export const mentorshipSessionStatusEnum = pgEnum('mentorship_session_status', [
  'scheduled',
  'completed',
  'cancelled',
])

export const userRoleEnum = pgEnum('user_role', [
  'user',
  'staff_admin',
  'manager_admin',
  'super_admin',
])

export const opportunityTypeEnum = pgEnum('opportunity_type', [
  'internship',
  'scholarship',
  'training_bootcamp',
  'entry_level_job',
  'fellowship',
  'grant',
  'volunteering',
  'competition',
  'relocation',
])

export const opportunityStatusEnum = pgEnum('opportunity_status', [
  'draft',
  'published',
  'archived',
  'expired',
])

export const applicationStatusEnum = pgEnum('application_status', [
  'eligibility_screening',
  'document_collection',
  'awaiting_payment',
  'payment_confirmed',
  'submitted',
  'under_review',
  'decision_pending',
  'accepted',
  'rejected',
  'withdrawn',
])

export const documentTypeEnum = pgEnum('document_type', [
  'cv',
  'transcript',
  'certificate',
  'portfolio',
  'reference_letter',
  'personal_statement',
  'cover_letter',
  'statement_of_purpose',
  'essay',
  'passport_photo',
  'other',
])

export const threadTypeEnum = pgEnum('thread_type', [
  'oppdate_apply',
  'mentorship',
])

export const threadStatusEnum = pgEnum('thread_status', [
  'active',
  'awaiting_user',
  'awaiting_team',
  'resolved',
  'closed',
])

export const messageSenderEnum = pgEnum('message_sender', [
  'user',
  'team',
  'system',
])

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'processing',
  'succeeded',
  'failed',
  'refunded',
])

export const paymentGatewayEnum = pgEnum('payment_gateway', [
  'stripe',
  'flutterwave',
  'paystack',
  'lemon_squeezy',
])

export const meetingTypeEnum = pgEnum('meeting_type', [
  'google_meet',
  'zoom',
])

export const paymentPurposeEnum = pgEnum('payment_purpose', [
  'oppdate_apply',
  'consultation',
  'mentorship',
  'ebook',
  'premium',       // monthly subscription payment
])

export const guideSessionSentimentEnum = pgEnum('guide_session_sentiment', [
  'positive',
  'neutral',
  'concerned',
])

export const guideEligVerdictEnum = pgEnum('guide_elig_verdict', [
  'eligible',
  'borderline',
  'ineligible',
])

export const guideFlagReasonEnum = pgEnum('guide_flag_reason', [
  'inaccurate',
  'off_brand',
  'harmful',
  'other',
])

export const consultationStatusEnum = pgEnum('consultation_status', [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
])

export const mentorshipStatusEnum = pgEnum('mentorship_status', [
  'pending',
  'active',
  'completed',
  'cancelled',
])

export const ebookStatusEnum = pgEnum('ebook_status', [
  'published',
  'unpublished',
])

export const notificationTypeEnum = pgEnum('notification_type', [
  'application_status_change',
  'new_message',
  'payment_confirmed',
  'document_assistance',   // fired when payment confirmed + documents flagged needs_refinement/needs_creation
  'deadline_reminder',
  'consultation_confirmed',
  'mentorship_update',
  'saved_search_alert',
])

export const documentReadinessStatusEnum = pgEnum('document_readiness_status', [
  'ready',
  'needs_refinement',
  'needs_creation',
])

export const complianceCategoryEnum = pgEnum('compliance_category', [
  'A', // Representative submission permitted - OppDate submits on user's behalf
  'B', // Applicant final submission required - OppDate prepares, user submits
])

// ─── TABLES ───────────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    passwordHash: text('password_hash'),           // null for OAuth users
    role: userRoleEnum('role').notNull().default('user'),
    avatarUrl: text('avatar_url'),
    googleId: varchar('google_id', { length: 255 }),
    isEmailVerified: boolean('is_email_verified').notNull().default(false),
    isPremium: boolean('is_premium').notNull().default(false), // active Premium subscription ($12/month) — gates OppDate Apply and OppDate Guide
    premiumSince: timestamp('premium_since'),
    premiumUntil: timestamp('premium_until'), // null = no active subscription
    suspendedAt: timestamp('suspended_at'),
    lastLoginAt: timestamp('last_login_at'),
    preferences: jsonb('preferences').default({}), // onboarding answers: { role, interests, goal, country, nationality }
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex('users_email_idx').on(t.email),
    googleIdIdx: index('users_google_id_idx').on(t.googleId),
  })
)

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const opportunities = pgTable(
  'opportunities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 500 }).notNull(),
    slug: varchar('slug', { length: 600 }).notNull(),
    type: opportunityTypeEnum('type').notNull(),
    status: opportunityStatusEnum('status').notNull().default('draft'),
    institution: varchar('institution', { length: 500 }).notNull(),
    country: varchar('country', { length: 100 }).notNull(),
    region: varchar('region', { length: 100 }).notNull(),
    summary: text('summary').notNull(),
    description: text('description').notNull(),
    whoItsFor: text('who_its_for').notNull(),
    whatIsOffered: text('what_is_offered').notNull(),
    eligibilityCriteria: jsonb('eligibility_criteria').notNull().default([]),
    requiredDocuments: jsonb('required_documents').notNull().default([]),
    fieldOfStudy: varchar('field_of_study', { length: 255 }),
    eligibilityLevel: varchar('eligibility_level', { length: 100 }), // e.g. undergraduate, postgraduate, open
    awardValueUsd: integer('award_value_usd'), // in cents, null if not applicable
    csvImportBatchId: uuid('csv_import_batch_id'),
    deadline: timestamp('deadline').notNull(),
    applicationOpenDate: timestamp('application_open_date'),
    oppdateServiceFeeUsd: integer('oppdate_service_fee_usd').notNull().default(0),
    institutionFeeUsd: integer('institution_fee_usd').notNull().default(0),
    postSubmissionMessage: text('post_submission_message')
      .notNull()
      .default('Best of luck with your application! We will be in touch with updates.'),
    oppDateApply: boolean('oppdate_apply').notNull().default(false),   // enables OppDate Apply on this listing
    applyDisabledNote: text('apply_disabled_note'),                   // admin note shown when OppDate Apply is off
    complianceCategory: complianceCategoryEnum('compliance_category'), // A or B - required when oppDateApply is true
    featured: boolean('featured').notNull().default(false),
    pinned: boolean('pinned').notNull().default(false),
    institutionLogoUrl: text('institution_logo_url'),
    tags: jsonb('tags').notNull().default([]),
    viewCount: integer('view_count').notNull().default(0),
    applyCount: integer('apply_count').notNull().default(0),
    createdBy: uuid('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex('opportunities_slug_idx').on(t.slug),
    statusIdx: index('opportunities_status_idx').on(t.status),
    typeIdx: index('opportunities_type_idx').on(t.type),
    deadlineIdx: index('opportunities_deadline_idx').on(t.deadline),
    featuredIdx: index('opportunities_featured_idx').on(t.featured),
  })
)

export const applications = pgTable(
  'applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    opportunityId: uuid('opportunity_id').notNull().references(() => opportunities.id),
    status: applicationStatusEnum('status').notNull().default('eligibility_screening'),
    currentStep: integer('current_step').notNull().default(1),
    eligibilityResponses: jsonb('eligibility_responses').notNull().default([]),
    // Documents tracked via applicationDocuments table (replaces attachedDocuments jsonb)
    paymentId: uuid('payment_id'),
    // Human-readable reference ID generated at payment confirmation, e.g. OPP-240610-CHV
    referenceId: varchar('reference_id', { length: 20 }),
    // Representation Authorization Agreement signed during Step 3 before payment
    authorizationAgreementId: uuid('authorization_agreement_id'),
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    submittedAt: timestamp('submitted_at'),
    resolvedAt: timestamp('resolved_at'),
    adminNotes: text('admin_notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('applications_user_idx').on(t.userId),
    opportunityIdx: index('applications_opportunity_idx').on(t.opportunityId),
    statusIdx: index('applications_status_idx').on(t.status),
    referenceIdIdx: uniqueIndex('applications_reference_id_idx').on(t.referenceId),
    assignedToIdx: index('applications_assigned_to_idx').on(t.assignedTo),
  })
)

// Representation Authorization Agreement — signed by user during Step 3 before payment.
// Stored per application. Required before OppDate begins processing.
export const authorizationAgreements = pgTable(
  'authorization_agreements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id),
    agreementVersion: varchar('agreement_version', { length: 20 }).notNull(), // e.g. "1.0"
    complianceCategory: complianceCategoryEnum('compliance_category').notNull(),
    // Text of the checkbox confirmation the user ticked
    userApprovalRecord: text('user_approval_record').notNull(),
    // Populated when user explicitly approves the prepared submission package (Category B)
    submissionApprovalRecord: text('submission_approval_record'),
    submissionApprovedAt: timestamp('submission_approved_at'),
    signedAt: timestamp('signed_at').notNull().defaultNow(),
  },
  (t) => ({
    applicationIdx: index('authorization_application_idx').on(t.applicationId),
    userIdx: index('authorization_user_idx').on(t.userId),
  })
)

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    type: documentTypeEnum('type').notNull(),
    fileUrl: text('file_url').notNull(),
    fileSize: integer('file_size').notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    version: integer('version').notNull().default(1),
    previousVersionId: uuid('previous_version_id'),
    timesReused: integer('times_reused').notNull().default(0),
    tags: jsonb('tags').notNull().default([]),
    uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('documents_user_idx').on(t.userId),
    typeIdx: index('documents_type_idx').on(t.type),
  })
)

// Per-document record for an OppDate Apply application.
// Replaces the attachedDocuments jsonb on applications.
// Tracks readiness status set by user on Screen 2a.
export const applicationDocuments = pgTable(
  'application_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id').references(() => documents.id),  // null when needs_creation
    documentType: documentTypeEnum('document_type').notNull(),
    readinessStatus: documentReadinessStatusEnum('readiness_status').notNull().default('ready'),
    // Slot label shown to user (e.g. "Personal Statement", "CV")
    slotLabel: varchar('slot_label', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    applicationIdx: index('app_documents_application_idx').on(t.applicationId),
    documentIdx: index('app_documents_document_idx').on(t.documentId),
  })
)

export const messageThreads = pgTable(
  'message_threads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: threadTypeEnum('type').notNull(),
    referenceId: uuid('reference_id').notNull(), // applicationId or mentorshipId
    status: threadStatusEnum('status').notNull().default('active'),
    assignedTo: uuid('assigned_to').references(() => users.id),
    lastMessageAt: timestamp('last_message_at'),
    unreadByUser: integer('unread_by_user').notNull().default(0),
    unreadByTeam: integer('unread_by_team').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('threads_user_idx').on(t.userId),
    referenceIdx: index('threads_reference_idx').on(t.referenceId),
    statusIdx: index('threads_status_idx').on(t.status),
  })
)

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    threadId: uuid('thread_id').notNull().references(() => messageThreads.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id').notNull().references(() => users.id),
    senderType: messageSenderEnum('sender_type').notNull(),
    content: text('content').notNull(),
    isInternal: boolean('is_internal').notNull().default(false),
    attachments: jsonb('attachments').notNull().default([]),
    readAt: timestamp('read_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    threadIdx: index('messages_thread_idx').on(t.threadId),
    senderIdx: index('messages_sender_idx').on(t.senderId),
    createdIdx: index('messages_created_idx').on(t.createdAt),
  })
)

export const documentRequests = pgTable(
  'document_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    threadId: uuid('thread_id').notNull().references(() => messageThreads.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    threadIdx: index('doc_requests_thread_idx').on(t.threadId),
  })
)

export const documentRequestItems = pgTable(
  'document_request_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id').notNull().references(() => documentRequests.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    documentId: uuid('document_id').references(() => documents.id),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    requestIdx: index('doc_request_items_request_idx').on(t.requestId),
  })
)

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id),
    purpose: paymentPurposeEnum('purpose').notNull(),
    referenceId: uuid('reference_id').notNull(),
    gateway: paymentGatewayEnum('gateway').notNull(),
    gatewayPaymentId: varchar('gateway_payment_id', { length: 500 }).notNull(),
    amountUsd: integer('amount_usd').notNull(), // in cents
    status: paymentStatusEnum('status').notNull().default('pending'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('payments_user_idx').on(t.userId),
    referenceIdx: index('payments_reference_idx').on(t.referenceId),
    gatewayPaymentIdx: uniqueIndex('payments_gateway_payment_idx').on(t.gatewayPaymentId),
  })
)

export const consultations = pgTable(
  'consultations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id),
    durationMinutes: integer('duration_minutes').notNull(), // 30, 60, or 90
    priceUsd: integer('price_usd').notNull(), // in cents, locked at booking time
    scheduledAt: timestamp('scheduled_at').notNull(),
    status: consultationStatusEnum('status').notNull().default('pending'),
    meetingLink: text('meeting_link'),
    meetingType: meetingTypeEnum('meeting_type'),                     // google_meet or zoom, set by admin with link
    sessionId: uuid('session_id').references(() => consultationSessions.id),
    slotId: uuid('slot_id'),                                              // references consultation_slots(id) — not a FK to avoid circular ref
    paymentId: uuid('payment_id'),
    notes: text('notes'),
    calendarEventId: text('calendar_event_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  }
)

// Mentor roster -- admin-managed profiles users can choose from at enrolment
export const mentorProfiles = pgTable(
  'mentor_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id),              // linked admin user (optional)
    name: varchar('name', { length: 255 }).notNull(),
    specialty: varchar('specialty', { length: 255 }).notNull(),      // e.g. "Scholarship & Career Mentorship"
    bio: text('bio').notNull(),
    headshotUrl: text('headshot_url'),
    published: boolean('published').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  }
)

export const mentorshipProgrammes = pgTable(
  'mentorship_programmes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),              // e.g. "30-Day Guidance"
    description: text('description').notNull(),
    monthlyPriceUsd: integer('monthly_price_usd').notNull(),         // recurring monthly fee in cents
    headerImageUrl: text('header_image_url'),
    active: boolean('active').notNull().default(true),
    createdBy: uuid('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  }
)

export const mentorships = pgTable(
  'mentorships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id),
    mentorProfileId: uuid('mentor_profile_id').references(() => mentorProfiles.id),
    programmeId: uuid('programme_id').references(() => mentorshipProgrammes.id),
    status: mentorshipStatusEnum('status').notNull().default('pending'),
    threadId: uuid('thread_id').references(() => messageThreads.id),
    paymentId: uuid('payment_id'),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  }
)

export const mentorshipSessions = pgTable(
  'mentorship_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mentorshipId: uuid('mentorship_id').notNull().references(() => mentorships.id, { onDelete: 'cascade' }),
    scheduledAt: timestamp('scheduled_at').notNull(),
    status: mentorshipSessionStatusEnum('status').notNull().default('scheduled'),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    mentorshipIdx: index('mentorship_sessions_mentorship_idx').on(t.mentorshipId),
  })
)

export const ebooks = pgTable(
  'ebooks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 500 }).notNull(),
    slug: varchar('slug', { length: 600 }).notNull(),
    author: varchar('author', { length: 255 }).notNull(),
    pageCount: integer('page_count'),
    category: varchar('category', { length: 255 }),
    description: text('description').notNull(),
    whatsInside: jsonb('whats_inside').notNull().default([]),        // chapter list [{title, description}]
    coverImageUrl: text('cover_image_url').notNull(),
    fileUrl: text('file_url').notNull(),
    fileFormat: varchar('file_format', { length: 10 }).notNull().default('pdf'),
    lsVariantId: varchar('ls_variant_id', { length: 255 }),          // Lemon Squeezy product variant ID
    priceUsd: integer('price_usd').notNull(),                        // standard price in cents
    premiumPriceUsd: integer('premium_price_usd'),                   // lower member price in cents
    status: ebookStatusEnum('status').notNull().default('unpublished'),
    purchaseCount: integer('purchase_count').notNull().default(0),
    downloadCount: integer('download_count').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex('ebooks_slug_idx').on(t.slug),
    statusIdx: index('ebooks_status_idx').on(t.status),
  })
)

export const ebookPurchases = pgTable(
  'ebook_purchases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id),
    ebookId: uuid('ebook_id').notNull().references(() => ebooks.id),
    paymentId: varchar('payment_id', { length: 255 }).notNull(),
    downloadCount: integer('download_count').notNull().default(0),
    lastReadAt: timestamp('last_read_at'),
    readingProgress: integer('reading_progress').notNull().default(0),
    purchasedAt: timestamp('purchased_at').notNull().defaultNow(),
  },
  (t) => ({
    userEbookIdx: uniqueIndex('ebook_purchases_user_ebook_idx').on(t.userId, t.ebookId),
  })
)

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    read: boolean('read').notNull().default(false),
    referenceId: uuid('reference_id'),
    referenceType: varchar('reference_type', { length: 100 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('notifications_user_idx').on(t.userId),
    readIdx: index('notifications_read_idx').on(t.read),
  })
)

export const avatarPresets = pgTable('avatar_presets', {
  id: uuid('id').primaryKey().defaultRandom(),
  url: text('url').notNull(),
  label: varchar('label', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const adminAuditLog = pgTable(
  'admin_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id').notNull().references(() => users.id),
    action: varchar('action', { length: 255 }).notNull(),
    targetType: varchar('target_type', { length: 100 }).notNull(),
    targetId: uuid('target_id'),
    metadata: jsonb('metadata').notNull().default({}),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    adminIdx: index('audit_admin_idx').on(t.adminId),
    targetIdx: index('audit_target_idx').on(t.targetId),
  })
)

export const savedOpportunities = pgTable(
  'saved_opportunities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    opportunityId: uuid('opportunity_id').notNull().references(() => opportunities.id, { onDelete: 'cascade' }),
    savedAt: timestamp('saved_at').notNull().defaultNow(),
  },
  (t) => ({
    userOpportunityIdx: uniqueIndex('saved_opportunities_user_opportunity_idx').on(t.userId, t.opportunityId),
    userIdx: index('saved_opportunities_user_idx').on(t.userId),
  })
)

export const savedSearches = pgTable(
  'saved_searches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    filters: jsonb('filters').notNull().default({}), // stored filter combination
    alertsEnabled: boolean('alerts_enabled').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('saved_searches_user_idx').on(t.userId),
  })
)

export const consultationSessions = pgTable(
  'consultation_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    durationMinutes: integer('duration_minutes').notNull(), // 30, 60, or 90
    priceUsd: integer('price_usd').notNull(),               // in cents
    active: boolean('active').notNull().default(true),
    groupKey: varchar('group_key', { length: 100 }),        // groups duration variants of the same offering
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    activeIdx: index('consultation_sessions_active_idx').on(t.active),
    groupKeyIdx: index('consultation_sessions_group_key_idx').on(t.groupKey),
  })
)

export const consultationSlots = pgTable(
  'consultation_slots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull().references(() => consultationSessions.id),
    startsAt: timestamp('starts_at').notNull(),
    claimed: boolean('claimed').notNull().default(false),
    consultationId: uuid('consultation_id'),               // set when a booking claims this slot
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    sessionClaimedIdx: index('consultation_slots_session_claimed_idx').on(t.sessionId, t.claimed),
    startsAtIdx: index('consultation_slots_starts_at_idx').on(t.startsAt),
  })
)

export const consultationPricing = pgTable(
  'consultation_pricing',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    durationMinutes: integer('duration_minutes').notNull(), // 30, 60, or 90
    priceUsd: integer('price_usd').notNull(), // in cents
    description: text('description'),                       // tier description set by admin
    active: boolean('active').notNull().default(true),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    durationIdx: uniqueIndex('consultation_pricing_duration_idx').on(t.durationMinutes),
  })
)

export const adPlacements = pgTable(
  'ad_placements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    zone: adPlacementZoneEnum('zone').notNull(),
    active: boolean('active').notNull().default(false),
    provider: varchar('provider', { length: 100 }).notNull().default('google_ads'),
    config: jsonb('config').notNull().default({}), // ad unit IDs, sizes, etc.
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    zoneIdx: uniqueIndex('ad_placements_zone_idx').on(t.zone),
  })
)

export const platformConfig = pgTable(
  'platform_config',
  {
    key: varchar('key', { length: 255 }).primaryKey(),
    value: jsonb('value').notNull(),
    updatedBy: uuid('updated_by').references(() => users.id),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  }
)

// ─── RELATIONS ────────────────────────────────────────────────────────────────

export const consultationSessionsRelations = relations(consultationSessions, ({ many }) => ({
  slots: many(consultationSlots),
  consultations: many(consultations),
}))

export const consultationSlotsRelations = relations(consultationSlots, ({ one }) => ({
  session: one(consultationSessions, { fields: [consultationSlots.sessionId], references: [consultationSessions.id] }),
}))

export const usersRelations = relations(users, ({ many }) => ({
  applications: many(applications),
  documents: many(documents),
  threads: many(messageThreads),
  payments: many(payments),
  notifications: many(notifications),
  ebookPurchases: many(ebookPurchases),
  consultations: many(consultations),
  mentorships: many(mentorships),
  savedOpportunities: many(savedOpportunities),
  savedSearches: many(savedSearches),
}))

export const opportunitiesRelations = relations(opportunities, ({ many }) => ({
  applications: many(applications),
  savedBy: many(savedOpportunities),
}))

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  user: one(users, { fields: [applications.userId], references: [users.id] }),
  opportunity: one(opportunities, { fields: [applications.opportunityId], references: [opportunities.id] }),
  authorizationAgreement: one(authorizationAgreements, { fields: [applications.authorizationAgreementId], references: [authorizationAgreements.id] }),
  applicationDocuments: many(applicationDocuments),
}))

export const authorizationAgreementsRelations = relations(authorizationAgreements, ({ one }) => ({
  application: one(applications, { fields: [authorizationAgreements.applicationId], references: [applications.id] }),
  user: one(users, { fields: [authorizationAgreements.userId], references: [users.id] }),
}))

export const applicationDocumentsRelations = relations(applicationDocuments, ({ one }) => ({
  application: one(applications, { fields: [applicationDocuments.applicationId], references: [applications.id] }),
  document: one(documents, { fields: [applicationDocuments.documentId], references: [documents.id] }),
}))

export const messageThreadsRelations = relations(messageThreads, ({ one, many }) => ({
  user: one(users, { fields: [messageThreads.userId], references: [users.id] }),
  messages: many(messages),
  assignedAdmin: one(users, { fields: [messageThreads.assignedTo], references: [users.id] }),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  thread: one(messageThreads, { fields: [messages.threadId], references: [messageThreads.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}))

export const mentorProfilesRelations = relations(mentorProfiles, ({ one, many }) => ({
  user: one(users, { fields: [mentorProfiles.userId], references: [users.id] }),
  mentorships: many(mentorships),
}))

export const mentorshipProgrammesRelations = relations(mentorshipProgrammes, ({ many }) => ({
  mentorships: many(mentorships),
}))

export const mentorshipsRelations = relations(mentorships, ({ one, many }) => ({
  user: one(users, { fields: [mentorships.userId], references: [users.id] }),
  mentorProfile: one(mentorProfiles, { fields: [mentorships.mentorProfileId], references: [mentorProfiles.id] }),
  programme: one(mentorshipProgrammes, { fields: [mentorships.programmeId], references: [mentorshipProgrammes.id] }),
  sessions: many(mentorshipSessions),
}))

export const mentorshipSessionsRelations = relations(mentorshipSessions, ({ one }) => ({
  mentorship: one(mentorships, { fields: [mentorshipSessions.mentorshipId], references: [mentorships.id] }),
}))

export const savedOpportunitiesRelations = relations(savedOpportunities, ({ one }) => ({
  user: one(users, { fields: [savedOpportunities.userId], references: [users.id] }),
  opportunity: one(opportunities, { fields: [savedOpportunities.opportunityId], references: [opportunities.id] }),
}))

export const savedSearchesRelations = relations(savedSearches, ({ one }) => ({
  user: one(users, { fields: [savedSearches.userId], references: [users.id] }),
}))

// ─── GUIDE SESSION LOGS ───────────────────────────────────────────────────────

export const guideSessionLogs = pgTable('guide_session_logs', {
  id:               uuid('id').primaryKey().defaultRandom(),
  userId:           uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  opportunitySlug:  text('opportunity_slug'),
  startedAt:        timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt:          timestamp('ended_at', { withTimezone: true }),
  messageCount:     integer('message_count').notNull().default(0),
  eligTriggered:    boolean('elig_triggered').notNull().default(false),
  eligVerdict:      guideEligVerdictEnum('elig_verdict'),
  sentiment:        guideSessionSentimentEnum('sentiment').notNull().default('neutral'),
  messages:         jsonb('messages').notNull().default([]),
  flagCount:        integer('flag_count').notNull().default(0),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const guideResponseFlags = pgTable('guide_response_flags', {
  id:           uuid('id').primaryKey().defaultRandom(),
  sessionId:    uuid('session_id').notNull().references(() => guideSessionLogs.id, { onDelete: 'cascade' }),
  messageIndex: integer('message_index').notNull(),
  reason:       guideFlagReasonEnum('reason').notNull(),
  notes:        text('notes'),
  adminId:      uuid('admin_id').notNull().references(() => users.id),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const guideSessionLogsRelations = relations(guideSessionLogs, ({ one, many }) => ({
  user:  one(users, { fields: [guideSessionLogs.userId], references: [users.id] }),
  flags: many(guideResponseFlags),
}))

export const guideResponseFlagsRelations = relations(guideResponseFlags, ({ one }) => ({
  session: one(guideSessionLogs, { fields: [guideResponseFlags.sessionId], references: [guideSessionLogs.id] }),
  admin:   one(users, { fields: [guideResponseFlags.adminId], references: [users.id] }),
}))

// ─── OPPORTUNITY EVENTS ───────────────────────────────────────────────────────

export const opportunityEvents = pgTable(
  'opportunity_events',
  {
    id:             uuid('id').primaryKey().defaultRandom(),
    opportunityId:  uuid('opportunity_id').notNull().references(() => opportunities.id, { onDelete: 'cascade' }),
    eventType:      varchar('event_type', { length: 50 }).notNull(),
    userId:         uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    occurredAt:     timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  t => ({
    oppIdx:  index('opportunity_events_opp_idx').on(t.opportunityId, t.occurredAt),
    typeIdx: index('opportunity_events_type_idx').on(t.eventType, t.occurredAt),
  })
)

export const opportunityEventsRelations = relations(opportunityEvents, ({ one }) => ({
  opportunity: one(opportunities, { fields: [opportunityEvents.opportunityId], references: [opportunities.id] }),
  user:        one(users, { fields: [opportunityEvents.userId], references: [users.id] }),
}))
