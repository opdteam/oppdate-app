import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export function GET() {
  let html = readFileSync(join(process.cwd(), 'public/legal/privacy/index.html'), 'utf-8')
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? ''
  if (apiBase) {
    html = html.replace('<script>', `<script>window.__apiBase=${JSON.stringify(apiBase)};</script><script>`)
  }
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
