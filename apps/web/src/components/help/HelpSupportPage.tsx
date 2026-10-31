'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Search, ChevronDown, ChevronRight, HelpCircle, MessageCircle,
  CreditCard, FileText, Briefcase, Clock, ThumbsUp, ThumbsDown,
  Send, CheckCircle, X,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useUser } from '@/lib/UserContext'

interface FaqItem {
  id: string
  question: string
  answer: string
  category: 'applications' | 'payments' | 'documents' | 'account' | 'eligibility' | 'timeline'
}

const FAQ_DATA: FaqItem[] = [
  { id: 'a1', category: 'applications', question: 'How does OppDate apply on my behalf?', answer: 'OppDate prepares your complete application package - personal statement, CV, supporting documents - and submits it directly to the institution. After you confirm eligibility and complete payment, our team takes over. You receive status updates at every stage through your dashboard.' },
  { id: 'a2', category: 'applications', question: 'What happens after I pay the service fee?', answer: 'Once payment is confirmed, a message thread opens automatically in your Messages tab. Our team will request any outstanding documents and begin drafting your application. The typical turnaround from payment to submission is 3 to 7 working days depending on the opportunity.' },
  { id: 'a3', category: 'applications', question: 'Can I withdraw my application after submitting?', answer: "You can withdraw at any stage before we submit to the institution. Go to My Applications, open the application, and select Withdraw. After institutional submission, withdrawal depends on the institution's own policy." },
  { id: 'a4', category: 'applications', question: 'What does each application status mean?', answer: 'Eligibility Screening means we are reviewing your eligibility check answers. Document Collection means we are gathering your documents. Awaiting Payment means your application is ready and waiting for the service fee. Payment Confirmed, Submitted, Under Review, and Decision Pending track the progression through our work and the institution\'s review. Accepted and Rejected are the final outcomes.' },
  { id: 'p1', category: 'payments', question: 'What payment methods are accepted?', answer: 'We accept Stripe (Visa, Mastercard, Amex) for international payments and Paystack for payments from Nigeria, Ghana, Kenya, South Africa, and other supported African countries. Payment method options are shown at checkout based on your location.' },
  { id: 'p2', category: 'payments', question: 'Is the service fee refundable?', answer: 'The service fee is non-refundable once work has begun on your application. If you withdraw before our team starts drafting, we issue a full refund within 5 to 7 business days. Contact support through your message thread if you have a payment dispute.' },
  { id: 'p3', category: 'payments', question: 'Why are there two fee amounts shown?', answer: 'OppDate offers general pricing and regional pricing. If your country is on our regional pricing list (26 countries with purchasing power parity adjustments), you automatically see the lower regional rate at checkout. Premium subscribers receive an additional discount on all service fees.' },
  { id: 'd1', category: 'documents', question: 'What file types can I upload to my Credential Library?', answer: 'You can upload PDF, DOCX, JPG, and PNG files. Each file must be under 10 MB. For best results, upload PDFs for text documents (CV, transcripts) and high-resolution JPG or PNG for passport photos.' },
  { id: 'd2', category: 'documents', question: 'Can I replace a document I have already uploaded?', answer: 'Yes. On any document card in your Credential Library, click Replace to upload a new version. The new version keeps the same name and category. Old versions are retained for audit purposes but do not appear in your library.' },
  { id: 'd3', category: 'documents', question: 'How are my documents kept secure?', answer: 'All files are stored in encrypted cloud storage (Cloudflare R2) with access controlled by your authenticated session. Files are never publicly accessible - every download is served through a secure authenticated API endpoint.' },
  { id: 'ac1', category: 'account', question: 'What does the Premium plan include?', answer: 'Premium subscribers get discounted service fees on all applications, access to all opportunity listings without lock restrictions, priority support response, and early access to new features. Premium costs $29/month or $199/year (regional pricing: $12/$99).' },
  { id: 'ac2', category: 'account', question: 'How do I change my email address or password?', answer: 'Go to Profile & Settings from the sidebar. Under the Account section you can update your email and change your password. Email changes require verification of the new address before taking effect.' },
  { id: 'e1', category: 'eligibility', question: 'How does the eligibility check work?', answer: "Before you can apply for any opportunity, we run a short eligibility check - usually 4 to 6 questions specific to that opportunity's requirements. Your answers determine whether you qualify. If you do not pass, we surface similar opportunities you may be eligible for instead." },
  { id: 'e2', category: 'eligibility', question: 'What happens if I fail the eligibility check?', answer: 'You will see a clear explanation of which criteria you did not meet and why. We then recommend similar opportunities that better match your profile. You are not charged anything if you do not pass eligibility.' },
  { id: 't1', category: 'timeline', question: 'How long does the application process take?', answer: 'After payment, allow 3 to 7 working days for our team to complete your application package. Highly competitive or document-heavy applications may take up to 10 working days. You will receive a notification when your application is submitted to the institution.' },
  { id: 't2', category: 'timeline', question: 'When will I hear back from the institution?', answer: 'Response timelines vary by institution and opportunity type. Scholarship decisions typically take 4 to 12 weeks after the programme deadline. Internship and job decisions are usually faster. OppDate has no influence over institutional review timelines, but we surface any updates we receive immediately.' },
]

