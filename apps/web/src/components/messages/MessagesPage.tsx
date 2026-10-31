'use client'

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import Image from 'next/image'
import { Search, Send, Paperclip, FileText, MessageCircle, ArrowLeft, CheckCircle, ChevronRight, ChevronDown, CheckCheck, CheckSquare, Square, Clock, AlertCircle, X } from 'lucide-react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { keys, fetchers, ApiThread } from '@/lib/queries'
import { useWebSocket } from '@/hooks/useWebSocket'

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

// -- Types --

interface ApiMessage {
  id: string
  senderType: string
  sender_type?: string
  senderId?: string
  content: string
  createdAt: string
  created_at?: string
}

interface ApiDocRequestItem {
  id: string
  requestId: string
  label: string
  documentId?: string | null
  status: 'pending' | 'uploaded' | 'verified'
}

interface ApiDocRequest {
  id: string
  threadId: string
  createdBy: string
  createdAt: string
  items: ApiDocRequestItem[]
}

type MessageFrom = 'system' | 'team' | 'user'

interface Attachment {
  name: string
  type: string
  size: string
}

interface Message {
  from: MessageFrom
  name?: string
  text: string
  day: string
  time: string
  attachment?: Attachment
}

interface Thread {
  id: string
  service: string
  title: string
  sub: string
  status: 'active' | 'awaiting' | 'resolved' | 'closed'
  unread: number
  lastTime: string
  lastPreview: string
  messages: Message[]
  opportunityCountry?: string | null
  referenceId?: string
}

const STATUS_CONFIG: Record<string, { label: string; tone: 'green' | 'amber' | 'muted' }> = {
  active:   { label: 'Active',         tone: 'green' },
  awaiting: { label: 'Awaiting reply', tone: 'amber' },
  resolved: { label: 'Resolved',            tone: 'muted' },
  closed:   { label: 'Closed',              tone: 'muted' },
}

const TONE_COLORS: Record<string, string> = {
  green: 'var(--app-green)',
  amber: 'var(--app-amber)',
  muted: 'var(--app-text-sec)',
}

function apiThreadToUiThread(t: ApiThread): Thread {
  const typeLabel = t.type === 'oppdate_apply' ? 'OppDate Apply' : t.type === 'application' ? 'OppDate Apply' : t.type === 'mentorship' ? 'Mentorship' : 'Support'
  const title = t.opportunityTitle ?? (typeLabel + ' thread')
  const lastTime = t.lastMessageAt ? new Date(t.lastMessageAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''
  return {
    id: t.id,
    service: typeLabel,
    title,
    sub: '',
    status: (t.status === 'awaiting_team' ? 'awaiting' : t.status === 'awaiting_user' ? 'active' : t.status as Thread['status']) || 'active',
    unread: t.unreadByUser,
    lastTime,
    lastPreview: t.lastMessagePreview
      ? (t.lastMessagePreview.startsWith('{"type":"document_request"')
          ? 'Requested documents from you'
          : t.lastMessagePreview.includes('{"type":"attachment"')
            ? 'Sent an attachment'
            : t.lastMessagePreview.replace(/\n+/g, ' ').trim())
      : '',
    messages: [],
    opportunityCountry: t.opportunityCountry ?? null,
    referenceId: t.referenceId,
  }
}

// Region tint based on opportunity country
function regionTint(country?: string | null): string {
  if (!country) return 'transparent'
  const c = country.toLowerCase()
  const africaKeywords = ['nigeria', 'ghana', 'kenya', 'ethiopia', 'south africa', 'uganda', 'tanzania', 'rwanda', 'senegal', 'ivory coast', 'cameroon', 'zimbabwe', 'zambia', 'mozambique', 'egypt', 'morocco', 'tunisia', 'algeria']
  const euKeywords = ['germany', 'france', 'netherlands', 'sweden', 'norway', 'denmark', 'finland', 'austria', 'switzerland', 'belgium', 'italy', 'spain', 'portugal', 'poland', 'czech', 'hungary']
  if (africaKeywords.some(k => c.includes(k))) return 'rgba(196,136,28,0.04)'
  if (euKeywords.some(k => c.includes(k))) return 'rgba(71,85,105,0.04)'
  if (c.includes('united kingdom') || c.includes('uk') || c.includes('global') || c.includes('international') || c.includes('worldwide')) return 'rgba(14,116,144,0.04)'
  return 'transparent'
}

// -- Helpers --

function toneColor(status: string): string {
  const cfg = STATUS_CONFIG[status]
  return cfg ? TONE_COLORS[cfg.tone] : TONE_COLORS.muted
}

function getInitials(name?: string) {
  if (!name) return 'OD'
  const parts = name.split(' ')
  return parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)
}

// -- Sub-components --

function StatusChip({ status, small, compact }: { status: string; small?: boolean; compact?: boolean }) {
  const cfg = STATUS_CONFIG[status]
  if (!cfg) return null
  const c = toneColor(status)
  const h = compact ? 20 : small ? 22 : 26
  const fs = compact ? 10 : small ? 11 : 12
  const px = compact ? 7 : small ? 9 : 12
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: compact ? 4 : 5,
      height: h, flexShrink: 0,
      padding: `0 ${px}px`, borderRadius: 999,
      background: `color-mix(in srgb, ${c} ${cfg.tone === 'muted' ? 10 : 12}%, transparent)`,
      border: `1px solid color-mix(in srgb, ${c} 32%, transparent)`,
      fontFamily: 'var(--font-sans)', fontSize: fs, fontWeight: 600,
      color: c, whiteSpace: 'nowrap',
    }}>
      {cfg.tone !== 'muted' && <span style={{ width: compact ? 5 : 6, height: compact ? 5 : 6, borderRadius: '50%', background: c }} />}
      {cfg.label}
    </span>
  )
}

function ServicePill({ service, compact }: { service: string; compact?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: compact ? 18 : 20, padding: compact ? '0 6px' : '0 8px',
      borderRadius: compact ? 5 : 6, background: 'rgba(122,45,5,0.08)',
      border: '1px solid rgba(122,45,5,0.22)',
      fontFamily: 'var(--font-sans)', fontSize: compact ? 10 : 11, fontWeight: 600,
      letterSpacing: '0.02em', color: 'var(--app-ginger)', whiteSpace: 'nowrap',
    }}>
      {service}
    </span>
  )
}

function FileCard({ file, mine, compact }: { file: Attachment; mine: boolean; compact?: boolean }) {
  return (
    <div className="msg-filecard" style={{
      display: 'flex', alignItems: 'center', gap: compact ? 8 : 11, marginTop: compact ? 6 : 8,
      padding: compact ? '7px 10px' : '10px 12px', borderRadius: compact ? 9 : 11, cursor: 'pointer',
      background: mine ? 'rgba(255,255,255,0.16)' : '#FFFFFF',
      border: mine ? '1px solid rgba(255,255,255,0.28)' : '1px solid var(--app-hairline)',
      animation: 'msgChip 340ms var(--ease-out-soft) both',
    }}>
      <span style={{
        width: compact ? 28 : 36, height: compact ? 28 : 36, borderRadius: compact ? 6 : 8, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: mine ? 'rgba(255,255,255,0.2)' : 'rgba(122,45,5,0.08)',
        color: mine ? '#fff' : 'var(--app-ginger)',
      }}>
        <FileText size={compact ? 14 : 18} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: compact ? 11.5 : 13, fontWeight: 600,
          color: mine ? '#fff' : 'var(--app-ink)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {file.name}
        </div>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: compact ? 10 : 11.5,
          color: mine ? 'rgba(255,255,255,0.8)' : 'var(--app-text-sec)',
        }}>
          {file.type} - {file.size}
        </div>
      </div>
    </div>
  )
}

function AttachedDocCard({ fileName, fileUrl, mimeType, mine, compact }: {
  fileName: string; fileUrl: string; mimeType: string; mine: boolean; compact?: boolean
}) {
  const isImage = mimeType.startsWith('image/')
  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: compact ? 8 : 11,
        marginTop: compact ? 6 : 8,
        padding: compact ? '7px 10px' : '10px 12px',
        borderRadius: compact ? 9 : 11,
        background: mine ? 'rgba(255,255,255,0.16)' : '#FFFFFF',
        border: mine ? '1px solid rgba(255,255,255,0.28)' : '1px solid var(--app-hairline)',
        textDecoration: 'none',
        animation: 'msgChip 340ms var(--ease-out-soft) both',
      }}
    >
      <span style={{
        width: compact ? 28 : 36, height: compact ? 28 : 36, borderRadius: compact ? 6 : 8, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: mine ? 'rgba(255,255,255,0.2)' : 'rgba(122,45,5,0.08)',
        color: mine ? '#fff' : 'var(--app-ginger)',
        fontSize: isImage ? (compact ? 14 : 18) : undefined,
      }}>
        {isImage ? '🖼' : <FileText size={compact ? 14 : 18} />}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: compact ? 11.5 : 13, fontWeight: 600,
          color: mine ? '#fff' : 'var(--app-ink)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {fileName}
        </div>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: compact ? 10 : 11.5,
          color: mine ? 'rgba(255,255,255,0.8)' : 'var(--app-text-sec)',
        }}>
          Tap to open
        </div>
      </div>
    </a>
  )
}

