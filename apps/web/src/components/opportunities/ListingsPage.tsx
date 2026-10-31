'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AdBanner } from '@/components/ui/AdBanner'
import { format, parseISO } from 'date-fns'
import {
  Bookmark, Clock, ChevronDown, X, ArrowRight, ArrowLeft,
  Check, Globe, ExternalLink, ClipboardList, MessageCircle,
  CheckCircle, Info, Lock, BookmarkPlus, Trash2,
  AlertTriangle, XCircle, Sparkles, ChevronRight, ChevronLeft,
  BellRing, BellOff,
} from 'lucide-react'
import { GuidePanel } from '@/components/guide/GuidePanel'
import { UpgradeModal } from '@/components/premium/UpgradeModal'
import { useInfiniteListings, type ListingFilters, type SortOption } from '@/hooks/useInfiniteListings'
import type { OpportunityListItem } from '@/components/opportunities/types'
import { api } from '@/lib/api'
import { keys, fetchers, type ApiSavedSearch, type ApiSavedOpportunity, type ApiUser, type ApiRecommendation } from '@/lib/queries'

// Eligibility check data (Chevening-specific)
const QUESTIONS = [
  { question: 'Are you a citizen of a Chevening-eligible country?', options: [{ text: 'Yes', score: 0 }, { text: 'No', score: -100 }, { text: 'I am not sure', score: -30 }] },
  { question: 'What is your current level of education?', options: [{ text: 'Undergraduate degree (in progress)', score: -30 }, { text: 'Undergraduate degree (completed)', score: 0 }, { text: 'Postgraduate degree', score: 0 }, { text: 'PhD', score: 0 }] },
  { question: 'How many years of work or volunteer experience do you have?', options: [{ text: 'Less than 1 year', score: -100 }, { text: '1 to 2 years', score: -30 }, { text: '2 to 3 years', score: 0 }, { text: 'More than 3 years', score: 0 }] },
  { question: 'Have you secured admission to a UK university?', options: [{ text: 'Yes, confirmed', score: 0 }, { text: 'Applied, awaiting decision', score: -30 }, { text: 'Not yet', score: -30 }] },
  { question: 'Will you return to your home country for two years after the programme?', options: [{ text: 'Yes', score: 0 }, { text: 'No', score: -100 }, { text: 'Undecided', score: -30 }] },
]

const COMPLIANCE_TIPS: Record<string, string> = {
  A: 'OppDate will prepare and submit this application on your behalf. You do not need to take any action after payment.',
  B: 'OppDate will prepare your complete application package. You will log in to the institution\'s portal to complete the final submission when your package is ready.',
}

const INK = '#2A1206'
const TEXT_SEC = '#8C6A55'
const TEXT_TER = '#6B6660'
const GINGER = '#7A2D05'
const GINGER_MID = '#B5530A'
const HAIRLINE = 'rgba(42,18,6,0.08)'
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

type FilterId = 'All' | 'Scholarships' | 'Internships' | 'Jobs' | 'Training' | 'Funded only'
const FILTERS: FilterId[] = ['All', 'Scholarships', 'Internships', 'Jobs', 'Training', 'Funded only']

const FILTER_TO_PARAM: Record<FilterId, string> = {
  'All': '',
  'Scholarships': 'scholarships',
  'Internships': 'internships',
  'Jobs': 'jobs',
  'Training': 'training',
  'Funded only': 'funded',
}
const PARAM_TO_FILTER: Record<string, FilterId> = Object.fromEntries(
  Object.entries(FILTER_TO_PARAM).map(([k, v]) => [v, k as FilterId])
)

interface Opportunity {
  id: string
  isLocked?: boolean
  org: string
  orgInit: string
  orgLogoUrl: string | null
  country: string
  flag: string
  title: string
  tagline: string
  type: string
  eligibility: string[]
  daysLeft: number | null
  closesLabel: string
  closeDate: string
  award: string | null
  awardBig: string | null
  applyForMe: boolean
  applyDisabledNote: string | null
  sourceUrl: string | null
  compliance: 'A' | 'B' | null
  description: string
  forWho: string
  offered: string
  documents: string[]
  fee: { service: string; institution: string; total: string }
  eligibilityCriteria: { question: string; options: { text: string; score: number }[] }[]
}

const FILTER_TO_API: Record<string, Partial<ListingFilters>> = {
  All:          {},
  Scholarships: { type: 'scholarship' },
  Internships:  { type: 'internship' },
  Jobs:         { type: 'entry_level_job' },
  Training:     { type: 'training_bootcamp' },
  'Funded only': { funded: true },
}

function deriveFlag(countryCode: string | null | undefined): string {
  if (!countryCode) return 'GLOBE'
  try {
    return String.fromCodePoint(...[...countryCode.toUpperCase()].map(c => 127397 + c.charCodeAt(0)))
  } catch {
    return 'GLOBE'
  }
}

function listItemToOpportunity(item: OpportunityListItem): Opportunity {
  return {
    id:               item.id,
    isLocked:         item.isLocked ?? false,
    org:              item.org,
    orgInit:          item.orgInit,
    orgLogoUrl:       item.institutionLogoUrl ?? null,
    country:          item.country ?? '',
    flag:             deriveFlag(null),
    title:            item.title,
    tagline:          item.summary ?? '',
    type:             item.type,
    eligibility:      item.eligibility ?? [],
    daysLeft:         item.closesIn ?? null,
    closesLabel:      item.closes ?? '',
    closeDate:        item.closes ?? '',
    award:            item.funding?.label ?? null,
    awardBig:         item.funding?.label ?? null,
    applyForMe:       item.applyForMe ?? false,
    applyDisabledNote: null,
    sourceUrl:        null,
    compliance:       null,
    description:      item.description ?? '',
    forWho:           '',
    offered:          '',
    documents:        [],
    fee:              { service: 'Contact us', institution: '-', total: 'Contact us' },
    eligibilityCriteria: [],
  }
}

interface ApiDetailRow {
  id: string
  slug: string
  title: string
  summary: string
  description: string
  whoItsFor: string
  institution: string
  country: string
  type: string
  requiredDocuments: string[]
  whatIsOffered: string
  applyDisabledNote: string | null
  complianceCategory: 'A' | 'B' | null
  oppDateApply: boolean
  deadline: string
  awardValueUsd: number | null
  oppdateServiceFeeUsd: number
  institutionFeeUsd: number
  tags: string[]
  institutionLogoUrl: string | null
  eligibilityCriteria: { question: string; options: (string | { text: string; score: number })[] }[]
}

function detailRowToOpportunity(row: ApiDetailRow): Opportunity {
  const daysLeft = Math.ceil((new Date(row.deadline).getTime() - Date.now()) / 86400000)
  const closesLabel = format(parseISO(row.deadline), 'EEE, d MMM')
  const awardLabel = row.awardValueUsd
    ? row.awardValueUsd >= 100000
      ? 'Fully funded'
      : `USD ${(row.awardValueUsd / 100).toLocaleString()}`
    : null

  const svc = row.oppdateServiceFeeUsd
    ? `USD ${(row.oppdateServiceFeeUsd / 100).toFixed(0)}`
    : 'Contact us'
  const inst = row.institutionFeeUsd
    ? `USD ${(row.institutionFeeUsd / 100).toFixed(0)}`
    : 'USD 0'
  const total = (row.oppdateServiceFeeUsd || row.institutionFeeUsd)
    ? `USD ${((row.oppdateServiceFeeUsd + row.institutionFeeUsd) / 100).toFixed(0)}`
    : 'Contact us'

  return {
    id:               row.id,
    org:              row.institution,
    orgInit:          row.institution.slice(0, 2).toUpperCase(),
    orgLogoUrl:       row.institutionLogoUrl ?? null,
    country:          row.country,
    flag:             deriveFlag(null),
    title:            row.title,
    tagline:          row.summary,
    type:             row.type,
    eligibility:      [],
    daysLeft:         daysLeft >= 0 ? daysLeft : null,
    closesLabel,
    closeDate:        closesLabel,
    award:            awardLabel,
    awardBig:         awardLabel,
    applyForMe:       row.oppDateApply,
    applyDisabledNote: row.applyDisabledNote ?? null,
    sourceUrl:        null,
    compliance:       row.complianceCategory ?? null,
    description:      row.description,
    forWho:           row.whoItsFor ?? '',
    offered:          row.whatIsOffered,
    documents:        Array.isArray(row.requiredDocuments)
      ? row.requiredDocuments.map((d: unknown) =>
          typeof d === 'string' ? d : (d as Record<string, unknown>)?.type as string ?? String(d)
        )
      : [],
    fee:              { service: svc, institution: inst, total },
    eligibilityCriteria: Array.isArray(row.eligibilityCriteria)
      ? (row.eligibilityCriteria as { question: string; options: (string | { text: string; score: number })[] }[])
          .filter(c => c.question)
          .map(c => ({
            question: c.question,
            options: c.options.map(o => typeof o === 'string' ? { text: o, score: 0 } : o),
          }))
      : [],
  }
}

function FlagIcon({ flag }: { flag: string }) {
  if (flag === 'GLOBE') return <Globe size={15} style={{ color: TEXT_SEC }} />
  return <span style={{ fontSize: 15, lineHeight: 1 }}>{flag}</span>
}

function EligibilityRow({ items }: { items: string[] }) {
  if (!items || !items.length) return null
  let shown = items
  let extra = 0
  if (items.length > 3) { shown = items.slice(0, 2); extra = items.length - 2 }
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', flexShrink: 0,
    fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, lineHeight: 1,
    padding: '3px 10px', borderRadius: 999,
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 24, overflow: 'hidden', marginTop: 6 }}>
      {shown.map((e, i) => (
        <span key={i} style={{ ...base, background: '#D4843A', color: '#FFFFFF' }}>{e}</span>
      ))}
      {extra > 0 && (
        <span style={{ ...base, background: 'transparent', color: '#D4843A', border: '1px solid #D4843A' }}>+{extra} more</span>
      )}
    </div>
  )
}

