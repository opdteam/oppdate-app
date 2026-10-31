'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  CheckCircle2, Hash, Copy, MessageCircle, ChevronRight,
  Clock, ShieldCheck, User, CalendarDays, Users, BookOpen,
  Check, ArrowRight, Briefcase,
} from 'lucide-react'
import { fireConfetti } from '@/lib/confetti'

// ─── constants ────────────────────────────────────────────────────────────────

const AP = {
  ginger:   '#7A2D05',
  gingerMid:'#B5530A',
  ink:      '#2A1206',
  sec:      '#8C6A55',
  label:    '#5A3A25',
  helper:   '#B0A098',
  hairline: '#D8CCC4',
  amber:    '#D4843A',
  green:    '#059669',
  sans:     'var(--font-sans)',
  serif:    'var(--font-serif)',
}

const STEPPER_LABELS = ['Eligibility', 'Documents', 'Payment', 'Received']

const PIPELINE_STAGES = [
  'Payment Confirmed',
  'Application Received',
  'Verifying Documents',
  'Enhancing Application Materials',
  'Pre-Application Setup',
  'Application In Progress',
  'Preparing Submission',
  'Application Submitted',
]

// Active stage index (0-based). "Application Received" = index 1.
const ACTIVE_STAGE = 1

// ─── types ────────────────────────────────────────────────────────────────────

interface AppDetail {
  id: string
  referenceId: string | null
  status: string
  paymentId: string | null
  updatedAt: string
  opportunityTitle: string | null
  opportunityInstitution: string | null
  opportunityType: string | null
  opportunityCountry: string | null
  complianceCategory: 'A' | 'B' | null
}

// ─── stepper (all 4 done) ─────────────────────────────────────────────────────

