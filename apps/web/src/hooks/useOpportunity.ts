import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { adaptOpportunity, type ApiOpportunity, type ApiDetailResponse } from '@/lib/adapters'
import type { OpportunityListItem } from '@/components/opportunities/types'

export function useOpportunity(slug: string | null) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['opportunity', slug],
    queryFn: async () => {
      const res = await api.get<ApiDetailResponse>(`/api/v1/opportunities/${slug}`)
      return res.data.data
    },
    enabled: !!slug,
  })

  const opportunity: OpportunityListItem | null = data ? adaptOpportunity(data) : null

  return { opportunity, isLoading: isLoading && !!slug, isError }
}
