'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  Check, ArrowRight, ArrowLeft, FileText, AlertTriangle,
  Info, CheckCircle, Lock, Copy, MessageCircle,
  CreditCard, Globe, Upload, X, Search, ShieldCheck,
  Bookmark, CalendarDays, Users, BookOpen,
  UploadCloud, Pencil, Wand2,
} from 'lucide-react'

// ─── types ────────────────────────────────────────────────────────────────────

interface EligOption { text: string; score: number }
interface EligCriterion { question: string; options: (string | EligOption)[] }
interface RequiredDoc { type: string; required: boolean; formats?: string[]; creatable?: 'writes' | 'guides' }
interface UserDocument { id: string; name: string; type: string; timesReused?: number; mimeType?: string }

// Map a slot label to the nearest API document type enum value
const DOC_TYPE_MAP: Record<string, string> = {
  cv: 'cv', resume: 'cv',
  transcript: 'transcript', 'academic transcript': 'transcript',
  certificate: 'certificate', 'degree certificate': 'certificate', 'academic degree certificate': 'certificate',
  portfolio: 'portfolio',
  reference: 'reference_letter', 'reference letter': 'reference_letter', 'professional references': 'reference_letter', 'three professional references': 'reference_letter', 'two letters of recommendation': 'reference_letter',
  'personal statement': 'personal_statement', 'statement of purpose': 'personal_statement',
  'passport photo': 'passport_photo', 'passport': 'passport_photo', 'national id': 'other',
  'research proposal': 'other', 'writing sample': 'other', 'proof of enrollment': 'other', 'proof of citizenship': 'other',
}

function slotToApiType(slotLabel: string): string {
  const key = slotLabel.toLowerCase().trim()
  return DOC_TYPE_MAP[key] ?? 'other'
}

interface StartData {
  applicationId: string
  status: string
  resumed?: boolean
  eligibilityCriteria: EligCriterion[]
  requiredDocuments: RequiredDoc[]
  opportunityTitle?: string
  opportunityType?: string
  opportunityInstitution?: string
  opportunityCountry?: string
  oppdateServiceFeeUsd?: number
  institutionFeeUsd?: number
  complianceCategory?: 'A' | 'B' | null
}

// ─── palette ──────────────────────────────────────────────────────────────────

const AP = {
  ginger:    '#7A2D05',
  gingerMid: '#B5530A',
  ink:       '#2A1206',
  sec:       '#8C6A55',
  label:     '#5A3A25',
  helper:    '#B0A098',
  hairline:  '#D8CCC4',
  amber:     '#D4843A',
  green:     '#10B981',
  greenDark: '#065F46',
  error:     '#DC2626',
  sans:      'var(--font-sans)',
  serif:     'var(--font-serif)',
}

const apCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.80)',
  backdropFilter: 'blur(24px) saturate(140%)',
  WebkitBackdropFilter: 'blur(24px) saturate(140%)',
  border: '1px solid rgba(255,255,255,0.6)',
  borderRadius: 20,
  boxShadow: '0 4px 24px rgba(122,45,5,0.08), inset 0 1px 0 rgba(255,255,255,0.7)',
  boxSizing: 'border-box',
}

function normaliseOption(o: string | EligOption): EligOption {
  return typeof o === 'string' ? { text: o, score: 0 } : o
}

// ─── primitives ───────────────────────────────────────────────────────────────

function PrimaryButton({ children, disabled, onClick, full }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void; full?: boolean }) {
  const [h, setH] = useState(false)
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: full ? '100%' : undefined,
        height: 50, padding: '0 28px', borderRadius: 14, border: 'none',
        fontFamily: AP.sans, fontSize: 15, fontWeight: 600, lineHeight: 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: disabled ? 'rgba(122,45,5,0.22)' : h ? '#6B2504' : AP.ginger,
        color: disabled ? 'rgba(255,255,255,0.6)' : '#fff',
        boxShadow: disabled ? 'none' : '0 2px 12px rgba(122,45,5,0.28)',
        transition: 'background 140ms',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxSizing: 'border-box',
      }}
    >{children}</button>
  )
}

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const [h, setH] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        height: 44, padding: '0 4px', borderRadius: 10, border: 'none', background: 'none',
        fontFamily: AP.sans, fontSize: 14, fontWeight: 500, color: h ? AP.label : AP.sec,
        cursor: 'pointer', transition: 'color 120ms',
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}
    >{children}</button>
  )
}

function OutlineButton({ children, full, onClick }: { children: React.ReactNode; full?: boolean; onClick?: () => void }) {
  const [h, setH] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: full ? '100%' : undefined, height: 52, padding: '0 20px', borderRadius: 14,
        border: `1px solid ${AP.hairline}`,
        background: h ? 'rgba(122,45,5,0.03)' : 'rgba(255,255,255,0.6)',
        fontFamily: AP.sans, fontSize: 14, fontWeight: 400,
        color: AP.ink, cursor: 'pointer',
        transition: 'background 130ms',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, boxSizing: 'border-box',
      }}
    >{children}</button>
  )
}

function GingerOutlineButton({ children, full, onClick }: { children: React.ReactNode; full?: boolean; onClick?: () => void }) {
  const [h, setH] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: full ? '100%' : undefined, height: 52, padding: '0 20px', borderRadius: 14,
        border: `1px solid ${AP.ginger}`,
        background: h ? 'rgba(122,45,5,0.05)' : 'rgba(255,255,255,0.6)',
        fontFamily: AP.sans, fontSize: 14, fontWeight: 500,
        color: AP.ginger, cursor: 'pointer',
        transition: 'background 130ms',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, boxSizing: 'border-box',
      }}
    >{children}</button>
  )
}

function CardHeading({ children }: { children: React.ReactNode }) {
  return <h2 style={{ margin: 0, fontFamily: AP.serif, fontWeight: 600, fontSize: 26, letterSpacing: '-0.01em', color: AP.ink }}>{children}</h2>
}

function CardSub({ children, mb = 24 }: { children: React.ReactNode; mb?: number }) {
  return <p style={{ margin: `6px 0 ${mb}px`, fontFamily: AP.sans, fontSize: 13, lineHeight: 1.55, color: AP.sec }}>{children}</p>
}

function StepNav({ showBack, onBack, backLabel, primary }: { showBack?: boolean; onBack?: () => void; backLabel?: string; primary: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 36 }}>
      <div style={{ minWidth: 80 }}>
        {showBack && (
          <GhostButton onClick={onBack}><ArrowLeft size={15} /> {backLabel || 'Back'}</GhostButton>
        )}
      </div>
      <div>{primary}</div>
    </div>
  )
}

// ─── stepper ──────────────────────────────────────────────────────────────────

const STEPPER_LABELS = ['Eligibility', 'Documents', 'Payment', 'Received']

function Stepper({ current, done }: { current: number; done?: boolean }) {
  const completedSegments = done ? 4 : current
  const activeLabel = done ? 'Submitted' : STEPPER_LABELS[current]
  const activeStep = done ? 4 : current + 1
  return (
    <>
      {/* Desktop stepper — hidden below 600px */}
      <style>{`
        .ap-stepper-desktop { display: block; }
        .ap-stepper-mobile { display: none; }
        @media (max-width: 599px) {
          .ap-stepper-desktop { display: none; }
          .ap-stepper-mobile { display: block; }
        }
      `}</style>

      {/* Desktop */}
      <div className="ap-stepper-desktop" style={{ width: '100%', padding: '24px 0 28px', boxSizing: 'border-box' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: 17, left: '12.5%', right: '12.5%', height: 2, background: AP.hairline, borderRadius: 999 }} />
          <div style={{
            position: 'absolute', top: 17, left: '12.5%',
            width: completedSegments === 0 ? '0%' : `${Math.min(completedSegments / 3 * 75, 75)}%`,
            height: 2, background: AP.ginger, borderRadius: 999, transition: 'width 280ms ease',
          }} />
          <div style={{ position: 'relative', display: 'flex' }}>
            {STEPPER_LABELS.map((label, i) => {
              const isDone = done ? true : i < current
              const isActive = !done && i === current
              return (
                <div key={label} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', boxSizing: 'border-box',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isDone ? AP.ginger : isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                    border: isDone ? `2px solid ${AP.ginger}` : isActive ? `2px solid ${AP.ginger}` : `1.5px solid ${AP.hairline}`,
                    boxShadow: isActive ? `0 0 0 4px rgba(122,45,5,0.10)` : 'none',
                    transition: 'all 200ms',
                  }}>
                    {isDone
                      ? <Check size={15} style={{ color: '#fff', strokeWidth: 2.5 }} />
                      : <span style={{ fontFamily: AP.sans, fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? AP.ginger : AP.helper }}>{i + 1}</span>
                    }
                  </div>
                  <span style={{
                    marginTop: 8, fontFamily: AP.sans, fontSize: 11, fontWeight: isDone || isActive ? 600 : 400,
                    color: isDone ? AP.gingerMid : isActive ? AP.ginger : AP.helper, lineHeight: 1, whiteSpace: 'nowrap',
                  }}>{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Mobile — progress bar + label */}
      <div className="ap-stepper-mobile" style={{ width: '100%', padding: '20px 0 16px', boxSizing: 'border-box' }}>
        <div style={{ fontFamily: AP.sans, fontSize: 12, color: AP.sec, marginBottom: 8 }}>
          Step {activeStep} of 4 · <span style={{ fontWeight: 600, color: AP.ink }}>{activeLabel}</span>
        </div>
        <div style={{ height: 3, borderRadius: 999, background: AP.hairline, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 999, background: AP.ginger,
            width: done ? '100%' : `${(current / 3) * 100}%`,
            transition: 'width 280ms ease',
          }} />
        </div>
      </div>
    </>
  )
}

// ─── context strip ────────────────────────────────────────────────────────────

function ContextStrip({ title, institution, country, type }: { title: string; institution?: string; country?: string; type?: string }) {
  const flag = country ? country.slice(0, 2).toUpperCase() : null
  return (
    <>
      <style>{`
        .ap-ctx-desktop { display: flex !important; }
        .ap-ctx-mobile { display: none !important; }
        @media (max-width: 599px) {
          .ap-ctx-desktop { display: none !important; }
          .ap-ctx-mobile { display: block !important; }
        }
      `}</style>

      {/* Desktop — single row */}
      <div className="ap-ctx-desktop" style={{ ...apCard, borderRadius: 14, padding: '14px 20px', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 16, boxSizing: 'border-box', marginBottom: 12 }}>
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

      {/* Mobile — stacked */}
      <div className="ap-ctx-mobile" style={{ ...apCard, borderRadius: 14, padding: '12px 16px', width: '100%', boxSizing: 'border-box', marginBottom: 10 }}>
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

// ─── step 1: eligibility ──────────────────────────────────────────────────────

function RadioOption({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  const [h, setH] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', minHeight: 48, borderRadius: 12, cursor: 'pointer', boxSizing: 'border-box',
        border: `1px solid ${selected ? AP.ginger : h ? '#C9B6A6' : AP.hairline}`,
        background: selected ? 'rgba(122,45,5,0.05)' : h ? 'rgba(255,252,249,0.9)' : 'rgba(255,255,255,0.6)',
        transition: 'all 120ms',
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, boxSizing: 'border-box',
        border: `2px solid ${selected ? AP.ginger : h ? '#C9B6A6' : AP.hairline}`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', transition: 'all 120ms',
      }}>
        {selected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: AP.ginger }} />}
      </span>
      <span style={{ fontFamily: AP.sans, fontSize: 14, color: AP.ink, fontWeight: selected ? 500 : 400, lineHeight: 1.4 }}>{label}</span>
    </div>
  )
}

