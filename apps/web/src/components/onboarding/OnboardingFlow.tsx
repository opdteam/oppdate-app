'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight, ArrowLeft, Check, ChevronDown, Globe, Search, X,
  BookOpen, GraduationCap, Briefcase, TrendingUp, Compass,
} from 'lucide-react'
import { api } from '@/lib/api'

// ---------------------------------------------------------------- data
const OB_ROLES = [
  { Icon: BookOpen,      label: 'Undergraduate Student' },
  { Icon: GraduationCap, label: "Postgraduate Student (Master's)" },
  { Icon: FlaskIcon,     label: 'PhD / Research Student' },
  { Icon: Briefcase,     label: 'Internship Seeker' },
  { Icon: BuildingIcon,  label: 'Job Seeker' },
  { Icon: TrendingUp,    label: 'Early-Career Professional' },
]

const OB_INTERESTS = [
  { Icon: MedalIcon,    label: 'Scholarships' },
  { Icon: Briefcase,    label: 'Internships' },
  { Icon: BuildingIcon, label: 'Jobs' },
  { Icon: RibbonIcon,   label: 'Fellowships' },
  { Icon: WrenchIcon,   label: 'Training & Bootcamps' },
  { Icon: FlaskIcon,    label: 'Research Grants' },
]

const OB_GOALS = [
  { Icon: GraduationCap, label: 'Fund My Education' },
  { Icon: Globe,         label: 'Relocate Internationally' },
  { Icon: RibbonIcon,    label: 'Pursue Fellowship or Research' },
  { Icon: Compass,       label: 'Explore Opportunities' },
  { Icon: Briefcase,     label: 'Land Internship or Graduate Role' },
  { Icon: TrendingUp,    label: 'Advance My Career' },
]

const VALUE_ROWS = [
  'Opportunities matched to your profile',
  'Eligibility pre-filtered for your background',
  'Recommendations that improve as you apply',
]

// Common countries list (ISO name, not code - for display + API storage)
const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Angola', 'Argentina', 'Australia',
  'Austria', 'Bangladesh', 'Belgium', 'Bolivia', 'Brazil', 'Cameroon',
  'Canada', 'Chile', 'China', 'Colombia', 'Congo (DRC)', 'Cote d\'Ivoire',
  'Denmark', 'Ecuador', 'Egypt', 'Ethiopia', 'Finland', 'France',
  'Germany', 'Ghana', 'Greece', 'India', 'Indonesia', 'Iran', 'Iraq',
  'Ireland', 'Israel', 'Italy', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya',
  'Lebanon', 'Libya', 'Malaysia', 'Mali', 'Mexico', 'Morocco', 'Mozambique',
  'Myanmar', 'Nepal', 'Netherlands', 'New Zealand', 'Niger', 'Nigeria',
  'Norway', 'Pakistan', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Romania', 'Russia', 'Rwanda', 'Saudi Arabia', 'Senegal', 'Sierra Leone',
  'Singapore', 'Somalia', 'South Africa', 'South Korea', 'South Sudan',
  'Spain', 'Sri Lanka', 'Sudan', 'Sweden', 'Switzerland', 'Syria',
  'Tanzania', 'Thailand', 'Tunisia', 'Turkey', 'Uganda', 'Ukraine',
  'United Kingdom', 'United States', 'Venezuela', 'Vietnam', 'Yemen',
  'Zambia', 'Zimbabwe',
]

// ---------------------------------------------------------------- icons
function SparkleIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
      <path d="M12 3l2.1 6.9L21 12l-6.9 2.1L12 21l-2.1-6.9L3 12l6.9-2.1z" />
    </svg>
  )
}

function FlaskIcon({ size = 24, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>
      <path d="M9 3h6" /><path d="M10 3v5.5L4.7 18a2 2 0 0 0 1.8 3h11a2 2 0 0 0 1.8-3L14 8.5V3" /><line x1="7.5" y1="15" x2="16.5" y2="15" />
    </svg>
  )
}

