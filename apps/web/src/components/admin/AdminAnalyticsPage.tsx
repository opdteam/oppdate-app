'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

// -- API types --

interface ApiFunnelStage {
  status: string
  count: number
}

interface ApiRevenueByPurpose {
  purpose: string
  total: number
  count: number
}

interface ApiTopOpp {
  id: string
  title: string
  institution: string
  country: string
  type: string
  app_count: number
}

interface ApiEbookStats {
  revenueCents: number
  salesCount: number
  listingCount: number
}

interface ApiAdminAnalytics {
  activeUsers: number
  premiumUsers: number
  publishedOpportunities: number
  totalApplications: number
  applicationFunnel: ApiFunnelStage[]
  appsOverTime: number[]
  registrationsOverTime: number[]
  topOpportunities: ApiTopOpp[]
  funnelDropOff: ApiFunnelStage[]
  ebookStats: ApiEbookStats
  totalRevenueCents?: number
  revenueByPurpose?: ApiRevenueByPurpose[]
  revenueOverTime?: number[]
}

// -- Label maps --

const FUNNEL_LABEL: Record<string, string> = {
  eligibility_screening: 'Eligibility',
  document_collection: 'Documents',
  awaiting_payment: 'Awaiting Payment',
  payment_confirmed: 'Payment Confirmed',
  submitted: 'Submitted',
  under_review: 'Under Review',
  decision_pending: 'Decision Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

const PURPOSE_LABEL: Record<string, string> = {
  oppdate_apply: 'OppDate Apply',
  consultation: 'Consultations',
  mentorship: 'Mentorship',
  ebook: 'eBooks',
  premium: 'Premium',
}

// Donut colors per funnel status
const FUNNEL_COLOR: Record<string, string> = {
  eligibility_screening: '#0E7490',
  document_collection: '#B5530A',
  awaiting_payment: '#C4843A',
  payment_confirmed: '#D97706',
  submitted: '#34D399',
  under_review: '#059669',
  decision_pending: '#7C3AED',
  accepted: '#10B981',
  rejected: '#EF4444',
  withdrawn: '#6B7280',
}

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

function useCountUp(target: number, duration = 800, decimals = 0) {
  const [val, setVal] = useState(0)
  const ref = useRef<number | null>(null)
  useEffect(() => {
    const start = performance.now()
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setVal(ease * target)
      if (t < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [target, duration])
  return decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString()
}

function LineChart({ data, id: _id, prefix, labels, mobile }: {
  data: number[]
  id: string
  prefix?: string
  labels?: [string, string]
  mobile?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ x: number; y: number; v: number; idx: number } | null>(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })

  const PAD = useMemo(() => ({ l: 52, r: 14, t: 18, b: 36 }), [])
  const max = Math.max(...data) * 1.15 || 1
  const gridCount = mobile ? 3 : 4

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const e = entries[0]
      if (e) setDims({ w: e.contentRect.width, h: e.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const pts = useMemo(() => {
    if (dims.w === 0) return []
    const plotW = dims.w - PAD.l - PAD.r
    const plotH = dims.h - PAD.t - PAD.b
    return data.map((v, i) => {
      const x = PAD.l + (data.length <= 1 ? plotW / 2 : (i / (data.length - 1)) * plotW)
      const y = PAD.t + plotH * (1 - v / max)
      return { x, y, v }
    })
  }, [data, dims, max, PAD])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || pts.length === 0) return
    const dpr = window.devicePixelRatio || 1
    const { w, h } = dims
    canvas.width = w * dpr
    canvas.height = h * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)
    const plotH = h - PAD.t - PAD.b

    // Grid lines + Y labels
    ctx.font = '500 12px "DM Mono", monospace'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'right'
    const seenVals = new Set<number>()
    for (let g = 0; g <= gridCount; g++) {
      const val = Math.round(max * (g / gridCount))
      const gy = PAD.t + plotH * (1 - g / gridCount)
      ctx.strokeStyle = 'rgba(181,83,10,0.20)'
      ctx.setLineDash([3, 5])
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(PAD.l, gy)
      ctx.lineTo(w - PAD.r, gy)
      ctx.stroke()
      ctx.setLineDash([])
      if (!seenVals.has(val)) {
        seenVals.add(val)
        ctx.fillStyle = 'rgba(220,175,110,0.85)'
        ctx.fillText(`${prefix || ''}${val}`, PAD.l - 6, gy)
      }
    }

    // Area gradient
    const grad = ctx.createLinearGradient(0, PAD.t, 0, h - PAD.b)
    grad.addColorStop(0, 'rgba(181,83,10,0.28)')
    grad.addColorStop(1, 'rgba(181,83,10,0)')
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2
      ctx.bezierCurveTo(cpx, pts[i - 1].y, cpx, pts[i].y, pts[i].x, pts[i].y)
    }
    ctx.lineTo(pts[pts.length - 1].x, h - PAD.b)
    ctx.lineTo(pts[0].x, h - PAD.b)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    // Line
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2
      ctx.bezierCurveTo(cpx, pts[i - 1].y, cpx, pts[i].y, pts[i].x, pts[i].y)
    }
    ctx.strokeStyle = '#D4723A'
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.setLineDash([])
    ctx.stroke()

    // Dots
    const step = Math.max(1, Math.floor(pts.length / (mobile ? 10 : 20)))
    pts.forEach((p, i) => {
      if (i % step !== 0 && i !== pts.length - 1) return
      ctx.beginPath()
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#D4723A'
      ctx.fill()
    })

    // Hover crosshair + dot
    if (hover && pts[hover.idx]) {
      const hp = pts[hover.idx]
      ctx.strokeStyle = 'rgba(181,83,10,0.45)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      ctx.moveTo(hp.x, PAD.t)
      ctx.lineTo(hp.x, h - PAD.b)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.arc(hp.x, hp.y, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#D4723A'
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    // Endpoint pill
    const last = pts[pts.length - 1]
    if (last && !mobile) {
      const pillText = `${prefix || ''}${data[data.length - 1]}`
      ctx.font = '600 12px "DM Mono", monospace'
      const tw = ctx.measureText(pillText).width
      const pw = tw + 18, ph = 22
      const px = Math.min(last.x + 6, w - pw - 4)
      const py = Math.max(last.y - ph / 2, PAD.t)
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, 11)
      else ctx.rect(px, py, pw, ph)
      ctx.fillStyle = '#B5530A'
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(pillText, px + 9, py + ph / 2)
    }

    // X axis labels
    if (labels) {
      ctx.font = '500 12px "DM Mono", monospace'
      ctx.fillStyle = 'rgba(220,175,110,0.85)'
      ctx.textBaseline = 'alphabetic'
      ctx.textAlign = 'left'
      ctx.fillText(labels[0], PAD.l, h - 8)
      ctx.textAlign = 'right'
      ctx.fillText(labels[1], w - PAD.r, h - 8)
    }
  }, [pts, hover, dims, data, prefix, labels, mobile, max, gridCount, PAD])

  const findNearest = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas || pts.length === 0) return
    const rect = canvas.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top
    if (my < PAD.t - 10 || my > dims.h - PAD.b + 10) { setHover(null); return }
    let nearest = 0, minDist = Infinity
    pts.forEach((p, i) => {
      const d = Math.abs(p.x - mx)
      if (d < minDist) { minDist = d; nearest = i }
    })
    setHover({ x: pts[nearest].x, y: pts[nearest].y, v: pts[nearest].v, idx: nearest })
  }, [pts, dims.h, PAD])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    findNearest(e.clientX, e.clientY)
  }, [findNearest])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches[0]) findNearest(e.touches[0].clientX, e.touches[0].clientY)
  }, [findNearest])

  const tooltipStyle = useMemo((): React.CSSProperties => {
    if (!hover || !canvasRef.current || !wrapRef.current) return { opacity: 0, pointerEvents: 'none' }
    const canvasRect = canvasRef.current.getBoundingClientRect()
    const wrapRect = wrapRef.current.getBoundingClientRect()
    return {
      position: 'absolute',
      left: hover.x + (canvasRect.left - wrapRect.left),
      top: hover.y + (canvasRect.top - wrapRect.top),
      opacity: 1,
      pointerEvents: 'none',
      transform: 'translate(-50%, -140%)',
    }
  }, [hover])

  return (
    <div className="adm-anl-linewrap" ref={wrapRef} style={{ position: 'relative', height: mobile ? 180 : 210 }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => setHover(null)}
      />
      {hover && (
        <div className="adm-anl-tooltip show" style={tooltipStyle}>
          <span className="adm-anl-tt-date">Day {hover.idx + 1}</span>
          {(prefix || '') + hover.v.toLocaleString()}
        </div>
      )}
    </div>
  )
}