function OpportunityCard({
  data, saved, active, onSave, onClick,
}: {
  data: Opportunity; saved: boolean; active: boolean
  onSave: (id: string) => void; onClick: () => void
}) {
  const [hover, setHover] = useState(false)
  const [pressed, setPressed] = useState(false)

  const isExpired = data.daysLeft === null
  const deadlineLabel = !isExpired ? `${data.daysLeft} days left` : 'Deadline passed'
  const isFunded = data.award === 'Fully funded'
  const hasAmount = data.award && !isFunded

  const baseShadow = '0 2px 14px rgba(90,40,15,0.10), 0 1px 3px rgba(90,40,15,0.06)'
  const hoverShadow = '0 6px 24px rgba(90,40,15,0.16), 0 2px 6px rgba(90,40,15,0.08)'
  const accent = 'inset 3px 0 0 #7A2D05'

  return (
    <article
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        position: 'relative', width: '100%', boxSizing: 'border-box',
        borderRadius: 16, padding: 28, cursor: 'pointer',
        background: active ? 'rgba(255,247,240,0.72)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${hover ? 'rgba(122,45,5,0.18)' : 'rgba(255,255,255,0.5)'}`,
        boxShadow: active
          ? `${accent}, ${hover ? hoverShadow : baseShadow}`
          : (hover ? hoverShadow : baseShadow),
        transform: pressed ? 'scale(0.98)' : (hover && !active ? 'translateY(-2px)' : 'translateY(0)'),
        transition: `transform 180ms ${EASE}, box-shadow 180ms ${EASE}, border-color 180ms ${EASE}`,
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Row 1: org + bookmark */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <span style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: '#F0EAE4', overflow: 'hidden',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-sans)', fontWeight: 600,
            fontSize: data.orgInit.length > 2 ? 9 : 10, color: INK,
          }}>
            {data.orgLogoUrl
              ? <img src={data.orgLogoUrl} alt={data.org} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : data.orgInit}
          </span>
          <span style={{
            marginLeft: 8, minWidth: 0,
            fontFamily: 'var(--font-sans)', fontSize: 15, color: TEXT_SEC,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{data.org}</span>
        </div>
        <button
          aria-label={saved ? 'Saved' : 'Save'}
          onClick={(e) => { e.stopPropagation(); onSave(data.id) }}
          style={{
            width: 32, height: 32, flexShrink: 0, marginRight: -6,
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: saved ? GINGER : '#C4A882',
          }}
        >
          <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Row 2: title */}
      <h3 style={{
        margin: '10px 0 0', fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 22,
        lineHeight: 1.3, color: INK,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>{data.title}</h3>

      {/* Row 2b: tagline */}
      <p style={{
        margin: '5px 0 0', fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: 1.4, color: '#7C6657',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{data.tagline}</p>

      {/* Row 3: country + type + eligibility */}
      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 14, color: TEXT_SEC }}>
            <FlagIcon flag={data.flag} />{data.country}
          </span>
          <span style={{ color: '#C4A882' }}>{'\u00B7'}</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1,
            padding: '2px 10px', borderRadius: 999,
            border: '1px solid #0E7490', color: '#0E7490', background: 'transparent',
          }}>{data.type}</span>
        </div>
        <EligibilityRow items={data.eligibility} />
      </div>

      {/* Row 4: deadline + close date + award */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, lineHeight: 1,
            padding: '4px 10px', borderRadius: 999,
            ...(isExpired
              ? { background: 'rgba(90,80,70,0.08)', border: '1px solid rgba(90,80,70,0.18)', color: '#9A8270' }
              : { background: 'rgba(212,132,58,0.12)', border: '1px solid rgba(212,132,58,0.3)', color: GINGER }),
          }}>
            <Clock size={12} style={{ marginRight: 4 }} />{deadlineLabel}
          </span>
          {data.closeDate && !isExpired && (
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: '#9A8270', whiteSpace: 'nowrap' }}>
              {data.closeDate}
            </span>
          )}
        </div>
        {isFunded && (
          <span style={{
            flexShrink: 0, display: 'inline-flex', alignItems: 'center',
            fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, lineHeight: 1,
            padding: '4px 10px', borderRadius: 999,
            background: 'rgba(14,116,144,0.08)', border: '1px solid rgba(14,116,144,0.2)', color: '#0E7490',
          }}>Fully funded</span>
        )}
        {hasAmount && (
          <span style={{ flexShrink: 0, fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: INK, whiteSpace: 'nowrap' }}>
            {data.award}
          </span>
        )}
      </div>
    </article>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em',
      textTransform: 'uppercase', color: TEXT_TER, marginBottom: 10,
    }}>{children}</div>
  )
}

// Maps a concern criterion label to a contextual action
function getConcernAction(criterion: string, onOpenGuide?: () => void): { label: string; href?: string; onClick?: () => void } {
  const lc = criterion.toLowerCase()
  if (lc.includes('work') || lc.includes('experience')) return { label: 'Add work experience to profile', href: '/profile' }
  if (lc.includes('language') || lc.includes('ielts') || lc.includes('toefl') || lc.includes('english')) return { label: 'Add language score to profile', href: '/profile' }
  if (lc.includes('degree') || lc.includes('education') || lc.includes('level') || lc.includes('undergraduate') || lc.includes('postgraduate')) return { label: 'Browse level-matched opportunities', href: '/opportunities' }
  if (lc.includes('citizen') || lc.includes('country') || lc.includes('national')) return { label: 'Check country-specific opportunities', href: '/opportunities' }
  if (lc.includes('age')) return { label: 'Find opportunities with no age limit', href: '/opportunities' }
  if (lc.includes('admission') || lc.includes('university') || lc.includes('enrol')) {
    if (onOpenGuide) return { label: 'Ask OppDate Guide about timing', onClick: onOpenGuide }
    return { label: 'Talk to OppDate Guide', href: '/opportunities' }
  }
  return { label: 'Explore similar opportunities', href: '/opportunities' }
}

interface AssessmentResult {
  summary: string
  concerns: { criterion: string; detail: string }[]
}

