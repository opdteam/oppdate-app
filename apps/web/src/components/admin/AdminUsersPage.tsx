'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronDown, Search, Eye, Ban, Check, Trash2, Edit3,
  UserPlus, Lock, Send, Mail, AlertTriangle, X, ArrowLeft,
  SlidersHorizontal, Shield, HelpCircle,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'

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

function CustomSelect({ value, onChange, options, style }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  style?: React.CSSProperties
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className={`adm-csel${open ? ' open' : ''}`} ref={ref} style={style}>
      <div className="adm-csel-trigger" onClick={() => setOpen(o => !o)}>
        <span className="adm-csel-val">{selected?.label || ''}</span>
        <ChevronDown size={16} className="adm-csel-arrow" />
      </div>
      {open && (
        <div className="adm-csel-drop">
          {options.map(o => (
            <div key={o.value} className={`adm-csel-opt${o.value === value ? ' sel-on' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false) }}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type UserStatus = 'active' | 'suspended'
type UserPlan = 'free' | 'premium'
type Tab = 'platform' | 'admin'
type ModalType = 'suspend' | 'delete1' | 'delete2' | 'invite' | 'revoke' | 'premium' | null

// API response types
interface ApiAdminUser {
  id: string
  email: string
  name: string
  role: string
  avatarUrl: string | null
  isPremium: boolean
  premiumUntil: string | null
  isEmailVerified: boolean
  suspendedAt: string | null
  lastLoginAt: string | null
  createdAt: string
  applicationCount: number
  totalSpentCents: number
}

interface ApiPayment {
  id: string
  purpose: string
  amountUsd: number
  status: string
  gateway: string
  createdAt: string
}

interface ApiAdminUserDetail extends ApiAdminUser {
  premiumSince: string | null
  applicationCount: number
  documentCount: number
  preferences: Record<string, unknown> | null
  paymentHistory: ApiPayment[]
}

interface ApiUsersResponse {
  data: ApiAdminUser[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Display interfaces
interface PlatformUser {
  id: string; name: string; email: string; initials: string; registered: string
  plan: UserPlan; status: UserStatus; applicationCount: number; totalSpentCents: number
}

interface AdminUser {
  id: string; name: string; email: string; initials: string
  role: 'founder' | 'manager' | 'staff'; lastActive: string
}

// Field mapping helpers
function deriveInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

function derivePlan(isPremium: boolean): UserPlan {
  return isPremium ? 'premium' : 'free'
}

function deriveStatus(suspendedAt: string | null): UserStatus {
  return suspendedAt ? 'suspended' : 'active'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function mapDbRoleToDisplay(role: string): 'founder' | 'manager' | 'staff' {
  if (role === 'super_admin') return 'founder'
  if (role === 'manager_admin') return 'manager'
  return 'staff'
}

function mapDisplayRoleToDb(role: string): string {
  if (role === 'manager') return 'manager_admin'
  if (role === 'staff') return 'staff_admin'
  return 'staff_admin'
}

function toDisplayUser(u: ApiAdminUser): PlatformUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    initials: deriveInitials(u.name),
    registered: formatDate(u.createdAt),
    plan: derivePlan(u.isPremium),
    status: deriveStatus(u.suspendedAt),
    applicationCount: u.applicationCount ?? 0,
    totalSpentCents: u.totalSpentCents ?? 0,
  }
}

function toAdminUser(u: ApiAdminUser): AdminUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    initials: deriveInitials(u.name),
    role: mapDbRoleToDisplay(u.role),
    lastActive: u.lastLoginAt ? formatDate(u.lastLoginAt) : '-',
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

function StageBadge({ stage }: { stage: string }) {
  const meta = STAGE_META[stage]
  if (!meta) return null
  return (
    <span className="adm-usr-stagebadge" style={{ background: `${meta.color}22`, color: meta.color, borderColor: `${meta.color}55` }}>
      {meta.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'active' || status === 'succeeded' ? 'ok' : status === 'suspended' || status === 'failed' ? 'err' : 'warn'
  const label = status[0].toUpperCase() + status.slice(1)
  return <span className={`adm-usr-statusbadge ${cls}`}>{label}</span>
}

function PlanBadge({ plan }: { plan: UserPlan }) {
  return (
    <span className={`adm-usr-planbadge ${plan}`}>{plan === 'premium' ? 'Premium' : 'Free'}</span>
  )
}

function RoleBadge({ role }: { role: string }) {
  const label = role === 'founder' ? 'Super Admin' : role === 'manager' ? 'Manager' : 'Staff'
  const cls = role === 'founder' ? 'rb-founder' : role === 'manager' ? 'rb-manager' : 'rb-staff'
  return (
    <span className={`adm-usr-rolebadge ${cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {role === 'founder' && <Shield size={10} />}
      {label}
    </span>
  )
}

// Platform Users Table
function PlatformTable({ onView }: { onView: (id: string) => void }) {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all')
  const [planFilter, setPlanFilter] = useState<'all' | UserPlan>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data: apiResponse, isLoading, isError } = useQuery<ApiUsersResponse>({
    queryKey: ['admin', 'users', search, planFilter, page],
    queryFn: () =>
      api.get('/api/v1/admin/users', {
        params: {
          role: 'user',
          search: search || undefined,
          isPremium: planFilter === 'premium' ? 'true' : planFilter === 'free' ? 'false' : undefined,
          page,
          limit: 20,
        },
      }).then(r => r.data),
  })

  const rawUsers = apiResponse?.data ?? []
  const users = rawUsers.map(toDisplayUser)

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false
      return true
    })
  }, [users, statusFilter])

  const statusCounts = useMemo(() => ({
    all: users.length,
    active: users.filter(u => u.status === 'active').length,
    suspended: users.filter(u => u.status === 'suspended').length,
  }), [users])

  const suspendMutation = useMutation({
    mutationFn: ({ id, isSuspended }: { id: string; isSuspended: boolean }) =>
      api.patch(`/api/v1/admin/users/${id}/${isSuspended ? 'unsuspend' : 'suspend'}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, confirmEmail }: { id: string; confirmEmail: string }) =>
      api.delete(`/api/v1/admin/users/${id}`, { data: { confirmEmail } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  if (isLoading) {
    return (
      <div className="adm-skeleton-table" style={{ opacity: 0.4 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="adm-skeleton-row">
            <div className="adm-skel adm-skel-circle" />
            <div className="adm-skel-block">
              <div className="adm-skel adm-skel-line w60" style={{ height: 14 }} />
              <div className="adm-skel adm-skel-line w40" style={{ height: 10 }} />
            </div>
            <div className="adm-skel adm-skel-badge" />
            <div className="adm-skel adm-skel-line w15" style={{ height: 14 }} />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="adm-usr-empty">
        <div className="adm-usr-emptyico"><AlertTriangle size={40} /></div>
        <h2>Failed to load users</h2>
        <p>Check your connection and try refreshing.</p>
      </div>
    )
  }

  return (
    <>
      <div className="adm-usr-filterbar">
        <div className="adm-usr-filtertop">
          <div className="adm-usr-search">
            <Search size={16} />
            <input placeholder="Search by name or email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <div className="adm-usr-filterright">
            <CustomSelect value={planFilter} onChange={v => { setPlanFilter(v as 'all' | UserPlan); setPage(1) }}
              options={[{ value: 'all', label: 'All plans' }, { value: 'free', label: 'Free' }, { value: 'premium', label: 'Premium' }]}
              style={{ width: 140 }} />
          </div>
        </div>
        <div className="adm-usr-filtertop">
          {(['all', 'active', 'suspended'] as const).map(s => (
            <button key={s} className={`adm-usr-pill${statusFilter === s ? ' active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s[0].toUpperCase() + s.slice(1)}
              <span className="adm-usr-pcount">{statusCounts[s]}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="adm-usr-empty">
          <div className="adm-usr-emptyico"><Search size={40} /></div>
          <h2>No users match this filter</h2>
          <p>Try a different search term or filter.</p>
        </div>
      ) : (
        <div className="adm-usr-tablewrap">
          <table className="adm-usr-table">
            <thead>
              <tr>
                <th>User</th><th>Registered</th><th>Plan</th>
                <th>Applications</th><th>Total spent</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <PlatformRow
                  key={u.id}
                  u={u}
                  onView={onView}
                  onSuspendToggle={() => suspendMutation.mutate({ id: u.id, isSuspended: u.status === 'suspended' })}
                  onDelete={(confirmEmail) => deleteMutation.mutate({ id: u.id, confirmEmail })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {apiResponse && apiResponse.totalPages > 1 && (
        <div className="adm-usr-pagination">
          <button className="adm-usr-btn adm-usr-btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={14} />Prev
          </button>
          <span className="adm-usr-pageinfo">Page {page} of {apiResponse.totalPages}</span>
          <button className="adm-usr-btn adm-usr-btn-ghost" disabled={page >= apiResponse.totalPages} onClick={() => setPage(p => p + 1)}>
            Next<ChevronLeft size={14} style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>
      )}
    </>
  )
}

function PlatformRow({ u, onView, onSuspendToggle, onDelete }: {
  u: PlatformUser
  onView: (id: string) => void
  onSuspendToggle: () => void
  onDelete: (confirmEmail: string) => void
}) {
  const [modal, setModal] = useState<'suspend' | 'delete1' | 'delete2' | null>(null)
  const [deleteTyped, setDeleteTyped] = useState('')
  const [suspendReason, setSuspendReason] = useState('Terms violation')

  function handleSuspendConfirm() {
    onSuspendToggle()
    setModal(null)
  }

  function handleDeleteConfirm() {
    onDelete(deleteTyped)
    setModal(null)
    setDeleteTyped('')
  }

  const isActive = u.status === 'active'

  return (
    <>
      <tr className={u.status === 'suspended' ? 'suspended' : ''}>
        <td>
          <div className="adm-usr-usercell">
            <span className="adm-usr-avatar">{u.initials}</span>
            <div>
              <div className="adm-usr-username">{u.name}</div>
              <div className="adm-usr-useremail">{u.email}</div>
            </div>
          </div>
        </td>
        <td><span className="mono">{u.registered}</span></td>
        <td><PlanBadge plan={u.plan} /></td>
        <td>{u.applicationCount > 0 ? u.applicationCount : '-'}</td>
        <td><span className="mono">{u.totalSpentCents > 0 ? `$${(u.totalSpentCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '-'}</span></td>
        <td><StatusBadge status={u.status} /></td>
        <td>
          <div className="adm-usr-rowactions">
            <span className="adm-usr-actbtn" title="View" onClick={() => onView(u.id)}><Eye size={15} /></span>
            <span className="adm-usr-actbtn" title={isActive ? 'Suspend' : 'Reinstate'} onClick={() => setModal('suspend')}>
              {isActive ? <Ban size={15} /> : <Check size={15} />}
            </span>
            <span className="adm-usr-actbtn" title="Delete" onClick={() => setModal('delete1')}><Trash2 size={15} /></span>
          </div>
        </td>
      </tr>

      {modal && createPortal(
        <div className="adm-usr-overlay show" onClick={e => { if (e.target === e.currentTarget) { setModal(null); setDeleteTyped('') } }}>
          <div className="adm-usr-modal">
            {modal === 'suspend' && (
              <>
                <div className="adm-usr-modalico amber"><Ban size={24} /></div>
                <h3>{isActive ? 'Suspend' : 'Reinstate'} this account?</h3>
                <p>{isActive
                  ? `${u.name} will be immediately logged out and unable to log back in until reinstated. Their data is not affected.`
                  : `${u.name} will regain access and can log back in immediately.`}</p>
                {isActive && (
                  <div className="adm-usr-confirmfield">
                    <label>Reason (optional)</label>
                    <CustomSelect value={suspendReason} onChange={setSuspendReason}
                      options={[{ value: 'Terms violation', label: 'Terms violation' }, { value: 'Suspicious activity', label: 'Suspicious activity' }, { value: 'User request', label: 'User request' }, { value: 'Other', label: 'Other' }]} />
                  </div>
                )}
                <div className="adm-usr-modalactions">
                  <button className="adm-usr-btn adm-usr-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                  <button className="adm-usr-btn" style={{ background: '#D97706', color: '#fff' }} onClick={handleSuspendConfirm}>
                    {isActive ? <><Ban size={14} />Suspend account</> : <><Check size={14} />Reinstate account</>}
                  </button>
                </div>
              </>
            )}
            {modal === 'delete1' && (
              <>
                <div className="adm-usr-modalico red"><Trash2 size={24} /></div>
                <h3>Delete this account?</h3>
                <p>This will permanently delete {u.name}&apos;s account, including:</p>
                <div className="adm-usr-warnline">
                  - All applications and their documents<br />
                  - All message threads<br />
                  - All authorization records<br />
                  - Payment history record (transaction records may be retained separately for financial compliance)
                </div>
                <p style={{ marginTop: 12, fontWeight: 600, color: '#F87171' }}>This cannot be undone.</p>
                <div className="adm-usr-modalactions">
                  <button className="adm-usr-btn adm-usr-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                  <button className="adm-usr-btn adm-usr-btn-dangeroutline" onClick={() => { setModal('delete2'); setDeleteTyped('') }}>Continue</button>
                </div>
              </>
            )}
            {modal === 'delete2' && (
              <>
                <div className="adm-usr-modalico red"><Trash2 size={24} /></div>
                <h3>Type the user&apos;s email to confirm deletion</h3>
                <p>Type <b className="mono" style={{ color: 'var(--adm-t-hi)' }}>{u.email}</b> to permanently delete this account.</p>
                <div className="adm-usr-confirmfield">
                  <label>Confirm email</label>
                  <input className="adm-usr-confirminput" placeholder={u.email} value={deleteTyped} onChange={e => setDeleteTyped(e.target.value)} autoComplete="off" />
                </div>
                <div className="adm-usr-modalactions">
                  <button className="adm-usr-btn adm-usr-btn-ghost" onClick={() => { setModal(null); setDeleteTyped('') }}>Cancel</button>
                  <button className="adm-usr-btn adm-usr-btn-dangersolid" disabled={deleteTyped !== u.email} onClick={handleDeleteConfirm}>
                    <Trash2 size={14} />Delete permanently
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// User Detail View
function UserDetail({ userId, onBack }: { userId: string; onBack: () => void }) {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<ModalType>(null)
  const [deleteTyped, setDeleteTyped] = useState('')
  const [suspendReason, setSuspendReason] = useState('Terms violation')
  const [premiumPlan, setPremiumPlan] = useState<'monthly' | 'yearly'>('monthly')

  const { data: detail, isLoading, isError } = useQuery<ApiAdminUserDetail>({
    queryKey: ['admin', 'users', userId],
    queryFn: () => api.get(`/api/v1/admin/users/${userId}`).then(r => r.data.data),
  })

  const suspendMutation = useMutation({
    mutationFn: ({ isSuspended }: { isSuspended: boolean }) =>
      api.patch(`/api/v1/admin/users/${userId}/${isSuspended ? 'unsuspend' : 'suspend'}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setModal(null)
    },
  })

  const premiumMutation = useMutation({
    mutationFn: ({ isPremium, plan }: { isPremium: boolean; plan?: 'monthly' | 'yearly' }) =>
      api.patch(`/api/v1/admin/users/${userId}/premium`, { isPremium, plan }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setModal(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (confirmEmail: string) =>
      api.delete(`/api/v1/admin/users/${userId}`, { data: { confirmEmail } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setModal(null)
      onBack()
    },
  })

  if (isLoading) {
    return (
      <div style={{ opacity: 0.4 }}>
        <div className="adm-skel adm-skel-line w25" style={{ height: 24, marginBottom: 24 }} />
        <div className="adm-skeleton-row">
          <div className="adm-skel adm-skel-circle" style={{ width: 56, height: 56 }} />
          <div className="adm-skel-block">
            <div className="adm-skel adm-skel-line w40" style={{ height: 18 }} />
            <div className="adm-skel adm-skel-line w25" style={{ height: 13 }} />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !detail) {
    return (
      <div className="adm-usr-empty">
        <div className="adm-usr-emptyico"><AlertTriangle size={40} /></div>
        <h2>Failed to load user</h2>
        <p>Check your connection and try refreshing.</p>
      </div>
    )
  }

  const initials = deriveInitials(detail.name)
  const status = deriveStatus(detail.suspendedAt)
  const plan = derivePlan(detail.isPremium)
  const registered = formatDate(detail.createdAt)
  const isActive = status === 'active'

  return (
    <>
      <span className="adm-usr-backlink" onClick={onBack}>
        <ChevronLeft size={14} /><span>Back to users</span>
      </span>

      <div className="adm-usr-detailhead">
        <div className="adm-usr-detailheadleft">
          <span className="adm-usr-detailav" style={{ overflow: 'hidden', padding: 0 }}>
            {detail.avatarUrl
              ? <img src={detail.avatarUrl} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement as HTMLElement).textContent = initials }} />
              : initials}
          </span>
          <div>
            <div className="adm-usr-detailname">{detail.name}</div>
            <div className="adm-usr-detailemail">{detail.email}</div>
            <div className="adm-usr-detailbadges">
              <StatusBadge status={status} />
              <PlanBadge plan={plan} />
            </div>
          </div>
        </div>
        <div className="adm-usr-detailactions">
          <button className="adm-usr-btn-warn" onClick={() => setModal('suspend')} disabled={suspendMutation.isPending}>
            <Ban size={14} />{isActive ? 'Suspend account' : 'Reinstate account'}
          </button>
          <button className="adm-usr-btn" style={{ background: plan === 'premium' ? '#6B7280' : '#7C3AED', color: '#fff' }} onClick={() => setModal('premium')} disabled={premiumMutation.isPending}>
            <Shield size={14} />{plan === 'premium' ? 'Revoke premium' : 'Grant premium'}
          </button>
          <button className="adm-usr-btn-danger" onClick={() => setModal('delete1')}>
            <Trash2 size={14} />Delete account
          </button>
        </div>
      </div>

      <div className="adm-usr-sections">
        <div className="adm-usr-card adm-usr-anim" style={{ animationDelay: '0ms' }}>
          <h4>Profile info</h4>
          <div className="adm-usr-profilegrid">
            <div className="adm-usr-field"><div className="k">Name</div><div className="v">{detail.name}</div></div>
            <div className="adm-usr-field"><div className="k">Email</div><div className="v">{detail.email}</div></div>
            <div className="adm-usr-field"><div className="k">Location</div><div className="v">{(detail.preferences as any)?.location || (detail.preferences as any)?.country || '-'}</div></div>
            <div className="adm-usr-field"><div className="k">Nationality</div><div className="v">{(detail.preferences as any)?.nationality || '-'}</div></div>
            <div className="adm-usr-field full"><div className="k">Bio</div><div className="v">{(detail.preferences as any)?.bio || '-'}</div></div>
          </div>
        </div>

        <div className="adm-usr-card adm-usr-anim" style={{ animationDelay: '40ms' }}>
          <h4>Onboarding answers</h4>
          {detail.preferences && Object.keys(detail.preferences).length > 0 ? (
            <div className="adm-usr-profilegrid">
              {(['role', 'goal', 'interests', 'fieldOfStudy', 'educationLevel'] as const).map(key => {
                const val = (detail.preferences as any)?.[key]
                if (!val) return null
                const label: Record<string, string> = { role: 'Role', goal: 'Goal', interests: 'Interests', fieldOfStudy: 'Field of study', educationLevel: 'Education level' }
                return (
                  <div key={key} className="adm-usr-field"><div className="k">{label[key]}</div><div className="v">{Array.isArray(val) ? val.join(', ') : String(val)}</div></div>
                )
              })}
            </div>
          ) : (
            <div className="adm-usr-emptyline">No onboarding answers recorded.</div>
          )}
        </div>

        <div className="adm-usr-card adm-usr-anim" style={{ animationDelay: '80ms' }}>
          <h4>Application history</h4>
          <div className="adm-usr-emptyline">{detail.applicationCount > 0 ? `${detail.applicationCount} application${detail.applicationCount !== 1 ? 's' : ''} on record.` : 'No applications yet.'}</div>
        </div>

        <div className="adm-usr-card adm-usr-anim" style={{ animationDelay: '120ms' }}>
          <h4>Credential library summary</h4>
          <div className="adm-usr-doccount mono">{detail.documentCount}</div>
          <div className="adm-usr-doclabel">document{detail.documentCount !== 1 ? 's' : ''} in library</div>
        </div>

        <div className="adm-usr-card adm-usr-anim" style={{ animationDelay: '160ms' }}>
          <h4>Payment history</h4>
          {detail.paymentHistory.length > 0 ? (
            <table className="adm-usr-table" style={{ marginTop: 8 }}>
              <thead><tr><th>Purpose</th><th>Amount</th><th>Gateway</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {detail.paymentHistory.map(p => (
                  <tr key={p.id}>
                    <td>{p.purpose.replace(/_/g, ' ')}</td>
                    <td className="mono">${(p.amountUsd / 100).toFixed(2)}</td>
                    <td>{p.gateway}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td className="mono">{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="adm-usr-emptyline">No payments recorded.</div>
          )}
        </div>

      </div>

      {modal && createPortal(
        <div className="adm-usr-overlay show" onClick={e => { if (e.target === e.currentTarget) { setModal(null); setDeleteTyped('') } }}>
          <div className="adm-usr-modal">
            {modal === 'suspend' && (
              <>
                <div className="adm-usr-modalico amber"><Ban size={24} /></div>
                <h3>{isActive ? 'Suspend' : 'Reinstate'} this account?</h3>
                <p>{isActive
                  ? `${detail.name} will be immediately logged out and unable to log back in until reinstated. Their data is not affected.`
                  : `${detail.name} will regain access and can log back in immediately.`}</p>
                {isActive && (
                  <div className="adm-usr-confirmfield">
                    <label>Reason (optional)</label>
                    <CustomSelect value={suspendReason} onChange={setSuspendReason}
                      options={[{ value: 'Terms violation', label: 'Terms violation' }, { value: 'Suspicious activity', label: 'Suspicious activity' }, { value: 'User request', label: 'User request' }, { value: 'Other', label: 'Other' }]} />
                  </div>
                )}
                <div className="adm-usr-modalactions">
                  <button className="adm-usr-btn adm-usr-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                  <button className="adm-usr-btn" style={{ background: '#D97706', color: '#fff' }} onClick={() => suspendMutation.mutate({ isSuspended: !isActive })}>
                    {isActive ? <><Ban size={14} />Suspend account</> : <><Check size={14} />Reinstate account</>}
                  </button>
                </div>
              </>
            )}
            {modal === 'premium' && (
              <>
                <div className="adm-usr-modalico" style={{ background: plan === 'premium' ? '#F3F4F6' : '#EDE9FE' }}><Shield size={24} style={{ color: plan === 'premium' ? '#6B7280' : '#7C3AED' }} /></div>
                <h3>{plan === 'premium' ? 'Revoke premium access?' : 'Grant premium access'}</h3>
                {plan === 'premium' ? (
                  <p>{detail.name}&apos;s premium access will be revoked immediately. They will revert to the free plan.</p>
                ) : (
                  <>
                    <p>Select a plan duration for {detail.name}. Access will be granted immediately.</p>
                    <div className="adm-usr-confirmfield">
                      <label>Plan</label>
                      <CustomSelect
                        value={premiumPlan}
                        onChange={v => setPremiumPlan(v as 'monthly' | 'yearly')}
                        options={[
                          { value: 'monthly', label: 'Monthly (30 days)' },
                          { value: 'yearly', label: 'Yearly (365 days)' },
                        ]}
                      />
                    </div>
                  </>
                )}
                <div className="adm-usr-modalactions">
                  <button className="adm-usr-btn adm-usr-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                  <button
                    className="adm-usr-btn"
                    style={{ background: plan === 'premium' ? '#6B7280' : '#7C3AED', color: '#fff' }}
                    disabled={premiumMutation.isPending}
                    onClick={() => premiumMutation.mutate(plan === 'premium' ? { isPremium: false } : { isPremium: true, plan: premiumPlan })}
                  >
                    <Shield size={14} />{plan === 'premium' ? 'Revoke premium' : 'Grant premium'}
                  </button>
                </div>
              </>
            )}
            {modal === 'delete1' && (
              <>
                <div className="adm-usr-modalico red"><Trash2 size={24} /></div>
                <h3>Delete this account?</h3>
                <p>This will permanently delete {detail.name}&apos;s account, including:</p>
                <div className="adm-usr-warnline">
                  - All applications and their documents<br />
                  - All message threads<br />
                  - All authorization records<br />
                  - Payment history record (transaction records may be retained separately for financial compliance)
                </div>
                <p style={{ marginTop: 12, fontWeight: 600, color: '#F87171' }}>This cannot be undone.</p>
                <div className="adm-usr-modalactions">
                  <button className="adm-usr-btn adm-usr-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                  <button className="adm-usr-btn adm-usr-btn-dangeroutline" onClick={() => { setModal('delete2'); setDeleteTyped('') }}>Continue</button>
                </div>
              </>
            )}
            {modal === 'delete2' && (
              <>
                <div className="adm-usr-modalico red"><Trash2 size={24} /></div>
                <h3>Type the user&apos;s email to confirm deletion</h3>
                <p>Type <b className="mono" style={{ color: 'var(--adm-t-hi)' }}>{detail.email}</b> to permanently delete this account.</p>
                <div className="adm-usr-confirmfield">
                  <label>Confirm email</label>
                  <input className="adm-usr-confirminput" placeholder={detail.email} value={deleteTyped} onChange={e => setDeleteTyped(e.target.value)} autoComplete="off" />
                </div>
                <div className="adm-usr-modalactions">
                  <button className="adm-usr-btn adm-usr-btn-ghost" onClick={() => { setModal(null); setDeleteTyped('') }}>Cancel</button>
                  <button className="adm-usr-btn adm-usr-btn-dangersolid" disabled={deleteTyped !== detail.email || deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteTyped)}>
                    <Trash2 size={14} />Delete permanently
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// ---- PERMISSION MATRIX ----
const PERM_MATRIX = [
  {
    section: 'Content',
    rows: [
      { label: 'View opportunities', staff: true, manager: true, super: true },
      { label: 'Create/edit listings', staff: false, manager: true, super: true },
      { label: 'Bulk CSV import', staff: false, manager: true, super: true },
    ],
  },
  {
    section: 'Applications',
    rows: [
      { label: 'View applications', staff: true, manager: true, super: true },
      { label: 'Update app status', staff: true, manager: true, super: true },
      { label: 'View messages', staff: true, manager: true, super: true },
      { label: 'Reply to messages', staff: true, manager: true, super: true },
    ],
  },
  {
    section: 'Users',
    rows: [
      { label: 'View users', staff: false, manager: true, super: true },
      { label: 'Suspend users', staff: false, manager: true, super: true },
      { label: 'Delete users', staff: false, manager: false, super: true },
      { label: 'Invite admins', staff: false, manager: false, super: true },
      { label: 'Change admin roles', staff: false, manager: false, super: true },
    ],
  },
  {
    section: 'Revenue',
    rows: [
      { label: 'View payments', staff: false, manager: true, super: true },
      { label: 'Issue refunds', staff: false, manager: false, super: true },
      { label: 'Manage ebooks', staff: false, manager: true, super: true },
    ],
  },
  {
    section: 'Configuration',
    rows: [
      { label: 'View analytics', staff: false, manager: true, super: true },
      { label: 'Update settings', staff: false, manager: false, super: true },
      { label: 'Configure ad placements', staff: false, manager: false, super: true },
    ],
  },
]

function PermissionMatrixModal({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 10); return () => clearTimeout(t) }, [])

  return createPortal(
    <div
      className="adm-usr-overlay show"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ alignItems: 'center' }}
    >
      <div
        style={{
          background: '#FFFCF9',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(42,18,6,0.18)',
          width: '100%',
          maxWidth: 580,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          transform: mounted ? 'scale(1)' : 'scale(0.96)',
          opacity: mounted ? 1 : 0,
          transition: 'transform 200ms cubic-bezier(0.25,0.46,0.45,0.94), opacity 200ms ease',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(42,18,6,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--adm-serif,serif)', fontSize: 17, fontWeight: 700, color: '#2A1206' }}>Permission reference</div>
            <div style={{ fontFamily: 'sans-serif', fontSize: 12.5, color: '#9A6A3A', marginTop: 2 }}>What each admin role can access</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(42,18,6,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7A4A1A', flexShrink: 0 }}>
            <X size={15} />
          </button>
        </div>

        {/* Column headers */}
        <div style={{ padding: '10px 24px 0', display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', gap: 0 }}>
          <div />
          {['Staff', 'Manager', 'Super'].map(h => (
            <div key={h} style={{ textAlign: 'center', fontFamily: 'sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9A6A3A', paddingBottom: 8 }}>{h}</div>
          ))}
        </div>

        {/* Matrix body */}
        <div style={{ overflowY: 'auto', padding: '0 24px 24px', flex: 1 }}>
          {PERM_MATRIX.map((section, si) => (
            <div key={section.section} style={{ marginTop: si > 0 ? 16 : 0 }}>
              <div style={{ fontFamily: 'var(--adm-serif,serif)', fontSize: 12, fontWeight: 700, color: '#C17F3A', letterSpacing: '0.04em', textTransform: 'uppercase', padding: '10px 0 6px', borderBottom: '1px solid rgba(193,127,58,0.15)', marginBottom: 4 }}>
                {section.section}
              </div>
              {section.rows.map((row, ri) => (
                <div
                  key={row.label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 80px 80px 80px',
                    alignItems: 'center',
                    padding: '7px 0',
                    background: ri % 2 === 0 ? 'transparent' : 'rgba(42,18,6,0.015)',
                    borderRadius: 6,
                    transition: 'background 120ms ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(193,127,58,0.04)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ri % 2 === 0 ? 'transparent' : 'rgba(42,18,6,0.015)' }}
                >
                  <span style={{ fontFamily: 'sans-serif', fontSize: 13, color: '#2A1206' }}>{row.label}</span>
                  {[row.staff, row.manager, row.super].map((allowed, ci) => (
                    <div key={ci} style={{ textAlign: 'center' }}>
                      {allowed
                        ? <Check size={14} style={{ color: '#059669', strokeWidth: 2.5 }} />
                        : <span style={{ fontFamily: 'monospace', fontSize: 14, color: 'rgba(42,18,6,0.22)', lineHeight: 1 }}>-</span>
                      }
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}

// Admin Accounts Tab
function AdminTab() {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<'invite' | 'revoke' | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<AdminUser | null>(null)
  const [inviteSent, setInviteSent] = useState(false)
  const [inviteRole, setInviteRole] = useState('manager')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [permModalOpen, setPermModalOpen] = useState(false)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [editingRoleValue, setEditingRoleValue] = useState<'manager' | 'staff'>('staff')
  const [roleErrorId, setRoleErrorId] = useState<string | null>(null)
  const [revokedIds, setRevokedIds] = useState<Set<string>>(new Set())

  // Get self-identity to prevent self-edit
  const [selfId, setSelfId] = useState<string | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('oppdate_admin')
      if (raw) {
        const p = JSON.parse(raw)
        setSelfId(p.id ?? null)
        setIsSuperAdmin(p.role === 'super_admin')
      }
    } catch { /* ignore */ }
  }, [])

  const { data: apiResponse, isLoading, isError } = useQuery<ApiUsersResponse>({
    queryKey: ['admin', 'admins'],
    queryFn: () =>
      api.get('/api/v1/admin/users', { params: { limit: 100 } }).then(r => r.data),
  })

  const admins = useMemo(() => {
    const all = apiResponse?.data ?? []
    return all.filter(u => u.role !== 'user').map(toAdminUser).filter(a => !revokedIds.has(a.id))
  }, [apiResponse, revokedIds])

  const inviteMutation = useMutation({
    mutationFn: ({ email, name, role }: { email: string; name: string; role: string }) =>
      api.post('/api/v1/admin/invite', { email, name, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] })
      setInviteSent(true)
    },
  })

  const roleChangeMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch(`/api/v1/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] })
      setEditingRoleId(null)
    },
    onError: (_err, vars) => {
      setRoleErrorId(vars.id)
      setTimeout(() => setRoleErrorId(null), 1200)
      setEditingRoleId(null)
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/v1/admin/users/${id}`, { data: { confirmEmail: revokeTarget?.email } }),
    onSuccess: () => {
      if (revokeTarget) setRevokedIds(prev => new Set([...prev, revokeTarget.id]))
      queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] })
      setModal(null)
      setRevokeTarget(null)
    },
  })

  if (isLoading) {
    return (
      <div className="adm-skeleton-table" style={{ opacity: 0.4 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="adm-skeleton-row">
            <div className="adm-skel adm-skel-circle" />
            <div className="adm-skel-block">
              <div className="adm-skel adm-skel-line w60" style={{ height: 14 }} />
              <div className="adm-skel adm-skel-line w40" style={{ height: 10 }} />
            </div>
            <div className="adm-skel adm-skel-badge" />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="adm-usr-empty">
        <div className="adm-usr-emptyico"><AlertTriangle size={40} /></div>
        <h2>Failed to load admin team</h2>
        <p>Check your connection and try refreshing.</p>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes rbShake {
          0%,100% { transform: translateX(0) }
          20% { transform: translateX(-4px) }
          40% { transform: translateX(4px) }
          60% { transform: translateX(-3px) }
          80% { transform: translateX(3px) }
        }
        @keyframes rbFadeOut {
          to { opacity: 0; transform: translateX(-20px) }
        }
      `}</style>

      <div className="adm-usr-adminhead">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div>
            <h3>Admin team</h3>
            <span className="adm-usr-adminsub">Manage internal panel access</span>
          </div>
          <button
            onClick={() => setPermModalOpen(true)}
            title="View permission reference"
            style={{ width: 26, height: 26, borderRadius: 8, border: 'none', background: 'rgba(42,18,6,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9A6A3A', flexShrink: 0, marginLeft: 4 }}
          >
            <HelpCircle size={14} />
          </button>
        </div>
        <button className="adm-usr-btn adm-usr-btn-primary" onClick={() => { setModal('invite'); setInviteSent(false); setInviteEmail(''); setInviteName('') }}>
          <UserPlus size={14} />Invite new admin
        </button>
      </div>

      <div className="adm-usr-tablewrap">
        <table className="adm-usr-table adm-usr-admintable">
          <thead><tr><th>Admin</th><th>Role</th><th>Last active</th><th></th></tr></thead>
          <tbody>
            {admins.map(a => {
              const isSelf = a.id === selfId
              const isFounder = a.role === 'founder'
              const isEditing = editingRoleId === a.id
              const hasError = roleErrorId === a.id
              return (
                <tr
                  key={a.id}
                  style={{
                    animation: hasError ? 'rbShake 300ms ease' : undefined,
                    background: isFounder ? 'rgba(193,127,58,0.03)' : undefined,
                    transition: 'background 300ms ease',
                  }}
                >
                  <td>
                    <div className="adm-usr-usercell">
                      <span className="adm-usr-avatar">{a.initials}</span>
                      <div>
                        <div className="adm-usr-username">
                          {a.name}
                          {isSelf && <span style={{ fontFamily: 'sans-serif', fontSize: 10.5, color: '#9A6A3A', marginLeft: 6, background: 'rgba(42,18,6,0.06)', borderRadius: 4, padding: '1px 5px' }}>You</span>}
                        </div>
                        <div className="adm-usr-useremail">{a.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {isEditing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <select
                          value={editingRoleValue}
                          onChange={e => setEditingRoleValue(e.target.value as 'manager' | 'staff')}
                          autoFocus
                          style={{
                            height: 28, padding: '0 8px', borderRadius: 6, fontSize: 12,
                            border: '1.5px solid rgba(193,127,58,0.45)',
                            background: 'rgba(255,255,255,0.9)',
                            color: '#2A1206', outline: 'none', cursor: 'pointer',
                          }}
                        >
                          <option value="manager">Manager</option>
                          <option value="staff">Staff</option>
                        </select>
                        <button
                          onClick={() => roleChangeMutation.mutate({ id: a.id, role: editingRoleValue === 'manager' ? 'manager_admin' : 'staff_admin' })}
                          disabled={roleChangeMutation.isPending}
                          style={{ height: 28, padding: '0 10px', borderRadius: 6, border: 'none', background: '#C17F3A', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setEditingRoleId(null)}
                          style={{ height: 28, padding: '0 8px', borderRadius: 6, border: '1px solid rgba(42,18,6,0.12)', background: 'transparent', color: '#7A4A1A', fontSize: 12, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <RoleBadge role={a.role} />
                        {isFounder && <Lock size={11} style={{ color: '#C4A882', flexShrink: 0 }} title="Role cannot be changed" />}
                      </div>
                    )}
                  </td>
                  <td><span className="mono">{a.lastActive}</span></td>
                  <td>
                    {isFounder ? null : (
                      <div className="adm-usr-adminactions">
                        {isSuperAdmin && !isSelf ? (
                          <span
                            className="adm-usr-adminlink"
                            onClick={() => {
                              setEditingRoleId(a.id)
                              setEditingRoleValue(a.role === 'manager' ? 'manager' : 'staff')
                            }}
                          >
                            Edit role
                          </span>
                        ) : isSelf ? (
                          <span className="adm-usr-adminlink" style={{ opacity: 0.35, cursor: 'default' }} title="You cannot change your own role">
                            Edit role
                          </span>
                        ) : null}
                        {isSuperAdmin && !isSelf && (
                          <span className="adm-usr-adminlink danger" onClick={() => { setRevokeTarget(a); setModal('revoke') }}>Revoke access</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {permModalOpen && <PermissionMatrixModal onClose={() => setPermModalOpen(false)} />}

      {modal && createPortal(
        <div className="adm-usr-overlay show" onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="adm-usr-modal">
            {modal === 'invite' && !inviteSent && (
              <>
                <div className="adm-usr-modalico amber"><UserPlus size={24} /></div>
                <h3>Invite new admin</h3>
                <p>They will receive an email invite link and set their own password when they accept. You never set or see their password.</p>
                <div className="adm-usr-confirmfield">
                  <label>Name</label>
                  <input className="adm-usr-confirminput" placeholder="Full name" value={inviteName} onChange={e => setInviteName(e.target.value)} autoComplete="off" />
                </div>
                <div className="adm-usr-confirmfield">
                  <label>Email</label>
                  <input className="adm-usr-confirminput" placeholder="name@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} autoComplete="off" />
                </div>
                <div className="adm-usr-confirmfield">
                  <label>Role</label>
                  <CustomSelect value={inviteRole} onChange={setInviteRole}
                    options={[{ value: 'manager', label: 'Manager' }, { value: 'staff', label: 'Staff' }]} />
                </div>
                {inviteMutation.isError && (
                  <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 6, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171', fontSize: 13 }}>
                    {(inviteMutation.error as any)?.response?.data?.message || 'Invite failed. Please try again.'}
                  </div>
                )}
                <div className="adm-usr-modalactions">
                  <button className="adm-usr-btn adm-usr-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                  <button
                    className="adm-usr-btn adm-usr-btn-primary"
                    disabled={!inviteEmail || !inviteName || inviteMutation.isPending}
                    onClick={() => inviteMutation.mutate({ email: inviteEmail, name: inviteName, role: mapDisplayRoleToDb(inviteRole) })}
                  >
                    <Mail size={14} />{inviteMutation.isPending ? 'Sending...' : 'Send invite'}
                  </button>
                </div>
              </>
            )}
            {modal === 'invite' && inviteSent && (
              <>
                <div className="adm-usr-modalico ok"><Check size={24} /></div>
                <h3>Invite sent</h3>
                <div className="adm-usr-invitesuccess">
                  <span className="adm-usr-invitecheck"><Check size={13} /></span>
                  Invite sent to {inviteEmail}
                </div>
                <div className="adm-usr-modalactions" style={{ marginTop: 20 }}>
                  <button className="adm-usr-btn adm-usr-btn-primary" style={{ flex: '1 1 auto', justifyContent: 'center' }} onClick={() => setModal(null)}>Done</button>
                </div>
              </>
            )}
            {modal === 'revoke' && revokeTarget && (
              <>
                <div className="adm-usr-modalico red"><Lock size={24} /></div>
                <h3>Revoke {revokeTarget.name}&apos;s admin access?</h3>
                <p>They will be logged out immediately and permanently lose all admin panel access. This action cannot be undone.</p>
                <div style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 8, padding: '10px 14px', fontFamily: 'sans-serif', fontSize: 12.5, color: '#7A2D05', marginBottom: 4 }}>
                  {revokeTarget.email}
                </div>
                <div className="adm-usr-modalactions">
                  <button className="adm-usr-btn adm-usr-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                  <button
                    className="adm-usr-btn adm-usr-btn-dangersolid"
                    disabled={revokeMutation.isPending}
                    onClick={() => revokeMutation.mutate(revokeTarget.id)}
                  >
                    <Lock size={14} />{revokeMutation.isPending ? 'Revoking...' : 'Revoke access'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

/* ============================================================
   MOBILE: PLATFORM USERS LIST
   ============================================================ */
function MobilePlatformList({ onView }: { onView: (id: string) => void }) {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all')
  const [planFilter, setPlanFilter] = useState<'all' | UserPlan>('all')
  const [planSheetOpen, setPlanSheetOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data: apiResponse, isLoading, isError } = useQuery<ApiUsersResponse>({
    queryKey: ['admin', 'users', search, planFilter, page],
    queryFn: () =>
      api.get('/api/v1/admin/users', {
        params: {
          role: 'user',
          search: search || undefined,
          isPremium: planFilter === 'premium' ? 'true' : planFilter === 'free' ? 'false' : undefined,
          page,
          limit: 20,
        },
      }).then(r => r.data),
  })

  const rawUsers = apiResponse?.data ?? []
  const users = rawUsers.map(toDisplayUser)

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false
      return true
    })
  }, [users, statusFilter])

  const statusCounts = useMemo(() => ({
    all: users.length,
    active: users.filter(u => u.status === 'active').length,
    suspended: users.filter(u => u.status === 'suspended').length,
  }), [users])

  const planCounts = useMemo(() => ({
    all: users.length,
    free: users.filter(u => u.plan === 'free').length,
    premium: users.filter(u => u.plan === 'premium').length,
  }), [users])

  if (isLoading) {
    return (
      <div className="adm-mob-usr-list">
        <div className="adm-skeleton-table" style={{ opacity: 0.4, padding: '16px 0' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="adm-skeleton-row">
              <div className="adm-skel adm-skel-circle" />
              <div className="adm-skel-block">
                <div className="adm-skel adm-skel-line w60" style={{ height: 14 }} />
                <div className="adm-skel adm-skel-line w40" style={{ height: 10 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="adm-mob-usr-list">
        <div className="adm-usr-empty" style={{ padding: '48px 24px', minHeight: 'auto' }}>
          <div className="adm-usr-emptyico"><AlertTriangle size={40} /></div>
          <h2>Failed to load users</h2>
          <p>Check your connection and try refreshing.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="adm-mob-usr-list">
      <div className="adm-mob-usr-filter-glass">
        <div className="adm-mob-usr-filter-top">
          <div className="adm-mob-usr-search"><Search size={15} /><input placeholder="Search by name or email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} /></div>
          <button className="adm-mob-usr-filter-btn" onClick={() => setPlanSheetOpen(true)}>
            <SlidersHorizontal size={16} />
            {planFilter !== 'all' && <span className="adm-mob-usr-filter-dot" />}
          </button>
        </div>
        <div className="adm-mob-usr-pills-scroll">
          <div className="adm-mob-usr-pills-track">
            {(['all', 'active', 'suspended'] as const).map(s => (
              <button key={s} className={`adm-usr-pill${statusFilter === s ? ' active' : ''}`} onClick={() => setStatusFilter(s)}>
                {s[0].toUpperCase() + s.slice(1)}
                <span className="adm-usr-pcount">{statusCounts[s]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="adm-usr-empty" style={{ padding: '48px 24px', minHeight: 'auto' }}>
          <div className="adm-usr-emptyico"><Search size={40} /></div>
          <h2>No users match this filter</h2>
          <p>Try a different search term or filter.</p>
        </div>
      ) : (
        <div className="adm-mob-usr-cards">
          {filtered.map((u, i) => (
            <div key={u.id} className="adm-mob-usr-card adm-mob-card-anim" style={{ animationDelay: `${i * 40}ms` }} onClick={() => onView(u.id)}>
              <div className="adm-mob-usr-card-top">
                <span className="adm-usr-avatar">{u.initials}</span>
                <div className="adm-mob-usr-card-identity">
                  <div className="adm-mob-usr-card-name">{u.name}</div>
                  <div className="adm-mob-usr-card-email">{u.email}</div>
                </div>
                <StatusBadge status={u.status} />
              </div>
              <div className="adm-mob-usr-card-meta">
                <PlanBadge plan={u.plan} /> <span className="adm-mob-usr-card-reg">Registered <span className="mono">{u.registered}</span></span>
              </div>
              <div className="adm-mob-usr-card-div" />
              <div className="adm-mob-usr-card-stats">
                <span>- applications</span>
                <span className="mono">- spent</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {planSheetOpen && createPortal(
        <div className="adm-bsheet-backdrop show" onClick={() => setPlanSheetOpen(false)}>
          <div className="adm-bsheet show" onClick={e => e.stopPropagation()}>
            <div className="adm-bsheet-handle" />
            <div className="adm-bsheet-head"><h3>Filter by plan</h3></div>
            <div className="adm-bsheet-body">
              {([
                { value: 'all', label: 'All plans', count: planCounts.all, dotCls: '' },
                { value: 'free', label: 'Free', count: planCounts.free, dotCls: 'free' },
                { value: 'premium', label: 'Premium', count: planCounts.premium, dotCls: 'premium' },
              ] as const).map(o => (
                <div
                  key={o.value}
                  className={`adm-mob-usr-planopt${planFilter === o.value ? ' selected' : ''}`}
                  onClick={() => { setPlanFilter(o.value as 'all' | UserPlan); setPlanSheetOpen(false) }}
                >
                  <div className="adm-mob-usr-planopt-left">
                    {o.dotCls && <span className={`adm-mob-usr-plandot ${o.dotCls}`} />}
                    <span>{o.label}</span>
                    <span className="adm-mob-usr-plancount">{o.count}</span>
                  </div>
                  {planFilter === o.value && <Check size={16} />}
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

/* ============================================================
   MOBILE: USER DETAIL
   ============================================================ */
function MobileUserDetail({ userId, onBack }: { userId: string; onBack: () => void }) {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<ModalType>(null)
  const [deleteTyped, setDeleteTyped] = useState('')
  const [suspendReason, setSuspendReason] = useState('Terms violation')
  const [premiumPlan, setPremiumPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [appsOpen, setAppsOpen] = useState(true)
  const [paymentsOpen, setPaymentsOpen] = useState(true)
  const [docsOpen, setDocsOpen] = useState(false)

  const { data: detail, isLoading, isError } = useQuery<ApiAdminUserDetail>({
    queryKey: ['admin', 'users', userId],
    queryFn: () => api.get(`/api/v1/admin/users/${userId}`).then(r => r.data.data),
  })

  const suspendMutation = useMutation({
    mutationFn: ({ isSuspended }: { isSuspended: boolean }) =>
      api.patch(`/api/v1/admin/users/${userId}/${isSuspended ? 'unsuspend' : 'suspend'}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setModal(null)
    },
  })

  const premiumMutation = useMutation({
    mutationFn: ({ isPremium, plan }: { isPremium: boolean; plan?: 'monthly' | 'yearly' }) =>
      api.patch(`/api/v1/admin/users/${userId}/premium`, { isPremium, plan }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setModal(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (confirmEmail: string) =>
      api.delete(`/api/v1/admin/users/${userId}`, { data: { confirmEmail } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setModal(null)
      onBack()
    },
  })

  if (isLoading) {
    return (
      <div className="adm-mob-usr-detail">
        <div className="adm-mob-usr-detail-head">
          <button className="adm-mob-con-back" onClick={onBack}><ArrowLeft size={20} /></button>
          <span className="adm-mob-usr-detail-headname" />
        </div>
        <div className="adm-mob-usr-detail-body">
          <div className="adm-mob-usr-detail-card" style={{ opacity: 0.4 }}>
            <div className="adm-skeleton-row">
              <div className="adm-skel adm-skel-circle" style={{ width: 48, height: 48 }} />
              <div className="adm-skel-block">
                <div className="adm-skel adm-skel-line w60" style={{ height: 16 }} />
                <div className="adm-skel adm-skel-line w40" style={{ height: 12 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isError || !detail) {
    return (
      <div className="adm-mob-usr-detail">
        <div className="adm-mob-usr-detail-head">
          <button className="adm-mob-con-back" onClick={onBack}><ArrowLeft size={20} /></button>
        </div>
        <div className="adm-mob-usr-detail-body">
          <div className="adm-usr-empty" style={{ padding: '48px 24px', minHeight: 'auto' }}>
            <div className="adm-usr-emptyico"><AlertTriangle size={40} /></div>
            <h2>Failed to load user</h2>
            <p>Check your connection and try refreshing.</p>
          </div>
        </div>
      </div>
    )
  }

  const initials = deriveInitials(detail.name)
  const status = deriveStatus(detail.suspendedAt)
  const plan = derivePlan(detail.isPremium)
  const isActive = status === 'active'

  return (
    <div className="adm-mob-usr-detail">
      <div className="adm-mob-usr-detail-head">
        <button className="adm-mob-con-back" onClick={onBack}><ArrowLeft size={20} /></button>
        <span className="adm-mob-usr-detail-headname">{detail.name}</span>
      </div>

      <div className="adm-mob-usr-detail-body">
        {/* identity card */}
        <div className="adm-mob-usr-detail-card">
          <div className="adm-mob-usr-identity">
            <span className="adm-usr-detailav" style={{ overflow: 'hidden', padding: 0 }}>
              {detail.avatarUrl
                ? <img src={detail.avatarUrl} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement as HTMLElement).textContent = initials }} />
                : initials}
            </span>
            <div className="adm-mob-usr-identity-info">
              <div className="adm-usr-detailname" style={{ fontSize: 16 }}>{detail.name}</div>
              <div className="adm-usr-detailemail">{detail.email}</div>
              <div className="adm-usr-detailbadges" style={{ marginTop: 6 }}>
                <StatusBadge status={status} />
                <PlanBadge plan={plan} />
              </div>
            </div>
          </div>
          <div className="adm-mob-usr-detail-btns">
            <button className="adm-mob-usr-btn-warn" onClick={() => setModal('suspend')} disabled={suspendMutation.isPending}>
              <Ban size={14} />{isActive ? 'Suspend account' : 'Reinstate account'}
            </button>
            <button className="adm-usr-btn" style={{ background: plan === 'premium' ? '#6B7280' : '#7C3AED', color: '#fff' }} onClick={() => setModal('premium')} disabled={premiumMutation.isPending}>
              <Shield size={14} />{plan === 'premium' ? 'Revoke premium' : 'Grant premium'}
            </button>
            <button className="adm-mob-usr-btn-danger" onClick={() => setModal('delete1')}>
              <Trash2 size={14} />Delete account
            </button>
          </div>
        </div>

        {/* profile info */}
        <div className="adm-mob-usr-detail-card">
          <h4 className="adm-mob-usr-section-h">Profile info</h4>
          <div className="adm-mob-usr-kvlist">
            <div className="adm-mob-usr-kv"><span className="k">Name</span><span className="v">{detail.name}</span></div>
            <div className="adm-mob-usr-kv"><span className="k">Email</span><span className="v">{detail.email}</span></div>
            <div className="adm-mob-usr-kv"><span className="k">Location</span><span className="v">{(detail.preferences as any)?.location || (detail.preferences as any)?.country || '-'}</span></div>
            <div className="adm-mob-usr-kv"><span className="k">Nationality</span><span className="v">{(detail.preferences as any)?.nationality || '-'}</span></div>
            <div className="adm-mob-usr-kv"><span className="k">Bio</span><span className="v">{(detail.preferences as any)?.bio || '-'}</span></div>
          </div>
        </div>

        {/* onboarding - collapsed by default */}
        <div className="adm-mob-usr-detail-card">
          <div className="adm-mob-usr-collapse-toggle" onClick={() => setOnboardingOpen(o => !o)}>
            <h4 className="adm-mob-usr-section-h" style={{ margin: 0 }}>Onboarding answers</h4>
            <ChevronDown size={16} className={onboardingOpen ? 'adm-mob-usr-chevron-open' : ''} />
          </div>
          {onboardingOpen && (
            <div className="adm-mob-usr-collapse-body">
              {detail.preferences && Object.keys(detail.preferences).length > 0 ? (
                <div className="adm-mob-usr-kvlist">
                  {(['role', 'goal', 'interests', 'fieldOfStudy', 'educationLevel'] as const).map(key => {
                    const val = (detail.preferences as any)?.[key]
                    if (!val) return null
                    const label: Record<string, string> = { role: 'Role', goal: 'Goal', interests: 'Interests', fieldOfStudy: 'Field of study', educationLevel: 'Education level' }
                    return <div key={key} className="adm-mob-usr-kv"><span className="k">{label[key]}</span><span className="v">{Array.isArray(val) ? val.join(', ') : String(val)}</span></div>
                  })}
                </div>
              ) : (
                <div className="adm-usr-emptyline">No onboarding answers recorded.</div>
              )}
            </div>
          )}
        </div>

        {/* application history - open by default */}
        <div className="adm-mob-usr-detail-card">
          <div className="adm-mob-usr-collapse-toggle" onClick={() => setAppsOpen(o => !o)}>
            <h4 className="adm-mob-usr-section-h" style={{ margin: 0 }}>Application history ({detail.applicationCount})</h4>
            <ChevronDown size={16} className={appsOpen ? 'adm-mob-usr-chevron-open' : ''} />
          </div>
          {appsOpen && (
            <div className="adm-mob-usr-collapse-body">
              <div className="adm-usr-emptyline">{detail.applicationCount > 0 ? `${detail.applicationCount} application${detail.applicationCount !== 1 ? 's' : ''} on record.` : 'No applications yet.'}</div>
            </div>
          )}
        </div>

        {/* payment history - open by default */}
        <div className="adm-mob-usr-detail-card">
          <div className="adm-mob-usr-collapse-toggle" onClick={() => setPaymentsOpen(o => !o)}>
            <h4 className="adm-mob-usr-section-h" style={{ margin: 0 }}>
              Payment history
            </h4>
            <ChevronDown size={16} className={paymentsOpen ? 'adm-mob-usr-chevron-open' : ''} />
          </div>
          {paymentsOpen && (
            <div className="adm-mob-usr-collapse-body">
              {detail.paymentHistory.length > 0 ? (
                <div className="adm-mob-usr-kvlist">
                  {detail.paymentHistory.map(p => (
                    <div key={p.id} className="adm-mob-usr-kv" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                      <span className="v" style={{ fontWeight: 600 }}>{p.purpose.replace(/_/g, ' ')} - ${(p.amountUsd / 100).toFixed(2)}</span>
                      <span className="k">{p.gateway} &middot; <StatusBadge status={p.status} /> &middot; {formatDate(p.createdAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="adm-usr-emptyline">No payments recorded.</div>
              )}
            </div>
          )}
        </div>

        {/* credential library - collapsed by default */}
        <div className="adm-mob-usr-detail-card">
          <div className="adm-mob-usr-collapse-toggle" onClick={() => setDocsOpen(o => !o)}>
            <h4 className="adm-mob-usr-section-h" style={{ margin: 0 }}>
              Credential library <span className="adm-mob-usr-section-summary">&middot; {detail.documentCount} document{detail.documentCount !== 1 ? 's' : ''}</span>
            </h4>
            <ChevronDown size={16} className={docsOpen ? 'adm-mob-usr-chevron-open' : ''} />
          </div>
          {docsOpen && (
            <div className="adm-mob-usr-collapse-body">
              <div className="adm-usr-doccount mono">{detail.documentCount}</div>
              <div className="adm-usr-doclabel">document{detail.documentCount !== 1 ? 's' : ''} in library</div>
            </div>
          )}
        </div>

      </div>

      {modal && createPortal(
        <div className="adm-usr-overlay show" onClick={e => { if (e.target === e.currentTarget) { setModal(null); setDeleteTyped('') } }}>
          <div className="adm-usr-modal">
            {modal === 'suspend' && (
              <>
                <div className="adm-usr-modalico amber"><Ban size={24} /></div>
                <h3>{isActive ? 'Suspend' : 'Reinstate'} this account?</h3>
                <p>{isActive
                  ? `${detail.name} will be immediately logged out and unable to log back in until reinstated. Their data is not affected.`
                  : `${detail.name} will regain access and can log back in immediately.`}</p>
                {isActive && (
                  <div className="adm-usr-confirmfield">
                    <label>Reason (optional)</label>
                    <CustomSelect value={suspendReason} onChange={setSuspendReason}
                      options={[{ value: 'Terms violation', label: 'Terms violation' }, { value: 'Suspicious activity', label: 'Suspicious activity' }, { value: 'User request', label: 'User request' }, { value: 'Other', label: 'Other' }]} />
                  </div>
                )}
                <div className="adm-usr-modalactions">
                  <button className="adm-usr-btn adm-usr-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                  <button className="adm-usr-btn" style={{ background: '#D97706', color: '#fff' }} onClick={() => suspendMutation.mutate({ isSuspended: !isActive })}>
                    {isActive ? <><Ban size={14} />Suspend account</> : <><Check size={14} />Reinstate account</>}
                  </button>
                </div>
              </>
            )}
            {modal === 'premium' && (
              <>
                <div className="adm-usr-modalico" style={{ background: plan === 'premium' ? '#F3F4F6' : '#EDE9FE' }}><Shield size={24} style={{ color: plan === 'premium' ? '#6B7280' : '#7C3AED' }} /></div>
                <h3>{plan === 'premium' ? 'Revoke premium access?' : 'Grant premium access'}</h3>
                {plan === 'premium' ? (
                  <p>{detail.name}&apos;s premium access will be revoked immediately. They will revert to the free plan.</p>
                ) : (
                  <>
                    <p>Select a plan duration for {detail.name}. Access will be granted immediately.</p>
                    <div className="adm-usr-confirmfield">
                      <label>Plan</label>
                      <CustomSelect
                        value={premiumPlan}
                        onChange={v => setPremiumPlan(v as 'monthly' | 'yearly')}
                        options={[
                          { value: 'monthly', label: 'Monthly (30 days)' },
                          { value: 'yearly', label: 'Yearly (365 days)' },
                        ]}
                      />
                    </div>
                  </>
                )}
                <div className="adm-usr-modalactions">
                  <button className="adm-usr-btn adm-usr-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                  <button
                    className="adm-usr-btn"
                    style={{ background: plan === 'premium' ? '#6B7280' : '#7C3AED', color: '#fff' }}
                    disabled={premiumMutation.isPending}
                    onClick={() => premiumMutation.mutate(plan === 'premium' ? { isPremium: false } : { isPremium: true, plan: premiumPlan })}
                  >
                    <Shield size={14} />{plan === 'premium' ? 'Revoke premium' : 'Grant premium'}
                  </button>
                </div>
              </>
            )}
            {modal === 'delete1' && (
              <>
                <div className="adm-usr-modalico red"><Trash2 size={24} /></div>
                <h3>Delete {detail.name}&apos;s account?</h3>
                <p>This will permanently delete their account, including all applications, documents, message threads, authorization records, and payment history.</p>
                <p style={{ marginTop: 12, fontWeight: 600, color: '#F87171' }}>This cannot be undone.</p>
                <div className="adm-usr-modalactions">
                  <button className="adm-usr-btn adm-usr-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                  <button className="adm-usr-btn adm-usr-btn-dangeroutline" onClick={() => { setModal('delete2'); setDeleteTyped('') }}>Continue</button>
                </div>
              </>
            )}
            {modal === 'delete2' && (
              <>
                <div className="adm-usr-modalico red"><Trash2 size={24} /></div>
                <h3>Type the user&apos;s email to confirm deletion</h3>
                <p>Type <b className="mono" style={{ color: 'var(--adm-t-hi)' }}>{detail.email}</b> to permanently delete this account.</p>
                <div className="adm-usr-confirmfield">
                  <label>Confirm email</label>
                  <input className="adm-usr-confirminput" placeholder={detail.email} value={deleteTyped} onChange={e => setDeleteTyped(e.target.value)} autoComplete="off" />
                </div>
                <div className="adm-usr-modalactions">
                  <button className="adm-usr-btn adm-usr-btn-ghost" onClick={() => { setModal(null); setDeleteTyped('') }}>Cancel</button>
                  <button className="adm-usr-btn adm-usr-btn-dangersolid" disabled={deleteTyped !== detail.email || deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteTyped)}>
                    <Trash2 size={14} />Delete permanently
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

/* ============================================================
   MOBILE: ADMIN ACCOUNTS
   ============================================================ */
function MobileAdminTab() {
  const queryClient = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const [inviteRole, setInviteRole] = useState('manager')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [modal, setModal] = useState<'revoke' | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<AdminUser | null>(null)

  const { data: apiResponse, isLoading, isError } = useQuery<ApiUsersResponse>({
    queryKey: ['admin', 'admins'],
    queryFn: () =>
      api.get('/api/v1/admin/users', { params: { limit: 100 } }).then(r => r.data),
  })

  const admins = useMemo(() => {
    const all = apiResponse?.data ?? []
    return all.filter(u => u.role !== 'user').map(toAdminUser)
  }, [apiResponse])

  const inviteMutation = useMutation({
    mutationFn: ({ email, name, role }: { email: string; name: string; role: string }) =>
      api.post('/api/v1/admin/invite', { email, name, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] })
      setInviteSent(true)
    },
  })

  if (inviteOpen) {
    return (
      <div className="adm-mob-usr-invite">
        <div className="adm-mob-usr-invite-head">
          <button className="adm-mob-con-back" onClick={() => { setInviteOpen(false); setInviteSent(false) }}><ArrowLeft size={20} /></button>
          <span className="adm-mob-usr-invite-title">Invite new admin</span>
        </div>
        <div className="adm-mob-usr-invite-body">
          {!inviteSent ? (
            <div className="adm-mob-usr-detail-card">
              <div className="adm-mob-usr-invite-copy">They will receive an email invite link and set their own password when they accept. You never set or see their password.</div>
              <div className="adm-usr-confirmfield" style={{ marginTop: 12 }}>
                <label>Name</label>
                <input className="adm-usr-confirminput" placeholder="Full name" value={inviteName} onChange={e => setInviteName(e.target.value)} autoComplete="off" />
              </div>
              <div className="adm-usr-confirmfield">
                <label>Email</label>
                <input className="adm-usr-confirminput" placeholder="name@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} autoComplete="off" />
              </div>
              <div className="adm-usr-confirmfield">
                <label>Role</label>
                <CustomSelect value={inviteRole} onChange={setInviteRole}
                  options={[{ value: 'manager', label: 'Manager' }, { value: 'staff', label: 'Staff' }]} />
              </div>
              {inviteMutation.isError && (
                <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 6, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171', fontSize: 13 }}>
                  {(inviteMutation.error as any)?.response?.data?.message || 'Invite failed. Please try again.'}
                </div>
              )}
              <div className="adm-mob-usr-invite-actions">
                <button className="adm-btn adm-btn-ghost adm-mob-usr-invite-cancel" onClick={() => setInviteOpen(false)}>Cancel</button>
                <button
                  className="adm-usr-btn adm-usr-btn-primary"
                  style={{ flex: '1 1 auto', justifyContent: 'center', minHeight: 44 }}
                  disabled={!inviteEmail || !inviteName || inviteMutation.isPending}
                  onClick={() => inviteMutation.mutate({ email: inviteEmail, name: inviteName, role: mapDisplayRoleToDb(inviteRole) })}
                >
                  <Mail size={14} />{inviteMutation.isPending ? 'Sending...' : 'Send invite'}
                </button>
              </div>
            </div>
          ) : (
            <div className="adm-mob-usr-detail-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
              <div className="adm-usr-modalico ok" style={{ margin: '0 auto 16px' }}><Check size={24} /></div>
              <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: 'var(--adm-t-hi)' }}>Invite sent</h3>
              <div className="adm-usr-invitesuccess" style={{ justifyContent: 'center' }}>
                <span className="adm-usr-invitecheck"><Check size={13} /></span>
                Invite sent to {inviteEmail}
              </div>
              <button className="adm-usr-btn adm-usr-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 24, minHeight: 44 }} onClick={() => { setInviteOpen(false); setInviteSent(false) }}>Done</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="adm-mob-usr-admin">
        <div className="adm-skeleton-table" style={{ opacity: 0.4 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="adm-skeleton-row">
              <div className="adm-skel adm-skel-circle" />
              <div className="adm-skel-block">
                <div className="adm-skel adm-skel-line w60" style={{ height: 14 }} />
                <div className="adm-skel adm-skel-line w40" style={{ height: 10 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="adm-mob-usr-admin">
        <div className="adm-usr-empty" style={{ padding: '48px 24px', minHeight: 'auto' }}>
          <div className="adm-usr-emptyico"><AlertTriangle size={40} /></div>
          <h2>Failed to load admin team</h2>
          <p>Check your connection and try refreshing.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="adm-mob-usr-admin">
      <div className="adm-mob-usr-admin-header">
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--adm-t-hi)' }}>Admin team</h3>
          <span className="adm-usr-adminsub">Manage internal panel access</span>
        </div>
        <button className="adm-usr-btn adm-usr-btn-primary" onClick={() => { setInviteOpen(true); setInviteSent(false); setInviteEmail(''); setInviteName('') }}>
          <UserPlus size={14} />Invite
        </button>
      </div>

      <div className="adm-mob-usr-admin-cards">
        {admins.map((a, i) => (
          <div key={a.id} className="adm-mob-usr-admin-card adm-mob-card-anim" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="adm-mob-usr-admin-card-top">
              <span className="adm-usr-avatar">{a.initials}</span>
              <div className="adm-mob-usr-admin-card-info">
                <div className="adm-usr-username">{a.name}</div>
                <div className="adm-usr-useremail">{a.email}</div>
              </div>
            </div>
            <div className="adm-mob-usr-admin-card-meta">
              <RoleBadge role={a.role} />
              <span className="mono" style={{ fontSize: 11, color: 'var(--adm-t-low)' }}>{a.lastActive}</span>
            </div>
            {a.role !== 'founder' && (
              <div className="adm-mob-usr-admin-card-actions">
                <span className="adm-ment-cnact"><Edit3 size={13} /> Edit role</span>
                <span className="adm-ment-cnact danger" onClick={() => { setRevokeTarget(a); setModal('revoke') }}>Revoke access</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {modal === 'revoke' && revokeTarget && createPortal(
        <div className="adm-usr-overlay show" onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="adm-usr-modal">
            <div className="adm-usr-modalico red"><Lock size={24} /></div>
            <h3>Revoke {revokeTarget.name}&apos;s admin access?</h3>
            <p>They will be logged out immediately and lose all admin panel access.</p>
            <div className="adm-usr-modalactions">
              <button className="adm-usr-btn adm-usr-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="adm-usr-btn adm-usr-btn-dangersolid" onClick={() => setModal(null)}>
                <Lock size={14} />Revoke access
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
function UsersSkeleton() {
  return (
    <div className="adm-usr-page">
      <div className="adm-usr-header">
        <div className="adm-usr-pagehead">
          <div className="adm-skel adm-skel-line w25" style={{ height: 24, marginBottom: 8 }} />
          <div className="adm-skel adm-skel-line w15" style={{ height: 13 }} />
        </div>
      </div>
      <div className="adm-skeleton-table">
        <div className="adm-skeleton-filter">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="adm-skel adm-skel-pill" />)}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="adm-skeleton-row">
            <div className="adm-skel adm-skel-circle" />
            <div className="adm-skel-block">
              <div className="adm-skel adm-skel-line w60" style={{ height: 14 }} />
              <div className="adm-skel adm-skel-line w40" style={{ height: 10 }} />
            </div>
            <div className="adm-skel adm-skel-badge" />
            <div className="adm-skel adm-skel-line w15" style={{ height: 14 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdminUsersPage() {
  const isMobile = useIsMobile()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>('platform')
  const [detailId, setDetailId] = useState<string | null>(() => searchParams.get('user'))
  const [mobDetailId, setMobDetailId] = useState<string | null>(() => isMobile ? searchParams.get('user') : null)

  const handleView = useCallback((id: string) => {
    if (isMobile) setMobDetailId(id)
    else setDetailId(id)
  }, [isMobile])
  const handleBack = useCallback(() => setDetailId(null), [])

  if (isMobile && mobDetailId) {
    return (
      <div className="adm-usr-page">
        <MobileUserDetail userId={mobDetailId} onBack={() => setMobDetailId(null)} />
      </div>
    )
  }

  return (
    <div className="adm-usr-page">
      <div className="adm-usr-header">
        <div className="adm-usr-pagehead">
          <h1>Users</h1>
          <span className="adm-usr-sub">Platform accounts</span>
        </div>
        {!detailId && (
          <div className="adm-usr-tabbar">
            <div className={`adm-usr-tab${tab === 'platform' ? ' on' : ''}`} onClick={() => setTab('platform')}>
              {isMobile ? 'Users' : 'Platform Users'}<div className="adm-usr-underline" />
            </div>
            <div className={`adm-usr-tab${tab === 'admin' ? ' on' : ''}`} onClick={() => setTab('admin')}>
              {isMobile ? 'Admins' : 'Admin Accounts'}<div className="adm-usr-underline" />
            </div>
          </div>
        )}
      </div>

      <div className="adm-usr-panel">
        {!isMobile && detailId && <UserDetail userId={detailId} onBack={handleBack} />}
        {!isMobile && !detailId && tab === 'admin' && <AdminTab />}
        {!isMobile && !detailId && tab === 'platform' && <PlatformTable onView={handleView} />}

        {isMobile && tab === 'platform' && <MobilePlatformList onView={handleView} />}
        {isMobile && tab === 'admin' && <MobileAdminTab />}
      </div>
    </div>
  )
}
