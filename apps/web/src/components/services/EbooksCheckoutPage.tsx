'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { keys, fetchers } from '@/lib/queries'
import { ArrowLeft, ChevronRight, ShieldCheck, Check, BookOpen } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
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
// Types
// ============================================================

interface ApiEbook {
  id: string
  slug: string
  title: string
  author: string
  category: string | null
  pageCount: number | null
  priceUsd: number
  effectivePrice: number
  coverImageUrl: string | null
  fileFormat: string
  status: string
}

// ============================================================
// Gradient cover palette
// ============================================================

const COVER_PALETTE = [
  'linear-gradient(145deg, #B5520F 0%, #7A2D05 100%)',
  'linear-gradient(145deg, #475569 0%, #334155 100%)',
  'linear-gradient(145deg, #C4550A 0%, #922D04 100%)',
  'linear-gradient(145deg, #0E7490 0%, #155E75 100%)',
]

function GradientCover({ ebook, width = 72, radius = 7 }: { ebook: ApiEbook; width?: number; radius?: number }) {
  const h = Math.round(width * 1.33)
  const bg = COVER_PALETTE[ebook.id.charCodeAt(0) % COVER_PALETTE.length]
  return (
    <div style={{
      width, height: h, borderRadius: radius, overflow: 'hidden', flexShrink: 0,
      background: ebook.coverImageUrl ? undefined : bg,
      boxShadow: '0 4px 12px rgba(122,45,5,0.12)',
      position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      padding: ebook.coverImageUrl ? 0 : Math.max(6, Math.round(width * 0.08)),
    }}>
      {ebook.coverImageUrl ? (
        <img src={ebook.coverImageUrl} alt={ebook.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{
          fontFamily: 'var(--font-serif)', fontWeight: 600,
          fontSize: Math.max(8, Math.round(width * 0.1)),
          lineHeight: 1.15, color: '#fff',
          textShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}>{ebook.title}</div>
      )}
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

function CatBadge({ category }: { category: string | null }) {
  const cat = category || 'General'
  const c = CAT_TINT[cat] || '#7A2D05'
  const toRgba = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16)
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
  }
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
// Confetti
// ============================================================

function Confetti({ count = 90 }: { count?: number }) {
  const colors = ['#7A2D05', '#B5520F', '#D4843A', '#C4881C', '#4B7A3E', '#F2C39E']
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    dur: 2.4 + Math.random() * 1.8,
    size: 6 + Math.random() * 7,
    color: colors[i % colors.length],
    rot: Math.random() * 360,
    drift: (Math.random() - 0.5) * 180,
    round: Math.random() > 0.55,
  })), [count])

  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 40 }}>
      {pieces.map((p, i) => (
        <span key={i} style={{
          position: 'absolute', top: -16, left: p.left + '%', width: p.size, height: p.round ? p.size : p.size * 0.5,
          background: p.color, borderRadius: p.round ? '50%' : 1, opacity: 0.95,
          '--drift': p.drift + 'px', '--rot': p.rot + 'deg',
          animation: `ebConfetti ${p.dur}s cubic-bezier(0.3,0.5,0.6,1) ${p.delay}s forwards`,
        } as React.CSSProperties} />
      ))}
    </div>
  )
}

// ============================================================
// Flow states
// ============================================================

type View =
  | { screen: 'checkout' }
  | { screen: 'confirmation' }

// ============================================================
// Exported checkout page
// ============================================================

