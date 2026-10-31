const omRes = (id, path) => window.__resources && window.__resources[id] || path;
const { Card, Badge, Eyebrow, Icon, IndexRow, LinkArrow, IllustrationSlot } = window.OppDateDesignSystem_4aa598;

/* Bento: two hero-tier cards on the top row, three smaller ones below. Live details are
   reserved for the hero tier: Guide gets the typing bubble, Oppdates the fresh-listing
   ticker; the three small cards stay icon plus text. */
function GuideChatHint() {
  return (
    <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 14px', borderRadius: '16px 16px 16px 4px', background: 'var(--action)' }}>
        {[0, 1, 2].map((i) =>
        <span key={i} className="om-typing-dot" style={{ '--i': i, width: 6, height: 6, borderRadius: 999, background: 'var(--color-text-inverse)' }} />
        )}
      </span>
    </div>);

}

const OPPDATE_TAGS = ['Scholarship', 'Fellowship', 'Grant'];

function OppdatesHint() {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    if (window.REDUCED && window.REDUCED.matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % OPPDATE_TAGS.length), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 30, padding: '0 12px', borderRadius: 'var(--radius-pill)', background: 'var(--action)', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-inverse)' }}>
        <span className="om-pulse" style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--color-text-inverse)' }} />
        New
      </span>
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', height: 30 }}>
        {OPPDATE_TAGS.map((t, n) =>
        <span key={t} style={{ position: n === i ? 'relative' : 'absolute', left: 0, top: 0, display: 'inline-flex', alignItems: 'center', height: 30, padding: '0 12px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-band)', border: '1px solid var(--line)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--color-text-ink)', whiteSpace: 'nowrap', opacity: n === i ? 1 : 0, translate: n === i ? '0 0' : '0 6px', transition: 'opacity var(--duration-base) var(--ease-out-soft), translate var(--duration-base) var(--ease-out-soft)' }}>
            {t}
          </span>
        )}
      </span>
    </div>);

}

