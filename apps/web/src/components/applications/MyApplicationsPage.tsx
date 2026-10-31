'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys, fetchers } from '@/lib/queries'
import {
  Briefcase, Clock, CheckCircle, Star, ChevronDown,
  ArrowRight, Bookmark, Calendar, User, BookOpen, AlertTriangle, Globe
} from 'lucide-react'

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

const STAGES = [
  'Payment Confirmed',
  'Application Assigned',
  'Documents Under Review',
  'Documents Verified',
  'Preparing Submission',
  'Submitted',
]

const STATUS_LABEL: Record<string, string> = {
  eligibility_screening: 'Eligibility Screening',
  document_collection: 'Document Collection',
  awaiting_payment: 'Awaiting Payment',
  payment_confirmed: 'Payment Confirmed',
  submitted: 'Submitted',
  under_review: 'Under Review',
  decision_pending: 'Decision Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

interface AppData {
  id: string
  status: string
  org: string
  orgInit: string
  orgLogoUrl?: string | null
  flag: string
  title: string
  type: string
  elig: string
  stage: number
  times: string[]
  threadTime?: string
  threadMsg?: string
  applied: string
  updated: string
}

// API response shape
interface ApiApplication {
  id: string
  status: string
  opportunityId: string
  createdAt: string
  updatedAt: string
  opportunityTitle: string | null
  opportunityInstitution: string | null
  opportunityType: string | null
  opportunityCountry: string | null
  opportunityEligibilityLevel: string | null
  opportunityLogoUrl?: string | null
}

interface ApiThread {
  id: string
  referenceId: string
  lastMessageAt: string | null
  unreadByUser: number
}

// Pre-payment statuses: shown with their own label, outside the 6-stage pipeline
const PRE_PIPELINE = new Set(['eligibility_screening', 'document_collection', 'awaiting_payment'])

// Status -> stage index (1-based). Only applies to statuses inside the pipeline.
const STATUS_STAGE: Record<string, number> = {
  payment_confirmed: 1,
  under_review:      3,
  decision_pending:  4,
  submitted:         6,
  accepted:          6,
  rejected:          6,
  withdrawn:         6,
}

function countryToFlag(country: string | null): string {
  if (!country) return 'GLOBE'
  const map: Record<string, string> = {
    'United Kingdom': 'GB', 'UK': 'GB',
    'United States': 'US', 'USA': 'US',
    'Germany': 'DE',
    'Canada': 'CA',
    'Australia': 'AU',
    'France': 'FR',
    'Japan': 'JP',
  }
  return map[country] || 'GLOBE'
}

function orgInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')
}

function fmtApplied(iso: string): string {
  return 'Applied ' + new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtUpdated(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Updated today'
  if (days === 1) return 'Updated yesterday'
  if (days < 7) return `Updated ${days} days ago`
  return `Updated ${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`
}

function fmtStageTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' - ' + new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function apiToAppData(a: ApiApplication): AppData {
  const inPipeline = !PRE_PIPELINE.has(a.status)
  const stage = inPipeline ? (STATUS_STAGE[a.status] ?? 1) : 0
  // Fill times array: use updatedAt for all completed in-pipeline stages as best approximation
  const times: string[] = Array.from({ length: Math.max(stage, 1) }, () => fmtStageTime(a.updatedAt))
  if (times.length > 0) times[0] = fmtStageTime(a.createdAt)

  const typeLabel = a.opportunityType
    ? a.opportunityType.charAt(0).toUpperCase() + a.opportunityType.slice(1)
    : 'Opportunity'

  return {
    id: a.id,
    status: a.status,
    org: a.opportunityInstitution || 'Unknown Organisation',
    orgInit: orgInitials(a.opportunityInstitution),
    orgLogoUrl: a.opportunityLogoUrl ?? null,
    flag: countryToFlag(a.opportunityCountry),
    title: a.opportunityTitle || 'Untitled Opportunity',
    type: typeLabel,
    elig: a.opportunityEligibilityLevel
      ? a.opportunityEligibilityLevel.charAt(0).toUpperCase() + a.opportunityEligibilityLevel.slice(1)
      : 'Open',
    stage: inPipeline ? Math.max(stage, 1) : 0,
    times,
    applied: fmtApplied(a.createdAt),
    updated: fmtUpdated(a.updatedAt),
  }
}

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(24px) saturate(140%)',
  WebkitBackdropFilter: 'blur(24px) saturate(140%)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 8px 32px rgba(122,45,5,0.10), inset 0 1px 0 rgba(255,255,255,0.6)',
  boxSizing: 'border-box' as const,
}

