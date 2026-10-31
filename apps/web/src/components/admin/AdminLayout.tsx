'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Briefcase,
  ClipboardCheck,
  CreditCard,
  Users,
  BookOpen,
  BarChart3,
  Settings,
  UserCircle,
  ChevronLeft,
  Plus,
  Search,
  Mail,
  Activity,
  Check,
  Edit3,
  Archive,
  Clock,
  Upload,
  List,
  MessageSquare,
  Inbox,
  Lock,
  Calendar,
  Handshake,
  AlertTriangle,
  CheckCircle,
  LogOut,
  PanelLeftOpen,
  Bot,
  Flag,
  BellRing,
  Shield,
  Smile,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { clearAdminToken } from '@/lib/token'

// Which roles can see each nav item. Absent = all admin roles.
const NAV_ROLE_GATES: Record<string, string[]> = {
  payments:       ['manager_admin', 'super_admin'],
  users:          ['manager_admin', 'super_admin'],
  ebooks:         ['manager_admin', 'super_admin'],
  analytics:      ['manager_admin', 'super_admin'],
  'guide-sessions': ['manager_admin', 'super_admin'],
  'saved-searches': ['manager_admin', 'super_admin'],
  avatars:        ['manager_admin', 'super_admin'],
  settings:       ['super_admin'],
}

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
  { id: 'opportunities', icon: Briefcase, href: '/admin/opportunities' },
  { id: 'applications', icon: ClipboardCheck, href: '/admin/applications' },
  { id: 'messages', icon: MessageSquare, href: '/admin/messages' },
  { id: 'payments', icon: CreditCard, href: '/admin/payments' },
  { id: 'consultations', icon: Calendar, href: '/admin/consultations' },
  { id: 'mentorship', icon: Handshake, href: '/admin/mentorship' },
  { id: 'users', icon: Users, href: '/admin/users' },
  { id: 'ebooks', icon: BookOpen, href: '/admin/ebooks' },
  { id: 'analytics', icon: BarChart3, href: '/admin/analytics' },
  { id: 'guide-sessions', icon: Bot, href: '/admin/guide-sessions' },
  { id: 'saved-searches', icon: BellRing, href: '/admin/saved-searches' },
  { id: 'avatars', icon: Smile, href: '/admin/avatars' },
]

type PanelConfig = {
  title: string
  groups: { label: string; items: { label: string; icon: typeof LayoutDashboard; sectionId?: string; action?: string }[] }[]
}