function CompletedStepper() {
  return (
    <>
      <style>{`
        .ap-stepper-desktop { display: block; }
        .ap-stepper-mobile  { display: none; }
        @media (max-width: 599px) {
          .ap-stepper-desktop { display: none; }
          .ap-stepper-mobile  { display: block; }
        }
      `}</style>

      {/* Desktop */}
      <div className="ap-stepper-desktop" style={{ width: '100%', padding: '24px 0 28px', boxSizing: 'border-box' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: 17, left: '12.5%', right: '12.5%', height: 2, background: AP.ginger, borderRadius: 999 }} />
          <div style={{ position: 'relative', display: 'flex' }}>
            {STEPPER_LABELS.map(label => (
              <div key={label} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', boxSizing: 'border-box',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: AP.ginger, border: `2px solid ${AP.ginger}`,
                }}>
                  <Check size={15} style={{ color: '#fff', strokeWidth: 2.5 }} />
                </div>
                <span style={{
                  marginTop: 8, fontFamily: AP.sans, fontSize: 11, fontWeight: 600,
                  color: AP.gingerMid, lineHeight: 1, whiteSpace: 'nowrap',
                }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="ap-stepper-mobile" style={{ width: '100%', padding: '20px 0 16px', boxSizing: 'border-box' }}>
        <div style={{ fontFamily: AP.sans, fontSize: 12, color: AP.sec, marginBottom: 8 }}>
          Step 4 of 4 · <span style={{ fontWeight: 600, color: AP.ink }}>Received</span>
        </div>
        <div style={{ height: 3, borderRadius: 999, background: AP.hairline, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 999, background: AP.ginger, width: '100%' }} />
        </div>
      </div>
    </>
  )
}

// ─── context strip ────────────────────────────────────────────────────────────

function ContextStrip({ title, institution, country, type }: { title: string; institution?: string | null; country?: string | null; type?: string | null }) {
  const flag = country ? country.slice(0, 2).toUpperCase() : null
  const apCard: React.CSSProperties = {
    background: 'rgba(255,255,255,0.80)',
    backdropFilter: 'blur(24px) saturate(140%)',
    WebkitBackdropFilter: 'blur(24px) saturate(140%)',
    border: '1px solid rgba(255,255,255,0.6)',
    borderRadius: 14,
    boxShadow: '0 4px 24px rgba(122,45,5,0.08), inset 0 1px 0 rgba(255,255,255,0.7)',
    boxSizing: 'border-box',
  }
  return (
    <>
      <style>{`
        .ap-ctx-desktop { display: flex !important; }
        .ap-ctx-mobile  { display: none !important; }
        @media (max-width: 599px) {
          .ap-ctx-desktop { display: none !important; }
          .ap-ctx-mobile  { display: block !important; }
        }
      `}</style>

      {/* Desktop */}
      <div className="ap-ctx-desktop" style={{ ...apCard, padding: '14px 20px', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {type && (
            <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 10px', borderRadius: 999, border: '1px solid rgba(14,116,144,0.5)', background: 'rgba(14,116,144,0.06)', color: '#0E7490', fontFamily: AP.sans, fontSize: 11, fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap' }}>
              {type}
            </span>
          )}
          <span style={{ fontFamily: AP.sans, fontSize: 14, fontWeight: 600, color: AP.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        </div>
        {(institution || flag) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {institution && <span style={{ fontFamily: AP.sans, fontSize: 12, color: AP.sec, whiteSpace: 'nowrap' }}>{institution}</span>}
            {flag && (
              <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 7px', borderRadius: 4, background: 'rgba(122,45,5,0.06)', fontFamily: AP.sans, fontSize: 10, fontWeight: 600, color: AP.label, whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
                {flag}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Mobile */}
      <div className="ap-ctx-mobile" style={{ ...apCard, padding: '12px 16px', width: '100%', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          {type && (
            <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 9px', borderRadius: 999, border: '1px solid rgba(14,116,144,0.5)', background: 'rgba(14,116,144,0.06)', color: '#0E7490', fontFamily: AP.sans, fontSize: 10, fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap' }}>
              {type}
            </span>
          )}
          {flag && (
            <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 7px', borderRadius: 4, background: 'rgba(122,45,5,0.06)', fontFamily: AP.sans, fontSize: 10, fontWeight: 600, color: AP.label, letterSpacing: '0.04em' }}>
              {flag}
            </span>
          )}
        </div>
        <div style={{ fontFamily: AP.sans, fontSize: 14, fontWeight: 600, color: AP.ink, lineHeight: 1.35, marginBottom: institution ? 3 : 0 }}>{title}</div>
        {institution && (
          <div style={{ fontFamily: AP.sans, fontSize: 12, color: AP.sec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{institution}</div>
        )}
      </div>
    </>
  )
}

// ─── confirm content ──────────────────────────────────────────────────────────

function ConfirmContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const applicationId = searchParams.get('applicationId')

  const [app, setApp] = useState<AppDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const confettiFired = useRef(false)

  useEffect(() => {
    if (!applicationId) { router.replace('/opportunities'); return }
    const sessionId = searchParams.get('session_id')

    const load = () =>
      api.get(`/api/v1/applications/${applicationId}`)
        .then(res => {
          setApp(res.data?.data ?? null)
          if (!confettiFired.current) {
            confettiFired.current = true
            setTimeout(() => fireConfetti(0.35), 300)
          }
        })
        .catch(() => router.replace('/applications'))
        .finally(() => setLoading(false))

    if (sessionId) {
      // Verify payment with Stripe directly — handles local dev where webhook can't reach localhost.
      // Stripe can take a few seconds to mark the session as paid after redirect.
      // Retry up to 5 times with 2s gaps (10s total) before giving up and loading anyway.
      const verify = () => api.post('/api/v1/payments/verify-session', { sessionId, applicationId })
      const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

      const retryVerify = async () => {
        for (let i = 0; i < 5; i++) {
          try {
            const res = await verify()
            // 202 means Stripe hasn't confirmed payment yet — keep retrying
            if (res.data?.retryable) {
              if (i < 4) await delay(2000)
              continue
            }
            return // confirmed — stop retrying
          } catch {
            if (i < 4) await delay(2000)
          }
        }
        // All retries exhausted — continue to load the application regardless
      }

      retryVerify().finally(load)
    } else {
      load()
    }
  }, [applicationId, searchParams, router])

  function copyRef() {
    if (!refId) return
    navigator.clipboard.writeText(refId).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(122,45,5,0.15)', borderTopColor: AP.ginger, animation: 'spin 700ms linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!app) return null

  const catA = app.complianceCategory !== 'B'
  const accent = catA ? AP.green : AP.amber
  const accentBg = catA ? 'rgba(5,150,105,0.08)' : 'rgba(212,132,58,0.08)'
  const accentBorder = catA ? 'rgba(5,150,105,0.2)' : 'rgba(212,132,58,0.25)'
  const accentText = catA ? '#4B8B72' : '#92400E'

  const headline = catA ? 'Application submitted.' : 'Application received.'
  const bodyCopy = catA
    ? 'The OppDate team will begin processing your application shortly.'
    : 'The OppDate team will prepare your complete application package. We will guide you through the final submission step when everything is ready.'
  const behalfLine = catA
    ? 'OppDate will submit this application on your behalf.'
    : 'You will complete the final submission step with the institution.'
  const BehalfIcon = catA ? ShieldCheck : User

  // Reference ID — prefer the formatted ref, fall back to short app ID
  const refId = app.referenceId ?? `#${app.id.slice(-8).toUpperCase()}`

  // Timestamp for the active stage
  const activeTs = app.updatedAt
    ? new Date(app.updatedAt).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : null

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 20px 60px', fontFamily: AP.sans, boxSizing: 'border-box' }}>

      {/* 1. Stepper — all 4 complete */}
      <CompletedStepper />

      {/* 2. Opportunity context bar */}
      {app.opportunityTitle && (
        <ContextStrip
          title={app.opportunityTitle}
          institution={app.opportunityInstitution}
          country={app.opportunityCountry}
          type={app.opportunityType}
        />
      )}

      {/* Frosted glass wrapper — contains confirmation card, progress, actions, explore */}
      <div style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        border: '1px solid rgba(255,255,255,0.6)',
        borderRadius: 20,
        boxShadow: '0 4px 24px rgba(122,45,5,0.08), inset 0 1px 0 rgba(255,255,255,0.7)',
        padding: '24px 20px',
        boxSizing: 'border-box',
      }}>

      {/* 3. Confirmation card */}
      <div style={{
        borderRadius: 16, border: `1px solid ${accentBorder}`, padding: '32px 24px',
        textAlign: 'center', marginBottom: 16, background: accentBg,
      }}>
        {/* Icon with ring + bounce animation */}
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <div style={{ position: 'absolute', inset: -8, border: `2px solid ${accent}4D`, borderRadius: '50%', animation: 'opp-ring 1.5s ease-out forwards' }} />
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'opp-bounce 0.5s cubic-bezier(0.36,0.07,0.19,0.97) both' }}>
            <CheckCircle2 size={22} color="#fff" />
          </div>
        </div>

        <h1 style={{ margin: '0 0 6px', fontFamily: AP.serif, fontSize: 22, fontWeight: 700, color: accent }}>
          {headline}
        </h1>
        <p style={{ margin: '0 0 10px', fontSize: 13, color: accentText, lineHeight: 1.5 }}>
          {bodyCopy}
        </p>

        {/* Behalf/institution line */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <BehalfIcon size={13} style={{ color: accent, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: accentText, fontWeight: 500 }}>{behalfLine}</span>
        </div>

        {/* Reference chip — always shown */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <button onClick={copyRef} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999,
            background: 'rgba(122,45,5,0.06)', border: '1px solid rgba(122,45,5,0.15)', cursor: 'pointer',
          }}>
            <Hash size={13} style={{ color: AP.sec }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: AP.ink, letterSpacing: '0.02em' }}>{refId}</span>
            <Copy size={13} style={{ color: AP.sec }} />
          </button>
          <span style={{ fontSize: 11, color: AP.green, opacity: copied ? 1 : 0, transition: 'opacity 200ms' }}>Copied</span>
        </div>
      </div>

      {/* 4. Progress timeline — 8 stages */}
      <div style={{ borderRadius: 14, border: '1px solid rgba(216,204,196,0.4)', background: 'rgba(255,255,255,0.6)', padding: '20px 20px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Clock size={15} style={{ color: AP.sec, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: AP.ink }}>Application progress</span>
        </div>

        {/* Timeline — dot column (24px wide) + connector lines + label column */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {PIPELINE_STAGES.map((stage, i) => {
            const state = i < ACTIVE_STAGE ? 'completed' : i === ACTIVE_STAGE ? 'active' : 'pending'
            const isLast = i === PIPELINE_STAGES.length - 1

            // Connector segment color below this dot:
            // completed→completed: dark brown; completed→active: ginger; everything else: muted
            const segmentColor =
              i < ACTIVE_STAGE - 1 ? AP.ginger        // between completed stages
              : i === ACTIVE_STAGE - 1 ? accent        // segment leading into active
              : 'rgba(122,45,5,0.15)'                  // upcoming segments

            return (
              <div key={stage} style={{ display: 'flex', alignItems: 'stretch', gap: 12 }}>
                {/* Left column: dot + connector line below */}
                <div style={{ width: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  {/* Dot */}
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%', flexShrink: 0, zIndex: 1,
                    ...(state === 'completed'
                      ? { background: AP.ginger, border: `2px solid ${AP.ginger}` }
                      : state === 'active'
                      ? { background: accent, border: `3px solid ${accent}33`, animation: 'opp-blip 1.8s ease-in-out infinite' }
                      : { background: '#fff', border: '2px solid rgba(122,45,5,0.2)' })
                  }} />
                  {/* Connector line below (skip for last item) */}
                  {!isLast && (
                    <div style={{
                      width: 2, flex: 1, minHeight: 14, marginTop: 2,
                      background: segmentColor,
                      borderRadius: 1,
                    }} />
                  )}
                </div>

                {/* Right column: label + timestamp */}
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 8, paddingBottom: isLast ? 0 : 14, paddingTop: 0,
                  minHeight: 14,
                }}>
                  <span style={{
                    fontSize: 13, fontWeight: state === 'active' ? 600 : 400,
                    color: state === 'pending' ? AP.helper : state === 'active' ? accent : AP.ink,
                    lineHeight: 1,
                  }}>
                    {stage}
                  </span>
                  {state === 'active' && activeTs && (
                    <span style={{ fontSize: 11, color: AP.helper, whiteSpace: 'nowrap', flexShrink: 0 }}>{activeTs}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <p style={{ margin: '14px 0 0', textAlign: 'center', fontSize: 12, color: AP.helper }}>
          You&apos;ll receive an email and in-app notification at each stage.
        </p>
      </div>

      {/* 5. Action buttons — all three unified */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
        {[
          { icon: <MessageCircle size={18} style={{ color: AP.ginger, flexShrink: 0 }} />, label: 'Message the OppDate team', href: '/messages' },
          { icon: <Briefcase size={18} style={{ color: AP.ginger, flexShrink: 0 }} />, label: 'View all my applications', href: '/applications' },
          { icon: <ArrowRight size={18} style={{ color: AP.ginger, flexShrink: 0 }} />, label: 'Browse more opportunities', href: '/opportunities' },
        ].map(({ icon, label, href }) => (
          <a key={label} href={href} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12,
            border: '1px solid rgba(216,204,196,0.5)', background: 'rgba(253,250,247,0.6)', textDecoration: 'none',
            transition: 'background 130ms',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(122,45,5,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(253,250,247,0.6)')}
          >
            {icon}
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: AP.ink }}>{label}</span>
            <ChevronRight size={16} style={{ color: AP.helper }} />
          </a>
        ))}
      </div>

      {/* 6. Explore more section */}
      <div style={{ marginTop: 20 }}>
        <div style={{ borderTop: `1px solid ${AP.hairline}`, paddingTop: 16, marginBottom: 12 }}>
          <span style={{ fontFamily: AP.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: AP.helper }}>Explore more with OppDate</span>
        </div>
        <div style={{ background: 'rgba(250,247,244,0.7)', border: `1px solid ${AP.hairline}`, borderRadius: 16, padding: '6px 24px', boxSizing: 'border-box' }}>
          {[
            { Icon: CalendarDays, text: 'Get expert guidance on your next application', link: 'Book a consultation', href: '/consultations' },
            { Icon: Users,        text: 'Work with a mentor over weeks or months',      link: 'Explore mentorship',  href: '/mentorship' },
            { Icon: BookOpen,     text: 'Strengthen your applications with our resources', link: 'Browse eBooks',   href: '/ebooks' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '0 -24px', padding: '13px 24px', borderTop: i === 0 ? 'none' : '1px solid rgba(216,204,196,0.5)', transition: 'background 130ms' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(122,45,5,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', color: AP.ginger, borderLeft: `2px solid ${AP.ginger}`, paddingLeft: 12, flexShrink: 0, alignSelf: 'stretch', paddingTop: 2, paddingBottom: 2 }}>
                <r.Icon size={18} />
              </span>
              <span style={{ flex: 1, minWidth: 0, fontFamily: AP.sans, fontSize: 13, color: AP.ink }}>{r.text}</span>
              <a href={r.href} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: AP.sans, fontSize: 13, fontWeight: 500, color: AP.ginger, display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
                {r.link} <ArrowRight size={13} />
              </a>
            </div>
          ))}
        </div>
      </div>

      </div>{/* end frosted glass wrapper */}

      <style>{`
        @keyframes opp-ring {
          from { transform: scale(0.8); opacity: 1; }
          to   { transform: scale(1.8); opacity: 0; }
        }
        @keyframes opp-bounce {
          0%   { transform: scale(0.6); opacity: 0; }
          60%  { transform: scale(1.15); opacity: 1; }
          80%  { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        @keyframes opp-blip {
          0%, 100% { box-shadow: 0 0 0 0 ${accent}55; }
          50%      { box-shadow: 0 0 0 6px ${accent}00; }
        }
      `}</style>
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function ApplyConfirmPage() {
  return (
    <Suspense>
      <ConfirmContent />
    </Suspense>
  )
}
