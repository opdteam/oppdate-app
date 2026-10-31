import { differenceInCalendarDays, parseISO, format } from 'date-fns'
import type { OpportunityListItem, Funding } from '@/components/opportunities/types'

// Shape returned by GET /api/v1/opportunities (raw DB columns from the API)
export interface ApiOpportunity {
  id: string
  isLocked?: boolean
  title: string
  slug: string
  type: string
  institution: string
  country: string
  region: string
  summary: string
  deadline: string            // ISO datetime string
  oppdateServiceFeeUsd: number // cents
  institutionFeeUsd: number    // cents
  awardValueUsd: number | null // cents
  tags: string[]
  featured: boolean
  pinned: boolean
  // Detail-only fields (present on GET /api/v1/opportunities/:slug)
  description?: string
  eligibilityCriteria?: unknown[]
  requiredDocuments?: unknown[]
  eligibilityLevel?: string | null
  complianceCategory?: 'A' | 'B' | null
  oppDateApply?: boolean
  whoItsFor?: string
  whatIsOffered?: string
  institutionLogoUrl?: string | null
}

// Standard paginated response from the opportunities list endpoint
export interface ApiCursorListResponse {
  success: boolean
  data: ApiOpportunity[]
  total: number
  page: number
  limit: number
  hasMore: boolean
  nextCursor?: string | null
}

// Single opportunity detail response
export interface ApiDetailResponse {
  success: boolean
  data: ApiOpportunity
}

const TYPE_LABELS: Record<string, string> = {
  internship:        'Internship',
  scholarship:       'Scholarship',
  training_bootcamp: 'Training',
  training:          'Training',
  entry_level_job:   'Graduate role',
  job:               'Job',
  fellowship:        'Fellowship',
  grant:             'Grant',
  volunteering:      'Volunteering',
  competition:       'Competition',
  relocation:        'Relocation',
}

function deriveOrgInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('')
}

function deriveFunding(item: ApiOpportunity): Funding | null {
  if (!item.awardValueUsd) return null
  return {
    type:     'fully_funded',
    label:    item.awardValueUsd ? `$${(item.awardValueUsd / 100).toLocaleString()}` : null,
    amount:   item.awardValueUsd ? item.awardValueUsd / 100 : null,
    currency: 'USD',
    period:   null,
  }
}

function formatFee(cents: number): string {
  return cents === 0 ? 'Free' : `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function adaptOpportunity(item: ApiOpportunity): OpportunityListItem {
  // Locked stub — only id and isLocked are present
  if (item.isLocked) {
    return {
      id:        item.id,
      isLocked:  true,
      slug:      item.id,
      org:       '',
      orgInit:   '',
      country:   '',
      title:     '',
      type:      '',
      tags:      [],
      summary:   '',
      funding:   null,
      closes:    '',
      closesIn:  0,
      applyForMe: false,
    }
  }

  const deadline   = parseISO(item.deadline)
  const closesIn   = differenceInCalendarDays(deadline, new Date())
  const closes     = format(deadline, 'EEE, d MMM yyyy')
  const funding    = deriveFunding(item)
  const serviceCents = item.oppdateServiceFeeUsd ?? 0
  const instCents    = item.institutionFeeUsd ?? 0

  return {
    id:         item.id,
    isLocked:   false,
    slug:       item.slug,
    org:        item.institution,
    orgInit:    deriveOrgInitials(item.institution),
    institutionLogoUrl: item.institutionLogoUrl ?? null,
    country:    item.country,
    title:      item.title,
    type:       TYPE_LABELS[item.type] ?? item.type,
    tags:       item.tags ?? [],
    summary:    item.summary,
    funding,
    closes,
    closesIn,
    applyForMe: item.oppDateApply ?? false,
    featured:   item.featured,
    urgent:     closesIn >= 0 && closesIn <= 7,
    description: item.description,
    eligibility: Array.isArray(item.eligibilityCriteria)
      ? (item.eligibilityCriteria as { question: string }[]).map(e => e.question)
      : undefined,
    compliance:  item.complianceCategory ?? null,
    documents:   Array.isArray(item.requiredDocuments)
      ? item.requiredDocuments.map(d => typeof d === 'string' ? d : String(d))
      : undefined,
    fee: (serviceCents > 0 || instCents > 0)
      ? {
          service:     formatFee(serviceCents),
          institution: formatFee(instCents),
          total:       formatFee(serviceCents + instCents),
        }
      : undefined,
  }
}
