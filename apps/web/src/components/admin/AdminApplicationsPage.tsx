'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  Search,
  ChevronDown,
  Check,
  Copy,
  ArrowRight,
  Eye,
  ArrowLeft,
  ClipboardCheck,
  AlertCircle,
  Shield,
  ShieldCheck,
  Send,
  Download,
  RotateCw,
  FileText,
  CheckCircle,
  XCircle,
  Upload,
  Lock,
  Star,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  UserPlus,
  CreditCard,
  FileCheck,
  PackageCheck,
  Building2,
  MessageSquare,
  MoreVertical,
  Users,
  X,
  Calendar,
  Globe,
} from 'lucide-react'

// ============================================================
//  SHARED TYPES
// ============================================================

type Stage = 'payment' | 'assigned' | 'review' | 'verified' | 'preparing' | 'submitted' | 'withdrawn'
type Role = 'founder' | 'manager' | 'staff'

// ============================================================
//  API TYPES & MAPPING
// ============================================================

interface ApiAdminApplication {
  id: string
  userId: string
  opportunityId: string
  status: string
  currentStep: number | null
  eligibilityResponses: Record<string, unknown>
  paymentId: string | null
  referenceId: string | null
  authorizationAgreementId: string | null
  assignedTo: string | null
  submittedAt: string | null
  resolvedAt: string | null
  adminNotes: string | null
  createdAt: string
  updatedAt: string
  // joined fields
  userName: string | null
  userEmail: string | null
  userAvatarUrl: string | null
  oppTitle: string | null
  oppType: string | null
  oppInstitution: string | null
  oppInstitutionCode: string | null
  oppCountry: string | null
  oppDeadline: string | null
  oppComplianceCategory: 'A' | 'B' | null
  oppServiceFeeUsd: number | null
  oppInstitutionFeeUsd: number | null
  assigneeName: string | null
  assigneeEmail: string | null
  assigneeAvatarUrl: string | null
}

interface ApiListResponse {
  data: ApiAdminApplication[]
  total: number
  page: number
  limit: number
  totalPages: number
  stageCounts: Record<string, number>
}

// Maps DB status enum values to internal Stage keys used by the UI pipeline
const DB_STATUS_TO_STAGE: Record<string, Stage> = {
  eligibility_screening: 'payment',
  document_collection: 'payment',
  awaiting_payment: 'payment',
  payment_confirmed: 'payment',
  submitted: 'submitted',
  under_review: 'review',
  decision_pending: 'verified',
  accepted: 'submitted',
  rejected: 'withdrawn',
  withdrawn: 'withdrawn',
}

// Display label for each DB status (shown in StageBadge and table)
const DB_STATUS_LABEL: Record<string, string> = {
  eligibility_screening: 'Awaiting Payment',
  document_collection: 'Awaiting Payment',
  awaiting_payment: 'Awaiting Payment',
  payment_confirmed: 'Payment Confirmed',
  submitted: 'Submitted',
  under_review: 'Under Review',
  decision_pending: 'Decision Pending',
  accepted: 'Completed',
  rejected: 'Completed',
  withdrawn: 'Withdrawn',
}

// Maps UI pipeline Stage to the DB status that represents advancing one step.
// Must match VALID_TRANSITIONS on the server: payment_confirmed → submitted → under_review → decision_pending → accepted
const STAGE_ADVANCE_DB_STATUS: Record<Stage, string> = {
  payment:   'under_review',     // payment_confirmed → under_review
  assigned:  'under_review',     // payment_confirmed → under_review
  review:    'decision_pending', // under_review → decision_pending
  verified:  'submitted',        // decision_pending → submitted
  preparing: 'accepted',         // submitted → accepted
  submitted: 'accepted',
  withdrawn: 'withdrawn',
}

// Maps UI pipeline Stage to the DB status for withdrawal
const STAGE_WITHDRAW_DB_STATUS = 'withdrawn'

// Maps destination Stage key to the DB status it represents (for jump-to)
const STAGE_TO_DB_STATUS: Record<Stage, string> = {
  payment:   'payment_confirmed',
  assigned:  'under_review',
  review:    'under_review',
  verified:  'decision_pending',
  preparing: 'submitted',
  submitted: 'accepted',
  withdrawn: 'withdrawn',
}

// Maps UI pipeline Stage to the DB status values to query
const FILTER_TO_DB_STATUSES: Record<string, string[]> = {
  all: [],
  payment: ['payment_confirmed'],
  // assigned/review/verified/preparing are internal sub-stages not in the DB; map to closest equivalents
  assigned: ['payment_confirmed'],
  review: ['under_review'],
  verified: ['decision_pending'],
  preparing: ['submitted'],
  submitted: ['accepted'],
  withdrawn: ['withdrawn', 'rejected'],
}

const OPP_TYPE_LABEL: Record<string, string> = {
  internship: 'Internship', scholarship: 'Scholarship', training_bootcamp: 'Training',
  entry_level_job: 'Job', fellowship: 'Fellowship', grant: 'Research Grant',
  volunteering: 'Volunteering', competition: 'Competition', relocation: 'Relocation',
}

const COUNTRY_FLAG_MAP: Record<string, string> = {
  'United Kingdom': '\u{1F1EC}\u{1F1E7}', 'Canada': '\u{1F1E8}\u{1F1E6}',
  'United States': '\u{1F1FA}\u{1F1F8}', 'Germany': '\u{1F1E9}\u{1F1EA}',
  'China': '\u{1F1E8}\u{1F1F3}', 'South Africa': '\u{1F1FF}\u{1F1E6}',
  'Portugal': '\u{1F1F5}\u{1F1F9}', 'France': '\u{1F1EB}\u{1F1F7}',
  'Australia': '\u{1F1E6}\u{1F1FA}', 'Nigeria': '\u{1F1F3}\u{1F1EC}',
  'Kenya': '\u{1F1F0}\u{1F1EA}', 'Ghana': '\u{1F1EC}\u{1F1ED}',
  'India': '\u{1F1EE}\u{1F1F3}', 'Brazil': '\u{1F1E7}\u{1F1F7}',
  'Netherlands': '\u{1F1F3}\u{1F1F1}', 'Sweden': '\u{1F1F8}\u{1F1EA}',
}

// Convert an API application to the internal App shape used by the UI
function apiAppToApp(a: ApiAdminApplication): App {
  const stage: Stage = DB_STATUS_TO_STAGE[a.status] ?? 'payment'
  const ref = a.referenceId ?? a.id.slice(0, 8).toUpperCase()
  const name = a.userName ?? '\u2014'
  const initials = name !== '\u2014' ? nameInitials(name) : ref.slice(0, 2).toUpperCase()
  const country = a.oppCountry ?? '\u2014'
  const daysLeftVal = a.oppDeadline
    ? Math.floor((new Date(a.oppDeadline).getTime() - Date.now()) / 86400000)
    : 0
  return {
    id: a.id,
    name,
    email: a.userEmail ?? '\u2014',
    initials,
    avatarUrl: a.userAvatarUrl ?? null,
    ref,
    opp: a.oppTitle ?? '\u2014',
    inst: a.oppInstitution ?? '\u2014',
    instFlag: COUNTRY_FLAG_MAP[country] || '\u{1F310}',
    flag: COUNTRY_FLAG_MAP[country] || '\u{1F310}',
    country,
    registered: new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    type: a.oppType ? (OPP_TYPE_LABEL[a.oppType] || a.oppType) : '\u2014',
    stage,
    dbStatus: a.status,
    cat: a.oppComplianceCategory ?? 'B',
    signed: !!a.authorizationAgreementId,
    assigneeId: a.assignedTo ?? null,
    assignee: a.assigneeName ?? null,
    assigneeEmail: a.assigneeEmail ?? null,
    assigneeAvatarUrl: a.assigneeAvatarUrl ?? null,
    updated: formatRelative(a.updatedAt),
    deadline: a.oppDeadline
      ? new Date(a.oppDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '\u2014',
    daysLeft: daysLeftVal,
    serviceFee: a.oppServiceFeeUsd ?? 0,
    instFee: a.oppInstitutionFeeUsd ?? 0,
    adminNotes: a.adminNotes,
  }
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

// ============================================================
//  MOCK DATA
// ============================================================

const STAGES: { key: Stage; label: string; color: string; tip: string }[] = [
  { key: 'payment', label: 'Payment Confirmed', color: '#B5530A', tip: 'Payment received, application awaiting staff assignment.' },
  { key: 'assigned', label: 'Application Assigned', color: '#0E7490', tip: 'Application has been assigned to a team member for processing.' },
  { key: 'review', label: 'Documents Under Review', color: '#D97706', tip: 'Documents are being checked for completeness and quality.' },
  { key: 'verified', label: 'Documents Verified', color: '#059669', tip: 'All documents approved. Preparing the final submission package.' },
  { key: 'preparing', label: 'Preparing Submission', color: '#7C3AED', tip: 'Final submission package is being assembled.' },
  { key: 'submitted', label: 'Submitted', color: '#34D399', tip: 'Application has been submitted to the institution.' },
]

const ALL_FILTER_STAGES: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  ...STAGES,
  { key: 'withdrawn', label: 'Withdrawn' },
]

const STAGE_KEYS: Stage[] = ['payment', 'assigned', 'review', 'verified', 'preparing', 'submitted']

type App = {
  id: string
  name: string
  email: string
  initials: string
  avatarUrl: string | null
  ref: string
  opp: string
  inst: string
  instFlag: string
  flag: string
  country: string
  registered: string
  type: string
  stage: Stage
  dbStatus: string
  cat: 'A' | 'B'
  signed: boolean
  assigneeId: string | null
  assignee: string | null
  assigneeEmail: string | null
  assigneeAvatarUrl: string | null
  updated: string
  deadline: string
  daysLeft: number
  serviceFee: number
  instFee: number
  adminNotes: string | null
}

const APP_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'deadline_asc', label: 'Deadline (soonest)' },
  { value: 'deadline_desc', label: 'Deadline (latest)' },
]

