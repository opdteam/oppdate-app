'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Upload, RefreshCw, Eye, Download, Trash2, LayoutGrid, List,
  Search, CloudUpload, FileText, Image, Star, ArrowUp, Repeat,
  AlertTriangle, X, Loader,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { keys, fetchers } from '@/lib/queries'

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

type DocKind = 'PDF' | 'DOCX' | 'JPG' | 'PNG'

interface Doc {
  id: string
  cat: string
  kind: DocKind
  name: string
  size: string
  uploaded: string
  used: number
}

type UploadingDoc = { id: string; name: string; kind: DocKind; size: string; progress: number }

function mimeToKind(mime: string): DocKind {
  if (mime.includes('pdf')) return 'PDF'
  if (mime.includes('wordprocessingml') || mime.includes('docx')) return 'DOCX'
  if (mime.includes('png')) return 'PNG'
  return 'JPG'
}

function typeToTab(type: string): string {
  const map: Record<string, string> = {
    cv: 'cv', transcript: 'transcripts', personal_statement: 'statement',
    certificate: 'certificates', portfolio: 'certificates',
    reference_letter: 'certificates', passport_photo: 'other', other: 'other',
  }
  return map[type] || 'other'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

function fmtUploadDate(iso: string): string {
  return 'Uploaded ' + new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const KIND_STYLES: Record<DocKind, { bg: string; fg: string; icon: 'file' | 'image'; texture: 'lines' | 'grid'; lineColor: string }> = {
  PDF:  { bg: 'rgba(220,38,38,0.1)',  fg: '#DC2626', icon: 'file',  texture: 'lines', lineColor: 'rgba(220,38,38,0.15)' },
  DOCX: { bg: 'rgba(14,116,144,0.1)', fg: '#0E7490', icon: 'file',  texture: 'lines', lineColor: 'rgba(14,116,144,0.15)' },
  JPG:  { bg: 'rgba(212,132,58,0.1)', fg: '#D4843A', icon: 'image', texture: 'grid',  lineColor: 'rgba(212,132,58,0.12)' },
  PNG:  { bg: 'rgba(212,132,58,0.1)', fg: '#D4843A', icon: 'image', texture: 'grid',  lineColor: 'rgba(212,132,58,0.12)' },
}

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'cv', label: 'CV / Resume' },
  { id: 'transcripts', label: 'Transcripts' },
  { id: 'statement', label: 'Personal Statement' },
  { id: 'certificates', label: 'Certificates' },
  { id: 'other', label: 'Other' },
]

const DOC_TYPE_OPTIONS = [
  { value: 'cv',                 label: 'CV / Resume' },
  { value: 'transcript',         label: 'Transcript' },
  { value: 'personal_statement', label: 'Personal Statement' },
  { value: 'certificate',        label: 'Certificate' },
  { value: 'portfolio',          label: 'Portfolio' },
  { value: 'reference_letter',   label: 'Reference Letter' },
  { value: 'passport_photo',     label: 'Passport Photo' },
  { value: 'other',              label: 'Other' },
]

const CL_SHADOW = '0 8px 32px rgba(122,45,5,0.10), inset 0 1px 0 rgba(255,255,255,0.6)'
const CL_SHADOW_LG = '0 4px 20px rgba(122,45,5,0.14), 0 12px 32px rgba(122,45,5,0.08)'

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(24px) saturate(140%)',
  WebkitBackdropFilter: 'blur(24px) saturate(140%)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: CL_SHADOW,
  boxSizing: 'border-box' as const,
}

function DocTile({ kind, size, power, radius }: { kind: DocKind; size: number; power?: boolean; radius?: number }) {
  const k = KIND_STYLES[kind]
  const IconComp = k.icon === 'file' ? FileText : Image
  const lineCount = power ? 3 : 2
  const iconSize = size * 0.46
  return (
    <span style={{
      position: 'relative', width: size, height: size, borderRadius: radius ?? 12, flexShrink: 0,
      background: power ? 'rgba(220,38,38,0.08)' : k.bg, color: k.fg, overflow: 'hidden',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <IconComp size={iconSize} style={{ position: 'relative', zIndex: 1 }} />
      {k.texture === 'lines' ? (
        <span aria-hidden="true" style={{
          position: 'absolute', bottom: '16%', left: '22%', right: '22%',
          display: 'flex', flexDirection: 'column', gap: Math.round(size * 0.08),
        }}>
          {[0.9, 1, 0.65].slice(0, lineCount).map((w, i) => (
            <span key={i} style={{ height: 1.5, width: `${w * 100}%`, borderRadius: 1, background: k.lineColor }} />
          ))}
        </span>
      ) : (
        <span aria-hidden="true" style={{
          position: 'absolute', inset: 0, opacity: 0.35,
          backgroundImage: `linear-gradient(${k.lineColor} 1px, transparent 1px), linear-gradient(90deg, ${k.lineColor} 1px, transparent 1px)`,
          backgroundSize: `${Math.round(size / 4)}px ${Math.round(size / 4)}px`,
        }} />
      )}
    </span>
  )
}

function UsageBadge({ used }: { used: number }) {
  if (used > 0) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, whiteSpace: 'nowrap',
        padding: '3px 10px', borderRadius: 999, background: 'rgba(212,132,58,0.1)',
        fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, lineHeight: 1, color: '#B5530A',
      }}>
        <Repeat size={10} />Used {used} {used === 1 ? 'time' : 'times'}
      </span>
    )
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, whiteSpace: 'nowrap',
      padding: '3px 10px', borderRadius: 999, background: 'rgba(122,45,5,0.06)',
      fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, lineHeight: 1, color: 'var(--app-helper)',
    }}>
      <ArrowUp size={10} />Ready to use
    </span>
  )
}

