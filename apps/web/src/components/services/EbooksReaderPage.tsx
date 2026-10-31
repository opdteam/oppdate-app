'use client'

import { useState, useRef, useCallback, useEffect, useMemo, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Settings, Download, ChevronLeft, ChevronRight, LayoutList, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueries } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys, fetchers } from '@/lib/queries'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// PDF.js worker - use CDN to avoid Next.js webpack bundling conflicts
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

// ============================================================
// Hooks
// ============================================================

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

// ============================================================
// Theme / size constants
// ============================================================

interface ThemePal { bg: string; fg: string; muted: string; border: string; headerBg: string }

const THEMES: Record<string, ThemePal> = {
  light: { bg: '#FBF7F1', fg: '#2A2018', muted: '#7A6E62', border: 'rgba(122,45,5,0.10)', headerBg: 'rgba(251,247,241,0.88)' },
  sepia: { bg: '#F2E6D2', fg: '#43331F', muted: '#8A7355', border: 'rgba(122,45,5,0.12)', headerBg: 'rgba(242,230,210,0.88)' },
  dark:  { bg: '#1A1410', fg: '#E8DDD0', muted: '#8A7B6E', border: 'rgba(232,221,208,0.10)', headerBg: 'rgba(26,20,16,0.90)' },
}

// Size maps to canvas width multiplier (relative to default fit-width)
const SIZE_SCALE: Record<string, number> = { small: 0.82, medium: 1, large: 1.18, xl: 1.36 }
const SIZE_LABEL_FS: Record<string, number> = { small: 13, medium: 15, large: 18, xl: 21 }

