import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const { slug } = params
  let html = readFileSync(join(process.cwd(), 'public/blog/post/index.html'), 'utf-8')

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? ''
  const webUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // Inject slug and API base for client-side fetch
  const inject = `<script>window.__BLOG_SLUG=${JSON.stringify(slug)};window.__apiBase=${JSON.stringify(apiBase)};</script>`
  html = html.replace('<script>', inject + '<script>')

  // Fetch post server-side for SEO meta tags
  if (apiBase) {
    try {
      const res = await fetch(`${apiBase}/api/v1/blog/${slug}`, { next: { revalidate: 60 } })
      if (res.ok) {
        const { data } = await res.json()
        if (data) {
          const title = data.metaTitle || data.title
          const description = data.metaDescription || data.excerpt || ''
          const ogImage = data.coverImageUrl || ''

          html = html.replace(
            '<title>OppDate - Blog</title>',
            `<title>${escapeHtml(title)} - OppDate Blog</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${webUrl}/blog/${slug}">
${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}">` : ''}
<meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
${ogImage ? `<meta name="twitter:image" content="${escapeHtml(ogImage)}">` : ''}`
          )
        }
      }
    } catch {}
  }

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