const CATEGORY_CONFIG: Record<string, { label: string; Icon: LucideIcon; color: string }> = {
  applications: { label: 'Applications', Icon: Briefcase,    color: '#B5530A' },
  payments:     { label: 'Payments',     Icon: CreditCard,   color: '#059669' },
  documents:    { label: 'Documents',    Icon: FileText,     color: '#7A2D05' },
  account:      { label: 'Account',      Icon: HelpCircle,   color: '#7C3AED' },
  eligibility:  { label: 'Eligibility',  Icon: CheckCircle,  color: '#0E7490' },
  timeline:     { label: 'Timeline',     Icon: Clock,        color: '#D97706' },
}

const QUICK_LINKS = [
  { label: 'How applications work',  category: 'applications', desc: 'From eligibility to submission' },
  { label: 'Payment & fees',         category: 'payments',     desc: 'Pricing, refunds, and methods' },
  { label: 'Document requirements',  category: 'documents',    desc: 'What to upload and how' },
  { label: 'Track my application',   category: 'timeline',     desc: 'Status stages explained' },
]

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(24px) saturate(140%)',
  WebkitBackdropFilter: 'blur(24px) saturate(140%)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 4px 24px rgba(139,61,7,0.08), 0 1px 4px rgba(139,61,7,0.04)',
}

