'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  Search,
  X,
  Download,
  RefreshCw,
  Copy,
  ChevronLeft,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  MoreVertical,
  SlidersHorizontal,
  CreditCard,
} from 'lucide-react'

// ── API types ────────────────────────────────────────────────────────────────

interface ApiAdminPayment {
  id: string
  userId: string
  purpose: 'oppdate_apply' | 'consultation' | 'mentorship' | 'ebook' | 'premium'
  referenceId: string
  gateway: 'stripe' | 'flutterwave' | 'paystack' | 'lemon_squeezy'
  gatewayPaymentId: string
  amountUsd: number
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
  // joined
  userName: string | null
  userEmail: string | null
  userAvatarUrl: string | null
  opportunityTitle: string | null
}

interface ApiPaymentsResponse {
  payments: ApiAdminPayment[]
  total: number
  page: number
  limit: number
  hasMore: boolean
  revenueSummary: { grossCents: number; transactionCount: number } | null
}

// ── Local display types ───────────────────────────────────────────────────────

type Role = 'founder' | 'manager'

type Gateway = {
  name: string
  sub: string
  dashboardUrl: string
}

type Txn = {
  id: string           // referenceId or raw id — used as display key
  rawId: string        // raw payment UUID — used for API calls
  user: string         // display name
  email: string
  initials: string
  avatarUrl: string | null
  source: 'vip' | 'mentorship' | 'consultation' | 'ebook' | 'premium'
  sourceLabel: string  // short badge label
  oppTitle: string | null
  stage: string | null
  gateway: 'stripe' | 'flutterwave' | 'paystack' | 'lemon_squeezy'
  amount: number
  status: 'succeeded' | 'pending' | 'processing' | 'failed' | 'refunded'
  date: string
  gatewayPaymentId: string
}

type StatusFilter = 'all' | 'succeeded' | 'pending' | 'processing' | 'failed' | 'refunded'
type SourceFilter = 'all' | 'oppdate_apply' | 'mentorship' | 'consultation' | 'ebook' | 'premium'

// ── Static gateway config (live status/volume not available from API) ─────────

