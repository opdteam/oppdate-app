'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { keys, fetchers } from '@/lib/queries'
import { Download, BookOpen, ShoppingBag } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

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
// API shapes
// ============================================================

interface ApiPurchase {
  id: string
  ebookId: string
  readingProgress: number  // 0-100 integer
  downloadCount: number
  purchasedAt: string
  lastReadAt: string | null
  title: string | null
  author: string | null
  category: string | null
  coverImageUrl: string | null
  pageCount: number | null
  slug: string | null
}

// ============================================================
// Gradient cover fallback (used when no coverImageUrl)
// ============================================================

const COVER_PALETTE = [
  'linear-gradient(145deg, #B5520F 0%, #7A2D05 100%)',
  'linear-gradient(145deg, #475569 0%, #334155 100%)',
  'linear-gradient(145deg, #C4550A 0%, #922D04 100%)',
  'linear-gradient(145deg, #0E7490 0%, #155E75 100%)',
  'linear-gradient(145deg, #7A2D05 0%, #5C2104 100%)',
  'linear-gradient(145deg, #94A3B8 0%, #64748B 100%)',
]

function coverGradient(idx: number) {
  return COVER_PALETTE[idx % COVER_PALETTE.length]
}

function BookCover({ purchase, idx, width = 84, radius = 8 }: {
  purchase: ApiPurchase; idx: number; width?: number; radius?: number
}) {
  const h = Math.round(width * 1.33)
  const bg = coverGradient(idx)
  if (purchase.coverImageUrl) {
    return (
      <div style={{ width, height: h, borderRadius: radius, overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 12px rgba(122,45,5,0.14)' }}>
        <img src={purchase.coverImageUrl} alt={purchase.title ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    )
  }
  return (
    <div style={{
      width, height: h, borderRadius: radius, overflow: 'hidden', flexShrink: 0,
      background: bg, boxShadow: '0 4px 12px rgba(122,45,5,0.14)',
      position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      padding: Math.max(6, Math.round(width * 0.08)),
    }}>
      <div style={{
        fontFamily: 'var(--font-serif)', fontWeight: 600,
        fontSize: Math.max(9, Math.round(width * 0.1)),
        lineHeight: 1.15, color: '#fff',
        textShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }}>{purchase.title}</div>
    </div>
  )
}

// ============================================================
// CatBadge
// ============================================================

const CAT_TINT: Record<string, string> = {
  'Scholarships': '#0E7490',
  'Visa & Immigration': '#3E5E6C',
  'Career': '#4B7A3E',
}

function toRgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function CatBadge({ category }: { category: string | null }) {
  const cat = category || 'General'
  const c = CAT_TINT[cat] || '#7A2D05'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 22,
      fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, lineHeight: 1,
      padding: '0 11px', borderRadius: 999,
      background: toRgba(c, 0.10), border: `1px solid ${toRgba(c, 0.42)}`, color: c, whiteSpace: 'nowrap',
    }}>{cat}</span>
  )
}

// ============================================================
// Skeleton
// ============================================================

