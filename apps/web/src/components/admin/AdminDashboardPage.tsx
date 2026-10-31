'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'
import {
  Briefcase,
  PlusCircle,
  DollarSign,
  Lock,
  RefreshCw,
  Users,
  Activity,
  ClipboardCheck,
  Clock,
  CheckCircle,
  Mail,
} from 'lucide-react'

// -- API types --

interface ApiPipelineStage {
  status: string
  count: number
}

interface ApiHealth {
  stalledApplications: number
  unreadMessages: number
  expiringListings: number
  adminUserCount: number
}

interface ApiAdminDashboard {
  totalUsers: number
  publishedOpportunities: number
  totalApplications: number
  totalRevenueCents?: number
  pipeline: ApiPipelineStage[]
  health: ApiHealth
  signupDelta?: number
  trends?: {
    applications: number[]
    users: number[]
    opportunities: number[]
    revenue: number[]
  }
  needsAttention?: {
    stalledApplications: number
    oldUnreadThreads: number
    missingMeetingLinks: number
    expiringListings: number
  }
}

interface AttentionItem {
  label: string
  count: number
  href: string
}

// -- Pipeline display config --

const PIPE_DISPLAY = [
  { key: 'awaiting_payment', label: 'Awaiting Payment', color: '#0E7490' },
  { key: 'payment_confirmed', label: 'Payment Confirmed', color: '#B5530A' },
  { key: 'under_review', label: 'Under Review', color: '#D97706' },
  { key: 'decision_pending', label: 'Decision Pending', color: '#7C3AED' },
  { key: 'submitted', label: 'Submitted', color: '#059669' },
  { key: 'completed', label: 'Completed', color: '#34D399' },
]

function buildPipe(pipeline: ApiPipelineStage[]) {
  const byStatus = Object.fromEntries(pipeline.map(p => [p.status, p.count]))
  const get = (s: string) => byStatus[s] ?? 0

  return [
    { key: 'awaiting_payment', label: 'Awaiting Payment', color: '#0E7490', count: get('eligibility_screening') + get('document_collection') + get('awaiting_payment') },
    { key: 'payment_confirmed', label: 'Payment Confirmed', color: '#B5530A', count: get('payment_confirmed') },
    { key: 'under_review', label: 'Under Review', color: '#D97706', count: get('under_review') },
    { key: 'decision_pending', label: 'Decision Pending', color: '#7C3AED', count: get('decision_pending') },
    { key: 'submitted', label: 'Submitted', color: '#059669', count: get('submitted') },
    { key: 'completed', label: 'Completed', color: '#34D399', count: get('accepted') + get('rejected') + get('withdrawn') },
  ]
}

function getAdminName(): string {
  if (typeof window === 'undefined') return ''
  try {
    const raw = localStorage.getItem('oppdate_admin')
    if (!raw) return ''
    const parsed = JSON.parse(raw) as { name?: string }
    return parsed.name?.split(' ')[0] || ''
  } catch { return '' }
}

function buildHealth(h: ApiHealth) {
  return [
    {
      icon: Activity,
      label: 'OppDate Apply pipeline',
      status: h.stalledApplications > 0
        ? `${h.stalledApplications} application${h.stalledApplications !== 1 ? 's' : ''} stalled >3 days`
        : 'All applications moving',
      tone: (h.stalledApplications > 0 ? 'amber' : 'green') as 'amber' | 'green',
    },
    {
      icon: Mail,
      label: 'Unread messages',
      status: h.unreadMessages > 0 ? `${h.unreadMessages} unread` : 'No unread messages',
      tone: (h.unreadMessages > 0 ? 'amber' : 'green') as 'amber' | 'green',
    },
    {
      icon: Clock,
      label: 'Expiring listings',
      status: h.expiringListings > 0
        ? `${h.expiringListings} listing${h.expiringListings !== 1 ? 's' : ''} expire within 7 days`
        : 'No listings expiring soon',
      tone: (h.expiringListings > 0 ? 'amber' : 'green') as 'amber' | 'green',
    },
    {
      icon: Users,
      label: 'Admin accounts',
      status: `${h.adminUserCount} admin account${h.adminUserCount !== 1 ? 's' : ''}`,
      tone: 'green' as 'amber' | 'green',
    },
  ]
}

function timeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// -- Count-up animation component --
function CountUpNum({ target, prefix = '', animKey }: { target: number; prefix?: string; animKey: number }) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    setValue(0)
    if (target === 0) return
    const duration = 800
    const start = performance.now()
    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) requestAnimationFrame(tick)
      else setValue(target)
    }
    requestAnimationFrame(tick)
  }, [target, animKey])

  return <>{prefix}{value.toLocaleString()}</>
}