export function EbooksCheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookSlug = searchParams.get('book') || ''
  const mob = useIsMobile()
  const queryClient = useQueryClient()

  const purchaseSuccess = searchParams.get('purchase') === 'success'
  const [view, setView] = useState<View>(purchaseSuccess ? { screen: 'confirmation' } : { screen: 'checkout' })
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)

  // Invalidate library cache when returning from a successful purchase
  useEffect(() => {
    if (purchaseSuccess) {
      queryClient.invalidateQueries({ queryKey: keys.ebookLibrary })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Reuses the ebooks cache -- instant if user came from the catalog
  const { data: ebooks = [], isLoading: loading } = useQuery({
    queryKey: keys.ebooks,
    queryFn: fetchers.ebooks,
    staleTime: 5 * 60 * 1000,
    enabled: !!bookSlug,
  })
  const ebook = useMemo(() =>
    ebooks.find((e: ApiEbook) => e.slug === bookSlug) ?? ebooks[0] ?? null,
    [ebooks, bookSlug]
  )

  async function handlePurchase() {
    if (!ebook || purchasing) return
    setPurchaseError(null)
    setPurchasing(true)
    try {
      const res = await api.post(`/api/v1/ebooks/${ebook.id}/checkout`)
      const { checkoutUrl, alreadyPurchased } = res.data?.data ?? {}
      if (alreadyPurchased) {
        queryClient.invalidateQueries({ queryKey: keys.ebookLibrary })
        setView({ screen: 'confirmation' })
        return
      }
      if (checkoutUrl) {
        window.location.href = checkoutUrl
      } else {
        setPurchaseError('Could not start checkout. Please try again.')
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.response?.data?.message || 'Purchase failed. Please try again.'
      setPurchaseError(msg)
    } finally {
      setPurchasing(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: '#6A7B85' }}>Loading...</div>
      </div>
    )
  }

  if (!ebook) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: '#6A7B85' }}>eBook not found.</div>
        <button onClick={() => router.push('/services/ebooks')} style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: '#7A2D05', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Browse eBooks</button>
      </div>
    )
  }

  if (view.screen === 'confirmation') {
    return (
      <ConfirmationScreen
        ebook={ebook}
        onRead={() => router.push(`/services/ebooks/reader?book=${ebook.slug}`)}
        onBrowse={() => router.push('/services/ebooks')}
        mob={mob}
      />
    )
  }

  return (
    <CheckoutScreen
      ebook={ebook}
      onBack={() => router.push(`/services/ebooks`)}
      onContinue={handlePurchase}
      purchasing={purchasing}
      purchaseError={purchaseError}
      mob={mob}
    />
  )
}

function fmtPrice(cents: number) {
  return '$' + (cents / 100).toFixed(2)
}

// ============================================================
// Checkout
// ============================================================

function OrderRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: '#6A7B85' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 500, color: '#3D5562' }}>{value}</span>
    </div>
  )
}

