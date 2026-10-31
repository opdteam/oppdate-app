'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { createPortal } from 'react-dom'
import {
  Plus, ChevronLeft, X, Check, Edit3, EyeOff, Trash2, ArrowRight, ArrowLeft,
  BookOpen, Upload, Image as ImageIcon, FileText, BarChart3, AlertTriangle, RotateCw,
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

function useCountUp(target: number, duration = 800, decimals = 0) {
  const [val, setVal] = useState(0)
  const ref = useRef<number | null>(null)
  useEffect(() => {
    const start = performance.now()
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setVal(ease * target)
      if (t < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [target, duration])
  return decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString()
}

type EbookStatus = 'published' | 'draft' | 'unpublished'
type View = 'grid' | 'form' | 'sales'
type StatusFilter = 'all' | EbookStatus

type Purchaser = { name: string; email: string; date: string }
type Ebook = {
  id: string; title: string; author: string; pageCount: number; category: string
  standardPrice: number; premiumPrice: number; sales: number; downloads: number
  status: EbookStatus; desc: string; whatsInside: string[]; salesByDay: number[]
  purchasers: Purchaser[]
  coverImageUrl: string; fileUrl: string; lsVariantId: string | null
}

const EBOOK_CATEGORIES = ['Scholarships', 'Visa & Immigration', 'Career Guidance', 'Test Preparation', 'Interview Preparation']

// API type from the admin ebooks endpoint
type ApiEbook = {
  id: string; title: string; author: string; pageCount: number | null
  category: string | null; description: string; whatsInside: { title: string; description: string }[]
  priceUsd: number; premiumPriceUsd: number | null
  status: 'published' | 'unpublished'; purchaseCount: number; downloadCount: number
  coverImageUrl: string; fileUrl: string; slug: string; lsVariantId: string | null
}

function apiEbookToUi(a: ApiEbook): Ebook {
  return {
    id: a.id,
    title: a.title,
    author: a.author,
    pageCount: a.pageCount ?? 0,
    category: a.category ?? 'Uncategorized',
    standardPrice: a.priceUsd / 100,
    premiumPrice: a.premiumPriceUsd != null ? a.premiumPriceUsd / 100 : a.priceUsd / 100,
    sales: a.purchaseCount,
    downloads: a.downloadCount,
    status: a.status === 'published' ? 'published' : 'unpublished',
    desc: a.description,
    whatsInside: a.whatsInside.map(w => w.title),
    salesByDay: [],
    purchasers: [],
    coverImageUrl: a.coverImageUrl,
    fileUrl: a.fileUrl,
    lsVariantId: a.lsVariantId ?? null,
  }
}

function fmtPrice(p: number) { return '$' + p.toFixed(2) }

function StatusBadge({ status }: { status: EbookStatus }) {
  const map = {
    published: ['Published', 'adm-ebk-badge-published'],
    draft: ['Draft', 'adm-ebk-badge-draft'],
    unpublished: ['Unpublished', 'adm-ebk-badge-unpublished'],
  }
  const [label, cls] = map[status]
  return <span className={`adm-ebk-badge ${cls}`}>{label}</span>
}

/* ============================================================
   EBOOK CARD
   ============================================================ */
function EbookCard({ b, onEdit, onViewSales, onUnpublish, onDelete }: {
  b: Ebook; onEdit: () => void; onViewSales: () => void; onUnpublish: () => void; onDelete: () => void
}) {
  return (
    <div className={`adm-ebk-card${b.status === 'draft' ? ' draft' : ''}`}>
      <div className="adm-ebk-cover">
        {b.coverImageUrl
          ? <img src={b.coverImageUrl} alt={b.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          : <><BookOpen size={32} /><span className="adm-ebk-nocover">No cover</span></>
        }
        <div className="adm-ebk-coverbadge"><StatusBadge status={b.status} /></div>
      </div>
      <div className="adm-ebk-body">
        <div className="adm-ebk-catbadge">{b.category}</div>
        <div className="adm-ebk-title">{b.title}</div>
        <div className="adm-ebk-price">
          <span className="adm-ebk-mono">{fmtPrice(b.premiumPrice)}</span>
          <span className="adm-ebk-pricestd"> - {fmtPrice(b.standardPrice)} standard</span>
        </div>
        <div className="adm-ebk-stats">
          <div className="adm-ebk-stat"><div className="n">{b.sales}</div><div className="l">Sales</div></div>
          <div className="adm-ebk-stat"><div className="n">{b.downloads}</div><div className="l">Downloads</div></div>
        </div>
        <div className="adm-ebk-actions">
          <span className="adm-ebk-act" onClick={(e) => { e.stopPropagation(); onEdit() }}><Edit3 size={13} /> Edit</span>
          {b.status === 'published' && <span className="adm-ebk-act" onClick={(e) => { e.stopPropagation(); onUnpublish() }}><EyeOff size={13} /> Unpublish</span>}
          {b.status === 'draft' && b.sales === 0 && <span className="adm-ebk-act danger" onClick={(e) => { e.stopPropagation(); onDelete() }}><Trash2 size={13} /> Delete</span>}
          <span className="adm-ebk-act" onClick={(e) => { e.stopPropagation(); onViewSales() }}><BarChart3 size={13} /> View sales <ArrowRight size={11} /></span>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   GRID VIEW
   ============================================================ */
function GridView({ ebooks, filter, onFilterChange, onEdit, onViewSales, onUnpublish, onDelete, onNew }: {
  ebooks: Ebook[]; filter: StatusFilter; onFilterChange: (f: StatusFilter) => void
  onEdit: (id: string) => void; onViewSales: (id: string) => void
  onUnpublish: (id: string) => void; onDelete: (id: string) => void; onNew: () => void
}) {
  const counts = { all: ebooks.length, published: 0, draft: 0, unpublished: 0 }
  ebooks.forEach(b => { if (b.status in counts) counts[b.status as keyof typeof counts]++ })
  const list = filter === 'all' ? ebooks : ebooks.filter(b => b.status === filter)

  if (ebooks.length === 0) {
    return (
      <div className="adm-ebk-empty">
        <div className="adm-ebk-emptyico"><BookOpen size={40} /></div>
        <h3>No eBooks yet</h3>
        <p>Upload your first title to start selling to OppDate users.</p>
        <button className="adm-ebk-empty-cta" onClick={onNew}><Upload size={15} /> Upload first eBook</button>
      </div>
    )
  }

  return (
    <>
      <div className="adm-ebk-filterrow">
        {([['all', 'All'], ['published', 'Published'], ['draft', 'Draft'], ['unpublished', 'Unpublished']] as const).map(([k, lbl]) => (
          <button key={k} className={`adm-ebk-pill${filter === k ? ' active' : ''}`} onClick={() => onFilterChange(k)}>
            {lbl}<span className="adm-ebk-pillcnt">{counts[k]}</span>
          </button>
        ))}
      </div>
      <div className="adm-ebk-grid">
        {list.map(b => (
          <EbookCard
            key={b.id} b={b}
            onEdit={() => onEdit(b.id)}
            onViewSales={() => onViewSales(b.id)}
            onUnpublish={() => onUnpublish(b.id)}
            onDelete={() => onDelete(b.id)}
          />
        ))}
      </div>

    </>
  )
}

/* ============================================================
   SHARED FORM LOGIC
   ============================================================ */
function useEbookForm(b: Ebook | null | undefined, bookId: string | null, onBack: () => void) {
  const editing = !!bookId
  const queryClient = useQueryClient()

  const [title, setTitle] = useState(b?.title || '')
  const [author, setAuthor] = useState(b?.author || '')
  const [pageCount, setPageCount] = useState(b?.pageCount ? String(b.pageCount) : '')
  const [category, setCategory] = useState(b?.category || EBOOK_CATEGORIES[0])
  const [desc, setDesc] = useState(b?.desc || '')
  const [whatsInside, setWhatsInside] = useState<string[]>(b?.whatsInside || [])
  const [standardPrice, setStandardPrice] = useState(b?.standardPrice ? b.standardPrice.toFixed(2) : '')
  const [premiumPrice, setPremiumPrice] = useState(b?.premiumPrice ? b.premiumPrice.toFixed(2) : '')
  const [status, setStatus] = useState<'draft' | 'published'>(b?.status === 'published' ? 'published' : 'draft')
  const [lsVariantId, setLsVariantId] = useState(b?.lsVariantId || '')

  useEffect(() => { setLsVariantId(b?.lsVariantId || '') }, [bookId, b?.lsVariantId])

  const [coverUrl, setCoverUrl] = useState(b?.coverImageUrl || '')
  const [coverName, setCoverName] = useState(b?.coverImageUrl ? b.coverImageUrl.split('/').pop() || 'cover.jpg' : '')
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverError, setCoverError] = useState('')

  const [fileUrl, setFileUrl] = useState(b?.fileUrl || '')
  const [fileName, setFileName] = useState(b?.fileUrl ? b.fileUrl.split('/').pop() || `${b.title.slice(0, 30)}.pdf` : '')
  const [fileFormat, setFileFormat] = useState<'pdf' | 'epub'>('pdf')
  const [fileUploading, setFileUploading] = useState(false)
  const [fileError, setFileError] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const coverInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadCover = useCallback(async (file: File) => {
    setCoverError('')
    setCoverUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post<{ data: { url: string } }>('/api/v1/admin/ebook-cover-upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setCoverUrl(res.data.data.url)
      setCoverName(file.name)
    } catch {
      setCoverError('Cover upload failed. Try again.')
    } finally {
      setCoverUploading(false)
    }
  }, [])

  const uploadFile = useCallback(async (file: File) => {
    setFileError('')
    setFileUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post<{ data: { url: string; format: string } }>('/api/v1/admin/ebook-file-upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setFileUrl(res.data.data.url)
      setFileName(file.name)
      setFileFormat(res.data.data.format === 'epub' ? 'epub' : 'pdf')
    } catch {
      setFileError('File upload failed. Try again.')
    } finally {
      setFileUploading(false)
    }
  }, [])

  const handleCoverDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) uploadCover(file)
  }, [uploadCover])

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }, [uploadFile])

  const buildPayload = (overrideStatus?: 'draft' | 'published') => {
    const stdCents = Math.round(parseFloat(standardPrice) * 100)
    const premCents = Math.round(parseFloat(premiumPrice) * 100)
    return {
      title: title.trim(),
      author: author.trim(),
      pageCount: pageCount ? parseInt(pageCount) : undefined,
      category,
      description: desc.trim(),
      whatsInside: whatsInside.filter(s => s.trim()).map(s => ({ title: s.trim() })),
      coverImageUrl: coverUrl || undefined,
      fileUrl: fileUrl || undefined,
      fileFormat,
      priceUsd: stdCents,
      premiumPriceUsd: premiumPrice ? premCents : undefined,
      lsVariantId: lsVariantId.trim() || undefined,
      status: overrideStatus ?? status,
    }
  }

  const validate = (requireFiles: boolean) => {
    if (!title.trim()) return 'Title is required.'
    if (!author.trim()) return 'Author name is required.'
    if (!standardPrice || isNaN(parseFloat(standardPrice))) return 'Standard price is required.'
    if (requireFiles && !coverUrl) return 'Cover image is required.'
    if (requireFiles && !fileUrl) return 'eBook file is required.'
    return null
  }

  const save = async (overrideStatus?: 'draft' | 'published') => {
    const err = validate(!editing)
    if (err) { setError(err); return }
    setError('')
    setSaving(true)
    try {
      const payload = buildPayload(overrideStatus)
      if (editing) {
        await api.patch(`/api/v1/admin/ebooks/${bookId}`, payload)
      } else {
        await api.post('/api/v1/admin/ebooks', payload)
      }
      await queryClient.invalidateQueries({ queryKey: ['admin-ebooks'] })
      onBack()
    } catch {
      setError('Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const stdNum = parseFloat(standardPrice) || 0
  const premNum = parseFloat(premiumPrice) || 0
  const savings = stdNum > premNum && premNum > 0 ? (stdNum - premNum).toFixed(2) : null

  return {
    editing,
    title, setTitle, author, setAuthor, pageCount, setPageCount,
    category, setCategory, desc, setDesc,
    whatsInside, setWhatsInside,
    standardPrice, setStandardPrice, premiumPrice, setPremiumPrice,
    status, setStatus,
    lsVariantId, setLsVariantId,
    coverUrl, coverName, coverUploading, coverError, coverInputRef,
    uploadCover, handleCoverDrop,
    fileUrl, fileName, fileUploading, fileError, fileInputRef,
    uploadFile, handleFileDrop,
    saving, error, savings, save,
  }
}

/* ============================================================
   FILE DROPZONE (shared)
   ============================================================ */
function FileDropzone({ kind, url, name, uploading, error, inputRef, onDrop, onPick }: {
  kind: 'cover' | 'file'
  url: string; name: string; uploading: boolean; error: string
  inputRef: React.RefObject<HTMLInputElement>
  onDrop: (e: React.DragEvent) => void
  onPick: (file: File) => void
}) {
  const hasFile = !!url
  const accept = kind === 'cover' ? 'image/jpeg,image/png,image/webp' : 'application/pdf,application/epub+zip'

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = '' }}
      />
      <div
        className={`adm-ebk-dropzone${hasFile ? ' has-file' : ''}`}
        style={{ cursor: uploading ? 'wait' : 'pointer' }}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
      >
        {uploading ? (
          <><RotateCw size={20} className="adm-spin" /><div className="adm-ebk-dzlabel">Uploading...</div></>
        ) : hasFile ? (
          <>{kind === 'cover' ? <ImageIcon size={20} /> : <FileText size={20} />}<div><div className="adm-ebk-dzname">{name}</div><div className="adm-ebk-dzsize">Uploaded</div></div></>
        ) : kind === 'cover' ? (
          <><ImageIcon size={20} /><div className="adm-ebk-dzlabel">Drag and drop a cover image</div><div className="adm-ebk-dzsub">or click to browse - JPG, PNG</div></>
        ) : (
          <><Upload size={20} /><div className="adm-ebk-dzlabel">Drag and drop the eBook file</div><div className="adm-ebk-dzsub">or click to browse - PDF, ePub</div></>
        )}
      </div>
      {error && <div className="adm-ebk-fieldhelp" style={{ color: 'var(--adm-red)' }}>{error}</div>}
    </div>
  )
}

