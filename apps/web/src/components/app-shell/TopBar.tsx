'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Menu, Search } from 'lucide-react'
import { NotifBell } from '@/components/notifications/NotificationsDropdown'
import { useUser } from '@/lib/UserContext'
import { SearchOverlay } from '@/components/search/SearchOverlay'
import { UpgradeModal } from '@/components/premium/UpgradeModal'

interface TopBarProps {
  onToggleSidebar: () => void
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const { initials, avatarUrl, isPremium } = useUser()
  const [searchOpen, setSearchOpen] = useState(false)
  const [gateOpen, setGateOpen] = useState(false)

  const openSearch = useCallback(() => {
    if (isPremium) setSearchOpen(true)
    else setGateOpen(true)
  }, [isPremium])
  const closeSearch = useCallback(() => setSearchOpen(false), [])

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openSearch()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openSearch])

  return (
    <>
      {gateOpen && <UpgradeModal onClose={() => setGateOpen(false)} />}
      <header className="app-topbar">
        <button className="app-topbar-burger" onClick={onToggleSidebar} aria-label="Open menu">
          <Menu size={22} />
        </button>

        <Link href="/dashboard" className="app-topbar-logo">
          <img src="/assets/oppdate-monogram.png" alt="" width={18} height={18} />
          <span className="wordmark">Opp<span className="date">Date</span></span>
        </Link>

        <button className="app-topbar-search" onClick={openSearch} style={{ background: 'none', border: 'none', cursor: 'text', padding: 0 }}>
          <div className="app-topbar-search-inner">
            <Search size={17} />
            <span>Search opportunities by country, field, or keyword...</span>
          </div>
        </button>

        <div className="app-topbar-spacer" />

        <NotifBell />

        <Link href="/profile" className="app-topbar-avatar" style={{ padding: 0, overflow: 'hidden' }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement as HTMLElement).textContent = initials || '?' }} />
            : (initials || '?')}
        </Link>
      </header>

      <SearchOverlay open={searchOpen} onClose={closeSearch} />
    </>
  )
}
