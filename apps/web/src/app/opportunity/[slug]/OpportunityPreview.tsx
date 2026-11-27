'use client'

import { useState } from 'react'
import Link from 'next/link'

interface OppData {
  id: string
  title: string
  slug: string
  type: string
  institution: string
  institutionLogoUrl: string | null
  country: string
  region: string
  summary: string
  deadline: string
  awardValueUsd: number | null
  fieldOfStudy: string | null
  eligibilityLevel: string | null
  oppDateApply: boolean
  whoItsFor: string
  whatIsOffered: string
}

function daysUntil(deadline: string): number | null {
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return null
  const diff = d.getTime() - Date.now()
  if (diff < 0) return null
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDeadline(deadline: string): string {
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function formatType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function countryFlag(country: string): string {
  const CC: Record<string, string> = {
    'united kingdom': 'GB', 'united states': 'US', usa: 'US', uk: 'GB',
    nigeria: 'NG', ghana: 'GH', kenya: 'KE', 'south africa': 'ZA',
    canada: 'CA', australia: 'AU', germany: 'DE', france: 'FR',
    japan: 'JP', china: 'CN', india: 'IN', brazil: 'BR',
    netherlands: 'NL', sweden: 'SE', switzerland: 'CH', singapore: 'SG',
    'new zealand': 'NZ', ireland: 'IE', spain: 'ES', italy: 'IT',
    austria: 'AT', belgium: 'BE', denmark: 'DK', norway: 'NO',
    finland: 'FI', portugal: 'PT', poland: 'PL', 'czech republic': 'CZ',
    hungary: 'HU', turkey: 'TR', mexico: 'MX', colombia: 'CO',
    argentina: 'AR', chile: 'CL', egypt: 'EG', morocco: 'MA',
    'united arab emirates': 'AE', 'saudi arabia': 'SA', malaysia: 'MY',
    thailand: 'TH', indonesia: 'ID', philippines: 'PH', vietnam: 'VN',
    'south korea': 'KR', taiwan: 'TW', pakistan: 'PK', bangladesh: 'BD',
    ethiopia: 'ET', tanzania: 'TZ', uganda: 'UG', rwanda: 'RW',
    remote: '', global: '', international: '',
  }
  const code = CC[country.toLowerCase()] ?? country.slice(0, 2).toUpperCase()
  if (!code || code.length !== 2) return ''
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
}

function OrgBadge({ institution, logoUrl }: { institution: string; logoUrl: string | null }) {
  const initials = institution.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <div style={{
      width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
      background: '#F0EAE4', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-sans, "DM Sans", system-ui, sans-serif)',
      fontWeight: 700, fontSize: initials.length > 2 ? 13 : 15, color: '#2A1206',
      border: '2px solid rgba(255,255,255,0.8)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    }}>
      {logoUrl
        ? <img src={logoUrl} alt={institution} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        : initials}
    </div>
  )
}

export function OpportunityPreview({ opp, appUrl }: { opp: OppData | null; appUrl: string }) {
  const [ctaHover, setCtaHover] = useState(false)

  if (!opp) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h1 style={{ ...S.title, fontSize: 24 }}>Opportunity not found</h1>
            <p style={{ ...S.body, marginTop: 12 }}>This opportunity may have been removed or the link is incorrect.</p>
            <Link href="/" style={{ ...S.ctaBtn, display: 'inline-flex', marginTop: 24, width: 'auto', padding: '0 32px' }}>
              Go to OppDate
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const days = daysUntil(opp.deadline)
  const deadlineLabel = formatDeadline(opp.deadline)
  const typeLabel = formatType(opp.type)
  const flag = countryFlag(opp.country)
  const signUpUrl = `/auth/register?redirect=${encodeURIComponent(`/opportunities?slug=${opp.slug}`)}`
  const loginUrl = `/auth/login?redirect=${encodeURIComponent(`/opportunities?slug=${opp.slug}`)}`

  return (
    <div style={S.page}>
      {/* Nav bar */}
      <nav style={S.nav}>
        <Link href="/" style={S.navLogo}>
          <span style={S.navMark}>opd</span>
          <span style={S.navName}>OppDate</span>
        </Link>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link href={loginUrl} style={S.navLogin}>Log in</Link>
          <Link href={signUpUrl} style={S.navSignup}>Sign up free</Link>
        </div>
      </nav>

      {/* Main card */}
      <div style={S.card}>
        {/* Header */}
        <div style={S.cardHeader}>
          <OrgBadge institution={opp.institution} logoUrl={opp.institutionLogoUrl} />
          <div style={{ minWidth: 0 }}>
            <div style={S.institution}>{opp.institution}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={S.typeBadge}>{typeLabel}</span>
              {flag && <span style={S.countryChip}>{flag} {opp.country}</span>}
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 style={S.title}>{opp.title}</h1>

        {/* Summary */}
        <p style={S.summary}>{opp.summary}</p>

        {/* Info strip */}
        <div style={S.infoStrip}>
          <div style={S.infoItem}>
            <div style={S.infoLabel}>Deadline</div>
            <div style={S.infoValue}>{deadlineLabel}</div>
            {days !== null && (
              <div style={{
                ...S.daysChip,
                background: days <= 7 ? '#C4881C' : days <= 14 ? 'rgba(196,136,28,0.12)' : 'rgba(78,129,78,0.1)',
                color: days <= 7 ? '#fff' : days <= 14 ? '#8B6914' : '#3D6B3D',
              }}>
                {days} day{days !== 1 ? 's' : ''} left
              </div>
            )}
          </div>
          {opp.awardValueUsd != null && opp.awardValueUsd > 0 && (
            <div style={S.infoItem}>
              <div style={S.infoLabel}>Award value</div>
              <div style={S.infoValue}>
                ${(opp.awardValueUsd / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
            </div>
          )}
          {opp.fieldOfStudy && (
            <div style={S.infoItem}>
              <div style={S.infoLabel}>Field</div>
              <div style={S.infoValue}>{opp.fieldOfStudy}</div>
            </div>
          )}
          {opp.eligibilityLevel && (
            <div style={S.infoItem}>
              <div style={S.infoLabel}>Level</div>
              <div style={S.infoValue}>{formatType(opp.eligibilityLevel)}</div>
            </div>
          )}
        </div>

        {/* Sections */}
        {opp.whoItsFor && (
          <div style={S.section}>
            <div style={S.sectionLabel}>Who it is for</div>
            <div style={S.sectionBody} dangerouslySetInnerHTML={{ __html: opp.whoItsFor }} />
          </div>
        )}
        {opp.whatIsOffered && (
          <div style={S.section}>
            <div style={S.sectionLabel}>What is offered</div>
            <div style={S.sectionBody} dangerouslySetInnerHTML={{ __html: opp.whatIsOffered }} />
          </div>
        )}

        {/* CTA */}
        <div style={S.ctaBlock}>
          <div style={S.ctaGlass}>
            {opp.oppDateApply && (
              <div style={S.ctaApplyBadge}>OppDate Apply available</div>
            )}
            <div style={S.ctaHeading}>
              Interested in this opportunity?
            </div>
            <p style={S.ctaSub}>
              Sign up for OppDate to check your eligibility, save this listing, and apply with expert support.
            </p>
            <Link
              href={signUpUrl}
              style={{
                ...S.ctaBtn,
                ...(ctaHover ? S.ctaBtnHover : {}),
              }}
              onMouseEnter={() => setCtaHover(true)}
              onMouseLeave={() => setCtaHover(false)}
            >
              Get started - it's free
            </Link>
            <div style={S.ctaLoginLine}>
              Already have an account?{' '}
              <Link href={loginUrl} style={S.ctaLoginLink}>Log in</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal footer */}
      <footer style={S.footer}>
        <span style={S.footerText}>OppDate - Connecting ambition to opportunity, everywhere.</span>
      </footer>
    </div>
  )
}

const FONT = 'var(--font-sans, "DM Sans", system-ui, sans-serif)'
const SERIF = 'var(--font-serif, "Fraunces", Georgia, serif)'

const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #FAF3EA 0%, #F3E8D9 40%, #EDE1D1 100%)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  nav: {
    width: '100%',
    maxWidth: 880,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    boxSizing: 'border-box' as const,
  },
  navLogo: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    textDecoration: 'none',
  },
  navMark: {
    fontFamily: SERIF,
    fontWeight: 700,
    fontSize: 20,
    color: '#7A2D05',
    letterSpacing: '-0.02em',
  },
  navName: {
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: 17,
    color: '#2A1206',
    letterSpacing: '-0.01em',
  },
  navLogin: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: 600,
    color: '#7A2D05',
    textDecoration: 'none',
    padding: '8px 16px',
    borderRadius: 8,
    transition: 'background 120ms',
  },
  navSignup: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    textDecoration: 'none',
    padding: '8px 18px',
    borderRadius: 8,
    background: '#7A2D05',
    transition: 'background 120ms',
  },
  card: {
    width: '100%',
    maxWidth: 720,
    margin: '0 auto',
    padding: '0 24px 40px',
    boxSizing: 'border-box' as const,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  institution: {
    fontFamily: FONT,
    fontSize: 15,
    fontWeight: 600,
    color: '#4A3324',
    lineHeight: 1.3,
  },
  typeBadge: {
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 500,
    color: '#0E7490',
    padding: '2px 10px',
    borderRadius: 999,
    border: '1px solid #0E7490',
    lineHeight: '18px',
  },
  countryChip: {
    fontFamily: FONT,
    fontSize: 13,
    color: '#6B6660',
  },
  title: {
    margin: 0,
    fontFamily: SERIF,
    fontWeight: 700,
    fontSize: 32,
    lineHeight: 1.2,
    letterSpacing: '-0.01em',
    color: '#1F3242',
  },
  summary: {
    fontFamily: FONT,
    fontSize: 16,
    lineHeight: 1.6,
    color: '#4A3324',
    margin: '16px 0 0',
  },
  infoStrip: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 16,
    marginTop: 24,
    padding: '18px 20px',
    background: 'rgba(255,255,255,0.65)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(216,204,196,0.5)',
    borderRadius: 14,
  },
  infoItem: {
    flex: '1 1 auto',
    minWidth: 100,
  },
  infoLabel: {
    fontFamily: FONT,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: '#9E8070',
    marginBottom: 4,
  },
  infoValue: {
    fontFamily: FONT,
    fontSize: 15,
    fontWeight: 600,
    color: '#2A1206',
    lineHeight: 1.4,
  },
  daysChip: {
    display: 'inline-flex',
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 600,
    padding: '2px 10px',
    borderRadius: 999,
    marginTop: 6,
  },
  section: {
    marginTop: 28,
    paddingTop: 24,
    borderTop: '1px solid rgba(216,204,196,0.5)',
  },
  sectionLabel: {
    fontFamily: FONT,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: '#9E8070',
    marginBottom: 10,
  },
  sectionBody: {
    fontFamily: FONT,
    fontSize: 15,
    lineHeight: 1.65,
    color: '#4A3324',
  },
  ctaBlock: {
    marginTop: 36,
  },
  ctaGlass: {
    padding: '32px 28px',
    background: 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(216,204,196,0.5)',
    borderRadius: 18,
    textAlign: 'center' as const,
  },
  ctaApplyBadge: {
    display: 'inline-flex',
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 600,
    color: '#7A2D05',
    background: 'rgba(122,45,5,0.08)',
    padding: '4px 14px',
    borderRadius: 999,
    marginBottom: 14,
  },
  ctaHeading: {
    fontFamily: SERIF,
    fontWeight: 700,
    fontSize: 22,
    color: '#2A1206',
    lineHeight: 1.3,
  },
  ctaSub: {
    fontFamily: FONT,
    fontSize: 14,
    color: '#6B6660',
    lineHeight: 1.6,
    margin: '10px 0 20px',
    maxWidth: 420,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  ctaBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 320,
    height: 50,
    margin: '0 auto',
    fontFamily: FONT,
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
    textDecoration: 'none',
    borderRadius: 13,
    background: 'linear-gradient(135deg, #D4843A 0%, #7A2D05 100%)',
    boxShadow: '0 4px 16px rgba(122,45,5,0.28)',
    transition: 'background 160ms, box-shadow 160ms, transform 160ms',
  },
  ctaBtnHover: {
    background: 'linear-gradient(135deg, #C07630 0%, #6A2504 100%)',
    boxShadow: '0 7px 22px rgba(122,45,5,0.4)',
    transform: 'translateY(-1px)',
  },
  ctaLoginLine: {
    fontFamily: FONT,
    fontSize: 13,
    color: '#9E8070',
    marginTop: 14,
  },
  ctaLoginLink: {
    color: '#7A2D05',
    fontWeight: 600,
    textDecoration: 'none',
  },
  footer: {
    padding: '32px 24px',
    textAlign: 'center' as const,
  },
  footerText: {
    fontFamily: FONT,
    fontSize: 13,
    color: '#9E8070',
  },
  body: {
    fontFamily: FONT,
    fontSize: 15,
    lineHeight: 1.6,
    color: '#6B6660',
  },
} as const