function useIsMobile(bp = 640) {
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

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return <>{text}</>
  const q = query.trim()
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} style={{ background: 'rgba(212,132,58,0.18)', borderRadius: 3, padding: '0 2px', color: 'inherit' }}>{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

type AccordionItemProps = {
  item: FaqItem
  open: boolean
  onToggle: () => void
  searchQuery: string
  index: number
}

function AccordionItem({ item, open, onToggle, searchQuery, index }: AccordionItemProps) {
  const [thumbState, setThumbState] = useState<'up' | 'down' | null>(null)
  const [feedbackSent, setFeedbackSent] = useState(false)

  const handleThumb = (val: 'up' | 'down') => {
    if (feedbackSent) return
    setThumbState(val)
    setFeedbackSent(true)
  }

  return (
    <div style={{
      ...glass,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 8,
      animation: 'notifRise 260ms ease-out both',
      animationDelay: `${index * 30}ms`,
    }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          padding: '18px 20px',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          textAlign: 'left',
          gap: 12,
        }}
      >
        <span style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--app-ink)',
          lineHeight: 1.4,
          flex: 1,
        }}>
          {highlightMatch(item.question, searchQuery)}
        </span>
        <ChevronDown
          size={16}
          style={{
            flexShrink: 0,
            color: 'var(--app-helper)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 240ms ease',
          }}
        />
      </button>

      <div style={{
        maxHeight: open ? 600 : 0,
        opacity: open ? 1 : 0,
        overflow: 'hidden',
        transition: 'max-height 260ms cubic-bezier(0.4,0,0.2,1), opacity 200ms ease',
      }}>
        <div style={{ padding: '0 20px 18px' }}>
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            lineHeight: 1.7,
            color: 'var(--app-text-sec)',
            margin: 0,
          }}>
            {highlightMatch(item.answer, searchQuery)}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--app-helper)', marginRight: 4 }}>
              Was this helpful?
            </span>
            <button
              onClick={() => handleThumb('up')}
              disabled={feedbackSent}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                height: 28,
                padding: '0 10px',
                borderRadius: 6,
                border: '1px solid var(--app-hairline)',
                background: thumbState === 'up' ? 'rgba(5,150,105,0.08)' : 'transparent',
                color: thumbState === 'up' ? '#059669' : 'var(--app-helper)',
                cursor: feedbackSent ? 'default' : 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                transition: 'all 150ms ease',
              }}
            >
              <ThumbsUp size={13} />
              <span>Helpful</span>
            </button>
            <button
              onClick={() => handleThumb('down')}
              disabled={feedbackSent}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                height: 28,
                padding: '0 10px',
                borderRadius: 6,
                border: '1px solid var(--app-hairline)',
                background: thumbState === 'down' ? 'rgba(220,38,38,0.07)' : 'transparent',
                color: thumbState === 'down' ? '#DC2626' : 'var(--app-helper)',
                cursor: feedbackSent ? 'default' : 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                transition: 'all 150ms ease',
              }}
            >
              <ThumbsDown size={13} />
              <span>Not helpful</span>
            </button>
            {feedbackSent && (
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--app-helper)', marginLeft: 4 }}>
                Thanks for your feedback
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

type ContactFormProps = { userName: string; userEmail: string }

function ContactForm({ userName, userEmail }: ContactFormProps) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const mob = useIsMobile()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject || !message.trim()) return
    setSending(true)
    setError('')
    try {
      await api.post('/api/v1/support/contact', { subject, message })
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 24px',
        textAlign: 'center',
        animation: 'notifFadeIn 300ms ease',
      }}>
        <div style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: 'rgba(5,150,105,0.10)',
          color: '#059669',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
        }}>
          <CheckCircle size={26} />
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 600, color: 'var(--app-ink)', marginBottom: 6 }}>
          Message sent
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--app-text-sec)' }}>
          We&apos;ll get back to you within 24 hours.
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: mob ? '1fr' : '1fr 1.4fr',
      gap: mob ? 24 : 40,
      padding: mob ? '20px 18px' : '28px 28px',
      alignItems: 'start',
    }}>
      <div>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'rgba(122,45,5,0.08)',
          color: 'var(--app-ginger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
        }}>
          <MessageCircle size={22} />
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: mob ? 17 : 19, fontWeight: 600, color: 'var(--app-ink)', marginBottom: 8 }}>
          Still need help?
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--app-text-sec)', lineHeight: 1.6 }}>
          We typically respond within 24 hours. For urgent issues related to an active application, message us directly through your application thread.
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--app-ink)', marginBottom: 6, letterSpacing: '0.02em' }}>
            Subject
          </label>
          <select
            value={subject}
            onChange={e => setSubject(e.target.value)}
            required
            style={{
              width: '100%',
              height: 42,
              borderRadius: 10,
              border: '1.5px solid var(--app-hairline)',
              background: 'rgba(255,255,255,0.8)',
              padding: '0 12px',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              color: subject ? 'var(--app-ink)' : 'var(--app-helper)',
              outline: 'none',
              appearance: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="" disabled>Select a topic</option>
            <option value="Applications">Applications</option>
            <option value="Payments">Payments</option>
            <option value="Documents">Documents</option>
            <option value="Account & billing">Account &amp; billing</option>
            <option value="Technical issue">Technical issue</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--app-ink)', marginBottom: 6, letterSpacing: '0.02em' }}>
            Message
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
            minLength={10}
            maxLength={5000}
            rows={5}
            placeholder="Describe your issue or question..."
            style={{
              width: '100%',
              borderRadius: 10,
              border: '1.5px solid var(--app-hairline)',
              background: 'rgba(255,255,255,0.8)',
              padding: '10px 12px',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              color: 'var(--app-ink)',
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--app-ginger)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(122,45,5,0.12)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--app-hairline)'; e.currentTarget.style.boxShadow = 'none' }}
          />
        </div>

        {error && (
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: '#DC2626',
            background: 'rgba(220,38,38,0.06)',
            border: '1px solid rgba(220,38,38,0.15)',
            borderRadius: 8,
            padding: '10px 14px',
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={sending || !subject || !message.trim()}
          style={{
            width: '100%',
            height: 44,
            borderRadius: 10,
            border: 'none',
            background: sending || !subject || !message.trim()
              ? 'rgba(122,45,5,0.3)'
              : 'linear-gradient(135deg, #9B3B0A 0%, #7A2D05 100%)',
            color: '#fff',
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 600,
            cursor: sending || !subject || !message.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'opacity 150ms ease',
          }}
        >
          {sending ? (
            <>
              <span style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                display: 'inline-block',
                animation: 'spin 600ms linear infinite',
              }} />
              Sending...
            </>
          ) : (
            <>
              <Send size={15} />
              Send message
            </>
          )}
        </button>
      </form>
    </div>
  )
}

