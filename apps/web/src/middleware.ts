import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication as a regular user
const USER_ROUTES = [
  '/dashboard',
  '/applications',
  '/messages',
  '/profile',
  '/credentials',
  '/opportunities',
  '/notifications',
  '/onboarding',
  '/apply',
  '/help',
  '/services/consultations/book',
  '/services/ebooks/checkout',
  '/services/ebooks/library',
  '/services/ebooks/reader',
  '/services',
]

// Routes that require authentication as an admin
const ADMIN_ROUTES = ['/admin']

// Public routes — no auth required
const PUBLIC_ROUTES = [
  '/services/consultations',
  '/services/mentorship',
  '/services/mentorship/enrol',
  '/services/ebooks',
  '/services/apply',
  '/pricing',
  '/admin/login',
  '/admin/forgot-password',
  '/admin/reset-password',
  '/admin/accept-invite',
]

// Routes only for guests (clear token and let through so user can re-authenticate)
const GUEST_ONLY_ROUTES = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password']

// Public subdomain hosts
const PUBLIC_HOSTS = ['oppdate.app', 'www.oppdate.app']

// Pages that live on oppdate.app (public subdomain)
const PUBLIC_SUBDOMAIN_PATHS = [
  '/services/consultations',
  '/services/mentorship',
  '/services/ebooks',
  '/services/apply',
  '/pricing',
]

function getSubdomain(request: NextRequest): 'dashboard' | 'admin' | 'public' {
  const host = request.headers.get('host') ?? ''
  if (host.startsWith('dashboard.')) return 'dashboard'
  if (host.startsWith('admin.')) return 'admin'
  return 'public'
}

function getDashboardHost(host: string): string {
  if (host === 'oppdate.app' || host === 'www.oppdate.app') return 'dashboard.oppdate.app'
  // localhost: keep as-is (no subdomain enforcement in dev)
  return host
}

function getAdminHost(host: string): string {
  if (host === 'oppdate.app' || host === 'www.oppdate.app') return 'admin.oppdate.app'
  if (host.startsWith('dashboard.')) return host.replace('dashboard.', 'admin.')
  return host
}

function getPublicHost(host: string): string {
  if (host.startsWith('dashboard.')) return host.replace('dashboard.', '')
  if (host.startsWith('admin.')) return host.replace('admin.', '')
  return host
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') ?? ''
  const subdomain = getSubdomain(request)
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1')

  // Skip subdomain enforcement in local development
  if (!isLocalhost) {
    // --- Subdomain enforcement ---

    if (subdomain === 'public') {
      // Admin paths on public host → redirect to admin subdomain
      if (pathname.startsWith('/admin')) {
        const url = request.nextUrl.clone()
        url.host = getAdminHost(host)
        // Strip /admin prefix so admin.oppdate.app/dashboard not /admin/dashboard
        url.pathname = pathname.replace(/^\/admin/, '') || '/dashboard'
        return NextResponse.redirect(url)
      }

      // User app paths on public host → redirect to dashboard subdomain
      const isDashboardPath =
        USER_ROUTES.some((r) => pathname.startsWith(r)) ||
        GUEST_ONLY_ROUTES.some((r) => pathname.startsWith(r))

      if (isDashboardPath) {
        const url = request.nextUrl.clone()
        url.host = getDashboardHost(host)
        return NextResponse.redirect(url)
      }
    }

    if (subdomain === 'dashboard') {
      // Root of dashboard subdomain: token exists → serve /dashboard, else → /auth/login
      if (pathname === '/') {
        const userToken = request.cookies.get('oppdate_token')?.value
        const url = request.nextUrl.clone()
        url.pathname = userToken ? '/dashboard' : '/auth/login'
        return NextResponse.rewrite(url)
      }

      // Admin paths on dashboard → redirect to admin subdomain, strip /admin prefix
      if (pathname.startsWith('/admin')) {
        const url = request.nextUrl.clone()
        url.host = getAdminHost(host)
        url.pathname = pathname.replace(/^\/admin/, '') || '/dashboard'
        return NextResponse.redirect(url)
      }

      // Public-only paths on dashboard subdomain:
      // - RSC prefetch requests (_rsc param): serve in place (no cross-origin redirect)
      // - Direct browser navigation: redirect to oppdate.app
      const isPublicOnlyPath = PUBLIC_SUBDOMAIN_PATHS.some(
        (r) => pathname === r || (r !== '/' && pathname.startsWith(r))
      )
      if (isPublicOnlyPath) {
        const isRscPrefetch = request.nextUrl.searchParams.has('_rsc') ||
          request.headers.get('rsc') === '1' ||
          request.headers.get('next-router-prefetch') === '1'
        if (!isRscPrefetch) {
          const url = request.nextUrl.clone()
          url.host = getPublicHost(host)
          url.searchParams.delete('_rsc')
          return NextResponse.redirect(url)
        }
      }
    }

    if (subdomain === 'admin') {
      // On admin subdomain, rewrite paths to /admin/* internally
      // e.g. admin.oppdate.app/dashboard → serves /admin/dashboard
      // e.g. admin.oppdate.app/login → serves /admin/login
      // e.g. admin.oppdate.app/ → redirect to /admin/login
      if (pathname === '/') {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/login'
        return NextResponse.rewrite(url)
      }
      if (!pathname.startsWith('/admin')) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin' + pathname
        return NextResponse.rewrite(url)
      }
    }
  }

  // --- Auth guards ---

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )
  const isUserRoute =
    !isPublic && USER_ROUTES.some((route) => pathname.startsWith(route))
  const isAdminRoute =
    !isPublic && ADMIN_ROUTES.some((route) => pathname.startsWith(route))
  const isGuestOnly = GUEST_ONLY_ROUTES.some((route) => pathname.startsWith(route))

  const userToken = request.cookies.get('oppdate_token')?.value
  const adminToken = request.cookies.get('oppdate_admin_token')?.value

  if (isUserRoute && !userToken) {
    const loginUrl = new URL('/auth/login', request.url)
    if (!isLocalhost) loginUrl.host = getDashboardHost(host)
    loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  if (isAdminRoute && !adminToken) {
    if (!isLocalhost && subdomain === 'admin') {
      // On admin subdomain: rewrite to /admin/login so URL stays as admin.oppdate.app/login
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/admin/login'
      const bare = pathname.replace(/^\/admin/, '')
      if (bare) loginUrl.searchParams.set('redirect', bare + request.nextUrl.search)
      return NextResponse.rewrite(loginUrl)
    }
    const loginUrl = new URL('/admin/login', request.url)
    if (!isLocalhost) loginUrl.host = getAdminHost(host)
    loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  if (isGuestOnly && userToken) {
    const response = NextResponse.next()
    response.cookies.set('oppdate_token', '', { path: '/', maxAge: 0, sameSite: 'lax' })
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/|_ds/|assets/|.*\\.jsx|.*\\.js$|.*\\.css$|.*\\.webp|.*\\.jpg|.*\\.png|.*\\.jpeg|.*\\.svg|.*\\.woff2?).*)'],
}
