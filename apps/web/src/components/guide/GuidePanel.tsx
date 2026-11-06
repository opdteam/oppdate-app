'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, Send, CheckCircle, Info, Lock, Globe, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { api, extractApiError } from '@/lib/api'

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

// Eligibility question shape from DB eligibilityCriteria field
interface EligOption { text: string; score: number }
interface EligCriterion { question: string; options: (string | EligOption)[] }

function normaliseOption(o: string | EligOption): EligOption {
  return typeof o === 'string' ? { text: o, score: 0 } : o
}

const SUGGESTED_CHIPS = [
  'Am I eligible for this?',
  'What documents do I need?',
  'What\'s the deadline?',
  'How does OppDate Apply work for this one?',
]

function detectCtaChips(aiText: string): CtaChip[] {
  const t = aiText.toLowerCase()
  const chips: CtaChip[] = []

  // Yes/No question — AI asked a binary question, offer both options
  const isYesNoQuestion = (
    t.endsWith('?') || t.includes('are you') || t.includes('do you') || t.includes('have you') || t.includes('is your') || t.includes('would you')
  ) && (
    t.includes('are you a') || t.includes('do you have') || t.includes('have you') ||
    t.includes('is your') || t.includes('would you like') || t.includes('citizen') ||
    t.includes('currently') || t.includes('do you hold')
  )
  if (isYesNoQuestion) {
    chips.push({ label: 'Yes', message: 'Yes' })
    chips.push({ label: 'No', message: 'No' })
  }

  // Apply intent
  if (t.includes('oppdate apply') && (t.includes('prepare') || t.includes('submit') || t.includes('behalf') || t.includes('service'))) {
    chips.push({ label: 'Start my application', message: 'Let\'s begin the application' })
  }

  // Eligibility check
  if (!isYesNoQuestion && (t.includes('check') && t.includes('eligib') || t.includes('qualify') || t.includes('meet the criteria'))) {
    chips.push({ label: 'Check my eligibility', message: 'Am I eligible for this?' })
  }

  // Documents
  if ((t.includes('document') || t.includes('cv') || t.includes('personal statement')) && t.includes('need')) {
    chips.push({ label: 'What documents do I need?', message: 'What documents do I need for this?' })
  }

  // Deadline
  if (t.includes('deadline') || t.includes('closes') || t.includes('due date')) {
    chips.push({ label: 'When is the deadline?', message: 'What is the deadline for this?' })
  }

  // Similar opportunities
  if (t.includes('other opportunit') || t.includes('similar') || t.includes('alternative')) {
    chips.push({ label: 'Show similar opportunities', message: 'Are there similar opportunities I can apply to?' })
  }

  // Skip to apply when AI is gathering info and user may want to just proceed
  if (!isYesNoQuestion && (t.includes('need a few details') || t.includes('need some details') || t.includes('can you share') || t.includes('tell me more') || t.includes('i need to know'))) {
    chips.push({ label: 'Skip — just apply for me', message: 'Let\'s skip and just begin the application' })
  }

  // Deduplicate and cap at 3
  const seen = new Set<string>()
  return chips.filter(c => { if (seen.has(c.label)) return false; seen.add(c.label); return true }).slice(0, 3)
}

interface CtaChip { label: string; message: string }

interface OppCard {
  slug: string
  title: string
  institution: string
  country: string
  type: string
  deadline: string | null
  fundingLabel: string | null
  oppDateApply: boolean
}

interface WebSource {
  title: string
  url: string
}

interface Message {
  kind: 'user' | 'ai' | 'system'
  text: string
  stream?: boolean
  chips?: CtaChip[]
  cards?: OppCard[]
  sources?: WebSource[]
}

function TypingDots() {
  const dot = (d: number): React.CSSProperties => ({
    width: 7, height: 7, borderRadius: '50%', background: 'rgba(122,45,5,0.6)',
    display: 'inline-block', animation: `dotPulse 1.2s ease-in-out ${d}ms infinite`,
  })
  return (
    <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center', padding: '2px 2px' }}>
      <span style={dot(0)} />
      <span style={dot(160)} />
      <span style={dot(320)} />
    </span>
  )
}