export function HelpSupportPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const faqRef = useRef<HTMLDivElement>(null)
  const contactRef = useRef<HTMLDivElement>(null)
  const mob = useIsMobile()
  const { name } = useUser()

  const firstName = name ? name.trim().split(/\s+/)[0] : 'there'

  const filteredFaq = useMemo(() => {
    return FAQ_DATA.filter(item => {
      const matchCat = activeCategory === 'all' || item.category === activeCategory
      const q = searchQuery.trim().toLowerCase()
      const matchSearch = !q || item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)
      return matchCat && matchSearch
    })
  }, [searchQuery, activeCategory])

  useEffect(() => {
    if (openItemId && !filteredFaq.find(i => i.id === openItemId)) {
      setOpenItemId(filteredFaq[0]?.id ?? null)
    }
  }, [filteredFaq, openItemId])

  const handleQuickLink = useCallback((category: string) => {
    setActiveCategory(category)
    setSearchQuery('')
    setTimeout(() => {
      faqRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }, [])

  const scrollToContact = useCallback(() => {
    contactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: mob ? '24px 16px 64px' : '32px 24px 72px' }}>
      <style>{`
        @keyframes notifRise {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes notifFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Hero */}
      <div style={{ marginBottom: mob ? 20 : 28 }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: mob ? 26 : 32,
          fontWeight: 700,
          color: 'var(--app-ink)',
          letterSpacing: '-0.01em',
          margin: '0 0 8px',
        }}>
          Hi {firstName}, how can we help?
        </h1>
        <p style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 15,
          color: 'var(--app-text-sec)',
          margin: '0 0 20px',
          lineHeight: 1.5,
        }}>
          Find answers to common questions or get in touch with our team.
        </p>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--app-helper)',
            pointerEvents: 'none',
            display: 'flex',
          }}>
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search for help..."
            style={{
              width: '100%',
              height: mob ? 44 : 52,
              borderRadius: 14,
              border: '1.5px solid var(--app-hairline)',
              background: 'rgba(255,255,255,0.85)',
              paddingLeft: 42,
              paddingRight: searchQuery ? 42 : 16,
              fontFamily: 'var(--font-sans)',
              fontSize: 15,
              color: 'var(--app-ink)',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 150ms ease, box-shadow 150ms ease',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--app-ginger)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(122,45,5,0.12)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--app-hairline)'; e.currentTarget.style.boxShadow = 'none' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--app-helper)',
                display: 'flex',
                padding: 4,
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Quick links */}
      {!searchQuery && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: mob ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: mob ? 10 : 14,
          marginBottom: mob ? 28 : 40,
        }}>
          {QUICK_LINKS.map(link => {
            const cfg = CATEGORY_CONFIG[link.category]
            const Icon = cfg.Icon
            return (
              <button
                key={link.category}
                onClick={() => handleQuickLink(link.category)}
                style={{
                  ...glass,
                  borderRadius: 14,
                  padding: mob ? '14px 14px' : '18px 16px',
                  cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.7)',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  transition: 'transform 180ms ease, box-shadow 180ms ease',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.transform = 'translateY(-2px)'
                  el.style.boxShadow = '0 8px 28px rgba(139,61,7,0.12), 0 2px 6px rgba(139,61,7,0.06)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.transform = 'none'
                  el.style.boxShadow = '0 4px 24px rgba(139,61,7,0.08), 0 1px 4px rgba(139,61,7,0.04)'
                }}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: `${cfg.color}18`,
                  color: cfg.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon size={16} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--app-ink)', lineHeight: 1.3 }}>
                    {link.label}
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--app-helper)', marginTop: 2 }}>
                    {link.desc}
                  </div>
                </div>
                <ChevronRight size={14} style={{ color: 'var(--app-helper)', alignSelf: 'flex-end', marginTop: 'auto' }} />
              </button>
            )
          })}
        </div>
      )}

      {/* FAQ section */}
      <div ref={faqRef}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: mob ? 18 : 20,
            fontWeight: 600,
            color: 'var(--app-ink)',
            margin: 0,
          }}>
            Frequently asked questions
          </h2>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all', ...Object.keys(CATEGORY_CONFIG)].map(cat => {
              const active = activeCategory === cat
              const label = cat === 'all' ? 'All' : CATEGORY_CONFIG[cat].label
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    height: 28,
                    padding: '0 12px',
                    borderRadius: 999,
                    border: active ? 'none' : '1px solid var(--app-hairline)',
                    background: active ? 'var(--app-ginger)' : 'transparent',
                    color: active ? '#fff' : 'var(--app-text-sec)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 140ms ease',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {filteredFaq.length === 0 ? (
          <div style={{
            ...glass,
            borderRadius: 16,
            padding: '40px 24px',
            textAlign: 'center',
            animation: 'notifFadeIn 250ms ease',
          }}>
            <div style={{ color: 'var(--app-helper)', opacity: 0.5, marginBottom: 14 }}>
              <Search size={32} />
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, color: 'var(--app-ink)', marginBottom: 6 }}>
              No results for &quot;{searchQuery}&quot;
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--app-text-sec)', marginBottom: 18 }}>
              Try a different search or browse by category.
            </div>
            <button
              onClick={scrollToContact}
              style={{
                height: 38,
                padding: '0 18px',
                borderRadius: 8,
                border: '1.5px solid var(--app-ginger)',
                background: 'transparent',
                color: 'var(--app-ginger)',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Ask us directly
            </button>
          </div>
        ) : (
          <div>
            {filteredFaq.map((item, i) => (
              <AccordionItem
                key={item.id}
                item={item}
                open={openItemId === item.id}
                onToggle={() => setOpenItemId(openItemId === item.id ? null : item.id)}
                searchQuery={searchQuery}
                index={i}
              />
            ))}
          </div>
        )}
      </div>

      {/* Contact section */}
      <div ref={contactRef} style={{ marginTop: mob ? 36 : 56 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 16,
          userSelect: 'none',
        }}>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--app-helper)',
            whiteSpace: 'nowrap',
          }}>
            Contact support
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--app-hairline)' }} />
        </div>

        <div style={{ ...glass, borderRadius: 16, overflow: 'hidden' }}>
          <ContactForm userName={name} userEmail="" />
        </div>
      </div>
    </div>
  )
}
