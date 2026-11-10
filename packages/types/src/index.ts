// ─── USER & AUTH ──────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'staff_admin' | 'manager_admin' | 'super_admin'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatarUrl?: string
  isPremium: boolean
  premiumSince?: Date
  premiumUntil?: Date
  createdAt: Date
  updatedAt: Date
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

// ─── OPPORTUNITIES ────────────────────────────────────────────────────────────

export type OpportunityType =
  | 'internship'
  | 'scholarship'
  | 'training_bootcamp'
  | 'entry_level_job'
  | 'fellowship'
  | 'grant'
  | 'volunteering'
  | 'competition'
  | 'relocation'

export type OpportunityStatus = 'draft' | 'published' | 'archived' | 'expired'

export interface OpportunityFee {
  oppdateServiceFee: number   // in USD cents
  institutionFee: number      // in USD cents
  totalFee: number            // sum of both, computed
  currency: 'USD'
}

export interface Opportunity {
  id: string
  title: string
  slug: string
  type: OpportunityType
  status: OpportunityStatus
  institution: string
  country: string
  region: string
  summary: string
  description: string         // rich text / markdown
  whoItsFor: string
  whatIsOffered: string
  eligibilityCriteria: EligibilityCriterion[]
  requiredDocuments: RequiredDocument[]
  deadline: Date
  applicationOpenDate?: Date
  fee: OpportunityFee
  postSubmissionMessage: string
  oppDateApply: boolean
  applyDisabledNote?: string
  complianceCategory?: ComplianceCategory
  featured: boolean
  pinned: boolean
  tags: string[]
  viewCount: number
  applyCount: number
  createdBy: string           // admin user id
  createdAt: Date
  updatedAt: Date
}

export interface EligibilityCriterionOption {
  text: string
  score: number               // 0 = pass, negative = penalty (e.g. -30 borderline, -100 hard fail)
}

export interface EligibilityCriterion {
  question: string
  options: EligibilityCriterionOption[]
}

export interface RequiredDocument {
  id: string
  name: string                // e.g. "CV / Resume"
  description?: string
  acceptedFormats: string[]   // e.g. ["pdf", "docx"]
  maxSizeMb: number
  required: boolean
}

// ─── APPLICATIONS ─────────────────────────────────────────────────────────────

export type ApplicationStatus =
  | 'eligibility_screening'
  | 'document_collection'
  | 'awaiting_payment'
  | 'payment_confirmed'
  | 'submitted'
  | 'under_review'
  | 'decision_pending'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'

export type DocumentReadinessStatus = 'ready' | 'needs_refinement' | 'needs_creation'
export type ComplianceCategory = 'A' | 'B'

export interface Application {
  id: string
  userId: string
  opportunityId: string
  opportunity?: Opportunity
  status: ApplicationStatus
  paymentId?: string
  referenceId?: string
  authorizationAgreementId?: string
  submittedAt?: Date
  resolvedAt?: Date
  adminNotes?: string
  createdAt: Date
  updatedAt: Date
}

export interface ApplicationDocument {
  id: string
  applicationId: string
  documentId?: string           // null when readinessStatus is 'needs_creation'
  documentType: DocumentType
  readinessStatus: DocumentReadinessStatus
  slotLabel: string
  createdAt: Date
  updatedAt: Date
}

export interface AuthorizationAgreement {
  id: string
  applicationId: string
  userId: string
  agreementVersion: string
  complianceCategory: ComplianceCategory
  userApprovalRecord: string
  submissionApprovalRecord?: string
  submissionApprovedAt?: Date
  signedAt: Date
}

// ─── DOCUMENTS / CREDENTIAL LIBRARY ──────────────────────────────────────────

export type DocumentType =
  | 'cv'
  | 'transcript'
  | 'certificate'
  | 'portfolio'
  | 'reference_letter'
  | 'personal_statement'
  | 'cover_letter'
  | 'statement_of_purpose'
  | 'essay'
  | 'passport_photo'
  | 'other'

export interface Document {
  id: string
  userId: string
  name: string
  type: DocumentType
  fileUrl: string
  fileSize: number            // in bytes
  mimeType: string
  version: number
  previousVersionId?: string
  timesReused: number
  tags: string[]
  uploadedAt: Date
  updatedAt: Date
}

// ─── MESSAGING ────────────────────────────────────────────────────────────────

export type ThreadType = 'oppdate_apply' | 'mentorship'
export type ThreadStatus = 'active' | 'awaiting_user' | 'awaiting_team' | 'resolved' | 'closed'
export type MessageSender = 'user' | 'team' | 'system'

export interface MessageThread {
  id: string
  userId: string
  type: ThreadType
  referenceId: string         // applicationId or mentorshipId
  status: ThreadStatus
  assignedTo?: string         // admin user id
  lastMessageAt?: Date
  unreadByUser: number
  unreadByTeam: number
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  id: string
  threadId: string
  senderId: string
  senderType: MessageSender
  content: string
  attachments: MessageAttachment[]
  readAt?: Date
  createdAt: Date
}

