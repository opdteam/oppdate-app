'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/lib/api'
import { adaptOpportunity, type ApiCursorListResponse } from '@/lib/adapters'
import type { OpportunityListItem } from '@/components/opportunities/types'

const ENDPOINT = '/api/v1/opportunities'
const PAGE_SIZE = 20

export type SortOption = 'deadline_asc' | 'deadline_desc' | 'newest'

export interface ListingFilters {
  sort?: SortOption
  type?: string
  country?: string
  eligibility?: string
  funded?: boolean
  oppdate_apply?: boolean
  q?: string
  showExpired?: boolean
}

interface UseInfiniteListingsResult {
  listings: OpportunityListItem[]
  total: number
  hasMore: boolean
  isLoading: boolean
  isError: boolean
  sentinelRef: React.RefObject<HTMLDivElement>
}

function buildParams(filters: ListingFilters, page: number): Record<string, string | number> {
  const params: Record<string, string | number> = { page, limit: PAGE_SIZE }

  // Map sort option to API params
  if (filters.sort === 'deadline_asc') {
    params.sortBy = 'deadline'; params.sortOrder = 'asc'
  } else if (filters.sort === 'deadline_desc') {
    params.sortBy = 'deadline'; params.sortOrder = 'desc'
  } else if (filters.sort === 'newest') {
    params.sortBy = 'createdAt'; params.sortOrder = 'desc'
  } else {
    params.sortBy = 'deadline'; params.sortOrder = 'asc'
  }

  if (filters.type)      params.type      = filters.type
  if (filters.country)   params.country   = filters.country
  // funded and oppdate_apply are not API query params - filter client-side
  if (filters.q)         params.search    = filters.q
  // Exclude opportunities whose deadline has passed unless the user opts in
  if (!filters.showExpired) params.deadlineAfter = new Date().toISOString()
  return params
}

function clientFilter(items: OpportunityListItem[], filters: ListingFilters): OpportunityListItem[] {
  let out = items
  if (filters.funded) {
    out = out.filter(i => i.funding?.type === 'fully_funded' || i.funding?.type === 'partially_funded')
  }
  if (filters.oppdate_apply) {
    out = out.filter(i => i.applyForMe)
  }
  return out
}

export function useInfiniteListings(filters: ListingFilters = {}): UseInfiniteListingsResult {
  const [listings,  setListings]  = useState<OpportunityListItem[]>([])
  const [page,      setPage]      = useState(1)
  const [total,     setTotal]     = useState(0)
  const [hasMore,   setHasMore]   = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isError,   setIsError]   = useState(false)

  const sentinelRef   = useRef<HTMLDivElement>(null)
  const observerRef   = useRef<IntersectionObserver | null>(null)
  const activeFilters = useRef(filters)
  const activeLoading = useRef(false)

  const fetchBatch = useCallback(async (nextPage: number, replace: boolean) => {
    if (activeLoading.current) return
    activeLoading.current = true
    setIsLoading(true)
    setIsError(false)

    try {
      const res = await api.get<ApiCursorListResponse>(ENDPOINT, {
        params: buildParams(activeFilters.current, nextPage),
      })
      const raw  = res.data.data ?? []
      const hm   = res.data.hasMore ?? false
      const t    = res.data.total ?? 0

      const adapted  = clientFilter(raw.map(adaptOpportunity), activeFilters.current)
      setListings(prev => replace ? adapted : [...prev, ...adapted])
      setHasMore(hm)
      setTotal(t)
      if (hm) setPage(nextPage + 1)
    } catch {
      setIsError(true)
    } finally {
      activeLoading.current = false
      setIsLoading(false)
    }
  }, [])

  // Reset and refetch when filters change
  const filtersKey = JSON.stringify(filters)
  useEffect(() => {
    activeFilters.current = filters
    setListings([])
    setPage(1)
    setHasMore(true)
    setIsError(false)
    fetchBatch(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey])

  // Wire up IntersectionObserver on sentinel
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !activeLoading.current) {
          fetchBatch(page, false)
        }
      },
      { rootMargin: '200px' }
    )

    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current)

    return () => { observerRef.current?.disconnect() }
  }, [page, hasMore, fetchBatch])

  return { listings, total, hasMore, isLoading, isError, sentinelRef }
}
