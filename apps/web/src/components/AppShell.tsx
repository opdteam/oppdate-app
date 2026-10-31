'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Sidebar, TopBar, type Route } from '@/components/layout'
import { FilterChips, OpportunityCard, OpportunityDetail, type FilterId } from '@/components/opportunities'
import { ApplyForMeDrawer } from '@/components/apply'
import { useInfiniteListings, type ListingFilters } from '@/hooks/useInfiniteListings'
import { useOpportunity } from '@/hooks/useOpportunity'
import { useSavedOpportunities } from '@/hooks/useSavedOpportunities'
import { keys, fetchers, type ApiDocument } from '@/lib/queries'

function typeParamToFilterId(type: string | null): FilterId {
  if (type === 'scholarship')    return 'scholarship'
  if (type === 'internship')     return 'internship'
  if (type === 'entry_level_job') return 'graduate'
  if (type === 'training_bootcamp') return 'training'
  return 'all'
}

function routeTitle(r: Route): string {
  const map: Record<Route, string> = {
    discover:  'Opportunities for you',
    saved:     'Your saved opportunities',
    foryou:    'Hand-picked, just for you',
    progress:  'Applications in progress',
    submitted: 'Submitted applications',
    messages:  'Conversations with specialists',
    settings:  'Profile & settings',
  }
  return map[r]
}

function routeSubtitle(r: Route, total: number): string {
  if (r === 'discover')  return `${total.toLocaleString()} live opportunities across 94 countries, sorted by deadline.`
  if (r === 'saved')     return `${total} opportunities bookmarked. We'll watch the deadlines.`
  if (r === 'foryou')    return 'Matched to your field, citizenship, and stage.'
  if (r === 'progress')  return 'Drafts and ongoing applications, with the next action surfaced.'
  if (r === 'submitted') return "Applications you've sent through OppDate."
  if (r === 'messages')  return 'Threads with your OppDate Apply specialists.'
  return ''
}

function filterToListingParams(filter: FilterId, q: string): ListingFilters {
  const base: ListingFilters = { sort: 'deadline_asc', q: q || undefined }
  switch (filter) {
    case 'scholarship': return { ...base, type: 'scholarship' }
    case 'internship':  return { ...base, type: 'internship' }
    case 'graduate':    return { ...base, type: 'entry_level_job' }
    case 'training':    return { ...base, type: 'training_bootcamp' }
    case 'funded':      return { ...base, funded: true }
    case 'afm':         return { ...base, oppdate_apply: true }
    default:            return base
  }
}

export function AppShell() {
  const searchParams = useSearchParams()
  const [query,        setQuery]        = useState(() => searchParams.get('q') || '')
  const [filter,       setFilter]       = useState<FilterId>(() => {
    if (searchParams.get('funded') === 'true') return 'funded'
    if (searchParams.get('oppdate_apply') === 'true') return 'afm'
    return typeParamToFilterId(searchParams.get('type'))
  })
  const [route,        setRoute]        = useState<Route>('discover')
  const [selectedSlug, setSelectedSlug] = useState<string | null>(() => searchParams.get('slug'))
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [searchOpen,   setSearchOpen]   = useState(false)

  const listingFilters = useMemo(
    () => filterToListingParams(filter, query),
    [filter, query]
  )

  const { listings, total, hasMore, isLoading, isError, sentinelRef } = useInfiniteListings(listingFilters)
  const { opportunity: selected, isLoading: detailLoading } = useOpportunity(selectedSlug)
  const { savedSet, toggleSave } = useSavedOpportunities()
  const { data: library = [] } = useQuery<ApiDocument[]>({
    queryKey: keys.documents,
    queryFn: fetchers.documents,
    staleTime: 2 * 60 * 1000,
    enabled: drawerOpen,
  })

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-cream">
      <Sidebar
        route={route}
        setRoute={setRoute}
        savedCount={savedSet.size}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          searchOpen={searchOpen}
          onSearchOpen={() => setSearchOpen(true)}
          onSearchClose={() => setSearchOpen(false)}
        />

        <div className="flex min-h-0 flex-1">
          {/* Result list */}
          <main
            className="overflow-y-auto shrink-0"
            style={{ width: selected ? 520 : '100%', borderRight: selected ? '1px solid var(--border)' : undefined }}
          >
            <div className="px-7 pb-4 pt-6">
              <div className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-ginger-dark">
                {route.charAt(0).toUpperCase() + route.slice(1)}
              </div>
              <h1 className="m-0 font-display text-[36px] font-semibold leading-[1.05] tracking-[-0.02em] text-ink">
                {routeTitle(route)}
              </h1>
              <p className="m-0 mt-2 max-w-[540px] text-[15px] text-muted">
                {routeSubtitle(route, total)}
              </p>
            </div>

            <div className="px-7 py-3">
              <FilterChips filter={filter} setFilter={setFilter} />
            </div>

            <div className="flex flex-col gap-3.5 px-7 pb-8 pt-1">
              {isError && !isLoading && (
                <div className="rounded-lg border border-[var(--border)] p-8 text-center text-sm text-muted">
                  Something went wrong. Check your connection and try again.
                </div>
              )}

              {listings.map((d) => (
                <OpportunityCard
                  key={d.id}
                  data={d}
                  saved={savedSet.has(d.id)}
                  onSave={toggleSave}
                  onOpen={() => setSelectedSlug(d.slug)}
                />
              ))}

              {/* Sentinel — IntersectionObserver fires 200px before this is visible */}
              <div ref={sentinelRef} style={{ height: 1 }} />

              {isLoading && (
                <div className="py-6 text-center text-sm text-muted">Loading...</div>
              )}

              {!isLoading && !isError && !hasMore && listings.length > 0 && (
                <div className="py-6 text-center text-sm text-muted">
                  You&apos;ve reached the end of the listings.
                </div>
              )}

              {!isLoading && !isError && listings.length === 0 && (
                <div className="rounded-lg border border-dashed border-[var(--border-strong)] p-10 text-center text-muted">
                  <div className="font-display text-xl font-semibold text-ink">Nothing matches yet.</div>
                  <div className="mt-1.5 text-sm">Try a wider filter or a different search term.</div>
                </div>
              )}
            </div>
          </main>

          {/* Detail pane */}
          {(selected || detailLoading) && (
            detailLoading ? (
              <div className="flex h-full flex-1 items-center justify-center border-l border-[var(--border)] bg-white text-sm text-muted">
                Loading...
              </div>
            ) : selected ? (
              <OpportunityDetail
                data={selected}
                saved={savedSet.has(selected.id)}
                onSave={toggleSave}
                onClose={() => setSelectedSlug(null)}
                onApply={() => setDrawerOpen(true)}
              />
            ) : null
          )}
        </div>
      </div>

      <ApplyForMeDrawer
        open={drawerOpen}
        opportunity={selected ?? null}
        library={library}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  )
}