function StreamWords({ text, onDone }: { text: string; onDone?: () => void }) {
  const words = useMemo(() => text.split(' '), [text])
  const [n, setN] = useState(0)
  useEffect(() => {
    if (n >= words.length) { onDone?.(); return }
    const t = setTimeout(() => setN(n + 1), n === 0 ? 40 : 78)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, words.length])
  return (
    <span>
      {words.slice(0, n).map((w, i) => (
        <span key={i}><span style={{ display: 'inline-block', animation: 'wordIn 240ms ease both' }}>{w}</span>{' '}</span>
      ))}
    </span>
  )
}

function StreamingBubble({ text }: { text: string }) {
  const [phase, setPhase] = useState<'typing' | 'stream'>('typing')
  useEffect(() => {
    const t = setTimeout(() => setPhase('stream'), 720)
    return () => clearTimeout(t)
  }, [])
  if (phase === 'typing') return <TypingDots />
  return <StreamWords text={text} />
}

function Bubble({ from, children, stream, compact }: { from: 'user' | 'ai'; children: React.ReactNode; stream?: boolean; compact?: boolean }) {
  const isUser = from === 'user'
  const av = compact ? 20 : 26
  return (
    <div style={{
      display: 'flex', gap: compact ? 6 : 8, alignItems: 'flex-end',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      animation: 'msgRise 280ms var(--ease-out-soft) both',
    }}>
      {!isUser && (
        <span style={{
          width: av, height: av, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(122,45,5,0.08)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Image src="/assets/oppdate-monogram.png" alt="" width={compact ? 10 : 13} height={compact ? 10 : 13} />
        </span>
      )}
      <div style={{
        maxWidth: compact ? '82%' : '78%', fontFamily: 'var(--font-sans)',
        fontSize: compact ? 12.5 : 14, lineHeight: 1.45,
        padding: compact ? '8px 11px' : '10px 13px',
        background: isUser ? '#7A2D05' : 'rgba(255,255,255,0.62)',
        color: isUser ? '#fff' : '#2A1206',
        border: isUser ? 'none' : '1px solid rgba(255,255,255,0.5)',
        borderRadius: compact ? 14 : 16,
        borderBottomRightRadius: isUser ? 4 : (compact ? 14 : 16),
        borderBottomLeftRadius: isUser ? (compact ? 14 : 16) : 4,
        boxShadow: isUser ? '0 2px 8px rgba(122,45,5,0.18)' : '0 1px 3px rgba(73,42,12,0.06)',
      }}>{stream && typeof children === 'string' ? <StreamingBubble text={children} /> : children}</div>
    </div>
  )
}

function SystemNote({ children, compact }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div style={{
      alignSelf: 'center', maxWidth: '90%', textAlign: 'center',
      fontFamily: 'var(--font-sans)', fontSize: compact ? 11 : 12.5, lineHeight: 1.45, color: '#6B6660',
      background: 'rgba(245,230,216,0.5)', border: '1px solid rgba(212,132,58,0.22)',
      borderRadius: compact ? 10 : 12, padding: compact ? '6px 10px' : '8px 14px',
      animation: 'msgRise 280ms var(--ease-out-soft) both',
    }}>{children}</div>
  )
}

function Chip({ children, onClick, delay = 0, compact }: { children: React.ReactNode; onClick: () => void; delay?: number; compact?: boolean }) {
  return (
    <button className="guide-chip" onClick={onClick} style={{
      fontFamily: 'var(--font-sans)', fontSize: compact ? 11.5 : 13, fontWeight: 500, color: '#2A1206', textAlign: 'left',
      padding: compact ? '7px 11px' : '10px 16px', borderRadius: 999, cursor: 'pointer',
      background: 'rgba(122,45,5,0.06)', border: '1px solid rgba(122,45,5,0.18)',
      animation: `chipIn 320ms var(--ease-out-soft) ${delay}ms both`,
    }}>{children}</button>
  )
}

function CtaRow({ chips, onPick, compact }: { chips: CtaChip[]; onPick: (msg: string) => void; compact?: boolean }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: compact ? 6 : 7,
      paddingLeft: compact ? 28 : 34,
      animation: 'chipIn 300ms var(--ease-out-soft) 200ms both',
    }}>
      {chips.map((c, i) => (
        <button
          key={i}
          onClick={() => { if (c.message) onPick(c.message) }}
          style={{
            fontFamily: 'var(--font-sans)', fontSize: compact ? 11.5 : 12.5,
            fontWeight: 500, color: c.message ? '#7A2D05' : '#6B6660',
            padding: compact ? '5px 10px' : '6px 13px',
            borderRadius: 999, cursor: c.message ? 'pointer' : 'default', border: 'none',
            background: c.message ? 'rgba(122,45,5,0.07)' : 'rgba(0,0,0,0.04)',
            outline: `1px solid ${c.message ? 'rgba(122,45,5,0.22)' : 'rgba(0,0,0,0.1)'}`,
            transition: 'all 140ms ease',
          }}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}

function EligStep({
  question, options, index, total, compact,
  onAnswer,
}: {
  question: string
  options: EligOption[]
  index: number
  total: number
  compact?: boolean
  onAnswer: (text: string, score: number) => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const pct = Math.round(((index + 1) / total) * 100)

  const handleSelect = (i: number) => {
    setSelected(i)
    setTimeout(() => onAnswer(options[i].text, options[i].score), 260)
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.78)',
      border: '1px solid rgba(212,132,58,0.18)',
      borderRadius: compact ? 16 : 20,
      overflow: 'hidden',
      animation: 'msgRise 300ms var(--ease-out-soft) both',
      boxShadow: '0 4px 20px rgba(73,42,12,0.08)',
    }}>
      {/* Progress bar — full-width, no label row, just a slim colored strip */}
      <div style={{ height: 3, background: '#F0E8E0' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: 'linear-gradient(90deg, #C07630 0%, #7A2D05 100%)',
          borderRadius: '0 999px 999px 0',
          transition: 'width 420ms cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>

      <div style={{ padding: compact ? '14px 14px 14px' : '20px 20px 18px' }}>
        {/* Step counter */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          marginBottom: compact ? 10 : 14,
        }}>
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} style={{
              width: i === index ? (compact ? 18 : 22) : (compact ? 6 : 7),
              height: compact ? 6 : 7,
              borderRadius: 999,
              background: i < index
                ? '#7A2D05'
                : i === index
                  ? 'linear-gradient(90deg, #C07630, #7A2D05)'
                  : 'rgba(122,45,5,0.15)',
              transition: 'all 320ms ease',
              flexShrink: 0,
            }} />
          ))}
          <span style={{
            fontFamily: 'var(--font-sans)', fontSize: compact ? 10 : 11,
            color: '#A08070', marginLeft: 4,
          }}>{index + 1} of {total}</span>
        </div>

        {/* Question */}
        <p style={{
          margin: `0 0 ${compact ? 12 : 16}px`,
          fontFamily: 'var(--font-serif)', fontWeight: 600,
          fontSize: compact ? 14 : 16, lineHeight: 1.4, color: '#1C0B02',
        }}>{question}</p>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 7 : 8 }}>
          {options.map((opt, i) => {
            const sel = selected === i
            const done = selected !== null
            return (
              <button
                key={i}
                onClick={() => { if (!done) handleSelect(i) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: compact ? 10 : 12,
                  padding: compact ? '10px 12px' : '12px 15px',
                  borderRadius: compact ? 11 : 13,
                  cursor: done ? 'default' : 'pointer',
                  textAlign: 'left', width: '100%', border: 'none',
                  background: sel
                    ? 'linear-gradient(135deg, rgba(192,118,48,0.1) 0%, rgba(122,45,5,0.08) 100%)'
                    : 'rgba(248,243,238,0.7)',
                  outline: sel ? '1.5px solid #7A2D05' : '1.5px solid rgba(212,132,58,0.22)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: compact ? 12.5 : 13.5,
                  color: sel ? '#5C1F02' : '#3A2010',
                  fontWeight: sel ? 600 : 450,
                  transition: 'all 160ms ease',
                  opacity: done && !sel ? 0.38 : 1,
                  transform: sel ? 'scale(1.005)' : 'scale(1)',
                }}
              >
                <span style={{
                  width: compact ? 18 : 21, height: compact ? 18 : 21,
                  borderRadius: '50%', flexShrink: 0,
                  background: sel ? '#7A2D05' : 'rgba(255,255,255,0.9)',
                  border: `2px solid ${sel ? '#7A2D05' : 'rgba(180,140,110,0.5)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 160ms ease',
                  boxShadow: sel ? '0 0 0 3px rgba(122,45,5,0.12)' : 'none',
                }}>
                  {sel && (
                    <svg width={compact ? 8 : 9} height={compact ? 8 : 9} viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span style={{ flex: 1 }}>{opt.text}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ResultCard({ eligible, reason, compact }: { eligible: boolean; reason: string; compact?: boolean }) {
  return (
    <div style={{
      borderRadius: compact ? 16 : 20,
      overflow: 'hidden',
      animation: 'msgRise 360ms var(--ease-out-soft) both',
      boxShadow: '0 4px 20px rgba(73,42,12,0.08)',
      border: `1px solid ${eligible ? 'rgba(5,150,105,0.2)' : 'rgba(212,132,58,0.22)'}`,
    }}>
      {/* Colored top strip */}
      <div style={{
        height: compact ? 4 : 5,
        background: eligible
          ? 'linear-gradient(90deg, #059669, #34d399)'
          : 'linear-gradient(90deg, #C07630, #7A2D05)',
      }} />

      <div style={{
        padding: compact ? '14px 14px 16px' : '20px 20px 22px',
        background: eligible ? 'rgba(5,150,105,0.04)' : 'rgba(255,251,248,0.9)',
      }}>
        {/* Icon + heading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 10 : 12, marginBottom: compact ? 8 : 12 }}>
          <span style={{
            width: compact ? 34 : 42, height: compact ? 34 : 42, borderRadius: '50%', flexShrink: 0,
            background: eligible ? 'rgba(5,150,105,0.1)' : 'rgba(192,118,48,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {eligible
              ? <CheckCircle size={compact ? 18 : 22} style={{ color: '#059669' }} />
              : <Info size={compact ? 18 : 22} style={{ color: '#C07630' }} />
            }
          </span>
          <div>
            <div style={{
              fontFamily: 'var(--font-serif)', fontWeight: 700,
              fontSize: compact ? 14 : 16, color: '#1C0B02', lineHeight: 1.2,
            }}>
              {eligible ? 'You look eligible' : 'Not quite there yet'}
            </div>
            <div style={{
              fontFamily: 'var(--font-sans)', fontSize: compact ? 10.5 : 11.5,
              color: eligible ? '#059669' : '#A07040', marginTop: 2, fontWeight: 500,
            }}>
              {eligible ? 'Ready to apply' : 'Some criteria not met'}
            </div>
          </div>
        </div>

        {/* Reason text */}
        <p style={{
          margin: `0 0 ${compact ? 12 : 16}px`,
          fontFamily: 'var(--font-sans)', fontSize: compact ? 12 : 13,
          lineHeight: 1.55, color: '#5A4030',
          paddingLeft: compact ? 44 : 54,
        }}>{reason}</p>

        {eligible && (
          <button className="guide-cta" style={{
            width: '100%', height: compact ? 42 : 50, borderRadius: compact ? 11 : 13, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #C07630 0%, #7A2D05 100%)',
            color: '#fff', fontFamily: 'var(--font-sans)',
            fontSize: compact ? 13 : 14.5, fontWeight: 600,
            boxShadow: '0 4px 14px rgba(122,45,5,0.28)',
            letterSpacing: '0.01em',
          }}>Apply with OppDate Apply</button>
        )}
      </div>
    </div>
  )
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function SourcesRow({ sources, compact }: { sources: WebSource[]; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const COLLAPSED_LIMIT = 2
  const visible = expanded ? sources : sources.slice(0, COLLAPSED_LIMIT)
  const hasMore = sources.length > COLLAPSED_LIMIT

  return (
    <div style={{
      paddingLeft: compact ? 28 : 34,
      animation: 'msgRise 300ms var(--ease-out-soft) 160ms both',
    }}>
      {/* Label row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        marginBottom: compact ? 5 : 6,
      }}>
        <Globe size={compact ? 10 : 11} style={{ color: '#A07040', flexShrink: 0 }} />
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: compact ? 10 : 11,
          color: '#A07040', fontWeight: 500, letterSpacing: '0.01em',
        }}>Web sources</span>
      </div>

      {/* Source pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: compact ? 5 : 6 }}>
        {visible.map((s, i) => (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            title={s.title}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: compact ? 4 : 5,
              fontFamily: 'var(--font-sans)', fontSize: compact ? 10.5 : 11.5,
              color: '#5A3A18', textDecoration: 'none',
              background: 'rgba(255,255,255,0.72)',
              border: '1px solid rgba(212,132,58,0.28)',
              borderRadius: 999,
              padding: compact ? '3px 8px 3px 6px' : '4px 10px 4px 8px',
              maxWidth: compact ? 140 : 180,
              overflow: 'hidden',
              transition: 'background 140ms ease, border-color 140ms ease',
            }}
          >
            {/* Favicon */}
            <img
              src={`https://www.google.com/s2/favicons?domain=${getDomain(s.url)}&sz=16`}
              alt=""
              width={compact ? 11 : 12}
              height={compact ? 11 : 12}
              style={{ borderRadius: 2, flexShrink: 0 }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <span style={{
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              flex: 1,
            }}>
              {getDomain(s.url)}
            </span>
            <ExternalLink size={compact ? 8 : 9} style={{ color: '#A07040', flexShrink: 0 }} />
          </a>
        ))}

        {/* Expand / collapse toggle */}
        {hasMore && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontFamily: 'var(--font-sans)', fontSize: compact ? 10.5 : 11.5,
              color: '#7A2D05', background: 'none', border: 'none',
              cursor: 'pointer', padding: compact ? '3px 2px' : '4px 2px',
              fontWeight: 500,
            }}
          >
            {expanded
              ? <><ChevronUp size={compact ? 10 : 11} /> less</>
              : <><ChevronDown size={compact ? 10 : 11} /> +{sources.length - COLLAPSED_LIMIT} more</>
            }
          </button>
        )}
      </div>
    </div>
  )
}