function DocItemUpload({ item, threadId, requestId, compact }: {
  item: ApiDocRequestItem; threadId: string; requestId: string; compact?: boolean
}) {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setUploading(true)
    setError(null)
    const form = new FormData()
    form.append('file', file)
    form.append('type', 'other')
    form.append('name', item.label)
    try {
      await api.post(`/api/v1/documents?requestItemId=${item.id}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      qc.invalidateQueries({ queryKey: ['doc-requests', threadId, requestId] })
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  if (item.status !== 'pending') return null

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          // Reset so same file can be re-selected if needed
          e.target.value = ''
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
        <button
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '3px 10px', borderRadius: 8,
            background: uploading ? 'rgba(122,45,5,0.5)' : 'var(--app-ginger)', color: '#fff',
            fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
            whiteSpace: 'nowrap', border: 'none', cursor: uploading ? 'default' : 'pointer',
            opacity: uploading ? 0.7 : 1, transition: 'opacity 150ms',
          }}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        {error && (
          <span style={{ fontSize: 10, color: '#DC2626', fontFamily: 'var(--font-sans)', maxWidth: 120, textAlign: 'right' }}>
            {error}
          </span>
        )}
      </div>
    </>
  )
}

function DocumentRequestCard({ requestId, threadId, compact }: { requestId: string; threadId: string; compact?: boolean }) {
  const { data: req, isLoading: loading } = useQuery({
    queryKey: ['doc-requests', threadId, requestId],
    queryFn: () =>
      api.get(`/api/v1/messages/threads/${threadId}/document-requests`)
        .then(res => {
          const list: ApiDocRequest[] = res.data?.data ?? []
          return list.find(r => r.id === requestId) ?? null
        }),
    staleTime: 30 * 1000,
  })

  if (loading) {
    return (
      <div style={{
        padding: compact ? '10px 12px' : '14px 16px', borderRadius: 14,
        background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(122,45,5,0.1)',
        fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--app-text-sec)',
      }}>
        Loading document request...
      </div>
    )
  }

  if (!req) return null

  const allDone = req.items.every(i => i.status !== 'pending')

  return (
    <div style={{
      padding: compact ? '12px 14px' : '16px 18px', borderRadius: 14,
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(16px) saturate(140%)',
      WebkitBackdropFilter: 'blur(16px) saturate(140%)',
      border: `1px solid ${allDone ? 'rgba(34,197,94,0.25)' : 'rgba(122,45,5,0.15)'}`,
      boxShadow: '0 2px 12px rgba(122,45,5,0.08)',
      animation: 'msgIn 220ms var(--ease-out-soft) both',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: allDone ? 'rgba(34,197,94,0.1)' : 'rgba(122,45,5,0.08)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: allDone ? '#16a34a' : 'var(--app-ginger)',
        }}>
          <FileText size={14} />
        </span>
        <div>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: compact ? 12.5 : 13.5, fontWeight: 700,
            color: 'var(--app-ink)',
          }}>
            Documents Required
          </div>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: compact ? 10.5 : 11, color: 'var(--app-text-sec)',
          }}>
            {req.items.filter(i => i.status !== 'pending').length} of {req.items.length} submitted
          </div>
        </div>
        {allDone && (
          <span style={{
            marginLeft: 'auto', padding: '2px 8px', borderRadius: 999,
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
            fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, color: '#16a34a',
          }}>
            Complete
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {req.items.map(item => (
          <div key={item.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: compact ? '8px 10px' : '9px 12px', borderRadius: 10,
            background: item.status === 'verified'
              ? 'rgba(34,197,94,0.06)'
              : item.status === 'uploaded'
                ? 'rgba(14,116,144,0.05)'
                : 'rgba(122,45,5,0.03)',
            border: `1px solid ${item.status === 'verified' ? 'rgba(34,197,94,0.15)' : item.status === 'uploaded' ? 'rgba(14,116,144,0.12)' : 'rgba(122,45,5,0.07)'}`,
          }}>
            <span style={{
              flexShrink: 0,
              color: item.status === 'verified' ? '#16a34a' : item.status === 'uploaded' ? '#0e7490' : 'rgba(122,45,5,0.35)',
            }}>
              {item.status !== 'pending' ? <CheckSquare size={15} /> : <Square size={15} />}
            </span>
            <span style={{
              flex: 1, fontFamily: 'var(--font-sans)', fontSize: compact ? 12 : 13,
              color: item.status === 'pending' ? 'var(--app-ink)' : 'var(--app-text-sec)',
              textDecoration: item.status === 'verified' ? 'line-through' : 'none',
            }}>
              {item.label}
            </span>
            <DocItemUpload item={item} threadId={threadId} requestId={requestId} compact={compact} />
            {item.status === 'uploaded' && (
              <span style={{
                flexShrink: 0, padding: '3px 8px', borderRadius: 8,
                background: 'rgba(14,116,144,0.1)', border: '1px solid rgba(14,116,144,0.2)',
                fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, color: '#0e7490',
              }}>
                Reviewing
              </span>
            )}
            {item.status === 'verified' && (
              <span style={{
                flexShrink: 0,
                fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, color: '#16a34a',
              }}>
                Verified
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function MessageBubble({ msg, showAvatar, showTail, index, compact, threadId }: { msg: Message; showAvatar: boolean; showTail: boolean; index: number; compact?: boolean; threadId?: string }) {
  const delay = index * 40
  if (msg.from === 'system') {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', margin: compact ? '2px 0' : '4px 0',
        animation: `msgNoticeIn 220ms ease ${delay}ms both`,
      }}>
        <div style={{
          maxWidth: compact ? '92%' : '86%', textAlign: 'center',
          padding: compact ? '7px 12px' : '9px 16px', borderRadius: 999,
          background: compact ? 'rgba(122,45,5,0.05)' : 'rgba(122,45,5,0.06)',
          border: '1px solid rgba(122,45,5,0.12)',
          fontFamily: 'var(--font-sans)', fontSize: compact ? 11 : 12, lineHeight: 1.5,
          color: 'var(--app-text-sec)', whiteSpace: 'pre-wrap',
        }}>
          {msg.text}
        </div>
      </div>
    )
  }

  // Check if this is a document request message
  const isDocRequest = msg.text.startsWith('{"type":"document_request"')
  let docRequestId: string | null = null
  if (isDocRequest) {
    try {
      const parsed = JSON.parse(msg.text)
      docRequestId = parsed.requestId ?? null
    } catch { /* ignore */ }
  }

  // Check for file attachment JSON (may be prefixed with text + newline)
  const attachJsonIdx = msg.text.indexOf('{"type":"attachment"')
  let attachMeta: { fileName: string; fileUrl: string; mimeType: string } | null = null
  let attachTextBefore = ''
  if (attachJsonIdx !== -1) {
    try {
      const att = JSON.parse(msg.text.slice(attachJsonIdx))
      attachMeta = { fileName: att.fileName, fileUrl: att.fileUrl, mimeType: att.mimeType }
      attachTextBefore = msg.text.slice(0, attachJsonIdx).replace(/\n$/, '').trim()
    } catch { /* ignore */ }
  }

  const mine = msg.from === 'user'
  const avatarSize = compact ? 24 : 26

  // Document request renders as a special card, not a bubble
  if (isDocRequest && docRequestId && threadId) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'row',
        alignItems: 'flex-start', gap: compact ? 6 : 8,
        animation: `msgIn 220ms var(--ease-out-soft) ${delay}ms both`,
      }}>
        <span style={{
          width: avatarSize, height: avatarSize, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', boxShadow: '0 2px 8px rgba(122,45,5,0.25)',
        }}>
          <img src="/assets/oppdate-monogram.png" alt="OppDate"
            style={{ width: '60%', height: '60%', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
        </span>
        <div style={{ maxWidth: compact ? '90%' : '80%', flex: 1 }}>
          <DocumentRequestCard requestId={docRequestId} threadId={threadId} compact={compact} />
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: compact ? 9.5 : 10.5,
            color: 'var(--app-text-sec)', marginTop: compact ? 3 : 4, paddingLeft: 4,
          }}>
            {msg.time}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: mine ? 'row-reverse' : 'row',
      alignItems: 'flex-end', gap: compact ? 6 : 8,
      animation: `msgIn 220ms var(--ease-out-soft) ${delay}ms both`,
    }}>
      {!mine && (
        showAvatar
          ? <span style={{
              position: 'relative',
              width: avatarSize, height: avatarSize, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)',
              border: '1.5px solid rgba(122,45,5,0.25)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(122,45,5,0.25)',
            }}>
              <img
                src="/assets/oppdate-monogram.png"
                alt="OppDate"
                style={{ width: '60%', height: '60%', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
              />
              {compact && (
                <span style={{
                  position: 'absolute', bottom: -1, right: -1,
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--app-green, #22c55e)',
                  border: '1.5px solid #FAF7F4',
                }} />
              )}
            </span>
          : <span style={{ width: avatarSize, flexShrink: 0 }} />
      )}
      <div style={{ maxWidth: compact ? '80%' : '75%' }}>
        {!mine && showAvatar && msg.name && (
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: compact ? 10.5 : 11.5, fontWeight: 600,
            color: 'var(--app-ginger)', marginBottom: compact ? 3 : 4, marginLeft: 2,
          }}>
            {msg.name}
          </div>
        )}
        {/* Speech bubble with CSS border-trick tail */}
        <div style={{ position: 'relative', filter: mine ? 'drop-shadow(0 2px 10px rgba(122,45,5,0.28))' : 'drop-shadow(0 2px 8px rgba(122,45,5,0.12))', marginBottom: compact ? 4 : 6 }}>
          <div style={{
            position: 'relative',
            padding: msg.attachment && !msg.text ? (compact ? 6 : 8) : (compact ? '8px 12px' : '14px 18px'),
            borderRadius: mine
              ? (showTail ? '18px 18px 4px 18px' : 18)
              : (showTail ? '18px 18px 18px 4px' : 18),
            background: mine
              ? (compact ? 'linear-gradient(135deg, #B5530A 0%, #7A2D05 100%)' : 'var(--app-ginger)')
              : 'rgba(255,255,255,0.94)',
            backdropFilter: !mine ? 'blur(16px) saturate(140%)' : undefined,
            WebkitBackdropFilter: !mine ? 'blur(16px) saturate(140%)' : undefined,
            border: mine ? 'none' : '1px solid rgba(216,204,196,0.5)',
            color: mine ? '#fff' : 'var(--app-ink)',
            fontFamily: 'var(--font-sans)', fontSize: compact ? 13 : 14, lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}>
            {attachMeta ? attachTextBefore : msg.text.replace('[Attached document]', '').trim()}
            {msg.attachment && <FileCard file={msg.attachment} mine={mine} compact={compact} />}
            {attachMeta
              ? <AttachedDocCard fileName={attachMeta.fileName} fileUrl={attachMeta.fileUrl} mimeType={attachMeta.mimeType} mine={mine} compact={compact} />
              : msg.text.includes('[Attached document]') && (
                <div style={{
                  marginTop: msg.text.replace('[Attached document]', '').trim() ? 8 : 0,
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 10px', borderRadius: 9,
                  background: mine ? 'rgba(255,255,255,0.14)' : 'rgba(122,45,5,0.07)',
                  border: mine ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--app-hairline)',
                  fontFamily: 'var(--font-sans)', fontSize: compact ? 11.5 : 12.5,
                  color: mine ? 'rgba(255,255,255,0.75)' : 'var(--app-text-sec)',
                }}>
                  <FileText size={13} style={{ flexShrink: 0 }} />
                  Attachment (no longer available)
                </div>
              )
            }
            {/* Tail using ::before-equivalent inline pseudo via absolute child */}
            {showTail && (
              <span style={{
                position: 'absolute',
                bottom: -5,
                ...(mine ? { right: 0 } : { left: 0 }),
                width: 0, height: 0,
                borderStyle: 'solid',
                ...(mine
                  ? {
                      borderWidth: '10px 0 0 14px',
                      borderColor: `${compact ? '#7A2D05' : 'var(--app-ginger)'} transparent transparent transparent`,
                    }
                  : {
                      borderWidth: '10px 14px 0 0',
                      borderColor: 'rgba(255,255,255,0.94) transparent transparent transparent',
                    }),
              }} />
            )}
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          justifyContent: mine ? 'flex-end' : 'flex-start',
          fontFamily: 'var(--font-sans)', fontSize: compact ? 9.5 : 10.5,
          color: 'var(--app-text-sec)', marginTop: compact ? 3 : 4,
          padding: '0 4px',
        }}>
          {msg.time}
          {mine && compact && (
            <CheckCheck size={12} style={{ color: 'var(--app-ginger)', opacity: 0.7 }} />
          )}
        </div>
      </div>
    </div>
  )
}

function DayDivider({ label, compact }: { label: string; compact?: boolean }) {
  if (compact) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 2px' }}>
        <span style={{
          padding: '4px 14px', borderRadius: 999,
          background: 'rgba(122,45,5,0.06)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(122,45,5,0.08)',
          fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600,
          letterSpacing: '0.05em', color: 'var(--app-text-sec)', textTransform: 'uppercase',
        }}>
          {label}
        </span>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0 2px' }}>
      <span style={{ flex: 1, height: 1, background: 'var(--app-hairline)' }} />
      <span style={{
        fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
        letterSpacing: '0.04em', color: 'var(--app-text-sec)', textTransform: 'uppercase',
      }}>
        {label}
      </span>
      <span style={{ flex: 1, height: 1, background: 'var(--app-hairline)' }} />
    </div>
  )
}

function ThreadMessages({ messages, compact, threadId }: { messages: Message[]; compact?: boolean; threadId?: string }) {
  const rows: React.ReactNode[] = []
  let lastDay: string | null = null
  let lastFrom: string | null = null

  messages.forEach((m, i) => {
    if (m.day !== lastDay) {
      rows.push(<DayDivider key={`d-${i}`} label={m.day} compact={compact} />)
      lastDay = m.day
      lastFrom = null
    }
    const nextMsg = messages[i + 1]
    const isLastInRun = !nextMsg || nextMsg.from !== m.from || nextMsg.day !== m.day
    const showAvatar = m.from === 'team' && isLastInRun
    const showTail = isLastInRun
    rows.push(<MessageBubble key={i} msg={m} showAvatar={showAvatar} showTail={showTail} index={i} compact={compact} threadId={threadId} />)
    lastFrom = m.from
  })

  return <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 8 : 12 }}>{rows}</div>
}

function TypingIndicator() {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: 6,
      animation: 'msgIn 220ms var(--ease-out-soft) both',
    }}>
      <span style={{
        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 700,
        color: '#fff', boxShadow: '0 2px 8px rgba(122,45,5,0.25)',
      }}>
        OD
      </span>
      <div style={{
        padding: '10px 16px', borderRadius: '16px 16px 16px 4px',
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(12px) saturate(120%)',
        WebkitBackdropFilter: 'blur(12px) saturate(120%)',
        border: '1px solid rgba(255,255,255,0.7)',
        boxShadow: '0 1px 6px rgba(122,45,5,0.06)',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--app-ginger)',
            opacity: 0.6,
            animation: `msgTypingDot 1.2s ease-in-out ${i * 160}ms infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}

// Attachment chip shown inside composer after file selected
function AttachmentChip({ file, uploading, error, onRemove }: {
  file: File; uploading: boolean; error: string | null; onRemove: () => void
}) {
  const isImage = file.type.startsWith('image/')
  const sizeKb = Math.round(file.size / 1024)
  const sizeLabel = sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 10px', borderRadius: 10,
      background: error ? 'rgba(220,38,38,0.06)' : uploading ? 'rgba(122,45,5,0.05)' : 'rgba(122,45,5,0.06)',
      border: `1px solid ${error ? 'rgba(220,38,38,0.2)' : uploading ? 'rgba(122,45,5,0.1)' : 'rgba(122,45,5,0.15)'}`,
      marginBottom: 8, animation: 'msgFadeIn 150ms ease both',
    }}>
      {isImage
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={URL.createObjectURL(file)} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
        : <span style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(122,45,5,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={16} style={{ color: 'var(--app-ginger)' }} />
          </span>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--app-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {file.name}
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: error ? '#DC2626' : uploading ? 'var(--app-ginger)' : 'var(--app-text-sec)' }}>
          {error ?? (uploading ? 'Uploading...' : sizeLabel)}
        </div>
      </div>
      {!uploading && (
        <button onClick={onRemove} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-sec)', padding: 2, display: 'flex' }}>
          <X size={14} />
        </button>
      )}
      {uploading && (
        <span style={{
          width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
          border: '2px solid rgba(122,45,5,0.15)', borderTopColor: 'var(--app-ginger)',
          animation: 'msgSpin 0.7s linear infinite',
          display: 'inline-block',
        }} />
      )}
    </div>
  )
}

