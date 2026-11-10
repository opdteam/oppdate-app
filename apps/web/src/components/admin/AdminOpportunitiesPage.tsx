'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, extractApiError } from '@/lib/api'
import {
  Plus, Search, Upload, Archive, Edit3, ExternalLink, Trash2,
  Check, ChevronLeft, ChevronRight, ChevronDown, X, AlertTriangle,
  AlertOctagon, FileText, FilePlus, GripVertical, Lock, Eye,
  Sparkles, Bold, Italic, List, Heading, Link2, Clock, Calendar,
  ArrowRight, CheckCircle, Gift, MoreVertical, Filter,
  BarChart2, Bookmark, TrendingUp,
} from 'lucide-react'

type OppStatus = 'published' | 'draft' | 'archived' | 'expired'
type ComplianceCat = 'A' | 'B'
type UserRole = 'founder' | 'manager' | 'staff'

interface Listing {
  id: string
  title: string
  inst: string
  flag: string
  country: string
  type: string
  cat: ComplianceCat
  code: string
  deadline: string
  time: string
  daysLeft: number
  oppFee: number
  instFee: number
  views: number
  saves: number
  apps: number
  inProgress: number
  submitted: number
  vip: boolean
  applyDisabledNote: string
  status: OppStatus
  featured: boolean
}

interface DocRow {
  type: string
  required: boolean
  formats: string[]
  creatable: 'writes' | 'guides' | false
}

interface KeyDate {
  label: string
  date: string
}

interface EligCriterion {
  question: string
  options: { text: string; score: number }[]
  weightRationale?: string
}

interface FormData {
  editing: boolean
  title: string
  inst: string
  country: string
  type: string
  summary: string
  about: string
  whoItIsFor: string
  benefit: string
  cat: ComplianceCat | ''
  code: string
  oppFee: string
  instFee: string
  vip: boolean
  applyDisabledNote: string
  status: OppStatus
  featured: boolean
  criteria: EligCriterion[]
  docs: DocRow[]
  dates: KeyDate[]
  funding: string[]
  aiQuestions: { q: string; required: boolean }[]
  internalNote: string
  institutionLogoUrl: string
}

const TYPES = ['Scholarship', 'Internship', 'Job', 'Fellowship', 'Training', 'Research Grant']
const FUND_OPTIONS = ['Fully funded', 'Partially funded', 'Stipend', 'Travel included', 'Accommodation', 'Health insurance']
const FORMAT_OPTIONS = ['PDF', 'DOCX', 'JPG', 'PNG']
const TZ_OPTIONS = ['GMT', 'EST', 'WAT', 'CET', 'CST', 'PST', 'SAST', 'WET']
const STATUS_LABEL: Record<OppStatus, string> = { published: 'Published', draft: 'Draft', archived: 'Archived', expired: 'Expired' }
const CAT_INFO: Record<ComplianceCat, { short: string; desc: string }> = {
  A: { short: 'Cat.A', desc: 'Institution permits representative submission; OppDate submits directly on behalf of the user.' },
  B: { short: 'Cat.B', desc: 'Applicant must complete final submission; OppDate prepares the full package; the user submits.' },
}

// ---- API TYPES + ADAPTER ----

interface ApiOpportunity {
  id: string
  title: string
  slug: string
  type: string
  status: string
  institution: string
  institutionCode: string | null
  country: string
  region: string
  complianceCategory: 'A' | 'B' | null
  deadline: string
  oppdateServiceFeeUsd: number
  institutionFeeUsd: number
  oppDateApply: boolean
  applyDisabledNote: string | null
  featured: boolean
  pinned: boolean
  summary: string
  description: string
  whoItsFor: string
  whatIsOffered: string
  eligibilityCriteria: unknown[]
  requiredDocuments: unknown[]
  tags: string[]
  institutionLogoUrl: string | null
  createdAt: string
  updatedAt: string
  viewCount: number
  saveCount: number
  appCount: number
  inProgressCount: number
  submittedCount: number
}

const TYPE_LABEL: Record<string, string> = {
  internship: 'Internship', scholarship: 'Scholarship', training_bootcamp: 'Training',
  entry_level_job: 'Job', fellowship: 'Fellowship', grant: 'Research Grant',
  volunteering: 'Volunteering', competition: 'Competition', relocation: 'Relocation',
}

const COUNTRY_FLAG: Record<string, string> = {
  'United Kingdom': '\u{1F1EC}\u{1F1E7}', 'Canada': '\u{1F1E8}\u{1F1E6}',
  'United States': '\u{1F1FA}\u{1F1F8}', 'Germany': '\u{1F1E9}\u{1F1EA}',
  'China': '\u{1F1E8}\u{1F1F3}', 'South Africa': '\u{1F1FF}\u{1F1E6}',
  'Portugal': '\u{1F1F5}\u{1F1F9}', 'France': '\u{1F1EB}\u{1F1F7}',
  'Australia': '\u{1F1E6}\u{1F1FA}', 'Nigeria': '\u{1F1F3}\u{1F1EC}',
  'Kenya': '\u{1F1F0}\u{1F1EA}', 'Ghana': '\u{1F1EC}\u{1F1ED}',
  'India': '\u{1F1EE}\u{1F1F3}', 'Brazil': '\u{1F1E7}\u{1F1F7}',
  'Netherlands': '\u{1F1F3}\u{1F1F1}', 'Sweden': '\u{1F1F8}\u{1F1EA}',
}

