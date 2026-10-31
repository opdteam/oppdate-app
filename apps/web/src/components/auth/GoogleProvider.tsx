'use client'

import { GoogleOAuthProvider } from '@react-oauth/google'

export function GoogleProvider({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  if (!clientId) {
    console.error('[GoogleProvider] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set. Google login will not work.')
    return <>{children}</>
  }
  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  )
}
