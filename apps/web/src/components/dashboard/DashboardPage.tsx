'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { AdBanner } from '@/components/ui/AdBanner'
import {
  keys, fetchers,
  ApiApplication, ApiDocument, ApiNotification, ApiThread, ApiSavedOpportunity, ApiRecommendation,
} from '@/lib/queries'
import {
  Briefcase,
  Bookmark,
  Folder,
  Clock,
  ArrowUp,
  Bell,
  Upload,
  Check,
  MessageSquare,
  Search,
  FileText,
  X,
  ArrowRight,
  CheckCircle,
  Circle,
  ChevronRight,
  Video,
  Sparkles,
} from 'lucide-react'
import { ApiUser } from '@/lib/queries'
import { UpgradeModal } from '@/components/premium/UpgradeModal'

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


// Stat shape for UI
interface StatItem {
  icon: string
  value: string
  label: string
  href?: string
  trend?: { dir?: string; text: string; tone: string }
}

// Application shape for UI
interface AppItem {
  title: string
  inst: string
  status: { label: string; tone: 'amber' | 'teal' | 'neutral' }
  stage: number
  updated: string
  pill: { stage: string; date: string; color: string }
}

// Saved opportunity shape for UI
interface SavedItem {
  id: string
  opportunityId: string
  slug: string
  title: string
  org: string
  orgInit: string
  institutionLogoUrl?: string | null
  country: string
  type: string
  daysLeft: number
  eligibility: string[]
}

const PIPELINE_STAGES = ['Submitted', 'Under Review', 'Decision Pending', 'Outcome']

// --- Status mapping helpers ---
const STATUS_LABEL_MAP: Record<string, string> = {
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

function statusTone(status: string): 'amber' | 'teal' | 'neutral' {
  if (['under_review', 'document_collection', 'eligibility_screening'].includes(status)) return 'amber'
  if (['payment_confirmed', 'submitted', 'accepted'].includes(status)) return 'teal'
  return 'neutral'
}

function statusColor(status: string): string {
  if (['under_review', 'document_collection', 'eligibility_screening'].includes(status)) return '#D4843A'
  if (['payment_confirmed', 'submitted', 'accepted'].includes(status)) return '#0E7490'
  return '#7A2D05'
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return `${Math.floor(days / 7)} weeks ago`
}

function updatedLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Updated today'
  if (days === 1) return 'Updated yesterday'
  if (days < 7) return `Updated ${days} days ago`
  return `Updated ${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`
}

function daysUntil(iso: string | null): number {
  if (!iso) return 0
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000))
}

function formatDeadlineDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function orgInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('')
}

// Convert API data to UI shapes
function toAppItem(a: ApiApplication): AppItem {
  const label = STATUS_LABEL_MAP[a.status] || a.status
  return {
    title: a.opportunityTitle || 'Untitled Opportunity',
    inst: a.opportunityInstitution || '',
    status: { label, tone: statusTone(a.status) },
    stage: PIPELINE_STAGES.indexOf(label),
    updated: updatedLabel(a.updatedAt),
    pill: { stage: label, date: formatDeadlineDate(a.opportunityDeadline), color: statusColor(a.status) },
  }
}

function toSavedItem(s: ApiSavedOpportunity): SavedItem {
  const org = s.institution || ''
  return {
    id: s.id,
    opportunityId: s.opportunityId,
    slug: s.slug || s.opportunityId,
    title: s.title || 'Untitled',
    org,
    orgInit: orgInitials(org),
    institutionLogoUrl: s.institutionLogoUrl ?? null,
    country: s.country || '',
    type: s.type ? (s.type.charAt(0).toUpperCase() + s.type.slice(1)) : 'Opportunity',
    daysLeft: daysUntil(s.deadline),
    eligibility: [],
  }
}

function buildStats(
  appCount: number,
  savedCount: number,
  docCount: number,
  apps: ApiApplication[]
): StatItem[] {
  const upcoming = apps.filter(
    (a) => !['accepted', 'rejected', 'withdrawn'].includes(a.status) && a.opportunityDeadline
  )
  const soonest = upcoming
    .map((a) => daysUntil(a.opportunityDeadline))
    .filter((d) => d > 0)
    .sort((a, b) => a - b)[0]

  return [
    {
      icon: 'briefcase',
      value: String(appCount),
      label: 'Active Applications',
      href: '/applications',
      trend: appCount > 0 ? { dir: 'up', text: `${appCount} active`, tone: 'pos' } : undefined,
    },
    {
      icon: 'bookmark',
      value: String(savedCount),
      label: 'Saved Opportunities',
      href: '/opportunities',
      trend: savedCount > 0 ? { dir: 'up', text: `${savedCount} saved`, tone: 'pos' } : undefined,
    },
    { icon: 'folder', value: String(docCount), label: 'Documents Uploaded', href: '/credentials' },
    {
      icon: 'clock',
      value: String(upcoming.length),
      label: 'Upcoming Deadlines',
      href: '/applications',
      trend: soonest !== undefined ? { text: `Next: ${soonest} days`, tone: 'amber' } : undefined,
    },
  ]
}

const STAT_ICONS: Record<string, typeof Briefcase> = {
  briefcase: Briefcase,
  bookmark: Bookmark,
  folder: Folder,
  clock: Clock,
}

const STATUS_TONES: Record<string, { bg: string; fg: string }> = {
  amber: { bg: 'rgba(212,132,58,0.15)', fg: '#B5530A' },
  teal: { bg: 'rgba(14,116,144,0.12)', fg: '#0E7490' },
  neutral: { bg: 'rgba(90,58,37,0.10)', fg: '#5A3A25' },
}

const glassStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(24px) saturate(140%)',
  WebkitBackdropFilter: 'blur(24px) saturate(140%)',
  border: '1px solid rgba(255,255,255,0.6)',
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(122,45,5,0.10), inset 0 1px 0 rgba(255,255,255,0.6)',
  boxSizing: 'border-box' as const,
}

function useCountUp(target: number, duration = 600, delay = 0) {
  const [value, setValue] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now()
      const step = (now: number) => {
        const t = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - t, 3)
        setValue(Math.round(eased * target))
        if (t < 1) raf.current = requestAnimationFrame(step)
      }
      raf.current = requestAnimationFrame(step)
    }, delay)
    return () => { clearTimeout(timeout); cancelAnimationFrame(raf.current) }
  }, [target, duration, delay])
  return value
}

