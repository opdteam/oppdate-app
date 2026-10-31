'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { createPortal } from 'react-dom'
import {
  Search, X, Check, ChevronLeft, ChevronRight, ChevronDown, Plus, ArrowRight,
  AlertTriangle, CheckCircle, XCircle, Video, Copy, Edit3, Calendar, List,
  ArrowLeft, Info, Trash2, Clock,
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

type SessionStatus = 'upcoming' | 'completed' | 'cancelled'
type MeetingType = 'meet' | 'zoom' | null
type Tab = 'calendar' | 'list' | 'sessions'
type CalView = 'month' | 'week'

type ApiConsultationSession = {
  id: string
  title: string
  description: string | null
  durationMinutes: number
  priceUsd: number
  active: boolean
  groupKey: string | null
  totalSlots?: number
  claimedSlots?: number
  createdAt: string
  updatedAt: string
}

type Session = {
  id: string; sessionTitle: string; name: string; email: string; country: string
  scheduledAt: string; day: number; month: number; year: number
  hour: string; dur: number; type: MeetingType; status: SessionStatus
  link: string; price: string; bookedDate: string; notes: string; within24h: boolean
  userId: string; avatarUrl: string | null
}

const DOWS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CAL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

// API types
type ApiConsultation = {
  id: string; durationMinutes: number; priceUsd: number; scheduledAt: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  meetingLink: string | null; meetingType: 'google_meet' | 'zoom' | null
  notes: string | null; createdAt: string; updatedAt: string
  userId: string; userName: string | null; userEmail: string | null; userAvatarUrl: string | null
  sessionId: string | null; sessionTitle: string | null
}

function apiConsToSession(a: ApiConsultation): Session {
  const dt = new Date(a.scheduledAt)
  const statusMap: Record<string, SessionStatus> = {
    pending: 'upcoming', confirmed: 'upcoming', completed: 'completed', cancelled: 'cancelled'
  }
  const now = new Date()
  const hoursUntil = (dt.getTime() - now.getTime()) / 3600000
  return {
    id: a.id,
    sessionTitle: a.sessionTitle || '-',
    name: a.userName || a.userEmail || 'Unknown',
    email: a.userEmail || '',
    country: '',
    scheduledAt: a.scheduledAt,
    day: dt.getDate(),
    month: dt.getMonth(),
    year: dt.getFullYear(),
    hour: dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    dur: a.durationMinutes,
    type: a.meetingType === 'google_meet' ? 'meet' : a.meetingType === 'zoom' ? 'zoom' : null,
    status: statusMap[a.status] ?? 'upcoming',
    link: a.meetingLink || '',
    price: '$' + (a.priceUsd / 100).toFixed(0),
    bookedDate: new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    notes: a.notes || '',
    within24h: hoursUntil > 0 && hoursUntil < 24 && !a.meetingLink,
    userId: a.userId,
    avatarUrl: a.userAvatarUrl,
  }
}

function getInitials(name: string) { return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() }

function StatusBadge({ status }: { status: SessionStatus }) {
  const map = { upcoming: ['Upcoming', 'adm-cons-badge-upcoming'], completed: ['Completed', 'adm-cons-badge-completed'], cancelled: ['Cancelled', 'adm-cons-badge-cancelled'] }
  const [label, cls] = map[status]
  return <span className={`adm-cons-badge ${cls}`}>{label}</span>
}

function TypeBadge({ type }: { type: MeetingType }) {
  if (!type) return <span style={{ color: 'var(--adm-t-low)', fontSize: 12 }}>Not set yet</span>
  return type === 'meet'
    ? <span className="adm-cons-badge adm-cons-badge-meet">Google Meet</span>
    : <span className="adm-cons-badge adm-cons-badge-zoom">Zoom</span>
}

function ZoomIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.2" />
      <path d="M8 10.5v3a.7.7 0 0 0 .7.7h4.6a.7.7 0 0 0 .7-.7v-3a.7.7 0 0 0-.7-.7H8.7a.7.7 0 0 0-.7.7Z" />
      <path d="m15 11.5 2.3-1.4a.5.5 0 0 1 .7.4v2.6a.5.5 0 0 1-.7.4L15 12.5" />
    </svg>
  )
}

/* ============================================================
   CALENDAR VIEW
   ============================================================ */