function InlineOppCard({ card, compact }: { card: OppCard; compact?: boolean }) {
  const deadlineDate = card.deadline ? new Date(card.deadline) : null
  const daysLeft = deadlineDate ? Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000) : null
  const deadlineUrgent = daysLeft !== null && daysLeft <= 7

  return (
    <a
      href={`/opportunities/${card.slug}`}
      style={{
        display: 'block', textDecoration: 'none',
        background: 'rgba(255,255,255,0.78)',
        border: '1px solid rgba(212,132,58,0.22)',
        borderRadius: compact ? 12 : 14,
        padding: compact ? '10px 12px' : '12px 15px',
        animation: 'msgRise 300ms var(--ease-out-soft) both',
        boxShadow: '0 2px 8px rgba(73,42,12,0.06)',
        transition: 'box-shadow 160ms ease, border-color 160ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <span style={{
          fontFamily: 'var(--font-serif)', fontWeight: 600,
          fontSize: compact ? 12.5 : 13.5, color: '#1C0B02', lineHeight: 1.3,
          flex: 1,
        }}>{card.title}</span>
        {card.oppDateApply && (
          <span style={{
            flexShrink: 0,
            fontFamily: 'var(--font-sans)', fontSize: compact ? 9.5 : 10.5,
            fontWeight: 600, color: '#7A2D05',
            background: 'rgba(122,45,5,0.08)',
            border: '1px solid rgba(122,45,5,0.2)',
            borderRadius: 999, padding: '2px 7px',
            whiteSpace: 'nowrap',
          }}>OppDate Apply</span>
        )}
      </div>
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: compact ? 11 : 12,
        color: '#6B6660', lineHeight: 1.4,
      }}>
        {card.institution} &middot; {card.country}
        {card.fundingLabel && <> &middot; <span style={{ color: '#059669', fontWeight: 500 }}>{card.fundingLabel}</span></>}
      </div>
      {daysLeft !== null && (
        <div style={{
          marginTop: 6,
          fontFamily: 'var(--font-sans)', fontSize: compact ? 10.5 : 11,
          fontWeight: 500,
          color: deadlineUrgent ? '#DC2626' : '#A07040',
        }}>
          {daysLeft < 0 ? 'Deadline passed' : daysLeft === 0 ? 'Closes today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
        </div>
      )}
    </a>
  )
}

