// Token helpers -- keep localStorage and the middleware-readable cookie in sync.
// The middleware runs server-side and can only read cookies, so we must mirror
// every token write/clear to a cookie with the same name.

// 2 hours - a safe ceiling that covers any realistic SESSION_IDLE_TIMEOUT.
// The real session gate is server-side (refresh token expiresAt in the DB).
const COOKIE_MAX_AGE = 60 * 60 * 2

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`
}

export function setUserToken(token: string) {
  localStorage.setItem('oppdate_token', token)
  setCookie('oppdate_token', token)
}

export function clearUserToken() {
  localStorage.removeItem('oppdate_token')
  clearCookie('oppdate_token')
}

export function setAdminToken(token: string) {
  localStorage.setItem('oppdate_admin_token', token)
  setCookie('oppdate_admin_token', token)
}

export function clearAdminToken() {
  localStorage.removeItem('oppdate_admin_token')
  localStorage.removeItem('oppdate_admin')
  clearCookie('oppdate_admin_token')
}
