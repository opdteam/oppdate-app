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
]

// Routes that require authentication as an admin
const ADMIN_ROUTES = ['/admin']

// Public routes - no auth required
const PUBLIC_ROUTES = [
  '/services/consultations',
  '/services/mentorship',
  '/services/mentorship/enrol',
  '/services/ebooks',
  '/services/apply',
  '/pricing',
  '/legal',
  '/admin/login',
  '/admin/forgot-password',
  '/admin/reset-password',
  '/admin/accept-invite',
]

// Routes only for guests (clear token and let through so user can re-authenticate)
const GUEST_ONLY_ROUTES = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const userToken = request.cookies.get('oppdate_token')?.value
  const adminToken = request.cookies.get('oppdate_admin_token')?.value

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )
  const isUserRoute = !isPublic && USER_ROUTES.some((route) => pathname.startsWith(route))
  const isAdminRoute = !isPublic && ADMIN_ROUTES.some((route) => pathname.startsWith(route))
  const isGuestOnly = GUEST_ONLY_ROUTES.some((route) => pathname.startsWith(route))

  if (isUserRoute && !userToken) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  if (isAdminRoute && !adminToken) {
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  // Logged-in user hitting guest-only pages - clear session so they can re-authenticate
  if (isGuestOnly && userToken) {
    const response = NextResponse.next()
    response.cookies.set('oppdate_token', '', { path: '/', maxAge: 0, sameSite: 'lax' })
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/|_ds/|assets/|.*\.jsx|.*\.js$|.*\.css$|.*\.webp|.*\.jpg|.*\.png|.*\.jpeg|.*\.svg|.*\.woff2?).*)'],
}
