'use client'

import { useState, type ReactNode } from 'react'
import Image from 'next/image'
import {
  Search, Bookmark, Compass, FileText, CheckCircle,
  MessageSquare, Settings, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Wordmark } from '@/components/ui'

export type Route =
  | 'discover'
  | 'saved'
  | 'foryou'
  | 'progress'
  | 'submitted'
  | 'messages'
  | 'settings'

interface NavItemProps {
  icon: ReactNode
  label: string
  count?: number | string
  active?: boolean
  onClick?: () => void
}

function NavItem({ icon, label, count, active = false, onClick }: NavItemProps) {
  const [hover, setHover] = useState(false)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm font-sans transition-colors duration-140 ease-out-soft select-none',
        active
          ? 'bg-ginger-light font-semibold text-ginger-dark'
          : hover
          ? 'bg-cream-2 font-medium text-ink-2'
          : 'font-medium text-ink-2'
      )}
    >
      <span className={cn('inline-flex', active ? 'text-ginger-dark' : 'text-muted')}>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {count != null && (
        <span className={cn('font-mono text-[11px]', active ? 'text-ginger-dark' : 'text-muted')}>
          {count}
        </span>
      )}
    </div>
  )
}

interface NavGroupProps {
  label?: string
  children: ReactNode
}

function NavGroup({ label, children }: NavGroupProps) {
  return (
    <div className="flex flex-col gap-0.5 py-1">
      {label && (
        <div className="px-3 pb-1 pt-2 font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          {label}
        </div>
      )}
      {children}
    </div>
  )
}

interface SidebarProps {
  route: Route
  setRoute: (route: Route) => void
  applicationsCount?: number
  savedCount?: number
}

export function Sidebar({ route, setRoute, applicationsCount = 3, savedCount = 12 }: SidebarProps) {
  return (
    <aside className="flex h-full w-[264px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-[var(--border)] bg-cream px-3 py-3.5 box-border">
      <div className="flex items-center gap-2.5 px-3 pb-1.5 pt-2.5">
        <Image src="/assets/oppdate-monogram.png" alt="" width={28} height={28} />
        <Wordmark size={22} />
      </div>

      <NavGroup label="Discover">
        <NavItem icon={<Search size={18} />} label="Browse" count="2,341"
          active={route === 'discover'} onClick={() => setRoute('discover')} />
        <NavItem icon={<Bookmark size={18} />} label="Saved" count={savedCount}
          active={route === 'saved'} onClick={() => setRoute('saved')} />
        <NavItem icon={<Compass size={18} />} label="For you"
          active={route === 'foryou'} onClick={() => setRoute('foryou')} />
      </NavGroup>

      <NavGroup label="Applications">
        <NavItem icon={<FileText size={18} />} label="In progress" count={applicationsCount}
          active={route === 'progress'} onClick={() => setRoute('progress')} />
        <NavItem icon={<CheckCircle size={18} />} label="Submitted"
          active={route === 'submitted'} onClick={() => setRoute('submitted')} />
        <NavItem icon={<MessageSquare size={18} />} label="Messages" count={2}
          active={route === 'messages'} onClick={() => setRoute('messages')} />
      </NavGroup>

      <div className="mt-auto" />

      <NavGroup>
        <NavItem icon={<Settings size={18} />} label="Profile & settings"
          active={route === 'settings'} onClick={() => setRoute('settings')} />
      </NavGroup>

      {/* OppDate Apply promo card */}
      <div className="mx-1 mb-1 mt-2 rounded-lg p-3.5 text-white shadow-sm" style={{ background: 'var(--opp-grad-ginger)' }}>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] opacity-85">
          <Sparkles size={14} />
          OppDate Apply
        </div>
        <div className="mt-1.5 font-display text-lg font-semibold leading-snug">
          We&apos;ll write your next application with you.
        </div>
        <div className="mt-2 text-xs leading-snug opacity-88">
          AI drafts. Humans review. You sign off.
        </div>
      </div>
    </aside>
  )
}