const STAGE_BADGES: Record<number, { bg: string; border: string; fg: string }> = {
  0: { bg: 'rgba(90,80,70,0.08)', border: 'rgba(90,80,70,0.2)', fg: '#7A6A5A' },   // pre-pipeline (awaiting payment etc.)
  1: { bg: 'rgba(14,116,144,0.1)', border: 'rgba(14,116,144,0.3)', fg: '#0E7490' },
  2: { bg: 'rgba(212,132,58,0.1)', border: 'rgba(212,132,58,0.3)', fg: '#D4843A' },
  3: { bg: 'rgba(212,132,58,0.1)', border: 'rgba(212,132,58,0.3)', fg: '#D4843A' },
  4: { bg: 'rgba(122,45,5,0.08)', border: 'rgba(122,45,5,0.2)', fg: '#7A2D05' },
  5: { bg: 'rgba(122,45,5,0.08)', border: 'rgba(122,45,5,0.2)', fg: '#7A2D05' },
  6: { bg: 'rgba(5,150,105,0.1)', border: 'rgba(5,150,105,0.3)', fg: '#059669' },
}

const CARD_TINTS: Record<number, { bg: string; accent: string }> = {
  0: { bg: 'rgba(90,80,70,0.04)', accent: 'rgba(90,80,70,0.2)' },                   // pre-pipeline
  1: { bg: 'rgba(14,116,144,0.05)', accent: 'rgba(14,116,144,0.3)' },
  2: { bg: 'rgba(212,132,58,0.06)', accent: 'rgba(212,132,58,0.4)' },
  3: { bg: 'rgba(212,132,58,0.06)', accent: 'rgba(212,132,58,0.4)' },
  4: { bg: 'rgba(122,45,5,0.04)', accent: 'rgba(122,45,5,0.25)' },
  5: { bg: 'rgba(122,45,5,0.04)', accent: 'rgba(122,45,5,0.25)' },
  6: { bg: 'rgba(5,150,105,0.05)', accent: 'rgba(5,150,105,0.5)' },
}

const TAB_STATUSES: Record<string, string[]> = {
  progress: ['eligibility_screening', 'document_collection', 'awaiting_payment', 'payment_confirmed'],
  review: ['submitted', 'under_review'],
  preparing: ['decision_pending'],
  submitted: ['accepted', 'rejected'],
}

function tabMatch(app: AppData, tab: string): boolean {
  if (tab === 'all') return true
  return TAB_STATUSES[tab]?.includes(app.status) ?? false
}

function shortDate(t: string) {
  return t.split(',')[0]
}

function FlagIcon({ flag }: { flag: string }) {
  if (flag === 'GLOBE') return <Globe size={14} style={{ color: 'var(--app-text-sec)' }} />
  const codes: Record<string, string> = { GB: 'GB', DE: 'DE', US: 'US' }
  return <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--app-text-sec)' }}>{codes[flag] || flag}</span>
}

function ThreadRow({ app, compact }: { app: AppData; compact?: boolean }) {
  if (!app.threadMsg) return null
  return (
    <div style={{
      marginTop: compact ? 10 : 14, padding: compact ? '8px 10px' : '10px 14px',
      borderRadius: compact ? 8 : 10, background: 'rgba(122,45,5,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 6 : 8, marginBottom: compact ? 4 : 6 }}>
        <span style={{
          width: compact ? 20 : 24, height: compact ? 20 : 24, borderRadius: '50%', flexShrink: 0,
          background: '#D4843A', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: compact ? 9 : 11,
        }}>O</span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 11 : 12, fontWeight: 600, color: 'var(--app-ink)', whiteSpace: 'nowrap' }}>OppDate team</span>
        <span style={{ color: '#C4A882' }}>-</span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 10 : 11, color: 'var(--app-helper)', whiteSpace: 'nowrap', flex: 1 }}>{app.threadTime}</span>
        <button style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)', fontSize: compact ? 11 : 12, fontWeight: 500, color: 'var(--app-ginger)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>Reply <ArrowRight size={compact ? 10 : 12} /></button>
      </div>
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: compact ? 11.5 : 13, fontStyle: 'italic',
        lineHeight: 1.45, color: '#5A3A25',
        paddingLeft: compact ? 26 : 0,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      } as React.CSSProperties}>{app.threadMsg}</div>
    </div>
  )
}