type EligPhase = 'questions' | 'eligible' | 'borderline' | 'ineligible'

interface SuggestedOpp {
  id: string
  slug?: string
  title: string
  type: string
  country: string
  institution: string
  deadline: string
}

interface AiAssessment {
  summary: string
  concerns: Array<{ criterion: string; detail: string }>
  canProceed: boolean
}

function AssessmentSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <style>{`@keyframes apShimmer{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>
      {[80, 100, 60].map((w, i) => (
        <div key={i} style={{ height: 13, width: `${w}%`, borderRadius: 6, background: 'rgba(122,45,5,0.08)', animation: 'apShimmer 1.4s ease-in-out infinite', animationDelay: `${i * 150}ms` }} />
      ))}
    </div>
  )
}

function EligibilityStepView({
  criteria,
  excludeOpportunityId,
  opportunityTitle,
  opportunityType,
  onContinue,
}: {
  criteria: EligCriterion[]
  excludeOpportunityId: string
  opportunityTitle: string
  opportunityType: string
  onContinue: (responses: { question: string; answer: string; score: number }[]) => void
}) {
  const questions = criteria.map(c => ({
    q: c.question,
    opts: c.options.map(normaliseOption),
  }))
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(questions.map(() => null))
  const [phase, setPhase] = useState<EligPhase>('questions')
  const storedResponses = useRef<{ question: string; answer: string; score: number }[]>([])
  const [suggestions, setSuggestions] = useState<SuggestedOpp[]>([])
  const [assessment, setAssessment] = useState<AiAssessment | null>(null)
  const [assessmentLoading, setAssessmentLoading] = useState(false)

  useEffect(() => {
    if (phase !== 'ineligible') return
    // Use /ai/recommendations — already filters past-deadline opps and scores by user preferences
    api.get('/api/v1/ai/recommendations?limit=6')
      .then(res => {
        const all: SuggestedOpp[] = res.data?.data ?? []
        setSuggestions(all.filter(o => o.id !== excludeOpportunityId).slice(0, 3))
      })
      .catch(() => {})
  }, [phase, excludeOpportunityId])

  if (questions.length === 0) {
    return (
      <div>
        <CardHeading>Eligibility check</CardHeading>
        <CardSub mb={20}>Based on your answers, here is the result for this opportunity.</CardSub>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 14, padding: '16px 18px' }}>
          <CheckCircle size={18} style={{ color: AP.green, flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontFamily: AP.sans, fontSize: 14, fontWeight: 600, color: AP.greenDark }}>You meet the eligibility criteria for this opportunity.</div>
            <div style={{ fontFamily: AP.sans, fontSize: 13, color: AP.sec, marginTop: 4 }}>You can proceed to upload your documents.</div>
          </div>
        </div>
        <StepNav primary={<PrimaryButton onClick={() => onContinue([])}>Continue to documents <ArrowRight size={15} /></PrimaryButton>} />
      </div>
    )
  }

  const Q = questions[qIndex]
  const sel = answers[qIndex]
  const hasSel = sel !== null
  const isLast = qIndex === questions.length - 1
  const pct = Math.round(((qIndex + 1) / questions.length) * 100)

  const handleSelect = (qi: number, oi: number) => {
    const next = [...answers]
    next[qi] = oi
    setAnswers(next)
  }

  const handleNext = () => {
    if (!isLast) { setQIndex(i => i + 1); return }
    const totalScore = answers.reduce<number>((sum, ai, i) => sum + (ai !== null ? questions[i].opts[ai].score : 0), 0)
    const responses = answers.map((ai, i) => ({
      question: questions[i].q,
      answer: ai !== null ? questions[i].opts[ai].text : '',
      score: ai !== null ? questions[i].opts[ai].score : 0,
    }))
    storedResponses.current = responses

    if (totalScore >= 0) {
      setPhase('eligible')
    } else {
      // Proportion-based verdict: ineligible if more than half the questions scored negative
      const negativeCount = responses.filter(r => r.score < 0).length
      const verdict = negativeCount >= Math.ceil(responses.length / 2) ? 'ineligible' : 'borderline'
      setPhase(verdict)
      setAssessment(null)
      setAssessmentLoading(true)
      api.post('/api/v1/ai/eligibility-assessment', {
        opportunityTitle,
        opportunityType,
        responses,
        verdict,
      }).then(res => {
        setAssessment(res.data?.data ?? null)
      }).catch(() => {
        // Surface the backend fallback text rather than leaving assessment null
        setAssessment({
          summary: 'Based on your responses, you do not meet all the eligibility criteria for this opportunity. You can still proceed — the OppDate team reviews every submission.',
          concerns: [],
          canProceed: true,
        })
      }).finally(() => setAssessmentLoading(false))
    }
  }

  if (phase === 'eligible') {
    return (
      <div>
        <CardHeading>Eligibility check</CardHeading>
        <CardSub mb={20}>Based on your answers, here is the result for this opportunity.</CardSub>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 14, padding: '16px 18px' }}>
          <CheckCircle size={18} style={{ color: AP.green, flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontFamily: AP.sans, fontSize: 14, fontWeight: 600, color: AP.greenDark }}>You meet the eligibility criteria for this opportunity.</div>
            <div style={{ fontFamily: AP.sans, fontSize: 13, color: AP.sec, marginTop: 4 }}>You can proceed to upload your documents.</div>
          </div>
        </div>
        <StepNav
          showBack
          onBack={() => { setPhase('questions'); setQIndex(questions.length - 1) }}
          backLabel="Retake"
          primary={<PrimaryButton onClick={() => onContinue(storedResponses.current)}>Continue to documents <ArrowRight size={15} /></PrimaryButton>}
        />
      </div>
    )
  }

  if (phase === 'borderline') {
    const discoverItems = [
      { icon: <Bookmark size={16} />, label: 'Browse opportunities', href: '/opportunities' },
      { icon: <CalendarDays size={16} />, label: 'Book a consultation', href: '/consultations' },
      { icon: <Users size={16} />, label: 'Explore mentorship', href: '/mentorship' },
      { icon: <BookOpen size={16} />, label: 'Browse eBooks', href: '/ebooks' },
    ]

    return (
      <div>
        <CardHeading>Eligibility check</CardHeading>
        <CardSub mb={20}>Based on your answers, here is the result for this opportunity.</CardSub>

        {/* Verdict banner */}
        <div style={{ background: 'rgba(212,132,58,0.06)', border: '1px solid rgba(212,132,58,0.22)', borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: assessmentLoading || assessment?.summary ? 12 : 0 }}>
            <AlertTriangle size={17} style={{ color: AP.amber, flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontFamily: AP.sans, fontSize: 14, fontWeight: 600, color: AP.ink, lineHeight: 1.4 }}>
              You may not meet all eligibility criteria for this opportunity.
            </div>
          </div>
          {assessmentLoading
            ? <div style={{ paddingLeft: 27 }}><AssessmentSkeleton /></div>
            : assessment?.summary && (
              <div style={{ fontFamily: AP.sans, fontSize: 13, color: AP.sec, lineHeight: 1.55, paddingLeft: 27, marginBottom: (assessment?.concerns ?? []).length > 0 ? 12 : 0 }}>
                {assessment.summary}
              </div>
            )
          }
          {!assessmentLoading && (assessment?.concerns ?? []).length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 42, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {assessment!.concerns.map((c, i) => (
                <li key={i} style={{ fontFamily: AP.sans, fontSize: 13, color: AP.ink, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 600 }}>{c.criterion}:</span>{' '}
                  <span style={{ color: AP.sec }}>{c.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Alternative listings */}
        {suggestions.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: AP.sans, fontSize: 13, color: AP.sec, marginBottom: 10 }}>You may be eligible for these opportunities instead:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {suggestions.map((opp) => {
                const initials = opp.institution.split(/[\s/&]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
                const daysLeft = opp.deadline ? Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / 86_400_000) : null
                const urgencyText = daysLeft !== null && daysLeft <= 30 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : daysLeft !== null ? new Date(opp.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null
                const isUrgent = daysLeft !== null && daysLeft <= 30
                const typeLabel = opp.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                return (
                  <div key={opp.id}
                    onClick={() => window.location.href = `/opportunities?slug=${opp.slug ?? opp.id}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.7)', border: `1px solid ${AP.hairline}`, cursor: 'pointer', transition: 'background 130ms' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.9)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.7)')}
                  >
                    <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(122,45,5,0.10)', color: AP.ginger, fontFamily: AP.sans, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: AP.sans, fontSize: 13, fontWeight: 600, color: AP.ink, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opp.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: AP.sans, fontSize: 11, color: AP.sec, display: 'flex', alignItems: 'center', gap: 3 }}><Globe size={10} />{opp.country}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', height: 17, padding: '0 7px', borderRadius: 999, border: '1px solid rgba(14,116,144,0.4)', color: '#0E7490', fontFamily: AP.sans, fontSize: 10, fontWeight: 500 }}>{typeLabel}</span>
                      </div>
                    </div>
                    {urgencyText && (
                      <span style={{ fontFamily: AP.sans, fontSize: 11, color: isUrgent ? AP.amber : AP.sec, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        {isUrgent && <span style={{ width: 5, height: 5, borderRadius: '50%', background: AP.amber, display: 'inline-block' }} />}
                        {urgencyText}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Explore more strip */}
        <div style={{ borderTop: `1px solid ${AP.hairline}`, marginTop: suggestions.length === 0 ? 8 : 0, background: '#FAF7F4', borderRadius: 14, padding: '20px 18px' }}>
          <div style={{ fontFamily: AP.sans, fontSize: 11, fontWeight: 600, color: AP.label, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>
            Explore more with OppDate
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {discoverItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < discoverItems.length - 1 ? `1px solid ${AP.hairline}` : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(122,45,5,0.08)', borderLeft: `2px solid ${AP.amber}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: AP.ginger }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1, fontFamily: AP.sans, fontSize: 13, fontWeight: 500, color: AP.ink }}>{item.label}</div>
                <button
                  onClick={() => window.location.href = item.href}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontFamily: AP.sans, fontSize: 12, fontWeight: 600, color: AP.ginger, padding: 0 }}
                >
                  Go <ArrowRight size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Proceed / retake */}
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => { setPhase('questions'); setQIndex(questions.length - 1) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: AP.sans, fontSize: 13, color: AP.sec, textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            Retake the quiz
          </button>
          <PrimaryButton onClick={() => onContinue(storedResponses.current)}>
            Proceed anyway <ArrowRight size={15} />
          </PrimaryButton>
        </div>
      </div>
    )
  }

  if (phase === 'ineligible') {
    const discoverItems = [
      { icon: <Bookmark size={16} />, label: 'Browse opportunities', href: '/opportunities' },
      { icon: <CalendarDays size={16} />, label: 'Book a consultation', href: '/consultations' },
      { icon: <Users size={16} />, label: 'Explore mentorship', href: '/mentorship' },
      { icon: <BookOpen size={16} />, label: 'Browse eBooks', href: '/ebooks' },
    ]

    return (
      <div>
        <CardHeading>Eligibility check</CardHeading>
        <CardSub mb={20}>Based on your answers, here is the result for this opportunity.</CardSub>

        {/* Verdict banner */}
        <div style={{ background: 'rgba(212,132,58,0.06)', border: '1px solid rgba(212,132,58,0.22)', borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: assessmentLoading || assessment?.summary ? 12 : 0 }}>
            <AlertTriangle size={17} style={{ color: AP.amber, flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontFamily: AP.sans, fontSize: 14, fontWeight: 600, color: AP.ink, lineHeight: 1.4 }}>
              You do not meet the eligibility criteria for this opportunity.
            </div>
          </div>
          {assessmentLoading
            ? <div style={{ paddingLeft: 27 }}><AssessmentSkeleton /></div>
            : assessment?.summary && (
              <div style={{ fontFamily: AP.sans, fontSize: 13, color: AP.sec, lineHeight: 1.55, paddingLeft: 27, marginBottom: (assessment?.concerns ?? []).length > 0 ? 12 : 0 }}>
                {assessment.summary}
              </div>
            )
          }
          {!assessmentLoading && (assessment?.concerns ?? []).length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 42, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {assessment!.concerns.map((c, i) => (
                <li key={i} style={{ fontFamily: AP.sans, fontSize: 13, color: AP.ink, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 600 }}>{c.criterion}:</span>{' '}
                  <span style={{ color: AP.sec }}>{c.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Alternative listings */}
        {suggestions.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: AP.sans, fontSize: 13, color: AP.sec, marginBottom: 10 }}>You may be eligible for these opportunities instead:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {suggestions.map((opp) => {
                const initials = opp.institution.split(/[\s/&]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
                const daysLeft = opp.deadline ? Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / 86_400_000) : null
                const urgencyText = daysLeft !== null && daysLeft <= 30 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : daysLeft !== null ? new Date(opp.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null
                const isUrgent = daysLeft !== null && daysLeft <= 30
                const typeLabel = opp.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                return (
                  <div key={opp.id}
                    onClick={() => window.location.href = `/opportunities?slug=${opp.slug ?? opp.id}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.7)', border: `1px solid ${AP.hairline}`, cursor: 'pointer', transition: 'background 130ms' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.9)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.7)')}
                  >
                    <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(122,45,5,0.10)', color: AP.ginger, fontFamily: AP.sans, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: AP.sans, fontSize: 13, fontWeight: 600, color: AP.ink, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opp.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: AP.sans, fontSize: 11, color: AP.sec, display: 'flex', alignItems: 'center', gap: 3 }}><Globe size={10} />{opp.country}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', height: 17, padding: '0 7px', borderRadius: 999, border: '1px solid rgba(14,116,144,0.4)', color: '#0E7490', fontFamily: AP.sans, fontSize: 10, fontWeight: 500 }}>{typeLabel}</span>
                      </div>
                    </div>
                    {urgencyText && (
                      <span style={{ fontFamily: AP.sans, fontSize: 11, color: isUrgent ? AP.amber : AP.sec, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        {isUrgent && <span style={{ width: 5, height: 5, borderRadius: '50%', background: AP.amber, display: 'inline-block' }} />}
                        {urgencyText}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Explore more strip */}
        <div style={{ borderTop: `1px solid ${AP.hairline}`, marginTop: suggestions.length === 0 ? 8 : 0, paddingTop: 20, background: '#FAF7F4', borderRadius: 14, padding: '20px 18px' }}>
          <div style={{ fontFamily: AP.sans, fontSize: 11, fontWeight: 600, color: AP.label, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>
            Explore more with OppDate
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {discoverItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < discoverItems.length - 1 ? `1px solid ${AP.hairline}` : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(122,45,5,0.08)', borderLeft: `2px solid ${AP.amber}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: AP.ginger }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1, fontFamily: AP.sans, fontSize: 13, fontWeight: 500, color: AP.ink }}>{item.label}</div>
                <button
                  onClick={() => window.location.href = item.href}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontFamily: AP.sans, fontSize: 12, fontWeight: 600, color: AP.ginger, padding: 0 }}
                >
                  Go <ArrowRight size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Retake link */}
        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <button
            onClick={() => { setPhase('questions'); setQIndex(questions.length - 1) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: AP.sans, fontSize: 13, color: AP.sec, textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            Retake the quiz
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <CardHeading>Eligibility check</CardHeading>
      <CardSub>Answer a few questions to confirm you meet the criteria for this opportunity. This takes about 2 minutes.</CardSub>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ height: 3, flex: 1, borderRadius: 999, background: 'rgba(122,45,5,0.08)', overflow: 'hidden', marginRight: 16 }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: AP.ginger, transition: 'width 320ms' }} />
        </div>
        <span style={{ fontFamily: AP.sans, fontSize: 12, color: AP.helper, whiteSpace: 'nowrap', flexShrink: 0 }}>Question {qIndex + 1} of {questions.length}</span>
      </div>
      <div style={{ fontFamily: AP.sans, fontSize: 16, fontWeight: 600, color: AP.ink, marginTop: 20, marginBottom: 16, lineHeight: 1.45 }}>{Q.q}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Q.opts.map((opt, i) => (
          <RadioOption key={i} label={opt.text} selected={sel === i} onClick={() => handleSelect(qIndex, i)} />
        ))}
      </div>
      <StepNav
        showBack={qIndex > 0}
        onBack={() => setQIndex(i => i - 1)}
        backLabel="Previous question"
        primary={
          <PrimaryButton disabled={!hasSel} onClick={handleNext}>
            {isLast ? 'See result' : 'Next question'} <ArrowRight size={15} />
          </PrimaryButton>
        }
      />
    </div>
  )
}

// ─── library modal ────────────────────────────────────────────────────────────

function LibraryModal({
  docs,
  preferredType,
  onSelect,
  onClose,
}: {
  docs: UserDocument[]
  preferredType: string
  onSelect: (doc: UserDocument) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const filtered = docs.filter(d => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return d.name.toLowerCase().includes(q) || d.type.toLowerCase().includes(q)
  })
  const sorted = [...filtered].sort((a, b) => (a.type === preferredType ? 0 : 1) - (b.type === preferredType ? 0 : 1))
  const typeLabel = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return createPortal(
    <>
      <style>{`
        @keyframes ap-sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .ap-lib-backdrop { position: fixed; inset: 0; background: rgba(42,18,6,0.40); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .ap-lib-panel { border-radius: 20px; max-width: 460px; }
        @media (max-width: 599px) {
          .ap-lib-backdrop { padding: 0; align-items: flex-end; }
          .ap-lib-panel { border-radius: 20px 20px 0 0; max-width: 100%; max-height: 92vh; animation: ap-sheet-up 260ms ease-out; }
        }
      `}</style>
    <div
      className="ap-lib-backdrop"
      onClick={onClose}
    >
      <div
        className="ap-lib-panel"
        style={{ ...apCard, width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '24px', boxSizing: 'border-box' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle on mobile */}
        <div style={{ width: 36, height: 4, borderRadius: 999, background: AP.hairline, margin: '-8px auto 16px', display: 'none' }} className="ap-lib-handle" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: AP.serif, fontSize: 18, fontWeight: 700, color: AP.ink }}>Select from library</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: AP.sec }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ position: 'relative', marginBottom: 14 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: AP.helper, pointerEvents: 'none' }} />
          <input
            autoFocus
            placeholder="Search documents..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box', height: 40, padding: '0 14px 0 36px',
              borderRadius: 10, border: `1px solid ${AP.hairline}`,
              background: 'rgba(255,255,255,0.7)', fontFamily: AP.sans, fontSize: 13, color: AP.ink,
              outline: 'none',
            }}
            onFocus={e => (e.target.style.borderColor = AP.ginger)}
            onBlur={e => (e.target.style.borderColor = AP.hairline)}
          />
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {sorted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: AP.sans, fontSize: 13, color: AP.helper }}>
              {docs.length === 0 ? 'You have no documents in your library yet.' : 'No documents match your search.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sorted.map(doc => {
                const isPreferred = doc.type === preferredType
                return (
                  <div
                    key={doc.id}
                    onClick={() => onSelect(doc)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12,
                      border: `1px solid ${isPreferred ? 'rgba(122,45,5,0.18)' : AP.hairline}`,
                      background: isPreferred ? 'rgba(122,45,5,0.03)' : 'rgba(255,255,255,0.6)',
                      cursor: 'pointer', transition: 'background 120ms',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(122,45,5,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = isPreferred ? 'rgba(122,45,5,0.03)' : 'rgba(255,255,255,0.6)')}
                  >
                    <FileText size={16} style={{ color: isPreferred ? AP.ginger : AP.helper, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: AP.sans, fontSize: 13, fontWeight: 500, color: AP.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                        <span style={{ fontFamily: AP.sans, fontSize: 11, color: AP.sec }}>{typeLabel(doc.type)}</span>
                        {(doc.timesReused ?? 0) > 0 && (
                          <span style={{ fontFamily: AP.sans, fontSize: 10, color: AP.gingerMid }}>Used {doc.timesReused} time{doc.timesReused === 1 ? '' : 's'}</span>
                        )}
                      </div>
                    </div>
                    {isPreferred && (
                      <span style={{ fontFamily: AP.sans, fontSize: 10, fontWeight: 600, color: AP.ginger, background: 'rgba(122,45,5,0.08)', padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>Best match</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
    </>,
    document.body
  )
}

// ─── step 2: documents ────────────────────────────────────────────────────────

type DocState = 'empty' | 'library' | 'uploaded'

function DocSlot({
  doc,
  state,
  userDoc,
  uploading,
  uploadProgress,
  readinessHint,
  onUseLibrary,
  onUploadClick,
  onChange,
}: {
  doc: RequiredDoc
  state: DocState
  userDoc?: UserDocument
  uploading?: boolean
  uploadProgress?: number
  readinessHint?: ReadinessChoice
  onUseLibrary: () => void
  onUploadClick: () => void
  onChange: () => void
}) {
  const filled = state !== 'empty'
  const pct = uploadProgress ?? 0

  if (uploading) {
    return (
      <div style={{
        border: '1px solid rgba(122,45,5,0.18)',
        background: 'linear-gradient(135deg, #FDF3E8 0%, #FAE8D4 100%)',
        borderRadius: 14, padding: '13px 16px', boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <FileText size={16} style={{ color: AP.ginger, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: AP.sans, fontSize: 13, fontWeight: 500, color: AP.ink }}>{doc.type}</div>
            <div style={{ marginTop: 6, width: 160 }}>
              <div style={{ height: 4, borderRadius: 999, background: 'rgba(122,45,5,0.12)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: '#4A1A03', borderRadius: 999, transition: 'width 120ms ease' }} />
              </div>
              <div style={{ fontFamily: AP.sans, fontSize: 11, color: AP.sec, marginTop: 4 }}>Uploading_ {pct}%</div>
            </div>
          </div>
        </div>
        <X size={15} style={{ color: AP.sec, flexShrink: 0, cursor: 'default' }} />
      </div>
    )
  }

  const statusPill = filled && userDoc ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', height: 17, padding: '0 7px', borderRadius: 999, background: state === 'library' ? 'rgba(122,45,5,0.10)' : 'rgba(16,185,129,0.12)', color: state === 'library' ? AP.gingerMid : AP.greenDark, fontFamily: AP.sans, fontSize: 10, fontWeight: 600, lineHeight: 1, flexShrink: 0 }}>
      {state === 'library' ? 'From library' : 'Uploaded'}
    </span>
  ) : null

  return (
    <>
      <style>{`
        .ap-docslot-actions-desktop { display: flex !important; }
        .ap-docslot-actions-mobile { display: none !important; }
        @media (max-width: 599px) {
          .ap-docslot-actions-desktop { display: none !important; }
          .ap-docslot-actions-mobile { display: flex !important; }
        }
      `}</style>
      <div style={{
        border: `1px solid ${filled ? 'rgba(122,45,5,0.15)' : readinessHint === 'refine' ? 'rgba(212,132,58,0.4)' : AP.hairline}`,
        background: filled ? 'rgba(255,251,248,0.9)' : readinessHint === 'refine' ? 'rgba(212,132,58,0.03)' : 'rgba(255,255,255,0.6)',
        borderRadius: 14, padding: '12px 16px', boxSizing: 'border-box',
        transition: 'all 160ms', position: 'relative',
      }}>
        {/* Refinement Requested badge */}
        {!filled && readinessHint === 'refine' && (
          <span style={{
            position: 'absolute', top: 12, right: 14,
            display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 8px', borderRadius: 999,
            background: 'rgba(212,132,58,0.12)', color: '#D4843A',
            fontFamily: AP.sans, fontSize: 10, fontWeight: 500, letterSpacing: '0.04em', whiteSpace: 'nowrap', lineHeight: 1,
          }}>Refinement Requested</span>
        )}
        {/* Row 1: icon + doc name + (filled: status + Change) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <FileText size={16} style={{ color: filled ? AP.ginger : AP.hairline, flexShrink: 0 }} />
            <span style={{ fontFamily: AP.sans, fontSize: 14, fontWeight: 500, color: AP.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.type}</span>
          </div>
          {filled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <CheckCircle size={16} style={{ color: AP.green }} />
              <button onClick={onChange} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: AP.sans, fontSize: 13, fontWeight: 500, color: AP.ginger, padding: 0, minHeight: 44, minWidth: 44 }}>Change</button>
            </div>
          )}
          {!filled && !doc.required && (
            <span style={{ fontFamily: AP.sans, fontSize: 11, color: AP.helper, flexShrink: 0 }}>Optional</span>
          )}
        </div>

        {/* Row 2 (filled): filename + status pill */}
        {filled && userDoc && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, paddingLeft: 26 }}>
            <span style={{ fontFamily: AP.sans, fontSize: 11, color: AP.sec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{userDoc.name}</span>
            {statusPill}
          </div>
        )}

        {/* Row 2 (empty): action buttons — desktop inline, mobile full-width stacked */}
        {!filled && (
          <>
            {/* Desktop: side-by-side */}
            <div className="ap-docslot-actions-desktop" style={{ alignItems: 'center', gap: 8, marginTop: 10, paddingLeft: 26 }}>
              <button onClick={onUseLibrary} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${AP.ginger}`, background: 'transparent', fontFamily: AP.sans, fontSize: 12, fontWeight: 500, color: AP.ginger, cursor: 'pointer', whiteSpace: 'nowrap' }}>Use from library</button>
              <button onClick={onUploadClick} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${AP.hairline}`, background: 'transparent', fontFamily: AP.sans, fontSize: 12, fontWeight: 500, color: AP.sec, cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Upload size={11} />Upload file</button>
            </div>
            {/* Mobile: full-width stacked */}
            <div className="ap-docslot-actions-mobile" style={{ flexDirection: 'column', gap: 8, marginTop: 10 }}>
              <button onClick={onUseLibrary} style={{ width: '100%', height: 40, borderRadius: 9, border: `1px solid ${AP.ginger}`, background: 'transparent', fontFamily: AP.sans, fontSize: 13, fontWeight: 500, color: AP.ginger, cursor: 'pointer' }}>Use from library</button>
              <button onClick={onUploadClick} style={{ width: '100%', height: 40, borderRadius: 9, border: `1px solid ${AP.hairline}`, background: 'transparent', fontFamily: AP.sans, fontSize: 13, fontWeight: 500, color: AP.sec, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Upload size={13} />Upload file</button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ─── step 1a: readiness check ─────────────────────────────────────────────────

type ReadinessChoice = 'ready' | 'refine' | 'help'
type ReadinessMap = Record<string, ReadinessChoice | undefined>

const READINESS_OPTS: {
  id: ReadinessChoice
  label: string
  Icon: React.FC<{ size: number; style?: React.CSSProperties }>
  selBg: string
  selBorder: string
  selColor: string
}[] = [
  { id: 'ready',  label: 'Ready to upload',          Icon: ({ size, style }) => <UploadCloud size={size} style={style} />, selBg: 'rgba(5,150,105,0.08)',  selBorder: '#059669', selColor: '#059669' },
  { id: 'refine', label: 'Needs refinement',          Icon: ({ size, style }) => <Pencil size={size} style={style} />,      selBg: 'rgba(212,132,58,0.08)', selBorder: '#D4843A', selColor: '#D4843A' },
  { id: 'help',   label: 'I need help creating this', Icon: ({ size, style }) => <Wand2 size={size} style={style} />,       selBg: 'rgba(122,45,5,0.08)',  selBorder: AP.ginger, selColor: AP.ginger },
]

function R2Badge({ color }: { color: string }) {
  const [on, setOn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setOn(true), 20); return () => clearTimeout(t) }, [])
  return (
    <span style={{
      position: 'absolute', top: 7, right: 7, width: 14, height: 14, borderRadius: '50%',
      background: color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      transform: on ? 'scale(1)' : 'scale(0)', transition: 'transform 150ms ease-out',
    }}>
      <Check size={9} style={{ color: '#fff', strokeWidth: 3 }} />
    </span>
  )
}

function R2OptionBtn({
  opt, selected, onSelect,
}: {
  opt: typeof READINESS_OPTS[number]
  selected: boolean
  onSelect: () => void
}) {
  const [h, setH] = useState(false)
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        position: 'relative', flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 6, padding: '12px 8px',
        borderRadius: 10, cursor: 'pointer', boxSizing: 'border-box',
        background: selected ? opt.selBg : h ? 'rgba(122,45,5,0.02)' : '#fff',
        border: selected ? `1.5px solid ${opt.selBorder}` : `1px solid ${h ? AP.ginger : AP.hairline}`,
        transform: h && !selected ? 'scale(1.01)' : 'none',
        transition: 'all 150ms ease',
      }}
    >
      {selected && <R2Badge color={opt.selBorder} />}
      <opt.Icon size={20} style={{ color: selected ? opt.selColor : AP.helper, transition: 'color 150ms', flexShrink: 0 }} />
      <span style={{
        fontFamily: AP.sans, fontSize: 12.5, fontWeight: selected ? 500 : 400,
        color: selected ? opt.selColor : AP.label, textAlign: 'center', lineHeight: 1.3,
      }}>{opt.label}</span>
    </button>
  )
}

function R2DocCard({
  label, required, value, onChange, creatable,
}: {
  label: string
  required: boolean
  value: ReadinessChoice | undefined
  onChange: (v: ReadinessChoice) => void
  creatable?: 'writes' | 'guides'
}) {
  const helpOpt = creatable === 'writes'
    ? { ...READINESS_OPTS[2], label: 'I need help creating this' }
    : creatable === 'guides'
    ? { ...READINESS_OPTS[2], label: 'I need help obtaining this' }
    : null
  const visibleOpts = helpOpt
    ? [READINESS_OPTS[0], READINESS_OPTS[1], helpOpt]
    : [READINESS_OPTS[0], READINESS_OPTS[1]]
  const selOpt = visibleOpts.find(o => o.id === value)
  const cardBorder = selOpt ? `1.5px solid ${selOpt.selBorder}` : `1px solid ${AP.hairline}`
  return (
    <div style={{
      background: '#fff', border: cardBorder, borderRadius: 16, padding: 20,
      marginBottom: 12, boxShadow: '0 1px 4px rgba(122,45,5,0.06)',
      transition: 'border-color 200ms ease', boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <FileText size={18} style={{ color: AP.helper, flexShrink: 0 }} />
          <span style={{ fontFamily: AP.sans, fontSize: 15, fontWeight: 600, color: AP.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        </div>
        {required && (
          <span style={{
            flexShrink: 0, display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 8px', borderRadius: 999,
            background: 'rgba(122,45,5,0.08)', fontFamily: AP.sans, fontSize: 11, fontWeight: 500, color: AP.ginger, lineHeight: 1, whiteSpace: 'nowrap',
          }}>Required</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {visibleOpts.map(opt => (
          <R2OptionBtn key={opt.id} opt={opt} selected={value === opt.id} onSelect={() => onChange(opt.id)} />
        ))}
      </div>
    </div>
  )
}

function ReadinessStepView({
  requiredDocs,
  readiness,
  onChange,
  onContinue,
  onBack,
}: {
  requiredDocs: RequiredDoc[]
  readiness: ReadinessMap
  onChange: (key: string, val: ReadinessChoice) => void
  onContinue: () => void
  onBack: () => void
}) {
  const allAnswered = requiredDocs.every(doc => readiness[doc.type] !== undefined)

  return (
    <div>
      <CardHeading>Let's check what you have ready</CardHeading>
      <CardSub mb={24}>Select the status of each document below so we know how to help you.</CardSub>
      {requiredDocs.map((doc) => (
        <R2DocCard
          key={doc.type}
          label={doc.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          required={doc.required}
          value={readiness[doc.type]}
          onChange={(v) => onChange(doc.type, v)}
          creatable={doc.creatable}
        />
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 16 }}>
        <Info size={14} style={{ color: AP.helper, flexShrink: 0 }} />
        <span style={{ fontFamily: AP.sans, fontSize: 12, color: AP.helper, lineHeight: 1.45 }}>
          Certificates, transcripts, and institution-provided documents will be collected on the next screen.
        </span>
      </div>
      <div style={{ marginTop: 24 }}>
        <PrimaryButton full disabled={!allAnswered} onClick={allAnswered ? onContinue : undefined}>
          Continue <ArrowRight size={16} />
        </PrimaryButton>
      </div>
      <div style={{ marginTop: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: AP.sans, fontSize: 13, color: AP.sec, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <ArrowLeft size={13} /> Back
        </button>
      </div>
    </div>
  )
}

// ─── step 1b: document upload ─────────────────────────────────────────────────

function DocumentsStepView({
  requiredDocs,
  userDocs: initialUserDocs,
  readiness,
  onBack,
  onContinue,
  submitting,
}: {
  requiredDocs: RequiredDoc[]
  userDocs: UserDocument[]
  readiness: ReadinessMap
  onBack: () => void
  onContinue: (slots: any[]) => void
  submitting?: boolean
}) {
  // Docs marked "help" are excluded - OppDate creates them; only ready/refine need uploading
  const uploadDocs = requiredDocs.filter(doc => readiness[doc.type] !== 'help')

  const [docStates, setDocStates] = useState<Record<number, DocState>>(() =>
    Object.fromEntries(uploadDocs.map((_, i) => [i, 'empty' as DocState]))
  )
  const [docUserDocs, setDocUserDocs] = useState<Record<number, UserDocument | undefined>>({})
  const [uploading, setUploading] = useState<Record<number, boolean>>({})
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({})
  const [uploadError, setUploadError] = useState<string | null>(null)
  // Library modal state: which slot index is open, or null
  const [librarySlot, setLibrarySlot] = useState<number | null>(null)
  // userDocs can grow as user uploads new ones in this session
  const [userDocs, setUserDocs] = useState<UserDocument[]>(initialUserDocs)
  // File input refs per slot
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const allRequired = uploadDocs.every((doc, i) => !doc.required || docStates[i] !== 'empty')

  const handleSelectFromLibrary = (slotIdx: number, doc: UserDocument) => {
    setDocStates(prev => ({ ...prev, [slotIdx]: 'library' }))
    setDocUserDocs(prev => ({ ...prev, [slotIdx]: doc }))
    setLibrarySlot(null)
  }

  const handleFileChange = async (slotIdx: number, file: File) => {
    setUploading(prev => ({ ...prev, [slotIdx]: true }))
    setUploadProgress(prev => ({ ...prev, [slotIdx]: 0 }))
    setUploadError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('type', slotToApiType(uploadDocs[slotIdx].type))
      form.append('name', file.name)
      const res = await api.post('/api/v1/documents', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0
          setUploadProgress(prev => ({ ...prev, [slotIdx]: pct }))
        },
      })
      const uploaded: UserDocument = res.data?.data
      setUserDocs(prev => [uploaded, ...prev])
      setDocStates(prev => ({ ...prev, [slotIdx]: 'uploaded' }))
      setDocUserDocs(prev => ({ ...prev, [slotIdx]: uploaded }))
    } catch (e: any) {
      setUploadError(e?.response?.data?.message ?? 'Upload failed. Please try again.')
    } finally {
      setUploading(prev => ({ ...prev, [slotIdx]: false }))
      setUploadProgress(prev => ({ ...prev, [slotIdx]: 0 }))
      if (fileInputRefs.current[slotIdx]) fileInputRefs.current[slotIdx]!.value = ''
    }
  }

  const handleChange = (i: number) => {
    setDocStates(prev => ({ ...prev, [i]: 'empty' }))
    setDocUserDocs(prev => ({ ...prev, [i]: undefined }))
  }

  const handleContinue = () => {
    // Build slots for all required docs. "help" docs have no upload state - mark as needs_creation.
    // Upload docs are indexed by their position in uploadDocs (not requiredDocs).
    const slots = requiredDocs.map((doc) => {
      const r = readiness[doc.type]
      if (r === 'help') {
        return { documentType: slotToApiType(doc.type), slotLabel: doc.type, readinessStatus: 'needs_creation', documentId: undefined }
      }
      const uploadIdx = uploadDocs.findIndex(d => d.type === doc.type)
      const uploadStatus = docStates[uploadIdx] === 'library' || docStates[uploadIdx] === 'uploaded' ? 'ready' : 'needs_creation'
      return {
        documentType: slotToApiType(doc.type),
        slotLabel: doc.type,
        readinessStatus: r === 'refine' ? 'needs_refinement' : uploadStatus,
        documentId: docUserDocs[uploadIdx]?.id || undefined,
      }
    })
    onContinue(slots)
  }

  return (
    <div>
      {librarySlot !== null && (
        <LibraryModal
          docs={userDocs}
          preferredType={slotToApiType(uploadDocs[librarySlot].type)}
          onSelect={doc => handleSelectFromLibrary(librarySlot, doc)}
          onClose={() => setLibrarySlot(null)}
        />
      )}

      <CardHeading>Upload your documents</CardHeading>
      <CardSub>This opportunity requires the following documents. Select from your library or upload new files.</CardSub>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {uploadDocs.map((doc, i) => (
          <div key={doc.type}>
            {/* Hidden file input */}
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              style={{ display: 'none' }}
              ref={el => { fileInputRefs.current[i] = el }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChange(i, f) }}
            />
            <DocSlot
              doc={doc}
              state={docStates[i]}
              userDoc={docUserDocs[i]}
              uploading={uploading[i]}
              uploadProgress={uploadProgress[i]}
              readinessHint={readiness[doc.type]}
              onUseLibrary={() => setLibrarySlot(i)}
              onUploadClick={() => fileInputRefs.current[i]?.click()}
              onChange={() => handleChange(i)}
            />
          </div>
        ))}
      </div>
      {uploadError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <AlertTriangle size={14} style={{ color: AP.error, flexShrink: 0 }} />
          <span style={{ fontFamily: AP.sans, fontSize: 13, color: AP.error }}>{uploadError}</span>
        </div>
      )}
      {!allRequired && !uploadError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
          <AlertTriangle size={14} style={{ color: AP.error, flexShrink: 0 }} />
          <span style={{ fontFamily: AP.sans, fontSize: 13, color: AP.error }}>Please provide all required documents before continuing.</span>
        </div>
      )}
      <StepNav
        showBack
        onBack={onBack}
        primary={<PrimaryButton disabled={!allRequired || Object.values(uploading).some(Boolean) || submitting} onClick={handleContinue}>{submitting ? 'Saving...' : <>Continue to payment <ArrowRight size={15} /></>}</PrimaryButton>}
      />
    </div>
  )
}


// ─── step 3: payment ──────────────────────────────────────────────────────────

function MobileOrderSummary({ title, institution, serviceFee, institutionFee, fmt, total }: { title: string; institution?: string; serviceFee: number; institutionFee: number; fmt: (n: number) => string; total: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="ap-pay-summary-mobile" style={{ marginBottom: 20, borderRadius: 12, border: `1px solid ${AP.hairline}`, background: 'rgba(122,45,5,0.03)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
      >
        <span style={{ fontFamily: AP.sans, fontSize: 13, fontWeight: 500, color: AP.ink, textAlign: 'left', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontFamily: AP.sans, fontSize: 14, fontWeight: 700, color: AP.ginger }}>{fmt(total)}</span>
          <span style={{ fontFamily: AP.sans, fontSize: 11, color: AP.sec, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms', display: 'inline-block' }}>▾</span>
        </div>
      </button>
      {open && (
        <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${AP.hairline}` }}>
          {institution && <div style={{ fontFamily: AP.sans, fontSize: 12, color: AP.sec, padding: '10px 0 10px' }}>{institution}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: institution ? 0 : 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontFamily: AP.sans, fontSize: 12, color: AP.label }}>OppDate service fee</span>
              <span style={{ fontFamily: AP.sans, fontSize: 12, fontWeight: 600, color: AP.ink }}>{fmt(serviceFee)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontFamily: AP.sans, fontSize: 12, color: AP.label }}>Institution fee</span>
              <span style={{ fontFamily: AP.sans, fontSize: 12, fontWeight: 600, color: AP.ink }}>{fmt(institutionFee)}</span>
            </div>
            <div style={{ height: 1, background: AP.hairline, margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontFamily: AP.sans, fontSize: 13, fontWeight: 600, color: AP.ink }}>Total due</span>
              <span style={{ fontFamily: AP.sans, fontSize: 14, fontWeight: 700, color: AP.ginger }}>{fmt(total)}</span>
            </div>
            <div style={{ fontFamily: AP.sans, fontSize: 11, color: AP.helper }}>All fees are in USD.</div>
          </div>
        </div>
      )}
    </div>
  )
}


function PaymentStepView({
  applicationId,
  title,
  institution,
  serviceFee,
  institutionFee,
  catA,
  catB,
  onBack,
}: {
  applicationId: string
  title: string
  institution?: string
  serviceFee: number
  institutionFee: number
  catA?: boolean
  catB?: boolean
  onBack: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [declined, setDeclined] = useState(false)
  const [gateway, setGateway] = useState<'stripe' | 'paystack'>('stripe')
  const [authChecked, setAuthChecked] = useState(false)
  const total = serviceFee + institutionFee
  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`

  const handlePay = async () => {
    setLoading(true)
    setDeclined(false)
    try {
      const res = await api.post('/api/v1/payments/checkout', {
        purpose: 'oppdate_apply',
        gateway,
        referenceId: applicationId,
      })
      const { checkoutUrl } = res.data?.data ?? {}
      if (checkoutUrl) window.location.href = checkoutUrl
      else setDeclined(true)
    } catch {
      setDeclined(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <style>{`
        .ap-pay-layout { display: flex; gap: 24px; align-items: flex-start; }
        .ap-pay-summary-desktop { display: block !important; }
        .ap-pay-summary-mobile { display: none !important; }
        .ap-gateway-desktop { display: flex !important; }
        .ap-gateway-mobile { display: none !important; }
        @media (max-width: 599px) {
          .ap-pay-layout { flex-direction: column; gap: 0; }
          .ap-pay-summary-desktop { display: none !important; }
          .ap-pay-summary-mobile { display: block !important; }
          .ap-gateway-desktop { display: none !important; }
          .ap-gateway-mobile { display: flex !important; }
        }
      `}</style>

      <CardHeading>Confirm and pay</CardHeading>
      <CardSub mb={declined ? 16 : 24}>You will not be charged until you click the button below.</CardSub>

      {declined && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
          <AlertTriangle size={16} style={{ color: AP.error, flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontFamily: AP.sans, fontSize: 13, color: AP.error }}>Payment could not be processed. Please try again.</span>
        </div>
      )}

      {/* Mobile order summary accordion - above auth + form */}
      <MobileOrderSummary title={title} institution={institution} serviceFee={serviceFee} institutionFee={institutionFee} fmt={fmt} total={total} />

      {!catA && !catB && (
        <div style={{ marginBottom: 24, borderRadius: 14, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.04)', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={15} style={{ color: AP.error, flexShrink: 0 }} />
            <span style={{ fontFamily: AP.sans, fontSize: 13, fontWeight: 600, color: AP.error }}>Compliance category not configured</span>
          </div>
          <p style={{ fontFamily: AP.sans, fontSize: 13, color: AP.error, margin: '8px 0 0', lineHeight: 1.5, opacity: 0.85 }}>
            This listing is missing its compliance category. Please contact the OppDate team before proceeding.
          </p>
        </div>
      )}
      {(catA || catB) && (
        <div style={{ marginBottom: 24, borderRadius: 14, border: `1px solid ${AP.hairline}`, background: 'rgba(255,255,255,0.55)', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={16} style={{ color: AP.ginger, flexShrink: 0 }} />
              <span style={{ fontFamily: AP.sans, fontSize: 13, fontWeight: 600, color: AP.ink }}>Representation Authorization</span>
            </div>
            {catA ? (
              <span style={{ fontFamily: AP.sans, fontSize: 11, fontWeight: 600, color: AP.amber, background: 'rgba(212,132,58,0.10)', border: '1px solid rgba(212,132,58,0.22)', borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap' }}>You submit</span>
            ) : (
              <span style={{ fontFamily: AP.sans, fontSize: 11, fontWeight: 600, color: '#059669', background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.22)', borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap' }}>OppDate submits</span>
            )}
          </div>
          <p style={{ fontFamily: AP.sans, fontSize: 13, color: AP.sec, lineHeight: 1.6, margin: '0 0 10px' }}>
            {catA ? (
              <>
                By proceeding, you authorize OppDate to prepare your complete application package under our{' '}
                <a href="/legal/terms" target="_blank" rel="noopener noreferrer" style={{ color: AP.ginger, textDecoration: 'underline', textUnderlineOffset: 2 }}>Terms of Service</a>.
                {' '}You will complete the final submission step directly with the institution when your package is ready.
              </>
            ) : (
              <>
                By proceeding, you authorize OppDate to prepare and submit this application on your behalf under our{' '}
                <a href="/legal/terms" target="_blank" rel="noopener noreferrer" style={{ color: AP.ginger, textDecoration: 'underline', textUnderlineOffset: 2 }}>Terms of Service</a>.
                {' '}OppDate will manage all documents, communication, and submission for {title}.
              </>
            )}
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 14 }}>
            <Info size={12} style={{ color: AP.helper, flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontFamily: AP.sans, fontSize: 11, color: AP.helper, fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
              OppDate does not store your Gmail password, create email accounts on your behalf, or access any personal accounts not explicitly shared with you.
              {' '}See our{' '}
              <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" style={{ color: AP.helper, textDecoration: 'underline', textUnderlineOffset: 2, fontStyle: 'italic' }}>Privacy Policy</a>
              {' '}for details on how we handle your data.
            </p>
          </div>
          <div style={{ height: 1, background: AP.hairline, marginBottom: 14 }} />
          <div
            onClick={() => setAuthChecked(v => !v)}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', minHeight: 44 }}
          >
            <div style={{
              width: 17, height: 17, borderRadius: 4, flexShrink: 0, boxSizing: 'border-box', marginTop: 2,
              border: `2px solid ${authChecked ? AP.ginger : AP.hairline}`,
              background: authChecked ? AP.ginger : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 140ms',
            }}>
              {authChecked && <Check size={10} style={{ color: '#fff', strokeWidth: 3 }} />}
            </div>
            <span style={{ fontFamily: AP.sans, fontSize: 13, color: AP.ink, lineHeight: 1.5 }} onClick={e => e.stopPropagation()}>
              {catA ? (
                <>
                  I authorize OppDate to prepare my application package. I understand I will complete the final submission step myself and that this is governed by OppDate&apos;s{' '}
                  <a href="/legal/terms" target="_blank" rel="noopener noreferrer" style={{ color: AP.ginger, textDecoration: 'underline', textUnderlineOffset: 2 }}>Terms of Service</a>.
                </>
              ) : (
                <>
                  I authorize OppDate to act as my representative and submit this application on my behalf, as outlined in OppDate&apos;s{' '}
                  <a href="/legal/terms" target="_blank" rel="noopener noreferrer" style={{ color: AP.ginger, textDecoration: 'underline', textUnderlineOffset: 2 }}>Terms of Service</a>.
                </>
              )}
            </span>
          </div>
        </div>
      )}

      <div className="ap-pay-layout">
        {/* Left: gateway selector + redirect notice */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontFamily: AP.sans, fontSize: 13, fontWeight: 600, color: AP.ink, marginBottom: 4 }}>Payment method</div>

          {/* Gateway selector - desktop */}
          <div className="ap-gateway-desktop" style={{ gap: 8 }}>
            {(['stripe', 'paystack'] as const).map(g => (
              <button key={g} onClick={() => setGateway(g)} style={{ padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontFamily: AP.sans, fontSize: 13, fontWeight: 500, border: `1.5px solid ${gateway === g ? AP.ginger : AP.hairline}`, background: gateway === g ? 'rgba(122,45,5,0.06)' : 'rgba(255,255,255,0.6)', color: gateway === g ? AP.ginger : AP.sec, transition: 'all 140ms' }}>
                {g === 'stripe' ? 'Stripe' : 'Paystack'}
              </button>
            ))}
          </div>
          {/* Gateway selector - mobile */}
          <div className="ap-gateway-mobile" style={{ borderRadius: 10, border: `1px solid ${AP.hairline}`, overflow: 'hidden' }}>
            {(['stripe', 'paystack'] as const).map(g => (
              <button key={g} onClick={() => setGateway(g)} style={{ flex: 1, height: 44, border: 'none', borderRight: g === 'stripe' ? `1px solid ${AP.hairline}` : 'none', cursor: 'pointer', fontFamily: AP.sans, fontSize: 14, fontWeight: 600, background: gateway === g ? AP.ginger : 'transparent', color: gateway === g ? '#fff' : AP.sec, transition: 'all 140ms' }}>
                {g === 'stripe' ? 'Stripe' : 'Paystack'}
              </button>
            ))}
          </div>

          {/* Redirect notice */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(122,45,5,0.03)', border: `1px solid ${AP.hairline}`, borderRadius: 12, padding: '14px 16px' }}>
            <Lock size={14} style={{ color: AP.helper, flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontFamily: AP.sans, fontSize: 12, color: AP.sec, lineHeight: 1.55 }}>
              Clicking "Pay" will take you to {gateway === 'stripe' ? 'Stripe' : 'Paystack'}'s secure checkout page where you will enter your card details. Your payment information is never stored on OppDate's servers.
            </div>
          </div>
        </div>

        {/* Desktop order summary sidebar */}
        <div className="ap-pay-summary-desktop" style={{ width: 220, flexShrink: 0, background: 'rgba(122,45,5,0.04)', border: '1px solid rgba(122,45,5,0.08)', borderRadius: 16, padding: '18px 16px', boxSizing: 'border-box' }}>
          <div style={{ fontFamily: AP.sans, fontSize: 13, fontWeight: 600, color: AP.ink, marginBottom: 12 }}>Order summary</div>
          <div style={{ fontFamily: AP.sans, fontSize: 13, fontWeight: 600, color: AP.ink }}>{title}</div>
          {institution && <div style={{ fontFamily: AP.sans, fontSize: 12, color: AP.sec, marginTop: 2 }}>{institution}</div>}
          <div style={{ height: 1, background: 'rgba(122,45,5,0.08)', margin: '14px 0' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontFamily: AP.sans, fontSize: 12, color: AP.label }}>OppDate service fee</span>
              <span style={{ fontFamily: AP.sans, fontSize: 12, fontWeight: 600, color: AP.ink }}>{fmt(serviceFee)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontFamily: AP.sans, fontSize: 12, color: AP.label }}>Institution fee</span>
              <span style={{ fontFamily: AP.sans, fontSize: 12, fontWeight: 600, color: AP.ink }}>{fmt(institutionFee)}</span>
            </div>
          </div>
          <div style={{ height: 1, background: 'rgba(122,45,5,0.08)', margin: '14px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontFamily: AP.sans, fontSize: 14, fontWeight: 600, color: AP.ink }}>Total due</span>
            <span style={{ fontFamily: AP.sans, fontSize: 16, fontWeight: 700, color: AP.ginger }}>{fmt(total)}</span>
          </div>
          <div style={{ fontFamily: AP.sans, fontSize: 11, color: AP.helper, marginTop: 6 }}>All fees are in USD.</div>
        </div>
      </div>

      <StepNav
        showBack
        onBack={onBack}
        primary={
          <PrimaryButton disabled={loading || ((catA || catB) && !authChecked) || (!catA && !catB)} onClick={handlePay}>
            {loading ? 'Processing...' : `Pay ${fmt(total)}`} <ArrowRight size={15} />
          </PrimaryButton>
        }
      />
    </div>
  )
}

// ─── step 4: submitted ────────────────────────────────────────────────────────

const AP2_STAGES = [
  'Payment Confirmed',
  'Application Received',
  'Verifying Documents',
  'Enhancing Application Materials',
  'Pre-Application Setup',
  'Application In Progress',
  'Preparing Submission',
  'Application Submitted',
]

function SubmittedStepView({ applicationId, catA }: { applicationId: string; catA: boolean }) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [refId, setRefId] = useState<string>('')
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!applicationId) return
    api.get(`/api/v1/applications/${applicationId}`)
      .then(res => {
        const app = res.data?.data
        setRefId(app?.referenceId ? `#${app.referenceId}` : `#OPP-${applicationId.slice(-8).toUpperCase()}`)
      })
      .catch(() => {
        setRefId(`#OPP-${applicationId.slice(-8).toUpperCase()}`)
      })
    return () => { if (copyTimer.current) clearTimeout(copyTimer.current) }
  }, [applicationId])

  const copy = () => {
    try { navigator.clipboard.writeText(refId) } catch {}
    setCopied(true)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), 1500)
  }

  const isA = catA
  const accent    = isA ? AP.green   : AP.amber
  const accentBg  = isA ? 'rgba(5,150,105,0.08)'   : 'rgba(212,132,58,0.08)'
  const accentBd  = isA ? '1px solid rgba(5,150,105,0.20)' : '1px solid rgba(212,132,58,0.25)'
  const ringColor = isA ? 'rgba(5,150,105,0.20)'   : 'rgba(212,132,58,0.20)'
  const heading   = isA ? 'Application submitted.' : 'Application received.'
  const subtitle  = isA
    ? 'The OppDate team will begin processing your application shortly.'
    : 'The OppDate team will prepare your complete application package. We will guide you through the final submission step when everything is ready.'
  const noteText  = isA
    ? 'OppDate will submit this application on your behalf.'
    : 'You will complete the final submission step with the institution.'

  // Vertical timeline: stages 1 & 2 are done/active on load
  const CUR = 2
  const timeline = AP2_STAGES.map((label, idx) => {
    const n = idx + 1
    const kind: 'done' | 'active' | 'pending' = n < CUR ? 'done' : n === CUR ? 'active' : 'pending'
    const isLast = n === AP2_STAGES.length
    return (
      <div key={n} style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
        {/* dot + connector */}
        <div style={{ width: 12, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
          {kind === 'done' && (
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: AP.ginger, flexShrink: 0 }} />
          )}
          {kind === 'active' && (
            <span style={{ position: 'relative', width: 12, height: 12, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(122,45,5,0.25)', animation: 'ap2Pulse 2s ease-in-out infinite' }} />
              <span style={{ position: 'relative', width: 7, height: 7, borderRadius: '50%', background: AP.ginger }} />
            </span>
          )}
          {kind === 'pending' && (
            <span style={{ width: 10, height: 10, borderRadius: '50%', boxSizing: 'border-box', background: 'transparent', border: '2px solid rgba(122,45,5,0.20)', flexShrink: 0 }} />
          )}
          {!isLast && (
            <span style={{
              marginTop: 3, marginBottom: -3, flex: 1,
              ...(kind === 'done'
                ? { width: 2, background: AP.ginger }
                : { width: 0, borderLeft: '2px dashed rgba(122,45,5,0.12)' })
            }} />
          )}
        </div>
        {/* label + timestamp */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, paddingBottom: isLast ? 0 : 18 }}>
          <span style={{
            fontFamily: AP.sans, fontSize: 13, lineHeight: '16px', whiteSpace: 'nowrap',
            fontWeight: kind === 'pending' ? 400 : 500,
            color: kind === 'active' ? AP.ginger : kind === 'pending' ? AP.helper : AP.ink,
          }}>{label}</span>
          {kind === 'done' && (
            <span style={{ fontFamily: AP.sans, fontSize: 12, color: AP.helper, whiteSpace: 'nowrap' }}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    )
  })

  return (
    <div>
      <style>{`@keyframes ap2Pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.5; } }`}</style>

      {/* Success banner */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: accentBg, border: accentBd, borderRadius: 20, padding: '28px 24px' }}>
        <span style={{ position: 'relative', width: 48, height: 48, display: 'inline-flex' }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: ringColor, animation: 'ap2Ring 1.5s ease-out 1 forwards' }} />
          <span style={{ position: 'relative', width: 48, height: 48, borderRadius: '50%', background: accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={26} style={{ color: '#fff', strokeWidth: 2.5 }} />
          </span>
        </span>
        <style>{`@keyframes ap2Ring { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(1.4); opacity: 0; } }`}</style>
        <div style={{ fontFamily: AP.serif, fontSize: 22, fontWeight: 600, color: accent, marginTop: 16, lineHeight: 1.2 }}>{heading}</div>
        <div style={{ fontFamily: AP.sans, fontSize: 14, color: AP.sec, marginTop: 8, marginBottom: 8, lineHeight: 1.5, maxWidth: 320 }}>{subtitle}</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          {isA ? <ShieldCheck size={14} style={{ color: accent, flexShrink: 0 }} /> : <Users size={14} style={{ color: accent, flexShrink: 0 }} />}
          <span style={{ fontFamily: AP.sans, fontSize: 12, fontWeight: 500, color: accent, lineHeight: 1.4 }}>{noteText}</span>
        </div>
        {/* Reference pill */}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '6px 14px', borderRadius: 999, background: 'rgba(122,45,5,0.06)', border: '1px solid rgba(122,45,5,0.15)' }}>
          <CreditCard size={13} style={{ color: AP.helper, flexShrink: 0 }} />
          <span style={{ fontFamily: AP.sans, fontSize: 12, fontWeight: 600, color: AP.ink, whiteSpace: 'nowrap' }}>Reference {refId || '...'}</span>
          <button onClick={copy} aria-label="Copy reference" style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', color: AP.helper }}>
            <Copy size={13} />
            {copied && <span style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: AP.ink, color: '#FAF7F4', borderRadius: 6, padding: '4px 8px', fontFamily: AP.sans, fontSize: 11, whiteSpace: 'nowrap', pointerEvents: 'none' }}>Copied!</span>}
          </button>
        </span>
      </div>

      {/* Timeline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 16 }}>
        <Info size={16} style={{ color: AP.ink, flexShrink: 0 }} />
        <span style={{ fontFamily: AP.sans, fontSize: 14, fontWeight: 600, color: AP.ink }}>Application progress</span>
      </div>
      {timeline}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 16 }}>
        <Info size={13} style={{ color: AP.helper, flexShrink: 0 }} />
        <span style={{ fontFamily: AP.sans, fontSize: 12, color: AP.helper }}>You'll receive an email and in-app notification at each stage.</span>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(122,45,5,0.08)', margin: '24px 0' }} />

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={() => router.push('/messages')}
          style={{ width: '100%', boxSizing: 'border-box', padding: '16px 20px', borderRadius: 12, background: '#FAF7F4', border: `1px solid ${AP.hairline}`, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, transition: 'background 130ms' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F5EFE9')}
          onMouseLeave={e => (e.currentTarget.style.background = '#FAF7F4')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <MessageCircle size={16} style={{ color: AP.ginger, flexShrink: 0 }} />
            <span style={{ fontFamily: AP.sans, fontSize: 14, fontWeight: 600, color: AP.ink }}>Message the OppDate team</span>
          </span>
          <ArrowRight size={16} style={{ color: AP.ginger, flexShrink: 0 }} />
        </button>
        <OutlineButton full onClick={() => router.push('/applications')}>
          <span style={{ fontFamily: AP.sans, fontSize: 14 }}>View all my applications</span>
          <ArrowRight size={15} style={{ color: AP.helper }} />
        </OutlineButton>
        <OutlineButton full onClick={() => router.push('/opportunities')}>
          <span style={{ fontFamily: AP.sans, fontSize: 14 }}>Browse more opportunities</span>
          <ArrowRight size={15} style={{ color: AP.helper }} />
        </OutlineButton>
      </div>

      {/* Discovery strip */}
      <div style={{ marginTop: 28 }}>
        <div style={{ borderTop: `1px solid ${AP.hairline}`, paddingTop: 16, marginBottom: 12 }}>
          <span style={{ fontFamily: AP.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: AP.helper }}>Explore more with OppDate</span>
        </div>
        <div style={{ background: '#FAF7F4', border: `1px solid ${AP.hairline}`, borderRadius: 16, padding: '6px 24px', boxSizing: 'border-box' }}>
          {[
            { Icon: CalendarDays, text: 'Get expert guidance on your next application', link: 'Book a consultation', href: '/consultations' },
            { Icon: Users,        text: 'Work with a mentor over weeks or months',      link: 'Explore mentorship',  href: '/mentorship' },
            { Icon: BookOpen,     text: 'Strengthen your applications with our resources', link: 'Browse eBooks',   href: '/ebooks' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '0 -24px', padding: '14px 24px', borderTop: i === 0 ? 'none' : `1px solid rgba(216,204,196,0.5)`, transition: 'background 130ms' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(122,45,5,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', color: AP.ginger, borderLeft: `2px solid ${AP.ginger}`, paddingLeft: 12, flexShrink: 0 }}>
                <r.Icon size={18} />
              </span>
              <span style={{ flex: 1, minWidth: 0, fontFamily: AP.sans, fontSize: 13, color: AP.ink }}>{r.text}</span>
              <button onClick={() => router.push(r.href)} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: AP.sans, fontSize: 13, fontWeight: 500, color: AP.ginger, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {r.link} <ArrowRight size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function ApplyPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const opportunityId = searchParams.get('opportunity')

  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const [startData, setStartData] = useState<StartData | null>(null)
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [eligibilityResponses, setEligibilityResponses] = useState<any[]>([])
  const [readiness, setReadiness] = useState<ReadinessMap>({})
  const [userDocs, setUserDocs] = useState<UserDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!opportunityId) { router.replace('/opportunities'); return }
    Promise.all([
      api.post('/api/v1/applications/start', { opportunityId }),
      api.get('/api/v1/documents'),
    ])
      .then(([startRes, docsRes]) => {
        const data = startRes.data?.data
        setStartData(data)
        setUserDocs(docsRes.data?.data ?? [])
        if (data?.resumed && data.applicationId) {
          setApplicationId(data.applicationId)
          if (data.status === 'document_collection') setStep(2)
          else if (data.status === 'awaiting_payment') setStep(3)
          else if (data.status === 'payment_confirmed' || data.status === 'submitted') setDone(true)
        }
      })
      .catch(e => {
        if (e?.response?.status === 401) {
          router.replace(`/auth/login?next=/apply?opportunity=${opportunityId}`)
        } else {
          setError('Failed to start your application. Please try again.')
        }
      })
      .finally(() => setLoading(false))
  }, [opportunityId, router])

  const handleEligibilityDone = useCallback((responses: any[]) => {
    setEligibilityResponses(responses)
    setStep(1)
  }, [])

  const handleDocumentsDone = useCallback(async (slots: any[]) => {
    if (!startData || !opportunityId) return
    if (applicationId) { setStep(3); return }
    setSubmitting(true)
    try {
      const res = await api.post('/api/v1/applications/submit', {
        opportunityId,
        eligibilityResponses,
        documentSlots: slots,
      })
      const { applicationId: newId } = res.data?.data ?? {}
      if (!newId) throw new Error('No applicationId returned')
      setApplicationId(newId)
      setStep(3)
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to save your application. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [startData, opportunityId, applicationId, eligibilityResponses])

  if (loading) {
    return (
      <div style={{ width: '100%', maxWidth: 680, margin: '0 auto', padding: '20px 24px 80px', boxSizing: 'border-box' }}>
        <style>{`@keyframes apSkPulse{0%,100%{opacity:.45}50%{opacity:.9}} .ap-sk{animation:apSkPulse 1.4s ease-in-out infinite;background:rgba(122,45,5,0.08);border-radius:8px}`}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24, width: '100%', maxWidth: 480 }}>
          {[0,1,2,3].map((i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                {i > 0 && <div className="ap-sk" style={{ flex: 1, height: 2, borderRadius: 0 }} />}
                <div className="ap-sk" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                {i < 3 && <div className="ap-sk" style={{ flex: 1, height: 2, borderRadius: 0 }} />}
              </div>
              <div className="ap-sk" style={{ width: 52, height: 10 }} />
            </div>
          ))}
        </div>
        <div className="ap-sk" style={{ height: 20, width: 220, marginBottom: 16, borderRadius: 6 }} />
        <div style={{ borderRadius: 18, border: '1px solid rgba(122,45,5,0.08)', background: 'rgba(255,255,255,0.7)', padding: '32px 28px 28px' }}>
          <div className="ap-sk" style={{ height: 14, width: '40%', marginBottom: 20 }} />
          <div className="ap-sk" style={{ height: 24, width: '70%', marginBottom: 10 }} />
          <div className="ap-sk" style={{ height: 24, width: '55%', marginBottom: 28 }} />
          {[0,1,2].map(i => (
            <div key={i} className="ap-sk" style={{ height: 52, borderRadius: 12, marginBottom: 10 }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ maxWidth: 440, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ padding: '24px', borderRadius: 16, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.04)', marginBottom: 16 }}>
          <p style={{ fontFamily: AP.sans, fontSize: 14, color: AP.error, margin: 0 }}>{error}</p>
        </div>
        <button onClick={() => router.back()} style={{ fontFamily: AP.sans, fontSize: 14, color: AP.ginger, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Go back</button>
      </div>
    )
  }

  if (!startData) return null

  const title = startData.opportunityTitle ?? 'Opportunity'
  const serviceFee = startData.oppdateServiceFeeUsd ?? 0
  const institutionFee = startData.institutionFeeUsd ?? 0
  const requiredDocs = (startData.requiredDocuments ?? []) as RequiredDoc[]
  const eligCriteria = startData.eligibilityCriteria ?? []
  const catA = startData.complianceCategory === 'A'
  const catB = startData.complianceCategory === 'B'

  return (
    <div style={{ width: '100%', maxWidth: 680, margin: '0 auto', padding: 'clamp(12px, 4vw, 20px) clamp(12px, 4vw, 24px) 80px', boxSizing: 'border-box' }}>
      {/* step 0=Eligibility → stepper node 0, step 1=Readiness → node 1, step 2=Upload → node 1, step 3=Payment → node 2 */}
      <Stepper current={step === 0 ? 0 : step <= 2 ? 1 : 2} done={done} />

      <ContextStrip
        title={title}
        type={startData.opportunityType}
        institution={startData.opportunityInstitution}
        country={startData.opportunityCountry}
      />

      <div style={{ ...apCard, padding: 'clamp(20px, 5vw, 32px) clamp(16px, 4vw, 28px) clamp(20px, 4vw, 28px)', marginTop: 12 }}>
        {done ? (
          <SubmittedStepView applicationId={applicationId ?? ''} catA={catA} />
        ) : step === 0 ? (
          <EligibilityStepView
            criteria={eligCriteria}
            excludeOpportunityId={opportunityId ?? ''}
            opportunityTitle={title}
            opportunityType={startData.opportunityType ?? ''}
            onContinue={handleEligibilityDone}
          />
        ) : step === 1 ? (
          <ReadinessStepView
            requiredDocs={requiredDocs}
            readiness={readiness}
            onChange={(key, val) => setReadiness(prev => ({ ...prev, [key]: val }))}
            onContinue={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        ) : step === 2 ? (
          <DocumentsStepView
            requiredDocs={requiredDocs}
            userDocs={userDocs}
            readiness={readiness}
            onBack={() => setStep(1)}
            onContinue={handleDocumentsDone}
            submitting={submitting}
          />
        ) : (
          <PaymentStepView
            applicationId={applicationId ?? ''}
            title={title}
            institution={startData.opportunityInstitution}
            serviceFee={serviceFee}
            institutionFee={institutionFee}
            catA={catA}
            catB={catB}
            onBack={() => setStep(2)}
          />
        )}
      </div>
    </div>
  )
}