function Ring({
  size,
  stroke,
  pct,
  track,
  color,
  animate,
  children,
}: {
  size: number
  stroke: number
  pct: number
  track: string
  color: string
  animate?: boolean
  children?: React.ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const [fill, setFill] = useState(animate ? 0 : pct)
  useEffect(() => {
    if (!animate) { setFill(pct); return }
    const t = setTimeout(() => setFill(pct), 80)
    return () => clearTimeout(t)
  }, [pct, animate])
  const off = c * (1 - Math.max(0, Math.min(1, fill)))
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          style={animate ? { transition: 'stroke-dashoffset 800ms cubic-bezier(0.34, 1.56, 0.46, 1)' } : undefined}
        />
      </svg>
      {children != null && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function LinkBtn({ label, color = 'var(--app-ginger)', size = 13, arrow, onClick }: { label: string; color?: string; size?: number; arrow?: boolean; onClick?: () => void }) {
  const [h, setH] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        fontFamily: 'var(--font-sans)',
        fontSize: size,
        fontWeight: 500,
        color,
        opacity: h ? 0.7 : 1,
        transition: 'opacity 120ms',
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {label}
      {arrow && <ArrowRight size={size} />}
    </button>
  )
}

function SectionHeader({ title, href, mob = false }: { title: string; href: string; mob?: boolean }) {
  const router = useRouter()
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: mob ? 12 : 16 }}>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: mob ? 15 : 16, fontWeight: 600, color: 'var(--app-ink)', letterSpacing: '-0.01em' }}>
        {title}
      </h2>
      <LinkBtn label="View all" size={mob ? 12 : 13} onClick={() => router.push(href)} />
    </div>
  )
}

function StatCard({ stat, index = 0, mob = false }: { stat: StatItem; index?: number; mob?: boolean }) {
  const router = useRouter()
  const IconC = STAT_ICONS[stat.icon]
  const t = stat.trend
  const displayValue = useCountUp(parseInt(stat.value, 10), 500, 80 + index * 100)
  return (
    <div
      onClick={() => stat.href && router.push(stat.href)}
      style={{
        ...glassStyle,
        padding: mob ? '14px 16px' : '20px 24px',
        flex: 1,
        minWidth: 0,
        borderRadius: mob ? 14 : 16,
        animation: `efxStepIn 500ms var(--ease-out-soft) ${80 + index * 100}ms both`,
        transition: 'transform 180ms var(--ease-out-soft), box-shadow 180ms var(--ease-out-soft)',
        cursor: stat.href ? 'pointer' : 'default',
      }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(122,45,5,0.15), inset 0 1px 0 rgba(255,255,255,0.6)' }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = glassStyle.boxShadow as string }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ color: 'var(--app-amber, #D4843A)', display: 'flex', flexShrink: 0 }}>
          <IconC size={mob ? 16 : 18} />
        </span>
        {t && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              flexShrink: 0,
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-sans)',
              fontSize: mob ? 11 : 12,
              fontWeight: 500,
              color: t.tone === 'pos' ? '#1F8A4C' : t.tone === 'amber' ? '#B5530A' : '#B0413A',
            }}
          >
            {t.dir === 'up' && <ArrowUp size={mob ? 11 : 12} />}
            {t.text}
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: mob ? 26 : 32,
          fontWeight: 700,
          color: 'var(--app-ink)',
          lineHeight: 1.1,
          marginTop: mob ? 8 : 12,
          letterSpacing: '-0.02em',
        }}
      >
        {displayValue}
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 12 : 13, color: '#8C6A55', marginTop: mob ? 2 : 4 }}>{stat.label}</div>
    </div>
  )
}

function StatStrip({ stats, mob = false }: { stats: StatItem[]; mob?: boolean }) {
  return (
    <div className="r-dash-stats" style={{ display: 'flex', gap: mob ? 10 : 16, marginBottom: mob ? 20 : 28 }}>
      {stats.map((s, i) => (
        <StatCard key={i} stat={s} index={i} mob={mob} />
      ))}
    </div>
  )
}

function StagePill({ pill, mob = false }: { pill: { stage: string; date: string; color: string }; mob?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: mob ? 6 : 8 }}>
      <span style={{ width: mob ? 6 : 8, height: mob ? 6 : 8, borderRadius: '50%', background: pill.color, flexShrink: 0 }} />
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 12 : 13, fontWeight: 500, color: 'var(--app-ink)', whiteSpace: 'nowrap' }}>
        {pill.stage}
      </span>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 12 : 13, color: '#B0A098' }}>-</span>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 11 : 12, color: '#B0A098', whiteSpace: 'nowrap' }}>{pill.date}</span>
    </div>
  )
}

function ApplicationCard({ app, index = 0, mob = false }: { app: AppItem; index?: number; mob?: boolean }) {
  const router = useRouter()
  const [h, setH] = useState(false)
  const [pressed, setPressed] = useState(false)
  const tone = STATUS_TONES[app.status.tone]
  return (
    <div
      onClick={() => router.push('/applications')}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      style={{
        ...glassStyle,
        borderRadius: mob ? 12 : 14,
        padding: mob ? '14px 16px' : '20px 24px',
        cursor: 'pointer',
        background: h ? 'rgba(255,250,245,0.84)' : 'rgba(255,255,255,0.72)',
        boxShadow: h
          ? '0 10px 34px rgba(122,45,5,0.14), inset 0 1px 0 rgba(255,255,255,0.6)'
          : glassStyle.boxShadow,
        transform: pressed ? 'scale(0.98)' : h ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform 180ms var(--ease-out-soft), box-shadow 180ms var(--ease-out-soft), background 130ms',
        animation: `efxStepIn 500ms var(--ease-out-soft) ${160 + index * 120}ms both`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: mob ? 22 : 24,
            padding: mob ? '0 9px' : '0 11px',
            borderRadius: 999,
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-sans)',
            fontSize: mob ? 10.5 : 11,
            fontWeight: 600,
            lineHeight: 1,
            background: tone.bg,
            color: tone.fg,
          }}
        >
          {app.status.label}
        </span>
        <LinkBtn label="View thread" arrow size={mob ? 12 : 13} />
      </div>
      <div style={{ marginTop: mob ? 10 : 12 }}>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: mob ? 14.5 : 16,
            fontWeight: 600,
            color: 'var(--app-ink)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {app.title}
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 12 : 13, color: '#8C6A55', marginTop: 2 }}>{app.inst}</div>
      </div>
      <div style={{ marginTop: mob ? 10 : 14 }}>
        <StagePill pill={app.pill} mob={mob} />
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 10.5 : 11, color: '#B0A098', marginTop: mob ? 8 : 12, textAlign: 'right' }}>
        {app.updated}
      </div>
    </div>
  )
}

