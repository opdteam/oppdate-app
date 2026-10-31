'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, extractApiError } from '@/lib/api'
import { createPortal } from 'react-dom'
import { useRef } from 'react'
import {
  X, Check, ChevronLeft, Plus, ArrowRight,
  CheckCircle, XCircle, Users, Handshake,
  Edit3, Image as ImageIcon, Calendar, ArrowLeft, Upload, Loader,
} from 'lucide-react'

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

type ProgStatus = 'active' | 'pending' | 'completed' | 'cancelled'
type LogStatus = 'completed' | 'missed'
type Tab = 'active' | 'pending' | 'completed' | 'programmes'
type MpView = 'grid' | 'form'

type LogEntry = { date: string; notes: string; status: LogStatus }

type ApiSession = {
  id: string
  mentorshipId: string
  scheduledAt: string
  status: 'scheduled' | 'completed' | 'cancelled'
  notes: string | null
  createdAt: string
  updatedAt: string
}

type Programme = {
  id: string; user: string; userEmail: string; mentorId: string; mentorName: string
  title: string; durationWeeks: number; start: string; end: string
  sessionsDone: number; sessionsTotal: number; lastActivity: string; status: ProgStatus
  log: LogEntry[]
}

type MpCatalog = {
  id: string; mentorName: string; mentorRole: string; title: string
  duration: number; fee: number; status: 'published' | 'draft'
  desc: string; included: string[]; tags: string[]
  headerImageUrl: string | null
}

type PendingMatch = {
  id: string; user: string; userEmail: string; programmeId: string
  programmeTitle: string; enrollDate: string
}

// API types
type ApiMentorship = {
  id: string; status: ProgStatus; startedAt: string | null; completedAt: string | null
  createdAt: string; updatedAt: string; userId: string; userName: string | null
  userEmail: string | null; mentorProfileId: string | null; mentorName: string | null
  mentorSpecialty: string | null; programmeId: string | null; programmeTitle: string | null
  programmeMonthlyPrice: number | null
}

type ApiMentorProfile = {
  id: string; name: string; specialty: string; bio: string; headshotUrl: string | null
  published: boolean; createdAt: string; updatedAt: string
}

type ApiProgramme = {
  id: string; title: string; description: string; monthlyPriceUsd: number
  headerImageUrl: string | null; active: boolean; createdBy: string; createdAt: string; updatedAt: string
}