function ActionBtn({ icon: Icon, label, red, cardHover, onClick, compact, loading }: {
  icon: React.ElementType; label: string; red?: boolean; cardHover?: boolean
  onClick?: () => void; compact?: boolean; loading?: boolean
}) {
  const [h, setH] = useState(false)
  const lift = h || cardHover
  const color = red ? '#DC2626' : (lift ? 'var(--app-ginger)' : 'var(--app-helper)')
  const labelColor = red ? '#DC2626' : (lift ? 'var(--app-ginger)' : 'var(--app-text-sec)')
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      disabled={loading}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? 2 : 4,
        background: 'none', border: 'none', cursor: loading ? 'default' : 'pointer',
        padding: compact ? '2px 0' : '4px 0', transition: 'color 130ms', opacity: loading ? 0.5 : 1,
      }}
    >
      <span style={{ color, display: 'flex', transition: 'color 130ms' }}>
        {loading ? <Loader size={compact ? 14 : 16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Icon size={compact ? 14 : 16} />}
      </span>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 10 : 11, color: labelColor, transition: 'color 130ms' }}>{label}</span>
    </button>
  )
}

function RingMeter({ size = 56, stroke = 4, pct = 0, children }: {
  size?: number; stroke?: number; pct?: number; children?: React.ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(122,45,5,0.08)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--app-ginger)" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${c * Math.min(1, pct / 100)} ${c}`} />
      </svg>
      {children}
    </span>
  )
}

function DocStack() {
  const rects = [
    { rotate: -8, opacity: 0.7 },
    { rotate: 4, opacity: 0.5 },
    { rotate: 14, opacity: 0.3 },
  ]
  return (
    <div aria-hidden="true" style={{ position: 'absolute', right: 18, bottom: -6 }}>
      {rects.map((r, i) => (
        <div key={i} style={{
          position: 'absolute', right: i * 4, bottom: i * 2,
          width: 28, height: 36, borderRadius: 4,
          background: 'rgba(122,45,5,0.02)', border: '1px solid rgba(122,45,5,0.06)',
          transform: `rotate(${r.rotate}deg)`, opacity: r.opacity,
        }} />
      ))}
    </div>
  )
}

function StatStrip({ compact, totalDocs, totalReused, topDoc }: {
  compact?: boolean
  totalDocs: number
  totalReused: number
  topDoc: Doc | null
}) {
  const ringPct = totalDocs === 0 ? 0 : Math.min(100, Math.round((totalReused / (totalDocs * 5)) * 100))
  const topDocKind = topDoc?.kind ?? 'PDF'
  const topDocK = KIND_STYLES[topDocKind]
  const TopIcon = topDocK.icon === 'file' ? FileText : Image

  return (
    <div className="r-cred-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: compact ? 10 : 16, marginBottom: compact ? 18 : 28 }}>
      {/* Total docs */}
      <div style={{ ...glass, borderRadius: compact ? 12 : 14, padding: compact ? '12px 14px' : '18px 20px', position: 'relative', overflow: 'hidden' }}>
        <span style={{ color: 'var(--app-amber)', display: 'flex' }}><FileText size={compact ? 15 : 18} /></span>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 22 : 28, fontWeight: 700, lineHeight: 1, color: 'var(--app-ink)', marginTop: compact ? 6 : 10 }}>{totalDocs}</div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 11 : 12, color: 'var(--app-text-sec)', marginTop: compact ? 4 : 6 }}>Documents uploaded</div>
        {!compact && <DocStack />}
      </div>

      {/* Total reuses */}
      <div style={{ ...glass, borderRadius: compact ? 12 : 14, padding: compact ? '10px 14px' : '14px 20px', display: 'flex', alignItems: 'center', gap: compact ? 10 : 16 }}>
        <RingMeter size={compact ? 42 : 56} stroke={compact ? 3 : 4} pct={ringPct}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 14 : 20, fontWeight: 700, color: 'var(--app-ginger)', lineHeight: 1 }}>{totalReused}</span>
        </RingMeter>
        <div style={{ minWidth: 0 }}>
          <span style={{ color: 'var(--app-amber)', display: 'flex' }}><RefreshCw size={compact ? 13 : 16} /></span>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 11 : 12, color: 'var(--app-text-sec)', marginTop: compact ? 3 : 5, lineHeight: 1.4 }}>Times reused across applications</div>
        </div>
      </div>

      {/* Most reused */}
      <div style={{ ...glass, borderRadius: compact ? 12 : 14, padding: compact ? '10px 14px' : '14px 20px' }}>
        {topDoc && topDoc.used > 0 ? (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: compact ? 7 : 9, padding: compact ? '7px 10px' : '9px 12px', borderRadius: compact ? 8 : 10,
              background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.08)',
            }}>
              <span style={{ color: 'var(--app-amber)', display: 'flex', flexShrink: 0 }}><Star size={compact ? 10 : 12} fill="currentColor" /></span>
              <span style={{
                width: compact ? 18 : 20, height: compact ? 18 : 20, borderRadius: 6, background: topDocK.bg, color: topDocK.fg,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}><TopIcon size={compact ? 10 : 12} /></span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 12 : 14, fontWeight: 600, color: 'var(--app-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topDoc.name}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 10.5 : 12, fontWeight: 500, color: '#B5530A', marginTop: 1 }}>Used {topDoc.used} {topDoc.used === 1 ? 'time' : 'times'}</div>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 11 : 12, color: 'var(--app-text-sec)', marginTop: compact ? 5 : 8 }}>Most reused document</div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: 4 }}>
            <span style={{ color: 'var(--app-amber)', display: 'flex' }}><Star size={compact ? 13 : 16} /></span>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 12 : 14, fontWeight: 600, color: 'var(--app-ink)', marginTop: compact ? 6 : 8 }}>No reuses yet</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 11 : 12, color: 'var(--app-text-sec)', lineHeight: 1.4 }}>Documents used in applications will appear here.</div>
          </div>
        )}
      </div>
    </div>
  )
}

