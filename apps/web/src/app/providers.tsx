'use client'

import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { makeQueryClient } from '@/lib/queryClient'
import { UserProvider } from '@/lib/UserContext'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        {children}
      </UserProvider>
    </QueryClientProvider>
  )
}
