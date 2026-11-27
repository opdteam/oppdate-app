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
  description: string
  tags: string[]
  sourceUrl: string | null
}

// --- Design tokens (from design system) ---
const C = {
  ink: '#160E08',
  inkRaised: '#241708',
  inkLine: 'rgba(255,249,244,0.12)',
  bg: '#FFF9F4',
  surface: '#FFFFFF',
  sunken: '#FBEEE1',
  border: '#E4D5C6',
  borderStrong: '#CBB59F',
  textInk: '#1A0F06',
  textBody: '#4A3626',
  textQuiet: '#8C7461',
  textInverse: '#FFF9F4',
  textInverseQuiet: 'rgba(255,249,244,0.64)',
  action: '#C2410C',
  actionHover: '#A8380A',
  actionWash: '#F4DCC9',
  gold: '#E8A84D',
  mascot: '#B5530A',
  success: '#3F7D45',
  successBg: '#E7F2E5',
  pending: '#B8791C',
  pendingBg: '#FBF0DC',
}

const FONT = 'var(--font-sans, "DM Sans", system-ui, sans-serif)'
const SERIF = 'var(--font-serif, "Fraunces", Georgia, serif)'

// --- Helpers ---
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

// --- Shared link columns for footer ---
const FOOTER_COLS = [
  { title: 'Opportunities', links: [['Browse all opportunities', '/opportunities'], ['By region', '/opportunities?tab=region'], ['By type', '/opportunities?tab=type'], ['Closing this week', '/opportunities?tab=closing']] },
  { title: 'Services', links: [['Consultations', '/services/consultations'], ['Mentorship', '/services/mentorship'], ['eBooks', '/services/ebooks']] },
  { title: 'Company', links: [['About Us', '/company'], ['Work With Us', '/contact#work-with-us'], ['Careers', '/contact#careers'], ['Get Featured', '/contact#get-featured'], ['Partner With Us', '/contact#partner'], ['Become a Consultant', '/contact#consultant'], ['Become a Mentor', '/contact#mentor'], ['List Your eBook', '/contact#list-ebook'], ['Contact', '/contact']] },
  { title: 'OppDate Apply', links: [['How it works', '/services/apply#flow'], ['Pricing', '/pricing'], ['Start an application', '/services/apply#start']] },
]

// --- Subcomponents ---

