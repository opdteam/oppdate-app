'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  Bell, Briefcase, MessageSquare, CreditCard, FileText,
  Clock, Calendar, Users, CheckCheck, Trash2, Inbox,
  Search, ChevronDown, ExternalLink,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys, fetchers, ApiNotification } from '@/lib/queries'

type FilterTab = 'all' | 'unread' | 'applications' | 'payments' | 'messages' | 'system'

const TYPE_CONFIG: Record<string, { Icon: LucideIcon; color: string; bg: string; category: FilterTab }> = {
  application_status_change: { Icon: Briefcase,     color: '#B5530A', bg: 'rgba(181,83,10,0.10)',  category: 'applications' },
  new_message:               { Icon: MessageSquare, color: '#0E7490', bg: 'rgba(14,116,144,0.10)', category: 'messages' },
  payment_confirmed:         { Icon: CreditCard,    color: '#059669', bg: 'rgba(5,150,105,0.10)',  category: 'payments' },
  document_assistance:       { Icon: FileText,      color: '#7A2D05', bg: 'rgba(122,45,5,0.10)',   category: 'applications' },
  deadline_reminder:         { Icon: Clock,         color: '#D97706', bg: 'rgba(217,119,6,0.10)',  category: 'system' },
  consultation_confirmed:    { Icon: Calendar,      color: '#7C3AED', bg: 'rgba(124,58,237,0.10)', category: 'system' },
  mentorship_update:         { Icon: Users,         color: '#0E7490', bg: 'rgba(14,116,144,0.10)', category: 'system' },
  saved_search_alert:        { Icon: Search,        color: '#C17F3A', bg: 'rgba(193,127,58,0.10)', category: 'system' },
}
const DEFAULT_CONFIG = { Icon: Bell, color: '#7A2D05', bg: 'rgba(122,45,5,0.10)', category: 'system' as FilterTab }

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all',          label: 'All' },
  { id: 'unread',       label: 'Unread' },
  { id: 'applications', label: 'Applications' },
  { id: 'payments',     label: 'Payments' },
  { id: 'messages',     label: 'Messages' },
  { id: 'system',       label: 'System' },
]