function CalendarView({ sessions, onOpenSession, onPickDay, onClearPickedDay, pickedDay }: { sessions: Session[]; onOpenSession: (id: string) => void; onPickDay?: (dateStr: string) => void; onClearPickedDay?: () => void; pickedDay?: string | null }) {
  const [calView, setCalView] = useState<CalView>('month')
  const now = new Date()

  const { data: allSlotsData } = useQuery<{ data: Array<{ id: string; startsAt: string; claimed: boolean }> }>({
    queryKey: ['admin-all-slots'],
    queryFn: () => api.get('/api/v1/admin/consultation-slots').then(r => r.data),
    staleTime: 30_000,
  })
  const slotDays = new Set((allSlotsData?.data ?? []).map(s => s.startsAt.slice(0, 10)))
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const todayY = now.getFullYear()
  const todayM = now.getMonth()
  const todayD = now.getDate()

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }
  function goToday() { setViewYear(todayY); setViewMonth(todayM); if (onClearPickedDay) onClearPickedDay() }

  // Sessions visible in current view: same year+month (month view) or same week (week view)
  const firstDow = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  // Week view: week containing today (or viewMonth's first day if different month)
  const refDay = (viewYear === todayY && viewMonth === todayM) ? todayD : 1
  const weekStart = refDay - new Date(viewYear, viewMonth, refDay).getDay()

  const sessionsByDay: Record<number, Session[]> = {}
  sessions.forEach(s => {
    if (s.year === viewYear && s.month === viewMonth) {
      const k = s.day
      if (!sessionsByDay[k]) sessionsByDay[k] = []
      sessionsByDay[k].push(s)
    }
  })

  // For week view, also include days that spill into prev/next month
  if (calView === 'week') {
    sessions.forEach(s => {
      const dt = new Date(s.scheduledAt)
      const d = dt.getDate()
      const mo = dt.getMonth()
      const yr = dt.getFullYear()
      for (let i = 0; i < 7; i++) {
        const wd = new Date(viewYear, viewMonth, weekStart + i)
        if (wd.getDate() === d && wd.getMonth() === mo && wd.getFullYear() === yr) {
          const k = weekStart + i
          if (!sessionsByDay[k]) sessionsByDay[k] = []
          if (!sessionsByDay[k].find(x => x.id === s.id)) sessionsByDay[k].push(s)
        }
      }
    })
  }

  const monthSessionCount = sessions.filter(s => s.year === viewYear && s.month === viewMonth).length

  function renderBlock(s: Session) {
    const missingWarn = s.within24h && !s.link
    const tip = `${s.hour} · ${s.dur} min · ${s.sessionTitle}`
    const isPast = new Date(s.scheduledAt) < now
    return (
      <div
        key={s.id}
        className={`adm-cons-calblock status-${s.status}${missingWarn ? ' link-missing' : ''}${isPast ? ' past' : ''}`}
        onClick={(e) => { e.stopPropagation(); onOpenSession(s.id) }}
        title={tip}
      >
        {missingWarn && <span className="adm-cons-calwarn"><AlertTriangle size={11} /></span>}
        {s.type && <span className="adm-cons-caltype">{s.type === 'meet' ? <Video size={10} /> : <ZoomIcon size={10} />}</span>}
        <span className="adm-cons-calname">{s.name}</span>
        <span className="adm-cons-caldur">{s.dur}m</span>
        <span className="adm-cons-caltip">{tip}</span>
      </div>
    )
  }

  const cells: { day: number; inMonth: boolean }[] = []
  if (calView === 'week') {
    for (let i = 0; i < 7; i++) {
      const dt = new Date(viewYear, viewMonth, weekStart + i)
      cells.push({ day: weekStart + i, inMonth: dt.getMonth() === viewMonth })
    }
  } else {
    for (let i = 0; i < firstDow; i++) cells.push({ day: 0, inMonth: false })
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, inMonth: true })
  }

  return (
    <div className="adm-cons-calcard">
      <div className="adm-cons-calhead">
        <span className="adm-cons-caltitle">{CAL_MONTHS[viewMonth]} {viewYear}</span>
        <span className="adm-cons-calcount">{monthSessionCount} session{monthSessionCount !== 1 ? 's' : ''} this month</span>
        <div className="adm-cons-caltoggle">
          <div className={`adm-cons-segopt${calView === 'month' ? ' on' : ''}`} onClick={() => setCalView('month')}>Month</div>
          <div className={`adm-cons-segopt${calView === 'week' ? ' on' : ''}`} onClick={() => setCalView('week')}>Week</div>
        </div>
        <button className="adm-cons-todaybtn" onClick={goToday}>Today</button>
        <button className="adm-cons-navbtn" onClick={prevMonth}><ChevronLeft size={15} /></button>
        <button className="adm-cons-navbtn" onClick={nextMonth}><ChevronRight size={15} /></button>
      </div>
      <div className="adm-cons-callegend">
        <span className="adm-cons-legitem"><span className="adm-cons-legdot" style={{ background: '#C4843A' }} />Upcoming</span>
        <span className="adm-cons-legitem"><span className="adm-cons-legdot" style={{ background: '#34D399' }} />Completed</span>
        <span className="adm-cons-legitem"><span className="adm-cons-legdot" style={{ background: '#F87171' }} />Cancelled</span>
        <span className="adm-cons-legsep" />
        <span className="adm-cons-legitem"><Video size={13} /> Google Meet</span>
        <span className="adm-cons-legitem"><ZoomIcon /> Zoom</span>
        <span className="adm-cons-legsep" />
        <span className="adm-cons-legitem"><span style={{ display: 'inline-block', width: 16, height: 2.5, borderRadius: 2, background: '#C4843A', verticalAlign: 'middle', marginRight: 2 }} />Slots set</span>
      </div>
      <div className={`adm-cons-calgrid${calView === 'week' ? ' adm-cons-calgrid-week' : ''}`}>
        {DOWS.map((d, i) => <div key={d} className={`adm-cons-caldow${i === 0 || i === 6 ? ' weekend' : ''}`}>{d}</div>)}
        {cells.map((c, i) => {
          const dowIdx = i % 7
          const isWeekend = dowIdx === 0 || dowIdx === 6
          if (!c.inMonth && calView !== 'week') return <div key={`b${i}`} className={`adm-cons-calcell other-month${isWeekend ? ' weekend' : ''}`} />
          const isToday = c.day === todayD && viewMonth === todayM && viewYear === todayY
          const cellDate = new Date(viewYear, viewMonth, c.day)
          cellDate.setHours(23, 59, 59)
          const isPast = cellDate < now
          const daySessions = sessionsByDay[c.day] || []
          const cellDateStr = c.day > 0 ? `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(c.day).padStart(2, '0')}` : ''
          const isCellPicked = pickedDay === cellDateStr && c.day > 0
          const hasSlots = c.day > 0 && slotDays.has(cellDateStr)
          return (
            <div
              key={`${c.day}-${i}`}
              className={`adm-cons-calcell${calView === 'week' ? ' adm-cons-calcell-week' : ''}${isToday ? ' today' : ''}${isPast ? ' past-cell' : ''}${isWeekend ? ' weekend' : ''}${!c.inMonth ? ' other-month' : ''}${isCellPicked ? ' slot-picked' : ''}`}
              onClick={() => { if (c.day > 0 && !isPast && onPickDay) onPickDay(cellDateStr) }}
              style={{ cursor: c.day > 0 && !isPast && onPickDay ? 'pointer' : undefined }}
            >
              <span className="adm-cons-caldaynum">{c.day > 0 ? c.day : ''}</span>
              {hasSlots && <span className="adm-cons-cal-slotdot" title="Slots available" />}
              {daySessions.map(renderBlock)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ============================================================
   LIST VIEW
   ============================================================ */
function ListView({ sessions, onOpenSession }: { sessions: Session[]; onOpenSession: (id: string) => void }) {
  const [filter, setFilter] = useState<'all' | SessionStatus>('all')
  const [search, setSearch] = useState('')

  const counts = { all: sessions.length, upcoming: 0, completed: 0, cancelled: 0 }
  sessions.forEach(s => { counts[s.status]++ })

  const filtered = sessions.filter(s => {
    if (filter !== 'all' && s.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <>
      <div className="adm-cons-filterbar">
        <div className="adm-cons-pills">
          {([['all', 'All'], ['upcoming', 'Upcoming'], ['completed', 'Completed'], ['cancelled', 'Cancelled']] as const).map(([k, lbl]) => (
            <button key={k} className={`adm-cons-pill${filter === k ? ' active' : ''}`} onClick={() => setFilter(k)}>
              {lbl}<span className="adm-cons-pillcnt">{counts[k]}</span>
            </button>
          ))}
        </div>
        <div className="adm-cons-search"><Search size={15} /><input placeholder="Search by user name or email..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>
      {filtered.length === 0 ? (
        <div className="adm-cons-empty">
          <div className="adm-cons-empty-ico"><Calendar size={36} /></div>
          <h3>No bookings yet</h3>
          <p>Consultation bookings will appear here once users schedule sessions.</p>
        </div>
      ) : (
        <table className="adm-cons-table">
          <thead><tr><th>User</th><th>Session</th><th>Date & time</th><th>Duration</th><th>Type</th><th>Meeting link</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(s => {
              const missingWarn = !s.link && s.within24h
              return (
                <tr key={s.id} className={missingWarn ? 'link-missing' : undefined} onClick={() => onOpenSession(s.id)}>
                  <td><div className="adm-cons-uname">{s.name}</div><div className="adm-cons-uemail">{s.email}</div></td>
                  <td><div className="adm-cons-uname" style={{ fontSize: 12 }}>{s.sessionTitle}</div></td>
                  <td className="adm-cons-mono">{new Date(s.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, {s.hour}</td>
                  <td>{s.dur} min</td>
                  <td><TypeBadge type={s.type} /></td>
                  <td>{s.link ? <span className="adm-cons-linkstat set"><CheckCircle size={13} /> Link set</span> : <span className="adm-cons-linkstat missing"><AlertTriangle size={13} /> Missing</span>}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>
                    <div className="adm-cons-rowacts">
                      <span className="adm-cons-rowact" onClick={(e) => { e.stopPropagation(); onOpenSession(s.id) }}>View</span>
                      {s.status === 'upcoming' && <span className="adm-cons-rowact">Mark completed</span>}
                      {s.status === 'upcoming' && <span className="adm-cons-rowact danger">Cancel</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </>
  )
}

/* ============================================================
   SESSION DETAIL SIDEBAR
   ============================================================ */
function SessionSidebar({ sessions, sessionId, onClose, onCancel, onSessionUpdate }: { sessions: Session[]; sessionId: string | null; onClose: () => void; onCancel: (id: string) => void; onSessionUpdate?: () => void }) {
  const queryClient = useQueryClient()
  const [linkFormOpen, setLinkFormOpen] = useState(false)
  const [linkJustSaved, setLinkJustSaved] = useState(false)
  const [linkType, setLinkType] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)

  const s = sessionId ? sessions.find(x => x.id === sessionId) : null

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/api/v1/admin/consultations/${sessionId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-consultations'] })
      if (onSessionUpdate) onSessionUpdate()
    },
  })

  useEffect(() => {
    setLinkFormOpen(false)
    setLinkJustSaved(false)
    setLinkType('')
    setLinkUrl('')
    setNotes(s?.notes || '')
    setNotesSaved(false)
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleNotesSave() {
    if (!s || notes === (s.notes || '')) return
    updateMutation.mutate({ notes })
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  useEffect(() => {
    if (!sessionId) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [sessionId, onClose])

  if (!s) {
    return (
      <>
        <div className={`adm-qv-backdrop${sessionId ? ' show' : ''}`} onClick={onClose} />
        <div className={`adm-qv${sessionId ? ' show' : ''}`} />
      </>
    )
  }

  const terminal = s.status !== 'upcoming'
  const canSave = linkType && linkUrl.trim()

  function handleSaveLink() {
    if (!canSave || !s) return
    const meetingTypeApi = linkType === 'meet' ? 'google_meet' : 'zoom'
    const rawLink = linkUrl.trim()
    const meetingLink = rawLink.startsWith('http://') || rawLink.startsWith('https://') ? rawLink : `https://${rawLink}`
    updateMutation.mutate({ meetingLink, meetingType: meetingTypeApi })
    setLinkFormOpen(false)
    setLinkJustSaved(true)
    setTimeout(() => setLinkJustSaved(false), 1800)
  }

  function handleMarkComplete() {
    if (!s) return
    updateMutation.mutate({ status: 'completed' })
    onClose()
  }

  const linkBlock = linkFormOpen ? (
    <div className="adm-cons-linkeditform">
      <CustomSelect
        value={linkType}
        placeholder="Select meeting type..."
        options={[
          { value: 'meet', label: 'Google Meet' },
          { value: 'zoom', label: 'Zoom' },
        ]}
        onChange={setLinkType}
      />
      <input className="adm-cons-inp" placeholder="https://meet.google.com/..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="adm-btn adm-cons-btn-outline adm-btn-sm" disabled={!canSave} onClick={handleSaveLink}><Check size={13} /> Save</button>
        <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setLinkFormOpen(false)}>Cancel</button>
      </div>
    </div>
  ) : linkJustSaved ? (
    <div className="adm-cons-linksaved"><CheckCircle size={15} /> Link saved, email sent to {s.name}.</div>
  ) : s.link ? (
    <div className="adm-cons-linksetrow">
      <span className="adm-cons-linkurl">{s.link}</span>
      <button className="adm-cons-iconbtn" title="Copy" onClick={() => navigator.clipboard.writeText(s.link).catch(() => {})}><Copy size={13} /></button>
      <button className="adm-cons-iconbtn" title="Edit" onClick={() => { setLinkType(s.type || ''); setLinkUrl(s.link); setLinkFormOpen(true) }}><Edit3 size={13} /></button>
    </div>
  ) : (
    <div className="adm-cons-linkempty">
      <span className="adm-cons-linkemptylbl">No meeting link set yet.</span>
      <button className="adm-btn adm-cons-btn-outline adm-btn-sm" onClick={() => setLinkFormOpen(true)}><Plus size={13} /> Add meeting link</button>
    </div>
  )

  return (
    <>
      <div className={`adm-qv-backdrop${sessionId ? ' show' : ''}`} onClick={onClose} />
      <div className={`adm-qv${sessionId ? ' show' : ''}`}>
        <div className="adm-qv-head">
          <button className="adm-qv-close" onClick={onClose}><X size={17} /></button>
          <div className="adm-qv-title">{s.name}</div>
          <div style={{ marginTop: 8 }}><StatusBadge status={s.status} /></div>
        </div>
        <div className="adm-qv-body">
          <div className="adm-qv-block">
            <div className="adm-qb-h">User info</div>
            <div className="adm-cons-sdrow">
              <div className="adm-cons-sdav">{s.avatarUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={s.avatarUrl} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                : getInitials(s.name)}</div>
              <div><div className="adm-cons-sdname">{s.name}</div><div className="adm-cons-sdemail">{s.email}</div></div>
            </div>
            <a className="adm-cons-sdviewlink" href={`/admin/users?user=${s.userId}`}>View user profile <ArrowRight size={13} /></a>
          </div>
          <div className="adm-qv-block">
            <div className="adm-qb-h">Booking details</div>
            <div className="adm-cons-sdfees">
              <div className="adm-cons-sdfeeline"><span className="k">Session</span><span className="v">{s.sessionTitle}</span></div>
              <div className="adm-cons-sdfeeline"><span className="k">Booked</span><span className="v adm-cons-mono">{s.bookedDate}</span></div>
              <div className="adm-cons-sdfeeline"><span className="k">Duration</span><span className="v">{s.dur} min</span></div>
              <div className="adm-cons-sdfeeline"><span className="k">Price paid</span><span className="v adm-cons-mono">{s.price}</span></div>
            </div>
          </div>
          <div className="adm-qv-block">
            <div className="adm-qb-h">Meeting link</div>
            {linkBlock}
          </div>
          <div className="adm-qv-block">
            <div className="adm-qb-h">Session notes</div>
            <textarea className="adm-cons-notesta" placeholder="Add a private note about this session..." value={notes} onChange={e => setNotes(e.target.value)} onBlur={handleNotesSave} />
            <div className="adm-cons-notesaved">{notesSaved ? 'Notes saved.' : 'Internal only, never visible to the user.'}</div>
          </div>
          <div className="adm-qv-block">
            <div className="adm-qb-h">Status and actions</div>
            {terminal ? (
              <div className="adm-cons-terminalnote">{s.status === 'completed' ? 'This session has already occurred.' : 'This booking was cancelled.'}</div>
            ) : (
              <div className="adm-cons-sdactions">
                <button className="adm-btn adm-cons-btnoutline" style={{ borderColor: '#059669', color: '#34D399' }} onClick={handleMarkComplete}><CheckCircle size={14} /> Mark as completed</button>
                <button className="adm-btn adm-cons-btnoutline" style={{ borderColor: '#DC2626', color: '#F87171' }} onClick={() => onCancel(s.id)}><XCircle size={14} /> Cancel booking</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

/* ============================================================
   MOBILE: AGENDA VIEW
   ============================================================ */
function MobileAgendaView({ sessions, onOpenSession }: { sessions: Session[]; onOpenSession: (id: string) => void }) {
  const now = new Date()
  const todayD = now.getDate()
  const todayM = now.getMonth()
  const todayY = now.getFullYear()

  const [viewYear, setViewYear] = useState(todayY)
  const [viewMonth, setViewMonth] = useState(todayM)
  const [selectedDay, setSelectedDay] = useState<number>(todayD)
  const [legendOpen, setLegendOpen] = useState(false)
  const [slotSheetOpen, setSlotSheetOpen] = useState(false)
  const [slotSheetSessionId, setSlotSheetSessionId] = useState<string | null>(null)
  const dateStripRef = useRef<HTMLDivElement>(null)

  // Fetch all slots so we can show indicators on the date strip
  const { data: allSlotsData } = useQuery<{ data: Array<{ id: string; startsAt: string }> }>({
    queryKey: ['admin-all-slots'],
    queryFn: () => api.get('/api/v1/admin/consultation-slots').then(r => r.data),
    staleTime: 30_000,
  })
  const slotDays = new Set((allSlotsData?.data ?? []).map(s => s.startsAt.slice(0, 10)))

  // Fetch active sessions for the sheet session picker
  const { data: sessionsData } = useQuery<{ data: ApiConsultationSession[] }>({
    queryKey: ['admin-consultation-sessions'],
    queryFn: () => api.get('/api/v1/admin/consultation-sessions').then(r => r.data),
  })
  const activeSessions = (sessionsData?.data ?? []).filter(s => s.active)

  const selectedDateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
  const selectedIsPast = new Date(selectedDateStr) < new Date(new Date().toDateString())

  const daysInViewMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDow = new Date(viewYear, viewMonth, 1).getDay()

  const byDay: Record<number, Session[]> = {}
  sessions.forEach(s => {
    if (s.year === viewYear && s.month === viewMonth) {
      if (!byDay[s.day]) byDay[s.day] = []
      byDay[s.day].push(s)
    }
  })

  const sessionsForDay = byDay[selectedDay] || []
  const monthSessionCount = sessions.filter(s => s.year === viewYear && s.month === viewMonth).length

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else setViewMonth(m => m - 1)
    setSelectedDay(1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else setViewMonth(m => m + 1)
    setSelectedDay(1)
  }

  useEffect(() => {
    if (!dateStripRef.current) return
    const el = dateStripRef.current.querySelector('.adm-mob-con-daycel.selected') as HTMLElement
    if (el) el.scrollIntoView({ inline: 'center', behavior: 'smooth' })
  }, [selectedDay, viewMonth])

  return (
    <div className="adm-mob-con-agenda">
      <div className="adm-mob-con-agenda-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="adm-cons-navbtn" onClick={prevMonth}><ChevronLeft size={14} /></button>
          <span className="adm-mob-con-agenda-month">{CAL_MONTHS[viewMonth]} {viewYear}</span>
          <button className="adm-cons-navbtn" onClick={nextMonth}><ChevronRight size={14} /></button>
        </div>
        <span className="adm-mob-con-agenda-count">{monthSessionCount} session{monthSessionCount !== 1 ? 's' : ''}</span>
        <button className="adm-mob-con-legend-toggle" onClick={() => setLegendOpen(true)}><Info size={18} /></button>
      </div>

      <div className="adm-mob-con-datestrip" ref={dateStripRef}>
        <div className="adm-mob-con-datestrip-track">
          {Array.from({ length: daysInViewMonth }, (_, i) => i + 1).map(day => {
            const dowIdx = (firstDow + day - 1) % 7
            const hasSessions = !!byDay[day]
            const isToday = day === todayD && viewMonth === todayM && viewYear === todayY
            const isSelected = day === selectedDay
            const dayStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const hasSlots = slotDays.has(dayStr)
            return (
              <button
                key={day}
                className={`adm-mob-con-daycel${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}${hasSessions ? ' has-sessions' : ''}`}
                onClick={() => setSelectedDay(day)}
              >
                <span className="adm-mob-con-dow">{DOWS[dowIdx].slice(0, 3)}</span>
                <span className="adm-mob-con-daynum">{day}</span>
                {hasSessions && <span className="adm-mob-con-daydot" />}
                {hasSlots && !hasSessions && <span className="adm-mob-con-slotbar" />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="adm-mob-con-agenda-list">
        {/* Add slots button - only for today or future days */}
        {!selectedIsPast && (
          <button
            className="adm-mob-con-addslots-btn"
            onClick={() => { setSlotSheetSessionId(null); setSlotSheetOpen(true) }}
          >
            <Plus size={14} /> Add slots for {selectedDay} {CAL_MONTHS[viewMonth]}
          </button>
        )}

        {sessionsForDay.length === 0 ? (
          <div className="adm-cons-empty">
            <div className="adm-cons-empty-ico"><Calendar size={36} /></div>
            <h3>No bookings this day</h3>
            <p>No consultations are scheduled for this day.</p>
          </div>
        ) : (
          sessionsForDay.map((s, idx) => {
            const dotColor = s.status === 'completed' ? '#34D399' : s.status === 'cancelled' ? '#F87171' : '#C4843A'
            return (
              <div
                key={s.id}
                className="adm-mob-con-agenda-row adm-mob-card-anim"
                style={{ animationDelay: `${idx * 40}ms` }}
                onClick={() => onOpenSession(s.id)}
              >
                <span className="adm-mob-con-agenda-time">{s.hour}</span>
                <div className="adm-mob-con-agenda-info">
                  <span className="adm-mob-con-agenda-name">{s.name}</span>
                  <span className="adm-mob-con-agenda-cn">{s.sessionTitle}</span>
                </div>
                <span className="adm-mob-con-agenda-dur">{s.dur}m</span>
                {s.type && <span className="adm-mob-con-agenda-typeico">{s.type === 'meet' ? <Video size={14} /> : <ZoomIcon size={14} />}</span>}
                <span className="adm-mob-con-agenda-statusdot" style={{ background: dotColor }} />
              </div>
            )
          })
        )}
      </div>

      {slotSheetOpen && (
        <div className="adm-mob-con-form adm-mob-con-slotscreen">
          <div className="adm-mob-con-form-head">
            <button className="adm-mob-con-back" onClick={() => setSlotSheetOpen(false)}><ChevronLeft size={16} /></button>
            <span className="adm-mob-con-form-title">Add slots - {selectedDay} {CAL_MONTHS[viewMonth]}</span>
          </div>
          <div className="adm-mob-con-form-body">
            <div className="adm-mob-con-form-step">
              {activeSessions.length === 0 ? (
                <div style={{ color: 'var(--adm-t-low)', fontSize: 13 }}>No active sessions. Create a session first in the Sessions tab.</div>
              ) : (
                <>
                  <div className="adm-cons-field" style={{ marginBottom: 14 }}>
                    <label className="adm-cons-fieldlabel">Session</label>
                    <CustomSelect
                      value={slotSheetSessionId ?? ''}
                      options={activeSessions.map(s => ({
                        value: s.id,
                        label: `${s.title.replace(/\s*[-–]\s*(Quick Check|Full Review|Comprehensive Session|Comprehensive)$/i, '')} - ${s.durationMinutes} min`,
                      }))}
                      placeholder="Select a session..."
                      onChange={setSlotSheetSessionId}
                    />
                  </div>
                  {slotSheetSessionId && (
                    <CalendarTimeAdderWrapper
                      key={`${selectedDateStr}-${slotSheetSessionId}`}
                      date={selectedDateStr}
                      sessionId={slotSheetSessionId}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {legendOpen && createPortal(
        <>
          <div className="adm-bsheet-backdrop show" onClick={() => setLegendOpen(false)} />
          <div className="adm-bsheet show">
            <div className="adm-bsheet-handle" />
            <div className="adm-bsheet-head">
              <h3>Session legend</h3>
              <button className="adm-qv-close" onClick={() => setLegendOpen(false)}><X size={17} /></button>
            </div>
            <div className="adm-bsheet-body">
              <div>
                <div className="adm-bsheet-label">Session status</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span className="adm-cons-legitem"><span className="adm-cons-legdot" style={{ background: '#C4843A' }} />Upcoming</span>
                  <span className="adm-cons-legitem"><span className="adm-cons-legdot" style={{ background: '#34D399' }} />Completed</span>
                  <span className="adm-cons-legitem"><span className="adm-cons-legdot" style={{ background: '#F87171' }} />Cancelled</span>
                </div>
              </div>
              <div>
                <div className="adm-bsheet-label">Meeting type</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span className="adm-cons-legitem"><Video size={13} /> Google Meet</span>
                  <span className="adm-cons-legitem"><ZoomIcon /> Zoom</span>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

/* ============================================================
   MOBILE: LIST VIEW
   ============================================================ */
function MobileListView({ sessions, onOpenSession }: { sessions: Session[]; onOpenSession: (id: string) => void }) {
  const [filter, setFilter] = useState<'all' | SessionStatus>('all')
  const [search, setSearch] = useState('')

  const counts = { all: sessions.length, upcoming: 0, completed: 0, cancelled: 0 }
  sessions.forEach(s => { counts[s.status]++ })

  const filtered = sessions.filter(s => {
    if (filter !== 'all' && s.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="adm-mob-con-list">
      <div className="adm-mob-con-filter-glass">
        <div className="adm-mob-con-pills-scroll">
          <div className="adm-mob-con-pills-track">
            {([['all', 'All'], ['upcoming', 'Upcoming'], ['completed', 'Completed'], ['cancelled', 'Cancelled']] as const).map(([k, lbl]) => (
              <button key={k} className={`adm-cons-pill${filter === k ? ' active' : ''}`} onClick={() => setFilter(k)}>
                {lbl}<span className="adm-cons-pillcnt">{counts[k]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="adm-mob-con-search"><Search size={15} /><input placeholder="Search by user name or email..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>

      {filtered.length === 0 ? (
        <div className="adm-cons-empty">
          <div className="adm-cons-empty-ico"><Calendar size={36} /></div>
          <h3>No bookings found</h3>
          <p>No consultations match the current search.</p>
        </div>
      ) : (
        <div className="adm-mob-con-cards">
          {filtered.map((s, idx) => (
            <div
              key={s.id}
              className="adm-mob-con-card adm-mob-card-anim"
              style={{ animationDelay: `${idx * 40}ms` }}
              onClick={() => onOpenSession(s.id)}
            >
              <div className="adm-mob-con-card-top">
                <span className="adm-mob-con-card-name">{s.name}</span>
                <StatusBadge status={s.status} />
              </div>
              <div className="adm-mob-con-card-email">{s.email}</div>
              <div className="adm-mob-con-card-cn">{s.sessionTitle}</div>
              <div className="adm-mob-con-card-div" />
              <div className="adm-mob-con-card-datetime">
                <span>{new Date(s.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, {s.hour} &middot; {s.dur} min</span>
              </div>
              <div className="adm-mob-con-card-meetrow">
                <TypeBadge type={s.type} />
                {s.link
                  ? <span className="adm-cons-linkstat set"><CheckCircle size={13} /> Link set</span>
                  : <span className="adm-cons-linkstat missing"><AlertTriangle size={13} /> Missing</span>
                }
              </div>
              <div className="adm-mob-con-card-actions" onClick={e => e.stopPropagation()}>
                <span className="adm-mob-con-card-act" onClick={() => onOpenSession(s.id)}>View</span>
                {s.status === 'upcoming' && <span className="adm-mob-con-card-act">Mark completed</span>}
                {s.status === 'upcoming' && <span className="adm-mob-con-card-act danger">Cancel</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   MOBILE: BOOKING DETAIL
   ============================================================ */
function MobileBookingDetail({ sessions, sessionId, onBack, onCancel }: { sessions: Session[]; sessionId: string; onBack: () => void; onCancel: (id: string) => void }) {
  const queryClient = useQueryClient()
  const [notesOpen, setNotesOpen] = useState(false)
  const [linkFormOpen, setLinkFormOpen] = useState(false)
  const [linkJustSaved, setLinkJustSaved] = useState(false)
  const [linkType, setLinkType] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)

  const s = sessions.find(x => x.id === sessionId)

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/api/v1/admin/consultations/${sessionId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-consultations'] }),
  })

  useEffect(() => {
    setLinkFormOpen(false)
    setLinkJustSaved(false)
    setLinkType('')
    setLinkUrl('')
    setNotesOpen(false)
    setNotes(s?.notes || '')
    setNotesSaved(false)
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!s) return null

  const terminal = s.status !== 'upcoming'
  const canSave = linkType && linkUrl.trim()

  function handleSaveLink() {
    if (!canSave || !s) return
    const meetingTypeApi = linkType === 'meet' ? 'google_meet' : 'zoom'
    const rawLink = linkUrl.trim()
    const meetingLink = rawLink.startsWith('http://') || rawLink.startsWith('https://') ? rawLink : `https://${rawLink}`
    updateMutation.mutate({ meetingLink, meetingType: meetingTypeApi })
    setLinkFormOpen(false)
    setLinkJustSaved(true)
    setTimeout(() => setLinkJustSaved(false), 1800)
  }

  function handleMarkComplete() {
    if (!s) return
    updateMutation.mutate({ status: 'completed' })
    onBack()
  }

  function handleNotesSave() {
    if (!s || notes === (s.notes || '')) return
    updateMutation.mutate({ notes })
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  const linkBlock = linkFormOpen ? (
    <div className="adm-cons-linkeditform">
      <CustomSelect
        value={linkType}
        placeholder="Select meeting type..."
        options={[
          { value: 'meet', label: 'Google Meet' },
          { value: 'zoom', label: 'Zoom' },
        ]}
        onChange={setLinkType}
      />
      <input className="adm-cons-inp" placeholder="https://meet.google.com/..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="adm-btn adm-cons-btn-outline adm-btn-sm" disabled={!canSave} onClick={handleSaveLink}><Check size={13} /> Save</button>
        <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setLinkFormOpen(false)}>Cancel</button>
      </div>
    </div>
  ) : linkJustSaved ? (
    <div className="adm-cons-linksaved"><CheckCircle size={15} /> Link saved, email sent to {s.name}.</div>
  ) : s.link ? (
    <div className="adm-cons-linksetrow adm-mob-con-linksetrow">
      <span className="adm-cons-linkurl">{s.link}</span>
      <button className="adm-cons-iconbtn" title="Copy" onClick={() => navigator.clipboard.writeText(s.link).catch(() => {})}><Copy size={13} /></button>
      <button className="adm-cons-iconbtn" title="Edit" onClick={() => { setLinkType(s.type || ''); setLinkUrl(s.link); setLinkFormOpen(true) }}><Edit3 size={13} /></button>
    </div>
  ) : (
    <div className="adm-cons-linkempty">
      <span className="adm-cons-linkemptylbl">No meeting link set yet.</span>
      <button className="adm-btn adm-cons-btn-outline adm-btn-sm" onClick={() => setLinkFormOpen(true)}><Plus size={13} /> Add meeting link</button>
    </div>
  )

  return (
    <div className="adm-mob-con-detail">
      <div className="adm-mob-con-detail-head">
        <button className="adm-mob-con-back" onClick={onBack}><ArrowLeft size={18} /></button>
        <span className="adm-mob-con-detail-name">{s.name}</span>
        <StatusBadge status={s.status} />
      </div>

      <div className="adm-mob-con-detail-body">
        <div className="adm-mob-con-detail-card">
          <div className="adm-qb-h">User info</div>
          <div className="adm-cons-sdrow">
            <div className="adm-cons-sdav">{getInitials(s.name)}</div>
            <div><div className="adm-cons-sdname">{s.name}</div><div className="adm-cons-sdemail">{s.email}</div></div>
          </div>
          <a className="adm-cons-sdviewlink" href={`/admin/users?user=${s.userId}`}>View user profile <ArrowRight size={13} /></a>
        </div>

        <div className="adm-mob-con-detail-card">
          <div className="adm-qb-h">Booking details</div>
          <div className="adm-cons-sdfees">
            <div className="adm-cons-sdfeeline"><span className="k">Session</span><span className="v">{s.sessionTitle}</span></div>
            <div className="adm-cons-sdfeeline"><span className="k">Booked</span><span className="v adm-cons-mono">{s.bookedDate}</span></div>
            <div className="adm-cons-sdfeeline"><span className="k">Duration</span><span className="v">{s.dur} min</span></div>
            <div className="adm-cons-sdfeeline"><span className="k">Price paid</span><span className="v adm-cons-mono">{s.price}</span></div>
          </div>
        </div>

        <div className="adm-mob-con-detail-card">
          <div className="adm-qb-h">Meeting link</div>
          {linkBlock}
        </div>

        <div className="adm-mob-con-detail-card">
          <div className="adm-mob-con-notes-toggle" onClick={() => setNotesOpen(!notesOpen)}>
            <div className="adm-qb-h" style={{ margin: 0 }}>Session notes</div>
            <ChevronDown size={16} className={notesOpen ? 'adm-mob-con-chevron-open' : ''} />
          </div>
          {notesOpen && (
            <>
              <textarea className="adm-cons-notesta" placeholder="Add a private note about this session..." value={notes} onChange={e => setNotes(e.target.value)} onBlur={handleNotesSave} />
              <div className="adm-mob-con-notes-label">{notesSaved ? 'Notes saved.' : 'Internal only, never visible to the user.'}</div>
            </>
          )}
        </div>

        <div className="adm-mob-con-detail-card">
          <div className="adm-qb-h">Status and actions</div>
          {terminal ? (
            <div className="adm-cons-terminalnote">{s.status === 'completed' ? 'This session has already occurred.' : 'This booking was cancelled.'}</div>
          ) : (
            <div className="adm-mob-con-detail-actions">
              <button className="adm-btn adm-mob-con-btn-complete" onClick={handleMarkComplete}><CheckCircle size={14} /> Mark as completed</button>
              <button className="adm-btn adm-mob-con-btn-cancel" onClick={() => onCancel(s.id)}><XCircle size={14} /> Cancel booking</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   CANCEL MODAL
   ============================================================ */
function CancelModal({ sessions, sessionId, onClose, onConfirm }: { sessions: Session[]; sessionId: string | null; onClose: () => void; onConfirm: () => void }) {
  const s = sessionId ? sessions.find(x => x.id === sessionId) : null
  if (!s) return null
  return createPortal(
    <div className="adm-cons-overlay show" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="adm-cons-modal">
        <div className="adm-cons-modalico red"><XCircle size={28} /></div>
        <h3>Cancel this booking?</h3>
        <p>{s.name} will be notified automatically.</p>
        <div className="adm-cons-modalactions">
          <button className="adm-btn adm-btn-ghost" onClick={onClose}>Keep booking</button>
          <button className="adm-btn adm-cons-btndanger" onClick={onConfirm}><XCircle size={14} /> Cancel booking</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ============================================================
   SLOTS MANAGER
   ============================================================ */
const SLOT_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const SLOT_DOW = ['Su','Mo','Tu','We','Th','Fr','Sa']

function SlotCalendar({ slots, onPickDate, pickedDate }: {
  slots: Array<{ id: string; startsAt: string }>
  onPickDate: (dateStr: string) => void
  pickedDate: string | null
}) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const slotDays = new Set(slots.map(s => s.startsAt.slice(0, 10)))

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  function dateStr(d: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function isPast(d: number) {
    const dt = new Date(year, month, d)
    dt.setHours(0, 0, 0, 0)
    const t = new Date(); t.setHours(0, 0, 0, 0)
    return dt < t
  }

  return (
    <div className="adm-slots-cal">
      <div className="adm-slots-cal-nav">
        <button className="adm-slots-cal-navbtn" onClick={prevMonth}><ChevronLeft size={14} /></button>
        <span className="adm-slots-cal-title">{SLOT_MONTHS[month]} {year}</span>
        <button className="adm-slots-cal-navbtn" onClick={nextMonth}><ChevronRight size={14} /></button>
      </div>
      <div className="adm-slots-cal-grid">
        {SLOT_DOW.map(d => <div key={d} className="adm-slots-cal-dow">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const ds = dateStr(d)
          const past = isPast(d)
          const hasSlotsOnDay = slotDays.has(ds)
          const picked = pickedDate === ds
          return (
            <button
              key={i}
              type="button"
              disabled={past}
              onClick={() => onPickDate(ds)}
              className={`adm-slots-cal-day${picked ? ' picked' : ''}${hasSlotsOnDay ? ' has-slots' : ''}${past ? ' past' : ''}`}
            >
              {d}
              {hasSlotsOnDay && <span className="adm-slots-cal-dot" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const timeOpts: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      timeOpts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return
      if (dropRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  useEffect(() => {
    if (!open || !triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 6, left: r.left })
  }, [open])

  return (
    <div ref={triggerRef} className={`adm-ctime${open ? ' open' : ''}`} style={{ flex: '1 1 auto' }}>
      <div className="adm-ctime-trigger" onClick={() => setOpen(!open)}>
        <span className={`adm-ctime-val${value ? '' : ' ph'}`}>{value || 'Select time'}</span>
        <Clock className="adm-ctime-ico" />
      </div>
      {open && createPortal(
        <div ref={dropRef} className="adm-ctime-drop" style={{ position: 'fixed', top: pos.top, left: pos.left }}>
          {timeOpts.map(t => (
            <div key={t} className={`adm-ctime-opt${t === value ? ' sel-on' : ''}`}
              onClick={() => { onChange(t); setOpen(false) }}>
              {t}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

function TimeAdder({ date, sessionId, existingSlots, onAdded }: {
  date: string
  sessionId: string
  existingSlots: Array<{ id: string; startsAt: string }>
  onAdded: () => void
}) {
  const queryClient = useQueryClient()
  const [times, setTimes] = useState<string[]>(['09:00'])

  const addMutation = useMutation({
    mutationFn: (slots: string[]) =>
      api.post(`/api/v1/admin/consultation-sessions/${sessionId}/slots`, {
        slots: slots.map(t => new Date(`${date}T${t}:00`).toISOString()),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultation-slots', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['admin-all-slots'] })
      setTimes(['09:00'])
      onAdded()
    },
  })

  // Times already saved for this date
  const savedTimes = new Set(
    existingSlots
      .filter(s => s.startsAt.slice(0, 10) === date)
      .map(s => {
        const d = new Date(s.startsAt)
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      })
  )

  function updateTime(idx: number, val: string) {
    setTimes(ts => ts.map((t, i) => i === idx ? val : t))
  }

  function addTimeRow() {
    if (times.length >= 8) return
    setTimes(ts => [...ts, '10:00'])
  }

  function removeTimeRow(idx: number) {
    if (times.length === 1) return
    setTimes(ts => ts.filter((_, i) => i !== idx))
  }

  const [d, m, y] = [
    new Date(`${date}T00:00`).getDate(),
    SLOT_MONTHS[new Date(`${date}T00:00`).getMonth()],
    new Date(`${date}T00:00`).getFullYear(),
  ]

  const newTimes = times.filter(t => t && !savedTimes.has(t))
  const hasDupes = new Set(times).size !== times.length

  return (
    <div className="adm-slots-timeadder">
      <div className="adm-slots-timeadder-head">
        <span style={{ fontWeight: 600, color: 'var(--adm-t-hi)', fontSize: 13 }}>{d} {m} {y}</span>
        {savedTimes.size > 0 && (
          <span style={{ fontSize: 12, color: 'var(--adm-t-low)' }}>{savedTimes.size} slot{savedTimes.size !== 1 ? 's' : ''} already saved</span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {times.map((t, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TimePicker value={t} onChange={val => updateTime(idx, val)} />
            <button type="button" onClick={() => removeTimeRow(idx)} style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(181,83,10,0.22)', background: 'rgba(181,83,10,0.10)', color: 'var(--adm-t-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: times.length === 1 ? 'default' : 'pointer', opacity: times.length === 1 ? 0.25 : 1, pointerEvents: times.length === 1 ? 'none' : 'auto' }}>
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
      {times.length < 8 && (
        <button type="button" onClick={addTimeRow} style={{ marginTop: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-t-mid)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, padding: 0 }}>
          <Plus size={12} /> Add another time
        </button>
      )}
      {hasDupes && <span style={{ fontSize: 12, color: 'var(--adm-danger, #F87171)' }}>Duplicate times selected.</span>}
      <button
        type="button"
        className="adm-btn adm-cons-btn-outline"
        style={{ marginTop: 10, width: '100%' }}
        disabled={newTimes.length === 0 || hasDupes || addMutation.isPending}
        onClick={() => addMutation.mutate(newTimes)}
      >
        {addMutation.isPending ? 'Saving...' : `Save ${newTimes.length} slot${newTimes.length !== 1 ? 's' : ''} for this date`}
      </button>
    </div>
  )
}

function SlotsManager({ sessionId, label }: { sessionId: string; label?: string }) {
  const queryClient = useQueryClient()
  const [pickedDate, setPickedDate] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery<{ data: Array<{ id: string; startsAt: string }> }>({
    queryKey: ['consultation-slots', sessionId],
    queryFn: () => api.get(`/api/v1/consultations/sessions/${sessionId}/slots`).then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (slotId: string) => api.delete(`/api/v1/admin/consultation-slots/${slotId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultation-slots', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['admin-all-slots'] })
    },
  })

  const slots = data?.data ?? []

  // Group existing slots by date for the list view
  const slotsByDate: Record<string, Array<{ id: string; startsAt: string }>> = {}
  for (const s of slots) {
    const day = s.startsAt.slice(0, 10)
    if (!slotsByDate[day]) slotsByDate[day] = []
    slotsByDate[day].push(s)
  }
  const sortedDates = Object.keys(slotsByDate).sort()

  return (
    <div className="adm-cons-slots-mgr">
      <div className="adm-qb-h" style={{ marginTop: 24, marginBottom: 12 }}>{label ?? 'Available slots'}</div>
      {isLoading ? (
        <div style={{ color: 'var(--adm-t-mid)', fontSize: 13 }}>Loading...</div>
      ) : (
        <div className="adm-cons-slots-mgr-grid">
          {/* Left: calendar + time adder */}
          <div>
            <SlotCalendar slots={slots} pickedDate={pickedDate} onPickDate={setPickedDate} />
            {pickedDate && (
              <TimeAdder
                key={pickedDate}
                date={pickedDate}
                sessionId={sessionId}
                existingSlots={slots}
                onAdded={() => setPickedDate(null)}
              />
            )}
          </div>

          {/* Right: existing slots list */}
          <div>
            {sortedDates.length === 0 ? (
              <div style={{ color: 'var(--adm-t-low)', fontSize: 13, paddingTop: 8 }}>No slots added yet. Pick a date on the calendar.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {sortedDates.map(day => {
                  const daySlots = slotsByDate[day].slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt))
                  const dayLabel = new Date(`${day}T00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                  return (
                    <div key={day}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--adm-t-low)', marginBottom: 6 }}>{dayLabel}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {daySlots.map(s => {
                          const d = new Date(s.startsAt)
                          const t = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                          const confirming = confirmingId === s.id
                          return (
                            <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderRadius: 8, background: confirming ? 'rgba(248,113,113,0.10)' : 'rgba(28,12,3,0.45)', border: `1px solid ${confirming ? 'rgba(248,113,113,0.35)' : 'rgba(181,83,10,0.18)'}`, transition: 'background 150ms, border-color 150ms' }}>
                              <span style={{ fontSize: 13, color: 'var(--adm-t-mid)' }}>{t}</span>
                              {confirming ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 12, color: '#F87171', marginRight: 2 }}>Delete?</span>
                                  <button onClick={() => { deleteMutation.mutate(s.id); setConfirmingId(null) }} style={{ height: 26, padding: '0 10px', borderRadius: 6, border: '1px solid rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.18)', color: '#F87171', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Yes</button>
                                  <button onClick={() => setConfirmingId(null)} style={{ height: 26, padding: '0 10px', borderRadius: 6, border: '1px solid rgba(181,83,10,0.2)', background: 'transparent', color: 'var(--adm-t-mid)', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                                </div>
                              ) : (
                                <button title="Delete slot" onClick={() => setConfirmingId(s.id)} style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 7, border: '1px solid rgba(248,113,113,0.28)', background: 'rgba(248,113,113,0.10)', color: '#F87171', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   CUSTOM SELECT  (matches AdminOpportunitiesPage implementation)
   ============================================================ */
function CustomSelect({ value, options, placeholder, onChange }: {
  value: string; options: { value: string; label: string }[]
  placeholder: string; onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return
      if (dropRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  useEffect(() => {
    if (!open || !triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 6, left: r.left, width: r.width })
  }, [open])

  const selected = options.find(o => o.value === value)
  return (
    <div ref={triggerRef} className={`adm-csel${open ? ' open' : ''}`}>
      <div className="adm-csel-trigger" onClick={() => setOpen(!open)}>
        <span className={`adm-csel-val${value ? '' : ' ph'}`}>{selected?.label || placeholder}</span>
        <ChevronDown className="adm-csel-arrow" />
      </div>
      {open && createPortal(
        <div ref={dropRef} className="adm-csel-drop" style={{ display: 'block', position: 'fixed', top: pos.top, left: pos.left, width: pos.width, right: 'auto' }}>
          {options.map(o => (
            <div key={o.value} className={`adm-csel-opt${value === o.value ? ' sel-on' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false) }}>
              {o.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

/* ============================================================
   SESSION FORM
   A single form manages the whole group: title, description, active flag,
   and up to 3 duration+price variants. On save, all variants share an
   auto-generated groupKey (or the existing one when editing).
   ============================================================ */

const DURATION_OPTIONS = [30, 45, 60, 90, 120]

type VariantDraft = { id: string | null; durationMinutes: number; priceUsd: string }

function emptyVariant(): VariantDraft {
  return { id: null, durationMinutes: 60, priceUsd: '' }
}

function SessionForm({ groupKey: editingGroupKey, sessions, onBack, isMobile }: {
  groupKey: string | null
  sessions: ApiConsultationSession[]
  onBack: () => void
  isMobile?: boolean
}) {
  const queryClient = useQueryClient()
  const editing = editingGroupKey !== null

  // Load all variants in the group (or empty state for new).
  // editingGroupKey may be a real groupKey (grouped sessions) or a session id (standalone).
  const groupVariants = editing
    ? sessions
        .filter(s => s.groupKey === editingGroupKey || s.id === editingGroupKey)
        .sort((a, b) => a.durationMinutes - b.durationMinutes)
    : []

  const lead = groupVariants[0] ?? null

  const [title, setTitle] = useState(lead?.title ?? '')
  const [description, setDescription] = useState(lead?.description ?? '')
  const [active, setActive] = useState(lead?.active ?? true)
  const [variants, setVariants] = useState<VariantDraft[]>(
    groupVariants.length > 0
      ? groupVariants.map(v => ({ id: v.id, durationMinutes: v.durationMinutes, priceUsd: String(v.priceUsd / 100) }))
      : [emptyVariant()]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addVariant() {
    if (variants.length >= 3) return
    // Pick first duration not already used
    const used = new Set(variants.map(v => v.durationMinutes))
    const next = DURATION_OPTIONS.find(d => !used.has(d)) ?? 60
    setVariants([...variants, { id: null, durationMinutes: next, priceUsd: '' }])
  }

  function removeVariant(idx: number) {
    if (variants.length === 1) return
    setVariants(variants.filter((_, i) => i !== idx))
  }

  function updateVariant(idx: number, field: keyof VariantDraft, value: string | number) {
    setVariants(variants.map((v, i) => i === idx ? { ...v, [field]: value } : v))
  }

  async function handleSave() {
    if (!title.trim()) { setError('Title is required.'); return }
    for (const v of variants) {
      if (!v.priceUsd || isNaN(parseFloat(v.priceUsd))) { setError('All variants need a price.'); return }
    }
    // Check for duplicate durations
    const durations = variants.map(v => v.durationMinutes)
    if (new Set(durations).size !== durations.length) { setError('Each variant must have a unique duration.'); return }

    setError('')
    setSaving(true)

    try {
      // Use existing groupKey or generate a new one for multi-variant groups
      const gKey = editing
        ? editingGroupKey
        : variants.length > 1
          ? crypto.randomUUID()
          : null

      if (editing) {
        // Update each existing variant, create new ones, delete removed ones
        const existingIds = new Set(groupVariants.map(v => v.id))
        const keptIds = new Set(variants.filter(v => v.id).map(v => v.id as string))

        // Delete removed variants
        for (const id of existingIds) {
          if (!keptIds.has(id)) {
            await api.delete(`/api/v1/admin/consultation-sessions/${id}`)
          }
        }

        // Update kept variants / create new ones
        for (const v of variants) {
          const body = {
            title: title.trim(),
            description: description.trim() || null,
            durationMinutes: v.durationMinutes,
            priceUsd: Math.round(parseFloat(v.priceUsd) * 100),
            active,
            groupKey: variants.length > 1 ? gKey : null,
          }
          if (v.id) {
            await api.patch(`/api/v1/admin/consultation-sessions/${v.id}`, body)
          } else {
            await api.post('/api/v1/admin/consultation-sessions', body)
          }
        }
      } else {
        for (const v of variants) {
          await api.post('/api/v1/admin/consultation-sessions', {
            title: title.trim(),
            description: description.trim() || null,
            durationMinutes: v.durationMinutes,
            priceUsd: Math.round(parseFloat(v.priceUsd) * 100),
            active,
            groupKey: variants.length > 1 ? gKey : null,
          })
        }
      }

      queryClient.invalidateQueries({ queryKey: ['admin-consultation-sessions'] })
      onBack()
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // For slot management when editing: show SlotsManager per variant
  const usedDurations = new Set(variants.map(v => v.durationMinutes))

  const formFields = (
    <>
      <div className="adm-cons-field">
        <label className="adm-cons-fieldlabel">Title <span className="adm-cons-req">*</span></label>
        <input className="adm-cons-inp" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Scholarship Strategy" />
      </div>
      <div className="adm-cons-field">
        <label className="adm-cons-fieldlabel">Description</label>
        <textarea className="adm-cons-ta" rows={3} placeholder="Brief description shown at booking..." value={description} onChange={e => setDescription(e.target.value)} />
      </div>

      <div className="adm-cons-field">
        <label className="adm-cons-fieldlabel">Duration &amp; pricing</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {variants.map((v, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                <CustomSelect
                  value={String(v.durationMinutes)}
                  placeholder="Duration"
                  options={DURATION_OPTIONS.map(d => ({ value: String(d), label: `${d} minutes`, }))}
                  onChange={val => updateVariant(idx, 'durationMinutes', Number(val))}
                />
                <button type="button" className="adm-cons-iconbtn" onClick={() => removeVariant(idx)} style={{ opacity: variants.length === 1 ? 0.3 : 1, pointerEvents: variants.length === 1 ? 'none' : 'auto' }}>
                  <X size={13} />
                </button>
              </div>
              <div className="cpfx-wrap">
                <span className="cpfx">$</span>
                <input
                  className="cinp"
                  type="number" min="0" step="1"
                  value={v.priceUsd}
                  onChange={e => updateVariant(idx, 'priceUsd', e.target.value)}
                  placeholder="Price (USD)"
                />
              </div>
            </div>
          ))}
        </div>
        {variants.length < 3 && (
          <button type="button" onClick={addVariant} style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-t-mid)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, padding: 0 }}>
            <Plus size={13} /> Add duration variant
          </button>
        )}
      </div>

      <div className="adm-cons-field">
        <label className="adm-aa-check">
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
          <span>Active (visible to users)</span>
        </label>
      </div>

      {error && <span style={{ color: 'var(--adm-danger, #F87171)', fontSize: 13 }}>{error}</span>}
    </>
  )

  if (isMobile) {
    return (
      <div className="adm-mob-con-form">
        <div className="adm-mob-con-form-head">
          <button className="adm-mob-con-back" onClick={onBack}><ChevronLeft size={16} /></button>
          <span className="adm-mob-con-form-title">{editing ? 'Edit session' : 'New session'}</span>
        </div>
        <div className="adm-mob-con-form-body">
          <div className="adm-mob-con-form-step">
            {formFields}
            {editing && variants.filter(v => v.id).map(v => (
              <SlotsManager key={v.id} sessionId={v.id!} label={`${v.durationMinutes} min slots`} />
            ))}
          </div>
        </div>
        <div className="adm-mob-con-form-footer">
          <button className="adm-btn adm-btn-ghost" onClick={onBack} disabled={saving}>Cancel</button>
          <button className="adm-btn adm-cons-btn-outline" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="adm-cons-formwrap">
      <div className="adm-cons-formmain">
        <span className="adm-cons-formback" onClick={onBack}><ChevronLeft size={14} /><span>Back to Sessions</span></span>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--adm-t-hi)' }}>{editing ? 'Edit session' : 'New session'}</h1>
        <div className="adm-cons-formcard">
          {formFields}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="adm-btn adm-btn-ghost" onClick={onBack} disabled={saving}>Cancel</button>
            <button className="adm-btn adm-cons-btn-outline" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>

        {editing && variants.filter(v => v.id).map(v => (
          <SlotsManager key={v.id} sessionId={v.id!} label={`${v.durationMinutes} min slots`} />
        ))}
      </div>
    </div>
  )
}

/* ============================================================
   SESSION CARD  (represents one group, which may have 1-3 variants)
   ============================================================ */
function SessionCard({ variants, onEdit }: { variants: ApiConsultationSession[]; onEdit: (groupKey: string | null) => void }) {
  const queryClient = useQueryClient()
  const lead = variants[0]
  // All variants in a group share the same groupKey; standalone sessions have null
  const gKey = lead.groupKey

  function handleDelete() {
    if (!window.confirm(`Delete this session${variants.length > 1 ? ' and all its duration variants' : ''}? This cannot be undone.`)) return
    Promise.all(variants.map(v => api.delete(`/api/v1/admin/consultation-sessions/${v.id}`)))
      .then(() => queryClient.invalidateQueries({ queryKey: ['admin-consultation-sessions'] }))
  }

  const sorted = variants.slice().sort((a, b) => a.durationMinutes - b.durationMinutes)

  return (
    <div className="adm-cons-cncard">
      <div className="adm-cons-cncard-top">
        <div className="adm-cons-cncard-txt">
          <div className="adm-cons-cnname">{lead.title.replace(/\s*[-–]\s*(Quick Check|Full Review|Comprehensive Session|Comprehensive)$/i, '')}</div>
        </div>
        <span className={`adm-cons-badge ${lead.active ? 'adm-cons-badge-completed' : 'adm-cons-badge-gray'}`}>
          {lead.active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="adm-cons-cnspecialty">
        {sorted.map((v, i) => (
          <span key={v.id}>
            {i > 0 && <span style={{ margin: '0 5px', opacity: 0.4 }}>&middot;</span>}
            {v.durationMinutes} min / ${(v.priceUsd / 100).toFixed(0)}
          </span>
        ))}
      </div>
      {lead.totalSlots !== undefined && (
        <div style={{ fontSize: 12, color: 'var(--adm-t-low)', marginTop: 4 }}>
          {variants.reduce((s, v) => s + (v.totalSlots ?? 0), 0)} slots total,{' '}
          {variants.reduce((s, v) => s + (v.claimedSlots ?? 0), 0)} claimed
        </div>
      )}
      <div className="adm-cons-cnactions">
        <span className="adm-cons-cnact" onClick={() => onEdit(gKey ?? lead.id)}><Edit3 size={13} /> Edit</span>
        <span className="adm-cons-cnact danger" onClick={handleDelete}><Trash2 size={13} /> Delete</span>
      </div>
    </div>
  )
}

/* ============================================================
   SESSIONS TAB
   ============================================================ */

// Groups flat session list into display groups (same logic as public page)
function groupAdminSessions(sessions: ApiConsultationSession[]): ApiConsultationSession[][] {
  const groups: ApiConsultationSession[][] = []
  const seen: Record<string, ApiConsultationSession[]> = {}
  for (const s of sessions) {
    if (s.groupKey) {
      if (!seen[s.groupKey]) {
        seen[s.groupKey] = []
        groups.push(seen[s.groupKey])
      }
      seen[s.groupKey].push(s)
    } else {
      groups.push([s])
    }
  }
  return groups
}

function SessionsTab() {
  const [view, setView] = useState<'list' | 'form'>('list')
  // editingGroupKey: null = new session, string = group key (or session id for standalone)
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null)
  const isMobile = useIsMobile()

  const { data, isLoading } = useQuery<{ data: ApiConsultationSession[] }>({
    queryKey: ['admin-consultation-sessions'],
    queryFn: () => api.get('/api/v1/admin/consultation-sessions').then(r => r.data),
  })

  const sessions: ApiConsultationSession[] = data?.data ?? []

  if (view === 'form') {
    return (
      <SessionForm
        groupKey={editingGroupKey}
        sessions={sessions}
        onBack={() => { setView('list'); setEditingGroupKey(null) }}
        isMobile={isMobile}
      />
    )
  }

  if (isLoading) {
    return <div style={{ padding: 32, color: 'var(--adm-t-mid)', fontSize: 14 }}>Loading...</div>
  }

  const groups = groupAdminSessions(sessions)

  if (isMobile) {
    return (
      <div className="adm-mob-con-cnlist">
        <div className="adm-mob-con-cncount" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{groups.length} session{groups.length !== 1 ? 's' : ''}</span>
          <button className="adm-btn adm-btn-ghost adm-cons-newcnbtn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => { setEditingGroupKey(null); setView('form') }}><Plus size={13} /> New</button>
        </div>
        <div className="adm-mob-con-cncards">
          {groups.map((variants) => (
            <SessionCard
              key={variants[0].groupKey ?? variants[0].id}
              variants={variants}
              onEdit={(gKey) => { setEditingGroupKey(gKey); setView('form') }}
            />
          ))}
        </div>
        {sessions.length === 0 && (
          <div className="adm-cons-empty">
            <div className="adm-cons-empty-ico"><List size={36} /></div>
            <h3>No sessions yet</h3>
            <p>Create a session to let users book consultations.</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="adm-cons-cnheadrow">
        <span className="adm-cons-cnheadsub">{groups.length} session{groups.length !== 1 ? 's' : ''}</span>
        <button className="adm-btn adm-btn-ghost adm-cons-newcnbtn" onClick={() => { setEditingGroupKey(null); setView('form') }}><Plus size={14} /> New session</button>
      </div>
      <div className="adm-cons-cngrid">
        {groups.map((variants) => (
          <SessionCard
            key={variants[0].groupKey ?? variants[0].id}
            variants={variants}
            onEdit={(gKey) => { setEditingGroupKey(gKey); setView('form') }}
          />
        ))}
      </div>
      {sessions.length === 0 && (
        <div className="adm-cons-empty">
          <div className="adm-cons-empty-ico"><List size={36} /></div>
          <h3>No sessions yet</h3>
          <p>Create a session to let users book consultations.</p>
        </div>
      )}
    </>
  )
}

/* Thin wrapper used inside CalendarSlotPanel: fetches slots for the session
   so TimeAdder can show already-saved slots on the selected date. */
function CalendarTimeAdderWrapper({ date, sessionId }: { date: string; sessionId: string }) {
  const { data } = useQuery<{ data: Array<{ id: string; startsAt: string }> }>({
    queryKey: ['consultation-slots', sessionId],
    queryFn: () => api.get(`/api/v1/consultations/sessions/${sessionId}/slots`).then(r => r.data),
  })
  const slots = data?.data ?? []
  return (
    <TimeAdder
      date={date}
      sessionId={sessionId}
      existingSlots={slots}
      onAdded={() => {}}
    />
  )
}

/* ============================================================
   CALENDAR SLOT PANEL
   Appears beside the calendar when admin clicks a day.
   Lets them pick a session and add/delete available slots for that date.
   ============================================================ */
function CalendarSlotPanel({ pickedDay, onClose }: { pickedDay: string | null; onClose: () => void }) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  const { data } = useQuery<{ data: ApiConsultationSession[] }>({
    queryKey: ['admin-consultation-sessions'],
    queryFn: () => api.get('/api/v1/admin/consultation-sessions').then(r => r.data),
  })

  const allSessions: ApiConsultationSession[] = data?.data ?? []
  const activeSessions = allSessions.filter(s => s.active)

  // Reset selected session when day changes
  useEffect(() => {
    setSelectedSessionId(null)
  }, [pickedDay])

  if (!pickedDay) {
    return (
      <div className="adm-cons-cal-slot-panel empty">
        <div className="adm-cons-cal-slot-panel-hint">
          <Calendar size={28} />
          <p>Click any day on the calendar to add available time slots for that date.</p>
        </div>
      </div>
    )
  }

  const [yr, mo, dy] = pickedDay.split('-').map(Number)
  const dayLabel = new Date(yr, mo - 1, dy).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const sessionOptions = activeSessions.map(s => ({
    value: s.id,
    label: `${s.title.replace(/\s*[-–]\s*(Quick Check|Full Review|Comprehensive Session|Comprehensive)$/i, '')} - ${s.durationMinutes} min`,
  }))

  return (
    <div className="adm-cons-cal-slot-panel">
      <div className="adm-cons-cal-slot-panel-head">
        <div>
          <div className="adm-cons-cal-slot-panel-date">{dayLabel}</div>
          <div className="adm-cons-cal-slot-panel-sub">Add available slots</div>
        </div>
        <button className="adm-cons-iconbtn" onClick={onClose}><X size={15} /></button>
      </div>

      <div className="adm-cons-cal-slot-panel-body">
        {activeSessions.length === 0 ? (
          <div style={{ color: 'var(--adm-t-low)', fontSize: 13 }}>No active sessions. Create a session first.</div>
        ) : (
          <>
            <div className="adm-cons-field" style={{ marginBottom: 12 }}>
              <label className="adm-cons-fieldlabel">Session</label>
              <CustomSelect
                value={selectedSessionId ?? ''}
                options={sessionOptions}
                placeholder="Select a session..."
                onChange={setSelectedSessionId}
              />
            </div>
            {selectedSessionId && (
              <CalendarTimeAdderWrapper
                key={`${pickedDay}-${selectedSessionId}`}
                date={pickedDay}
                sessionId={selectedSessionId}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   SKELETON
   ============================================================ */
function ConsultSkeleton() {
  return (
    <div className="adm-cons-wrap">
      <div className="adm-page-head">
        <div><div className="adm-skel adm-skel-line w25" style={{ height: 24, marginBottom: 8 }} /><div className="adm-skel adm-skel-line w15" style={{ height: 13 }} /></div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 20 }}>
        {[70, 90, 80].map((w, i) => <div key={i} className="adm-skel adm-skel-pill" style={{ width: w }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[0, 1, 2, 3].map(i => <div key={i} className="adm-skel" style={{ height: 80, borderRadius: 12 }} />)}
      </div>
      <div className="adm-skel" style={{ height: 320, borderRadius: 12 }} />
    </div>
  )
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
export function AdminConsultationsPage() {
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('calendar')
  const [sidebarSession, setSidebarSession] = useState<string | null>(null)
  const [cancelModal, setCancelModal] = useState<string | null>(null)
  const [mobDetailSession, setMobDetailSession] = useState<string | null>(null)
  const [pickedCalDay, setPickedCalDay] = useState<string | null>(null)

  const { data: consultationsData, isLoading: loadingC } = useQuery({
    queryKey: ['admin-consultations'],
    queryFn: () => api.get('/api/v1/admin/consultations').then(r => r.data),
  })

  const sessions: Session[] = (consultationsData?.data ?? []).map(apiConsToSession)

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/admin/consultations/${id}`, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-consultations'] })
    },
  })

  const handleOpenSession = useCallback((id: string) => {
    if (isMobile) setMobDetailSession(id)
    else setSidebarSession(id)
  }, [isMobile])
  const handleCloseSidebar = useCallback(() => setSidebarSession(null), [])
  const handleCancelRequest = useCallback((id: string) => setCancelModal(id), [])
  const handleCancelConfirm = useCallback(() => {
    if (cancelModal) cancelMutation.mutate(cancelModal)
    setCancelModal(null)
    setSidebarSession(null)
    setMobDetailSession(null)
  }, [cancelModal, cancelMutation])

  if (loadingC) return <ConsultSkeleton />

  if (isMobile && mobDetailSession) {
    return (
      <div className="adm-cons-wrap">
        <MobileBookingDetail sessions={sessions} sessionId={mobDetailSession} onBack={() => setMobDetailSession(null)} onCancel={handleCancelRequest} />
        {cancelModal && <CancelModal sessions={sessions} sessionId={cancelModal} onClose={() => setCancelModal(null)} onConfirm={handleCancelConfirm} />}
      </div>
    )
  }

  return (
    <div className="adm-cons-wrap">
      <div className="adm-cons-head">
        <div><h1>Consultations</h1><span className="adm-cons-headsub">Manage bookings</span></div>
      </div>
      <div className="adm-cons-content">
        <div className="adm-cons-tabs">
          <div className={`adm-cons-tab${tab === 'calendar' ? ' active' : ''}`} onClick={() => setTab('calendar')}>{isMobile ? 'Calendar' : 'Calendar view'}</div>
          <div className={`adm-cons-tab${tab === 'list' ? ' active' : ''}`} onClick={() => setTab('list')}>{isMobile ? 'Bookings' : 'List view'}</div>
          <div className={`adm-cons-tab${tab === 'sessions' ? ' active' : ''}`} onClick={() => setTab('sessions')}>Sessions</div>
        </div>

        {!isMobile && tab === 'calendar' && (
          <div className="adm-cons-cal-with-panel">
            <CalendarView sessions={sessions} onOpenSession={handleOpenSession} onPickDay={setPickedCalDay} onClearPickedDay={() => setPickedCalDay(null)} pickedDay={pickedCalDay} />
            <CalendarSlotPanel pickedDay={pickedCalDay} onClose={() => setPickedCalDay(null)} />
          </div>
        )}
        {!isMobile && tab === 'list' && <ListView sessions={sessions} onOpenSession={handleOpenSession} />}
        {tab === 'sessions' && <SessionsTab />}

        {isMobile && tab === 'calendar' && <MobileAgendaView sessions={sessions} onOpenSession={handleOpenSession} />}
        {isMobile && tab === 'list' && <MobileListView sessions={sessions} onOpenSession={handleOpenSession} />}
      </div>

      {!isMobile && tab !== 'sessions' && <SessionSidebar sessions={sessions} sessionId={sidebarSession} onClose={handleCloseSidebar} onCancel={handleCancelRequest} />}

      {cancelModal && <CancelModal sessions={sessions} sessionId={cancelModal} onClose={() => setCancelModal(null)} onConfirm={handleCancelConfirm} />}
    </div>
  )
}