function WhatYouGet() {
  const leads = [
  {
    title: 'OppDate Guide',
    body: "Your AI companion from the moment you log in. It knows which opportunity you're viewing and walks you through every step: eligibility, documents, questions and more.",
    icon: 'bot',
    hint: <GuideChatHint />,
    img: { src: omRes('oppGuide', 'assets/opp-guide.webp'), alt: 'OppDate Guide chat panel answering questions about required documents and how OppDate Apply works, beside saved opportunity cards' }
  },
  {
    title: 'Exclusive Oppdates',
    body: "Fresh, under-the-radar opportunities, sourced and vetted before the general public sees them. Early access and less competition, so you're always a step ahead.",
    icon: 'sparkles',
    hint: <OppdatesHint />,
    img: { src: omRes('exclusiveOppdates', 'assets/exclusive-oppdates.webp'), alt: 'Exclusive Oppdates feed listing internships, jobs, scholarships and research fellowships with deadlines and exclusive badges' }
  }];

  const rest = [
  ['AI eligibility screening', "Answer a few smart questions and know if you qualify before you spend time preparing, screened against the opportunity's own criteria, not generic filters.", 'shield-check'],
  ['Personalized matching', 'Opportunities selected around your background, goals, field and location. The more OppDate knows about you, the sharper your feed becomes.', 'crosshair'],
  ['Application tracker', 'Every status update on every application, in real time, on your dashboard. Know exactly where each application stands without chasing anyone for updates.', 'activity']];

  const CardIcon = ({ name, big }) =>
  <span style={{ flex: 'none', width: big ? 56 : 44, height: big ? 56 : 44, borderRadius: 'var(--radius-md)', background: big ? 'var(--action)' : 'var(--action-wash)', color: big ? 'var(--color-text-inverse)' : 'var(--action)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={big ? 28 : 22} />
    </span>;

  return (
    <section style={{ background: 'var(--surface-card)' }}>
      <div className="wrap" style={{ padding: '80px var(--container-pad)' }}>
        <Eyebrow style={{ marginBottom: 16 }}>What you get</Eyebrow>
        <h2 style={{ maxWidth: '22ch' }}>Everything you need, in one place.</h2>
        <div className="cards4 wyg" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', gap: 24, marginTop: 48, alignItems: 'stretch' }}>
          {leads.map((c) =>
          <Card key={c.title} data-reveal style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', padding: 40 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <CardIcon name={c.icon} big />
                {c.hint}
              </span>
              <Badge tone="premium" style={{ alignSelf: 'flex-start', marginTop: 24 }}>Available with Premium</Badge>
              <h3 data-no-reveal style={{ marginTop: 16, fontSize: 30, lineHeight: 1.2 }}>{c.title}</h3>
              <p data-no-reveal style={{ marginTop: 14, fontSize: 17, lineHeight: 'var(--type-body-leading)', color: 'var(--text-body)', maxWidth: '40ch' }}>{c.body}</p>
              <img src={c.img.src} alt={c.img.alt} loading="lazy" style={{ display: 'block', width: '100%', marginTop: 28, borderRadius: 'var(--radius-frame)', border: '1px solid var(--line)' }} />
            </Card>
          )}
          {rest.map(([t, d, icon]) =>
          <Card key={t} data-reveal style={{ gridColumn: 'span 2', display: 'flex', gap: 18, alignItems: 'flex-start' }}>
              <CardIcon name={icon} />
              <span style={{ minWidth: 0 }}>
                <Badge tone="premium">Available with Premium</Badge>
                <h3 data-no-reveal style={{ marginTop: 12, fontSize: 21 }}>{t}</h3>
                <p data-no-reveal style={{ marginTop: 10, fontSize: 15, lineHeight: 'var(--type-body-leading)', color: 'var(--text-body)' }}>{d}</p>
              </span>
            </Card>
          )}
        </div>
      </div>
    </section>);

}

function Listings() {
  return (
    <section id="browse" style={{ background: 'var(--surface-card)' }}>
      <div className="wrap split" style={{ padding: '80px var(--container-pad)', display: 'grid', gridTemplateColumns: 'minmax(0,40%) minmax(0,60%)', gap: 64, alignItems: 'center' }}>
        <div>
          <Eyebrow style={{ marginBottom: 16 }}>The listings</Eyebrow>
          <h2 style={{ fontSize: 'var(--type-h2-split-size)', lineHeight: 'var(--type-h2-split-leading)' }}>One platform. Every opportunity.</h2>
          <p style={{ marginTop: 20, color: 'var(--text-body)', maxWidth: '40ch' }}>
            Search once and filter by category, region, funding type and deadline. Every listing is checked against its source before it goes live, and the countdown on each one tells you exactly how long you have.
          </p>
          <div style={{ marginTop: 28 }}><LinkArrow href="/opportunities">Explore opportunities</LinkArrow></div>
        </div>
        <IllustrationSlot
          ratio="4 / 3"
          title="Opportunity search and listings"
          note="Screenshot of the logged in search and filter experience, pending. The logged in product sits outside this design system, so nothing is drawn here." />
        
      </div>
    </section>);

}

function CredentialLibrary() {
  return (
    <section style={{ background: 'var(--surface-card)' }}>
      <div className="wrap split split-flip" style={{ padding: '80px var(--container-pad)', display: 'grid', gridTemplateColumns: 'minmax(0,55%) minmax(0,45%)', gap: 64, alignItems: 'center' }}>
        <img
          className="split-visual"
          src={omRes('credentialLibrary', 'assets/credential-library.webp')}
          alt="Credential Library screen: six uploaded documents with reuse counts, a most-used CV card, and links showing it attached to three applications"
          loading="lazy"
          style={{ display: 'block', width: '100%', borderRadius: 'var(--radius-frame)', border: '1px solid var(--line)' }} />
        
        <div>
          <Eyebrow style={{ marginBottom: 16 }}>Credential library</Eyebrow>
          <h2 style={{ fontSize: 'var(--type-h2-split-size)', lineHeight: 'var(--type-h2-split-leading)' }}>Your documents. Uploaded once. Used forever.</h2>
          <p style={{ marginTop: 20, color: 'var(--text-body)', maxWidth: '38ch' }}>
            Keep your CV, transcripts, portfolio and references in one place. When you apply, pick the files the opportunity asks for and send them without hunting through your downloads folder again.
          </p>
          <div style={{ marginTop: 28 }}><LinkArrow href="#how-it-works">See how it works</LinkArrow></div>
        </div>
      </div>
    </section>);

}

window.OM = Object.assign(window.OM || {}, { GuideChatHint, OppdatesHint, WhatYouGet, Listings, CredentialLibrary });