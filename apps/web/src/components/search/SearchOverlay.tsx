'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowRight, Clock, Globe, Bookmark } from 'lucide-react'
import { api } from '@/lib/api'
import { adaptOpportunity, type ApiOpportunity, type ApiCursorListResponse } from '@/lib/adapters'
import type { OpportunityListItem } from '@/components/opportunities/types'

// ---- Types ----

interface SearchOverlayProps {
  open: boolean
  onClose: () => void
}

type FilterPill = { label: string; param: string; value: string }

const TYPE_PILLS: FilterPill[] = [
  { label: 'Scholarships',   param: 'type', value: 'scholarship' },
  { label: 'Internships',    param: 'type', value: 'internship' },
  { label: 'Graduate roles', param: 'type', value: 'entry_level_job' },
  { label: 'Training',       param: 'type', value: 'training_bootcamp' },
  { label: 'Funded only',    param: 'funded', value: 'true' },
  { label: 'OppDate Apply',  param: 'oppdate_apply', value: 'true' },
]

const SUGGESTIONS = [
  'UK scholarships for Africans',
  'funded internships in Germany',
  'postgraduate fellowships 2026',
  'STEM scholarships fully funded',
  'entry level jobs in Canada',
]

// ---- Helpers ----

function deriveFlag(country: string): string {
  if (!country) return ''
  // Map country name → ISO code for common ones, fallback to globe emoji
  const MAP: Record<string, string> = {
    'United Kingdom': 'GB', 'United States': 'US', 'Canada': 'CA',
    'Germany': 'DE', 'Australia': 'AU', 'France': 'FR', 'Netherlands': 'NL',
    'Sweden': 'SE', 'Norway': 'NO', 'Switzerland': 'CH', 'Japan': 'JP',
    'South Korea': 'KR', 'China': 'CN', 'India': 'IN', 'Nigeria': 'NG',
    'Ghana': 'GH', 'Kenya': 'KE', 'South Africa': 'ZA', 'Egypt': 'EG',
    'Brazil': 'BR', 'Mexico': 'MX', 'Argentina': 'AR',
  }
  const code = MAP[country]
  if (!code) return ''
  try {
    return String.fromCodePoint(...[...code].map(c => 127397 + c.charCodeAt(0)))
  } catch {
    return ''
  }
}

function typeLabel(type: string): string {
  const MAP: Record<string, string> = {
    scholarship: 'Scholarship', internship: 'Internship',
    entry_level_job: 'Job', training_bootcamp: 'Training',
    fellowship: 'Fellowship', grant: 'Grant',
    volunteering: 'Volunteering', competition: 'Competition',
  }
  return MAP[type] || type
}

// ---- Result row ----

