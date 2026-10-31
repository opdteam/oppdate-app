'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { fireConfetti } from '@/lib/confetti'
import {
  X, Sparkles, ArrowRight, ArrowLeft, Clock, CheckCircle2,
  Hash, Copy, MessageCircle, ChevronRight, AlertTriangle,
  Check, Upload, FileText, Info, GraduationCap, Users, BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'
import { api } from '@/lib/api'
import type { OpportunityListItem } from '@/components/opportunities'
import type { ApiDocument } from '@/lib/queries'

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

// ---- types ----

export interface ApplicationConfirmation {
  referenceId: string
  paymentConfirmedAt: string
}

interface EligCriterion {
  question: string
  options: string[]
}

interface DocSlotMeta {
  type: string
  required: boolean
  formats: string[]
}

type DocReadiness = 'ready' | 'refinement' | 'create'

const OPPDATE_CREATABLE = new Set([
  'Personal Statement', 'Cover Letter', 'Research Proposal', 'Short Essay', 'CV / Resume', 'Statement of Purpose', 'Essays',
])

const DISCOVERY_ROWS = [
  { label: 'Get expert guidance on your next application', cta: 'Book a consultation', href: '/services/consultations', Icon: GraduationCap },
  { label: 'Work with a mentor over weeks or months', cta: 'Explore mentorship', href: '/services/mentorship', Icon: Users },
  { label: 'Strengthen your applications with our resources', cta: 'Browse eBooks', href: '/services/ebooks', Icon: BookOpen },
]

const COMPLIANCE_SUMMARY: Record<'A' | 'B', string> = {
  A: 'OppDate will prepare and submit this application entirely on your behalf. You will not need to take any further action after payment.',
  B: 'OppDate will prepare your complete application package. You will log in to the institution\'s portal to complete the final submission when your package is ready.',
}

const PIPELINE_STAGES = [
  { label: 'Payment Confirmed', color: '#0E7490' },
  { label: 'Application Assigned', color: '#D4843A' },
  { label: 'Documents Under Review', color: '#D4843A' },
  { label: 'Documents Verified', color: '#7A2D05' },
  { label: 'Preparing Submission', color: '#7A2D05' },
  { label: 'Submitted', color: '#059669' },
] as const

type StageState = 'completed' | 'active' | 'pending'

function pipelineState(stageIndex: number, activeStage: number): StageState {
  if (stageIndex < activeStage) return 'completed'
  if (stageIndex === activeStage) return 'active'
  return 'pending'
}

// ---- Step 1: Eligibility Screening ----

type EligPhase = 'questions' | 'eligible' | 'ineligible'

// A response is considered a flag if the user picked the last option on a
// Yes/No question (i.e. "No"), or the last option on any binary question.
// This is a simple heuristic -- the admin makes the final call post-payment.
function evaluateEligibility(criteria: EligCriterion[], answers: number[]): EligPhase {
  const flagged = answers.some((ansIdx, qIdx) => {
    const opts = criteria[qIdx]?.options ?? []
    if (opts.length === 2) return ansIdx === 1 // binary: last = "No"
    return false
  })
  return flagged ? 'ineligible' : 'eligible'
}

interface EligibilityStepProps {
  criteria: EligCriterion[]
  onPhaseChange: (phase: EligPhase) => void
  onAnswersChange: (answers: number[]) => void
  onProceedAnyway: () => void
  mob?: boolean
}

function EligibilityStep({ criteria, onPhaseChange, onAnswersChange, onProceedAnyway, mob = false }: EligibilityStepProps) {
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [phase, setPhase] = useState<EligPhase>('questions')
  const [slideDir, setSlideDir] = useState<'in' | 'out' | null>(null)
  const [transitioning, setTransitioning] = useState(false)
  const total = criteria.length

  const updatePhase = useCallback((p: EligPhase) => {
    setPhase(p)
    onPhaseChange(p)
  }, [onPhaseChange])

  const handleAnswer = (optIdx: number) => {
    if (transitioning) return
    const next = [...answers.slice(0, qIndex), optIdx]
    setAnswers(next)
    onAnswersChange(next)
    if (next.length < total) {
      setTransitioning(true)
      setSlideDir('out')
      setTimeout(() => {
        setQIndex(s => s + 1)
        setSlideDir('in')
        setTimeout(() => {
          setSlideDir(null)
          setTransitioning(false)
        }, 280)
      }, 200)
    } else {
      setTimeout(() => updatePhase(evaluateEligibility(criteria, next)), 300)
    }
  }

  const handleBack = () => {
    if (qIndex > 0 && !transitioning) {
      setTransitioning(true)
      setSlideDir('out')
      setTimeout(() => {
        setQIndex(q => q - 1)
        setSlideDir('in')
        setTimeout(() => {
          setSlideDir(null)
          setTransitioning(false)
        }, 280)
      }, 200)
    }
  }

  if (phase === 'ineligible') {
    if (mob) {
      return (
        <div className="flex flex-col items-center text-center" style={{ paddingTop: 32, animation: 'elig-scale-in 400ms cubic-bezier(0.34,1.56,0.64,1) both' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(212,132,58,0.15) 0%, rgba(212,132,58,0.06) 100%)',
            boxShadow: '0 0 0 8px rgba(212,132,58,0.06), 0 0 0 16px rgba(212,132,58,0.03)',
          }}>
            <AlertTriangle size={32} style={{ color: '#D4843A' }} />
          </div>
          <h3 style={{ margin: '20px 0 0', fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 22, color: '#7A5510', letterSpacing: '-0.01em' }}>
            You may not qualify
          </h3>
          <p style={{ margin: '8px 0 0', fontFamily: 'var(--font-sans)', fontSize: 13.5, lineHeight: 1.55, color: '#8C6A55', maxWidth: 300 }}>
            Based on your answers, you may not meet one or more criteria for this opportunity. You can still choose to proceed -- our specialist will review your application.
          </p>
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320 }}>
            <button onClick={onProceedAnyway} style={{
              padding: '12px 20px', borderRadius: 12, border: '1.5px solid #D4843A',
              background: 'rgba(212,132,58,0.08)', fontFamily: 'var(--font-sans)', fontSize: 14,
              fontWeight: 600, color: '#7A5510', cursor: 'pointer',
            }}>
              Proceed anyway
            </button>
            <button onClick={() => { setPhase('questions'); setQIndex(0); setAnswers([]); onAnswersChange([]); }} style={{
              padding: '10px 20px', borderRadius: 12, border: '1px solid rgba(216,204,196,0.6)',
              background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 14,
              fontWeight: 500, color: '#8C6A55', cursor: 'pointer',
            }}>
              Review my answers
            </button>
          </div>
        </div>
      )
    }
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'rgba(212,132,58,0.1)' }}>
          <AlertTriangle size={28} style={{ color: '#D4843A' }} />
        </div>
        <h3 className="m-0 font-display text-[20px] font-semibold text-ink">You may not qualify</h3>
        <p className="m-0 max-w-[340px] text-sm leading-relaxed text-muted">
          Based on your answers, you may not meet one or more criteria for this opportunity. You can still choose to proceed -- our specialist will review your application.
        </p>
        <div className="flex flex-col gap-2.5 w-full max-w-[300px]">
          <button onClick={onProceedAnyway} className="w-full rounded-xl border border-[rgba(212,132,58,0.5)] bg-[rgba(212,132,58,0.08)] px-5 py-3 font-sans text-[14px] font-semibold text-[#7A5510] transition-colors hover:bg-[rgba(212,132,58,0.14)] cursor-pointer">
            Proceed anyway
          </button>
          <button
            onClick={() => { setPhase('questions'); setQIndex(0); setAnswers([]); onAnswersChange([]); }}
            className="w-full rounded-xl border border-[var(--border)] bg-transparent px-5 py-2.5 font-sans text-[14px] font-medium text-muted transition-colors hover:text-ink cursor-pointer"
          >
            Review my answers
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'eligible') {
    if (mob) {
      return (
        <div className="flex flex-col items-center text-center" style={{ paddingTop: 32, animation: 'elig-scale-in 400ms cubic-bezier(0.34,1.56,0.64,1) both' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(5,150,105,0.15) 0%, rgba(5,150,105,0.06) 100%)',
            boxShadow: '0 0 0 8px rgba(5,150,105,0.06), 0 0 0 16px rgba(5,150,105,0.03)',
            animation: 'elig-ring-grow 600ms cubic-bezier(0.34,1.56,0.64,1) 200ms both',
          }}>
            <CheckCircle2 size={32} style={{ color: '#059669' }} />
          </div>
          <h3 style={{ margin: '20px 0 0', fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 22, color: '#059669', letterSpacing: '-0.01em' }}>
            You appear eligible
          </h3>
          <p style={{ margin: '8px 0 0', fontFamily: 'var(--font-sans)', fontSize: 13.5, lineHeight: 1.55, color: '#8C6A55', maxWidth: 300 }}>
            Our specialist will confirm your eligibility before submission.
          </p>
          <div style={{
            marginTop: 24, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999,
            background: 'rgba(5,150,105,0.08)', animation: 'elig-fade-up 400ms ease-out 500ms both',
          }}>
            <Check size={13} style={{ color: '#059669' }} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: '#059669' }}>
              {answers.length} of {total} questions answered
            </span>
          </div>
        </div>
      )
    }
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'rgba(5,150,105,0.1)' }}>
          <CheckCircle2 size={28} style={{ color: '#059669' }} />
        </div>
        <h3 className="m-0 font-display text-[20px] font-semibold text-ink">You appear eligible</h3>
        <p className="m-0 max-w-[340px] text-sm leading-relaxed text-muted">
          Our specialist will confirm your eligibility before submission.
        </p>
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'rgba(5,150,105,0.1)' }}>
          <CheckCircle2 size={28} style={{ color: '#059669' }} />
        </div>
        <h3 className="m-0 font-display text-[20px] font-semibold text-ink">Ready to proceed</h3>
        <p className="m-0 max-w-[340px] text-sm leading-relaxed text-muted">
          No eligibility screening is required for this opportunity.
        </p>
      </div>
    )
  }

  const currentQ = criteria[qIndex]
  if (!currentQ) return null

  if (mob) {
    const pct = answers.length / total
    const ringR = 19
    const ringC = 2 * Math.PI * ringR
    const ringOff = ringC * (1 - pct)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
              <svg width={44} height={44} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
                <circle cx={22} cy={22} r={ringR} fill="none" stroke="rgba(122,45,5,0.08)" strokeWidth={3} />
                <circle cx={22} cy={22} r={ringR} fill="none" stroke="#7A2D05" strokeWidth={3}
                  strokeDasharray={ringC} strokeDashoffset={ringOff} strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 500ms cubic-bezier(0.34,1.56,0.64,1)' }} />
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700, color: '#7A2D05',
              }}>
                {qIndex + 1}/{total}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--app-ink)' }}>Eligibility check</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#8C6A55', marginTop: 1 }}>About 2 minutes</div>
            </div>
          </div>
          {qIndex > 0 && (
            <button onClick={handleBack} style={{
              width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(216,204,196,0.6)',
              background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}>
              <ArrowLeft size={16} style={{ color: '#7A2D05' }} />
            </button>
          )}
        </div>

        <div key={`q-${qIndex}`} style={{
          animation: slideDir === 'in'
            ? 'elig-slide-in 280ms cubic-bezier(0.22,0.61,0.36,1) both'
            : slideDir === 'out' ? 'elig-slide-out 200ms ease-in both'
            : 'elig-fade-up 350ms ease-out both',
        }}>
          <p style={{ margin: '0 0 20px', fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600, lineHeight: 1.4, color: 'var(--app-ink)', letterSpacing: '-0.01em' }}>
            {currentQ.question}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {currentQ.options.map((opt, i) => {
              const selected = answers[qIndex] === i
              return (
                <button key={i} onClick={() => handleAnswer(i)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                  padding: '14px 16px', borderRadius: 14,
                  border: selected ? '1.5px solid #7A2D05' : '1px solid rgba(216,204,196,0.5)',
                  background: selected ? 'rgba(122,45,5,0.05)' : 'rgba(255,255,255,0.85)',
                  cursor: 'pointer', transition: 'all 180ms cubic-bezier(0.34,1.56,0.64,1)',
                  animation: `elig-opt-in 300ms ease-out ${80 + i * 60}ms both`,
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    border: selected ? '2px solid #7A2D05' : '2px solid rgba(176,160,152,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: selected ? '#7A2D05' : 'transparent',
                      transform: selected ? 'scale(1)' : 'scale(0)',
                      transition: 'all 200ms cubic-bezier(0.34,1.56,0.64,1)',
                    }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: selected ? 600 : 500, color: selected ? '#7A2D05' : 'var(--app-ink)' }}>
                    {opt}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 28 }}>
          {criteria.map((_, i) => (
            <div key={i} style={{
              width: i === qIndex ? 20 : 6, height: 6, borderRadius: 3,
              background: i < answers.length ? '#7A2D05' : i === qIndex ? 'rgba(122,45,5,0.4)' : 'rgba(122,45,5,0.12)',
              transition: 'all 300ms cubic-bezier(0.34,1.56,0.64,1)',
            }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-sans text-[12px] font-semibold text-ginger-dark">Question {qIndex + 1} of {total}</span>
          <span className="font-sans text-[11px] text-muted">{Math.round((answers.length / total) * 100)}%</span>
        </div>
        <div className="h-1 rounded-full bg-[#E8DDD4] overflow-hidden">
          <div className="h-full rounded-full bg-ginger-dark transition-all duration-300 ease-out" style={{ width: `${(answers.length / total) * 100}%` }} />
        </div>
      </div>

      <p className="m-0 font-sans text-[16px] font-medium leading-relaxed text-ink">{currentQ.question}</p>

      <div className="flex flex-col gap-2.5">
        {currentQ.options.map((opt, i) => {
          const selected = answers[qIndex] === i
          return (
            <button key={i} onClick={() => handleAnswer(i)} className={cn(
              'w-full rounded-xl border px-4 py-3 text-left font-sans text-[14px] font-medium text-ink transition-all duration-140 ease-out-soft',
              selected ? 'border-ginger-dark bg-[rgba(122,45,5,0.06)]' : 'border-[var(--border)] bg-white hover:border-[rgba(122,45,5,0.2)] hover:bg-[rgba(245,230,216,0.4)]'
            )}>
              {opt}
            </button>
          )
        })}
      </div>

      {qIndex > 0 && (
        <button onClick={handleBack} className="mt-1 inline-flex items-center gap-1.5 self-start font-sans text-[13px] font-medium text-muted transition-colors hover:text-ink">
          <ArrowLeft size={14} /> Previous question
        </button>
      )}
    </div>
  )
}

// ---- Step 2: Documents ----

interface DocumentsStepProps {
  docSlots: DocSlotMeta[]
  library: ApiDocument[]
  subStep: 'check' | 'upload'
  onReadinessChange: (r: Record<string, DocReadiness>) => void
  onSlotDocChange: (slotLabel: string, docId: string | null) => void
  onSlotMetaChange: (meta: Record<string, { fileName: string; progress: number; docId: string | null }>) => void
  onAllFilledChange: (filled: boolean) => void
  initialSlots?: Record<string, { fileName: string; progress: number; docId: string | null }>
  initialReadiness?: Record<string, DocReadiness>
  mob?: boolean
}

function DocumentsStep({ docSlots, library, subStep, onReadinessChange, onSlotDocChange, onSlotMetaChange, onAllFilledChange, initialSlots, initialReadiness, mob = false }: DocumentsStepProps) {
  const [readiness, setReadiness] = useState<Record<string, DocReadiness>>(() => {
    if (initialReadiness && Object.keys(initialReadiness).length > 0) return initialReadiness
    const init: Record<string, DocReadiness> = {}
    docSlots.forEach(d => { init[d.type] = 'ready' })
    return init
  })
  const [slots, setSlots] = useState<Record<string, { fileName: string | null; progress: number; docId: string | null }>>(initialSlots ?? {})
  const [libraryFor, setLibraryFor] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadingForRef = useRef<string | null>(null)

  const visibleSlots = docSlots.filter(d => {
    if (!OPPDATE_CREATABLE.has(d.type)) return true
    return readiness[d.type] !== 'create'
  })

  useEffect(() => {
    if (subStep !== 'upload') return
    const allFilled = visibleSlots.every(d => {
      const s = slots[d.type]
      return s && s.progress >= 100
    })
    onAllFilledChange(allFilled)
  }, [slots, visibleSlots, subStep, onAllFilledChange])

  useEffect(() => {
    onReadinessChange(readiness)
  }, [readiness, onReadinessChange])

  useEffect(() => {
    onSlotMetaChange(slots as Record<string, { fileName: string; progress: number; docId: string | null }>)
  }, [slots, onSlotMetaChange])

  const markFromLibrary = (slotType: string, fileName: string, docId: string) => {
    setSlots(prev => ({ ...prev, [slotType]: { fileName, progress: 100, docId } }))
    onSlotDocChange(slotType, docId)
    setLibraryFor(null)
  }

  const triggerUpload = (slotType: string) => {
    uploadingForRef.current = slotType
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const slotType = uploadingForRef.current
    if (!file || !slotType) return
    // Reset input so same file can be selected again if needed
    e.target.value = ''

    setSlots(prev => ({ ...prev, [slotType]: { fileName: file.name, progress: 0, docId: null } }))

    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', file.name)
    formData.append('type', slotType)

    try {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/v1/documents')
      const token = localStorage.getItem('oppdate_token')
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const pct = Math.round((ev.loaded / ev.total) * 100)
          setSlots(prev => ({ ...prev, [slotType]: { fileName: file.name, progress: pct, docId: null } }))
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const res = JSON.parse(xhr.responseText)
          const docId = res?.data?.id ?? null
          setSlots(prev => ({ ...prev, [slotType]: { fileName: file.name, progress: 100, docId } }))
          onSlotDocChange(slotType, docId)
        } else {
          setSlots(prev => { const n = { ...prev }; delete n[slotType]; return n })
        }
      }

      xhr.onerror = () => {
        setSlots(prev => { const n = { ...prev }; delete n[slotType]; return n })
      }

      xhr.send(formData)
    } catch {
      setSlots(prev => { const n = { ...prev }; delete n[slotType]; return n })
    }
  }

  const creatableSlots = docSlots.filter(d => OPPDATE_CREATABLE.has(d.type))
  const nonCreatableSlots = docSlots.filter(d => !OPPDATE_CREATABLE.has(d.type))

  if (subStep === 'check') {
    return (
      <div className={cn('flex flex-col', mob ? 'gap-4' : 'gap-[18px]')}>
        <div>
          <h3 className={cn('m-0 font-display font-semibold tracking-[-0.01em] text-ink', mob ? 'text-[19px]' : 'text-[22px]')}>
            Let&apos;s check what you have ready.
          </h3>
          <p className={cn('m-0 mt-1.5 leading-snug text-muted', mob ? 'text-[13px]' : 'text-sm')}>
            Tell us where each document stands so we know how to help.
          </p>
        </div>

        {creatableSlots.length > 0 && (
          <div className={cn('flex flex-col', mob ? 'gap-2.5' : 'gap-3')}>
            {creatableSlots.map(doc => {
              const cur = readiness[doc.type] || 'ready'
              const options: { key: DocReadiness; label: string }[] = [
                { key: 'ready', label: 'Ready to upload' },
                { key: 'refinement', label: 'Needs refinement' },
                { key: 'create', label: 'Create for me' },
              ]
              return (
                <div key={doc.type} className={cn('rounded-xl border border-[var(--border)] bg-white', mob ? 'p-3' : 'p-4')}>
                  <div className={cn('flex items-center gap-2', mob ? 'mb-2.5' : 'mb-3')}>
                    <FileText size={mob ? 14 : 16} className="shrink-0 text-ginger-dark" />
                    <span className={cn('font-sans font-semibold text-ink', mob ? 'text-[13px]' : 'text-[14px]')}>{doc.type}</span>
                  </div>
                  <div className={cn('flex', mob ? 'gap-1.5' : 'gap-2')}>
                    {options.map(opt => (
                      <button key={opt.key}
                        onClick={() => {
                          const n = { ...readiness, [doc.type]: opt.key }
                          setReadiness(n)
                        }}
                        className={cn(
                          'flex-1 rounded-lg border font-sans font-medium transition-all duration-140 ease-out-soft',
                          mob ? 'px-2 py-1.5 text-[11px]' : 'px-2.5 py-2 text-[12px]',
                          cur === opt.key ? 'border-ginger-dark bg-[rgba(122,45,5,0.06)] text-ginger-dark' : 'border-[var(--border)] bg-transparent text-ink-2 hover:border-[rgba(122,45,5,0.2)]'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {nonCreatableSlots.length > 0 && (
          <div className={cn('flex items-start gap-2.5 rounded-md border border-[rgba(14,116,144,0.3)] bg-[rgba(14,116,144,0.05)]', mob ? 'p-2.5' : 'p-3')}>
            <Info size={mob ? 14 : 15} className="mt-px shrink-0" style={{ color: '#0E7490' }} />
            <span className={cn('font-sans leading-snug', mob ? 'text-[12px]' : 'text-[13px]')} style={{ color: '#0E7490' }}>
              {nonCreatableSlots.map(d => d.type).join(', ')} will be collected on the next screen.
            </span>
          </div>
        )}

        {docSlots.length === 0 && (
          <div className={cn('flex items-start gap-2.5 rounded-md border border-[rgba(14,116,144,0.3)] bg-[rgba(14,116,144,0.05)]', mob ? 'p-2.5' : 'p-3')}>
            <Info size={mob ? 14 : 15} className="mt-px shrink-0" style={{ color: '#0E7490' }} />
            <span className={cn('font-sans leading-snug', mob ? 'text-[12px]' : 'text-[13px]')} style={{ color: '#0E7490' }}>
              No specific documents are required for this opportunity.
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col', mob ? 'gap-4' : 'gap-[18px]')}>
      <div>
        <h3 className={cn('m-0 font-display font-semibold tracking-[-0.01em] text-ink', mob ? 'text-[19px]' : 'text-[22px]')}>
          Upload your documents.
        </h3>
        <p className={cn('m-0 mt-1.5 leading-snug text-muted', mob ? 'text-[13px]' : 'text-sm')}>
          Fill every slot below. Pick from your credential library or upload a new file.
        </p>
      </div>

      <div className={cn('flex flex-col', mob ? 'gap-2.5' : 'gap-3')}>
        {visibleSlots.map(doc => {
          const isRefinement = OPPDATE_CREATABLE.has(doc.type) && readiness[doc.type] === 'refinement'
          const slot = slots[doc.type]
          const isDone = slot && slot.progress >= 100
          const isUploading = slot && slot.progress < 100

          return (
            <div key={doc.type} className={cn(
              'rounded-xl border', mob ? 'p-3' : 'p-4',
              isRefinement ? 'border-[rgba(212,132,58,0.4)]' : 'border-[var(--border)]',
              isDone ? 'bg-[rgba(5,150,105,0.04)]' : 'bg-white'
            )}>
              <div className={cn('flex items-center gap-2', mob ? 'mb-1.5' : 'mb-2')}>
                <FileText size={mob ? 14 : 16} className="shrink-0 text-ginger-dark" />
                <span className={cn('flex-1 font-sans font-semibold text-ink', mob ? 'text-[13px]' : 'text-[14px]')}>{doc.type}</span>
                {isRefinement && (
                  <span className={cn('shrink-0 rounded-full font-sans font-semibold', mob ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]')}
                    style={{ background: 'rgba(212,132,58,0.12)', color: '#D4843A' }}>
                    Refinement requested
                  </span>
                )}
              </div>

              {isDone ? (
                <div className="flex items-center gap-2">
                  <Check size={mob ? 13 : 14} style={{ color: '#059669' }} />
                  <span className={cn('font-sans text-ink-2', mob ? 'text-[12px]' : 'text-[13px]')}>{slot.fileName}</span>
                </div>
              ) : isUploading ? (
                <div>
                  <div className={cn('mb-1 font-sans text-muted', mob ? 'text-[11px]' : 'text-[12px]')}>{slot.fileName} - {Math.round(slot.progress)}%</div>
                  <div className="h-1.5 rounded-full bg-[#E8DDD4] overflow-hidden">
                    <div className="h-full rounded-full bg-ginger-dark transition-all duration-100 ease-linear" style={{ width: `${slot.progress}%` }} />
                  </div>
                </div>
              ) : (
                <div className={cn('flex', mob ? 'gap-1.5' : 'gap-2')}>
                  <button
                    onClick={() => setLibraryFor(doc.type)}
                    className={cn('flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--border)] font-sans font-medium text-ink-2 transition-colors hover:border-ginger-dark hover:text-ginger-dark', mob ? 'px-2.5 py-2 text-[12px]' : 'px-3 py-2.5 text-[13px]')}
                  >
                    <FileText size={mob ? 13 : 14} /> From library
                  </button>
                  <button
                    onClick={() => triggerUpload(doc.type)}
                    className={cn('flex flex-1 items-center justify-center gap-2 rounded-lg border border-ginger-dark font-sans font-semibold text-ginger-dark transition-colors hover:bg-[rgba(122,45,5,0.06)]', mob ? 'px-2.5 py-2 text-[12px]' : 'px-3 py-2.5 text-[13px]')}
                  >
                    <Upload size={mob ? 13 : 14} /> Upload new
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {libraryFor && (
        <>
          <div className="fixed inset-0 z-[130] bg-[rgba(28,28,28,0.32)]" onClick={() => setLibraryFor(null)} />
          <div className={cn(
            'fixed z-[140] border border-[var(--border)] bg-white shadow-xl',
            mob ? 'inset-x-0 bottom-0 rounded-t-2xl p-4 animate-[opp-sheet-up_280ms_var(--ease-out-soft)]'
                : 'left-1/2 top-1/2 w-[360px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-xl p-5'
          )}>
            {mob && <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[rgba(122,45,5,0.15)]" />}
            <div className="mb-1 flex items-center justify-between">
              <span className={cn('font-sans font-semibold text-ink', mob ? 'text-[14px]' : 'text-[15px]')}>Select from library</span>
              <button onClick={() => setLibraryFor(null)} className="p-1 text-muted hover:text-ink"><X size={mob ? 16 : 18} /></button>
            </div>
            <div className={cn('mb-3 font-sans text-muted', mob ? 'text-[11px]' : 'text-[12px]')}>For: {libraryFor}</div>
            {library.length === 0 ? (
              <div className="py-4 text-center font-sans text-[13px] text-muted">No documents in your library yet.</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {library.map(item => (
                  <button key={item.id}
                    onClick={() => markFromLibrary(libraryFor!, item.name, item.id)}
                    className={cn('flex w-full items-center gap-3 rounded-lg text-left transition-colors hover:bg-cream-2', mob ? 'px-2.5 py-2' : 'px-3 py-2.5')}
                  >
                    <FileText size={mob ? 14 : 16} className="shrink-0 text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate font-sans font-medium text-ink', mob ? 'text-[12px]' : 'text-[13px]')}>{item.name}</span>
                      <span className={cn('block font-sans text-muted', mob ? 'text-[10px]' : 'text-[11px]')}>{item.type}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

// ---- Step 3: Payment ----

interface PaymentStepProps {
  opportunity: OpportunityListItem
  authorized: boolean
  onAuthorizedChange: (v: boolean) => void
  mob?: boolean
}

function PaymentStep({ opportunity, authorized, onAuthorizedChange, mob = false }: PaymentStepProps) {
  const fee = opportunity.fee || { service: 'Contact us', institution: '-', total: 'Contact us' }
  const compliance = opportunity.compliance

  return (
    <div className={cn('flex flex-col', mob ? 'gap-4' : 'gap-[18px]')}>
      <div>
        <h3 className={cn('m-0 font-display font-semibold tracking-[-0.01em] text-ink', mob ? 'text-[19px]' : 'text-[22px]')}>
          Complete your payment.
        </h3>
        <p className={cn('m-0 mt-1.5 leading-snug text-muted', mob ? 'text-[13px]' : 'text-sm')}>
          Review the authorization agreement and confirm your payment below.
        </p>
      </div>

      <div className={cn('rounded-xl border border-[var(--border)] bg-white', mob ? 'p-4' : 'p-5')}>
        <div className={cn('mb-3 font-sans font-semibold uppercase tracking-[0.1em] text-muted', mob ? 'text-[10.5px]' : 'text-[11px]')}>
          Authorization Agreement
        </div>
        <p className={cn('m-0 mb-4 font-sans leading-relaxed text-ink-2', mob ? 'text-[12.5px]' : 'text-[13.5px]')}>
          {compliance && (compliance === 'A' || compliance === 'B')
            ? COMPLIANCE_SUMMARY[compliance]
            : 'OppDate will assist you in preparing your application materials for this opportunity.'}
        </p>
        <label className={cn('flex cursor-pointer items-start', mob ? 'gap-2.5' : 'gap-3')}>
          <input type="checkbox" checked={authorized} onChange={e => onAuthorizedChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border)] accent-ginger-dark" />
          <span className={cn('font-sans leading-snug text-ink', mob ? 'text-[12px]' : 'text-[13px]')}>
            I authorize OppDate to act as my application representative and prepare all required materials for {opportunity.title}.
          </span>
        </label>
      </div>

      <div className={cn(
        'rounded-lg border border-[var(--border)] bg-white flex flex-col gap-3 transition-opacity',
        mob ? 'p-4' : 'p-5',
        !authorized && 'opacity-50 pointer-events-none'
      )}>
        <div className={cn('flex justify-between', mob ? 'text-[13px]' : 'text-sm')}>
          <span className="text-ink-2">OppDate service fee</span>
          <span className="font-semibold text-ink">{fee.service}</span>
        </div>
        <div className={cn('flex justify-between', mob ? 'text-[13px]' : 'text-sm')}>
          <span className="text-ink-2">Institution application fee</span>
          <span className="font-semibold text-ink">{fee.institution}</span>
        </div>
        <div className="h-px bg-[var(--border)]" />
        <div className={cn('flex justify-between', mob ? 'text-[14px]' : 'text-[15px]')}>
          <span className="font-semibold text-ink">Total due</span>
          <span className="font-semibold text-ginger-dark">{fee.total} USD</span>
        </div>
      </div>

      <div className={cn('flex items-start gap-2.5 rounded-md border border-[#ecd49b] bg-warning-bg', mob ? 'p-2.5' : 'p-3')}>
        <Clock size={mob ? 14 : 16} className="mt-px shrink-0 text-warning" />
        <div className={cn('leading-snug text-[#7A5510]', mob ? 'text-[12px]' : 'text-[13px]')}>
          Applying for <strong>{opportunity.title}</strong>. You will be redirected to complete payment securely.
        </div>
      </div>
    </div>
  )
}

// ---- Step 4: Confirmation & Tracking ----

interface ConfirmStepProps {
  opportunity: OpportunityListItem
  confirmation: ApplicationConfirmation
  applicationId: string
  onClose: () => void
  mob?: boolean
}

function ConfirmStep({ opportunity, confirmation, applicationId, onClose, mob = false }: ConfirmStepProps) {
  const [copied, setCopied] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true
    const t = setTimeout(fireConfetti, 600)
    return () => clearTimeout(t)
  }, [])

  function copyRef() {
    navigator.clipboard.writeText(confirmation.referenceId).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleWithdraw() {
    setWithdrawing(true)
    try {
      await api.post(`/api/v1/applications/${applicationId}/withdraw`)
    } catch { /* best-effort */ }
    setWithdrawing(false)
    setShowWithdrawModal(false)
    onClose()
  }

  const activeStage = 1
  const railFillPct = Math.round((activeStage / (PIPELINE_STAGES.length - 1)) * 100)

  return (
    <div className={cn('flex flex-col', mob ? 'gap-5' : 'gap-6')}>
      <div className={cn('flex items-center gap-2 overflow-hidden', mob && 'flex-wrap')}>
        <span className={cn('inline-flex shrink-0 items-center rounded-full border font-sans font-medium capitalize', mob ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]')}
          style={{ borderColor: '#0E7490', color: '#0E7490' }}>
          {opportunity.type}
        </span>
        <span className={cn('min-w-0 truncate font-semibold text-ink', mob ? 'text-[13px]' : 'text-sm')}>{opportunity.title}</span>
        {!mob && <span className="ml-auto shrink-0 text-[12px] text-muted">{opportunity.org}</span>}
      </div>

      <div className={cn('rounded-xl border text-center', mob ? 'p-5' : 'p-6')} style={{
        background: 'linear-gradient(135deg, rgba(5,150,105,0.08) 0%, rgba(5,150,105,0.04) 100%)',
        borderColor: 'rgba(5,150,105,0.2)',
      }}>
        <div className="relative mb-3 inline-flex items-center justify-center">
          <div className="absolute rounded-full animate-[opp-ring_1.5s_ease-out_forwards]" style={{ inset: -8, border: '2px solid rgba(5,150,105,0.3)' }} />
          <div className={cn('relative inline-flex items-center justify-center rounded-full text-white', mob ? 'h-10 w-10' : 'h-12 w-12')} style={{ background: '#059669' }}>
            <CheckCircle2 size={mob ? 18 : 22} />
          </div>
        </div>
        <h3 className={cn('m-0 font-display font-semibold', mob ? 'text-[18px]' : 'text-[20px]')} style={{ color: '#059669' }}>
          Application submitted.
        </h3>
        <p className={cn('m-0 mt-1', mob ? 'text-[12px]' : 'text-[13px]')} style={{ color: '#4B8B72' }}>
          The OppDate team will begin processing your application shortly.
        </p>
        <div className={cn('flex flex-col items-center gap-1.5', mob ? 'mt-3' : 'mt-3.5')}>
          <button onClick={copyRef}
            className={cn('inline-flex items-center gap-2 rounded-full border transition-colors', mob ? 'px-3 py-1' : 'px-3.5 py-1.5')}
            style={{ background: 'rgba(122,45,5,0.06)', borderColor: 'rgba(122,45,5,0.15)' }}>
            <Hash size={mob ? 12 : 13} className="text-muted" />
            <span className={cn('font-sans font-semibold text-ink', mob ? 'text-[11px]' : 'text-[12px]')}>{confirmation.referenceId}</span>
            <Copy size={mob ? 12 : 13} className="text-muted" />
          </button>
          <span className={cn('font-sans transition-opacity duration-200', mob ? 'text-[10px]' : 'text-[11px]')}
            style={{ color: '#059669', opacity: copied ? 1 : 0 }}>
            Copied to clipboard
          </span>
        </div>
      </div>

      <div className={cn('rounded-xl border border-[var(--border)] bg-white', mob ? 'p-4' : 'p-5')}>
        <div className={cn('flex items-center gap-2', mob ? 'mb-3' : 'mb-4')}>
          <Clock size={mob ? 14 : 15} className="shrink-0 text-muted" />
          <span className={cn('font-sans font-semibold text-ink', mob ? 'text-[12px]' : 'text-[13px]')}>Application progress</span>
        </div>
        <div className="relative pl-5">
          <div className="absolute left-[9px] top-[6px] bottom-[6px] w-[2px] rounded-sm" style={{ background: 'rgba(122,45,5,0.12)' }}>
            <div className="absolute top-0 left-0 w-full rounded-sm transition-all duration-700 ease-out" style={{ background: '#7A2D05', height: `${railFillPct}%` }} />
          </div>
          {PIPELINE_STAGES.map((stage, i) => {
            const state = pipelineState(i, activeStage)
            return (
              <div key={stage.label} className={cn('relative flex items-center gap-2.5 last:mb-0', mob ? 'mb-3' : 'mb-3.5')}>
                <div className={cn('relative z-10 shrink-0 rounded-full -ml-5', mob ? 'h-3.5 w-3.5' : 'h-4 w-4')}
                  style={
                    state === 'completed' ? { background: '#7A2D05', border: '2px solid #7A2D05' }
                    : state === 'active' ? { background: stage.color, border: `3px solid ${stage.color}33`, animation: 'opp-pulse 2s ease-in-out infinite' }
                    : { border: '2px solid rgba(122,45,5,0.2)', background: 'transparent' }
                  }
                />
                <span className={cn('flex-1 font-sans font-medium', mob ? 'text-[12px]' : 'text-[13px]',
                  state === 'completed' && 'text-ink', state === 'pending' && 'text-muted')}
                  style={state === 'active' ? { color: stage.color, fontWeight: 600 } : undefined}>
                  {stage.label}
                </span>
                {state === 'completed' && i === 0 && (
                  <span className={cn('shrink-0 font-sans text-muted', mob ? 'text-[10px]' : 'text-[11px]')}>
                    {new Date(confirmation.paymentConfirmedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <p className={cn('mt-3 text-center font-sans text-muted', mob ? 'text-[11px]' : 'text-[12px]')}>
          You&apos;ll receive an email and in-app notification at each stage.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <a href="/messages"
          className={cn('flex w-full items-center gap-3 rounded-xl border border-[var(--border)] text-left no-underline transition-colors', mob ? 'px-3 py-3' : 'px-4 py-3.5')}
          style={{ background: 'var(--surface-warm)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#F0EAE4')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-warm)')}>
          <MessageCircle size={mob ? 16 : 18} style={{ color: 'var(--color-primary)' }} className="shrink-0" />
          <span className={cn('flex-1 font-sans font-semibold text-ink', mob ? 'text-[13px]' : 'text-[14px]')}>Message the OppDate team</span>
          <ChevronRight size={mob ? 14 : 16} className="shrink-0 text-muted" />
        </a>
        <a href="/applications" className="flex w-full items-center justify-between border-b border-[rgba(216,204,196,0.4)] px-1 py-2.5 text-left no-underline transition-colors hover:text-ink">
          <span className={cn('font-sans text-ink-2', mob ? 'text-[13px]' : 'text-[14px]')}>View all my applications</span>
          <ChevronRight size={mob ? 13 : 14} className="shrink-0 text-muted" />
        </a>
        <a href="/opportunities" className="flex w-full items-center justify-between border-b border-[rgba(216,204,196,0.4)] px-1 py-2.5 text-left no-underline transition-colors hover:text-ink">
          <span className={cn('font-sans text-ink-2', mob ? 'text-[13px]' : 'text-[14px]')}>Browse more opportunities</span>
          <ChevronRight size={mob ? 13 : 14} className="shrink-0 text-muted" />
        </a>
      </div>

      <div>
        <div className={cn('mb-3 font-sans font-semibold uppercase tracking-[0.1em] text-muted', mob ? 'text-[10.5px]' : 'text-[11px]')}>
          Explore more from OppDate
        </div>
        <div className="flex flex-col gap-1">
          {DISCOVERY_ROWS.map((row, i) => (
            <a key={i} href={row.href}
              className={cn('flex items-center gap-3 rounded-lg no-underline transition-colors hover:bg-cream-2', mob ? 'px-2.5 py-2' : 'px-3 py-2.5')}>
              <row.Icon size={mob ? 14 : 16} className="shrink-0 text-ginger-dark" />
              <span className={cn('flex-1 min-w-0 font-sans text-ink-2', mob ? 'text-[12px]' : 'text-[13px]')}>{row.label}</span>
              {!mob && <span className="shrink-0 font-sans text-[12px] font-medium text-ginger-dark">{row.cta}</span>}
              <ChevronRight size={mob ? 12 : 13} className="shrink-0 text-muted" />
            </a>
          ))}
        </div>
      </div>

      <button onClick={() => setShowWithdrawModal(true)}
        className={cn('self-start font-sans text-muted underline-offset-2 hover:text-ink hover:underline', mob ? 'text-[12px]' : 'text-[13px]')}>
        Withdraw this application
      </button>

      {showWithdrawModal && (
        <>
          <div className="fixed inset-0 z-[110] bg-[rgba(28,28,28,0.48)]" />
          <div className="fixed left-1/2 top-1/2 z-[120] w-[360px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--border)] bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-start gap-3">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-warning" />
              <div>
                <div className="font-sans text-[15px] font-semibold text-ink">Withdraw application?</div>
                <p className="m-0 mt-1.5 text-[13px] leading-snug text-ink-2">
                  This will cancel your application for <strong>{opportunity.title}</strong>. This action cannot be undone. No refund will be issued.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2.5">
              <Button variant="ghost" size="sm" onClick={() => setShowWithdrawModal(false)}>Keep application</Button>
              <Button variant="primary" size="sm" onClick={handleWithdraw} disabled={withdrawing}>
                {withdrawing ? 'Withdrawing...' : 'Yes, withdraw'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ---- Drawer ----

const STEPS = ['Eligibility', 'Documents', 'Payment', 'Received'] as const
type StepIndex = 0 | 1 | 2 | 3

interface StartResult {
  eligibilityCriteria: EligCriterion[]
  requiredDocuments: DocSlotMeta[]
}

interface ApplySession {
  step: StepIndex
  docSubStep: 'check' | 'upload'
  eligAnswers: number[]
  eligPhase: EligPhase
  docReadiness: Record<string, DocReadiness>
  slotDocs: Record<string, string | null>
  slotMeta: Record<string, { fileName: string; progress: number; docId: string | null }>
  authorized: boolean
}

function sessionKey(opportunityId: string) {
  return `oppdate_apply_session_${opportunityId}`
}

function loadSession(opportunityId: string): ApplySession | null {
  try {
    const raw = localStorage.getItem(sessionKey(opportunityId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSession(opportunityId: string, session: ApplySession) {
  try {
    localStorage.setItem(sessionKey(opportunityId), JSON.stringify(session))
  } catch { /* storage full - best effort */ }
}

function clearSession(opportunityId: string) {
  try {
    localStorage.removeItem(sessionKey(opportunityId))
  } catch { /* ignore */ }
}

export interface ApplyForMeDrawerProps {
  open: boolean
  opportunity: OpportunityListItem | null
  library: ApiDocument[]
  onClose: () => void
  onSelectAlternative?: (id: string) => void
}

export function ApplyForMeDrawer({ open, opportunity, library, onClose, onSelectAlternative: _onSelectAlternative }: ApplyForMeDrawerProps) {
  const mob = useIsMobile()
  const [step, setStep] = useState<StepIndex>(0)
  const [docSubStep, setDocSubStep] = useState<'check' | 'upload'>('check')
  const [allDocsFilled, setAllDocsFilled] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [startResult, setStartResult] = useState<StartResult | null>(null)
  const [starting, setStarting] = useState(false)
  const [eligAnswers, setEligAnswers] = useState<number[]>([])
  const [eligPhase, setEligPhase] = useState<EligPhase>('questions')
  const [docReadiness, setDocReadiness] = useState<Record<string, DocReadiness>>({})
  const [slotDocs, setSlotDocs] = useState<Record<string, string | null>>({})
  const [slotMeta, setSlotMeta] = useState<Record<string, { fileName: string; progress: number; docId: string | null }>>({})
  const [confirmation, setConfirmation] = useState<ApplicationConfirmation | null>(null)
  const [submittedAppId, setSubmittedAppId] = useState<string>('')
  const opportunityIdRef = useRef<string | null>(null)

  // Persist session to localStorage whenever flow state changes
  useEffect(() => {
    if (!opportunity || step === 3) return
    saveSession(opportunity.id, { step, docSubStep, eligAnswers, eligPhase, docReadiness, slotDocs, slotMeta, authorized })
  }, [step, docSubStep, eligAnswers, eligPhase, docReadiness, slotDocs, slotMeta, authorized, opportunity])

  // Clear session on unmount if not yet submitted (tab close / route navigate away)
  useEffect(() => {
    return () => {
      if (opportunityIdRef.current && step < 3) {
        clearSession(opportunityIdRef.current)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch opportunity data and restore session on drawer open
  useEffect(() => {
    if (!open || !opportunity) return
    opportunityIdRef.current = opportunity.id

    const saved = loadSession(opportunity.id)
    if (saved) {
      // Restore all step state from localStorage
      setStep(saved.step)
      setDocSubStep(saved.docSubStep)
      setEligAnswers(saved.eligAnswers)
      setEligPhase(saved.eligPhase)
      setDocReadiness(saved.docReadiness)
      setSlotDocs(saved.slotDocs)
      setSlotMeta(saved.slotMeta ?? {})
      setAuthorized(saved.authorized)
    } else {
      setStep(0)
      setDocSubStep('check')
      setAllDocsFilled(false)
      setAuthorized(false)
      setEligAnswers([])
      setDocReadiness({})
      setSlotDocs({})
      setSlotMeta({})
      setEligPhase('questions')
    }

    setError(null)
    setConfirmation(null)
    setStartResult(null)
    setStarting(true)

    api.post('/api/v1/applications/start', { opportunityId: opportunity.id })
      .then(res => {
        const d = res.data?.data
        setStartResult({
          eligibilityCriteria: Array.isArray(d.eligibilityCriteria) ? d.eligibilityCriteria : [],
          requiredDocuments: Array.isArray(d.requiredDocuments) ? d.requiredDocuments : [],
        })
      })
      .catch(() => setError('Failed to load application details. Please try again.'))
      .finally(() => setStarting(false))
  }, [open, opportunity?.id])

  if (!open || !opportunity) return null

  const opp = opportunity
  const criteria: EligCriterion[] = startResult?.eligibilityCriteria ?? []
  const docSlots: DocSlotMeta[] = startResult?.requiredDocuments ?? []
  const hasEligibility = criteria.length > 0
  const isSubmitted = step === 3

  const showFooter = (() => {
    if (starting || error) return false
    if (step === 3) return false
    if (step === 0 && hasEligibility && (eligAnswers.length < criteria.length || eligPhase === 'ineligible')) return false
    return true
  })()

  const canGoBack = step === 1 || step === 2

  const advanceEnabled = (() => {
    if (step === 0) return !hasEligibility || eligPhase === 'eligible'
    if (step === 1 && docSubStep === 'check') return true
    if (step === 1 && docSubStep === 'upload') return allDocsFilled || docSlots.length === 0
    if (step === 2) return authorized && !submitting
    return false
  })()

  function advanceLabel(): string {
    if (submitting) return 'Processing...'
    if (step === 0) return 'Continue to documents'
    if (step === 1 && docSubStep === 'check') return 'Continue'
    if (step === 1 && docSubStep === 'upload') return 'Proceed to payment'
    return 'Confirm and pay'
  }

  function footerHint(): string {
    if (step === 1 && docSubStep === 'check') return 'Defaults to "Ready to upload" - adjust anything that needs work.'
    if (step === 1 && docSubStep === 'upload') return docSlots.length === 0 ? '' : 'All visible document slots must be filled before proceeding.'
    if (step === 2) return 'All fees are in USD. You will not be charged until you confirm.'
    return ''
  }

  function handleBack() {
    if (step === 1 && docSubStep === 'upload') {
      setDocSubStep('check')
    } else if (step === 1 && docSubStep === 'check') {
      setStep(0)
    } else if (step === 2) {
      setStep(1)
      setDocSubStep('upload')
    }
  }

  function handleClose() {
    clearSession(opp.id)
    onClose()
  }

  async function handleAdvance() {
    setError(null)

    if (step === 0) {
      setStep(1)
    } else if (step === 1 && docSubStep === 'check') {
      setDocSubStep('upload')
    } else if (step === 1 && docSubStep === 'upload') {
      setStep(2)
    } else if (step === 2) {
      // Create the application record then initiate payment
      setSubmitting(true)
      try {
        const documentSlots = docSlots
          .filter(d => !(OPPDATE_CREATABLE.has(d.type) && docReadiness[d.type] === 'create'))
          .map(d => ({
            slotLabel: d.type,
            documentType: d.type,
            readinessStatus: docReadiness[d.type] === 'refinement' ? 'needs_refinement'
              : docReadiness[d.type] === 'create' ? 'needs_creation'
              : 'ready',
            documentId: slotDocs[d.type] ?? undefined,
          }))

        const eligibilityResponses = eligAnswers.map((answerIdx, qIdx) => ({
          questionIndex: qIdx,
          question: criteria[qIdx]?.question,
          answer: criteria[qIdx]?.options[answerIdx],
          selectedOptionIndex: answerIdx,
        }))

        const submitRes = await api.post('/api/v1/applications/submit', {
          opportunityId: opp.id,
          eligibilityResponses,
          documentSlots,
        })

        const applicationId = submitRes.data?.data?.applicationId
        if (!applicationId) throw new Error('No application ID returned')

        const res = await api.post('/api/v1/payments/checkout', {
          purpose: 'oppdate_apply',
          gateway: 'stripe',
          referenceId: applicationId,
        })

        const checkoutUrl = res.data?.data?.checkoutUrl
        if (checkoutUrl) {
          clearSession(opp.id)
          window.location.href = checkoutUrl
        } else {
          // Free opportunity - go straight to confirmation
          clearSession(opp.id)
          setSubmittedAppId(applicationId)
          setConfirmation({
            referenceId: res.data?.data?.referenceId || applicationId.slice(-8).toUpperCase(),
            paymentConfirmedAt: new Date().toISOString(),
          })
          setStep(3)
        }
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        setError(msg || 'Something went wrong. Please try again.')
      } finally {
        setSubmitting(false)
      }
    }
  }

  const stepperIndex = step

  return (
    <>
      <div
        onClick={step < 3 ? handleClose : undefined}
        className="fixed inset-0 z-[90] bg-[rgba(28,28,28,0.32)] backdrop-blur-sm animate-[opp-fade_220ms_var(--ease-out-soft)]"
      />

      <aside className={cn(
        'fixed bottom-0 right-0 top-0 z-[100] flex flex-col border-l border-[var(--border)] bg-cream shadow-lg animate-[opp-slide-in_280ms_var(--ease-out-soft)]',
        mob ? 'w-full' : 'w-[520px] max-w-[92vw]'
      )}>

        <header className={cn('flex items-center gap-2.5 border-b border-[var(--border)]', mob ? 'px-4 py-4' : 'px-6 py-5')}>
          <div className={cn('inline-flex shrink-0 items-center justify-center rounded-md text-white', mob ? 'h-8 w-8' : 'h-9 w-9')}
            style={{ background: 'var(--opp-grad-ginger)' }}>
            <Sparkles size={mob ? 16 : 18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className={cn('font-sans font-semibold uppercase tracking-[0.14em] text-ginger-dark', mob ? 'text-[10px]' : 'text-[11px]')}>
              OppDate Apply
            </div>
            <div className={cn('truncate font-display font-semibold tracking-[-0.01em] text-ink', mob ? 'text-[15px]' : 'text-lg')}>
              {opportunity.title}
            </div>
          </div>
          {!isSubmitted && (
            <button onClick={handleClose} className="inline-flex p-1.5 text-muted transition-colors hover:text-ink" aria-label="Close">
              <X size={mob ? 18 : 20} />
            </button>
          )}
        </header>

        {!isSubmitted && (
          <div className={cn('flex items-center gap-2 border-b border-[var(--border)]', mob ? 'px-4 py-3' : 'px-6 py-3.5')}>
            {STEPS.map((label, i) => (
              <div key={label} className="contents">
                <div className={cn('flex items-center gap-2 text-xs font-medium',
                  i <= stepperIndex ? 'text-ginger-dark' : 'text-muted',
                  i === stepperIndex && 'font-semibold'
                )}>
                  <span className={cn(
                    'inline-flex items-center justify-center rounded-full font-mono font-semibold border-[1.5px]',
                    mob ? 'h-5 w-5 text-[10px]' : 'h-[22px] w-[22px] text-[11px]',
                    i < stepperIndex ? 'border-ginger-dark bg-ginger-dark text-white'
                    : i === stepperIndex ? 'border-ginger-dark bg-white text-ginger-dark'
                    : 'border-[var(--border-strong)] bg-transparent text-muted'
                  )}>
                    {i < stepperIndex ? <CheckCircle2 size={mob ? 10 : 12} /> : i + 1}
                  </span>
                  {!mob && label}
                </div>
                {i < STEPS.length - 1 && <div className="h-px flex-1 bg-[var(--border)]" />}
              </div>
            ))}
          </div>
        )}

        <div className={cn('flex-1 overflow-y-auto', mob ? 'px-4 py-5' : 'px-7 py-6')}>
          {starting && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgba(122,45,5,0.15)] border-t-ginger-dark" />
              <span className="font-sans text-[13px] text-muted">Starting your application...</span>
            </div>
          )}

          {!starting && error && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <AlertTriangle size={28} style={{ color: '#D4843A' }} />
              <p className="m-0 font-sans text-[14px] text-ink">{error}</p>
              <Button variant="ghost" size="sm" onClick={() => setError(null)}>Try again</Button>
            </div>
          )}

          {!starting && !error && step === 0 && (
            <EligibilityStep
              criteria={criteria}
              onPhaseChange={setEligPhase}
              onAnswersChange={setEligAnswers}
              onProceedAnyway={handleAdvance}
              mob={mob}
            />
          )}
          {!starting && !error && step === 1 && startResult && (
            <DocumentsStep
              docSlots={docSlots}
              library={library}
              subStep={docSubStep}
              onReadinessChange={setDocReadiness}
              onSlotDocChange={(slotLabel, docId) => {
                setSlotDocs(prev => ({ ...prev, [slotLabel]: docId }))
              }}
              onSlotMetaChange={setSlotMeta}
              onAllFilledChange={setAllDocsFilled}
              initialSlots={slotMeta}
              initialReadiness={docReadiness}
              mob={mob}
            />
          )}
          {!starting && !error && step === 2 && (
            <PaymentStep
              opportunity={opportunity}
              authorized={authorized}
              onAuthorizedChange={setAuthorized}
              mob={mob}
            />
          )}
          {!starting && !error && step === 3 && confirmation && (
            <ConfirmStep
              opportunity={opp}
              confirmation={confirmation}
              applicationId={submittedAppId}
              onClose={onClose}
              mob={mob}
            />
          )}
        </div>

        {showFooter && (
          <footer className={cn('border-t border-[var(--border)] bg-white', mob ? 'px-4 py-3' : 'px-6 py-4')}>
            {error && (
              <div className="mb-2 font-sans text-[12px] text-red-600">{error}</div>
            )}
            {mob && footerHint() && (
              <div className="mb-2.5 text-[11px] leading-snug text-muted">{footerHint()}</div>
            )}
            <div className={cn('flex items-center gap-2.5', mob && 'justify-between')}>
              {!mob && <div className="flex-1 text-xs text-muted">{footerHint()}</div>}
              {canGoBack && (
                <Button variant="ghost" size="sm" onClick={handleBack} disabled={submitting}>Back</Button>
              )}
              <Button
                variant="primary"
                iconTrailing={submitting ? undefined : <ArrowRight size={mob ? 14 : 16} />}
                onClick={handleAdvance}
                disabled={!advanceEnabled}
                className={mob ? 'flex-1' : undefined}
              >
                {advanceLabel()}
              </Button>
            </div>
          </footer>
        )}
      </aside>

      <style>{`
        @keyframes opp-slide-in  { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes opp-fade      { from { opacity: 0; } to { opacity: 1; } }
        @keyframes opp-ring      { from { transform: scale(0.8); opacity: 1; } to { transform: scale(1.8); opacity: 0; } }
        @keyframes opp-pulse     { 0%, 100% { transform: scale(1.0); } 50% { transform: scale(1.3); } }
        @keyframes opp-sheet-up  { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes elig-slide-in  { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes elig-slide-out { from { transform: translateX(0); opacity: 1; } to { transform: translateX(-24px); opacity: 0; } }
        @keyframes elig-fade-up   { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes elig-opt-in    { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes elig-scale-in  { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes elig-ring-grow { from { box-shadow: 0 0 0 0 rgba(5,150,105,0.06), 0 0 0 0 rgba(5,150,105,0.03); } to { box-shadow: 0 0 0 8px rgba(5,150,105,0.06), 0 0 0 16px rgba(5,150,105,0.03); } }
      `}</style>
    </>
  )
}