const PANEL_CONFIGS: Record<string, PanelConfig> = {
  dashboard: {
    title: 'Dashboard',
    groups: [
      {
        label: 'Overview',
        items: [
          { label: 'Platform overview', icon: LayoutDashboard, sectionId: 'section-stats' },
          { label: 'Application pipeline', icon: ClipboardCheck, sectionId: 'section-pipeline' },
          { label: 'Recent activity', icon: Activity, sectionId: 'section-activity' },
          { label: 'Needs attention', icon: AlertTriangle, sectionId: 'section-attention' },
          { label: 'Platform health', icon: Activity, sectionId: 'section-health' },
        ],
      },
    ],
  },
  opportunities: {
    title: 'Opportunities',
    groups: [
      {
        label: 'Actions',
        items: [
          { label: 'All listings', icon: List, action: 'opp:status:all' },
          { label: 'Create listing', icon: Plus, action: 'opp:create' },
          { label: 'Bulk CSV import', icon: Upload, action: 'opp:csv' },
          { label: 'Auto-archive settings', icon: Archive, action: 'opp:autoarchive' },
        ],
      },
      {
        label: 'Filter by status',
        items: [
          { label: 'Published', icon: Check, action: 'opp:status:published' },
          { label: 'Draft', icon: Edit3, action: 'opp:status:draft' },
          { label: 'Archived', icon: Archive, action: 'opp:status:archived' },
          { label: 'Expired', icon: Clock, action: 'opp:status:expired' },
        ],
      },
      {
        label: 'Filter by type',
        items: [
          { label: 'Scholarships', icon: Briefcase, action: 'opp:type:Scholarship' },
          { label: 'Internships', icon: Briefcase, action: 'opp:type:Internship' },
          { label: 'Fellowships', icon: Briefcase, action: 'opp:type:Fellowship' },
          { label: 'Jobs', icon: Briefcase, action: 'opp:type:Job' },
          { label: 'Training', icon: Briefcase, action: 'opp:type:Training' },
          { label: 'Research Grants', icon: Briefcase, action: 'opp:type:Research Grant' },
        ],
      },
    ],
  },
  applications: {
    title: 'Applications',
    groups: [
      {
        label: 'Inbox',
        items: [
          { label: 'All applications', icon: ClipboardCheck },
          { label: 'Payment Confirmed', icon: CreditCard },
          { label: 'Application Assigned', icon: Users },
          { label: 'Documents Under Review', icon: Search },
          { label: 'Documents Verified', icon: ClipboardCheck },
          { label: 'Preparing Submission', icon: Activity },
          { label: 'Submitted', icon: ClipboardCheck },
          { label: 'Withdrawn', icon: ClipboardCheck },
        ],
      },
      {
        label: 'Quick actions',
        items: [
          { label: 'Export CSV', icon: Plus },
          { label: 'Assign to team member', icon: Users },
        ],
      },
    ],
  },
  messages: {
    title: 'Messages',
    groups: [
      {
        label: 'Threads',
        items: [
          { label: 'All threads', icon: Inbox },
          { label: 'Unread', icon: Mail },
          { label: 'OppDate Apply', icon: Briefcase },
          { label: 'Mentorship', icon: Users },
          { label: 'Closed', icon: Lock },
        ],
      },
    ],
  },
  payments: {
    title: 'Payments',
    groups: [
      {
        label: 'Overview',
        items: [
          { label: 'Transaction table', icon: CreditCard },
          { label: 'Gateway summary', icon: CreditCard },
        ],
      },
      {
        label: 'Gateways',
        items: [
          { label: 'Stripe', icon: CreditCard },
          { label: 'Flutterwave', icon: CreditCard },
          { label: 'Paystack', icon: CreditCard },
          { label: 'Paddle / Lemon Squeezy', icon: CreditCard },
        ],
      },
    ],
  },
  consultations: {
    title: 'Consultations',
    groups: [
      {
        label: 'Views',
        items: [
          { label: 'Calendar view', icon: Calendar },
          { label: 'List view', icon: List },
          { label: 'Consultant profiles', icon: Users },
        ],
      },
    ],
  },
  mentorship: {
    title: 'Mentorship',
    groups: [
      {
        label: 'Views',
        items: [
          { label: 'Active', icon: Handshake },
          { label: 'Pending matching', icon: AlertTriangle },
          { label: 'Completed', icon: CheckCircle },
          { label: 'Mentorship Programmes', icon: BookOpen },
        ],
      },
    ],
  },
  users: {
    title: 'Users',
    groups: [
      {
        label: 'Sections',
        items: [
          { label: 'Platform Users', icon: Users },
          { label: 'Admin Accounts', icon: UserCircle },
        ],
      },
    ],
  },
  ebooks: {
    title: 'eBooks',
    groups: [
      {
        label: 'Sections',
        items: [
          { label: 'Library', icon: BookOpen },
        ],
      },
    ],
  },
  analytics: {
    title: 'Analytics',
    groups: [
      {
        label: 'Sections',
        items: [
          { label: 'Platform metrics', icon: BarChart3 },
        ],
      },
    ],
  },
  'guide-sessions': {
    title: 'Guide Sessions',
    groups: [
      {
        label: 'Views',
        items: [
          { label: 'Insights', icon: BarChart3 },
          { label: 'Session list', icon: List },
        ],
      },
      {
        label: 'Filter by sentiment',
        items: [
          { label: 'Positive', icon: CheckCircle },
          { label: 'Neutral', icon: Clock },
          { label: 'Concerned', icon: AlertTriangle },
        ],
      },
      {
        label: 'Flagged',
        items: [
          { label: 'Flagged responses', icon: Flag },
        ],
      },
    ],
  },
  'saved-searches': {
    title: 'Saved Searches',
    groups: [
      {
        label: 'Views',
        items: [
          { label: 'Insights', icon: BarChart3 },
        ],
      },
    ],
  },
  avatars: {
    title: 'Avatar Presets',
    groups: [
      {
        label: 'Actions',
        items: [
          { label: 'All presets', icon: Smile },
          { label: 'Upload preset', icon: Upload },
        ],
      },
    ],
  },
  settings: {
    title: 'Settings',
    groups: [
      {
        label: 'Configuration',
        items: [
          { label: 'General', icon: Settings },
          { label: 'Payment Gateways', icon: Settings },
          { label: 'Notifications', icon: Settings },
          { label: 'Advertising', icon: Settings },
        ],
      },
    ],
  },
}