function ResultRow({
  item,
  active,
  onPointerEnter,
  onClick,
}: {
  item: OpportunityListItem
  active: boolean
  onPointerEnter: () => void
  onClick: () => void
}) {
  const flag = deriveFlag(item.country)
  const isFunded = item.funding?.type === 'fully_funded'
  const daysLeft = item.closesIn

  return (
    <button
      onPointerEnter={onPointerEnter}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, width: '100%',
        padding: '11px 20px', border: 'none', cursor: 'pointer', textAlign: 'left',
        background: active ? 'rgba(122,45,5,0.06)' : 'transparent',
        borderRadius: active ? 10 : 0,
        transition: 'background 100ms ease',
      }}
    >
      {/* Org logo / initial */}
      <span style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
        background: active ? 'rgba(122,45,5,0.12)' : 'rgba(122,45,5,0.07)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, color: '#7A2D05',
        transition: 'background 100ms ease',
      }}>
        {item.institutionLogoUrl
          ? <img src={item.institutionLogoUrl} alt={item.org} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          : item.orgInit}
      </span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 14.5,
          color: '#2A1206', lineHeight: 1.3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {item.title}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginTop: 2,
          fontFamily: 'var(--font-sans)', fontSize: 12, color: '#8C6A55',
        }}>
          {flag && <span>{flag}</span>}
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.org}
          </span>
        </div>
      </div>

      {/* Right side badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, lineHeight: 1,
          padding: '3px 9px', borderRadius: 999,
          border: '1px solid rgba(14,116,144,0.3)', color: '#0E7490',
          background: 'rgba(14,116,144,0.06)', whiteSpace: 'nowrap',
        }}>
          {typeLabel(item.type)}
        </span>
        {isFunded && (
          <span style={{
            fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, lineHeight: 1,
            padding: '3px 9px', borderRadius: 999,
            border: '1px solid rgba(14,116,144,0.2)', color: '#0E7490',
            background: 'rgba(14,116,144,0.08)', whiteSpace: 'nowrap',
          }}>
            Funded
          </span>
        )}
        {daysLeft != null && daysLeft <= 30 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, lineHeight: 1,
            padding: '3px 9px', borderRadius: 999,
            background: 'rgba(212,132,58,0.1)', border: '1px solid rgba(212,132,58,0.28)', color: '#7A2D05',
            whiteSpace: 'nowrap',
          }}>
            <Clock size={10} />
            {daysLeft}d
          </span>
        )}
      </div>
    </button>
  )
}

// ---- Main overlay ----

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterPill | null>(null)
  const [results, setResults] = useState<OpportunityListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [mounted, setMounted] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setResults([])
      setTotal(0)
      setActiveIdx(-1)
      setActiveFilter(null)
    }
  }, [open])

  // Fetch results with debounce
  const fetchResults = useCallback((q: string, pill: FilterPill | null) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    if (abortRef.current) abortRef.current.abort()

    if (!q.trim() && !pill) {
      setResults([])
      setTotal(0)
      setLoading(false)
      return
    }

    debounceTimer.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)

      try {
        const params: Record<string, string> = { limit: '6' }
        if (q.trim()) params.search = q.trim()
        if (pill?.param === 'type') params.type = pill.value

        const res = await api.get<ApiCursorListResponse>('/api/v1/opportunities', {
          params,
          signal: controller.signal,
        })
        let raw: ApiOpportunity[] = res.data?.data ?? []
        // funded and oppdate_apply are not API query params - filter client-side
        if (pill?.param === 'funded') raw = raw.filter(r => r.awardValueUsd && r.awardValueUsd > 0)
        if (pill?.param === 'oppdate_apply') raw = raw.filter(r => r.oppDateApply)
        setResults(raw.map(adaptOpportunity))
        setTotal(res.data?.total ?? raw.length)
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== 'AbortError' && e.name !== 'CanceledError') {
          setResults([])
        }
      } finally {
        setLoading(false)
      }
    }, 280)
  }, [])

  useEffect(() => {
    fetchResults(query, activeFilter)
  }, [query, activeFilter, fetchResults])

  // Keyboard nav
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx(i => Math.min(i + 1, results.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx(i => Math.max(i - 1, -1))
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (activeIdx >= 0 && results[activeIdx]) {
          commitResult(results[activeIdx])
        } else {
          commitSearch()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, results, activeIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  const commitResult = (item: OpportunityListItem) => {
    onClose()
    router.push(`/opportunities?slug=${item.slug}`)
  }

  const commitSearch = () => {
    if (!query.trim() && !activeFilter) return
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (activeFilter?.param === 'type') params.set('type', activeFilter.value)
    if (activeFilter?.param === 'funded') params.set('funded', 'true')
    if (activeFilter?.param === 'oppdate_apply') params.set('oppdate_apply', 'true')
    onClose()
    router.push(`/opportunities?${params.toString()}`)
  }

  const handlePill = (pill: FilterPill) => {
    setActiveFilter(prev => (prev?.param === pill.param && prev?.value === pill.value) ? null : pill)
    setActiveIdx(-1)
    inputRef.current?.focus()
  }

  const showSuggestions = !query.trim() && !activeFilter
  const showResults = !showSuggestions && (results.length > 0 || loading)

  if (!mounted || !open) return null

  const overlay = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(20,10,5,0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', paddingTop: 80,
        animation: 'srchFadeIn 160ms ease both',
      }}
    >
      {/* Modal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 660, borderRadius: 18,
          background: 'rgba(252,249,246,0.97)',
          backdropFilter: 'blur(32px) saturate(160%)',
          WebkitBackdropFilter: 'blur(32px) saturate(160%)',
          border: '1px solid rgba(122,45,5,0.12)',
          boxShadow: '0 24px 64px rgba(42,18,6,0.24), 0 4px 16px rgba(42,18,6,0.1)',
          overflow: 'hidden',
          animation: 'srchSlideDown 200ms cubic-bezier(0.22,1,0.36,1) both',
          maxHeight: 'calc(100vh - 160px)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Input row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px',
          borderBottom: '1px solid rgba(122,45,5,0.08)',
        }}>
          <Search size={20} style={{ color: '#7A2D05', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIdx(-1) }}
            placeholder="Search opportunities by country, field, or keyword..."
            style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              fontFamily: 'var(--font-sans)', fontSize: 16, color: '#2A1206',
              caretColor: '#7A2D05',
            }}
          />
          {(query || activeFilter) && (
            <button
              onClick={() => { setQuery(''); setActiveFilter(null); inputRef.current?.focus() }}
              style={{
                width: 26, height: 26, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'rgba(122,45,5,0.08)', color: '#7A2D05',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          )}
          <kbd style={{
            flexShrink: 0, padding: '3px 8px', borderRadius: 6,
            border: '1px solid rgba(122,45,5,0.15)', background: 'rgba(122,45,5,0.05)',
            fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: '#8C6A55',
          }}>
            Esc
          </kbd>
        </div>

        {/* Filter pills */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
          overflowX: 'auto', flexShrink: 0,
          borderBottom: '1px solid rgba(122,45,5,0.06)',
        }}>
          {TYPE_PILLS.map(pill => {
            const active = activeFilter?.value === pill.value
            return (
              <button
                key={pill.label}
                onClick={() => handlePill(pill)}
                style={{
                  flexShrink: 0, height: 28, padding: '0 12px', borderRadius: 999,
                  border: `1px solid ${active ? '#7A2D05' : 'rgba(122,45,5,0.18)'}`,
                  background: active ? '#7A2D05' : 'transparent',
                  fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: active ? 600 : 500,
                  color: active ? '#fff' : '#7A2D05',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'all 120ms ease',
                }}
              >
                {pill.label}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

          {/* Suggestions (empty state) */}
          {showSuggestions && (
            <div style={{ padding: '14px 20px 20px' }}>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 10.5, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'rgba(122,45,5,0.4)', marginBottom: 10,
              }}>
                Try searching for
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setQuery(s); inputRef.current?.focus() }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 10px', border: 'none', cursor: 'pointer',
                      background: 'transparent', borderRadius: 9, textAlign: 'left',
                      fontFamily: 'var(--font-sans)', fontSize: 13.5, color: '#5A3520',
                      transition: 'background 100ms ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(122,45,5,0.05)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <Search size={14} style={{ color: '#B5836A', flexShrink: 0 }} />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div style={{ padding: '8px 20px 20px' }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '11px 0',
                  borderBottom: i < 3 ? '1px solid rgba(122,45,5,0.05)' : 'none',
                }}>
                  <div className="skel" style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skel skel-line w80" style={{ height: 13, marginBottom: 6 }} />
                    <div className="skel skel-line w50" style={{ height: 11 }} />
                  </div>
                  <div className="skel skel-pill" style={{ width: 70 }} />
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!loading && showResults && (
            <div style={{ padding: '8px 10px 4px' }}>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 10.5, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'rgba(122,45,5,0.4)', padding: '0 10px', marginBottom: 4,
              }}>
                Quick results
              </div>
              {results.map((item, i) => (
                <ResultRow
                  key={item.id}
                  item={item}
                  active={activeIdx === i}
                  onPointerEnter={() => setActiveIdx(i)}
                  onClick={() => commitResult(item)}
                />
              ))}
            </div>
          )}

          {/* No results */}
          {!loading && !showSuggestions && results.length === 0 && (
            <div style={{
              padding: '40px 20px', textAlign: 'center',
              fontFamily: 'var(--font-sans)', fontSize: 13.5, color: '#8C6A55',
            }}>
              <div style={{
                fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600,
                color: '#2A1206', marginBottom: 6,
              }}>
                No matches found
              </div>
              Try a broader term, or explore all opportunities.
            </div>
          )}
        </div>

        {/* Footer: "See all N results" */}
        {(results.length > 0 || (query.trim() && !loading)) && (
          <button
            onClick={commitSearch}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '14px 20px',
              borderTop: '1px solid rgba(122,45,5,0.08)',
              background: 'rgba(122,45,5,0.03)',
              border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600,
              color: '#7A2D05',
              transition: 'background 120ms ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(122,45,5,0.07)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(122,45,5,0.03)' }}
          >
            {results.length > 0
              ? `See all ${total.toLocaleString()} results`
              : 'Search all opportunities'}
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