function MessageInput({
  disabled, compact, threadId, onSent, sendEvent,
}: {
  disabled: false | 'resolved' | 'closed'
  compact?: boolean
  threadId: string
  onSent: (msg: ApiMessage) => void
  sendEvent: (e: object) => void
}) {
  const [value, setValue] = useState('')
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  // Attachment tray
  const [trayOpen, setTrayOpen] = useState(false)
  const trayRef = useRef<HTMLDivElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const imgInputRef = useRef<HTMLInputElement>(null)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done'>('idle')
  const [uploadedDoc, setUploadedDoc] = useState<{ id: string; fileUrl: string; name: string; mimeType: string } | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Close tray on outside click
  useEffect(() => {
    if (!trayOpen) return
    const h = (e: MouseEvent) => {
      if (trayRef.current && !trayRef.current.contains(e.target as Node)) setTrayOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [trayOpen])

  const handleFileSelected = async (file: File) => {
    setTrayOpen(false)
    setAttachment(file)
    setUploadError(null)
    setUploadState('uploading')
    setUploadedDoc(null)

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const docType = ['jpg', 'jpeg', 'png', 'webp'].includes(ext)
      ? 'passport_photo'
      : ext === 'pdf' ? 'cv' : 'other'

    const form = new FormData()
    form.append('file', file)
    form.append('type', docType)
    form.append('name', file.name.replace(/\.[^.]+$/, ''))

    try {
      const res = await api.post('/api/v1/documents', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const doc = res.data?.data
      setUploadedDoc(doc ? { id: doc.id, fileUrl: doc.fileUrl, name: doc.name, mimeType: doc.mimeType } : null)
      setUploadState('done')
    } catch (e: any) {
      setUploadError(e?.response?.data?.message ?? 'Upload failed')
      setUploadState('idle')
    }
  }

  const clearAttachment = () => {
    setAttachment(null)
    setUploadState('idle')
    setUploadedDoc(null)
    setUploadError(null)
  }

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, compact ? 80 : 120) + 'px'
  }, [value, compact])

  const stopTyping = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false
      sendEvent({ type: 'typing_stop', threadId })
    }
  }, [sendEvent, threadId])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    // Typing indicator
    if (!isTypingRef.current) {
      isTypingRef.current = true
      sendEvent({ type: 'typing_start', threadId })
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(stopTyping, 1500)
  }, [sendEvent, threadId, stopTyping])

  const canSend = (value.trim().length > 0 || uploadState === 'done') && sendState === 'idle'

  const handleSend = useCallback(async () => {
    if (sendState !== 'idle') return
    const trimmed = value.trim()
    const hasDoc = uploadState === 'done' && uploadedDoc
    if (!trimmed && !hasDoc) return
    stopTyping()
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    setSendState('sending')
    if (navigator.vibrate) navigator.vibrate(10)

    // Embed document reference as structured JSON so it can be rendered as a card
    const content = hasDoc
      ? (trimmed
          ? `${trimmed}\n${JSON.stringify({ type: 'attachment', documentId: uploadedDoc!.id, fileName: uploadedDoc!.name, fileUrl: uploadedDoc!.fileUrl, mimeType: uploadedDoc!.mimeType })}`
          : JSON.stringify({ type: 'attachment', documentId: uploadedDoc!.id, fileName: uploadedDoc!.name, fileUrl: uploadedDoc!.fileUrl, mimeType: uploadedDoc!.mimeType }))
      : trimmed

    try {
      const res = await api.post(`/api/v1/messages/threads/${threadId}/messages`, { content })
      const msg: ApiMessage = res.data?.data
      setValue('')
      clearAttachment()
      onSent(msg)
      setSendState('sent')
      setTimeout(() => setSendState('idle'), 1200)
    } catch {
      setSendState('idle')
    }
  }, [value, uploadState, uploadedDoc, sendState, threadId, onSent, stopTyping])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  useEffect(() => () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
  }, [])

  if (disabled) {
    return (
      <div style={{
        padding: compact ? '12px 14px' : '18px 22px',
        borderTop: '1px solid var(--app-hairline)',
        background: 'rgba(255,255,255,0.5)',
        paddingBottom: compact ? 'calc(12px + env(safe-area-inset-bottom, 0px))' : undefined,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          height: compact ? 40 : 48, borderRadius: compact ? 10 : 12,
          background: 'rgba(106,123,133,0.07)', border: '1px solid rgba(106,123,133,0.18)',
          fontFamily: 'var(--font-sans)', fontSize: compact ? 12 : 13.5, color: 'var(--app-text-sec)',
          animation: 'msgNoticeIn 320ms ease both',
        }}>
          <CheckCircle size={compact ? 14 : 16} />
          This conversation is {disabled}.
        </div>
      </div>
    )
  }

  const charCount = value.length
  const showCounter = charCount >= 400
  const overWarning = charCount >= 800

  return (
    <div style={{
      padding: compact ? '10px 12px' : '16px 22px',
      borderTop: compact ? 'none' : '1px solid var(--app-hairline)',
      background: compact ? 'rgba(26,13,5,0.92)' : 'rgba(255,255,255,0.55)',
      backdropFilter: compact ? 'blur(20px) saturate(150%)' : undefined,
      WebkitBackdropFilter: compact ? 'blur(20px) saturate(150%)' : undefined,
      boxShadow: compact ? '0 -4px 20px rgba(0,0,0,0.3)' : undefined,
      paddingBottom: compact ? 'calc(10px + env(safe-area-inset-bottom, 0px))' : undefined,
    }}>
      {/* Hidden file inputs */}
      <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = '' }} />
      <input ref={imgInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = '' }} />

      {/* Attachment chip */}
      {attachment && (
        <AttachmentChip
          file={attachment}
          uploading={uploadState === 'uploading'}
          error={uploadError}
          onRemove={clearAttachment}
        />
      )}

      {showCounter && (
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 11,
          color: overWarning ? 'var(--app-amber)' : 'var(--app-text-sec)',
          textAlign: 'right', marginBottom: 4,
          animation: 'msgFadeIn 160ms ease both',
        }}>
          {overWarning ? 'Long messages may be better as a document. ' : ''}{charCount} / 1000
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: compact ? 8 : 10 }}>
        {/* Paperclip + tray */}
        <div ref={trayRef} style={{ position: 'relative', flexShrink: 0 }}>
          {/* Attachment tray */}
          {trayOpen && (
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
              background: compact ? 'rgba(38,20,9,0.97)' : 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(20px) saturate(160%)',
              WebkitBackdropFilter: 'blur(20px) saturate(160%)',
              border: compact ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(122,45,5,0.14)',
              borderRadius: 14, padding: 8,
              boxShadow: compact ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(122,45,5,0.14)',
              display: 'flex', gap: 6,
              animation: 'msgTrayIn 180ms cubic-bezier(.22,1,.36,1) both',
              zIndex: 40,
            }}>
              {[
                { label: 'Document', icon: <FileText size={20} />, color: '#7A2D05', bg: 'rgba(122,45,5,0.07)', onClick: () => { docInputRef.current?.click(); setTrayOpen(false) } },
                { label: 'Photo', icon: <span style={{ fontSize: 20, lineHeight: 1 }}>🖼</span>, color: '#0e7490', bg: 'rgba(14,116,144,0.07)', onClick: () => { imgInputRef.current?.click(); setTrayOpen(false) } },
              ].map(opt => (
                <button
                  key={opt.label}
                  onClick={opt.onClick}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '12px 16px', borderRadius: 10,
                    background: opt.bg, border: 'none', cursor: 'pointer',
                    color: opt.color, minWidth: 72,
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(122,45,5,0.12)')}
                  onMouseLeave={e => (e.currentTarget.style.background = opt.bg)}
                >
                  {opt.icon}
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, color: compact ? '#D4C4B8' : 'var(--app-ink)' }}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setTrayOpen(o => !o)}
            disabled={!!attachment}
            style={{
              width: compact ? 36 : 40, height: compact ? 38 : 44,
              borderRadius: compact ? 8 : 10,
              background: trayOpen ? 'rgba(122,45,5,0.08)' : 'none',
              border: 'none', cursor: attachment ? 'default' : 'pointer',
              color: trayOpen ? 'var(--app-ginger)' : 'var(--app-text-sec)',
              opacity: attachment ? 0.35 : 1,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 150ms, color 150ms, transform 150ms',
              transform: trayOpen ? 'rotate(45deg)' : 'none',
            }}
          >
            <Paperclip size={compact ? 18 : 20} />
          </button>
        </div>

        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={compact ? 'Type a message...' : 'Reply to the OppDate team...'}
          disabled={sendState === 'sending'}
          style={{
            flex: 1, minHeight: compact ? 38 : 44, padding: compact ? '9px 14px' : '11px 16px',
            borderRadius: compact ? 19 : 22,
            background: compact ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.8)',
            border: compact ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(122,45,5,0.2)',
            boxShadow: compact ? 'inset 0 1px 3px rgba(0,0,0,0.2)' : undefined,
            fontFamily: 'var(--font-sans)', fontSize: compact ? 13 : 14,
            color: compact ? '#F0E8E0' : 'var(--app-ink)', outline: 'none', resize: 'none', overflow: 'hidden',
            lineHeight: 1.5,
          }}
        />

        <button
          className="msg-send"
          onClick={handleSend}
          disabled={!canSend}
          style={{
            width: compact ? 38 : 44, height: compact ? 38 : 44, borderRadius: '50%', flexShrink: 0,
            background: sendState === 'sent'
              ? 'var(--app-green, #22c55e)'
              : (compact ? 'linear-gradient(135deg, #B5530A 0%, #7A2D05 100%)' : 'var(--app-ginger)'),
            border: 'none', cursor: !canSend ? 'default' : 'pointer',
            opacity: sendState === 'sending' ? 0.7 : !canSend ? 0.45 : 1,
            color: '#fff', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: compact ? '0 3px 12px rgba(122,45,5,0.3)' : undefined,
            transition: 'background 200ms ease, opacity 140ms ease, transform 120ms ease',
            transform: sendState === 'sending' ? 'scale(0.92)' : 'scale(1)',
          }}
        >
          {sendState === 'sent'
            ? <CheckCheck size={compact ? 15 : 18} />
            : <Send size={compact ? 16 : 19} style={{ transform: sendState === 'sending' ? 'translateX(2px)' : 'none', transition: 'transform 120ms' }} />
          }
        </button>
      </div>
    </div>
  )
}

