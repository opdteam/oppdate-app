'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  Bell, FileText, GitBranch, MessageCircle, Calendar,
  Key, UserCircle, CheckCircle,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'

const NOTIF_ICONS: Record<string, LucideIcon> = {
  file: FileText,
  pipeline: GitBranch,
  chat: MessageCircle,
  calendar: Calendar,
  key: Key,
  user: UserCircle,
  check: CheckCircle,
}

// Map API notification types to icon keys
const TYPE_TO_ICON: Record<string, string> = {
  application_update: 'pipeline',
  document_ready: 'file',
  message_received: 'chat',
  meeting_reminder: 'calendar',
  payment_confirmed: 'check',
  mentor_match: 'user',
  general: 'file',
}

interface ApiNotif {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  createdAt: string
  referenceId?: string | null
  referenceType?: string | null
}

interface NotifItem {
  id: string
  type: string
  unread: boolean
  time: string
  text: string
  href: string | null
}

function resolveHref(type: string, referenceType: string | null | undefined, referenceId: string | null | undefined): string | null {
  switch (type) {
    case 'application_status_change':
    case 'document_assistance':
      return referenceId ? `/apply/status?applicationId=${referenceId}` : '/applications'
    case 'new_message':
      return '/messages'
    case 'payment_confirmed':
      if (referenceType === 'application') return referenceId ? `/apply/confirm?applicationId=${referenceId}` : '/applications'
      if (referenceType === 'consultation') return '/consultations'
      if (referenceType === 'mentorship') return '/mentorships'
      if (referenceType === 'premium') return '/profile'
      return '/dashboard'
    case 'deadline_reminder':
      return '/opportunities'
    case 'consultation_confirmed':
      return '/consultations'
    case 'mentorship_update':
      return '/mentorships'
    case 'saved_search_alert':
      return '/opportunities'
    default:
      return null
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d} days ago`
  return `${Math.floor(d / 7)}w ago`
}

function toNotifItem(n: ApiNotif): NotifItem {
  return {
    id: n.id,
    type: n.type,
    unread: !n.read,
    time: timeAgo(n.createdAt),
    text: n.title,
    href: resolveHref(n.type, n.referenceType, n.referenceId),
  }
}

function getIcon(type: string) {
  const kind = TYPE_TO_ICON[type] || 'file'
  return NOTIF_ICONS[kind] || Bell
}

/* -------------------------------------------------- */
/*  Row                                               */
/* -------------------------------------------------- */
function NotifRow({ item, onRead, onClose, compact }: {
  item: NotifItem; onRead: (id: string) => void; onClose?: () => void; compact?: boolean
}) {
  const router = useRouter()
  const Ico = getIcon(item.type)

  const handleClick = () => {
    onRead(item.id)
    if (item.href) {
      onClose?.()
      router.push(item.href)
    }
  }

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'flex', alignItems: 'flex-start',
        gap: compact ? 8 : 11, width: '100%', textAlign: 'left',
        padding: compact ? '7px 14px' : '11px 16px',
        border: 'none', cursor: item.href ? 'pointer' : 'default',
        background: item.unread ? 'rgba(181,83,10,0.05)' : 'transparent',
      }}
    >
      <span style={{
        width: compact ? 24 : 32, height: compact ? 24 : 32,
        borderRadius: '50%', flexShrink: 0, marginTop: 1,
        background: 'rgba(122,45,5,0.08)', color: '#7A2D05',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Ico size={compact ? 12 : 16} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          display: 'block', fontFamily: 'var(--font-sans)',
          fontSize: compact ? 11.5 : 13.5, lineHeight: 1.38, color: '#2A1206',
        }}>{item.text}</span>
        <span style={{
          display: 'block', fontFamily: 'var(--font-sans)',
          fontSize: compact ? 10 : 12, color: '#9E8070', marginTop: 2,
        }}>{item.time}</span>
      </span>
      {item.unread && (
        <span style={{
          width: compact ? 5 : 7, height: compact ? 5 : 7,
          borderRadius: '50%', background: '#7A2D05',
          flexShrink: 0, marginTop: 5,
        }} />
      )}
    </button>
  )
}

/* -------------------------------------------------- */
/*  Desktop dropdown (absolute, below bell)           */
/* -------------------------------------------------- */
function DesktopDropdown({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<NotifItem[]>([])
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get<{ data: { notifications: ApiNotif[]; unreadCount: number } }>('/api/v1/notifications?limit=7').then(res => {
      const list: ApiNotif[] = res.data?.data?.notifications ?? []
      setItems(list.map(toNotifItem))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', h)
    document.addEventListener('keydown', k)
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k) }
  }, [onClose])

  const markRead = useCallback((id: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, unread: false } : it))
    api.patch(`/api/v1/notifications/${id}/read`).catch(() => {})
  }, [])
  const markAllRead = useCallback(() => {
    setItems(prev => prev.map(it => ({ ...it, unread: false })))
    api.post('/api/v1/notifications/read-all').catch(() => {})
  }, [])

  const hasUnread = items.some(it => it.unread)

  return (
    <div ref={ref} style={{
      position: 'absolute', top: 'calc(100% + 10px)', right: 0,
      width: 380, maxHeight: 480,
      display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 50,
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(20px) saturate(140%)',
      WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      border: '1px solid rgba(255,255,255,0.6)', borderRadius: 16,
      boxShadow: '0 16px 48px rgba(42,18,6,0.18)',
      animation: 'notifPop 160ms var(--ease-out-soft) both',
      transformOrigin: 'top right',
    }}>
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '14px 16px 10px',
      }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 16, color: '#2A1206' }}>
          Notifications
        </span>
        {hasUnread && (
          <button onClick={markAllRead} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 500, color: '#7A2D05',
          }}>Mark all as read</button>
        )}
      </div>
      <div style={{ height: 1, background: 'rgba(212,132,58,0.14)', flexShrink: 0 }} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {loading ? (
          // Skeleton rows
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 11,
              padding: '11px 16px', opacity: 1 - i * 0.2,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(181,83,10,0.08)',
                animation: 'notifSkeletonPulse 1.4s ease-in-out infinite',
                animationDelay: `${i * 120}ms`,
              }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 2 }}>
                <div style={{
                  height: 12, borderRadius: 6, background: 'rgba(181,83,10,0.08)',
                  width: `${75 - i * 10}%`,
                  animation: 'notifSkeletonPulse 1.4s ease-in-out infinite',
                  animationDelay: `${i * 120 + 60}ms`,
                }} />
                <div style={{
                  height: 10, borderRadius: 6, background: 'rgba(181,83,10,0.06)',
                  width: '40%',
                  animation: 'notifSkeletonPulse 1.4s ease-in-out infinite',
                  animationDelay: `${i * 120 + 120}ms`,
                }} />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          // Empty state
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '36px 24px 28px', gap: 0,
          }}>
            {/* Concentric rings illustration */}
            <div style={{ position: 'relative', width: 72, height: 72, marginBottom: 16 }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: '1.5px solid rgba(181,83,10,0.12)',
                animation: 'notifEmptyRing 3.2s ease-in-out infinite',
              }} />
              <div style={{
                position: 'absolute', inset: 10, borderRadius: '50%',
                border: '1.5px solid rgba(181,83,10,0.18)',
                animation: 'notifEmptyRing 3.2s ease-in-out infinite',
                animationDelay: '0.3s',
              }} />
              <div style={{
                position: 'absolute', inset: 20, borderRadius: '50%',
                background: 'rgba(181,83,10,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bell size={18} style={{ color: 'rgba(122,45,5,0.45)' }} />
              </div>
            </div>
            <span style={{
              fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 14.5,
              color: '#2A1206', marginBottom: 5, letterSpacing: '-0.01em',
            }}>All caught up</span>
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: 12.5, color: '#9E8070',
              textAlign: 'center', lineHeight: 1.45,
            }}>No new notifications right now.</span>
          </div>
        ) : (
          items.map(it => (
            <NotifRow key={it.id} item={it} onRead={markRead} onClose={onClose} />
          ))
        )}
      </div>
      <div style={{ height: 1, background: 'rgba(212,132,58,0.14)', flexShrink: 0 }} />
      <Link href="/notifications" onClick={onClose} style={{
        display: 'block', padding: '12px 16px', textAlign: 'center',
        fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
        color: '#7A2D05', textDecoration: 'none',
      }}>View all</Link>
    </div>
  )
}

/* -------------------------------------------------- */
/*  Mobile bottom sheet (portalled, full-width)       */
/* -------------------------------------------------- */
function MobileSheet({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<NotifItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ data: { notifications: ApiNotif[]; unreadCount: number } }>('/api/v1/notifications?limit=7').then(res => {
      const list: ApiNotif[] = res.data?.data?.notifications ?? []
      setItems(list.map(toNotifItem))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [onClose])

  const markRead = useCallback((id: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, unread: false } : it))
    api.patch(`/api/v1/notifications/${id}/read`).catch(() => {})
  }, [])
  const markAllRead = useCallback(() => {
    setItems(prev => prev.map(it => ({ ...it, unread: false })))
    api.post('/api/v1/notifications/read-all').catch(() => {})
  }, [])

  const hasUnread = items.some(it => it.unread)

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 99999,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(42,18,6,0.4)' }}
      />

      {/* Sheet */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxHeight: '65vh',
          display: 'flex', flexDirection: 'column',
          background: '#FFFFFF',
          borderRadius: '14px 14px 0 0',
          boxShadow: '0 -6px 32px rgba(42,18,6,0.18)',
          overflow: 'hidden',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 0', flexShrink: 0 }}>
          <div style={{ width: 32, height: 4, borderRadius: 2, background: 'rgba(42,18,6,0.15)' }} />
        </div>

        {/* Header */}
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '8px 14px 6px',
        }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 14, color: '#2A1206' }}>
            Notifications
          </span>
          {hasUnread && (
            <button onClick={markAllRead} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: '#7A2D05',
            }}>Mark all as read</button>
          )}
        </div>

        <div style={{ height: 1, background: 'rgba(212,132,58,0.12)', flexShrink: 0 }} />

        {/* Scrollable list */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '7px 14px', opacity: 1 - i * 0.2,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(181,83,10,0.08)',
                  animation: 'notifSkeletonPulse 1.4s ease-in-out infinite',
                  animationDelay: `${i * 120}ms`,
                }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, paddingTop: 2 }}>
                  <div style={{
                    height: 10, borderRadius: 5, background: 'rgba(181,83,10,0.08)',
                    width: `${75 - i * 10}%`,
                    animation: 'notifSkeletonPulse 1.4s ease-in-out infinite',
                    animationDelay: `${i * 120 + 60}ms`,
                  }} />
                  <div style={{
                    height: 8, borderRadius: 5, background: 'rgba(181,83,10,0.06)',
                    width: '40%',
                    animation: 'notifSkeletonPulse 1.4s ease-in-out infinite',
                    animationDelay: `${i * 120 + 120}ms`,
                  }} />
                </div>
              </div>
            ))
          ) : items.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '28px 20px 20px', gap: 0,
            }}>
              <div style={{ position: 'relative', width: 56, height: 56, marginBottom: 12 }}>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: '1.5px solid rgba(181,83,10,0.12)',
                  animation: 'notifEmptyRing 3.2s ease-in-out infinite',
                }} />
                <div style={{
                  position: 'absolute', inset: 8, borderRadius: '50%',
                  border: '1.5px solid rgba(181,83,10,0.18)',
                  animation: 'notifEmptyRing 3.2s ease-in-out infinite',
                  animationDelay: '0.3s',
                }} />
                <div style={{
                  position: 'absolute', inset: 16, borderRadius: '50%',
                  background: 'rgba(181,83,10,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Bell size={14} style={{ color: 'rgba(122,45,5,0.45)' }} />
                </div>
              </div>
              <span style={{
                fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 13,
                color: '#2A1206', marginBottom: 4,
              }}>All caught up</span>
              <span style={{
                fontFamily: 'var(--font-sans)', fontSize: 11.5, color: '#9E8070',
                textAlign: 'center', lineHeight: 1.45,
              }}>No new notifications right now.</span>
            </div>
          ) : (
            items.map(it => (
              <NotifRow key={it.id} item={it} onRead={markRead} onClose={onClose} compact />
            ))
          )}
        </div>

        <div style={{ height: 1, background: 'rgba(212,132,58,0.12)', flexShrink: 0 }} />

        {/* Footer */}
        <Link href="/notifications" onClick={onClose} style={{
          display: 'block', padding: '10px 14px', textAlign: 'center',
          fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
          color: '#7A2D05', textDecoration: 'none', flexShrink: 0,
        }}>View all</Link>
      </div>
    </div>,
    document.body,
  )
}

/* -------------------------------------------------- */
/*  Bell button                                       */
/* -------------------------------------------------- */
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

export function NotifBell() {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const isMobile = useIsMobile()

  const fetchCount = useCallback(() => {
    api.get<{ data: { notifications: ApiNotif[]; unreadCount: number } }>('/api/v1/notifications?limit=50').then(res => {
      setUnreadCount(res.data?.data?.unreadCount ?? 0)
    }).catch(() => {})
  }, [])

  useEffect(() => { fetchCount() }, [fetchCount])

  useWebSocket(useCallback((msg) => {
    if (msg.type === 'new_notification') {
      setUnreadCount(prev => prev + 1)
    }
  }, []))

  const handleOpen = useCallback(() => {
    setOpen(o => {
      if (!o) setUnreadCount(0) // optimistic clear on open
      return !o
    })
  }, [])

  const handleClose = useCallback(() => {
    setOpen(false)
    fetchCount() // re-sync actual count after interactions
  }, [fetchCount])

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        className="app-topbar-bell"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 1, right: 1,
            minWidth: 15, height: 15, padding: '0 3px', borderRadius: 999,
            background: '#7A2D05', color: '#fff',
            fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid rgba(255,255,255,0.9)',
            animation: 'notifBadgePulse 300ms var(--ease-out-soft)',
          }}>{unreadCount}</span>
        )}
      </button>

      {open && (
        isMobile
          ? <MobileSheet onClose={handleClose} />
          : <DesktopDropdown onClose={handleClose} />
      )}
    </div>
  )
}

export { DesktopDropdown as NotificationsDropdown }