function ApplicationsSection({ apps, mob = false }: { apps: AppItem[]; mob?: boolean }) {
  const router = useRouter()
  return (
    <section>
      <SectionHeader title="My Applications" href="/applications" mob={mob} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: mob ? 10 : 12 }}>
        {apps.length === 0 ? (
          <div style={{
            ...glassStyle,
            padding: mob ? '28px 20px' : '36px 32px',
            borderRadius: mob ? 12 : 14,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 0,
            animation: 'efxStepIn 500ms var(--ease-out-soft) 160ms both',
          }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'rgba(212,132,58,0.10)',
              border: '1px solid rgba(212,132,58,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}>
              <Briefcase size={22} style={{ color: '#D4843A', opacity: 0.85 }} />
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 14 : 15, fontWeight: 600, color: 'var(--app-ink)', marginBottom: 6 }}>
              Your journey starts here
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 12 : 13, color: '#8C6A55', lineHeight: 1.55, maxWidth: 260, marginBottom: 18 }}>
              Browse open opportunities and submit your first application to get started.
            </div>
            <button
              onClick={() => router.push('/opportunities')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                background: 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)',
                border: 'none',
                borderRadius: 12,
                padding: '9px 20px',
                cursor: 'pointer',
                boxShadow: '0 3px 12px rgba(122,45,5,0.26)',
                transition: 'box-shadow 160ms ease, transform 160ms ease',
              }}
            >
              Explore opportunities <ArrowRight size={13} />
            </button>
          </div>
        ) : (
          apps.map((a, i) => (
            <ApplicationCard key={i} app={a} index={i} mob={mob} />
          ))
        )}
      </div>
    </section>
  )
}

function SavedMiniCard({ data, mob = false }: { data: SavedItem; mob?: boolean }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [h, setH] = useState(false)
  const [pressed, setPressed] = useState(false)
  const days = data.daysLeft
  const label = `${days} days left`
  const pct = Math.max(0.06, Math.min(1, days / 30))
  const urgent = days <= 7
  return (
    <div
      onClick={() => router.push(`/opportunities?slug=${data.slug}`)}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      style={{
        ...glassStyle,
        padding: mob ? 16 : 20,
        borderRadius: mob ? 14 : 16,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        background: h ? 'rgba(255,250,245,0.84)' : 'rgba(255,255,255,0.72)',
        boxShadow: h
          ? '0 10px 34px rgba(122,45,5,0.14), inset 0 1px 0 rgba(255,255,255,0.6)'
          : glassStyle.boxShadow,
        transform: pressed ? 'scale(0.97)' : h ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform 180ms var(--ease-out-soft), box-shadow 180ms var(--ease-out-soft), background 130ms',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, gap: 8 }}>
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              flexShrink: 0,
              overflow: 'hidden',
              background: '#F0EAE4',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              fontSize: data.orgInit.length > 2 ? 8 : 10,
              color: 'var(--app-ink)',
            }}
          >
            {data.institutionLogoUrl
              ? <img src={data.institutionLogoUrl} alt={data.org} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
              : data.orgInit}
          </span>
          <span
            style={{
              minWidth: 0,
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: '#8C6A55',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {data.org}
          </span>
        </div>
        <button
          onClick={async (e) => {
            e.stopPropagation()
            await api.delete(`/api/v1/saved-opportunities/${data.opportunityId}`)
            await queryClient.invalidateQueries({ queryKey: keys.saved })
          }}
          aria-label="Unsave"
          style={{
            width: 28,
            height: 28,
            flexShrink: 0,
            marginRight: -4,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--app-ginger)',
          }}
        >
          <Bookmark size={17} fill="currentColor" />
        </button>
      </div>
      <h3
        style={{
          margin: `${mob ? 8 : 10}px 0 0`,
          fontFamily: 'var(--font-serif)',
          fontWeight: 700,
          fontSize: mob ? 16 : 18,
          lineHeight: 1.3,
          color: 'var(--app-ink)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
        }}
      >
        {data.title}
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-sans)', fontSize: 13, color: '#8C6A55' }}>
          {data.country}
        </span>
        <span style={{ color: '#C4A882' }}>-</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            lineHeight: 1,
            padding: '2px 9px',
            borderRadius: 999,
            border: '1px solid #0E7490',
            color: '#0E7490',
          }}
        >
          {data.type}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {data.eligibility.map((item) => (
          <span
            key={item}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 22,
              padding: '0 8px',
              borderRadius: 999,
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              fontWeight: 500,
              background: 'rgba(122,45,5,0.06)',
              color: '#8C6A55',
            }}
          >
            {item}
          </span>
        ))}
      </div>
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 9 }}>
        <Ring size={26} stroke={3} pct={pct} track="rgba(212,132,58,0.18)" color={urgent ? '#B5530A' : '#D4843A'}>
          <Clock size={11} style={{ color: urgent ? '#B5530A' : '#D4843A' }} />
        </Ring>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: urgent ? '#B5530A' : 'var(--app-ginger)' }}>
          {label}
        </span>
      </div>
    </div>
  )
}

function SavedSection({ saved, mob = false }: { saved: SavedItem[]; mob?: boolean }) {
  return (
    <section style={{ marginTop: mob ? 24 : 32 }}>
      <SectionHeader title="Saved Opportunities" href="/opportunities" mob={mob} />
      {saved.length === 0 ? (
        <div style={{
          ...glassStyle,
          padding: mob ? '24px 20px' : '28px 24px',
          borderRadius: mob ? 12 : 14,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          animation: 'efxStepIn 500ms var(--ease-out-soft) 200ms both',
        }}>
          <div style={{
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: '50%',
            background: 'rgba(212,132,58,0.08)',
            border: '1px solid rgba(212,132,58,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Bookmark size={18} style={{ color: '#D4843A', opacity: 0.8 }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 13 : 14, fontWeight: 600, color: 'var(--app-ink)', marginBottom: 4 }}>
              Nothing saved yet
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 11.5 : 12.5, color: '#8C6A55', lineHeight: 1.5 }}>
              Bookmark opportunities you like - they&apos;ll appear here for quick access.
            </div>
          </div>
        </div>
      ) : (
        <div className="r-dash-saved" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: mob ? 10 : 12 }}>
          {saved.map((d) => (
            <SavedMiniCard key={d.id} data={d} mob={mob} />
          ))}
        </div>
      )}
    </section>
  )
}