function ThreadHeader({ thread, messages, onBack, compact }: { thread: Thread; messages: Message[]; onBack?: () => void; compact?: boolean }) {
  const lastTeamMsg = compact ? [...messages].reverse().find(m => m.from === 'team') : null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: compact ? 10 : 12,
      padding: compact ? '10px 14px' : '18px 24px',
      borderBottom: compact ? 'none' : '1px solid var(--app-hairline)',
      background: compact
        ? 'linear-gradient(180deg, rgba(38,20,9,0.96) 0%, rgba(31,17,8,0.92) 100%)'
        : 'rgba(255,255,255,0.5)',
      flexShrink: 0,
      backdropFilter: compact ? 'blur(20px) saturate(150%)' : undefined,
      WebkitBackdropFilter: compact ? 'blur(20px) saturate(150%)' : undefined,
      boxShadow: compact ? '0 1px 8px rgba(122,45,5,0.06)' : undefined,
      position: compact ? 'relative' : undefined,
      zIndex: compact ? 2 : undefined,
    }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            width: 32, height: 32, borderRadius: 10,
            background: compact ? 'rgba(122,45,5,0.06)' : 'none',
            border: 'none', cursor: 'pointer',
            color: 'var(--app-ginger)', padding: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={compact ? 18 : 20} />
        </button>
      )}

      {/* Team avatar in header for mobile */}
      {compact && lastTeamMsg?.name && (
        <span style={{
          position: 'relative',
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700,
          color: '#fff', boxShadow: '0 2px 8px rgba(122,45,5,0.2)',
        }}>
          {getInitials(lastTeamMsg.name)}
          <span style={{
            position: 'absolute', bottom: -1, right: -1,
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--app-green, #22c55e)',
            border: '1.5px solid rgba(255,255,255,0.9)',
          }} />
        </span>
      )}

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: compact ? 1 : 3 }}>
          <ServicePill service={thread.service} compact={compact} />
        </div>
        <div style={{
          fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: compact ? 14.5 : 18,
          color: 'var(--app-ink)', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {thread.title}
        </div>
        {!compact && (
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 12.5,
            color: 'var(--app-text-sec)', marginTop: 1,
          }}>
            {thread.sub}
          </div>
        )}
      </div>
      <StatusChip status={thread.status} compact={compact} />
    </div>
  )
}

