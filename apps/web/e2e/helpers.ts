import { type Page, type APIRequestContext } from '@playwright/test'

const API = 'http://localhost:4000/api/v1'

export interface TestUser {
  id: string
  email: string
  name: string
  token: string
}

let cachedUser: TestUser | null = null

export async function getTestUser(request: APIRequestContext): Promise<TestUser> {
  if (cachedUser) return cachedUser

  const email = `e2e-test-${Date.now()}@oppdate.test`
  const password = 'TestPassword123!'

  // Try register; if the user somehow exists, login instead
  let res = await request.post(`${API}/auth/register`, {
    data: { email, password, name: 'E2E Test User' },
  })

  if (res.status() === 409) {
    res = await request.post(`${API}/auth/login`, {
      data: { email, password },
    })
  }

  if (!res.ok()) {
    const text = await res.text()
    throw new Error(`Auth failed (${res.status()}): ${text}`)
  }

  const body = await res.json()
  const data = body.data
  cachedUser = {
    id: data.user.id,
    email: data.user.email,
    name: data.user.name,
    token: data.accessToken,
  }
  return cachedUser
}

export async function authenticatePage(page: Page, token: string) {
  // Navigate to a page first so localStorage is available for the domain
  await page.goto('/')
  await page.evaluate((t) => {
    localStorage.setItem('oppdate_token', t)
  }, token)
}

export async function getFirstOpportunity(request: APIRequestContext): Promise<{ id: string; slug: string; title: string }> {
  const res = await request.get(`${API}/opportunities?page=1&limit=1`)
  const body = await res.json()
  const opp = body.data?.opportunities?.[0] ?? body.data?.[0]
  if (!opp) throw new Error('No opportunities found in database -- seed at least one')
  return { id: opp.id, slug: opp.slug, title: opp.title }
}

export async function apiPost(request: APIRequestContext, path: string, token: string, data?: Record<string, unknown>) {
  return request.post(`${API}${path}`, {
    data,
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function apiGet(request: APIRequestContext, path: string, token: string) {
  return request.get(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}