function ProfileRingCard({ profilePct, docCount, hasPrefs, hasApps, mob = false }: {
  profilePct: number; docCount: number; hasPrefs: boolean; hasApps: boolean; mob?: boolean
}) {
  const router = useRouter()
  const pct = profilePct
  const displayPct = useCountUp(pct, 800, 200)

  const nextSteps: { label: string; href: string }[] = []
  if (!hasPrefs) nextSteps.push({ label: 'Update your profile', href: '/profile' })
  if (docCount === 0) nextSteps.push({ label: 'Upload your first document', href: '/credentials' })
  else if (docCount < 3) nextSteps.push({ label: `Add ${3 - docCount} more document${3 - docCount > 1 ? 's' : ''}`, href: '/credentials' })
  if (!hasApps) nextSteps.push({ label: 'Start your first application', href: '/opportunities' })

  const statusLabel = pct === 100 ? 'Looking great' : pct >= 70 ? 'Good standing' : pct >= 40 ? 'Getting there' : 'Just getting started'

  return (
    <div style={{
      ...glassStyle,
      padding: mob ? 16 : 20,
      borderRadius: mob ? 14 : 16,
      animation: 'efxStepIn 500ms var(--ease-out-soft) 200ms both',
    }}>
      {/* Header row */}
      <div
        onClick={() => router.push('/profile')}
        style={{ display: 'flex', alignItems: 'center', gap: mob ? 12 : 16, cursor: 'pointer', marginBottom: nextSteps.length ? 14 : 0 }}
      >
        <Ring size={mob ? 52 : 60} stroke={mob ? 5 : 6} pct={pct / 100} track="rgba(122,45,5,0.08)" color="var(--app-ginger)" animate>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 13 : 15, fontWeight: 700, color: 'var(--app-ginger)' }}>{displayPct}%</span>
        </Ring>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 13 : 14, fontWeight: 600, color: 'var(--app-ink)' }}>Profile Strength</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 11 : 11.5, color: '#8C6A55', marginTop: 2 }}>{statusLabel}</div>
        </div>
      </div>

      {/* Next steps — always show at least the profile link */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(nextSteps.length > 0 ? nextSteps.slice(0, 2) : [{ label: 'Update your profile', href: '/profile' }]).map((step, i) => (
            <button
              key={i}
              onClick={() => router.push(step.href)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '8px 11px', borderRadius: 9, border: 'none', cursor: 'pointer',
                background: 'rgba(122,45,5,0.05)', textAlign: 'left',
                fontFamily: 'var(--font-sans)', fontSize: mob ? 11.5 : 12.5,
                color: 'var(--app-ginger)', fontWeight: 500,
                transition: 'background 140ms ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(122,45,5,0.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(122,45,5,0.05)' }}
            >
              <span>{step.label}</span>
              <span style={{ opacity: 0.5, fontSize: 13 }}>›</span>
            </button>
          ))}
      </div>
    </div>
  )
}

// ============================================================
// UPCOMING CONSULTATIONS WIDGET
// ============================================================

interface ApiConsultationBooking {
  id: string
  scheduledAt: string
  durationMinutes: number
  priceUsd: number
  status: string
  meetingLink: string | null
  meetingType: 'google_meet' | 'zoom' | null
  sessionTitle: string | null
}

function UpcomingConsultationsWidget() {
  const router = useRouter()
  const [consultations, setConsultations] = useState<ApiConsultationBooking[]>([])
  const [showTip, setShowTip] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ data: ApiConsultationBooking[] }>('/api/v1/consultations')
      .then(r => setConsultations(r.data?.data ?? []))
      .catch(() => {})
  }, [])

  const upcoming = consultations
    .filter(c => c.status === 'pending' || c.status === 'confirmed')
    .filter(c => new Date(c.scheduledAt) > new Date())
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

  if (upcoming.length === 0) return null

  const next = upcoming[0]
  const scheduledAt = new Date(next.scheduledAt)
  const now = Date.now()
  const minsUntil = (scheduledAt.getTime() - now) / 60000
  const joinable = !!next.meetingLink && minsUntil <= 15
  const linkReady = !!next.meetingLink

  const monthLabel = scheduledAt.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  const dayLabel = scheduledAt.getDate()
  const timeLabel = scheduledAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()

  return (
    <div style={{
      background: '#2A1206',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 8px 32px rgba(26,10,4,0.25)',
      marginTop: 16,
      boxSizing: 'border-box' as const,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: '#fff' }}>Upcoming Sessions</h2>
        <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 8px', borderRadius: 999, background: 'rgba(212,132,58,0.14)', border: '1px solid rgba(212,132,58,0.30)', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, color: '#D4843A' }}>
          {upcoming.length} upcoming
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ width: 46, height: 46, borderRadius: 10, background: 'rgba(212,132,58,0.10)', border: '1px solid rgba(212,132,58,0.20)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.08em', color: '#D4843A' }}>{monthLabel}</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 18, color: '#fff', lineHeight: 1.1 }}>{dayLabel}</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13.5, color: '#fff', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {scheduledAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {timeLabel}
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {next.sessionTitle || `${next.durationMinutes} min consultation`}
          </div>
        </div>

        <div style={{ position: 'relative', flexShrink: 0 }}
          onMouseEnter={() => !joinable && setShowTip(next.id)}
          onMouseLeave={() => setShowTip(null)}
        >
          <button
            disabled={!joinable}
            onClick={() => joinable && next.meetingLink && window.open(next.meetingLink, '_blank')}
            style={{
              height: 36, padding: '0 14px', borderRadius: 8, border: 'none',
              background: joinable ? '#B5530A' : 'rgba(255,255,255,0.08)',
              color: joinable ? '#fff' : 'rgba(255,255,255,0.35)',
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
              cursor: joinable ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'background 160ms, color 160ms',
            }}
          >
            <Video size={13} /> Join
          </button>
          {showTip === next.id && (
            <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, minWidth: 200, padding: '8px 12px', borderRadius: 10, background: 'rgba(31,50,66,0.96)', backdropFilter: 'blur(8px)', color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 11.5, lineHeight: 1.5, zIndex: 20, whiteSpace: 'normal', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
              {!linkReady
                ? 'Your meeting link will arrive by email before your session'
                : 'Join link activates 15 minutes before your session'}
            </div>
          )}
        </div>
      </div>

      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'rgba(255,255,255,0.35)', paddingTop: 10, lineHeight: 1.5 }}>
        {!linkReady
          ? 'A calendar invite will be sent once the meeting link is set.'
          : 'A calendar invite has been sent. Check your email for the meeting link.'}
      </div>

      {upcoming.length > 1 && (
        <button onClick={() => router.push('/services/consultations')} style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, background: 'none', border: 'none', padding: 0, color: 'rgba(255,255,255,0.40)', fontFamily: 'var(--font-sans)', fontSize: 12, cursor: 'pointer' }}>
          View all sessions <ChevronRight size={13} />
        </button>
      )}
    </div>
  )
}