function LibrarySkeleton({ mob }: { mob: boolean }) {
  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: mob ? '24px 16px 48px' : '36px 32px 64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: mob ? 20 : 26 }}>
        <div>
          <div className="skel skel-line" style={{ width: 160, height: mob ? 28 : 36, marginBottom: 8, borderRadius: 8 }} />
          <div className="skel skel-line" style={{ width: 120, height: 14, borderRadius: 6 }} />
        </div>
        <div className="skel" style={{ width: 130, height: mob ? 36 : 40, borderRadius: 10 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: mob ? 12 : 14 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            display: 'flex', gap: 16, alignItems: 'center', padding: 18,
            background: 'rgba(255,255,255,0.55)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.6)',
            opacity: 1 - i * 0.18,
          }}>
            <div className="skel" style={{ width: mob ? 68 : 84, height: mob ? 90 : 112, borderRadius: 8, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skel skel-line" style={{ width: 70, height: 22, borderRadius: 999, marginBottom: 10 }} />
              <div className="skel skel-line" style={{ width: '70%', height: 18, borderRadius: 6, marginBottom: 8 }} />
              <div className="skel skel-line" style={{ width: '40%', height: 13, borderRadius: 6, marginBottom: 14 }} />
              <div className="skel" style={{ width: '55%', height: 6, borderRadius: 999 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <div className="skel" style={{ width: mob ? 40 : 100, height: mob ? 40 : 42, borderRadius: 9 }} />
              <div className="skel" style={{ width: mob ? 40 : 42, height: mob ? 40 : 42, borderRadius: 9 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Library row
// ============================================================

function LibraryRow({ purchase, idx, onContinue, onDownload, mob }: {
  purchase: ApiPurchase
  idx: number
  onContinue: () => void
  onDownload: () => void
  mob?: boolean
}) {
  const pct = Math.min(100, Math.max(0, purchase.readingProgress))
  const started = pct > 0
  const [w, setW] = useState(0)
  const [dlLoading, setDlLoading] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setW(pct), 120 + idx * 90)
    return () => clearTimeout(t)
  }, [pct, idx])

  const handleDownload = async () => {
    setDlLoading(true)
    try {
      await onDownload()
    } finally {
      setDlLoading(false)
    }
  }

  const ctaLabel = started ? (mob ? 'Continue' : 'Continue reading') : 'Start reading'

  if (mob) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', padding: 14,
        background: 'rgba(255,255,255,0.66)', backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        border: '1px solid rgba(255,255,255,0.7)', borderRadius: 14,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        animation: `ebRise 420ms var(--ease-out-soft) ${idx * 80}ms both`,
      }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <BookCover purchase={purchase} idx={idx} width={68} radius={7} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 5 }}><CatBadge category={purchase.category} /></div>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 15.5, color: '#1F3242', lineHeight: 1.2 }}>{purchase.title}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#6A7B85', marginTop: 3 }}>{purchase.author}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <div style={{ flex: 1, height: 5, borderRadius: 999, background: toRgba('#7A2D05', 0.12), overflow: 'hidden' }}>
            <div style={{ height: '100%', width: w + '%', background: 'linear-gradient(90deg, #D4843A, #7A2D05)', borderRadius: 999, transition: 'width 700ms var(--ease-out-soft)' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 500, color: started ? '#7A2D05' : '#6A7B85', flexShrink: 0 }}>
            {started ? `${pct}% read` : 'Not started'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={onContinue} style={{
            flex: 1, height: 40, borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)',
            color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 13,
            fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 3px 10px rgba(122,45,5,0.24)',
            transition: 'box-shadow 160ms ease, transform 160ms ease',
          }}>
            {ctaLabel}
          </button>
          <button onClick={handleDownload} disabled={dlLoading} title="Download" style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(255,255,255,0.7)', border: '1px solid #D6C5AC',
            color: dlLoading ? '#B0A090' : '#7A2D05', cursor: dlLoading ? 'default' : 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            transition: 'border-color 150ms',
          }}>
            <Download size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', gap: 20, alignItems: 'center', padding: 18,
      background: 'rgba(255,255,255,0.66)', backdropFilter: 'blur(20px) saturate(140%)',
      WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      border: '1px solid rgba(255,255,255,0.7)', borderRadius: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      animation: `ebRise 420ms var(--ease-out-soft) ${idx * 80}ms both`,
      transition: 'transform 160ms var(--ease-out-soft), box-shadow 160ms var(--ease-out-soft)',
    }}>
      <BookCover purchase={purchase} idx={idx} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 7 }}><CatBadge category={purchase.category} /></div>
        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 18, color: '#1F3242', lineHeight: 1.2 }}>{purchase.title}</div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#6A7B85', marginTop: 3 }}>{purchase.author}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, maxWidth: 340 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 999, background: toRgba('#7A2D05', 0.12), overflow: 'hidden' }}>
            <div style={{ height: '100%', width: w + '%', background: 'linear-gradient(90deg, #D4843A, #7A2D05)', borderRadius: 999, transition: 'width 700ms var(--ease-out-soft)' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: started ? '#7A2D05' : '#6A7B85', flexShrink: 0, minWidth: 64 }}>
            {started ? `${pct}% read` : 'Not started'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
        <button onClick={onContinue} style={{
          height: 42, padding: '0 20px', borderRadius: 12, border: 'none',
          background: 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)',
          color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 13.5,
          fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
          boxShadow: '0 3px 12px rgba(122,45,5,0.26)',
          transition: 'box-shadow 160ms ease, transform 160ms ease',
        }}>
          {ctaLabel}
        </button>
        <button onClick={handleDownload} disabled={dlLoading} title="Download" style={{
          width: 42, height: 42, borderRadius: 10,
          background: 'rgba(255,255,255,0.7)', border: '1px solid #D6C5AC',
          color: dlLoading ? '#B0A090' : '#7A2D05', cursor: dlLoading ? 'default' : 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 150ms, color 150ms',
        }}
          onMouseEnter={e => { if (!dlLoading) e.currentTarget.style.borderColor = '#7A2D05' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#D6C5AC' }}
        >
          <Download size={18} />
        </button>
      </div>
    </div>
  )
}

// ============================================================
// Empty library
// ============================================================