function ScrollToBottomFab({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      position: 'absolute', bottom: 80, right: 16, zIndex: 5,
      width: 36, height: 36, borderRadius: '50%',
      background: 'rgba(255,255,255,0.9)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(122,45,5,0.12)',
      boxShadow: '0 3px 12px rgba(122,45,5,0.12)',
      cursor: 'pointer', color: 'var(--app-ginger)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      animation: 'msgIn 200ms var(--ease-out-soft) both',
    }}>
      <ChevronDown size={18} />
    </button>
  )
}

function ThreadContextRibbon({ thread }: { thread: Thread }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(`oppdate_ribbon_${thread.id}_collapsed`) === '1' } catch { return false }
  })
  const [appData, setAppData] = useState<any>(null)

  useEffect(() => {
    if (!thread.referenceId) return
    api.get(`/api/v1/applications/${thread.referenceId}`)
      .then(res => setAppData(res.data?.data))
      .catch(() => {})
  }, [thread.referenceId])

  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    try { localStorage.setItem(`oppdate_ribbon_${thread.id}_collapsed`, next ? '1' : '0') } catch {}
  }

  const deadline = appData?.opportunityDeadline
    ? new Date(appData.opportunityDeadline)
    : null
  const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / 86400000) : null
  const urgentDeadline = daysLeft !== null && daysLeft <= 7

  const statusLabels: Record<string, string> = {
    payment_confirmed: 'Payment Confirmed',
    document_collection: 'Document Collection',
    awaiting_payment: 'Awaiting Payment',
    submitted: 'Submitted',
    under_review: 'Under Review',
    decision_pending: 'Decision Pending',
    accepted: 'Accepted',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  }

  return (
    <div style={{
      borderBottom: '1px solid var(--app-hairline)',
      background: 'rgba(255,255,255,0.6)',
      backdropFilter: 'blur(12px)',
      flexShrink: 0,
      overflow: 'hidden',
      transition: 'max-height 280ms ease-out',
    }}>
      <button
        onClick={toggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 24px', border: 'none', background: 'transparent',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          color: 'rgba(122,45,5,0.5)',
        }}>
          Application context
        </span>
        <span style={{ flex: 1 }} />
        {appData?.status && (
          <span style={{
            fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
            color: 'var(--app-ginger)',
            padding: '2px 8px', borderRadius: 999,
            background: 'rgba(122,45,5,0.07)',
            border: '1px solid rgba(122,45,5,0.14)',
          }}>
            {statusLabels[appData.status] ?? appData.status}
          </span>
        )}
        <ChevronDown size={14} style={{
          color: 'var(--app-text-sec)',
          transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          transition: 'transform 200ms ease',
        }} />
      </button>

      {!collapsed && appData && (
        <div style={{
          padding: '0 24px 12px',
          display: 'flex', flexWrap: 'wrap', gap: 12,
          animation: 'msgFadeIn 200ms ease both',
        }}>
          {appData.opportunityTitle && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--app-text-sec)', marginBottom: 2 }}>Opportunity</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600, color: 'var(--app-ink)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {appData.opportunityTitle}
              </div>
            </div>
          )}
          {deadline && (
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--app-text-sec)', marginBottom: 2 }}>Deadline</div>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600,
                color: urgentDeadline ? '#dc2626' : 'var(--app-ink)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {urgentDeadline && <AlertCircle size={12} />}
                {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {daysLeft !== null && daysLeft > 0 && (
                  <span style={{ fontWeight: 400, color: urgentDeadline ? '#dc2626' : 'var(--app-text-sec)', fontSize: 11 }}>
                    ({daysLeft}d left)
                  </span>
                )}
              </div>
            </div>
          )}
          {appData.complianceCategory && (
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--app-text-sec)', marginBottom: 2 }}>Category</div>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
                padding: '2px 8px', borderRadius: 6,
                background: 'rgba(122,45,5,0.07)', color: 'var(--app-ginger)',
              }}>
                {appData.complianceCategory === 'cat_a' ? 'Category A' : 'Category B'}
              </div>
            </div>
          )}
          {appData.assigneeName && (
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--app-text-sec)', marginBottom: 2 }}>Assigned to</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600, color: 'var(--app-ink)' }}>
                {appData.assigneeName}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ThreadView({
  thread, messages, onBack, compact, onSent, sendEvent, isTyping, hasMore, onLoadMore,
}: {
  thread: Thread
  messages: Message[]
  onBack?: () => void
  compact?: boolean
  onSent: (msg: ApiMessage) => void
  sendEvent: (e: object) => void
  isTyping: boolean
  hasMore: boolean
  onLoadMore: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [newMsgPill, setNewMsgPill] = useState(false)
  const prevMsgCount = useRef(messages.length)
  const isAtBottom = useRef(true)

  // Scroll to bottom on initial thread open
  useEffect(() => {
    const el = scrollRef.current
    if (el) { el.scrollTop = el.scrollHeight; isAtBottom.current = true }
  }, [thread.id])

  // Auto-scroll on new messages only if already at bottom
  useEffect(() => {
    if (messages.length === prevMsgCount.current) return
    const added = messages.length > prevMsgCount.current
    prevMsgCount.current = messages.length
    if (!added) return
    if (isAtBottom.current) {
      const el = scrollRef.current
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    } else {
      setNewMsgPill(true)
      if (navigator.vibrate) navigator.vibrate([6, 4, 6])
    }
  }, [messages.length])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const gap = el.scrollHeight - el.scrollTop - el.clientHeight
      isAtBottom.current = gap < 80
      setShowScrollBtn(gap > 120)
      if (gap < 80) setNewMsgPill(false)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    setNewMsgPill(false)
  }, [])

  const disabled = thread.status === 'resolved'
    ? ('resolved' as const)
    : thread.status === 'closed'
      ? ('closed' as const)
      : (false as const)

  const tint = regionTint(thread.opportunityCountry)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0,
      position: 'relative',
      animation: compact ? undefined : 'msgSlideIn 220ms var(--ease-out-soft) both',
    }}>
      <ThreadHeader thread={thread} messages={messages} onBack={onBack} compact={compact} />
      {!compact && thread.referenceId && <ThreadContextRibbon thread={thread} />}
      <div
        ref={scrollRef}
        style={{
          flex: 1, minHeight: 0, overflowY: 'auto', padding: compact ? 14 : 24,
          background: tint !== 'transparent'
            ? `linear-gradient(180deg, ${tint} 0%, transparent 200px)`
            : undefined,
        }}
      >
        {hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <button
              onClick={onLoadMore}
              style={{
                padding: '6px 16px', borderRadius: 999, border: '1px solid rgba(122,45,5,0.15)',
                background: 'rgba(255,255,255,0.8)', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--app-ginger)',
                fontWeight: 500,
              }}
            >
              Load earlier messages
            </button>
          </div>
        )}
        <ThreadMessages messages={messages} compact={compact} threadId={thread.id} />
        {isTyping && (
          <div style={{ marginTop: 8 }}>
            <TypingIndicator />
          </div>
        )}
      </div>
      {showScrollBtn && (
        <div style={{ position: 'absolute', bottom: compact ? 80 : 88, right: 16, zIndex: 5 }}>
          {newMsgPill ? (
            <button onClick={scrollToBottom} style={{
              padding: '6px 14px', borderRadius: 999,
              background: 'var(--app-ginger)', color: '#fff', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
              boxShadow: '0 3px 12px rgba(122,45,5,0.28)',
              display: 'flex', alignItems: 'center', gap: 6,
              animation: 'msgIn 200ms var(--ease-out-soft) both',
            }}>
              New message <ChevronDown size={14} />
            </button>
          ) : (
            <ScrollToBottomFab onClick={scrollToBottom} />
          )}
        </div>
      )}
      <MessageInput disabled={disabled} compact={compact} threadId={thread.id} onSent={onSent} sendEvent={sendEvent} />
    </div>
  )
}

function ThreadRow({
  thread, selected, onClick, index,
}: {
  thread: Thread; selected: boolean; onClick: () => void; index: number
}) {
  const unread = thread.unread > 0
  const awaiting = thread.status === 'awaiting'

  return (
    <button onClick={onClick} className="msg-threadrow" style={{
      display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
      position: 'relative', padding: '14px 16px', borderRadius: 14, border: 'none',
      marginBottom: 4, background: selected ? 'rgba(122,45,5,0.09)' : 'transparent',
      animation: `msgRowIn 360ms var(--ease-out-soft) ${index * 50}ms both`,
    }}>
      {awaiting && (
        <span style={{
          position: 'absolute', left: 0, top: 8, bottom: 8, width: 3,
          borderRadius: 999, background: 'var(--app-amber)',
          animation: 'msgAccentIn 300ms var(--ease-out-soft) both',
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <ServicePill service={thread.service} />
        <span style={{ flex: 1 }} />
        <StatusChip status={thread.status} small />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {unread && (
          <span className="msg-dot-pulse" style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--app-ginger)', flexShrink: 0,
          }} />
        )}
        <span style={{
          fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 15.5,
          color: 'var(--app-ink)', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
          flex: 1, minWidth: 0,
        }}>
          {thread.title}
        </span>
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: 11.5,
          color: 'var(--app-text-sec)', flexShrink: 0,
        }}>
          {thread.lastTime}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: 14,
          color: unread ? 'var(--app-ink-body)' : 'var(--app-text-sec)',
          fontWeight: unread ? 500 : 400, lineHeight: 1.45,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
          minWidth: 0,
        }}>
          {thread.lastPreview}
        </span>
        {thread.unread > 1 && (
          <span style={{
            flexShrink: 0, minWidth: 18, height: 18, padding: '0 5px',
            borderRadius: 999, background: 'var(--app-ginger)', color: '#fff',
            fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            animation: 'msgBadge 400ms var(--ease-out-soft) both',
          }}>
            {thread.unread}
          </span>
        )}
      </div>
    </button>
  )
}