interface GuidePanelProps {
  onClose: () => void
  initialGreeting?: string
  opportunitySlug?: string
  opportunityTitle?: string
  eligibilityCriteria?: EligCriterion[]
  isPremium?: boolean
  onPremiumRequired?: () => void
}

export function GuidePanel({ onClose, initialGreeting, opportunitySlug, opportunityTitle, eligibilityCriteria, isPremium = false, onPremiumRequired }: GuidePanelProps) {
  // Normalise criteria into flat question+options arrays
  const eligQuestions = useMemo(() =>
    (eligibilityCriteria ?? []).map(c => ({
      text: c.question,
      options: c.options.map(normaliseOption),
    })),
  [eligibilityCriteria])

  const [messages, setMessages] = useState<Message[]>(() =>
    initialGreeting ? [{ kind: 'ai' as const, text: initialGreeting, stream: true }] : []
  )
  const [input, setInput] = useState('')
  const [eligMode, setEligMode] = useState(false)
  const [eligIndex, setEligIndex] = useState(0)
  const [eligScores, setEligScores] = useState<number[]>([])
  const [showResult, setShowResult] = useState<{ eligible: boolean; reason: string } | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const mobile = useIsMobile()

  // Session tracking for admin persistence
  const startedAtRef = useRef<string>(new Date().toISOString())
  const eligTriggeredRef = useRef(false)
  const eligVerdictRef = useRef<'eligible' | 'borderline' | 'ineligible' | undefined>(undefined)
  const messagesRef = useRef(messages)
  useEffect(() => { messagesRef.current = messages }, [messages])
  const savedRef = useRef(false)

  const buildHistory = useCallback(() => {
    return messages
      .filter(m => m.kind === 'user' || m.kind === 'ai')
      .slice(-10)
      .map(m => ({ role: m.kind === 'user' ? 'user' : 'assistant' as const, content: m.text }))
  }, [messages])

  const scrollDown = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [])

  useEffect(() => { scrollDown() }, [messages, eligIndex, showResult, scrollDown])

  const startEligCheck = useCallback(() => {
    eligTriggeredRef.current = true
    if (eligQuestions.length === 0) {
      setMessages(prev => [...prev,
        { kind: 'ai', text: 'I don\'t have specific eligibility questions for this opportunity. Ask me anything about the requirements and I\'ll help you assess your fit.', stream: true },
      ])
      return
    }
    setEligMode(true)
    setEligIndex(0)
    setEligScores([])
    setShowResult(null)
    setTimeout(() => {
      setMessages(prev => [...prev, {
        kind: 'system',
        text: `Let's check if you're eligible for ${opportunityTitle ?? 'this opportunity'}.`,
      }])
    }, 300)
  }, [eligQuestions, opportunityTitle])

  const sendMessage = useCallback(async (text: string) => {
    const lc = text.toLowerCase()
    if ((lc.includes('eligible') || lc.includes('qualify') || lc.includes('check my eligibility')) && !eligMode) {
      setMessages(prev => [...prev, { kind: 'user', text }])
      startEligCheck()
      return
    }
    // Collapse the result card and strip chips from the last message once the user continues
    if (showResult) setShowResult(null)
    setMessages(prev => {
      const updated = [...prev]
      const last = updated[updated.length - 1]
      if (last?.chips) updated[updated.length - 1] = { ...last, chips: undefined }
      return [...updated, { kind: 'user', text }]
    })
    setAiLoading(true)
    try {
      const history = buildHistory()
      const res = await api.post<{ data: { reply: string; cards?: OppCard[]; sources?: WebSource[] } }>('/api/v1/ai/chat', {
        message: text,
        history,
        opportunitySlug,
      })
      const aiText = res.data?.data?.reply || 'I could not generate a response. Please try again.'
      const cards = res.data?.data?.cards ?? []
      const sources = res.data?.data?.sources ?? []
      const chips = detectCtaChips(aiText)
      setMessages(prev => [...prev, {
        kind: 'ai', text: aiText, stream: true,
        chips: chips.length ? chips : undefined,
        cards: cards.length ? cards : undefined,
        sources: sources.length ? sources : undefined,
      }])
    } catch (err) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code
      if (code === 'PREMIUM_REQUIRED') {
        setMessages(prev => prev.slice(0, -1)) // remove the user message that triggered it
        onPremiumRequired?.()
        return
      }
      const msg = extractApiError(err, 'I\'m having trouble connecting right now. Please try again in a moment.')
      setMessages(prev => [...prev, { kind: 'ai', text: msg, stream: true }])
    } finally {
      setAiLoading(false)
    }
  }, [eligMode, showResult, buildHistory, opportunitySlug, startEligCheck, onPremiumRequired])

  const answerElig = useCallback((optionText: string, optionScore: number) => {
    setMessages(prev => [...prev, { kind: 'user', text: optionText }])
    const newScores = [...eligScores, optionScore]
    setEligScores(newScores)
    const next = eligIndex + 1

    if (next >= eligQuestions.length) {
      const totalScore = newScores.reduce((s, v) => s + v, 0)
      const hasDisqualifying = newScores.some(s => s <= -100)
      const verdict: 'eligible' | 'borderline' | 'ineligible' = hasDisqualifying
        ? 'ineligible'
        : totalScore >= 0 ? 'eligible' : 'borderline'
      eligVerdictRef.current = verdict
      const eligible = verdict === 'eligible'
      const reason = eligible
        ? `Based on your answers, you appear to meet the core eligibility criteria for ${opportunityTitle ?? 'this opportunity'}. OppDate Apply can prepare and submit your application on your behalf.`
        : `Based on your answers, you may not meet all the criteria for ${opportunityTitle ?? 'this opportunity'} right now. You can still apply -- our team will review your profile carefully.`
      setShowResult({ eligible, reason })
      setEligMode(false)
    }
    setEligIndex(next)
  }, [eligIndex, eligScores, eligQuestions.length, opportunityTitle])

  const handleSubmit = useCallback(() => {
    const t = input.trim()
    if (!t) return
    sendMessage(t)
    setInput('')
  }, [input, sendMessage])

  const saveSession = useCallback(async () => {
    if (savedRef.current) return
    const msgs = messagesRef.current.filter(m => m.kind !== 'system')
    if (msgs.length === 0) return
    savedRef.current = true
    try {
      await api.post('/api/v1/guide-sessions', {
        messages: msgs.map(m => ({
          role: m.kind === 'user' ? 'user' : 'assistant',
          content: m.text,
          ts: new Date().toISOString(),
        })),
        opportunitySlug,
        eligTriggered: eligTriggeredRef.current,
        eligVerdict: eligVerdictRef.current,
        startedAt: startedAtRef.current,
      })
    } catch {
      // Best-effort - do not block the close action on save failure
      savedRef.current = false
    }
  }, [opportunitySlug])

  // Save on tab hide / page unload
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveSession()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [saveSession])

  const handleClose = useCallback(() => {
    saveSession()
    onClose()
  }, [saveSession, onClose])

  const isEmpty = messages.length === 0

  const sz = mobile
    ? { hdrPad: '10px 14px 8px', hdrIcon: 24, hdrImg: 12, hdrTitle: 15, hdrSub: 11,
        msgPad: 12, msgGap: 10, emptyIcon: 40, emptyImg: 20, emptyTitle: 15, emptyBody: 12,
        chipFs: 11.5, chipPad: '8px 12px', bubbleFs: 12.5, bubblePad: '8px 11px',
        bubbleAvatar: 22, bubbleAvatarImg: 11, bubbleMaxW: '82%',
        inputPad: '8px 12px 10px', inputFs: 13, sendBtn: 30, sendIcon: 15,
        footerFs: 10, xSize: 18,
      }
    : { hdrPad: '16px 18px 12px', hdrIcon: 32, hdrImg: 16, hdrTitle: 18, hdrSub: 13,
        msgPad: 16, msgGap: 12, emptyIcon: 56, emptyImg: 28, emptyTitle: 18, emptyBody: 14,
        chipFs: 13, chipPad: '10px 16px', bubbleFs: 14, bubblePad: '10px 13px',
        bubbleAvatar: 26, bubbleAvatarImg: 13, bubbleMaxW: '78%',
        inputPad: '10px 16px 12px', inputFs: 14, sendBtn: 36, sendIcon: 18,
        footerFs: 11, xSize: 20,
      }

  const shell = (
    <div style={{
      ...(mobile
        ? { position: 'fixed' as const, inset: 0, zIndex: 9999, borderRadius: 0 }
        : { position: 'fixed' as const, right: 24, bottom: 24, width: 420,
            maxHeight: 'min(640px, calc(100vh - 96px))', borderRadius: 20, zIndex: 45 }
      ),
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: mobile ? '#FAF7F4' : 'rgba(255,255,255,0.82)',
      backdropFilter: mobile ? undefined : 'blur(20px) saturate(140%)',
      WebkitBackdropFilter: mobile ? undefined : 'blur(20px) saturate(140%)',
      border: mobile ? 'none' : '1px solid rgba(255,255,255,0.5)',
      boxShadow: mobile ? 'none' : '0 16px 48px rgba(0,0,0,0.18)',
      transformOrigin: 'bottom right',
      animation: mobile ? undefined : 'guideUnfurl 380ms var(--ease-out-soft) both',
    }}>
      {/* Header */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: mobile ? 8 : 11, padding: sz.hdrPad }}>
          <span style={{
            width: sz.hdrIcon, height: sz.hdrIcon, borderRadius: '50%', background: 'rgba(122,45,5,0.08)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Image src="/assets/oppdate-monogram.png" alt="" width={sz.hdrImg} height={sz.hdrImg} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: sz.hdrTitle, color: '#2A1206', lineHeight: 1.1 }}>OppDate Guide</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: sz.hdrSub, color: '#6B6660', marginTop: 2 }}>
              {opportunityTitle ? `Here to help with ${opportunityTitle}` : 'Your AI companion'}
            </div>
          </div>
          <button onClick={handleClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={sz.xSize} />
          </button>
        </div>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(212,132,58,0.12)' }} />
      </div>

      {/* Message area */}
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: sz.msgPad, display: 'flex', flexDirection: 'column', gap: sz.msgGap }}>
        {isEmpty ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: mobile ? 12 : 16, padding: '8px 4px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: mobile ? 8 : 10 }}>
              <span style={{
                width: sz.emptyIcon, height: sz.emptyIcon, borderRadius: '50%', background: 'rgba(122,45,5,0.08)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Image src="/assets/oppdate-monogram.png" alt="" width={sz.emptyImg} height={sz.emptyImg} />
              </span>
              <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: sz.emptyTitle, color: '#2A1206' }}>Hi, I&apos;m here to help!</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: sz.emptyBody, lineHeight: 1.5, color: '#6B6660', maxWidth: 260 }}>
                Ask me anything about this opportunity, or pick a question below to get started.
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: mobile ? 6 : 8, justifyContent: 'center' }}>
              {SUGGESTED_CHIPS.map((c, i) => (
                <Chip key={c} delay={i * 60} onClick={() => sendMessage(c)} compact={mobile}>{c}</Chip>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => {
              if (m.kind === 'system') return <SystemNote key={i} compact={mobile}>{m.text}</SystemNote>
              const isLastAi = m.kind === 'ai' && !aiLoading && i === messages.length - 1
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: mobile ? 6 : 7 }}>
                  <Bubble from={m.kind as 'user' | 'ai'} stream={m.stream} compact={mobile}>{m.text}</Bubble>
                  {isLastAi && m.chips && m.chips.length > 0 && (
                    <CtaRow chips={m.chips} onPick={sendMessage} compact={mobile} />
                  )}
                  {m.kind === 'ai' && m.sources && m.sources.length > 0 && (
                    <SourcesRow sources={m.sources} compact={mobile} />
                  )}
                  {m.kind === 'ai' && m.cards && m.cards.length > 0 && (
                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: mobile ? 6 : 8,
                      paddingLeft: mobile ? 28 : 34,
                    }}>
                      {m.cards.map(card => (
                        <InlineOppCard key={card.slug} card={card} compact={mobile} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {aiLoading && (
              <Bubble from="ai" compact={mobile}><TypingDots /></Bubble>
            )}
            {eligMode && eligIndex < eligQuestions.length && (
              <EligStep
                key={eligIndex}
                question={eligQuestions[eligIndex].text}
                options={eligQuestions[eligIndex].options}
                index={eligIndex}
                total={eligQuestions.length}
                compact={mobile}
                onAnswer={answerElig}
              />
            )}
            {showResult && <ResultCard eligible={showResult.eligible} reason={showResult.reason} compact={mobile} />}
          </>
        )}
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, padding: sz.inputPad, borderTop: '1px solid rgba(212,132,58,0.12)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(122,45,5,0.2)',
          borderRadius: 999, padding: mobile ? '3px 3px 3px 12px' : '4px 4px 4px 16px',
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            placeholder="Ask OppDate Guide anything..."
            style={{
              flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
              fontFamily: 'var(--font-sans)', fontSize: sz.inputFs, color: '#2A1206', padding: mobile ? '6px 0' : '8px 0',
            }}
          />
          <button
            className="guide-send"
            onClick={!isPremium ? onPremiumRequired : handleSubmit}
            aria-label={isPremium ? 'Send' : 'Upgrade to send'}
            disabled={aiLoading}
            style={{
              width: sz.sendBtn, height: sz.sendBtn, borderRadius: '50%', flexShrink: 0, border: 'none',
              cursor: aiLoading ? 'not-allowed' : 'pointer',
              background: aiLoading ? 'rgba(122,45,5,0.4)' : '#7A2D05',
              color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isPremium ? <Send size={sz.sendIcon} /> : <Lock size={sz.sendIcon} />}
          </button>
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: sz.footerFs, color: '#6B6660', textAlign: 'center', marginTop: mobile ? 6 : 8 }}>
          OppDate Guide can make mistakes. Verify important details.
        </div>
      </div>
    </div>
  )

  if (mobile) return createPortal(shell, document.body)
  return shell
}