function getGroup(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return 'This week'
  return 'Earlier'
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function useIsMobile(bp = 960) {
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

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(24px) saturate(140%)',
  WebkitBackdropFilter: 'blur(24px) saturate(140%)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 4px 24px rgba(139,61,7,0.08), 0 1px 4px rgba(139,61,7,0.04)',
}

// Parse match titles out of saved_search_alert body text:
// "3 new opportunities match your saved search: Title A, Title B, Title C and 2 more."
function parseAlertMatches(body: string): string[] {
  const colonIdx = body.indexOf(': ')
  if (colonIdx === -1) return []
  let rest = body.slice(colonIdx + 2).replace(/\.$/, '')
  const andMoreMatch = rest.match(/ and \d+ more$/)
  if (andMoreMatch) rest = rest.slice(0, andMoreMatch.index)
  return rest.split(', ').map(t => t.trim()).filter(Boolean)
}

type NotifCardProps = {
  item: ApiNotification & { unread: boolean }
  onRead: (id: string) => void
  onDelete: (id: string) => void
  index: number
  mob: boolean
}

function NotifCard({ item, onRead, onDelete, index, mob }: NotifCardProps) {
  const [hov, setHov] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const router = useRouter()
  const cfg = TYPE_CONFIG[item.type] ?? DEFAULT_CONFIG
  const { Icon } = cfg
  const isSearchAlert = item.type === 'saved_search_alert'
  const matchTitles = isSearchAlert ? parseAlertMatches(item.body) : []

  const handleClick = () => {
    onRead(item.id)
    if (isSearchAlert) setExpanded(v => !v)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        background: item.unread ? 'rgba(181,83,10,0.04)' : hov ? 'rgba(122,45,5,0.03)' : 'transparent',
        cursor: 'pointer',
        transition: 'background 160ms ease',
        animation: `notifRise 260ms ease-out both`,
        animationDelay: `${index * 40}ms`,
        outline: 'none',
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        borderRadius: '3px 0 0 3px',
        background: cfg.color,
        opacity: item.unread ? 1 : 0,
        transition: 'opacity 300ms ease',
      }} />

      {/* Main row */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        padding: mob ? '14px 16px' : '16px 20px',
      }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: cfg.bg,
          color: cfg.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={17} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 14,
            fontWeight: 600,
            color: item.unread ? 'var(--app-ink)' : 'var(--app-text-sec)',
            lineHeight: 1.35,
            transition: 'color 200ms ease',
          }}>
            {item.title}
          </div>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--app-helper)',
            lineHeight: 1.5,
            marginTop: 3,
            display: '-webkit-box',
            WebkitLineClamp: isSearchAlert ? 1 : 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {item.body}
          </div>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 11.5,
            color: 'var(--app-helper)',
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            {timeAgo(item.createdAt)}
            {isSearchAlert && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                color: '#C17F3A', fontSize: 11, fontWeight: 600,
                transition: 'opacity 150ms ease',
              }}>
                {expanded ? 'Collapse' : 'Show matches'}
                <ChevronDown size={11} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }} />
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginTop: 4 }}>
          {item.unread && (
            <div style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--app-ginger)',
              flexShrink: 0,
            }} />
          )}
          {hov && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(item.id) }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: 'none',
                background: 'rgba(220,38,38,0.07)',
                color: 'rgba(220,38,38,0.5)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 150ms ease, background 150ms ease',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.color = '#DC2626'
                el.style.background = 'rgba(220,38,38,0.12)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.color = 'rgba(220,38,38,0.5)'
                el.style.background = 'rgba(220,38,38,0.07)'
              }}
              aria-label="Delete notification"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded match pills + CTA for saved_search_alert */}
      {isSearchAlert && (
        <div style={{
          maxHeight: expanded ? 200 : 0,
          overflow: 'hidden',
          transition: 'max-height 240ms cubic-bezier(0.25,0.46,0.45,0.94)',
        }}>
          <div style={{ padding: mob ? '0 16px 14px 66px' : '0 20px 16px 70px' }}>
            {/* Match title pills */}
            <div style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'nowrap',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              paddingBottom: 2,
              marginBottom: 10,
            }}>
              {matchTitles.map((title, i) => (
                <span
                  key={i}
                  style={{
                    flexShrink: 0,
                    display: 'inline-block',
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: 'rgba(193,127,58,0.08)',
                    border: '1px solid rgba(193,127,58,0.18)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 11.5,
                    color: '#7A4A1A',
                    whiteSpace: 'nowrap',
                    maxWidth: 180,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    animation: `notifRise 200ms ease-out both`,
                    animationDelay: `${i * 40}ms`,
                  }}
                  title={title}
                >
                  {title}
                </span>
              ))}
            </div>
            {/* View matches CTA */}
            <button
              onClick={e => {
                e.stopPropagation()
                router.push('/opportunities')
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 8,
                border: '1px solid rgba(193,127,58,0.30)',
                background: 'rgba(193,127,58,0.06)',
                color: '#C17F3A',
                fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 150ms ease, border-color 150ms ease',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = 'rgba(193,127,58,0.12)'
                el.style.borderColor = 'rgba(193,127,58,0.45)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = 'rgba(193,127,58,0.06)'
                el.style.borderColor = 'rgba(193,127,58,0.30)'
              }}
            >
              <ExternalLink size={11} />
              View all matches
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function GroupLabel({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px 8px', userSelect: 'none' }}>
      <span style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--app-helper)',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--app-hairline)' }} />
    </div>
  )
}

function AllCaughtUp() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '32px 24px',
      background: 'rgba(5,150,105,0.04)',
      borderRadius: 14,
      border: '1px solid rgba(5,150,105,0.12)',
      textAlign: 'center',
      animation: 'notifFadeIn 300ms ease',
    }}>
      <div style={{
        width: 52,
        height: 52,
        borderRadius: 14,
        background: 'rgba(5,150,105,0.10)',
        color: '#059669',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
      }}>
        <CheckCheck size={28} />
      </div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, color: 'var(--app-ink)', marginBottom: 6 }}>
        You&apos;re all caught up
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--app-text-sec)' }}>
        No unread notifications.
      </div>
    </div>
  )
}

