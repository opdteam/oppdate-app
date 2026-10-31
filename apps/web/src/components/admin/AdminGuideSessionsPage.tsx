'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { api, extractApiError } from '@/lib/api'
import {
  MessageSquare,
  Flag,
  ChevronLeft,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  TrendingUp,
} from 'lucide-react'

// -- Hook --

function useIsMobile(bp = 760) {
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

// -- Types --

type Sentiment = 'positive' | 'neutral' | 'concerned'

type InsightsData = {
  totalSessions: number
  sessionsThisWeek: number
  eligCheckRate: number
  flagRate: number
  topOpportunities: { opportunitySlug: string; sessionCount: number }[]
  topTopics: { topic: string; hit_count: number }[]
}

type SessionListItem = {
  id: string
  userId: string
  userName: string
  userEmail: string
  userAvatarUrl: string | null
  opportunitySlug: string
  startedAt: string
  endedAt: string | null
  messageCount: number
  eligTriggered: boolean
  eligVerdict: string | null
  sentiment: Sentiment
  flagCount: number
  createdAt: string
}

type ListResponse = {
  sessions: SessionListItem[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
  ts: string
}

type FlagItem = {
  id: string
  messageIndex: number
  reason: string
  notes: string | null
  adminName: string
  createdAt: string
}

type SessionDetail = {
  id: string
  userId: string
  userName: string
  userEmail: string
  userAvatarUrl: string | null
  opportunitySlug: string
  startedAt: string
  endedAt: string | null
  messageCount: number
  eligTriggered: boolean
  eligVerdict: string | null
  sentiment: Sentiment
  messages: Message[]
  flagCount: number
  createdAt: string
}

type DetailResponse = {
  session: SessionDetail
  flags: FlagItem[]
}

// -- Count-up hook --

function useCountUp(target: number, duration = 600) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (target === 0) { setVal(0); return }
    let start: number | null = null
    let raf: number
    const step = (ts: number) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setVal(Math.round(ease * target))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

// -- Style helpers --

const glass = (opacity = 0.88): React.CSSProperties => ({
  background: `rgba(22,9,2,${opacity})`,
  border: '1px solid rgba(181,83,10,0.22)',
  backdropFilter: 'blur(18px) saturate(130%)',
  WebkitBackdropFilter: 'blur(18px) saturate(130%)',
})

const sentimentStyle = (s: Sentiment): React.CSSProperties => {
  if (s === 'positive') return { background: 'rgba(22,101,52,0.35)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }
  if (s === 'concerned') return { background: 'rgba(127,29,29,0.35)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }
  return { background: 'rgba(120,83,10,0.35)', color: '#fbbf24', border: '1px solid rgba(181,83,10,0.3)' }
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function duration(start: string, end: string | null) {
  if (!end) return '-'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const mins = Math.round(ms / 60000)
  return `${mins}m`
}

// -- Stat card --

function StatCard({ label, value, isPercent }: { label: string; value: number; isPercent?: boolean }) {
  const displayed = useCountUp(value)
  return (
    <div style={{
      ...glass(),
      borderRadius: 14,
      padding: '18px 20px 18px 22px',
      flex: 1,
      minWidth: 140,
      borderLeft: '3px solid #B5530A',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(181,83,10,0.07) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />
      <div style={{ color: 'rgba(200,155,90,0.75)', fontSize: 11.5, fontFamily: 'var(--font-sans)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ color: '#fff', fontSize: 28, fontFamily: 'DM Mono, monospace', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>
        {displayed}{isPercent ? '%' : ''}
      </div>
    </div>
  )
}

// -- Sentiment pill --

function SentimentPill({ s }: { s: Sentiment }) {
  return (
    <span style={{ ...sentimentStyle(s), borderRadius: 20, padding: '2px 10px', fontSize: 11, fontFamily: 'var(--font-sans)', fontWeight: 600, textTransform: 'capitalize', display: 'inline-block' }}>
      {s}
    </span>
  )
}

// -- Insights strip --

function InsightsStrip() {
  const { data } = useQuery<InsightsData>({
    queryKey: ['guide-sessions-insights'],
    queryFn: () => api.get('/api/v1/guide-sessions/admin/insights').then(r => r.data.data),
  })

  const d = data ?? { totalSessions: 0, sessionsThisWeek: 0, eligCheckRate: 0, flagRate: 0, topOpportunities: [], topTopics: [] }

  const panelHead: React.CSSProperties = {
    color: '#D4843A', fontSize: 11.5, fontFamily: 'var(--font-sans)',
    textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700,
    marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
  }
  const panelRow: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '7px 0', borderBottom: '1px solid rgba(181,83,10,0.12)',
  }
  const noData: React.CSSProperties = { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontFamily: 'var(--font-sans)' }

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 14 }}>
        <StatCard label="Total sessions" value={d.totalSessions} />
        <StatCard label="This week" value={d.sessionsThisWeek} />
        <StatCard label="Elig check rate" value={d.eligCheckRate} isPercent />
        <StatCard label="Flag rate" value={d.flagRate} isPercent />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ ...glass(), borderRadius: 14, padding: '18px 20px' }}>
          <div style={panelHead}><TrendingUp size={13} /> Top opportunities</div>
          {d.topOpportunities.length === 0 ? (
            <div style={noData}>No data</div>
          ) : d.topOpportunities.slice(0, 5).map((o, i) => (
            <div key={i} style={{ ...panelRow, ...(i === d.topOpportunities.slice(0,5).length - 1 ? { borderBottom: 'none' } : {}) }}>
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: 'var(--font-sans)', fontWeight: 500 }}>{o.opportunitySlug}</span>
              <span style={{ color: '#D4843A', fontSize: 13, fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>{o.sessionCount}</span>
            </div>
          ))}
        </div>
        <div style={{ ...glass(), borderRadius: 14, padding: '18px 20px' }}>
          <div style={panelHead}><MessageSquare size={13} /> Top topics</div>
          {d.topTopics.length === 0 ? (
            <div style={noData}>No data</div>
          ) : d.topTopics.slice(0, 5).map((t, i) => (
            <div key={i} style={{ ...panelRow, ...(i === d.topTopics.slice(0,5).length - 1 ? { borderBottom: 'none' } : {}) }}>
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: 'var(--font-sans)', fontWeight: 500, textTransform: 'capitalize' }}>{t.topic}</span>
              <span style={{ color: '#D4843A', fontSize: 13, fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>{t.hit_count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// -- Flag form inline accordion --

function FlagForm({ sessionId, messageIndex, onDone }: { sessionId: string; messageIndex: number; onDone: () => void }) {
  const [reason, setReason] = useState('inaccurate')
  const [notes, setNotes] = useState('')
  const qc = useQueryClient()

  const mut = useMutation({
    mutationFn: (body: { sessionId: string; messageIndex: number; reason: string; notes?: string }) =>
      api.post('/api/v1/guide-sessions/admin/flags', body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guide-session-detail', sessionId] })
      onDone()
    },
  })

  return (
    <div style={{ marginTop: 8, padding: '12px 14px', background: 'rgba(181,83,10,0.1)', borderRadius: 8, border: '1px solid rgba(181,83,10,0.22)' }}>
      <div style={{ marginBottom: 10 }}>
        <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, display: 'block', marginBottom: 4, fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason</label>
        <select
          value={reason}
          onChange={e => setReason(e.target.value)}
          style={{ width: '100%', background: 'rgba(28,12,3,0.7)', border: '1px solid rgba(181,83,10,0.3)', borderRadius: 6, color: '#fff', padding: '6px 10px', fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none' }}
        >
          <option value="inaccurate">Inaccurate</option>
          <option value="misleading">Misleading</option>
          <option value="harmful">Harmful</option>
          <option value="off_topic">Off topic</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, display: 'block', marginBottom: 4, fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Additional context..."
          style={{ width: '100%', background: 'rgba(28,12,3,0.7)', border: '1px solid rgba(181,83,10,0.3)', borderRadius: 6, color: '#fff', padding: '6px 10px', fontSize: 13, fontFamily: 'var(--font-sans)', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => mut.mutate({ sessionId, messageIndex, reason, notes: notes || undefined })}
          disabled={mut.isPending}
          style={{ background: '#B55E0E', border: 'none', borderRadius: 6, color: '#fff', padding: '6px 16px', fontSize: 13, fontFamily: 'var(--font-sans)', cursor: 'pointer', fontWeight: 600, opacity: mut.isPending ? 0.6 : 1 }}
        >
          {mut.isPending ? 'Submitting...' : 'Submit'}
        </button>
        <button
          onClick={onDone}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: 'rgba(255,255,255,0.5)', padding: '6px 12px', fontSize: 13, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
      {mut.isError && (
        <div style={{ marginTop: 8, color: '#f87171', fontSize: 12 }}>
          {extractApiError(mut.error, 'Failed to submit flag.')}
        </div>
      )}
    </div>
  )
}

// -- Chat bubble --

function ChatBubble({ msg, index, sessionId, existingFlag }: {
  msg: Message
  index: number
  sessionId: string
  existingFlag?: FlagItem
}) {
  const [flagOpen, setFlagOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const delay = Math.min(index, 8) * 40

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  if (msg.role === 'system') {
    return (
      <div
        style={{
          textAlign: 'center',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(8px)',
          transition: `opacity 220ms ease ${delay}ms, transform 220ms ease ${delay}ms`,
          margin: '10px 0',
        }}
      >
        <span style={{ background: 'rgba(181,83,10,0.18)', color: 'rgba(255,255,255,0.5)', fontSize: 11, padding: '3px 12px', borderRadius: 20, fontFamily: 'var(--font-sans)' }}>
          {msg.content}
        </span>
      </div>
    )
  }

  const isUser = msg.role === 'user'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 10,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: `opacity 220ms ease ${delay}ms, transform 220ms ease ${delay}ms`,
      }}
    >
      <div
        style={{
          maxWidth: '76%',
          padding: '10px 14px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isUser ? 'rgba(181,83,10,0.38)' : 'rgba(255,255,255,0.07)',
          border: isUser ? '1px solid rgba(181,83,10,0.4)' : '1px solid rgba(255,255,255,0.1)',
          color: '#fff',
          fontSize: 14,
          fontFamily: 'var(--font-sans)',
          lineHeight: 1.5,
          position: 'relative',
        }}
      >
        {msg.content}
        {!isUser && !existingFlag && (
          <button
            onClick={() => setFlagOpen(f => !f)}
            title="Flag this message"
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: flagOpen ? '#D4843A' : 'rgba(255,255,255,0.25)',
              padding: 2,
              lineHeight: 1,
              transition: 'color 150ms',
            }}
          >
            <Flag size={12} />
          </button>
        )}
        {!isUser && existingFlag && (
          <span title={`Flagged: ${existingFlag.reason}`} style={{ position: 'absolute', top: 6, right: 6, color: '#f87171' }}>
            <Flag size={12} />
          </span>
        )}
      </div>
      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 3, fontFamily: 'var(--font-sans)' }}>
        {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
      {/* Flag form accordion */}
      <div
        style={{
          maxWidth: '76%',
          overflow: 'hidden',
          maxHeight: flagOpen ? 300 : 0,
          transition: 'max-height 200ms ease-out',
        }}
      >
        {flagOpen && (
          <FlagForm
            sessionId={sessionId}
            messageIndex={index}
            onDone={() => setFlagOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

// -- Session detail panel --

function SessionDetailPanel({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const isMobile = useIsMobile()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10)
    return () => clearTimeout(t)
  }, [])

  const { data, isLoading } = useQuery<DetailResponse>({
    queryKey: ['guide-session-detail', sessionId],
    queryFn: () => api.get(`/api/v1/guide-sessions/admin/${sessionId}`).then(r => r.data.data),
  })

  const flagsByIndex = (data?.flags ?? []).reduce<Record<number, FlagItem>>((acc, f) => {
    acc[f.messageIndex] = f
    return acc
  }, {})

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        ...glass(0.72),
        display: 'flex',
        flexDirection: 'column',
        transform: mounted ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 260ms cubic-bezier(0.22,1,0.36,1)',
        overflowY: 'auto',
      }
    : {
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '65%',
        zIndex: 200,
        ...glass(0.72),
        transform: mounted ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 260ms cubic-bezier(0.22,1,0.36,1)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'hidden',
      }

  const s = data?.session

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 199,
          background: 'rgba(0,0,0,0.5)',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 260ms',
        }}
      />
      <div style={panelStyle}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', borderBottom: '1px solid rgba(181,83,10,0.18)', flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: 4, display: 'flex', alignItems: 'center' }}
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div style={{ color: '#fff', fontSize: 15, fontFamily: 'var(--font-serif)', fontWeight: 600 }}>
              {s?.userName ?? 'Session detail'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
              {s?.opportunitySlug ?? ''}
            </div>
          </div>
        </div>

        {isLoading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-sans)' }}>
            Loading...
          </div>
        )}

        {!isLoading && s && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row' }}>
            {/* Transcript */}
            <div style={{ flex: isMobile ? 'unset' : '1 1 65%', overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
              {s.messages.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-sans)', fontSize: 14, textAlign: 'center', marginTop: 40 }}>No messages recorded.</div>
              ) : s.messages.map((msg, i) => (
                <ChatBubble
                  key={i}
                  msg={msg}
                  index={i}
                  sessionId={s.id}
                  existingFlag={flagsByIndex[i]}
                />
              ))}
            </div>

            {/* Sidebar */}
            <div style={{ flex: isMobile ? 'unset' : '0 0 35%', borderLeft: isMobile ? 'none' : '1px solid rgba(181,83,10,0.18)', borderTop: isMobile ? '1px solid rgba(181,83,10,0.18)' : 'none', overflowY: 'auto', padding: '20px 20px' }}>
              {/* Avatar + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                {s.userAvatarUrl ? (
                  <img src={s.userAvatarUrl} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(181,83,10,0.35)' }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(181,83,10,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(181,83,10,0.35)' }}>
                    <User size={20} color="#D4843A" />
                  </div>
                )}
                <div>
                  <div style={{ color: '#fff', fontSize: 14, fontFamily: 'var(--font-sans)', fontWeight: 600 }}>{s.userName}</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>{s.userEmail}</div>
                </div>
              </div>

              {/* Meta rows */}
              {[
                { label: 'Opportunity', value: s.opportunitySlug },
                { label: 'Messages', value: String(s.messageCount) },
                { label: 'Duration', value: duration(s.startedAt, s.endedAt) },
                { label: 'Started', value: fmt(s.startedAt) },
                { label: 'Flags', value: String(s.flagCount) },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(181,83,10,0.1)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>{label}</span>
                  <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>{value}</span>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(181,83,10,0.1)' }}>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>Sentiment</span>
                <SentimentPill s={s.sentiment} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(181,83,10,0.1)' }}>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>Elig check</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontFamily: 'var(--font-sans)', color: s.eligTriggered ? '#4ade80' : 'rgba(255,255,255,0.35)' }}>
                  {s.eligTriggered ? <CheckCircle size={13} /> : <Clock size={13} />}
                  {s.eligTriggered ? (s.eligVerdict ?? 'triggered') : 'not triggered'}
                </span>
              </div>

              {/* Flags list */}
              {data.flags.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ color: '#D4843A', fontSize: 12, fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Flag size={12} /> Flags ({data.flags.length})
                  </div>
                  {data.flags.map(f => (
                    <div key={f.id} style={{ background: 'rgba(127,29,29,0.2)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                      <div style={{ color: '#f87171', fontSize: 12, fontFamily: 'var(--font-sans)', fontWeight: 600, marginBottom: 2 }}>
                        {f.reason} - msg #{f.messageIndex + 1}
                      </div>
                      {f.notes && <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>{f.notes}</div>}
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 4, fontFamily: 'var(--font-sans)' }}>by {f.adminName} - {fmt(f.createdAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// -- Session list row --

function SessionRow({ session, onSelect }: { session: SessionListItem; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <tr
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: 'pointer',
        borderLeft: hovered ? '3px solid #D4843A' : '3px solid transparent',
        background: hovered ? 'rgba(181,83,10,0.1)' : 'transparent',
        transition: 'border-left 120ms ease, background 120ms ease',
      }}
    >
      <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {session.userAvatarUrl ? (
            <img src={session.userAvatarUrl} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(181,83,10,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={14} color="#D4843A" />
            </div>
          )}
          <div>
            <div style={{ color: '#fff', fontSize: 13, fontFamily: 'var(--font-sans)', fontWeight: 500 }}>{session.userName}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'var(--font-sans)' }}>{session.userEmail}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.65)', fontSize: 13, fontFamily: 'var(--font-sans)', verticalAlign: 'middle' }}>
        {session.opportunitySlug}
      </td>
      <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
        <SentimentPill s={session.sentiment} />
      </td>
      <td style={{ padding: '10px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
        {session.eligTriggered ? (
          <CheckCircle size={15} color="#4ade80" />
        ) : (
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>-</span>
        )}
      </td>
      <td style={{ padding: '10px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
        {session.flagCount > 0 ? (
          <span style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '2px 8px', fontSize: 11, fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
            {session.flagCount}
          </span>
        ) : (
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>0</span>
        )}
      </td>
      <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.45)', fontSize: 12, fontFamily: 'var(--font-sans)', verticalAlign: 'middle' }}>
        {fmt(session.createdAt)}
      </td>
    </tr>
  )
}

// -- Main page --

export function AdminGuideSessionsPage() {
  const isMobile = useIsMobile()
  const searchParams = useSearchParams()

  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('session'))
  const [sentiment, setSentiment] = useState<string>('all')
  const [eligFilter, setEligFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 350)
  }, [])

  const params: Record<string, string> = {
    page: String(page),
    limit: '20',
  }
  if (sentiment !== 'all') params.sentiment = sentiment
  if (eligFilter !== 'all') params.eligTriggered = eligFilter === 'yes' ? 'true' : 'false'
  if (debouncedSearch) params.search = debouncedSearch

  const { data, isLoading, isFetching } = useQuery<ListResponse>({
    queryKey: ['guide-sessions-list', params],
    queryFn: () => api.get('/api/v1/guide-sessions/admin/list', { params }).then(r => r.data.data),
    placeholderData: prev => prev,
  })

  const sessions = data?.sessions ?? []
  const pagination = data?.pagination

  const filterControlStyle: React.CSSProperties = {
    background: 'rgba(28,12,3,0.55)',
    border: '1px solid rgba(181,83,10,0.22)',
    borderRadius: 8,
    color: '#fff',
    padding: '7px 12px',
    fontSize: 13,
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    cursor: 'pointer',
  }

  const thStyle: React.CSSProperties = {
    padding: '10px 14px',
    color: 'rgba(200,155,90,0.65)',
    fontSize: 11,
    fontFamily: 'var(--font-sans)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    fontWeight: 700,
    textAlign: 'left',
    borderBottom: '1px solid rgba(181,83,10,0.2)',
    background: 'rgba(22,9,2,0.7)',
  }

  return (
    <div style={{ minHeight: '100vh', boxSizing: 'border-box' }}>
      {/* Sticky page header */}
      <div style={{
        padding: isMobile ? '14px 16px 12px' : '28px 32px 18px',
        background: 'rgba(22,9,2,0.82)',
        borderBottom: '1px solid rgba(181,83,10,0.18)',
        backdropFilter: 'blur(18px) saturate(130%)',
        WebkitBackdropFilter: 'blur(18px) saturate(130%)',
        position: 'sticky', top: 0, zIndex: 10,
        marginBottom: 0,
      }}>
        <h1 style={{ color: '#fff', fontFamily: 'var(--font-serif)', fontSize: isMobile ? 20 : 24, fontWeight: 700, margin: 0, marginBottom: 3 }}>
          Guide sessions
        </h1>
        <p style={{ color: 'rgba(200,155,90,0.6)', fontFamily: 'var(--font-sans)', fontSize: 13, margin: 0 }}>
          Monitor AI-assisted guidance sessions, review transcripts, and flag issues.
        </p>
      </div>

      <div style={{ padding: isMobile ? '16px 12px' : '24px 32px 48px', boxSizing: 'border-box' }}>

      {/* Insights */}
      <InsightsStrip />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by name or slug..."
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          style={{
            ...filterControlStyle,
            flex: '1 1 200px',
            minWidth: 160,
          }}
        />
        <select value={sentiment} onChange={e => { setSentiment(e.target.value); setPage(1) }} style={filterControlStyle}>
          <option value="all">All sentiments</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="concerned">Concerned</option>
        </select>
        <select value={eligFilter} onChange={e => { setEligFilter(e.target.value); setPage(1) }} style={filterControlStyle}>
          <option value="all">All elig checks</option>
          <option value="yes">Elig triggered</option>
          <option value="no">Not triggered</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ ...glass(0.5), borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Opportunity</th>
                <th style={thStyle}>Sentiment</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Elig</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Flags</th>
                <th style={thStyle}>Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 14px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-sans)', fontSize: 14 }}>
                    Loading...
                  </td>
                </tr>
              )}
              {!isLoading && sessions.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 14px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-sans)', fontSize: 14 }}>
                    No sessions found.
                  </td>
                </tr>
              )}
              {sessions.map(s => (
                <SessionRow key={s.id} session={s} onSelect={() => setSelectedId(s.id)} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid rgba(181,83,10,0.15)' }}>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
              Page {pagination.page} of {pagination.pages} - {pagination.total} sessions
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || isFetching}
                style={{
                  ...filterControlStyle,
                  padding: '6px 14px',
                  opacity: page <= 1 ? 0.4 : 1,
                  cursor: page <= 1 ? 'default' : 'pointer',
                  border: '1px solid rgba(181,83,10,0.22)',
                }}
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages || isFetching}
                style={{
                  ...filterControlStyle,
                  padding: '6px 14px',
                  opacity: page >= pagination.pages ? 0.4 : 1,
                  cursor: page >= pagination.pages ? 'default' : 'pointer',
                  border: '1px solid rgba(181,83,10,0.22)',
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedId && (
        <SessionDetailPanel sessionId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
    </div>
  )
}
