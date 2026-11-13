/* Shared legal page scaffold. Rendered by terms-page.jsx and privacy-page.jsx. */

const { NavBar, Footer, Eyebrow, Icon, Button } = window.OppDateDesignSystem_4aa598;
const MARK_FOOT = (window.__resources && window.__resources.monogram) || 'assets/oppdate-monogram.png';

const FOOTER_COLS = window.OM && window.OM.FOOTER_COLS || [
  { title: 'Opportunities', links: ['Browse all opportunities', 'By region', 'By type', 'Closing this week'] },
  { title: 'Services', links: [['Consultations', '/services/consultations'], ['Mentorship', '/services/mentorship'], ['eBooks', '/services/ebooks']] },
  { title: 'Company', links: ['Our Mission', 'Work With Us', 'Careers', 'Get Featured', 'Partner With Us', 'Become a Consultant', 'Become a Mentor', 'List Your eBook'] },
  { title: 'OppDate Apply', links: [['How it works', '/services/apply#flow'], ['Pricing', '/pricing'], ['Start an application', '/services/apply#start']] },
];

/* Hero trust badges — three plain-language commitments that frame the legal content
   as protection for the user, not fine-print to fear. */

function LegalHero({ pageType, title, accentWord, subtitle, effectiveDate, lastUpdated, companionLabel, companionHref }) {
  /* pageType: 'terms' | 'privacy' — drives the hero headline variant */
  return (
    <section className="om-tex om-tex-ink om-glow" style={{ background: 'var(--surface-dark)', position: 'relative', overflow: 'hidden' }}>
      <div className="wrap" style={{ padding: '80px var(--container-pad) 96px' }}>

        {/* Two-column hero head */}
        <div className="legal-hero-head">
          <div>
            <Eyebrow tone="gold" style={{ marginBottom: 20 }}>Legal</Eyebrow>
            <h1 style={{ color: 'var(--text-on-dark)', fontSize: 'clamp(40px, 5vw, 72px)', lineHeight: 1.0, letterSpacing: '-0.02em', maxWidth: '16ch', margin: 0 }}>
              {title}{' '}
              <span style={{ color: 'var(--decor-numeral)' }}>{accentWord}.</span>
            </h1>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <p style={{ color: 'var(--text-on-dark-quiet)', fontSize: 'var(--type-body-large-size)', lineHeight: 'var(--type-body-large-leading)', maxWidth: '46ch', margin: '0 0 28px' }}>
              {subtitle}
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Button as="a" href={companionHref} variant="secondary-on-ink">Also read: {companionLabel}</Button>
            </div>
          </div>
        </div>


        {/* Meta strip */}
        <div style={{ marginTop: 40, display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--line-on-dark)', paddingTop: 24 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'rgba(255,249,244,0.4)' }}>
            Effective <strong style={{ color: 'rgba(255,249,244,0.7)', fontWeight: 600 }}>{effectiveDate}</strong>
          </span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'rgba(255,249,244,0.4)' }}>
            Last updated <strong style={{ color: 'rgba(255,249,244,0.7)', fontWeight: 600 }}>{lastUpdated}</strong>
          </span>
        </div>
      </div>
    </section>
  );
}

