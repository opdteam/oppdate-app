'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import {
  Search,
  Lock,
  Paperclip,
  Send,
  MoreHorizontal,
  ArrowLeft,
  Inbox,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  FileText,
  Plus,
  Trash2,
  X,
  Check,
  ArrowRight,
} from 'lucide-react'
import '@/app/admin-messages.css'

// ---- Types ----

type ApiThread = {
  id: string
  type: 'oppdate_apply' | 'mentorship'
  status: string
  unreadByTeam: number
  lastMessageAt: string | null
  assignedTo: string | null
  userId: string
  userName: string | null
  userEmail: string | null
  userAvatarUrl: string | null
  createdAt: string
  preview: string | null
  avgResponseTimeMs: number | null
  opportunityTitle: string | null
  referenceId: string | null
}

type ApiMessage = {
  id: string
  threadId: string
  senderId: string
  senderType: 'user' | 'team' | 'system'
  content: string
  isInternal: boolean
  createdAt: string
}

type Thread = {
  id: string
  name: string
  initials: string
  avatarUrl: string | null
  opp: string | null
  service: 'apply' | 'mentor'
  unread: number
  closed: boolean
  assignee: string | null
  time: string
  preview: string
  avgResponse: number | null
  shimmer: boolean
  referenceId: string | null
}

type FilterKey = 'all' | 'unread' | 'apply' | 'mentor' | 'closed'
type SendState = 'idle' | 'sending' | 'sent'

// ---- Utilities ----

function formatRelTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatRespTime(ms: number): string {
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ${mins % 60}m`
  return `${Math.floor(hrs / 24)}d`
}

function isToday(iso: string) {
  const d = new Date(iso), n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}
function isYesterday(iso: string) {
  const d = new Date(iso), n = new Date()
  n.setDate(n.getDate() - 1)
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}
function dateLabel(iso: string): string {
  if (isToday(iso)) return 'Today'
  if (isYesterday(iso)) return 'Yesterday'
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function initials(name: string) {
  return name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
}

function humanizePreview(raw: string | null | undefined): string {
  if (!raw) return '...'
  if (raw.startsWith('{"type":"document_request"')) return 'Requested documents from applicant'
  if (raw.includes('{"type":"attachment"')) return 'Sent an attachment'
  return raw
}

function toThread(t: ApiThread, shimmer = false): Thread {
  const name = t.userName || t.userEmail || 'Unknown'
  return {
    id: t.id,
    name,
    initials: initials(name),
    avatarUrl: t.userAvatarUrl ?? null,
    opp: t.opportunityTitle || (t.type === 'mentorship' ? 'Mentorship Programme' : null),
    service: t.type === 'mentorship' ? 'mentor' : 'apply',
    unread: t.unreadByTeam,
    closed: t.status === 'closed' || t.status === 'resolved',
    assignee: t.assignedTo,
    time: formatRelTime(t.lastMessageAt ?? t.createdAt),
    preview: humanizePreview(t.preview),
    avgResponse: t.avgResponseTimeMs ?? null,
    shimmer,
    referenceId: t.referenceId ?? null,
  }
}

type MsgGroup = { date: string; messages: ApiMessage[] }

function groupMessages(msgs: ApiMessage[]): MsgGroup[] {
  const map: Record<string, ApiMessage[]> = {}
  const order: string[] = []
  for (const m of msgs) {
    const label = dateLabel(m.createdAt)
    if (!map[label]) { map[label] = []; order.push(label) }
    map[label].push(m)
  }
  return order.map(d => ({ date: d, messages: map[d] }))
}

function filterList(list: Thread[], f: FilterKey): Thread[] {
  if (f === 'unread') return list.filter(t => t.unread > 0)
  if (f === 'apply')  return list.filter(t => t.service === 'apply')
  if (f === 'mentor') return list.filter(t => t.service === 'mentor')
  if (f === 'closed') return list.filter(t => t.closed)
  return list
}
function countFor(list: Thread[], f: FilterKey): number {
  return filterList(list, f).length
}
function searchList(list: Thread[], q: string): Thread[] {
  if (!q.trim()) return list
  const lc = q.toLowerCase()
  return list.filter(t =>
    t.name.toLowerCase().includes(lc) ||
    (t.opp ?? '').toLowerCase().includes(lc)
  )
}

function useIsMobile(bp = 760) {
  const [m, setM] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(`(max-width: ${bp}px)`)
    setM(mq.matches)
    const h = (e: MediaQueryListEvent) => setM(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [bp])
  return m
}

// ---- Skeleton ----

function Skeleton() {
  return (
    <div className="amsg-skel-wrap" style={{ '--am-border': 'rgba(181,83,10,0.18)' } as React.CSSProperties}>
      <div className="amsg-skel-list">
        <div className="amsg-skel amsg-skel-line" style={{ width: '40%', height: 18, marginBottom: 14 }} />
        <div className="amsg-skel" style={{ height: 34, borderRadius: 8, marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[48, 60, 80, 68, 54].map((w, i) => (
            <div key={i} className="amsg-skel" style={{ width: w, height: 26, borderRadius: 13 }} />
          ))}
        </div>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="amsg-skel-row">
            <div className="amsg-skel amsg-skel-circle" />
            <div className="amsg-skel-lines">
              <div className="amsg-skel amsg-skel-line" style={{ width: '60%' }} />
              <div className="amsg-skel amsg-skel-line" style={{ width: '40%' }} />
            </div>
          </div>
        ))}
      </div>
      <div className="amsg-skel-main">
        <div className="amsg-skel amsg-skel-line" style={{ width: 140, height: 14 }} />
      </div>
    </div>
  )
}

// ---- UserAvatar ----

function UserAvatar({ avatarUrl, initials: ini, size = 34, className }: {
  avatarUrl: string | null; initials: string; size?: number; className?: string
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={ini}
        className={className}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0,
          border: '1px solid var(--am-border-hi)',
        }}
        onError={e => {
          // Fall back to initials on broken image
          const el = e.currentTarget
          el.style.display = 'none'
          const sib = el.nextElementSibling as HTMLElement | null
          if (sib) sib.style.display = 'flex'
        }}
      />
    )
  }
  return (
    <span
      className={className}
      style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    >
      {ini}
    </span>
  )
}

// ---- ThreadRow ----

function ThreadRow({ thread, active, onClick }: { thread: Thread; active: boolean; onClick: () => void }) {
  return (
    <div
      className={[
        'amsg-trow',
        active ? 'active' : '',
        thread.unread > 0 ? 'unread' : '',
        thread.closed ? 'closed' : '',
        thread.shimmer ? 'shimmer' : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className="amsg-trow-r1">
        <span className="amsg-trow-av">
          {thread.avatarUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={thread.avatarUrl} alt={thread.initials} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            : thread.initials}
        </span>
        <span className="amsg-trow-name">{thread.opp || thread.name}</span>
        <span className="amsg-trow-time">{thread.time}</span>
      </div>
      <div className="amsg-trow-r2">
        <span className={`amsg-pill ${thread.service === 'apply' ? 'amsg-pill-apply' : 'amsg-pill-mentor'}`}>
          {thread.service === 'apply' ? 'OppDate Apply' : 'Mentorship'}
        </span>
        <span className="amsg-trow-sub">{thread.name}</span>
      </div>
      <div className="amsg-trow-preview">{thread.preview}</div>
      <div className="amsg-trow-r3">
        <div className="amsg-trow-assignee">
          {thread.assignee && (
            <span className="amsg-trow-aav">{initials(thread.assignee)}</span>
          )}
        </div>
        <div className="amsg-trow-meta">
          {thread.avgResponse !== null && (
            <span className="amsg-trow-resp">Avg {formatRespTime(thread.avgResponse)}</span>
          )}
          {thread.closed && <span className="amsg-trow-closed-pill">Closed</span>}
          {!thread.closed && thread.unread > 0 && (
            <span className="amsg-trow-badge">{thread.unread}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- Doc request types ----

type ApiDocRequestItem = {
  id: string
  requestId: string
  label: string
  documentId?: string | null
  documentFileUrl?: string | null
  documentName?: string | null
  status: 'pending' | 'uploaded' | 'verified'
}
type ApiDocRequest = {
  id: string
  threadId: string
  createdBy: string
  createdAt: string
  items: ApiDocRequestItem[]
}

// ---- AdminDocRequestCard ----

function AdminDocRequestCard({ requestId, threadId }: { requestId: string; threadId: string }) {
  const { data: req, isLoading } = useQuery<ApiDocRequest | null>({
    queryKey: ['admin-doc-request', threadId, requestId],
    queryFn: () =>
      api.get(`/api/v1/messages/threads/${threadId}/document-requests`)
        .then(res => {
          const list: ApiDocRequest[] = res.data?.data ?? []
          return list.find(r => r.id === requestId) ?? null
        }),
    staleTime: 30 * 1000,
  })

  if (isLoading) {
    return (
      <div className="amsg-doccard-loading">
        <FileText size={13} /> Loading document request...
      </div>
    )
  }
  if (!req) return null

  const submitted = req.items.filter(i => i.status !== 'pending').length
  const allDone = submitted === req.items.length

  return (
    <div className={`amsg-doccard${allDone ? ' done' : ''}`}>
      <div className="amsg-doccard-head">
        <span className={`amsg-doccard-icon${allDone ? ' done' : ''}`}>
          <FileText size={14} />
        </span>
        <div className="amsg-doccard-title-block">
          <div className="amsg-doccard-title">Documents Required</div>
          <div className="amsg-doccard-sub">{submitted} of {req.items.length} submitted</div>
        </div>
        {allDone && <span className="amsg-doccard-complete-badge">Complete</span>}
      </div>
      <div className="amsg-doccard-items">
        {req.items.map(item => (
          <div
            key={item.id}
            className={`amsg-doccard-item${item.status === 'verified' ? ' verified' : item.status === 'uploaded' ? ' uploaded' : ''}`}
          >
            <span className="amsg-doccard-check">
              {item.status !== 'pending' ? <Check size={13} /> : <span className="amsg-doccard-empty-check" />}
            </span>
            <span className="amsg-doccard-label">{item.label}</span>
            {item.status === 'uploaded' && item.documentFileUrl ? (
              <a
                href={item.documentFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="amsg-doccard-view-btn"
              >
                View
              </a>
            ) : item.status === 'verified' ? (
              <span className="amsg-doccard-status-badge status-verified">Verified</span>
            ) : (
              <span className="amsg-doccard-status-badge status-pending">Pending</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- MessageBubble ----

function AttachedDocCard({ fileName, fileUrl, mimeType }: { fileName: string; fileUrl: string; mimeType: string }) {
  const isImage = mimeType.startsWith('image/')
  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="amsg-attached-doc"
    >
      <span className="amsg-attached-doc-icon">
        {isImage ? <span style={{ fontSize: 18 }}>🖼</span> : <FileText size={18} />}
      </span>
      <span className="amsg-attached-doc-name">{fileName}</span>
      <span className="amsg-attached-doc-action">Open</span>
    </a>
  )
}

function MessageBubble({ msg, threadId, threadInitials }: { msg: ApiMessage; threadId: string; threadInitials: string }) {
  const time = new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  if (msg.senderType === 'system') {
    const isWarn = /flag|refine|withdraw|reject/i.test(msg.content)
    return (
      <div className={`amsg-sys-pill${isWarn ? ' warn' : ''}`}>
        {isWarn ? <AlertCircle size={13} /> : <CheckCircle size={13} />}
        <span>{msg.content}</span>
      </div>
    )
  }

  const isTeam = msg.senderType === 'team'

  // Detect document request card
  if (msg.content.startsWith('{"type":"document_request"')) {
    let requestId: string | null = null
    try { requestId = JSON.parse(msg.content).requestId ?? null } catch {}
    if (requestId) {
      return (
        <div className={`amsg-turn doccard-turn ${isTeam ? 'team' : 'user'}`}>
          <div className="amsg-bubble-row">
            <AdminDocRequestCard requestId={requestId} threadId={threadId} />
          </div>
          <div className="amsg-msg-time">{time}</div>
        </div>
      )
    }
  }

  // Detect file attachment — content may be plain JSON or "text\n{json}"
  const attachJsonIdx = msg.content.indexOf('{"type":"attachment"')
  if (attachJsonIdx !== -1) {
    const textBefore = msg.content.slice(0, attachJsonIdx).replace(/\n$/, '').trim()
    try {
      const att = JSON.parse(msg.content.slice(attachJsonIdx))
      return (
        <div className={`amsg-turn ${isTeam ? 'team' : 'user'}`}>
          <div className="amsg-bubble-row">
            {!isTeam && <span className="amsg-msg-av">{threadInitials}</span>}
            <div className="amsg-bubble" style={{ padding: 0, overflow: 'hidden', background: 'none', border: 'none' }}>
              {textBefore && (
                <div style={{ padding: '10px 14px 8px', whiteSpace: 'pre-wrap' }}>{textBefore}</div>
              )}
              <AttachedDocCard fileName={att.fileName} fileUrl={att.fileUrl} mimeType={att.mimeType} />
            </div>
          </div>
          <div className="amsg-msg-time">{msg.isInternal ? `Internal note · ${time}` : time}</div>
        </div>
      )
    } catch {}
  }

  if (msg.isInternal) {
    return (
      <div className="amsg-turn team">
        <div className="amsg-bubble-row">
          <div className="amsg-bubble amsg-bubble-note">{msg.content}</div>
        </div>
        <div className="amsg-msg-time">Internal note &middot; {time}</div>
      </div>
    )
  }

  // Legacy "[Attached document]" messages sent before structured JSON was implemented
  if (msg.content.includes('[Attached document]')) {
    const textPart = msg.content.replace('[Attached document]', '').trim()
    return (
      <div className={`amsg-turn ${isTeam ? 'team' : 'user'}`}>
        <div className="amsg-bubble-row">
          {!isTeam && <span className="amsg-msg-av">{threadInitials}</span>}
          <div className="amsg-bubble">
            {textPart && <div style={{ marginBottom: 8 }}>{textPart}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--am-border)', color: 'var(--am-t3)', fontSize: 12 }}>
              <FileText size={13} style={{ flexShrink: 0 }} />
              Attachment (no longer available)
            </div>
          </div>
        </div>
        <div className="amsg-msg-time">{time}</div>
      </div>
    )
  }

  return (
    <div className={`amsg-turn ${isTeam ? 'team' : 'user'}`}>
      <div className="amsg-bubble-row">
        {!isTeam && (
          <span className="amsg-msg-av">{threadInitials}</span>
        )}
        <div className="amsg-bubble">{msg.content}</div>
      </div>
      <div className="amsg-msg-time">{time}</div>
    </div>
  )
}

// ---- DocRequestForm ----

function DocRequestForm({ threadId, onDone }: { threadId: string; onDone: () => void }) {
  const qc = useQueryClient()
  const [labels, setLabels] = useState<string[]>([''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const mut = useMutation({
    mutationFn: (items: string[]) =>
      api.post(`/api/v1/messages/threads/${threadId}/document-requests`, { items }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-thread-detail', threadId] })
      onDone()
    },
  })

  const addLabel = () => {
    setLabels(p => [...p, ''])
    requestAnimationFrame(() => {
      const next = inputRefs.current[labels.length]
      next?.focus()
    })
  }
  const removeLabel = (i: number) => setLabels(p => p.filter((_, idx) => idx !== i))
  const updateLabel = (i: number, v: string) => setLabels(p => p.map((l, idx) => idx === i ? v : l))

  const handleSubmit = () => {
    const filled = labels.map(l => l.trim()).filter(Boolean)
    if (!filled.length) return
    mut.mutate(filled)
  }

  return (
    <div className="amsg-docreq">
      <div className="amsg-docreq-head">
        <FileText size={14} />
        <span>Request documents from applicant</span>
        <button className="amsg-docreq-head-close" onClick={onDone}><X size={14} /></button>
      </div>
      <div className="amsg-docreq-items">
        {labels.map((l, i) => (
          <div key={i} className="amsg-docreq-item">
            <input
              ref={el => { inputRefs.current[i] = el }}
              className="amsg-docreq-input"
              placeholder={['CV / Resume', 'Motivation Letter', 'Academic Transcript'][i % 3]}
              value={l}
              onChange={e => updateLabel(i, e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLabel() } }}
            />
            {labels.length > 1 && (
              <button className="amsg-docreq-remove" onClick={() => removeLabel(i)}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="amsg-docreq-footer">
        <button className="amsg-docreq-add" onClick={addLabel}>
          <Plus size={13} /> Add document
        </button>
        <button
          className="amsg-docreq-submit"
          disabled={!labels.some(l => l.trim()) || mut.isPending}
          onClick={handleSubmit}
        >
          {mut.isPending ? 'Sending...' : 'Send request'}
        </button>
      </div>
    </div>
  )
}

// ---- Composer ----

function Composer({
  threadId,
  threadName,
  closed,
  noteMode,
  onToggleNote,
  isTeamTyping,
}: {
  threadId: string
  threadName: string
  closed: boolean
  noteMode: boolean
  onToggleNote: () => void
  isTeamTyping: boolean
}) {
  const qc = useQueryClient()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const trayRef = useRef<HTMLDivElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const imgInputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [sendState, setSendState] = useState<SendState>('idle')
  const sentResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [trayOpen, setTrayOpen] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done'>('idle')
  const [uploadedDoc, setUploadedDoc] = useState<{ id: string; fileUrl: string; name: string; mimeType: string } | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const mut = useMutation({
    mutationFn: (content: string) =>
      api.post(`/api/v1/admin/messages/${threadId}/reply`, { content, isInternal: noteMode }),
    onMutate: () => setSendState('sending'),
    onSuccess: () => {
      setSendState('sent')
      qc.invalidateQueries({ queryKey: ['admin-thread-detail', threadId] })
      qc.invalidateQueries({ queryKey: ['admin-messages'] })
      sentResetRef.current = setTimeout(() => setSendState('idle'), 1400)
    },
    onError: () => setSendState('idle'),
  })

  useEffect(() => () => { if (sentResetRef.current) clearTimeout(sentResetRef.current) }, [])

  // Clear attachment when switching to note mode
  useEffect(() => { if (noteMode) clearAttachment() }, [noteMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus when thread changes
  useEffect(() => {
    if (!closed) textareaRef.current?.focus()
  }, [threadId, closed])

  // Reset when thread changes
  useEffect(() => {
    setText('')
    clearAttachment()
    if (textareaRef.current) textareaRef.current.style.height = '22px'
  }, [threadId]) // eslint-disable-line react-hooks/exhaustive-deps

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
    const docType = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? 'passport_photo' : ext === 'pdf' ? 'cv' : 'other'
    const form = new FormData()
    form.append('file', file)
    form.append('type', docType)
    form.append('name', file.name.replace(/\.[^.]+$/, ''))
    try {
      const res = await api.post('/api/v1/documents', form, { headers: { 'Content-Type': 'multipart/form-data' } })
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

  const canSend = (text.trim().length > 0 || uploadState === 'done') && sendState === 'idle'

  const buildContent = (trimmed: string) => {
    if (!uploadedDoc) return trimmed
    const ref = JSON.stringify({ type: 'attachment', documentId: uploadedDoc.id, fileName: uploadedDoc.name, fileUrl: uploadedDoc.fileUrl, mimeType: uploadedDoc.mimeType })
    return trimmed ? `${trimmed}\n${ref}` : ref
  }

  const send = () => {
    if (!canSend) return
    mut.mutate(buildContent(text.trim()))
    setText('')
    clearAttachment()
    if (textareaRef.current) textareaRef.current.style.height = '22px'
    if (navigator.vibrate) navigator.vibrate(10)
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    e.target.style.height = '22px'
    e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px'
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  if (closed) {
    return (
      <div className="amsg-composer">
        <div className="amsg-closed-notice">
          <Lock size={16} />
          <span>This thread is closed and read-only.</span>
        </div>
      </div>
    )
  }

  const btnClass = ['amsg-send-btn', sendState === 'sending' ? 'sending' : sendState === 'sent' ? 'sent' : ''].filter(Boolean).join(' ')
  const len = text.length
  const isImage = attachment?.type.startsWith('image/') ?? false

  return (
    <div className={`amsg-composer${noteMode ? ' note-mode' : ''}`}>
      {isTeamTyping && (
        <div className="amsg-typing" style={{ marginBottom: 8 }}>
          <div className="amsg-typing-dots">
            <div className="amsg-typing-dot" />
            <div className="amsg-typing-dot" />
            <div className="amsg-typing-dot" />
          </div>
          <span className="amsg-typing-label">Applicant is typing...</span>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = '' }} />
      <input ref={imgInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = '' }} />

      {/* Attachment chip — hidden in note mode */}
      {attachment && !noteMode && (
        <div className="amsg-attach-chip">
          {isImage
            ? <img src={URL.createObjectURL(attachment)} alt="" className="amsg-attach-thumb" />
            : <FileText size={14} className="amsg-attach-icon" />}
          <span className="amsg-attach-name">
            {uploadState === 'uploading' ? 'Uploading...' : uploadError ?? attachment.name}
          </span>
          {uploadState === 'uploading' && <div className="amsg-spinner" style={{ width: 14, height: 14, flexShrink: 0 }} />}
          {!uploadError && uploadState === 'done' && <Check size={13} style={{ color: 'var(--am-green)', flexShrink: 0 }} />}
          <button className="amsg-attach-remove" onClick={clearAttachment} title="Remove"><X size={13} /></button>
        </div>
      )}

      <div className="amsg-input-row">
        {/* Paperclip + tray — hidden when composing an internal note */}
        {!noteMode && <div ref={trayRef} style={{ position: 'relative', flexShrink: 0 }}>
          {trayOpen && (
            <div className="amsg-attach-tray">
              <button className="amsg-attach-tray-opt" onClick={() => { docInputRef.current?.click(); setTrayOpen(false) }}>
                <FileText size={18} />
                <span>Document</span>
              </button>
              <button className="amsg-attach-tray-opt photo" onClick={() => { imgInputRef.current?.click(); setTrayOpen(false) }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>🖼</span>
                <span>Photo</span>
              </button>
            </div>
          )}
          <button
            className="amsg-icon-btn"
            title="Attach file"
            disabled={!!attachment}
            onClick={() => setTrayOpen(o => !o)}
            style={{
              opacity: attachment ? 0.35 : 1,
              color: trayOpen ? 'var(--am-amber)' : undefined,
              transform: trayOpen ? 'rotate(45deg)' : 'none',
              transition: 'transform 150ms, color 150ms',
            }}
          >
            <Paperclip size={16} />
          </button>
        </div>}
        <textarea
          ref={textareaRef}
          className="amsg-textarea"
          placeholder={`Reply to ${threadName}...`}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
        />
        <button
          className={btnClass}
          disabled={!canSend}
          title="Send"
          onClick={send}
        >
          {sendState === 'sending' ? (
            <div className="amsg-spinner" />
          ) : sendState === 'sent' ? (
            <Check size={15} />
          ) : (
            <Send size={15} />
          )}
        </button>
      </div>
      <div className="amsg-foot-row">
        <div className="amsg-note-toggle" onClick={onToggleNote}>
          <div className="amsg-note-switch" />
          <span className="amsg-note-label">Send as internal note</span>
        </div>
        {len > 400 && (
          <span className={`amsg-charcount${len > 1800 ? ' danger' : len > 1200 ? ' warn' : ''}`}>
            {len} / 2000
          </span>
        )}
      </div>
    </div>
  )
}

// ---- ThreadDetail ----

function ThreadDetail({
  thread,
  liveMessages,
  noteMode,
  onToggleNote,
  wsConnected,
}: {
  thread: Thread | null
  liveMessages: Record<string, ApiMessage[]>
  noteMode: boolean
  onToggleNote: () => void
  wsConnected: boolean
}) {
  const qc = useQueryClient()
  const router = useRouter()
  const historyRef = useRef<HTMLDivElement>(null)
  const [docReqOpen, setDocReqOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [typingUser, setTypingUser] = useState(false)

  const { data: detail } = useQuery<{ thread: ApiThread; messages: ApiMessage[] }>({
    queryKey: ['admin-thread-detail', thread?.id],
    queryFn: () => api.get(`/api/v1/admin/messages/${thread!.id}`).then(r => r.data.data),
    enabled: !!thread?.id,
  })

  const closeMut = useMutation({
    mutationFn: () => api.patch(`/api/v1/admin/messages/${thread!.id}`, { status: 'closed' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-messages'] })
      qc.invalidateQueries({ queryKey: ['admin-thread-detail', thread?.id] })
    },
  })

  // Mark read on open
  useEffect(() => {
    if (!thread?.id) return
    api.patch(`/api/v1/admin/messages/${thread.id}`, { unreadByTeam: 0 }).catch(() => {})
  }, [thread?.id])

  // Merge API messages + live WS buffer
  const baseMessages = detail?.messages ?? []
  const liveBuffer = thread ? (liveMessages[thread.id] ?? []) : []
  const baseIds = new Set(baseMessages.map(m => m.id))
  const allMessages = [...baseMessages, ...liveBuffer.filter(m => !baseIds.has(m.id))]

  // Scroll to bottom on new messages or thread change
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [thread?.id, allMessages.length])

  // Reset doc req on thread change
  useEffect(() => { setDocReqOpen(false) }, [thread?.id])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menuOpen])

  if (!thread) {
    return (
      <div className="amsg-detail">
        <div className="amsg-detail-placeholder">
          <MessageSquare size={44} />
          <p>Select a conversation to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="amsg-detail">
      {/* WS reconnect banner */}
      {!wsConnected && (
        <div className="amsg-ws-banner">
          <div className="amsg-ws-dot" />
          Reconnecting — messages may be delayed
        </div>
      )}

      {/* Thread header */}
      <div className="amsg-dh">
        <div className="amsg-dh-left">
          <span className="amsg-dh-av">
            {thread.avatarUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={thread.avatarUrl} alt={thread.initials} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : thread.initials}
          </span>
          <div className="amsg-dh-info">
            <div className="amsg-dh-name">{thread.opp || thread.name}</div>
            <div className="amsg-dh-sub">
              <span className={`amsg-pill ${thread.service === 'apply' ? 'amsg-pill-apply' : 'amsg-pill-mentor'}`}>
                {thread.service === 'apply' ? 'OppDate Apply' : 'Mentorship'}
              </span>
              <span className="amsg-dh-sub-name">{thread.name}</span>
            </div>
          </div>
        </div>
        <div className="amsg-dh-right">
          <span className={`amsg-status ${thread.closed ? 'closed' : 'open'}`}>
            <span className="amsg-status-dot" />
            {thread.closed ? 'Closed' : 'Open'}
          </span>
          {!thread.closed && (
            <button
              className={`amsg-hbtn${docReqOpen ? ' active' : ''}`}
              onClick={() => setDocReqOpen(o => !o)}
            >
              <FileText size={13} />
              Request docs
            </button>
          )}
          {thread.service === 'apply' && thread.referenceId && (
            <button className="amsg-hbtn" onClick={() => router.push(`/admin/applications?id=${thread.referenceId}`)}>
              View application <ArrowRight size={12} />
            </button>
          )}
          <div className="amsg-menu-wrap" ref={menuRef}>
            <button className="amsg-menu-btn" onClick={() => setMenuOpen(o => !o)}>
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div className="amsg-menu-drop">
                {!thread.closed && (
                  <div
                    className="amsg-menu-item danger"
                    onClick={() => { setMenuOpen(false); closeMut.mutate() }}
                  >
                    Close thread
                  </div>
                )}
                <div
                  className="amsg-menu-item"
                  onClick={() => {
                    api.patch(`/api/v1/admin/messages/${thread.id}`, { unreadByTeam: 0 }).catch(() => {})
                    qc.invalidateQueries({ queryKey: ['admin-messages'] })
                    setMenuOpen(false)
                  }}
                >
                  Mark all as read
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document request form */}
      {docReqOpen && (
        <DocRequestForm
          threadId={thread.id}
          onDone={() => setDocReqOpen(false)}
        />
      )}

      {/* Message history */}
      <div className="amsg-history" ref={historyRef}>
        <div className="amsg-history-inner">
          {groupMessages(allMessages).map((group, gi) => (
            <div key={gi} className="amsg-dategroup">
              <div className="amsg-datediv"><span>{group.date}</span></div>
              {group.messages.map((msg, mi) => (
                <MessageBubble key={msg.id ?? mi} msg={msg} threadId={thread.id} threadInitials={thread.initials} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Composer */}
      <Composer
        threadId={thread.id}
        threadName={thread.name}
        closed={thread.closed}
        noteMode={noteMode}
        onToggleNote={onToggleNote}
        isTeamTyping={typingUser}
      />
    </div>
  )
}

// ---- Main component ----

export function AdminMessagesPage() {
  const qc = useQueryClient()
  const isMobile = useIsMobile()
  const searchParams = useSearchParams()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [searchQ, setSearchQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('thread'))
  const [noteMode, setNoteMode] = useState(false)
  const [liveMessages, setLiveMessages] = useState<Record<string, ApiMessage[]>>({})
  const [shimmerIds, setShimmerIds] = useState<Set<string>>(new Set())
  const [wsConnected, setWsConnected] = useState(true)
  const [mobileScreen, setMobileScreen] = useState<'inbox' | 'detail'>('inbox')

  // Mobile-specific state hoisted here to satisfy rules of hooks
  const mobHistoryRef = useRef<HTMLDivElement>(null)
  const mobTextareaRef = useRef<HTMLTextAreaElement>(null)
  const mobMenuRef = useRef<HTMLDivElement>(null)
  const [mobText, setMobText] = useState('')
  const [mobSendState, setMobSendState] = useState<SendState>('idle')
  const [mobMenuOpen, setMobMenuOpen] = useState(false)
  const mobTrayRef = useRef<HTMLDivElement>(null)
  const mobDocInputRef = useRef<HTMLInputElement>(null)
  const mobImgInputRef = useRef<HTMLInputElement>(null)
  const [mobTrayOpen, setMobTrayOpen] = useState(false)
  const [mobAttachment, setMobAttachment] = useState<File | null>(null)
  const [mobUploadState, setMobUploadState] = useState<'idle' | 'uploading' | 'done'>('idle')
  const [mobUploadedDoc, setMobUploadedDoc] = useState<{ id: string; fileUrl: string; name: string; mimeType: string } | null>(null)
  const [mobUploadError, setMobUploadError] = useState<string | null>(null)

  const { data: apiResp, isLoading } = useQuery<{ data: ApiThread[]; total: number }>({
    queryKey: ['admin-messages'],
    queryFn: () => api.get('/api/v1/admin/messages', { params: { limit: 100 } }).then(r => r.data),
    refetchInterval: 120000,
  })

  // Mobile thread detail (reuses same cache key as desktop)
  const { data: mobDetail } = useQuery<{ thread: ApiThread; messages: ApiMessage[] }>({
    queryKey: ['admin-thread-detail', selectedId],
    queryFn: () => api.get(`/api/v1/admin/messages/${selectedId}`).then(r => r.data.data),
    enabled: !!selectedId && isMobile,
  })

  const { connected: wsConn } = useWebSocket(useCallback((msg) => {
    if (msg.type === 'new_message' && msg.threadId) {
      const tid = msg.threadId as string
      const newMsg = msg.message as ApiMessage
      if (tid === selectedId) {
        setLiveMessages(prev => {
          const existing = prev[tid] ?? []
          if (existing.some(m => m.id === newMsg.id)) return prev
          return { ...prev, [tid]: [...existing, newMsg] }
        })
        qc.invalidateQueries({ queryKey: ['admin-thread-detail', tid] })
      } else {
        setShimmerIds(prev => new Set([...prev, tid]))
        setTimeout(() => setShimmerIds(prev => {
          const next = new Set(prev); next.delete(tid); return next
        }), 1800)
        qc.invalidateQueries({ queryKey: ['admin-messages'] })
      }
    }
  }, [selectedId, qc]))

  // Sync WS connected state for reconnect banner
  useEffect(() => { setWsConnected(wsConn) }, [wsConn])

  const mobMut = useMutation({
    mutationFn: (content: string) =>
      api.post(`/api/v1/admin/messages/${selectedId}/reply`, { content, isInternal: noteMode }),
    onMutate: () => setMobSendState('sending'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-thread-detail', selectedId] })
      qc.invalidateQueries({ queryKey: ['admin-messages'] })
      setMobText('')
      if (mobTextareaRef.current) mobTextareaRef.current.style.height = '22px'
      setMobSendState('sent')
      setTimeout(() => setMobSendState('idle'), 1400)
      setTimeout(() => {
        if (mobHistoryRef.current)
          mobHistoryRef.current.scrollTop = mobHistoryRef.current.scrollHeight
      }, 60)
    },
    onError: () => setMobSendState('idle'),
  })

  // Mobile attachment tray — outside click closes it
  useEffect(() => {
    if (!mobTrayOpen) return
    const h = (e: MouseEvent) => {
      if (mobTrayRef.current && !mobTrayRef.current.contains(e.target as Node)) setMobTrayOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [mobTrayOpen])

  const handleMobFileSelected = async (file: File) => {
    setMobTrayOpen(false)
    setMobAttachment(file)
    setMobUploadError(null)
    setMobUploadState('uploading')
    setMobUploadedDoc(null)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const docType = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? 'passport_photo' : ext === 'pdf' ? 'cv' : 'other'
    const form = new FormData()
    form.append('file', file)
    form.append('type', docType)
    form.append('name', file.name.replace(/\.[^.]+$/, ''))
    try {
      const res = await api.post('/api/v1/documents', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      const doc = res.data?.data
      setMobUploadedDoc(doc ? { id: doc.id, fileUrl: doc.fileUrl, name: doc.name, mimeType: doc.mimeType } : null)
      setMobUploadState('done')
    } catch (e: any) {
      setMobUploadError(e?.response?.data?.message ?? 'Upload failed')
      setMobUploadState('idle')
    }
  }

  const clearMobAttachment = () => {
    setMobAttachment(null)
    setMobUploadState('idle')
    setMobUploadedDoc(null)
    setMobUploadError(null)
  }

  const buildMobContent = (trimmed: string) => {
    if (!mobUploadedDoc) return trimmed
    const ref = JSON.stringify({ type: 'attachment', documentId: mobUploadedDoc.id, fileName: mobUploadedDoc.name, fileUrl: mobUploadedDoc.fileUrl, mimeType: mobUploadedDoc.mimeType })
    return trimmed ? `${trimmed}\n${ref}` : ref
  }

  const rawThreads: Thread[] = (apiResp?.data ?? []).map(t => toThread(t, shimmerIds.has(t.id)))
  const totalUnread = rawThreads.reduce((a, t) => a + (t.closed ? 0 : t.unread), 0)
  const filtered = filterList(rawThreads, filter)
  const visible = searchList(filtered, debouncedQ)
  const selectedThread = selectedId ? (rawThreads.find(t => t.id === selectedId) ?? null) : null

  const handleSearch = useCallback((val: string) => {
    setSearchQ(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebouncedQ(val), 250)
  }, [])
  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current) }, [])

  const openThread = useCallback((id: string) => {
    setSelectedId(id)
    setNoteMode(false)
    if (isMobile) setMobileScreen('detail')
  }, [isMobile])

  const TABS: { key: FilterKey; label: string }[] = [
    { key: 'all',    label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'apply',  label: 'OppDate Apply' },
    { key: 'mentor', label: 'Mentorship' },
    { key: 'closed', label: 'Closed' },
  ]

  if (isLoading) return <Skeleton />

  // ---- MOBILE ----
  if (isMobile) {
    const mobThread = selectedId ? (rawThreads.find(t => t.id === selectedId) ?? null) : null
    const mobMessages = mobDetail?.messages ?? []
    const mobLive = selectedId ? (liveMessages[selectedId] ?? []) : []
    const mobBaseIds = new Set(mobMessages.map(m => m.id))
    const mobAll = [...mobMessages, ...mobLive.filter(m => !mobBaseIds.has(m.id))]

    return (
      <div className="amsg-mob-root">
        {/* Inbox screen */}
        <div className={`amsg-mob-screen inbox${mobileScreen === 'detail' ? ' thread-open' : ''}`}>
          <div className="amsg-mob-head">
            <div className="amsg-mob-title-row">
              <h2>Messages</h2>
              {totalUnread > 0 && <span className="amsg-sb-unread-pill">{totalUnread} unread</span>}
            </div>
            <div className="amsg-search">
              <Search size={14} />
              <input
                placeholder="Search threads or opportunities..."
                value={searchQ}
                onChange={e => handleSearch(e.target.value)}
              />
            </div>
            <div className="amsg-mob-filter-row">
              <div className="amsg-mob-pills">
                {TABS.map(tab => (
                  <span
                    key={tab.key}
                    className={`amsg-tab${filter === tab.key ? ' on' : ''}`}
                    onClick={() => setFilter(tab.key)}
                  >
                    {tab.label}
                    <span className="amsg-tab-count">{countFor(rawThreads, tab.key)}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="amsg-sb-body">
            {visible.length === 0 ? (
              <div className="amsg-empty">
                {filter === 'all' && !debouncedQ ? <Inbox size={32} /> : <Search size={32} />}
                {filter === 'all' && !debouncedQ ? (
                  <>
                    <h4>No threads yet</h4>
                    <p>Threads open automatically when users pay for OppDate Apply or enrol in Mentorship.</p>
                  </>
                ) : (
                  <>
                    <h4>No threads match</h4>
                    <p>Try a different filter or clear your search.</p>
                  </>
                )}
              </div>
            ) : visible.map(t => (
              <div
                key={t.id}
                className={[
                  'amsg-mob-trow',
                  t.unread > 0 ? 'unread' : '',
                  t.closed ? 'closed' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => openThread(t.id)}
              >
                <div className="amsg-mob-trow-r1">
                  <span className="amsg-trow-av">
                    {t.avatarUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={t.avatarUrl} alt={t.initials} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      : t.initials}
                  </span>
                  <span className="amsg-mob-trow-name">{t.opp || t.name}</span>
                  <span className="amsg-mob-trow-time">{t.time}</span>
                </div>
                <div className="amsg-mob-trow-opp">{t.name}</div>
                <div className="amsg-mob-trow-preview">{t.preview}</div>
                <div className="amsg-mob-trow-foot">
                  <span className={`amsg-pill ${t.service === 'apply' ? 'amsg-pill-apply' : 'amsg-pill-mentor'}`}>
                    {t.service === 'apply' ? 'OppDate Apply' : 'Mentorship'}
                  </span>
                  <div className="amsg-trow-meta">
                    {t.closed && <span className="amsg-trow-closed-pill">Closed</span>}
                    {!t.closed && t.unread > 0 && <span className="amsg-trow-badge">{t.unread}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail screen */}
        <div className={`amsg-mob-screen detail${mobileScreen === 'detail' ? ' visible' : ''}`}>
          {mobThread && (
            <>
              {!wsConnected && (
                <div className="amsg-ws-banner">
                  <div className="amsg-ws-dot" /> Reconnecting...
                </div>
              )}
              <div className="amsg-mob-dh">
                <div className="amsg-mob-dh-t1">
                  <button className="amsg-mob-back" onClick={() => setMobileScreen('inbox')}>
                    <ArrowLeft size={20} />
                  </button>
                  <span className="amsg-dh-av">
                    {mobThread.avatarUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={mobThread.avatarUrl} alt={mobThread.initials} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      : mobThread.initials}
                  </span>
                  <div className="amsg-mob-dh-who">
                    <div className="amsg-mob-dh-name">{mobThread.opp || mobThread.name}</div>
                  </div>
                  <div className="amsg-mob-overflow" ref={mobMenuRef}>
                    <button
                      style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, color: 'var(--am-t3)', transition: 'background 150ms' }}
                      onClick={() => setMobMenuOpen(o => !o)}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    {mobMenuOpen && (
                      <div className="amsg-mob-menudrop">
                        <button onClick={() => setMobMenuOpen(false)}>Mark as read</button>
                        <button onClick={() => setMobMenuOpen(false)}>Mute thread</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="amsg-mob-dh-t2">
                  <span className={`amsg-pill ${mobThread.service === 'apply' ? 'amsg-pill-apply' : 'amsg-pill-mentor'}`}>
                    {mobThread.service === 'apply' ? 'OppDate Apply' : 'Mentorship'}
                  </span>
                  <span className="amsg-mob-dh-opp">{mobThread.name}</span>
                </div>
                <div className="amsg-mob-dh-t3">
                  <span className={`amsg-status ${mobThread.closed ? 'closed' : 'open'}`}>
                    <span className="amsg-status-dot" />
                    {mobThread.closed ? 'Closed' : 'Open'}
                  </span>
                </div>
              </div>

              <div className="amsg-history" ref={mobHistoryRef} style={{ flex: '1 1 auto' }}>
                <div className="amsg-history-inner">
                  {groupMessages(mobAll).map((group, gi) => (
                    <div key={gi} className="amsg-dategroup">
                      <div className="amsg-datediv"><span>{group.date}</span></div>
                      {group.messages.map((msg, mi) => (
                        <MessageBubble key={msg.id ?? mi} msg={msg} threadId={selectedId ?? ''} threadInitials={mobThread.initials} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {mobThread.closed ? (
                <div className="amsg-composer">
                  <div className="amsg-closed-notice">
                    <Lock size={16} />
                    <span>This thread is closed.</span>
                  </div>
                </div>
              ) : (
                <div className={`amsg-composer${noteMode ? ' note-mode' : ''}`}>
                  {/* Hidden file inputs */}
                  <input ref={mobDocInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleMobFileSelected(f); e.target.value = '' }} />
                  <input ref={mobImgInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleMobFileSelected(f); e.target.value = '' }} />

                  {/* Attachment chip — hidden in note mode */}
                  {mobAttachment && !noteMode && (
                    <div className="amsg-attach-chip">
                      {mobAttachment.type.startsWith('image/')
                        ? <img src={URL.createObjectURL(mobAttachment)} alt="" className="amsg-attach-thumb" />
                        : <FileText size={14} className="amsg-attach-icon" />}
                      <span className="amsg-attach-name">
                        {mobUploadState === 'uploading' ? 'Uploading...' : mobUploadError ?? mobAttachment.name}
                      </span>
                      {mobUploadState === 'uploading' && <div className="amsg-spinner" style={{ width: 14, height: 14, flexShrink: 0 }} />}
                      {!mobUploadError && mobUploadState === 'done' && <Check size={13} style={{ color: 'var(--am-green)', flexShrink: 0 }} />}
                      <button className="amsg-attach-remove" onClick={clearMobAttachment} title="Remove"><X size={13} /></button>
                    </div>
                  )}

                  <div className="amsg-input-row">
                    {!noteMode && <div ref={mobTrayRef} style={{ position: 'relative', flexShrink: 0 }}>
                      {mobTrayOpen && (
                        <div className="amsg-attach-tray">
                          <button className="amsg-attach-tray-opt" onClick={() => { mobDocInputRef.current?.click(); setMobTrayOpen(false) }}>
                            <FileText size={18} />
                            <span>Document</span>
                          </button>
                          <button className="amsg-attach-tray-opt photo" onClick={() => { mobImgInputRef.current?.click(); setMobTrayOpen(false) }}>
                            <span style={{ fontSize: 18, lineHeight: 1 }}>🖼</span>
                            <span>Photo</span>
                          </button>
                        </div>
                      )}
                      <button
                        className="amsg-icon-btn"
                        title="Attach file"
                        disabled={!!mobAttachment}
                        onClick={() => setMobTrayOpen(o => !o)}
                        style={{
                          opacity: mobAttachment ? 0.35 : 1,
                          color: mobTrayOpen ? 'var(--am-amber)' : undefined,
                          transform: mobTrayOpen ? 'rotate(45deg)' : 'none',
                          transition: 'transform 150ms, color 150ms',
                        }}
                      >
                        <Paperclip size={16} />
                      </button>
                    </div>}
                    <textarea
                      ref={mobTextareaRef}
                      className="amsg-textarea"
                      placeholder={`Reply to ${mobThread.name}...`}
                      value={mobText}
                      onChange={e => {
                        setMobText(e.target.value)
                        e.target.style.height = '22px'
                        e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px'
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          const canMobSend = (mobText.trim().length > 0 || mobUploadState === 'done') && mobSendState === 'idle'
                          if (canMobSend) {
                            mobMut.mutate(buildMobContent(mobText.trim()))
                            setMobText('')
                            clearMobAttachment()
                          }
                        }
                      }}
                    />
                    <button
                      className={['amsg-send-btn', mobSendState === 'sending' ? 'sending' : mobSendState === 'sent' ? 'sent' : ''].filter(Boolean).join(' ')}
                      disabled={(mobText.trim().length === 0 && mobUploadState !== 'done') || mobSendState !== 'idle'}
                      onClick={() => {
                        const canMobSend = (mobText.trim().length > 0 || mobUploadState === 'done') && mobSendState === 'idle'
                        if (!canMobSend) return
                        mobMut.mutate(buildMobContent(mobText.trim()))
                        setMobText('')
                        clearMobAttachment()
                      }}
                    >
                      {mobSendState === 'sending' ? <div className="amsg-spinner" /> : mobSendState === 'sent' ? <Check size={15} /> : <Send size={15} />}
                    </button>
                  </div>
                  <div className="amsg-foot-row">
                    <div className="amsg-note-toggle" onClick={() => setNoteMode(n => !n)}>
                      <div className="amsg-note-switch" />
                      <span className="amsg-note-label">Internal note</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // ---- DESKTOP ----
  return (
    <div className="amsg-root">
      {/* Left: thread list */}
      <div className="amsg-sidebar">
        <div className="amsg-sb-head">
          <div className="amsg-sb-title-row">
            <h2>Messages</h2>
            {totalUnread > 0 && (
              <span className="amsg-sb-unread-pill">{totalUnread} unread</span>
            )}
          </div>
          <div className="amsg-search">
            <Search size={14} />
            <input
              placeholder="Search threads or opportunities..."
              value={searchQ}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
          <div className="amsg-tabs">
            {TABS.map(tab => (
              <span
                key={tab.key}
                className={`amsg-tab${filter === tab.key ? ' on' : ''}`}
                onClick={() => setFilter(tab.key)}
              >
                {tab.label}
                <span className="amsg-tab-count">{countFor(rawThreads, tab.key)}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="amsg-sb-body">
          {visible.length === 0 ? (
            <div className="amsg-empty">
              {filter === 'all' && !debouncedQ ? <Inbox size={32} /> : <Search size={32} />}
              {filter === 'all' && !debouncedQ ? (
                <>
                  <h4>No threads yet</h4>
                  <p>Threads open automatically when users pay for OppDate Apply or enrol in Mentorship.</p>
                </>
              ) : (
                <>
                  <h4>No threads match</h4>
                  <p>Try a different filter or clear your search.</p>
                </>
              )}
            </div>
          ) : visible.map(t => (
            <ThreadRow
              key={t.id}
              thread={t}
              active={t.id === selectedId}
              onClick={() => openThread(t.id)}
            />
          ))}
        </div>
      </div>

      {/* Right: thread detail */}
      <ThreadDetail
        thread={selectedThread}
        liveMessages={liveMessages}
        noteMode={noteMode}
        onToggleNote={() => setNoteMode(n => !n)}
        wsConnected={wsConnected}
      />
    </div>
  )
}
