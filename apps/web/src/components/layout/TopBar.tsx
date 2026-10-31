'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Search, Bell } from 'lucide-react'
import { useUser } from '@/lib/UserContext'
import { SearchOverlay } from '@/components/search/SearchOverlay'

interface TopBarProps {
  searchOpen: boolean
  onSearchOpen: () => void
  onSearchClose: () => void
}

export function TopBar({ searchOpen, onSearchOpen, onSearchClose }: TopBarProps) {
  const { initials, avatarUrl } = useUser()
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onSearchOpen()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSearchOpen])

  return (
    <>
      <header
        className="sticky top-0 z-10 flex h-16 items-center gap-3.5 border-b border-[var(--border)] px-7"
        style={{ background: 'rgba(250, 247, 244, 0.78)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        {/* Search trigger */}
        <button
          ref={triggerRef}
          onClick={onSearchOpen}
          className="flex flex-1 max-w-[620px] items-center gap-2.5 rounded-md bg-white px-3.5 py-[9px] border-[1.5px] border-[var(--border)] transition-all duration-140 ease-out-soft hover:border-[rgba(122,45,5,0.3)] hover:shadow-sm cursor-text text-left"
          style={{ outline: 'none' }}
        >
          <Search size={18} className="shrink-0 text-muted" />
          <span className="flex-1 font-sans text-sm text-muted">
            Search opportunities by country, field, or keyword...
          </span>
          <span className="shrink-0 rounded-[5px] border border-[var(--border)] bg-cream px-1.5 py-0.5 font-mono text-[11px] text-muted">
            K
          </span>
        </button>

        <div className="flex-1" />

        <button className="inline-flex rounded-lg p-2 text-ink-2 transition-colors hover:bg-cream-2" aria-label="Notifications">
          <Bell size={20} />
        </button>

        <Link
          href="/profile"
          style={{
            width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--app-amber)', color: '#fff',
            fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
            textDecoration: 'none', flexShrink: 0,
          }}
        >
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement as HTMLElement).textContent = initials || '?' }} />
            : (initials || '?')}
        </Link>
      </header>

      <SearchOverlay open={searchOpen} onClose={onSearchClose} />
    </>
  )
}
