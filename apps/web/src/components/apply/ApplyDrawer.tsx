'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import {
  X, ArrowRight, ArrowLeft, Check, Upload, FileText,
  CreditCard, ShieldCheck, ChevronDown,
} from 'lucide-react'

const STEPS = ['Eligibility', 'Documents', 'Payment', 'Confirmation']

const QUESTIONS = [
  { text: 'What is your nationality?', options: ['Nigerian', 'Ghanaian', 'Kenyan', 'Other'] },
  { text: 'What is your highest level of education?', options: ['Undergraduate', 'Master\'s degree', 'PhD', 'Other'] },
  { text: 'Do you have at least two years of work experience?', options: ['Yes, 2+ years', 'Yes, 1-2 years', 'Less than 1 year', 'None'] },
  { text: 'What is your field of study or work?', options: ['STEM', 'Social Sciences', 'Humanities', 'Business / Management'] },
  { text: 'Will you return to your country for at least two years after study?', options: ['Yes', 'No', 'Not sure'] },
]

const DOCS = [
  { key: 'cv', label: 'CV / Resume', required: true },
  { key: 'ps', label: 'Personal Statement', required: true },
  { key: 'tr', label: 'Academic Transcript', required: true },
  { key: 'en', label: 'English Language Certificate', required: false },
]