function BuildingIcon({ size = 24, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>
      <path d="M3 21h18" /><path d="M4 10l8-6 8 6" /><line x1="6" y1="10" x2="6" y2="21" /><line x1="10" y1="13" x2="10" y2="21" /><line x1="14" y1="13" x2="14" y2="21" /><line x1="18" y1="10" x2="18" y2="21" />
    </svg>
  )
}

function MedalIcon({ size = 24, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>
      <circle cx="12" cy="9" r="6" /><path d="M8.7 14 7 22l5-3 5 3-1.7-8" />
    </svg>
  )
}

function RibbonIcon({ size = 24, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>
      <circle cx="12" cy="8" r="5" /><path d="M9 12.5 6.5 21l5.5-2 5.5 2L15 12.5" />
    </svg>
  )
}

function WrenchIcon({ size = 24, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

// ---------------------------------------------------------------- types
type Screen = 'welcome' | 1 | 2 | 3 | 4 | 'personalising'

interface OBState {
  screen: Screen
  dir: number
  role: number | null
  interests: number[]
  goal: number | null
  country: string
  nationality: string
  finishing: boolean
  white: boolean
}

// ---------------------------------------------------------------- tile
function Tile({ Icon, label, selected, onClick }: {
  Icon: React.ElementType<any>
  label: string
  selected: boolean
  onClick: () => void
}) {
  const [spring, setSpring] = useState(false)

  const handleClick = () => {
    onClick()
    setSpring(true)
    setTimeout(() => setSpring(false), 250)
  }

  return (
    <button className={`ob-tile${selected ? ' selected' : ''}${spring ? ' ob-spring' : ''}`} onClick={handleClick} type="button">
      {selected && (
        <span className="ob-tile-check ob-pop">
          <Check size={10} style={{ color: '#fff', strokeWidth: 3.5 }} />
        </span>
      )}
      <Icon size={28} style={{ color: selected ? '#7A2D05' : '#8C6A55', transition: 'color 150ms' }} />
      <span className="ob-tile-label">{label}</span>
    </button>
  )
}

// ---------------------------------------------------------------- country combobox
function CountrySelect({ label, value, onChange, helper }: {
  label: string
  value: string
  onChange: (v: string) => void
  helper?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const filtered = query.trim()
    ? COUNTRIES.filter(c => c.toLowerCase().includes(query.toLowerCase()))
    : COUNTRIES

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Focus input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  const select = (country: string) => {
    onChange(country)
    setOpen(false)
    setQuery('')
  }

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
  }

  return (
    <div ref={wrapRef} className="ob-combo-wrap">
      <div className="ob-combo-label">{label}</div>

      {/* Trigger */}
      <button
        type="button"
        className={`ob-combo-trigger${open ? ' open' : ''}${value ? ' has-value' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Globe size={15} className="ob-combo-globe" />
        <span className="ob-combo-value">{value || <span className="ob-combo-placeholder">Select a country</span>}</span>
        <span className="ob-combo-actions">
          {value && (
            <span className="ob-combo-clear" onClick={clear} role="button" aria-label="Clear">
              <X size={13} />
            </span>
          )}
          <ChevronDown size={14} className={`ob-combo-chevron${open ? ' rotated' : ''}`} />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="ob-combo-dropdown">
          <div className="ob-combo-search-row">
            <Search size={14} className="ob-combo-search-icon" />
            <input
              ref={inputRef}
              className="ob-combo-search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search..."
              type="text"
              autoComplete="off"
              onKeyDown={e => {
                if (e.key === 'Escape') { setOpen(false); setQuery('') }
                if (e.key === 'Enter' && filtered.length === 1) select(filtered[0])
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  const first = listRef.current?.querySelector('li') as HTMLElement | null
                  first?.focus()
                }
              }}
            />
          </div>
          <ul ref={listRef} className="ob-combo-list" role="listbox">
            {filtered.length === 0 ? (
              <li className="ob-combo-empty">No results</li>
            ) : filtered.map(c => (
              <li
                key={c}
                role="option"
                aria-selected={c === value}
                className={`ob-combo-option${c === value ? ' selected' : ''}`}
                tabIndex={0}
                onClick={() => select(c)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') select(c)
                  if (e.key === 'ArrowDown') (e.currentTarget.nextElementSibling as HTMLElement)?.focus()
                  if (e.key === 'ArrowUp') (e.currentTarget.previousElementSibling as HTMLElement)?.focus()
                  if (e.key === 'Escape') { setOpen(false); setQuery('') }
                }}
              >
                <span>{c}</span>
                {c === value && <Check size={13} className="ob-combo-option-check" />}
              </li>
            ))}
          </ul>
        </div>
      )}

      {helper && <div className="ob-combo-helper">{helper}</div>}
    </div>
  )
}

// ---------------------------------------------------------------- screens
function WelcomeScreen({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  const words = 'Welcome to OppDate.'.split(' ')

  return (
    <div>
      <h1 className="ob-greeting">
        {words.map((w, i) => (
          <span key={i} className="ob-word" style={{
            marginRight: i === words.length - 1 ? 0 : '0.28em',
            animationDelay: `${i * 0.12}s`,
          }}>
            {w === 'OppDate.' ? (
              <><span style={{ color: '#2A1206' }}>Opp</span><span style={{ color: '#7A2D05' }}>Date</span>.</>
            ) : w}
          </span>
        ))}
      </h1>
      <p className="ob-fade-up" style={{ margin: '12px 0 0', fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.55, color: '#8C6A55', textAlign: 'center', animationDelay: '0.65s' }}>
        Let&apos;s personalise your experience so we can match you with the right opportunities.
      </p>
      <div className="ob-divider" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {VALUE_ROWS.map((t, i) => (
          <div key={i} className="ob-value-row">
            <SparkleIcon size={14} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: '#2A1206' }}>{t}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 28 }}>
        <button className="ob-primary-btn ob-btn-pulse" onClick={onStart} type="button">
          Let&apos;s get started <ArrowRight size={16} />
        </button>
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button className="ob-skip-link" onClick={onSkip} type="button">Skip personalisation</button>
        </div>
      </div>
    </div>
  )
}

function Step1({ value, onSelect, onContinue }: { value: number | null; onSelect: (i: number) => void; onContinue: () => void }) {
  return (
    <div style={{ animation: 'obFadeUp 0.35s ease forwards' }}>
      <h2 className="ob-heading">Which best describes you?</h2>
      <p className="ob-sub">This helps us match opportunities to your level and background.</p>
      <div className="ob-tile-grid">
        {OB_ROLES.map((r, i) => (
          <Tile key={r.label} Icon={r.Icon} label={r.label} selected={value === i} onClick={() => onSelect(i)} />
        ))}
      </div>
      <div style={{ marginTop: 24 }}>
        <button className="ob-primary-btn" disabled={value === null} onClick={onContinue} type="button">
          Continue <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

function Step2({ values, onToggle, onContinue, onBack }: {
  values: number[]
  onToggle: (i: number) => void
  onContinue: () => void
  onBack: () => void
}) {
  return (
    <div style={{ animation: 'obFadeUp 0.35s ease forwards' }}>
      <h2 className="ob-heading">What types of opportunities interest you?</h2>
      <p className="ob-sub">Select all that apply. You can update this anytime.</p>
      <div className="ob-tile-grid">
        {OB_INTERESTS.map((r, i) => (
          <Tile key={r.label} Icon={r.Icon} label={r.label} selected={values.includes(i)} onClick={() => onToggle(i)} />
        ))}
      </div>
      <div style={{ marginTop: 24 }}>
        <button className="ob-primary-btn" onClick={onContinue} type="button">
          Continue <ArrowRight size={16} />
        </button>
        <button className="ob-back-link" onClick={onBack} type="button"><ArrowLeft size={13} /> Back</button>
      </div>
    </div>
  )
}

function Step3({ country, nationality, onCountryChange, onNationalityChange, onContinue, onBack }: {
  country: string
  nationality: string
  onCountryChange: (v: string) => void
  onNationalityChange: (v: string) => void
  onContinue: () => void
  onBack: () => void
}) {
  return (
    <div style={{ animation: 'obFadeUp 0.35s ease forwards' }}>
      <h2 className="ob-heading">Where are you based?</h2>
      <p className="ob-sub">Helps us show opportunities available in your region and filter eligibility.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <CountrySelect label="Country of residence" value={country} onChange={onCountryChange} />
        <CountrySelect
          label="Nationality"
          value={nationality}
          onChange={onNationalityChange}
          helper="Your nationality affects eligibility for many international opportunities."
        />
      </div>
      <div style={{ marginTop: 24 }}>
        <button className="ob-primary-btn" onClick={onContinue} type="button">
          Continue <ArrowRight size={16} />
        </button>
        <button className="ob-back-link" onClick={onBack} type="button"><ArrowLeft size={13} /> Back</button>
      </div>
    </div>
  )
}

function Step4({ value, onSelect, onGo, onBack, loading }: {
  value: number | null
  onSelect: (i: number) => void
  onGo: () => void
  onBack: () => void
  loading: boolean
}) {
  return (
    <div style={{ animation: 'obFadeUp 0.35s ease forwards' }}>
      <h2 className="ob-heading">What&apos;s your primary goal right now?</h2>
      <p className="ob-sub">We&apos;ll prioritise the most relevant opportunities for you.</p>
      <div className="ob-tile-grid">
        {OB_GOALS.map((r, i) => (
          <Tile key={r.label} Icon={r.Icon} label={r.label} selected={value === i} onClick={() => onSelect(i)} />
        ))}
      </div>
      <div style={{ marginTop: 24 }}>
        <button className="ob-primary-btn" disabled={value === null || loading} onClick={onGo} type="button">
          {loading ? (
            <>Let&apos;s go <span className="ob-spinner" /></>
          ) : (
            <>Let&apos;s go <ArrowRight size={16} /></>
          )}
        </button>
        <button className="ob-back-link" onClick={onBack} type="button"><ArrowLeft size={13} /> Back</button>
      </div>
    </div>
  )
}

function DotsLoader() {
  return (
    <div className="ob-dots-loader">
      {[0, 1, 2].map(i => (
        <span key={i} className="ob-dot" style={{
          animation: 'obDotPulse 1.2s ease-in-out infinite',
          animationDelay: `${i * 200}ms`,
        }} />
      ))}
    </div>
  )
}

function PersonalisingScreen() {
  return (
    <div className="ob-personalising">
      <div className="ob-personalising-inner">
        <img src="/assets/oppdate-monogram.png" alt="OppDate" width={56} height={56} />
        <DotsLoader />
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 15, color: '#5C3A1E', textAlign: 'center',
          background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          padding: '8px 20px', borderRadius: 20, border: '1px solid rgba(92,58,30,0.12)',
        }}>
          Setting up your personalised experience...
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- controller
export function OnboardingFlow() {
  const router = useRouter()
  const [state, setState] = useState<OBState>({
    screen: 'welcome', dir: 1,
    role: null, interests: [], goal: null,
    country: '', nationality: '',
    finishing: false, white: false,
  })
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  // Redirect already-onboarded users away immediately
  useEffect(() => {
    api.get('/api/v1/auth/me').then(res => {
      const prefs = res.data?.data?.preferences
      if (prefs && Object.keys(prefs).length > 0) {
        router.replace('/dashboard')
      }
    }).catch(() => {})
  }, [router])

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  const update = useCallback((patch: Partial<OBState>) => {
    setState(prev => ({ ...prev, ...patch }))
  }, [])

  const go = useCallback((n: Screen, dir = 1) => update({ screen: n, dir }), [update])

  const finish = useCallback(async () => {
    update({ finishing: true })

    // Save preferences to the API - fire and forget, never block the UX
    try {
      await api.patch('/api/v1/auth/me/preferences', {
        role: state.role,
        interests: state.interests,
        goal: state.goal,
        country: state.country || undefined,
        nationality: state.nationality || undefined,
      })
    } catch {
      // Non-fatal - proceed to dashboard regardless
    }

    timers.current.push(setTimeout(() => update({ screen: 'personalising', dir: 1, finishing: false }), 400))
  }, [update, state.role, state.interests, state.goal, state.country, state.nationality])

  // Skip all - record that onboarding was seen but skipped, then proceed
  const skipAll = useCallback(() => {
    api.patch('/api/v1/auth/me/preferences', { skipped: true }).catch(() => {})
    update({ screen: 'personalising', dir: 1 })
  }, [update])

  useEffect(() => {
    if (state.screen !== 'personalising') return
    clearTimers()
    timers.current.push(setTimeout(() => update({ white: true }), 2000))
    timers.current.push(setTimeout(() => router.push('/dashboard'), 2600))
    return clearTimers
  }, [state.screen, clearTimers, update, router])

  const pct = typeof state.screen === 'number' ? state.screen * 25 : 0
  const showSkip = state.screen === 2 || state.screen === 3 || state.screen === 4

  if (state.screen === 'personalising') {
    return (
      <div className="ob-stage">
        <PersonalisingScreen />
        <div className={`ob-white-overlay${state.white ? ' active' : ''}`} />
      </div>
    )
  }

  return (
    <div className="ob-stage">
      <div className="ob-center">
        <div style={{ marginBottom: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <img src="/assets/oppdate-monogram.png" alt="OppDate" width={44} height={44} />
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.01em', lineHeight: 1 }}>
            <span style={{ color: '#2A1206' }}>Opp</span><span style={{ color: '#7A2D05' }}>Date</span>
          </span>
        </div>

        {typeof state.screen === 'number' && (
          <div className="ob-progress">
            <div className="ob-progress-bar" style={{ width: `${pct}%` }} />
          </div>
        )}

        <div className="ob-glass-card">
          {showSkip && (
            <div style={{ position: 'absolute', top: 16, right: 20 }}>
              <button className="ob-skip-link" onClick={() => {
                if (state.screen === 4) skipAll()
                else if (typeof state.screen === 'number') go((state.screen + 1) as Screen)
              }} type="button">
                Skip →
              </button>
            </div>
          )}

          {state.screen === 'welcome' && (
            <WelcomeScreen onStart={() => go(1)} onSkip={skipAll} />
          )}
          {state.screen === 1 && (
            <Step1
              value={state.role}
              onSelect={(i) => update({ role: i })}
              onContinue={() => go(2)}
            />
          )}
          {state.screen === 2 && (
            <Step2
              values={state.interests}
              onToggle={(i) => setState(p => ({
                ...p,
                interests: p.interests.includes(i) ? p.interests.filter(x => x !== i) : [...p.interests, i],
              }))}
              onContinue={() => go(3)}
              onBack={() => go(1, -1)}
            />
          )}
          {state.screen === 3 && (
            <Step3
              country={state.country}
              nationality={state.nationality}
              onCountryChange={(v) => update({ country: v })}
              onNationalityChange={(v) => update({ nationality: v })}
              onContinue={() => go(4)}
              onBack={() => go(2, -1)}
            />
          )}
          {state.screen === 4 && (
            <Step4
              value={state.goal}
              onSelect={(i) => update({ goal: i })}
              onGo={finish}
              onBack={() => go(3, -1)}
              loading={state.finishing}
            />
          )}
        </div>
      </div>
      <div className={`ob-white-overlay${state.white ? ' active' : ''}`} />
    </div>
  )
}
