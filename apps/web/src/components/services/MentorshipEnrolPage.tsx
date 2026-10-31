'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft, Users, CheckCircle, MessageSquare, Clock,
  ShieldCheck, Check
} from 'lucide-react'
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

interface ApiProgramme {
  id: string
  title: string
  description: string
  monthlyPriceUsd: number // cents
  active: boolean
}

type View =
  | { screen: 'review' }
  | { screen: 'confirmation'; programmeTitle: string }

export function MentorshipEnrolPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const programmeId = searchParams.get('programme') ?? ''
  const enrolmentId = searchParams.get('enrolment') ?? ''
  const paymentStatus = searchParams.get('payment')
  const sessionId = searchParams.get('session_id') ?? ''
  const mob = useIsMobile()

  const [programme, setProgramme] = useState<ApiProgramme | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>({ screen: 'review' })

  useEffect(() => {
    if (enrolmentId && paymentStatus === 'success') {
      // Verify payment with Stripe and activate (handles webhook delivery failures in dev)
      const activate = sessionId
        ? api.post('/api/v1/payments/verify-session', { sessionId }).catch(() => {})
        : Promise.resolve()

      activate.then(() =>
        api.get<{ data: { programmeId: string } }>(`/api/v1/mentorships/${enrolmentId}`)
      ).then(r => {
        const pid = (r as any)?.data?.data?.programmeId
        if (!pid) { setLoading(false); return }
        return api.get<{ data: ApiProgramme[] }>('/api/v1/mentorships/programmes')
          .then(pr => {
            const found = (pr.data?.data ?? []).find(p => p.id === pid) ?? null
            setProgramme(found)
            if (found) setView({ screen: 'confirmation', programmeTitle: found.title })
          })
      }).catch(() => {}).finally(() => setLoading(false))
      return
    }

    if (!programmeId) { setLoading(false); return }
    api.get<{ data: ApiProgramme[] }>('/api/v1/mentorships/programmes')
      .then(r => {
        const found = (r.data?.data ?? []).find(p => p.id === programmeId) ?? null
        setProgramme(found)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [programmeId, enrolmentId, paymentStatus, sessionId])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', fontFamily: 'var(--font-sans)', color: 'var(--app-text-sec)', fontSize: 14 }}>
      Loading...
    </div>
  )

  if (!programme) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: 16, padding: 32, textAlign: 'center' }}>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--app-text-sec)' }}>Programme not found.</p>
      <button onClick={() => router.push('/services/mentorship')} style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--app-ginger)', background: 'none', border: 'none', cursor: 'pointer' }}>
        Back to mentorship
      </button>
    </div>
  )

  if (view.screen === 'confirmation') {
    return (
      <ConfirmationScreen
        programmeTitle={view.programmeTitle}
        onThread={() => router.push('/messages')}
        onBrowse={() => router.push('/opportunities')}
        mob={mob}
      />
    )
  }

  return (
    <ReviewScreen
      programme={programme}
      onBack={() => router.push('/services/mentorship')}
      onEnrolled={() => setView({ screen: 'confirmation', programmeTitle: programme.title })}
      mob={mob}
    />
  )
}

// ============================================================
// REVIEW SCREEN
// ============================================================

