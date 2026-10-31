import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { adaptOpportunity, type ApiCursorListResponse as ApiListResponse } from '@/lib/adapters'
import type { OpportunityListItem } from '@/components/opportunities/types'

export type OpportunityFilter =
  | 'all'
  | 'scholarship'
  | 'internship'
  | 'graduate'
  | 'training'
  | 'funded'
  | 'afm'

interface UseOpportunitiesParams {
  search?: string
  filter?: OpportunityFilter
  page?: number
  limit?: number
  sortBy?: 'deadline' | 'createdAt' | 'viewCount'
  sortOrder?: 'asc' | 'desc'
}

interface UseOpportunitiesResult {
  opportunities: OpportunityListItem[]
  total: number
  hasMore: boolean
  isLoading: boolean
  isError: boolean
}

function filterToApiParams(filter: OpportunityFilter): Record<string, string | number | undefined> {
  switch (filter) {
    case 'scholarship': return { type: 'scholarship' }
    case 'internship':  return { type: 'internship' }
    case 'graduate':    return { type: 'entry_level_job' }
    case 'training':    return { type: 'training_bootcamp' }
    case 'funded':      return { minAwardUsd: 1 }
    case 'afm':         return { minFee: 1 }
    default:            return {}
  }
}

export function useOpportunities({
  search,
  filter = 'all',
  page = 1,
  limit = 20,
  sortBy = 'deadline',
  sortOrder = 'asc',
}: UseOpportunitiesParams = {}): UseOpportunitiesResult {
  const filterParams = filterToApiParams(filter)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['opportunities', { search, filter, page, limit, sortBy, sortOrder }],
    queryFn: async () => {
      const res = await api.get<ApiListResponse>('/opportunities', {
        params: {
          page,
          limit,
          sortBy,
          sortOrder,
          ...(search ? { search } : {}),
          ...filterParams,
        },
      })
      return res.data
    },
  })

  return {
    opportunities: (data?.data ?? []).map(adaptOpportunity),
    total: data?.total ?? 0,
    hasMore: data?.hasMore ?? false,
    isLoading,
    isError,
  }
}
