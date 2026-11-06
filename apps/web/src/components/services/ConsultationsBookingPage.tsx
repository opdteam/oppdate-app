'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ChevronRight, ChevronLeft, ArrowLeft, Target, Calendar,
  Clock, Video, ShieldCheck, Check, Plus,
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'

function useIsMobile(bp = 960) {
  const [m, setM] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`)
    setM(mq.matches)
    const h = (e: MediaQueryListEvent) => setM(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [bp])
  return m
}

// ============================================================
// API types
// ============================================================

interface ApiSession {
  id: string
  title: string
  description: string | null
  durationMinutes: number
  priceUsd: number // cents
  active: boolean
  groupKey: string | null
  availableSlots: number
}

interface SessionGroup {
  key: string
  variants: ApiSession[]
}

interface ApiSlot {
  id: string
  startsAt: string
}

interface BookingResult {
  id: string
  sessionId: string
  slotId: string
  scheduledAt: string
  durationMinutes: number
  priceUsd: number
  status: string
}

// ============================================================
// Utility
// ============================================================

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtDateShort(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// ============================================================
// Flow states
// ============================================================

type View =
  | { screen: 'catalog' }
  | { screen: 'slots'; session: ApiSession }
  | { screen: 'review'; session: ApiSession; slot: ApiSlot }
  | { screen: 'confirmation'; session: ApiSession; slot: ApiSlot; booking: BookingResult }

// ============================================================
// Exported page
// ============================================================

export function ConsultationsBookingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mob = useIsMobile()
  const sessionParam = searchParams.get('session')
  const bookingIdParam = searchParams.get('bookingId')
  const paymentParam = searchParams.get('payment')
  const [view, setView] = useState<View>({ screen: 'catalog' })
  const [bootstrapping, setBootstrapping] = useState(!!(sessionParam || (bookingIdParam && paymentParam === 'success')))

  useEffect(() => {
    // Return from payment gateway with a completed booking
    if (bookingIdParam && paymentParam === 'success') {
      Promise.all([
        api.get<{ data: BookingResult }>(`/api/v1/consultations/${bookingIdParam}`),
        api.get<{ data: ApiSession[] }>('/api/v1/consultations/sessions'),
      ])
        .then(([bookingRes, sessionsRes]) => {
          const booking = bookingRes.data?.data
          const sessions = sessionsRes.data?.data ?? []
          const session = sessions.find(s => s.id === booking?.sessionId)
          if (booking && session) {
            const fakeSlot: ApiSlot = { id: booking.slotId, startsAt: booking.scheduledAt }
            setView({ screen: 'confirmation', session, slot: fakeSlot, booking })
          }
        })
        .catch(() => {})
        .finally(() => setBootstrapping(false))
      return
    }

    // ?session=<id> — jump straight to slot selection
    if (sessionParam) {
      api.get<{ data: ApiSession[] }>('/api/v1/consultations/sessions')
        .then(r => {
          const session = (r.data?.data ?? []).find(s => s.id === sessionParam)
          if (session) setView({ screen: 'slots', session })
        })
        .catch(() => {})
        .finally(() => setBootstrapping(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (bootstrapping) return null

  switch (view.screen) {
    case 'catalog':
      return (
        <CatalogScreen
          mob={mob}
          onSelect={(session) => setView({ screen: 'slots', session })}
          onBack={() => router.push('/services')}
        />
      )
    case 'slots':
      return (
        <SlotsScreen
          session={view.session}
          mob={mob}
          onBack={() => sessionParam ? router.push('/services/consultations') : setView({ screen: 'catalog' })}
          onContinue={(slot) => setView({ screen: 'review', session: view.session, slot })}
          backLabel={sessionParam ? 'Back to consultations' : 'Back to sessions'}
        />
      )
    case 'review':
      return (
        <ReviewScreen
          session={view.session}
          slot={view.slot}
          mob={mob}
          onBack={() => setView({ screen: 'slots', session: view.session })}
        />
      )
    case 'confirmation':
      return (
        <ConfirmationScreen
          session={view.session}
          slot={view.slot}
          booking={view.booking}
          mob={mob}
          onDashboard={() => router.push('/dashboard')}
          onBrowse={() => router.push('/opportunities')}
        />
      )
  }
}

// ============================================================
// Grouping helper
// ============================================================

function groupSessions(sessions: ApiSession[]): SessionGroup[] {
  const groups: SessionGroup[] = []
  const seen: Record<string, SessionGroup> = {}
  for (const s of sessions) {
    if (s.groupKey) {
      if (!seen[s.groupKey]) {
        seen[s.groupKey] = { key: s.groupKey, variants: [] }
        groups.push(seen[s.groupKey])
      }
      seen[s.groupKey].variants.push(s)
    } else {
      groups.push({ key: s.id, variants: [s] })
    }
  }
  // Sort variants within each group by duration ascending
  groups.forEach(g => g.variants.sort((a, b) => a.durationMinutes - b.durationMinutes))
  return groups
}

// ============================================================
// CATALOG SCREEN
// ============================================================

function CatalogScreen({ mob, onSelect, onBack }: {
  mob: boolean
  onSelect: (session: ApiSession) => void
  onBack: () => void
}) {
  const [sessions, setSessions] = useState<ApiSession[]>([])
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    api.get<{ data: ApiSession[] }>('/api/v1/consultations/sessions')
      .then(r => setSessions(r.data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  const fadeIn = (delay: number): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : 'translateY(16px)',
    transition: `opacity 600ms ${delay}ms ease, transform 600ms ${delay}ms ease`,
  })

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: mob ? '24px 16px 56px' : '40px 24px 80px', width: '100%' }}>
      <div onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-sans)', fontSize: mob ? 12.5 : 13.5, fontWeight: 500, color: 'var(--app-ginger)', cursor: 'pointer', marginBottom: mob ? 20 : 28, ...fadeIn(0) }}>
        <ArrowLeft size={mob ? 14 : 16} /> Back to services
      </div>

      <div style={{ ...fadeIn(60), marginBottom: mob ? 6 : 8 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--app-ginger)', marginBottom: 10 }}>OppDate Consultations</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: mob ? 28 : 38, lineHeight: 1.08, letterSpacing: '-0.025em', color: 'var(--app-ink)', margin: '0 0 12px' }}>
          Book a session with an <span style={{ color: 'var(--app-ginger)' }}>OppDate expert</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 14 : 15.5, lineHeight: 1.7, color: 'var(--app-text-sec)', maxWidth: 580, margin: 0 }}>
          One focused session covering what you actually need. No templates, no fluff.
        </p>
      </div>

      <div style={{ height: 1, background: 'var(--app-hairline)', margin: mob ? '20px 0 24px' : '28px 0 32px' }} />

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: mob ? 14 : 20 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ height: 200, borderRadius: 18, background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.6)', animation: 'ebRise 400ms var(--ease-out-soft) both', opacity: 0.6 }} />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: mob ? '40px 20px' : '60px 32px', background: 'rgba(255,255,255,0.5)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.6)' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(122,45,5,0.08)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Calendar size={24} style={{ color: 'var(--app-ginger)' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 18, color: 'var(--app-ink)', marginBottom: 6 }}>No sessions available right now</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--app-text-sec)', lineHeight: 1.6 }}>New sessions are added regularly. Check back soon.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: mob ? 14 : 20, ...fadeIn(180) }}>
          {groupSessions(sessions).map((g, i) => (
            g.variants.length === 1
              ? <SessionCatalogCard key={g.key} session={g.variants[0]} mob={mob} delay={i * 70} onBook={() => onSelect(g.variants[0])} />
              : <SessionGroupCatalogCard key={g.key} group={g} mob={mob} delay={i * 70} onBook={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

function SessionCatalogCard({ session: s, mob, delay, onBook }: {
  session: ApiSession; mob: boolean; delay: number; onBook: () => void
}) {
  const [hover, setHover] = useState(false)
  const noSlots = s.availableSlots === 0

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', padding: mob ? 20 : 24,
        background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px) saturate(140%)', WebkitBackdropFilter: 'blur(16px) saturate(140%)',
        borderRadius: 20,
        border: `1.5px solid ${hover && !noSlots ? 'rgba(122,45,5,0.30)' : 'rgba(255,255,255,0.7)'}`,
        boxShadow: hover && !noSlots ? '0 16px 40px rgba(122,45,5,0.12)' : 'var(--app-card-shadow)',
        transform: hover && !noSlots ? 'translateY(-4px) scale(1.01)' : 'none',
        transition: 'transform 180ms var(--ease-out-soft), box-shadow 180ms var(--ease-out-soft), border-color 180ms',
        animation: `ebRise 450ms var(--ease-out-soft) ${delay}ms both`,
        opacity: noSlots ? 0.72 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--app-text-sec)' }}>{s.durationMinutes} min</span>
        <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 26, color: 'var(--app-ink)', letterSpacing: '-0.02em' }}>${(s.priceUsd / 100).toFixed(0)}</span>
      </div>

      <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: mob ? 16 : 18, color: '#B5530A', marginBottom: 8, letterSpacing: '-0.01em', lineHeight: 1.25 }}>{s.title}</div>

      {s.description && (
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, lineHeight: 1.6, color: 'var(--app-ink-body)', flex: 1, margin: '0 0 16px' }}>{s.description}</p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--app-hairline)', marginTop: 'auto' }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: noSlots ? 'var(--app-text-sec)' : 'var(--app-ginger)', fontWeight: 500 }}>
          {noSlots ? 'No slots available' : `${s.availableSlots} slot${s.availableSlots !== 1 ? 's' : ''} available`}
        </span>
        <button
          onClick={onBook}
          disabled={noSlots}
          style={{
            height: 40, padding: '0 18px', borderRadius: 10, border: 'none',
            background: noSlots ? 'rgba(122,45,5,0.16)' : 'var(--app-ginger)',
            color: noSlots ? 'var(--app-text-sec)' : '#fff',
            fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600,
            cursor: noSlots ? 'not-allowed' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            transition: 'background 150ms var(--ease-out-soft)',
          }}
        >
          Book <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

function SessionGroupCatalogCard({ group, mob, delay, onBook }: {
  group: SessionGroup; mob: boolean; delay: number; onBook: (s: ApiSession) => void
}) {
  const [picked, setPicked] = useState(group.variants[0].id)
  const [hover, setHover] = useState(false)
  const pickedSession = group.variants.find(v => v.id === picked) ?? group.variants[0]
  const noSlots = pickedSession.availableSlots === 0
  // Strip common variant suffixes to get the group display name
  const groupTitle = group.variants[0].title.replace(/\s*[-–]\s*(Quick Check|Full Review|Comprehensive Session|Comprehensive)$/i, '')

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', padding: mob ? 20 : 24,
        background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px) saturate(140%)', WebkitBackdropFilter: 'blur(16px) saturate(140%)',
        borderRadius: 20,
        border: `1.5px solid ${hover ? 'rgba(122,45,5,0.30)' : 'rgba(255,255,255,0.7)'}`,
        boxShadow: hover ? '0 16px 40px rgba(122,45,5,0.12)' : 'var(--app-card-shadow)',
        transform: hover ? 'translateY(-4px) scale(1.01)' : 'none',
        transition: 'transform 180ms var(--ease-out-soft), box-shadow 180ms var(--ease-out-soft), border-color 180ms',
        animation: `ebRise 450ms var(--ease-out-soft) ${delay}ms both`,
      }}
    >
      <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: mob ? 16 : 18, color: '#B5530A', marginBottom: 10, letterSpacing: '-0.01em', lineHeight: 1.25 }}>{groupTitle}</div>

      {group.variants[0].description && (
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, lineHeight: 1.6, color: 'var(--app-ink-body)', flex: 1, margin: '0 0 14px' }}>{group.variants[0].description}</p>
      )}

      <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
        {group.variants.map(v => {
          const on = picked === v.id
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setPicked(v.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                padding: '10px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                background: on ? 'rgba(122,45,5,0.08)' : 'transparent',
                border: `1.5px solid ${on ? 'rgba(122,45,5,0.35)' : 'var(--app-hairline)'}`,
                transition: 'background 140ms, border-color 140ms',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${on ? 'var(--app-ginger)' : 'var(--app-text-sec)'}`, background: on ? 'var(--app-ginger)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {on && <Check size={9} strokeWidth={3} color="#fff" />}
                </span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600, color: 'var(--app-ink)' }}>{v.durationMinutes} min</span>
              </span>
              <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 16, color: 'var(--app-ink)' }}>${(v.priceUsd / 100).toFixed(0)}</span>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--app-hairline)' }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: noSlots ? 'var(--app-text-sec)' : 'var(--app-ginger)', fontWeight: 500 }}>
          {noSlots ? 'No slots available' : `${pickedSession.availableSlots} slot${pickedSession.availableSlots !== 1 ? 's' : ''} available`}
        </span>
        <button
          onClick={() => onBook(pickedSession)}
          disabled={noSlots}
          style={{
            height: 40, padding: '0 18px', borderRadius: 10, border: 'none',
            background: noSlots ? 'rgba(122,45,5,0.16)' : 'var(--app-ginger)',
            color: noSlots ? 'var(--app-text-sec)' : '#fff',
            fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600,
            cursor: noSlots ? 'not-allowed' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            transition: 'background 150ms var(--ease-out-soft)',
          }}
        >
          Book <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