function UploadingCard({ doc, compact }: { doc: UploadingDoc; compact?: boolean }) {
  const k = KIND_STYLES[doc.kind]
  const IconComp = k.icon === 'file' ? FileText : Image
  return (
    <div style={{
      ...glass, borderRadius: compact ? 12 : 14, padding: compact ? 14 : 20, minHeight: compact ? 140 : 200, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      animation: 'cl-glow 2.4s ease-in-out infinite',
    }}>
      <span aria-hidden="true" style={{
        position: 'absolute', inset: 0, borderRadius: compact ? 12 : 14, pointerEvents: 'none',
        border: '1px solid rgba(122,45,5,0.6)',
        animation: 'cl-border-pulse 2.4s ease-in-out infinite',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 8 : 10 }}>
        <span style={{
          position: 'relative', width: compact ? 36 : 48, height: compact ? 36 : 48, borderRadius: compact ? 10 : 12, flexShrink: 0,
          background: k.bg, color: k.fg, overflow: 'hidden',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconComp size={compact ? 16 : 22} style={{ position: 'relative', zIndex: 1 }} />
          <span style={{
            position: 'absolute', top: 0, bottom: 0, width: 22,
            background: 'linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)',
            animation: 'cl-shimmer 1.8s ease-in-out infinite',
          }} />
        </span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 10 : 11, fontWeight: 600, letterSpacing: '0.06em', color: k.fg }}>{doc.kind}</span>
      </div>
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: compact ? 12.5 : 14, fontWeight: 600, color: 'var(--app-ink)', marginTop: compact ? 8 : 12,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{doc.name}</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 11 : 12, color: 'var(--app-text-sec)', marginTop: compact ? 2 : 4 }}>{doc.size}</div>
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: compact ? 11 : 12, color: 'var(--app-ginger)', marginTop: compact ? 6 : 8, fontWeight: 500,
        animation: 'cl-pulse 2.4s ease-in-out infinite',
      }}>
        Processing your document... {doc.progress}%
      </div>
      <div style={{
        position: 'relative', height: compact ? 3 : 4, borderRadius: 999, background: 'rgba(122,45,5,0.08)',
        overflow: 'hidden', marginTop: compact ? 6 : 8,
      }}>
        <div style={{
          position: 'relative', height: '100%', width: `${doc.progress}%`, borderRadius: 999,
          background: 'var(--app-ginger)', transition: 'width 300ms ease', overflow: 'hidden',
        }}>
          <span style={{
            position: 'absolute', top: 0, bottom: 0, width: 36,
            background: 'linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%)',
            animation: 'cl-shimmer 1.8s ease-in-out infinite',
          }} />
        </div>
      </div>
      <div style={{ flex: 1 }} />
    </div>
  )
}