function NavBar({ loginUrl, signUpUrl }: { loginUrl: string; signUpUrl: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <nav style={{ width: '100%', background: C.ink, position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56 }}>
        {/* Left links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }} className="opp-prev-nav-left">
          <Link href="/company" style={{ fontFamily: FONT, fontSize: 15, fontWeight: 500, color: C.textInverse, textDecoration: 'none', opacity: 0.75 }}>Company</Link>
          <Link href="/services/consultations" style={{ fontFamily: FONT, fontSize: 15, fontWeight: 500, color: C.textInverse, textDecoration: 'none', opacity: 0.75 }}>Services</Link>
          <Link href="/services/apply" style={{ fontFamily: FONT, fontSize: 15, fontWeight: 500, color: C.textInverse, textDecoration: 'none', opacity: 0.75 }}>OppDate Apply</Link>
        </div>

        {/* Center logo */}
        <Link href="/" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 18, color: C.gold, letterSpacing: '-0.02em' }}>opd</span>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 16, color: C.textInverse, letterSpacing: '-0.01em' }}>OppDate</span>
        </Link>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="opp-prev-nav-right">
          <Link href={loginUrl} style={{ fontFamily: FONT, fontSize: 14, fontWeight: 500, color: C.textInverse, textDecoration: 'none', padding: '8px 14px', opacity: 0.85 }}>Log in</Link>
          <Link href={signUpUrl} style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.textInverse, textDecoration: 'none', padding: '10px 20px', borderRadius: 9999, background: C.action, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Get started
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,249,244,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 10L10 2M10 2H4M10 2V8" stroke={C.textInverse} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="opp-prev-hamburger"
          style={{ display: 'none', background: 'none', border: 'none', padding: 8, cursor: 'pointer' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d={menuOpen ? 'M6 6l12 12M6 18L18 6' : 'M4 7h16M4 12h16M4 17h16'} stroke={C.textInverse} strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="opp-prev-mobile-menu" style={{ padding: '16px 24px 24px', borderTop: `1px solid ${C.inkLine}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link href="/company" style={{ fontFamily: FONT, fontSize: 15, color: C.textInverse, textDecoration: 'none', opacity: 0.8 }}>Company</Link>
            <Link href="/services/consultations" style={{ fontFamily: FONT, fontSize: 15, color: C.textInverse, textDecoration: 'none', opacity: 0.8 }}>Services</Link>
            <Link href="/services/apply" style={{ fontFamily: FONT, fontSize: 15, color: C.textInverse, textDecoration: 'none', opacity: 0.8 }}>OppDate Apply</Link>
            <div style={{ borderTop: `1px solid ${C.inkLine}`, paddingTop: 12, display: 'flex', gap: 10 }}>
              <Link href={loginUrl} style={{ fontFamily: FONT, fontSize: 14, fontWeight: 500, color: C.textInverse, textDecoration: 'none', padding: '8px 16px', border: `1px solid ${C.inkLine}`, borderRadius: 8 }}>Log in</Link>
              <Link href={signUpUrl} style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.textInverse, textDecoration: 'none', padding: '8px 20px', borderRadius: 9999, background: C.action }}>Get started</Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

function OrgBadge({ institution, logoUrl }: { institution: string; logoUrl: string | null }) {
  const initials = institution.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <div style={{
      width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
      background: C.sunken, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT, fontWeight: 700, fontSize: 16, color: C.textInk,
      border: `2px solid ${C.border}`,
    }}>
      {logoUrl
        ? <img src={logoUrl} alt={institution} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        : initials}
    </div>
  )
}

function SiteFooter() {
  return (
    <div style={{ background: C.ink, position: 'relative' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '64px 24px 0' }}>
        {/* Top row: logo + tagline + get started */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 48 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 22, color: C.gold }}>opd</span>
              <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 18, color: C.textInverse }}>OppDate</span>
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: C.gold }}>Opportunities, up to date.</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <Link href="/auth/register" style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.textInverse, textDecoration: 'none', padding: '10px 20px', borderRadius: 9999, background: C.action, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Get started
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,249,244,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 10L10 2M10 2H4M10 2V8" stroke={C.textInverse} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            </Link>
            <a href="mailto:support@oppdate.app" style={{ fontFamily: FONT, fontSize: 13, color: C.textInverseQuiet, textDecoration: 'none' }}>support@oppdate.app</a>
          </div>
        </div>

        {/* Link columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, paddingBottom: 48 }} className="opp-prev-footer-cols">
          {FOOTER_COLS.map(col => (
            <div key={col.title}>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.textInverseQuiet, marginBottom: 16 }}>{col.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(link => {
                  const [label, href] = Array.isArray(link) ? link : [link, '#']
                  return <Link key={label} href={href} style={{ fontFamily: FONT, fontSize: 14, color: C.textInverseQuiet, textDecoration: 'none', lineHeight: 1.4 }}>{label}</Link>
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Social + newsletter row */}
        <div style={{ borderTop: `1px solid ${C.inkLine}`, padding: '24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { slug: 'x', href: 'https://x.com/oppdate_app', path: 'M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.59-6.64 7.59H.48l8.6-9.83L0 1.15h7.59l5.25 6.93 6.06-6.93zm-1.29 19.5h2.04L6.48 3.24H4.3l13.31 17.41z' },
              { slug: 'linkedin', href: 'https://linkedin.com/company/oppdate', path: 'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43A2.06 2.06 0 013.28 5.37 2.06 2.06 0 015.34 3.3a2.07 2.07 0 012.06 2.07A2.06 2.06 0 015.34 7.43zM7.12 20.45H3.56V9h3.56v11.45z' },
              { slug: 'instagram', href: 'https://instagram.com/oppdate.app', path: 'M12 2.16c2.68 0 3 .01 4.04.06 3.13.14 4.6 1.63 4.74 4.74.05 1.05.06 1.36.06 4.04s-.01 3-.06 4.04c-.14 3.1-1.6 4.6-4.74 4.74-1.05.05-1.36.06-4.04.06s-3-.01-4.04-.06c-3.13-.15-4.6-1.64-4.74-4.74-.05-1.05-.06-1.37-.06-4.04s.01-3 .06-4.04c.15-3.11 1.64-4.6 4.74-4.74 1.05-.05 1.37-.06 4.04-.06zM12 0C9.28 0 8.94.01 7.88.06 3.66.26.26 3.66.06 7.88.01 8.94 0 9.28 0 12s.01 3.06.06 4.12c.2 4.22 3.6 7.62 7.82 7.82 1.06.05 1.4.06 4.12.06s3.06-.01 4.12-.06c4.22-.2 7.62-3.6 7.82-7.82.05-1.06.06-1.4.06-4.12s-.01-3.06-.06-4.12C23.74 3.66 20.34.26 16.12.06 15.06.01 14.72 0 12 0zm0 5.84a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zM12 16a4 4 0 110-8 4 4 0 010 8zm6.4-11.85a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z' },
            ].map(s => (
              <a key={s.slug} href={s.href} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.inkLine}`, background: 'transparent' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={C.textInverse}><path d={s.path}/></svg>
              </a>
            ))}
          </div>
        </div>

        {/* Legal bottom */}
        <div style={{ borderTop: `1px solid ${C.inkLine}`, padding: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontFamily: FONT, fontSize: 13, color: C.textInverseQuiet }}>2026 OppDate. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link href="/legal/terms" style={{ fontFamily: FONT, fontSize: 13, color: C.textInverseQuiet, textDecoration: 'none' }}>Terms of service</Link>
            <Link href="/legal/privacy" style={{ fontFamily: FONT, fontSize: 13, color: C.textInverseQuiet, textDecoration: 'none' }}>Privacy policy</Link>
            <Link href="/help" style={{ fontFamily: FONT, fontSize: 13, color: C.textInverseQuiet, textDecoration: 'none' }}>Help centre</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- CSS injected via style tag for responsive breakpoints ---
const RESPONSIVE_CSS = `
.opp-prev-hamburger { display: none !important; }
@media (max-width: 768px) {
  .opp-prev-nav-left { display: none !important; }
  .opp-prev-nav-right { display: none !important; }
  .opp-prev-hamburger { display: flex !important; }
  .opp-prev-hero-inner { flex-direction: column !important; }
  .opp-prev-hero-meta { flex-wrap: wrap !important; }
  .opp-prev-info-grid { grid-template-columns: 1fr 1fr !important; }
  .opp-prev-footer-cols { grid-template-columns: 1fr 1fr !important; }
  .opp-prev-cta-heading { font-size: 32px !important; }
}
@media (max-width: 480px) {
  .opp-prev-info-grid { grid-template-columns: 1fr !important; }
  .opp-prev-footer-cols { grid-template-columns: 1fr !important; }
}
`

// --- Main component ---

export function OpportunityPreview({ opp, appUrl }: { opp: OppData | null; appUrl: string }) {
  const [ctaHover, setCtaHover] = useState(false)

  if (!opp) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg }}>
        <style dangerouslySetInnerHTML={{ __html: RESPONSIVE_CSS }} />
        <NavBar loginUrl="/auth/login" signUpUrl="/auth/register" />
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 32, color: C.textInk, margin: 0 }}>Opportunity not found</h1>
          <p style={{ fontFamily: FONT, fontSize: 16, color: C.textBody, marginTop: 12, lineHeight: 1.6 }}>This opportunity may have been removed or the link is incorrect.</p>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 24, padding: '12px 32px', borderRadius: 9999, background: C.action, fontFamily: FONT, fontSize: 15, fontWeight: 700, color: C.textInverse, textDecoration: 'none' }}>
            Go to OppDate
          </Link>
        </div>
        <SiteFooter />
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
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <style dangerouslySetInnerHTML={{ __html: RESPONSIVE_CSS }} />
      <NavBar loginUrl={loginUrl} signUpUrl={signUpUrl} />

      {/* Hero section - dark ink background */}
      <section style={{ background: C.ink, padding: '64px 24px 72px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          {/* Institution + meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }} className="opp-prev-hero-inner">
            <OrgBadge institution={opp.institution} logoUrl={opp.institutionLogoUrl} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 600, color: C.textInverse, lineHeight: 1.3 }}>{opp.institution}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }} className="opp-prev-hero-meta">
                <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.action, padding: '3px 12px', borderRadius: 9999, border: `1px solid ${C.action}`, lineHeight: '18px' }}>{typeLabel}</span>
                {flag && <span style={{ fontFamily: FONT, fontSize: 13, color: C.textInverseQuiet }}>{flag} {opp.country}</span>}
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 style={{ margin: 0, fontFamily: SERIF, fontWeight: 700, fontSize: 'clamp(32px, 4vw, 48px)', lineHeight: 1.08, letterSpacing: '-0.01em', color: C.textInverse, maxWidth: '20ch' }}>
            {opp.title}
          </h1>

          {/* Summary */}
          <p style={{ fontFamily: FONT, fontSize: 18, lineHeight: 1.6, color: C.textInverseQuiet, margin: '20px 0 0', maxWidth: '56ch' }}>
            {opp.summary}
          </p>

          {/* Tags */}
          {opp.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
              {opp.tags.map(tag => (
                <span key={tag} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: C.textInverseQuiet, padding: '4px 12px', borderRadius: 9999, border: `1px solid ${C.inkLine}`, background: C.inkRaised }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Content body */}
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 24px' }}>

        {/* Info strip - pulled up over the dark section */}
        <div style={{ marginTop: -32, marginBottom: 48, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: C.border, borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }} className="opp-prev-info-grid">
          {/* Deadline */}
          <div style={{ padding: '20px 22px', background: C.surface }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.textQuiet, marginBottom: 6 }}>Deadline</div>
            <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: C.textInk, lineHeight: 1.4 }}>{deadlineLabel}</div>
            {days !== null && (
              <div style={{
                display: 'inline-flex', fontFamily: FONT, fontSize: 12, fontWeight: 600,
                padding: '2px 10px', borderRadius: 9999, marginTop: 6,
                background: days <= 7 ? C.action : days <= 14 ? C.pendingBg : C.successBg,
                color: days <= 7 ? C.textInverse : days <= 14 ? C.pending : C.success,
              }}>
                {days} day{days !== 1 ? 's' : ''} left
              </div>
            )}
          </div>

          {/* Award value */}
          {opp.awardValueUsd != null && opp.awardValueUsd > 0 ? (
            <div style={{ padding: '20px 22px', background: C.surface }}>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.textQuiet, marginBottom: 6 }}>Award value</div>
              <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: C.textInk }}>
                ${(opp.awardValueUsd / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px 22px', background: C.surface }}>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.textQuiet, marginBottom: 6 }}>Region</div>
              <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: C.textInk }}>{opp.region}</div>
            </div>
          )}

          {/* Field of study */}
          <div style={{ padding: '20px 22px', background: C.surface }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.textQuiet, marginBottom: 6 }}>
              {opp.fieldOfStudy ? 'Field' : 'Country'}
            </div>
            <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: C.textInk }}>
              {opp.fieldOfStudy || opp.country}
            </div>
          </div>

          {/* Level */}
          <div style={{ padding: '20px 22px', background: C.surface }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.textQuiet, marginBottom: 6 }}>
              {opp.eligibilityLevel ? 'Level' : 'Type'}
            </div>
            <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: C.textInk }}>
              {opp.eligibilityLevel ? formatType(opp.eligibilityLevel) : typeLabel}
            </div>
          </div>
        </div>

        {/* Description */}
        {opp.description && opp.description.trim() && (
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.textQuiet, marginBottom: 12 }}>About this opportunity</div>
            <div style={{ fontFamily: FONT, fontSize: 16, lineHeight: 1.65, color: C.textBody }} dangerouslySetInnerHTML={{ __html: opp.description }} />
          </div>
        )}

        {/* Who it is for */}
        {opp.whoItsFor && (
          <div style={{ marginBottom: 48, paddingTop: 40, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.textQuiet, marginBottom: 12 }}>Who it is for</div>
            <div style={{ fontFamily: FONT, fontSize: 16, lineHeight: 1.65, color: C.textBody }} dangerouslySetInnerHTML={{ __html: opp.whoItsFor }} />
          </div>
        )}

        {/* What is offered */}
        {opp.whatIsOffered && (
          <div style={{ marginBottom: 48, paddingTop: 40, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.textQuiet, marginBottom: 12 }}>What is offered</div>
            <div style={{ fontFamily: FONT, fontSize: 16, lineHeight: 1.65, color: C.textBody }} dangerouslySetInnerHTML={{ __html: opp.whatIsOffered }} />
          </div>
        )}

        {/* Source URL */}
        {opp.sourceUrl && (
          <div style={{ marginBottom: 48, paddingTop: 40, borderTop: `1px solid ${C.border}` }}>
            <a href={opp.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: C.action, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              View original listing
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.action} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>
        )}
      </div>

      {/* CTA section - dark ink, matching site pattern */}
      <section style={{ background: C.ink, padding: '120px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          {opp.oppDateApply && (
            <div style={{ display: 'inline-flex', fontFamily: FONT, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.gold, marginBottom: 16 }}>
              OppDate Apply available
            </div>
          )}
          <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 'clamp(32px, 4vw, 48px)', lineHeight: 1.05, color: C.textInverse, margin: '0 auto', maxWidth: '22ch' }} className="opp-prev-cta-heading">
            Interested in this opportunity?
          </h2>
          <p style={{ fontFamily: FONT, fontSize: 18, lineHeight: 1.6, color: C.textInverseQuiet, margin: '20px auto 0', maxWidth: '54ch' }}>
            Sign up for OppDate to check your eligibility, save this listing, and apply with expert support.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }}>
            <Link
              href={signUpUrl}
              style={{
                fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C.textInverse, textDecoration: 'none',
                padding: '14px 28px', borderRadius: 9999, background: C.action,
                display: 'inline-flex', alignItems: 'center', gap: 10,
                transition: 'background 160ms, transform 160ms',
                ...(ctaHover ? { background: C.actionHover, transform: 'translateY(-1px)' } : {}),
              }}
              onMouseEnter={() => setCtaHover(true)}
              onMouseLeave={() => setCtaHover(false)}
            >
              Get started - it&apos;s free
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,249,244,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 10L10 2M10 2H4M10 2V8" stroke={C.textInverse} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            </Link>
            <Link href="/opportunities" style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: C.textInverse, textDecoration: 'none', padding: '14px 28px', borderRadius: 9999, border: `1px solid ${C.inkLine}`, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              Browse opportunities
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,249,244,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 10L10 2M10 2H4M10 2V8" stroke={C.textInverse} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            </Link>
          </div>
          <p style={{ marginTop: 24, fontFamily: FONT, fontSize: 13, color: 'rgba(255,249,244,0.5)' }}>
            Create a free account to get started. Premium, from $12 per month*, unlocks the full opportunity library.
            <br />
            *Pricing varies by region.{' '}
            <Link href="/pricing#tiers" style={{ color: 'rgba(255,249,244,0.72)', textDecoration: 'none' }}>See full pricing</Link>.
          </p>
          <div style={{ marginTop: 14, fontFamily: FONT, fontSize: 13, color: C.textInverseQuiet }}>
            Already have an account?{' '}
            <Link href={loginUrl} style={{ color: C.textInverse, fontWeight: 600, textDecoration: 'none' }}>Log in</Link>
          </div>
        </div>
      </section>

      {/* Full footer */}
      <SiteFooter />
    </div>
  )
}