function CheckoutScreen({ ebook, onBack, onContinue, purchasing, purchaseError, mob }: {
  ebook: ApiEbook
  onBack: () => void
  onContinue: () => void
  purchasing?: boolean
  purchaseError?: string | null
  mob?: boolean
}) {
  const [hover, setHover] = useState(false)

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: mob ? '24px 16px 40px' : '36px 24px 56px' }}>
      <div onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-sans)', fontSize: mob ? 12.5 : 13.5, fontWeight: 500, color: '#7A2D05', cursor: 'pointer', marginBottom: mob ? 14 : 18 }}>
        <ArrowLeft size={mob ? 14 : 16} /> Back to eBook
      </div>

      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: mob ? 24 : 30, color: '#1F3242', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Review your order</h1>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 13 : 14, color: '#6A7B85', margin: mob ? '0 0 18px' : '0 0 24px' }}>{"One step left. You'll complete payment with our secure partner."}</p>

      <div style={{
        background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        border: '1px solid rgba(255,255,255,0.7)', borderRadius: 18, padding: 24,
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)', animation: 'ebRise 380ms var(--ease-out-soft) both',
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', paddingBottom: 18, borderBottom: '1px solid #E4D7C5' }}>
          <GradientCover ebook={ebook} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 6 }}><CatBadge category={ebook.category} /></div>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 16, color: '#1F3242', lineHeight: 1.2 }}>{ebook.title}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#6A7B85', marginTop: 3 }}>
              {ebook.author}{ebook.pageCount ? ` - ${ebook.pageCount} pages` : ''}
            </div>
          </div>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 18, color: '#1F3242' }}>{fmtPrice(ebook.effectivePrice)}</span>
        </div>

        <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 9 }}>
          <OrderRow label="Subtotal" value={fmtPrice(ebook.effectivePrice)} />
          <OrderRow label="Format" value={ebook.fileFormat === 'epub' ? 'ePub' : 'PDF'} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid #E4D7C5' }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: '#1F3242' }}>Total</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 24, color: '#7A2D05' }}>{fmtPrice(ebook.effectivePrice)}</span>
        </div>

        {purchaseError && (
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#c0392b', background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 8, padding: '10px 14px', marginTop: 16 }}>
            {purchaseError}
          </div>
        )}

        <button
          onMouseEnter={() => { if (!purchasing) setHover(true) }}
          onMouseLeave={() => setHover(false)}
          onClick={onContinue}
          disabled={purchasing}
          style={{
            width: '100%', height: 52, marginTop: 20, borderRadius: 10, border: 'none',
            background: purchasing
              ? 'rgba(122,45,5,0.5)'
              : hover
                ? 'linear-gradient(135deg, #C07630 0%, #6A2504 100%)'
                : 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)',
            color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
            cursor: purchasing ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transform: hover && !purchasing ? 'translateY(-1px)' : 'none',
            boxShadow: hover && !purchasing ? '0 6px 22px rgba(122,45,5,0.38)' : '0 4px 14px rgba(122,45,5,0.28)',
            transition: 'background 160ms ease, transform 160ms ease, box-shadow 160ms ease',
          }}>
          {purchasing ? 'Processing...' : <><span>Continue to secure checkout</span> <ChevronRight size={17} /></>}
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14 }}>
          <ShieldCheck size={16} style={{ color: '#4B7A3E', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#6A7B85', lineHeight: 1.5 }}>Payment is processed securely by our payment partner. OppDate does not store your card details.</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Confirmation
// ============================================================

function ConfirmationScreen({ ebook, onRead, onBrowse, mob }: {
  ebook: ApiEbook
  onRead: () => void
  onBrowse: () => void
  mob?: boolean
}) {
  const [pop, setPop] = useState(false)
  const [readHover, setReadHover] = useState(false)
  useEffect(() => { const t = setTimeout(() => setPop(true), 60); return () => clearTimeout(t) }, [])

  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      <Confetti />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: mob ? 'calc(100vh - 120px)' : 'calc(100vh - 140px)', padding: mob ? '24px 16px' : '24px 20px' }}>
        <div style={{ maxWidth: 460, width: '100%', textAlign: 'center' }}>
          <div style={{
            width: mob ? 64 : 76, height: mob ? 64 : 76, borderRadius: '50%', background: 'rgba(75,122,62,0.12)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: mob ? 16 : 20,
            transform: pop ? 'scale(1)' : 'scale(0.5)', transition: 'transform 420ms cubic-bezier(0.34,1.56,0.46,1)',
          }}>
            <span style={{ width: mob ? 44 : 52, height: mob ? 44 : 52, borderRadius: '50%', background: '#4B7A3E', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={mob ? 24 : 28} style={{ color: '#fff' }} />
            </span>
          </div>

          <div style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 11 : 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4B7A3E', marginBottom: mob ? 8 : 10, animation: 'ebRise 400ms var(--ease-out-soft) 200ms both' }}>Purchase complete</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: mob ? 24 : 32, color: '#1F3242', margin: '0 0 8px', lineHeight: 1.12, letterSpacing: '-0.02em', animation: 'ebRise 400ms var(--ease-out-soft) 260ms both' }}>You now own {ebook.title}</h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 13.5 : 14.5, color: '#6A7B85', margin: mob ? '0 auto 20px' : '0 auto 24px', maxWidth: 340, lineHeight: 1.6, animation: 'ebRise 400ms var(--ease-out-soft) 320ms both' }}>{"It's saved to your library and ready whenever you are. We've emailed your receipt and download links."}</p>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: mob ? 12 : 14, padding: mob ? 12 : 14, borderRadius: mob ? 12 : 14, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: mob ? 20 : 26, animation: 'ebRise 400ms var(--ease-out-soft) 360ms both' }}>
            <GradientCover ebook={ebook} width={mob ? 48 : 56} radius={6} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: mob ? 14 : 15, color: '#1F3242', lineHeight: 1.2 }}>{ebook.title}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: '#6A7B85', marginTop: 3 }}>
                {ebook.fileFormat === 'epub' ? 'ePub' : 'PDF'}{ebook.pageCount ? ` - ${ebook.pageCount} pages` : ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: mob ? 'column' : 'row', gap: mob ? 10 : 12, justifyContent: 'center', animation: 'ebRise 400ms var(--ease-out-soft) 420ms both' }}>
            <button
              onMouseEnter={() => setReadHover(true)}
              onMouseLeave={() => setReadHover(false)}
              onClick={onRead}
              style={{
                height: mob ? 46 : 50, padding: mob ? '0 20px' : '0 28px', borderRadius: 10, border: 'none',
                background: readHover
                  ? 'linear-gradient(135deg, #C07630 0%, #6A2504 100%)'
                  : 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)',
                color: '#fff', fontFamily: 'var(--font-sans)', fontSize: mob ? 14 : 15, fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: mob ? '100%' : undefined,
                transform: readHover ? 'translateY(-1px)' : 'none',
                boxShadow: readHover ? '0 6px 22px rgba(122,45,5,0.38)' : '0 4px 14px rgba(122,45,5,0.28)',
                transition: 'background 160ms ease, transform 160ms ease, box-shadow 160ms ease',
              }}>
              <BookOpen size={mob ? 16 : 18} /> Start reading
            </button>
            <button onClick={onBrowse} style={{
              height: mob ? 46 : 50, padding: mob ? '0 20px' : '0 24px', borderRadius: 10,
              background: 'rgba(255,255,255,0.6)', border: '1px solid #D6C5AC', color: '#1F3242',
              fontFamily: 'var(--font-sans)', fontSize: mob ? 13 : 15, fontWeight: 500, cursor: 'pointer',
              width: mob ? '100%' : undefined,
            }}>
              Browse more eBooks
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