function mentorshipToUi(a: ApiMentorship): Programme {
  const name = a.userName || a.userEmail || 'Unknown'
  const now = new Date()
  const updated = new Date(a.updatedAt)
  const diffMs = now.getTime() - updated.getTime()
  const diffHrs = Math.floor(diffMs / 3600000)
  const lastActivity = diffHrs < 1 ? 'Just now' : diffHrs < 24 ? `${diffHrs}h ago` : `${Math.floor(diffHrs / 24)} day${Math.floor(diffHrs / 24) !== 1 ? 's' : ''} ago`

  const startDate = a.startedAt ? new Date(a.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not started'
  const endDate = a.completedAt ? new Date(a.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Ongoing'

  return {
    id: a.id,
    user: name,
    userEmail: a.userEmail || '',
    mentorId: a.mentorProfileId || '',
    mentorName: a.mentorName || 'Unassigned',
    title: a.programmeTitle || 'Mentorship',
    durationWeeks: 0,
    start: startDate,
    end: endDate,
    sessionsDone: 0,
    sessionsTotal: 0,
    lastActivity,
    status: a.status,
    log: [],
  }
}

function mentorProfileToUi(a: ApiMentorProfile): MpCatalog {
  return {
    id: a.id,
    mentorName: a.name,
    mentorRole: 'OppDate Mentor',
    title: a.specialty,
    duration: 0,
    fee: 0,
    status: a.published ? 'published' : 'draft',
    desc: a.bio,
    included: [],
    tags: [],
    headerImageUrl: null,
  }
}

function apiProgrammeToUi(a: ApiProgramme): MpCatalog {
  return {
    id: a.id,
    mentorName: '',
    mentorRole: 'OppDate Mentor',
    title: a.title,
    duration: 0,
    fee: a.monthlyPriceUsd / 100,
    status: a.active ? 'published' : 'draft',
    desc: a.description,
    included: [],
    tags: [],
    headerImageUrl: a.headerImageUrl ?? null,
  }
}

function mentorshipToPending(a: ApiMentorship): PendingMatch {
  return {
    id: a.id,
    user: a.userName || a.userEmail || 'Unknown',
    userEmail: a.userEmail || '',
    programmeId: a.programmeId || '',
    programmeTitle: a.programmeTitle || 'Mentorship',
    enrollDate: new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  }
}

function getInitials(name: string) { return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() }

function ProgStatusBadge({ status }: { status: ProgStatus }) {
  const map = {
    active: ['Active', 'adm-ment-badge-active'],
    pending: ['Pending matching', 'adm-ment-badge-pending'],
    completed: ['Completed', 'adm-ment-badge-completed'],
    cancelled: ['Cancelled', 'adm-ment-badge-cancelled'],
  }
  const [label, cls] = map[status]
  return <span className={`adm-ment-badge ${cls}`}>{label}</span>
}

function CatStatusBadge({ status }: { status: 'published' | 'draft' }) {
  return status === 'published'
    ? <span className="adm-ment-badge adm-ment-badge-active">Published</span>
    : <span className="adm-ment-badge adm-ment-badge-gray">Draft</span>
}

function LogStatusBadge({ status }: { status: LogStatus }) {
  return status === 'completed'
    ? <span className="adm-ment-badge adm-ment-badge-active">Completed</span>
    : <span className="adm-ment-badge adm-ment-badge-cancelled">Missed</span>
}

/* ============================================================
   PROGRAMME CARD (Active / Completed grids)
   ============================================================ */
function ProgCard({ p, onClick }: { p: Programme; onClick?: () => void }) {
  return (
    <div className={`adm-ment-card${onClick ? '' : ' no-click'}`} onClick={onClick}>
      <div className="adm-ment-pair">
        <span className="adm-ment-pairname">{p.user}</span>
        <ArrowRight size={13} />
        <span className="adm-ment-pairname">{p.mentorName}</span>
      </div>
      <div className="adm-ment-title">{p.title}</div>
      <div className="adm-ment-dates">
        <span className="adm-ment-mono">{p.start}</span>
        <span>-</span>
        <span className="adm-ment-mono">{p.end}</span>
      </div>
      <div className="adm-ment-lastact">Last activity: {p.lastActivity}</div>
    </div>
  )
}

/* ============================================================
   PROGRAMME GRID (Active / Completed tabs)
   ============================================================ */
function ProgGrid({ programmes, status, onOpen }: { programmes: Programme[]; status: 'active' | 'completed'; onOpen?: (id: string) => void }) {
  const items = programmes.filter(p => p.status === status)
  if (items.length === 0) {
    return (
      <div className="adm-ment-empty">
        <div className="adm-ment-empty-ico"><Calendar size={36} /></div>
        <h3>No {status} programmes</h3>
        <p>Mentorship programmes with {status} status will appear here.</p>
      </div>
    )
  }
  return (
    <div className="adm-ment-grid">
      {items.map(p => <ProgCard key={p.id} p={p} onClick={onOpen ? () => onOpen(p.id) : undefined} />)}
    </div>
  )
}

/* ============================================================
   PROGRAMME DETAIL
   ============================================================ */
function ProgDetail({ programmes, catalogues, progId, onBack, onComplete, onCancel, onReassign }: {
  programmes: Programme[]; catalogues: MpCatalog[]; progId: string; onBack: () => void; onComplete: (id: string) => void; onCancel: (id: string) => void; onReassign: (id: string) => void
}) {
  const queryClient = useQueryClient()
  const [logFormOpen, setLogFormOpen] = useState(false)
  const [logDate, setLogDate] = useState('')
  const [logNotes, setLogNotes] = useState('')
  const p = programmes.find(x => x.id === progId)

  const { data: sessions = [] } = useQuery<ApiSession[]>({
    queryKey: ['mentorship-sessions', progId],
    queryFn: () => api.get(`/api/v1/mentorships/${progId}/sessions`).then(r => r.data.data),
    enabled: !!progId,
  })

  const scheduleSession = useMutation({
    mutationFn: (payload: { scheduledAt: string; notes?: string }) =>
      api.post(`/api/v1/mentorships/${progId}/sessions`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorship-sessions', progId] })
      setLogFormOpen(false)
      setLogDate('')
      setLogNotes('')
    },
  })

  const updateSession = useMutation({
    mutationFn: ({ sessionId, status }: { sessionId: string; status: 'completed' | 'cancelled' }) =>
      api.patch(`/api/v1/mentorships/sessions/${sessionId}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mentorship-sessions', progId] }),
  })

  if (!p) return null
  const mentor = catalogues.find(m => m.id === p.mentorId)
  const terminal = p.status === 'completed' || p.status === 'cancelled'

  return (
    <>
      <span className="adm-ment-backlink" onClick={onBack}><ChevronLeft size={14} /><span>Back to Mentorship</span></span>

      <div className="adm-ment-detailgrid">
        <div className="adm-ment-detailcard">
          <div className="adm-ment-sbh">User</div>
          <div className="adm-ment-sdrow">
            <div className="adm-ment-avatar">{getInitials(p.user)}</div>
            <div><div className="adm-ment-sdname">{p.user}</div><div className="adm-ment-sdemail">{p.userEmail}</div></div>
          </div>
        </div>
        <div className="adm-ment-detailcard">
          <div className="adm-ment-sbh">Mentor</div>
          <div className="adm-ment-sdrow">
            <div className="adm-ment-avatar">{getInitials(p.mentorName)}</div>
            <div><div className="adm-ment-sdname">{p.mentorName}</div><div className="adm-ment-sdemail">{mentor?.title || ''}</div></div>
          </div>
          <span className="adm-ment-sdviewlink">View programme listing <ArrowRight size={13} /></span>
          {p.status === 'active' && (
            <button className="adm-btn adm-ment-btn-outline adm-btn-sm" style={{ marginTop: 12 }} onClick={() => onReassign(p.id)}>
              <Handshake size={13} /> Reassign mentor
            </button>
          )}
        </div>
      </div>

      <div className="adm-ment-detailcard" style={{ marginTop: 16 }}>
        <div className="adm-ment-sbh">Session log</div>
        {sessions.map(s => (
          <div key={s.id} className="adm-ment-logrow">
            <div className="adm-ment-logdate adm-ment-mono">
              {new Date(s.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="adm-ment-lognotes">{s.notes || '-'}</div>
            <div className="adm-ment-logstatus">
              {s.status === 'scheduled' ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" style={{ fontSize: 11 }} onClick={() => updateSession.mutate({ sessionId: s.id, status: 'completed' })}>
                    <Check size={11} /> Done
                  </button>
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" style={{ fontSize: 11 }} onClick={() => updateSession.mutate({ sessionId: s.id, status: 'cancelled' })}>
                    <X size={11} /> Cancel
                  </button>
                </div>
              ) : (
                <LogStatusBadge status={s.status === 'completed' ? 'completed' : 'missed'} />
              )}
            </div>
          </div>
        ))}
        {logFormOpen && (
          <div className="adm-ment-logform">
            <input className="adm-ment-inp" type="datetime-local" value={logDate} onChange={e => setLogDate(e.target.value)} />
            <textarea className="adm-ment-ta" rows={2} placeholder="Session notes..." value={logNotes} onChange={e => setLogNotes(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="adm-btn adm-ment-btn-outline adm-btn-sm"
                disabled={!logDate || scheduleSession.isPending}
                onClick={() => scheduleSession.mutate({ scheduledAt: new Date(logDate).toISOString(), notes: logNotes || undefined })}
              >
                <Check size={13} /> Save
              </button>
              <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => { setLogFormOpen(false); setLogDate(''); setLogNotes('') }}>Cancel</button>
            </div>
          </div>
        )}
        {!logFormOpen && p.status !== 'completed' && (
          <span className="adm-ment-addlink" onClick={() => setLogFormOpen(true)} style={{ marginTop: 12 }}><Plus size={15} /> Add session log</span>
        )}
      </div>

      <div className="adm-ment-detailcard" style={{ marginTop: 16 }}>
        <div className="adm-ment-sbh">Status and actions</div>
        {terminal ? (
          <div className="adm-ment-terminalnote">{p.status === 'completed' ? 'This programme has been completed.' : 'This programme was cancelled.'}</div>
        ) : (
          <div className="adm-ment-sdactions">
            <button className="adm-btn adm-ment-btnoutline" style={{ borderColor: '#059669', color: '#34D399' }} onClick={() => onComplete(p.id)}>
              <CheckCircle size={14} /> Complete programme
            </button>
            <button className="adm-btn adm-ment-btnoutline" style={{ borderColor: '#DC2626', color: '#F87171' }} onClick={() => onCancel(p.id)}>
              <XCircle size={14} /> Cancel programme
            </button>
          </div>
        )}
      </div>
    </>
  )
}

/* ============================================================
   PENDING MATCHING TAB
   ============================================================ */
function PendingList({ pending, onAssign }: { pending: PendingMatch[]; onAssign: (id: string) => void }) {
  if (pending.length === 0) {
    return (
      <div className="adm-ment-empty">
        <div className="adm-ment-empty-ico"><Calendar size={36} /></div>
        <h3>No pending assignments</h3>
        <p>Users awaiting a mentor match will appear here.</p>
      </div>
    )
  }
  return (
    <>
      {pending.map(pm => (
        <div key={pm.id} className="adm-ment-pmrow">
          <div><div className="adm-ment-pmname">{pm.user}</div><div className="adm-ment-pmemail">{pm.userEmail}</div></div>
          <div className="adm-ment-pmprog">{pm.programmeTitle}</div>
          <div className="adm-ment-pmenroll adm-ment-mono">Enrolled {pm.enrollDate}</div>
          <button className="adm-btn adm-ment-btn-outline adm-btn-sm" onClick={() => onAssign(pm.id)}>
            <Handshake size={13} /> Assign mentor
          </button>
        </div>
      ))}
    </>
  )
}

/* ============================================================
   MENTORSHIP PROGRAMMES - CATALOG GRID
   ============================================================ */
function CatalogGrid({ catalogues, onEdit, onNew, onDelete }: { catalogues: MpCatalog[]; onEdit: (id: string) => void; onNew: () => void; onDelete: (id: string) => void }) {
  return (
    <>
      <div className="adm-ment-cnheadrow">
        <span className="adm-ment-cnheadsub">{catalogues.length} mentorship programme{catalogues.length !== 1 ? 's' : ''}</span>
        <button className="adm-btn adm-btn-ghost adm-ment-newbtn" onClick={onNew}><Plus size={14} /> New programme</button>
      </div>
      <div className="adm-ment-cngrid">
        {catalogues.map(m => (
          <div key={m.id} className="adm-ment-cncard">
            <div className="adm-ment-cncard-top">
              <CatStatusBadge status={m.status} />
            </div>
            <div className="adm-ment-cnspecialty">{m.title}</div>
            <div className="adm-ment-cnduration"><span className="adm-ment-mono">{m.fee ? '$' + m.fee + '/mo' : 'Price not set'}</span></div>
            <div className="adm-ment-cnactions">
              <span className="adm-ment-cnact" onClick={() => onEdit(m.id)}><Edit3 size={13} /> Edit</span>
              {m.status === 'published' && <span className="adm-ment-cnact">Unpublish</span>}
              {m.status === 'draft' && <span className="adm-ment-cnact danger" onClick={() => onDelete(m.id)}>Delete</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

/* ============================================================
   MENTORSHIP PROGRAMMES - CATALOG FORM
   ============================================================ */
function CatalogForm({ catalogues, catalogId, onBack }: { catalogues: MpCatalog[]; catalogId: string | null; onBack: () => void }) {
  const queryClient = useQueryClient()
  const editing = !!catalogId
  const m = editing ? catalogues.find(x => x.id === catalogId) : null

  const [title, setTitle] = useState(m?.title ?? '')
  const [desc, setDesc] = useState(m?.desc ?? '')
  const [fee, setFee] = useState(m?.fee ? String(m.fee) : '')
  const [included, setIncluded] = useState<string[]>(m?.included ?? [])
  const [tags, setTags] = useState<string[]>(m?.tags ?? [])
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(m?.headerImageUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => editing
      ? api.patch(`/api/v1/admin/mentorship-programmes/${catalogId}`, payload)
      : api.post('/api/v1/admin/mentorship-programmes', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-mentorship-programmes'] })
      onBack()
    },
    onError: (err: unknown) => setSaveError(extractApiError(err, 'Failed to save. Please try again.')),
  })

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post<{ data: { url: string } }>('/api/v1/admin/mentor-header-upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setHeaderImageUrl(res.data.data.url)
    } catch {
      setUploadError('Upload failed. Try again.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handleSave(publish: boolean) {
    setSaveError('')
    const monthlyPriceUsd = Math.round(parseFloat(fee) * 100)
    if (!title.trim()) return setSaveError('Programme title is required.')
    if (!desc.trim()) return setSaveError('Description is required.')
    if (isNaN(monthlyPriceUsd) || monthlyPriceUsd <= 0) return setSaveError('A valid price is required.')
    saveMutation.mutate({
      title: title.trim(),
      description: desc.trim(),
      monthlyPriceUsd,
      headerImageUrl: headerImageUrl ?? null,
      active: publish,
    })
  }

  const filename = headerImageUrl ? headerImageUrl.split('/').pop() : null

  return (
    <>
      <div className="adm-ment-formwrap">
        <div className="adm-ment-formmain">
          <span className="adm-ment-backlink" onClick={onBack}><ChevronLeft size={14} /><span>Back to Mentorship Programmes</span></span>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--adm-t-hi)' }}>{editing ? `Editing: ${m!.title}` : 'New mentorship programme'}</h1>
          <div className="adm-ment-formcard">
            <div className="adm-ment-field">
              <label className="adm-ment-fieldlabel">Header/thematic image</label>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFileChange} />
              <div
                className={`adm-ment-dropzone${filename ? ' has-file' : ''}`}
                onClick={() => !uploading && fileRef.current?.click()}
                style={{ cursor: uploading ? 'default' : 'pointer' }}
              >
                {uploading
                  ? <><Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /><div className="adm-ment-dzlabel">Uploading...</div></>
                  : filename
                    ? <><ImageIcon size={20} /><div><div className="adm-ment-dzname">{filename}</div><div className="adm-ment-dzsub">Click to replace</div></div></>
                    : <><Upload size={20} /><div className="adm-ment-dzlabel">Click to upload a header image</div><div className="adm-ment-dzsub">JPEG, PNG or WebP - max 5MB</div></>
                }
              </div>
              {uploadError && <p style={{ color: 'var(--adm-danger)', fontSize: 12, margin: '4px 0 0' }}>{uploadError}</p>}
              {headerImageUrl && (
                <img src={headerImageUrl} alt="" style={{ marginTop: 8, width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 8 }} />
              )}
            </div>
            <div className="adm-ment-field"><label className="adm-ment-fieldlabel">Programme title <span className="adm-ment-req">*</span></label><input className="adm-ment-inp" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 30-Day Personalized Mentorship" /></div>
            <div className="adm-ment-field"><label className="adm-ment-fieldlabel">Programme description</label><textarea className="adm-ment-ta" rows={3} placeholder="A short paragraph shown on the catalog card..." value={desc} onChange={e => setDesc(e.target.value)} /></div>
            <div className="adm-ment-field"><label className="adm-ment-fieldlabel">Monthly fee (USD) <span className="adm-ment-req">*</span></label><div className="adm-ment-priceinput"><span className="adm-ment-pfx">$</span><input className="adm-ment-inp" type="number" min={1} value={fee} onChange={e => setFee(e.target.value)} placeholder="250" /></div></div>
            <div className="adm-ment-field">
              <label className="adm-ment-fieldlabel">What&apos;s included</label>
              {included.map((it, i) => (
                <div key={i} className="adm-ment-rrow">
                  <input className="adm-ment-inp" value={it} onChange={e => setIncluded(prev => prev.map((v, j) => j === i ? e.target.value : v))} />
                  <button className="adm-ment-iconbtn sm" onClick={() => setIncluded(prev => prev.filter((_, j) => j !== i))}><X size={13} /></button>
                </div>
              ))}
              <span className="adm-ment-addlink" onClick={() => setIncluded(prev => [...prev, ''])}><Plus size={15} /> Add item</span>
            </div>
            <div className="adm-ment-field">
              <label className="adm-ment-fieldlabel">Specialty tags</label>
              {tags.map((t, i) => (
                <div key={i} className="adm-ment-rrow">
                  <input className="adm-ment-inp" value={t} onChange={e => setTags(prev => prev.map((v, j) => j === i ? e.target.value : v))} />
                  <button className="adm-ment-iconbtn sm" onClick={() => setTags(prev => prev.filter((_, j) => j !== i))}><X size={13} /></button>
                </div>
              ))}
              <span className="adm-ment-addlink" onClick={() => setTags(prev => [...prev, ''])}><Plus size={15} /> Add tag</span>
            </div>
            {saveError && <p style={{ color: 'var(--adm-danger)', fontSize: 13, margin: '4px 0 0' }}>{saveError}</p>}
          </div>
        </div>
      </div>
      <div className="adm-ment-formfooter">
        <div style={{ flex: '1 1 auto' }} />
        <button className="adm-btn adm-btn-ghost" onClick={onBack}>Cancel</button>
        <button className="adm-btn adm-ment-btnoutline" disabled={saveMutation.isPending} onClick={() => handleSave(false)}>Save as draft</button>
        <button className="adm-btn adm-ment-btn-outline" disabled={saveMutation.isPending || uploading} onClick={() => handleSave(true)}>
          {saveMutation.isPending ? 'Saving...' : editing ? 'Save changes' : 'Publish'}
        </button>
      </div>
    </>
  )
}

/* ============================================================
   MODALS
   ============================================================ */
type ModalKind = 'complete' | 'cancel' | 'assign' | 'deleteprog' | null

function MentorshipModal({ programmes, pending, catalogues, kind, dataId, onClose, onConfirm }: {
  programmes: Programme[]; pending: PendingMatch[]; catalogues: MpCatalog[];
  kind: ModalKind; dataId: string | null; onClose: () => void; onConfirm: () => void
}) {
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null)

  useEffect(() => {
    if (kind === 'assign' && dataId) {
      const pm = pending.find(x => x.id === dataId)
      const prog = !pm ? programmes.find(x => x.id === dataId) : null
      const currentId = pm ? pm.programmeId : prog?.mentorId || null
      setSelectedMentor(currentId)
    }
  }, [kind, dataId])

  if (!kind) return null

  let content: React.ReactNode = null

  if (kind === 'complete') {
    content = (
      <>
        <div className="adm-ment-modalico"><CheckCircle size={28} /></div>
        <h3>Mark this programme as complete?</h3>
        <p>This confirms the mentorship relationship finished successfully.</p>
        <div className="adm-ment-modalactions">
          <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="adm-btn" style={{ background: '#059669', color: '#fff' }} onClick={onConfirm}><CheckCircle size={14} /> Complete programme</button>
        </div>
      </>
    )
  } else if (kind === 'cancel') {
    content = (
      <>
        <div className="adm-ment-modalico red"><XCircle size={28} /></div>
        <h3>Cancel this programme?</h3>
        <p>This ends the mentorship relationship before completion. This cannot be undone.</p>
        <div className="adm-ment-modalactions">
          <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="adm-btn adm-ment-btndanger" onClick={onConfirm}><XCircle size={14} /> Cancel programme</button>
        </div>
      </>
    )
  } else if (kind === 'assign') {
    const pm = pending.find(x => x.id === dataId)
    const prog = !pm ? programmes.find(x => x.id === dataId) : null
    const currentId = pm ? pm.programmeId : prog?.mentorId
    const relevantMentors = catalogues.filter(m => m.id === currentId || m.status === 'published')

    content = (
      <>
        <div className="adm-ment-modalico"><Handshake size={28} /></div>
        <h3>{pm ? 'Assign mentor' : 'Reassign mentor'}</h3>
        <p>{pm ? `${pm.user} enrolled in ${pm.programmeTitle}.` : `${prog?.user} will be notified by message thread and email once the mentor is reassigned.`}</p>
        <div className="adm-ment-mentorlist">
          {relevantMentors.map(m => (
            <div
              key={m.id}
              className={`adm-ment-mentoropt${selectedMentor === m.id ? ' selected' : ''}`}
              onClick={() => setSelectedMentor(m.id)}
            >
              <div className="adm-ment-cnavatar" style={{ width: 32, height: 32 }}><Users size={16} /></div>
              <div>
                <span className="adm-ment-moname">{m.mentorName}</span>
                {m.id === currentId && <span className="adm-ment-motag">Primary for this programme</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="adm-ment-modalactions">
          <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="adm-btn adm-ment-btn-outline" onClick={onConfirm}><Check size={14} /> {pm ? 'Confirm assignment' : 'Confirm reassignment'}</button>
        </div>
      </>
    )
  } else if (kind === 'deleteprog') {
    const m = dataId ? catalogues.find(x => x.id === dataId) : null
    content = (
      <>
        <div className="adm-ment-modalico red"><X size={28} /></div>
        <h3>Delete this draft?</h3>
        <p>{m?.title} will be permanently removed. This cannot be undone.</p>
        <div className="adm-ment-modalactions">
          <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="adm-btn adm-ment-btndanger" onClick={onConfirm}><X size={14} /> Delete</button>
        </div>
      </>
    )
  }

  return createPortal(
    <div className="adm-ment-overlay show" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="adm-ment-modal">{content}</div>
    </div>,
    document.body
  )
}

/* ============================================================
   MOBILE: PROGRAMME CARD (Active / Completed)
   ============================================================ */
function MobileProgCard({ p, onClick }: { p: Programme; onClick?: () => void }) {
  return (
    <div className={`adm-mob-ment-card adm-mob-card-anim${onClick ? '' : ' no-click'}`} onClick={onClick}>
      <div className="adm-mob-ment-pair">
        <span className="adm-mob-ment-pairname">{p.user}</span>
        <ArrowRight size={13} />
        <span className="adm-mob-ment-pairname">{p.mentorName}</span>
      </div>
      <div className="adm-mob-ment-title">{p.title}</div>
      <div className="adm-mob-ment-meta">{p.start} - {p.end}</div>
      <div className="adm-mob-ment-lastact">
        {p.status === 'completed' ? `Completed ${p.lastActivity}` : `Last activity: ${p.lastActivity}`}
      </div>
      {onClick && <span className="adm-mob-ment-viewlink">View programme <ArrowRight size={12} /></span>}
    </div>
  )
}

function MobileProgGrid({ programmes, status, onOpen }: { programmes: Programme[]; status: 'active' | 'completed'; onOpen?: (id: string) => void }) {
  const items = programmes.filter(p => p.status === status)
  if (items.length === 0) {
    return (
      <div className="adm-ment-empty">
        <div className="adm-ment-empty-ico"><Calendar size={36} /></div>
        <h3>No {status} programmes</h3>
        <p>Mentorship programmes with {status} status will appear here.</p>
      </div>
    )
  }
  return (
    <div className="adm-mob-ment-cards">
      {items.map((p, i) => (
        <MobileProgCard key={p.id} p={p} onClick={onOpen ? () => onOpen(p.id) : undefined} />
      ))}
    </div>
  )
}

/* ============================================================
   MOBILE: PENDING MATCHING
   ============================================================ */
function MobilePendingList({ pending, onAssign }: { pending: PendingMatch[]; onAssign: (id: string) => void }) {
  if (pending.length === 0) {
    return (
      <div className="adm-ment-empty">
        <div className="adm-ment-empty-ico"><Handshake size={36} /></div>
        <h3>No pending matches</h3>
        <p>Nothing is waiting on a mentor assignment right now.</p>
      </div>
    )
  }
  return (
    <div className="adm-mob-ment-pending">
      {pending.map((pm, i) => (
        <div key={pm.id} className="adm-mob-ment-pmrow adm-mob-card-anim" style={{ animationDelay: `${i * 40}ms` }}>
          <div className="adm-mob-ment-pmname">{pm.user}</div>
          <div className="adm-mob-ment-pmemail">{pm.userEmail}</div>
          <div className="adm-mob-ment-pmprog">{pm.programmeTitle}</div>
          <div className="adm-mob-ment-pmenroll adm-ment-mono">Enrolled {pm.enrollDate}</div>
          <button className="adm-btn adm-mob-ment-assign" onClick={() => onAssign(pm.id)}>
            <Handshake size={14} /> Assign mentor
          </button>
        </div>
      ))}
    </div>
  )
}

/* ============================================================
   MOBILE: PROGRAMME DETAIL
   ============================================================ */
function MobileProgDetail({ programmes, catalogues, progId, onBack, onComplete, onCancel, onReassign }: {
  programmes: Programme[]; catalogues: MpCatalog[];
  progId: string; onBack: () => void; onComplete: (id: string) => void; onCancel: (id: string) => void; onReassign: (id: string) => void
}) {
  const queryClient = useQueryClient()
  const [logFormOpen, setLogFormOpen] = useState(false)
  const [logDate, setLogDate] = useState('')
  const [logNotes, setLogNotes] = useState('')
  const p = programmes.find(x => x.id === progId)

  const { data: sessions = [] } = useQuery<ApiSession[]>({
    queryKey: ['mentorship-sessions', progId],
    queryFn: () => api.get(`/api/v1/mentorships/${progId}/sessions`).then(r => r.data.data),
    enabled: !!progId,
  })

  const scheduleSession = useMutation({
    mutationFn: (payload: { scheduledAt: string; notes?: string }) =>
      api.post(`/api/v1/mentorships/${progId}/sessions`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorship-sessions', progId] })
      setLogFormOpen(false)
      setLogDate('')
      setLogNotes('')
    },
  })

  const updateSession = useMutation({
    mutationFn: ({ sessionId, status }: { sessionId: string; status: 'completed' | 'cancelled' }) =>
      api.patch(`/api/v1/mentorships/sessions/${sessionId}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mentorship-sessions', progId] }),
  })

  if (!p) return null
  const mentor = catalogues.find(m => m.id === p.mentorId)
  const terminal = p.status === 'completed' || p.status === 'cancelled'

  return (
    <div className="adm-mob-ment-detail">
      <div className="adm-mob-ment-detail-head">
        <button className="adm-mob-con-back" onClick={onBack}><ArrowLeft size={20} /></button>
        <span className="adm-mob-ment-detail-title">{p.title}</span>
        <ProgStatusBadge status={p.status} />
      </div>

      <div className="adm-mob-ment-detail-body">
        <div className="adm-mob-ment-detail-card">
          <div className="adm-ment-sbh">User</div>
          <div className="adm-ment-sdrow">
            <div className="adm-ment-avatar">{getInitials(p.user)}</div>
            <div><div className="adm-ment-sdname">{p.user}</div><div className="adm-ment-sdemail">{p.userEmail}</div></div>
          </div>
        </div>

        <div className="adm-mob-ment-detail-card">
          <div className="adm-ment-sbh">Mentor</div>
          <div className="adm-ment-sdrow">
            <div className="adm-ment-avatar">{getInitials(p.mentorName)}</div>
            <div><div className="adm-ment-sdname">{p.mentorName}</div><div className="adm-ment-sdemail">{mentor?.title || ''}</div></div>
          </div>
          <span className="adm-ment-sdviewlink">View programme listing <ArrowRight size={13} /></span>
          {p.status === 'active' && (
            <button className="adm-btn adm-ment-btn-outline adm-btn-sm" style={{ marginTop: 12 }} onClick={() => onReassign(p.id)}>
              <Handshake size={13} /> Reassign mentor
            </button>
          )}
        </div>

        <div className="adm-mob-ment-detail-card">
          <div className="adm-ment-sbh">Session log</div>
          {sessions.map(s => (
            <div key={s.id} className="adm-mob-ment-logrow">
              <div className="adm-mob-ment-logdate adm-ment-mono">
                {new Date(s.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="adm-mob-ment-lognotes">{s.notes || '-'}</div>
              {s.status === 'scheduled' ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" style={{ fontSize: 11 }} onClick={() => updateSession.mutate({ sessionId: s.id, status: 'completed' })}>
                    <Check size={11} /> Done
                  </button>
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" style={{ fontSize: 11 }} onClick={() => updateSession.mutate({ sessionId: s.id, status: 'cancelled' })}>
                    <X size={11} /> Cancel
                  </button>
                </div>
              ) : (
                <LogStatusBadge status={s.status === 'completed' ? 'completed' : 'missed'} />
              )}
            </div>
          ))}
          {logFormOpen && (
            <div className="adm-mob-ment-logform">
              <input className="adm-ment-inp" type="datetime-local" value={logDate} onChange={e => setLogDate(e.target.value)} />
              <textarea
                className="adm-ment-ta"
                rows={2}
                placeholder="Session notes..."
                value={logNotes}
                onChange={e => setLogNotes(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="adm-btn adm-ment-btn-outline adm-btn-sm"
                  disabled={!logDate || scheduleSession.isPending}
                  onClick={() => scheduleSession.mutate({ scheduledAt: new Date(logDate).toISOString(), notes: logNotes || undefined })}
                >
                  <Check size={13} /> Save
                </button>
                <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => { setLogFormOpen(false); setLogDate(''); setLogNotes('') }}>Cancel</button>
              </div>
            </div>
          )}
          {!logFormOpen && !terminal && (
            <button className="adm-mob-ment-addlog" onClick={() => setLogFormOpen(true)}><Plus size={15} /> Add session log</button>
          )}
        </div>

        <div className="adm-mob-ment-detail-card">
          <div className="adm-ment-sbh">Status and actions</div>
          {terminal ? (
            <div className="adm-ment-terminalnote">{p.status === 'completed' ? 'This programme has been completed.' : 'This programme was cancelled.'}</div>
          ) : (
            <div className="adm-mob-ment-detail-actions">
              <button className="adm-mob-ment-btn-complete" onClick={() => onComplete(p.id)}>
                <CheckCircle size={14} /> Complete programme
              </button>
              <button className="adm-mob-ment-btn-cancel" onClick={() => onCancel(p.id)}>
                <XCircle size={14} /> Cancel programme
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   MOBILE: CATALOGUE LIST
   ============================================================ */
function MobileCatalogList({ catalogues, onEdit, onNew, onDelete }: { catalogues: MpCatalog[]; onEdit: (id: string) => void; onNew: () => void; onDelete: (id: string) => void }) {
  return (
    <div className="adm-mob-ment-catlist">
      <div className="adm-mob-ment-catcount">{catalogues.length} mentorship programme{catalogues.length !== 1 ? 's' : ''}</div>
      <div className="adm-mob-ment-catcards">
        {catalogues.map((m, i) => (
          <div key={m.id} className="adm-mob-ment-catcard adm-mob-card-anim" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="adm-mob-ment-catcard-top">
              <CatStatusBadge status={m.status} />
            </div>
            <div className="adm-ment-cnspecialty">{m.title}</div>
            <div className="adm-ment-cnduration"><span className="adm-ment-mono">{m.fee ? '$' + m.fee + '/mo' : 'Price not set'}</span></div>
            <div className="adm-mob-ment-catcard-actions">
              <span className="adm-ment-cnact" onClick={() => onEdit(m.id)}><Edit3 size={13} /> Edit</span>
              {m.status === 'published' && <span className="adm-ment-cnact">Unpublish</span>}
              {m.status === 'draft' && <span className="adm-ment-cnact danger" onClick={() => onDelete(m.id)}>Delete</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ============================================================
   MOBILE: CATALOGUE STEPPER FORM
   ============================================================ */
const MENT_STEPS = ['Header & title', 'Description & tags', 'Pricing & inclusions']

function MobileCatalogForm({ catalogues, catalogId, onBack }: { catalogues: MpCatalog[]; catalogId: string | null; onBack: () => void }) {
  const queryClient = useQueryClient()
  const editing = !!catalogId
  const m = editing ? catalogues.find(x => x.id === catalogId) : null
  const [step, setStep] = useState(1)
  const [title, setTitle] = useState(m?.title ?? '')
  const [desc, setDesc] = useState(m?.desc ?? '')
  const [fee, setFee] = useState(m?.fee ? String(m.fee) : '')
  const [included, setIncluded] = useState<string[]>(m?.included ?? [])
  const [tags, setTags] = useState<string[]>(m?.tags ?? [])
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(m?.headerImageUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => editing
      ? api.patch(`/api/v1/admin/mentorship-programmes/${catalogId}`, payload)
      : api.post('/api/v1/admin/mentorship-programmes', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-mentorship-programmes'] })
      onBack()
    },
    onError: (err: unknown) => setSaveError(extractApiError(err, 'Failed to save. Please try again.')),
  })

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post<{ data: { url: string } }>('/api/v1/admin/mentor-header-upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setHeaderImageUrl(res.data.data.url)
    } catch {
      setUploadError('Upload failed. Try again.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handleSave(publish: boolean) {
    setSaveError('')
    const monthlyPriceUsd = Math.round(parseFloat(fee) * 100)
    if (!title.trim()) return setSaveError('Programme title is required.')
    if (!desc.trim()) return setSaveError('Description is required.')
    if (isNaN(monthlyPriceUsd) || monthlyPriceUsd <= 0) return setSaveError('A valid price is required.')
    saveMutation.mutate({
      title: title.trim(),
      description: desc.trim(),
      monthlyPriceUsd,
      headerImageUrl: headerImageUrl ?? null,
      active: publish,
    })
  }

  const filename = headerImageUrl ? headerImageUrl.split('/').pop() : null

  return (
    <div className="adm-mob-ment-form">
      <div className="adm-mob-ment-form-head">
        <button className="adm-mob-con-back" onClick={onBack}><ArrowLeft size={20} /></button>
        <span className="adm-mob-ment-form-title">{editing ? `Editing: ${m!.title}` : 'New programme'}</span>
      </div>

      <div className="adm-mob-prail">
        {[1, 2, 3].map(n => (
          <button
            key={n}
            className={`adm-mob-prail-seg${n === step ? ' active' : ''}${n < step ? ' done' : ''}`}
            onClick={() => setStep(n)}
          />
        ))}
      </div>

      <div className="adm-mob-ment-form-body">
        {step === 1 && (
          <div className="adm-mob-ment-form-step">
            <h2 className="adm-mob-ment-step-title">{MENT_STEPS[0]}</h2>
            <div className="adm-ment-field">
              <label className="adm-ment-fieldlabel">Header/thematic image</label>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFileChange} />
              <div
                className={`adm-ment-dropzone${filename ? ' has-file' : ''}`}
                onClick={() => !uploading && fileRef.current?.click()}
                style={{ cursor: uploading ? 'default' : 'pointer' }}
              >
                {uploading
                  ? <><Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /><div className="adm-ment-dzlabel">Uploading...</div></>
                  : filename
                    ? <><ImageIcon size={20} /><div><div className="adm-ment-dzname">{filename}</div><div className="adm-ment-dzsub">Tap to replace</div></div></>
                    : <><Upload size={20} /><div className="adm-ment-dzlabel">Tap to upload a header image</div><div className="adm-ment-dzsub">JPEG, PNG or WebP - max 5MB</div></>
                }
              </div>
              {uploadError && <p style={{ color: 'var(--adm-danger)', fontSize: 12, margin: '4px 0 0' }}>{uploadError}</p>}
              {headerImageUrl && (
                <img src={headerImageUrl} alt="" style={{ marginTop: 8, width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 8 }} />
              )}
            </div>
            <div className="adm-ment-field"><label className="adm-ment-fieldlabel">Programme title <span className="adm-ment-req">*</span></label><input className="adm-ment-inp" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 30-Day Personalized Mentorship" /></div>
            <button className="adm-mob-ment-nextsec" onClick={() => setStep(2)}>Next section <ArrowRight size={14} /></button>
          </div>
        )}

        {step === 2 && (
          <div className="adm-mob-ment-form-step">
            <h2 className="adm-mob-ment-step-title">{MENT_STEPS[1]}</h2>
            <div className="adm-ment-field"><label className="adm-ment-fieldlabel">Programme description</label><textarea className="adm-ment-ta" rows={4} placeholder="A short paragraph shown on the catalog card..." value={desc} onChange={e => setDesc(e.target.value)} /></div>
            <div className="adm-ment-field">
              <label className="adm-ment-fieldlabel">Specialty tags</label>
              {tags.map((t, i) => (
                <div key={i} className="adm-ment-rrow">
                  <input className="adm-ment-inp" value={t} onChange={e => setTags(prev => prev.map((v, j) => j === i ? e.target.value : v))} placeholder="e.g. Scholarship strategy" />
                  <button className="adm-ment-iconbtn sm" onClick={() => setTags(prev => prev.filter((_, j) => j !== i))}><X size={13} /></button>
                </div>
              ))}
              <span className="adm-ment-addlink" onClick={() => setTags(prev => [...prev, ''])}><Plus size={15} /> Add tag</span>
            </div>
            <button className="adm-mob-ment-nextsec" onClick={() => setStep(3)}>Next section <ArrowRight size={14} /></button>
          </div>
        )}

        {step === 3 && (
          <div className="adm-mob-ment-form-step">
            <h2 className="adm-mob-ment-step-title">{MENT_STEPS[2]}</h2>
            <div className="adm-ment-field">
              <label className="adm-ment-fieldlabel">Monthly fee (USD) <span className="adm-ment-req">*</span></label>
              <div className="adm-ment-priceinput"><span className="adm-ment-pfx">$</span><input className="adm-ment-inp" type="number" min={1} value={fee} onChange={e => setFee(e.target.value)} placeholder="250" /></div>
            </div>
            <div className="adm-ment-field">
              <label className="adm-ment-fieldlabel">What&apos;s included</label>
              {included.map((it, i) => (
                <div key={i} className="adm-ment-rrow">
                  <input className="adm-ment-inp" value={it} onChange={e => setIncluded(prev => prev.map((v, j) => j === i ? e.target.value : v))} placeholder="e.g. Weekly structured check-ins" />
                  <button className="adm-ment-iconbtn sm" onClick={() => setIncluded(prev => prev.filter((_, j) => j !== i))}><X size={13} /></button>
                </div>
              ))}
              <span className="adm-ment-addlink" onClick={() => setIncluded(prev => [...prev, ''])}><Plus size={15} /> Add item</span>
            </div>
            {saveError && <p style={{ color: 'var(--adm-danger)', fontSize: 13, margin: '4px 0 0' }}>{saveError}</p>}
          </div>
        )}
      </div>

      <div className="adm-mob-ment-form-footer">
        <button className="adm-btn adm-btn-ghost" onClick={onBack}>Cancel</button>
        <button className="adm-btn adm-ment-btnoutline" disabled={saveMutation.isPending} onClick={() => handleSave(false)}>Save as draft</button>
        <button className="adm-btn adm-ment-btn-outline" disabled={saveMutation.isPending || uploading} onClick={() => handleSave(true)}>
          {saveMutation.isPending ? 'Saving...' : editing ? 'Save changes' : 'Publish'}
        </button>
      </div>
    </div>
  )
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
function MentorSkeleton() {
  return (
    <div className="adm-ment-wrap">
      <div className="adm-page-head">
        <div><div className="adm-skel adm-skel-line w25" style={{ height: 24, marginBottom: 8 }} /><div className="adm-skel adm-skel-line w15" style={{ height: 13 }} /></div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 20 }}>
        {[60, 90, 80].map((w, i) => <div key={i} className="adm-skel adm-skel-pill" style={{ width: w }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {[0, 1, 2].map(i => <div key={i} className="adm-skel" style={{ height: 88, borderRadius: 12 }} />)}
      </div>
      <div className="adm-skeleton-table">
        <div className="adm-skeleton-filter">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="adm-skel adm-skel-pill" />)}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="adm-skeleton-row">
            <div className="adm-skel adm-skel-circle" />
            <div className="adm-skel-block">
              <div className="adm-skel adm-skel-line w60" style={{ height: 14 }} />
              <div className="adm-skel adm-skel-line w40" style={{ height: 10 }} />
            </div>
            <div className="adm-skel adm-skel-badge" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdminMentorshipPage() {
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('active')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [mpView, setMpView] = useState<MpView>('grid')
  const [editingMp, setEditingMp] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalKind>(null)
  const [modalData, setModalData] = useState<string | null>(null)
  const [mobDetailId, setMobDetailId] = useState<string | null>(null)

  const { data: mentorshipsData, isLoading: loadingM } = useQuery<{ data: ApiMentorship[]; total: number }>({
    queryKey: ['admin-mentorships'],
    queryFn: () => api.get('/api/v1/admin/mentorships', { params: { limit: 100 } }).then(r => r.data),
  })

  const { data: profilesData, isLoading: loadingP } = useQuery<{ data: ApiMentorProfile[] }>({
    queryKey: ['admin-mentor-profiles'],
    queryFn: () => api.get('/api/v1/admin/mentor-profiles').then(r => r.data),
  })

  const { data: programmesData, isLoading: loadingProg } = useQuery<{ data: ApiProgramme[] }>({
    queryKey: ['admin-mentorship-programmes'],
    queryFn: () => api.get('/api/v1/admin/mentorship-programmes').then(r => r.data),
  })

  const allMentorships = mentorshipsData?.data ?? []
  const programmes: Programme[] = allMentorships.map(mentorshipToUi)
  const pending: PendingMatch[] = allMentorships.filter(m => m.status === 'pending').map(mentorshipToPending)
  const catalogues: MpCatalog[] = (programmesData?.data ?? []).map(apiProgrammeToUi)

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/v1/admin/mentorships/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-mentorships'] }),
  })

  const openModal = useCallback((kind: ModalKind, id: string | null = null) => { setModal(kind); setModalData(id) }, [])
  const closeModal = useCallback(() => { setModal(null); setModalData(null) }, [])

  const handleOpenProgramme = useCallback((id: string) => {
    if (isMobile) setMobDetailId(id)
    else setDetailId(id)
  }, [isMobile])

  const handleConfirm = useCallback(() => {
    if (modal === 'complete' && modalData) {
      statusMutation.mutate({ id: modalData, status: 'completed' })
    } else if (modal === 'cancel' && modalData) {
      statusMutation.mutate({ id: modalData, status: 'cancelled' })
    }
    closeModal()
    if (modal === 'complete' || modal === 'cancel') { setDetailId(null); setMobDetailId(null) }
  }, [modal, modalData, closeModal])

  if (loadingM || loadingP || loadingProg) return <MentorSkeleton />

  if (isMobile && mobDetailId) {
    return (
      <div className="adm-ment-wrap">
        <MobileProgDetail
          programmes={programmes}
          catalogues={catalogues}
          progId={mobDetailId}
          onBack={() => setMobDetailId(null)}
          onComplete={(id) => openModal('complete', id)}
          onCancel={(id) => openModal('cancel', id)}
          onReassign={(id) => openModal('assign', id)}
        />
        <MentorshipModal programmes={programmes} pending={pending} catalogues={catalogues} kind={modal} dataId={modalData} onClose={closeModal} onConfirm={handleConfirm} />
      </div>
    )
  }

  if (isMobile && tab === 'programmes' && mpView === 'form') {
    return (
      <div className="adm-ment-wrap">
        <MobileCatalogForm catalogues={catalogues} catalogId={editingMp} onBack={() => setMpView('grid')} />
      </div>
    )
  }

  return (
    <div className="adm-ment-wrap">
      <div className="adm-ment-head">
        <div><h1>Mentorship</h1><span className="adm-ment-headsub">Manage programmes</span></div>
      </div>
      <div className="adm-ment-content">
        {!detailId && (
          <div className="adm-ment-tabs">
            <div className={`adm-ment-tab${tab === 'active' ? ' active' : ''}`} onClick={() => { setTab('active'); setMpView('grid') }}>Active</div>
            <div className={`adm-ment-tab${tab === 'pending' ? ' active' : ''}`} onClick={() => { setTab('pending'); setMpView('grid') }}>{isMobile ? 'Pending' : 'Pending matching'}</div>
            <div className={`adm-ment-tab${tab === 'completed' ? ' active' : ''}`} onClick={() => { setTab('completed'); setMpView('grid') }}>Completed</div>
            <div className={`adm-ment-tab${tab === 'programmes' ? ' active' : ''}`} onClick={() => { setTab('programmes'); setMpView('grid') }}>{isMobile ? 'Programmes' : 'Mentorship Programmes'}</div>
          </div>
        )}

        {!isMobile && tab === 'active' && !detailId && <ProgGrid programmes={programmes} status="active" onOpen={setDetailId} />}
        {!isMobile && tab === 'active' && detailId && (
          <ProgDetail
            programmes={programmes}
            catalogues={catalogues}
            progId={detailId}
            onBack={() => setDetailId(null)}
            onComplete={(id) => openModal('complete', id)}
            onCancel={(id) => openModal('cancel', id)}
            onReassign={(id) => openModal('assign', id)}
          />
        )}
        {!isMobile && tab === 'completed' && <ProgGrid programmes={programmes} status="completed" />}
        {!isMobile && tab === 'pending' && <PendingList pending={pending} onAssign={(id) => openModal('assign', id)} />}
        {!isMobile && tab === 'programmes' && mpView === 'grid' && (
          <CatalogGrid
            catalogues={catalogues}
            onEdit={(id) => { setEditingMp(id); setMpView('form') }}
            onNew={() => { setEditingMp(null); setMpView('form') }}
            onDelete={(id) => openModal('deleteprog', id)}
          />
        )}
        {!isMobile && tab === 'programmes' && mpView === 'form' && (
          <CatalogForm catalogues={catalogues} catalogId={editingMp} onBack={() => setMpView('grid')} />
        )}

        {isMobile && tab === 'active' && <MobileProgGrid programmes={programmes} status="active" onOpen={handleOpenProgramme} />}
        {isMobile && tab === 'completed' && <MobileProgGrid programmes={programmes} status="completed" />}
        {isMobile && tab === 'pending' && <MobilePendingList pending={pending} onAssign={(id) => openModal('assign', id)} />}
        {isMobile && tab === 'programmes' && mpView === 'grid' && (
          <MobileCatalogList
            catalogues={catalogues}
            onEdit={(id) => { setEditingMp(id); setMpView('form') }}
            onNew={() => { setEditingMp(null); setMpView('form') }}
            onDelete={(id) => openModal('deleteprog', id)}
          />
        )}
      </div>

      {isMobile && tab === 'programmes' && mpView === 'grid' && (
        <button className="adm-fab" onClick={() => { setEditingMp(null); setMpView('form') }}><Plus size={26} /></button>
      )}

      <MentorshipModal programmes={programmes} pending={pending} catalogues={catalogues} kind={modal} dataId={modalData} onClose={closeModal} onConfirm={handleConfirm} />
    </div>
  )
}