function daysLeft(deadline: string): number {
  const diff = new Date(deadline).getTime() - Date.now()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function fmtDeadlineDate(deadline: string): string {
  return new Date(deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDeadlineTime(deadline: string): string {
  return new Date(deadline).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' UTC'
}

function apiToListing(o: ApiOpportunity): Listing {
  return {
    id: o.id,
    title: o.title,
    inst: o.institution,
    flag: COUNTRY_FLAG[o.country] || '\u{1F310}',
    country: o.country,
    type: TYPE_LABEL[o.type] || o.type,
    cat: o.complianceCategory || 'B',
    code: o.institutionCode || '',
    deadline: fmtDeadlineDate(o.deadline),
    time: fmtDeadlineTime(o.deadline),
    daysLeft: daysLeft(o.deadline),
    oppFee: o.oppdateServiceFeeUsd / 100,
    instFee: o.institutionFeeUsd / 100,
    views: o.viewCount ?? 0,
    saves: o.saveCount ?? 0,
    apps: o.appCount,
    inProgress: o.inProgressCount,
    submitted: o.submittedCount,
    vip: o.oppDateApply,
    applyDisabledNote: o.applyDisabledNote || '',
    status: o.status as OppStatus,
    featured: o.featured,
  }
}

const LISTINGS: Listing[] = [
  { id: 'l1', title: 'Chevening Scholarship 2026', inst: 'UK Government', flag: '\u{1F1EC}\u{1F1E7}', country: 'United Kingdom', type: 'Scholarship', cat: 'A', code: 'CHV', deadline: '15 Jul 2026', time: '23:59 GMT', daysLeft: 22, oppFee: 240, instFee: 0, views: 142, saves: 31, apps: 18, inProgress: 11, submitted: 4, vip: true, applyDisabledNote: '', status: 'published', featured: true },
  { id: 'l2', title: 'Mastercard Foundation Scholars Program', inst: 'University of Toronto', flag: '\u{1F1E8}\u{1F1E6}', country: 'Canada', type: 'Scholarship', cat: 'B', code: 'MFC', deadline: '30 Jun 2026', time: '17:00 EST', daysLeft: 7, oppFee: 200, instFee: 0, views: 98, saves: 22, apps: 24, inProgress: 15, submitted: 6, vip: true, applyDisabledNote: '', status: 'published', featured: false },
  { id: 'l3', title: 'MIT Summer Research Internship', inst: 'MIT', flag: '\u{1F1FA}\u{1F1F8}', country: 'United States', type: 'Internship', cat: 'A', code: 'MIT', deadline: '12 Jul 2026', time: '23:59 EST', daysLeft: 19, oppFee: 180, instFee: 75, views: 57, saves: 12, apps: 9, inProgress: 7, submitted: 1, vip: true, applyDisabledNote: '', status: 'published', featured: false },
  { id: 'l4', title: 'DAAD Masters Scholarship', inst: 'DAAD Germany', flag: '\u{1F1E9}\u{1F1EA}', country: 'Germany', type: 'Scholarship', cat: 'B', code: 'DAD', deadline: '08 Jul 2026', time: '18:00 CET', daysLeft: 15, oppFee: 220, instFee: 0, views: 73, saves: 18, apps: 12, inProgress: 9, submitted: 2, vip: true, applyDisabledNote: '', status: 'published', featured: false },
  { id: 'l5', title: 'Google STEP Internship 2027', inst: 'Google', flag: '\u{1F1FA}\u{1F1F8}', country: 'United States', type: 'Internship', cat: 'A', code: 'GOO', deadline: '01 Aug 2026', time: '23:59 PST', daysLeft: 39, oppFee: 160, instFee: 0, views: 34, saves: 8, apps: 6, inProgress: 4, submitted: 0, vip: true, applyDisabledNote: '', status: 'draft', featured: false },
  { id: 'l6', title: 'Commonwealth Shared Scholarship', inst: 'Commonwealth Scholarship Commission', flag: '\u{1F1EC}\u{1F1E7}', country: 'United Kingdom', type: 'Scholarship', cat: 'B', code: 'COM', deadline: '05 Jul 2026', time: '12:00 GMT', daysLeft: 12, oppFee: 210, instFee: 0, views: 89, saves: 19, apps: 14, inProgress: 8, submitted: 3, vip: true, applyDisabledNote: '', status: 'published', featured: false },
  { id: 'l7', title: 'Aga Khan Foundation Grant', inst: 'Aga Khan Foundation', flag: '\u{1F1F5}\u{1F1F9}', country: 'Portugal', type: 'Research Grant', cat: 'B', code: 'AGA', deadline: '20 Jul 2026', time: '23:59 WET', daysLeft: 27, oppFee: 0, instFee: 0, views: 11, saves: 3, apps: 1, inProgress: 1, submitted: 0, vip: false, applyDisabledNote: 'The Aga Khan Foundation requires all grant applications to be submitted directly through their own portal. OppDate Apply cannot process applications for this programme.', status: 'published', featured: false },
  { id: 'l8', title: 'Ford Foundation Fellowship', inst: 'Ford Foundation', flag: '\u{1F1FA}\u{1F1F8}', country: 'United States', type: 'Fellowship', cat: 'B', code: 'FOR', deadline: '02 Jun 2026', time: '17:00 EST', daysLeft: -21, oppFee: 200, instFee: 0, views: 210, saves: 44, apps: 31, inProgress: 0, submitted: 28, vip: false, applyDisabledNote: '', status: 'expired', featured: false },
  { id: 'l9', title: 'Schwarzman Scholars', inst: 'Tsinghua University', flag: '\u{1F1E8}\u{1F1F3}', country: 'China', type: 'Fellowship', cat: 'A', code: 'SCH', deadline: '10 Jul 2026', time: '23:59 CST', daysLeft: 17, oppFee: 300, instFee: 120, views: 45, saves: 9, apps: 5, inProgress: 5, submitted: 0, vip: true, applyDisabledNote: '', status: 'published', featured: false },
  { id: 'l10', title: 'African Leadership Academy Training', inst: 'African Leadership Academy', flag: '\u{1F1FF}\u{1F1E6}', country: 'South Africa', type: 'Training', cat: 'B', code: 'ALA', deadline: '25 May 2026', time: '23:59 SAST', daysLeft: -29, oppFee: 120, instFee: 0, views: 66, saves: 15, apps: 22, inProgress: 0, submitted: 0, vip: true, applyDisabledNote: '', status: 'archived', featured: false },
  { id: 'l11', title: 'Fulbright Foreign Student Program', inst: 'US Department of State', flag: '\u{1F1FA}\u{1F1F8}', country: 'United States', type: 'Scholarship', cat: 'A', code: 'FUL', deadline: '18 Jul 2026', time: '23:59 EST', daysLeft: 25, oppFee: 260, instFee: 0, views: 117, saves: 26, apps: 16, inProgress: 12, submitted: 2, vip: true, applyDisabledNote: '', status: 'published', featured: false },
  { id: 'l12', title: 'Rhodes Scholarship', inst: 'University of Oxford', flag: '\u{1F1EC}\u{1F1E7}', country: 'United Kingdom', type: 'Scholarship', cat: 'A', code: 'RHO', deadline: '28 Jun 2026', time: '12:00 GMT', daysLeft: 5, oppFee: 300, instFee: 75, views: 94, saves: 21, apps: 8, inProgress: 6, submitted: 1, vip: true, applyDisabledNote: '', status: 'published', featured: false },
]

function apiToFormData(o: ApiOpportunity): FormData {
  const TYPE_REVERSE: Record<string, string> = {
    internship: 'Internship', scholarship: 'Scholarship', training_bootcamp: 'Training',
    entry_level_job: 'Job', fellowship: 'Fellowship', grant: 'Research Grant',
    volunteering: 'Volunteering', competition: 'Competition', relocation: 'Relocation',
  }
  const rawCriteria = Array.isArray(o.eligibilityCriteria)
    ? (o.eligibilityCriteria as { question: string; options: (string | { text: string; score: number })[]; weightRationale?: string }[]).map(c => ({
        question: c.question,
        options: c.options.map(opt =>
          typeof opt === 'string' ? { text: opt, score: 0 } : opt
        ),
        weightRationale: c.weightRationale,
      }))
    : []
  const rawDocs = Array.isArray(o.requiredDocuments) ? o.requiredDocuments : []
  return {
    editing: true,
    title: o.title,
    inst: o.institution,
    country: o.country,
    type: TYPE_REVERSE[o.type] || o.type,
    summary: o.summary || '',
    about: o.description || '',
    whoItIsFor: o.whoItsFor || '',
    benefit: o.whatIsOffered || '',
    cat: o.complianceCategory || '',
    code: o.institutionCode || '',
    oppFee: (o.oppdateServiceFeeUsd / 100).toFixed(2),
    instFee: (o.institutionFeeUsd / 100).toFixed(2),
    vip: o.oppDateApply,
    applyDisabledNote: o.applyDisabledNote || '',
    status: o.status as OppStatus,
    featured: o.featured,
    criteria: rawCriteria.length > 0 ? rawCriteria : [{ question: '', options: [{ text: 'Yes', score: 0 }, { text: 'No', score: -100 }] }],
    docs: rawDocs.length > 0
      ? rawDocs.map(d => typeof d === 'string'
          ? { type: d, required: true, formats: ['PDF'], creatable: false as const }
          : { type: (d as any).type ?? '', required: (d as any).required ?? true, formats: (d as any).formats || ['PDF'], creatable: ((d as any).creatable ?? false) as 'writes' | 'guides' | false })
      : [{ type: '', required: true, formats: ['PDF'], creatable: false as const }],
    dates: [],
    funding: Array.isArray(o.tags) ? o.tags.filter(t => FUND_OPTIONS.includes(t)) : [],
    aiQuestions: [],
    internalNote: '',
    institutionLogoUrl: o.institutionLogoUrl || '',
  }
}

function fmtFee(n: number) { return '$' + n.toFixed(2) }

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

function StatusBadge({ status, lg }: { status: OppStatus; lg?: boolean }) {
  return (
    <span className={`adm-ost adm-ost-${status}${lg ? ' lg' : ''}`}>
      <span className="adm-sdot" />
      {STATUS_LABEL[status]}
    </span>
  )
}

function CatBadge({ cat, lg }: { cat: ComplianceCat; lg?: boolean }) {
  return (
    <span className={`adm-ocat adm-ocat-${cat.toLowerCase()}${lg ? ' lg' : ''}`}>
      {CAT_INFO[cat].short}
    </span>
  )
}

function Toggle({ on, locked, onToggle }: { on: boolean; locked?: boolean; onToggle?: () => void }) {
  const [pulse, setPulse] = useState(false)
  return (
    <div
      className={`adm-toggle${on ? ' on' : ''}${locked ? ' locked' : ''}${pulse ? ' pulse' : ''}`}
      onClick={() => {
        if (locked) return
        onToggle?.()
        setPulse(true)
        setTimeout(() => setPulse(false), 500)
      }}
    >
      <div className="adm-tk" />
      {locked && <Lock className="adm-lockico" />}
    </div>
  )
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

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'deadline', label: 'Deadline soonest' },
  { value: 'apps', label: 'Most applications' },
]

function SortDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const label = SORT_OPTIONS.find(o => o.value === value)?.label || 'Newest first'

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={ref} className="adm-sort-field" style={{ position: 'relative' }}>
      <div className="adm-sort-trigger" onClick={() => setOpen(!open)}>
        <span className="adm-sort-lbl">Sort</span>
        <span className="adm-sort-val">{label}</span>
        <ChevronDown style={{ width: 14, height: 14, color: 'var(--adm-t-low)' }} />
      </div>
      {open && (
        <div className="adm-csel-drop" style={{ display: 'block', minWidth: 180 }}>
          {SORT_OPTIONS.map(o => (
            <div key={o.value} className={`adm-csel-opt${value === o.value ? ' sel-on' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false) }}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- LIST VIEW ----
function ListView({ listings, role, onNew, onEdit, onQuickView, onDelete, onArchive, onToggleApply, onBulkPublish, onBulkArchive, onBulkDelete, statusFilter, setStatusFilter, typeFilter, setTypeFilter, onViewApplications }: {
  listings: Listing[]; role: UserRole
  onNew: () => void; onEdit: (id: string) => void; onQuickView: (id: string) => void
  onDelete: (id: string) => void; onArchive: (id: string) => void; onToggleApply: (id: string, enabled: boolean) => void
  onBulkPublish: (ids: string[]) => void; onBulkArchive: (ids: string[]) => void; onBulkDelete: (ids: string[]) => void
  statusFilter: string; setStatusFilter: (v: string) => void
  typeFilter: string; setTypeFilter: (v: string) => void
  onViewApplications: (opportunityId: string) => void
}) {
  const [search, setSearch] = useState('')
  const [expSoon, setExpSoon] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState('newest')
  const [vipState, setVipState] = useState<Record<string, boolean>>({})
  const [metricsId, setMetricsId] = useState<string | null>(null)
  const metricsListing = listings.find(l => l.id === metricsId) ?? null
  // Sync vipState from listings (optimistic local override + API source of truth)
  useEffect(() => {
    setVipState(prev => {
      const m: Record<string, boolean> = {}
      listings.forEach(l => { m[l.id] = prev[l.id] ?? l.vip })
      return m
    })
  }, [listings])

  const isStaff = role === 'staff'
  const isMobile = useIsMobile()
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const activeFilterCount = (typeFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0) + (expSoon ? 1 : 0)

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { All: listings.length }
    TYPES.forEach(t => { c[t] = 0 })
    listings.forEach(l => { c[l.type] = (c[l.type] || 0) + 1 })
    return c
  }, [listings])

  const isExpired = (l: Listing) => l.status === 'expired' || (l.daysLeft < 0 && l.status === 'published')

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { All: listings.length, published: 0, draft: 0, archived: 0, expired: 0 }
    listings.forEach(l => {
      if (isExpired(l)) { c.expired++ }
      else { c[l.status] = (c[l.status] ?? 0) + 1 }
    })
    return c
  }, [listings])

  const filtered = useMemo(() => {
    let rows = [...listings]
    if (statusFilter === 'expired') rows = rows.filter(l => isExpired(l))
    else if (statusFilter !== 'all') rows = rows.filter(l => l.status === statusFilter && !isExpired(l))
    if (typeFilter !== 'all') rows = rows.filter(l => l.type === typeFilter)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(l => l.title.toLowerCase().includes(q) || l.inst.toLowerCase().includes(q) || l.type.toLowerCase().includes(q))
    }
    if (expSoon) rows = rows.filter(l => l.daysLeft >= 0 && l.daysLeft < 14)
    return rows
  }, [listings, statusFilter, typeFilter, search, expSoon])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const dlClass = (l: Listing) => l.daysLeft < 0 ? 'urgent' : l.daysLeft < 14 ? 'soon' : 'ok'
  const dlTip = (l: Listing) => {
    if (l.daysLeft >= 0) return `Auto-archive in ${l.daysLeft} day${l.daysLeft === 1 ? '' : 's'}`
    if (l.status === 'archived') return 'Deadline passed - archived'
    return 'Deadline passed'
  }

  const noResults = search && filtered.length === 0

  return (
    <>
      {/* header */}
      <div className="adm-page-head">
        <div>
          <h1>Opportunities</h1>
          <div className="adm-sub">Manage all listings</div>
        </div>
        {!isMobile ? (
          <div className="adm-head-actions">
            <button className="adm-btn adm-btn-ghost" onClick={() => window.dispatchEvent(new CustomEvent('adm-opp-action', { detail: 'csv' }))}><Upload /> Bulk CSV import</button>
            {role === 'founder' ? (
              <button className="adm-btn adm-btn-ghost" onClick={() => window.dispatchEvent(new CustomEvent('adm-opp-action', { detail: 'autoarchive' }))}><Archive /> Auto-archive settings</button>
            ) : role === 'staff' ? (
              <button className="adm-btn adm-btn-ghost" style={{ opacity: 0.5, cursor: 'not-allowed' }}><Lock /> Auto-archive settings</button>
            ) : null}
            {!isStaff && (
              <button className="adm-btn adm-btn-primary adm-lift" onClick={onNew}><Plus /> New listing</button>
            )}
          </div>
        ) : (
          <div className="adm-mob-overflow">
            <button className="adm-mob-more-btn" onClick={() => setMoreMenuOpen(!moreMenuOpen)}>
              <MoreVertical />
            </button>
            {moreMenuOpen && (
              <>
                <div className="adm-mob-overflow-backdrop" onClick={() => setMoreMenuOpen(false)} />
                <div className="adm-mob-overflow-menu">
                  <button className="adm-btn adm-btn-outline adm-btn-sm" onClick={() => { setMoreMenuOpen(false); window.dispatchEvent(new CustomEvent('adm-opp-action', { detail: 'csv' })) }}>
                    <Upload /> Bulk CSV import
                  </button>
                  {role === 'founder' ? (
                    <button className="adm-btn adm-btn-outline adm-btn-sm" onClick={() => { setMoreMenuOpen(false); window.dispatchEvent(new CustomEvent('adm-opp-action', { detail: 'autoarchive' })) }}>
                      <Archive /> Auto-archive settings
                    </button>
                  ) : role === 'staff' ? (
                    <button className="adm-btn adm-btn-outline adm-btn-sm" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                      <Lock /> Auto-archive settings
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* filter bar */}
      <div className="adm-filterbar">
        {isMobile ? (
          <>
            <div className="adm-search adm-mob-search-full">
              <Search />
              <input placeholder="Search opportunities..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="adm-mob-filter-actions">
              <button className="adm-btn adm-btn-ghost adm-btn-sm adm-mob-filter-btn" onClick={() => setFilterSheetOpen(true)}>
                <Filter /> Filters{activeFilterCount > 0 && <span className="adm-mob-filter-count">{activeFilterCount}</span>}
              </button>
              <SortDropdown value={sortBy} onChange={setSortBy} />
            </div>
          </>
        ) : (
          <>
            <div className="adm-filter-top">
              <div className="adm-search">
                <Search />
                <input placeholder="Search by title, institution, or type..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="adm-pills">
                {['All', ...TYPES].map(t => {
                  const key = t === 'All' ? 'all' : t
                  return (
                    <button key={t} className={`adm-pill${typeFilter === key ? ' active' : ''}`} onClick={() => setTypeFilter(key)}>
                      {t}<span className="adm-pcount">{typeCounts[t] || 0}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="adm-filter-row2">
              <div className="adm-pills">
                {(['all', 'published', 'draft', 'archived', 'expired'] as const).map(k => (
                  <button key={k} className={`adm-pill${statusFilter === k ? ' active' : ''}`} onClick={() => setStatusFilter(k)}>
                    {k === 'all' ? 'All' : STATUS_LABEL[k]}<span className="adm-pcount">{k === 'all' ? statusCounts.All : statusCounts[k]}</span>
                  </button>
                ))}
              </div>
              <SortDropdown value={sortBy} onChange={setSortBy} />
              <label className="adm-exp-toggle">
                <Toggle on={expSoon} onToggle={() => setExpSoon(!expSoon)} />
                <span>Expiring soon</span>
              </label>
            </div>
          </>
        )}
      </div>

      {/* filter bottom sheet (mobile) */}
      {isMobile && filterSheetOpen && createPortal(
        <>
          <div className="adm-bsheet-backdrop show" onClick={() => setFilterSheetOpen(false)} />
          <div className="adm-bsheet show">
            <div className="adm-bsheet-handle" />
            <div className="adm-bsheet-head">
              <h3>Filters</h3>
              <button className="adm-iconbtn" onClick={() => setFilterSheetOpen(false)}><X /></button>
            </div>
            <div className="adm-bsheet-body">
              <div className="adm-bsheet-section">
                <div className="adm-bsheet-label">Type</div>
                <div className="adm-pills">
                  {['All', ...TYPES].map(t => {
                    const key = t === 'All' ? 'all' : t
                    return (
                      <button key={t} className={`adm-pill${typeFilter === key ? ' active' : ''}`} onClick={() => setTypeFilter(key)}>
                        {t}<span className="adm-pcount">{typeCounts[t] || 0}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="adm-bsheet-section">
                <div className="adm-bsheet-label">Status</div>
                <div className="adm-pills">
                  {(['all', 'published', 'draft', 'archived', 'expired'] as const).map(k => (
                    <button key={k} className={`adm-pill${statusFilter === k ? ' active' : ''}`} onClick={() => setStatusFilter(k)}>
                      {k === 'all' ? 'All' : STATUS_LABEL[k]}<span className="adm-pcount">{k === 'all' ? statusCounts.All : statusCounts[k]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="adm-bsheet-section">
                <label className="adm-exp-toggle">
                  <Toggle on={expSoon} onToggle={() => setExpSoon(!expSoon)} />
                  <span>Expiring soon only</span>
                </label>
              </div>
            </div>
            <div className="adm-bsheet-foot">
              <button className="adm-btn adm-btn-ghost" onClick={() => { setTypeFilter('all'); setStatusFilter('all'); setExpSoon(false) }}>
                Clear all
              </button>
              <button className="adm-btn adm-btn-primary" onClick={() => setFilterSheetOpen(false)}>
                Apply filters
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* bulk bar (desktop only) */}
      {!isMobile && (
        <div className={`adm-bulkbar${selected.size ? ' show' : ''}`}>
          <div className="adm-bulk-count"><b>{selected.size}</b> selected</div>
          <div className="adm-bulk-actions">
            <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => { onBulkPublish([...selected]); setSelected(new Set()) }}><Check /> Publish selected</button>
            <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => { onBulkArchive([...selected]); setSelected(new Set()) }}><Archive /> Archive selected</button>
            {role === 'founder' && <button className="adm-btn adm-btn-danger-list adm-btn-sm" onClick={() => { onBulkDelete([...selected]); setSelected(new Set()) }}><Trash2 /> Delete selected</button>}
          </div>
          <span className="adm-bulk-deselect" onClick={() => setSelected(new Set())}>Deselect all</span>
        </div>
      )}

      {/* empty / no results */}
      {listings.length === 0 ? (
        <div className="adm-empty">
          <div className="adm-empty-ico"><FilePlus /></div>
          <h2>No listings yet.</h2>
          <p>Create your first opportunity listing to start accepting OppDate Apply applications.</p>
          {!isStaff && <button className="adm-btn adm-btn-primary" style={{ marginTop: 18 }} onClick={onNew}><Plus /> Create listing</button>}
        </div>
      ) : noResults ? (
        <div className="adm-empty">
          <div className="adm-empty-ico"><Search /></div>
          <h2>No listings match &ldquo;{search}&rdquo;</h2>
          <p>Try a different title, institution, or type.</p>
          <span className="adm-clearlink" onClick={() => setSearch('')}><X /> Clear search</span>
        </div>
      ) : (
        <>
          {isMobile ? (
            /* mobile card list */
            <div className="adm-mob-cards">
              {filtered.map((l, idx) => {
                const expanded = expandedCards.has(l.id)
                const isExpSoon = l.daysLeft >= 0 && l.daysLeft < 14
                return (
                  <div
                    key={l.id}
                    className={`adm-mob-card${expanded ? ' expanded' : ''}${isExpSoon ? ' adm-mob-exp-soon' : ''} adm-mob-card-anim`}
                    style={{ animationDelay: `${idx * 35}ms` }}
                    onClick={() => onQuickView(l.id)}
                  >
                    <div className="adm-mob-card-top">
                      <div className="adm-mob-card-main">
                        <div className="adm-mob-card-title-row">
                          <span className="adm-mob-card-title">{l.title}</span>
                          <StatusBadge status={l.status} />
                        </div>
                        <div className="adm-mob-card-meta">
                          <span className="adm-typebadge">{l.type}</span>
                          <span className="adm-mob-card-inst">{l.flag} {l.inst}</span>
                        </div>
                        <div className="adm-mob-card-stats">
                          <span className={`adm-mob-card-dl ${dlClass(l)}`}>
                            <Calendar style={{ width: 12, height: 12 }} />
                            {l.daysLeft < 0 ? 'Expired' : l.deadline}
                          </span>
                          <span className="adm-mob-card-apps">{l.apps} app{l.apps === 1 ? '' : 's'}</span>
                          <span className="adm-mob-card-fee">{fmtFee(l.oppFee + l.instFee)}</span>
                        </div>
                      </div>
                      <button
                        className={`adm-mob-card-chevron${expanded ? ' open' : ''}`}
                        onClick={e => { e.stopPropagation(); toggleCard(l.id) }}
                      >
                        <ChevronDown />
                      </button>
                    </div>

                    {expanded && (
                      <div className="adm-mob-card-details">
                        <div className="adm-mob-card-detail-row">
                          <span className="adm-mob-card-label">Compliance</span>
                          <CatBadge cat={l.cat} />
                        </div>
                        <div className="adm-mob-card-detail-row">
                          <span className="adm-mob-card-label">OppDate fee</span>
                          <span className="adm-mob-card-val">{fmtFee(l.oppFee)}</span>
                        </div>
                        <div className="adm-mob-card-detail-row">
                          <span className="adm-mob-card-label">Institution fee</span>
                          <span className="adm-mob-card-val">{fmtFee(l.instFee)}</span>
                        </div>
                        <div className="adm-mob-card-detail-row tot">
                          <span className="adm-mob-card-label">Total</span>
                          <span className="adm-mob-card-val">{fmtFee(l.oppFee + l.instFee)}</span>
                        </div>
                        <div className="adm-mob-card-detail-row">
                          <span className="adm-mob-card-label">OppDate Apply</span>
                          <span onClick={e => e.stopPropagation()}>
                            <Toggle on={vipState[l.id] ?? l.vip}
                              onToggle={() => { const next = !(vipState[l.id] ?? l.vip); setVipState(prev => ({ ...prev, [l.id]: next })); onToggleApply(l.id, next) }} />
                          </span>
                        </div>
                        <div className="adm-mob-card-actions" onClick={e => e.stopPropagation()}>
                          {!isStaff && (
                            <>
                              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => onEdit(l.id)}><Edit3 /> Edit</button>
                              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => onArchive(l.id)}><Archive /> Archive</button>
                            </>
                          )}
                          <button className="adm-btn adm-btn-ghost adm-btn-sm"><ExternalLink /> View</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            /* desktop table */
            <div className="adm-table-wrap">
              <table className="adm-appt">
                <thead>
                  <tr>
                    <th className="adm-c-check" />
                    <th>Listing</th>
                    <th>Compliance</th>
                    <th>Deadline</th>
                    <th>Fees</th>
                    <th>Applications</th>
                    <th>Metrics</th>
                    <th>OppDate Apply</th>
                    <th>Status</th>
                    <th className="adm-c-actions" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l, idx) => {
                    const sel = selected.has(l.id)
                    const isExpSoon = l.daysLeft >= 0 && l.daysLeft < 14
                    const cls = [sel ? 'sel' : '', isExpSoon ? 'adm-exp-soon' : '', 'adm-animate'].filter(Boolean).join(' ')
                    return (
                      <tr key={l.id} className={cls} style={{ animationDelay: `${idx * 28}ms` }}
                        onClick={() => onQuickView(l.id)}>
                        <td className="adm-c-check" onClick={e => e.stopPropagation()}>
                          <div className={`adm-cbx${sel ? ' on' : ''}`} onClick={() => toggleSelect(l.id)}><Check /></div>
                        </td>
                        <td>
                          <div className="adm-olisting">
                            <div className="adm-olt">{l.title}</div>
                            <div className="adm-oli">{l.flag} {l.inst} <span className="adm-typebadge">{l.type}</span></div>
                          </div>
                        </td>
                        <td><CatBadge cat={l.cat} /></td>
                        <td>
                          <div className={`adm-odl ${dlClass(l)}`}>
                            <div className="adm-dl-date">{l.daysLeft < 0 ? `${l.deadline} (expired)` : l.deadline}</div>
                            <div className="adm-dl-time">{l.time}</div>
                            <div className="adm-dl-tip">{dlTip(l)}</div>
                          </div>
                        </td>
                        <td>
                          <div className="adm-ofees">
                            <div className="adm-fline"><span>OppDate</span><span className="adm-fv">{fmtFee(l.oppFee)}</span></div>
                            <div className="adm-fline"><span>Institution</span><span className="adm-fv">{fmtFee(l.instFee)}</span></div>
                            <div className="adm-fline tot"><span>Total</span><span className="adm-fv">{fmtFee(l.oppFee + l.instFee)}</span></div>
                          </div>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <span className="adm-applink" onClick={() => onViewApplications(l.id)}><b>{l.apps}</b> application{l.apps === 1 ? '' : 's'} <ArrowRight /></span>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setMetricsId(l.id)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 10,
                              padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
                              border: '1px solid rgba(193,127,58,0.22)',
                              background: 'rgba(193,127,58,0.05)',
                              color: '#9A6A3A',
                              fontFamily: 'sans-serif', fontSize: 11.5,
                              whiteSpace: 'nowrap',
                              transition: 'background 150ms ease, border-color 150ms ease',
                            }}
                            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'rgba(193,127,58,0.12)'; el.style.borderColor = 'rgba(193,127,58,0.38)' }}
                            onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'rgba(193,127,58,0.05)'; el.style.borderColor = 'rgba(193,127,58,0.22)' }}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Eye size={11} />
                              <span style={{ fontWeight: 600, color: '#DEBA9E' }}>{l.views.toLocaleString()}</span>
                              <span style={{ fontSize: 10, opacity: 0.6 }}>views</span>
                            </span>
                            <span style={{ opacity: 0.3 }}>|</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Bookmark size={11} />
                              <span style={{ fontWeight: 600, color: '#DEBA9E' }}>{l.saves}</span>
                              <span style={{ fontSize: 10, opacity: 0.6 }}>saved</span>
                            </span>
                          </button>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <Toggle on={vipState[l.id] ?? l.vip}
                            onToggle={() => { const next = !(vipState[l.id] ?? l.vip); setVipState(prev => ({ ...prev, [l.id]: next })); onToggleApply(l.id, next) }} />
                        </td>
                        <td><StatusBadge status={l.status} /></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="adm-rowact">
                            {!isStaff && (
                              <>
                                <button className="adm-iconbtn" title="Edit" onClick={() => onEdit(l.id)}><Edit3 /></button>
                                <button className="adm-iconbtn" title="Archive" onClick={() => onArchive(l.id)}><Archive /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* pagination */}
          <div className="adm-pager">
            <div className="adm-info">Showing <b>{filtered.length}</b> of {listings.length} listings</div>
            <div className="adm-pages">
              <span className="adm-pg nav"><ChevronLeft /></span>
              <span className="adm-pg on">1</span>
              <span className="adm-pg">2</span>
              <span className="adm-pg nav"><ChevronRight /></span>
            </div>
          </div>

          {/* FAB (mobile only) */}
          {isMobile && !isStaff && (
            <button className="adm-fab" onClick={onNew}>
              <Plus />
            </button>
          )}
        </>
      )}

      {/* Metrics drawer */}
      <MetricsDrawer
        oppId={metricsId}
        title={metricsListing?.title ?? ''}
        onClose={() => setMetricsId(null)}
        isMobile={isMobile}
      />
    </>
  )
}

// ---- METRICS DRAWER ----

interface MetricsData {
  views: number
  saves: number
  applications: number
  conversionRate: number
  guideOpens: number
  platformAvgConversion: number
  statusBreakdown: { status: string; count: number }[]
  trend: { date: string; views: number; applies: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  eligibility_screening: '#C17F3A',
  document_collection:   '#D97706',
  awaiting_payment:      '#7C3AED',
  payment_confirmed:     '#059669',
  submitted:             '#0E7490',
  under_review:          '#2563EB',
  decision_pending:      '#6366F1',
  accepted:              '#16A34A',
  rejected:              '#DC2626',
  withdrawn:             '#9CA3AF',
}

function useCountUp(target: number, duration = 500, trigger: boolean) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!trigger) return
    let start: number | null = null
    const step = (ts: number) => {
      if (!start) start = ts
      const pct = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - pct, 3)
      setVal(Math.round(ease * target))
      if (pct < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, trigger])
  return val
}

function Sparkline({ trend, width = 300, height = 60 }: { trend: MetricsData['trend']; width?: number; height?: number }) {
  const [drawn, setDrawn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 80); return () => clearTimeout(t) }, [])

  if (trend.length < 2) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: height }}>
        <text x={width / 2} y={height / 2} textAnchor="middle" fontSize={11} fill="rgba(196,151,122,0.5)">No trend data yet</text>
      </svg>
    )
  }

  const maxViews = Math.max(...trend.map(d => d.views), 1)
  const maxApplies = Math.max(...trend.map(d => d.applies), 1)
  const pad = { t: 6, b: 6, l: 4, r: 4 }
  const w = width - pad.l - pad.r
  const h = height - pad.t - pad.b

  const px = (i: number) => pad.l + (i / (trend.length - 1)) * w
  const pyV = (v: number) => pad.t + (1 - v / maxViews) * h
  const pyA = (v: number) => pad.t + (1 - v / maxApplies) * h

  const viewPts = trend.map((d, i) => `${px(i)},${pyV(d.views)}`).join(' ')
  const applyPts = trend.map((d, i) => `${px(i)},${pyA(d.applies)}`).join(' ')

  const viewFill = `${viewPts} ${px(trend.length - 1)},${pad.t + h} ${pad.l},${pad.t + h}`
  const applyFill = `${applyPts} ${px(trend.length - 1)},${pad.t + h} ${pad.l},${pad.t + h}`

  const lineLen = trend.reduce((sum, _, i) => {
    if (i === 0) return 0
    const dx = px(i) - px(i - 1)
    const dy = pyV(trend[i].views) - pyV(trend[i - 1].views)
    return sum + Math.sqrt(dx * dx + dy * dy)
  }, 0)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: height }}>
      <defs>
        <linearGradient id="viewGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C17F3A" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#C17F3A" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="applyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7A2D05" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#7A2D05" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={viewFill} fill="url(#viewGrad)" />
      <polygon points={applyFill} fill="url(#applyGrad)" />
      <polyline
        points={viewPts}
        fill="none"
        stroke="#C17F3A"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={lineLen}
        strokeDashoffset={drawn ? 0 : lineLen}
        style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.25,0.46,0.45,0.94)' }}
      />
      <polyline
        points={applyPts}
        fill="none"
        stroke="#7A2D05"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={lineLen}
        strokeDashoffset={drawn ? 0 : lineLen}
        style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.25,0.46,0.45,0.94) 100ms' }}
      />
    </svg>
  )
}

function MetricsDrawer({ oppId, title, onClose, isMobile }: {
  oppId: string | null; title: string; onClose: () => void; isMobile: boolean
}) {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')
  const [mounted, setMounted] = useState(false)
  useEffect(() => { if (oppId) { setMounted(false); setTimeout(() => setMounted(true), 60) } }, [oppId, period])

  const { data, isLoading } = useQuery<MetricsData>({
    queryKey: ['opp-metrics', oppId, period],
    queryFn: () => api.get(`/api/v1/admin/opportunities/${oppId}/metrics?period=${period}`).then(r => r.data?.data),
    enabled: !!oppId,
    staleTime: 60000,
  })

  const views = useCountUp(data?.views ?? 0, 500, mounted && !isLoading)
  const saves = useCountUp(data?.saves ?? 0, 500, mounted && !isLoading)
  const apps = useCountUp(data?.applications ?? 0, 500, mounted && !isLoading)
  const guide = useCountUp(data?.guideOpens ?? 0, 500, mounted && !isLoading)

  const convRate = data?.conversionRate ?? 0
  const convColor = convRate >= 10 ? '#16A34A' : convRate >= 5 ? '#C17F3A' : '#DC2626'
  const totalApps = data?.applications ?? 0

  const open = !!oppId

  const drawerStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#180D06',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 280ms cubic-bezier(0.25,0.46,0.45,0.94)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }
    : {
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, zIndex: 9998,
        background: '#180D06',
        boxShadow: '-4px 0 40px rgba(0,0,0,0.5)',
        borderLeft: '1px solid rgba(181,83,10,0.15)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 280ms cubic-bezier(0.25,0.46,0.45,0.94)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }

  if (!open) return <div style={drawerStyle} aria-hidden />

  const periodTabs: { id: '7d' | '30d' | '90d'; label: string }[] = [
    { id: '7d', label: '7 days' },
    { id: '30d', label: '30 days' },
    { id: '90d', label: '90 days' },
  ]

  const statCards = [
    { label: 'Views', value: views, icon: Eye, color: '#C17F3A', bg: 'rgba(193,127,58,0.08)' },
    { label: 'Saves', value: saves, icon: Bookmark, color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
    { label: 'Applications', value: apps, icon: BarChart2, color: '#0E7490', bg: 'rgba(14,116,144,0.08)' },
    { label: 'Guide opens', value: guide, icon: TrendingUp, color: '#059669', bg: 'rgba(5,150,105,0.08)' },
  ]

  return (
    <>
      {!isMobile && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 9997,
            background: 'rgba(0,0,0,0.5)',
            animation: 'metrFadeIn 200ms ease',
          }}
        />
      )}
      <div style={drawerStyle}>
        <style>{`
          @keyframes metrFadeIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes metrCardIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
          @keyframes metrBarFill { from { width: 0 } }
        `}</style>

        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(181,83,10,0.15)',
          position: 'sticky', top: 0,
          background: '#1F1108', zIndex: 1,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {isMobile && (
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)', margin: '0 auto 4px' }} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={onClose}
              style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C4977A', flexShrink: 0 }}
            >
              <X size={15} />
            </button>
            <div>
              <div style={{ fontFamily: 'var(--adm-serif, serif)', fontSize: 14, fontWeight: 700, color: '#F0E8E0', lineHeight: 1.3, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
              <div style={{ fontFamily: 'sans-serif', fontSize: 11.5, color: '#C4977A', marginTop: 1 }}>Performance metrics</div>
            </div>
          </div>

          {/* Period selector */}
          {isMobile ? (
            <select
              value={period}
              onChange={e => setPeriod(e.target.value as typeof period)}
              style={{
                height: 32, padding: '0 10px', borderRadius: 8,
                border: '1px solid rgba(181,83,10,0.25)',
                fontFamily: 'sans-serif', fontSize: 13, color: '#F0E8E0',
                background: '#261409', outline: 'none',
              }}
            >
              {periodTabs.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          ) : (
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3 }}>
              {periodTabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setPeriod(t.id)}
                  style={{
                    flex: 1, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontFamily: 'sans-serif', fontSize: 12, fontWeight: period === t.id ? 600 : 400,
                    background: period === t.id ? '#3D1E08' : 'transparent',
                    color: period === t.id ? '#F0E8E0' : '#C4977A',
                    boxShadow: period === t.id ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                    transition: 'all 150ms ease',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {isLoading ? (
            <>
              <style>{`.adm-metr-skel { background: linear-gradient(90deg, #261409 25%, #2C1A0B 50%, #261409 75%); background-size: 400px 100%; animation: shimmer 1.4s ease-in-out infinite; border-radius: 10px; } @keyframes shimmer { from { background-position: -400px 0 } to { background-position: 400px 0 } }`}</style>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[0,1,2,3].map(i => <div key={i} className="adm-metr-skel" style={{ height: 80 }} />)}
              </div>
              <div className="adm-metr-skel" style={{ height: 72 }} />
              <div className="adm-metr-skel" style={{ height: 120 }} />
            </>
          ) : (
            <>
              {/* Stat cards 2x2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {statCards.map((c, i) => {
                  const Icon = c.icon
                  return (
                    <div
                      key={c.label}
                      style={{
                        background: '#261409',
                        borderRadius: 12,
                        padding: '14px 14px 12px',
                        border: '1px solid rgba(181,83,10,0.15)',
                        animation: `metrCardIn 260ms ease-out both`,
                        animationDelay: `${i * 60}ms`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={14} />
                        </div>
                        <span style={{ fontFamily: 'sans-serif', fontSize: 11.5, color: '#C4977A' }}>{c.label}</span>
                      </div>
                      <div style={{ fontFamily: 'serif', fontSize: 26, fontWeight: 700, color: '#F0E8E0', lineHeight: 1 }}>{c.value.toLocaleString()}</div>
                    </div>
                  )
                })}
              </div>

              {/* Conversion rate */}
              <div style={{
                background: '#261409', borderRadius: 12, padding: '14px 16px',
                border: `1px solid rgba(181,83,10,0.15)`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                animation: 'metrCardIn 260ms ease-out both', animationDelay: '240ms',
              }}>
                <div>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 11.5, color: '#C4977A', marginBottom: 4 }}>Conversion rate (views to applies)</div>
                  <div style={{ fontFamily: 'serif', fontSize: 24, fontWeight: 700, color: convColor }}>{convRate.toFixed(1)}%</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: '#C4977A', marginBottom: 2 }}>Platform avg</div>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 13, fontWeight: 600, color: '#F0E8E0' }}>{(data?.platformAvgConversion ?? 0).toFixed(1)}%</div>
                </div>
              </div>

              {/* Sparkline */}
              <div style={{
                background: '#261409', borderRadius: 12, padding: '14px 16px',
                border: '1px solid rgba(181,83,10,0.15)',
                animation: 'metrCardIn 260ms ease-out both', animationDelay: '300ms',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 12, fontWeight: 600, color: '#F0E8E0' }}>Trend ({period})</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 10, height: 2, borderRadius: 1, background: '#C17F3A' }} />
                      <span style={{ fontSize: 10, color: '#C4977A' }}>Views</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 10, height: 2, borderRadius: 1, background: '#B5530A' }} />
                      <span style={{ fontSize: 10, color: '#C4977A' }}>Applies</span>
                    </div>
                  </div>
                </div>
                <Sparkline trend={data?.trend ?? []} />
              </div>

              {/* Application pipeline bar */}
              {totalApps > 0 && (
                <div style={{
                  background: '#261409', borderRadius: 12, padding: '14px 16px',
                  border: '1px solid rgba(181,83,10,0.15)',
                  animation: 'metrCardIn 260ms ease-out both', animationDelay: '360ms',
                }}>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 12, fontWeight: 600, color: '#F0E8E0', marginBottom: 10 }}>Application pipeline</div>
                  <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: isMobile ? 12 : 8, gap: 1 }}>
                    {(data?.statusBreakdown ?? []).map((s, i) => {
                      const pct = (s.count / totalApps) * 100
                      return (
                        <div
                          key={s.status}
                          title={`${s.status}: ${s.count}`}
                          style={{
                            background: STATUS_COLORS[s.status] ?? '#C4A882',
                            borderRadius: i === 0 ? '6px 0 0 6px' : (data?.statusBreakdown ?? []).length - 1 === i ? '0 6px 6px 0' : 0,
                            transition: `width 400ms cubic-bezier(0.25,0.46,0.45,0.94) ${i * 60}ms`,
                            width: `${pct}%`,
                            minWidth: pct > 0 ? 4 : 0,
                          }}
                        />
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 8 }}>
                    {(data?.statusBreakdown ?? []).map(s => (
                      <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_COLORS[s.status] ?? '#C4A882', flexShrink: 0 }} />
                        <span style={{ fontSize: 10.5, color: '#C4977A' }}>{s.status.replace(/_/g, ' ')} ({s.count})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state if no data at all */}
              {!isLoading && (data?.views ?? 0) === 0 && (data?.applications ?? 0) === 0 && (
                <div style={{
                  background: 'rgba(181,83,10,0.06)',
                  border: '1px solid rgba(181,83,10,0.15)',
                  borderRadius: 12, padding: '20px 16px',
                  textAlign: 'center',
                  animation: 'metrCardIn 260ms ease-out both',
                }}>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 13, fontWeight: 600, color: '#F0E8E0', marginBottom: 6 }}>No activity recorded yet</div>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 12.5, color: '#C4977A', lineHeight: 1.5 }}>
                    This listing has no recorded views or applications yet. Check back after it has been live for a few days.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ---- QUICK VIEW PANEL ----