function DocCard({ doc, power, onDelete, onDownload, onPreview, index = 0, compact }: {
  doc: Doc; power?: boolean
  onDelete: (d: Doc) => void
  onDownload: (d: Doc) => void
  onPreview: (d: Doc) => void
  index?: number; compact?: boolean
}) {
  const k = KIND_STYLES[doc.kind]
  const [hov, setHov] = useState(false)
  const [dlLoading, setDlLoading] = useState(false)
  const [pvLoading, setPvLoading] = useState(false)

  const handleDownload = useCallback(async () => {
    setDlLoading(true)
    await onDownload(doc)
    setDlLoading(false)
  }, [doc, onDownload])

  const handlePreview = useCallback(async () => {
    setPvLoading(true)
    await onPreview(doc)
    setPvLoading(false)
  }, [doc, onPreview])

  if (power) {
    return (
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          ...glass, background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(212,132,58,0.3)',
          boxShadow: hov
            ? `${CL_SHADOW_LG}, inset 0 -3px 12px rgba(212,132,58,0.12), inset 0 1px 0 rgba(255,255,255,0.6)`
            : '0 4px 20px rgba(122,45,5,0.14), 0 12px 32px rgba(122,45,5,0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
          borderRadius: compact ? 12 : 14, padding: compact ? 16 : 24, minHeight: compact ? 180 : 240, cursor: 'pointer', display: 'flex', flexDirection: 'column', minWidth: 0,
          transform: hov ? 'translateY(-2px)' : 'none',
          transition: 'transform 140ms var(--ease-out-soft), box-shadow 140ms var(--ease-out-soft)',
          animation: `ebRise 460ms var(--ease-out-soft) ${index * 60}ms both`,
        }}
      >
        <span style={{
          alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', marginBottom: compact ? 8 : 12,
          padding: compact ? '2px 7px' : '3px 8px', borderRadius: 999, background: 'rgba(212,132,58,0.12)',
          fontFamily: 'var(--font-sans)', fontSize: compact ? 9 : 10, fontWeight: 600, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: '#B5530A', lineHeight: 1.4,
        }}>Power document</span>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: compact ? 8 : 10 }}>
          <DocTile kind={doc.kind} size={compact ? 48 : 64} power radius={compact ? 12 : 14} />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 10 : 11, fontWeight: 600, letterSpacing: '0.06em', color: k.fg }}>{doc.kind}</span>
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: compact ? 14 : 16, fontWeight: 600, color: 'var(--app-ink)', marginTop: compact ? 8 : 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 11 : 12, color: 'var(--app-text-sec)', marginTop: compact ? 2 : 4 }}>{doc.size} {'\u00B7'} {doc.uploaded}</div>
        <div style={{ marginTop: compact ? 8 : 10 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 11 : 12, fontWeight: 600, color: '#B5530A' }}>Used {doc.used} {doc.used === 1 ? 'time' : 'times'}</div>
          <div style={{ height: compact ? 2 : 3, borderRadius: 999, background: 'rgba(122,45,5,0.08)', overflow: 'hidden', marginTop: compact ? 4 : 6 }}>
            <div style={{ height: '100%', width: '100%', borderRadius: 999, background: 'var(--app-ginger)' }} />
          </div>
        </div>
        <div style={{ height: 1, background: 'rgba(122,45,5,0.06)', marginTop: 'auto' }} />
        <div style={{ display: 'flex', alignItems: 'center', marginTop: compact ? 8 : 10 }}>
          <ActionBtn icon={Eye} label="Preview" cardHover={hov} compact={compact} loading={pvLoading} onClick={handlePreview} />
          <ActionBtn icon={Download} label="Download" cardHover={hov} compact={compact} loading={dlLoading} onClick={handleDownload} />
          <ActionBtn icon={Trash2} label="Delete" red onClick={() => onDelete(doc)} compact={compact} />
        </div>
      </div>
    )
  }

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...glass, borderRadius: compact ? 12 : 14, padding: compact ? 14 : 20, minHeight: compact ? 150 : 200, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', minWidth: 0,
        transform: hov ? 'translateY(-2px)' : 'none',
        boxShadow: hov
          ? `${CL_SHADOW_LG}, inset 0 -3px 12px rgba(212,132,58,0.12), inset 0 1px 0 rgba(255,255,255,0.6)`
          : CL_SHADOW,
        transition: 'transform 140ms var(--ease-out-soft), box-shadow 140ms var(--ease-out-soft)',
        animation: `ebRise 460ms var(--ease-out-soft) ${index * 60}ms both`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 8 : 10 }}>
        <DocTile kind={doc.kind} size={compact ? 36 : 48} />
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 10 : 11, fontWeight: 600, letterSpacing: '0.06em', color: k.fg }}>{doc.kind}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 12.5 : 14, fontWeight: 600, color: 'var(--app-ink)', marginTop: compact ? 8 : 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 11 : 12, color: 'var(--app-text-sec)', marginTop: compact ? 2 : 4 }}>{doc.size} {'\u00B7'} {doc.uploaded}</div>
      <div style={{ marginTop: compact ? 6 : 8 }}><UsageBadge used={doc.used} /></div>
      <div style={{ height: 1, background: 'rgba(122,45,5,0.06)', marginTop: 'auto' }} />
      <div style={{ display: 'flex', alignItems: 'center', marginTop: compact ? 8 : 10 }}>
        <ActionBtn icon={Eye} label="Preview" cardHover={hov} compact={compact} loading={pvLoading} onClick={handlePreview} />
        <ActionBtn icon={Download} label="Download" cardHover={hov} compact={compact} loading={dlLoading} onClick={handleDownload} />
        <ActionBtn icon={Trash2} label="Delete" red onClick={() => onDelete(doc)} compact={compact} />
      </div>
    </div>
  )
}