function ClosedThreadLine({ compact }: { compact?: boolean }) {
  return (
    <div style={{
      marginTop: compact ? 10 : 14, padding: compact ? '10px 12px' : '14px 16px',
      borderRadius: compact ? 8 : 12, background: 'rgba(122,45,5,0.04)',
      border: '1px solid rgba(122,45,5,0.08)', lineHeight: 1.55,
    }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 11.5 : 13, fontWeight: 600, color: 'var(--app-ginger)', marginBottom: compact ? 4 : 8 }}>Application submitted!</div>
      <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: compact ? 11 : 12.5, color: '#5A3A25', lineHeight: 1.55 }}>
        Our team has completed every required step with care and accuracy to give your application the strongest possible chance.
      </p>
      <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-sans)', fontSize: compact ? 11 : 12.5, color: '#5A3A25', lineHeight: 1.55 }}>
        Please check your email regularly for updates, requests, or decision notifications from the institution.
      </p>
      <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-sans)', fontSize: compact ? 11 : 12.5, fontStyle: 'italic', color: 'var(--app-helper)', lineHeight: 1.55 }}>
        Thank you for trusting us with your process. We are wishing you the very best outcome as your application moves forward.
      </p>
    </div>
  )
}

function TimelineDot({ kind }: { kind: 'done' | 'current' | 'pending' }) {
  if (kind === 'current') {
    return (
      <span style={{ position: 'relative', width: 10, height: 10, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{
          position: 'absolute', inset: -4, borderRadius: '50%', background: 'rgba(122,45,5,0.3)',
          animation: 'ma-pulse 2s ease-in-out infinite',
        }} />
        <span style={{ position: 'relative', width: 6, height: 6, borderRadius: '50%', background: 'var(--app-ginger)' }} />
      </span>
    )
  }
  if (kind === 'pending') {
    return <span style={{ width: 8, height: 8, borderRadius: '50%', boxSizing: 'border-box', background: '#FBF7F3', border: '1.5px solid var(--app-hairline)', flexShrink: 0 }} />
  }
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--app-ginger)', flexShrink: 0 }} />
}