/* -------------------------------------------------- */
/*  Mobile thread row - swipeable card layout         */
/* -------------------------------------------------- */
function MobileThreadRow({
  thread, onClick, index, onMarkRead,
}: {
  thread: Thread; onClick: () => void; index: number; onMarkRead?: () => void
}) {
  const unread = thread.unread > 0
  const awaiting = thread.status === 'awaiting'
  const lastTeamMsg = [...thread.messages].reverse().find(m => m.from === 'team')
  const initials = lastTeamMsg?.name ? getInitials(lastTeamMsg.name) : 'OD'

  const startX = useRef(0)
  const startY = useRef(0)
  const dx = useRef(0)
  const [swipeX, setSwipeX] = useState(0)
  const [swipeDir, setSwipeDir] = useState<'read' | 'mute' | null>(null)
  const [snapped, setSnapped] = useState(false)
  const THRESHOLD = 68

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX
    startY.current = e.clientY
    dx.current = 0
    setSnapped(false)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.buttons === 0) return
    const deltaX = e.clientX - startX.current
    const deltaY = e.clientY - startY.current
    // Ignore if primarily vertical scroll
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaX) < 8) return
    dx.current = deltaX
    const clamped = Math.max(-THRESHOLD * 1.4, Math.min(THRESHOLD * 1.4, deltaX))
    setSwipeX(clamped)
    setSwipeDir(clamped > 8 ? 'read' : clamped < -8 ? 'mute' : null)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (Math.abs(dx.current) > THRESHOLD) {
      if (dx.current > 0 && onMarkRead) {
        setSnapped(true)
        onMarkRead()
        setTimeout(() => { setSwipeX(0); setSwipeDir(null); setSnapped(false) }, 400)
        return
      }
      if (dx.current < 0) {
        // Mute — just snap back, no real action yet
        setSnapped(true)
        setTimeout(() => { setSwipeX(0); setSwipeDir(null); setSnapped(false) }, 400)
        return
      }
    }
    setSwipeX(0)
    setSwipeDir(null)
    if (Math.abs(dx.current) < 6) onClick()
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 14,
      animation: `msgRowIn 360ms var(--ease-out-soft) ${index * 60}ms both` }}>
      {/* Swipe action reveal layers */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 14,
        background: swipeDir === 'read' ? 'rgba(34,197,94,0.18)' : swipeDir === 'mute' ? 'rgba(245,158,11,0.18)' : 'transparent',
        display: 'flex', alignItems: 'center',
        justifyContent: swipeDir === 'read' ? 'flex-start' : 'flex-end',
        padding: '0 16px', pointerEvents: 'none',
        transition: 'background 120ms',
      }}>
        {swipeDir === 'read' && (
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, color: '#16a34a', opacity: Math.min(1, Math.abs(swipeX) / THRESHOLD) }}>
            Mark read
          </span>
        )}
        {swipeDir === 'mute' && (
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, color: '#d97706', opacity: Math.min(1, Math.abs(swipeX) / THRESHOLD) }}>
            Mute
          </span>
        )}
      </div>

      {/* Card */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          display: 'flex', alignItems: 'stretch', width: '100%', textAlign: 'left',
          position: 'relative', borderRadius: 14,
          background: unread ? 'rgba(181,83,10,0.04)' : 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(16px) saturate(130%)',
          WebkitBackdropFilter: 'blur(16px) saturate(130%)',
          boxShadow: '0 2px 8px rgba(122,45,5,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
          overflow: 'hidden',
          transform: `translateX(${swipeX}px)`,
          transition: snapped ? 'transform 300ms cubic-bezier(0.32,0.72,0,1)' : 'transform 0ms',
          touchAction: 'pan-y',
          userSelect: 'none',
        }}
      >
        {/* Accent bar for awaiting */}
        {awaiting && (
          <span style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
            background: 'var(--app-amber)',
          }} />
        )}

        {/* Avatar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 56, flexShrink: 0, paddingLeft: awaiting ? 6 : 0,
        }}>
          <span style={{
            width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
            background: unread ? 'var(--app-ginger)' : 'rgba(122,45,5,0.08)',
            color: unread ? '#fff' : 'var(--app-ginger)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700,
            letterSpacing: '0.02em',
          }}>
            {initials}
          </span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, padding: '12px 0' }}>
          {/* Top row: service + status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <ServicePill service={thread.service} compact />
            <span style={{ flex: 1 }} />
            <StatusChip status={thread.status} compact />
          </div>

          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {unread && (
              <span className="msg-dot-pulse" style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--app-ginger)', flexShrink: 0,
              }} />
            )}
            <span style={{
              fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 14,
              color: 'var(--app-ink)', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0,
            }}>
              {thread.title}
            </span>
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: 10.5,
              color: 'var(--app-text-sec)', flexShrink: 0,
            }}>
              {thread.lastTime}
            </span>
          </div>

          {/* Preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: 12,
              color: unread ? 'var(--app-ink-body)' : 'var(--app-text-sec)',
              fontWeight: unread ? 500 : 400, lineHeight: 1.4,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
            }}>
              {thread.lastPreview}
            </span>
            {thread.unread > 0 && (
              <span style={{
                flexShrink: 0, minWidth: 18, height: 18, padding: '0 5px',
                borderRadius: 999, background: 'var(--app-ginger)', color: '#fff',
                fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                animation: 'msgBadge 400ms var(--ease-out-soft) both',
              }}>
                {thread.unread}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 28, flexShrink: 0, color: 'var(--app-helper)', opacity: 0.5,
        }}>
          <ChevronRight size={16} />
        </div>
      </div>
    </div>
  )
}

// Monogram avatar used in bubble illustrations
function OppDateAvatar({ size = 36, border = '2.5px solid #fff' }: { size?: number; border?: string }) {
  const imgSize = Math.round(size * 0.55)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 3px 10px rgba(122,45,5,0.32)',
      border, overflow: 'hidden',
    }}>
      <Image
        src="/assets/oppdate-monogram.png"
        alt="OppDate"
        width={imgSize}
        height={imgSize}
        style={{ filter: 'brightness(0) invert(1)', display: 'block' }}
      />
    </div>
  )
}

// Empty state for the thread list panel (zero threads)
function NoThreadsEmpty({ onExplore }: { onExplore?: () => void }) {
  const [btnHover, setBtnHover] = useState(false)
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '20px 14px 24px', textAlign: 'center',
      animation: 'msgFadeIn 420ms ease both',
    }}>
      {/* Glass card wrapper */}
      <div style={{
        width: '100%', borderRadius: 20,
        background: 'rgba(255,255,255,0.78)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.85)',
        boxShadow: '0 6px 32px rgba(122,45,5,0.1), inset 0 1px 0 rgba(255,255,255,1)',
        overflow: 'hidden',
      }}>

        {/* Header band */}
        <div style={{
          padding: '26px 22px 20px',
          background: 'linear-gradient(150deg, rgba(212,132,58,0.14) 0%, rgba(181,83,10,0.05) 70%, transparent 100%)',
          borderBottom: '1px solid rgba(181,83,10,0.07)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          {/* Bubble illustration */}
          <div style={{ position: 'relative', width: 110, height: 92, marginBottom: 18 }}>
            {/* User bubble — top right */}
            <div style={{
              position: 'absolute', right: 0, top: 0, width: 64, height: 36,
              borderRadius: '11px 11px 3px 11px',
              background: 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)',
              boxShadow: '0 4px 14px rgba(122,45,5,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600,
              color: 'rgba(255,255,255,0.92)', letterSpacing: '0.01em',
            }}>
              Hi there!
            </div>
            {/* Team bubble — starts at left:0, avatar clips to its bottom-left corner */}
            <div style={{
              position: 'absolute', left: 0, bottom: 18, width: 78, height: 42,
              borderRadius: '13px 13px 13px 3px',
              background: 'rgba(255,255,255,0.95)',
              border: '1px solid rgba(181,83,10,0.12)',
              boxShadow: '0 3px 12px rgba(122,45,5,0.09)',
              display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 14,
            }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'rgba(181,83,10,0.4)',
                  animation: `msgTypingDot 1.8s ease-in-out ${i * 200}ms infinite`,
                }} />
              ))}
            </div>
            {/* Avatar clipped to bottom-left of team bubble */}
            <div style={{ position: 'absolute', left: -6, bottom: 0 }}>
              <OppDateAvatar size={36} border="2.5px solid #fff" />
            </div>
          </div>

          <div style={{
            fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 17,
            color: 'var(--app-ink)', letterSpacing: '-0.02em', marginBottom: 5,
          }}>
            No messages yet
          </div>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--app-text-sec)',
            lineHeight: 1.6, maxWidth: 210,
          }}>
            Your direct line to the OppDate team opens once your application is paid.
          </div>
        </div>

        {/* How it works */}
        <div style={{ padding: '18px 20px 20px' }}>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'rgba(122,45,5,0.38)', marginBottom: 14, textAlign: 'left',
          }}>
            How it works
          </div>

          {/* Steps as horizontal chips instead of vertical list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { n: 1, text: 'Apply to an opportunity', sub: 'Browse & start your application' },
              { n: 2, text: 'Complete payment', sub: 'Unlocks your team thread' },
              { n: 3, text: 'Chat with your team', sub: 'Real humans, real help' },
            ].map(({ n, text, sub }, idx) => (
              <div key={n} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 12,
                background: idx === 0
                  ? 'linear-gradient(135deg, rgba(212,132,58,0.1) 0%, rgba(181,83,10,0.06) 100%)'
                  : 'rgba(181,83,10,0.04)',
                border: `1px solid ${idx === 0 ? 'rgba(181,83,10,0.14)' : 'rgba(181,83,10,0.07)'}`,
                animation: `msgFadeIn 380ms ease ${80 + idx * 80}ms both`,
              }}>
                {/* Step badge - solid fill, no connector lines */}
                <div style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: idx === 0
                    ? 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)'
                    : 'rgba(122,45,5,0.1)',
                  boxShadow: idx === 0 ? '0 2px 8px rgba(122,45,5,0.22)' : 'none',
                  fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700,
                  color: idx === 0 ? '#fff' : 'rgba(122,45,5,0.5)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>{n}</div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{
                    fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600,
                    color: idx === 0 ? 'var(--app-ink)' : 'var(--app-ink-body)',
                    lineHeight: 1.2,
                  }}>{text}</div>
                  <div style={{
                    fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--app-text-sec)',
                    marginTop: 2,
                  }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: '0 20px 20px' }}>
          <button
            onClick={onExplore}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            style={{
              width: '100%', height: 42, borderRadius: 13,
              background: btnHover
                ? 'linear-gradient(135deg, #C07630 0%, #6A2504 100%)'
                : 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)',
              border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
              color: '#fff', letterSpacing: '0.01em',
              boxShadow: btnHover
                ? '0 6px 20px rgba(122,45,5,0.36)'
                : '0 3px 12px rgba(122,45,5,0.26)',
              transform: btnHover ? 'translateY(-1px)' : 'translateY(0)',
              transition: 'all 160ms ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            Browse opportunities
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// Right panel: user has threads but none selected yet
function SelectPlaceholder() {
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40,
      animation: 'msgFadeIn 420ms ease both',
    }}>
      {/* Floating glass card */}
      <div style={{
        maxWidth: 320, width: '100%', borderRadius: 24,
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(32px) saturate(170%)',
        WebkitBackdropFilter: 'blur(32px) saturate(170%)',
        border: '1px solid rgba(255,255,255,0.8)',
        boxShadow: '0 10px 48px rgba(122,45,5,0.12), inset 0 1px 0 rgba(255,255,255,1)',
        padding: '36px 28px 30px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* Illustration */}
        <div style={{ position: 'relative', width: 140, height: 104, marginBottom: 24, flexShrink: 0 }}>
          {/* User bubble — top right */}
          <div style={{
            position: 'absolute', right: 0, top: 0, width: 80, height: 48,
            borderRadius: '16px 16px 4px 16px',
            background: 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)',
            boxShadow: '0 5px 18px rgba(122,45,5,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
            color: 'rgba(255,255,255,0.92)',
            animation: 'msgEmptyBubble 3.2s ease-in-out infinite',
          }}>
            Hello!
          </div>
          {/* Team bubble — starts at left:0, avatar clips onto its bottom-left */}
          <div style={{
            position: 'absolute', left: 0, bottom: 20, width: 96, height: 52,
            borderRadius: '16px 16px 16px 4px',
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid rgba(181,83,10,0.13)',
            boxShadow: '0 4px 18px rgba(122,45,5,0.1)',
            display: 'flex', alignItems: 'center', gap: 7, paddingLeft: 16,
          }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'rgba(181,83,10,0.38)',
                animation: `msgTypingDot 1.8s ease-in-out ${i * 200}ms infinite`,
              }} />
            ))}
          </div>
          {/* Avatar clipped to bottom-left corner of team bubble */}
          <div style={{ position: 'absolute', left: -8, bottom: 0 }}>
            <OppDateAvatar size={44} border="3px solid #fff" />
          </div>
        </div>

        <div style={{
          fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 21,
          color: 'var(--app-ink)', letterSpacing: '-0.02em', marginBottom: 8,
        }}>
          Pick up where you left off
        </div>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 13.5, lineHeight: 1.6,
          color: 'var(--app-text-sec)', maxWidth: 230,
        }}>
          Select a thread on the left to read and reply to your OppDate team.
        </div>

        {/* Left-pointing arrow hint */}
        <div style={{
          marginTop: 22, display: 'flex', alignItems: 'center', gap: 7,
          fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 500,
          color: 'rgba(122,45,5,0.4)',
          animation: 'msgEmptyArrow 2s ease-in-out infinite',
        }}>
          {/* Arrow pointing LEFT */}
          <svg width="28" height="12" viewBox="0 0 28 12" fill="none">
            <path d="M28 6H4M9.5 1L4 6l5.5 5" stroke="rgba(122,45,5,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          threads are over there
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------- */
/*  Mobile thread view portal                         */
/* -------------------------------------------------- */
/* -------------------------------------------------- */
/*  Mobile thread view portal                         */
/* -------------------------------------------------- */
function MobileThreadPortalV2({
  thread, messages, onBack, onSent, sendEvent, isTyping, hasMore, onLoadMore,
}: {
  thread: Thread; messages: Message[]; onBack: () => void; onSent: (msg: ApiMessage) => void
  sendEvent: (e: object) => void; isTyping: boolean; hasMore: boolean; onLoadMore: () => void
}) {
  const [entered, setEntered] = useState(false)
  const [vpOffset, setVpOffset] = useState(0)

  useEffect(() => {
    requestAnimationFrame(() => setEntered(true))
  }, [])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop
      setVpOffset(Math.max(0, offset))
    }
    vv.addEventListener('resize', onResize)
    vv.addEventListener('scroll', onResize)
    return () => {
      vv.removeEventListener('resize', onResize)
      vv.removeEventListener('scroll', onResize)
    }
  }, [])

  return (
    <div className="msg-portal-dark" style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      bottom: vpOffset ? vpOffset : 0,
      zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      backgroundColor: '#1A0F08',
      transform: entered ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
    }}>
      <ThreadView
        thread={thread} messages={messages} onBack={onBack} compact onSent={onSent}
        sendEvent={sendEvent} isTyping={isTyping} hasMore={hasMore} onLoadMore={onLoadMore}
      />
    </div>
  )
}