function QuickViewPanel({ listing, apiOpp, role, onClose, onEdit, onDelete, onArchive, onToggleApply, onViewApplications }: {
  listing: Listing | null; apiOpp: ApiOpportunity | null; role: UserRole; onClose: () => void; onEdit: (id: string) => void
  onDelete: (id: string) => void; onArchive: (id: string) => void; onToggleApply: (id: string, enabled: boolean) => void
  onViewApplications: (opportunityId: string) => void
}) {
  if (!listing) return null
  const l = listing
  const total = l.oppFee + l.instFee
  const dlCls = l.daysLeft < 0 ? 'urgent' : l.daysLeft < 14 ? 'soon' : 'ok'
  const rawDocs = Array.isArray(apiOpp?.requiredDocuments) ? apiOpp!.requiredDocuments as { type: string; required: boolean }[] : []

  return (
    <>
      <div className={`adm-qv-backdrop${l ? ' show' : ''}`} onClick={onClose} />
      <aside className={`adm-qv${l ? ' show' : ''}`}>
        <div className="adm-qv-head">
          <button className="adm-qv-close" onClick={onClose}><X /></button>
          <StatusBadge status={l.status} lg />
          <div className="adm-qv-title">{l.title}</div>
          <div className="adm-qv-inst">{l.flag} {l.inst} <span className="adm-typebadge">{l.type}</span></div>
        </div>
        <div className="adm-qv-body">
          <div className="adm-qv-badges"><CatBadge cat={l.cat} lg /></div>
          <div className="adm-qv-block">
            <div className="adm-qb-h">Deadline</div>
            <div className={`adm-odl ${dlCls}`}>
              <span className="adm-qv-deadline">{l.deadline}</span>{' '}
              <span className="adm-dl-time">{l.time}</span>
            </div>
          </div>
          <div className="adm-qv-block">
            <div className="adm-qb-h">Fees</div>
            <div className="adm-qv-fees">
              <div className="adm-qv-feeline"><span className="adm-k">OppDate service fee</span><span className="adm-v">{fmtFee(l.oppFee)}</span></div>
              <div className="adm-qv-feeline"><span className="adm-k">Institution fee</span><span className="adm-v">{fmtFee(l.instFee)}</span></div>
              <div className="adm-qv-feeline tot"><span className="adm-k">Total user pays</span><span className="adm-v">{fmtFee(total)}</span></div>
            </div>
          </div>
          <div className="adm-qv-block">
            <div className="adm-qb-h">OppDate Apply</div>
            <div className="adm-sum-vip">
              <span>{l.vip ? 'Enabled: users can apply' : 'Disabled: browse only'}</span>
              <Toggle on={l.vip} onToggle={() => onToggleApply(l.id, !l.vip)} />
            </div>
          </div>
          <div className="adm-qv-block">
            <div className="adm-qb-h">Applications</div>
            <div className="adm-qv-apps">
              <div className="adm-qa-top">
                <span className="adm-qa-n">{l.apps}</span>
                <span className="adm-qa-link" onClick={() => onViewApplications(l.id)}>View all <ArrowRight /></span>
              </div>
              <div className="adm-qa-break">{l.inProgress} in progress &middot; {l.submitted} submitted</div>
            </div>
          </div>
          <div className="adm-qv-block">
            <div className="adm-qb-h">Required documents</div>
            <div className="adm-qv-doclist">
              {rawDocs.length === 0
                ? <span style={{ color: 'var(--adm-t-low)', fontSize: 13 }}>None specified</span>
                : rawDocs.map((d, i) => (
                  <div key={i} className="adm-qv-doc"><FileText /><span>{d.type}</span><span className="adm-opt">{d.required ? 'Required' : 'Optional'}</span></div>
                ))
              }
            </div>
          </div>
        </div>
        <div className="adm-qv-foot">
          {role !== 'staff' && (
            <>
              <button className="adm-btn adm-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => onEdit(l.id)}><Edit3 /> Edit listing</button>
              <button className="adm-btn adm-btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { onArchive(l.id); onClose() }}><Archive /> Archive</button>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

// ---- FORM SECTION (collapsible) ----
function FormSection({ num, title, children, collapsed, onToggle, className, summary, onNext, sectionRef }: {
  num: string; title: string; children: React.ReactNode
  collapsed: boolean; onToggle: () => void; className?: string
  summary?: string; onNext?: () => void; sectionRef?: (el: HTMLDivElement | null) => void
}) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [maxH, setMaxH] = useState<string>(collapsed ? '0px' : 'none')
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      if (collapsed) setMaxH('0px')
      return
    }
    const el = bodyRef.current
    if (!el) return
    if (collapsed) {
      el.style.maxHeight = el.scrollHeight + 'px'
      void el.offsetHeight
      setMaxH('0px')
    } else {
      setMaxH(el.scrollHeight + 'px')
      const onEnd = () => { setMaxH('none'); el.removeEventListener('transitionend', onEnd) }
      el.addEventListener('transitionend', onEnd)
    }
  }, [collapsed])

  return (
    <div ref={sectionRef} className={`adm-fsec${collapsed ? ' collapsed' : ''}${className ? ' ' + className : ''}`}>
      <div className="adm-fsec-head" onClick={onToggle}>
        <div className="adm-fsec-num">{num}</div>
        <div className="adm-fsec-title">{title}</div>
        {collapsed && summary && <span className="adm-mob-fsec-summary">{summary}</span>}
        <ChevronDown className="adm-fsec-chev" />
      </div>
      <div ref={bodyRef} className="adm-fsec-body" style={{ maxHeight: maxH, overflow: collapsed ? 'hidden' : undefined }}>
        {children}
        {onNext && (
          <button className="adm-mob-next-sec" onClick={e => { e.stopPropagation(); onNext() }}>
            Next section <ArrowRight />
          </button>
        )}
      </div>
    </div>
  )
}