function Timeline({ app, showPending }: { app: AppData; showPending: boolean }) {
  const cur = app.stage

  // Pre-pipeline: payment not yet confirmed, pipeline hasn't started
  if (cur === 0) {
    if (!showPending) return null
    return (
      <div style={{ maxWidth: 560 }}>
        {STAGES.map((label, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
            <div style={{ width: 12, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ width: 2, height: 5, background: i === 0 ? 'transparent' : 'rgba(122,45,5,0.15)' }} />
              <TimelineDot kind="pending" />
              <span style={{ width: 2, flex: 1, background: i === STAGES.length - 1 ? 'transparent' : 'rgba(122,45,5,0.15)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingBottom: i === STAGES.length - 1 ? 0 : 10 }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--app-helper)' }}>{label}</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const count = showPending ? 6 : cur
  const rows = []
  for (let i = 1; i <= count; i++) {
    const isCurrent = i === cur && cur < 6
    const isPending = i > cur
    const kind: 'done' | 'current' | 'pending' = isCurrent ? 'current' : isPending ? 'pending' : 'done'
    const last = i === count
    const aboveColor = i === 1 ? 'transparent' : i <= cur ? 'var(--app-ginger)' : 'rgba(122,45,5,0.15)'
    const belowColor = last ? 'transparent' : i + 1 <= cur ? 'var(--app-ginger)' : 'rgba(122,45,5,0.15)'
    rows.push(
      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
        <div style={{ width: 12, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ width: 2, height: kind === 'current' ? 4 : 5, background: aboveColor }} />
          <TimelineDot kind={kind} />
          <span style={{ width: 2, flex: 1, background: belowColor }} />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, paddingBottom: last ? 0 : 10 }}>
          <span style={{
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, lineHeight: '18px', whiteSpace: 'nowrap',
            color: isCurrent ? 'var(--app-ginger)' : isPending ? 'var(--app-helper)' : 'var(--app-ink)',
          }}>{STAGES[i - 1]}</span>
          {!isPending && (
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, lineHeight: '18px', color: 'var(--app-helper)', whiteSpace: 'nowrap' }}>{app.times[i - 1]}</span>
          )}
        </div>
      </div>
    )
  }
  return <div style={{ maxWidth: 560 }}>{rows}</div>
}

function AppCard({ app, featured, onWithdraw, compact }: { app: AppData; featured: boolean; onWithdraw: (a: AppData) => void; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const badge = STAGE_BADGES[app.stage] ?? STAGE_BADGES[0]
  const tint = CARD_TINTS[app.stage] ?? CARD_TINTS[0]
  const submitted = app.status === 'submitted'
  // Badge shows the last *completed* stage, not the currently active one.
  // app.stage is the active stage index (1-based); last completed = index - 2 (0-based).
  // At stage 1 there is no prior stage, so show the stage 1 label itself.
  // At stage 6 (submitted/accepted/final) show the last stage label directly.
  const stageName = app.stage >= 6
    ? (STAGES[5] ?? STATUS_LABEL[app.status] ?? app.status)
    : app.stage > 1
      ? (STAGES[app.stage - 2] ?? STATUS_LABEL[app.status] ?? app.status)
      : (STATUS_LABEL[app.status] ?? app.status)

  const baseBoxShadow = featured
    ? `inset 3px 0 0 ${tint.accent}, 0 4px 20px rgba(122,45,5,0.14), 0 12px 32px rgba(122,45,5,0.08), inset 0 1px 0 rgba(255,255,255,0.6)`
    : '0 2px 8px rgba(122,45,5,0.06)'
  const hoverBoxShadow = featured
    ? `inset 3px 0 0 ${tint.accent}, 0 8px 28px rgba(122,45,5,0.18), 0 16px 40px rgba(122,45,5,0.10), inset 0 1px 0 rgba(255,255,255,0.6)`
    : '0 6px 20px rgba(122,45,5,0.12), 0 2px 8px rgba(122,45,5,0.06)'

  const pad = compact ? 16 : (featured ? 28 : 20)

  const cardStyle: React.CSSProperties = {
    background: `linear-gradient(${tint.bg}, ${tint.bg}), rgba(255,255,255,0.72)`,
    backdropFilter: 'blur(24px) saturate(140%)',
    WebkitBackdropFilter: 'blur(24px) saturate(140%)',
    border: '1px solid rgba(255,255,255,0.6)',
    boxSizing: 'border-box',
    borderRadius: compact ? 14 : 16,
    padding: pad,
    transition: 'transform var(--dur-base) var(--ease-out-soft), box-shadow var(--dur-base) var(--ease-out-soft)',
    transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
    boxShadow: hovered ? hoverBoxShadow : baseBoxShadow,
  }

  return (
    <article
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {featured && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', marginBottom: compact ? 8 : 12,
          padding: '3px 8px', borderRadius: 999, background: 'rgba(122,45,5,0.08)',
          fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: 'var(--app-ginger)', lineHeight: 1.4,
        }}>Most recent</span>
      )}

      {compact ? (
        <>
          {/* Mobile: org row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
              background: 'rgba(212,132,58,0.16)', color: '#8E5A2B',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: app.orgInit.length > 2 ? 8 : 10,
            }}>
              {app.orgLogoUrl
                ? <img src={app.orgLogoUrl} alt={app.org} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                : app.orgInit}
            </span>
            <span style={{
              flex: 1, minWidth: 0, fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--app-text-sec)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{app.org}</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10.5, color: 'var(--app-helper)', whiteSpace: 'nowrap', flexShrink: 0 }}>{app.applied}</span>
          </div>
          {/* Mobile: title */}
          <h3 style={{ margin: '0 0 8px', fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: featured ? 19 : 16, color: 'var(--app-ink)', lineHeight: 1.25 }}>{app.title}</h3>
          {/* Mobile: badge + type chips row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 9px',
              borderRadius: 999, boxSizing: 'border-box',
              background: badge.bg, border: `1px solid ${badge.border}`, color: badge.fg,
              fontFamily: 'var(--font-sans)', fontSize: 10.5, fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap',
            }}>{stageName}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-sans)', fontSize: 10.5, lineHeight: 1, padding: '3px 8px', borderRadius: 999, border: '1px solid #0E7490', color: '#0E7490' }}>{app.type}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 500, lineHeight: 1, padding: '3px 8px', borderRadius: 999, background: '#D4843A', color: '#fff' }}>{app.elig}</span>
          </div>
        </>
      ) : (
        <>
          {/* Desktop: top row - org + badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                background: 'rgba(212,132,58,0.16)', color: '#8E5A2B',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: app.orgInit.length > 2 ? 9.5 : 11.5,
              }}>
                {app.orgLogoUrl
                  ? <img src={app.orgLogoUrl} alt={app.org} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  : app.orgInit}
              </span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--app-text-sec)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.org}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--app-text-sec)' }}>
                <FlagIcon flag={app.flag} />
                {app.flag === 'GLOBE' ? 'Multiple countries' : null}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, height: featured ? 26 : 24, padding: '0 11px',
                borderRadius: 999, boxSizing: 'border-box',
                background: badge.bg, border: `1px solid ${badge.border}`, color: badge.fg,
                fontFamily: 'var(--font-sans)', fontSize: featured ? 12 : 11, fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap',
              }}>{stageName}</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--app-helper)', whiteSpace: 'nowrap' }}>{app.applied}</span>
            </div>
          </div>
          {/* Desktop: title + chips */}
          <div style={{ marginTop: 10 }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: featured ? 22 : 18, color: 'var(--app-ink)' }}>{app.title}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-sans)', fontSize: 11.5, lineHeight: 1, padding: '3px 10px', borderRadius: 999, border: '1px solid #0E7490', color: '#0E7490' }}>{app.type}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, lineHeight: 1, padding: '4px 10px', borderRadius: 999, background: '#D4843A', color: '#fff' }}>{app.elig}</span>
            </div>
          </div>
        </>
      )}

      {/* Stage timeline */}
      {featured ? (
        <div style={{ marginTop: 16 }}>
          <Timeline app={app} showPending={expanded} />
          {!submitted && (
            <div style={{ maxWidth: 560, display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setExpanded(!expanded)} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: 'var(--app-ginger)',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                {expanded ? 'Hide upcoming stages' : 'View full timeline'}
                {!expanded && <ArrowRight size={12} />}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 14 }}>
          {expanded ? (
            <div>
              <Timeline app={app} showPending />
              <div style={{ maxWidth: 560, display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => setExpanded(false)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: 'var(--app-ginger)',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>Hide timeline</button>
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 560 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: badge.fg, flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--app-ink)' }}>
                  {stageName}
                  {app.stage > 0 && (
                    <>
                      <span style={{ color: '#C4A882' }}>{'  -  '}</span>
                      <span style={{ fontWeight: 400, color: 'var(--app-text-sec)' }}>{shortDate(app.times[app.stage - 1])}</span>
                    </>
                  )}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginTop: 4, paddingLeft: 16 }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--app-helper)' }}>
                  {app.stage > 0 ? `${app.stage} of 6 stages complete` : 'Pending payment confirmation'}
                </span>
                <button onClick={() => setExpanded(true)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: 'var(--app-ginger)',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>View full timeline <ArrowRight size={12} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Thread preview / closed line */}
      {submitted ? <ClosedThreadLine compact={compact} /> : <ThreadRow app={app} compact={compact} />}

      {/* Bottom row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: compact ? 10 : 16, marginTop: compact ? 10 : 14 }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 10 : 11, color: 'var(--app-helper)', whiteSpace: 'nowrap' }}>{app.updated}</span>
        {!submitted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 10 : 12, flexShrink: 0 }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)', fontSize: compact ? 11.5 : 13, fontWeight: 500, color: 'var(--app-ginger)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>View thread <ArrowRight size={compact ? 11 : 13} /></button>
            <button onClick={() => onWithdraw(app)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)', fontSize: compact ? 11 : 12, color: 'var(--app-helper)' }}>Withdraw</button>
          </div>
        )}
      </div>
    </article>
  )
}

function WithdrawModal({ app, onClose }: { app: AppData; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)

  async function handleWithdraw() {
    setLoading(true)
    try {
      await api.post(`/api/v1/applications/${app.id}/withdraw`)
      await queryClient.invalidateQueries({ queryKey: keys.applications })
      onClose()
    } catch {
      // ignore - user can retry
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,10,4,0.4)', cursor: 'pointer' }} />
      <div style={{
        position: 'relative', maxWidth: 440, width: '100%', borderRadius: 20, padding: '36px 40px', boxSizing: 'border-box',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(24px) saturate(140%)', WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        border: '1px solid rgba(255,255,255,0.7)',
        boxShadow: '0 16px 48px rgba(122,45,5,0.18)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      }}>
        <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(220,38,38,0.1)', color: '#DC2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={19} />
        </span>
        <h2 style={{ margin: '16px 0 0', fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 22, color: 'var(--app-ink)' }}>Withdraw this application?</h2>
        <p style={{ margin: '8px 0 0', fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.6, color: '#5A3A25' }}>
          This will cancel your application for {app.title}. This action cannot be undone. No refund will be issued.
        </p>
        <div style={{ width: '100%', marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={handleWithdraw} disabled={loading} style={{
            width: '100%', height: 48, borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            background: '#DC2626', color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
            opacity: loading ? 0.7 : 1,
          }}>{loading ? 'Withdrawing...' : 'Yes, withdraw'}</button>
          <button onClick={onClose} style={{
            width: '100%', height: 44, borderRadius: 12, cursor: 'pointer',
            border: '1px solid var(--app-hairline)', background: 'transparent',
            fontFamily: 'var(--font-sans)', fontSize: 14, color: '#5A3A25',
          }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  const router = useRouter()
  return (
    <div style={{ ...glass, borderRadius: 16, padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%', background: 'rgba(122,45,5,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--app-ginger)', marginBottom: 16,
      }}>
        <Briefcase size={32} />
      </div>
      <h2 style={{ margin: '8px 0 0', fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 22, color: 'var(--app-ink)' }}>No applications yet.</h2>
      <p style={{ margin: '8px 0 0', maxWidth: 380, fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.55, color: 'var(--app-text-sec)' }}>When you apply to an opportunity with OppDate, it will appear here.</p>
      <button onClick={() => router.push('/opportunities')} style={{
        marginTop: 24, height: 48, padding: '0 28px', borderRadius: 13, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)',
        color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
        boxShadow: '0 4px 16px rgba(122,45,5,0.3)', display: 'inline-flex', alignItems: 'center', gap: 8,
        transition: 'box-shadow 160ms ease, transform 160ms ease',
      }}>Browse opportunities <ArrowRight size={15} /></button>
      <button onClick={() => router.push('/services/apply')} style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--app-ginger)' }}>Learn about Apply For Me</button>
    </div>
  )
}

function DiscoveryStrip({ compact }: { compact?: boolean }) {
  const router = useRouter()
  const [hovered, setHovered] = useState(-1)
  const rows = [
    { icon: Bookmark, text: 'You may be eligible for these opportunities', link: 'Browse opportunities', href: '/opportunities' },
    { icon: Calendar, text: 'Get expert guidance on your next application', link: 'Book a consultation', href: '/consultations' },
    { icon: User, text: 'Work with a mentor over weeks or months', link: 'Explore mentorship', href: '/mentorship' },
    { icon: BookOpen, text: 'Strengthen your applications with our resources', link: 'Browse eBooks', href: '/ebooks' },
  ]

  if (compact) {
    return (
      <div style={{ marginTop: 28 }}>
        <div style={{ borderTop: '1px solid var(--app-hairline)', paddingTop: 14, marginBottom: 10 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--app-text-sec)' }}>Explore more with OppDate</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((r, i) => (
            <button
              key={i}
              onClick={() => router.push(r.href)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                padding: '14px 14px', borderRadius: 14,
                background: '#FAF7F4', border: '1px solid rgba(216,204,196,0.5)',
                cursor: 'pointer', transition: 'transform 140ms ease',
              }}
              onTouchStart={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)' }}
              onTouchEnd={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
              onTouchCancel={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
            >
              <span style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'rgba(122,45,5,0.06)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--app-ginger)',
              }}>
                <r.icon size={17} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--app-ink)', lineHeight: 1.35 }}>{r.text}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--app-ginger)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {r.link} <ArrowRight size={12} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ borderTop: '1px solid var(--app-hairline)', paddingTop: 16, marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--app-helper)' }}>Explore more with OppDate</span>
      </div>
      <div style={{ background: '#FAF7F4', border: '1px solid var(--app-hairline)', borderRadius: 16, padding: '6px 24px', boxSizing: 'border-box' }}>
        {rows.map((r, i) => (
          <div
            key={i}
            onClick={() => router.push(r.href)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(-1)}
            style={{ cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 14, margin: '0 -24px', padding: '14px 24px',
              borderTop: i === 0 ? 'none' : '1px solid rgba(216,204,196,0.5)',
              transition: 'background var(--dur-base)',
              background: hovered === i ? 'rgba(122,45,5,0.03)' : 'transparent',
              borderRadius: hovered === i ? 8 : 0,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--app-ginger)', borderLeft: '2px solid var(--app-ginger)', paddingLeft: 12, flexShrink: 0 }}>
              <r.icon size={18} />
            </span>
            <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--app-ink)' }}>{r.text}</span>
            <button style={{
              flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--app-ginger)',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>{r.link} <ArrowRight size={13} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

function MyAppsSkeleton({ mobile }: { mobile: boolean }) {
  return (
    <div className="skel-wrap" style={{ maxWidth: 1200, margin: '0 auto', padding: mobile ? '0 16px 40px' : '0 24px 48px' }}>
      <div style={{ paddingTop: mobile ? 20 : 32, marginBottom: mobile ? 16 : 24 }}>
        <div className="skel skel-line w40" style={{ height: mobile ? 22 : 28, marginBottom: 8 }} />
        <div className="skel skel-line w30" style={{ height: 13 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: mobile ? 8 : 16, marginBottom: mobile ? 16 : 28 }}>
        {[0, 1, 2, 3].map(i => <div key={i} className="skel-card" style={{ height: mobile ? 68 : 84, borderRadius: 14 }} />)}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[55, 80, 90, 110, 70].map((w, i) => <div key={i} className="skel skel-pill" style={{ width: w }} />)}
      </div>
      {[0, 1, 2, 3].map(i => <div key={i} className="skel-card" style={{ height: mobile ? 110 : 130, borderRadius: 16, marginBottom: 16 }} />)}
    </div>
  )
}

export function MyApplicationsPage() {
  const [tab, setTab] = useState('all')
  const [withdrawApp, setWithdrawApp] = useState<AppData | null>(null)
  const mobile = useIsMobile()

  const results = useQueries({
    queries: [
      { queryKey: keys.applications, queryFn: fetchers.applications, staleTime: 60 * 1000 },
      { queryKey: keys.threads,      queryFn: fetchers.threads,      staleTime: 30 * 1000 },
    ],
  })

  const loading = results.some(r => r.isLoading)

  const withdrawnCount: number = (results[0].data as any)?.withdrawnCount ?? 0

  const allApps: AppData[] = useMemo(() => {
    const raw: ApiApplication[] = (results[0].data as any)?.applications ?? []
    const threads: ApiThread[]  = results[1].data ?? []
    const threadByRef = new Map(threads.map((t: ApiThread) => [t.referenceId, t]))
    return raw.map((a) => {
      const appData = apiToAppData(a)
      const thread = threadByRef.get(a.id)
      if (thread?.lastMessageAt) {
        const diff = Date.now() - new Date(thread.lastMessageAt).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 60) appData.threadTime = `${mins}m ago`
        else if (mins < 1440) appData.threadTime = `${Math.floor(mins / 60)}h ago`
        else appData.threadTime = `${Math.floor(mins / 1440)} days ago`
      }
      return appData
    })
  }, [results[0].data, results[1].data])

  if (loading) return <MyAppsSkeleton mobile={mobile} />

  const apps = allApps.filter(a => tabMatch(a, tab))
  const isEmpty = allApps.length === 0

  const tabCount = (t: string) => allApps.filter(a => tabMatch(a, t)).length

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'progress', label: 'In Progress' },
    { id: 'review', label: 'Under Review' },
    { id: 'preparing', label: 'Preparing Submission' },
    { id: 'submitted', label: 'Submitted' },
  ]

  const inProgress = allApps.filter(a => tabMatch(a, 'progress')).length
  const submitted = allApps.filter(a => tabMatch(a, 'submitted')).length
  const withdrawn = withdrawnCount

  const stats = [
    { icon: Briefcase, n: allApps.length, label: 'Total applications' },
    { icon: Clock, n: inProgress, label: 'In progress', dot: true },
    { icon: CheckCircle, n: submitted, label: 'Submitted' },
    { icon: Star, n: withdrawn, label: 'Withdrawn' },
  ]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: mobile ? '0 16px 40px' : '0 24px 48px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ paddingTop: mobile ? 20 : 32, marginBottom: mobile ? 16 : 24 }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: mobile ? 22 : 28, letterSpacing: '-0.01em', color: 'var(--app-ink)' }}>My Applications</h1>
        <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-sans)', fontSize: mobile ? 13 : 14, color: 'var(--app-text-sec)' }}>Track and manage all your applications in one place.</p>
      </div>

      {/* Stat strip */}
      <div className="r-myapps-stats" style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: mobile ? 8 : 16, marginBottom: mobile ? 16 : 28 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ ...glass, borderRadius: mobile ? 12 : 14, padding: mobile ? '10px 12px' : '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: mobile ? 8 : 0, flexDirection: mobile ? 'row' : 'column' }}>
              {mobile ? (
                <>
                  <span style={{ color: 'var(--app-amber)', display: 'flex', flexShrink: 0 }}><s.icon size={15} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {s.dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#D4843A', flexShrink: 0 }} />}
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 700, lineHeight: 1, color: 'var(--app-ink)' }}>{s.n}</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10.5, color: 'var(--app-text-sec)', marginTop: 2 }}>{s.label}</div>
                  </div>
                </>
              ) : (
                <>
                  <span style={{ color: 'var(--app-amber)', display: 'flex', alignSelf: 'flex-start' }}><s.icon size={18} /></span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                    {s.dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#D4843A', flexShrink: 0 }} />}
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 28, fontWeight: 700, lineHeight: 1, color: 'var(--app-ink)' }}>{s.n}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--app-text-sec)', marginTop: 6 }}>{s.label}</div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs + sort */}
      <div style={{ marginBottom: mobile ? 14 : 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: mobile ? 6 : 8, overflowX: 'auto', paddingBottom: 2 }}>
          {tabs.map(t => {
            const on = t.id === tab
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: 'inline-flex', alignItems: 'center', gap: mobile ? 5 : 7, flexShrink: 0,
                height: mobile ? 32 : 36, padding: mobile ? '0 12px' : '0 16px', borderRadius: 999, cursor: 'pointer',
                background: on ? 'var(--app-ginger)' : 'transparent',
                border: on ? '1px solid var(--app-ginger)' : '1px solid var(--app-hairline)',
                fontFamily: 'var(--font-sans)', fontSize: mobile ? 12 : 13, fontWeight: on ? 600 : 500,
                color: on ? '#fff' : '#5A3A25', whiteSpace: 'nowrap',
              }}>
                {t.label}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: mobile ? 16 : 18, height: mobile ? 16 : 18, padding: '0 4px', borderRadius: 999, boxSizing: 'border-box',
                  background: on ? 'rgba(255,255,255,0.22)' : 'rgba(122,45,5,0.08)',
                  fontFamily: 'var(--font-sans)', fontSize: mobile ? 10 : 11, fontWeight: 600, lineHeight: 1,
                  color: on ? '#fff' : 'var(--app-text-sec)',
                }}>{tabCount(t.id)}</span>
              </button>
            )
          })}
        </div>
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          height: mobile ? 30 : 36, padding: mobile ? '0 10px' : '0 14px', borderRadius: 10, cursor: 'pointer',
          border: '1px solid var(--app-hairline)', background: 'rgba(255,255,255,0.5)',
          fontFamily: 'var(--font-sans)', fontSize: mobile ? 12 : 13, color: '#5A3A25',
          marginTop: mobile ? 10 : 12,
        }}>Sort: Newest first <ChevronDown size={14} style={{ color: 'var(--app-text-sec)' }} /></button>
      </div>

      {/* Cards */}
      {isEmpty ? <EmptyState /> : (
        <div key={tab} style={{ display: 'flex', flexDirection: 'column', gap: mobile ? 12 : 16, animation: 'ebViewFade 220ms ease both' }}>
          {apps.map((a, i) => (
            <AppCard key={a.id} app={a} featured={tab === 'all' && i === 0} onWithdraw={setWithdrawApp} compact={mobile} />
          ))}
        </div>
      )}

      <DiscoveryStrip compact={mobile} />

      {withdrawApp && <WithdrawModal app={withdrawApp} onClose={() => setWithdrawApp(null)} />}
    </div>
  )
}