function NotificationsCard({ notifications }: { notifications: ApiNotification[] }) {
  const router = useRouter()
  return (
    <div
      style={{
        background: '#2A1206',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 20,
        boxShadow: '0 8px 32px rgba(26,10,4,0.25)',
        marginTop: 16,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: '#fff' }}>Notifications</h2>
        <LinkBtn label="View all" color="rgba(255,255,255,0.5)" onClick={() => router.push('/notifications')} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {notifications.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '20px 0 8px',
            gap: 10,
          }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 2,
            }}>
              <Bell size={16} style={{ color: 'rgba(255,255,255,0.35)' }} />
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>
              All caught up
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'rgba(255,255,255,0.28)', lineHeight: 1.5 }}>
              We&apos;ll notify you about application updates and new matches.
            </div>
          </div>
        ) : (
          notifications.slice(0, 5).map((n, i) => (
            <div
              key={n.id}
              style={{
                display: 'flex',
                gap: 11,
                padding: '12px 0',
                borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                animation: `efxStepIn 500ms var(--ease-out-soft) ${160 + i * 120}ms both`,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  flexShrink: 0,
                  marginTop: 6,
                  background: !n.read ? '#D4843A' : 'transparent',
                  border: !n.read ? 'none' : '1px solid rgba(255,255,255,0.18)',
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 13,
                    lineHeight: 1.45,
                    color: !n.read ? '#fff' : 'rgba(255,255,255,0.55)',
                  }}
                >
                  {n.title}
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
                  {timeAgo(n.createdAt)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function CredentialCard({ documents, mob = false }: { documents: ApiDocument[]; mob?: boolean }) {
  const router = useRouter()
  const shown = documents.slice(0, 3)
  const extra = Math.max(0, documents.length - 3)
  return (
    <div style={{
      ...glassStyle,
      padding: mob ? 16 : 20,
      borderRadius: mob ? 14 : 16,
      marginTop: mob ? 12 : 16,
      animation: 'efxStepIn 500ms var(--ease-out-soft) 440ms both',
      transition: 'transform 180ms var(--ease-out-soft), box-shadow 180ms var(--ease-out-soft)',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(122,45,5,0.15), inset 0 1px 0 rgba(255,255,255,0.6)' }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = glassStyle.boxShadow as string }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: mob ? 10 : 12 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: mob ? 14 : 15, fontWeight: 600, color: 'var(--app-ink)', letterSpacing: '-0.01em' }}>
          Credential Library
        </h2>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: mob ? 20 : 22,
            padding: mob ? '0 8px' : '0 9px',
            borderRadius: 999,
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-sans)',
            fontSize: mob ? 10.5 : 11,
            fontWeight: 600,
            lineHeight: 1,
            background: 'rgba(212,132,58,0.15)',
            color: '#B5530A',
          }}
        >
          {documents.length} docs
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: mob ? 6 : 8, marginBottom: mob ? 10 : 12 }}>
        {shown.map((doc) => (
          <span
            key={doc.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: mob ? 22 : 24,
              padding: mob ? '0 8px' : '0 10px',
              borderRadius: 999,
              fontFamily: 'var(--font-sans)',
              fontSize: mob ? 10.5 : 11,
              fontWeight: 500,
              lineHeight: 1,
              background: 'rgba(122,45,5,0.08)',
              color: 'var(--app-ginger)',
            }}
          >
            {doc.type.charAt(0).toUpperCase() + doc.type.slice(1)}
          </span>
        ))}
        {extra > 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: mob ? 22 : 24,
              padding: mob ? '0 8px' : '0 10px',
              borderRadius: 999,
              fontFamily: 'var(--font-sans)',
              fontSize: mob ? 10.5 : 11,
              fontWeight: 500,
              lineHeight: 1,
              background: 'transparent',
              border: '1px solid rgba(176,160,152,0.4)',
              color: '#B0A098',
            }}
          >
            +{extra} more
          </span>
        )}
        {documents.length === 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(212,132,58,0.05)',
            border: '1px dashed rgba(212,132,58,0.22)',
          }}>
            <Upload size={14} style={{ color: '#D4843A', flexShrink: 0, opacity: 0.75 }} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 11.5 : 12, color: '#8C6A55', lineHeight: 1.4 }}>
              Upload your first document to build your credential library.
            </span>
          </div>
        )}
      </div>
      <button
        className="efx-bounce"
        onClick={() => router.push('/credentials')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          fontSize: mob ? 12.5 : 13.5,
          fontWeight: 600,
          lineHeight: 1,
          padding: mob ? '8px 14px' : '9px 16px',
          borderRadius: 999,
          background: 'transparent',
          border: '1px solid var(--app-ginger)',
          color: 'var(--app-ginger)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Manage library <ArrowRight size={mob ? 13 : 14} /></span>
      </button>
    </div>
  )
}