function StatStrip({ analytics, isMobile }: { analytics: ApiAdminAnalytics; isMobile: boolean }) {
  const users = useCountUp(analytics.activeUsers, 700)
  const premium = useCountUp(analytics.premiumUsers, 700)
  const opps = useCountUp(analytics.publishedOpportunities, 700)
  const apps = useCountUp(analytics.totalApplications, 700)
  const revDollars = analytics.totalRevenueCents != null ? analytics.totalRevenueCents / 100 : null
  const rev = useCountUp(revDollars ?? 0, 700)

  const usersTile = (delay: number) => (
    <div className="adm-anl-stat adm-anl-anim" style={{ animationDelay: `${delay}ms` }}>
      <div className="adm-anl-stat-n mono">{Number(users).toLocaleString()}</div>
      <div className="adm-anl-stat-l">Active users</div>
    </div>
  )
  const premiumTile = (delay: number) => (
    <div className="adm-anl-stat adm-anl-anim" style={{ animationDelay: `${delay}ms` }}>
      <div className="adm-anl-stat-n mono">{Number(premium).toLocaleString()}</div>
      <div className="adm-anl-stat-l">Premium users</div>
    </div>
  )
  const oppsTile = (delay: number) => (
    <div className="adm-anl-stat adm-anl-anim" style={{ animationDelay: `${delay}ms` }}>
      <div className="adm-anl-stat-n mono">{Number(opps).toLocaleString()}</div>
      <div className="adm-anl-stat-l">Published opportunities</div>
    </div>
  )
  const appsTile = (delay: number) => (
    <div className="adm-anl-stat adm-anl-anim" style={{ animationDelay: `${delay}ms` }}>
      <div className="adm-anl-stat-n mono">{Number(apps).toLocaleString()}</div>
      <div className="adm-anl-stat-l">Total applications</div>
    </div>
  )
  const revTile = (delay: number) => (
    <div className="adm-anl-stat adm-anl-anim" style={{ animationDelay: `${delay}ms` }}>
      <div className="adm-anl-stat-n mono">{revDollars != null ? `$${Number(rev).toLocaleString()}` : '-'}</div>
      <div className="adm-anl-stat-l">Total revenue</div>
    </div>
  )

  if (isMobile) {
    return (
      <div className="adm-anl-statstrip adm-mob-anl-statgrid">
        {usersTile(0)}
        {revDollars != null ? revTile(60) : appsTile(60)}
        {premiumTile(120)}
        {oppsTile(180)}
        {revDollars != null && appsTile(240)}
      </div>
    )
  }

  return (
    <div className={`adm-anl-statstrip${revDollars == null ? ' cols-3' : ' cols-5'}`}>
      {usersTile(0)}
      {premiumTile(60)}
      {oppsTile(120)}
      {appsTile(180)}
      {revDollars != null && revTile(240)}
    </div>
  )
}