function EmptyState({ filter }: { filter: FilterTab }) {
  const subtitles: Record<FilterTab, string> = {
    all: 'You have no notifications yet.',
    unread: 'No unread notifications.',
    applications: 'No application notifications yet.',
    payments: 'No payment notifications yet.',
    messages: 'No message notifications yet.',
    system: 'No system notifications yet.',
  }
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '48px 24px',
      textAlign: 'center',
    }}>
      <div style={{ color: 'var(--app-helper)', marginBottom: 14, opacity: 0.6 }}>
        <Inbox size={40} />
      </div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, color: 'var(--app-ink)', marginBottom: 6 }}>
        No notifications here
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--app-text-sec)' }}>
        {subtitles[filter]}
      </div>
    </div>
  )
}

function NotifsSkeleton({ mob }: { mob: boolean }) {
  return (
    <div className="skel-wrap" style={{ maxWidth: 680, margin: '0 auto', padding: mob ? '24px 16px 56px' : '32px 24px 64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: mob ? 14 : 20 }}>
        <div className="skel skel-line" style={{ height: mob ? 24 : 28, width: '35%' }} />
        <div className="skel skel-line" style={{ width: 110, height: 13 }} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: mob ? 14 : 20 }}>
        {[50, 65, 100, 75, 80, 65].map((w, i) => (
          <div key={i} className="skel skel-pill" style={{ width: w, height: mob ? 30 : 34 }} />
        ))}
      </div>
      <div style={{ ...glass, borderRadius: mob ? 14 : 16, overflow: 'hidden' }}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--app-hairline)' }}>
            <div className="skel skel-circle" style={{ width: 36, height: 36 }} />
            <div style={{ flex: 1 }}>
              <div className="skel skel-line" style={{ height: 13, width: '80%', marginBottom: 6 }} />
              <div className="skel skel-line" style={{ height: 11, width: '50%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function NotificationsPage() {
  const [filter, setFilter] = useState<FilterTab>('all')
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [allCaughtUpVisible, setAllCaughtUpVisible] = useState(false)
  const mob = useIsMobile()
  const qc = useQueryClient()

  const { data: rawNotifs = [], isLoading } = useQuery({
    queryKey: keys.notificationsAll,
    queryFn: fetchers.notificationsAll,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  })

  const items = useMemo(() => rawNotifs
    .filter(n => !deletedIds.has(n.id))
    .map(n => ({
      ...n,
      unread: overrides[n.id] !== undefined ? overrides[n.id] : !n.read,
    })), [rawNotifs, overrides, deletedIds])

  const filtered = useMemo(() => {
    return items.filter(n => {
      const cfg = TYPE_CONFIG[n.type] ?? DEFAULT_CONFIG
      if (filter === 'unread') return n.unread
      if (filter === 'all') return true
      return cfg.category === filter
    })
  }, [items, filter])

  const grouped = useMemo(() => {
    const groups: { label: string; items: typeof filtered }[] = []
    let lastGroup = ''
    filtered.forEach(n => {
      const g = getGroup(n.createdAt)
      if (g !== lastGroup) { groups.push({ label: g, items: [] }); lastGroup = g }
      groups[groups.length - 1].items.push(n)
    })
    return groups
  }, [filtered])

  const unreadCount = items.filter(n => n.unread).length

  const tabCount = (tab: FilterTab): number => {
    if (tab === 'all') return items.length
    if (tab === 'unread') return unreadCount
    return items.filter(n => (TYPE_CONFIG[n.type] ?? DEFAULT_CONFIG).category === tab && n.unread).length
  }

  const markRead = useCallback((id: string) => {
    setOverrides(prev => ({ ...prev, [id]: false }))
    api.patch(`/api/v1/notifications/${id}/read`).then(() => {
      qc.invalidateQueries({ queryKey: keys.notificationsAll })
      qc.invalidateQueries({ queryKey: keys.notifications })
    }).catch(() => {})
  }, [qc])

  const markAllRead = useCallback(() => {
    setOverrides(prev => {
      const next = { ...prev }
      rawNotifs.forEach(n => { next[n.id] = false })
      return next
    })
    setAllCaughtUpVisible(true)
    setTimeout(() => setAllCaughtUpVisible(false), 3500)
    api.post('/api/v1/notifications/read-all').then(() => {
      qc.invalidateQueries({ queryKey: keys.notificationsAll })
      qc.invalidateQueries({ queryKey: keys.notifications })
    }).catch(() => {})
  }, [qc, rawNotifs])

  const deleteNotif = useCallback((id: string) => {
    setDeletedIds(prev => new Set([...prev, id]))
    api.delete(`/api/v1/notifications/${id}`).then(() => {
      qc.invalidateQueries({ queryKey: keys.notificationsAll })
    }).catch(() => {})
  }, [qc])

  if (isLoading) return <NotifsSkeleton mob={mob} />

  let itemIndex = 0

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: mob ? '24px 16px 56px' : '32px 24px 64px' }}>
      <style>{`
        @keyframes notifRise {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes notifFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: mob ? 16 : 20 }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 700,
          fontSize: mob ? 24 : 28,
          letterSpacing: '-0.01em',
          color: 'var(--app-ink)',
          margin: 0,
        }}>
          Notifications
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--app-ginger)',
              padding: '4px 0',
            }}
          >
            Mark all as read
          </button>
        )}
      </div>

      <div style={{
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        marginBottom: mob ? 14 : 20,
        paddingBottom: 2,
      }}>
        {FILTER_TABS.map(tab => {
          const active = filter === tab.id
          const count = tabCount(tab.id)
          const isUnreadTab = tab.id === 'unread'
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                height: mob ? 30 : 34,
                padding: '0 14px',
                borderRadius: 999,
                border: active ? 'none' : '1px solid var(--app-hairline)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                background: active ? 'var(--app-ginger)' : 'transparent',
                color: active ? '#fff' : 'var(--app-text-sec)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 150ms ease',
              }}
            >
              {tab.label}
              {(isUnreadTab ? unreadCount > 0 : (!active && count > 0)) && (
                <span style={{
                  fontSize: 10,
                  background: isUnreadTab ? 'rgba(181,83,10,0.12)' : 'rgba(122,45,5,0.08)',
                  color: isUnreadTab ? '#B5530A' : active ? 'rgba(255,255,255,0.8)' : 'var(--app-text-sec)',
                  borderRadius: 999,
                  padding: '1px 6px',
                  fontWeight: 600,
                }}>
                  {isUnreadTab ? unreadCount : count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {allCaughtUpVisible && (
        <div style={{ marginBottom: 16 }}>
          <AllCaughtUp />
        </div>
      )}

      {filtered.length === 0 && !allCaughtUpVisible ? (
        <div style={{ ...glass, borderRadius: mob ? 14 : 16, overflow: 'hidden' }}>
          <EmptyState filter={filter} />
        </div>
      ) : filtered.length > 0 ? (
        <div style={{ ...glass, borderRadius: mob ? 14 : 16, overflow: 'hidden' }}>
          {grouped.map((group, gi) => (
            <div key={group.label}>
              {gi > 0 && <div style={{ height: 1, background: 'var(--app-hairline)' }} />}
              <GroupLabel label={group.label} />
              {group.items.map((item, ii) => {
                const idx = itemIndex++
                return (
                  <div key={item.id}>
                    {ii > 0 && (
                      <div style={{ height: 1, background: 'var(--app-hairline)', margin: '0 20px' }} />
                    )}
                    <NotifCard
                      item={item}
                      onRead={markRead}
                      onDelete={deleteNotif}
                      index={idx}
                      mob={mob}
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