type SortValue = 'newest' | 'oldest' | 'deadline_asc' | 'deadline_desc'
function SortDropdown({ value, onChange }: { value: string; onChange: (v: SortValue) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const label = APP_SORT_OPTIONS.find(o => o.value === value)?.label || 'Newest first'
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
          {APP_SORT_OPTIONS.map(o => (
            <div key={o.value} className={`adm-csel-opt${value === o.value ? ' sel-on' : ''}`}
              onClick={() => { onChange(o.value as SortValue); setOpen(false) }}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function OppFilterDropdown({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const label = value === 'all' ? 'All' : (value.length > 24 ? value.slice(0, 24) + '...' : value)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div ref={ref} className="adm-sort-field" style={{ position: 'relative' }}>
      <div className="adm-sort-trigger" onClick={() => setOpen(!open)}>
        <span className="adm-sort-lbl">Opportunity</span>
        <span className="adm-sort-val">{label}</span>
        <ChevronDown style={{ width: 14, height: 14, color: 'var(--adm-t-low)' }} />
      </div>
      {open && (
        <div className="adm-csel-drop" style={{ display: 'block', minWidth: 260, maxHeight: 300, overflowY: 'auto', right: 0, left: 'auto' }}>
          {[{ value: 'all', label: 'All' }, ...options.map(o => ({ value: o, label: o }))].map(o => (
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

function JumpToDropdown({ app, onSelect }: {
  app: App
  onSelect: (dbStatus: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropPos({ top: rect.bottom + 4, left: rect.left })
    }
    setOpen(v => !v)
  }

  // Stages ahead of the current one only, deduped by DB status
  const currentIdx = STAGE_KEYS.indexOf(app.stage)
  const options = STAGE_KEYS
    .slice(currentIdx + 1)
    .filter(stageKey => stageKey !== 'withdrawn')
    .filter((stageKey, idx, arr) =>
      arr.findIndex(k => STAGE_TO_DB_STATUS[k] === STAGE_TO_DB_STATUS[stageKey]) === idx
    )
    .map(stageKey => ({
      dbStatus: STAGE_TO_DB_STATUS[stageKey],
      label: STAGES.find(s => s.key === stageKey)?.label ?? stageKey,
      color: STAGES.find(s => s.key === stageKey)?.color,
    }))

  return (
    <div ref={ref} className="adm-sort-field" style={{ position: 'relative' }}>
      <div ref={triggerRef} className="adm-sort-trigger" onClick={handleOpen}>
        <span className="adm-sort-lbl">Jump to</span>
        <span className="adm-sort-val">Select stage</span>
        <ChevronDown style={{ width: 14, height: 14, color: 'var(--adm-t-low)' }} />
      </div>
      {open && typeof window !== 'undefined' && createPortal(
        <div
          className="adm-csel-drop"
          style={{ display: 'block', width: 220, right: 'auto', position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999 }}
        >
          {options.map(o => (
            <div
              key={o.dbStatus}
              className="adm-csel-opt"
              onMouseDown={e => { e.preventDefault(); onSelect(o.dbStatus); setOpen(false) }}
            >
              {o.color && <span className="adm-sdot" style={{ background: o.color }} />}
              {o.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

function nameInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??'
}

function TeamMemberFilterDropdown({ value, members, onChange }: { value: string; members: TeamMember[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = members.find(m => m.id === value)
  const label = value === 'all' ? 'All' : value === 'unassigned' ? 'Unassigned' : (selected?.name || selected?.email || 'All')
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div ref={ref} className="adm-sort-field" style={{ position: 'relative' }}>
      <div className="adm-sort-trigger" onClick={() => setOpen(!open)}>
        <span className="adm-sort-lbl">Assigned to</span>
        <span className="adm-sort-val">{label.length > 16 ? label.slice(0, 16) + '...' : label}</span>
        <ChevronDown style={{ width: 14, height: 14, color: 'var(--adm-t-low)' }} />
      </div>
      {open && (
        <div className="adm-csel-drop" style={{ display: 'block', minWidth: 200, right: 0, left: 'auto' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'unassigned', label: 'Unassigned' },
            ...members.map(m => ({ id: m.id, label: m.name || m.email })),
          ].map(o => (
            <div key={o.id} className={`adm-csel-opt${value === o.id ? ' sel-on' : ''}`}
              onClick={() => { onChange(o.id); setOpen(false) }}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
//  ASSIGNEE PICKER
// ============================================================

type TeamMember = {
  id: string
  name: string | null
  email: string
  role: string
  avatarUrl: string | null
}

function AssigneePicker({
  currentAssigneeId,
  onAssign,
  onClose,
}: {
  currentAssigneeId: string | null
  onAssign: (memberId: string | null) => void
  onClose: () => void
}) {
  const { data: teamData, isLoading } = useQuery({
    queryKey: ['admin', 'team-members'],
    queryFn: () => api.get('/api/v1/admin/team-members').then(r => r.data?.data as TeamMember[]),
    staleTime: 60000,
  })
  const members = teamData ?? []

  const roleLabel = (r: string) =>
    r === 'super_admin' ? 'Super Admin' : r === 'manager_admin' ? 'Manager' : 'Staff'

  return createPortal(
    <div className="adm-overlay show" onClick={onClose}>
      <div
        className="adm-modal"
        style={{ maxWidth: 400, padding: 0, overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--adm-card-border)' }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--adm-t-hi)' }}>Assign team member</div>
          <div style={{ fontSize: 12, color: 'var(--adm-t-low)', marginTop: 3 }}>Select a team member to take ownership of this application.</div>
        </div>
        <div style={{ padding: '8px 8px 12px', maxHeight: 340, overflowY: 'auto' }}>
          {isLoading && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--adm-t-low)', fontSize: 13 }}>Loading team...</div>
          )}
          {!isLoading && members.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--adm-t-low)', fontSize: 13 }}>No team members found.</div>
          )}
          {currentAssigneeId && (
            <div
              className="adm-csel-opt"
              style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--adm-t-low)' }}
              onClick={() => onAssign(null)}
            >
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(181,83,10,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
                <X size={14} />
              </div>
              <span>Unassign</span>
            </div>
          )}
          {members.map(m => {
            const initials = m.name ? nameInitials(m.name) : m.email.slice(0, 2).toUpperCase()
            const isSelected = m.id === currentAssigneeId
            return (
              <div
                key={m.id}
                className={`adm-csel-opt${isSelected ? ' sel-on' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                onClick={() => onAssign(m.id)}
              >
                {m.avatarUrl ? (
                  <img src={m.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(181,83,10,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--adm-primary-hi)', flexShrink: 0 }}>
                    {initials}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--adm-t-hi)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name || m.email}</div>
                  <div style={{ fontSize: 11, color: 'var(--adm-t-low)' }}>{roleLabel(m.role)}</div>
                </div>
                {isSelected && <Check size={14} style={{ color: 'var(--adm-primary-hi)', flexShrink: 0 }} />}
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}

type DocStatus = 'empty' | 'uploaded' | 'refine' | 'refined' | 'approved'

type Doc = {
  type: string
  file: string | null
  fileUrl: string | null
  size: string | null
  date: string | null
  status: DocStatus
  note: string | null
}

function docSet(stage: Stage): Doc[] {
  if (stage === 'payment') return [
    { type: 'Personal Statement', file: null, fileUrl: null, size: null, date: null, status: 'empty', note: null },
    { type: 'CV / Resume', file: null, fileUrl: null, size: null, date: null, status: 'empty', note: null },
    { type: 'University Transcripts', file: null, fileUrl: null, size: null, date: null, status: 'empty', note: null },
    { type: 'Two Reference Letters', file: null, fileUrl: null, size: null, date: null, status: 'empty', note: null },
    { type: 'Passport / ID', file: null, fileUrl: null, size: null, date: null, status: 'empty', note: null },
  ]
  // Remaining stages: real data loaded from API in openDetail; return empty slots as fallback
  return []
}

type ThreadMessage = {
  from: 'user' | 'admin' | 'system'
  text: string
  time: string
}

function extractAttachment(text: string): { prefix: string; payload: Record<string, string> } | null {
  const idx = text.indexOf('{"type":"attachment"')
  if (idx === -1) return null
  try {
    const jsonPart = text.slice(idx)
    const parsed = JSON.parse(jsonPart)
    if (parsed.type === 'attachment') return { prefix: text.slice(0, idx).trim(), payload: parsed }
  } catch { /* fall through */ }
  return null
}

function AttachmentCard({ payload }: { payload: Record<string, string> }) {
  const isImage = payload.mimeType?.startsWith('image/')
  const name = payload.fileName || 'Attachment'
  return (
    <a
      href={payload.fileUrl}
      target="_blank"
      rel="noreferrer"
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none', color: 'inherit', minWidth: 180, maxWidth: 260, marginTop: 4 }}
    >
      <span style={{ flex: 'none', width: 32, height: 32, borderRadius: 6, background: 'rgba(196,136,28,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--am-brand, #C4681C)' }}>
        {isImage ? 'IMG' : 'FILE'}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
        <span style={{ display: 'block', fontSize: 11, opacity: 0.6, marginTop: 2 }}>Open</span>
      </span>
    </a>
  )
}

function MessageBubbleContent({ text }: { text: string }) {
  const match = extractAttachment(text)
  if (match) {
    return (
      <>
        {match.prefix && <span style={{ display: 'block', marginBottom: 4 }}>{match.prefix}</span>}
        <AttachmentCard payload={match.payload} />
      </>
    )
  }
  return <>{text}</>
}

function threadFor(app: App): ThreadMessage[] {
  if (app.stage === 'payment') return [
    { from: 'system', text: 'Thread created. Payment confirmed. Awaiting staff assignment.', time: app.updated },
  ]
  if (app.stage === 'assigned') return [
    { from: 'system', text: 'Thread created. Payment confirmed.', time: '1 hr ago' },
    { from: 'admin', text: `Hi ${app.name.split(' ')[0]}, I've been assigned to your application. Please upload your documents when ready.`, time: '55 min ago' },
  ]
  if (app.stage === 'review') return [
    { from: 'system', text: 'Thread created. Payment confirmed.', time: '2 days ago' },
    { from: 'admin', text: `Hi ${app.name.split(' ')[0]}, welcome! Please upload your documents so we can begin review.`, time: '2 days ago' },
    { from: 'user', text: 'Thanks! I have uploaded everything except the second reference letter - waiting on my professor.', time: '1 day ago' },
    { from: 'admin', text: 'No worries, I will begin reviewing what we have. Please send the reference letter as soon as possible.', time: '1 day ago' },
    { from: 'user', text: 'Just uploaded the second reference letter.', time: '6 hr ago' },
    { from: 'system', text: 'Reference Letter 1 flagged for refinement.', time: '2 hr ago' },
  ]
  return [
    { from: 'system', text: 'Thread created. Payment confirmed.', time: '5 days ago' },
    { from: 'admin', text: `Hi ${app.name.split(' ')[0]}, all your documents have been verified. We are preparing the final submission.`, time: '3 days ago' },
    { from: 'user', text: 'Great, thank you for the update!', time: '3 days ago' },
  ]
}

const STAGE_HISTORY: Record<string, { stage: string; by: string; time: string }[]> = {
  payment: [{ stage: 'Payment Confirmed', by: 'System', time: '2 min ago' }],
  assigned: [
    { stage: 'Payment Confirmed', by: 'System', time: '1 hr ago' },
    { stage: 'Application Assigned', by: 'Tola Bakare', time: '55 min ago' },
  ],
  review: [
    { stage: 'Payment Confirmed', by: 'System', time: '2 days ago' },
    { stage: 'Application Assigned', by: 'Adaeze Obi', time: '2 days ago' },
    { stage: 'Documents Under Review', by: 'Adaeze Obi', time: '1 day ago' },
  ],
  verified: [
    { stage: 'Payment Confirmed', by: 'System', time: '5 days ago' },
    { stage: 'Application Assigned', by: 'Adaeze Obi', time: '5 days ago' },
    { stage: 'Documents Under Review', by: 'Adaeze Obi', time: '4 days ago' },
    { stage: 'Documents Verified', by: 'Adaeze Obi', time: '3 hr ago' },
  ],
  preparing: [
    { stage: 'Payment Confirmed', by: 'System', time: '7 days ago' },
    { stage: 'Application Assigned', by: 'Emeka Nwosu', time: '7 days ago' },
    { stage: 'Documents Under Review', by: 'Emeka Nwosu', time: '6 days ago' },
    { stage: 'Documents Verified', by: 'Emeka Nwosu', time: '4 days ago' },
    { stage: 'Preparing Submission', by: 'Emeka Nwosu', time: '5 hr ago' },
  ],
  submitted: [
    { stage: 'Payment Confirmed', by: 'System', time: '10 days ago' },
    { stage: 'Application Assigned', by: 'Tola Bakare', time: '10 days ago' },
    { stage: 'Documents Under Review', by: 'Tola Bakare', time: '8 days ago' },
    { stage: 'Documents Verified', by: 'Tola Bakare', time: '5 days ago' },
    { stage: 'Preparing Submission', by: 'Tola Bakare', time: '3 days ago' },
    { stage: 'Submitted', by: 'Tola Bakare', time: '1 day ago' },
  ],
}

function stageIdx(stage: Stage): number {
  return STAGE_KEYS.indexOf(stage)
}

function nextStage(stage: Stage): Stage | null {
  const i = stageIdx(stage)
  return i >= 0 && i < STAGE_KEYS.length - 1 ? STAGE_KEYS[i + 1] : null
}

function stageCounts(apps: App[]): Record<string, number> {
  const counts: Record<string, number> = { all: apps.length, withdrawn: 0 }
  STAGES.forEach(s => { counts[s.key] = 0 })
  apps.forEach(a => { counts[a.stage] = (counts[a.stage] || 0) + 1 })
  return counts
}

function filterLabel(f: string): string {
  if (f === 'all') return 'All applications'
  const s = ALL_FILTER_STAGES.find(st => st.key === f)
  return s ? s.label : 'All applications'
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

// ============================================================
//  MAIN COMPONENT
// ============================================================

export function AdminApplicationsPage() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [role] = useState<Role>('founder')
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [selectedApp, setSelectedApp] = useState<App | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'deadline_asc' | 'deadline_desc'>('newest')
  const [oppFilter, setOppFilter] = useState<string>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [animRows, setAnimRows] = useState(true)
  const [modal, setModal] = useState<'advance' | 'withdraw' | null>(null)
  const [modalApp, setModalApp] = useState<App | null>(null)
  const [docs, setDocs] = useState<Doc[]>([])
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [msgInput, setMsgInput] = useState('')
  const [msgSending, setMsgSending] = useState(false)
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState<string | null>(null)
  const [refineIdx, setRefineIdx] = useState<number | null>(null)
  const [refineNote, setRefineNote] = useState('')
  const [headerMenu, setHeaderMenu] = useState(false)
  const isMobile = useIsMobile()
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [advanceCardId, setAdvanceCardId] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<'details' | 'conversation'>('details')
  const [feesExpanded, setFeesExpanded] = useState(false)
  const [stageActionsExpanded, setStageActionsExpanded] = useState(false)
  const [notesExpanded, setNotesExpanded] = useState(false)
  const [assigneePickerApp, setAssigneePickerApp] = useState<App | null>(null)
  const [assignedToFilter, setAssignedToFilter] = useState<string>('all')
  const [bulkStagePickerOpen, setBulkStagePickerOpen] = useState(false)
  const tableRef = useRef<HTMLTableSectionElement>(null)
  const threadInputRef = useRef<HTMLTextAreaElement>(null)
  const notesInputRef = useRef<HTMLTextAreaElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pillsScrollRef = useRef<HTMLDivElement>(null)
  const perPage = 20
  const searchParams = useSearchParams()

  // Auto-open application when navigated from messages with ?id=
  useEffect(() => {
    const targetId = searchParams.get('id')
    if (!targetId) return
    api.get('/api/v1/admin/applications', { params: { id: targetId, limit: 1 } })
      .then(res => {
        const match = res.data?.data?.[0]
        if (match) { setSelectedApp(match); setView('detail') }
      })
      .catch(() => {})
  }, [searchParams])

  // Pre-set opportunity ID filter when navigated from admin opportunities with ?opportunity=<id>
  const [opportunityIdParam] = useState<string | null>(() => searchParams.get('opportunity'))

  // Determine which DB statuses to pass to the API for the current filter
  const filterDbStatuses = FILTER_TO_DB_STATUSES[filter] ?? []

  // For multi-status filter pills (e.g. withdrawn covers withdrawn + rejected),
  // we fetch without a status param and client-filter. For single-status pills
  // we pass the status directly to the API.
  const apiStatusParam = filterDbStatuses.length === 1 ? filterDbStatuses[0] : undefined

  const { data: queryData, isLoading } = useQuery({
    queryKey: ['admin', 'applications', apiStatusParam ?? 'all', page, sortBy, opportunityIdParam ?? '', assignedToFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: perPage }
      if (apiStatusParam) params.status = apiStatusParam
      if (sortBy === 'oldest') params.sort = 'asc'
      if (opportunityIdParam) params.opportunityId = opportunityIdParam
      if (assignedToFilter !== 'all') params.assignedTo = assignedToFilter
      const res = await api.get<ApiListResponse>('/api/v1/admin/applications', { params })
      return res.data
    },
  })

  const { data: teamMembersData } = useQuery({
    queryKey: ['admin', 'team-members'],
    queryFn: () => api.get('/api/v1/admin/team-members').then(r => r.data?.data as TeamMember[]),
    staleTime: 60000,
  })
  const teamMembers = teamMembersData ?? []

  const statusMutation = useMutation({
    mutationFn: ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) =>
      api.patch(`/api/v1/admin/applications/${id}/status`, { status, adminNotes }).then(r => r.data),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'applications'] })
      // Keep the open detail view in sync without requiring a page refresh.
      // Only patch stage/dbStatus — joined display fields (userName, oppTitle, etc.)
      // are not returned by this endpoint and must not be overwritten.
      if (selectedApp && selectedApp.id === vars.id) {
        const updatedStatus: string = data?.data?.status ?? vars.status
        const newStage: Stage = DB_STATUS_TO_STAGE[updatedStatus] ?? selectedApp.stage
        setSelectedApp(prev => prev ? { ...prev, stage: newStage, dbStatus: updatedStatus, updated: 'Just now' } : prev)
      }
    },
  })

  const notesMutation = useMutation({
    mutationFn: ({ id, adminNotes }: { id: string; adminNotes: string }) =>
      api.patch(`/api/v1/admin/applications/${id}/notes`, { adminNotes }).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'applications'] }),
  })

  const assignMutation = useMutation({
    mutationFn: ({ id, assignedTo }: { id: string; assignedTo: string | null }) =>
      api.patch(`/api/v1/admin/applications/${id}/assign`, { assignedTo }).then(r => r.data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'applications'] })
      // Optimistically update the open detail view with the new assignee name
      if (selectedApp && selectedApp.id === vars.id) {
        const member = vars.assignedTo ? teamMembers.find(m => m.id === vars.assignedTo) : null
        setSelectedApp(prev => prev ? {
          ...prev,
          assigneeId: vars.assignedTo ?? null,
          assignee: member?.name ?? null,
          assigneeEmail: member?.email ?? null,
          assigneeAvatarUrl: member?.avatarUrl ?? null,
        } : prev)
      }
      setAssigneePickerApp(null)
    },
  })

  const handleAssign = useCallback((appId: string, assignedTo: string | null) => {
    assignMutation.mutate({ id: appId, assignedTo })
  }, [assignMutation])

  // Convert API rows to internal App shape and apply client-side filter for multi-status pills
  const allApps: App[] = useMemo(() => {
    if (!queryData) return []
    const apps = queryData.data.map(apiAppToApp)
    const dbStatuses = FILTER_TO_DB_STATUSES[filter] ?? []
    if (dbStatuses.length > 1) {
      return apps.filter(a => dbStatuses.includes(a.dbStatus))
    }
    return apps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryData, filter])

  // Unique opportunity titles for the Opportunity filter dropdown
  const oppOptions = useMemo(() => {
    const titles = Array.from(new Set(allApps.map(a => a.opp).filter(o => o && o !== '\u2014')))
    return titles.sort()
  }, [allApps])

  // Apply client-side search + opp filter + sort
  const filtered = useMemo(() => {
    let result = allApps
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(a =>
        a.ref.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.opp.toLowerCase().includes(q)
      )
    }
    if (oppFilter !== 'all') {
      result = result.filter(a => a.opp === oppFilter)
    }
    if (sortBy === 'deadline_asc' || sortBy === 'deadline_desc') {
      result = [...result].sort((a, b) => {
        const aMs = a.daysLeft
        const bMs = b.daysLeft
        return sortBy === 'deadline_asc' ? aMs - bMs : bMs - aMs
      })
    }
    return result
  }, [allApps, search, oppFilter, sortBy])

  // Pagination: use API total when no search is active, otherwise use filtered length
  const apiTotal = queryData?.total ?? 0
  const apiTotalPages = queryData?.totalPages ?? 1
  const totalPages = search ? Math.max(1, Math.ceil(filtered.length / perPage)) : Math.max(1, apiTotalPages)
  const paged = search ? filtered.slice((page - 1) * perPage, page * perPage) : filtered

  // Stage counts derived from API stageCounts (cross-page, always accurate)
  // Uses FILTER_TO_DB_STATUSES so each tab badge matches exactly what that tab's filter returns
  const counts = useMemo(() => {
    const apiStageCounts = queryData?.stageCounts ?? {}
    const c: Record<string, number> = { all: 0 }
    for (const [stageKey, dbStatuses] of Object.entries(FILTER_TO_DB_STATUSES)) {
      if (stageKey === 'all') continue
      c[stageKey] = dbStatuses.reduce((sum, s) => sum + (apiStageCounts[s] ?? 0), 0)
    }
    c.all = Object.values(apiStageCounts).reduce((sum, n) => sum + n, 0)
    return c
  }, [queryData])

  const loading = isLoading

  // Row entrance animation
  useEffect(() => {
    if (animRows && tableRef.current) {
      const rows = tableRef.current.querySelectorAll('tr')
      rows.forEach((r, i) => {
        r.classList.remove('animate')
        r.style.animationDelay = `${i * 30}ms`
        void r.offsetWidth
        r.classList.add('animate')
      })
    }
  }, [animRows, filter, page, search])

  // Close header menu on outside click or Escape
  useEffect(() => {
    if (!headerMenu) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setHeaderMenu(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHeaderMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [headerMenu])

  const handleFilterChange = useCallback((f: string) => {
    setAnimRows(false)
    setFilter(f)
    setPage(1)
    setSelected(new Set())
    setTimeout(() => setAnimRows(true), 30)
  }, [])

  const handleSortChange = useCallback((v: 'newest' | 'oldest' | 'deadline_asc' | 'deadline_desc') => {
    setSortBy(v)
    setPage(1)
    setSelected(new Set())
  }, [])

  const handleOppFilterChange = useCallback((v: string) => {
    setOppFilter(v)
    setPage(1)
    setSelected(new Set())
  }, [])

  const handleSearch = useCallback((v: string) => {
    setSearch(v)
    setPage(1)
    setSelected(new Set())
  }, [])

  const handleCopy = useCallback((e: React.MouseEvent, ref: string, id: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(ref)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1200)
  }, [])

  const toggleRow = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (selected.size === paged.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(paged.map(a => a.id)))
    }
  }, [paged, selected.size])

  const openDetail = useCallback((app: App) => {
    setSelectedApp(app)
    setDocs(docSet(app.stage))
    setMessages(threadFor(app))
    setActiveThreadId(null)
    setNotes(app.adminNotes || '')
    setNotesSaved(null)
    setRefineIdx(null)
    setView('detail')

    // Fetch real documents for this application
    api.get(`/api/v1/admin/applications/${app.id}/documents`).then(res => {
      const rows: Array<{
        slotLabel: string; documentType: string; readinessStatus: string;
        fileName: string | null; fileUrl: string | null; fileSize: number | null;
        mimeType: string | null; uploadedAt: string | null;
      }> = res.data?.data ?? []
      if (rows.length > 0) {
        const readinessToStatus = (r: string): DocStatus =>
          r === 'needs_refinement' ? 'refine' : r === 'needs_creation' ? 'empty' : 'uploaded'
        setDocs(rows.map(r => ({
          type: r.slotLabel,
          file: r.fileName ?? null,
          fileUrl: r.fileUrl ?? null,
          size: r.fileSize ? `${Math.round(r.fileSize / 1024)} KB` : null,
          date: r.uploadedAt ? new Date(r.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null,
          status: r.fileName ? readinessToStatus(r.readinessStatus) : 'empty',
          note: null,
        })))
      }
    }).catch(() => { /* keep docSet fallback */ })

    // Fetch the real thread and messages for this application via admin endpoints
    api.get('/api/v1/admin/messages', { params: { limit: 100 } }).then(res => {
      const threads: Array<{ id: string; referenceId?: string }> = res.data?.data ?? []
      const thread = threads.find(t => t.referenceId === app.id)
      if (!thread) return null
      setActiveThreadId(thread.id)
      return api.get(`/api/v1/admin/messages/${thread.id}`)
    }).then(res => {
      if (!res) return
      const msgs: Array<{ id: string; senderType: string; content: string; createdAt: string }> = res.data?.data?.messages ?? []
      if (!msgs.length) return
      setMessages(msgs.map(m => ({
        from: m.senderType === 'user' ? 'user' : m.senderType === 'system' ? 'system' : 'admin',
        text: m.content,
        time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })))
    }).catch(() => { /* keep static fallback */ })
  }, [])

  const backToList = useCallback(() => {
    setView('list')
    setSelectedApp(null)
  }, [])

  const openModal = useCallback((type: 'advance' | 'withdraw', app: App) => {
    setModalApp(app)
    setModal(type)
  }, [])

  const closeModal = useCallback(() => {
    setModal(null)
    setModalApp(null)
  }, [])

  const handleApproveDoc = useCallback((idx: number) => {
    setDocs(prev => prev.map((d, i) => i === idx ? { ...d, status: 'approved' as DocStatus } : d))
  }, [])

  const handleRequestRefinement = useCallback((idx: number) => {
    setRefineIdx(idx)
    setRefineNote('')
  }, [])

  const handleSubmitRefinement = useCallback(() => {
    if (refineIdx === null || !refineNote.trim()) return
    setDocs(prev => prev.map((d, i) =>
      i === refineIdx ? { ...d, status: 'refine' as DocStatus, note: refineNote.trim() } : d
    ))
    setMessages(prev => [...prev, {
      from: 'system' as const,
      text: `Refinement requested for ${docs[refineIdx]?.type}: "${refineNote.trim()}"`,
      time: 'Just now',
    }])
    setRefineIdx(null)
    setRefineNote('')
  }, [refineIdx, refineNote, docs])

  const handleNotesBlur = useCallback(() => {
    if (notes.trim() && selectedApp) {
      notesMutation.mutate(
        { id: selectedApp.id, adminNotes: notes },
        { onSuccess: () => setNotesSaved('Saved just now') }
      )
    }
  }, [notes, selectedApp, notesMutation])

  const handleSendMessage = useCallback(async () => {
    const text = msgInput.trim()
    if (!text || !activeThreadId || msgSending) return
    setMsgSending(true)
    setMsgInput('')
    try {
      await api.post(`/api/v1/admin/messages/${activeThreadId}/reply`, { content: text })
      setMessages(prev => [...prev, { from: 'admin', text, time: 'Just now' }])
    } catch {
      setMsgInput(text) // restore on failure
    } finally {
      setMsgSending(false)
    }
  }, [msgInput, activeThreadId, msgSending])

  const canAdvance = role === 'founder' || role === 'manager'
  const canJumpStage = role === 'founder'

  const handleLongPress = useCallback((id: string) => {
    setSelectMode(true)
    setSelected(prev => new Set(prev).add(id))
    navigator.vibrate?.(30)
  }, [])

  const handleTouchStart = useCallback((id: string) => {
    longPressTimer.current = setTimeout(() => handleLongPress(id), 500)
  }, [handleLongPress])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }, [])

  const handleTouchMove = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }, [])

  const exitSelectMode = useCallback(() => {
    setSelectMode(false)
    setSelected(new Set())
  }, [])

  const getValidNextStages = useCallback((stage: Stage): Stage[] => {
    const idx = stageIdx(stage)
    if (idx < 0) return []
    if (canJumpStage) return STAGE_KEYS.slice(idx + 1)
    if (canAdvance) {
      const n = nextStage(stage)
      return n ? [n] : []
    }
    return []
  }, [canJumpStage, canAdvance])

  const handleAdvanceCard = useCallback((appId: string) => {
    setAdvanceCardId(prev => prev === appId ? null : appId)
  }, [])

  const handleStageSelect = useCallback((app: App, _targetStage: Stage) => {
    setAdvanceCardId(null)
    setModalApp(app)
    setModal('advance')
  }, [])

  const uniqueOpps: string[] = []

  const emptyMessage = (f: string) => {
    const msgs: Record<string, string> = {
      payment: 'No applications awaiting payment confirmation',
      assigned: 'All assigned applications are progressing',
      review: 'No documents under review right now',
      verified: 'No verified applications waiting',
      preparing: 'No submissions being prepared',
      submitted: 'No submissions recorded yet',
      withdrawn: 'No withdrawn applications',
    }
    return msgs[f] || 'No applications match your filters'
  }

  // ---- LIST VIEW ----
  if (view === 'list') {
    return (
      <div className="adm-apps">
        {/* Page header */}
        <div className="adm-page-head">
          <div>
            <h1>Applications</h1>
            <div className="adm-dash-greeting">{filterLabel(filter)}</div>
          </div>
          {!isMobile ? (
            <div className="adm-head-actions">
              <button className="adm-btn adm-btn-outline"><Download /> Export CSV</button>
              <button
                className="adm-btn adm-btn-ghost"
                disabled={selected.size === 0}
                onClick={() => {
                  const firstSelected = paged.find(a => selected.has(a.id))
                  if (firstSelected) setAssigneePickerApp(firstSelected)
                }}
              >
                <UserPlus /> Assign to team member
              </button>
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
                    <button onClick={() => setMoreMenuOpen(false)}><Download /> Export CSV</button>
                    <button onClick={() => setMoreMenuOpen(false)}><UserPlus /> Assign to team member</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Filter bar */}
        <div className="adm-filterbar">
          {!isMobile ? (
            <>
              <div className="adm-filter-top">
                <div className="adm-search">
                  <Search />
                  <input
                    type="text"
                    placeholder="Search by name, ref ID, or opportunity..."
                    value={search}
                    onChange={e => handleSearch(e.target.value)}
                  />
                </div>
                <div className="adm-filter-right">
                  <TeamMemberFilterDropdown value={assignedToFilter} members={teamMembers} onChange={v => { setAssignedToFilter(v); setPage(1) }} />
                  <OppFilterDropdown value={oppFilter} options={oppOptions} onChange={handleOppFilterChange} />
                  <SortDropdown value={sortBy} onChange={handleSortChange} />
                </div>
              </div>
              <div className="adm-pills">
                {ALL_FILTER_STAGES.map(s => (
                  <button
                    key={s.key}
                    className={`adm-pill${filter === s.key ? ' active' : ''}`}
                    onClick={() => handleFilterChange(s.key)}
                  >
                    {s.label} <span className="adm-pcount">{counts[s.key] || 0}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="adm-search adm-mob-search-full">
                <Search />
                <input
                  type="text"
                  placeholder="Search by name, ref, or opportunity..."
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                />
              </div>
              <div className="adm-mob-app-pills-scroll" ref={pillsScrollRef}>
                <div className="adm-mob-app-pills">
                  {ALL_FILTER_STAGES.map(s => (
                    <button
                      key={s.key}
                      className={`adm-pill${filter === s.key ? ' active' : ''}`}
                      onClick={() => {
                        handleFilterChange(s.key)
                        const btn = pillsScrollRef.current?.querySelector(`.adm-pill.active`) as HTMLElement
                        btn?.scrollIntoView({ inline: 'center', behavior: 'smooth' })
                      }}
                    >
                      {s.label} <span className="adm-pcount">{counts[s.key] || 0}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="adm-mob-filter-actions">
                <label className="adm-mob-app-compact-filter" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Opp: {oppFilter === 'all' ? 'All' : oppFilter.slice(0, 10) + (oppFilter.length > 10 ? '...' : '')} <ChevronDown size={12} />
                  <select value={oppFilter} onChange={e => handleOppFilterChange(e.target.value)}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}>
                    <option value="all">All</option>
                    {oppOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
                <label className="adm-mob-app-compact-filter" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : sortBy === 'deadline_asc' ? 'Deadline ↑' : 'Deadline ↓'} <ChevronDown size={12} />
                  <select value={sortBy} onChange={e => handleSortChange(e.target.value as typeof sortBy)}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="deadline_asc">Deadline (soonest)</option>
                    <option value="deadline_desc">Deadline (latest)</option>
                  </select>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Bulk toolbar (desktop only) */}
        {!isMobile && (
          <div className={`adm-bulkbar${selected.size > 0 ? ' show' : ''}`}>
            <span className="adm-bulk-count"><b>{selected.size}</b> selected</span>
            <div className="adm-bulk-actions">
              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => { const first = paged.find(a => selected.has(a.id)); if (first) setAssigneePickerApp(first) }}><UserPlus /> Assign to</button>
              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setBulkStagePickerOpen(true)}><ArrowRight /> Move to stage</button>
              <button className="adm-btn adm-btn-ghost adm-btn-sm"><Download /> Export selected</button>
            </div>
            <span className="adm-bulk-deselect" onClick={() => setSelected(new Set())}>
              Deselect all
            </span>
          </div>
        )}

        {/* Skeleton loading */}
        {loading ? (
          <div className="adm-skeleton-table">
            <div className="adm-skeleton-filter">
              {[0,1,2,3,4,5].map(i => <div key={i} className="adm-skel adm-skel-pill" />)}
            </div>
            {[0,1,2,3,4,5,6,7].map(i => (
              <div key={i} className="adm-skeleton-row" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="adm-skel adm-skel-circle" style={{ animationDelay: `${i * 80}ms` }} />
                <div className="adm-skel-block">
                  <div className="adm-skel adm-skel-line w40" style={{ animationDelay: `${i * 80 + 100}ms` }} />
                  <div className="adm-skel adm-skel-line w25" style={{ animationDelay: `${i * 80 + 200}ms` }} />
                </div>
                <div className="adm-skel adm-skel-line w15" style={{ animationDelay: `${i * 80 + 150}ms` }} />
                <div className="adm-skel adm-skel-badge" style={{ animationDelay: `${i * 80 + 250}ms` }} />
                <div className="adm-skel adm-skel-line w10" style={{ animationDelay: `${i * 80 + 300}ms` }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="adm-empty">
            <div className="adm-empty-ico"><ClipboardCheck /></div>
            <h2>{search ? 'No matching applications' : filter !== 'all' ? emptyMessage(filter) : 'No applications yet'}</h2>
            <p>
              {search
                ? <>No applications match <span className="adm-hl">&quot;{search}&quot;</span>. Try a different search term.</>
                : filter !== 'all'
                  ? <span className="adm-hl" style={{ cursor: 'pointer' }} onClick={() => handleFilterChange('all')}>View all applications</span>
                  : 'Applications from VIP Assist users will appear here once payments are confirmed.'
              }
            </p>
          </div>
        ) : (
          <>
            {!isMobile ? (
              <div className="adm-table-wrap">
                <table className="adm-appt">
                  <colgroup>
                    <col className="c-check" />
                    <col className="c-applicant" />
                    <col className="c-ref" />
                    <col className="c-opp" />
                    <col className="c-stage" />
                    <col className="c-compliance" />
                    <col className="c-assigned" />
                    <col className="c-updated" />
                    <col className="c-actions" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="c-check">
                        <div
                          className={`adm-cbx${selected.size === paged.length && paged.length > 0 ? ' on' : ''}`}
                          onClick={toggleAll}
                        >
                          <Check />
                        </div>
                      </th>
                      <th>Applicant</th>
                      <th>Reference</th>
                      <th>Opportunity</th>
                      <th>Stage</th>
                      <th>Compliance</th>
                      <th>Assigned to</th>
                      <th>Last updated</th>
                      <th className="c-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody ref={tableRef}>
                    {paged.map(app => (
                      <tr
                        key={app.id}
                        className={`${selected.has(app.id) ? 'sel' : ''}${animRows ? ' animate' : ''}`}
                        onClick={() => openDetail(app)}
                      >
                        <td>
                          <div
                            className={`adm-cbx${selected.has(app.id) ? ' on' : ''}`}
                            onClick={e => toggleRow(e, app.id)}
                          >
                            <Check />
                          </div>
                        </td>
                        <td>
                          <div className="adm-applicant">
                            <div className="adm-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                              {app.avatarUrl
                                ? <img src={app.avatarUrl} alt={app.initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement as HTMLElement).textContent = app.initials }} />
                                : app.initials}
                            </div>
                            <div className="adm-who">
                              <div className="adm-nm">{app.name}</div>
                              <div className="adm-em">{app.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="adm-refid">
                            <span className="adm-code">{app.ref}</span>
                            <button
                              className="adm-copy-btn"
                              onClick={e => handleCopy(e, app.ref, app.id)}
                            >
                              <Copy />
                            </button>
                            <span className={`adm-copied-tip${copiedId === app.id ? ' show' : ''}`}>
                              Copied!
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="adm-opp">
                            <div className="adm-ot">{app.opp}</div>
                            <div className="adm-oi">
                              <span>{app.inst}</span>
                              <span className="adm-typebadge">{app.type}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <StageBadge stage={app.stage} dbStatus={app.dbStatus} />
                        </td>
                        <td>
                          <span className={`adm-cat adm-cat-${app.cat.toLowerCase()}`}>
                            Cat.{app.cat}
                          </span>
                        </td>
                        <td>
                          {app.assignee ? (
                            <div className="adm-assignee">
                              <div className="adm-avatar sm">
                                {nameInitials(app.assignee)}
                              </div>
                              <span className="adm-nm">{app.assignee}</span>
                            </div>
                          ) : (
                            <span className="adm-unassigned"><AlertCircle /> Unassigned</span>
                          )}
                        </td>
                        <td><span className="adm-updated">{app.updated}</span></td>
                        <td>
                          <div className="adm-rowact">
                            <button className="adm-iconbtn" title="View" onClick={e => { e.stopPropagation(); openDetail(app) }}>
                              <Eye />
                            </button>
                            {canAdvance && nextStage(app.stage) && (
                              <button className="adm-iconbtn" title="Move stage" onClick={e => { e.stopPropagation(); openModal('advance', app) }}>
                                <ArrowRight />
                              </button>
                            )}
                            <button className="adm-iconbtn" title="Message" onClick={e => { e.stopPropagation(); openDetail(app) }}>
                              <MessageSquare />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="adm-mob-cards">
                {paged.map((app, idx) => (
                  <div
                    key={app.id}
                    className={`adm-mob-card adm-mob-app-card${selectMode && selected.has(app.id) ? ' selected' : ''} adm-mob-card-anim`}
                    style={{ animationDelay: `${idx * 35}ms` }}
                    onClick={e => selectMode ? toggleRow(e, app.id) : openDetail(app)}
                    onTouchStart={() => !selectMode && handleTouchStart(app.id)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchMove}
                  >
                    {selectMode && (
                      <div className={`adm-mob-app-sel-check${selected.has(app.id) ? ' on' : ''}`}>
                        <Check />
                      </div>
                    )}

                    <div className="adm-mob-app-identity">
                      <div className="adm-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                        {app.avatarUrl
                          ? <img src={app.avatarUrl} alt={app.initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement as HTMLElement).textContent = app.initials }} />
                          : app.initials}
                      </div>
                      <div className="adm-who">
                        <div className="adm-nm">{app.name}</div>
                        <div className="adm-em">{app.email}</div>
                      </div>
                    </div>

                    <div className="adm-mob-app-stage-row">
                      <StageBadge stage={app.stage} dbStatus={app.dbStatus} />
                    </div>

                    <div className="adm-mob-app-opp">
                      <div className="adm-mob-app-opp-title">{app.opp}</div>
                      <div className="adm-mob-app-opp-meta">
                        <span>{app.inst}</span>
                        <span className="adm-typebadge">{app.type}</span>
                        <span className={`adm-cat adm-cat-${app.cat.toLowerCase()}`}>Cat.{app.cat}</span>
                      </div>
                    </div>

                    <div className="adm-mob-app-footer">
                      <div className="adm-mob-app-assignee">
                        {app.assignee ? (
                          <>
                            <div className="adm-avatar sm">
                              {nameInitials(app.assignee)}
                            </div>
                            <span>{app.assignee}</span>
                          </>
                        ) : (
                          <span className="adm-unassigned"><AlertCircle /> Unassigned</span>
                        )}
                      </div>
                      <span className="adm-updated">{app.updated}</span>
                    </div>

                    {!selectMode && (
                      <div className="adm-mob-app-actions" onClick={e => e.stopPropagation()}>
                        <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => openDetail(app)}>
                          <Eye /> View
                        </button>
                        <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => openDetail(app)}>
                          <MessageSquare /> Comment
                        </button>
                        {canAdvance && nextStage(app.stage) && (
                          <div style={{ position: 'relative' }}>
                            <button
                              className="adm-btn adm-btn-primary adm-btn-sm"
                              onClick={() => {
                                const stages = getValidNextStages(app.stage)
                                if (stages.length === 1) {
                                  handleStageSelect(app, stages[0])
                                } else {
                                  handleAdvanceCard(app.id)
                                }
                              }}
                            >
                              <ArrowRight /> Advance
                            </button>
                            {advanceCardId === app.id && (
                              <div className="adm-mob-app-stage-picker">
                                {getValidNextStages(app.stage).map(stageKey => {
                                  const s = STAGES.find(st => st.key === stageKey)
                                  return s ? (
                                    <button
                                      key={s.key}
                                      className="adm-mob-app-stage-option"
                                      onClick={() => handleStageSelect(app, s.key)}
                                    >
                                      <span className="adm-sdot" style={{ background: s.color }} />
                                      {s.label}
                                    </button>
                                  ) : null
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="adm-pager">
              <span className="adm-info">
                Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, search ? filtered.length : apiTotal)} of {search ? filtered.length : apiTotal}
              </span>
              <div className="adm-pages">
                <button
                  className="adm-pg"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft />
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    className={`adm-pg${page === i + 1 ? ' on' : ''}`}
                    onClick={() => setPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="adm-pg"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight />
                </button>
              </div>
            </div>
          </>
        )}

        {isMobile && selectMode && createPortal(
          <div className={`adm-mob-app-bulkbar${selected.size > 0 ? ' show' : ''}`}>
            <span className="adm-mob-app-bulkbar-count">
              <b>{selected.size}</b> selected
            </span>
            <div className="adm-mob-app-bulkbar-actions">
              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => { const first = paged.find(a => selected.has(a.id)); if (first) setAssigneePickerApp(first) }}><UserPlus /> Assign</button>
              <button className="adm-btn adm-btn-ghost adm-btn-sm"><Download /> Export</button>
              <button className="adm-btn adm-btn-ghost adm-btn-sm"><XCircle /> Withdraw</button>
            </div>
            <button className="adm-mob-app-bulkbar-close" onClick={exitSelectMode}>
              <X />
            </button>
          </div>,
          document.body
        )}

        {isMobile && filterSheetOpen && createPortal(
          <>
            <div className="adm-bsheet-backdrop show" onClick={() => setFilterSheetOpen(false)} />
            <div className="adm-bsheet show">
              <div className="adm-bsheet-handle" />
              <div className="adm-bsheet-head">
                <h3>Filter by opportunity</h3>
                <button className="adm-iconbtn" onClick={() => setFilterSheetOpen(false)}>
                  <X />
                </button>
              </div>
              <div className="adm-bsheet-body">
                <div className="adm-bsheet-label">Opportunity</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button
                    className="adm-pill active"
                    onClick={() => setFilterSheetOpen(false)}
                  >
                    All opportunities
                  </button>
                  {uniqueOpps.map(opp => (
                    <button key={opp} className="adm-pill" onClick={() => setFilterSheetOpen(false)}>
                      {opp}
                    </button>
                  ))}
                </div>
              </div>
              <div className="adm-bsheet-foot">
                <button className="adm-btn adm-btn-ghost" onClick={() => setFilterSheetOpen(false)}>
                  Clear
                </button>
                <button className="adm-btn adm-btn-primary" onClick={() => setFilterSheetOpen(false)}>
                  Apply
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
        {assigneePickerApp && (
          <AssigneePicker
            currentAssigneeId={assigneePickerApp.assigneeId}
            onAssign={(memberId) => {
              if (selected.size > 1 && selected.has(assigneePickerApp.id)) {
                selected.forEach(id => handleAssign(id, memberId))
                setAssigneePickerApp(null)
              } else {
                handleAssign(assigneePickerApp.id, memberId)
              }
            }}
            onClose={() => setAssigneePickerApp(null)}
          />
        )}

        {bulkStagePickerOpen && createPortal(
          <div className="adm-overlay show" onClick={() => setBulkStagePickerOpen(false)}>
            <div className="adm-modal" style={{ maxWidth: 400, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--adm-card-border)' }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--adm-t-hi)' }}>Move to stage</div>
                <div style={{ fontSize: 12, color: 'var(--adm-t-low)', marginTop: 3 }}>
                  Select a stage to move <b style={{ color: 'var(--adm-t-mid)' }}>{selected.size} application{selected.size !== 1 ? 's' : ''}</b> to.
                </div>
              </div>
              <div style={{ padding: '8px 8px 12px' }}>
                {STAGES.map(s => (
                  <div
                    key={s.key}
                    className="adm-csel-opt"
                    style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                    onClick={() => {
                      const targetStatus = STAGE_ADVANCE_DB_STATUS[s.key]
                      selected.forEach(id => statusMutation.mutate({ id, status: targetStatus }))
                      setBulkStagePickerOpen(false)
                      setSelected(new Set())
                    }}
                  >
                    <span className="adm-sdot" style={{ background: s.color, width: 8, height: 8, borderRadius: '50%', flexShrink: 0 }} />
                    <span style={{ fontSize: 13 }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Advance / withdraw modals from list view row actions */}
        {modal && modalApp && createPortal(
          <div className="adm-overlay show" onClick={closeModal}>
            <div className="adm-modal" onClick={e => e.stopPropagation()}>
              {modal === 'advance' && (
                <>
                  <div className="adm-modal-ico amber"><ArrowRight /></div>
                  <h3>Advance to the next stage?</h3>
                  <p>
                    This moves <b>{modalApp.name}</b>&apos;s application forward. The applicant will be notified and the change is recorded in the stage history.
                  </p>
                  <div className="adm-modal-pipe">
                    <div className="adm-ms">
                      <div className="adm-mlbl">Current</div>
                      <div className="adm-mval">{STAGES.find(s => s.key === modalApp.stage)?.label}</div>
                    </div>
                    <div className="adm-marrow"><ArrowRight /></div>
                    <div className="adm-ms">
                      <div className="adm-mlbl">Next</div>
                      <div className="adm-mval">{STAGES.find(s => s.key === nextStage(modalApp.stage))?.label}</div>
                    </div>
                  </div>
                  <div className="adm-modal-actions">
                    <button className="adm-btn adm-btn-ghost" onClick={closeModal}>Cancel</button>
                    <button
                      className="adm-btn adm-btn-primary"
                      disabled={statusMutation.isPending}
                      onClick={() => {
                        const nextStatus = STAGE_ADVANCE_DB_STATUS[modalApp.stage]
                        statusMutation.mutate({ id: modalApp.id, status: nextStatus }, { onSuccess: closeModal })
                      }}
                    >
                      {statusMutation.isPending ? 'Saving...' : 'Confirm advance'}
                    </button>
                  </div>
                </>
              )}
              {modal === 'withdraw' && (
                <>
                  <div className="adm-modal-ico amber"><AlertTriangle /></div>
                  <h3>Withdraw application</h3>
                  <p>Are you sure? This cannot be undone. The user will be notified and no refund will be issued automatically.</p>
                  <div className="adm-warn-line">This will mark <b>{modalApp.name}</b>&apos;s application as withdrawn permanently.</div>
                  <div className="adm-modal-actions">
                    <button className="adm-btn adm-btn-ghost" onClick={closeModal}>Cancel</button>
                    <button
                      className="adm-btn adm-btn-danger-solid"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate({ id: modalApp.id, status: STAGE_WITHDRAW_DB_STATUS }, { onSuccess: closeModal })}
                    >
                      {statusMutation.isPending ? 'Processing...' : 'Withdraw application'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    )
  }

  // ---- DETAIL VIEW ----
  if (!selectedApp) return null

  const app = selectedApp
  const currentIdx = stageIdx(app.stage)
  const next = nextStage(app.stage)
  const history = STAGE_HISTORY[app.stage] || []
  const isLocked = app.stage === 'submitted' || app.stage === 'withdrawn'
  const isWithdrawn = app.stage === 'withdrawn'
  const threadClosed = app.stage === 'submitted'

  // ---- MOBILE DETAIL VIEW ----
  if (isMobile) {
    return (
      <div className="adm-mob-detail-wrap">
        {/* Sticky header */}
        <div className="adm-mob-detail-head">
          <span className="adm-backlink" onClick={backToList}>
            <ArrowLeft /> All applications
          </span>
          <span className="adm-dsh-name">{app.ref}</span>
          <div className="adm-mob-overflow">
            <button className="adm-mob-more-btn" onClick={() => setHeaderMenu(!headerMenu)}>
              <MoreVertical />
            </button>
            {headerMenu && (
              <>
                <div className="adm-mob-overflow-backdrop" onClick={() => setHeaderMenu(false)} />
                <div className="adm-mob-overflow-menu">
                  <button onClick={() => { setHeaderMenu(false); setAssigneePickerApp(app) }}><Users /> Change assignee</button>
                  <button onClick={() => { setHeaderMenu(false); setDetailTab('details'); setNotesExpanded(true) }}>
                    <MessageSquare /> Add note
                  </button>
                  <button onClick={() => { setHeaderMenu(false); openModal('withdraw', app) }}>
                    <XCircle /> Withdraw
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tab segmented control */}
        <div className="adm-mob-detail-tabs">
          <button
            className={`adm-mob-detail-tab${detailTab === 'details' ? ' active' : ''}`}
            onClick={() => setDetailTab('details')}
          >
            Details
          </button>
          <button
            className={`adm-mob-detail-tab${detailTab === 'conversation' ? ' active' : ''}`}
            onClick={() => setDetailTab('conversation')}
          >
            Conversation
          </button>
        </div>

        {/* Details tab */}
        {detailTab === 'details' && (
          <div className="adm-mob-detail-body">
            {/* Alert strip */}
            {app.stage === 'payment' && !app.assignee && (
              <div className="adm-mob-detail-alert">
                <AlertCircle /> New application - assign a team member to begin processing
              </div>
            )}
            {app.stage === 'submitted' && (
              <div className="adm-mob-detail-alert adm-mob-detail-alert-green">
                <CheckCircle /> Application submitted to {app.inst}
              </div>
            )}
            {isWithdrawn && (
              <div className="adm-mob-detail-alert adm-mob-detail-alert-gray">
                <XCircle /> This application was withdrawn
              </div>
            )}

            {/* Applicant card */}
            <div className="adm-card">
              <div className="adm-mob-detail-applicant">
                <div className="adm-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                  {app.avatarUrl
                    ? <img src={app.avatarUrl} alt={app.initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement as HTMLElement).textContent = app.initials }} />
                    : app.initials}
                </div>
                <div>
                  <div className="adm-nm">{app.name} <span className="adm-premium"><Star /> Premium</span></div>
                  <div className="adm-em">{app.email}</div>
                </div>
              </div>
              <div className="adm-mob-detail-meta">
                <span>{app.ref} <button className="adm-copy-btn" style={{ display: 'inline-flex', opacity: 1, width: 18, height: 18 }} onClick={() => navigator.clipboard.writeText(app.ref)}><Copy style={{ width: 12, height: 12 }} /></button></span>
                <span><Calendar /> {app.registered}</span>
                <span><Globe /> {app.country} {app.flag}</span>
              </div>
            </div>

            {/* Opportunity card */}
            <div className="adm-card">
              <div className="adm-card-h"><Building2 /> Opportunity</div>
              <div className="adm-ot" style={{ fontSize: 14, fontWeight: 600, color: 'var(--adm-t-hi)' }}>{app.opp}</div>
              <div className="adm-mob-detail-inst">
                <span className="adm-mob-detail-inst-name"><span>{app.instFlag}</span> {app.inst}</span>
                <span className="adm-typebadge">{app.type}</span>
              </div>
              <button className="adm-mob-detail-disclosure" onClick={() => setFeesExpanded(!feesExpanded)}>
                Total paid ${app.serviceFee + app.instFee}
                {feesExpanded ? <ChevronDown /> : <ChevronRight />}
              </button>
              {feesExpanded && (
                <div className="adm-mob-detail-fees">
                  <div className="adm-fee-row">
                    <span className="adm-fk">Deadline</span>
                    <span className={`adm-fv adm-deadline ${app.daysLeft <= 7 ? 'adm-dl-urgent' : app.daysLeft <= 30 ? 'adm-dl-soon' : 'adm-dl-ok'}`}>
                      {app.daysLeft} days left
                    </span>
                  </div>
                  <div className="adm-fee-row">
                    <span className="adm-fk">OppDate service fee</span>
                    <span className="adm-fv">${app.serviceFee}</span>
                  </div>
                  <div className="adm-fee-row">
                    <span className="adm-fk">Institution fee</span>
                    <span className="adm-fv">${app.instFee}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Compliance & Authorization */}
            <div className="adm-card">
              <div className="adm-card-h"><Shield /> Compliance & Authorization</div>
              <div className="adm-mob-detail-comp">
                <div className={`adm-comp-cat-big adm-cat-${app.cat.toLowerCase()}`}>
                  Category {app.cat}
                  <span className="adm-sub">{app.cat === 'A' ? 'Direct submission' : 'User completes final step'}</span>
                </div>
                <div className="adm-comp-desc">
                  {app.cat === 'A'
                    ? 'OppDate submits the application directly to the institution on behalf of the applicant.'
                    : 'The institution requires applicants to submit through their own portal. OppDate prepares all documents and guides the process.'
                  }
                </div>
                <div className="adm-auth-line">
                  Authorization Agreement signed Jun 14, 2026
                  <span className="adm-auth-link">&middot; View agreement &rarr;</span>
                </div>
                <div className="adm-submission-block">
                  <div className="adm-sub-status">Not yet submitted</div>
                  <button className="adm-btn adm-btn-primary" style={{ width: '100%' }} onClick={() => { setDetailTab('conversation'); setTimeout(() => threadInputRef.current?.focus(), 100) }}>
                    <Send /> {app.cat === 'A' ? 'Submit application' : 'Send submission instructions'}
                  </button>
                </div>
              </div>
            </div>

            {/* Stage Pipeline */}
            <div className="adm-card">
              <div className="adm-card-h"><ClipboardCheck /> Stage Pipeline</div>
              <div className="adm-mob-detail-pipeline-wrap">
                <div className="adm-mob-detail-pipeline-scroll">
                  <div className="adm-pl-track">
                    {STAGES.map((s, i) => {
                      let cls = ''
                      if (i < currentIdx) cls = 'done'
                      else if (i === currentIdx) cls = 'current'
                      return (
                        <div key={s.key} className={`adm-pl-step ${cls}`}>
                          <div className="adm-pl-node">
                            {i < currentIdx ? <Check /> : STAGE_ICONS[i]}
                          </div>
                          {i < STAGES.length - 1 && <div className="adm-pl-conn" />}
                          <div className="adm-pl-lbl">{s.label}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Stage controls */}
              {!isLocked && canAdvance && (
                <>
                  {app.stage === 'preparing' && app.cat === 'A' ? (
                    <button className="adm-btn adm-btn-primary" style={{ width: '100%', marginTop: 14 }} onClick={() => openModal('advance', app)}>
                      <Send /> Submit application
                    </button>
                  ) : app.stage === 'preparing' && app.cat === 'B' ? (
                    <button className="adm-btn adm-btn-primary" style={{ width: '100%', marginTop: 14 }} onClick={() => openModal('advance', app)}>
                      <MessageSquare /> Notify user to submit
                    </button>
                  ) : next ? (
                    <button
                      className="adm-btn adm-btn-primary"
                      style={{ width: '100%', marginTop: 14 }}
                      onClick={() => openModal('advance', app)}
                      disabled={app.stage === 'payment' && !app.signed}
                    >
                      <ArrowRight /> Advance to {STAGES.find(s => s.key === next)?.label}
                    </button>
                  ) : null}
                  <button className="adm-mob-detail-disclosure" onClick={() => setStageActionsExpanded(!stageActionsExpanded)} style={{ marginTop: 8 }}>
                    Other actions {stageActionsExpanded ? <ChevronDown /> : <ChevronRight />}
                  </button>
                  {stageActionsExpanded && (
                    <div className="adm-mob-detail-stage-secondary">
                      {canJumpStage && (
                        <div>
                          <JumpToDropdown
                            app={app}
                            onSelect={dbStatus => statusMutation.mutate({ id: app.id, status: dbStatus })}
                          />
                        </div>
                      )}
                      <button className="adm-btn adm-btn-danger adm-btn-sm" style={{ width: '100%' }} onClick={() => openModal('withdraw', app)}>
                        <XCircle /> Withdraw
                      </button>
                    </div>
                  )}
                </>
              )}
              {!isLocked && role === 'staff' && (
                <div className="adm-lock-tip" style={{ marginTop: 16 }}>
                  <Lock /> Stage controls are restricted to your role.
                </div>
              )}
              {isLocked && (
                <div className="adm-lock-tip" style={{ marginTop: 16 }}>
                  <Lock /> {isWithdrawn ? 'Application has been withdrawn. Stage is locked.' : 'Application has been submitted. Stage is locked.'}
                </div>
              )}

              {/* Stage history */}
              <div className="adm-stage-history">
                {history.map((h, i) => (
                  <div key={i} className="adm-sh-row">
                    <span className="adm-sh-dot" />
                    <span className="adm-sh-stage">{h.stage}</span>
                    <span className="adm-sh-by">by {h.by}</span>
                    <span className="adm-sh-time">{h.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div className="adm-card">
              <div className="adm-card-h">
                <FileText /> Documents
                <div className="adm-doc-actions-top">
                  <button className="adm-btn adm-btn-ghost adm-btn-sm"><Download /></button>
                </div>
              </div>
              <div className="adm-doclist">
                {docs.map((d, i) => (
                  <DocRow
                    key={i}
                    doc={d}
                    idx={i}
                    onApprove={handleApproveDoc}
                    onRequestRefinement={handleRequestRefinement}
                    refineOpen={refineIdx === i}
                    refineNote={refineIdx === i ? refineNote : ''}
                    onRefineNoteChange={setRefineNote}
                    onRefineSubmit={handleSubmitRefinement}
                    onRefineCancel={() => setRefineIdx(null)}
                    readOnly={isLocked}
                  />
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="adm-card">
              <button className="adm-mob-detail-disclosure adm-mob-detail-disclosure-wrap" onClick={() => setNotesExpanded(!notesExpanded)}>
                <FileText /> Notes
                <span className="adm-mob-detail-disclosure-sub">{notesSaved || 'Amara Okafor - 2h ago'}</span>
                {notesExpanded ? <ChevronDown /> : <ChevronRight />}
              </button>
              {notesExpanded && (
                <>
                  <span className="adm-notes-vis" style={{ display: 'block', fontSize: 10.5, color: 'var(--adm-t-lo)', marginBottom: 8 }}>Internal - users never see this</span>
                  <textarea
                    ref={notesInputRef}
                    placeholder="Add an internal note for the team..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    onBlur={handleNotesBlur}
                    style={{
                      width: '100%', background: 'rgba(181,83,10,0.06)', border: '1px solid rgba(181,83,10,0.2)',
                      borderRadius: 10, padding: '12px 14px', color: 'var(--adm-t-hi)', fontSize: 12.5,
                      fontFamily: 'inherit', resize: 'vertical', minHeight: 80, outline: 'none', lineHeight: 1.5
                    }}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Conversation tab */}
        {detailTab === 'conversation' && (
          <div className="adm-mob-detail-conv">
            <div className="adm-mob-conv-head">
              <div className="adm-th-name">{app.name}</div>
              <div className="adm-th-opp">{app.opp}</div>
              <div className={`adm-thread-status ${threadClosed ? 'adm-ts-closed' : 'adm-ts-open'}`}>
                <span className="adm-sdot" /> {threadClosed ? 'Closed' : 'Open'}
              </div>
            </div>
            <div className="adm-mob-conv-body">
              {messages.map((m, i) => {
                if (m.from === 'system') {
                  const isFlag = /flag|refine|withdraw|reject/i.test(m.text)
                  return (
                    <div key={i} className={`adm-mob-conv-syspill${isFlag ? ' adm-mob-conv-syspill-warn' : ''}`}>
                      {isFlag ? <AlertCircle /> : <CheckCircle />}
                      {m.text}
                    </div>
                  )
                }
                const isFresh = m.time === 'Just now'
                return (
                  <div key={i} className={`adm-msg ${m.from}${isFresh ? ' fresh' : ''}`}>
                    <div className="adm-bubble"><MessageBubbleContent text={m.text} /></div>
                    <div className="adm-mt">{m.time}</div>
                  </div>
                )
              })}
            </div>
            <div className="adm-mob-conv-input">
              <textarea
                ref={threadInputRef}
                placeholder={threadClosed ? 'Thread closed' : 'Type a message...'}
                disabled={threadClosed}
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
              />
              <button className="adm-send-btn" disabled={!msgInput.trim() || threadClosed || !activeThreadId || msgSending} onClick={handleSendMessage}>
                <Send />
              </button>
            </div>
          </div>
        )}

        {/* Modals (shared) */}
        {modal && modalApp && (
          <div className={`adm-overlay${modal ? ' show' : ''}`} onClick={closeModal}>
            <div className="adm-modal" onClick={e => e.stopPropagation()}>
              {modal === 'advance' && (
                <>
                  <div className="adm-modal-ico amber"><ArrowRight /></div>
                  <h3>Advance to the next stage?</h3>
                  <p>
                    This moves <b>{modalApp.name}</b>&apos;s application forward. The applicant will be notified and the change is recorded in the stage history.
                  </p>
                  <div className="adm-modal-pipe">
                    <div className="adm-ms">
                      <div className="adm-mlbl">Current</div>
                      <div className="adm-mval">{STAGES.find(s => s.key === modalApp.stage)?.label}</div>
                    </div>
                    <div className="adm-marrow"><ArrowRight /></div>
                    <div className="adm-ms">
                      <div className="adm-mlbl">Next</div>
                      <div className="adm-mval">{STAGES.find(s => s.key === nextStage(modalApp.stage))?.label}</div>
                    </div>
                  </div>
                  <div className="adm-modal-actions">
                    <button className="adm-btn adm-btn-ghost" onClick={closeModal}>Cancel</button>
                    <button
                      className="adm-btn adm-btn-primary"
                      disabled={statusMutation.isPending}
                      onClick={() => {
                        const nextStatus = STAGE_ADVANCE_DB_STATUS[modalApp.stage]
                        statusMutation.mutate({ id: modalApp.id, status: nextStatus }, { onSuccess: closeModal })
                      }}
                    >
                      {statusMutation.isPending ? 'Saving...' : 'Confirm advance'}
                    </button>
                  </div>
                </>
              )}
              {modal === 'withdraw' && (
                <>
                  <div className="adm-modal-ico amber"><AlertTriangle /></div>
                  <h3>Withdraw application</h3>
                  <p>
                    Are you sure? This cannot be undone. The user will be notified and no refund will be issued automatically.
                  </p>
                  <div className="adm-warn-line">
                    This will mark <b>{modalApp.name}</b>&apos;s application as withdrawn permanently.
                  </div>
                  <div className="adm-modal-actions">
                    <button className="adm-btn adm-btn-ghost" onClick={closeModal}>Cancel</button>
                    <button
                      className="adm-btn adm-btn-danger-solid"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate({ id: modalApp.id, status: STAGE_WITHDRAW_DB_STATUS }, { onSuccess: closeModal })}
                    >
                      {statusMutation.isPending ? 'Saving...' : 'Withdraw application'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {assigneePickerApp && (
          <AssigneePicker
            currentAssigneeId={assigneePickerApp.assigneeId}
            onAssign={(memberId) => handleAssign(assigneePickerApp.id, memberId)}
            onClose={() => setAssigneePickerApp(null)}
          />
        )}
      </div>
    )
  }

  // ---- DESKTOP DETAIL VIEW ----
  return (
    <div className="adm-detail-wrap">
      <div className="adm-detail">
        {/* Left column */}
        <div className="adm-detail-left enter">
          {/* Sticky header */}
          <div className="adm-detail-sticky-head">
            <span className="adm-backlink" onClick={backToList}>
              <ArrowLeft /> All applications
            </span>
            <span className="adm-dsh-name">{app.ref}</span>
          </div>

          {/* Stage-specific banners */}
          {app.stage === 'payment' && !app.assignee && (
            <div className="adm-banner adm-banner-amber" style={{ cursor: 'pointer' }} onClick={() => setAssigneePickerApp(app)}>
              <AlertCircle />
              <div style={{ flex: 1 }}>
                <div className="adm-bt">New application - assign a team member to begin processing</div>
                <div className="adm-bd">Click here to assign this application to a team member.</div>
              </div>
              <button className="adm-btn adm-btn-sm adm-btn-outline" onClick={e => { e.stopPropagation(); setAssigneePickerApp(app) }} style={{ flexShrink: 0 }}>
                <UserPlus /> Assign
              </button>
            </div>
          )}
          {app.stage === 'submitted' && (
            <div className="adm-banner adm-banner-green">
              <CheckCircle />
              <div>
                <div className="adm-bt">Application submitted successfully</div>
                <div className="adm-bd">This application has been submitted to {app.inst}. No further action required.</div>
              </div>
            </div>
          )}
          {isWithdrawn && (
            <div className="adm-banner adm-banner-gray">
              <XCircle />
              <div>
                <div className="adm-bt">This application was withdrawn</div>
                <div className="adm-bd">All controls are disabled. No further action can be taken on this application.</div>
              </div>
            </div>
          )}

          {/* Applicant card */}
          <div className="adm-card">
            <div className="adm-card-h">
              <Star /> Applicant
              <span className="adm-premium" style={{ marginLeft: 'auto' }}><Star /> Premium</span>
            </div>
            <div className="adm-appcard">
              <div className="adm-avatar lg" style={{ overflow: 'hidden', padding: 0 }}>
                {app.avatarUrl
                  ? <img src={app.avatarUrl} alt={app.initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement as HTMLElement).textContent = app.initials }} />
                  : app.initials}
              </div>
              <div className="adm-who">
                <div className="adm-nm">{app.name}</div>
                <div className="adm-em">{app.email}</div>
                <div className="adm-meta-grid">
                  <div className="adm-metaitem">
                    <span className="adm-k">Reference</span>
                    <span className="adm-v" style={{ fontFamily: '"DM Mono", monospace' }}>
                      {app.ref}
                      <button
                        className="adm-copy-btn"
                        style={{ display: 'inline-flex', opacity: 1, width: 18, height: 18 }}
                        onClick={() => navigator.clipboard.writeText(app.ref)}
                      >
                        <Copy style={{ width: 12, height: 12 }} />
                      </button>
                    </span>
                  </div>
                  <div className="adm-metaitem">
                    <span className="adm-k">Registered</span>
                    <span className="adm-v">{app.registered}</span>
                  </div>
                  <div className="adm-metaitem">
                    <span className="adm-k">Country</span>
                    <span className="adm-v">{app.country} {app.flag}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Opportunity card */}
          <div className="adm-card adm-oppcard">
            <div className="adm-card-h"><Building2 /> Opportunity</div>
            <div className="adm-ot">{app.opp}</div>
            <div className="adm-oi">
              <span>{app.instFlag}</span> {app.inst}
              <span className="adm-typebadge">{app.type}</span>
            </div>
            <div className="adm-oppgrid">
              <div className="adm-fee-row">
                <span className="adm-fk">Deadline</span>
                <span className={`adm-fv adm-deadline ${app.daysLeft <= 7 ? 'adm-dl-urgent' : app.daysLeft <= 30 ? 'adm-dl-soon' : 'adm-dl-ok'}`}>
                  {app.daysLeft} days left
                </span>
              </div>
              <div className="adm-fee-row">
                <span className="adm-fk">OppDate service fee</span>
                <span className="adm-fv">${app.serviceFee}</span>
              </div>
              <div className="adm-fee-row">
                <span className="adm-fk">Compliance</span>
                <span className="adm-fv">
                  <span className={`adm-cat adm-cat-${app.cat.toLowerCase()}`}>Cat.{app.cat}</span>
                </span>
              </div>
              <div className="adm-fee-row">
                <span className="adm-fk">Institution fee</span>
                <span className="adm-fv">${app.instFee}</span>
              </div>
              <div className="adm-fee-row total" style={{ gridColumn: '1 / -1' }}>
                <span className="adm-fk">Total paid</span>
                <span className="adm-fv">${app.serviceFee + app.instFee}</span>
              </div>
            </div>
          </div>

          {/* Compliance & Auth */}
          <div className="adm-card">
            <div className="adm-card-h"><Shield /> Compliance & Authorization</div>
            <div className="adm-compliance-grid">
              <div className="adm-comp-box">
                <div className="adm-cl">Compliance category</div>
                <div className={`adm-comp-cat-big adm-cat-${app.cat.toLowerCase()}`}>
                  Category {app.cat}
                  <span className="adm-sub">{app.cat === 'A' ? 'Direct submission' : 'User completes final step'}</span>
                </div>
                <div className="adm-comp-desc">
                  {app.cat === 'A'
                    ? 'OppDate submits the application directly to the institution on behalf of the applicant.'
                    : 'The institution requires applicants to submit through their own portal. OppDate prepares all documents and guides the process.'
                  }
                </div>
              </div>
              <div className="adm-comp-right">
                <div className="adm-auth-line">
                  Authorization Agreement signed Jun 14, 2026
                  <span className="adm-auth-link">&middot; View agreement &rarr;</span>
                </div>
                <div className="adm-submission-block">
                  {app.cat === 'A' ? (
                    <>
                      <div className="adm-cl">Submission</div>
                      <div className="adm-sub-status">Not yet submitted</div>
                      <button
                        className="adm-btn adm-btn-primary adm-btn-sm"
                        onClick={() => threadInputRef.current?.focus()}
                      >
                        <Send /> Submit application
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="adm-cl">Submission instructions</div>
                      <div className="adm-sub-status">Not sent yet</div>
                      <button
                        className="adm-btn adm-btn-primary adm-btn-sm"
                        onClick={() => threadInputRef.current?.focus()}
                      >
                        <Send /> Send submission instructions
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pipeline */}
          <div className="adm-card">
            <div className="adm-card-h"><ClipboardCheck /> Stage Pipeline</div>
            <div className="adm-pipeline">
              <div className="adm-pl-track">
                {STAGES.map((s, i) => {
                  let cls = ''
                  if (i < currentIdx) cls = 'done'
                  else if (i === currentIdx) cls = 'current'
                  return (
                    <div key={s.key} className={`adm-pl-step ${cls}`}>
                      <div className="adm-pl-node">
                        {i < currentIdx ? <Check /> : STAGE_ICONS[i]}
                      </div>
                      {i < STAGES.length - 1 && <div className="adm-pl-conn" />}
                      <div className="adm-pl-lbl">{s.label}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Stage controls */}
            {!isLocked && canAdvance && (
              <div className="adm-stage-controls">
                {app.stage === 'preparing' && app.cat === 'A' ? (
                  <button className="adm-btn adm-btn-primary" onClick={() => openModal('advance', app)}>
                    <Send /> Submit application
                  </button>
                ) : app.stage === 'preparing' && app.cat === 'B' ? (
                  <button className="adm-btn adm-btn-primary" onClick={() => openModal('advance', app)}>
                    <MessageSquare /> Notify user to submit
                  </button>
                ) : next ? (
                  <button
                    className="adm-btn adm-btn-primary"
                    onClick={() => openModal('advance', app)}
                    disabled={app.stage === 'payment' && !app.signed}
                    title={app.stage === 'payment' && !app.signed ? 'Authorization Agreement must be signed before processing can begin' : undefined}
                  >
                    <ArrowRight /> Advance to {STAGES.find(s => s.key === next)?.label}
                  </button>
                ) : null}
                {canJumpStage && (
                  <div>
                    <JumpToDropdown
                      app={app}
                      onSelect={dbStatus => statusMutation.mutate({ id: app.id, status: dbStatus })}
                    />
                  </div>
                )}
                <button
                  className="adm-btn adm-btn-danger"
                  onClick={() => openModal('withdraw', app)}
                >
                  <XCircle /> Withdraw
                </button>
              </div>
            )}
            {!isLocked && role === 'staff' && (
              <div className="adm-lock-tip" style={{ marginTop: 16 }}>
                <Lock /> Stage controls are restricted to your role.
              </div>
            )}
            {isLocked && (
              <div className="adm-lock-tip" style={{ marginTop: 16 }}>
                <Lock /> {isWithdrawn ? 'Application has been withdrawn. Stage is locked.' : 'Application has been submitted. Stage is locked.'}
              </div>
            )}

            {/* Stage history */}
            <div className="adm-stage-history">
              {history.map((h, i) => (
                <div key={i} className="adm-sh-row">
                  <span className="adm-sh-dot" />
                  <span className="adm-sh-stage">{h.stage}</span>
                  <span className="adm-sh-by">by {h.by}</span>
                  <span className="adm-sh-time">{h.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Documents */}
          <div className="adm-card">
            <div className="adm-card-h">
              <FileText /> Documents
              <div className="adm-doc-actions-top">
                <button
                  className="adm-btn adm-btn-ghost adm-btn-sm"
                  disabled={!docs.some(d => d.fileUrl)}
                  onClick={() => docs.filter(d => d.fileUrl).forEach(d => window.open(d.fileUrl!, '_blank'))}
                ><Download /> Download all</button>
                {docs.some(d => d.status === 'uploaded') && (
                  <button className="adm-btn adm-btn-ghost adm-btn-sm"><CheckCircle /> Approve all verified</button>
                )}
              </div>
            </div>
            <div className="adm-doclist">
              {docs.map((d, i) => (
                <DocRow
                  key={i}
                  doc={d}
                  idx={i}
                  onApprove={handleApproveDoc}
                  onRequestRefinement={handleRequestRefinement}
                  refineOpen={refineIdx === i}
                  refineNote={refineIdx === i ? refineNote : ''}
                  onRefineNoteChange={setRefineNote}
                  onRefineSubmit={handleSubmitRefinement}
                  onRefineCancel={() => setRefineIdx(null)}
                  readOnly={isLocked}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="adm-card adm-notes">
            <div className="adm-card-h">
              <FileText /> Application Notes
              <span className="adm-notes-vis">Internal - users never see this</span>
            </div>
            <textarea
              ref={notesInputRef}
              placeholder="Add an internal note for the team..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
            />
            <div className="adm-nmeta">
              {notesSaved || 'Last edited by Amara Okafor - 2 hours ago - auto-saves on blur'}
            </div>
          </div>
        </div>

        {/* Right column - Thread */}
        <div className="adm-detail-right enter">
          <div className="adm-thread-head">
            <div className="adm-th-left">
              <div className="adm-th-name">{app.name}</div>
              <div className="adm-th-opp">{app.opp}</div>
              <div className={`adm-thread-status ${threadClosed ? 'adm-ts-closed' : 'adm-ts-open'}`}>
                <span className="adm-sdot" /> {threadClosed ? 'Closed' : 'Open'}
              </div>
            </div>
            <div className="adm-th-right">
              <div className="adm-th-assignee" title={app.assignee || 'Unassigned'}>
                <div className="adm-avatar xs">
                  {app.assignee
                    ? nameInitials(app.assignee)
                    : '?'
                  }
                </div>
              </div>
              <div className="adm-th-menu-wrap" ref={menuRef}>
                <button
                  className="adm-th-kebab"
                  onClick={() => setHeaderMenu(v => !v)}
                >
                  <MoreVertical />
                </button>
                {headerMenu && (
                  <div className="adm-th-dropdown">
                    <button className="adm-thd-item" onClick={() => { setHeaderMenu(false); setAssigneePickerApp(app) }}>
                      <Users /> Change assignee
                    </button>
                    <button className="adm-thd-item" onClick={() => { setHeaderMenu(false); notesInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => notesInputRef.current?.focus(), 350) }} disabled={isLocked}>
                      <MessageSquare /> Add note to user
                    </button>
                    <div className="adm-thd-divider" />
                    <button className="adm-thd-item danger" onClick={() => { setHeaderMenu(false); openModal('withdraw', app) }} disabled={isLocked}>
                      <XCircle /> Withdraw application
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="adm-thread-body">
            <div className="adm-conv-label">Conversation</div>
            {messages.map((m, i) => {
              if (m.from === 'system') {
                return <div key={i} className="adm-sys-note">{m.text}</div>
              }
              const isFresh = m.time === 'Just now'
              return (
                <div key={i} className={`adm-msg ${m.from}${isFresh ? ' fresh' : ''}`}>
                  <div className="adm-bubble"><MessageBubbleContent text={m.text} /></div>
                  <div className="adm-mt">{m.time}</div>
                </div>
              )
            })}
          </div>

          <div className="adm-thread-input">
            <textarea
              ref={threadInputRef}
              placeholder={threadClosed ? 'Thread closed' : 'Type a message...'}
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              disabled={threadClosed}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
            />
            <button
              className="adm-send-btn"
              onClick={handleSendMessage}
              disabled={!msgInput.trim() || threadClosed || !activeThreadId || msgSending}
            >
              <Send />
            </button>
          </div>

          <div className="adm-viewfull" style={{ cursor: 'pointer' }} onClick={() => router.push(`/admin/messages${activeThreadId ? `?thread=${activeThreadId}` : ''}`)}>View full thread &rarr;</div>
        </div>
      </div>

      {/* Modals */}
      {modal && modalApp && (
        <div className={`adm-overlay${modal ? ' show' : ''}`} onClick={closeModal}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            {modal === 'advance' && (
              <>
                <div className="adm-modal-ico amber"><ArrowRight /></div>
                <h3>Advance to the next stage?</h3>
                <p>
                  This moves <b>{modalApp.name}</b>&apos;s application forward. The applicant will be notified and the change is recorded in the stage history.
                </p>
                <div className="adm-modal-pipe">
                  <div className="adm-ms">
                    <div className="adm-mlbl">Current</div>
                    <div className="adm-mval">{STAGES.find(s => s.key === modalApp.stage)?.label}</div>
                  </div>
                  <div className="adm-marrow"><ArrowRight /></div>
                  <div className="adm-ms">
                    <div className="adm-mlbl">Next</div>
                    <div className="adm-mval">{STAGES.find(s => s.key === nextStage(modalApp.stage))?.label}</div>
                  </div>
                </div>
                <div className="adm-modal-actions">
                  <button className="adm-btn adm-btn-ghost" onClick={closeModal}>Cancel</button>
                  <button
                    className="adm-btn adm-btn-primary"
                    disabled={statusMutation.isPending}
                    onClick={() => {
                      const nextStatus = STAGE_ADVANCE_DB_STATUS[modalApp.stage]
                      statusMutation.mutate({ id: modalApp.id, status: nextStatus }, { onSuccess: closeModal })
                    }}
                  >
                    {statusMutation.isPending ? 'Saving...' : 'Confirm advance'}
                  </button>
                </div>
              </>
            )}
            {modal === 'withdraw' && (
              <>
                <div className="adm-modal-ico amber"><AlertTriangle /></div>
                <h3>Withdraw application</h3>
                <p>
                  Are you sure? This cannot be undone. The user will be notified and no refund will be issued automatically.
                </p>
                <div className="adm-warn-line">
                  This will mark <b>{modalApp.name}</b>&apos;s application as withdrawn permanently.
                </div>
                <div className="adm-modal-actions">
                  <button className="adm-btn adm-btn-ghost" onClick={closeModal}>Cancel</button>
                  <button
                    className="adm-btn adm-btn-danger-solid"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate({ id: modalApp.id, status: STAGE_WITHDRAW_DB_STATUS }, { onSuccess: closeModal })}
                  >
                    {statusMutation.isPending ? 'Saving...' : 'Withdraw application'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {assigneePickerApp && (
        <AssigneePicker
          currentAssigneeId={assigneePickerApp.assigneeId}
          onAssign={(memberId) => handleAssign(assigneePickerApp.id, memberId)}
          onClose={() => setAssigneePickerApp(null)}
        />
      )}
    </div>
  )
}

// ============================================================
//  SUB-COMPONENTS
// ============================================================

const STAGE_ICONS = [
  <CreditCard key="p" />,
  <UserPlus key="a" />,
  <FileCheck key="r" />,
  <PackageCheck key="v" />,
  <Send key="pr" />,
  <CheckCircle key="s" />,
]

function StageBadge({ stage, dbStatus }: { stage: Stage; dbStatus?: string }) {
  const s = STAGES.find(st => st.key === stage) || STAGES[0]
  const label = dbStatus ? (DB_STATUS_LABEL[dbStatus] ?? s.label) : s.label
  return (
    <span className={`adm-stage-badge adm-sb-${stage}`}>
      <span className="adm-sdot" />
      {label}
      <span className="adm-stip">
        <b>{label}</b>
        {s.tip}
      </span>
    </span>
  )
}

function DocRow({ doc, idx, onApprove, onRequestRefinement, refineOpen, refineNote, onRefineNoteChange, onRefineSubmit, onRefineCancel, readOnly }: {
  doc: Doc
  idx: number
  onApprove: (i: number) => void
  onRequestRefinement: (i: number) => void
  refineOpen: boolean
  refineNote: string
  onRefineNoteChange: (v: string) => void
  onRefineSubmit: () => void
  onRefineCancel: () => void
  readOnly: boolean
}) {
  const statusIcon = {
    empty: <Upload />,
    uploaded: <FileText />,
    refine: <AlertTriangle />,
    refined: <FileText />,
    approved: <CheckCircle />,
  }

  const statusClass = {
    empty: 's-empty',
    uploaded: 's-up',
    refine: 's-refine',
    refined: 's-refined',
    approved: 's-ok',
  }

  const docClass = doc.status === 'refine' ? 'refine' : doc.status === 'approved' ? 'approved' : doc.status === 'empty' ? 'empty' : ''

  return (
    <div className={`adm-doc ${docClass}`}>
      <div className="adm-doc-main">
        <div className={`adm-doc-stat ${statusClass[doc.status]}`}>
          {statusIcon[doc.status]}
        </div>
        <div className="adm-doc-info">
          <div className="adm-doc-type">{doc.type}</div>
          <div className="adm-doc-sub">
            {doc.file ? (
              <>
                {doc.file}
                <span className="adm-doc-filebadge">PDF</span>
                <span>{doc.size}</span>
                {doc.date && <span>{doc.date}</span>}
              </>
            ) : (
              'Awaiting upload from applicant'
            )}
            {doc.status === 'refine' && <span className="adm-refine-tag">Refinement requested</span>}
          </div>
          {doc.note && (
            <div style={{ fontSize: 11.5, color: 'var(--adm-amber-tx)', marginTop: 6, lineHeight: 1.4 }}>
              {doc.note}
            </div>
          )}
        </div>
        {!readOnly && (
          <div className="adm-doc-acts">
            {doc.file && (
              <>
                {doc.fileUrl && <button className="adm-iconbtn" title="Preview" onClick={() => window.open(doc.fileUrl!, '_blank')}><Eye /></button>}
                {doc.fileUrl && <button className="adm-iconbtn" title="Download" onClick={() => { const a = document.createElement('a'); a.href = doc.fileUrl!; a.download = doc.file || 'document'; a.click() }}><Download /></button>}
              </>
            )}
            {doc.status === 'uploaded' && (
              <>
                <button
                  className="adm-iconbtn"
                  title="Request refinement"
                  style={{ color: 'var(--adm-amber-tx)' }}
                  onClick={() => onRequestRefinement(idx)}
                >
                  <RotateCw />
                </button>
                <button
                  className="adm-iconbtn approve"
                  title="Approve"
                  onClick={() => onApprove(idx)}
                >
                  <CheckCircle />
                </button>
              </>
            )}
            {doc.status === 'refine' && (
              <button className="adm-iconbtn" title="Edit refinement note" style={{ color: 'var(--adm-amber-tx)' }}>
                <RotateCw />
              </button>
            )}
            {doc.status === 'refined' && (
              <button
                className="adm-iconbtn approve"
                title="Approve"
                onClick={() => onApprove(idx)}
              >
                <CheckCircle />
              </button>
            )}
          </div>
        )}
      </div>
      {/* Inline refinement form */}
      {refineOpen && (
        <div style={{
          marginTop: 10, padding: '10px 12px',
          background: 'rgba(181,83,10,0.06)', border: '1px solid var(--adm-amber-bd)',
          borderRadius: 9, overflow: 'hidden',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--adm-amber-tx)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Request refinement
          </div>
          <textarea
            style={{
              width: '100%', background: 'rgba(181,83,10,0.06)', border: '1px solid rgba(181,83,10,0.2)',
              borderRadius: 7, padding: '8px 10px', color: 'var(--adm-t-hi)', fontSize: 12.5,
              fontFamily: 'inherit', resize: 'vertical', minHeight: 60, outline: 'none', lineHeight: 1.4,
            }}
            placeholder="Describe what needs to be changed..."
            value={refineNote}
            onChange={e => onRefineNoteChange(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
            <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onRefineCancel}>Cancel</button>
            <button
              className="adm-btn adm-btn-primary adm-btn-sm"
              disabled={!refineNote.trim()}
              onClick={onRefineSubmit}
            >
              Send refinement request
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