function Stepper({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28, width: '100%', maxWidth: 480 }}>
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              {i > 0 && <div style={{ flex: 1, height: 2, background: done ? '#7A2D05' : '#D8CCC4', transition: 'background 300ms' }} />}
              <span style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: done ? '#7A2D05' : active ? 'rgba(122,45,5,0.12)' : 'transparent',
                border: `2px solid ${done || active ? '#7A2D05' : '#D8CCC4'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
                color: done ? '#fff' : active ? '#7A2D05' : '#9E8070',
                transition: 'all 300ms',
              }}>
                {done ? <Check size={14} /> : i + 1}
              </span>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: done ? '#7A2D05' : '#D8CCC4', transition: 'background 300ms' }} />}
            </div>
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: active ? 600 : 500,
              color: active ? '#7A2D05' : '#9E8070', whiteSpace: 'nowrap',
            }}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

function EligibilityStep({ onComplete }: { onComplete: (eligible: boolean) => void }) {
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})

  const select = (qi: number, oi: number) => {
    setAnswers(prev => ({ ...prev, [qi]: oi }))
  }

  const next = () => {
    if (qIndex < QUESTIONS.length - 1) setQIndex(qi => qi + 1)
    else onComplete(true)
  }

  const q = QUESTIONS[qIndex]
  const hasAnswer = answers[qIndex] !== undefined

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 600, color: '#7A2D05' }}>
          Question {qIndex + 1} of {QUESTIONS.length}
        </span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#9E8070' }}>
          {Math.round(((qIndex + 1) / QUESTIONS.length) * 100)}%
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 999, background: '#D8CCC4', marginBottom: 28, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${((qIndex + 1) / QUESTIONS.length) * 100}%`, background: '#7A2D05', borderRadius: 999, transition: 'width 300ms' }} />
      </div>

      <h3 style={{ margin: '0 0 20px', fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 20, color: '#2A1206' }}>{q.text}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {q.options.map((opt, oi) => {
          const sel = answers[qIndex] === oi
          return (
            <button key={opt} onClick={() => select(qIndex, oi)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
              borderRadius: 12, cursor: 'pointer', textAlign: 'left',
              background: sel ? 'rgba(122,45,5,0.06)' : 'rgba(255,255,255,0.6)',
              border: `1.5px solid ${sel ? '#7A2D05' : '#D8CCC4'}`,
              fontFamily: 'var(--font-sans)', fontSize: 14, color: sel ? '#7A2D05' : '#2A1206',
              fontWeight: sel ? 600 : 500, transition: 'all 150ms',
            }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${sel ? '#7A2D05' : '#D8CCC4'}`,
                background: sel ? '#7A2D05' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {sel && <Check size={12} style={{ color: '#fff' }} />}
              </span>
              {opt}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
        {qIndex > 0 && (
          <button onClick={() => setQIndex(qi => qi - 1)} className="app-btn app-btn-secondary">
            <ArrowLeft size={16} /> Back
          </button>
        )}
        <button onClick={next} disabled={!hasAnswer} className="app-btn app-btn-primary" style={{ flex: 1 }}>
          {qIndex === QUESTIONS.length - 1 ? 'Check eligibility' : 'Continue'} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

function DocumentsStep({ onContinue, onBack }: { onContinue: () => void; onBack: () => void }) {
  const [docs, setDocs] = useState<Record<string, string>>({})

  return (
    <div>
      <h3 style={{ margin: '0 0 8px', fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 20, color: '#2A1206' }}>Upload your documents</h3>
      <p style={{ margin: '0 0 24px', fontFamily: 'var(--font-sans)', fontSize: 14, color: '#6B6660' }}>
        Upload required documents or select from your credential library.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {DOCS.map(doc => {
          const uploaded = docs[doc.key] === 'done'
          return (
            <div key={doc.key} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
              borderRadius: 12, background: uploaded ? 'rgba(75,122,62,0.06)' : 'rgba(255,255,255,0.6)',
              border: `1px solid ${uploaded ? 'rgba(75,122,62,0.3)' : '#D8CCC4'}`,
            }}>
              <FileText size={20} style={{ color: uploaded ? '#4B7A3E' : '#9E8070', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: '#2A1206' }}>
                  {doc.label} {doc.required && <span style={{ color: '#DC2626' }}>*</span>}
                </div>
                {uploaded && <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#4B7A3E' }}>Uploaded</span>}
              </div>
              {uploaded ? (
                <Check size={18} style={{ color: '#4B7A3E' }} />
              ) : (
                <button onClick={() => setDocs(prev => ({ ...prev, [doc.key]: 'done' }))} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                  borderRadius: 999, border: '1px solid #D8CCC4', background: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: '#7A2D05',
                }}>
                  <Upload size={14} /> Upload
                </button>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
        <button onClick={onBack} className="app-btn app-btn-secondary"><ArrowLeft size={16} /> Back</button>
        <button onClick={onContinue} className="app-btn app-btn-primary" style={{ flex: 1 }}>
          Continue to payment <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

function PaymentStep({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [authChecked, setAuthChecked] = useState(false)

  return (
    <div>
      <h3 style={{ margin: '0 0 8px', fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 20, color: '#2A1206' }}>Payment</h3>
      <p style={{ margin: '0 0 24px', fontFamily: 'var(--font-sans)', fontSize: 14, color: '#6B6660' }}>
        OppDate Apply service fee for this application.
      </p>
      <div style={{
        padding: 20, borderRadius: 14, background: 'rgba(245,230,216,0.4)',
        border: '1px solid rgba(212,132,58,0.2)', marginBottom: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: '#2A1206' }}>OppDate Apply fee</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 22, color: '#7A2D05' }}>$49.99</span>
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#6B6660', marginTop: 4 }}>
          Includes: document preparation, eligibility verification, and application submission
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
        <div>
          <label style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: '#2A1206', marginBottom: 6, display: 'block' }}>Card number</label>
          <input placeholder="0000 0000 0000 0000" style={{
            width: '100%', height: 44, padding: '0 14px', borderRadius: 10,
            border: '1px solid #D8CCC4', background: 'rgba(255,255,255,0.7)',
            fontFamily: 'var(--font-sans)', fontSize: 14, color: '#2A1206', boxSizing: 'border-box',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: '#2A1206', marginBottom: 6, display: 'block' }}>Expiry</label>
            <input placeholder="MM / YY" style={{
              width: '100%', height: 44, padding: '0 14px', borderRadius: 10,
              border: '1px solid #D8CCC4', background: 'rgba(255,255,255,0.7)',
              fontFamily: 'var(--font-sans)', fontSize: 14, color: '#2A1206', boxSizing: 'border-box',
            }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: '#2A1206', marginBottom: 6, display: 'block' }}>CVC</label>
            <input placeholder="123" style={{
              width: '100%', height: 44, padding: '0 14px', borderRadius: 10,
              border: '1px solid #D8CCC4', background: 'rgba(255,255,255,0.7)',
              fontFamily: 'var(--font-sans)', fontSize: 14, color: '#2A1206', boxSizing: 'border-box',
            }} />
          </div>
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 24 }}>
        <input type="checkbox" checked={authChecked} onChange={() => setAuthChecked(c => !c)} style={{ marginTop: 3 }} />
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#4A3324', lineHeight: 1.5 }}>
          I authorise OppDate to prepare and submit this application on my behalf. I understand that I will review the final submission before it is sent.
        </span>
      </label>

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onBack} className="app-btn app-btn-secondary"><ArrowLeft size={16} /> Back</button>
        <button onClick={onComplete} disabled={!authChecked} className="app-btn app-btn-primary" style={{ flex: 1 }}>
          <CreditCard size={16} /> Pay and submit
        </button>
      </div>
    </div>
  )
}

function ConfirmationStep({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', background: 'rgba(75,122,62,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
      }}>
        <ShieldCheck size={32} style={{ color: '#4B7A3E' }} />
      </div>
      <h3 style={{ margin: '0 0 8px', fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 22, color: '#2A1206' }}>
        Application submitted
      </h3>
      <p style={{ margin: '0 0 8px', fontFamily: 'var(--font-sans)', fontSize: 14, color: '#6B6660', lineHeight: 1.6 }}>
        Your OppDate Apply application for <strong>Chevening Scholarship 2027</strong> has been received. Our team will prepare and submit your application after your review.
      </p>
      <p style={{ margin: '0 0 28px', fontFamily: 'var(--font-sans)', fontSize: 13, color: '#9E8070' }}>
        You can track progress in My Applications, and we will message you through your thread.
      </p>
      <button onClick={onClose} className="app-btn app-btn-primary" style={{ width: '100%' }}>
        Go to My Applications <ArrowRight size={16} />
      </button>
    </div>
  )
}

interface ApplyDrawerProps {
  open: boolean
  onClose: () => void
}

export function ApplyDrawer({ open, onClose }: ApplyDrawerProps) {
  const [step, setStep] = useState(0)
  const [eligible, setEligible] = useState<boolean | null>(null)

  const handleEligComplete = useCallback((result: boolean) => {
    setEligible(result)
    if (result) setStep(1)
  }, [])

  if (!open) return null

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(26,10,4,0.45)', cursor: 'pointer',
      }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(620px, 100vw)',
        zIndex: 71, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        borderLeft: '1px solid rgba(255,255,255,0.6)',
        boxShadow: '-16px 0 48px rgba(42,18,6,0.18)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderBottom: '1px solid rgba(122,45,5,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Image src="/assets/oppdate-monogram.png" alt="" width={24} height={24} />
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 18, color: '#2A1206' }}>
              Opp<span style={{ color: '#7A2D05' }}>Date</span> Apply
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: '#9E8070' }}>
            <X size={22} />
          </button>
        </div>

        {/* Context strip */}
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 24px',
          background: 'rgba(245,230,216,0.3)', borderBottom: '1px solid rgba(122,45,5,0.06)',
        }}>
          <span style={{
            width: 32, height: 32, borderRadius: '50%', background: 'rgba(245,230,216,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 12, color: '#7A2D05',
          }}>CS</span>
          <div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: '#2A1206' }}>Chevening Scholarship 2027</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#6B6660' }}>Foreign & Commonwealth Office - UK</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          <Stepper current={step} total={STEPS.length} />

          {step === 0 && eligible === null && <EligibilityStep onComplete={handleEligComplete} />}
          {step === 0 && eligible === true && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: 'rgba(5,150,105,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              }}>
                <Check size={28} style={{ color: '#059669' }} />
              </div>
              <h3 style={{ margin: '0 0 8px', fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 20, color: '#2A1206' }}>You&apos;re eligible</h3>
              <p style={{ margin: '0 0 24px', fontFamily: 'var(--font-sans)', fontSize: 14, color: '#6B6660' }}>
                Based on your answers, you meet the core criteria for this opportunity.
              </p>
              <button onClick={() => setStep(1)} className="app-btn app-btn-primary" style={{ width: '100%' }}>
                Continue to documents <ArrowRight size={16} />
              </button>
            </div>
          )}
          {step === 1 && <DocumentsStep onContinue={() => setStep(2)} onBack={() => { setStep(0); setEligible(true) }} />}
          {step === 2 && <PaymentStep onComplete={() => setStep(3)} onBack={() => setStep(1)} />}
          {step === 3 && <ConfirmationStep onClose={onClose} />}
        </div>
      </div>
    </>
  )
}