// ---- Rich Text Editor ----
function RichEditor({ value, onChange, placeholder }: { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set())

  const lastValueRef = useRef('')
  useEffect(() => {
    if (!bodyRef.current) return
    if (bodyRef.current.innerHTML !== value) {
      bodyRef.current.innerHTML = value
      lastValueRef.current = value
    }
  }, [value])

  const updateActiveFormats = () => {
    const active = new Set<string>()
    if (document.queryCommandState('bold')) active.add('bold')
    if (document.queryCommandState('italic')) active.add('italic')
    if (document.queryCommandState('insertUnorderedList')) active.add('ul')
    const block = document.queryCommandValue('formatBlock')
    if (block === 'h3' || block === 'H3') active.add('h3')
    setActiveFormats(active)
  }

  const exec = (cmd: string, value?: string) => {
    bodyRef.current?.focus()
    document.execCommand(cmd, false, value)
    updateActiveFormats()
    if (bodyRef.current) {
      lastValueRef.current = bodyRef.current.innerHTML
      onChange(bodyRef.current.innerHTML)
    }
  }

  const handleInput = () => {
    updateActiveFormats()
    if (bodyRef.current) {
      lastValueRef.current = bodyRef.current.innerHTML
      onChange(bodyRef.current.innerHTML)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey)) {
      if (e.key === 'b') { e.preventDefault(); exec('bold') }
      if (e.key === 'i') { e.preventDefault(); exec('italic') }
    }
  }

  const isEmpty = !value || value === '<br>' || value === '<div><br></div>'

  return (
    <div className="adm-rte">
      <div className="adm-rte-bar">
        <button type="button" title="Bold (Ctrl+B)" className={activeFormats.has('bold') ? 'active' : ''} onMouseDown={e => { e.preventDefault(); exec('bold') }}><Bold size={14} /></button>
        <button type="button" title="Italic (Ctrl+I)" className={activeFormats.has('italic') ? 'active' : ''} onMouseDown={e => { e.preventDefault(); exec('italic') }}><Italic size={14} /></button>
        <span className="adm-div" />
        <button type="button" title="Bullet list" className={activeFormats.has('ul') ? 'active' : ''} onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList') }}><List size={14} /></button>
        <button type="button" title="Heading" className={activeFormats.has('h3') ? 'active' : ''} onMouseDown={e => { e.preventDefault(); exec('formatBlock', activeFormats.has('h3') ? 'p' : 'h3') }}><Heading size={14} /></button>
      </div>
      <div
        ref={bodyRef}
        className={`adm-rte-body${isEmpty ? ' empty' : ''}`}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder || 'Write here...'}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onMouseUp={updateActiveFormats}
        onKeyUp={updateActiveFormats}
      />
    </div>
  )
}

// ---- CUSTOM DATE PICKER ----
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DOW = ['S','M','T','W','T','F','S']