function ReviewScreen({ programme, onBack, onEnrolled, mob }: {
  programme: ApiProgramme
  onBack: () => void
  onEnrolled: () => void
  mob?: boolean
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const displayPrice = Math.round(programme.monthlyPriceUsd / 100)
  const displayTitle = programme.title.replace(/\s*\([^)]+\)\s*$/, '')

  async function handleConfirm() {
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      // Step 1: create the enrolment record (status: pending)
      const enrolRes = await api.post<{ data: { id: string } }>('/api/v1/mentorships', { programmeId: programme.id })
      const enrolmentId = enrolRes.data?.data?.id
      if (!enrolmentId) throw new Error('Enrolment failed.')

      // Step 2: create a payment checkout session for the enrolment
      const checkoutRes = await api.post<{ data: { checkoutUrl: string } }>('/api/v1/payments/checkout', {
        purpose: 'mentorship',
        gateway: 'stripe',
        referenceId: enrolmentId,
      })
      const checkoutUrl = checkoutRes.data?.data?.checkoutUrl
      if (!checkoutUrl) throw new Error('Could not initialise payment.')

      // Redirect to Stripe — webhook activates the mentorship on success
      window.location.href = checkoutUrl
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Enrolment failed. Please try again.'
      setError(msg)
      setSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: mob ? '24px 16px 40px' : '32px 24px 56px', width: '100%' }}>
      <div onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-sans)', fontSize: mob ? 12.5 : 13.5, fontWeight: 500, color: 'var(--app-ginger)', cursor: 'pointer', marginBottom: mob ? 14 : 18 }}>
        <ArrowLeft size={mob ? 14 : 16} /> Back to programmes
      </div>

      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: mob ? 24 : 30, color: 'var(--app-ink)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Review your enrolment</h1>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 13 : 14, color: 'var(--app-text-sec)', margin: mob ? '0 0 18px' : '0 0 24px' }}>One step left. Complete payment to begin your programme.</p>

      <div style={{
        background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(24px) saturate(140%)', WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        border: '1px solid rgba(255,255,255,0.7)', borderRadius: 18, padding: mob ? 18 : 24, boxShadow: 'var(--app-card-shadow-hi)',
        animation: 'ebRise 380ms var(--ease-out-soft) both'
      }}>
        <div style={{ paddingBottom: 18, borderBottom: '1px solid var(--app-hairline)', marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--app-text-sec)', marginBottom: 14 }}>Programme</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <DetailRow icon={<Users size={16} />} label={displayTitle} sub="30-day mentorship cycle" />
            <DetailRow icon={<CheckCircle size={16} />} label="Dedicated mentor + strategic onboarding session" sub="Document review and application strategy included" />
            <DetailRow icon={<MessageSquare size={16} />} label="Delivered through OppDate Messages" />
            <DetailRow icon={<Clock size={16} />} label="Your mentor will be assigned within 48 hours" />
          </div>
        </div>

        <div style={{ paddingBottom: 18, borderBottom: '1px solid var(--app-hairline)', marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--app-text-sec)', marginBottom: 12 }}>Order summary</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--app-text-sec)' }}>Programme fee</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--app-ink-body)', fontWeight: 500 }}>${displayPrice} / 30-day cycle</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--app-ink)' }}>Total</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 26, color: 'var(--app-ginger)' }}>${displayPrice}</span>
        </div>

        {error && (
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#c0392b', background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
            {error}
          </div>
        )}

        <button onClick={handleConfirm} disabled={submitting} style={{
          width: '100%', height: 52, borderRadius: 10, border: 'none',
          background: submitting ? 'rgba(122,45,5,0.5)' : 'var(--app-ginger)', color: '#fff',
          fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
          cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: '0 2px 12px rgba(122,45,5,0.22)',
          transition: 'background 150ms var(--ease-out-soft), transform 120ms, box-shadow 150ms'
        }}
          onMouseEnter={e => { if (!submitting) { e.currentTarget.style.background = '#5C2104'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(122,45,5,0.28)' } }}
          onMouseLeave={e => { e.currentTarget.style.background = submitting ? 'rgba(122,45,5,0.5)' : 'var(--app-ginger)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(122,45,5,0.22)' }}
        >
          {submitting ? 'Processing...' : 'Confirm and pay'}
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14 }}>
          <ShieldCheck size={16} style={{ color: 'var(--app-green)', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--app-text-sec)', lineHeight: 1.5 }}>Secure payment. Your mentor will reach out in your OppDate Messages thread within 48 hours of enrolment.</span>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{ color: 'var(--app-ginger)', marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--app-ink)' }}>{label}</div>
        {sub && <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--app-text-sec)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ============================================================
// CONFIRMATION SCREEN — portal-mounted full-viewport takeover
// ============================================================