// -- Main component --

type FilterTab = 'all' | 'unread'

function MessagesSkeleton({ mob }: { mob: boolean }) {
  return (
    <div className="skel-wrap" style={{
      display: 'flex', height: 'calc(100vh - var(--app-topbar-h))', overflow: 'hidden',
    }}>
      <div style={{
        width: mob ? '100%' : '36%', maxWidth: mob ? undefined : 380, minWidth: mob ? undefined : 300,
        display: 'flex', flexDirection: 'column', padding: '22px 20px',
        borderRight: mob ? 'none' : '1px solid var(--app-hairline)',
      }}>
        <div className="skel skel-line w40" style={{ height: 22, marginBottom: 6 }} />
        <div className="skel skel-line w25" style={{ height: 12, marginBottom: 18 }} />
        <div className="skel" style={{ height: 38, borderRadius: 10, width: '100%', marginBottom: 14 }} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <div className="skel skel-pill" style={{ width: 50 }} />
          <div className="skel skel-pill" style={{ width: 65 }} />
        </div>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--app-hairline)' }}>
            <div className="skel skel-circle" style={{ width: 40, height: 40 }} />
            <div style={{ flex: 1 }}>
              <div className="skel skel-line w60" style={{ height: 13, marginBottom: 6 }} />
              <div className="skel skel-line w80" style={{ height: 11 }} />
            </div>
          </div>
        ))}
      </div>
      {!mob && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="skel skel-line w30" style={{ height: 14 }} />
        </div>
      )}
    </div>
  )
}