function LegalPage({ pageType, title, accentWord, subtitle, effectiveDate, lastUpdated, companionLabel, companionHref, sections }) {
  const FooterWatermark = window.OM && window.OM.FooterWatermark;
  const [activeId, setActiveId] = React.useState(sections[0] && sections[0].id);
  const [showScrollTop, setShowScrollTop] = React.useState(false);

  React.useEffect(function () {
    function onScroll() {
      var nearBottom = window.scrollY + window.innerHeight >= document.body.scrollHeight - 300;
      setShowScrollTop(window.scrollY > 400 && !nearBottom);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return function () { window.removeEventListener('scroll', onScroll); };
  }, []);

  const observerRef = React.useRef(null);
  React.useEffect(function () {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(function (entries) {
      var visible = entries.filter(function (e) { return e.isIntersecting; });
      if (!visible.length) return;
      var top = visible.reduce(function (a, b) {
        return a.boundingClientRect.top < b.boundingClientRect.top ? a : b;
      });
      setActiveId(top.target.id);
    }, { rootMargin: '-10% 0px -70% 0px', threshold: 0 });
    sections.forEach(function (s) {
      var el = document.getElementById(s.id);
      if (el) observerRef.current.observe(el);
    });
    return function () { if (observerRef.current) observerRef.current.disconnect(); };
  }, [sections]);

  function scrollTo(id) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div>
      <style>{`
        .legal-hero-head { display: grid; grid-template-columns: minmax(0,1fr); gap: 32px; align-items: end; }
        @media (min-width: 768px) { .legal-hero-head { grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 56px; } }
.legal-grid { display: grid; grid-template-columns: minmax(0,1fr); gap: 0; }
        @media (min-width: 768px) { .legal-grid { grid-template-columns: 220px 1fr; gap: 56px; align-items: start; } }
        .legal-toc-aside { display: none; }
        @media (min-width: 768px) { .legal-toc-aside { display: block; align-self: start; position: sticky; top: 88px; max-height: calc(100vh - 108px); overflow-y: auto; } }
        .legal-toc-btn { display: block; width: 100%; text-align: left; background: none; border: none; cursor: pointer; padding: 7px 0 7px 12px; font-family: var(--font-sans); font-size: 12.5px; margin-bottom: 2px; transition: color 140ms ease, border-left-color 140ms ease; }
        .legal-toc-btn:hover { color: var(--decor-numeral) !important; }
        .legal-prose h2 { font-family: var(--font-serif); font-weight: 700; font-size: 22px; color: var(--text-heading); margin: 0 0 14px; letter-spacing: -0.01em; line-height: 1.3; }
        .legal-prose p { font-family: var(--font-sans); font-size: 14.5px; line-height: 1.75; color: var(--text-body); margin: 0 0 14px; }
        .legal-prose ul { margin: 0 0 16px; padding-left: 20px; }
        .legal-prose li { font-family: var(--font-sans); font-size: 14.5px; line-height: 1.75; color: var(--text-body); margin-bottom: 6px; }
        .legal-prose strong { color: var(--text-heading); font-weight: 600; }
        .legal-prose a { color: var(--action); text-decoration: underline; text-underline-offset: 3px; }
        .legal-prose a:hover { color: var(--action-hover); }
        .legal-prose .notice { background: var(--action-wash); border-left: 3px solid var(--action); border-radius: 0 8px 8px 0; padding: 12px 16px; margin: 16px 0; }
        .legal-prose .notice p { margin: 0; font-size: 13.5px; color: var(--text-body); }
      `}</style>

      <NavBar tone="dark" markSize={40} markSrc={MARK_FOOT} />

      <LegalHero
        pageType={pageType}
        title={title}
        accentWord={accentWord}
        subtitle={subtitle}
        effectiveDate={effectiveDate}
        lastUpdated={lastUpdated}
        companionLabel={companionLabel}
        companionHref={companionHref}
      />

      {/* Content band — light surface for readability, alternating from the dark hero */}
      <div id="content" style={{ background: 'var(--surface-card)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '72px 24px 100px' }}>
          <div className="legal-grid">

            {/* Sticky ToC */}
            <aside className="legal-toc-aside">
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-quiet)', marginBottom: 14 }}>
                  Contents
                </div>
                <nav>
                  {sections.map(function (s, i) {
                    var isActive = activeId === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={function () { scrollTo(s.id); }}
                        className="legal-toc-btn"
                        style={{
                          borderLeft: '2px solid ' + (isActive ? 'var(--action)' : 'var(--line)'),
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? 'var(--action)' : 'var(--text-quiet)',
                        }}
                      >
                        <span style={{ color: 'var(--decor-numeral)', marginRight: 6, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {s.title}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Prose */}
            <div className="legal-prose">
              {sections.map(function (s, i) {
                return (
                  <section
                    key={s.id}
                    id={s.id}
                    style={{
                      paddingTop: 36,
                      marginBottom: 8,
                      borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
                      scrollMarginTop: 90,
                    }}
                  >
                    <h2>{s.title}</h2>
                    {s.content}
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer — dark surface to bookend the page */}
      <div style={{ position: 'relative', background: 'var(--surface-dark)', isolation: 'isolate' }}>
        {FooterWatermark && React.createElement(FooterWatermark)}
        <Footer markSrc={MARK_FOOT} columns={FOOTER_COLS} style={{ background: 'transparent', position: 'relative', zIndex: 1 }} />
      </div>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={function () { window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          aria-label="Back to top"
          className="om-circle-btn"
          style={{
            position: 'fixed', bottom: 28, right: 28, zIndex: 50,
            width: 44, height: 44, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,249,244,0.2)',
            background: 'var(--surface-dark-raised)',
            color: 'var(--text-on-dark)',
            cursor: 'pointer',
          }}
        >
          {React.createElement(Icon, { name: 'arrow-up', size: 18 })}
        </button>
      )}
    </div>
  );
}

window.LegalPage = LegalPage;
