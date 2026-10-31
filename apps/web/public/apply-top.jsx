const { Button, Eyebrow, Icon, Badge } = window.OppDateDesignSystem_4aa598;
const APPLY_MARK = (window.__resources && window.__resources.monogram) || 'assets/oppdate-monogram.png';

const BENEFITS = [
  ['layers', 'Full application takeover'],
  ['trending-up', 'Higher acceptance rates'],
  ['user-check', 'Expert-led submissions'],
  ['file-check-2', 'Optimized application materials'],
  ['messages-square', 'Direct access to the OppDate team'],
  ['eye', 'Full process involvement'],
  ['activity', 'Application tracking'],
  ['receipt', 'Clear upfront pricing'],
  ['zap', 'Fast efficient processing'],
];

/* Hero zone. Ink surface with the shared dot texture and the closing section's radial clay
   glow, so the page opens in the same architectural register the landing page closes in.
   The checklist is the hero's main content, not an afterthought: nine items in three columns,
   each one a clay check disc against the ink. */
function ApplyHero() {
  return (
    <section id="apply-top" className="om-tex om-tex-ink om-glow" style={{ background: 'var(--surface-dark)' }}>
      <div className="wrap" style={{ padding: '72px var(--container-pad) 96px' }}>
        <div className="apply-hero-head">
          <div>
            <Eyebrow tone="gold" style={{ marginBottom: 18 }}>OppDate Apply</Eyebrow>
            <h1 style={{ color: 'var(--text-on-dark)', maxWidth: '14ch', fontSize: 'clamp(38px, 4.6vw, 66px)' }}>Stop applying. <span style={{ color: 'var(--decor-numeral)' }}>Start winning.</span></h1>
          </div>
          <div>
            <p style={{ color: 'var(--text-on-dark-quiet)', fontSize: 'var(--type-body-large-size)', lineHeight: 'var(--type-body-large-leading)', maxWidth: '46ch' }}>
              Hand an opportunity to the OppDate team and we run the application from eligibility through submission. You follow the whole process in a single thread, at a price agreed before any work starts.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
              <Button as="a" href="#flow">See how it works</Button>
              <Button as="a" href="/opportunities" variant="secondary-on-ink">Browse opportunities</Button>
            </div>
          </div>
        </div>
        <div className="apply-benefits" style={{ marginTop: 56, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '14px 28px', borderTop: '1px solid var(--line-on-dark)', paddingTop: 36 }}>
          {BENEFITS.map(([icon, label]) => (
            <div key={label} data-reveal style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
              <span style={{ flex: 'none', width: 34, height: 34, borderRadius: 'var(--radius-pill)', background: 'var(--action)', color: 'var(--color-text-inverse)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={icon} size={17} />
              </span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 500, color: 'var(--text-on-dark)', textWrap: 'pretty' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

window.OMA = Object.assign(window.OMA || {}, { ApplyHero, APPLY_MARK });