export function MessagesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<number | null>(null)
  const [mobileThread, setMobileThread] = useState(false)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [threadMessages, setThreadMessages] = useState<Record<string, ApiMessage[]>>({})
  const [typingByThread, setTypingByThread] = useState<Record<string, boolean>>({})
  const [hasMoreByThread, setHasMoreByThread] = useState<Record<string, boolean>>({})
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const mob = useIsMobile()

  const { data: apiThreads = [], isLoading: loading } = useQuery({
    queryKey: keys.threads,
    queryFn: fetchers.threads,
    staleTime: 5 * 1000,
  })

  const { sendEvent } = useWebSocket(useCallback((msg) => {
    if (msg.type === 'new_message' && msg.threadId) {
      setThreadMessages(prev => {
        const existing = prev[msg.threadId!]
        if (!existing) return prev
        const newMsg = msg.message as ApiMessage
        if (existing.some(m => m.id === newMsg.id)) return prev
        return { ...prev, [msg.threadId!]: [...existing, newMsg] }
      })
      queryClient.invalidateQueries({ queryKey: keys.threads })
    }

    if (msg.type === 'typing_start' && msg.threadId) {
      const tid = msg.threadId as string
      setTypingByThread(prev => ({ ...prev, [tid]: true }))
      // Client-side safety: auto-clear after 4s if typing_stop never arrives
      if (typingTimers.current[tid]) clearTimeout(typingTimers.current[tid])
      typingTimers.current[tid] = setTimeout(() => {
        setTypingByThread(prev => ({ ...prev, [tid]: false }))
      }, 4000)
    }

    if (msg.type === 'typing_stop' && msg.threadId) {
      const tid = msg.threadId as string
      if (typingTimers.current[tid]) clearTimeout(typingTimers.current[tid])
      setTypingByThread(prev => ({ ...prev, [tid]: false }))
    }

    if (msg.type === 'document_uploaded' && msg.threadId) {
      // Invalidate doc request queries so DocumentRequestCard re-fetches
      queryClient.invalidateQueries({ queryKey: ['doc-requests', msg.threadId] })
    }
  }, [queryClient]))

  const appendMessage = useCallback((threadId: string, msg: ApiMessage) => {
    setThreadMessages(prev => {
      const existing = prev[threadId] ?? []
      if (existing.some(m => m.id === msg.id)) return prev
      return { ...prev, [threadId]: [...existing, msg] }
    })
  }, [])

  const loadThreadMessages = useCallback((threadId: string) => {
    if (threadMessages[threadId]) {
      sendEvent({ type: 'mark_read', threadId })
      return
    }
    api.get(`/api/v1/messages/threads/${threadId}?limit=50`).then(res => {
      const msgs: ApiMessage[] = res.data?.data?.messages || []
      const hasMore: boolean = res.data?.data?.hasMore ?? false
      setThreadMessages(prev => ({ ...prev, [threadId]: msgs }))
      setHasMoreByThread(prev => ({ ...prev, [threadId]: hasMore }))
      sendEvent({ type: 'mark_read', threadId })
    }).catch(() => {})
  }, [threadMessages, sendEvent])

  const handleLoadMore = useCallback((threadId: string) => {
    const msgs = threadMessages[threadId]
    if (!msgs || msgs.length === 0) return
    const firstId = msgs[0].id
    api.get(`/api/v1/messages/threads/${threadId}?before=${firstId}&limit=50`).then(res => {
      const older: ApiMessage[] = res.data?.data?.messages || []
      const hasMore: boolean = res.data?.data?.hasMore ?? false
      setThreadMessages(prev => {
        const existing = prev[threadId] ?? []
        // Deduplicate and prepend
        const existingIds = new Set(existing.map(m => m.id))
        const fresh = older.filter(m => !existingIds.has(m.id))
        return { ...prev, [threadId]: [...fresh, ...existing] }
      })
      setHasMoreByThread(prev => ({ ...prev, [threadId]: hasMore }))
    }).catch(() => {})
  }, [threadMessages])

  const filtered = apiThreads.map(apiThreadToUiThread).filter(t => {
    if (filter === 'unread' && t.unread === 0) return false
    if (search) {
      const q = search.toLowerCase()
      return t.title.toLowerCase().includes(q) || t.service.toLowerCase().includes(q)
    }
    return true
  })

  const activeThread = selected !== null ? filtered[selected] ?? null : null
  const unreadCount = apiThreads.filter(t => t.unreadByUser > 0).length
  const totalCount = apiThreads.length

  const getUiMessages = (thread: Thread): Message[] => {
    const raw = threadMessages[thread.id] || []
    return raw.map(m => {
      const st = m.senderType ?? m.sender_type ?? 'team'
      const ts = m.createdAt ?? m.created_at ?? new Date().toISOString()
      const from = (st === 'system' ? 'team' : st) as MessageFrom
      return {
        from,
        name: st === 'system' ? 'OppDate' : undefined,
        text: m.content,
        day: new Date(ts).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }),
        time: new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      }
    })
  }

  const handleMobileSelect = useCallback((i: number) => {
    setSelected(i)
    setMobileThread(true)
  }, [])

  const handleMobileBack = useCallback(() => {
    setMobileThread(false)
  }, [])

  if (loading) return <MessagesSkeleton mob={mob} />

  if (mob) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        minHeight: 'calc(100vh - var(--app-topbar-h))',
        padding: '0 0 24px',
        backgroundImage: "url('/assets/bg-artwork.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}>
        {/* Mobile header */}
        <div style={{ padding: '18px 16px 0', flexShrink: 0 }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 22,
            color: 'var(--app-ink)', margin: 0, letterSpacing: '-0.02em',
          }}>
            Messages
          </h1>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 12,
            color: 'var(--app-text-sec)', margin: '3px 0 0',
          }}>
            Direct line to your OppDate team
          </p>

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginTop: 14, padding: '0 10px', height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid var(--app-hairline)',
          }}>
            <Search size={14} style={{ color: 'var(--app-text-ter)', flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              style={{
                flex: 1, border: 'none', background: 'transparent', outline: 'none',
                fontFamily: 'var(--font-sans)', fontSize: 13,
                color: 'var(--app-ink)',
              }}
            />
          </div>

          {/* Filter tabs with counts */}
          <div style={{ display: 'flex', gap: 6, marginTop: 12, marginBottom: 12 }}>
            {([
              { id: 'all' as const, label: 'All', count: totalCount },
              { id: 'unread' as const, label: 'Unread', count: unreadCount },
            ]).map(tab => {
              const active = filter === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => { setFilter(tab.id); setSelected(null) }}
                  style={{
                    height: 28, padding: '0 12px', borderRadius: 999,
                    fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: active ? 600 : 500,
                    background: active ? 'rgba(122,45,5,0.08)' : 'transparent',
                    border: active ? '1px solid rgba(122,45,5,0.2)' : '1px solid transparent',
                    color: active ? 'var(--app-ginger)' : 'var(--app-text-sec)',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span style={{
                      minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999,
                      background: active ? 'rgba(122,45,5,0.12)' : 'rgba(122,45,5,0.06)',
                      fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700,
                      color: active ? 'var(--app-ginger)' : 'var(--app-text-sec)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Thread list */}
        <div style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 ? (
            filter === 'unread'
              ? (
                <div style={{
                  padding: '40px 16px', textAlign: 'center',
                  fontFamily: 'var(--font-sans)', fontSize: 13,
                  color: 'var(--app-text-sec)',
                }}>
                  No unread conversations.
                </div>
              )
              : <NoThreadsEmpty onExplore={() => router.push('/opportunities')} />
          ) : (
            filtered.map((t, i) => (
              <MobileThreadRow
                key={t.id}
                thread={t}
                onClick={() => { handleMobileSelect(i); loadThreadMessages(t.id) }}
                index={i}
                onMarkRead={() => {
                  api.patch(`/api/v1/messages/threads/${t.id}/read`).catch(() => {})
                  queryClient.invalidateQueries({ queryKey: keys.threads })
                }}
              />
            ))
          )}
        </div>

        {/* Mobile thread portal */}
        {mobileThread && activeThread && (
          <MobileThreadPortalV2
            thread={activeThread}
            messages={getUiMessages(activeThread)}
            onBack={handleMobileBack}
            onSent={(msg) => appendMessage(activeThread.id, msg)}
            sendEvent={sendEvent}
            isTyping={typingByThread[activeThread.id] ?? false}
            hasMore={hasMoreByThread[activeThread.id] ?? false}
            onLoadMore={() => handleLoadMore(activeThread.id)}
          />
        )}
      </div>
    )
  }

  // Desktop layout
  return (
    <div className="r-msg-split" style={{
      display: 'flex', height: 'calc(100vh - var(--app-topbar-h))',
      minHeight: 0, overflow: 'hidden',
    }}>
      {/* Thread list panel */}
      <div style={{
        width: '36%', maxWidth: 380, minWidth: 300, height: '100%',
        display: 'flex', flexDirection: 'column',
        background: 'rgba(255,255,255,0.4)',
        borderRight: '1px solid var(--app-hairline)',
        flexShrink: 0,
      }}>
        <div style={{ padding: '22px 20px 0', flexShrink: 0 }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 24,
            color: 'var(--app-ink)', margin: 0, letterSpacing: '-0.02em',
          }}>
            Messages
          </h1>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 13,
            color: 'var(--app-text-sec)', margin: '4px 0 0',
          }}>
            Direct line to your OppDate team
          </p>

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginTop: 16, padding: '0 12px', height: 38, borderRadius: 10,
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid var(--app-hairline)',
          }}>
            <Search size={16} style={{ color: 'var(--app-text-ter)', flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              style={{
                flex: 1, border: 'none', background: 'transparent', outline: 'none',
                fontFamily: 'var(--font-sans)', fontSize: 13,
                color: 'var(--app-ink)',
              }}
            />
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 6, marginTop: 14, marginBottom: 12 }}>
            {(['all', 'unread'] as const).map(tab => {
              const active = filter === tab
              return (
                <button
                  key={tab}
                  onClick={() => { setFilter(tab); setSelected(null) }}
                  style={{
                    height: 30, padding: '0 14px', borderRadius: 999,
                    fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: active ? 600 : 500,
                    background: active ? 'rgba(122,45,5,0.08)' : 'transparent',
                    border: active ? '1px solid rgba(122,45,5,0.2)' : '1px solid transparent',
                    color: active ? 'var(--app-ginger)' : 'var(--app-text-sec)',
                    cursor: 'pointer', transition: 'all 140ms',
                    textTransform: 'capitalize',
                  }}
                >
                  {tab}
                </button>
              )
            })}
          </div>
        </div>

        {/* Thread list */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 10px 16px' }}>
          {filtered.length === 0 ? (
            filter === 'unread'
              ? (
                <div style={{
                  padding: '40px 16px', textAlign: 'center',
                  fontFamily: 'var(--font-sans)', fontSize: 13.5,
                  color: 'var(--app-text-sec)',
                }}>
                  No unread conversations.
                </div>
              )
              : <NoThreadsEmpty onExplore={() => router.push('/opportunities')} />
          ) : (
            filtered.map((t, i) => (
              <ThreadRow
                key={t.id}
                thread={t}
                selected={selected === i}
                onClick={() => { setSelected(i); loadThreadMessages(t.id) }}
                index={i}
              />
            ))
          )}
        </div>
      </div>

      {/* Thread view panel */}
      <div style={{ flex: 1, minWidth: 0, height: '100%' }}>
        {activeThread
          ? <ThreadView
              thread={activeThread}
              messages={getUiMessages(activeThread)}
              onSent={(msg) => appendMessage(activeThread.id, msg)}
              sendEvent={sendEvent}
              isTyping={typingByThread[activeThread.id] ?? false}
              hasMore={hasMoreByThread[activeThread.id] ?? false}
              onLoadMore={() => handleLoadMore(activeThread.id)}
            />
          : <SelectPlaceholder />
        }
      </div>
    </div>
  )
}