function EligibilityModal({
  onClose, onApply, criteria, opportunityTitle, opportunityType, onOpenGuide,
}: {
  onClose: () => void
  onApply: () => void
  criteria: { question: string; options: { text: string; score: number }[] }[]
  opportunityTitle?: string
  opportunityType?: string
  onOpenGuide?: () => void
}) {
  const router = useRouter()
  const questions = (criteria.length > 0 ? criteria : QUESTIONS).map(q => ({
    ...q,
    options: q.options.map(o => typeof (o as unknown) === 'string' ? { text: o as unknown as string, score: 0 } : o),
  }))
  const [step, setStep] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const [answers, setAnswers] = useState<{ optIdx: number; score: number }[]>([])
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null)
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null)
  const [assessLoading, setAssessLoading] = useState(false)
  const [iconReady, setIconReady] = useState(false)
  const [contentReady, setContentReady] = useState(false)
  const [hoveredConcern, setHoveredConcern] = useState<number | null>(null)
  const total = questions.length
  const done = answers.length === total

  const handleAnswer = (optIdx: number, score: number) => {
    if (selectedOpt !== null) return
    setSelectedOpt(optIdx)
    const next = [...answers, { optIdx, score }]
    setTimeout(() => {
      setAnswers(next)
      if (next.length < total) {
        setStep(s => s + 1)
        setAnimKey(k => k + 1)
        setSelectedOpt(null)
      }
    }, 260)
  }

  const totalScore = done ? answers.reduce((sum, a) => sum + a.score, 0) : null
  const eligibilityTier: 'eligible' | 'borderline' | 'ineligible' | null =
    totalScore === null ? null
    : totalScore >= 0 ? 'eligible'
    : totalScore > -50 ? 'borderline'
    : 'ineligible'

  const concernCount = answers.filter(a => a.score < 0).length

  // Fire AI assessment when quiz completes with non-eligible verdict
  useEffect(() => {
    if (!done || eligibilityTier === 'eligible' || eligibilityTier === null) {
      if (done) {
        // Eligible - icon pops in immediately, no loading needed
        requestAnimationFrame(() => setIconReady(true))
      }
      return
    }

    setAssessLoading(true)
    requestAnimationFrame(() => setIconReady(true))

    const responses = answers.map((a, i) => ({
      question: questions[i].question,
      answer: questions[i].options[a.optIdx].text,
      score: a.score,
    }))

    api.post<{ data: AssessmentResult }>('/api/v1/ai/eligibility-assessment', {
      opportunityTitle: opportunityTitle ?? 'this opportunity',
      opportunityType: opportunityType ?? 'opportunity',
      responses,
      verdict: eligibilityTier,
    })
      .then(res => {
        setAssessment(res.data?.data ?? null)
      })
      .catch(() => {
        // Silently fall back - generic text will show
      })
      .finally(() => {
        setAssessLoading(false)
        setTimeout(() => setContentReady(true), 60)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  // For eligible - content is ready immediately
  useEffect(() => {
    if (done && eligibilityTier === 'eligible') {
      setTimeout(() => setContentReady(true), 80)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  const tierConfig = eligibilityTier ? {
    eligible: {
      accent: '#059669',
      accentBg: 'rgba(5,150,105,0.08)',
      accentRing: 'rgba(5,150,105,0.18)',
      icon: <CheckCircle size={30} style={{ color: '#059669' }} />,
      title: 'You appear to be eligible',
      fallbackBody: 'Based on your answers, you meet the key criteria for this opportunity. Apply now, or talk to OppDate Guide for a deeper assessment.',
      detail: `${total} of ${total} criteria met`,
      showApply: true,
      closeLabel: 'Close',
    },
    borderline: {
      accent: '#D4843A',
      accentBg: 'rgba(212,132,58,0.08)',
      accentRing: 'rgba(212,132,58,0.20)',
      icon: <AlertTriangle size={30} style={{ color: '#D4843A' }} />,
      title: 'You may not meet all requirements',
      fallbackBody: 'Your answers suggest you may fall short on one or more criteria. You can still apply, but we recommend speaking with OppDate Guide first.',
      detail: `${concernCount} concern${concernCount !== 1 ? 's' : ''} flagged`,
      showApply: true,
      closeLabel: 'Explore other opportunities',
    },
    ineligible: {
      accent: '#BE3C30',
      accentBg: 'rgba(190,60,48,0.08)',
      accentRing: 'rgba(190,60,48,0.18)',
      icon: <XCircle size={30} style={{ color: '#BE3C30' }} />,
      title: 'You do not appear to be eligible',
      fallbackBody: 'Based on your answers, you do not meet the key requirements for this opportunity. Explore other opportunities or speak with OppDate Guide for alternatives.',
      detail: `${concernCount} disqualifying answer${concernCount !== 1 ? 's' : ''}`,
      showApply: false,
      closeLabel: 'Explore other opportunities',
    },
  }[eligibilityTier] : null

  const needsGapAnalysis = eligibilityTier === 'borderline' || eligibilityTier === 'ineligible'

  const EASE_SOFT = 'cubic-bezier(0.22,1,0.36,1)'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(20,10,4,0.55)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <style>{`
        @keyframes eligSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes eligFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes eligIconPop {
          0%   { transform: scale(0.75); opacity: 0; }
          60%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes eligRingExpand {
          from { transform: scale(0.7); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes eligShimmer {
          0%,100% { background-position: 100% 0 }
          50%     { background-position: 0 0 }
        }
        @keyframes eligDividerDraw {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        .elig-opt-btn {
          width: 100%; text-align: left;
          padding: 13px 16px;
          background: rgba(255,255,255,0.6);
          border: 1.5px solid rgba(122,45,5,0.14);
          border-radius: 14px; cursor: pointer;
          transition: border-color 150ms, box-shadow 150ms, background 150ms;
          display: flex; align-items: center; gap: 12px;
          font-family: var(--font-sans);
        }
        .elig-opt-btn:not(:disabled):hover {
          border-color: rgba(122,45,5,0.32);
          background: rgba(254,242,230,0.8);
          box-shadow: 0 2px 10px rgba(122,45,5,0.08);
        }
        .elig-opt-btn:disabled { cursor: default; }
        .elig-opt-btn.selected {
          border-color: #7A2D05;
          background: rgba(122,45,5,0.06);
        }
        .elig-opt-btn.dimmed { opacity: 0.4; }
        .elig-radio {
          width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
          border: 2px solid rgba(122,45,5,0.25);
          background: transparent;
          display: flex; align-items: center; justify-content: center;
          transition: all 150ms;
        }
        .elig-opt-btn.selected .elig-radio {
          border-color: #7A2D05; background: #7A2D05;
        }
        .elig-opt-label {
          font-size: 14px; font-weight: 500;
          color: #2A1206; line-height: 1.4;
        }
        .elig-opt-btn.selected .elig-opt-label { color: #7A2D05; font-weight: 600; }
        .elig-concern-action:hover { opacity: 1 !important; }
        .elig-concern-action:hover .elig-arrow { transform: translateX(3px) !important; }
      `}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460,
          margin: '0 20px',
          background: 'linear-gradient(160deg, #FDF7F0 0%, #FDF2E8 100%)',
          borderRadius: 28,
          border: '1px solid rgba(200,150,100,0.18)',
          boxShadow: '0 32px 80px rgba(60,20,5,0.30), 0 2px 0 rgba(255,255,255,0.8) inset',
          padding: '30px 28px 26px',
          display: 'flex', flexDirection: 'column', gap: 0,
          animation: 'eligFadeIn 280ms cubic-bezier(0.22,1,0.36,1) both',
          maxHeight: '88vh', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <h3 style={{ margin: '0 0 3px', fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 700, color: INK, lineHeight: 1.2 }}>
              Check your eligibility
            </h3>
            {!done && (
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: TEXT_SEC }}>
                Question {Math.min(step + 1, total)} of {total}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(42,18,6,0.06)', border: 'none', cursor: 'pointer', color: TEXT_SEC, display: 'flex', padding: 7, borderRadius: 10, marginTop: 2, flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Step dots */}
        {!done && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 26, alignItems: 'center' }}>
            {questions.map((_, i) => {
              const isCompleted = i < answers.length
              const isActive = i === step
              return (
                <div key={i} style={{
                  borderRadius: 999,
                  transition: 'all 300ms cubic-bezier(0.22,1,0.36,1)',
                  width: isActive ? 24 : 8,
                  height: 8,
                  background: isCompleted ? GINGER : isActive ? GINGER : 'rgba(122,45,5,0.15)',
                  opacity: isCompleted ? 0.5 : 1,
                }} />
              )
            })}
          </div>
        )}

        {/* Quiz questions */}
        {!done ? (
          <div key={animKey} style={{ animation: 'eligSlideUp 260ms cubic-bezier(0.22,1,0.36,1) both' }}>
            <div style={{
              position: 'relative',
              background: 'rgba(122,45,5,0.04)',
              borderRadius: 16,
              padding: '18px 18px 20px',
              marginBottom: 14,
              border: '1px solid rgba(122,45,5,0.07)',
            }}>
              <div style={{
                position: 'absolute', top: -20, right: -20, width: 120, height: 120,
                borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,132,58,0.10) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />
              <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600, lineHeight: 1.45, color: INK, position: 'relative' }}>
                {questions[step].question}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {questions[step].options.map((opt, i) => {
                const sel = selectedOpt === i
                const dimmed = selectedOpt !== null && !sel
                return (
                  <button
                    key={i}
                    className={`elig-opt-btn${sel ? ' selected' : ''}${dimmed ? ' dimmed' : ''}`}
                    disabled={selectedOpt !== null}
                    onClick={() => handleAnswer(i, opt.score)}
                  >
                    <span className="elig-radio">
                      {sel && (
                        <svg width={10} height={10} viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="elig-opt-label">{opt.text}</span>
                  </button>
                )
              })}
            </div>
          </div>

        ) : tierConfig ? (
          /* Result screen */
          <div style={{ animation: 'eligSlideUp 320ms cubic-bezier(0.22,1,0.36,1) both', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, textAlign: 'center' }}>

            {/* Icon with layered glow rings */}
            <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: tierConfig.accentBg,
                border: `1.5px solid ${tierConfig.accentRing}`,
                animation: iconReady ? `eligRingExpand 360ms ${EASE_SOFT} both` : 'none',
              }} />
              <div style={{
                position: 'absolute', inset: -8, borderRadius: '50%',
                border: `1px solid ${tierConfig.accentRing}`,
                opacity: 0.5,
                animation: iconReady ? `eligRingExpand 360ms ${EASE_SOFT} 80ms both` : 'none',
              }} />
              <div style={{ animation: iconReady ? `eligIconPop 420ms cubic-bezier(0.34,1.56,0.64,1) both` : 'none' }}>
                {tierConfig.icon}
              </div>
            </div>

            <h4 style={{ margin: '0 0 10px', fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: INK, lineHeight: 1.2 }}>
              {tierConfig.title}
            </h4>

            {/* Summary - skeleton while AI loads, real text after */}
            <div style={{ width: '100%', marginBottom: 8, minHeight: 66 }}>
              {assessLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                  {[100, 88, 72].map((w, i) => (
                    <div key={i} style={{
                      height: 13, borderRadius: 6, width: `${w}%`,
                      background: 'linear-gradient(90deg, rgba(122,45,5,0.06) 25%, rgba(122,45,5,0.11) 50%, rgba(122,45,5,0.06) 75%)',
                      backgroundSize: '400% 100%',
                      animation: 'eligShimmer 1.4s ease-in-out infinite',
                    }} />
                  ))}
                </div>
              ) : (
                <p style={{
                  margin: 0, fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.65,
                  color: TEXT_SEC, maxWidth: 340,
                  opacity: contentReady ? 1 : 0,
                  transition: 'opacity 200ms ease',
                }}>
                  {assessment?.summary ?? tierConfig.fallbackBody}
                </p>
              )}
            </div>

            {/* Verdict pill */}
            <span style={{
              display: 'inline-block', marginBottom: needsGapAnalysis ? 24 : 22,
              fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 600,
              color: tierConfig.accent, background: tierConfig.accentBg,
              border: `1px solid ${tierConfig.accentRing}`,
              padding: '3px 12px', borderRadius: 999,
              opacity: contentReady ? 1 : 0,
              transition: 'opacity 200ms ease 60ms',
            }}>
              {tierConfig.detail}
            </span>

            {/* Gap analysis section - borderline and ineligible only */}
            {needsGapAnalysis && (
              <div style={{
                width: '100%', textAlign: 'left', marginBottom: 20,
                opacity: contentReady ? 1 : 0,
                transition: 'opacity 200ms ease 100ms',
              }}>
                {/* "What you're missing" divider */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{
                    flex: 1, height: 1,
                    background: `linear-gradient(to right, ${tierConfig.accentRing}, transparent)`,
                    transformOrigin: 'left',
                    animation: contentReady ? `eligDividerDraw 300ms ease-out both` : 'none',
                  }} />
                  <span style={{
                    padding: '0 10px', fontFamily: 'var(--font-sans)', fontSize: 10.5,
                    fontWeight: 700, color: tierConfig.accent,
                    letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    What you&apos;re missing
                  </span>
                  <div style={{
                    flex: 1, height: 1,
                    background: `linear-gradient(to left, ${tierConfig.accentRing}, transparent)`,
                    transformOrigin: 'right',
                    animation: contentReady ? `eligDividerDraw 300ms ease-out both` : 'none',
                  }} />
                </div>

                {/* Skeleton concern cards while loading */}
                {assessLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Array.from({ length: concernCount || 2 }).map((_, i) => (
                      <div key={i} style={{
                        height: 72, borderRadius: 12,
                        background: 'linear-gradient(90deg, rgba(122,45,5,0.05) 25%, rgba(122,45,5,0.09) 50%, rgba(122,45,5,0.05) 75%)',
                        backgroundSize: '400% 100%',
                        animation: 'eligShimmer 1.4s ease-in-out infinite',
                      }} />
                    ))}
                  </div>
                ) : assessment?.concerns && assessment.concerns.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {assessment.concerns.map((concern, idx) => {
                      const action = getConcernAction(concern.criterion, onOpenGuide ? () => { onClose(); onOpenGuide() } : undefined)
                      const isHov = hoveredConcern === idx
                      const barColor = eligibilityTier === 'ineligible' ? '#BE3C30' : '#D4843A'
                      const borderColor = eligibilityTier === 'ineligible' ? 'rgba(190,60,48,0.18)' : 'rgba(212,132,58,0.20)'

                      return (
                        <div
                          key={idx}
                          onMouseEnter={() => setHoveredConcern(idx)}
                          onMouseLeave={() => setHoveredConcern(null)}
                          style={{
                            display: 'flex', overflow: 'hidden',
                            borderRadius: 12,
                            border: `1px solid ${isHov ? (eligibilityTier === 'ineligible' ? 'rgba(190,60,48,0.30)' : 'rgba(212,132,58,0.34)') : borderColor}`,
                            background: isHov ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.55)',
                            backdropFilter: 'blur(8px)',
                            boxShadow: isHov ? '0 4px 16px rgba(42,18,6,0.08)' : 'none',
                            opacity: contentReady ? 1 : 0,
                            transform: contentReady ? 'translateY(0)' : 'translateY(10px)',
                            transition: `opacity 240ms ${EASE_SOFT} ${idx * 80}ms, transform 240ms ${EASE_SOFT} ${idx * 80}ms, border-color 140ms ease, background 140ms ease, box-shadow 140ms ease`,
                          }}
                        >
                          {/* Left accent bar */}
                          <div style={{
                            width: isHov ? 5 : 3, flexShrink: 0,
                            background: barColor, borderRadius: '3px 0 0 3px',
                            transition: 'width 140ms ease',
                          }} />

                          {/* Content */}
                          <div style={{ flex: 1, padding: '11px 13px 10px' }}>
                            <div style={{
                              fontFamily: 'var(--font-serif)', fontSize: 13.5, fontWeight: 600,
                              color: INK, lineHeight: 1.3, marginBottom: 4,
                            }}>
                              {concern.criterion}
                            </div>
                            <div style={{
                              fontFamily: 'var(--font-sans)', fontSize: 12.5, color: TEXT_TER,
                              lineHeight: 1.5, marginBottom: 8,
                            }}>
                              {concern.detail}
                            </div>
                            {/* Action link */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              {action.href ? (
                                <a
                                  href={action.href}
                                  className="elig-concern-action"
                                  style={{
                                    fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
                                    color: '#B5530A', textDecoration: 'none',
                                    display: 'inline-flex', alignItems: 'center', gap: 3,
                                    opacity: isHov ? 1 : 0.75,
                                    transition: 'opacity 120ms ease',
                                  }}
                                >
                                  {action.label}
                                  <span className="elig-arrow" style={{ transition: 'transform 120ms ease' }}>
                                    <ArrowRight size={11} />
                                  </span>
                                </a>
                              ) : (
                                <button
                                  onClick={action.onClick}
                                  className="elig-concern-action"
                                  style={{
                                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                                    fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
                                    color: '#B5530A',
                                    display: 'inline-flex', alignItems: 'center', gap: 3,
                                    opacity: isHov ? 1 : 0.75,
                                    transition: 'opacity 120ms ease',
                                  }}
                                >
                                  {action.label}
                                  <span className="elig-arrow" style={{ transition: 'transform 120ms ease' }}>
                                    <ArrowRight size={11} />
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : null}

                {/* Profile completeness nudge */}
                {contentReady && !assessLoading && (
                  <p style={{
                    margin: '14px 0 0', fontFamily: 'var(--font-sans)', fontSize: 12,
                    color: TEXT_TER, textAlign: 'center', lineHeight: 1.5,
                    opacity: contentReady ? 1 : 0,
                    transition: `opacity 200ms ease 300ms`,
                  }}>
                    A complete profile helps OppDate find better matches.{' '}
                    <a href="/profile" style={{ color: GINGER_MID, textDecoration: 'none', fontWeight: 600 }}>
                      Update your profile
                    </a>
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div style={{
              display: 'flex', gap: 10, width: '100%',
              opacity: contentReady ? 1 : 0,
              transition: `opacity 200ms ease ${needsGapAnalysis ? '200ms' : '80ms'}`,
            }}>
              {tierConfig.showApply && (
                <button onClick={onApply} style={{
                  flex: 1, height: 46, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${GINGER_MID}, ${GINGER})`,
                  color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
                  boxShadow: '0 4px 16px rgba(122,45,5,0.28)',
                }}>
                  Apply now
                </button>
              )}
              <button onClick={onClose} style={{
                flex: 1, height: 46, borderRadius: 12, cursor: 'pointer',
                background: 'rgba(42,18,6,0.05)', border: '1.5px solid rgba(42,18,6,0.10)',
                color: INK, fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
              }}>
                {tierConfig.closeLabel}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ComplianceRow({ compliance }: { compliance: 'A' | 'B' }) {
  const [showTip, setShowTip] = useState(false)
  const isA = compliance === 'A'
  const accent = isA ? '#059669' : '#D4843A'
  const label = isA ? 'OppDate submits on your behalf' : 'You complete final submission'
  return (
    <div
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: -10, position: 'relative', cursor: 'default' }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <ClipboardList size={15} style={{ color: accent, flexShrink: 0 }} />
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: accent }}>{label}</span>
      <Info size={13} style={{ color: accent, opacity: 0.6 }} />
      {showTip && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, marginBottom: 8,
          width: 280, padding: '10px 14px',
          background: '#1A0F08', color: '#F5E6D8',
          fontFamily: 'var(--font-sans)', fontSize: 12.5, lineHeight: 1.5,
          borderRadius: 10, boxShadow: '0 8px 24px rgba(26,15,8,0.35)',
          zIndex: 100,
        }}>
          {COMPLIANCE_TIPS[compliance]}
          <div style={{
            position: 'absolute', bottom: -5, left: 20,
            width: 10, height: 10, background: '#1A0F08',
            transform: 'rotate(45deg)',
          }} />
        </div>
      )}
    </div>
  )
}

function OutlineBtn({ children, onClick, full }: { children: React.ReactNode; onClick?: () => void; full?: boolean }) {
  const [h, setH] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      flex: full ? 'none' : 1, width: full ? '100%' : 'auto',
      height: 44, fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
      borderRadius: 10, cursor: 'pointer',
      background: h ? 'rgba(216,204,196,0.22)' : 'transparent',
      border: `1px solid ${HAIRLINE}`, color: INK,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      transition: `background 140ms ${EASE}`,
    }}>{children}</button>
  )
}

function DetailGuideCTA({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="link-slide-underline"
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
        fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 500, color: GINGER_MID,
        lineHeight: 1.6, textAlign: 'center', width: '100%',
        display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6, flexWrap: 'wrap',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <MessageCircle size={15} style={{ flexShrink: 0 }} />
        <span>Have questions about this opportunity?</span>
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
        Ask OppDate Guide <ArrowRight size={14} style={{ transform: hover ? 'translateX(2px)' : 'none', transition: 'transform 150ms ease' }} />
      </span>
    </button>
  )
}

function DetailDrawer({
  data, saved, onSave, onClose, onOpenElig, onOpenGuide, onOpenApply, mobileOpen,
}: {
  data: Opportunity; saved: boolean
  onSave: () => void; onClose: () => void
  onOpenElig: () => void; onOpenGuide: () => void
  onOpenApply: () => void; mobileOpen?: boolean
}) {
  const [applyHover, setApplyHover] = useState(false)
  const [applyLoading, setApplyLoading] = useState(false)
  const hasUrl = !!data.sourceUrl

  return (
    <aside style={{
      position: 'relative', height: '100%', width: '100%', flexShrink: 0,
      background: 'rgba(255,255,255,0.80)',
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      borderLeft: '1px solid rgba(255,255,255,0.6)',
      boxShadow: '-8px 0 40px rgba(139,61,7,0.12)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Sticky header - includes back button on mobile */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        padding: '14px 18px', borderBottom: `1px solid ${HAIRLINE}`,
      }}>
        {mobileOpen && (
          <button
            onClick={onClose}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
              padding: 0, background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
              fontSize: 13, fontWeight: 600, color: GINGER,
              marginRight: 'auto',
            }}
          >
            <ArrowLeft size={16} />Back
          </button>
        )}
        <span style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: '#F0EAE4', overflow: 'hidden',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-sans)', fontWeight: 600,
          fontSize: data.orgInit.length > 2 ? 9 : 10, color: INK,
        }}>
          {data.orgLogoUrl
            ? <img src={data.orgLogoUrl} alt={data.org} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : data.orgInit}
        </span>
        <span style={{
          minWidth: 0, fontFamily: 'var(--font-sans)', fontSize: 13, color: TEXT_SEC,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          ...(!mobileOpen ? { flex: 1 } : {}),
        }}>{data.org}</span>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Title */}
        <h2 style={{
          margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 30,
          lineHeight: 1.22, letterSpacing: '-0.01em', color: INK,
        }}>{data.title}</h2>

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: -6 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-sans)', fontSize: 13, color: TEXT_SEC }}>
            <FlagIcon flag={data.flag} />{data.country}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1,
            padding: '2px 10px', borderRadius: 999,
            border: '1px solid #0E7490', color: '#0E7490', background: 'transparent',
          }}>{data.type}</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1,
            padding: '4px 10px', borderRadius: 999,
            ...(data.daysLeft === null
              ? { color: '#9A8270', fontWeight: 500 }
              : data.daysLeft <= 7
              ? { background: '#C4881C', color: '#fff', fontWeight: 600 }
              : data.daysLeft <= 30
              ? { border: '1px solid #C4881C', color: '#C4881C', fontWeight: 500 }
              : { color: TEXT_TER, fontWeight: 500 }),
          }}>
            <Clock size={13} />
            {data.daysLeft !== null ? `${data.daysLeft} days left` : 'Deadline passed'}
          </span>
        </div>

        {/* Compliance */}
        {data.compliance && <ComplianceRow compliance={data.compliance} />}

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.eligibilityCriteria.length > 0 && (
            <button
              onClick={onOpenElig}
              style={{
                width: '100%', height: 44, fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
                borderRadius: 10, cursor: 'pointer',
                background: 'transparent', border: `1px solid ${GINGER_MID}`, color: GINGER_MID,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: `background 140ms ${EASE}`,
              }}
            >
              <ClipboardList size={16} /> Check my eligibility
            </button>
          )}

          {data.applyForMe && !data.applyDisabledNote && (
            <button
              onClick={() => { setApplyLoading(true); onOpenApply() }}
              onMouseEnter={() => setApplyHover(true)}
              onMouseLeave={() => setApplyHover(false)}
              disabled={applyLoading}
              style={{
                width: '100%', height: 50, fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
                borderRadius: 13, border: 'none', cursor: applyLoading ? 'default' : 'pointer',
                background: applyHover && !applyLoading
                  ? 'linear-gradient(135deg, #C07630 0%, #6A2504 100%)'
                  : 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)',
                color: '#fff',
                boxShadow: applyHover && !applyLoading
                  ? '0 7px 22px rgba(122,45,5,0.4)'
                  : '0 4px 16px rgba(122,45,5,0.28)',
                transform: applyHover && !applyLoading ? 'translateY(-1px)' : 'translateY(0)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: `background 160ms ${EASE}, box-shadow 160ms ease, transform 160ms ease`,
              }}
            >
              {applyLoading ? (
                <span style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.35)',
                  borderTopColor: '#fff',
                  animation: 'spin 0.7s linear infinite',
                  display: 'inline-block', flexShrink: 0,
                }} />
              ) : (
                <>Apply with OppDate Apply <ArrowRight size={17} /></>
              )}
            </button>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <OutlineBtn onClick={onSave} full={!hasUrl}>
              <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} style={{ color: saved ? GINGER : 'currentColor' }} />
              {saved ? 'Saved' : 'Save listing'}
            </OutlineBtn>
            {hasUrl && (
              <OutlineBtn>
                <ExternalLink size={15} /> Visit Website
              </OutlineBtn>
            )}
          </div>

          <DetailGuideCTA onClick={onOpenGuide} />
        </div>

        {/* About */}
        <div>
          <SectionLabel>About this opportunity</SectionLabel>
          <div className="opp-rte-content" dangerouslySetInnerHTML={{ __html: data.description }} />
        </div>

        {/* Who it is for */}
        <div>
          <SectionLabel>Who it is for</SectionLabel>
          <div className="opp-rte-content" dangerouslySetInnerHTML={{ __html: data.forWho }} />
        </div>

        {/* What is offered */}
        <div>
          <SectionLabel>What is offered</SectionLabel>
          <div className="opp-rte-content" dangerouslySetInnerHTML={{ __html: data.offered }} />
        </div>

        {/* Required documents */}
        <div>
          <SectionLabel>Required documents</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.documents.map((doc, i) => (
              <span key={i} style={{
                fontFamily: 'var(--font-sans)', fontSize: 12, color: INK,
                height: 28, display: 'inline-flex', alignItems: 'center',
                padding: '0 12px', borderRadius: 14,
                background: 'rgba(255,255,255,0.6)', border: `1px solid ${HAIRLINE}`,
              }}>{doc}</span>
            ))}
          </div>
        </div>

        {/* Apply disabled note */}
        {data.applyDisabledNote && (
          <div className="opp-apply-disabled-note">
            <div className="opp-apply-disabled-note-icon">
              <Info size={18} />
            </div>
            <div className="opp-apply-disabled-note-body">
              <div className="opp-apply-disabled-note-title">OppDate Apply is not available for this opportunity</div>
              <p className="opp-apply-disabled-note-text">{data.applyDisabledNote}</p>
              <a href="/services/mentorship" className="opp-apply-disabled-note-cta">
                Explore mentorship <ArrowRight size={14} />
              </a>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

/* ------------------------------------------------------------------ */
/*  Locked card + Premium gate modal                                   */
/* ------------------------------------------------------------------ */

function GateModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [onClose])

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        background: 'rgba(42,18,6,0.45)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        animation: 'obFadeUp 0.22s ease both',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420,
          background: '#FFFAF7',
          borderRadius: 20,
          padding: '32px 28px 28px',
          boxShadow: '0 24px 64px rgba(42,18,6,0.22)',
          animation: 'obFadeUp 0.25s ease both',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#9E8070', padding: 4 }}
        >
          <X size={18} />
        </button>

        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(122,45,5,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Lock size={22} style={{ color: GINGER }} />
        </div>

        <h2 style={{ margin: '0 0 8px', fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 22, color: INK, letterSpacing: '-0.01em' }}>
          Unlock all opportunities
        </h2>
        <p style={{ margin: '0 0 20px', fontFamily: 'var(--font-sans)', fontSize: 14, color: TEXT_TER, lineHeight: 1.55 }}>
          Premium gives you full access to every listing, AI-powered eligibility checks, the OppDate Guide, and priority support.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {['Full access to all listings', 'AI eligibility check on any opportunity', 'OppDate Guide - your personal advisor', 'OppDate Apply - let us handle your application'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-sans)', fontSize: 13.5, color: INK }}>
              <CheckCircle size={15} style={{ color: GINGER, flexShrink: 0 }} />
              {f}
            </div>
          ))}
        </div>

        <a
          href="/pricing"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', height: 50, borderRadius: 12,
            background: GINGER, color: '#fff', textDecoration: 'none',
            fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
            boxShadow: '0 2px 12px rgba(122,45,5,0.22)',
          }}
        >
          Get Premium <ArrowRight size={15} />
        </a>
        <button
          onClick={onClose}
          style={{ display: 'block', width: '100%', marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, color: TEXT_TER, padding: '6px 0' }}
        >
          Continue browsing
        </button>
      </div>
    </div>,
    document.body,
  )
}

function LockedCard({ onGate }: { onGate: () => void }) {
  return (
    <div className="opp-card opp-card-locked" onClick={onGate} role="button" tabIndex={0} aria-label="Locked opportunity - upgrade to view" onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onGate() }}>
      <div className="opp-locked-shimmer-org" />
      <div className="opp-locked-shimmer-title" />
      <div className="opp-locked-shimmer-tags" />
      <div className="opp-locked-lock">
        <Lock size={15} style={{ color: GINGER }} strokeWidth={2} />
      </div>
    </div>
  )
}

const GUIDE_DISMISS_KEY = 'oppdate_guide_cta_dismissed'

// ---- Match confidence dots ----
function MatchDots({ score, reasons }: { score: number; reasons: string[] }) {
  const filled = score >= 4 ? 3 : score >= 2 ? 2 : score >= 1 ? 1 : 0
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t) }, [])

  const reasonLabels: Record<string, string> = {
    country: 'country',
    goal: 'goal',
    level: 'education level',
    field: 'field of study',
  }
  const tip = reasons.length > 0
    ? `Matches your ${reasons.map(r => reasonLabels[r] || r).join(', ')}`
    : 'Based on your profile'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} title={tip}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: i < filled ? GINGER_MID : 'rgba(181,83,10,0.18)',
          display: 'inline-block', flexShrink: 0,
          transform: mounted ? 'scale(1)' : 'scale(0)',
          transition: `transform 220ms cubic-bezier(0.34,1.56,0.64,1) ${i * 60}ms`,
        }} />
      ))}
    </div>
  )
}

// ---- For You row ----
function ForYouRow({
  recs,
  loading,
  onSelect,
  isPremium,
}: {
  recs: ApiRecommendation[]
  loading: boolean
  onSelect: (slug: string) => void
  isPremium: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [visible, setVisible] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [rowHovered, setRowHovered] = useState(false)

  useEffect(() => { const t = setTimeout(() => setVisible(true), 40); return () => clearTimeout(t) }, [])

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 8)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    return () => el.removeEventListener('scroll', checkScroll)
  }, [recs, checkScroll])

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -260 : 260, behavior: 'smooth' })
  }

  // All-zero match scores means preferences incomplete
  const prefsIncomplete = recs.length > 0 && recs.every(r => r.matchScore === 0)

  if (!loading && !isPremium) return null

  const EASE_OUT_SOFT = 'cubic-bezier(0.22,1,0.36,1)'

  return (
    <div
      style={{
        margin: '4px 0 20px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: `opacity 280ms ${EASE_OUT_SOFT}, transform 280ms ${EASE_OUT_SOFT}`,
      }}
      onMouseEnter={() => setRowHovered(true)}
      onMouseLeave={() => setRowHovered(false)}
    >
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Sparkles size={13} style={{ color: GINGER_MID, flexShrink: 0 }} />
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 700,
          color: TEXT_SEC, letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          For you
        </span>
        {prefsIncomplete && (
          <a href="/profile" style={{
            marginLeft: 'auto', fontFamily: 'var(--font-sans)', fontSize: 11,
            color: GINGER_MID, textDecoration: 'none', opacity: 0.8,
          }}>
            Complete your profile for better matches
          </a>
        )}
      </div>

      {/* Scroll container with nav arrows */}
      <div style={{ position: 'relative' }}>
        {/* Left arrow */}
        <button
          onClick={() => scroll('left')}
          style={{
            position: 'absolute', left: -12, top: '50%', transform: 'translateY(-50%)',
            zIndex: 2, width: 28, height: 28, borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 8px rgba(42,18,6,0.12)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK,
            opacity: rowHovered && canScrollLeft ? 1 : 0,
            transition: 'opacity 120ms ease',
            pointerEvents: canScrollLeft ? 'auto' : 'none',
          }}
        >
          <ChevronLeft size={14} />
        </button>

        {/* Cards strip */}
        <div
          ref={scrollRef}
          style={{
            display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4,
            scrollSnapType: 'x mandatory',
            // Hide scrollbar
            msOverflowStyle: 'none', scrollbarWidth: 'none',
          }}
        >
          {loading ? (
            // Skeleton shimmer cards
            [0, 1, 2].map(i => (
              <div key={i} style={{
                flexShrink: 0, width: 220, height: 82, borderRadius: 12,
                background: 'linear-gradient(90deg, rgba(42,18,6,0.05) 25%, rgba(42,18,6,0.10) 50%, rgba(42,18,6,0.05) 75%)',
                backgroundSize: '400% 100%',
                animation: 'forYouShimmer 1.4s ease-in-out infinite',
                scrollSnapAlign: 'start',
              }} />
            ))
          ) : (
            recs.map(rec => {
              const isHov = hoveredId === rec.id
              const initials = rec.institution.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')
              const typeLabel = rec.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

              return (
                <div
                  key={rec.id}
                  onClick={() => onSelect(rec.slug)}
                  onMouseEnter={() => setHoveredId(rec.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    flexShrink: 0, width: 220, padding: '11px 13px', borderRadius: 12,
                    background: isHov ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.72)',
                    backdropFilter: 'blur(24px)',
                    border: `1px solid ${isHov ? 'rgba(181,83,10,0.28)' : 'rgba(255,255,255,0.6)'}`,
                    boxShadow: isHov
                      ? '0 8px 24px rgba(122,45,5,0.13)'
                      : '0 2px 10px rgba(122,45,5,0.07)',
                    cursor: 'pointer', scrollSnapAlign: 'start',
                    transform: isHov ? 'translateY(-3px)' : 'translateY(0)',
                    transition: 'transform 160ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease',
                  }}
                >
                  {/* Logo + title row */}
                  <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: 7 }}>
                    {rec.institutionLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={rec.institutionLogoUrl} alt={rec.institution}
                        style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain', flexShrink: 0, border: '1px solid rgba(42,18,6,0.08)' }} />
                    ) : (
                      <span style={{
                        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                        background: 'rgba(122,45,5,0.08)', display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700, color: GINGER,
                      }}>{initials}</span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600,
                        color: INK, lineHeight: 1.3, marginBottom: 2,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {rec.title}
                      </div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: TEXT_SEC, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rec.institution}
                      </div>
                    </div>
                  </div>

                  {/* Footer: type pill + deadline + match dots */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600,
                      color: GINGER, background: 'rgba(122,45,5,0.07)',
                      border: '1px solid rgba(122,45,5,0.14)',
                      borderRadius: 6, padding: '2px 6px', lineHeight: 1.6, flexShrink: 0,
                    }}>
                      {typeLabel}
                    </span>
                    {rec.closesIn !== null && rec.closesIn <= 30 && (
                      <span style={{
                        fontFamily: 'var(--font-sans)', fontSize: 10, color: rec.closesIn <= 7 ? '#C0392B' : TEXT_TER,
                        display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
                      }}>
                        <Clock size={9} />
                        {rec.closesIn}d
                      </span>
                    )}
                    <span style={{ flex: 1 }} />
                    <MatchDots score={rec.matchScore} reasons={rec.matchReasons} />
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll('right')}
          style={{
            position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)',
            zIndex: 2, width: 28, height: 28, borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 8px rgba(42,18,6,0.12)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK,
            opacity: rowHovered && canScrollRight ? 1 : 0,
            transition: 'opacity 120ms ease',
            pointerEvents: canScrollRight ? 'auto' : 'none',
          }}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <style>{`
        @keyframes forYouShimmer {
          0%, 100% { background-position: 100% 0 }
          50% { background-position: 0 0 }
        }
        div[data-foryou-scroll]::-webkit-scrollbar { display: none }
      `}</style>
    </div>
  )
}

function GuideCTABanner({ onOpenGuide }: { onOpenGuide: () => void }) {
  const [hidden, setHidden] = useState(true)
  const [collapsing, setCollapsing] = useState(false)
  const [linkHover, setLinkHover] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(GUIDE_DISMISS_KEY) === '1') return
    } catch {}
    setHidden(false)
  }, [])

  if (hidden) return null

  const handleDismiss = () => {
    setCollapsing(true)
    try { localStorage.setItem(GUIDE_DISMISS_KEY, '1') } catch {}
    setTimeout(() => setHidden(true), 150)
  }

  return (
    <div style={{
      maxWidth: 980, margin: '0 auto 16px', padding: collapsing ? 0 : '12px 20px',
      borderRadius: 12, background: 'rgba(181,83,10,0.07)', border: '1px solid rgba(181,83,10,0.14)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      overflow: 'hidden',
      opacity: collapsing ? 0 : 1,
      maxHeight: collapsing ? 0 : 60,
      animation: collapsing ? 'none' : 'msgFadeIn 400ms ease both',
      transition: collapsing ? 'opacity 150ms ease, max-height 150ms ease, padding 150ms ease' : 'none',
    }}>
      <button
        onClick={onOpenGuide}
        onMouseEnter={() => setLinkHover(true)}
        onMouseLeave={() => setLinkHover(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 500, color: GINGER_MID,
          flex: 1, minWidth: 0,
        }}
      >
        <MessageCircle size={15} style={{ flexShrink: 0 }} />
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          textDecoration: linkHover ? 'underline' : 'none',
          textUnderlineOffset: 3,
        }}>
          Wondering what you&apos;re eligible for? Ask OppDate Guide <ArrowRight size={14} />
        </span>
      </button>
      <button onClick={handleDismiss} aria-label="Dismiss" style={{
        background: 'none', border: 'none', cursor: 'pointer', color: TEXT_SEC, flexShrink: 0, display: 'flex', padding: 4,
      }}>
        <X size={16} />
      </button>
    </div>
  )
}

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

function ListingsSkeleton({ isMobile }: { isMobile: boolean }) {
  return (
    <div className="skel-wrap" style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      backgroundColor: '#F2EFEA',
    }}>
      <div style={{ flexShrink: 0, padding: '14px 24px', display: 'flex', gap: 8 }}>
        {[60, 90, 80, 70, 85].map((w, i) => <div key={i} className="skel skel-pill" style={{ width: w }} />)}
      </div>
      <div style={{ flex: 1, display: 'flex', padding: '0 24px 24px', gap: 20, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
            <div className="skel skel-line w30" style={{ height: 18 }} />
            <div className="skel skel-pill" style={{ width: 70, height: 28 }} />
          </div>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="skel-card" style={{ height: isMobile ? 130 : 160, borderRadius: 16 }} />
          ))}
        </div>
        {!isMobile && (
          <div style={{ width: 460, flexShrink: 0 }}>
            <div className="skel-card" style={{ height: '100%', borderRadius: 20 }} />
          </div>
        )}
      </div>
    </div>
  )
}

export function ListingsPage() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const filterFromUrl = PARAM_TO_FILTER[searchParams.get('filter') ?? ''] ?? 'All'
  const [filter, setFilter] = useState<FilterId>(filterFromUrl)
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  // Read slug directly from window.location on mount — useSearchParams() returns null during SSR/hydration
  const [selectedSlug, setSelectedSlug] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('slug')
  })
  const [selectedDetail, setSelectedDetail] = useState<Opportunity | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(() => {
    if (typeof window === 'undefined') return false
    return !!new URLSearchParams(window.location.search).get('slug')
  })
  const [eligOpen, setEligOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [gateOpen, setGateOpen] = useState(false)
  const [saveSearchOpen, setSaveSearchOpen] = useState(false)
  const [savedSearchesOpen, setSavedSearchesOpen] = useState(false)
  const [saveSearchName, setSaveSearchName] = useState('')
  const [saveSearchSaving, setSaveSearchSaving] = useState(false)
  const [saveSearchAlertEnabled, setSaveSearchAlertEnabled] = useState(true)
  const [alertTogglingId, setAlertTogglingId] = useState<string | null>(null)
  const [alertToggleError, setAlertToggleError] = useState<string | null>(null)
  const [sort, setSort] = useState<SortOption>('deadline_asc')
  const [sortOpen, setSortOpen] = useState(false)
  const [showExpired, setShowExpired] = useState(false)
  const isMobile = useIsMobile()
  const [guideGreeting, setGuideGreeting] = useState<string | undefined>(undefined)
  const queryClient = useQueryClient()
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const saveDropdownRef = useRef<HTMLDivElement | null>(null)
  const savedDropdownRef = useRef<HTMLDivElement | null>(null)
  const sortDropdownRef = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!saveSearchOpen && !savedSearchesOpen && !sortOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (saveDropdownRef.current?.contains(target)) return
      if (savedDropdownRef.current?.contains(target)) return
      if (sortDropdownRef.current?.contains(target)) return
      setSaveSearchOpen(false)
      setSavedSearchesOpen(false)
      setSortOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [saveSearchOpen, savedSearchesOpen, sortOpen])

  // Sync filter → URL
  useEffect(() => {
    const param = FILTER_TO_PARAM[filter]
    const current = searchParams.get('filter') ?? ''
    if (param === current) return
    const params = new URLSearchParams(searchParams.toString())
    if (param) {
      params.set('filter', param)
    } else {
      params.delete('filter')
    }
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync selectedSlug → URL using window.location as source of truth (useSearchParams is unreliable during hydration)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const current = params.get('slug') ?? ''
    if ((selectedSlug ?? '') === current) return
    if (selectedSlug) {
      params.set('slug', selectedSlug)
    } else {
      params.delete('slug')
    }
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [selectedSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: savedSearches = [] } = useQuery<ApiSavedSearch[]>({
    queryKey: keys.savedSearches,
    queryFn: fetchers.savedSearches,
    staleTime: 60 * 1000,
  })

  const { data: savedOpportunities = [] } = useQuery<ApiSavedOpportunity[]>({
    queryKey: keys.saved,
    queryFn: fetchers.saved,
    staleTime: 60 * 1000,
  })

  const { data: meData, isLoading: meLoading } = useQuery<ApiUser>({
    queryKey: keys.me,
    queryFn: fetchers.me,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const isPremium = !!meData?.isPremium

  const { data: recommendations = [], isLoading: recsLoading } = useQuery<ApiRecommendation[]>({
    queryKey: keys.recommendations,
    queryFn: () => fetchers.recommendations(6),
    enabled: isPremium,
    staleTime: 5 * 60 * 1000,
  })

  const apiFilters: ListingFilters = { ...(FILTER_TO_API[filter] ?? {}), sort, showExpired }
  const { listings, isLoading, sentinelRef } = useInfiniteListings(apiFilters)

  // Auto-select first listing when none is selected and listings have loaded
  useEffect(() => {
    if (selectedSlug || listings.length === 0) return
    setSelectedSlug(listings[0].slug)
  }, [listings, selectedSlug])

  // Scroll active card into view once listings are available
  useEffect(() => {
    if (!selectedSlug) return
    const id = requestAnimationFrame(() => {
      const el = cardRefs.current[selectedSlug]
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => cancelAnimationFrame(id)
  }, [selectedSlug, listings]) // re-run when listings populate

  useEffect(() => {
    if (!selectedSlug) { setSelectedDetail(null); return }
    // Wait for the me query to resolve before enforcing the premium gate
    if (meLoading) return
    // Non-premium users cannot view detail panels
    if (!isPremium) {
      setSelectedSlug(null)
      setGateOpen(true)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    api.get<{ success: boolean; data: ApiDetailRow }>(`/api/v1/opportunities/${selectedSlug}`)
      .then(res => { if (!cancelled) setSelectedDetail(detailRowToOpportunity(res.data.data)) })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number; data?: { code?: string } } })?.response?.status
        const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code
        if (status === 403 || code === 'PREMIUM_REQUIRED') {
          if (!cancelled) { setSelectedSlug(null); setGateOpen(true) }
        }
      })
      .finally(() => { if (!cancelled) setDetailLoading(false) })
    return () => { cancelled = true }
  }, [selectedSlug, isPremium, meLoading])

  const openGuideFromBanner = useCallback(() => {
    setGuideGreeting('Hi, I\'m here to help you find the right opportunity. Tell me about your background or what you\'re looking for, and I can help you narrow things down.')
    setGuideOpen(true)
  }, [])

  const openGuideFromDetail = useCallback(() => {
    setGuideGreeting(undefined)
    setGuideOpen(true)
  }, [])

  // Seed saved state from API data
  useEffect(() => {
    if (savedOpportunities.length === 0) return
    setSaved(savedOpportunities.reduce<Record<string, boolean>>((acc, s) => {
      acc[s.opportunityId] = true
      return acc
    }, {}))
  }, [savedOpportunities])

  const toggleSave = useCallback(async (id: string) => {
    const isSaved = !!saved[id]
    // Optimistic update
    setSaved(prev => ({ ...prev, [id]: !isSaved }))
    try {
      if (isSaved) {
        await api.delete(`/api/v1/saved-opportunities/${id}`)
      } else {
        await api.post(`/api/v1/saved-opportunities/${id}`)
      }
      await queryClient.invalidateQueries({ queryKey: keys.saved })
    } catch {
      // Revert on failure
      setSaved(prev => ({ ...prev, [id]: isSaved }))
    }
  }, [saved, queryClient])

  const handleSaveSearch = useCallback(async () => {
    if (!saveSearchName.trim()) return
    setSaveSearchSaving(true)
    try {
      await api.post('/api/v1/saved-searches', {
        name: saveSearchName.trim(),
        filters: {
          ...FILTER_TO_API[filter] ?? {},
          ...(selectedSlug ? { slug: selectedSlug } : {}),
        },
        alertsEnabled: saveSearchAlertEnabled,
      })
      await queryClient.invalidateQueries({ queryKey: keys.savedSearches })
      setSaveSearchName('')
      setSaveSearchOpen(false)
    } catch {
      // ignore - user can retry
    } finally {
      setSaveSearchSaving(false)
    }
  }, [saveSearchName, filter, queryClient])

  const handleDeleteSearch = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/v1/saved-searches/${id}`)
      await queryClient.invalidateQueries({ queryKey: keys.savedSearches })
    } catch {
      // ignore
    }
  }, [queryClient])

  const handleToggleAlert = useCallback(async (s: ApiSavedSearch) => {
    const next = !s.alertsEnabled
    setAlertTogglingId(s.id)
    setAlertToggleError(null)
    // Optimistic update via cache
    queryClient.setQueryData<ApiSavedSearch[]>(keys.savedSearches, prev =>
      prev?.map(x => x.id === s.id ? { ...x, alertsEnabled: next } : x) ?? []
    )
    try {
      await api.patch(`/api/v1/saved-searches/${s.id}`, { alertsEnabled: next })
      await queryClient.invalidateQueries({ queryKey: keys.savedSearches })
    } catch {
      // Revert
      queryClient.setQueryData<ApiSavedSearch[]>(keys.savedSearches, prev =>
        prev?.map(x => x.id === s.id ? { ...x, alertsEnabled: s.alertsEnabled } : x) ?? []
      )
      setAlertToggleError(s.id)
      setTimeout(() => setAlertToggleError(null), 1000)
    } finally {
      setAlertTogglingId(null)
    }
  }, [queryClient])

  const applySearch = useCallback((s: ApiSavedSearch) => {
    const f = s.filters as Partial<ListingFilters> & { slug?: string }
    const { slug: savedSlug, ...filterOnly } = f
    const match = Object.entries(FILTER_TO_API).find(([, v]) => {
      const vKeys = Object.keys(v) as (keyof typeof v)[]
      const fKeys = Object.keys(filterOnly)
      if (vKeys.length !== fKeys.length) return false
      return vKeys.every(k => (v as Record<string, unknown>)[k] === (filterOnly as Record<string, unknown>)[k])
    })
    setFilter((match?.[0] ?? 'All') as FilterId)
    if (savedSlug) {
      setSelectedSlug(prev => {
        // Only clear the cached detail when navigating to a different listing
        if (prev !== savedSlug) setSelectedDetail(null)
        return savedSlug
      })
      setMobileDetailOpen(true)
    }
    setSavedSearchesOpen(false)
  }, [])

  const opportunities = listings.map(listItemToOpportunity)

  const selectedListItem = selectedSlug ? listings.find(l => l.slug === selectedSlug) : null
  const selectedListOpportunity = selectedListItem ? listItemToOpportunity(selectedListItem) : null
  const selectedData: Opportunity | null = selectedDetail ?? selectedListOpportunity ?? (opportunities[0] ?? null)

  if (!mounted || meLoading || (isLoading && !opportunities.length)) return <ListingsSkeleton isMobile={isMobile} />

  return (
    <div className="r-listings-wrap" style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {gateOpen && (
        <UpgradeModal
          onClose={() => setGateOpen(false)}
        />
      )}
      {/* Warm background */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden',
        backgroundColor: '#F2EFEA',
        backgroundImage: 'url(/assets/bg-artwork.png)',
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
      }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Filter row */}
        <div className="r-listings-filter" style={{
          flexShrink: 0, padding: '14px 24px',
          display: 'flex', alignItems: 'center', gap: 8,
          position: 'relative',
        }}>
          {/* Scrollable pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', flex: 1, minWidth: 0 }}>
            {FILTERS.map(f => {
              const isActive = filter === f
              return (
                <button key={f} onClick={() => setFilter(f)} style={{
                  display: 'inline-flex', alignItems: 'center',
                  fontFamily: 'var(--font-sans)', fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  height: 32, padding: '0 16px', borderRadius: 20,
                  whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                  background: isActive ? GINGER : 'rgba(255,255,255,0.55)',
                  backdropFilter: isActive ? 'none' : 'blur(16px)',
                  WebkitBackdropFilter: isActive ? 'none' : 'blur(16px)',
                  border: `1px solid ${isActive ? GINGER : 'rgba(255,255,255,0.70)'}`,
                  color: isActive ? '#FFFFFF' : INK,
                  transition: `all 140ms ${EASE}`,
                }}>
                  {f}
                </button>
              )
            })}
          </div>

          {/* Divider */}
          {isPremium && <div style={{ width: 1, height: 20, background: 'rgba(42,18,6,0.12)', flexShrink: 0, alignSelf: 'center' }} />}

          {/* Save current filter - premium only */}
          {isPremium && <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => { setSaveSearchOpen(o => !o); setSavedSearchesOpen(false) }}
              title="Bookmark current view"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
                height: 32, padding: '0 12px', borderRadius: 20,
                whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                background: 'rgba(255,255,255,0.55)',
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.70)', color: INK,
              }}
            >
              <BookmarkPlus size={14} />
              Bookmark
            </button>
            {saveSearchOpen && (
              <div
                ref={saveDropdownRef}
                style={{
                position: 'absolute', top: 38, right: 0, zIndex: 200,
                background: '#FFFCF9', borderRadius: 12,
                boxShadow: '0 8px 32px rgba(42,18,6,0.16)',
                border: '1px solid rgba(42,18,6,0.10)',
                padding: '12px 14px',
                display: 'flex', flexDirection: 'column', gap: 8,
                width: 240,
              }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: TEXT_TER }}>
                  Name this bookmark
                </div>
                <input
                  autoFocus
                  value={saveSearchName}
                  onChange={e => setSaveSearchName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveSearch(); if (e.key === 'Escape') setSaveSearchOpen(false) }}
                  placeholder={`${filter} filter`}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    height: 34, padding: '0 10px', borderRadius: 8,
                    border: '1px solid rgba(42,18,6,0.14)',
                    fontFamily: 'var(--font-sans)', fontSize: 13, color: INK,
                    background: 'rgba(255,255,255,0.8)', outline: 'none',
                  }}
                />
                {/* Alert toggle */}
                <button
                  onClick={() => setSaveSearchAlertEnabled(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: saveSearchAlertEnabled ? 'rgba(193,127,58,0.08)' : 'rgba(42,18,6,0.04)',
                    border: `1px solid ${saveSearchAlertEnabled ? 'rgba(193,127,58,0.25)' : 'rgba(42,18,6,0.10)'}`,
                    borderRadius: 8, padding: '7px 10px', cursor: 'pointer',
                    width: '100%', textAlign: 'left',
                    transition: 'background 180ms ease, border-color 180ms ease',
                  }}
                >
                  <div style={{
                    width: 28, height: 16, borderRadius: 8,
                    background: saveSearchAlertEnabled ? GINGER : 'rgba(42,18,6,0.15)',
                    position: 'relative', flexShrink: 0,
                    transition: 'background 200ms ease',
                  }}>
                    <div style={{
                      position: 'absolute', top: 2, left: saveSearchAlertEnabled ? 14 : 2,
                      width: 12, height: 12, borderRadius: '50%', background: '#fff',
                      transition: 'left 200ms cubic-bezier(0.25,0.46,0.45,0.94)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: saveSearchAlertEnabled ? GINGER : TEXT_TER }}>
                      {saveSearchAlertEnabled ? 'Alerts on' : 'Alerts off'}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-sans)', fontSize: 11, color: TEXT_TER,
                      maxHeight: saveSearchAlertEnabled ? 18 : 0,
                      overflow: 'hidden',
                      opacity: saveSearchAlertEnabled ? 1 : 0,
                      transition: 'max-height 200ms ease, opacity 200ms ease',
                    }}>
                      Notified every 6h when new matches appear
                    </div>
                  </div>
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleSaveSearch}
                    disabled={saveSearchSaving || !saveSearchName.trim()}
                    style={{
                      flex: 1, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: GINGER, color: '#fff',
                      fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
                      opacity: saveSearchSaving || !saveSearchName.trim() ? 0.6 : 1,
                    }}
                  >
                    {saveSearchSaving ? 'Saving...' : 'Bookmark'}
                  </button>
                  <button
                    onClick={() => { setSaveSearchOpen(false); setSaveSearchAlertEnabled(true) }}
                    style={{
                      height: 32, padding: '0 12px', borderRadius: 8, cursor: 'pointer',
                      background: 'transparent', border: '1px solid rgba(42,18,6,0.12)', color: INK,
                      fontFamily: 'var(--font-sans)', fontSize: 13,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>}

          {/* Saved searches dropdown - premium only */}
          {isPremium && savedSearches.length > 0 && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => { setSavedSearchesOpen(o => !o); setSaveSearchOpen(false) }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
                  height: 32, padding: '0 12px', borderRadius: 20,
                  whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.55)',
                  backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.70)', color: INK,
                }}
              >
                <Bookmark size={13} />
                Bookmarks ({savedSearches.length})
                <ChevronDown size={13} style={{ color: TEXT_SEC }} />
              </button>
              {savedSearchesOpen && (
                <div
                  ref={savedDropdownRef}
                  style={{
                  position: 'absolute', top: 38, right: 0, zIndex: 200,
                  background: '#FFFCF9', borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(42,18,6,0.16)',
                  border: '1px solid rgba(42,18,6,0.10)',
                  padding: '4px 0',
                  minWidth: 220,
                  maxHeight: 260,
                  overflowY: 'auto',
                }}>
                  <style>{`
                    @keyframes bellShake {
                      0%,100% { transform: translateX(0); }
                      20% { transform: translateX(-4px); }
                      40% { transform: translateX(4px); }
                      60% { transform: translateX(-3px); }
                      80% { transform: translateX(3px); }
                    }
                    @keyframes bellHalo {
                      from { transform: scale(0); opacity: 0.15; }
                      to { transform: scale(1.4); opacity: 0; }
                    }
                  `}</style>
                  {savedSearches.map(s => (
                    <div
                      key={s.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 10px', minWidth: 0 }}
                    >
                      <button
                        onClick={() => applySearch(s)}
                        style={{
                          flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                          minWidth: 0, borderRadius: 6,
                        }}
                      >
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.name}
                        </div>
                      </button>
                      {/* Bell toggle */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {/* halo ring on toggle */}
                        {alertTogglingId === s.id && (
                          <div style={{
                            position: 'absolute', inset: -4,
                            borderRadius: '50%',
                            background: GINGER,
                            animation: 'bellHalo 300ms ease-out forwards',
                            pointerEvents: 'none',
                          }} />
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); handleToggleAlert(s) }}
                          disabled={alertTogglingId === s.id}
                          aria-label={s.alertsEnabled ? 'Disable alerts' : 'Enable alerts'}
                          title={s.alertsEnabled ? 'Alerts on - click to disable' : 'Alerts off - click to enable'}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: s.alertsEnabled ? GINGER : '#C4A882',
                            display: 'flex', flexShrink: 0, padding: 3,
                            borderRadius: 6,
                            animation: alertToggleError === s.id ? 'bellShake 300ms ease' : undefined,
                            transition: 'color 200ms ease, transform 160ms ease',
                            transform: alertTogglingId === s.id ? 'scale(1.2)' : 'scale(1)',
                          }}
                        >
                          {s.alertsEnabled
                            ? <BellRing size={13} />
                            : <BellOff size={13} />
                          }
                        </button>
                      </div>
                      <button
                        onClick={() => handleDeleteSearch(s.id)}
                        aria-label="Delete"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4A882', display: 'flex', flexShrink: 0, padding: 2 }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Show expired toggle */}
          <button
            onClick={() => setShowExpired(v => !v)}
            title={showExpired ? 'Hide expired listings' : 'Show listings with passed deadlines'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
              height: 32, padding: '0 12px', borderRadius: 20,
              whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
              background: showExpired ? 'rgba(90,80,70,0.12)' : 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              border: showExpired ? '1px solid rgba(90,80,70,0.28)' : '1px solid rgba(255,255,255,0.70)',
              color: showExpired ? '#6B5C50' : INK,
              transition: 'all 140ms ease',
            }}
          >
            <Clock size={13} />
            {showExpired ? 'Hide expired' : 'Show expired'}
          </button>
        </div>

        {/* Master-detail split */}
        <div className="r-listings-split" style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          {/* Feed column */}
          <div className="r-listings-feed" style={{ flex: 1, minWidth: 0, overflowY: 'auto', position: 'relative' }}>
            <div style={{ padding: '20px 36px 36px', maxWidth: 980, margin: '0 auto' }}>
              {/* Header + sort */}
              <div className="r-listings-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
                <div style={{ minWidth: 0 }}>
                  <h1 style={{
                    margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 30,
                    letterSpacing: '-0.02em', color: INK,
                  }}>Opportunities</h1>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: TEXT_SEC, marginTop: 5 }}>
                    Discover thousands of verified opportunities worldwide
                  </div>
                </div>
                <div ref={sortDropdownRef} style={{ position: 'relative', flexShrink: 0, marginTop: 6 }}>
                  <button
                    onClick={() => setSortOpen(o => !o)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, height: 32, padding: '0 14px',
                      borderRadius: 20, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.55)',
                      backdropFilter: 'blur(24px) saturate(140%)', WebkitBackdropFilter: 'blur(24px) saturate(140%)',
                      border: '1px solid rgba(255,255,255,0.70)', color: INK,
                    }}
                  >
                    Sort: {sort === 'deadline_asc' ? 'Deadline soonest' : sort === 'deadline_desc' ? 'Deadline latest' : 'Newest first'}
                    <ChevronDown size={14} style={{ color: TEXT_SEC }} />
                  </button>
                  {sortOpen && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 300,
                      background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12,
                      boxShadow: '0 4px 24px rgba(0,0,0,0.10)', minWidth: 180, overflow: 'hidden',
                    }}>
                      {([
                        ['deadline_asc', 'Deadline soonest'],
                        ['deadline_desc', 'Deadline latest'],
                        ['newest', 'Newest first'],
                      ] as [SortOption, string][]).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => { setSort(val); setSortOpen(false) }}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '10px 16px', border: 'none', background: sort === val ? 'rgba(140,106,85,0.08)' : 'transparent',
                            fontFamily: 'var(--font-sans)', fontSize: 13, color: sort === val ? '#8C6A55' : INK,
                            fontWeight: sort === val ? 600 : 400, cursor: 'pointer',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Guide CTA banner */}
              <GuideCTABanner onOpenGuide={openGuideFromBanner} />

              {/* Recommendations row - Premium users only */}
              {(isPremium || recsLoading) && (
                <ForYouRow
                  recs={recommendations}
                  loading={recsLoading}
                  isPremium={isPremium}
                  onSelect={slug => {
                    setSelectedSlug(prev => {
                      if (prev !== slug) setSelectedDetail(null)
                      return slug
                    })
                    setMobileDetailOpen(true)
                  }}
                />
              )}

              {/* Feed ad placement */}
              <AdBanner zone="listings_feed" style={{ margin: '4px 0 16px' }} />

              {/* Card list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {opportunities.map((d, i) => {
                  const slug = listings[i]?.slug ?? d.id
                  if (d.isLocked) {
                    return <LockedCard key={d.id} onGate={() => setGateOpen(true)} />
                  }
                  return (
                    <div key={slug} ref={el => { cardRefs.current[slug] = el }}>
                      <OpportunityCard
                        data={d}
                        saved={!!saved[d.id]}
                        active={selectedSlug === slug}
                        onSave={toggleSave}
                        onClick={() => {
                          setSelectedSlug(prev => {
                            if (prev !== slug) setSelectedDetail(null)
                            return slug
                          })
                          setMobileDetailOpen(true)
                        }}
                      />
                    </div>
                  )
                })}
                {!isLoading && opportunities.length === 0 && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    padding: '56px 24px',
                    gap: 0,
                  }}>
                    <style>{`
                      @keyframes oppEmptyPulse {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.08); opacity: 0.7; }
                      }
                      @keyframes oppEmptyPulse2 {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.12); opacity: 0.55; }
                      }
                      @keyframes oppEmptyGlobe {
                        0%, 100% { transform: rotate(0deg); }
                        50% { transform: rotate(15deg); }
                      }
                      @keyframes oppEmptyFadeUp {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                      }
                    `}</style>
                    {/* Animated concentric rings */}
                    <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 22 }}>
                      <div style={{
                        position: 'absolute', inset: 0,
                        borderRadius: '50%',
                        border: '1.5px solid rgba(122,45,5,0.10)',
                        background: 'rgba(122,45,5,0.025)',
                        animation: 'oppEmptyPulse2 3.6s ease-in-out infinite',
                      }} />
                      <div style={{
                        position: 'absolute', inset: 12,
                        borderRadius: '50%',
                        border: '1.5px solid rgba(122,45,5,0.14)',
                        background: 'rgba(122,45,5,0.04)',
                        animation: 'oppEmptyPulse 3s ease-in-out infinite',
                        animationDelay: '0.4s',
                      }} />
                      <div style={{
                        position: 'absolute', inset: 24,
                        borderRadius: '50%',
                        background: 'rgba(122,45,5,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'oppEmptyGlobe 4s ease-in-out infinite',
                        animationDelay: '0.2s',
                      }}>
                        <Globe size={18} style={{ color: GINGER, opacity: 0.75 }} />
                      </div>
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-serif)',
                      fontWeight: 700,
                      fontSize: 18,
                      color: INK,
                      letterSpacing: '-0.02em',
                      marginBottom: 8,
                      animation: 'oppEmptyFadeUp 500ms ease both',
                      animationDelay: '100ms',
                    }}>
                      {filter === 'All' ? 'No opportunities yet' : `No ${filter.toLowerCase()} opportunities found`}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 14,
                      color: TEXT_SEC,
                      lineHeight: 1.6,
                      maxWidth: 280,
                      marginBottom: 20,
                      animation: 'oppEmptyFadeUp 500ms ease both',
                      animationDelay: '200ms',
                    }}>
                      {filter === 'All'
                        ? 'Opportunities will appear here once they are published. Check back soon.'
                        : 'Try a different filter or clear your search to see more results.'}
                    </div>
                    {filter !== 'All' && (
                      <button
                        onClick={() => setFilter('All')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontFamily: 'var(--font-sans)',
                          fontSize: 13,
                          fontWeight: 600,
                          color: GINGER,
                          background: 'rgba(122,45,5,0.06)',
                          border: '1px solid rgba(122,45,5,0.15)',
                          borderRadius: 999,
                          padding: '8px 18px',
                          cursor: 'pointer',
                          animation: 'oppEmptyFadeUp 500ms ease both',
                          animationDelay: '300ms',
                        }}
                      >
                        View all opportunities <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div ref={sentinelRef} style={{ height: 1 }} />
            </div>
          </div>

          {/* Detail drawer - desktop only (inline panel) */}
          {!isMobile && !isPremium && (
            <div style={{
              width: 460, flexShrink: 0, height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 32px',
              borderLeft: `1px solid ${HAIRLINE}`,
            }}>
              <div style={{
                width: '100%', maxWidth: 340,
                background: '#FFFAF7',
                borderRadius: 20,
                padding: '36px 28px 32px',
                boxShadow: '0 4px 32px rgba(42,18,6,0.08), 0 1px 4px rgba(42,18,6,0.06)',
                border: `1px solid rgba(122,45,5,0.10)`,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                textAlign: 'center', gap: 0,
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: 'rgba(122,45,5,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20,
                }}>
                  <Lock size={22} style={{ color: GINGER }} />
                </div>
                <h3 style={{
                  margin: '0 0 10px',
                  fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 20,
                  color: INK, letterSpacing: '-0.01em', lineHeight: 1.25,
                }}>
                  This is exclusive to Premium members
                </h3>
                <p style={{
                  margin: '0 0 6px',
                  fontFamily: 'var(--font-sans)', fontSize: 13.5, color: TEXT_TER, lineHeight: 1.6,
                }}>
                  Subscribe to access every listing, AI eligibility screening, OppDate Guide, and your application tracker.
                </p>
                <p style={{
                  margin: '0 0 24px',
                  fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'rgba(122,45,5,0.6)',
                  fontWeight: 500,
                }}>
                  Your current plan does not include listings access.
                </p>
                <button
                  onClick={() => setGateOpen(true)}
                  style={{
                    width: '100%', height: 48, borderRadius: 12, border: 'none',
                    background: GINGER, color: '#fff', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', fontSize: 14.5, fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(122,45,5,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    letterSpacing: '-0.01em',
                    transition: 'background 150ms ease, transform 100ms ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#5C2104' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = GINGER }}
                  onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)' }}
                  onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
                >
                  Subscribe to Premium <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}
          {!isMobile && isPremium && selectedData && (
            <div style={{ width: 460, flexShrink: 0, height: '100%', position: 'relative' }}>
              {detailLoading && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3, zIndex: 10,
                  background: 'rgba(122,45,5,0.15)',
                }}>
                  <div style={{
                    height: '100%', width: '60%', background: GINGER,
                    borderRadius: 999,
                    animation: 'detailProgress 1s ease-in-out infinite alternate',
                  }} />
                </div>
              )}
              <DetailDrawer
                data={selectedData}
                saved={!!saved[selectedData.id]}
                onSave={() => toggleSave(selectedData.id)}
                onClose={() => { setSelectedSlug(null); setMobileDetailOpen(false) }}
                onOpenElig={() => setEligOpen(true)}
                onOpenGuide={openGuideFromDetail}
                onOpenApply={() => router.push(`/apply?opportunity=${selectedData.id}`)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Detail drawer - mobile only (full-screen portal) */}
      {isMobile && mobileDetailOpen && selectedData && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', flexDirection: 'column',
          background: 'var(--app-surface, #FAF7F4)',
        }}>
          <DetailDrawer
            data={selectedData}
            saved={!!saved[selectedData.id]}
            onSave={() => toggleSave(selectedData.id)}
            onClose={() => { setSelectedSlug(null); setMobileDetailOpen(false) }}
            onOpenElig={() => { setMobileDetailOpen(false); setEligOpen(true) }}
            onOpenGuide={() => { setMobileDetailOpen(false); openGuideFromDetail() }}
            onOpenApply={() => router.push(`/apply?opportunity=${selectedData.id}`)}
            mobileOpen
          />
        </div>,
        document.body,
      )}

      {/* Eligibility modal */}
      {eligOpen && (
        <EligibilityModal
          onClose={() => setEligOpen(false)}
          onApply={() => { setEligOpen(false); router.push(`/apply?opportunity=${selectedData?.id}`) }}
          criteria={selectedData?.eligibilityCriteria ?? []}
          opportunityTitle={selectedData?.title}
          opportunityType={selectedData?.type}
          onOpenGuide={() => { setEligOpen(false); openGuideFromDetail() }}
        />
      )}

      {/* Guide panel overlay */}
      {guideOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={() => setGuideOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(26,15,8,0.3)' }} />
          <div style={{
            position: 'relative', width: 420, height: '100%',
            boxShadow: '-12px 0 40px rgba(90,40,15,0.18)',
          }}>
            <GuidePanel
              onClose={() => setGuideOpen(false)}
              initialGreeting={guideGreeting}
              opportunitySlug={selectedSlug ?? undefined}
              opportunityTitle={selectedData?.title}
              eligibilityCriteria={selectedData?.eligibilityCriteria}
              isPremium={isPremium}
              onPremiumRequired={() => setGateOpen(true)}
            />
          </div>
        </div>
      )}

    </div>
  )
}