/* ============================================================
   UPLOAD / EDIT FORM
   ============================================================ */
function EbookForm({ ebooks, bookId, onBack }: { ebooks: Ebook[]; bookId: string | null; onBack: () => void }) {
  const b = bookId ? ebooks.find(x => x.id === bookId) : null
  const f = useEbookForm(b, bookId, onBack)
  const primaryLabel = f.editing && b?.status === 'published' ? 'Save changes' : 'Publish'

  return (
    <>
      <div className="adm-ebk-formwrap">
        <div className="adm-ebk-formmain">
          <span className="adm-ebk-backlink" onClick={onBack}><ChevronLeft size={14} /><span>Back to eBooks</span></span>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--adm-t-hi)' }}>{f.editing ? `Editing: ${b!.title}` : 'Upload new eBook'}</h1>
          <div className="adm-ebk-formcard">
            <div className="adm-ebk-field">
              <label className="adm-ebk-fieldlabel">Cover image</label>
              <FileDropzone kind="cover" url={f.coverUrl} name={f.coverName} uploading={f.coverUploading} error={f.coverError} inputRef={f.coverInputRef} onDrop={f.handleCoverDrop} onPick={f.uploadCover} />
            </div>
            <div className="adm-ebk-field">
              <label className="adm-ebk-fieldlabel">Title <span className="adm-ebk-req">*</span></label>
              <input className="adm-ebk-inp" value={f.title} onChange={e => f.setTitle(e.target.value)} placeholder="e.g. Mastering the Personal Statement" />
            </div>
            <div className="adm-ebk-fieldrow2">
              <div className="adm-ebk-field">
                <label className="adm-ebk-fieldlabel">Author name <span className="adm-ebk-req">*</span></label>
                <input className="adm-ebk-inp" value={f.author} onChange={e => f.setAuthor(e.target.value)} placeholder="e.g. Dr. Amara Okonkwo" />
              </div>
              <div className="adm-ebk-field">
                <label className="adm-ebk-fieldlabel">Page count <span className="adm-ebk-req">*</span></label>
                <input className="adm-ebk-inp" type="number" min={1} value={f.pageCount} onChange={e => f.setPageCount(e.target.value)} placeholder="142" />
              </div>
            </div>
            <div className="adm-ebk-field">
              <label className="adm-ebk-fieldlabel">Category <span className="adm-ebk-req">*</span></label>
              <select className="adm-ebk-sel" value={f.category} onChange={e => f.setCategory(e.target.value)}>
                {EBOOK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="adm-ebk-field">
              <label className="adm-ebk-fieldlabel">Description</label>
              <textarea className="adm-ebk-ta" rows={3} value={f.desc} onChange={e => f.setDesc(e.target.value)} placeholder="What will readers get from this eBook?" />
              <div className="adm-ebk-fieldhelp">Aim for 2 to 3 sentences.</div>
            </div>
            <div className="adm-ebk-field">
              <label className="adm-ebk-fieldlabel">What&apos;s inside <span className="adm-ebk-req">*</span></label>
              {f.whatsInside.map((item, i) => (
                <div key={i} className="adm-ebk-wirow">
                  <span className="adm-ebk-winum adm-ebk-mono">{String(i + 1).padStart(2, '0')}</span>
                  <input className="adm-ebk-inp" value={item} onChange={e => f.setWhatsInside(prev => prev.map((v, j) => j === i ? e.target.value : v))} placeholder="e.g. The UK funding map" />
                  <button className="adm-ebk-iconbtn sm" onClick={() => f.setWhatsInside(prev => prev.filter((_, j) => j !== i))}><X size={13} /></button>
                </div>
              ))}
              <span className="adm-ebk-addlink" onClick={() => f.setWhatsInside(prev => [...prev, ''])}><Plus size={15} /> Add item</span>
            </div>
            <div className="adm-ebk-fieldrow2">
              <div className="adm-ebk-field">
                <label className="adm-ebk-fieldlabel">Standard price (USD) <span className="adm-ebk-req">*</span></label>
                <div className="adm-ebk-priceinput"><span className="adm-ebk-pfx">$</span><input className="adm-ebk-inp" value={f.standardPrice} onChange={e => f.setStandardPrice(e.target.value)} placeholder="24.99" /></div>
              </div>
              <div className="adm-ebk-field">
                <label className="adm-ebk-fieldlabel">Premium member price (USD) <span className="adm-ebk-req">*</span></label>
                <div className="adm-ebk-priceinput"><span className="adm-ebk-pfx">$</span><input className="adm-ebk-inp" value={f.premiumPrice} onChange={e => f.setPremiumPrice(e.target.value)} placeholder="14.99" /></div>
              </div>
            </div>
            {f.savings && <div className="adm-ebk-savings">Members save ${f.savings}</div>}
            <div className="adm-ebk-field">
              <label className="adm-ebk-fieldlabel">Lemon Squeezy variant ID</label>
              <input className="adm-ebk-inp" value={f.lsVariantId} onChange={e => f.setLsVariantId(e.target.value)} placeholder="e.g. 123456" />
              <div className="adm-ebk-fieldhelp">From the LS dashboard: Products &gt; Variants tab. Required for checkout.</div>
            </div>
            <div className="adm-ebk-field">
              <label className="adm-ebk-fieldlabel">eBook file <span className="adm-ebk-req">*</span></label>
              <FileDropzone kind="file" url={f.fileUrl} name={f.fileName} uploading={f.fileUploading} error={f.fileError} inputRef={f.fileInputRef} onDrop={f.handleFileDrop} onPick={f.uploadFile} />
            </div>
            {f.error && <div style={{ color: 'var(--adm-red)', fontSize: 13, marginTop: 4 }}>{f.error}</div>}
          </div>
        </div>
      </div>
      <div className="adm-ebk-formfooter">
        <div style={{ flex: '1 1 auto' }} />
        <button className="adm-btn adm-btn-ghost" onClick={onBack} disabled={f.saving}>Cancel</button>
        <button className="adm-btn adm-ebk-btnoutline" disabled={f.saving} onClick={() => f.save('draft')}>Save as draft</button>
        <button className="adm-btn adm-ebk-btn-outline" disabled={f.saving} onClick={() => f.save('published')}>{f.saving ? 'Saving...' : primaryLabel}</button>
      </div>
    </>
  )
}

