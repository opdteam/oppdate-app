'use client'

import { useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { setUserToken, clearUserToken } from '@/lib/token'

// How often to silently refresh while the tab is visible.
// Access tokens live 15 minutes; refresh 2 minutes early to avoid races.
const REFRESH_INTERVAL_MS = 13 * 60 * 1000

async function silentRefresh(): Promise<boolean> {
  try {
    const res = await api.post<{ data: { accessToken: string } }>('/api/v1/auth/refresh')
    const token = res.data?.data?.accessToken
    if (token) {
      setUserToken(token)
      return true
    }
    return false
  } catch {
    return false
  }
}

function redirectToLogin() {
  clearUserToken()
  window.location.replace('/auth/login')
}

// Keeps the user session alive for as long as the tab is visible/active.
// When the tab hides or closes the interval stops, starting the idle clock
// (controlled server-side by SESSION_IDLE_TIMEOUT, default 1h).
// On tab return or page reload, immediately attempts a refresh so the user
// is seamlessly restored if still within the idle window.
export function useSessionKeepAlive() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    function startInterval() {
      if (intervalRef.current) return
      intervalRef.current = setInterval(async () => {
        const ok = await silentRefresh()
        if (!ok) redirectToLogin()
      }, REFRESH_INTERVAL_MS)
    }

    function stopInterval() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    const onVisibility = async () => {
      if (document.visibilityState === 'visible') {
        // Tab became visible - attempt immediate refresh in case token expired while hidden
        const ok = await silentRefresh()
        if (!ok) {
          redirectToLogin()
          return
        }
        startInterval()
      } else {
        // Tab hidden or closed - stop refreshing so idle clock begins
        stopInterval()
      }
    }

    const onPageHide = () => {
      stopInterval()
    }

    // On mount: immediately refresh to restore session (handles page reload and new tab opens)
    silentRefresh().then((ok) => {
      if (!ok) {
        // No valid refresh token - session already expired; let the API's 401 handler
        // deal with the next request rather than forcing an immediate redirect here,
        // since the user may be loading a public page.
        return
      }
      if (document.visibilityState === 'visible') {
        startInterval()
      }
    })

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)

    return () => {
      stopInterval()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [])
}
