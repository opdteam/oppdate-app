'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  LayoutGrid, Compass, FileCheck, FolderOpen, MessageCircle,
  Calendar, Users, BookOpen, UserCog, Bell,
  HelpCircle, LogOut, X, Sparkles,
} from 'lucide-react'
import { api } from '@/lib/api'
import { clearUserToken } from '@/lib/token'
import { useUser } from '@/lib/UserContext'
import { keys, fetchers } from '@/lib/queries'
import { UpgradeModal } from '@/components/premium/UpgradeModal'

// Map nav hrefs to the queries that page needs -- prefetched on hover
const PREFETCH_MAP: Record<string, { queryKey: readonly string[]; queryFn: () => Promise<unknown> }[]> = {
  '/dashboard':    [
    { queryKey: keys.applications,  queryFn: fetchers.applications },
    { queryKey: keys.saved,         queryFn: fetchers.saved },
    { queryKey: keys.notifications, queryFn: fetchers.notifications },
    { queryKey: keys.threads,       queryFn: fetchers.threads },
    { queryKey: keys.documents,     queryFn: fetchers.documents },
  ],
  '/applications': [
    { queryKey: keys.applications, queryFn: fetchers.applications },
    { queryKey: keys.threads,      queryFn: fetchers.threads },
  ],
  '/messages':     [{ queryKey: keys.threads, queryFn: fetchers.threads }],
  '/profile':      [{ queryKey: keys.me,      queryFn: fetchers.me }],
  '/services/ebooks/library': [{ queryKey: keys.ebookLibrary, queryFn: fetchers.ebookLibrary }],
  '/help': [],
}

const NAV = [
  { label: 'MAIN', items: [
    { id: 'dashboard',    name: 'Dashboard',          href: '/dashboard',     Icon: LayoutGrid },
    { id: 'opps',         name: 'Opportunities',      href: '/opportunities', Icon: Compass },
    { id: 'apps',         name: 'My Applications',    href: '/applications',  Icon: FileCheck },
    { id: 'creds',        name: 'Credential Library', href: '/credentials',   Icon: FolderOpen },
    { id: 'messages',     name: 'Messages',           href: '/messages',      Icon: MessageCircle, dot: true },
  ]},
  { label: 'RESOURCES', items: [
    { id: 'consult',      name: 'Consultations',      href: '/services/consultations', Icon: Calendar },
    { id: 'mentor',       name: 'Mentorship',         href: '/services/mentorship',    Icon: Users },
    { id: 'ebooks',       name: 'eBooks',             href: '/services/ebooks/library', Icon: BookOpen },
  ]},
  { label: 'ACCOUNT', items: [
    { id: 'profile',      name: 'Profile & Settings', href: '/profile',       Icon: UserCog },
    { id: 'notifs',       name: 'Notifications',      href: '/notifications', Icon: Bell, dot: true },
  ]},
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

function getDaysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { name, initials, avatarUrl, isPremium, premiumUntil } = useUser()
  const qc = useQueryClient()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const userName = name || 'Loading...'
  const userInitials = initials || '?'
  const daysLeft = getDaysUntil(premiumUntil)
  const isExpiringSoon = isPremium && daysLeft !== null && daysLeft <= 7 && daysLeft > 0

  const isActive = useCallback((href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }, [pathname])

  const prefetch = useCallback((href: string) => {
    const queries = PREFETCH_MAP[href]
    if (!queries) return
    queries.forEach(({ queryKey, queryFn }) => {
      qc.prefetchQuery({ queryKey, queryFn, staleTime: 30 * 1000 })
    })
  }, [qc])

  return (
    <>
      {upgradeOpen && <UpgradeModal onClose={() => setUpgradeOpen(false)} />}
      <div className={`app-scrim${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`app-sidebar${open ? ' open' : ''}`}>
        <div className="app-sidebar-header">
          <div className="app-sidebar-user">
            <span className="app-sidebar-user-avatar" style={{ padding: 0, overflow: 'hidden' }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement as HTMLElement).textContent = userInitials }} />
                : userInitials}
            </span>
            <div className="app-sidebar-user-info">
              <div className="app-sidebar-user-name">{userName}</div>
              {isPremium ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className={`app-sidebar-plan pro${isExpiringSoon ? ' expiring' : ''}`}>
                    <Sparkles size={10} style={{ marginRight: 4 }} />
                    Pro plan
                  </span>
                  {isExpiringSoon && daysLeft !== null && (
                    <span className="app-sidebar-plan-expiry">
                      Renews in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="app-sidebar-plan free">Free plan</span>
                  <button
                    className="app-sidebar-upgrade-btn"
                    onClick={() => { onClose(); setUpgradeOpen(true) }}
                  >
                    Upgrade
                  </button>
                </div>
              )}
            </div>
            <button className="app-sidebar-close" onClick={onClose} aria-label="Close sidebar">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="app-sidebar-divider" />

        <nav className="app-sidebar-nav">
          {NAV.map(sec => (
            <div key={sec.label}>
              <div className="app-sidebar-section-label">{sec.label}</div>
              <div className="app-sidebar-items">
                {sec.items.map(item => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`app-nav-row${isActive(item.href) ? ' active' : ''}`}
                    onClick={onClose}
                    onMouseEnter={() => prefetch(item.href)}
                  >
                    <span className="nav-icon">
                      <item.Icon size={18} />
                      {item.dot && <span className="nav-dot" />}
                    </span>
                    <span className="nav-label">{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="app-sidebar-footer">
          <Link href="/help" className="app-nav-row footer-help" onClick={onClose}>
            <span className="nav-icon"><HelpCircle size={18} /></span>
            <span className="nav-label">Help & Support</span>
          </Link>
          <button className="app-nav-row footer-logout" onClick={() => {
            clearUserToken()
            api.post('/api/v1/auth/logout').catch(() => {}).finally(() => {
              window.location.replace('/auth/login')
            })
          }}>
            <span className="nav-icon"><LogOut size={18} /></span>
            <span className="nav-label">Log out</span>
          </button>
          <div style={{ display: 'flex', gap: 14, padding: '10px 16px 4px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4 }}>
            <Link href="/legal/terms" onClick={onClose} style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color 140ms' }} onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>Terms</Link>
            <Link href="/legal/privacy" onClick={onClose} style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color 140ms' }} onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>Privacy</Link>
          </div>
        </div>
      </aside>
    </>
  )
}