function DeleteModal({ doc, onClose, onConfirm, loading, error, compact }: {
  doc: Doc; onClose: () => void; onConfirm: () => void
  loading: boolean; error: string | null; compact?: boolean
}) {
  const k = KIND_STYLES[doc.kind]
  const IconComp = k.icon === 'file' ? FileText : Image
  const usedLine = doc.used > 0
    ? ` It is currently used in ${doc.used} active application${doc.used === 1 ? '' : 's'} and will be removed from those application records.`
    : ''
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: compact ? '24px 20px' : 24 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,10,4,0.4)', cursor: 'pointer' }} />
      <div style={{
        position: 'relative', maxWidth: 440, width: '100%', borderRadius: compact ? 16 : 20, padding: compact ? '28px 24px' : '36px 40px', boxSizing: 'border-box',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(24px) saturate(140%)', WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        border: '1px solid rgba(255,255,255,0.7)',
        boxShadow: '0 16px 48px rgba(122,45,5,0.18)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      }}>
        <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(220,38,38,0.1)', color: '#DC2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trash2 size={18} />
        </span>
        <h2 style={{ margin: '16px 0 0', fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 22, color: 'var(--app-ink)' }}>Delete this document?</h2>
        <div style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10, marginTop: 16,
          padding: '12px 16px', borderRadius: 10, boxSizing: 'border-box', textAlign: 'left',
          background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.1)',
        }}>
          <span style={{ width: 32, height: 32, borderRadius: 8, background: k.bg, color: k.fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconComp size={15} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--app-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 500, color: doc.used > 0 ? '#B5530A' : 'var(--app-helper)', marginTop: 2 }}>
              {doc.used > 0 ? `Used ${doc.used} ${doc.used === 1 ? 'time' : 'times'}` : 'Never used'}
            </div>
          </div>
        </div>
        <p style={{ margin: '12px 0 0', fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.6, color: '#5A3A25' }}>
          {doc.name} will be permanently deleted.{usedLine}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8 }}>
          <span style={{ color: '#DC2626', display: 'flex' }}><AlertTriangle size={15} /></span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: '#DC2626' }}>This cannot be undone.</span>
        </div>
        {error && (
          <div style={{ width: '100%', marginTop: 12, padding: '9px 14px', borderRadius: 8, boxSizing: 'border-box', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#DC2626' }}>{error}</span>
          </div>
        )}
        <div style={{ width: '100%', marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              width: '100%', height: 48, borderRadius: 12, border: 'none', cursor: loading ? 'default' : 'pointer',
              background: loading ? 'rgba(220,38,38,0.5)' : '#DC2626', color: '#fff',
              fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {loading
              ? <><Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Deleting...</>
              : <><Trash2 size={15} /> Yes, delete permanently</>
            }
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              width: '100%', height: 44, borderRadius: 12, cursor: loading ? 'default' : 'pointer',
              border: '1px solid var(--app-hairline)', background: 'transparent',
              fontFamily: 'var(--font-sans)', fontSize: 14, color: '#5A3A25',
              opacity: loading ? 0.5 : 1,
            }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function PreviewModal({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [onClose])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', padding: '48px 48px' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,10,4,0.75)', cursor: 'pointer' }} />
      <div style={{
        position: 'relative', borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(26,10,4,0.4)',
        maxWidth: '80%', maxHeight: '80%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 1, flexGrow: 0,
      }}>
        <img
          src={url}
          alt="Document preview"
          style={{
            display: 'block',
            maxWidth: '100%',
            maxHeight: 'calc(80vh - 96px)',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
          }}
        />
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

function UploadModal({ onClose, onSuccess, compact }: {
  onClose: () => void
  onSuccess: () => Promise<void>
  compact?: boolean
}) {
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState('')
  const [nameOverride, setNameOverride] = useState('')
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !uploading) onClose() }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [onClose, uploading])

  const ALLOWED_EXT = /\.(pdf|docx|jpg|jpeg|png)$/i

  function pickFile(f: File) {
    if (!ALLOWED_EXT.test(f.name)) {
      setError('Unsupported file type. Please upload a PDF, DOCX, JPG, or PNG.')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File exceeds the 10 MB limit. Please compress the file and try again.')
      return
    }
    setError(null)
    setFile(f)
  }

  async function handleUpload() {
    if (!file || !docType) return
    setUploading(true)
    setError(null)
    setProgress(0)

    const form = new FormData()
    form.append('type', docType)
    if (nameOverride.trim()) form.append('name', nameOverride.trim())
    form.append('file', file, file.name)

    try {
      await api.post('/api/v1/documents', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 90))
        },
      })
      setProgress(100)
      await onSuccess()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Upload failed. Please try again.')
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const canSubmit = !!file && !!docType && !uploading

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: compact ? '20px 16px' : 24 }}>
      <div onClick={() => { if (!uploading) onClose() }} style={{ position: 'absolute', inset: 0, background: 'rgba(26,10,4,0.4)', cursor: 'pointer' }} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', maxWidth: 480, width: '100%',
          borderRadius: compact ? 16 : 20, padding: compact ? '24px 20px' : '36px 36px 32px', boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(28px) saturate(150%)', WebkitBackdropFilter: 'blur(28px) saturate(150%)',
          border: '1px solid rgba(255,255,255,0.7)',
          boxShadow: '0 16px 56px rgba(122,45,5,0.20)',
          display: 'flex', flexDirection: 'column', gap: compact ? 14 : 18,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: compact ? 19 : 22, color: 'var(--app-ink)' }}>Upload document</h2>
          <button
            onClick={() => { if (!uploading) onClose() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-helper)', display: 'flex', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Drop zone */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f) }}
        />
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files[0]
            if (f) pickFile(f)
          }}
          onClick={() => { if (!uploading) fileInputRef.current?.click() }}
          style={{
            border: `2px dashed ${dragOver ? 'var(--app-ginger)' : file ? 'rgba(122,45,5,0.25)' : 'var(--app-hairline)'}`,
            borderRadius: 12,
            padding: compact ? '20px 16px' : '28px 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            background: dragOver ? 'rgba(122,45,5,0.04)' : file ? 'rgba(122,45,5,0.02)' : 'rgba(255,255,255,0.4)',
            cursor: uploading ? 'default' : 'pointer',
            transition: 'border-color 160ms ease, background 160ms ease',
            textAlign: 'center', minWidth: 0, overflow: 'hidden',
          }}
        >
          <CloudUpload size={compact ? 26 : 32} style={{ color: file ? 'var(--app-ginger)' : 'var(--app-helper)' }} />
          {file ? (
            <>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 13 : 14, fontWeight: 600, color: 'var(--app-ink)', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--app-text-sec)' }}>{formatBytes(file.size)}</span>
              {!uploading && (
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--app-ginger)', marginTop: 2 }}>Click to change file</span>
              )}
            </>
          ) : (
            <>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 13 : 14, color: 'var(--app-text-sec)' }}>Drag and drop, or click to browse</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--app-helper)', marginTop: 2 }}>PDF, DOCX, JPG, PNG - Max 10 MB</span>
            </>
          )}
        </div>

        {/* Document type */}
        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--app-text-sec)', marginBottom: 6, letterSpacing: '0.04em' }}>
            DOCUMENT TYPE <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <select
            value={docType}
            onChange={e => setDocType(e.target.value)}
            disabled={uploading}
            style={{
              width: '100%', height: compact ? 40 : 44, borderRadius: 10, padding: '0 14px',
              border: `1.5px solid ${!docType && error ? 'rgba(220,38,38,0.5)' : 'var(--app-hairline)'}`,
              background: 'rgba(255,255,255,0.8)',
              fontFamily: 'var(--font-sans)', fontSize: compact ? 13 : 14,
              color: docType ? 'var(--app-ink)' : 'var(--app-helper)',
              outline: 'none', cursor: uploading ? 'default' : 'pointer', boxSizing: 'border-box',
            }}
          >
            <option value="" disabled>Select document type...</option>
            {DOC_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Name override */}
        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--app-text-sec)', marginBottom: 6, letterSpacing: '0.04em' }}>
            CUSTOM NAME <span style={{ fontWeight: 400, color: 'var(--app-helper)' }}>(optional)</span>
          </label>
          <input
            value={nameOverride}
            onChange={e => setNameOverride(e.target.value)}
            placeholder={file?.name || 'e.g. Toluwani David - CV 2025'}
            disabled={uploading}
            style={{
              width: '100%', height: compact ? 40 : 44, padding: '0 14px', borderRadius: 10, boxSizing: 'border-box',
              border: '1.5px solid var(--app-hairline)', background: 'rgba(255,255,255,0.8)',
              fontFamily: 'var(--font-sans)', fontSize: compact ? 13 : 14, color: 'var(--app-ink)',
              outline: 'none',
            }}
          />
        </div>

        {/* Progress */}
        {uploading && (
          <div>
            <div style={{ position: 'relative', height: 4, borderRadius: 999, background: 'rgba(122,45,5,0.08)', overflow: 'hidden' }}>
              <div style={{
                position: 'relative', height: '100%', width: `${progress}%`, borderRadius: 999,
                background: 'var(--app-ginger)', transition: 'width 200ms ease', overflow: 'hidden',
              }}>
                <span style={{
                  position: 'absolute', top: 0, bottom: 0, width: 36,
                  background: 'linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%)',
                  animation: 'cl-shimmer 1.8s ease-in-out infinite',
                }} />
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--app-ginger)', marginTop: 6, fontWeight: 500 }}>
              {progress < 100 ? `Uploading... ${progress}%` : 'Processing...'}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#DC2626' }}>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleUpload}
            disabled={!canSubmit}
            style={{
              flex: 1, height: compact ? 42 : 48, borderRadius: 12, border: 'none',
              cursor: canSubmit ? 'pointer' : 'default',
              background: canSubmit ? 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)' : 'rgba(122,45,5,0.12)',
              color: canSubmit ? '#fff' : 'var(--app-helper)',
              fontFamily: 'var(--font-sans)', fontSize: compact ? 13 : 14, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: canSubmit ? '0 4px 14px rgba(122,45,5,0.26)' : 'none',
              transition: 'background 160ms ease, box-shadow 160ms ease',
            }}
          >
            {uploading
              ? <><Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Uploading...</>
              : <><Upload size={15} /> Upload document</>
            }
          </button>
          <button
            onClick={() => { if (!uploading) onClose() }}
            disabled={uploading}
            style={{
              height: compact ? 42 : 48, padding: '0 18px', borderRadius: 12, cursor: uploading ? 'default' : 'pointer',
              border: '1px solid var(--app-hairline)', background: 'transparent',
              fontFamily: 'var(--font-sans)', fontSize: compact ? 13 : 14, color: '#5A3A25',
              opacity: uploading ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ compact, onUpload }: { compact?: boolean; onUpload?: () => void }) {
  return (
    <div style={{ ...glass, borderRadius: compact ? 14 : 16, padding: compact ? '48px 20px' : '72px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{
        width: compact ? 72 : 96, height: compact ? 72 : 96, borderRadius: '50%', background: 'rgba(122,45,5,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--app-ginger)', marginBottom: compact ? 12 : 16,
      }} className="efx-enter">
        <CloudUpload size={compact ? 30 : 40} />
      </div>
      <h2 className="efx-rise" style={{ margin: '8px 0 0', fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: compact ? 18 : 22, color: 'var(--app-ink)', animationDelay: '580ms' }}>No documents yet.</h2>
      <p className="efx-rise" style={{ margin: '8px 0 0', fontFamily: 'var(--font-sans)', fontSize: compact ? 13 : 14, color: 'var(--app-text-sec)', animationDelay: '680ms' }}>Upload your CV, transcripts, certificates, and more.</p>
      <p className="efx-rise" style={{ margin: '4px 0 0', fontFamily: 'var(--font-sans)', fontSize: compact ? 12 : 13, color: 'var(--app-helper)', animationDelay: '740ms' }}>They will be ready to use every time you apply with OppDate.</p>
      <button
        className="efx-bounce efx-rise"
        onClick={onUpload}
        style={{
          marginTop: compact ? 20 : 24, height: compact ? 40 : 44, padding: compact ? '0 16px' : '0 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)',
          color: '#fff', fontFamily: 'var(--font-sans)', fontSize: compact ? 13 : 14, fontWeight: 600,
          boxShadow: '0 4px 14px rgba(122,45,5,0.28)', display: 'inline-flex', alignItems: 'center', gap: 8,
          animationDelay: '820ms', transition: 'box-shadow 160ms ease, transform 160ms ease',
        }}
      >
        <Upload size={compact ? 14 : 16} /> Upload your first document
      </button>
      <div className="efx-rise" style={{ fontFamily: 'var(--font-sans)', fontSize: compact ? 11 : 12, color: 'var(--app-helper)', marginTop: compact ? 10 : 12, animationDelay: '900ms' }}>Supported: PDF, DOCX, JPG, PNG - Max 10MB per file</div>
    </div>
  )
}

