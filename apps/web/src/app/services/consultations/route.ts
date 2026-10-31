import { readFileSync } from 'fs'
import { join } from 'path'

export function GET() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  let html = readFileSync(join(process.cwd(), 'public', 'services', 'consultations', 'index.html'), 'utf-8')
  html = html.replace('<div id="om-app"></div>', `<script>window.__apiBase=${JSON.stringify(apiBase)};</script><div id="om-app"></div>`)
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
