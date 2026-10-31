'use client'

import { createContext, useContext } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { keys, fetchers } from '@/lib/queries'

interface UserContextValue {
  name: string
  initials: string
  avatarUrl: string | null
  isPremium: boolean
  premiumUntil: string | null // ISO date string, null if not premium
  refetch: () => void
}

const UserContext = createContext<UserContextValue>({
  name: '',
  initials: '',
  avatarUrl: null,
  isPremium: false,
  premiumUntil: null,
  refetch: () => {},
})

function toInitials(name: string): string {
  return name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: keys.me,
    queryFn: fetchers.me,
    staleTime: 5 * 60 * 1000, // 5 min -- user data rarely changes mid-session
    retry: false,
  })

  const name = data?.name || ''
  const avatarUrl = data?.avatarUrl || null
  const isPremium = data?.isPremium || false
  const premiumUntil = data?.premiumUntil || null

  return (
    <UserContext.Provider value={{
      name,
      initials: toInitials(name),
      avatarUrl,
      isPremium,
      premiumUntil,
      refetch: () => qc.invalidateQueries({ queryKey: keys.me }),
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