function CredsSkeleton({ mob }: { mob: boolean }) {
  return (
    <div className="skel-wrap" style={{ maxWidth: 1200, margin: '0 auto', padding: mob ? '0 14px 36px' : '0 24px 48px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: mob ? 20 : 32, marginBottom: mob ? 16 : 24 }}>
        <div>
          <div className="skel skel-line w50" style={{ height: mob ? 22 : 28, marginBottom: 8 }} />
          <div className="skel skel-line w30" style={{ height: 13 }} />
        </div>
        <div className="skel" style={{ width: mob ? 90 : 110, height: mob ? 36 : 44, borderRadius: 10 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: mob ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[0, 1, 2].map(i => <div key={i} className="skel-card" style={{ height: 80, borderRadius: 12 }} />)}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[50, 80, 75, 85, 70].map((w, i) => <div key={i} className="skel skel-pill" style={{ width: w }} />)}
      </div>
      <div className="skel" style={{ height: 38, borderRadius: 10, width: '100%', marginBottom: 20 }} />
      <div style={{ display: 'grid', gridTemplateColumns: mob ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 16 }}>
        {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="skel-card" style={{ height: mob ? 140 : 170, borderRadius: 14 }} />)}
      </div>
    </div>
  )
}

export function CredentialLibraryPage() {
  const [tab, setTab] = useState('all')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [query, setQuery] = useState('')
  const [deleteDoc, setDeleteDoc] = useState<Doc | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const mob = useIsMobile()
  const qc = useQueryClient()

  const { data: rawDocs = [], isLoading: loading } = useQuery({
    queryKey: keys.documents,
    queryFn: fetchers.documents,
    staleTime: 2 * 60 * 1000,
  })

  const allDocs = useMemo<Doc[]>(() => rawDocs.map(d => ({
    id: d.id,
    cat: typeToTab(d.type),
    kind: mimeToKind(d.mimeType || ''),
    name: d.name,
    size: formatBytes(d.fileSize || 0),
    uploaded: fmtUploadDate(d.uploadedAt),
    used: d.timesReused,
  })), [rawDocs])

  const totalDocs = allDocs.length
  const totalReused = allDocs.reduce((sum, d) => sum + d.used, 0)
  const topDoc = allDocs.reduce<Doc | null>((best, d) => {
    if (!best || d.used > best.used) return d
    return best
  }, null)

  const handleUploadSuccess = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: keys.documents })
    setShowUpload(false)
  }, [qc])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDoc) return
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      await api.delete(`/api/v1/documents/${deleteDoc.id}`)
      await qc.invalidateQueries({ queryKey: keys.documents })
      setDeleteDoc(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setDeleteError(msg || 'Failed to delete. Please try again.')
    } finally {
      setDeleteLoading(false)
    }
  }, [deleteDoc, qc])

  const handleDownload = useCallback(async (doc: Doc) => {
    try {
      const res = await api.get(`/api/v1/documents/${doc.id}/download`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: String(res.headers['content-type'] || 'application/octet-stream') })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = doc.name
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      // silently ignore
    }
  }, [])

  const handlePreview = useCallback(async (doc: Doc) => {
    try {
      const res = await api.get(`/api/v1/documents/${doc.id}/download`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: String(res.headers['content-type'] || 'application/octet-stream') })
      const url = URL.createObjectURL(blob)
      if (doc.kind === 'JPG' || doc.kind === 'PNG') {
        setPreviewUrl(url)
      } else {
        // Open PDF/DOCX in a new tab for in-browser preview
        window.open(url, '_blank')
        // Revoke after a short delay to allow the tab to load the blob
        setTimeout(() => URL.revokeObjectURL(url), 10000)
      }
    } catch {
      // silently ignore
    }
  }, [])

  if (loading) return <CredsSkeleton mob={mob} />

  const q = query.trim().toLowerCase()
  const docs = allDocs
    .filter(d => tab === 'all' || d.cat === tab)
    .filter(d => !q || d.name.toLowerCase().includes(q))

  const isEmpty = allDocs.length === 0

  const tabCount = (id: string) => id === 'all' ? allDocs.length : allDocs.filter(d => d.cat === id).length

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: mob ? '0 14px 36px' : '0 24px 48px', boxSizing: 'border-box' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: mob ? 'flex-start' : 'flex-end', justifyContent: 'space-between', gap: mob ? 12 : 20, paddingTop: mob ? 20 : 32, marginBottom: mob ? 16 : 24 }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: mob ? 22 : 28, letterSpacing: '-0.01em', color: 'var(--app-ink)' }}>Credential Library</h1>
            <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-sans)', fontSize: mob ? 12.5 : 14, color: 'var(--app-text-sec)' }}>Your documents. Uploaded once, used forever.</p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            style={{
              flexShrink: 0, height: mob ? 36 : 44, padding: mob ? '0 14px' : '0 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)',
              color: '#fff', fontFamily: 'var(--font-sans)', fontSize: mob ? 12.5 : 14, fontWeight: 600,
              boxShadow: '0 3px 12px rgba(122,45,5,0.28)', display: 'inline-flex', alignItems: 'center', gap: mob ? 6 : 8,
              transition: 'box-shadow 160ms ease, transform 160ms ease',
            }}
          >
            <Upload size={mob ? 14 : 16} /> Upload
          </button>
        </div>

        {isEmpty ? <EmptyState compact={mob} onUpload={() => setShowUpload(true)} /> : (
          <>
            <StatStrip compact={mob} totalDocs={totalDocs} totalReused={totalReused} topDoc={topDoc} />

            {/* Filter row */}
            <div style={{ marginBottom: mob ? 14 : 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: mob ? 8 : 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: mob ? 6 : 8, minWidth: 0, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
                  {TABS.map(t => {
                    const on = t.id === tab
                    return (
                      <button key={t.id} onClick={() => setTab(t.id)} style={{
                        display: 'inline-flex', alignItems: 'center', gap: mob ? 5 : 7, flexShrink: 0,
                        height: mob ? 30 : 36, padding: mob ? '0 10px' : '0 16px', borderRadius: 999, cursor: 'pointer',
                        background: on ? 'var(--app-ginger)' : 'transparent',
                        border: on ? '1px solid var(--app-ginger)' : '1px solid var(--app-hairline)',
                        fontFamily: 'var(--font-sans)', fontSize: mob ? 11.5 : 13, fontWeight: on ? 600 : 500,
                        color: on ? '#fff' : '#5A3A25', whiteSpace: 'nowrap',
                      }}>
                        {t.label}
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          minWidth: mob ? 16 : 18, height: mob ? 16 : 18, padding: mob ? '0 4px' : '0 5px', borderRadius: 999, boxSizing: 'border-box',
                          background: on ? 'rgba(255,255,255,0.22)' : 'rgba(122,45,5,0.08)',
                          fontFamily: 'var(--font-sans)', fontSize: mob ? 10 : 11, fontWeight: 600, lineHeight: 1,
                          color: on ? '#fff' : 'var(--app-text-sec)',
                        }}>{tabCount(t.id)}</span>
                      </button>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: mob ? 4 : 6, flexShrink: 0 }}>
                  {([{ id: 'grid' as const, I: LayoutGrid }, { id: 'list' as const, I: List }]).map(v => {
                    const on = view === v.id
                    return (
                      <button key={v.id} aria-label={`${v.id} view`} onClick={() => setView(v.id)} style={{
                        width: mob ? 30 : 36, height: mob ? 30 : 36, borderRadius: mob ? 8 : 10, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: on ? 'rgba(122,45,5,0.08)' : 'rgba(255,255,255,0.5)',
                        border: on ? '1px solid rgba(122,45,5,0.4)' : '1px solid var(--app-hairline)',
                        color: on ? 'var(--app-ginger)' : 'var(--app-helper)',
                      }}><v.I size={mob ? 15 : 17} /></button>
                    )
                  })}
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: mob ? 8 : 10, height: mob ? 38 : 44, padding: mob ? '0 10px' : '0 14px', marginTop: mob ? 8 : 10,
                borderRadius: mob ? 8 : 10, border: '1.5px solid var(--app-hairline)', background: 'rgba(255,255,255,0.75)', boxSizing: 'border-box',
              }}>
                <Search size={mob ? 14 : 16} style={{ color: 'var(--app-helper)', flexShrink: 0 }} />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search documents..."
                  style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: mob ? 13 : 14, color: 'var(--app-ink)' }} />
                {query && (
                  <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-helper)', display: 'flex', padding: 2 }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Empty filtered state */}
            {docs.length === 0 && (
              <div style={{ ...glass, borderRadius: 14, padding: '36px 24px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--app-ink)', marginBottom: 6 }}>No documents found</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--app-text-sec)' }}>
                  {query ? `No documents matching "${query}"` : 'No documents in this category yet.'}
                </div>
              </div>
            )}

            {/* Document grid */}
            {docs.length > 0 && view === 'grid' && (
              <div className="r-cred-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: mob ? 10 : 16 }}>
                {docs.map((d, i) => (
                  <DocCard
                    key={d.id}
                    doc={d}
                    power={topDoc?.id === d.id && d.used > 0}
                    onDelete={setDeleteDoc}
                    onDownload={handleDownload}
                    onPreview={handlePreview}
                    index={i}
                    compact={mob}
                  />
                ))}
              </div>
            )}

            {/* Document list */}
            {docs.length > 0 && view === 'list' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: mob ? 8 : 12 }}>
                {docs.map((d, i) => (
                  <div key={d.id} style={{
                    ...glass, borderRadius: mob ? 12 : 14, padding: mob ? '10px 12px' : '14px 20px',
                    display: 'flex', alignItems: mob ? 'flex-start' : 'center',
                    flexDirection: mob ? 'column' : 'row', gap: mob ? 8 : 16, cursor: 'pointer',
                    transition: 'transform 140ms var(--ease-out-soft), box-shadow 140ms var(--ease-out-soft)',
                    animation: `ebRise 460ms var(--ease-out-soft) ${i * 60}ms both`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(122,45,5,0.12), inset 0 1px 0 rgba(255,255,255,0.6)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = CL_SHADOW }}
                  >
                    {mob ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                          <DocTile kind={d.kind} size={32} radius={8} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600, color: 'var(--app-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--app-text-sec)', marginTop: 2 }}>{d.size} {'\u00B7'} {d.uploaded}</div>
                          </div>
                        </div>
                        <div style={{ width: '100%' }}><UsageBadge used={d.used} /></div>
                        <div style={{ width: '100%', height: 1, background: 'rgba(122,45,5,0.06)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-evenly', width: '100%' }}>
                          <ActionBtn icon={Eye} label="Preview" compact onClick={() => handlePreview(d)} />
                          <ActionBtn icon={Download} label="Download" compact onClick={() => handleDownload(d)} />
                          <ActionBtn icon={Trash2} label="Delete" red onClick={() => setDeleteDoc(d)} compact />
                        </div>
                      </>
                    ) : (
                      <>
                        <DocTile kind={d.kind} size={40} radius={10} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--app-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--app-text-sec)', marginTop: 3 }}>{d.size} {'\u00B7'} {d.uploaded}</div>
                        </div>
                        <UsageBadge used={d.used} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, width: 170 }}>
                          <ActionBtn icon={Eye} label="Preview" onClick={() => handlePreview(d)} />
                          <ActionBtn icon={Download} label="Download" onClick={() => handleDownload(d)} />
                          <ActionBtn icon={Trash2} label="Delete" red onClick={() => setDeleteDoc(d)} />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Modals */}
        {showUpload && (
          <UploadModal
            onClose={() => setShowUpload(false)}
            onSuccess={handleUploadSuccess}
            compact={mob}
          />
        )}

        {deleteDoc && (
          <DeleteModal
            doc={deleteDoc}
            onClose={() => { setDeleteDoc(null); setDeleteError(null) }}
            onConfirm={handleDeleteConfirm}
            loading={deleteLoading}
            error={deleteError}
            compact={mob}
          />
        )}

        {previewUrl && (
          <PreviewModal
            url={previewUrl}
            onClose={() => setPreviewUrl(null)}
          />
        )}
      </div>
    </>
  )
}
