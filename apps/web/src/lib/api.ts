import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import { clearUserToken, clearAdminToken, setUserToken } from '@/lib/token'

/**
 * Extracts a human-readable error message from an Axios error.
 * Prefers the `error` field from the API response body, falls back to the
 * HTTP status text, then a generic fallback.
 */
export function extractApiError(err: unknown, fallback = 'An unexpected error occurred.'): string {
  if (err instanceof AxiosError) {
    const body = err.response?.data
    if (typeof body?.error === 'string' && body.error) return body.error
    if (typeof body?.message === 'string' && body.message) return body.message
    if (err.response?.status) {
      const status = err.response.status
      if (status === 400) return 'Invalid request. Please check your input and try again.'
      if (status === 403) return 'You do not have permission to perform this action.'
      if (status === 404) return 'The requested resource was not found.'
      if (status === 409) return 'A conflict occurred. The resource may already exist.'
      if (status === 422) return 'The server could not process your request. Please check your input.'
      if (status === 429) return 'Too many requests. Please slow down and try again.'
      if (status >= 500) return 'A server error occurred. Please try again later.'
    }
    if (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED') {
      return 'Cannot reach the server. Please check your connection and try again.'
    }
  }
  return fallback
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach JWT from localStorage -- admin token takes priority when on an /admin page
api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config
  const url = config.url ?? ''
  const isAdminPage = window.location.pathname.startsWith('/admin')
  const isAdminRoute = url.includes('/admin') || isAdminPage
  const token = isAdminRoute
    ? (localStorage.getItem('oppdate_admin_token') ?? localStorage.getItem('oppdate_token'))
    : localStorage.getItem('oppdate_token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

// Global error handling -- on 401, attempt one silent refresh then retry.
// If the refresh also fails, clear token and redirect to login.
let isRefreshing = false
let pendingRetries: Array<(token: string | null) => void> = []

function drainQueue(token: string | null) {
  pendingRetries.forEach((cb) => cb(token))
  pendingRetries = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (typeof window === 'undefined') return Promise.reject(error)
    if (error.response?.status !== 401) return Promise.reject(error)

    const originalConfig: AxiosRequestConfig & { _retried?: boolean } = error.config
    const path = window.location.pathname
    const isAuthPage =
      path.startsWith('/auth') ||
      path.startsWith('/admin/login') ||
      path.startsWith('/admin/forgot') ||
      path.startsWith('/admin/reset') ||
      path.startsWith('/admin/accept-invite')

    // Never retry on auth pages or the refresh endpoint itself
    if (isAuthPage || originalConfig.url?.includes('/auth/refresh')) {
      return Promise.reject(error)
    }

    // Admin routes have no refresh path - clear and redirect immediately
    if (path.startsWith('/admin')) {
      clearAdminToken()
      window.location.replace('/admin/login')
      return Promise.reject(error)
    }

    // Already retried this request - give up
    if (originalConfig._retried) {
      clearUserToken()
      window.location.replace('/auth/login')
      return Promise.reject(error)
    }

    originalConfig._retried = true

    // If a refresh is already in-flight, queue this retry behind it
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRetries.push((token) => {
          if (!token) return reject(error)
          if (originalConfig.headers) originalConfig.headers['Authorization'] = `Bearer ${token}`
          resolve(api(originalConfig))
        })
      })
    }

    isRefreshing = true

    try {
      const res = await api.post<{ data: { accessToken: string } }>('/api/v1/auth/refresh')
      const newToken = res.data?.data?.accessToken
      if (!newToken) throw new Error('no token in refresh response')

      setUserToken(newToken)
      isRefreshing = false
      drainQueue(newToken)

      if (originalConfig.headers) originalConfig.headers['Authorization'] = `Bearer ${newToken}`
      return api(originalConfig)
    } catch {
      isRefreshing = false
      drainQueue(null)
      clearUserToken()
      window.location.replace('/auth/login')
      return Promise.reject(error)
    }
  }
)