function Confetti() {
  const pieces = useMemo(() => {
    const colors = ['#7A2D05', '#B5520F', '#D4843A', '#C4881C', '#4B7A3E', '#F2C39E']
    return Array.from({ length: 90 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      dur: 2.4 + Math.random() * 1.8,
      size: 6 + Math.random() * 7,
      color: colors[i % colors.length],
      rot: Math.random() * 360,
      drift: (Math.random() - 0.5) * 180,
      round: Math.random() > 0.55,
    }))
  }, [])

  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 40 }}>
      {pieces.map((p, i) => (
        <span key={i} style={{
          position: 'absolute', top: -16, left: `${p.left}%`,
          width: p.size, height: p.round ? p.size : p.size * 0.5,
          background: p.color, borderRadius: p.round ? '50%' : 1, opacity: 0.95,
          ['--drift' as string]: `${p.drift}px`,
          ['--rot' as string]: `${p.rot}deg`,
          animation: `ebConfetti ${p.dur}s cubic-bezier(0.3,0.5,0.6,1) ${p.delay}s forwards`,
        } as React.CSSProperties} />
      ))}
    </div>
  )
}

const MENTOR_WELCOME = 'Welcome to your OppDate Mentorship programme. Your mentor has been notified and will introduce themselves here within 48 hours. In the meantime, feel free to share anything about your goals or the opportunities you are targeting.'