function EmptyLibrary({ onBrowse, mob }: { onBrowse: () => void; mob?: boolean }) {
  const [hover, setHover] = useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 140px)', padding: mob ? '24px 16px' : '24px 20px' }}>
      <div style={{
        background: 'rgba(255,255,255,0.80)',
        backdropFilter: 'blur(28px) saturate(140%)',
        WebkitBackdropFilter: 'blur(28px) saturate(140%)',
        border: '1px solid rgba(255,255,255,0.72)',
        borderRadius: mob ? 20 : 24,
        boxShadow: '0 16px 48px rgba(73,42,12,0.12)',
        padding: mob ? '32px 24px' : '40px 36px',
        textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        maxWidth: 420, width: '100%',
        animation: 'ebRise 420ms var(--ease-out-soft) both',
      }}>
        <div style={{
          width: mob ? 72 : 92, height: mob ? 72 : 92, borderRadius: '50%',
          background: toRgba('#7A2D05', 0.08),
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 14,
        }}>
          <BookOpen size={mob ? 32 : 40} style={{ color: '#7A2D05' }} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: mob ? 22 : 26, color: '#1F3242', margin: '8px 0 8px', letterSpacing: '-0.01em' }}>Your library is waiting</h2>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 13.5 : 14.5, color: '#6A7B85', margin: '0 auto 28px', lineHeight: 1.6, maxWidth: 300 }}>eBooks you purchase land here, ready to read on any device and download for offline.</p>
        <button
          onClick={onBrowse}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            height: mob ? 46 : 50, padding: mob ? '0 22px' : '0 28px', borderRadius: 13, border: 'none',
            background: hover
              ? 'linear-gradient(135deg, #C07630 0%, #6A2504 100%)'
              : 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)',
            color: '#fff', fontFamily: 'var(--font-sans)', fontSize: mob ? 14 : 15,
            fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: hover ? '0 7px 22px rgba(122,45,5,0.38)' : '0 4px 16px rgba(122,45,5,0.28)',
            transform: hover ? 'translateY(-1px)' : 'translateY(0)',
            transition: 'background 160ms ease, box-shadow 160ms ease, transform 160ms ease',
          }}
        >
          <BookOpen size={mob ? 16 : 18} /> Browse eBooks
        </button>
      </div>
    </div>
  )
}

// ============================================================
// Main exported page
// ============================================================

export function EbooksLibraryPage() {
  const router = useRouter()
  const mob = useIsMobile()
  const { data: purchases = [], isLoading: loading } = useQuery({
    queryKey: keys.ebookLibrary,
    queryFn: fetchers.ebookLibrary,
    staleTime: 2 * 60 * 1000,
  })

  const handleDownload = async (purchase: ApiPurchase) => {
    try {
      const res = await api.post<{ data: { downloadUrl: string } }>(`/api/v1/ebooks/${purchase.ebookId}/download`)
      const url = res.data?.data?.downloadUrl
      if (url) window.open(url, '_blank')
    } catch {
      // silently fail — user sees no UI change, download button re-enables
    }
  }

  if (loading) return <LibrarySkeleton mob={mob} />

  if (purchases.length === 0) {
    return <EmptyLibrary onBrowse={() => router.push('/services/ebooks')} mob={mob} />
  }

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: mob ? '24px 16px 48px' : '36px 32px 64px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: mob ? 20 : 26 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: mob ? 26 : 34, color: '#1F3242', margin: 0, letterSpacing: '-0.02em' }}>My eBooks</h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 13 : 14.5, color: '#6A7B85', marginTop: 4 }}>
            {purchases.length} {purchases.length === 1 ? 'title' : 'titles'} in your library
          </p>
        </div>
        <button
          onClick={() => router.push('/services/ebooks')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0,
            height: mob ? 36 : 40, padding: mob ? '0 14px' : '0 18px', borderRadius: 10,
            background: 'rgba(255,255,255,0.7)', border: '1px solid #D6C5AC',
            fontFamily: 'var(--font-sans)', fontSize: mob ? 12.5 : 13.5, fontWeight: 500,
            color: '#7A2D05', cursor: 'pointer',
            transition: 'border-color 150ms, color 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#7A2D05' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#D6C5AC' }}
        >
          <ShoppingBag size={mob ? 14 : 16} /> Browse eBooks
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: mob ? 12 : 14 }}>
        {purchases.map((purchase, i) => (
          <LibraryRow
            key={purchase.id}
            purchase={purchase}
            idx={i}
            onContinue={() => router.push(`/services/ebooks/reader?book=${purchase.slug || purchase.ebookId}`)}
            onDownload={() => handleDownload(purchase)}
            mob={mob}
          />
        ))}
      </div>
    </div>
  )
}
