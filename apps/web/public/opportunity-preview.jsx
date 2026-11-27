const { Button, Eyebrow, Icon, Footer } = window.OppDateDesignSystem_4aa598;
const OPP_MARK = (window.__resources && window.__resources.monogram) || 'assets/oppdate-monogram.png';

const API_URL = (() => {
  if (window.__apiBase) return window.__apiBase.replace(/\/$/, '');
  const loc = window.location;
  if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') return 'http://localhost:4000';
  return 'https://api.oppdate.app';
})();

function daysUntil(deadline) {
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return null;
  const diff = d.getTime() - Date.now();
  if (diff < 0) return null;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDeadline(deadline) {
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatType(type) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const CC = {
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
};

function countryFlag(country) {
  const code = CC[country.toLowerCase()] || country.slice(0, 2).toUpperCase();
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

function OrgBadge({ institution, logoUrl }) {
  const initials = institution.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div style={{
      width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
      background: 'var(--surface-band)', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 16, color: 'var(--text-heading)',
      border: '2px solid var(--line)',
    }}>
      {logoUrl
        ? <img src={logoUrl} alt={institution} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        : initials}
    </div>
  );
}

function InfoCell({ label, children }) {
  return (
    <div style={{ padding: '20px 22px', background: 'var(--surface-card)' }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--type-eyebrow-size)', fontWeight: 'var(--type-eyebrow-weight)', letterSpacing: 'var(--type-eyebrow-tracking)', textTransform: 'uppercase', color: 'var(--text-quiet)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--text-heading)', lineHeight: 1.4 }}>{children}</div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--type-eyebrow-size)', fontWeight: 'var(--type-eyebrow-weight)', letterSpacing: 'var(--type-eyebrow-tracking)', textTransform: 'uppercase', color: 'var(--text-quiet)', marginBottom: 12 }}>{children}</div>
  );
}