const SECTION_TO_ITEM: Record<string, string> = {
  'section-stats': 'Platform overview',
  'section-pipeline': 'Application pipeline',
  'section-activity': 'Recent activity',
  'section-attention': 'Needs attention',
  'section-health': 'Platform health',
}

interface AdminIdentity {
  name: string
  email: string
  role: string
  initials: string
}

function getAdminIdentity(): AdminIdentity {
  if (typeof window === 'undefined') return { name: '', email: '', role: '', initials: '' }
  try {
    const raw = localStorage.getItem('oppdate_admin')
    if (!raw) return { name: '', email: '', role: '', initials: '' }
    const parsed = JSON.parse(raw) as { name?: string; email?: string; role?: string }
    const name = parsed.name || parsed.email || ''
    const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    return { name, email: parsed.email || '', role: parsed.role || '', initials }
  } catch {
    return { name: '', email: '', role: '', initials: '' }
  }
}

function AccountPopover({
  anchorRef,
  onClose,
  admin,
  onAdminUpdate,
}: {
  anchorRef: React.RefObject<HTMLButtonElement>
  onClose: () => void
  admin: AdminIdentity
  onAdminUpdate: (updated: { name: string; email: string }) => void
}) {
  const popRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<'menu' | 'settings'>('menu')
  const [pos, setPos] = useState({ left: 0, bottom: 0 })
  const [name, setName] = useState(admin.name)
  const [email, setEmail] = useState(admin.email)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (!anchorRef.current) return
    const r = anchorRef.current.getBoundingClientRect()
    setPos({ left: r.right + 10, bottom: window.innerHeight - r.bottom - 4 })
  }, [anchorRef])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose()
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose, anchorRef])

  const roleLabel = admin.role === 'super_admin' ? 'Super Admin'
    : admin.role === 'manager_admin' ? 'Manager'
    : admin.role === 'staff_admin' ? 'Staff'
    : 'Admin'
  const roleClass = admin.role === 'super_admin' ? 'rb-founder'
    : admin.role === 'manager_admin' ? 'rb-manager'
    : 'rb-staff'
  const isSuperAdmin = admin.role === 'super_admin'

  return (
    <div
      className="adm-acct-pop"
      ref={popRef}
      style={{ position: 'fixed', left: pos.left, bottom: pos.bottom }}
    >
      {view === 'menu' ? (
        <>
          <div className="adm-acct-identity">
            <span className="adm-acct-avatar">{admin.initials || '?'}</span>
            <div className="adm-acct-info">
              <div className="adm-acct-name">{admin.name || 'Admin'}</div>
              <div className="adm-acct-email">{admin.email}</div>
              <span className={`adm-acct-role ${roleClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                {isSuperAdmin && <Shield size={10} />}
                {roleLabel}
              </span>
            </div>
          </div>
          <div className="adm-acct-divider" />
          <button className="adm-acct-item" onClick={() => setView('settings')}>
            <Settings size={15} /> Account settings
          </button>
          <div className="adm-acct-divider" />
          <button
            className="adm-acct-item adm-acct-logout"
            onClick={async () => {
              clearAdminToken()
              try {
                const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
                await fetch(base + '/api/v1/admin/logout', { method: 'POST', credentials: 'include' })
              } catch { /* ignore */ }
              window.location.href = '/admin/login'
            }}
          >
            <LogOut size={15} /> Log out
          </button>
        </>
      ) : (
        <>
          <div className="adm-acct-sethead">
            <button className="adm-acct-back" onClick={() => { setView('menu'); setSaveError(''); setSaveSuccess(false) }}>
              <ChevronLeft size={14} />
            </button>
            <span className="adm-acct-settitle">Account settings</span>
          </div>
          <div className="adm-acct-divider" />
          <div className="adm-acct-form">
            <label className="adm-acct-label">NAME</label>
            <input className="adm-acct-input" value={name} onChange={e => setName(e.target.value)} />
            <label className="adm-acct-label">EMAIL</label>
            <input className="adm-acct-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <label className="adm-acct-label">NEW PASSWORD</label>
            <input className="adm-acct-input" type="password" placeholder="Leave blank to keep current" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <label className="adm-acct-label">CONFIRM PASSWORD</label>
            <input className="adm-acct-input" type="password" placeholder="Re-enter new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            {saveError && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#c0392b' }}>{saveError}</p>}
            {saveSuccess && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#27ae60' }}>Account updated.</p>}
          </div>
          <div className="adm-acct-divider" />
          <div className="adm-acct-formfoot">
            <button className="adm-acct-cancel" onClick={() => { setView('menu'); setSaveError(''); setSaveSuccess(false) }}>Cancel</button>
            <button
              className="adm-acct-save"
              disabled={saving}
              onClick={async () => {
                setSaveError('')
                setSaveSuccess(false)
                if (newPassword && newPassword !== confirmPassword) {
                  setSaveError('Passwords do not match.')
                  return
                }
                if (newPassword && newPassword.length < 8) {
                  setSaveError('Password must be at least 8 characters.')
                  return
                }
                setSaving(true)
                try {
                  const body: Record<string, string> = {}
                  if (name !== admin.name) body.name = name
                  if (email !== admin.email) body.email = email
                  if (newPassword) body.newPassword = newPassword
                  if (Object.keys(body).length === 0) { setSaving(false); return }
                  const res = await api.patch('/api/v1/admin/me', body)
                  const updated = res.data?.data
                  const updatedName = updated?.name ?? name
                  const updatedEmail = updated?.email ?? email
                  localStorage.setItem('oppdate_admin', JSON.stringify({
                    ...JSON.parse(localStorage.getItem('oppdate_admin') ?? '{}'),
                    name: updatedName,
                    email: updatedEmail,
                  }))
                  onAdminUpdate({ name: updatedName, email: updatedEmail })
                  setNewPassword('')
                  setConfirmPassword('')
                  setSaveSuccess(true)
                } catch (err: unknown) {
                  const e = err as { response?: { data?: { error?: string } } }
                  setSaveError(e.response?.data?.error || 'Save failed. Please try again.')
                } finally {
                  setSaving(false)
                }
              }}
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const [panelCollapsed, setPanelCollapsed] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('adm_panel_collapsed')
    setPanelCollapsed(stored === null ? true : stored === '1')
  }, [])
  const [railReady, setRailReady] = useState(false)
  const [railHovered, setRailHovered] = useState(false)
  const [activePanelItem, setActivePanelItem] = useState('Platform overview')
  const [accountOpen, setAccountOpen] = useState(false)
  const [admin, setAdmin] = useState<AdminIdentity>({ name: '', email: '', role: '', initials: '' })
  const observerRef = useRef<IntersectionObserver | null>(null)
  const accountRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { setAdmin(getAdminIdentity()) }, [])

  const { data: msgData } = useQuery({
    queryKey: ['admin-unread-count'],
    queryFn: () => api.get<{ unread?: number }>('/api/v1/admin/messages', { params: { limit: 1 } }).then(r => r.data),
    refetchInterval: 30000,
    staleTime: 20000,
    enabled: !!admin.email,
  })
  const unreadCount: number = msgData?.unread ?? 0

  const activeNav = pathname.startsWith('/admin/settings')
    ? 'settings'
    : (NAV_ITEMS.find(n => pathname.startsWith(n.href))?.id || 'dashboard')
  const panelConfig = PANEL_CONFIGS[activeNav]

  function togglePanel() {
    setPanelCollapsed(c => {
      const next = !c
      localStorage.setItem('adm_panel_collapsed', next ? '1' : '0')
      return next
    })
  }

  useEffect(() => {
    const t = setTimeout(() => setRailReady(true), 20)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const config = PANEL_CONFIGS[activeNav]
    if (config?.groups?.[0]?.items?.[0]) {
      setActivePanelItem(config.groups[0].items[0].label)
    }
  }, [activeNav])

  // Intersection observer for dashboard section highlighting
  useEffect(() => {
    const timer = setTimeout(() => {
      if (observerRef.current) observerRef.current.disconnect()
      const content = document.querySelector('.adm-content')
      if (!content) return

      observerRef.current = new IntersectionObserver(
        entries => {
          entries.forEach(e => {
            if (!e.isIntersecting) return
            const label = SECTION_TO_ITEM[e.target.id]
            if (label) setActivePanelItem(label)
          })
        },
        { root: content as Element, threshold: 0.3 }
      )

      Object.keys(SECTION_TO_ITEM).forEach(id => {
        const el = document.getElementById(id)
        if (el) observerRef.current!.observe(el)
      })
    }, 400)

    return () => {
      clearTimeout(timer)
      if (observerRef.current) observerRef.current.disconnect()
    }
  }, [pathname])

  const handlePanelItemClick = useCallback((label: string, sectionId?: string, action?: string) => {
    setActivePanelItem(label)

    if (action) {
      if (action.startsWith('opp:status:')) {
        const status = action.replace('opp:status:', '')
        const p = new URLSearchParams(window.location.search)
        if (status === 'all') p.delete('status'); else p.set('status', status)
        p.delete('type')
        window.history.replaceState(null, '', `?${p.toString()}`)
        // Always navigate back to list view first, then apply filter
        window.dispatchEvent(new CustomEvent('adm-opp-action', { detail: 'list' }))
        window.dispatchEvent(new CustomEvent('adm-opp-filter', { detail: { status, type: 'all' } }))
        return
      }
      if (action.startsWith('opp:type:')) {
        const type = action.replace('opp:type:', '')
        const p = new URLSearchParams(window.location.search)
        p.set('type', type)
        window.history.replaceState(null, '', `?${p.toString()}`)
        window.dispatchEvent(new CustomEvent('adm-opp-action', { detail: 'list' }))
        window.dispatchEvent(new CustomEvent('adm-opp-filter', { detail: { type } }))
        return
      }
      if (action === 'opp:create' || action === 'opp:csv' || action === 'opp:autoarchive') {
        window.dispatchEvent(new CustomEvent('adm-opp-action', { detail: action.replace('opp:', '') }))
        return
      }
    }

    if (sectionId) {
      const el = document.getElementById(sectionId)
      if (!el) return
      const content = el.closest('.adm-content') as HTMLElement | null
      if (!content) return
      const offset = 80
      const top = el.getBoundingClientRect().top + content.scrollTop - content.getBoundingClientRect().top - offset
      content.scrollTo({ top, behavior: 'smooth' })
      setTimeout(() => {
        el.classList.remove('adm-section-pulse')
        void el.offsetWidth
        el.classList.add('adm-section-pulse')
        el.addEventListener('animationend', () => el.classList.remove('adm-section-pulse'), { once: true })
      }, 250)
    }
  }, [])

  // Show expand icon only when rail is hovered AND panel is collapsed
  const showExpandIcon = railHovered && panelCollapsed

  return (
    <div className="adm-shell">
      <div className="adm-product">
        {/* Icon rail */}
        <div
          className={`adm-rail adm-glassy${railReady ? ' adm-rail-ready' : ''}`}
          onMouseEnter={() => setRailHovered(true)}
          onMouseLeave={() => setRailHovered(false)}
        >
          {/* Logo / expand toggle */}
          <div className="adm-rail-logo">
            {panelCollapsed ? (
              <button
                className={`adm-rail-logo-btn${showExpandIcon ? ' hovered' : ''}`}
                onClick={togglePanel}
                title="Expand sidebar"
              >
                <img
                  src="/assets/oppdate-monogram.png"
                  alt="OppDate"
                  width={40}
                  height={40}
                  className="adm-rail-monogram"
                />
                <PanelLeftOpen size={22} className="adm-rail-expand-ico" />
              </button>
            ) : (
              <img src="/assets/oppdate-monogram.png" alt="OppDate" width={40} height={40} />
            )}
          </div>

          <div className="adm-rail-nav">
            {NAV_ITEMS.filter(item => {
              const gate = NAV_ROLE_GATES[item.id]
              if (!gate) return true
              return gate.includes(admin.role)
            }).map(item => (
              <Link
                key={item.id}
                href={item.href}
                className={`adm-ricon${activeNav === item.id ? ' active' : ''}`}
                title={item.id.charAt(0).toUpperCase() + item.id.slice(1)}
              >
                <item.icon />
                {item.id === 'messages' && unreadCount > 0 && (
                  <span className="adm-rail-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </Link>
            ))}
          </div>

          <div className="adm-rail-spacer" />
          <div className="adm-rail-divider" />
          <div className="adm-rail-bottom">
            <Link
              href="/admin/settings"
              className={`adm-ricon${activeNav === 'settings' ? ' active' : ''}`}
              title="Settings"
            >
              <Settings />
            </Link>
            <button
              ref={accountRef}
              className={`adm-ricon profile${accountOpen ? ' active' : ''}`}
              title="Account"
              onClick={() => setAccountOpen(o => !o)}
            >
              <span className="adm-rail-av">{admin.initials || '?'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible panel */}
        <div className={`adm-panelwrap${panelCollapsed ? ' collapsed' : ''}`}>
          <div className="adm-panel adm-glassy">
            <div className="adm-panel-head">
              <h2>{panelConfig?.title || 'Admin'}</h2>
              <button
                className="adm-panel-collapse-btn"
                onClick={togglePanel}
                title="Collapse panel"
              >
                <ChevronLeft />
              </button>
            </div>
            {panelConfig && (
              <div className="adm-panel-body">
                {panelConfig.groups.map(group => (
                  <div key={group.label} className="adm-group">
                    <div className="adm-group-header">{group.label}</div>
                    {group.items.map(item => (
                      <div
                        key={item.label}
                        className={`adm-p-item${activePanelItem === item.label ? ' active' : ''}`}
                        onClick={() => handlePanelItemClick(item.label, item.sectionId, item.action)}
                      >
                        <span className="adm-ico"><item.icon /></span>
                        <span className="adm-txt">{item.label}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="adm-content">
          {children}
        </div>
      </div>

      {accountOpen && createPortal(
        <AccountPopover
          anchorRef={accountRef as React.RefObject<HTMLButtonElement>}
          onClose={() => setAccountOpen(false)}
          admin={admin}
          onAdminUpdate={({ name, email }) => {
            const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
            setAdmin(prev => ({ ...prev, name, email, initials }))
          }}
        />,
        document.body
      )}
    </div>
  )
}