/* ============================================================
   SALES DETAIL
   ============================================================ */
type ApiEbookDetail = ApiEbook & {
  purchasers: Array<{ userName: string | null; userEmail: string | null; downloadCount: number; purchasedAt: string }>
}

function buildSalesByDay(purchasers: ApiEbookDetail['purchasers']): number[] {
  if (!purchasers.length) return []
  const dates = purchasers.map(p => new Date(p.purchasedAt).toDateString())
  const earliest = new Date(Math.min(...purchasers.map(p => new Date(p.purchasedAt).getTime())))
  const today = new Date()
  const days: number[] = []
  for (let d = new Date(earliest); d <= today; d.setDate(d.getDate() + 1)) {
    days.push(dates.filter(dt => dt === new Date(d).toDateString()).length)
  }
  return days
}

function SalesDetail({ ebooks, bookId, onBack }: { ebooks: Ebook[]; bookId: string; onBack: () => void }) {
  const base = ebooks.find(x => x.id === bookId)

  const { data: detail } = useQuery<ApiEbookDetail>({
    queryKey: ['admin-ebook-detail', bookId],
    queryFn: () => api.get(`/api/v1/admin/ebooks/${bookId}`).then(r => r.data?.data),
    enabled: !!bookId,
  })

  const purchasers: Purchaser[] = (detail?.purchasers ?? []).map(p => ({
    name: p.userName || 'Unknown',
    email: p.userEmail || '-',
    date: new Date(p.purchasedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  }))
  const salesByDay = detail ? buildSalesByDay(detail.purchasers) : []
  const totalDownloads = detail ? (detail.purchasers.reduce((s, p) => s + (p.downloadCount || 0), 0)) : (base?.downloads || 0)
  const totalRevenueCents = detail ? (detail.priceUsd * (detail.purchasers.length)) : 0

  const b = base
  const revenue = totalRevenueCents / 100
  const animRevenue = useCountUp(revenue, 900, 2)
  const animSales = useCountUp(purchasers.length || b?.sales || 0, 900)
  const animDownloads = useCountUp(totalDownloads, 900)

  if (!b) return null
  const hasSales = (purchasers.length || b.sales) > 0
  const maxVal = salesByDay.length > 0 ? Math.max(...salesByDay) : 0

  return (
    <>
      <span className="adm-ebk-backlink" onClick={onBack}><ChevronLeft size={14} /><span>Back to eBooks</span></span>
      <div className="adm-ebk-sdhead">
        <div className="adm-ebk-sdcover"><BookOpen size={20} /></div>
        <div>
          <div className="adm-ebk-sdtitle">{b.title}</div>
          <div className="adm-ebk-sdmeta">
            <span className="adm-ebk-mono" style={{ fontSize: 14, fontWeight: 600 }}>{fmtPrice(b.premiumPrice)} / {fmtPrice(b.standardPrice)}</span>
            <StatusBadge status={b.status} />
          </div>
        </div>
      </div>

      <div className="adm-ebk-detailcard">
        <h3 className="adm-ebk-cardh">Revenue summary</h3>
        <div className="adm-ebk-revgrid">
          <div className="adm-ebk-revstat"><div className="n">${animRevenue}</div><div className="l">Total revenue<span className="adm-ebk-revnote">Est. blended, Premium + standard</span></div></div>
          <div className="adm-ebk-revstat"><div className="n">{animSales}</div><div className="l">Units sold</div></div>
          <div className="adm-ebk-revstat"><div className="n">{animDownloads}</div><div className="l">Total downloads</div></div>
        </div>
      </div>

      <div className="adm-ebk-detailcard">
        <h3 className="adm-ebk-cardh">Sales over time</h3>
        {hasSales ? (() => {
          const gridSteps = 4
          const gridLines = Array.from({ length: gridSteps + 1 }, (_, i) => ({
            val: Math.round(maxVal * (i / gridSteps)),
            pct: (i / gridSteps) * 100,
          }))
          return (
            <div className="adm-ebk-chartwrap">
              <div className="adm-ebk-chartgrid">
                {gridLines.map((g, i) => (
                  <div key={i} className="adm-ebk-gridline" style={{ bottom: `${g.pct}%` }}><span>{g.val}</span></div>
                ))}
              </div>
              <div className="adm-ebk-chart">
                {salesByDay.map((n, i) => (
                  <div key={i} className="adm-ebk-barcol">
                    <div className="adm-ebk-barval">{n}</div>
                    <div className="adm-ebk-bar" style={{ height: `${Math.max(3, maxVal > 0 ? (n / maxVal) * 100 : 0)}%`, animationDelay: `${i * 30}ms` }} title={`Day ${i + 1}: ${n} sales`} />
                  </div>
                ))}
              </div>
            </div>
          )
        })() : (
          <div className="adm-ebk-chartempty">No sales yet, chart will populate once purchases begin.</div>
        )}
      </div>

      <div className="adm-ebk-detailcard">
        <h3 className="adm-ebk-cardh">Purchasers</h3>
        {hasSales ? (
          purchasers.map((p, i) => (
            <div key={i} className="adm-ebk-purchrow">
              <div><div className="adm-ebk-purchname">{p.name}</div><div className="adm-ebk-purchemail">{p.email}</div></div>
              <div className="adm-ebk-purchdate adm-ebk-mono">{p.date}</div>
            </div>
          ))
        ) : (
          <div className="adm-ebk-chartempty">No purchases yet.</div>
        )}
      </div>
    </>
  )
}

/* ============================================================
   MODALS
   ============================================================ */
type ModalKind = 'unpublish' | 'delete' | null

function EbookModal({ ebooks, kind, bookId, onClose, onConfirm }: {
  ebooks: Ebook[]; kind: ModalKind; bookId: string | null; onClose: () => void; onConfirm: () => void
}) {
  if (!kind || !bookId) return null
  const b = ebooks.find(x => x.id === bookId)
  if (!b) return null

  return createPortal(
    <div className="adm-ebk-overlay show" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="adm-ebk-modal">
        {kind === 'unpublish' ? (
          <>
            <div className="adm-ebk-modalico warning"><EyeOff size={28} /></div>
            <h3>Unpublish this eBook?</h3>
            <p>{b.title} will no longer be available for purchase. Existing purchasers keep access to their downloads. Sales history is retained.</p>
            <div className="adm-ebk-modalactions">
              <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancel</button>
              <button className="adm-btn adm-ebk-btnwarn" onClick={onConfirm}><EyeOff size={14} /> Unpublish</button>
            </div>
          </>
        ) : (
          <>
            <div className="adm-ebk-modalico red"><Trash2 size={28} /></div>
            <h3>Delete this draft?</h3>
            <p>{b.title} will be permanently removed. This cannot be undone.</p>
            <div className="adm-ebk-modalactions">
              <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancel</button>
              <button className="adm-btn adm-ebk-btndanger" onClick={onConfirm}><Trash2 size={14} /> Delete</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

/* ============================================================
   MOBILE EBOOK GRID
   ============================================================ */
function MobileEbookGrid({ ebooks, filter, onFilterChange, onEdit, onViewSales, onUnpublish, onDelete, onNew }: {
  ebooks: Ebook[]; filter: StatusFilter; onFilterChange: (f: StatusFilter) => void
  onEdit: (id: string) => void; onViewSales: (id: string) => void
  onUnpublish: (id: string) => void; onDelete: (id: string) => void; onNew: () => void
}) {
  const counts = { all: ebooks.length, published: 0, draft: 0, unpublished: 0 }
  ebooks.forEach(b => { if (b.status in counts) counts[b.status as keyof typeof counts]++ })
  const list = filter === 'all' ? ebooks : ebooks.filter(b => b.status === filter)

  if (ebooks.length === 0) {
    return (
      <div className="adm-ebk-empty">
        <div className="adm-ebk-emptyico"><BookOpen size={40} /></div>
        <h3>No eBooks yet</h3>
        <p>Upload your first title to start selling to OppDate users.</p>
        <button className="adm-ebk-empty-cta" onClick={onNew}><Upload size={15} /> Upload first eBook</button>
      </div>
    )
  }

  return (
    <>
      <div className="adm-mob-ebk-pills-scroll">
        <div className="adm-mob-ebk-pills-inner">
          {([['all', 'All'], ['published', 'Published'], ['draft', 'Draft'], ['unpublished', 'Unpublished']] as const).map(([k, lbl]) => (
            <button key={k} className={`adm-ebk-pill${filter === k ? ' active' : ''}`} onClick={() => onFilterChange(k)}>
              {lbl}<span className="adm-ebk-pillcnt">{counts[k]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="adm-mob-ebk-list">
        {list.map((b, i) => (
          <div key={b.id} className="adm-mob-ebk-card adm-mob-card-anim" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="adm-mob-ebk-card-top">
              <div className="adm-mob-ebk-thumb" style={{ position: 'relative', overflow: 'hidden' }}>
                {b.coverImageUrl
                  ? <img src={b.coverImageUrl} alt={b.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  : <BookOpen size={16} />
                }
              </div>
              <div className="adm-mob-ebk-card-info">
                <div className="adm-mob-ebk-card-title">{b.title}</div>
                <div className="adm-mob-ebk-card-author">{b.author}</div>
              </div>
              <StatusBadge status={b.status} />
            </div>
            <div className="adm-mob-ebk-card-meta">
              <span className="adm-mob-ebk-cat">{b.category}</span>
              <span className="adm-ebk-mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--adm-t-hi)' }}>{fmtPrice(b.premiumPrice)}</span>
              <span style={{ fontSize: 11, color: 'var(--adm-t-low)' }}> / {fmtPrice(b.standardPrice)}</span>
            </div>
            <div className="adm-mob-ebk-card-stats">
              <div className="adm-mob-ebk-stat"><span className="n">{b.sales}</span><span className="l">Sales</span></div>
              <div className="adm-mob-ebk-stat"><span className="n">{b.downloads}</span><span className="l">Downloads</span></div>
              <div className="adm-mob-ebk-stat"><span className="n">{b.pageCount}</span><span className="l">Pages</span></div>
            </div>
            <div className="adm-mob-ebk-card-actions">
              <span className="adm-ebk-act" onClick={() => onEdit(b.id)}><Edit3 size={13} /> Edit</span>
              {b.status === 'published' && <span className="adm-ebk-act" onClick={() => onUnpublish(b.id)}><EyeOff size={13} /> Unpublish</span>}
              {b.status === 'draft' && b.sales === 0 && <span className="adm-ebk-act danger" onClick={() => onDelete(b.id)}><Trash2 size={13} /> Delete</span>}
              <span className="adm-ebk-act" onClick={() => onViewSales(b.id)}><BarChart3 size={13} /> Sales <ArrowRight size={11} /></span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

/* ============================================================
   MOBILE EBOOK FORM (4-STEP STEPPER)
   ============================================================ */
const EBK_STEPS = ['Details', 'Content', 'Pricing']

function MobileEbookForm({ ebooks, bookId, onBack }: { ebooks: Ebook[]; bookId: string | null; onBack: () => void }) {
  const b = bookId ? ebooks.find(x => x.id === bookId) : null
  const f = useEbookForm(b, bookId, onBack)
  const [step, setStep] = useState(1)
  const primaryLabel = f.editing && b?.status === 'published' ? 'Save changes' : 'Publish'

  return (
    <div className="adm-mob-ebk-form-wrap">
      <div className="adm-mob-ebk-form-head">
        <button className="adm-mob-ebk-back" onClick={onBack}><ArrowLeft size={18} /></button>
        <span className="adm-mob-ebk-form-title">{f.editing ? 'Edit eBook' : 'New eBook'}</span>
      </div>

      <div className="adm-mob-prail" style={{ top: 52 }}>
        {EBK_STEPS.map((s, i) => (
          <button key={s} className={`adm-mob-prail-seg${step === i + 1 ? ' active' : ''}${i + 1 < step ? ' done' : ''}`} onClick={() => setStep(i + 1)} title={s} />
        ))}
      </div>

      <div className="adm-mob-ebk-form-label">{EBK_STEPS[step - 1]}</div>

      <div className="adm-mob-ebk-form-body">
        {step === 1 && (
          <div className="adm-mob-ebk-step-card">
            <div className="adm-ebk-field">
              <label className="adm-ebk-fieldlabel">Cover image</label>
              <FileDropzone kind="cover" url={f.coverUrl} name={f.coverName} uploading={f.coverUploading} error={f.coverError} inputRef={f.coverInputRef} onDrop={f.handleCoverDrop} onPick={f.uploadCover} />
            </div>
            <div className="adm-ebk-field">
              <label className="adm-ebk-fieldlabel">Title <span className="adm-ebk-req">*</span></label>
              <input className="adm-ebk-inp" value={f.title} onChange={e => f.setTitle(e.target.value)} placeholder="e.g. Mastering the Personal Statement" />
            </div>
            <div className="adm-ebk-field">
              <label className="adm-ebk-fieldlabel">Author name <span className="adm-ebk-req">*</span></label>
              <input className="adm-ebk-inp" value={f.author} onChange={e => f.setAuthor(e.target.value)} placeholder="e.g. Dr. Amara Okonkwo" />
            </div>
            <div className="adm-ebk-field">
              <label className="adm-ebk-fieldlabel">Page count</label>
              <input className="adm-ebk-inp" type="number" min={1} value={f.pageCount} onChange={e => f.setPageCount(e.target.value)} placeholder="142" />
            </div>
            <div className="adm-ebk-field">
              <label className="adm-ebk-fieldlabel">Category <span className="adm-ebk-req">*</span></label>
              <select className="adm-ebk-sel" value={f.category} onChange={e => f.setCategory(e.target.value)}>
                {EBOOK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="adm-ebk-field">
              <label className="adm-ebk-fieldlabel">Description</label>
              <textarea className="adm-ebk-ta" rows={3} value={f.desc} onChange={e => f.setDesc(e.target.value)} placeholder="What will readers get from this eBook?" />
              <div className="adm-ebk-fieldhelp">Aim for 2 to 3 sentences.</div>
            </div>
            <button className="adm-mob-ebk-nextsec" onClick={() => setStep(2)}>Next: Content <ArrowRight size={14} /></button>
          </div>
        )}

        {step === 2 && (
          <div className="adm-mob-ebk-step-card">
            <div className="adm-ebk-field">
              <label className="adm-ebk-fieldlabel">What&apos;s inside <span className="adm-ebk-req">*</span></label>
              {f.whatsInside.map((item, i) => (
                <div key={i} className="adm-ebk-wirow">
                  <span className="adm-ebk-winum adm-ebk-mono">{String(i + 1).padStart(2, '0')}</span>
                  <input className="adm-ebk-inp" value={item} onChange={e => f.setWhatsInside(prev => prev.map((v, j) => j === i ? e.target.value : v))} placeholder="e.g. The UK funding map" />
                  <button className="adm-ebk-iconbtn sm" onClick={() => f.setWhatsInside(prev => prev.filter((_, j) => j !== i))}><X size={13} /></button>
                </div>
              ))}
              <button className="adm-mob-ebk-add-item" onClick={() => f.setWhatsInside(prev => [...prev, ''])}><Plus size={15} /> Add item</button>
            </div>
            <button className="adm-mob-ebk-nextsec" onClick={() => setStep(3)}>Next: Pricing <ArrowRight size={14} /></button>
          </div>
        )}

        {step === 3 && (
          <div className="adm-mob-ebk-step-card">
            <div className="adm-ebk-field">
              <label className="adm-ebk-fieldlabel">Standard price (USD) <span className="adm-ebk-req">*</span></label>
              <div className="adm-ebk-priceinput"><span className="adm-ebk-pfx">$</span><input className="adm-ebk-inp" value={f.standardPrice} onChange={e => f.setStandardPrice(e.target.value)} placeholder="24.99" /></div>
            </div>
            <div className="adm-ebk-field">
              <label className="adm-ebk-fieldlabel">Premium member price (USD) <span className="adm-ebk-req">*</span></label>
              <div className="adm-ebk-priceinput"><span className="adm-ebk-pfx">$</span><input className="adm-ebk-inp" value={f.premiumPrice} onChange={e => f.setPremiumPrice(e.target.value)} placeholder="14.99" /></div>
            </div>
            {f.savings && <div className="adm-ebk-savings">Members save ${f.savings}</div>}
            <div className="adm-ebk-field">
              <label className="adm-ebk-fieldlabel">Lemon Squeezy variant ID</label>
              <input className="adm-ebk-inp" value={f.lsVariantId} onChange={e => f.setLsVariantId(e.target.value)} placeholder="e.g. 123456" />
              <div className="adm-ebk-fieldhelp">From the LS dashboard: Products &gt; Variants tab. Required for checkout.</div>
            </div>
            <div className="adm-ebk-field">
              <label className="adm-ebk-fieldlabel">eBook file <span className="adm-ebk-req">*</span></label>
              <FileDropzone kind="file" url={f.fileUrl} name={f.fileName} uploading={f.fileUploading} error={f.fileError} inputRef={f.fileInputRef} onDrop={f.handleFileDrop} onPick={f.uploadFile} />
            </div>
            {f.error && <div style={{ color: 'var(--adm-red)', fontSize: 13, marginTop: 8 }}>{f.error}</div>}
          </div>
        )}
      </div>

      <div className="adm-mob-ebk-form-footer">
        <button className="adm-btn adm-btn-ghost" onClick={onBack} disabled={f.saving}>Cancel</button>
        <button className="adm-btn adm-ebk-btnoutline" disabled={f.saving} onClick={() => f.save('draft')}>Save as draft</button>
        <button className="adm-btn adm-ebk-btn-outline" disabled={f.saving} onClick={() => f.save('published')}>{f.saving ? 'Saving...' : primaryLabel}</button>
      </div>
    </div>
  )
}

/* ============================================================
   MOBILE SALES DETAIL
   ============================================================ */
function MobileSalesDetail({ ebooks, bookId, onBack }: { ebooks: Ebook[]; bookId: string; onBack: () => void }) {
  const b = ebooks.find(x => x.id === bookId)

  const { data: detail } = useQuery<ApiEbookDetail>({
    queryKey: ['admin-ebook-detail', bookId],
    queryFn: () => api.get(`/api/v1/admin/ebooks/${bookId}`).then(r => r.data?.data),
    enabled: !!bookId,
  })

  const purchasers: Purchaser[] = (detail?.purchasers ?? []).map(p => ({
    name: p.userName || 'Unknown',
    email: p.userEmail || '-',
    date: new Date(p.purchasedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  }))
  const salesByDay = detail ? buildSalesByDay(detail.purchasers) : []
  const totalDownloads = detail ? detail.purchasers.reduce((s, p) => s + (p.downloadCount || 0), 0) : (b?.downloads || 0)
  const revenue = detail ? (detail.priceUsd * detail.purchasers.length) / 100 : 0

  const animRevenue = useCountUp(revenue, 900, 2)
  const animSales = useCountUp(purchasers.length || b?.sales || 0, 900)
  const animDownloads = useCountUp(totalDownloads, 900)

  if (!b) return null
  const hasSales = (purchasers.length || b.sales) > 0
  const maxVal = salesByDay.length > 0 ? Math.max(...salesByDay) : 0

  return (
    <div className="adm-mob-ebk-sales-wrap">
      <div className="adm-mob-ebk-sales-head">
        <button className="adm-mob-ebk-back" onClick={onBack}><ArrowLeft size={18} /></button>
        <span className="adm-mob-ebk-sales-htitle">Sales detail</span>
      </div>

      <div className="adm-mob-ebk-sales-body">
        <div className="adm-mob-ebk-sales-hero adm-mob-card-anim">
          <div className="adm-mob-ebk-thumb" style={{ width: 48, height: 64 }}>
            <BookOpen size={18} />
          </div>
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <div className="adm-mob-ebk-card-title">{b.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span className="adm-ebk-mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--adm-t-hi)' }}>{fmtPrice(b.premiumPrice)} / {fmtPrice(b.standardPrice)}</span>
              <StatusBadge status={b.status} />
            </div>
          </div>
        </div>

        <div className="adm-mob-ebk-rev-grid adm-mob-card-anim" style={{ animationDelay: '40ms' }}>
          <div className="adm-mob-ebk-rev-stat">
            <div className="n">${animRevenue}</div>
            <div className="l">Total revenue</div>
            <div className="sub">Est. blended</div>
          </div>
          <div className="adm-mob-ebk-rev-stat">
            <div className="n">{animSales}</div>
            <div className="l">Units sold</div>
          </div>
          <div className="adm-mob-ebk-rev-stat">
            <div className="n">{animDownloads}</div>
            <div className="l">Downloads</div>
          </div>
        </div>

        <div className="adm-mob-ebk-sales-card adm-mob-card-anim" style={{ animationDelay: '80ms' }}>
          <h3 className="adm-ebk-cardh">Sales over time</h3>
          {hasSales ? (
            <div className="adm-mob-ebk-chart-scroll">
              <div className="adm-ebk-chartwrap" style={{ minWidth: salesByDay.length > 10 ? salesByDay.length * 28 : 'auto' }}>
                <div className="adm-ebk-chartgrid">
                  {Array.from({ length: 5 }, (_, i) => ({
                    val: Math.round(maxVal * (i / 4)),
                    pct: (i / 4) * 100,
                  })).map((g, i) => (
                    <div key={i} className="adm-ebk-gridline" style={{ bottom: `${g.pct}%` }}><span>{g.val}</span></div>
                  ))}
                </div>
                <div className="adm-ebk-chart">
                  {salesByDay.map((n, i) => (
                    <div key={i} className="adm-ebk-barcol">
                      <div className="adm-ebk-barval">{n}</div>
                      <div className="adm-ebk-bar" style={{ height: `${Math.max(3, maxVal > 0 ? (n / maxVal) * 100 : 0)}%`, animationDelay: `${i * 30}ms` }} title={`Day ${i + 1}: ${n} sales`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="adm-ebk-chartempty">No sales yet, chart will populate once purchases begin.</div>
          )}
        </div>

        <div className="adm-mob-ebk-sales-card adm-mob-card-anim" style={{ animationDelay: '120ms' }}>
          <h3 className="adm-ebk-cardh">Purchasers</h3>
          {hasSales ? (
            purchasers.map((p, i) => (
              <div key={i} className="adm-ebk-purchrow">
                <div><div className="adm-ebk-purchname">{p.name}</div><div className="adm-ebk-purchemail">{p.email}</div></div>
                <div className="adm-ebk-purchdate adm-ebk-mono">{p.date}</div>
              </div>
            ))
          ) : (
            <div className="adm-ebk-chartempty">No purchases yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
function EbooksSkeleton() {
  return (
    <>
      <div className="adm-page-head">
        <div><div className="adm-skel adm-skel-line w25" style={{ height: 24, marginBottom: 8 }} /><div className="adm-skel adm-skel-line w15" style={{ height: 13 }} /></div>
        <div style={{ display: 'flex', gap: 10 }}><div className="adm-skel adm-skel-pill" /><div className="adm-skel adm-skel-pill" /></div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 20 }}>
        {[50, 70, 80, 70].map((w, i) => <div key={i} className="adm-skel adm-skel-pill" style={{ width: w }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="adm-skel" style={{ height: 220, borderRadius: 12 }} />)}
      </div>
    </>
  )
}

export function AdminEbooksPage() {
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const [view, setView] = useState<View>('grid')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [salesId, setSalesId] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalKind>(null)
  const [modalData, setModalData] = useState<string | null>(null)

  const { data: apiData, isLoading } = useQuery<{ data: ApiEbook[]; total: number }>({
    queryKey: ['admin-ebooks'],
    queryFn: () => api.get('/api/v1/admin/ebooks', { params: { limit: 100 } }).then(r => r.data),
  })

  const ebooks: Ebook[] = (apiData?.data ?? []).map(apiEbookToUi)

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/admin/ebooks/${id}`, { status: 'unpublished' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-ebooks'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/ebooks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-ebooks'] }),
  })

  const handleEdit = useCallback((id: string) => { setEditingId(id); setView('form') }, [])
  const handleNew = useCallback(() => { setEditingId(null); setView('form') }, [])
  const handleViewSales = useCallback((id: string) => { setSalesId(id); setView('sales') }, [])
  const handleBackToGrid = useCallback(() => { setView('grid'); setEditingId(null); setSalesId(null) }, [])

  const handleConfirm = useCallback(() => {
    if (modal === 'unpublish' && modalData) unpublishMutation.mutate(modalData)
    if (modal === 'delete' && modalData) deleteMutation.mutate(modalData)
    setModal(null)
    setModalData(null)
  }, [modal, modalData])

  if (isLoading) return <EbooksSkeleton />

  if (isMobile && view === 'form') {
    return <MobileEbookForm ebooks={ebooks} bookId={editingId} onBack={handleBackToGrid} />
  }

  if (isMobile && view === 'sales' && salesId) {
    return <MobileSalesDetail ebooks={ebooks} bookId={salesId} onBack={handleBackToGrid} />
  }

  return (
    <div className="adm-ebk-wrap">
      <div className="adm-ebk-head">
        <div><h1>eBooks</h1><span className="adm-ebk-headsub">Library management</span></div>
        {!isMobile && view === 'grid' && (
          <div className="adm-ebk-headactions">
            <button className="adm-btn adm-btn-ghost adm-ebk-newbtn" onClick={handleNew}><Plus size={14} /> Upload new eBook</button>
          </div>
        )}
      </div>
      <div className="adm-ebk-content">
        {!isMobile && view === 'grid' && (
          <GridView
            ebooks={ebooks}
            filter={filter}
            onFilterChange={setFilter}
            onEdit={handleEdit}
            onViewSales={handleViewSales}
            onUnpublish={(id) => { setModal('unpublish'); setModalData(id) }}
            onDelete={(id) => { setModal('delete'); setModalData(id) }}
            onNew={handleNew}
          />
        )}
        {isMobile && view === 'grid' && (
          <MobileEbookGrid
            ebooks={ebooks}
            filter={filter}
            onFilterChange={setFilter}
            onEdit={handleEdit}
            onViewSales={handleViewSales}
            onUnpublish={(id) => { setModal('unpublish'); setModalData(id) }}
            onDelete={(id) => { setModal('delete'); setModalData(id) }}
            onNew={handleNew}
          />
        )}
        {!isMobile && view === 'form' && <EbookForm ebooks={ebooks} bookId={editingId} onBack={handleBackToGrid} />}
        {!isMobile && view === 'sales' && salesId && <SalesDetail ebooks={ebooks} bookId={salesId} onBack={handleBackToGrid} />}
      </div>

      {isMobile && view === 'grid' && (
        <button className="adm-fab" onClick={handleNew}><Plus /></button>
      )}

      <EbookModal ebooks={ebooks} kind={modal} bookId={modalData} onClose={() => { setModal(null); setModalData(null) }} onConfirm={handleConfirm} />
    </div>
  )
}