// ============================================================
// SLOTS SCREEN
// ============================================================

function SlotsScreen({ session, mob, onBack, onContinue, backLabel }: {
  session: ApiSession; mob: boolean
  onBack: () => void; onContinue: (slot: ApiSlot) => void; backLabel?: string
}) {
  const [slots, setSlots] = useState<ApiSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [selSlot, setSelSlot] = useState<ApiSlot | null>(null)
  const [selDate, setSelDate] = useState<string | null>(null)
  const now = new Date()
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() })

  useEffect(() => {
    setLoading(true)
    api.get<{ data: ApiSlot[] }>(`/api/v1/consultations/sessions/${session.id}/slots`)
      .then(r => {
        const data = r.data?.data ?? []
        setSlots(data)
        if (data.length > 0) {
          const earliest = new Date(data.reduce((a, b) => a.startsAt < b.startsAt ? a : b).startsAt)
          setMonth({ y: earliest.getFullYear(), m: earliest.getMonth() })
        }
      })
      .catch(() => setSlots([]))
      .finally(() => setLoading(false))
  }, [session.id])

  // Build a map of date -> slots
  const byDate: Record<string, ApiSlot[]> = {}
  slots.forEach(slot => {
    const key = new Date(slot.startsAt).toISOString().slice(0, 10)
    ;(byDate[key] = byDate[key] || []).push(slot)
  })

  const firstDay = new Date(month.y, month.m, 1).getDay()
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function isoKey(d: number) {
    return `${month.y}-${String(month.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  function hasSlots(d: number) { return !!byDate[isoKey(d)] }
  function isPast(d: number) { return new Date(isoKey(d)) < now }

  const daySlots = selDate ? byDate[selDate] || [] : []
  const morning = daySlots.filter(s => new Date(s.startsAt).getHours() < 12)
  const afternoon = daySlots.filter(s => { const h = new Date(s.startsAt).getHours(); return h >= 12 && h < 17 })
  const evening = daySlots.filter(s => new Date(s.startsAt).getHours() >= 17)

  const canContinue = selSlot !== null

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: mob ? '24px 16px 40px' : '32px 24px 56px', width: '100%' }}>
      <div onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-sans)', fontSize: mob ? 12.5 : 13.5, fontWeight: 500, color: 'var(--app-ginger)', cursor: 'pointer', marginBottom: mob ? 14 : 18 }}>
        <ArrowLeft size={mob ? 14 : 16} /> {backLabel ?? 'Back to sessions'}
      </div>

      {/* Session summary header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: mob ? 10 : 14, padding: mob ? '12px 14px' : '14px 18px', borderRadius: mob ? 12 : 14, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px) saturate(140%)', WebkitBackdropFilter: 'blur(20px) saturate(140%)', border: '1px solid rgba(255,255,255,0.7)', boxShadow: 'var(--app-card-shadow)', marginBottom: mob ? 18 : 24 }}>
        <div style={{ width: mob ? 38 : 44, height: mob ? 38 : 44, borderRadius: mob ? 8 : 10, background: 'rgba(122,45,5,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Target size={mob ? 18 : 22} style={{ color: 'var(--app-ginger)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: mob ? 14 : 16, color: 'var(--app-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.title.replace(/\s*[-–]\s*(Quick Check|Full Review|Comprehensive Session|Comprehensive)$/i, '')}</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 12 : 13, color: 'var(--app-text-sec)' }}>{session.durationMinutes} min session</div>
        </div>
        <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: mob ? 18 : 22, color: 'var(--app-ginger)', flexShrink: 0 }}>${(session.priceUsd / 100).toFixed(0)}</span>
      </div>

      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: mob ? 22 : 28, color: 'var(--app-ink)', margin: mob ? '0 0 16px' : '0 0 22px', letterSpacing: '-0.02em' }}>Choose a date and time</h1>

      {loading ? (
        <CalSkeleton mob={mob} />
      ) : slots.length === 0 ? (
        <CalEmpty mob={mob} />
      ) : (
        <div style={{ animation: 'ebRise 380ms var(--ease-out-soft) both' }}>
          {/* Month nav */}
          {(() => {
            const atMin = month.y === now.getFullYear() && month.m === now.getMonth()
            return (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 2px' }}>
                <button
                  onClick={() => { if (!atMin) setMonth(p => p.m > 0 ? { y: p.y, m: p.m - 1 } : { y: p.y - 1, m: 11 }) }}
                  disabled={atMin}
                  style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.7)', border: '1px solid var(--app-hairline)', cursor: atMin ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--app-ink)', opacity: atMin ? 0.25 : 1 }}>
                  <ChevronLeft size={18} />
                </button>
                <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 17, color: 'var(--app-ink)' }}>{MONTHS[month.m]} {month.y}</span>
                <button onClick={() => setMonth(p => p.m < 11 ? { y: p.y, m: p.m + 1 } : { y: p.y + 1, m: 0 })}
                  style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.7)', border: '1px solid var(--app-hairline)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--app-ink)' }}>
                  <ChevronRight size={18} />
                </button>
              </div>
            )
          })()}

          {/* Calendar grid */}
          <div style={{ background: 'rgba(255,255,255,0.68)', backdropFilter: 'blur(20px) saturate(140%)', WebkitBackdropFilter: 'blur(20px) saturate(140%)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.7)', padding: mob ? '14px 12px' : '18px 16px', boxShadow: 'var(--app-card-shadow)', marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
              {DOW.map(d => <div key={d} style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--app-text-sec)', textAlign: 'center', padding: '4px 0' }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
              {cells.map((d, i) => {
                if (d === null) return <div key={i} />
                const avl = hasSlots(d) && !isPast(d)
                const sel = selDate === isoKey(d)
                return (
                  <button key={i} disabled={!avl} onClick={() => { setSelDate(isoKey(d)); setSelSlot(null) }}
                    style={{
                      aspectRatio: '1', borderRadius: 10, border: 'none',
                      cursor: avl ? 'pointer' : 'default',
                      background: sel ? 'var(--app-ginger)' : avl ? 'rgba(122,45,5,0.07)' : 'transparent',
                      color: sel ? '#fff' : avl ? 'var(--app-ink)' : 'rgba(106,123,133,0.35)',
                      fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: sel ? 600 : avl ? 500 : 400,
                      transition: 'all 120ms var(--ease-out-soft)',
                      transform: sel ? 'scale(1.08)' : 'scale(1)'
                    }}>{d}</button>
                )
              })}
            </div>
          </div>

          {/* Time slots */}
          {selDate && (
            <div style={{ animation: 'ebRise 280ms var(--ease-out-soft) both' }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--app-text-sec)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>
                Available times for {fmtDateShort(selDate).split(',')[0]}
              </div>
              {([['Morning', morning], ['Afternoon', afternoon], ['Evening', evening]] as const).map(([label, ts]) => ts.length ? (
                <div key={label} style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--app-text-sec)', marginBottom: 7 }}>{label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {ts.map(slot => {
                      const sel = selSlot?.id === slot.id
                      return (
                        <button key={slot.id} onClick={() => setSelSlot(slot)}
                          style={{
                            height: 40, padding: '0 16px', borderRadius: 999, cursor: 'pointer',
                            background: sel ? 'var(--app-ginger)' : 'rgba(255,255,255,0.75)',
                            border: `1.5px solid ${sel ? 'var(--app-ginger)' : 'var(--app-hairline)'}`,
                            color: sel ? '#fff' : 'var(--app-ink)', fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: sel ? 600 : 400,
                            transform: sel ? 'scale(1.04)' : 'scale(1)',
                            transition: 'all 150ms var(--ease-out-soft)'
                          }}>{fmtTime(slot.startsAt)}</button>
                      )
                    })}
                  </div>
                </div>
              ) : null)}
            </div>
          )}
        </div>
      )}

      {/* Continue CTA */}
      <div style={{ marginTop: 28 }}>
        <button
          onClick={() => canContinue && onContinue(selSlot!)}
          style={{
            width: '100%', height: 52, borderRadius: 10, border: 'none',
            background: canContinue ? 'var(--app-ginger)' : 'rgba(122,45,5,0.32)',
            color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
            cursor: canContinue ? 'pointer' : 'not-allowed',
            transition: 'background 300ms var(--ease-out-soft), box-shadow 300ms var(--ease-out-soft)',
            boxShadow: canContinue ? '0 8px 24px rgba(122,45,5,0.22)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}
        >
          Continue to booking <ChevronRight size={17} />
        </button>
        {!canContinue && !loading && slots.length > 0 && (
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--app-text-sec)', textAlign: 'center', marginTop: 8 }}>Select a date and time to continue</div>
        )}
      </div>
    </div>
  )
}

function CalSkeleton({ mob }: { mob: boolean }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.68)', borderRadius: 18, padding: mob ? 16 : 22, boxShadow: 'var(--app-card-shadow)', border: '1px solid rgba(255,255,255,0.7)', animation: 'ebRise 340ms var(--ease-out-soft) both' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} style={{ aspectRatio: '1', borderRadius: 9, background: 'linear-gradient(90deg, rgba(212,132,58,0.10) 25%, rgba(212,132,58,0.22) 50%, rgba(212,132,58,0.10) 75%)', backgroundSize: '200% 100%', animation: `ebSkimmer 1.4s ease ${i * 30}ms infinite` }} />
        ))}
      </div>
    </div>
  )
}

function CalEmpty({ mob }: { mob: boolean }) {
  return (
    <div style={{ textAlign: 'center', padding: mob ? '36px 20px' : '48px 32px', background: 'rgba(255,255,255,0.68)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.7)', boxShadow: 'var(--app-card-shadow)', animation: 'ebRise 340ms var(--ease-out-soft) both' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(122,45,5,0.08)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Calendar size={26} style={{ color: 'var(--app-ginger)' }} />
      </div>
      <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 18, color: 'var(--app-ink)', marginBottom: 6 }}>No sessions available right now</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--app-text-sec)', maxWidth: 320, margin: '0 auto', lineHeight: 1.6 }}>New slots are added regularly. Check back soon.</div>
    </div>
  )
}

// ============================================================
// REVIEW SCREEN
// ============================================================

function ReviewScreen({ session, slot, mob, onBack }: {
  session: ApiSession; slot: ApiSlot; mob: boolean
  onBack: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      // Step 1: reserve the slot and create a pending booking
      const bookingRes = await api.post<{ data: BookingResult }>('/api/v1/consultations', {
        sessionId: session.id,
        slotId: slot.id,
      })
      const booking = bookingRes.data.data

      // Step 2: create a payment checkout session
      const paymentRes = await api.post<{ data: { checkoutUrl: string } }>('/api/v1/payments/create-session', {
        purpose: 'consultation',
        referenceId: booking.id,
        gateway: 'stripe',
      })
      const checkoutUrl = paymentRes.data?.data?.checkoutUrl
      if (!checkoutUrl) throw new Error('No checkout URL returned')

      // Step 3: redirect to payment provider
      window.location.href = checkoutUrl
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err?.response?.data?.message || 'Booking failed. Please try again.')
      setSubmitting(false)
    }
  }

  const priceDisplay = (session.priceUsd / 100).toFixed(0)

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: mob ? '24px 16px 40px' : '32px 24px 56px', width: '100%' }}>
      <div onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-sans)', fontSize: mob ? 12.5 : 13.5, fontWeight: 500, color: 'var(--app-ginger)', cursor: 'pointer', marginBottom: mob ? 14 : 18 }}>
        <ArrowLeft size={mob ? 14 : 16} /> Back to date selection
      </div>

      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: mob ? 24 : 30, color: 'var(--app-ink)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Review your booking</h1>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 13 : 14, color: 'var(--app-text-sec)', margin: mob ? '0 0 18px' : '0 0 24px' }}>Confirm your session details. You will be redirected to Stripe to complete payment.</p>

      <div style={{
        background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(140%)', WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        border: '1px solid rgba(255,255,255,0.7)', borderRadius: 18, padding: 24, boxShadow: 'var(--app-card-shadow-hi)',
        animation: 'ebRise 380ms var(--ease-out-soft) both'
      }}>
        <div style={{ paddingBottom: 18, borderBottom: '1px solid var(--app-hairline)', marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--app-text-sec)', marginBottom: 14 }}>Session details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <DetailRow icon={<Target size={16} />} label={session.title} sub={`${session.durationMinutes} min session`} />
            <DetailRow icon={<Calendar size={16} />} label={fmtDate(slot.startsAt)} />
            <DetailRow icon={<Clock size={16} />} label={fmtTime(slot.startsAt)} />
            <DetailRow icon={<Video size={16} />} label="Video call" sub="Meeting link sent by email after confirmation" />
          </div>
        </div>

        <div style={{ paddingBottom: 18, borderBottom: '1px solid var(--app-hairline)', marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--app-text-sec)', marginBottom: 12 }}>Order summary</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--app-text-sec)' }}>{session.title}</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--app-ink-body)', fontWeight: 500 }}>${priceDisplay}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--app-ink)' }}>Total</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 26, color: 'var(--app-ginger)' }}>${priceDisplay}</span>
        </div>

        {error && (
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#c0392b', background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
            {error}
          </div>
        )}

        <button onClick={handleConfirm} disabled={submitting} style={{
          width: '100%', height: 52, borderRadius: 10, border: 'none',
          background: submitting ? 'rgba(122,45,5,0.5)' : 'var(--app-ginger)', color: '#fff',
          fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
          cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: '0 2px 12px rgba(122,45,5,0.22)',
          transition: 'background 150ms var(--ease-out-soft), transform 120ms'
        }}
          onMouseEnter={e => { if (!submitting) { e.currentTarget.style.background = '#5C2104'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
          onMouseLeave={e => { e.currentTarget.style.background = submitting ? 'rgba(122,45,5,0.5)' : 'var(--app-ginger)'; e.currentTarget.style.transform = 'none' }}
        >
          {submitting ? 'Redirecting to payment...' : 'Confirm and pay'}
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14 }}>
          <ShieldCheck size={16} style={{ color: 'var(--app-green)', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--app-text-sec)', lineHeight: 1.5 }}>Secure payment via Stripe. Your meeting link will be sent by email once your booking is confirmed.</span>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{ color: 'var(--app-ginger)', marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--app-ink)' }}>{label}</div>
        {sub && <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--app-text-sec)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ============================================================
// CONFIRMATION SCREEN
// ============================================================

function Confetti() {
  const colors = ['#D4843A', '#B5530A', '#7A2D05', '#F2C39E', '#E9C9A3', '#4B7A3E', '#0E7490']
  const pieces = useRef(
    Array.from({ length: 40 }, (_, i) => ({
      left: Math.random() * 100,
      drift: (Math.random() - 0.5) * 200,
      rot: Math.random() * 720 - 360,
      delay: Math.random() * 1.2,
      dur: 2.5 + Math.random() * 2,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 6,
      shape: Math.random() > 0.5 ? 'circle' : 'rect'
    }))
  ).current

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2, overflow: 'visible' }}>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: -20,
          left: `${p.left}%`,
          width: p.size,
          height: p.shape === 'circle' ? p.size : p.size * 1.5,
          borderRadius: p.shape === 'circle' ? '50%' : 2,
          background: p.color,
          animation: `ebConfetti ${p.dur}s ease-in ${p.delay}s both`,
          ['--drift' as string]: `${p.drift}px`,
          ['--rot' as string]: `${p.rot}deg`
        } as React.CSSProperties} />
      ))}
    </div>
  )
}

function ConfirmationScreen({ session, slot, booking, mob, onDashboard, onBrowse }: {
  session: ApiSession; slot: ApiSlot; booking: BookingResult
  mob: boolean; onDashboard: () => void; onBrowse: () => void
}) {
  const priceDisplay = Math.round(booking.priceUsd / 100)
  const [pop, setPop] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setTimeout(() => setPop(true), 40)
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      <Confetti />
      <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: mob ? '60vh' : '70vh', padding: mob ? '24px 16px 40px' : 32 }}>
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{
            width: mob ? 64 : 76, height: mob ? 64 : 76, borderRadius: '50%', background: 'rgba(75,122,62,0.12)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: mob ? 16 : 20,
            transform: pop ? 'scale(1)' : 'scale(0.5)',
            transition: 'transform 440ms cubic-bezier(0.34,1.56,0.46,1)'
          }}>
            <span style={{ width: mob ? 44 : 52, height: mob ? 44 : 52, borderRadius: '50%', background: 'var(--app-green)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={mob ? 24 : 28} style={{ color: '#fff' }} />
            </span>
          </div>

          <div style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 11 : 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--app-green)', marginBottom: mob ? 8 : 10, animation: 'ebRise 400ms var(--ease-out-soft) 200ms both' }}>Booking confirmed</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: mob ? 26 : 32, color: 'var(--app-ink)', margin: '0 0 10px', lineHeight: 1.12, letterSpacing: '-0.02em', animation: 'ebRise 400ms var(--ease-out-soft) 260ms both' }}>Your session is booked.</h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 13.5 : 14.5, color: 'var(--app-text-sec)', margin: mob ? '0 auto 20px' : '0 auto 26px', maxWidth: 360, lineHeight: 1.65, animation: 'ebRise 400ms var(--ease-out-soft) 320ms both' }}>
            Payment received. Your meeting link will arrive by email shortly. Your session is also saved in Upcoming Sessions on your dashboard.
          </p>

          <div style={{
            background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(24px) saturate(140%)', WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            border: '1px solid rgba(255,255,255,0.8)', borderRadius: mob ? 14 : 18, padding: mob ? 16 : 22, marginBottom: mob ? 20 : 26, textAlign: 'left',
            boxShadow: 'var(--app-card-shadow)',
            animation: 'ebRise 400ms var(--ease-out-soft) 380ms both'
          }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--app-text-sec)', marginBottom: mob ? 12 : 14 }}>Session receipt</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <DetailRow icon={<Target size={15} />} label={session.title} sub={`$${priceDisplay} - ${session.durationMinutes} min`} />
              <DetailRow icon={<Calendar size={15} />} label={fmtDate(slot.startsAt)} />
              <DetailRow icon={<Clock size={15} />} label={fmtTime(slot.startsAt)} />
              <DetailRow icon={<Video size={15} />} label="Video call" sub="Link arriving by email shortly" />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: mob ? 'column' : 'row', gap: mob ? 10 : 12, justifyContent: 'center', animation: 'ebRise 400ms var(--ease-out-soft) 440ms both' }}>
            <button onClick={onDashboard} style={{
              height: mob ? 46 : 50, padding: mob ? '0 18px' : '0 24px', borderRadius: 10, border: 'none',
              background: 'var(--app-ginger)', color: '#fff',
              fontFamily: 'var(--font-sans)', fontSize: mob ? 14 : 15, fontWeight: 600,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: mob ? '100%' : undefined,
              boxShadow: '0 2px 12px rgba(122,45,5,0.22)',
              transition: 'background 150ms var(--ease-out-soft), transform 120ms',
              whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#5C2104'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--app-ginger)'; e.currentTarget.style.transform = 'none' }}
            >
              View upcoming sessions
            </button>
            <button onClick={onBrowse} style={{
              height: mob ? 46 : 50, padding: mob ? '0 18px' : '0 20px', borderRadius: 10,
              background: 'rgba(255,255,255,0.6)', border: '1px solid var(--app-hairline)',
              color: 'var(--app-ink)', fontFamily: 'var(--font-sans)', fontSize: mob ? 13 : 14, fontWeight: 500,
              cursor: 'pointer', width: mob ? '100%' : undefined,
              transition: 'border-color 150ms, color 150ms',
              whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--app-ginger)'; e.currentTarget.style.color = 'var(--app-ginger)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--app-hairline)'; e.currentTarget.style.color = 'var(--app-ink)' }}
            >
              Browse opportunities
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
