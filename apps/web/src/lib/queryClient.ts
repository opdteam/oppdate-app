import { QueryClient } from '@tanstack/react-query'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        // Never retry on 401 or 429 -- retrying auth failures causes request floods
        retry: (failureCount, error) => {
          const status = (error as { response?: { status?: number } })?.response?.status
          if (status === 401 || status === 429) return false
          return failureCount < 1
        },
        refetchOnWindowFocus: false,
      },
    },
  })
}