function toRgba(hex: string, a: number) {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

// ============================================================
// Keyframes (injected once)
// ============================================================

const KEYFRAMES = `
.eb-scrubber {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(122,45,5,0.15);
  cursor: pointer;
  outline: none;
}
.eb-scrubber::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #7A2D05;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(122,45,5,0.3);
  transition: transform 120ms ease, box-shadow 120ms ease;
}
.eb-scrubber::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 2px 8px rgba(122,45,5,0.4);
}
.eb-scrubber::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #7A2D05;
  cursor: pointer;
  border: none;
  box-shadow: 0 1px 4px rgba(122,45,5,0.3);
}
.eb-scrubber::-moz-range-track {
  height: 4px;
  border-radius: 2px;
  background: rgba(122,45,5,0.15);
}
@keyframes ebPageIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ebFade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes ebSlideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
@keyframes ebSlideRight {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
@keyframes ebShimmer {
  from { background-position: -600px 0; }
  to   { background-position:  600px 0; }
}
@keyframes ebPanelIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
}
`

function InjectKeyframes() {
  useEffect(() => {
    if (document.getElementById('eb-reader-kf')) return
    const s = document.createElement('style')
    s.id = 'eb-reader-kf'
    s.textContent = KEYFRAMES
    document.head.appendChild(s)
    return () => { document.getElementById('eb-reader-kf')?.remove() }
  }, [])
  return null
}

// ============================================================
// Skeleton loader (shown while PDF page decodes)
// ============================================================

function PageSkeleton({ width, height, pal }: { width: number; height: number; pal: ThemePal }) {
  return (
    <div style={{
      width, height, borderRadius: 4, flexShrink: 0,
      background: `linear-gradient(90deg, ${toRgba(pal.fg, 0.04)} 0%, ${toRgba(pal.fg, 0.10)} 50%, ${toRgba(pal.fg, 0.04)} 100%)`,
      backgroundSize: '600px 100%',
      animation: 'ebShimmer 1.4s ease infinite',
    }} />
  )
}

// ============================================================
// PDF canvas (single page)
// ============================================================

interface PdfCanvasProps {
  fileUrl: string
  pageNum: number
  nextPageNum: number | null
  canvasWidth: number
  pal: ThemePal
  theme: string
  onLoad: (numPages: number) => void
  animKey: string
}

function PdfCanvas({ fileUrl, pageNum, nextPageNum, canvasWidth, pal, theme, onLoad, animKey }: PdfCanvasProps) {
  const [loaded, setLoaded] = useState(false)
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1
  const estimatedHeight = Math.round(canvasWidth * 1.41) // A4 ratio approx
  return (
    <Document
      file={fileUrl}
      onLoadSuccess={({ numPages }) => onLoad(numPages)}
      onLoadError={() => {}}
      loading={null}
    >
      {/* Visible page */}
      <div
        key={animKey}
        style={{
          animation: 'ebPageIn 80ms ease-out both',
          display: 'flex', justifyContent: 'center',
          boxShadow: theme === 'dark' ? '0 8px 40px rgba(0,0,0,0.5)' : '0 8px 40px rgba(0,0,0,0.18)',
          borderRadius: 2,
          background: '#fff',
          position: 'relative',
        }}
      >
        {!loaded && <div style={{ position: 'absolute', inset: 0 }}><PageSkeleton width={canvasWidth} height={estimatedHeight} pal={pal} /></div>}
        <Page
          pageNumber={pageNum}
          width={canvasWidth}
          devicePixelRatio={dpr}
          renderTextLayer={true}
          renderAnnotationLayer={false}
          onRenderSuccess={() => setLoaded(true)}
          loading={null}
        />
      </div>

      {/* Pre-render next page (hidden) */}
      {nextPageNum && (
        <div style={{ position: 'absolute', top: -9999, left: -9999, opacity: 0, pointerEvents: 'none' }}>
          <Page pageNumber={nextPageNum} width={canvasWidth} devicePixelRatio={dpr} renderTextLayer={false} renderAnnotationLayer={false} loading={null} />
        </div>
      )}
    </Document>
  )
}

// ============================================================
// Thumbnail strip
// ============================================================

interface ThumbnailStripProps {
  fileUrl: string
  numPages: number
  currentPage: number
  onJump: (n: number) => void
  pal: ThemePal
  onClose?: () => void
  mobile?: boolean
}

function ThumbnailStrip({ fileUrl, numPages, currentPage, onJump, pal, onClose, mobile }: ThumbnailStripProps) {
  const thumbRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState<Set<number>>(new Set([1, 2, 3]))

  // Virtualise: only render pages whose thumbnails are visible
  useEffect(() => {
    if (!thumbRef.current) return
    const observer = new IntersectionObserver((entries) => {
      setVisible(prev => {
        const next = new Set(prev)
        entries.forEach(e => {
          const pg = parseInt((e.target as HTMLElement).dataset.page ?? '0')
          if (e.isIntersecting) next.add(pg)
        })
        return next
      })
    }, { threshold: 0.01 })
    thumbRef.current.querySelectorAll('[data-page]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [numPages])

  // Scroll current page into view in sidebar
  useEffect(() => {
    const el = thumbRef.current?.querySelector(`[data-page="${currentPage}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentPage])

  if (mobile) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.75)' }}
        onClick={onClose}>
        <div onClick={e => e.stopPropagation()} style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '45vh',
          background: pal.bg, borderRadius: '16px 16px 0 0',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: `1px solid ${pal.border}`, flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 15, color: pal.fg }}>Pages</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: pal.muted, padding: 4 }}><X size={18} /></button>
          </div>
          <div ref={thumbRef} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {Array.from({ length: numPages }, (_, i) => i + 1).map(pg => (
              <div key={pg} data-page={pg} onClick={() => { onJump(pg); onClose?.() }} style={{
                cursor: 'pointer', borderRadius: 6, overflow: 'hidden',
                border: pg === currentPage ? '2px solid #7A2D05' : `1px solid ${pal.border}`,
                boxShadow: pg === currentPage ? '0 0 0 2px rgba(122,45,5,0.2)' : 'none',
                transition: 'border 140ms ease',
              }}>
                <div style={{ background: '#fff', lineHeight: 0, overflow: 'hidden' }}>
                  {visible.has(pg)
                    ? <Document file={fileUrl} loading={<div style={{ width: 90, height: 120, background: '#f5f5f5' }} />}>
                        <Page pageNumber={pg} width={90} renderTextLayer={false} renderAnnotationLayer={false} loading={null} />
                      </Document>
                    : <div style={{ width: 90, height: 120, background: toRgba(pal.fg, 0.04) }} />
                  }
                </div>
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: 10, color: pg === currentPage ? '#7A2D05' : pal.muted, padding: '4px 0 6px', background: pal.bg }}>{pg}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={thumbRef} style={{
      width: 188, flexShrink: 0, borderRight: `1px solid ${pal.border}`,
      overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8,
      background: pal.bg,
    }}>
      {Array.from({ length: numPages }, (_, i) => i + 1).map(pg => (
        <div key={pg} data-page={pg} onClick={() => onJump(pg)} style={{
          cursor: 'pointer', borderRadius: 6, overflow: 'hidden',
          border: pg === currentPage ? '2px solid #7A2D05' : `1px solid ${pal.border}`,
          boxShadow: pg === currentPage ? '0 0 0 2px rgba(122,45,5,0.18)' : 'none',
          transition: 'border 140ms ease, box-shadow 140ms ease',
        }}>
          <div style={{ background: '#fff', lineHeight: 0 }}>
            {visible.has(pg)
              ? <Document file={fileUrl} loading={<div style={{ height: 232, background: '#f5f5f5' }} />}>
                  <Page pageNumber={pg} width={164} renderTextLayer={false} renderAnnotationLayer={false} loading={null} />
                </Document>
              : <div style={{ height: 232, background: toRgba(pal.fg, 0.04) }} />
            }
          </div>
          <div style={{ textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: 10, color: pg === currentPage ? '#7A2D05' : pal.muted, padding: '4px 0 6px' }}>{pg}</div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Settings panel
// ============================================================

interface SettingsPanelProps {
  size: string; onSize: (s: string) => void
  theme: string; onTheme: (t: string) => void
  onDownload: () => void; downloading: boolean
  onClose: () => void; mobile: boolean
  pal: ThemePal
}

function SettingsPanel({ size, onSize, theme, onTheme, onDownload, downloading, onClose, mobile, pal }: SettingsPanelProps) {
  const dragY = useRef(0)
  const startY = useRef(0)
  const [translateY, setTranslateY] = useState(0)

  const onPointerDown = (e: React.PointerEvent) => {
    startY.current = e.clientY
    dragY.current = 0
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const delta = Math.max(0, e.clientY - startY.current)
    dragY.current = delta
    setTranslateY(delta)
  }
  const onPointerUp = () => {
    if (dragY.current > 80) { onClose(); return }
    setTranslateY(0)
  }

  const isDark = theme === 'dark'
  const panelBg = isDark ? 'rgba(28,20,16,0.97)' : 'rgba(255,255,255,0.96)'
  const panelBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.8)'
  const panelShadowUp = isDark ? '0 -8px 40px rgba(0,0,0,0.5)' : '0 -8px 40px rgba(0,0,0,0.18)'
  const panelShadowDown = isDark ? '0 16px 48px rgba(0,0,0,0.5)' : '0 16px 48px rgba(0,0,0,0.18)'

  const panelStyle: React.CSSProperties = mobile
    ? {
        position: 'fixed', bottom: 0, left: 0, right: 0,
        borderRadius: '16px 16px 0 0',
        background: panelBg,
        backdropFilter: 'blur(28px) saturate(160%)',
        WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        border: `1px solid ${panelBorder}`,
        boxShadow: panelShadowUp,
        padding: '0 16px 32px',
        animation: 'ebSlideUp 260ms var(--ease-out-soft,ease) both',
        transform: `translateY(${translateY}px)`,
        transition: translateY === 0 ? 'transform 200ms ease' : 'none',
        zIndex: 60,
        touchAction: 'none',
      }
    : {
        position: 'absolute', top: 60, right: 16, width: 320,
        borderRadius: 16,
        background: panelBg,
        backdropFilter: 'blur(28px) saturate(160%)',
        WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        border: `1px solid ${panelBorder}`,
        boxShadow: panelShadowDown,
        padding: 22,
        animation: 'ebSlideRight 240ms var(--ease-out-soft,ease) both',
        zIndex: 60,
      }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 59, background: mobile ? 'rgba(0,0,0,0.3)' : 'transparent', animation: mobile ? 'ebFade 180ms ease both' : 'none' }} />
      <div style={panelStyle}>
        {/* Mobile drag handle */}
        {mobile && (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 10px', cursor: 'grab', touchAction: 'none' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }} />
          </div>
        )}

        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 16, color: pal.fg, marginBottom: 18, marginTop: mobile ? 0 : 0 }}>Reading settings</div>

        {/* Zoom */}
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: pal.muted, marginBottom: 10 }}>Zoom</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
          {Object.keys(SIZE_SCALE).map(k => {
            const on = k === size
            return (
              <button key={k} onClick={() => onSize(k)} style={{
                flex: 1, height: 46, borderRadius: 10, cursor: 'pointer',
                background: on ? '#7A2D05' : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.7)'),
                border: `1px solid ${on ? '#7A2D05' : pal.border}`,
                color: on ? '#fff' : pal.fg,
                fontFamily: 'var(--font-serif)', fontWeight: 600,
                fontSize: SIZE_LABEL_FS[k],
                transition: 'all 140ms ease',
              }}>A</button>
            )
          })}
        </div>

        {/* Background */}
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: pal.muted, marginBottom: 10 }}>Background</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
          {([['light', 'Light', '#FBF7F1'], ['sepia', 'Sepia', '#F2E6D2'], ['dark', 'Dark', '#1A1410']] as const).map(([k, lbl, sw]) => {
            const on = k === theme
            return (
              <button key={k} onClick={() => onTheme(k)} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 8px',
                borderRadius: 10, cursor: 'pointer',
                background: on ? toRgba('#7A2D05', 0.12) : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.7)'),
                border: `1.5px solid ${on ? '#7A2D05' : pal.border}`,
                fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: pal.fg,
              }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: sw, border: `1px solid ${pal.border}`, flexShrink: 0 }} />
                {lbl}
              </button>
            )
          })}
        </div>

        {/* Download */}
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: pal.muted, marginBottom: 10 }}>Download for offline</div>
        <button
          onClick={() => { onDownload(); onClose() }}
          disabled={downloading}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            height: 44, borderRadius: 10, cursor: downloading ? 'default' : 'pointer',
            background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.7)',
            border: `1px solid ${pal.border}`,
            fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 500, color: pal.fg,
            opacity: downloading ? 0.6 : 1, transition: 'opacity 140ms ease',
          }}>
          <Download size={16} style={{ color: '#7A2D05' }} />
          {downloading ? 'Preparing...' : 'Download file'}
        </button>
      </div>
    </>
  )
}

// ============================================================
// Exported reader page
// ============================================================

export function EbooksReaderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookSlug = searchParams.get('book') || ''
  const mob = useIsMobile()
  const [mounted, setMounted] = useState(false)

  // Reader state
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [animKey, setAnimKey] = useState('p1')
  const [size, setSize] = useState<string>('medium')
  const [theme, setTheme] = useState<string>('light')
  const [settings, setSettings] = useState(false)
  const [thumbs, setThumbs] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [jumpInput, setJumpInput] = useState('')
  const [scrubbing, setScrubbing] = useState(false)
  const [scrubPage, setScrubPage] = useState(1)
  const [pdfError, setPdfError] = useState(false)

  // Swipe gesture state (mobile)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const swipeOffset = useRef(0)
  const [dragX, setDragX] = useState(0)
  const [swiping, setSwiping] = useState(false)

  // Progress sync
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bookIdRef = useRef<string>('')

  // Canvas width
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(700)

  // Auto-hide controls timer
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputFocused = useRef(false)

  useEffect(() => { setMounted(true) }, [])

  // Measure container width
  useLayoutEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 700
      setContainerW(w)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const canvasWidth = useMemo(() => {
    const sidebarW = thumbs && !mob ? 188 : 0
    const available = Math.max(300, containerW - sidebarW - 48)
    const base = Math.min(available, mob ? available : 720)
    return Math.round(base * SIZE_SCALE[size])
  }, [containerW, thumbs, mob, size])

  // Fetch data
  const [libraryResult, catalogResult] = useQueries({
    queries: [
      { queryKey: keys.ebookLibrary, queryFn: fetchers.ebookLibrary, staleTime: 2 * 60 * 1000 },
      { queryKey: keys.ebooks,       queryFn: fetchers.ebooks,       staleTime: 5 * 60 * 1000 },
    ],
  })

  const book = useMemo(() => {
    const purchase = (libraryResult.data ?? []).find(p => p.slug === bookSlug)
    if (purchase) {
      return {
        id: purchase.ebookId,
        title: purchase.title || bookSlug,
        pageCount: purchase.pageCount || 0,
        initialProgress: purchase.readingProgress,
        fileUrl: purchase.fileUrl ?? undefined,
      }
    }
    const catalog = (catalogResult.data ?? []).find(e => e.slug === bookSlug)
    if (catalog) {
      return {
        id: catalog.id,
        title: catalog.title,
        pageCount: catalog.pageCount || 0,
        initialProgress: 0,
        fileUrl: (catalog as any).fileUrl as string | undefined,
      }
    }
    return null
  }, [libraryResult.data, catalogResult.data, bookSlug])

  // Store bookId in ref for use in event handlers
  useEffect(() => { bookIdRef.current = book?.id ?? '' }, [book?.id])

  // Jump to initial page after PDF loads
  const onDocumentLoad = useCallback((np: number) => {
    setNumPages(np)
    if (book?.initialProgress && book.initialProgress > 0) {
      const pg = Math.max(1, Math.min(np, Math.round(book.initialProgress / 100 * np)))
      setCurrentPage(pg)
      setScrubPage(pg)
      setAnimKey('p' + pg)
    }
  }, [book?.initialProgress])

  // Progress sync
  const syncProgress = useCallback((page: number, total: number, id: string, immediate = false) => {
    if (!id || total === 0) return
    const pct = Math.round((page / total) * 100)
    const doSync = () => api.patch(`/api/v1/ebooks/${id}/progress`, { progress: pct }).catch(() => {})
    if (immediate) { doSync(); return }
    if (progressTimer.current) clearTimeout(progressTimer.current)
    progressTimer.current = setTimeout(doSync, 2000)
  }, [])

  // Sync on visibility change (tab close/background)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden' && numPages > 0 && bookIdRef.current) {
        syncProgress(currentPage, numPages, bookIdRef.current, true)
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [currentPage, numPages, syncProgress])

  // Page navigation
  const goTo = useCallback((pg: number) => {
    if (numPages === 0) return
    const target = Math.max(1, Math.min(numPages, pg))
    setCurrentPage(target)
    setScrubPage(target)
    setAnimKey('p' + target + '_' + Date.now())
    syncProgress(target, numPages, bookIdRef.current)
  }, [numPages, syncProgress])

  const goNext = useCallback(() => goTo(currentPage + 1), [currentPage, goTo])
  const goPrev = useCallback(() => goTo(currentPage - 1), [currentPage, goTo])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      resetHideTimer()
      if (e.key === 'ArrowRight' || (e.key === ' ' && !e.shiftKey)) { e.preventDefault(); goNext() }
      if (e.key === 'ArrowLeft' || (e.key === ' ' && e.shiftKey)) { e.preventDefault(); goPrev() }
      if (e.key === 'g' || e.key === 'G') {
        const inp = document.getElementById('eb-jump-input')
        inp?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setControlsVisible(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (!settings && !thumbs && !inputFocused.current) {
      hideTimer.current = setTimeout(() => setControlsVisible(false), 3000)
    }
  }, [settings, thumbs])

  useEffect(() => {
    resetHideTimer()
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current) }
  }, [resetHideTimer])

  useEffect(() => {
    window.addEventListener('mousemove', resetHideTimer, { passive: true })
    return () => window.removeEventListener('mousemove', resetHideTimer)
  }, [resetHideTimer])

  // Keep controls visible when settings/thumbs are open
  useEffect(() => {
    if (settings || thumbs) {
      setControlsVisible(true)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    } else {
      resetHideTimer()
    }
  }, [settings, thumbs, resetHideTimer])

  // Download
  const handleDownload = async () => {
    if (!book || downloading) return
    setDownloading(true)
    try {
      const res = await api.post<{ data: { downloadUrl: string } }>(`/api/v1/ebooks/${book.id}/download`)
      const url = res.data?.data?.downloadUrl
      if (url) window.open(url, '_blank')
    } catch { /* silent */ }
    finally { setDownloading(false) }
  }

  // Mobile swipe gestures
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!mob || settings || thumbs) return
    swipeStart.current = { x: e.clientX, y: e.clientY }
    swipeOffset.current = 0
    setSwiping(false)
  }, [mob, settings, thumbs])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!mob || !swipeStart.current) return
    const dx = e.clientX - swipeStart.current.x
    const dy = e.clientY - swipeStart.current.y
    if (!swiping && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      setSwiping(true)
    }
    if (swiping) {
      swipeOffset.current = dx
      setDragX(dx * 0.4)
    }
  }, [mob, swiping])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!mob || !swipeStart.current) return
    const dx = swipeOffset.current
    const wasSwipe = swiping && Math.abs(dx) > 60
    setSwiping(false)
    setDragX(0)
    swipeStart.current = null

    if (wasSwipe) {
      if (dx < 0) goNext()
      else goPrev()
      return
    }

    // Tap zones (not a swipe)
    const { clientX } = e
    const w = window.innerWidth
    if (clientX < 60) { goPrev(); return }
    if (clientX > w - 60) { goNext(); return }
    // Center tap: toggle controls
    resetHideTimer()
    setControlsVisible(v => !v)
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }, [mob, swiping, goNext, goPrev, resetHideTimer])

  const pal = THEMES[theme]
  const progress = numPages > 0 ? Math.round((currentPage / numPages) * 100) : 0
  const controlStyle = (dir: 'up' | 'down') => ({
    opacity: controlsVisible ? 1 : 0,
    transform: controlsVisible ? 'translateY(0)' : dir === 'up' ? 'translateY(-110%)' : 'translateY(110%)',
    transition: 'opacity 220ms ease, transform 220ms ease',
    pointerEvents: controlsVisible ? 'auto' as const : 'none' as const,
  })

  if (!mounted) return null

  const loading = libraryResult.isLoading || catalogResult.isLoading

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: pal.bg, transition: 'background 250ms ease', zIndex: 9999, overflow: 'hidden' }}>
      <InjectKeyframes />

      {/* Header */}
      <header style={{
        ...controlStyle('up'),
        position: 'fixed', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', gap: 10, height: mob ? 48 : 56, padding: '0 12px',
        background: pal.headerBg,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${pal.border}`, zIndex: 10,
      }}>
        <button onClick={() => router.push('/services/ebooks/library')} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-sans)', fontSize: mob ? 13 : 14, fontWeight: 500, color: pal.fg, padding: '6px 8px', borderRadius: 8,
          flexShrink: 0,
        }}>
          <ArrowLeft size={mob ? 16 : 18} /> Library
        </button>

        {!mob && (
          <button onClick={() => { setThumbs(t => !t); setSettings(false) }} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, background: thumbs ? toRgba('#7A2D05', 0.10) : 'none',
            border: 'none', cursor: 'pointer', color: thumbs ? '#7A2D05' : pal.fg,
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, padding: '6px 8px', borderRadius: 8, flexShrink: 0,
          }}>
            <LayoutList size={16} /> Pages
          </button>
        )}

        <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: mob ? 13 : 14.5, color: pal.fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {book?.title || bookSlug}
          </div>
          {numPages > 0 && (
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: pal.muted }}>
              {progress}% - {currentPage} of {numPages}
            </div>
          )}
        </div>

        {mob && (
          <button onClick={() => { setThumbs(true); setSettings(false) }} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: pal.fg, flexShrink: 0,
          }}>
            <LayoutList size={18} />
          </button>
        )}



        <button onClick={() => { setSettings(s => !s); setThumbs(false) }} style={{
          background: settings ? toRgba('#7A2D05', 0.10) : 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8,
          color: settings ? '#7A2D05' : pal.fg, flexShrink: 0,
        }}>
          <Settings size={mob ? 17 : 19} />
        </button>
      </header>

      {/* Progress bar */}
      <div style={{
        position: 'fixed', top: mob ? 48 : 56, left: 0, right: 0, zIndex: 10,
        height: 3, background: toRgba('#7A2D05', 0.10),
        opacity: controlsVisible ? 1 : 0, transition: 'opacity 220ms ease',
      }}>
        <div style={{ height: '100%', width: progress + '%', background: '#7A2D05', transition: 'width 300ms linear' }} />
      </div>

      {/* Body: sidebar + canvas */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, display: 'flex', overflow: 'hidden' }}>

        {/* Thumbnail sidebar (desktop) - always mounted, shown/hidden via CSS */}
        {!mob && (
          <div style={{
            width: thumbs ? 188 : 0,
            overflow: 'hidden',
            flexShrink: 0,
            transition: 'width 220ms ease',
          }}>
            <ThumbnailStrip
              fileUrl={book?.fileUrl ?? ''}
              numPages={numPages}
              currentPage={currentPage}
              onJump={goTo}
              pal={pal}
            />
          </div>
        )}

        {/* PDF canvas area */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{ flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: mob ? '16px 12px 16px' : '32px 24px 32px', userSelect: swiping ? 'none' : 'auto' }}>

          {loading ? (
            <PageSkeleton width={canvasWidth} height={Math.round(canvasWidth * 1.41)} pal={pal} />
          ) : !book?.fileUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 200 }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: pal.muted }}>
                {pdfError ? 'Could not load PDF. Try downloading the file instead.' : 'No file available for this eBook.'}
              </div>
            </div>
          ) : (
            <div style={{ transform: `translateX(${dragX}px)`, transition: swiping ? 'none' : 'transform 240ms cubic-bezier(0.25,0.46,0.45,0.94)' }}>
              <PdfCanvas
                fileUrl={book.fileUrl}
                pageNum={currentPage}
                nextPageNum={currentPage < numPages ? currentPage + 1 : null}
                canvasWidth={canvasWidth}
                pal={pal}
                theme={theme}
                onLoad={onDocumentLoad}
                animKey={animKey}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{
        ...controlStyle('down'),
        position: 'fixed', bottom: 0, left: 0, right: 0,
        borderTop: `1px solid ${pal.border}`,
        background: pal.headerBg, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        zIndex: 10,
        padding: mob ? '10px 16px 14px' : '12px 24px',
        display: 'flex', alignItems: 'center', gap: mob ? 8 : 16,
      }}>
        <button onClick={goPrev} disabled={currentPage <= 1} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: currentPage <= 1 ? 'default' : 'pointer',
          fontFamily: 'var(--font-sans)', fontSize: mob ? 13 : 14, fontWeight: 500,
          color: currentPage <= 1 ? toRgba(pal.fg, 0.25) : pal.fg, padding: '6px 10px', borderRadius: 8, flexShrink: 0,
          transition: 'color 140ms ease',
        }}>
          <ChevronLeft size={mob ? 15 : 17} /> {!mob && 'Prev'}
        </button>

        {/* Scrubber + page jump */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          {numPages > 1 && (
            <div style={{ position: 'relative', width: '100%' }}>
              {scrubbing && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: `${((scrubPage - 1) / Math.max(1, numPages - 1)) * 100}%`,
                  transform: 'translateX(-50%)',
                  background: '#7A2D05', color: '#fff', borderRadius: 6, padding: '3px 8px',
                  fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
                  marginBottom: 6, whiteSpace: 'nowrap', pointerEvents: 'none',
                }}>
                  {scrubPage}
                </div>
              )}
              <input
                type="range" min={1} max={numPages} value={scrubPage}
                onChange={e => { const v = parseInt(e.target.value); setScrubPage(v) }}
                onMouseDown={() => setScrubbing(true)}
                onTouchStart={() => setScrubbing(true)}
                onMouseUp={() => { setScrubbing(false); goTo(scrubPage) }}
                onTouchEnd={() => { setScrubbing(false); goTo(scrubPage) }}
                className="eb-scrubber"
              />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 12 : 13, color: pal.muted }}>Page</span>
            <input
              id="eb-jump-input"
              type="text"
              inputMode="numeric"
              value={jumpInput || (numPages > 0 ? String(currentPage) : '')}
              onChange={e => setJumpInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const pg = parseInt(jumpInput)
                  if (!isNaN(pg)) goTo(pg)
                  setJumpInput('')
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
              onFocus={() => {
                inputFocused.current = true
                setControlsVisible(true)
                if (hideTimer.current) clearTimeout(hideTimer.current)
              }}
              onBlur={() => {
                inputFocused.current = false
                setJumpInput('')
                resetHideTimer()
              }}
              style={{
                width: mob ? 38 : 44, textAlign: 'center', border: `1px solid ${pal.border}`, borderRadius: 6,
                fontFamily: 'var(--font-sans)', fontSize: mob ? 12 : 13, fontWeight: 600, color: pal.fg,
                background: 'transparent', padding: '3px 4px', outline: 'none',
              }}
            />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 12 : 13, color: pal.muted }}>of {numPages || '...'}</span>
          </div>
        </div>

        <button onClick={goNext} disabled={currentPage >= numPages} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: currentPage >= numPages ? 'default' : 'pointer',
          fontFamily: 'var(--font-sans)', fontSize: mob ? 13 : 14, fontWeight: 500,
          color: currentPage >= numPages ? toRgba(pal.fg, 0.25) : pal.fg, padding: '6px 10px', borderRadius: 8, flexShrink: 0,
          transition: 'color 140ms ease',
        }}>
          {!mob && 'Next'} <ChevronRight size={mob ? 15 : 17} />
        </button>
      </div>

      {/* Settings panel */}
      {settings && (
        <SettingsPanel
          size={size} onSize={setSize}
          theme={theme} onTheme={setTheme}
          onDownload={handleDownload} downloading={downloading}
          onClose={() => setSettings(false)}
          mobile={mob} pal={pal}
        />
      )}

      {/* Thumbnail strip (mobile modal) - always mounted, shown/hidden via visibility */}
      {mob && book?.fileUrl && (
        <div style={{
          visibility: thumbs ? 'visible' : 'hidden',
          pointerEvents: thumbs ? 'auto' : 'none',
        }}>
          <ThumbnailStrip
            fileUrl={book.fileUrl}
            numPages={numPages}
            currentPage={currentPage}
            onJump={goTo}
            pal={pal}
            onClose={() => setThumbs(false)}
            mobile
          />
        </div>
      )}
    </div>,
    document.body
  )
}