export interface MessageAttachment {
  id: string
  name: string
  fileUrl: string
  fileSize: number
  mimeType: string
}

export type DocumentRequestItemStatus = 'pending' | 'uploaded' | 'verified'

export interface DocumentRequestItem {
  id: string
  requestId: string
  label: string
  documentId?: string | null
  status: DocumentRequestItemStatus
  createdAt: Date
  updatedAt: Date
}

export interface DocumentRequest {
  id: string
  threadId: string
  createdBy: string
  createdAt: Date
  items: DocumentRequestItem[]
}

// ─── ELIGIBILITY ─────────────────────────────────────────────────────────────

export type EligibilityTier = 'eligible' | 'borderline' | 'ineligible'

export interface EligibilityCriterionOption {
  text: string
  score: number       // 0 = neutral, negative = penalty (-30 soft, -100 hard disqualifier)
}

export interface EligibilityCriterion {
  question: string
  options: EligibilityCriterionOption[]
  weightRationale?: string   // admin-visible note from AI explaining score assignment
}

export interface EligibilityAnswer {
  question: string
  answer: string
  score: number
}

export interface EligibilityCheck {
  id: string
  userId: string
  listingId: string
  answers: EligibilityAnswer[]
  score: number       // sum of all answer scores
  tier: EligibilityTier
  checkedAt: Date
}

export interface EligibilityResult {
  score: number
  tier: EligibilityTier
}

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'
export type PaymentGateway = 'stripe' | 'flutterwave' | 'paystack' | 'lemon_squeezy'
export type PaymentPurpose = 'oppdate_apply' | 'consultation' | 'mentorship' | 'ebook' | 'premium'

export interface Payment {
  id: string
  userId: string
  purpose: PaymentPurpose
  referenceId: string         // applicationId, bookingId, etc.
  gateway: PaymentGateway
  gatewayPaymentId: string    // stripe payment intent id, flutterwave ref, etc.
  amount: number              // in USD cents
  currency: 'USD'
  status: PaymentStatus
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

// ─── CONSULTATIONS ────────────────────────────────────────────────────────────

export type ConsultationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'
export type ConsultationDuration = 30 | 60 | 90
export type MeetingType = 'google_meet' | 'zoom'

export interface Consultation {
  id: string
  userId: string
  duration: ConsultationDuration
  scheduledAt: Date
  status: ConsultationStatus
  meetingLink?: string        // set by admin
  meetingType?: MeetingType   // google_meet or zoom, set with link
  paymentId?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface ConsultationPricingTier {
  id: string
  durationMinutes: ConsultationDuration
  priceUsd: number            // in USD cents
  description?: string
  active: boolean
}

// ─── MENTORSHIP ───────────────────────────────────────────────────────────────

export type MentorshipStatus = 'pending' | 'active' | 'completed' | 'cancelled'

export interface MentorProfile {
  id: string
  userId?: string             // linked admin user
  name: string
  specialty: string           // e.g. "Scholarship & Career Mentorship"
  bio: string
  headshotUrl?: string
  published: boolean
  createdAt: Date
  updatedAt: Date
}

export interface MentorshipProgramme {
  id: string
  title: string               // e.g. "30-Day Guidance"
  description: string
  monthlyPriceUsd: number     // recurring monthly fee in cents
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Mentorship {
  id: string
  userId: string
  mentorProfileId?: string
  mentorProfile?: MentorProfile
  programmeId?: string
  status: MentorshipStatus
  threadId?: string           // messaging thread
  paymentId?: string
  startedAt?: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// ─── EBOOKS ───────────────────────────────────────────────────────────────────

export type EBookStatus = 'published' | 'unpublished'

export interface EBookChapter {
  title: string
  description?: string
}

export interface EBook {
  id: string
  title: string
  slug: string
  author: string
  pageCount?: number
  category?: string
  description: string
  whatsInside: EBookChapter[]  // chapter list
  coverImageUrl: string
  fileUrl: string              // PDF or ePub
  fileFormat: 'pdf' | 'epub'
  priceUsd: number             // standard price in USD cents
  premiumPriceUsd?: number     // lower member price in USD cents
  status: EBookStatus
  purchaseCount: number
  downloadCount: number
  createdAt: Date
  updatedAt: Date
}

export interface EBookPurchase {
  id: string
  userId: string
  ebookId: string
  paymentId: string
  downloadCount: number
  lastReadAt?: Date
  readingProgress: number     // 0-100 percentage
  purchasedAt: Date
}

// ─── AI / ELIGIBILITY ─────────────────────────────────────────────────────────

export interface EligibilityResult {
  eligible: boolean
  score: number               // sum of option scores (0 = eligible, negative = borderline/ineligible)
  concerns: { criterion: string; detail: string }[]
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'application_status_change'
  | 'new_message'
  | 'payment_confirmed'
  | 'document_assistance'
  | 'deadline_reminder'
  | 'consultation_confirmed'
  | 'mentorship_update'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  referenceId?: string
  referenceType?: string
  createdAt: Date
}

// ─── API RESPONSE HELPERS ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface ApiError {
  success: false
  error: string
  code: string
  statusCode: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
