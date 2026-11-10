// Shared React Query fetch functions and query keys.
// Import these in any component that needs cached API data.

import { api } from '@/lib/api'

// ---- Shared API types ----

export interface ApiUser {
  id: string
  name: string
  email: string
  isPremium: boolean
  premiumUntil?: string | null
  avatarUrl?: string | null
  isEmailVerified: boolean
  passwordHash?: string | null
  preferences?: Record<string, unknown> | null
}

export interface ApiApplication {
  id: string
  status: string
  opportunityId: string
  referenceId: string | null
  submittedAt: string | null
  createdAt: string
  updatedAt: string
  opportunityTitle: string | null
  opportunityInstitution: string | null
  opportunityType: string | null
  opportunityCountry: string | null
  opportunityEligibilityLevel: string | null
  opportunityDeadline: string | null
  opportunityCoverImageUrl: string | null
  opportunityLogoUrl?: string | null
}

export interface ApiSavedOpportunity {
  id: string
  opportunityId: string
  slug: string | null
  title: string | null
  institution: string | null
  country: string | null
  type: string | null
  deadline: string | null
  institutionLogoUrl?: string | null
}

export interface ApiDocument {
  id: string
  type: string
  name: string
  mimeType: string | null
  fileSize: number | null
  timesReused: number
  version: number
  uploadedAt: string
}

export interface ApiNotification {
  id: string
  type: string
  read: boolean
  title: string
  body: string
  createdAt: string
}

export interface ApiThread {
  id: string
  type: string
  referenceId: string
  lastMessageAt: string | null
  unreadByUser: number
  status: string
  assignedTo?: string | null
  opportunityTitle?: string | null
  opportunityCountry?: string | null
  lastMessagePreview?: string | null
}

export interface ApiSavedSearch {
  id: string
  name: string
  filters: Record<string, unknown>
  alertsEnabled: boolean
  createdAt: string
}

export interface ApiEbook {
  id: string
  slug: string
  title: string
  author: string
  category: string | null
  description: string
  whatsInside: { title: string; description?: string }[]
  coverImageUrl: string | null
  priceUsd: number
  premiumPriceUsd: number | null
  effectivePrice: number
  pageCount: number | null
  fileFormat: string
  purchaseCount: number
  status: string
  createdAt: string
}

export interface ApiRecommendation {
  id: string
  slug: string
  title: string
  institution: string
  institutionLogoUrl: string | null
  country: string
  type: string
  summary: string
  deadline: string | null
  eligibilityLevel: string | null
  oppDateApply: boolean
  fundingLabel: string | null
  closesIn: number | null
  matchScore: number
  matchReasons: Array<'country' | 'goal' | 'level' | 'field'>
}

export interface ApiPurchase {
  id: string
  ebookId: string
  readingProgress: number
  downloadCount: number
  purchasedAt: string
  lastReadAt: string | null
  title: string | null
  author: string | null
  category: string | null
  coverImageUrl: string | null
  fileUrl: string | null
  pageCount: number | null
  slug: string | null
}

// ---- Query keys ----

export const keys = {
  me:                 ['me']                        as const,
  applications:       ['applications']              as const,
  saved:              ['saved-opportunities']       as const,
  documents:          ['documents']                 as const,
  notifications:      ['notifications']             as const,
  notificationsAll:   ['notifications', 'all']     as const,
  threads:            ['threads']                   as const,
  ebooks:             ['ebooks']                   as const,
  ebookLibrary:       ['ebooks', 'library']        as const,
  savedSearches:      ['saved-searches']            as const,
  recommendations:    ['recommendations']            as const,
}

// ---- Typed fetchers ----

export const fetchers = {
  me: (): Promise<ApiUser> =>
    api.get('/api/v1/auth/me').then(r => r.data?.data),

  applications: (): Promise<{ applications: ApiApplication[]; withdrawnCount: number }> =>
    api.get('/api/v1/applications').then(r => r.data?.data ?? { applications: [], withdrawnCount: 0 }),

  saved: (): Promise<ApiSavedOpportunity[]> =>
    api.get('/api/v1/saved-opportunities').then(r => r.data?.data ?? []),

  documents: (): Promise<ApiDocument[]> =>
    api.get('/api/v1/documents').then(r => r.data?.data ?? []),

  notifications: (): Promise<ApiNotification[]> =>
    api.get('/api/v1/notifications?limit=5').then(r => r.data?.data?.notifications ?? []),

  notificationsAll: (): Promise<ApiNotification[]> =>
    api.get('/api/v1/notifications?limit=50').then(r => r.data?.data?.notifications ?? []),

  threads: (): Promise<ApiThread[]> =>
    api.get('/api/v1/messages/threads').then(r => r.data?.data ?? []),

  ebooks: (): Promise<ApiEbook[]> =>
    api.get('/api/v1/ebooks').then(r => r.data?.data ?? []),

  ebookLibrary: (): Promise<ApiPurchase[]> =>
    api.get('/api/v1/ebooks/library').then(r => r.data?.data ?? []),

  savedSearches: (): Promise<ApiSavedSearch[]> =>
    api.get('/api/v1/saved-searches').then(r => r.data?.data ?? []),

  recommendations: (limit = 6): Promise<ApiRecommendation[]> =>
    api.get(`/api/v1/ai/recommendations?limit=${limit}`).then(r => r.data?.data ?? []),
}