const GATEWAYS: Record<string, Gateway> = {
  stripe: {
    name: 'Stripe',
    sub: 'Global',
    dashboardUrl: 'https://dashboard.stripe.com',
  },
  flutterwave: {
    name: 'Flutterwave',
    sub: 'Africa',
    dashboardUrl: 'https://dashboard.flutterwave.com',
  },
  paystack: {
    name: 'Paystack',
    sub: 'Nigeria / Ghana',
    dashboardUrl: 'https://dashboard.paystack.com',
  },
  lemon_squeezy: {
    name: 'Lemon Squeezy',
    sub: 'eBook payments',
    dashboardUrl: 'https://app.lemonsqueezy.com',
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function purposeToSource(purpose: ApiAdminPayment['purpose']): Txn['source'] {
  if (purpose === 'oppdate_apply') return 'vip'
  if (purpose === 'consultation') return 'consultation'
  if (purpose === 'mentorship') return 'mentorship'
  if (purpose === 'ebook') return 'ebook'
  return 'premium'
}

function purposeToSourceLabel(purpose: ApiAdminPayment['purpose']): string {
  if (purpose === 'oppdate_apply') return 'Apply'
  if (purpose === 'consultation') return 'Consultation'
  if (purpose === 'mentorship') return 'Mentorship'
  if (purpose === 'ebook') return 'eBook'
  return 'Premium'
}

function nameInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??'
}

function apiToTxn(p: ApiAdminPayment): Txn {
  const name = p.userName || p.userEmail || p.userId.slice(0, 8)
  return {
    id: p.referenceId || p.id,
    rawId: p.id,
    user: name,
    email: p.userEmail || '-',
    initials: p.userName ? nameInitials(p.userName) : (p.userEmail?.slice(0, 2).toUpperCase() ?? '??'),
    avatarUrl: p.userAvatarUrl ?? null,
    source: purposeToSource(p.purpose),
    sourceLabel: purposeToSourceLabel(p.purpose),
    oppTitle: p.opportunityTitle ?? null,
    stage: null,
    gateway: p.gateway,
    amount: p.amountUsd / 100,
    status: p.status,
    date: new Date(p.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
    gatewayPaymentId: p.gatewayPaymentId,
  }
}

const STAGE_META: Record<string, { label: string; color: string }> = {
  payment: { label: 'Payment Confirmed', color: '#B5530A' },
  assigned: { label: 'Application Assigned', color: '#0E7490' },
  review: { label: 'Documents Under Review', color: '#D97706' },
  verified: { label: 'Documents Verified', color: '#059669' },
  preparing: { label: 'Preparing Submission', color: '#7C3AED' },
  submitted: { label: 'Submitted', color: '#34D399' },
}

const SOURCE_LABELS: Record<string, string> = {
  oppdate_apply: 'OppDate Apply', mentorship: 'Mentorship', consultation: 'Consultation', ebook: 'eBook', premium: 'Premium',
}

function gwName(gw: string): string {
  return GATEWAYS[gw]?.name ?? gw
}

function CustomSelect({ value, options, placeholder, onChange, className }: {
  value: string; options: { value: string; label: string }[]; placeholder: string
  onChange: (v: string) => void; className?: string
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return
      if (dropRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  useEffect(() => {
    if (!open || !triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 6, left: r.left, width: r.width })
  }, [open])

  const selected = options.find(o => o.value === value)
  return (
    <div ref={triggerRef} className={`adm-csel${open ? ' open' : ''}${className ? ' ' + className : ''}`}>
      <div className="adm-csel-trigger" onClick={() => setOpen(!open)}>
        <span className={`adm-csel-val${value ? '' : ' ph'}`}>{selected?.label || placeholder}</span>
        <ChevronDown className="adm-csel-arrow" />
      </div>
      {open && createPortal(
        <div ref={dropRef} className="adm-csel-drop" style={{ display: 'block', position: 'fixed', top: pos.top, left: pos.left, width: pos.width, right: 'auto' }}>
          {options.map(o => (
            <div key={o.value} className={`adm-csel-opt${value === o.value ? ' sel-on' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false) }}>
              {o.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

const SOURCE_OPTIONS = [
  { value: 'all', label: 'All sources' },
  { value: 'oppdate_apply', label: 'OppDate Apply' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'ebook', label: 'eBook' },
  { value: 'premium', label: 'Premium' },
]


const STATUS_PILLS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'succeeded', label: 'Succeeded' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'failed', label: 'Failed' },
  { key: 'refunded', label: 'Refunded' },
]

const GW_ORDER: { key: string; label: string }[] = [
  { key: 'stripe', label: 'Stripe' },
  { key: 'flutterwave', label: 'Flutterwave' },
  { key: 'paystack', label: 'Paystack' },
  { key: 'lemon_squeezy', label: 'Lemon Squeezy' },
]

function flashCopied(text: string, el: HTMLElement) {
  navigator.clipboard.writeText(text).catch(() => {})
  const tip = document.createElement('span')
  tip.className = 'adm-pay-copied show'
  tip.textContent = 'Copied!'
  el.style.position = 'relative'
  el.appendChild(tip)
  setTimeout(() => { tip.classList.remove('show'); setTimeout(() => tip.remove(), 150) }, 1200)
}

function GatewayStrip({ activeGw, role, onConfigure }: { activeGw: string | null; role: Role; onConfigure: (gw: string) => void }) {
  return (
    <div className="adm-pay-gwstrip" id="gw-summary">
      {GW_ORDER.map((g, i) => {
        const gw = GATEWAYS[g.key]
        const canConfigure = role === 'founder'
        return (
          <div
            key={g.key}
            className={`adm-pay-gwcard${activeGw === g.key ? ' active-gw' : ''}`}
            style={{ animationDelay: `${i * 60}ms`, cursor: canConfigure ? 'pointer' : 'default' }}
            onClick={canConfigure ? () => onConfigure(g.key) : undefined}
          >
            <div className="adm-pay-gwtop">
              <div>
                <div className="adm-pay-gwname">{gw.name}</div>
                <div className="adm-pay-gwsub">{gw.sub}</div>
              </div>
            </div>
            <div className="adm-pay-gwvol" style={{ marginTop: 16, fontSize: 12, color: 'var(--adm-t-low)' }}>
              Gateway configuration is managed in the platform settings.
            </div>
            {canConfigure ? (
              <span className="adm-pay-gwconfigure" onClick={(e) => { e.stopPropagation(); onConfigure(g.key) }}>
                View details &rarr;
              </span>
            ) : (
              <span className="adm-pay-gwconfigure disabled">View details &rarr;</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function RevenueBar({ txns, statusFilter, revenueSummary }: { txns: Txn[]; statusFilter: StatusFilter; revenueSummary: { grossCents: number; transactionCount: number } | null | undefined }) {
  const grossRef = useRef<HTMLSpanElement>(null)
  const netRef = useRef<HTMLSpanElement>(null)

  const gross = revenueSummary != null ? revenueSummary.grossCents / 100 : txns.reduce((a, t) => a + t.amount, 0)

  useEffect(() => {
    const dur = 600
    const start = performance.now()
    let raf: number
    function tick(now: number) {
      const t = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - t, 3)
      if (grossRef.current) grossRef.current.textContent = '$' + (gross * eased).toFixed(2)
      if (netRef.current) netRef.current.textContent = revenueSummary != null ? String(revenueSummary.transactionCount) : String(txns.length)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [gross, revenueSummary, txns.length])

  return (
    <div className="adm-pay-revbar">
      <span className="adm-pay-revshowing">Showing {txns.length} transaction{txns.length !== 1 ? 's' : ''}</span>
      {revenueSummary != null ? (
        <span className={`adm-pay-revtotals${statusFilter === 'failed' ? ' failed' : ''}`}>
          <span><span className="adm-pay-rvlbl">Gross:</span><span ref={grossRef}>$0.00</span></span>
          <span><span className="adm-pay-rvlbl">Transactions:</span><span ref={netRef}>0</span></span>
        </span>
      ) : (
        <span className={`adm-pay-revtotals${statusFilter === 'failed' ? ' failed' : ''}`}>
          <span><span className="adm-pay-rvlbl">Gross:</span><span ref={grossRef}>$0.00</span></span>
        </span>
      )}
    </div>
  )
}

function TxnRow({ t, role, checked, onToggle, onSelect, onRefundClick, onDownload }: { t: Txn; role: Role; checked: boolean; onToggle: (id: string) => void; onSelect: (id: string) => void; onRefundClick: (id: string) => void; onDownload: (id: string) => void }) {
  const gwClass = `adm-pay-gwb-${t.gateway}`
  const rowCls = t.status === 'failed' ? 'adm-pay-failed' : undefined

  return (
    <tr className={rowCls} onClick={() => onSelect(t.id)}>
      <td><div className={`adm-cbx${checked ? ' on' : ''}`} onClick={(e) => { e.stopPropagation(); onToggle(t.id) }}><Check size={12} /></div></td>
      <td>
        <div className="adm-pay-txnid">
          {t.id}
          <span className="adm-pay-copyico" onClick={(e) => { e.stopPropagation(); flashCopied(t.id, e.currentTarget) }}>
            <Copy size={12} />
          </span>
        </div>
      </td>
      <td>
        <div className="adm-pay-txnuser">
          <span className="adm-pay-txnav" style={{ overflow: 'hidden', padding: 0 }}>
            {t.avatarUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={t.avatarUrl} alt={t.initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; if (e.currentTarget.parentElement) e.currentTarget.parentElement.textContent = t.initials }} />
              : t.initials}
          </span>
          <div>
            <div className="adm-pay-txnuname">{t.user}</div>
            <div className="adm-pay-txnuemail">{t.email}</div>
          </div>
        </div>
      </td>
      <td>
        <span className={`adm-pay-srcbadge adm-pay-src-${t.source}`}>{t.sourceLabel}</span>
        {t.oppTitle && <div className="adm-pay-txnsrcsub" style={{ marginTop: 4 }}>{t.oppTitle}</div>}
      </td>
      <td><span className={`adm-pay-gwbadge ${gwClass}`}>{gwName(t.gateway)}</span></td>
      <td><div className="adm-pay-txnamt">${t.amount.toFixed(2)}</div></td>
      <td>
        <span className={`adm-pay-status adm-pay-ps-${t.status}`}>
          {t.status[0].toUpperCase() + t.status.slice(1)}
        </span>
      </td>
      <td><div className="adm-pay-txndate">{t.date}</div></td>
      <td>
        <div className="adm-pay-txnactions">
          {t.status === 'succeeded' && role === 'founder' && (
            <button className="adm-pay-txnactbtn" title="Refund" onClick={(e) => { e.stopPropagation(); onRefundClick(t.id) }}><RefreshCw size={14} /></button>
          )}
          <button className="adm-pay-txnactbtn" title="Download receipt" onClick={(e) => { e.stopPropagation(); onDownload(t.id) }}><Download size={14} /></button>
        </div>
      </td>
    </tr>
  )
}

function exportCsv(txns: Txn[]) {
  const headers = ['Reference', 'Customer', 'Email', 'Service', 'Opportunity', 'Gateway', 'Amount (USD)', 'Status', 'Date']
  const rows = txns.map(t => [
    t.id,
    t.user,
    t.email,
    t.sourceLabel,
    t.oppTitle ?? '',
    GATEWAY_NAMES[t.gateway] ?? t.gateway,
    t.amount.toFixed(2),
    t.status,
    t.date,
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `oppdate-payments-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const GATEWAY_NAMES: Record<string, string> = {
  stripe: 'Stripe', paystack: 'Paystack', flutterwave: 'Flutterwave', lemon_squeezy: 'Lemon Squeezy',
}

function ReceiptPrintModal({ txn, onClose }: { txn: Txn; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function handlePrint() {
    const el = printRef.current
    if (!el) return
    const win = window.open('', '_blank', 'width=680,height=800')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt - ${txn.id}</title><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #1a1107; padding: 40px; }
      .rc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #1a1107; }
      .rc-brand img { height: 40px; width: auto; display: block; }
      .rc-title { font-size: 13px; color: #6b5840; text-transform: uppercase; letter-spacing: 1px; }
      .rc-hero { text-align: center; padding: 28px 0; background: #fdf3e3; border-radius: 8px; margin-bottom: 28px; }
      .rc-amount { font-size: 36px; font-weight: 700; color: #1a1107; letter-spacing: -1px; }
      .rc-status { display: inline-block; margin-top: 8px; padding: 3px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #d1fae5; color: #065f46; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 12px 0; border-bottom: 1px solid #ede8e1; font-size: 14px; vertical-align: top; }
      td:first-child { color: #a09070; width: 40%; }
      td:last-child { color: #1a1107; font-weight: 500; }
      .rc-mono { font-family: 'Courier New', monospace; font-size: 12px; color: #6b5840; }
      .rc-footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #ede8e1; font-size: 11px; color: #a09070; text-align: center; line-height: 1.6; }
      @media print { body { padding: 20px; } }
    </style></head><body>${el.innerHTML}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 250)
  }

  const statusColor = txn.status === 'succeeded'
    ? { bg: '#d1fae5', tx: '#065f46' }
    : txn.status === 'refunded'
    ? { bg: '#fef3c7', tx: '#92400e' }
    : txn.status === 'pending' || txn.status === 'processing'
    ? { bg: '#fef3c7', tx: '#b45309' }
    : { bg: '#fee2e2', tx: '#991b1b' }

  return createPortal(
    <>
      <div className="adm-receipt-backdrop" onClick={onClose} />
      <div className="adm-receipt-modal">
        <div className="adm-receipt-modal-head">
          <span>Payment Receipt</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="adm-receipt-print-btn" onClick={handlePrint}><Download size={14} /> Print / Save PDF</button>
            <button className="adm-qv-close" onClick={onClose}><X size={17} /></button>
          </div>
        </div>
        <div className="adm-receipt-modal-body">
          <div ref={printRef}>
            <div className="rc-header">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div className="rc-brand"><img src={`${typeof window !== 'undefined' ? window.location.origin : ''}/assets/oppdate-monogram.png`} alt="OppDate" /></div>
              <div className="rc-title">Payment Receipt</div>
            </div>
            <div className="rc-hero">
              <div className="rc-amount">${txn.amount.toFixed(2)}</div>
              <div className="rc-status" style={{ background: statusColor.bg, color: statusColor.tx }}>
                {txn.status[0].toUpperCase() + txn.status.slice(1)}
              </div>
            </div>
            <table>
              <tbody>
                {txn.id !== txn.rawId && (
                  <tr><td>Reference</td><td className="rc-mono">{txn.id}</td></tr>
                )}
                <tr><td>Customer</td><td>{txn.user}{txn.email !== '-' ? ` (${txn.email})` : ''}</td></tr>
                <tr><td>Service</td><td>{txn.sourceLabel}{txn.oppTitle ? ` - ${txn.oppTitle}` : ''}</td></tr>
                <tr><td>Amount</td><td><strong>${txn.amount.toFixed(2)} USD</strong></td></tr>
                <tr><td>Paid via</td><td>{GATEWAY_NAMES[txn.gateway] ?? txn.gateway}</td></tr>
                {txn.gatewayPaymentId && (
                  <tr><td>Transaction ID</td><td className="rc-mono">{txn.gatewayPaymentId}</td></tr>
                )}
                <tr><td>Date</td><td>{txn.date}</td></tr>
              </tbody>
            </table>
            <div className="rc-footer">
              OppDate. This is an official payment receipt.<br />
              For queries, contact support@oppdate.com
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

function DetailPanel({ txnId, txns, role, onClose, onRefund, refundPending }: { txnId: string | null; txns: Txn[]; role: Role; onClose: () => void; onRefund: (id: string) => void; refundPending: boolean }) {

  const t = txnId ? txns.find(x => x.id === txnId) : null

  useEffect(() => {
    if (!txnId) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [txnId, onClose])

  if (!t) {
    return (
      <>
        <div className={`adm-qv-backdrop${txnId ? ' show' : ''}`} onClick={onClose} />
        <div className={`adm-qv${txnId ? ' show' : ''}`} />
      </>
    )
  }

  const gwClass = `adm-pay-gwb-${t.gateway}`
  const gatewayRef = t.gatewayPaymentId || t.id

  const serviceBlock = (
    <div className="adm-qv-block">
      <div className="adm-qb-h">Service</div>
      <span className={`adm-pay-srcbadge adm-pay-src-${t.source}`}>{t.sourceLabel}</span>
      {t.oppTitle && <div className="adm-pay-txnsrcsub" style={{ marginTop: 6 }}>{t.oppTitle}</div>}
      {t.stage && STAGE_META[t.stage] && (
        <span className="adm-pay-stagebadge" style={{ background: STAGE_META[t.stage].color + '22', color: STAGE_META[t.stage].color, marginTop: 8, display: 'inline-block' }}>
          {STAGE_META[t.stage].label}
        </span>
      )}
    </div>
  )

  const gwDashUrl = GATEWAYS[t.gateway]?.dashboardUrl ?? '#'
  const refundBlock = (() => {
    if (t.status === 'refunded') {
      return (
        <div className="adm-qv-block">
          <div className="adm-pay-refundrecord">
            This transaction has been marked as refunded.
          </div>
        </div>
      )
    }
    if (t.status === 'succeeded' && role === 'founder') {
      return (
        <div className="adm-pay-refundsection">
          <h4>Refund this payment</h4>
          <div className="adm-pay-refundwarn" style={{ marginBottom: 12 }}>
            Refunds must be initiated directly in the gateway dashboard. Once processed there, mark it here to keep records in sync.
          </div>
          <a
            href={gwDashUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="adm-pay-gwdash-btn"
          >
            Open {gwName(t.gateway)} dashboard <ArrowRight size={13} />
          </a>
          <div className="adm-pay-refund-divider">Then mark as refunded below</div>
          <button
            className="adm-pay-btndanger"
            disabled={refundPending}
            onClick={() => { if (confirm('Mark this payment as refunded? Only do this after processing the refund in the gateway dashboard.')) onRefund(t.rawId) }}
          >
            {refundPending ? 'Saving...' : 'Mark as refunded'}
          </button>
        </div>
      )
    }
    return null
  })()

  return (
    <>
      <div className={`adm-qv-backdrop${txnId ? ' show' : ''}`} onClick={onClose} />
      <div className={`adm-qv${txnId ? ' show' : ''}`}>
        <div className="adm-qv-head">
          <button className="adm-qv-close" onClick={onClose}><X size={17} /></button>
          <div className="adm-qv-title" style={{ fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{t.id}</div>
          <div className="adm-qv-badges" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`adm-pay-status adm-pay-ps-${t.status}`}>{t.status[0].toUpperCase() + t.status.slice(1)}</span>
            <span className={`adm-pay-gwbadge ${gwClass}`}>{gwName(t.gateway)}</span>
          </div>
        </div>
        <div className="adm-qv-body">
          <div className="adm-qv-block adm-pay-txdsummary">
            <div className="adm-pay-txdamount">${t.amount.toFixed(2)}</div>
            <div className="adm-pay-txndate" style={{ marginTop: 4 }}>{t.date}</div>
          </div>
          <div className="adm-qv-block adm-pay-txduser">
            <span className="adm-pay-txduserav" style={{ overflow: 'hidden', padding: 0, flexShrink: 0 }}>
              {t.avatarUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={t.avatarUrl} alt={t.initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; if (e.currentTarget.parentElement) e.currentTarget.parentElement.textContent = t.initials }} />
                : t.initials}
            </span>
            <div>
              <div className="adm-pay-txdusername">{t.user}</div>
              {t.email !== '-' && <div className="adm-pay-txduseremail">{t.email}</div>}
            </div>
          </div>
          {serviceBlock}
          <div className="adm-qv-block">
            <div className="adm-qb-h">Payment details</div>
            <div className="adm-pay-txdtechrow">
              <span className="k">Gateway reference</span>
              <span className="v">
                {gatewayRef}
                <span className="adm-pay-txdcopyico" onClick={(e) => flashCopied(gatewayRef, e.currentTarget)}><Copy size={11} /></span>
              </span>
            </div>
            <div className="adm-pay-txdtechrow"><span className="k">Currency</span><span className="v">USD</span></div>
          </div>
          {refundBlock}
        </div>
      </div>
    </>
  )
}

function GatewayDetail({ gwKey, onBack }: { gwKey: string; onBack: () => void }) {
  const g = GATEWAYS[gwKey]
  const isLemonSqueezy = gwKey === 'lemon_squeezy'
  const webhookUrl = `https://api.oppdate.com/webhooks/${gwKey}`

  return (
    <div className="adm-pay-gwdwrap">
      <span className="adm-pay-gwdback" onClick={onBack}>
        <ChevronLeft size={14} />
        <span>Back to transactions</span>
      </span>

      <div className="adm-pay-gwdcard">
        <div className="adm-pay-gwdconn">
          <div>
            <div className="adm-pay-gwdconnname">{g.name}</div>
            <div className="adm-pay-gwdconnmeta">{g.sub}</div>
            {isLemonSqueezy && <div style={{ fontSize: '11px', color: 'var(--adm-t-low)', fontStyle: 'italic', marginTop: 4 }}>eBook payments, merchant of record</div>}
          </div>
        </div>
      </div>

      <div className="adm-pay-gwdcard">
        <div className="adm-pay-gwdpayoutrow" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <span>Webhook endpoint URL</span>
          <span className="v" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {webhookUrl}
            <span className="adm-pay-txdcopyico" onClick={(e) => flashCopied(webhookUrl, e.currentTarget)}><Copy size={11} /></span>
          </span>
        </div>
        <a className="adm-pay-txdlink" href={g.dashboardUrl} target="_blank" rel="noopener noreferrer" style={{ marginTop: 12 }}>
          Manage in {g.name} dashboard <ArrowRight size={12} />
        </a>
      </div>

      <div className="adm-pay-gwdcard">
        <div style={{ background: 'rgba(99,99,99,0.08)', borderRadius: 10, padding: '14px 16px', color: 'var(--adm-t-low)', fontSize: '12.5px', lineHeight: 1.6 }}>
          Gateway configuration is managed in the platform settings.
        </div>
      </div>
    </div>
  )
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

function PaymentsSkeleton() {
  return (
    <>
      <div className="adm-page-head">
        <div><div className="adm-skel adm-skel-line w25" style={{ height: 24, marginBottom: 8 }} /><div className="adm-skel adm-skel-line w15" style={{ height: 13 }} /></div>
        <div style={{ display: 'flex', gap: 10 }}><div className="adm-skel adm-skel-pill" /><div className="adm-skel adm-skel-pill" /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, margin: '20px 0' }}>
        {[0, 1, 2, 3].map(i => <div key={i} className="adm-skel" style={{ height: 88, borderRadius: 12 }} />)}
      </div>
      <div className="adm-skeleton-table">
        <div className="adm-skeleton-filter">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="adm-skel adm-skel-pill" />)}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="adm-skeleton-row">
            <div className="adm-skel adm-skel-line w10" style={{ height: 14 }} />
            <div className="adm-skel-block">
              <div className="adm-skel adm-skel-line w60" style={{ height: 14 }} />
              <div className="adm-skel adm-skel-line w40" style={{ height: 10 }} />
            </div>
            <div className="adm-skel adm-skel-badge" />
            <div className="adm-skel adm-skel-line w15" style={{ height: 14 }} />
          </div>
        ))}
      </div>
    </>
  )
}

function PayEmptyState({ hasFilters, hasTxns, onClear }: { hasFilters: boolean; hasTxns: boolean; onClear: () => void }) {
  if (!hasTxns && !hasFilters) {
    return (
      <div className="adm-pay-empty">
        <div className="adm-pay-emptyico"><CreditCard size={36} /></div>
        <h2>No payments yet</h2>
        <p>Transactions will appear here once users complete payments through any connected gateway.</p>
      </div>
    )
  }
  if (hasFilters) {
    return (
      <div className="adm-pay-empty">
        <div className="adm-pay-emptyico"><Search size={36} /></div>
        <h2>No results for this filter</h2>
        <p>No transactions match the current status, source, or search query.</p>
        <button className="adm-btn adm-btn-ghost adm-pay-empty-clear" onClick={onClear}>Clear all filters</button>
      </div>
    )
  }
  return (
    <div className="adm-pay-empty">
      <div className="adm-pay-emptyico"><Search size={36} /></div>
      <h2>No transactions found</h2>
      <p>No payment records exist for the selected period.</p>
    </div>
  )
}

export function AdminPaymentsPage() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'table' | 'gateway'>('table')
  const [activeGw, setActiveGw] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [detailTxn, setDetailTxn] = useState<string | null>(null)
  const [receiptTxnId, setReceiptTxnId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const role: Role = 'founder'

  const isMobile = useIsMobile()
  const [mobileView, setMobileView] = useState<'list' | 'detail' | 'gateway'>('list')
  const [mobileDetailTxn, setMobileDetailTxn] = useState<string | null>(null)
  const [mobileGwKey, setMobileGwKey] = useState<string | null>(null)
  const [sourceSheetOpen, setSourceSheetOpen] = useState(false)
  const [mobileOverflowOpen, setMobileOverflowOpen] = useState(false)
  const [refundStep, setRefundStep] = useState<1 | 2>(1)

  const mobMenuRef = useRef<HTMLDivElement>(null)

  const { data: paymentsData, isLoading } = useQuery<ApiPaymentsResponse>({
    queryKey: ['admin', 'payments', statusFilter, sourceFilter, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 50 }
      if (statusFilter !== 'all') params.status = statusFilter
      if (sourceFilter !== 'all') params.purpose = sourceFilter
      const res = await api.get('/api/v1/admin/payments', { params })
      return res.data.data
    },
  })

  const refundMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/admin/payments/${id}/refund`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] })
      setDetailTxn(null)
    },
  })

  const txns: Txn[] = (paymentsData?.payments ?? []).map(apiToTxn)

  // Client-side search filter (server already filters by status/purpose)
  const filtered = txns.filter(t => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      t.user.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      (t.oppTitle?.toLowerCase().includes(q) ?? false)
    )
  })

  const handleConfigure = useCallback((gw: string) => {
    setView('gateway')
    setActiveGw(gw)
  }, [])

  const handleBackToTable = useCallback(() => {
    setView('table')
    setActiveGw(null)
  }, [])

  const handleRefund = useCallback((id: string) => {
    refundMutation.mutate(id)
  }, [refundMutation])

  const handleCloseDetail = useCallback(() => setDetailTxn(null), [])
  const handleDownload = useCallback((id: string) => setReceiptTxnId(id), [])

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const mobileOpenDetail = useCallback((txnId: string) => {
    setMobileDetailTxn(txnId)
    setMobileView('detail')
    setRefundStep(1)
    setMobileOverflowOpen(false)
  }, [])

  const mobileBackToList = useCallback(() => {
    setMobileView('list')
    setMobileDetailTxn(null)
    setMobileGwKey(null)
    setMobileOverflowOpen(false)
  }, [])

  const mobileOpenGateway = useCallback((gwKey: string) => {
    setMobileGwKey(gwKey)
    setMobileView('gateway')
  }, [])

  const mobileBackFromGateway = useCallback(() => {
    setMobileView('list')
    setMobileGwKey(null)
  }, [])

  const handleMobileRefund = useCallback((id: string) => {
    refundMutation.mutate(id)
    setRefundStep(1)
    mobileBackToList()
  }, [refundMutation, mobileBackToList])

  useEffect(() => {
    if (!mobileOverflowOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (mobMenuRef.current && !mobMenuRef.current.contains(e.target as Node)) {
        setMobileOverflowOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mobileOverflowOpen])

  if (isLoading) return <PaymentsSkeleton />

  /* ── MOBILE: GATEWAY DETAIL ── */
  if (isMobile && mobileView === 'gateway' && mobileGwKey) {
    const g = GATEWAYS[mobileGwKey]
    const isLemonSqueezy = mobileGwKey === 'lemon_squeezy'
    const webhookUrl = `https://api.oppdate.com/webhooks/${mobileGwKey}`
    return (
      <div className="adm-mob-pay-gwdetail">
        <div className="adm-mob-pay-detail-head">
          <button className="adm-mob-pay-back" onClick={mobileBackFromGateway}><ArrowLeft size={18} /></button>
          <span className="adm-mob-pay-detail-title">{g.name}</span>
        </div>
        <div className="adm-mob-pay-detail-body">
          <div className="adm-mob-pay-card">
            <div className="adm-mob-pay-conn">
              <div style={{ flex: '1 1 0', minWidth: 0 }}>
                <div className="adm-pay-gwdconnname">{g.name}</div>
                <div className="adm-pay-gwdconnmeta">{g.sub}</div>
                {isLemonSqueezy && <div style={{ fontSize: '11px', color: 'var(--adm-t-low)', fontStyle: 'italic', marginTop: 4 }}>eBook payments, merchant of record</div>}
              </div>
            </div>
          </div>

          <div className="adm-mob-pay-card">
            <div className="adm-qb-h">Webhook endpoint</div>
            <div className="adm-mob-pay-webhook-url">
              <span className="adm-mob-pay-url-text">{webhookUrl}</span>
              <span className="adm-pay-txdcopyico" onClick={(e) => flashCopied(webhookUrl, e.currentTarget)}><Copy size={11} /></span>
            </div>
            <a className="adm-pay-txdlink" href={g.dashboardUrl} target="_blank" rel="noopener noreferrer" style={{ marginTop: 12 }}>
              Manage in {g.name} dashboard <ArrowRight size={12} />
            </a>
          </div>

          <div className="adm-mob-pay-card">
            <div style={{ background: 'rgba(99,99,99,0.08)', borderRadius: 10, padding: '14px 16px', color: 'var(--adm-t-low)', fontSize: '12.5px', lineHeight: 1.6 }}>
              Gateway configuration is managed in the platform settings.
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── MOBILE: TRANSACTION DETAIL ── */
  if (isMobile && mobileView === 'detail' && mobileDetailTxn) {
    const t = txns.find(x => x.id === mobileDetailTxn)
    if (!t) { mobileBackToList(); return null }
    const gatewayRef = t.gatewayPaymentId || t.id
    const gwClass = `adm-pay-gwb-${t.gateway}`

    return (
      <div className="adm-mob-pay-detail">
        <div className="adm-mob-pay-detail-head">
          <button className="adm-mob-pay-back" onClick={mobileBackToList}><ArrowLeft size={18} /></button>
          <span className="adm-mob-pay-detail-title">Transaction</span>
          <div className="adm-mob-pay-overflow" ref={mobMenuRef}>
            <button className="adm-mob-pay-menubtn" onClick={() => setMobileOverflowOpen(!mobileOverflowOpen)}><MoreVertical size={18} /></button>
            {mobileOverflowOpen && (
              <div className="adm-mob-pay-menudrop">
                <button className="adm-mob-pay-menuitem" onClick={() => { flashCopied(t.id, document.body); setMobileOverflowOpen(false) }}><Copy size={14} /> Copy ID</button>
                <button className="adm-mob-pay-menuitem" onClick={() => { setMobileOverflowOpen(false); setReceiptTxnId(t.id) }}><Download size={14} /> Download receipt</button>
              </div>
            )}
          </div>
        </div>

        <div className="adm-mob-pay-detail-body">
          {/* Amount hero */}
          <div className="adm-mob-pay-hero">
            <div className="adm-mob-pay-hero-amount">${t.amount.toFixed(2)}</div>
            <span className={`adm-pay-status adm-pay-ps-${t.status}`}>
              {t.status[0].toUpperCase() + t.status.slice(1)}
            </span>
            <div className="adm-mob-pay-hero-date">{t.date}</div>
          </div>

          {/* Transaction summary */}
          <div className="adm-mob-pay-card">
            <div className="adm-qb-h">Transaction summary</div>
            <div className="adm-pay-txdline"><span>Amount</span><span>${t.amount.toFixed(2)}</span></div>
            <div className="adm-pay-txdline"><span>Currency</span><span>USD</span></div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`adm-pay-gwbadge ${gwClass}`}>{gwName(t.gateway)}</span>
            </div>
          </div>

          {/* User */}
          <div className="adm-mob-pay-card">
            <div className="adm-mob-pay-userblock">
              <span className="adm-pay-txduserav" style={{ overflow: 'hidden', padding: 0, flexShrink: 0 }}>
                {t.avatarUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={t.avatarUrl} alt={t.initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; if (e.currentTarget.parentElement) e.currentTarget.parentElement.textContent = t.initials }} />
                  : t.initials}
              </span>
              <div>
                <div className="adm-pay-txdusername">{t.user}</div>
                {t.email !== '-' && <div className="adm-pay-txduseremail">{t.email}</div>}
              </div>
            </div>
          </div>

          {/* Service details */}
          <div className="adm-mob-pay-card">
            <div className="adm-qb-h">Service</div>
            <span className={`adm-pay-srcbadge adm-pay-src-${t.source}`}>{t.sourceLabel}</span>
            {t.oppTitle && <div className="adm-pay-txnsrcsub" style={{ marginTop: 6 }}>{t.oppTitle}</div>}
            {t.stage && STAGE_META[t.stage] && (
              <span className="adm-pay-stagebadge" style={{ background: STAGE_META[t.stage].color + '22', color: STAGE_META[t.stage].color, marginTop: 8, display: 'inline-block' }}>
                {STAGE_META[t.stage].label}
              </span>
            )}
          </div>

          {/* Payment details */}
          <div className="adm-mob-pay-card">
            <div className="adm-qb-h">Payment details</div>
            <div className="adm-pay-txdtechrow">
              <span className="k">Gateway reference</span>
              <span className="v">
                {gatewayRef}
                <span className="adm-pay-txdcopyico" onClick={(e) => flashCopied(gatewayRef, e.currentTarget)}><Copy size={11} /></span>
              </span>
            </div>
            <div className="adm-pay-txdtechrow"><span className="k">Payment method</span><span className="v">-</span></div>
            <div className="adm-pay-txdtechrow"><span className="k">Currency</span><span className="v">USD</span></div>
          </div>

          {/* Refund record */}
          {t.status === 'refunded' && (
            <div className="adm-mob-pay-card">
              <div className="adm-pay-refundrecord">
                This transaction has been refunded.
              </div>
            </div>
          )}

          {/* Refund */}
          {t.status === 'succeeded' && role === 'founder' && (
            <div className="adm-mob-pay-card adm-mob-pay-refund-section">
              <h4>Refund this payment</h4>
              <p style={{ fontSize: 12.5, color: 'var(--adm-t-low)', lineHeight: 1.6, margin: '4px 0 12px' }}>
                Initiate the refund in the gateway dashboard first, then mark it here to keep records in sync.
              </p>
              <a
                href={GATEWAYS[t.gateway]?.dashboardUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="adm-pay-gwdash-btn"
                style={{ display: 'flex', marginBottom: 12 }}
              >
                Open {gwName(t.gateway)} dashboard <ArrowRight size={13} />
              </a>
              <button
                className="adm-mob-pay-btn-danger"
                disabled={refundMutation.isPending}
                onClick={() => setRefundStep(2)}
              >
                Mark as refunded
              </button>
            </div>
          )}
        </div>

        {/* Mark refunded confirmation sheet */}
        {refundStep === 2 && t.status === 'succeeded' && createPortal(
          <>
            <div className="adm-bsheet-backdrop show" onClick={() => setRefundStep(1)} />
            <div className="adm-mob-pay-refund-sheet show">
              <div className="adm-bsheet-handle" />
              <div className="adm-mob-pay-refund-sheet-body">
                <div className="adm-mob-pay-refund-summary">
                  <h3>Mark as refunded?</h3>
                  <div className="adm-mob-pay-refund-hero">${t.amount.toFixed(2)}</div>
                  <div className="adm-mob-pay-refund-to">{t.email !== '-' ? t.email : t.user}</div>
                </div>
                <div className="adm-mob-pay-refund-warning">
                  <AlertTriangle size={16} />
                  <span>Only do this after the refund has been processed in the {gwName(t.gateway)} dashboard. This updates OppDate records only.</span>
                </div>
                <div className="adm-mob-pay-refund-actions">
                  <button className="adm-btn adm-btn-ghost" style={{ flex: 1, minHeight: 48, justifyContent: 'center' }} onClick={() => setRefundStep(1)}>Cancel</button>
                  <button className="adm-mob-pay-btn-danger" disabled={refundMutation.isPending} onClick={() => handleMobileRefund(t.rawId)}>
                    {refundMutation.isPending ? 'Saving...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
      {receiptTxnId && (() => { const rt = txns.find(x => x.id === receiptTxnId); return rt ? <ReceiptPrintModal txn={rt} onClose={() => setReceiptTxnId(null)} /> : null })()}
      </div>
    )
  }

  /* ── MOBILE: LIST VIEW ── */
  if (isMobile) {
    return (
      <div className="adm-mob-pay-list">
        <div className="adm-mob-pay-head">
          <div>
            <h1>Payments</h1>
            <span className="adm-pay-headsub">All transactions</span>
          </div>
          <button className="adm-mob-pay-menubtn" onClick={() => {}}><Download size={18} /></button>
        </div>

        {/* Gateway horizontal scroll */}
        <div className="adm-mob-pay-gw-scroll">
          <div className="adm-mob-pay-gw-track">
            {GW_ORDER.map((g, i) => {
              const gw = GATEWAYS[g.key]
              const canConfigure = role === 'founder'
              return (
                <div
                  key={g.key}
                  className="adm-mob-pay-gwcard"
                  style={{ animationDelay: `${i * 60}ms` }}
                  onClick={canConfigure ? () => mobileOpenGateway(g.key) : undefined}
                >
                  <div className="adm-mob-pay-gwtop">
                    <div>
                      <div className="adm-pay-gwname">{gw.name}</div>
                      <div className="adm-pay-gwsub">{gw.sub}</div>
                    </div>
                  </div>
                  <div className="adm-mob-pay-gwbot">
                    <div className="adm-pay-gwcount" style={{ fontSize: 11, color: 'var(--adm-t-low)' }}>Managed in platform settings</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="adm-mob-pay-filters">
          <div className="adm-pay-search adm-mob-pay-search">
            <Search size={15} />
            <input
              placeholder="Search by user, ID, or opportunity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="adm-mob-pay-pills-scroll">
            <div className="adm-mob-pay-pills">
              {STATUS_PILLS.map(p => {
                const cnt = p.key === 'all' ? txns.length : txns.filter(t => t.status === p.key).length
                return (
                  <button
                    key={p.key}
                    className={`adm-pay-pill${statusFilter === p.key ? ' active' : ''}`}
                    onClick={() => { setStatusFilter(p.key); setPage(1) }}
                  >
                    {p.label}<span className="adm-pay-pcount">{cnt}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="adm-mob-pay-source-row">
            <button className="adm-mob-pay-source-btn" onClick={() => setSourceSheetOpen(true)}>
              <SlidersHorizontal size={14} />
              {sourceFilter === 'all' ? 'All sources' : SOURCE_LABELS[sourceFilter]}
              <ChevronDown size={12} />
            </button>
            <span className="adm-mob-pay-txncount">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Revenue bar */}
        {(() => {
          const gross = paymentsData?.revenueSummary != null
            ? paymentsData.revenueSummary.grossCents / 100
            : filtered.reduce((a, t) => a + t.amount, 0)
          return (
            <div className="adm-mob-pay-revbar">
              {paymentsData?.revenueSummary != null
                ? `Gross $${gross.toFixed(2)} \u00b7 ${paymentsData.revenueSummary.transactionCount} transactions`
                : `Gross $${gross.toFixed(2)}`}
            </div>
          )
        })()}

        {/* Transaction cards */}
        <div className="adm-mob-pay-txns">
          {filtered.length === 0 ? (
            <PayEmptyState
              hasFilters={statusFilter !== 'all' || sourceFilter !== 'all' || !!searchQuery}
              hasTxns={txns.length > 0}
              onClear={() => { setStatusFilter('all'); setSourceFilter('all'); setSearchQuery('') }}
            />
          ) : (
            filtered.map((t, idx) => (
              <div
                key={t.id}
                className={`adm-mob-pay-txncard${t.status === 'failed' ? ' failed' : ''}`}
                style={{ animationDelay: `${idx * 35}ms` }}
                onClick={() => mobileOpenDetail(t.id)}
              >
                <div className="adm-mob-pay-txnleft">
                  <span className="adm-pay-txnav">{t.initials}</span>
                </div>
                <div className="adm-mob-pay-txncenter">
                  <div className="adm-mob-pay-txnname">{t.user}</div>
                  <div className="adm-mob-pay-txnsrc">{t.sourceLabel}</div>
                  <div className="adm-mob-pay-txnbadges">
                    <span className={`adm-pay-gwbadge adm-pay-gwb-${t.gateway}`}>{gwName(t.gateway)}</span>
                    <span className={`adm-pay-status adm-pay-ps-${t.status}`}>
                      {t.status[0].toUpperCase() + t.status.slice(1)}
                    </span>
                  </div>
                  <div className="adm-mob-pay-txnid">{t.id}</div>
                </div>
                <div className="adm-mob-pay-txnright">
                  <div className="adm-mob-pay-txnamt">${t.amount.toFixed(2)}</div>
                  <div className="adm-mob-pay-txndate">{t.date.split(',')[0]}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Source filter bottom sheet */}
        {sourceSheetOpen && createPortal(
          <>
            <div className="adm-bsheet-backdrop show" onClick={() => setSourceSheetOpen(false)} />
            <div className="adm-bsheet show">
              <div className="adm-bsheet-handle" />
              <div className="adm-bsheet-head">
                <h3>Filter by source</h3>
                <button className="adm-iconbtn" onClick={() => setSourceSheetOpen(false)}><X size={18} /></button>
              </div>
              <div className="adm-bsheet-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SOURCE_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      className={`adm-pay-pill${sourceFilter === o.value ? ' active' : ''}`}
                      onClick={() => { setSourceFilter(o.value as SourceFilter); setSourceSheetOpen(false); setPage(1) }}
                      style={{ justifyContent: 'flex-start', width: '100%', minHeight: 44 }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="adm-bsheet-foot">
                <button className="adm-btn adm-btn-ghost" onClick={() => { setSourceFilter('all'); setSourceSheetOpen(false); setPage(1) }}>Clear</button>
                <button className="adm-btn adm-btn-primary" onClick={() => setSourceSheetOpen(false)}>Done</button>
              </div>
            </div>
          </>,
          document.body
        )}
      </div>
    )
  }

  /* ── DESKTOP (existing layout, unchanged) ── */
  return (
    <div className="adm-pay-wrap">
      <div className="adm-pay-head">
        <div>
          <h1>Payments</h1>
          <span className="adm-pay-headsub">All transactions</span>
        </div>
        <div className="adm-pay-headactions">
          <button className="adm-btn adm-btn-ghost" onClick={() => exportCsv(filtered)}>Export report</button>
        </div>
      </div>

      <div className="adm-pay-content">
        <GatewayStrip activeGw={activeGw} role={role} onConfigure={handleConfigure} />

        {view === 'gateway' && activeGw ? (
          <GatewayDetail gwKey={activeGw} onBack={handleBackToTable} />
        ) : (
          <div id="txn-table">
            <div className="adm-pay-filterbar">
              <div className="adm-pay-filtertop">
                <div className="adm-pay-search">
                  <Search size={15} />
                  <input
                    placeholder="Search by user, transaction ID, or opportunity..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="adm-pay-filterright" style={{ minWidth: 200 }}>
                  <CustomSelect
                    value={sourceFilter}
                    options={SOURCE_OPTIONS}
                    placeholder="All sources"
                    onChange={(v) => { setSourceFilter(v as SourceFilter); setPage(1) }}
                  />
                </div>
              </div>
              <div className="adm-pay-filtertop">
                {STATUS_PILLS.map(p => {
                  const cnt = p.key === 'all' ? txns.length : txns.filter(t => t.status === p.key).length
                  return (
                    <button
                      key={p.key}
                      className={`adm-pay-pill${statusFilter === p.key ? ' active' : ''}`}
                      onClick={() => { setStatusFilter(p.key); setPage(1) }}
                    >
                      {p.label}<span className="adm-pay-pcount">{cnt}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <RevenueBar txns={filtered} statusFilter={statusFilter} revenueSummary={paymentsData?.revenueSummary} />

            {filtered.length === 0 ? (
              <PayEmptyState
                hasFilters={statusFilter !== 'all' || sourceFilter !== 'all' || !!searchQuery}
                hasTxns={txns.length > 0}
                onClear={() => { setStatusFilter('all'); setSourceFilter('all'); setSearchQuery('') }}
              />
            ) : (
              <div className="adm-pay-tablewrap">
                <table className="adm-pay-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }} />
                      <th>Reference</th>
                      <th>User</th>
                      <th>Service</th>
                      <th>Gateway</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th style={{ width: 80 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(t => (
                      <TxnRow key={t.id} t={t} role={role} checked={selected.has(t.id)} onToggle={toggleSelect} onSelect={setDetailTxn} onRefundClick={(id) => { setDetailTxn(id) }} onDownload={handleDownload} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {paymentsData?.hasMore && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                <button className="adm-btn adm-btn-ghost" onClick={() => setPage(p => p + 1)}>
                  Load more
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <DetailPanel txnId={detailTxn} txns={txns} role={role} onClose={handleCloseDetail} onRefund={handleRefund} refundPending={refundMutation.isPending} />
      {receiptTxnId && (() => { const t = txns.find(x => x.id === receiptTxnId); return t ? <ReceiptPrintModal txn={t} onClose={() => setReceiptTxnId(null)} /> : null })()}
    </div>
  )
}