function DatePicker({ value, onChange, required }: { value: string; onChange: (v: string) => void; required?: boolean }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const now = new Date()
  const [viewYear, setViewYear] = useState(() => value ? parseInt(value.split('-')[0]) : now.getFullYear())
  const [viewMonth, setViewMonth] = useState(() => value ? parseInt(value.split('-')[1]) - 1 : now.getMonth())

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
    setPos({ top: r.bottom + 6, left: r.left })
  }, [open])

  const fmtDisplay = (iso: string) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-').map(Number)
    return `${d} ${MONTH_NAMES[m - 1].slice(0, 3)} ${y}`
  }

  const buildGrid = () => {
    const first = new Date(viewYear, viewMonth, 1)
    const startDow = first.getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const daysInPrev = new Date(viewYear, viewMonth, 0).getDate()
    const todayIso = now.toISOString().slice(0, 10)
    const cells: { d: number; iso?: string; muted?: boolean; today?: boolean; sel?: boolean }[] = []
    for (let i = 0; i < startDow; i++) cells.push({ d: daysInPrev - startDow + 1 + i, muted: true })
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ d, iso, today: iso === todayIso, sel: iso === value })
    }
    let next = 1
    while (cells.length % 7 !== 0) cells.push({ d: next++, muted: true })
    return cells
  }

  const nav = (dir: number) => {
    let m = viewMonth + dir, y = viewYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setViewMonth(m)
    setViewYear(y)
  }

  const selectDay = (iso: string) => { onChange(iso); setOpen(false) }
  const selectToday = () => { onChange(now.toISOString().slice(0, 10)); setOpen(false) }
  const clear = () => { onChange(''); setOpen(false) }

  return (
    <div ref={triggerRef} className={`adm-cdate${open ? ' open' : ''}`}>
      <div className="adm-cdate-trigger" onClick={() => setOpen(!open)}>
        <span className={`adm-cdate-val${value ? '' : ' ph'}`}>{value ? fmtDisplay(value) : 'Select date'}</span>
        <Calendar className="adm-cdate-ico" />
      </div>
      {open && createPortal(
        <div ref={dropRef} className="adm-cdate-drop" style={{ position: 'fixed', top: pos.top, left: pos.left }}>
          <div className="adm-cdate-head">
            <div className="adm-cdate-navbtn" onClick={() => nav(-1)}><ChevronLeft /></div>
            <div className="adm-cd-month">{MONTH_NAMES[viewMonth]} {viewYear}</div>
            <div className="adm-cdate-navbtn" onClick={() => nav(1)}><ChevronRight /></div>
          </div>
          <div className="adm-cdate-dow">{DOW.map((d, i) => <span key={i}>{d}</span>)}</div>
          <div className="adm-cdate-grid">
            {buildGrid().map((c, i) => (
              <div key={i}
                className={`adm-cdate-cell${c.muted ? ' muted' : ''}${c.today ? ' today' : ''}${c.sel ? ' sel-on' : ''}`}
                onClick={() => !c.muted && c.iso && selectDay(c.iso)}>
                {c.d}
              </div>
            ))}
          </div>
          <div className="adm-cdate-foot">
            <span className="adm-cdate-today" onClick={selectToday}>Today</span>
            {!required && <span className="adm-cdate-clear" onClick={clear}>Clear</span>}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// ---- CUSTOM TIME PICKER ----
function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const timeOpts: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      timeOpts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }

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
    setPos({ top: r.bottom + 6, left: r.left })
  }, [open])

  return (
    <div ref={triggerRef} className={`adm-ctime${open ? ' open' : ''}`} style={{ flex: '1 1 auto' }}>
      <div className="adm-ctime-trigger" onClick={() => setOpen(!open)}>
        <span className={`adm-ctime-val${value ? '' : ' ph'}`}>{value || 'Select time'}</span>
        <Clock className="adm-ctime-ico" />
      </div>
      {open && createPortal(
        <div ref={dropRef} className="adm-ctime-drop" style={{ position: 'fixed', top: pos.top, left: pos.left }}>
          {timeOpts.map(t => (
            <div key={t} className={`adm-ctime-opt${t === value ? ' sel-on' : ''}`}
              onClick={() => { onChange(t); setOpen(false) }}>
              {t}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

// ---- PROGRESS RAIL (mobile form stepper) ----
function ProgressRail({ active, status, onJump }: {
  active: number
  status: Record<number, 'complete' | 'incomplete' | 'empty'>
  onJump: (n: number) => void
}) {
  return (
    <div className="adm-mob-prail">
      {Array.from({ length: 8 }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          className={`adm-mob-prail-seg${n === active ? ' active' : ''}${status[n] === 'complete' ? ' done' : ''}${status[n] === 'incomplete' ? ' has-req' : ''}`}
          onClick={() => onJump(n)}
        />
      ))}
    </div>
  )
}

// ---- LOGO UPLOAD FIELD ----
function LogoUploadField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [imgErr, setImgErr] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErr(null)
    setImgErr(false)
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post<{ data: { url: string } }>('/api/v1/admin/logo-upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = res.data?.data?.url
      if (url) onChange(url)
      else setErr('Upload failed.')
    } catch (ex: unknown) {
      const msg = (ex as { response?: { data?: { message?: string } } })?.response?.data?.message
      setErr(msg || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="adm-field">
      <label className="adm-field-label">Institution logo</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {value && !imgErr ? (
          <img
            src={value}
            alt="Logo preview"
            onError={() => setImgErr(true)}
            style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: 8, border: '1px dashed rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.04)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={18} style={{ color: 'rgba(255,255,255,0.3)' }} />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              height: 34, padding: '0 14px', borderRadius: 8,
              border: '1px dashed rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 500,
              cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Upload size={13} />
            {uploading ? 'Uploading...' : value ? 'Replace logo' : 'Upload logo'}
          </button>
          {value && !uploading && (
            <button
              type="button"
              onClick={() => { onChange(''); setImgErr(false) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12, color: 'rgba(255,100,100,0.7)', textAlign: 'left' }}
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" style={{ display: 'none' }} onChange={handleFile} />
      {err && <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: '#f87171' }}>{err}</span>}
      <span className="adm-field-help">JPEG, PNG, WebP, or SVG. Max 2MB. Shown on listing cards.</span>
    </div>
  )
}

// ---- CREATE/EDIT FORM ----
function FormView({ editId, listings, apiListings, role, onBack, onSaved, saving }: {
  editId: string | null; listings: Listing[]; apiListings: ApiOpportunity[]; role: UserRole
  onBack: () => void; onSaved: (kind: 'published' | 'draft', formData: FormData, deadlineIso: string) => void
  saving?: boolean
}) {
  const editApiOpp = editId ? (apiListings ?? []).find(o => o.id === editId) : null
  const initial: FormData = editApiOpp ? apiToFormData(editApiOpp) : {
    editing: false, title: '', inst: '', country: '', type: '', summary: '', about: '', whoItIsFor: '', benefit: '',
    cat: '', code: '', oppFee: '', instFee: '0.00', vip: false, applyDisabledNote: '', status: 'draft', featured: false,
    criteria: [{ question: '', options: [{ text: 'Yes', score: 0 }, { text: 'No', score: -100 }] }], docs: [{ type: '', required: true, formats: ['PDF'], creatable: false as const }],
    dates: [], funding: [], aiQuestions: [], internalNote: '', institutionLogoUrl: '',
  }

  const [form, setForm] = useState<FormData>(initial)
  const lastInitializedId = useRef<string | null>(null)
  useEffect(() => {
    if (editApiOpp && lastInitializedId.current !== editApiOpp.id) {
      lastInitializedId.current = editApiOpp.id
      setForm(apiToFormData(editApiOpp))
    }
  }, [editApiOpp])
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})
  const mobileInitDone = useRef(false)
  useEffect(() => {
    if (isMobile && !mobileInitDone.current) {
      mobileInitDone.current = true
      setCollapsed({ 1: false, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true })
    }
  }, [isMobile])
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false)
  const [feesAdvancedOpen, setFeesAdvancedOpen] = useState(false)
  const [docOptionsOpen, setDocOptionsOpen] = useState<Record<number, boolean>>({})
  const [aiGenLoading, setAiGenLoading] = useState(false)
  const [aiGenError, setAiGenError] = useState<string | null>(null)
  const [keptQuestions, setKeptQuestions] = useState<Set<string>>(new Set())
  const sectionRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const toggleSection = (n: number) => {
    if (isMobile) {
      setCollapsed(prev => {
        const wasOpen = !prev[n]
        const next: Record<number, boolean> = {}
        for (let i = 1; i <= 8; i++) next[i] = true
        if (!wasOpen) next[n] = false
        return next
      })
      setTimeout(() => {
        sectionRefs.current[n]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
    } else {
      setCollapsed(prev => ({ ...prev, [n]: !prev[n] }))
    }
  }

  const jumpToSection = (n: number) => {
    setCollapsed(prev => {
      const next: Record<number, boolean> = {}
      for (let i = 1; i <= 8; i++) next[i] = true
      next[n] = false
      return next
    })
    setTimeout(() => {
      sectionRefs.current[n]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 300)
  }

  const [deadlineDate, setDeadlineDate] = useState(() => {
    if (!editApiOpp) return ''
    const d = new Date(editApiOpp.deadline)
    return d.toISOString().slice(0, 10)
  })
  const [deadlineTime, setDeadlineTime] = useState(() => {
    if (!editApiOpp) return ''
    const d = new Date(editApiOpp.deadline)
    return d.toISOString().slice(11, 16)
  })
  const [deadlineTz, setDeadlineTz] = useState(editApiOpp ? 'GMT' : '')

  const update = <K extends keyof FormData>(key: K, val: FormData[K]) => setForm(prev => ({ ...prev, [key]: val }))

  const handleGenerateEligibility = async () => {
    setAiGenLoading(true)
    setAiGenError(null)
    try {
      const res = await api.post<{ data: { criteria: { question: string; options: { text: string; score: number }[]; weightRationale?: string }[]; generated: number; kept: number } }>(
        `/api/v1/opportunities/${editId}/generate-eligibility`,
        { keepQuestions: Array.from(keptQuestions) },
      )
      const { criteria } = res.data.data
      update('criteria', criteria)
      setKeptQuestions(new Set())
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Generation failed. Try again.'
      setAiGenError(msg)
    } finally {
      setAiGenLoading(false)
    }
  }

  const oppN = parseFloat(form.oppFee) || 0
  const instN = parseFloat(form.instFee) || 0
  const total = (oppN + instN).toFixed(2)

  const activeSection = useMemo(() => {
    for (let i = 1; i <= 8; i++) {
      if (!collapsed[i]) return i
    }
    return 0
  }, [collapsed])

  const sectionStatus = useMemo((): Record<number, 'complete' | 'incomplete' | 'empty'> => {
    const s: Record<number, 'complete' | 'incomplete' | 'empty'> = {}
    s[1] = form.title && form.type && form.summary ? 'complete' : (form.title || form.type || form.summary) ? 'incomplete' : 'empty'
    s[2] = form.criteria.some(c => c.question?.trim()) ? 'complete' : 'empty'
    s[3] = form.funding.length > 0 ? 'complete' : 'empty'
    s[4] = form.oppFee ? 'complete' : 'incomplete'
    s[5] = form.docs.some(d => d.type?.trim()) ? 'complete' : 'empty'
    s[6] = deadlineDate ? 'complete' : 'incomplete'
    s[7] = 'complete'
    s[8] = 'complete'
    return s
  }, [form, deadlineDate])

  const sectionSummary = useMemo((): Record<number, string> => {
    const s: Record<number, string> = {}
    s[1] = [form.title, form.inst].filter(Boolean).join(' - ') || 'Not started'
    s[2] = form.criteria.filter(c => c.question?.trim()).length > 0 ? `${form.criteria.filter(c => c.question?.trim()).length} questions` : 'Not started'
    s[3] = form.funding.length > 0 ? form.funding.join(', ') : 'Not started'
    s[4] = form.oppFee ? `$${total} total` : 'Not started'
    s[5] = form.docs.filter(d => d.type?.trim()).length > 0 ? `${form.docs.filter(d => d.type?.trim()).length} documents` : 'Not started'
    s[6] = deadlineDate || 'Not started'
    s[7] = form.vip ? 'OppDate Apply enabled' : form.applyDisabledNote ? 'OppDate Apply disabled (note set)' : 'OppDate Apply disabled'
    s[8] = STATUS_LABEL[form.status]
    return s
  }, [form, total, deadlineDate])

  const issues: string[] = []
  if (!form.title) issues.push('Opportunity title is required')
  if (form.vip && !form.cat) issues.push('Compliance category not set (required when OppDate Apply is enabled)')

  return (
    <>
      {/* top bar */}
      <div className="adm-form-top">
        <div className="adm-ft-l">
          <span className="adm-backlink" onClick={onBack} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--adm-t-mid)' }}>
            <ChevronLeft /> Back to listings
          </span>
          <h1>{editApiOpp ? <>Editing: <span className="adm-editing">{form.title}</span></> : 'New listing'}</h1>
        </div>
        {editApiOpp && <StatusBadge status={form.status} lg />}
        {isMobile && (
          <button className="adm-mob-preview-pill" onClick={() => setPreviewSheetOpen(true)}>
            <Eye />
            <span className="adm-mob-pill-text">
              {form.title || 'Untitled listing'} - {STATUS_LABEL[form.status]} - ${total}
            </span>
          </button>
        )}
      </div>
      {isMobile && <ProgressRail active={activeSection} status={sectionStatus} onJump={jumpToSection} />}

      <div className="adm-formwrap">
        <div className="adm-formmain enter">
          {/* Section 1: Basic */}
          <FormSection num="1" title="Basic information" collapsed={!!collapsed[1]} onToggle={() => toggleSection(1)}
            summary={isMobile ? sectionSummary[1] : undefined} onNext={isMobile ? () => jumpToSection(2) : undefined}
            sectionRef={el => { sectionRefs.current[1] = el }}>
            <div className="adm-field">
              <label className="adm-field-label">Opportunity title <span className="adm-req">*</span></label>
              <input className="adm-inp" placeholder="e.g. Chevening Scholarship 2026" value={form.title} onChange={e => update('title', e.target.value)} />
            </div>
            <div className="adm-field row2">
              <div className="adm-field">
                <label className="adm-field-label">Institution / organisation <span className="adm-req">*</span></label>
                <input className="adm-inp" placeholder="e.g. UK Government" value={form.inst} onChange={e => update('inst', e.target.value)} />
              </div>
              <div className="adm-field">
                <label className="adm-field-label">Institution country</label>
                <input className="adm-inp" placeholder="Search country..." value={form.country} onChange={e => update('country', e.target.value)} />
              </div>
            </div>
            <LogoUploadField
              value={form.institutionLogoUrl}
              onChange={url => update('institutionLogoUrl', url)}
            />
            <div className="adm-field">
              <label className="adm-field-label">Opportunity type <span className="adm-req">*</span></label>
              <CustomSelect value={form.type} placeholder="Select type..."
                options={TYPES.map(t => ({ value: t, label: t }))}
                onChange={v => update('type', v)} />
            </div>
            <div className="adm-field">
              <label className="adm-field-label">Summary <span className="adm-req">*</span></label>
              <textarea className="adm-ta" maxLength={280} placeholder="2-3 sentences shown on listing cards..."
                value={form.summary} onChange={e => update('summary', e.target.value)} />
              <span className={`adm-char-count${form.summary.length > 250 ? form.summary.length > 280 ? ' over' : ' warn' : ''}`}>
                {form.summary.length}/280
              </span>
            </div>
            <div className="adm-field">
              <label className="adm-field-label">About this opportunity</label>
              <RichEditor value={form.about} onChange={v => update('about', v)} placeholder="Describe the opportunity..." />
            </div>
          </FormSection>

          {/* Section 2: Eligibility */}
          <FormSection num="2" title="Eligibility" collapsed={!!collapsed[2]} onToggle={() => toggleSection(2)}
            summary={isMobile ? sectionSummary[2] : undefined} onNext={isMobile ? () => jumpToSection(3) : undefined}
            sectionRef={el => { sectionRefs.current[2] = el }}>
            <div className="adm-field">
              <label className="adm-field-label">Who it is for</label>
              <RichEditor value={form.whoItIsFor} onChange={v => update('whoItIsFor', v)} placeholder="Who is this opportunity open to?" />
            </div>
            <div className="adm-field">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="adm-field-label" style={{ margin: 0 }}>Eligibility screening questions</label>
                {editId && (
                  <button
                    className="adm-btn adm-btn-ghost adm-btn-sm"
                    onClick={handleGenerateEligibility}
                    disabled={aiGenLoading}
                    style={{ gap: 6 }}
                  >
                    <Sparkles size={13} />
                    {aiGenLoading ? 'Generating...' : keptQuestions.size > 0 ? 'Regenerate unchecked' : 'Generate with AI'}
                  </button>
                )}
              </div>
              <div className="adm-field-help" style={{ marginBottom: 10 }}>
                {editId
                  ? 'AI generates questions from the listing content. Check any question to keep it when regenerating. Edit options and scores freely.'
                  : 'Save the listing first, then use "Generate with AI" to auto-fill questions from the listing content.'}
              </div>
              {aiGenError && (
                <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(220,38,38,0.08)', color: '#DC2626', fontSize: 13, fontFamily: 'var(--adm-font-sans)' }}>
                  {aiGenError}
                </div>
              )}
              <div className="adm-repeat" style={{ gap: 14 }}>
                {form.criteria.map((c, i) => (
                  <div key={i} className="adm-elig-q-block">
                    <div className="adm-rrow" style={{ marginBottom: 8 }}>
                      <span className="adm-qn" style={{ flexShrink: 0 }}>{i + 1}</span>
                      <input
                        className="adm-inp"
                        value={c.question}
                        placeholder="e.g. Are you a citizen of an eligible country?"
                        onChange={e => {
                          const n = [...form.criteria]
                          n[i] = { ...n[i], question: e.target.value }
                          update('criteria', n)
                        }}
                      />
                      {editId && c.question.trim() && (
                        <button
                          title={keptQuestions.has(c.question) ? 'Unpin - will be replaced on next regeneration' : 'Pin - keep this question on next regeneration'}
                          onClick={() => {
                            const next = new Set(keptQuestions)
                            if (next.has(c.question)) next.delete(c.question)
                            else next.add(c.question)
                            setKeptQuestions(next)
                          }}
                          style={{
                            flexShrink: 0, border: 'none', cursor: 'pointer', borderRadius: 6,
                            padding: '4px 8px', fontSize: 10, fontWeight: 600,
                            fontFamily: 'var(--adm-font-sans)',
                            background: keptQuestions.has(c.question) ? 'rgba(5,150,105,0.12)' : 'rgba(160,120,88,0.1)',
                            color: keptQuestions.has(c.question) ? '#059669' : 'var(--adm-t-low)',
                          }}
                        >
                          {keptQuestions.has(c.question) ? 'Pinned' : 'Pin'}
                        </button>
                      )}
                      <button className="adm-rm" onClick={() => {
                        const next = new Set(keptQuestions)
                        next.delete(c.question)
                        setKeptQuestions(next)
                        update('criteria', form.criteria.filter((_, j) => j !== i))
                      }}><X /></button>
                    </div>
                    {(c as { weightRationale?: string }).weightRationale && (
                      <div style={{ paddingLeft: 28, marginBottom: 8, fontSize: 11, color: 'var(--adm-t-low)', fontFamily: 'var(--adm-font-sans)', fontStyle: 'italic' }}>
                        {(c as { weightRationale?: string }).weightRationale}
                      </div>
                    )}
                    <div style={{ paddingLeft: 28 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                        {c.options.map((opt, oi) => (
                          <div key={oi} className="adm-elig-opt">
                            <input
                              className="adm-elig-opt-inp"
                              value={opt.text}
                              placeholder="Option"
                              onChange={e => {
                                const n = [...form.criteria]
                                const opts = [...n[i].options]
                                opts[oi] = { ...opts[oi], text: e.target.value }
                                n[i] = { ...n[i], options: opts }
                                update('criteria', n)
                              }}
                            />
                            <button
                              onClick={() => {
                                const n = [...form.criteria]
                                const opts = [...n[i].options]
                                const cur = opts[oi].score
                                opts[oi] = { ...opts[oi], score: cur === 0 ? -30 : cur === -30 ? -100 : 0 }
                                n[i] = { ...n[i], options: opts }
                                update('criteria', n)
                              }}
                              style={{
                                border: 'none', cursor: 'pointer', borderRadius: 999,
                                padding: '2px 7px', fontSize: 10, fontWeight: 700,
                                fontFamily: 'var(--adm-font-sans)', marginLeft: 4,
                                ...(opt.score === 0
                                  ? { background: 'rgba(160,120,88,0.15)', color: 'var(--adm-t-low)' }
                                  : opt.score === -30
                                  ? { background: 'rgba(212,132,58,0.2)', color: '#D4843A' }
                                  : opt.score <= -100
                                  ? { background: 'rgba(190,60,48,0.18)', color: 'var(--adm-danger-tx)' }
                                  : { background: 'rgba(14,116,144,0.15)', color: '#0E7490' }),
                              }}
                            >
                              {opt.score === 0 ? '0' : opt.score === -30 ? '-30' : opt.score <= -100 ? '-100' : String(opt.score)}
                            </button>
                            {c.options.length > 2 && (
                              <button
                                className="adm-elig-opt-rm"
                                onClick={() => {
                                  const n = [...form.criteria]
                                  n[i] = { ...n[i], options: n[i].options.filter((_, j) => j !== oi) }
                                  update('criteria', n)
                                }}
                              ><X size={10} /></button>
                            )}
                          </div>
                        ))}
                        <button
                          className="adm-elig-opt-add"
                          onClick={() => {
                            const n = [...form.criteria]
                            n[i] = { ...n[i], options: [...n[i].options, { text: '', score: 0 }] }
                            update('criteria', n)
                          }}
                        ><Plus size={11} /> Add option</button>
                      </div>
                      <span style={{ fontSize: 10.5, color: 'var(--adm-t-low)', fontFamily: 'var(--adm-font-sans)' }}>
                        Click score to cycle: 0 (neutral) - 30 (warning) - 100 (disqualifying)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <span className="adm-add-link" onClick={() => update('criteria', [...form.criteria, { question: '', options: [{ text: 'Yes', score: 0 }, { text: 'No', score: -100 }] }])}>
                <Plus /> Add question
              </span>
            </div>
          </FormSection>

          {/* Section 3: What is offered */}
          <FormSection num="3" title="What is offered" collapsed={!!collapsed[3]} onToggle={() => toggleSection(3)}
            summary={isMobile ? sectionSummary[3] : undefined} onNext={isMobile ? () => jumpToSection(4) : undefined}
            sectionRef={el => { sectionRefs.current[3] = el }}>
            <div className="adm-field">
              <label className="adm-field-label">Award / benefit description</label>
              <RichEditor value={form.benefit} onChange={v => update('benefit', v)} placeholder="What does the award include?" />
            </div>
            <div className="adm-field">
              <label className="adm-field-label">Value</label>
              <input className="adm-inp" placeholder="e.g. Full tuition + $1,200/mo stipend + travel allowance"
                defaultValue={''} />
            </div>
            <div className="adm-field">
              <label className="adm-field-label">Funding type</label>
              <div className="adm-chips">
                {FUND_OPTIONS.map(f => (
                  <span key={f} className={`adm-chip${form.funding.includes(f) ? ' on' : ''}`}
                    onClick={() => update('funding', form.funding.includes(f) ? form.funding.filter(x => x !== f) : [...form.funding, f])}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </FormSection>

          {/* Section 4: Fees */}
          <FormSection num="4" title="Fees" collapsed={!!collapsed[4]} onToggle={() => toggleSection(4)} className="adm-fees-sec"
            summary={isMobile ? sectionSummary[4] : undefined} onNext={isMobile ? () => jumpToSection(5) : undefined}
            sectionRef={el => { sectionRefs.current[4] = el }}>
            <div className="adm-field row2">
              <div className="adm-field">
                <label className="adm-field-label">OppDate service fee <span className="adm-req">*</span></label>
                <input className="adm-inp" value={form.oppFee} placeholder="0.00" onChange={e => update('oppFee', e.target.value)} />
                <span className="adm-field-help">The fee OppDate charges the user for this application via OppDate Apply.</span>
              </div>
              <div className="adm-field">
                <label className="adm-field-label">Institution application fee <span className="adm-req">*</span></label>
                <input className="adm-inp" value={form.instFee} placeholder="0.00" onChange={e => update('instFee', e.target.value)} />
                <span className="adm-field-help">The fee charged by the institution. Set to 0.00 for free-to-apply opportunities.</span>
              </div>
            </div>
            <div className="adm-total-due">
              <span className="adm-tl">Total user pays</span>
              <span className="adm-tv">${total}</span>
            </div>
            {isMobile ? (
              <div className="adm-mob-disclosure">
                <button className="adm-mob-disclosure-btn" onClick={() => setFeesAdvancedOpen(!feesAdvancedOpen)}>
                  Advanced {feesAdvancedOpen ? <ChevronDown /> : <ChevronRight />}
                </button>
                {feesAdvancedOpen && (
                  <>
                    <div className="adm-field">
                      <label className="adm-field-label">Institution code <span className="adm-req">*</span></label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <input className="adm-inp mono" style={{ maxWidth: 140, textTransform: 'uppercase' }} maxLength={3}
                          value={form.code} onChange={e => update('code', e.target.value.toUpperCase())} placeholder="CHV" />
                        <span className="adm-add-link" style={{ fontSize: 12 }}><List /> View codes in use</span>
                      </div>
                      <span className="adm-field-help">Used to generate reference IDs. E.g. CHV, MFC, DAD.</span>
                      <span className="adm-refpreview">Reference IDs will look like: <b>OPP-260623-{form.code || 'XXX'}</b></span>
                    </div>
                    {form.vip ? (
                      <div className="adm-field">
                        <label className="adm-field-label">Compliance category <span className="adm-req">*</span></label>
                        <div className={`adm-cat-select${form.cat ? ' ' + form.cat.toLowerCase() : ''}`}>
                          <CustomSelect value={form.cat} placeholder="Select category..."
                            options={[
                              { value: 'A', label: 'Category A: OppDate submits directly' },
                              { value: 'B', label: 'Category B: User completes final submission' },
                            ]}
                            onChange={v => update('cat', v as ComplianceCat)} />
                        </div>
                      </div>
                    ) : (
                      <div className="adm-field">
                        <label className="adm-field-label">Internal note</label>
                        <textarea className="adm-ta" rows={2} placeholder="Optional: note why OppDate Apply is off for this listing..."
                          value={form.internalNote} onChange={e => update('internalNote', e.target.value)} />
                        <span className="adm-field-help">For internal reference only. Not visible to users.</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="adm-field">
                  <label className="adm-field-label">Institution code <span className="adm-req">*</span></label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <input className="adm-inp mono" style={{ maxWidth: 140, textTransform: 'uppercase' }} maxLength={3}
                      value={form.code} onChange={e => update('code', e.target.value.toUpperCase())} placeholder="CHV" />
                    <span className="adm-add-link" style={{ fontSize: 12 }}><List /> View codes in use</span>
                  </div>
                  <span className="adm-field-help">Used to generate reference IDs. E.g. CHV, MFC, DAD.</span>
                  <span className="adm-refpreview">Reference IDs will look like: <b>OPP-260623-{form.code || 'XXX'}</b></span>
                </div>
                {form.vip ? (
                  <div className="adm-field">
                    <label className="adm-field-label">Compliance category <span className="adm-req">*</span></label>
                    <div className={`adm-cat-select${form.cat ? ' ' + form.cat.toLowerCase() : ''}`}>
                      <CustomSelect value={form.cat} placeholder="Select category..."
                        options={[
                          { value: 'A', label: 'Category A: OppDate submits directly' },
                          { value: 'B', label: 'Category B: User completes final submission' },
                        ]}
                        onChange={v => update('cat', v as ComplianceCat)} />
                    </div>
                  </div>
                ) : (
                  <div className="adm-field">
                    <label className="adm-field-label">Internal note</label>
                    <textarea className="adm-ta" rows={2} placeholder="Optional: note why OppDate Apply is off for this listing, e.g. institution does not permit representative submission"
                      value={form.internalNote} onChange={e => update('internalNote', e.target.value)} />
                    <span className="adm-field-help">For internal reference only. Not visible to users.</span>
                  </div>
                )}
              </>
            )}
          </FormSection>

          {/* Section 5: Documents */}
          <FormSection num="5" title="Required documents" collapsed={!!collapsed[5]} onToggle={() => toggleSection(5)}
            summary={isMobile ? sectionSummary[5] : undefined} onNext={isMobile ? () => jumpToSection(6) : undefined}
            sectionRef={el => { sectionRefs.current[5] = el }}>
            <div className="adm-repeat">
              {form.docs.map((doc, i) => {
                return (
                  <div key={i} className="adm-docrow">
                    <div className="adm-docrow-top">
                      <span className="adm-drag"><GripVertical /></span>
                      <input className="adm-inp" value={doc.type} placeholder="Document type, e.g. Personal Statement"
                        onChange={e => { const n = [...form.docs]; n[i] = { ...n[i], type: e.target.value }; update('docs', n) }} />
                      <button className="adm-rm" onClick={() => update('docs', form.docs.filter((_, j) => j !== i))}><X /></button>
                    </div>
                    <div className={`adm-docrow-opts${isMobile ? ' adm-mob-docrow-opts' : ''}`}>
                      <label className="adm-docrow-opt">
                        <Toggle on={doc.required} onToggle={() => { const n = [...form.docs]; n[i] = { ...n[i], required: !n[i].required }; update('docs', n) }} />
                        {doc.required ? 'Required' : 'Optional'}
                      </label>
                      <div className="adm-docrow-opt">
                        <span style={{ color: 'var(--adm-t-low)' }}>Formats:</span>
                        <div className="adm-chips" style={{ gap: 5 }}>
                          {FORMAT_OPTIONS.map(f => (
                            <span key={f} className={`adm-fmt-chip${doc.formats.includes(f) ? ' on' : ''}`}
                              onClick={() => {
                                const n = [...form.docs]
                                n[i] = { ...n[i], formats: doc.formats.includes(f) ? doc.formats.filter(x => x !== f) : [...doc.formats, f] }
                                update('docs', n)
                              }}>
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                      {isMobile ? (
                        docOptionsOpen[i] ? (
                          <>
                            <label className="adm-docrow-opt">
                              <Toggle on={doc.creatable === 'writes'}
                                onToggle={() => { const n = [...form.docs]; n[i] = { ...n[i], creatable: doc.creatable === 'writes' ? false : 'writes' }; update('docs', n) }} />
                              OppDate writes this
                            </label>
                            <label className="adm-docrow-opt">
                              <Toggle on={doc.creatable === 'guides'}
                                onToggle={() => { const n = [...form.docs]; n[i] = { ...n[i], creatable: doc.creatable === 'guides' ? false : 'guides' }; update('docs', n) }} />
                              OppDate guides client to obtain this
                            </label>
                          </>
                        ) : (
                          <button className="adm-mob-doc-options-btn" onClick={() => setDocOptionsOpen(prev => ({ ...prev, [i]: true }))}>
                            Options
                          </button>
                        )
                      ) : (
                        <>
                          <label className="adm-docrow-opt">
                            <Toggle on={doc.creatable === 'writes'}
                              onToggle={() => { const n = [...form.docs]; n[i] = { ...n[i], creatable: doc.creatable === 'writes' ? false : 'writes' }; update('docs', n) }} />
                            OppDate writes this
                          </label>
                          <label className="adm-docrow-opt">
                            <Toggle on={doc.creatable === 'guides'}
                              onToggle={() => { const n = [...form.docs]; n[i] = { ...n[i], creatable: doc.creatable === 'guides' ? false : 'guides' }; update('docs', n) }} />
                            OppDate guides client to obtain this
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {isMobile ? (
              <button className="adm-mob-add-doc-btn" onClick={() => update('docs', [...form.docs, { type: '', required: true, formats: ['PDF'], creatable: false as const }])}>
                <Plus /> Add document
              </button>
            ) : (
              <span className="adm-add-link" onClick={() => update('docs', [...form.docs, { type: '', required: true, formats: ['PDF'], creatable: false as const }])}>
                <Plus /> Add document
              </span>
            )}
          </FormSection>

          {/* Section 6: Dates */}
          <FormSection num="6" title="Dates" collapsed={!!collapsed[6]} onToggle={() => toggleSection(6)}
            summary={isMobile ? sectionSummary[6] : undefined} onNext={isMobile ? () => jumpToSection(7) : undefined}
            sectionRef={el => { sectionRefs.current[6] = el }}>
            <div className="adm-field row2">
              <div className="adm-field">
                <label className="adm-field-label">Application deadline <span className="adm-req">*</span></label>
                <DatePicker value={deadlineDate} onChange={setDeadlineDate} required />
              </div>
              <div className="adm-field">
                <label className="adm-field-label">Time &amp; timezone</label>
                <div className={isMobile ? 'adm-mob-time-tz' : ''} style={!isMobile ? { display: 'flex', gap: 8 } : undefined}>
                  <TimePicker value={deadlineTime} onChange={setDeadlineTime} />
                  <CustomSelect value={deadlineTz} placeholder="Timezone"
                    options={TZ_OPTIONS.map(t => ({ value: t, label: t }))} onChange={setDeadlineTz} />
                </div>
              </div>
            </div>
            <div className="adm-field">
              <label className="adm-field-label">Other key dates</label>
              <div className="adm-repeat">
                {form.dates.map((d, i) => (
                  <div key={i} className="adm-keydate">
                    <input className="adm-inp" value={d.label} placeholder="Label"
                      onChange={e => { const n = [...form.dates]; n[i] = { ...n[i], label: e.target.value }; update('dates', n) }} />
                    <DatePicker value={d.date}
                      onChange={v => { const n = [...form.dates]; n[i] = { ...n[i], date: v }; update('dates', n) }} />
                    <button className="adm-rm" onClick={() => update('dates', form.dates.filter((_, j) => j !== i))}><X /></button>
                  </div>
                ))}
              </div>
              <span className="adm-add-link" onClick={() => update('dates', [...form.dates, { label: '', date: '' }])}><Plus /> Add date</span>
            </div>
            <div className="adm-setrow">
              <div>
                <div className="adm-sl">Auto-archive on deadline expiry</div>
                <div className="adm-sd">Listing will be automatically archived when the deadline passes.</div>
              </div>
              <Toggle on={true} />
            </div>
          </FormSection>

          {/* Section 7: Links */}
          <FormSection num="7" title="Links" collapsed={!!collapsed[7]} onToggle={() => toggleSection(7)}
            summary={isMobile ? sectionSummary[7] : undefined} onNext={isMobile ? () => jumpToSection(8) : undefined}
            sectionRef={el => { sectionRefs.current[7] = el }}>
            <div className="adm-field">
              <label className="adm-field-label">Source URL</label>
              <input className="adm-inp" placeholder="https://..." defaultValue={''} />
            </div>
            <div className="adm-setrow">
              <div>
                <div className="adm-sl">OppDate Apply enabled</div>
                <div className="adm-sd">
                  Disable to publish informational listings without opening the application flow.
                </div>
              </div>
              <Toggle on={form.vip}
                onToggle={() => {
                  const next = !form.vip
                  update('vip', next)
                  if (!next) update('cat', '')
                }} />
            </div>
            {!form.vip && (
              <div className="adm-setrow" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="adm-sl">Apply disabled note</div>
                    <div className="adm-sd">
                      Show a note on the listing explaining why OppDate Apply is unavailable and suggest mentorship.
                    </div>
                  </div>
                  <Toggle on={!!form.applyDisabledNote}
                    onToggle={() => update('applyDisabledNote', form.applyDisabledNote ? '' : 'This opportunity requires applications to be submitted directly through their own portal. We recommend using our mentorship service for guided support with your application.')} />
                </div>
                {!!form.applyDisabledNote && (
                  <textarea
                    className="adm-inp"
                    rows={3}
                    value={form.applyDisabledNote}
                    onChange={e => update('applyDisabledNote', e.target.value)}
                    placeholder="Explain why OppDate Apply isn't available for this opportunity..."
                    style={{ resize: 'vertical', minHeight: 72 }}
                  />
                )}
              </div>
            )}
          </FormSection>

          {/* Section 8: Visibility */}
          <FormSection num="8" title="Visibility" collapsed={!!collapsed[8]} onToggle={() => toggleSection(8)}
            summary={isMobile ? sectionSummary[8] : undefined}
            sectionRef={el => { sectionRefs.current[8] = el }}>
            {role === 'founder' && (
              <div className="adm-setrow">
                <div>
                  <div className="adm-sl">Featured listing</div>
                  <div className="adm-sd">Pins to the top of the listings feed.</div>
                </div>
                <Toggle on={form.featured} onToggle={() => update('featured', !form.featured)} />
              </div>
            )}
            <div className="adm-setrow">
              <div>
                <div className="adm-sl">OppDate Apply badge</div>
                <div className="adm-sd">Shows a &ldquo;+ OppDate Apply&rdquo; pill on the listing card.</div>
              </div>
              <Toggle on={form.vip} />
            </div>
          </FormSection>
        </div>

        {/* summary card (desktop only) */}
        {!isMobile && (
          <div className="adm-formside enter">
            <div className="adm-summary">
              <div className="adm-summary-h">Live preview</div>
              <div className="adm-summary-body">
                <div>
                  <div className="adm-sum-title">{form.title || 'Untitled listing'}</div>
                  <div className="adm-sum-inst">{form.inst || 'No institution yet'}</div>
                </div>
                <div className="adm-sum-badges">
                  {form.type && <span className="adm-typebadge">{form.type}</span>}
                  {form.cat && <CatBadge cat={form.cat as ComplianceCat} />}
                  <StatusBadge status={form.status} />
                </div>
                <div className="adm-sum-fees">
                  <div className="adm-sum-feeline"><span className="adm-k">OppDate fee</span><span className="adm-v">${oppN.toFixed(2)}</span></div>
                  <div className="adm-sum-feeline"><span className="adm-k">Institution fee</span><span className="adm-v">${instN.toFixed(2)}</span></div>
                  <div className="adm-sum-feeline tot"><span className="adm-k">Total due</span><span className="adm-v">${total}</span></div>
                </div>
                <div className="adm-sum-vip"><span>OppDate Apply</span><span>{form.vip ? 'Enabled' : 'Disabled'}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* preview bottom sheet (mobile) */}
      {isMobile && previewSheetOpen && createPortal(
        <>
          <div className="adm-bsheet-backdrop show" onClick={() => setPreviewSheetOpen(false)} />
          <div className="adm-bsheet show adm-mob-preview-sheet">
            <div className="adm-bsheet-handle" />
            <div className="adm-bsheet-head">
              <h3>Live preview</h3>
              <button className="adm-iconbtn" onClick={() => setPreviewSheetOpen(false)}><X /></button>
            </div>
            <div className="adm-bsheet-body">
              <div className="adm-summary-body">
                <div>
                  <div className="adm-sum-title">{form.title || 'Untitled listing'}</div>
                  <div className="adm-sum-inst">{form.inst || 'No institution yet'}</div>
                </div>
                <div className="adm-sum-badges">
                  {form.type && <span className="adm-typebadge">{form.type}</span>}
                  {form.cat && <CatBadge cat={form.cat as ComplianceCat} />}
                  <StatusBadge status={form.status} />
                </div>
                <div className="adm-sum-fees">
                  <div className="adm-sum-feeline"><span className="adm-k">OppDate fee</span><span className="adm-v">${oppN.toFixed(2)}</span></div>
                  <div className="adm-sum-feeline"><span className="adm-k">Institution fee</span><span className="adm-v">${instN.toFixed(2)}</span></div>
                  <div className="adm-sum-feeline tot"><span className="adm-k">Total due</span><span className="adm-v">${total}</span></div>
                </div>
                <div className="adm-sum-vip"><span>OppDate Apply</span><span>{form.vip ? 'Enabled' : 'Disabled'}</span></div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* sticky footer */}
      <div className="adm-form-footer">
        {issues.length > 0 && (
          isMobile ? (
            <div className="adm-mob-ff-issues">
              <AlertTriangle />
              <span>{issues.length} issue{issues.length === 1 ? '' : 's'} to fix - {issues[0]}</span>
            </div>
          ) : (
            <div className="adm-ff-issues">
              <AlertTriangle />
              <div>
                <b>Fix {issues.length} issue{issues.length === 1 ? '' : 's'} before publishing:</b>
                <ul>{issues.map((iss, i) => <li key={i}>{iss}</li>)}</ul>
              </div>
            </div>
          )
        )}
        {isMobile ? (
          <div className="adm-ff-bar adm-mob-ff-bar">
            <div className="adm-ff-right adm-mob-ff-right">
              <button className={`adm-btn adm-btn-primary adm-mob-ff-publish${issues.length ? ' disabled' : ''}`}
                onClick={() => { if (!issues.length) onSaved('published', form, deadlineDate ? `${deadlineDate}T${deadlineTime || '23:59'}:00Z` : new Date().toISOString()) }}>
                <Check /> Publish listing
              </button>
              <button className="adm-mob-ff-draft" onClick={() => onSaved('draft', form, deadlineDate ? `${deadlineDate}T${deadlineTime || '23:59'}:00Z` : new Date().toISOString())}>Save as draft</button>
            </div>
          </div>
        ) : (
          <div className="adm-ff-bar">
            <span className="adm-ff-preview"><Eye /> Preview listing</span>
            <div className="adm-ff-right">
              <button className="adm-btn adm-btn-ghost" onClick={() => onSaved('draft', form, deadlineDate ? `${deadlineDate}T${deadlineTime || '23:59'}:00Z` : new Date().toISOString())} disabled={saving}>Save as draft</button>
              <button className={`adm-btn adm-btn-primary${issues.length || saving ? ' disabled' : ''}`}
                onClick={() => { if (!issues.length && !saving) onSaved('published', form, deadlineDate ? `${deadlineDate}T${deadlineTime || '23:59'}:00Z` : new Date().toISOString()) }}>
                <Check /> {saving ? 'Saving...' : 'Publish listing'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ---- CSV IMPORT MODAL ----

const CSV_REQUIRED_COLS = ['title', 'type', 'institution', 'country', 'region', 'summary', 'description', 'whoItsFor', 'whatIsOffered', 'deadline']

interface CsvRow { title: string; type: string; institution: string; country: string; region: string; summary: string; description: string; whoItsFor: string; whatIsOffered: string; deadline: string }

function parseCSV(text: string): { rows: CsvRow[]; error: string | null } {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { rows: [], error: 'CSV must have a header row and at least one data row.' }
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const missing = CSV_REQUIRED_COLS.filter(c => !headers.includes(c))
  if (missing.length > 0) return { rows: [], error: `Missing columns: ${missing.join(', ')}` }
  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = vals[idx] || '' })
    rows.push(row as unknown as CsvRow)
  }
  return { rows, error: null }
}

function CsvImportModal({ onClose, onImported }: { onClose: () => void; onImported: (count: number) => void }) {
  const [stage, setStage] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload')
  const [rows, setRows] = useState<CsvRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { rows: parsed, error } = parseCSV(text)
      if (error) { setParseError(error); return }
      setParseError(null)
      setRows(parsed)
      setStage('preview')
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleImport = async () => {
    setStage('importing')
    setImportError(null)
    try {
      const res = await api.post('/api/v1/admin/opportunities/import', rows)
      const count = res.data.data?.imported ?? rows.length
      setImportedCount(count)
      setStage('done')
      onImported(count)
    } catch {
      setImportError('Import failed. Please check your data and try again.')
      setStage('preview')
    }
  }

  return createPortal(
    <div className="adm-modal-backdrop" onClick={onClose}>
      <div className="adm-modal adm-csv-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-head">
          <h2>Bulk CSV import</h2>
          <button className="adm-modal-close" onClick={onClose}><X /></button>
        </div>

        {stage === 'upload' && (
          <div className="adm-modal-body">
            <p className="adm-csv-hint">Upload a CSV file with opportunity data. Required columns: <code>{CSV_REQUIRED_COLS.join(', ')}</code></p>
            <div
              className="adm-csv-dropzone"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="adm-csv-dz-ico" />
              <div className="adm-csv-dz-label">Drop CSV here or click to browse</div>
              <div className="adm-csv-dz-sub">Only .csv files are accepted</div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
            </div>
            {parseError && <div className="adm-csv-error"><AlertTriangle /> {parseError}</div>}
          </div>
        )}

        {stage === 'preview' && (
          <>
            <div className="adm-modal-body adm-csv-preview-body">
              <div className="adm-csv-preview-bar">
                <span className="adm-csv-preview-count">{rows.length} row{rows.length !== 1 ? 's' : ''} ready to import</span>
                <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => { setRows([]); setStage('upload') }}>Change file</button>
              </div>
              {importError && <div className="adm-csv-error"><AlertTriangle /> {importError}</div>}
              <div className="adm-csv-table-wrap">
                <table className="adm-csv-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Institution</th>
                      <th>Country</th>
                      <th>Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((r, i) => (
                      <tr key={i}>
                        <td className="adm-csv-num">{i + 1}</td>
                        <td>{r.title}</td>
                        <td>{r.type}</td>
                        <td>{r.institution}</td>
                        <td>{r.country}</td>
                        <td>{r.deadline}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 20 && <div className="adm-csv-overflow">...and {rows.length - 20} more rows</div>}
              </div>
            </div>
            <div className="adm-modal-foot">
              <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancel</button>
              <button className="adm-btn adm-btn-primary" onClick={handleImport}>Import {rows.length} listing{rows.length !== 1 ? 's' : ''}</button>
            </div>
          </>
        )}

        {stage === 'importing' && (
          <div className="adm-modal-body adm-csv-loading">
            <div className="adm-spinner" />
            <p>Importing {rows.length} listing{rows.length !== 1 ? 's' : ''}...</p>
          </div>
        )}

        {stage === 'done' && (
          <div className="adm-modal-body adm-csv-done">
            <CheckCircle className="adm-csv-done-ico" />
            <h3>{importedCount} listing{importedCount !== 1 ? 's' : ''} imported</h3>
            <p>All imported listings are saved as drafts. Review and publish them from the main list.</p>
            <button className="adm-btn adm-btn-primary" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// ---- AUTO-ARCHIVE SETTINGS MODAL ----

interface ArchiveSettings { enabled: boolean; daysAfterDeadline: number; applyToStatuses: string[] }

function AutoArchiveModal({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<ArchiveSettings>({ enabled: false, daysAfterDeadline: 7, applyToStatuses: ['expired'] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get('/api/v1/admin/opportunities/archive-settings')
      .then(r => { setSettings(r.data.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await api.patch('/api/v1/admin/opportunities/archive-settings', settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setSaveError('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = (s: string) => {
    setSettings(prev => ({
      ...prev,
      applyToStatuses: prev.applyToStatuses.includes(s)
        ? prev.applyToStatuses.filter(x => x !== s)
        : [...prev.applyToStatuses, s],
    }))
  }

  return createPortal(
    <div className="adm-modal-backdrop" onClick={onClose}>
      <div className="adm-modal adm-aa-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-head">
          <h2>Auto-archive settings</h2>
          <button className="adm-modal-close" onClick={onClose}><X /></button>
        </div>

        {loading ? (
          <div className="adm-modal-body adm-csv-loading"><div className="adm-spinner" /></div>
        ) : (
          <>
            <div className="adm-modal-body">
              <p className="adm-aa-desc">Automatically archive listings that meet the selected criteria. This runs nightly.</p>

              <div className="adm-aa-row">
                <div className="adm-aa-row-info">
                  <div className="adm-aa-row-label">Enable auto-archive</div>
                  <div className="adm-aa-row-sub">When enabled, qualifying listings are archived automatically each night.</div>
                </div>
                <Toggle on={settings.enabled} onToggle={() => setSettings(p => ({ ...p, enabled: !p.enabled }))} />
              </div>

              <div className={`adm-aa-fields${settings.enabled ? '' : ' disabled'}`}>
                <div className="adm-aa-field">
                  <label className="adm-aa-label">Archive listings this many days after deadline</label>
                  <div className="adm-aa-num-row">
                    <button className="adm-aa-num-btn" onClick={() => setSettings(p => ({ ...p, daysAfterDeadline: Math.max(1, p.daysAfterDeadline - 1) }))}>-</button>
                    <span className="adm-aa-num-val">{settings.daysAfterDeadline}</span>
                    <button className="adm-aa-num-btn" onClick={() => setSettings(p => ({ ...p, daysAfterDeadline: Math.min(365, p.daysAfterDeadline + 1) }))}>+</button>
                    <span className="adm-aa-num-unit">day{settings.daysAfterDeadline !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="adm-aa-field">
                  <label className="adm-aa-label">Apply to listing statuses</label>
                  <div className="adm-aa-checks">
                    {(['expired', 'draft'] as const).map(s => (
                      <label key={s} className="adm-aa-check">
                        <input type="checkbox" checked={settings.applyToStatuses.includes(s)} onChange={() => toggleStatus(s)} />
                        <span>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {saveError && <div className="adm-csv-error" style={{ marginTop: 16 }}><AlertTriangle /> {saveError}</div>}
              {saved && <div className="adm-aa-saved"><CheckCircle /> Settings saved.</div>}
            </div>

            <div className="adm-modal-foot">
              <button className="adm-btn adm-btn-ghost" onClick={onClose}>Close</button>
              <button className="adm-btn adm-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save settings'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

// ---- MAIN PAGE ----
export function AdminOpportunitiesPage() {
  const role: UserRole = 'founder'
  const queryClient = useQueryClient()
  const [view, setView] = useState<'list' | 'form'>('list')
  const [editId, setEditId] = useState<string | null>(null)
  const [qvId, setQvId] = useState<string | null>(null)

  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [csvModalOpen, setCsvModalOpen] = useState(false)
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3500)
  }, [])

  const { data: apiListings, isLoading } = useQuery<ApiOpportunity[]>({
    queryKey: ['admin-opportunities'],
    queryFn: () => api.get('/api/v1/admin/opportunities?limit=100').then(r => r.data.data),
  })

  const listings: Listing[] = useMemo(
    () => (apiListings ?? []).map(apiToListing),
    [apiListings]
  )

  const adminAuthHeader = () => {
    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('oppdate_admin_token') ?? localStorage.getItem('oppdate_token'))
      : undefined
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string | null; payload: Record<string, unknown> }) =>
      id
        ? api.patch(`/api/v1/opportunities/${id}`, payload, { headers: adminAuthHeader() }).then(r => r.data)
        : api.post('/api/v1/opportunities', payload, { headers: adminAuthHeader() }).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-opportunities'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/opportunities/${id}`, { headers: adminAuthHeader() }).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-opportunities'] }),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.patch(`/api/v1/admin/opportunities/${id}/apply-toggle`, { enabled }).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-opportunities'] }),
  })

  const searchParams = useSearchParams()
  const router = useRouter()
  const [statusFilter, setStatusFilterState] = useState(() => searchParams.get('status') || 'all')
  const [typeFilter, setTypeFilterState] = useState(() => searchParams.get('type') || 'all')

  const setStatusFilter = useCallback((v: string) => {
    setStatusFilterState(v)
    const p = new URLSearchParams(window.location.search)
    if (v === 'all') p.delete('status'); else p.set('status', v)
    router.replace(`?${p.toString()}`, { scroll: false })
    setTimeout(() => {
      const el = document.querySelector('.adm-filterbar') as HTMLElement | null
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
  }, [router])

  const setTypeFilter = useCallback((v: string) => {
    setTypeFilterState(v)
    const p = new URLSearchParams(window.location.search)
    if (v === 'all') p.delete('type'); else p.set('type', v)
    router.replace(`?${p.toString()}`, { scroll: false })
    setTimeout(() => {
      const el = document.querySelector('.adm-filterbar') as HTMLElement | null
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
  }, [router])

  // Listen for sidebar action events
  useEffect(() => {
    const actionHandler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      if (detail === 'list') { setView('list'); setEditId(null) }
      if (detail === 'create') { setEditId(null); setView('form') }
      if (detail === 'csv') setCsvModalOpen(true)
      if (detail === 'autoarchive') setArchiveModalOpen(true)
    }
    const filterHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ status?: string; type?: string }>).detail
      if (detail.status !== undefined) setStatusFilterState(detail.status)
      if (detail.type !== undefined) setTypeFilterState(detail.type)
    }
    window.addEventListener('adm-opp-action', actionHandler)
    window.addEventListener('adm-opp-filter', filterHandler)
    return () => {
      window.removeEventListener('adm-opp-action', actionHandler)
      window.removeEventListener('adm-opp-filter', filterHandler)
    }
  }, [])

  const handleNew = useCallback(() => { setEditId(null); setView('form') }, [])
  const handleEdit = useCallback((id: string) => { setEditId(id); setQvId(null); setView('form') }, [])
  const handleBack = useCallback(() => { setView('list'); setEditId(null) }, [])
  const handleSaved = useCallback((kind: 'published' | 'draft', formData: FormData, deadlineIso: string) => {
    const typeKey = Object.entries(TYPE_LABEL).find(([, v]) => v === formData.type)?.[0] || formData.type.toLowerCase()
    const payload = {
      title: formData.title,
      type: typeKey,
      institution: formData.inst,
      country: formData.country,
      region: formData.country,
      summary: formData.summary || formData.title,
      description: formData.about || formData.summary || formData.title,
      whoItsFor: formData.whoItIsFor || 'Open to all',
      whatIsOffered: formData.benefit || formData.funding.join(', ') || 'See listing for details',
      eligibilityCriteria: formData.criteria
        .filter(c => c.question?.trim())
        .map(c => ({
          question: c.question,
          options: c.options.filter(o => o.text.trim()),
          ...(c.weightRationale ? { weightRationale: c.weightRationale } : {}),
        })),
      requiredDocuments: formData.docs.map(d => ({ type: d.type, required: d.required, formats: d.formats, creatable: d.creatable || undefined })),
      deadline: deadlineIso,
      oppdateServiceFeeUsd: Math.round(parseFloat(formData.oppFee || '0') * 100),
      institutionFeeUsd: Math.round(parseFloat(formData.instFee || '0') * 100),
      oppDateApply: formData.vip,
      applyDisabledNote: formData.applyDisabledNote || null,
      complianceCategory: formData.cat || null,
      featured: formData.featured,
      status: kind,
      tags: [],
      ...(formData.institutionLogoUrl.trim() && { institutionLogoUrl: formData.institutionLogoUrl.trim() }),
    }
    saveMutation.mutate(
      { id: editId, payload },
      {
        onSuccess: () => {
          setView('list')
          const wasEditing = !!editId
          setEditId(null)
          if (kind === 'published') {
            showToast(wasEditing ? 'Listing updated and published.' : 'Listing published.')
          } else {
            showToast(wasEditing ? 'Changes saved as draft.' : 'Saved as draft.')
          }
        },
        onError: (err: unknown) => showToast(extractApiError(err, 'Failed to save listing. Please try again.')),
      }
    )
  }, [editId, saveMutation, showToast])

  const qvListing = qvId ? listings.find(l => l.id === qvId) || null : null
  const qvApiOpp = qvId ? (apiListings ?? []).find(o => o.id === qvId) || null : null

  const handleDelete = useCallback((id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => { if (qvId === id) setQvId(null) },
      onError: (err: unknown) => showToast(extractApiError(err, 'Failed to delete listing.')),
    })
  }, [deleteMutation, qvId, showToast])

  const handleArchive = useCallback((id: string) => {
    api.patch(`/api/v1/opportunities/${id}`, { status: 'archived' }, { headers: adminAuthHeader() })
      .then(() => queryClient.invalidateQueries({ queryKey: ['admin-opportunities'] }))
      .catch((err: unknown) => showToast(extractApiError(err, 'Failed to archive listing.')))
  }, [queryClient, showToast])

  const handleBulkPublish = useCallback((ids: string[]) => {
    Promise.all(ids.map(id => api.patch(`/api/v1/opportunities/${id}`, { status: 'published' }, { headers: adminAuthHeader() })))
      .then(() => queryClient.invalidateQueries({ queryKey: ['admin-opportunities'] }))
      .catch(() => showToast('Some listings could not be published.'))
  }, [queryClient, showToast])

  const handleBulkArchive = useCallback((ids: string[]) => {
    Promise.all(ids.map(id => api.patch(`/api/v1/opportunities/${id}`, { status: 'archived' }, { headers: adminAuthHeader() })))
      .then(() => queryClient.invalidateQueries({ queryKey: ['admin-opportunities'] }))
      .catch(() => showToast('Some listings could not be archived.'))
  }, [queryClient, showToast])

  const handleBulkDelete = useCallback((ids: string[]) => {
    Promise.all(ids.map(id => api.delete(`/api/v1/opportunities/${id}`, { headers: adminAuthHeader() })))
      .then(() => queryClient.invalidateQueries({ queryKey: ['admin-opportunities'] }))
      .catch(() => showToast('Some listings could not be deleted.'))
  }, [queryClient, showToast])

  const handleToggleApply = useCallback((id: string, enabled: boolean) => {
    toggleMutation.mutate({ id, enabled }, {
      onError: (err: unknown) => showToast(extractApiError(err, 'Failed to update OppDate Apply setting.')),
    })
  }, [toggleMutation, showToast])

  if (isLoading) {
    return (
      <>
        <div className="adm-page-head">
          <div><div className="adm-skel adm-skel-line w40" style={{ height: 24, marginBottom: 8 }} /><div className="adm-skel adm-skel-line w25" style={{ height: 14 }} /></div>
          <div style={{ display: 'flex', gap: 10 }}><div className="adm-skel adm-skel-pill" /><div className="adm-skel adm-skel-pill" /><div className="adm-skel adm-skel-pill" /></div>
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
              <div className="adm-skel adm-skel-line w25" style={{ height: 14 }} />
              <div className="adm-skel adm-skel-line w15" style={{ height: 14 }} />
              <div className="adm-skel adm-skel-badge" />
            </div>
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      {csvModalOpen && (
        <CsvImportModal
          onClose={() => setCsvModalOpen(false)}
          onImported={(count) => {
            setCsvModalOpen(false)
            queryClient.invalidateQueries({ queryKey: ['admin-opportunities'] })
            showToast(`${count} listing${count !== 1 ? 's' : ''} imported as drafts.`)
          }}
        />
      )}
      {archiveModalOpen && (
        <AutoArchiveModal onClose={() => setArchiveModalOpen(false)} />
      )}

      {/* error/info toast */}
      {toastMsg && (
        <div className="adm-toast">{toastMsg}</div>
      )}

      {view === 'list' ? (
        <ListView
          listings={listings} role={role}
          onNew={handleNew} onEdit={handleEdit} onQuickView={id => setQvId(id)}
          onDelete={handleDelete} onArchive={handleArchive} onToggleApply={handleToggleApply}
          onBulkPublish={handleBulkPublish} onBulkArchive={handleBulkArchive} onBulkDelete={handleBulkDelete}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          typeFilter={typeFilter} setTypeFilter={setTypeFilter}
          onViewApplications={(id) => router.push(`/admin/applications?opportunity=${id}`)}
        />
      ) : (
        <FormView editId={editId} listings={listings} apiListings={apiListings ?? []} role={role} onBack={handleBack} onSaved={handleSaved} saving={saveMutation.isPending} />
      )}

      <QuickViewPanel listing={qvListing} apiOpp={qvApiOpp} role={role} onClose={() => setQvId(null)} onEdit={handleEdit} onDelete={handleDelete} onArchive={handleArchive} onToggleApply={handleToggleApply} onViewApplications={(id) => router.push(`/admin/applications?opportunity=${id}`)} />
    </>
  )
}