function ThreadPreviewCard({ programmeTitle, mob }: { programmeTitle: string; mob?: boolean }) {
  const displayTitle = programmeTitle.replace(/\s*\([^)]+\)\s*$/, '')
  return (
    <div style={{
      background: 'rgba(255,255,255,0.28)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)',
      borderRadius: 16, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.45)',
      boxShadow: '0 8px 40px rgba(73,42,12,0.18), 0 1px 0 rgba(255,255,255,0.6) inset',
      textAlign: 'left',
      animation: 'mtPreviewIn 460ms var(--ease-out-soft) 380ms both',
    }}>
      {/* thread header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: mob ? '10px 14px' : '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.22)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 8px', borderRadius: 6, background: 'rgba(122,45,5,0.12)', border: '1px solid rgba(122,45,5,0.25)', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, color: '#7A2D05', flexShrink: 0 }}>Mentorship</span>
        <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 14, color: '#1F3242', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayTitle}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 9px', borderRadius: 999, background: 'rgba(75,122,62,0.15)', border: '1px solid rgba(75,122,62,0.35)', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, color: '#4B7A3E', flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4B7A3E' }} /> Active
        </span>
      </div>
      {/* thread body */}
      <div style={{ padding: mob ? '14px' : '16px', display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(245,236,224,0.35)' }}>
        {/* system event row */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: '#9A8878', background: 'rgba(255,255,255,0.35)', padding: '4px 12px', borderRadius: 999 }}>Mentorship started</span>
        </div>
        {/* system message bubble */}
        <div style={{ alignSelf: 'flex-start', maxWidth: '88%' }}>
          <div style={{ padding: '10px 13px', borderRadius: '4px 14px 14px 14px', background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 1px 6px rgba(73,42,12,0.07)', fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.55, color: '#3D4F5C' }}>
            {MENTOR_WELCOME}
          </div>
        </div>
        {/* mentor typing indicator */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 2 }}>
          <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(243,233,222,0.7)', border: '1px solid rgba(255,255,255,0.5)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/oppdate-monogram.png" alt="OppDate" style={{ height: 14, width: 'auto' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </span>
          <div style={{ padding: '10px 14px', borderRadius: '4px 14px 14px 14px', background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 1px 6px rgba(73,42,12,0.07)', display: 'flex', gap: 5, alignItems: 'center' }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(122,45,5,0.45)', animation: `mtTyping 1.2s ease-in-out ${i * 160}ms infinite` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfirmationScreen({ programmeTitle, onThread, onBrowse, mob }: {
  programmeTitle: string; onThread: () => void; onBrowse: () => void; mob?: boolean
}) {
  const [pop, setPop] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    setMounted(true)
    // rAF ensures the element is painted at scale(0.4) before we flip to scale(1)
    const raf = requestAnimationFrame(() => {
      const t = setTimeout(() => setPop(true), 40)
      return () => clearTimeout(t)
    })
    return () => {
      cancelAnimationFrame(raf)
      document.body.style.overflow = ''
    }
  }, [])

  const content = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: '#F2EFEA',
      backgroundImage: 'url(/assets/bg-artwork.png)',
      backgroundSize: 'cover', backgroundPosition: 'center',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflowY: 'auto',
    }}>
      <Confetti />

      <div style={{
        position: 'relative', zIndex: 50,
        width: '100%', maxWidth: 500,
        padding: mob ? '40px 20px 56px' : '56px 32px 72px',
        textAlign: 'center',
        animation: 'ebFade 300ms ease both',
      }}>
        {/* animated checkmark */}
        <div style={{
          width: 76, height: 76, borderRadius: '50%',
          background: 'rgba(75,122,62,0.12)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 22,
          transform: pop ? 'scale(1)' : 'scale(0.4)',
          transition: 'transform 480ms cubic-bezier(0.34,1.56,0.46,1)',
        }}>
          <span style={{
            width: 52, height: 52, borderRadius: '50%',
            background: '#4B7A3E',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(75,122,62,0.40)',
          }}>
            <Check size={28} style={{ color: '#fff' }} />
          </span>
        </div>

        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4B7A3E', marginBottom: 10, animation: 'ebRise 400ms var(--ease-out-soft) 200ms both' }}>
          Enrolment confirmed
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: mob ? 28 : 34, color: '#1F3242', margin: '0 0 12px', lineHeight: 1.1, letterSpacing: '-0.025em', textWrap: 'balance', animation: 'ebRise 400ms var(--ease-out-soft) 260ms both' } as React.CSSProperties}>
          Your mentorship begins now.
        </h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: mob ? 14 : 14.5, color: '#6A7B85', margin: '0 auto 28px', maxWidth: 360, lineHeight: 1.65, animation: 'ebRise 400ms var(--ease-out-soft) 320ms both' }}>
          Your dedicated mentor will introduce themselves in your Messages thread within 48 hours. All your sessions, guidance, and document reviews will flow through there.
        </p>

        {/* thread preview */}
        <div style={{ marginBottom: mob ? 24 : 30 }}>
          <ThreadPreviewCard programmeTitle={programmeTitle} mob={mob} />
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: mob ? 'column' : 'row', gap: mob ? 10 : 12, justifyContent: 'center', animation: 'ebRise 400ms var(--ease-out-soft) 500ms both' }}>
          <button onClick={onThread} style={{
            height: 50, padding: mob ? '0 20px' : '0 26px', borderRadius: 10, border: 'none',
            background: '#7A2D05', color: '#fff',
            fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: mob ? '100%' : 'auto', whiteSpace: 'nowrap',
            boxShadow: '0 2px 12px rgba(122,45,5,0.28)',
            transition: 'background 150ms var(--ease-out-soft), transform 120ms var(--ease-out-soft), box-shadow 150ms var(--ease-out-soft)',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#5C2104'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(122,45,5,0.28)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#7A2D05'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(122,45,5,0.28)' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
          >
            <MessageSquare size={17} /> Go to your Messages thread
          </button>
          <button onClick={onBrowse} style={{
            height: 50, padding: mob ? '0 20px' : '0 22px', borderRadius: 10,
            background: 'rgba(255,255,255,0.6)', border: '1px solid #D6C5AC',
            color: '#1F3242', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
            cursor: 'pointer', width: mob ? '100%' : 'auto', whiteSpace: 'nowrap',
            transition: 'background 140ms, border-color 140ms',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.85)'; e.currentTarget.style.borderColor = '#C4A882' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; e.currentTarget.style.borderColor = '#D6C5AC' }}
          >
            Browse opportunities
          </button>
        </div>
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(content, document.body)
}
