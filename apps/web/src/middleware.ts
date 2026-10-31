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
  '/services',
  '/notifications',
  '/onboarding',
  '/apply',
]

// Routes that require authentication as an admin
const ADMIN_ROUTES = ['/admin']

// Public sub-routes under otherwise-protected prefixes
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

// Routes only for guests (redirect to dashboard if logged in as a regular user)
const GUEST_ONLY_ROUTES = ['/auth/login', '/auth/register', '/auth/forgot-password']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const userToken = request.cookies.get('oppdate_token')?.value
  const adminToken = request.cookies.get('oppdate_admin_token')?.value

  const isPublic = PUBLIC_ROUTES.some((route) => pathname === route)
  const isUserRoute = !isPublic && USER_ROUTES.some((route) => pathname.startsWith(route))
  const isAdminRoute = !isPublic && ADMIN_ROUTES.some((route) => pathname.startsWith(route))
  const isGuestOnly = GUEST_ONLY_ROUTES.some((route) => pathname.startsWith(route))

  // No user token on a protected user route - redirect to user login
  if (isUserRoute && !userToken) {
    const loginUrl = new URL('/auth/login', request.url)
    const search = request.nextUrl.search
    loginUrl.searchParams.set('redirect', pathname + search)
    return NextResponse.redirect(loginUrl)
  }

  // No admin token on a protected admin route - redirect to admin login
  if (isAdminRoute && !adminToken) {
    const loginUrl = new URL('/admin/login', request.url)
    const search = request.nextUrl.search
    loginUrl.searchParams.set('redirect', pathname + search)
    return NextResponse.redirect(loginUrl)
  }

  // Logged-in regular user hitting guest-only pages - clear their session and let them through
  // so they can log in as a different account without being bounced to the dashboard.
  // (admin session does NOT affect this check - sessions are fully independent)
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
