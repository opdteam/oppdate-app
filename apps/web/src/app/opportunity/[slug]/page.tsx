import type { Metadata } from 'next'
import { OpportunityPreview } from './OpportunityPreview'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface OppPreview {
  id: string
  title: string
  slug: string
  type: string
  institution: string
  institutionLogoUrl: string | null
  country: string
  region: string
  summary: string
  deadline: string
  awardValueUsd: number | null
  fieldOfStudy: string | null
  eligibilityLevel: string | null
  oppDateApply: boolean
  whoItsFor: string
  whatIsOffered: string
}

async function fetchPreview(slug: string): Promise<OppPreview | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/opportunities/${slug}/preview`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.data ?? null
  } catch {
    return null
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const opp = await fetchPreview(params.slug)
  if (!opp) {
    return { title: 'Opportunity Not Found | OppDate' }
  }

  const plainSummary = stripHtml(opp.summary)
  const description = plainSummary.length > 160
    ? plainSummary.slice(0, 157) + '...'
    : plainSummary
  const typeLabel = opp.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const title = `${opp.title} | OppDate`

  return {
    title,
    description,
    openGraph: {
      type: 'article',
      siteName: 'OppDate',
      title: opp.title,
      description,
      url: `${APP_URL}/opportunity/${opp.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: opp.title,
      description: `${typeLabel} at ${opp.institution} - ${opp.country}. ${description}`,
    },
  }
}

export default async function OpportunityPage({ params }: { params: { slug: string } }) {
  const opp = await fetchPreview(params.slug)

  if (!opp) {
    return <OpportunityPreview opp={null} appUrl={APP_URL} />
  }

  return <OpportunityPreview opp={opp} appUrl={APP_URL} />
}