function OpportunityHero({ opp }) {
  const [inLoad, setInLoad] = React.useState(false);
  React.useEffect(() => {
    const r = requestAnimationFrame(() => setInLoad(true));
    return () => cancelAnimationFrame(r);
  }, []);
  const step = (n, style) => ({
    style: Object.assign({
      opacity: inLoad ? 1 : 0,
      translate: inLoad ? '0 0' : '-20px 24px',
      transition: 'opacity .7s var(--ease-out-soft) ' + (n * 0.11) + 's, translate .7s var(--ease-out-soft) ' + (n * 0.11) + 's',
    }, style),
  });

  const typeLabel = formatType(opp.type);
  const flag = countryFlag(opp.country);
  const tags = Array.isArray(opp.tags) ? opp.tags : [];

  return (
    <section id="opp-hero" className="om-tex om-tex-ink om-glow" data-no-reveal style={{ background: 'var(--surface-dark)' }}>
      <div className="wrap" style={{ padding: '64px var(--container-pad) 72px' }}>
        <div {...step(1, { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 })} className="opp-hero-row">
          <OrgBadge institution={opp.institution} logoUrl={opp.institutionLogoUrl} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, color: 'var(--text-on-dark)', lineHeight: 1.3 }}>{opp.institution}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--action)', padding: '3px 12px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--action)', lineHeight: '18px' }}>{typeLabel}</span>
              {flag && <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-on-dark-quiet)' }}>{flag} {opp.country}</span>}
            </div>
          </div>
        </div>

        <h1 {...step(2, { margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 'clamp(32px, 4.6vw, 52px)', lineHeight: 1.08, letterSpacing: '-0.01em', color: 'var(--text-on-dark)', maxWidth: '20ch' })}>
          {opp.title}
        </h1>

        <p {...step(3, { fontFamily: 'var(--font-sans)', fontSize: 'var(--type-body-large-size)', lineHeight: 'var(--type-body-large-leading)', color: 'var(--text-on-dark-quiet)', margin: '20px 0 0', maxWidth: '56ch' })}>
          {opp.summary}
        </p>

        {tags.length > 0 && (
          <div {...step(4, { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 })}>
            {tags.map(tag => (
              <span key={tag} style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: 'var(--text-on-dark-quiet)', padding: '4px 12px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--line-on-dark)', background: 'var(--surface-dark-raised)' }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function OpportunityBody({ opp }) {
  const days = daysUntil(opp.deadline);
  const deadlineLabel = formatDeadline(opp.deadline);
  const typeLabel = formatType(opp.type);

  const daysColor = days != null
    ? days <= 7 ? { bg: 'var(--action)', color: 'var(--text-on-dark)' }
    : days <= 14 ? { bg: 'var(--color-status-pending-bg)', color: 'var(--color-status-pending)' }
    : { bg: 'var(--color-status-success-bg)', color: 'var(--color-status-success)' }
    : null;

  return (
    <div className="wrap" style={{ padding: '0 var(--container-pad) 40px' }}>
      {/* Info grid - pulled up */}
      <div style={{ marginTop: -32, marginBottom: 48, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--line)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }} className="opp-info-grid">
        <InfoCell label="Deadline">
          {deadlineLabel}
          {days != null && daysColor && (
            <div style={{ display: 'inline-flex', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 'var(--radius-pill)', marginTop: 6, background: daysColor.bg, color: daysColor.color }}>
              {days} day{days !== 1 ? 's' : ''} left
            </div>
          )}
        </InfoCell>

        {opp.awardValueUsd != null && opp.awardValueUsd > 0 ? (
          <InfoCell label="Award value">
            ${(opp.awardValueUsd / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </InfoCell>
        ) : (
          <InfoCell label="Region">{opp.region}</InfoCell>
        )}

        <InfoCell label={opp.fieldOfStudy ? 'Field' : 'Country'}>
          {opp.fieldOfStudy || opp.country}
        </InfoCell>

        <InfoCell label={opp.eligibilityLevel ? 'Level' : 'Type'}>
          {opp.eligibilityLevel ? formatType(opp.eligibilityLevel) : typeLabel}
        </InfoCell>
      </div>

      {/* Description */}
      {opp.description && opp.description.trim() && (
        <div data-reveal style={{ marginBottom: 48 }}>
          <SectionLabel>About this opportunity</SectionLabel>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--type-body-size)', lineHeight: 'var(--type-body-leading)', color: 'var(--text-body)' }} dangerouslySetInnerHTML={{ __html: opp.description }} />
        </div>
      )}

      {/* Who it is for */}
      {opp.whoItsFor && (
        <div data-reveal style={{ marginBottom: 48, paddingTop: 40, borderTop: '1px solid var(--line)' }}>
          <SectionLabel>Who it is for</SectionLabel>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--type-body-size)', lineHeight: 'var(--type-body-leading)', color: 'var(--text-body)' }} dangerouslySetInnerHTML={{ __html: opp.whoItsFor }} />
        </div>
      )}

      {/* What is offered */}
      {opp.whatIsOffered && (
        <div data-reveal style={{ marginBottom: 48, paddingTop: 40, borderTop: '1px solid var(--line)' }}>
          <SectionLabel>What is offered</SectionLabel>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--type-body-size)', lineHeight: 'var(--type-body-leading)', color: 'var(--text-body)' }} dangerouslySetInnerHTML={{ __html: opp.whatIsOffered }} />
        </div>
      )}

      {/* Source URL */}
      {opp.sourceUrl && (
        <div data-reveal style={{ marginBottom: 48, paddingTop: 40, borderTop: '1px solid var(--line)' }}>
          <a href={opp.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--action)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            View original listing
            <Icon name="external-link" size={14} />
          </a>
        </div>
      )}
    </div>
  );
}

function OpportunityClosing({ opp }) {
  const signUpUrl = '/auth/register?redirect=' + encodeURIComponent('/opportunities?slug=' + opp.slug);
  const loginUrl = '/auth/login?redirect=' + encodeURIComponent('/opportunities?slug=' + opp.slug);

  return (
    <section className="om-tex om-tex-ink om-glow" style={{ background: 'var(--surface-dark)' }}>
      <div className="wrap" style={{ padding: '120px var(--container-pad)', textAlign: 'center' }}>
        {opp.oppDateApply && (
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--type-eyebrow-size)', fontWeight: 'var(--type-eyebrow-weight)', letterSpacing: 'var(--type-eyebrow-tracking)', textTransform: 'uppercase', color: 'var(--decor-numeral)', marginBottom: 16 }}>
            OppDate Apply available
          </div>
        )}
        <h2 style={{ color: 'var(--text-on-dark)', maxWidth: '22ch', margin: '0 auto' }}>Interested in this opportunity?</h2>
        <p style={{ color: 'var(--text-on-dark-quiet)', fontSize: 'var(--type-body-large-size)', lineHeight: 'var(--type-body-large-leading)', maxWidth: '54ch', margin: '20px auto 0' }}>
          Sign up for OppDate to check your eligibility, save this listing, and apply with expert support.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }}>
          <Button as="a" href={signUpUrl}>Get started - it's free</Button>
          <Button as="a" href="/opportunities" variant="secondary-on-ink">Browse opportunities</Button>
        </div>
        <p style={{ marginTop: 24, fontSize: 13, color: 'rgba(255,249,244,0.5)' }}>
          Create a free account to get started. Premium, from $12 per month*, unlocks the full opportunity library.
          <br />
          *Pricing varies by region. <a href="/pricing#tiers" style={{ color: 'rgba(255,249,244,0.72)' }}>See full pricing</a>.
        </p>
        <div style={{ marginTop: 14, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-on-dark-quiet)' }}>
          Already have an account?{' '}
          <a href={loginUrl} style={{ color: 'var(--text-on-dark)', fontWeight: 600, textDecoration: 'none' }}>Log in</a>
        </div>
      </div>
    </section>
  );
}

