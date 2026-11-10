'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

export interface LegalSection {
  id: string
  title: string
  content: React.ReactNode
}

interface LegalPageProps {
  title: string
  subtitle: string
  effectiveDate: string
  lastUpdated: string
  sections: LegalSection[]
  companionLabel: string
  companionHref: string
}

export function LegalPage({ title, subtitle, effectiveDate, lastUpdated, sections, companionLabel, companionHref }: LegalPageProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '')
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Highlight the ToC entry that is currently visible in the viewport
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length > 0) {
          // Pick the topmost visible section
          const top = visible.reduce((a, b) => a.boundingClientRect.top < b.boundingClientRect.top ? a : b)
          setActiveId(top.target.id)
        }
      },
      { rootMargin: '-10% 0px -70% 0px', threshold: 0 }
    )
    sections.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) observerRef.current!.observe(el)
    })
    return () => observerRef.current?.disconnect()
  }, [sections])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 24px 80px' }}>
      {/* Page header */}
      <div style={{ marginBottom: 48 }}>
        <div style={{
          display: 'inline-block',
          fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 700,
          color: 'var(--opp-ginger-dark)', textTransform: 'uppercase', letterSpacing: '0.08em',
          background: 'rgba(122,45,5,0.07)', border: '1px solid rgba(122,45,5,0.15)',
          borderRadius: 999, padding: '4px 12px', marginBottom: 16,
        }}>Legal</div>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 'clamp(28px, 4vw, 42px)',
          color: 'var(--opp-ink)', lineHeight: 1.15, letterSpacing: '-0.02em',
          margin: '0 0 12px',
        }}>{title}</h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--opp-mute)', margin: '0 0 16px', lineHeight: 1.6 }}>
          {subtitle}
        </p>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--opp-mute)' }}>
            Effective: <strong style={{ color: 'var(--opp-ink-2)' }}>{effectiveDate}</strong>
          </span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--opp-mute)' }}>
            Last updated: <strong style={{ color: 'var(--opp-ink-2)' }}>{lastUpdated}</strong>
          </span>
        </div>
        {/* Companion doc link */}
        <div style={{
          marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--opp-cream-2)', border: '1px solid var(--opp-line)',
          borderRadius: 10, padding: '10px 16px',
        }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--opp-mute)' }}>Also read:</span>
          <Link href={companionHref} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--opp-ginger-dark)', textDecoration: 'none' }}>
            {companionLabel} &rarr;
          </Link>
        </div>
      </div>

      {/* Two-column layout: ToC left, content right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 0 }} className="legal-grid">
        <style>{`
          @media (min-width: 768px) {
            .legal-grid { grid-template-columns: 220px 1fr !important; gap: 48px !important; align-items: start; }
          }
          .toc-link { transition: color 140ms ease, border-left-color 140ms ease; }
          .toc-link:hover { color: var(--opp-ginger-dark) !important; }
          .prose h2 { font-family: var(--font-serif); font-weight: 700; font-size: 22px; color: var(--opp-ink); margin: 0 0 14px; letter-spacing: -0.01em; line-height: 1.3; }
          .prose p { font-family: var(--font-sans); font-size: 14.5px; line-height: 1.75; color: var(--opp-ink-2); margin: 0 0 14px; }
          .prose ul { margin: 0 0 16px; padding-left: 20px; }
          .prose li { font-family: var(--font-sans); font-size: 14.5px; line-height: 1.75; color: var(--opp-ink-2); margin-bottom: 6px; }
          .prose strong { color: var(--opp-ink); font-weight: 600; }
          .prose a { color: var(--opp-ginger-dark); text-decoration: underline; text-underline-offset: 3px; }
          .prose a:hover { color: var(--opp-ginger-mid); }
          .prose .notice { background: rgba(122,45,5,0.05); border-left: 3px solid var(--opp-ginger-dark); border-radius: 0 8px 8px 0; padding: 12px 16px; margin: 16px 0; }
          .prose .notice p { margin: 0; font-size: 13.5px; }
        `}</style>

        {/* Table of contents — sticky on desktop */}
        <aside style={{ display: 'none' }} className="legal-toc">
          <div style={{ position: 'sticky', top: 76 }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--opp-mute)', marginBottom: 14 }}>
              Contents
            </div>
            <nav>
              {sections.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className="toc-link"
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: 'none', border: 'none', cursor: 'pointer',
                    borderLeft: `2px solid ${activeId === s.id ? 'var(--opp-ginger-dark)' : 'var(--opp-line)'}`,
                    paddingLeft: 12, paddingTop: 7, paddingBottom: 7,
                    fontFamily: 'var(--font-sans)', fontSize: 12.5,
                    fontWeight: activeId === s.id ? 600 : 400,
                    color: activeId === s.id ? 'var(--opp-ginger-dark)' : 'var(--opp-mute)',
                    marginBottom: 2,
                    transition: 'all 140ms ease',
                  }}
                >
                  <span style={{ color: 'var(--opp-peach)', marginRight: 6, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {s.title}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="prose">
          {sections.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              style={{
                paddingTop: 36,
                marginBottom: 8,
                borderTop: i === 0 ? 'none' : '1px solid var(--opp-line)',
                scrollMarginTop: 80,
              }}
            >
              <h2>{s.title}</h2>
              {s.content}
            </section>
          ))}
        </div>
      </div>

      {/* Show ToC on desktop via CSS */}
      <style>{`
        @media (min-width: 768px) {
          .legal-toc { display: block !important; }
        }
      `}</style>
    </div>
  )
}