function MessagesCard({ threads, mob = false }: { threads: ApiThread[]; mob?: boolean }) {
  const router = useRouter()
  const visible = threads.slice(0, 3)
  const totalUnread = threads.reduce((sum, t) => sum + (t.unreadByUser || 0), 0)

  const threadLabel = (t: ApiThread) => {
    if (t.opportunityTitle) return t.opportunityTitle
    if (t.type === 'oppdate_apply') return 'Application thread'
    if (t.type === 'mentorship') return 'Mentorship thread'
    return 'Message thread'
  }

  return (
    <div style={{
      ...glassStyle,
      padding: mob ? 16 : 20,
      borderRadius: mob ? 14 : 16,
      marginTop: mob ? 12 : 16,
      animation: 'efxStepIn 500ms var(--ease-out-soft) 560ms both',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: mob ? 10 : 12 }}>
        <h2 style={{
          margin: 0,
          fontFamily: 'var(--font-sans)',
          fontSize: mob ? 14 : 15,
          fontWeight: 600,
          color: 'var(--app-ink)',
          letterSpacing: '-0.01em',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          Messages
          {totalUnread > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999,
              background: '#C4881C', color: '#fff',
              fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700,
              animation: 'dashPulse 2s ease-in-out infinite',
            }}>{totalUnread}</span>
          )}
        </h2>
        {threads.length > 0 && (
          <button onClick={() => router.push('/messages')} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: 'var(--font-sans)', fontSize: mob ? 11 : 11.5, fontWeight: 500,
            color: 'var(--app-ginger)', display: 'flex', alignItems: 'center', gap: 3,
          }}>
            View all <ArrowRight size={11} />
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', borderRadius: 10,
          background: 'rgba(122,45,5,0.04)', border: '1px solid rgba(122,45,5,0.08)',
        }}>
          <div style={{
            width: 34, height: 34, flexShrink: 0, borderRadius: '50%',
            background: 'rgba(212,132,58,0.08)', border: '1px solid rgba(212,132,58,0.14)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageSquare size={15} style={{ color: '#D4843A', opacity: 0.75 }} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 12.5 : 13, fontWeight: 600, color: 'var(--app-ink)', marginBottom: 3 }}>
              No active threads
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 11 : 11.5, color: '#8C6A55', lineHeight: 1.45 }}>
              Threads open after your payment is confirmed.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: mob ? 6 : 8 }}>
          {visible.map((t, idx) => (
            <div
              key={t.id}
              onClick={() => router.push('/messages')}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: mob ? 10 : 11,
                padding: mob ? '10px 12px' : '11px 14px',
                borderRadius: mob ? 10 : 11,
                background: t.unreadByUser > 0 ? 'rgba(196,136,28,0.06)' : 'rgba(255,250,245,0.6)',
                border: t.unreadByUser > 0 ? '1px solid rgba(196,136,28,0.18)' : '1px solid rgba(122,45,5,0.07)',
                cursor: 'pointer',
                transition: 'background 120ms',
                animation: `efxStepIn 400ms var(--ease-out-soft) ${80 + idx * 60}ms both`,
              }}
            >
              {/* Avatar / icon */}
              <div style={{
                width: mob ? 30 : 34, height: mob ? 30 : 34, flexShrink: 0, borderRadius: '50%',
                background: 'rgba(122,45,5,0.07)', border: '1px solid rgba(122,45,5,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MessageSquare size={mob ? 13 : 15} style={{ color: '#7A2D05', opacity: 0.7 }} />
              </div>

              {/* Content */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: mob ? 12 : 12.5, fontWeight: 600,
                    color: 'var(--app-ink)', lineHeight: 1.3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: mob ? 160 : 200,
                  }}>
                    {threadLabel(t)}
                  </span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 10 : 10.5, color: '#B0A098', flexShrink: 0 }}>
                    {t.lastMessageAt ? timeAgo(t.lastMessageAt) : ''}
                  </span>
                </div>

                {/* Preview row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 3 }}>
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: mob ? 11 : 11.5,
                    color: t.unreadByUser > 0 ? '#6B3A1F' : '#8C6A55',
                    fontWeight: t.unreadByUser > 0 ? 500 : 400,
                    lineHeight: 1.4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: mob ? 170 : 210,
                  }}>
                    {(t.lastMessagePreview?.startsWith('{"type":"document_request"')
                      ? 'Requested documents from you'
                      : t.lastMessagePreview) || (t.opportunityCountry ? `Re: ${t.opportunityCountry}` : 'No messages yet')}
                  </span>
                  {t.unreadByUser > 0 && (
                    <span style={{
                      flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999,
                      background: '#C4881C', color: '#fff',
                      fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 700,
                    }}>{t.unreadByUser}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function PageHeader({ name, mob = false }: { name: string; mob?: boolean }) {
  const firstName = name.split(' ')[0] || name
  return (
    <div style={{ marginBottom: mob ? 18 : 24, animation: 'efxStepIn 500ms var(--ease-out-soft) 0ms both' }}>
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--font-serif)',
          fontWeight: 600,
          fontSize: mob ? 24 : 28,
          letterSpacing: '-0.02em',
          color: 'var(--app-ink)',
        }}
      >
        {greeting()}, {firstName}.
      </h1>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 13.5 : 15, color: '#8C6A55', marginTop: mob ? 4 : 6 }}>
        Here&apos;s what&apos;s happening with your applications.
      </div>
    </div>
  )
}

function DashboardSkeleton({ mob }: { mob: boolean }) {
  return (
    <div className="skel-wrap" style={{ padding: mob ? '20px 16px 40px' : '28px 40px 40px' }}>
      <div style={{ marginBottom: 24 }}>
        <div className="skel skel-line w50" style={{ height: mob ? 22 : 28, marginBottom: 10 }} />
        <div className="skel skel-line w30" style={{ height: 14 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: mob ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[0, 1, 2, 3].map(i => <div key={i} className="skel-card" style={{ height: mob ? 80 : 96, borderRadius: 14 }} />)}
      </div>
      <div style={{ display: 'flex', gap: 28, flexDirection: mob ? 'column' : 'row' }}>
        <div style={{ flex: '0 0 65%', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="skel-card" style={{ height: 260, borderRadius: 16 }} />
          <div className="skel-card" style={{ height: 180, borderRadius: 16 }} />
        </div>
        {!mob && (
          <div style={{ flex: '0 0 35%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="skel-card" style={{ height: 140, borderRadius: 16 }} />
            <div className="skel-card" style={{ height: 120, borderRadius: 16 }} />
            <div className="skel-card" style={{ height: 100, borderRadius: 16 }} />
            <div className="skel-card" style={{ height: 100, borderRadius: 16 }} />
          </div>
        )}
      </div>
    </div>
  )
}

function calcProfilePct(docCount: number, appCount: number): number {
  // Simple heuristic: docs contribute up to 50pts, apps up to 30pts, base 20pts
  const docScore = Math.min(docCount * 10, 50)
  const appScore = Math.min(appCount * 10, 30)
  return Math.min(100, 20 + docScore + appScore)
}

const CHECKLIST_DISMISS_KEY = 'oppdate_checklist_dismissed'

interface ChecklistStep {
  key: string
  label: string
  href: string
  done: boolean
}

function SetupChecklist({ user, docs, saved, apps }: {
  user: ApiUser | null
  docs: ApiDocument[]
  saved: ApiSavedOpportunity[]
  apps: ApiApplication[]
}) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(CHECKLIST_DISMISS_KEY)) setDismissed(true)
  }, [])

  const steps: ChecklistStep[] = [
    { key: 'profile',  label: 'Complete your profile',        href: '/profile',      done: !!(user?.name) },
    { key: 'document', label: 'Upload your first document',   href: '/credentials',  done: docs.length > 0 },
    { key: 'browse',   label: 'Browse and save an opportunity', href: '/opportunities', done: saved.length > 0 },
    { key: 'apply',    label: 'Start your first application', href: '/opportunities', done: apps.length > 0 },
  ]

  const doneCount = steps.filter(s => s.done).length
  const allDone = doneCount === steps.length

  if (dismissed || allDone) return null

  const dismiss = () => {
    localStorage.setItem(CHECKLIST_DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="dash-checklist">
      <div className="dash-checklist-head">
        <span className="dash-checklist-title">Get started</span>
        <button className="dash-checklist-dismiss" onClick={dismiss} aria-label="Dismiss">
          <X size={15} />
        </button>
      </div>

      {steps.map(step => (
        <Link key={step.key} href={step.href} className={`dash-checklist-row${step.done ? ' done' : ''}`}>
          {step.done
            ? <CheckCircle size={17} style={{ color: '#7A2D05', flexShrink: 0 }} />
            : <Circle size={17} style={{ color: '#D8CCC4', flexShrink: 0 }} />
          }
          <span className="dash-cl-label">{step.label}</span>
          {!step.done && <ChevronRight size={14} style={{ color: '#B0A098', flexShrink: 0 }} />}
        </Link>
      ))}

      <div className="dash-checklist-progress">
        <div className="dash-checklist-bar" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: '#9E8070', marginTop: 7 }}>
        {doneCount} of {steps.length} complete
      </div>
    </div>
  )
}

function RecommendationsWidget({ isPremium }: { isPremium: boolean }) {
  const router = useRouter()
  const { data: recsRaw = [], isLoading } = useQuery<ApiRecommendation[]>({
    queryKey: [...keys.recommendations, 6],
    queryFn: () => fetchers.recommendations(6),
    enabled: isPremium,
    staleTime: 5 * 60 * 1000,
  })
  const recs = recsRaw.slice(0, 6)

  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t) }, [])
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  if (!isPremium) return null

  const typeLabel = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const orgInitials = (name: string) =>
    name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')

  const EASE_OUT_SOFT = 'cubic-bezier(0.22,1,0.36,1)'

  // Skeleton cards while loading
  if (isLoading) {
    return (
      <div style={{ ...glassStyle, padding: '16px 18px', borderRadius: 14, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <Sparkles size={13} style={{ color: '#B5530A' }} />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700, color: 'var(--app-ink)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Picked for you
          </span>
        </div>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            height: 62, borderRadius: 10, marginBottom: 8,
            background: 'linear-gradient(90deg, rgba(42,18,6,0.05) 25%, rgba(42,18,6,0.10) 50%, rgba(42,18,6,0.05) 75%)',
            backgroundSize: '400% 100%',
            animation: 'dashRecShimmer 1.4s ease-in-out infinite',
          }} />
        ))}
        <style>{`@keyframes dashRecShimmer { 0%,100%{background-position:100% 0} 50%{background-position:0 0} }`}</style>
      </div>
    )
  }

  return (
    <div style={{ ...glassStyle, padding: '16px 18px', borderRadius: 14, marginTop: 16, animation: 'efxStepIn 500ms var(--ease-out-soft) 400ms both' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <Sparkles size={13} style={{ color: '#B5530A', flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700, color: 'var(--app-ink)', letterSpacing: '0.05em', textTransform: 'uppercase', flex: 1 }}>
          Picked for you
        </span>
        <Link href="/opportunities" style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--app-ginger)', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}>
          See all
        </Link>
      </div>

      {recs.length === 0 ? (
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: '#9E8070', textAlign: 'center', padding: '12px 0', lineHeight: 1.5 }}>
          <Link href="/profile" style={{ color: '#B5530A', textDecoration: 'none', fontWeight: 600 }}>Complete your profile</Link> to get personalised matches.
        </div>
      ) : (
        <>
          {recs.map((rec, idx) => {
            const isHov = hoveredId === rec.id
            const initials = orgInitials(rec.institution)
            const reasonLabels: Record<string, string> = { country: 'country', goal: 'goal', level: 'level', field: 'field' }
            const tip = rec.matchReasons.length > 0
              ? `Matches your ${rec.matchReasons.map(r => reasonLabels[r] || r).join(', ')}`
              : 'Based on your profile'
            const dotsFilled = rec.matchScore >= 4 ? 3 : rec.matchScore >= 2 ? 2 : rec.matchScore >= 1 ? 1 : 0

            return (
              <div
                key={rec.id}
                onClick={() => router.push(`/opportunities?slug=${rec.slug}`)}
                onMouseEnter={() => setHoveredId(rec.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  display: 'flex', gap: 10, alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: isHov ? 'rgba(122,45,5,0.07)' : 'rgba(122,45,5,0.03)',
                  border: `1px solid ${isHov ? 'rgba(122,45,5,0.14)' : 'rgba(122,45,5,0.06)'}`,
                  marginBottom: idx < recs.length - 1 ? 8 : 0,
                  cursor: 'pointer',
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(6px)',
                  transition: `opacity 240ms ${EASE_OUT_SOFT} ${idx * 80}ms, transform 240ms ${EASE_OUT_SOFT} ${idx * 80}ms, background 140ms ease, border-color 140ms ease`,
                }}
              >
                {/* Logo */}
                {rec.institutionLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={rec.institutionLogoUrl} alt={rec.institution}
                    style={{ width: 32, height: 32, borderRadius: 7, objectFit: 'contain', flexShrink: 0, border: '1px solid rgba(42,18,6,0.08)' }} />
                ) : (
                  <span style={{
                    width: 32, height: 32, borderRadius: 7, flexShrink: 0,
                    background: 'rgba(122,45,5,0.07)', display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-sans)', fontSize: 10.5, fontWeight: 700, color: '#7A2D05',
                  }}>{initials}</span>
                )}

                {/* Title + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600,
                    color: 'var(--app-ink)', lineHeight: 1.3, marginBottom: 3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {rec.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{
                      fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, color: '#7A2D05',
                      background: 'rgba(122,45,5,0.07)', border: '1px solid rgba(122,45,5,0.12)',
                      borderRadius: 5, padding: '1px 5px', lineHeight: 1.6, flexShrink: 0,
                    }}>{typeLabel(rec.type)}</span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#8C6A55', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rec.country}
                    </span>
                    {rec.closesIn !== null && rec.closesIn <= 30 && (
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: rec.closesIn <= 7 ? '#C0392B' : '#9E8070', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                        <Clock size={9} />{rec.closesIn}d
                      </span>
                    )}
                  </div>
                </div>

                {/* Match dots + arrow */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: 3 }} title={tip}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: i < dotsFilled ? '#B5530A' : 'rgba(181,83,10,0.18)',
                        display: 'inline-block',
                        transform: mounted ? 'scale(1)' : 'scale(0)',
                        transition: `transform 220ms cubic-bezier(0.34,1.56,0.64,1) ${(idx * 80) + (i * 60)}ms`,
                      }} />
                    ))}
                  </div>
                  <ChevronRight size={13} style={{ color: '#B5530A', opacity: isHov ? 1 : 0.4, transition: 'opacity 140ms ease' }} />
                </div>
              </div>
            )
          })}

          {/* "Explore more" placeholder if < 3 results */}
          {recs.length < 3 && Array.from({ length: 3 - recs.length }).map((_, i) => (
            <div
              key={`placeholder-${i}`}
              onClick={() => router.push('/opportunities')}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, marginBottom: i < (3 - recs.length - 1) ? 8 : 0,
                border: '1px dashed rgba(122,45,5,0.14)', cursor: 'pointer',
                opacity: mounted ? 0.7 : 0,
                transition: `opacity 240ms ${EASE_OUT_SOFT} ${(recs.length + i) * 80}ms`,
              }}
            >
              <span style={{
                width: 32, height: 32, borderRadius: 7, flexShrink: 0,
                background: 'rgba(122,45,5,0.04)', border: '1px dashed rgba(122,45,5,0.14)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={13} style={{ color: 'rgba(122,45,5,0.3)' }} />
              </span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#9E8070', flex: 1 }}>
                Explore more opportunities
              </span>
              <ChevronRight size={13} style={{ color: '#B5530A', opacity: 0.4 }} />
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function RenewalNudge({ daysLeft, onDismiss }: { daysLeft: number; onDismiss: () => void }) {
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t) }, [])
  const isToday = daysLeft <= 0
  return (
    <>
      {upgradeOpen && <UpgradeModal onClose={() => setUpgradeOpen(false)} />}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 18px', borderRadius: 14, marginBottom: 24,
        background: 'linear-gradient(135deg, rgba(180,83,9,0.10) 0%, rgba(122,45,5,0.07) 100%)',
        border: '1px solid rgba(180,83,9,0.22)',
        transform: visible ? 'translateY(0)' : 'translateY(-10px)',
        opacity: visible ? 1 : 0,
        transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1), opacity 320ms ease',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'rgba(180,83,9,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Clock size={18} style={{ color: '#B45309' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14, color: '#2A1206' }}>
            {isToday ? 'Your Pro plan expires today' : `Pro plan expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#6B6660', marginTop: 2 }}>
            Renew now to keep full access to all opportunities and AI tools.
          </div>
        </div>
        <button
          onClick={() => setUpgradeOpen(true)}
          style={{
            flexShrink: 0, height: 34, padding: '0 14px', borderRadius: 8, border: 'none',
            background: '#B45309', color: '#fff', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          Renew <ArrowRight size={13} />
        </button>
        <button onClick={onDismiss} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 4,
          color: '#8C6A55', flexShrink: 0, display: 'flex',
        }}>
          <X size={16} />
        </button>
      </div>
    </>
  )
}

function UpgradeBanner({ onDismiss }: { onDismiss: () => void }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), 40); return () => clearTimeout(t) }, [])
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 18px', borderRadius: 14, marginBottom: 24,
      background: 'linear-gradient(135deg, rgba(122,45,5,0.10) 0%, rgba(181,83,10,0.08) 100%)',
      border: '1px solid rgba(122,45,5,0.20)',
      transform: visible ? 'translateY(0)' : 'translateY(-10px)',
      opacity: visible ? 1 : 0,
      transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1), opacity 320ms ease',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: 'rgba(122,45,5,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <CheckCircle size={18} style={{ color: '#7A2D05' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14, color: '#2A1206' }}>
          Welcome to Pro!
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#6B6660', marginTop: 2 }}>
          Your premium access is now active. All opportunities and AI tools are unlocked.
        </div>
      </div>
      <button onClick={onDismiss} style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
        color: '#8C6A55', flexShrink: 0, display: 'flex',
      }}>
        <X size={16} />
      </button>
    </div>
  )
}

export function DashboardPage() {
  const mob = useIsMobile()
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false)
  const [renewalDismissed, setRenewalDismissed] = useState(false)

  const isPaymentSuccess = searchParams.get('payment') === 'success'
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (!isPaymentSuccess) return
    setShowUpgradeBanner(true)
    // If Stripe redirected back with a session_id, verify the payment server-side
    // (handles webhook delivery latency — same logic as the webhook handler)
    const activate = sessionId
      ? api.post('/api/v1/payments/verify-session', { sessionId }).catch(() => {})
      : Promise.resolve()
    activate.then(() => {
      queryClient.invalidateQueries({ queryKey: keys.me })
    })
    // Strip the query params from URL without reload
    router.replace('/dashboard', { scroll: false })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const results = useQueries({
    queries: [
      { queryKey: keys.me,            queryFn: fetchers.me,            staleTime: 5 * 60 * 1000, retry: false },
      { queryKey: keys.applications,  queryFn: fetchers.applications,  staleTime: 60 * 1000 },
      { queryKey: keys.saved,         queryFn: fetchers.saved,         staleTime: 60 * 1000 },
      { queryKey: keys.documents,     queryFn: fetchers.documents,     staleTime: 2 * 60 * 1000 },
      { queryKey: keys.notifications, queryFn: fetchers.notifications, staleTime: 30 * 1000 },
      { queryKey: keys.threads,       queryFn: fetchers.threads,       staleTime: 30 * 1000 },
    ],
  })

  const loading = results.some(r => r.isLoading)
  if (loading) return <DashboardSkeleton mob={mob} />

  const me          = results[0].data
  const rawApps: ApiApplication[]         = (results[1].data as any)?.applications ?? []
  const rawSaved: ApiSavedOpportunity[]   = results[2].data ?? []
  const rawDocs: ApiDocument[]            = results[3].data ?? []
  const rawNotifs: ApiNotification[]      = results[4].data ?? []
  const rawThreads: ApiThread[]           = results[5].data ?? []

  const activeApps = rawApps.filter((a) => !['accepted', 'rejected', 'withdrawn'].includes(a.status))
  const userName   = me?.name || ''
  const apps       = rawApps.slice(0, 3).map(toAppItem)
  const saved      = rawSaved.slice(0, 4).map(toSavedItem)
  const stats      = buildStats(activeApps.length, rawSaved.length, rawDocs.length, rawApps)
  const profilePct = calcProfilePct(rawDocs.length, activeApps.length)

  const renewalDaysLeft = me?.premiumUntil && me.isPremium
    ? Math.ceil((new Date(me.premiumUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const showRenewalNudge = !renewalDismissed && renewalDaysLeft !== null && renewalDaysLeft <= 7

  return (
    <>
      <style>{`
        @keyframes dashPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
      `}</style>
      <div className="r-dash-wrap" style={{ padding: '28px 40px 40px', boxSizing: 'border-box' }}>
        {showUpgradeBanner && <UpgradeBanner onDismiss={() => setShowUpgradeBanner(false)} />}
        {showRenewalNudge && renewalDaysLeft !== null && (
          <RenewalNudge daysLeft={renewalDaysLeft} onDismiss={() => setRenewalDismissed(true)} />
        )}
        <PageHeader name={userName} mob={mob} />
        <StatStrip stats={stats} mob={mob} />
        <div className="r-dash-body" style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
          <div className="r-dash-main" style={{ flexBasis: '65%', minWidth: 0 }}>
            <SetupChecklist user={me ?? null} docs={rawDocs} saved={rawSaved} apps={rawApps} />
            <ApplicationsSection apps={apps} mob={mob} />
            <SavedSection saved={saved} mob={mob} />
            <AdBanner zone="dashboard" style={{ marginTop: 8 }} />
          </div>
          <div className="r-dash-side" style={{ flexBasis: '35%', minWidth: 0, marginTop: mob ? 28 : 0 }}>
            <ProfileRingCard profilePct={profilePct} docCount={rawDocs.length} hasPrefs={!!(me?.preferences && Object.keys(me.preferences as object).length > 1)} hasApps={rawApps.length > 0} mob={mob} />
            <RecommendationsWidget isPremium={!!me?.isPremium} />
            <UpcomingConsultationsWidget />
            <NotificationsCard notifications={rawNotifs} />
            <CredentialCard documents={rawDocs} mob={mob} />
            <MessagesCard threads={rawThreads} mob={mob} />
          </div>
        </div>
      </div>
    </>
  )
}
