export interface Funding {
  type: 'fully_funded' | 'partially_funded' | 'unpaid' | null
  label: string | null
  amount: number | null
  currency: string | null
  period: string | null
}

export interface OpportunityListItem {
  id: string
  isLocked?: boolean
  slug: string
  org: string
  orgInit: string
  institutionLogoUrl?: string | null
  country: string
  title: string
  type: string
  tags: string[]
  summary: string
  funding: Funding | null
  closes: string
  closesIn: number
  applyForMe: boolean
  applyDisabledNote?: string | null
  featured?: boolean
  urgent?: boolean
  description?: string
  eligibility?: string[]
  compliance?: 'A' | 'B' | null
  documents?: string[]
  fee?: { service: string; institution: string; total: string }
}