function OpportunityBottom({ opp }) {
  return (
    <div>
      <OpportunityClosing opp={opp} />
      <div style={{ position: 'relative', background: 'var(--surface-dark)', isolation: 'isolate' }}>
        {window.OM && window.OM.FooterWatermark ? <window.OM.FooterWatermark /> : null}
        <Footer markSrc={OPP_MARK} columns={(window.OM && window.OM.FOOTER_COLS) || []} style={{ background: 'transparent', position: 'relative', zIndex: 1 }} />
      </div>
    </div>
  );
}

function OpportunityNotFound() {
  return (
    <div>
      <div className="wrap" style={{ padding: '80px var(--container-pad)', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 32, color: 'var(--text-heading)', margin: 0 }}>Opportunity not found</h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'var(--text-body)', marginTop: 12, lineHeight: 1.6 }}>This opportunity may have been removed or the link is incorrect.</p>
        <div style={{ marginTop: 24 }}>
          <Button as="a" href="/">Go to OppDate</Button>
        </div>
      </div>
      <div style={{ position: 'relative', background: 'var(--surface-dark)', isolation: 'isolate' }}>
        {window.OM && window.OM.FooterWatermark ? <window.OM.FooterWatermark /> : null}
        <Footer markSrc={OPP_MARK} columns={(window.OM && window.OM.FOOTER_COLS) || []} style={{ background: 'transparent', position: 'relative', zIndex: 1 }} />
      </div>
    </div>
  );
}

function OpportunityPreviewPage() {
  const [opp, setOpp] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    const slug = window.__OPP_SLUG || window.location.pathname.split('/').filter(Boolean).pop();
    if (!slug) { setError(true); setLoading(false); return; }

    fetch(API_URL + '/api/v1/opportunities/' + slug + '/preview')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(json => { setOpp(json.data || null); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--line)', borderTopColor: 'var(--action)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
      </div>
    );
  }

  if (error || !opp) return <OpportunityNotFound />;

  return (
    <div>
      <OpportunityHero opp={opp} />
      <OpportunityBody opp={opp} />
      <OpportunityBottom opp={opp} />
    </div>
  );
}

window.OMP = { OpportunityPreviewPage, OpportunityHero, OpportunityBody, OpportunityClosing, OpportunityBottom, OpportunityNotFound };
