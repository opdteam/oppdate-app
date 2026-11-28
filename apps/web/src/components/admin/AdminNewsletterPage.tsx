'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { createPortal } from 'react-dom'
import {
  Plus, ChevronLeft, X, Check, Edit3, Trash2, Eye, Send, Download,
  Users, Mail, BarChart3, RotateCw, Search, Upload, FileText,
  Copy, ExternalLink, ArrowRight, Newspaper, Clock, CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapLink from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'

type Tab = 'dashboard' | 'subscribers' | 'compose' | 'detail'
type EditionStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
type SubStatus = 'active' | 'unsubscribed' | 'bounced'

interface Subscriber {
  id: string
  email: string
  name: string | null
  status: SubStatus
  source: string
  subscribedAt: string
  createdAt: string
}

interface Edition {
  id: string
  subject: string
  preheaderText: string | null
  bodyHtml: string | null
  blogPostId: string | null
  status: EditionStatus
  sentAt: string | null
  sentCount: number
  openCount: number
  createdAt: string
  createdByName: string | null
}

interface NlStats {
  subscribers: { total: number; active: number }
  editions: { sent: number; avgOpenRate: number }
}

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

function formatDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function EditionStatusBadge({ status }: { status: EditionStatus }) {
  const styles: Record<EditionStatus, { bg: string; tx: string }> = {
    draft: { bg: 'rgba(216,184,150,0.15)', tx: '#D8B896' },
    scheduled: { bg: 'rgba(103,160,220,0.15)', tx: '#67A0DC' },
    sending: { bg: 'rgba(232,168,77,0.15)', tx: '#E8A84D' },
    sent: { bg: 'rgba(127,200,147,0.15)', tx: '#7FC893' },
    failed: { bg: 'rgba(248,113,113,0.15)', tx: '#F87171' },
  }
  const s = styles[status]
  return <span className="adm-news-badge" style={{ background: s.bg, color: s.tx }}>{status}</span>
}

function SubStatusBadge({ status }: { status: SubStatus }) {
  const styles: Record<SubStatus, { bg: string; tx: string }> = {
    active: { bg: 'rgba(127,200,147,0.15)', tx: '#7FC893' },
    unsubscribed: { bg: 'rgba(176,144,112,0.15)', tx: '#B09070' },
    bounced: { bg: 'rgba(248,113,113,0.15)', tx: '#F87171' },
  }
  const s = styles[status]
  return <span className="adm-news-badge" style={{ background: s.bg, color: s.tx }}>{status}</span>
}

// Stats card
function StatCard({ icon: Icon, label, value, sub }: {
  icon: typeof Users
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="adm-news-stat">
      <div className="adm-news-stat-ico"><Icon size={20} /></div>
      <div>
        <div className="adm-news-stat-val">{value}</div>
        <div className="adm-news-stat-label">{label}</div>
        {sub && <div className="adm-news-stat-sub">{sub}</div>}
      </div>
    </div>
  )
}

// Dashboard view
function DashboardView({ stats, editions, onComposeNew, onViewEdition }: {
  stats: NlStats | null
  editions: Edition[]
  onComposeNew: () => void
  onViewEdition: (id: string) => void
}) {
  return (
    <div className="adm-news-dash">
      <div className="adm-news-stats-row">
        <StatCard icon={Users} label="Total subscribers" value={stats?.subscribers.total || 0} />
        <StatCard icon={CheckCircle} label="Active" value={stats?.subscribers.active || 0} />
        <StatCard icon={Send} label="Editions sent" value={stats?.editions.sent || 0} />
        <StatCard icon={Eye} label="Avg open rate" value={`${stats?.editions.avgOpenRate || 0}%`} />
      </div>

      <div className="adm-news-recent">
        <div className="adm-news-recent-head">
          <h2>Recent editions</h2>
          <button className="adm-btn adm-news-btn-pub" onClick={onComposeNew}>
            <Plus size={16} /> Compose
          </button>
        </div>

        {editions.length === 0 ? (
          <div className="adm-news-empty">
            <Newspaper size={36} style={{ opacity: 0.3 }} />
            <p>No editions yet. Compose your first newsletter.</p>
          </div>
        ) : (
          <div className="adm-news-editions-list">
            {editions.map(ed => (
              <div key={ed.id} className="adm-news-edition-row" onClick={() => onViewEdition(ed.id)}>
                <div className="adm-news-edition-info">
                  <h3>{ed.subject}</h3>
                  <span className="adm-news-edition-meta">
                    {ed.createdByName || 'Admin'} | {formatDate(ed.createdAt)}
                  </span>
                </div>
                <div className="adm-news-edition-stats">
                  <EditionStatusBadge status={ed.status} />
                  {ed.status === 'sent' && (
                    <span className="adm-news-edition-nums">
                      <span><Send size={12} /> {ed.sentCount}</span>
                      <span><Eye size={12} /> {ed.openCount}</span>
                    </span>
                  )}
                </div>
                <ArrowRight size={16} style={{ opacity: 0.3 }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Subscribers view
function SubscribersView({ onImport }: { onImport: () => void }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SubStatus | ''>('')
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-newsletter-subscribers', search, statusFilter],
    queryFn: () => {
      const params: Record<string, string> = { limit: '100' }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      return api.get('/api/v1/newsletter/admin/subscribers', { params }).then(r => r.data)
    },
  })

  const subscribers: Subscriber[] = data?.data ?? []
  const stats = data?.stats

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/newsletter/admin/subscribers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-newsletter-subscribers'] }),
  })

  const importMutation = useMutation({
    mutationFn: (emails: string) => api.post('/api/v1/newsletter/admin/subscribers/import', { emails }),
    onSuccess: (res: any) => {
      setImportResult(res.data.data)
      qc.invalidateQueries({ queryKey: ['admin-newsletter-subscribers'] })
      qc.invalidateQueries({ queryKey: ['admin-newsletter-stats'] })
    },
  })

  return (
    <div className="adm-news-subs">
      <div className="adm-news-subs-head">
        <div className="adm-news-subs-stats">
          <span>Total: <strong>{stats?.total || 0}</strong></span>
          <span>Active: <strong>{stats?.active || 0}</strong></span>
          <span>Unsubscribed: <strong>{stats?.unsubscribed || 0}</strong></span>
        </div>
        <button className="adm-btn adm-btn-ghost" onClick={() => setImportOpen(true)}>
          <Upload size={14} /> Import
        </button>
      </div>

      <div className="adm-news-subs-controls">
        <div className="adm-news-search">
          <Search size={15} />
          <input placeholder="Search subscribers..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="adm-news-sel" value={statusFilter} onChange={e => setStatusFilter(e.target.value as SubStatus | '')}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="unsubscribed">Unsubscribed</option>
          <option value="bounced">Bounced</option>
        </select>
      </div>

      {isLoading ? (
        <div className="adm-news-loading"><RotateCw size={20} className="adm-spin" /></div>
      ) : subscribers.length === 0 ? (
        <div className="adm-news-empty">
          <Users size={36} style={{ opacity: 0.3 }} />
          <p>No subscribers found.</p>
        </div>
      ) : (
        <div className="adm-news-table-wrap">
          <table className="adm-news-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Status</th>
                <th>Source</th>
                <th>Subscribed</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map(sub => (
                <tr key={sub.id}>
                  <td className="adm-news-td-email">{sub.email}</td>
                  <td>{sub.name || '-'}</td>
                  <td><SubStatusBadge status={sub.status} /></td>
                  <td><span className="adm-news-source">{sub.source.replace('_', ' ')}</span></td>
                  <td>{formatDate(sub.subscribedAt)}</td>
                  <td>
                    <button
                      className="adm-news-row-btn danger"
                      onClick={() => { if (confirm('Remove this subscriber?')) deleteMutation.mutate(sub.id) }}
                      title="Remove"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Import modal */}
      {importOpen && createPortal(
        <div className="adm-news-overlay" onClick={e => { if (e.target === e.currentTarget) { setImportOpen(false); setImportResult(null); setImportText('') } }}>
          <div className="adm-news-modal">
            <div className="adm-news-modal-head">
              <h3>Import subscribers</h3>
              <button onClick={() => { setImportOpen(false); setImportResult(null); setImportText('') }}><X size={18} /></button>
            </div>
            {importResult ? (
              <div className="adm-news-import-result">
                <CheckCircle size={28} style={{ color: '#7FC893' }} />
                <p>Imported <strong>{importResult.imported}</strong> new subscribers.</p>
                {importResult.skipped > 0 && <p className="adm-news-import-skip">{importResult.skipped} skipped (duplicates or invalid).</p>}
                <button className="adm-btn adm-news-btn-pub" onClick={() => { setImportOpen(false); setImportResult(null); setImportText('') }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <p className="adm-news-modal-desc">Paste email addresses below, one per line or separated by commas.</p>
                <textarea
                  className="adm-news-import-ta"
                  rows={8}
                  placeholder={'user@example.com\nanother@example.com'}
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                />
                <div className="adm-news-modal-actions">
                  <button className="adm-btn adm-btn-ghost" onClick={() => { setImportOpen(false); setImportText('') }}>Cancel</button>
                  <button
                    className="adm-btn adm-news-btn-pub"
                    disabled={!importText.trim() || importMutation.isPending}
                    onClick={() => importMutation.mutate(importText)}
                  >
                    {importMutation.isPending ? <RotateCw size={14} className="adm-spin" /> : <Upload size={14} />}
                    Import
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

// Compose view
function ComposeView({ editionId, onBack, onSent }: {
  editionId: string | null
  onBack: () => void
  onSent: () => void
}) {
  const qc = useQueryClient()
  const [subject, setSubject] = useState('')
  const [preheader, setPreheader] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sendConfirm, setSendConfirm] = useState(false)
  const [previewEmail, setPreviewEmail] = useState('')
  const [previewSent, setPreviewSent] = useState(false)
  const [activeSubCount, setActiveSubCount] = useState(0)

  // Load edition if editing
  const { data: editionData } = useQuery({
    queryKey: ['admin-newsletter-edition', editionId],
    queryFn: () => editionId ? api.get(`/api/v1/newsletter/admin/editions/${editionId}`).then(r => r.data) : null,
    enabled: !!editionId,
  })

  const edition = editionData?.data

  // Get active subscriber count
  useEffect(() => {
    api.get('/api/v1/newsletter/admin/stats').then(r => {
      setActiveSubCount(r.data?.data?.subscribers?.active || 0)
    }).catch(() => {})
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapLink.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Write your newsletter content...' }),
    ],
    content: '',
    editorProps: {
      attributes: { class: 'adm-news-editor-content' },
    },
  })

  // Load edition data into form
  useEffect(() => {
    if (edition) {
      setSubject(edition.subject || '')
      setPreheader(edition.preheaderText || '')
      if (editor && edition.bodyHtml) {
        editor.commands.setContent(edition.bodyHtml)
      }
    }
  }, [edition, editor])

  async function saveDraft() {
    if (!subject.trim()) { setError('Subject is required.'); return }
    setSaving(true)
    setError('')
    const body = editor?.getHTML() || ''
    try {
      if (editionId) {
        await api.patch(`/api/v1/newsletter/admin/editions/${editionId}`, {
          subject: subject.trim(),
          preheaderText: preheader.trim() || null,
          bodyHtml: body || null,
        })
      } else {
        await api.post('/api/v1/newsletter/admin/editions', {
          subject: subject.trim(),
          preheaderText: preheader.trim() || null,
          bodyHtml: body || null,
        })
      }
      qc.invalidateQueries({ queryKey: ['admin-newsletter-editions'] })
      onBack()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function sendNewsletter() {
    if (!editionId) {
      // Save first, then send
      if (!subject.trim()) { setError('Subject is required.'); return }
      setSaving(true)
      setError('')
      const body = editor?.getHTML() || ''
      try {
        const res = await api.post('/api/v1/newsletter/admin/editions', {
          subject: subject.trim(),
          preheaderText: preheader.trim() || null,
          bodyHtml: body || null,
        })
        const newId = res.data.data.id
        await api.post(`/api/v1/newsletter/admin/editions/${newId}/send`)
        qc.invalidateQueries({ queryKey: ['admin-newsletter-editions'] })
        qc.invalidateQueries({ queryKey: ['admin-newsletter-stats'] })
        setSendConfirm(false)
        onSent()
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to send.')
      } finally {
        setSaving(false)
      }
    } else {
      setSaving(true)
      try {
        // Save latest changes first
        const body = editor?.getHTML() || ''
        await api.patch(`/api/v1/newsletter/admin/editions/${editionId}`, {
          subject: subject.trim(),
          preheaderText: preheader.trim() || null,
          bodyHtml: body || null,
        })
        await api.post(`/api/v1/newsletter/admin/editions/${editionId}/send`)
        qc.invalidateQueries({ queryKey: ['admin-newsletter-editions'] })
        qc.invalidateQueries({ queryKey: ['admin-newsletter-stats'] })
        setSendConfirm(false)
        onSent()
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to send.')
      } finally {
        setSaving(false)
      }
    }
  }

  async function sendPreview() {
    if (!previewEmail.trim()) return
    try {
      const id = editionId
      if (!id) {
        setError('Save the edition first before sending a preview.')
        return
      }
      await api.post(`/api/v1/newsletter/admin/editions/${id}/preview`, { email: previewEmail.trim() })
      setPreviewSent(true)
      setTimeout(() => setPreviewSent(false), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send preview.')
    }
  }

  const isReadonly = edition?.status && edition.status !== 'draft'

  return (
    <div className="adm-news-compose">
      <div className="adm-news-compose-top">
        <button className="adm-btn adm-btn-ghost" onClick={onBack}>
          <ChevronLeft size={16} /> Back
        </button>
        {!isReadonly && (
          <div className="adm-news-compose-actions">
            <button className="adm-btn adm-btn-ghost" onClick={saveDraft} disabled={saving}>
              Save draft
            </button>
            <button className="adm-btn adm-news-btn-send" onClick={() => setSendConfirm(true)} disabled={saving}>
              <Send size={14} /> Send newsletter
            </button>
          </div>
        )}
      </div>

      {error && <div className="adm-news-error">{error}</div>}

      <div className="adm-news-compose-layout">
        <div className="adm-news-compose-main">
          <input
            className="adm-news-subj-inp"
            placeholder="Newsletter subject"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            disabled={!!isReadonly}
          />
          <input
            className="adm-news-preheader-inp"
            placeholder="Preheader text (shown in email preview)"
            value={preheader}
            onChange={e => setPreheader(e.target.value)}
            disabled={!!isReadonly}
          />
          <div className="adm-news-editor-wrap">
            <EditorContent editor={editor} />
          </div>
        </div>

        <div className="adm-news-compose-side">
          {!isReadonly && (
            <div className="adm-news-side-section">
              <label className="adm-news-side-label">Send preview</label>
              <div className="adm-news-preview-row">
                <input
                  className="adm-news-inp"
                  type="email"
                  placeholder="email@example.com"
                  value={previewEmail}
                  onChange={e => setPreviewEmail(e.target.value)}
                />
                <button className="adm-btn adm-btn-ghost" onClick={sendPreview} disabled={!previewEmail.trim()}>
                  {previewSent ? <Check size={14} /> : <Send size={14} />}
                </button>
              </div>
              {previewSent && <div className="adm-news-preview-ok">Preview sent!</div>}
            </div>
          )}

          {edition && (
            <div className="adm-news-side-section adm-news-side-info">
              <div>Status: <EditionStatusBadge status={edition.status} /></div>
              {edition.sentAt && <div>Sent: {formatDate(edition.sentAt)}</div>}
              {edition.sentCount > 0 && <div>Delivered: {edition.sentCount}</div>}
              {edition.openCount > 0 && <div>Opens: {edition.openCount}</div>}
              <div>Created: {formatDate(edition.createdAt)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Send confirmation modal */}
      {sendConfirm && createPortal(
        <div className="adm-news-overlay" onClick={e => { if (e.target === e.currentTarget) setSendConfirm(false) }}>
          <div className="adm-news-modal">
            <div className="adm-news-modal-ico"><Send size={24} /></div>
            <h3>Send newsletter?</h3>
            <p>This will send &ldquo;{subject || 'Untitled'}&rdquo; to <strong>{activeSubCount.toLocaleString()}</strong> active subscribers. This action cannot be undone.</p>
            <div className="adm-news-modal-actions">
              <button className="adm-btn adm-btn-ghost" onClick={() => setSendConfirm(false)}>Cancel</button>
              <button className="adm-btn adm-news-btn-send" onClick={sendNewsletter} disabled={saving}>
                {saving ? <RotateCw size={14} className="adm-spin" /> : <Send size={14} />}
                Send to {activeSubCount.toLocaleString()} subscribers
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// Edition detail view
function EditionDetail({ editionId, onBack }: { editionId: string; onBack: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-newsletter-edition', editionId],
    queryFn: () => api.get(`/api/v1/newsletter/admin/editions/${editionId}`).then(r => r.data),
  })

  const edition = data?.data
  const sendLog = edition?.sendLog ?? []

  if (isLoading) {
    return (
      <div className="adm-news-detail">
        <div className="adm-news-loading"><RotateCw size={20} className="adm-spin" /></div>
      </div>
    )
  }

  if (!edition) {
    return (
      <div className="adm-news-detail">
        <button className="adm-btn adm-btn-ghost" onClick={onBack}><ChevronLeft size={16} /> Back</button>
        <div className="adm-news-empty"><p>Edition not found.</p></div>
      </div>
    )
  }

  const openRate = edition.sentCount > 0 ? Math.round((edition.openCount / edition.sentCount) * 100) : 0

  return (
    <div className="adm-news-detail">
      <button className="adm-btn adm-btn-ghost" onClick={onBack} style={{ marginBottom: 20 }}>
        <ChevronLeft size={16} /> Back
      </button>

      <div className="adm-news-detail-head">
        <h2>{edition.subject}</h2>
        <EditionStatusBadge status={edition.status} />
      </div>

      <div className="adm-news-detail-stats">
        <StatCard icon={Send} label="Sent" value={edition.sentCount} />
        <StatCard icon={Eye} label="Opens" value={edition.openCount} />
        <StatCard icon={BarChart3} label="Open rate" value={`${openRate}%`} />
        <StatCard icon={Clock} label="Sent at" value={edition.sentAt ? formatDate(edition.sentAt) : '-'} />
      </div>

      {edition.bodyHtml && (
        <div className="adm-news-detail-preview">
          <h3>Content preview</h3>
          <div className="adm-news-detail-body" dangerouslySetInnerHTML={{ __html: edition.bodyHtml }} />
        </div>
      )}

      {sendLog.length > 0 && (
        <div className="adm-news-detail-log">
          <h3>Send log ({sendLog.length})</h3>
          <div className="adm-news-table-wrap">
            <table className="adm-news-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Sent</th>
                  <th>Opened</th>
                </tr>
              </thead>
              <tbody>
                {sendLog.map((log: any, i: number) => (
                  <tr key={i}>
                    <td className="adm-news-td-email">{log.subscriberEmail}</td>
                    <td>{log.subscriberName || '-'}</td>
                    <td>{formatDate(log.sentAt)}</td>
                    <td>{log.openedAt ? formatDate(log.openedAt) : <span style={{ opacity: 0.4 }}>-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function NewsletterSkeleton() {
  return (
    <div className="adm-news-wrap">
      <div className="adm-news-head">
        <div className="adm-skel" style={{ width: 140, height: 28 }} />
      </div>
      <div className="adm-news-stats-row">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="adm-news-stat">
            <div className="adm-skel" style={{ width: 40, height: 40, borderRadius: 10 }} />
            <div>
              <div className="adm-skel" style={{ width: 60, height: 20, marginBottom: 4 }} />
              <div className="adm-skel" style={{ width: 80, height: 12 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdminNewsletterPage() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [composeEditionId, setComposeEditionId] = useState<string | null>(null)
  const [detailEditionId, setDetailEditionId] = useState<string | null>(null)

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-newsletter-stats'],
    queryFn: () => api.get('/api/v1/newsletter/admin/stats').then(r => r.data),
  })

  const { data: editionsData } = useQuery({
    queryKey: ['admin-newsletter-editions'],
    queryFn: () => api.get('/api/v1/newsletter/admin/editions').then(r => r.data),
  })

  const stats: NlStats | null = statsData?.data ?? null
  const editions: Edition[] = editionsData?.data ?? []

  if (statsLoading) return <NewsletterSkeleton />

  if (tab === 'compose') {
    return (
      <div className="adm-news-wrap">
        <ComposeView
          editionId={composeEditionId}
          onBack={() => { setTab('dashboard'); setComposeEditionId(null) }}
          onSent={() => { setTab('dashboard'); setComposeEditionId(null) }}
        />
      </div>
    )
  }

  if (tab === 'detail' && detailEditionId) {
    return (
      <div className="adm-news-wrap">
        <EditionDetail
          editionId={detailEditionId}
          onBack={() => { setTab('dashboard'); setDetailEditionId(null) }}
        />
      </div>
    )
  }

  return (
    <div className="adm-news-wrap">
      <div className="adm-news-head">
        <h1>Newsletter</h1>
      </div>

      <div className="adm-news-tabs">
        <button className={`adm-news-tab${tab === 'dashboard' ? ' active' : ''}`} onClick={() => setTab('dashboard')}>
          <BarChart3 size={15} /> Dashboard
        </button>
        <button className={`adm-news-tab${tab === 'subscribers' ? ' active' : ''}`} onClick={() => setTab('subscribers')}>
          <Users size={15} /> Subscribers
        </button>
      </div>

      {tab === 'dashboard' && (
        <DashboardView
          stats={stats}
          editions={editions}
          onComposeNew={() => { setComposeEditionId(null); setTab('compose') }}
          onViewEdition={(id) => { setDetailEditionId(id); setTab('detail') }}
        />
      )}

      {tab === 'subscribers' && (
        <SubscribersView onImport={() => {}} />
      )}
    </div>
  )
}