function DonutChart({ funnel }: { funnel: ApiFunnelStage[] }) {
  const stages = funnel.map(f => ({
    key: f.status,
    label: FUNNEL_LABEL[f.status] ?? f.status,
    color: FUNNEL_COLOR[f.status] ?? '#9CA3AF',
    count: f.count,
  }))

  const total = stages.reduce((a, s) => a + s.count, 0)
  const R = 70, CX = 90, CY = 90, STROKE = 26
  const circ = 2 * Math.PI * R
  let offsetAcc = 0
  const animTotal = useCountUp(total, 700)

  const arcs = stages.map(s => {
    const frac = total ? s.count / total : 0
    const len = frac * circ
    const rotate = (offsetAcc / circ) * 360 - 90
    offsetAcc += len
    return { ...s, len, rotate, dash: `${len} ${circ - len}` }
  })

  return (
    <div className="adm-anl-card adm-anl-anim">
      <div className="adm-anl-cardhead"><h3>Applications by stage</h3></div>
      <div className="adm-anl-donutwrap">
        <svg className="adm-anl-donutsvg" width="180" height="180" viewBox="0 0 180 180">
          {arcs.map(a => (
            <circle key={a.key} className="adm-anl-donut-seg" cx={CX} cy={CY} r={R} fill="none"
              stroke={a.color} strokeWidth={STROKE} strokeDasharray={a.dash}
              transform={`rotate(${a.rotate} ${CX} ${CY})`} />
          ))}
          <text x={CX} y={CY - 4} textAnchor="middle" fontFamily="DM Mono, monospace" fontSize="22" fontWeight="700" fill="var(--adm-t-hi)">{animTotal}</text>
          <text x={CX} y={CY + 16} textAnchor="middle" fontFamily="DM Sans, sans-serif" fontSize="10.5" fill="var(--adm-t-low)">active</text>
        </svg>
        <div className="adm-anl-legend">
          {stages.map(s => (
            <div key={s.key} className="adm-anl-legrow">
              <span className="adm-anl-legdot" style={{ background: s.color }} />
              <span className="adm-anl-legname">{s.label}</span>
              <span className="adm-anl-legcnt">{s.count}<span className="adm-anl-legpct">{total ? Math.round(s.count / total * 100) : 0}%</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RevenueBreakdown({ revenueByPurpose }: { revenueByPurpose: ApiRevenueByPurpose[] }) {
  const max = Math.max(...revenueByPurpose.map(r => r.total), 1)
  return (
    <div className="adm-anl-card adm-anl-anim">
      <div className="adm-anl-cardhead"><h3>Revenue by purpose</h3></div>
      {revenueByPurpose.map((r, i) => {
        const dollars = r.total / 100
        return (
          <div key={r.purpose} className="adm-anl-hbar-row">
            <div className="adm-anl-hbar-label">{PURPOSE_LABEL[r.purpose] ?? r.purpose}</div>
            <div className="adm-anl-hbar-track">
              <div className="adm-anl-hbar-fill" style={{ '--w': `${(r.total / max * 100)}%`, animationDelay: `${i * 30}ms` } as React.CSSProperties} />
            </div>
            <div className="adm-anl-hbar-val mono">${dollars.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
        )
      })}
    </div>
  )
}

const OPP_TYPE_SHORT: Record<string, string> = {
  internship: 'Internship', scholarship: 'Scholarship', training_bootcamp: 'Training',
  entry_level_job: 'Job', fellowship: 'Fellowship', grant: 'Grant',
  volunteering: 'Volunteering', competition: 'Competition', relocation: 'Relocation',
}

function TopOppsBar({ opps }: { opps: ApiTopOpp[] }) {
  const max = Math.max(...opps.map(o => o.app_count), 1)
  if (opps.length === 0) {
    return (
      <div className="adm-anl-card adm-anl-anim">
        <div className="adm-anl-cardhead"><h3>Top 10 opportunities by application count</h3></div>
        <div className="adm-anl-empty-state">No applications yet.</div>
      </div>
    )
  }
  return (
    <div className="adm-anl-card adm-anl-anim">
      <div className="adm-anl-cardhead"><h3>Top 10 opportunities by application count</h3></div>
      <div className="adm-anl-topopps">
        {opps.map((o, i) => (
          <div key={o.id} className="adm-anl-topopp-row">
            <span className="adm-anl-topopp-rank mono">{i + 1}</span>
            <div className="adm-anl-topopp-info">
              <div className="adm-anl-topopp-title">{o.title}</div>
              <div className="adm-anl-topopp-meta">{o.institution} &middot; {OPP_TYPE_SHORT[o.type] ?? o.type}</div>
            </div>
            <div className="adm-anl-topopp-bar-wrap">
              <div className="adm-anl-topopp-bar" style={{ '--w': `${(o.app_count / max) * 100}%`, animationDelay: `${i * 25}ms` } as React.CSSProperties} />
            </div>
            <span className="adm-anl-topopp-cnt mono">{o.app_count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function sliceDays(data: number[], days: number): number[] {
  return data.slice(Math.max(0, data.length - days))
}

function makeLabels(days: number): [string, string] {
  const end = new Date()
  const start = new Date(Date.now() - (days - 1) * 86400000)
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  return [fmt(start), fmt(end)]
}

function AppsChart({ isMobile, data }: { isMobile: boolean; data: number[] }) {
  const [range, setRange] = useState(30)
  const sliced = sliceDays(data, range)
  const allZero = sliced.every(v => v === 0)
  return (
    <div className="adm-anl-card adm-anl-anim">
      <div className="adm-anl-cardhead">
        <div><h3>Applications over time</h3></div>
        <div className="adm-anl-seg">
          {[30, 60, 90].map(r => (
            <div key={r} className={`adm-anl-seg-o${range === r ? ' on' : ''}`} onClick={() => setRange(r)}>{r}d</div>
          ))}
        </div>
      </div>
      {allZero
        ? <div className="adm-anl-empty-state">No applications in the last {range} days.</div>
        : <LineChart data={sliced} id="apps" labels={makeLabels(range)} mobile={isMobile} />
      }
    </div>
  )
}

function RevenueChart({ isMobile, data }: { isMobile: boolean; data: number[] }) {
  const [range, setRange] = useState(30)
  const sliced = sliceDays(data, range).map(v => Math.round(v / 100))
  const allZero = sliced.every(v => v === 0)
  return (
    <div className="adm-anl-card adm-anl-anim">
      <div className="adm-anl-cardhead">
        <div><h3>Revenue over time</h3></div>
        <div className="adm-anl-seg">
          {[30, 60, 90].map(r => (
            <div key={r} className={`adm-anl-seg-o${range === r ? ' on' : ''}`} onClick={() => setRange(r)}>{r}d</div>
          ))}
        </div>
      </div>
      {allZero
        ? <div className="adm-anl-empty-state">No revenue in the last {range} days.</div>
        : <LineChart data={sliced} id="rev" prefix="$" labels={makeLabels(range)} mobile={isMobile} />
      }
    </div>
  )
}

function RegChart({ isMobile, data }: { isMobile: boolean; data: number[] }) {
  const [range, setRange] = useState(30)
  const sliced = sliceDays(data, range)
  const allZero = sliced.every(v => v === 0)
  return (
    <div className="adm-anl-card adm-anl-anim">
      <div className="adm-anl-cardhead">
        <div><h3>User registrations over time</h3></div>
        <div className="adm-anl-seg">
          {[30, 60, 90].map(r => (
            <div key={r} className={`adm-anl-seg-o${range === r ? ' on' : ''}`} onClick={() => setRange(r)}>{r}d</div>
          ))}
        </div>
      </div>
      {allZero
        ? <div className="adm-anl-empty-state">No registrations in the last {range} days.</div>
        : <LineChart data={sliced} id="reg" labels={makeLabels(range)} mobile={isMobile} />
      }
    </div>
  )
}

function EbookSection({ stats }: { stats: ApiEbookStats }) {
  const revDollars = (stats.revenueCents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })
  return (
    <div className="adm-anl-card adm-anl-anim">
      <div className="adm-anl-cardhead"><h3>eBook performance</h3></div>
      <div className="adm-anl-statstrip cols-3" style={{ paddingTop: 12 }}>
        <div className="adm-anl-stat">
          <div className="adm-anl-stat-n mono">{stats.listingCount}</div>
          <div className="adm-anl-stat-l">Published eBooks</div>
        </div>
        <div className="adm-anl-stat">
          <div className="adm-anl-stat-n mono">{stats.salesCount}</div>
          <div className="adm-anl-stat-l">Total sales</div>
        </div>
        <div className="adm-anl-stat">
          <div className="adm-anl-stat-n mono">${revDollars}</div>
          <div className="adm-anl-stat-l">eBook revenue</div>
        </div>
      </div>
    </div>
  )
}

const FUNNEL_DROP_LABELS: Record<string, string> = {
  payment_confirmed: 'Payment confirmed',
  under_review: 'Under review',
  decision_pending: 'Decision pending',
  submitted: 'Submitted',
  accepted: 'Accepted',
}
const FUNNEL_DROP_COLORS = ['#B5530A', '#D97706', '#7C3AED', '#059669', '#34D399']

function FunnelSection({ stages }: { stages: ApiFunnelStage[] }) {
  const max = stages[0]?.count || 1
  if (stages.every(s => s.count === 0)) {
    return (
      <div className="adm-anl-card adm-anl-anim">
        <div className="adm-anl-cardhead"><h3>OppDate Apply drop-off funnel</h3></div>
        <div className="adm-anl-empty-state">No application pipeline data yet.</div>
      </div>
    )
  }
  return (
    <div className="adm-anl-card adm-anl-anim">
      <div className="adm-anl-cardhead"><h3>OppDate Apply drop-off funnel</h3></div>
      <div className="adm-anl-funnel">
        {stages.map((s, i) => {
          const width = max > 0 ? (s.count / max) * 100 : 0
          const dropPct = i > 0 && stages[i - 1].count > 0
            ? Math.round((1 - s.count / stages[i - 1].count) * 100)
            : null
          return (
            <div key={s.status} className="adm-anl-funnel-row">
              <div className="adm-anl-funnel-label">{FUNNEL_DROP_LABELS[s.status] ?? s.status}</div>
              <div className="adm-anl-funnel-bar-wrap">
                <div
                  className="adm-anl-funnel-bar"
                  style={{ '--w': `${width}%`, background: FUNNEL_DROP_COLORS[i], animationDelay: `${i * 40}ms` } as React.CSSProperties}
                />
              </div>
              <div className="adm-anl-funnel-right">
                <span className="adm-anl-funnel-cnt mono">{s.count}</span>
                {dropPct !== null && dropPct > 0 && (
                  <span className="adm-anl-funnel-drop">-{dropPct}%</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="adm-anl-page">
      <div className="adm-anl-pagehead">
        <div className="adm-skel adm-skel-line w25" style={{ height: 24, marginBottom: 8 }} />
        <div className="adm-skel adm-skel-line w15" style={{ height: 13 }} />
      </div>
      <div className="adm-anl-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[0, 1, 2, 3].map(i => <div key={i} className="adm-skel" style={{ height: 88, borderRadius: 12 }} />)}
        </div>
        <div className="adm-skel" style={{ height: 280, borderRadius: 12, marginBottom: 20 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="adm-skel" style={{ height: 240, borderRadius: 12 }} />
          <div className="adm-skel" style={{ height: 240, borderRadius: 12 }} />
        </div>
      </div>
    </div>
  )
}

function AnalyticsError() {
  return (
    <div className="adm-anl-page">
      <div className="adm-anl-pagehead">
        <h1>Analytics</h1>
        <span className="adm-anl-sub">Platform metrics</span>
      </div>
      <div className="adm-anl-content">
        <div className="adm-anl-card adm-anl-anim">
          <div className="adm-anl-empty-state">Failed to load analytics. Please refresh the page.</div>
        </div>
      </div>
    </div>
  )
}

export function AdminAnalyticsPage() {
  const isMobile = useIsMobile()

  const { data: analytics, isLoading, isError } = useQuery<ApiAdminAnalytics>({
    queryKey: ['admin', 'analytics'],
    queryFn: () => api.get('/api/v1/admin/analytics').then(r => r.data.data),
  })

  if (isLoading) return <AnalyticsSkeleton />
  if (isError || !analytics) return <AnalyticsError />

  const hasRevenue = analytics.totalRevenueCents != null
  const hasRevenueByPurpose = analytics.revenueByPurpose != null && analytics.revenueByPurpose.length > 0

  return (
    <div className="adm-anl-page">
      <div className="adm-anl-pagehead">
        <h1>Analytics</h1>
        <span className="adm-anl-sub">Platform metrics</span>
      </div>

      <div className="adm-anl-content">
        <StatStrip analytics={analytics} isMobile={isMobile} />
        <AppsChart isMobile={isMobile} data={analytics.appsOverTime ?? []} />
        {hasRevenue && analytics.revenueOverTime && <RevenueChart isMobile={isMobile} data={analytics.revenueOverTime} />}
        <DonutChart funnel={analytics.applicationFunnel} />
        <TopOppsBar opps={analytics.topOpportunities ?? []} />
        <RegChart isMobile={isMobile} data={analytics.registrationsOverTime ?? []} />
        {hasRevenueByPurpose && <RevenueBreakdown revenueByPurpose={analytics.revenueByPurpose!} />}
        {analytics.ebookStats && <EbookSection stats={analytics.ebookStats} />}
        {hasRevenue && analytics.funnelDropOff && <FunnelSection stages={analytics.funnelDropOff} />}
      </div>
    </div>
  )
}
