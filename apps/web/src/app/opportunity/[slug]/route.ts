import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function getTemplate() {
  return readFileSync(join(process.cwd(), 'public/opportunity/index.html'), 'utf-8')
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface OppPreview {
  title: string
  slug: string
  type: string
  institution: string
  country: string
  summary: string
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

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const slug = params.slug
  const opp = await fetchPreview(slug)

  let html = getTemplate()

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? ''
  const slugScript = `<script>window.__OPP_SLUG=${JSON.stringify(slug)};${apiBase ? `window.__apiBase=${JSON.stringify(apiBase)};` : ''}</script>`

  if (opp) {
    const plainSummary = stripHtml(opp.summary)
    const description = plainSummary.length > 160 ? plainSummary.slice(0, 157) + '...' : plainSummary
    const typeLabel = opp.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    const title = `${opp.title} | OppDate`
    const url = `${APP_URL}/opportunity/${opp.slug}`

    const ogTags = [
      `<title>${escAttr(title)}</title>`,
      `<meta name="description" content="${escAttr(description)}" />`,
      `<meta property="og:type" content="article" />`,
      `<meta property="og:site_name" content="OppDate" />`,
      `<meta property="og:title" content="${escAttr(opp.title)}" />`,
      `<meta property="og:description" content="${escAttr(description)}" />`,
      `<meta property="og:url" content="${escAttr(url)}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${escAttr(opp.title)}" />`,
      `<meta name="twitter:description" content="${escAttr(`${typeLabel} at ${opp.institution} - ${opp.country}. ${description}`)}" />`,
    ].join('\n')

    html = html.replace('<title>Opportunity | OppDate</title>', ogTags)
  }

  html = html.replace('<script>', slugScript + '<script>')

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