// -- Mini sparkline --
function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  if (!values || values.length < 2) return null
  const max = Math.max(...values, 1)
  // Only render when there's meaningful variation -- flat or all-zero data adds no value
  const allSame = values.every(v => v === values[0])
  if (allSame) return null
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100
    const y = 30 - (v / max) * 26
    return `${x},${y}`
  }).join(' ')
  const area = `0,32 ${pts} 100,32`
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="adm-sparkline">
      <defs>
        <clipPath id="spark-clip">
          <rect x="0" y="0" width="100" height="32" rx="0" />
        </clipPath>
      </defs>
      <g clipPath="url(#spark-clip)">
        <polygon points={area} fill={color} opacity="0.10" />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

// -- Needs Attention card --
function NeedsAttentionCard({ items }: { items: AttentionItem[] }) {
  const allClear = items.every(i => i.count === 0)
  return (
    <div className="adm-dcard adm-dash-anim" id="section-attention" style={{ animationDelay: '300ms' }}>
      <div className="adm-dcard-head"><h3>Needs attention</h3></div>
      {allClear ? (
        <div className="adm-feed-empty" style={{ padding: '20px' }}>
          <div className="adm-fe-ico"><CheckCircle /></div>
          <h4>All clear</h4>
          <p>No items require your attention right now.</p>
        </div>
      ) : (
        <div className="adm-attn-list">
          {items.filter(i => i.count > 0).map((item, i) => (
            <div key={i} className="adm-attn-row">
              <span className="adm-attn-dot" />
              <div className="adm-attn-body">
                <div className="adm-attn-label">{item.label}</div>
                <div className="adm-attn-count">{item.count}</div>
              </div>
              <Link href={item.href} className="adm-attn-link">View &rarr;</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// -- Main component --
function DashSkeleton() {
  return (
    <>
      <div className="adm-page-head">
        <div><div className="adm-skel adm-skel-line w40" style={{ height: 24, marginBottom: 8 }} /><div className="adm-skel adm-skel-line w25" style={{ height: 14 }} /></div>
        <div className="adm-skel adm-skel-badge" style={{ width: 36, height: 36, borderRadius: 8 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 20, marginBottom: 24 }}>
        {[0, 1, 2, 3].map(i => <div key={i} className="adm-skel" style={{ height: 100, borderRadius: 12 }} />)}
      </div>
      <div className="adm-skel" style={{ height: 48, borderRadius: 10, marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="adm-skel" style={{ height: 320, borderRadius: 12 }} />
        <div className="adm-skel" style={{ height: 320, borderRadius: 12 }} />
      </div>
    </>
  )
}

export function AdminDashboardPage() {
  const [refreshSpin, setRefreshSpin] = useState(false)
  const [animKey, setAnimKey] = useState(0)
  const [adminName, setAdminName] = useState('')
  const pipebarRef = useRef<HTMLDivElement>(null)
  const dashRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setAdminName(getAdminName()) }, [])

  const { data, isLoading, refetch } = useQuery<ApiAdminDashboard>({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api.get('/api/v1/admin/dashboard').then(r => r.data.data),
    staleTime: 60000,
  })

  const pipe = data ? buildPipe(data.pipeline) : PIPE_DISPLAY.map(p => ({ ...p, count: 0 }))
  const pipeTotal = pipe.reduce((a, b) => a + b.count, 0)

  const totalApplications = data?.totalApplications ?? 0
  const totalUsers = data?.totalUsers ?? 0
  const publishedOpportunities = data?.publishedOpportunities ?? 0
  const revenueDollars = data?.totalRevenueCents != null ? Math.floor(data.totalRevenueCents / 100) : null

  const health = data?.health ? buildHealth(data.health) : buildHealth({ stalledApplications: 0, unreadMessages: 0, expiringListings: 0, adminUserCount: 0 })

  const attentionItems: AttentionItem[] = [
    { label: 'Stalled applications (>3 days)', count: data?.needsAttention?.stalledApplications ?? 0, href: '/admin/applications' },
    { label: 'Unread messages older than 24h', count: data?.needsAttention?.oldUnreadThreads ?? 0, href: '/admin/messages' },
    { label: 'Upcoming sessions missing link', count: data?.needsAttention?.missingMeetingLinks ?? 0, href: '/admin/consultations' },
    { label: 'Listings expiring within 7 days', count: data?.needsAttention?.expiringListings ?? 0, href: '/admin/opportunities' },
  ]

  // Pipeline grow animation
  const runPipeGrow = useCallback(() => {
    if (!pipebarRef.current) return
    const segs = pipebarRef.current.querySelectorAll<HTMLElement>('[data-w]')
    segs.forEach((seg, i) => {
      seg.style.width = '0'
      setTimeout(() => { seg.style.width = seg.dataset.w + '%' }, 60 + i * 240)
    })
  }, [])

  useEffect(() => { if (!isLoading) runPipeGrow() }, [isLoading, runPipeGrow])

  // Legend <-> segment hover sync
  const handleLegendEnter = useCallback((key: string) => {
    const seg = pipebarRef.current?.querySelector<HTMLElement>(`.adm-pipeseg[data-pipe="${key}"]`)
    if (seg) seg.style.filter = 'brightness(1.22)'
  }, [])

  const handleLegendLeave = useCallback((key: string) => {
    const seg = pipebarRef.current?.querySelector<HTMLElement>(`.adm-pipeseg[data-pipe="${key}"]`)
    if (seg) seg.style.filter = ''
  }, [])

  // Refresh: spin icon + re-run all entrance animations + count-ups + pipeline
  const handleRefresh = useCallback(() => {
    setRefreshSpin(true)
    refetch().finally(() => setRefreshSpin(false))

    // Re-run entrance animations
    if (dashRef.current) {
      dashRef.current.querySelectorAll<HTMLElement>('.adm-dash-anim').forEach((el, i) => {
        el.style.animation = 'none'
        void el.offsetWidth
        el.style.animation = ''
        el.style.animationDelay = (i * 70) + 'ms'
      })
    }

    // Re-trigger count-ups
    setAnimKey(k => k + 1)

    // Re-run pipeline grow
    runPipeGrow()
  }, [runPipeGrow, refetch])

  if (isLoading) return <DashSkeleton />

  return (
    <div ref={dashRef}>
      {/* Page header */}
      <div className="adm-page-head">
        <div>
          <h1>Dashboard</h1>
          <div className="adm-dash-greeting">{timeGreeting()}{adminName ? `, ${adminName}` : ''}.</div>
        </div>
        <div className="adm-head-actions">
          <button
            className={`adm-refresh-btn${refreshSpin ? ' spin' : ''}`}
            onClick={handleRefresh}
            title="Refresh data"
          >
            <RefreshCw />
          </button>
        </div>
      </div>

      {/* Dashboard body */}
      <div className="adm-dash">
        {/* Left column */}
        <div className="adm-dash-left">
          {/* Stat strip */}
          <div className="adm-stat-strip" id="section-stats">
            <StatCard
              icon={<Briefcase />}
              target={totalApplications}
              label="Total applications"
              delta={totalApplications > 0 ? `${totalApplications} submitted` : 'No applications yet'}
              deltaTone={totalApplications > 0 ? 'up' : 'flat'}
              delay={0}
              animKey={animKey}
              sparkValues={data?.trends?.applications}
              sparkColor="#B5530A"
            />
            <StatCard
              icon={<PlusCircle />}
              target={publishedOpportunities}
              label="Published opportunities"
              delta={publishedOpportunities > 0 ? 'Live on platform' : 'None published yet'}
              deltaTone={publishedOpportunities > 0 ? 'up' : 'flat'}
              delay={60}
              animKey={animKey}
              sparkValues={data?.trends?.opportunities}
              sparkColor="#059669"
            />
            {revenueDollars == null ? (
              <div className="adm-stat-card locked adm-dash-anim" style={{ animationDelay: '120ms' }}>
                <div className="adm-st-ico"><DollarSign /></div>
                <div className="adm-st-num"><Lock /><span>---</span></div>
                <div className="adm-st-label">Total revenue</div>
                <div className="adm-st-delta flat">Restricted to your role</div>
                <div className="adm-dtip">Revenue data is restricted to your role.</div>
              </div>
            ) : (
              <StatCard
                icon={<DollarSign />}
                target={revenueDollars}
                prefix="$"
                label="Total revenue"
                delta={revenueDollars > 0 ? 'All time' : 'No revenue yet'}
                deltaTone={revenueDollars > 0 ? 'up' : 'flat'}
                delay={120}
                animKey={animKey}
                sparkValues={data?.trends?.revenue}
                sparkColor="#D97706"
              />
            )}
            <StatCard
              icon={<Users />}
              target={totalUsers}
              label="Total users"
              delta={data?.signupDelta ? `+${data.signupDelta} this week` : 'Registered accounts'}
              deltaTone={data?.signupDelta ? 'up' : 'flat'}
              delay={180}
              animKey={animKey}
              sparkValues={data?.trends?.users}
              sparkColor="#7C3AED"
            />
          </div>

          {/* Pipeline */}
          <div className="adm-dcard adm-dash-anim" id="section-pipeline" style={{ animationDelay: '240ms' }}>
            {pipeTotal === 0 ? (
              <>
                <div className="adm-dcard-head"><h3>Application pipeline</h3></div>
                <div className="adm-feed-empty" style={{ padding: '28px 20px' }}>
                  <div className="adm-fe-ico"><ClipboardCheck /></div>
                  <h4>No active applications</h4>
                  <p>Once users pay for OppDate Apply, applications will appear here across the 6-stage pipeline.</p>
                </div>
              </>
            ) : (
              <>
                <div className="adm-dcard-head">
                  <h3>Application pipeline</h3>
                  <span className="adm-dcard-sub">{pipeTotal} active applications</span>
                </div>
                <div className="adm-pipebar" ref={pipebarRef}>
                  {pipe.map(p => {
                    const pct = p.count / pipeTotal * 100
                    return (
                      <div
                        key={p.key}
                        className="adm-pipeseg"
                        data-pipe={p.key}
                        data-w={pct}
                        style={{ background: p.color }}
                      >
                        <div className="adm-seg-tip">
                          <b>{p.label}</b> - {p.count}
                          <span className="adm-tlink">Click to view &rarr;</span>
                        </div>
                      </div>
                    )
                  })}
                  <div className="adm-shimmer" />
                </div>
                <div className="adm-pipe-legend">
                  {pipe.map(p => {
                    const pct = Math.round(p.count / pipeTotal * 100)
                    return (
                      <div
                        key={p.key}
                        className="adm-pleg"
                        data-pipe={p.key}
                        onMouseEnter={() => handleLegendEnter(p.key)}
                        onMouseLeave={() => handleLegendLeave(p.key)}
                      >
                        <span className="adm-pdot" style={{ background: p.color }} />
                        <span className="adm-pl-name">{p.label}</span>
                        <span className="adm-pl-cnt">
                          {p.count}<span className="adm-pl-pct">{pct}%</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Activity feed */}
          <div className="adm-dcard adm-dash-anim" id="section-activity" style={{ animationDelay: '300ms' }}>
            <div className="adm-dcard-head">
              <h3>Recent activity</h3>
              <span className="adm-vall">View all &rarr;</span>
            </div>
            {pipeTotal === 0 ? (
              <div className="adm-feed-empty">
                <div className="adm-fe-ico"><Activity /></div>
                <h4>No activity yet</h4>
                <p>Once users start applying, events will appear here.</p>
              </div>
            ) : (
              <div className="adm-activity-list">
                {pipe.filter(p => p.count > 0).slice(0, 5).map((p, i) => (
                  <div key={p.key} className="adm-act-row" style={{ animationDelay: `${i * 40}ms` }}>
                    <span className="adm-act-dot" style={{ background: p.color }} />
                    <div className="adm-act-body">
                      <div className="adm-act-text">{p.count} application{p.count !== 1 ? 's' : ''} in <b>{p.label}</b></div>
                      <div className="adm-act-time">Current snapshot</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="adm-dash-right">
          {/* Needs attention */}
          <NeedsAttentionCard items={attentionItems} />

          {/* Platform health */}
          <div className="adm-dcard adm-dash-anim" id="section-health" style={{ animationDelay: '360ms' }}>
            <div className="adm-dcard-head">
              <h3 style={{ fontSize: 14, color: 'var(--adm-t-low)' }}>Platform health</h3>
            </div>
            {health.map((h, i) => (
              <div key={i} className="adm-health-row">
                <div className="adm-health-ico"><h.icon /></div>
                <div className="adm-health-body">
                  <div className="adm-health-label">{h.label}</div>
                  <div className={`adm-health-status ${h.tone}`}>
                    <span className={`adm-health-dot adm-hd-${h.tone}`} />
                    {h.status}
                  </div>
                </div>
                <span className="adm-health-view">View &rarr;</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// -- Sub-components --

function StatCard({
  icon, target, prefix = '', label, delta, deltaTone, delay, animKey, sparkValues, sparkColor,
}: {
  icon: React.ReactNode
  target: number
  prefix?: string
  label: string
  delta: string
  deltaTone: string
  delay: number
  animKey: number
  sparkValues?: number[]
  sparkColor?: string
}) {
  return (
    <div className="adm-stat-card adm-dash-anim" style={{ animationDelay: `${delay}ms` }}>
      <div className="adm-st-ico">{icon}</div>
      <div className="adm-st-num"><CountUpNum target={target} prefix={prefix} animKey={animKey} /></div>
      <div className="adm-st-label">{label}</div>
      <div className={`adm-st-delta ${deltaTone}`}>{delta}</div>
      {sparkValues && sparkColor && <MiniSparkline values={sparkValues} color={sparkColor} />}
    </div>
  )
}

