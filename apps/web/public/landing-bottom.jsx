const omRes = (id, path) => (window.__resources && window.__resources[id]) || path;
const { Card, Button, Eyebrow, Icon, AccordionRow, LinkArrow, IllustrationSlot, Footer } = window.OppDateDesignSystem_4aa598;
const MARK_FOOT = (window.__resources && window.__resources.monogram) || 'assets/oppdate-monogram.png';

const FOOTER_COLS = [
  { title: 'Opportunities', links: ['Browse all opportunities', 'By region', 'By type', 'Closing this week'] },
  { title: 'Services', links: [['Consultations', '/services/consultations'], ['Mentorship', '/services/mentorship'], ['eBooks', '/services/ebooks']] },
  { title: 'Company', links: ['Our Mission', 'Work With Us', 'Careers', 'Get Featured', 'Partner With Us', 'Become a Consultant', 'Become a Mentor', 'List Your eBook'] },
  { title: 'OppDate Apply', links: [['How it works', '/services/apply#flow'], ['Pricing', '/pricing'], ['Start an application', '/services/apply#start']] },
];

function Avatar({ initials }) {
  return (
    <span style={{ width: 48, height: 48, flex: 'none', borderRadius: '50%', background: 'var(--action-wash)', border: '2px solid var(--decor-numeral)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 16, color: 'var(--action-press)', letterSpacing: '0.02em' }}>
      {initials}
    </span>
  );
}

/* Sample copy, consistent with the rest of the page's not-yet-signed-off content; not
   verified testimonials. Nine cards, paged three at a time. */
const RESULTS = [
  ['AO', 'Adaeze O.', 'Masters applicant, Lagos', 'Shortlisted for 2 of 3 applications', 'She filtered for funded masters programmes in Europe, checked eligibility on each one before starting, and applied to three. Two came back with interviews.'],
  ['SK', 'Samuel K.', 'Fellowship applicant, Nairobi', 'Application submitted in under 24 hours', 'His CV, transcript and reference letter were already in his library. When a fellowship opened with a short window, the whole application took an evening.'],
  ['PR', 'Priya R.', 'Funded student, Delhi', "Accepted. Fully funded master's programme.", 'She tracked five applications through one dashboard and knew where each one stood. The offer came from a listing she found the day it went live.'],
  ['DT', 'Daniel T.', 'Internship applicant, Manila', 'Landed a paid internship in three weeks.', 'He filtered by field and location, checked eligibility on four listings before applying to two, and heard back from both.'],
  ['FB', 'Fatima B.', 'Scholarship applicant, Cairo', "Found a scholarship the university's own site never listed.", "It showed up in her feed before she'd even started searching for it herself."],
  ['GM', 'Grace M.', 'Job applicant, Accra', 'Watched her application move from submitted to offer.', 'Every stage update landed on her dashboard the same day it happened, no emails to chase.'],
  ['OH', 'Omar H.', 'Fellowship applicant, Amman', 'Two interviews from one weekend of applications.', 'Eligibility screening ruled out three listings before he wasted time on them, so he only applied where he actually qualified.'],
  ['CE', 'Chidinma E.', 'Volunteering applicant, Abuja', "Matched to a placement she didn't know existed.", "It wasn't on any list she'd already searched."],
  ['WL', 'Wei L.', 'Grant applicant, Singapore', 'Reused one set of documents across four applications.', 'Uploaded once, then just picked what each application actually needed.'],
];

function CarouselButton({ dir, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Previous testimonials' : 'Next testimonials'}
      className="om-circle-btn"
      style={{ width: 44, height: 44, flex: 'none', borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line-strong)', background: 'transparent', color: 'var(--color-text-ink)', cursor: 'pointer', transition: 'var(--transition-interactive)' }}
    >
      <Icon name={dir === 'prev' ? 'chevron-left' : 'chevron-right'} size={20} />
    </button>
  );
}

/* Items per page is real pagination state, not a CSS effect: at the breakpoint where the
   three-up grid collapses, "next" has to mean the next card rather than the next group of
   three, so perPage drives both the grouping and the track width. */
function usePerPage() {
  const [perPage, setPerPage] = React.useState(() => (window.matchMedia('(max-width: 960px)').matches ? 1 : 3));
  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 960px)');
    const on = () => setPerPage(mq.matches ? 1 : 3);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return perPage;
}

function Results() {
  const perPage = usePerPage();
  const [page, setPage] = React.useState(0);
  const pages = [];
  for (let i = 0; i < RESULTS.length; i += perPage) pages.push(RESULTS.slice(i, i + perPage));
  /* Keep the reader near the same card when the breakpoint flips under them. */
  React.useEffect(() => { setPage((p) => Math.min(p, pages.length - 1)); }, [perPage]);
  return (
    <section style={{ background: 'var(--surface-card)' }}>
      <div className="wrap" style={{ padding: '80px var(--container-pad)' }}>
        <Eyebrow style={{ marginBottom: 16 }}>Real results</Eyebrow>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32 }}>
          <h2 style={{ maxWidth: '22ch' }}>Real results from real applicants.</h2>
          <div style={{ display: 'flex', gap: 10, paddingBottom: 6 }}>
            <CarouselButton dir="prev" onClick={() => setPage((p) => (p - 1 + pages.length) % pages.length)} />
            <CarouselButton dir="next" onClick={() => setPage((p) => (p + 1) % pages.length)} />
          </div>
        </div>
        <div data-no-reveal style={{ overflow: 'hidden', marginTop: 48 }}>
          <div style={{ display: 'flex', transform: 'translateX(' + page * -100 + '%)', transition: 'transform 420ms var(--ease-out-soft)' }}>
            {pages.map((group, gi) => (
              <div key={gi} style={{ flex: '0 0 100%', display: 'grid', gridTemplateColumns: 'repeat(' + perPage + ', 1fr)', gap: 24, alignItems: 'stretch' }}>
                {group.map(([ini, name, role, head, body]) => (
                  <Card key={name} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <Avatar initials={ini} />
                      <span>
                        <span style={{ display: 'block', fontWeight: 600, color: 'var(--color-text-ink)' }}>{name}</span>
                        <span style={{ display: 'block', fontSize: 14, color: 'var(--text-quiet)' }}>{role}</span>
                      </span>
                    </div>
                    <h3 style={{ marginTop: 24, fontSize: 22 }}>{head}</h3>
                    <p style={{ marginTop: 12, flex: 1, color: 'var(--text-body)' }}>{body}</p>
                    <div style={{ marginTop: 24 }}><LinkArrow href="#stories">Read their story</LinkArrow></div>
                  </Card>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const SERVICES = [
  {
    label: 'One to one',
    title: 'Consultations',
    href: '/services/consultations',
    body: 'Private one-to-one sessions tailored to you. Equipping you with clarity, strategic direction, and an actionable plan.',
    img: omRes('consultations', 'assets/consultations.jpg'),
    alt: 'An applicant on a one to one video consultation at her desk',
    area: 'lead',
  },
  {
    label: 'Longer term',
    title: 'Mentorship',
    href: '/services/mentorship',
    body: 'Long-term guidance from people who have mastered the process and understand the strategies and deciding factors behind winning applications.',
    img: omRes('mentorship', 'assets/mentorship.webp'),
    alt: 'Messages screen showing a mentorship thread with a mentor sharing a profile audit template',
    area: 'a',
  },
  {
    label: 'Written guides',
    title: 'eBooks',
    href: '/services/ebooks',
    body: 'A curated library of guides on applications, with practical insights and proven strategies to help you succeed.',
    img: omRes('ebooks', 'assets/ebooks.webp'),
    alt: 'My eBooks library with three titles and reading progress on each',
    area: 'b',
  },
];

function ServiceCard({ label, title, body, img, alt, area, lead, href }) {
  return (
    <a
      href={href || '#services'}
      data-reveal
      style={{ gridArea: area, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: lead ? 520 : 248, padding: lead ? 24 : 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--line-on-dark)', background: 'rgba(255,249,244,0.04)', textDecoration: 'none', transition: 'var(--transition-interactive)' }}
    >
      <span style={{ flex: 1, minHeight: 0, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'rgba(255,249,244,0.05)' }}>
        <img src={img} alt={alt} loading="lazy" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
      </span>
      <div className="svc-foot" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginTop: 20 }}>
        <span className="svc-copy" style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--decor-numeral)' }}>{label}</span>
          <span style={{ display: 'block', marginTop: 8, fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: lead ? 'var(--type-h2-split-size)' : 'var(--type-h3-size)', lineHeight: 1.15, color: 'var(--text-on-dark)' }}>{title}</span>
          <span className="svc-body" style={{ display: 'block', marginTop: 10, fontFamily: 'var(--font-sans)', fontSize: lead ? 16 : 14, lineHeight: 1.55, color: 'var(--text-on-dark-quiet)', maxWidth: lead ? '52ch' : '38ch' }}>{body}</span>
        </span>
        <span className="om-step-arrow" style={{ flex: 'none', width: 44, height: 44, borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line-on-dark)', background: 'transparent', color: 'var(--text-on-dark)', transition: 'var(--transition-interactive)' }}>
          <Icon name="arrow-up-right" size={20} />
        </span>
      </div>
    </a>
  );
}

/* Scroll-linked container expansion, Services only. The ink panel starts at the standard
   1240px content container (same edges as every other section) holds there for a beat
   after entering view, then grows past that baseline toward full bleed as the section
   scrolls into focus, radius closing to flat at its widest point. Driven by scroll position
   rather than a one-shot animation, so it contracts again on the way back up. No CSS
   transition on either value: the value IS the scroll position. */
function useScrollExpand(maxRadius) {
  const ref = React.useRef(null);
  const [p, setP] = React.useState(0);
  const [baseInset, setBaseInset] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const containerMax = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--container-max')) || 1240;
    const reduced = window.REDUCED && window.REDUCED.matches;
    let raf = 0;
    const update = () => {
      raf = 0;
      setBaseInset(Math.max(0, (el.clientWidth - containerMax) / 2));
      if (reduced) { setP(1); return; }
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      /* Hold: nothing moves until the section has travelled 40% of the viewport past its
         first appearance, so the baseline state is readable before it starts widening. */
      const travelled = vh - r.top;
      setP(Math.max(0, Math.min(1, (travelled - vh * 0.4) / (vh * 0.55))));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);
  return [ref, Math.round(baseInset * (1 - p)), Math.round(maxRadius * (1 - p))];
}

function Services() {
  const [ref, inset, radius] = useScrollExpand(32);
  return (
    <section id="services" ref={ref} style={{ background: 'var(--surface-card)' }}>
      <div style={{ background: 'var(--surface-dark)', borderRadius: radius, marginLeft: inset, marginRight: inset, overflow: 'hidden' }}>
        <div className="wrap" style={{ padding: '120px var(--container-pad)' }}>
          <Eyebrow tone="gold" style={{ marginBottom: 16 }}>Services</Eyebrow>
          <h2 style={{ color: 'var(--text-on-dark)', maxWidth: '20ch' }}>More than opportunities.</h2>
          <div className="bento-services" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.25fr) minmax(0,1fr)', gridTemplateRows: 'auto auto', gridTemplateAreas: '"lead a" "lead b"', gap: 20, marginTop: 48 }}>
            {SERVICES.map((s) => <ServiceCard key={s.title} {...s} lead={s.area === 'lead'} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

const MONOGRAM_ICON = { src: MARK_FOOT };

const FAQS = [
  ['What is OppDate?', 'OppDate is an opportunity discovery platform. It brings verified scholarships, internships, fellowships, jobs, grants and volunteering opportunities from more than 190 countries into one place, updated daily.', 'Browse opportunities', MONOGRAM_ICON],
  ['What is OppDate Guide?', 'OppDate Guide is your AI companion inside the product. It knows which opportunity you are viewing and walks you through eligibility, documents and questions as you go.', 'See what Guide does', 'bot'],
  ['How does Premium access work?', 'Create an account to get started. Premium, from $12 per month and priced by region, unlocks the opportunity library along with OppDate Guide, AI eligibility screening, personalized matching and the application tracker.', 'Compare access', 'crown'],
  ['How does AI eligibility screening work?', 'You answer a few short questions and we check your answers against the criteria the opportunity itself publishes, not a generic filter. You know if you qualify before you start preparing.', 'See an example', 'shield-check'],
  ['What types of opportunities are on OppDate?', 'Scholarships, admissions, jobs, fellowships, grants, volunteering, programs and internships. Eight types and counting, filterable by region and funding.', 'Browse by type', 'layers'],
  ['Can I reuse my documents for multiple applications?', 'Yes. Upload your CV, transcripts, portfolio and references to your credential library once, then select the files each application asks for. Nothing is uploaded twice.', 'See the library', 'refresh-cw'],
  ['How do I track my applications?', 'Every application you send appears on your dashboard with its current status, updated in real time. You never have to chase anyone for an answer.', 'See the tracker', 'activity'],
  ['Is my personal information secure?', 'Your documents and answers are yours. They are stored encrypted, shown only to you, and never shared with an organisation until you choose to apply.', 'Read the privacy policy', 'lock'],
];

function Faq() {
  const [open, setOpen] = React.useState(0);
  return (
    <section style={{ background: 'var(--surface-card)' }}>
      <div className="wrap split" style={{ padding: '80px var(--container-pad)', display: 'grid', gridTemplateColumns: 'minmax(0,40%) minmax(0,60%)', gap: 64, alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Eyebrow style={{ marginBottom: 16 }}>Questions</Eyebrow>
          <h2 style={{ fontSize: 'var(--type-h2-split-size)', lineHeight: 'var(--type-h2-split-leading)' }}>Got questions? We have answers.</h2>
          <p style={{ marginTop: 20, color: 'var(--text-body)', maxWidth: '34ch' }}>Still have questions? Contact us and we'll help you out</p>
          <div style={{ marginTop: 16 }}><LinkArrow href="#contact">Contact support</LinkArrow></div>
          <img
            src={omRes('contactSupport', 'assets/contact-support.png')}
            alt="A support agent in a headset at her laptop, surrounded by chat bubbles"
            loading="lazy"
            style={{ display: 'block', width: '100%', maxWidth: 420, height: 320, objectFit: 'contain', marginTop: 40 }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FAQS.map(([t, b, c, icon], i) => (
            <AccordionRow key={t} title={t} body={b} ctaLabel={c} ctaHref="#start" icon={icon} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section id="start" className="om-tex om-tex-ink om-glow" style={{ background: 'var(--surface-dark)' }}>
      <div className="wrap" style={{ padding: '120px var(--container-pad)', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-on-dark)', maxWidth: '22ch', margin: '0 auto' }}>Your next big opportunity is one click away.</h2>
        <p style={{ color: 'var(--text-on-dark-quiet)', fontSize: 'var(--type-body-large-size)', lineHeight: 'var(--type-body-large-leading)', maxWidth: '54ch', margin: '20px auto 0' }}>
          Join thousands of students and professionals who use OppDate to discover and apply for the opportunities that matter.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }}>
          <Button as="a" href="/auth/register">Get started</Button>
          <Button as="a" href="/opportunities" variant="secondary-on-ink">Browse opportunities</Button>
        </div>
        <p style={{ marginTop: 24, fontSize: 13, color: 'rgba(255,249,244,0.5)' }}>Create a free account to get started. Premium, from $12 per month*, unlocks the full opportunity library.<br />*Pricing varies by region. <a href="/pricing#tiers" style={{ color: 'rgba(255,249,244,0.72)' }}>See full pricing</a>.</p>
      </div>
    </section>
  );
}

/* Footer watermark. Oversized Fraunces "OppDate" bleeding off both edges of the column band.
   Two flat-fill copies, no gradient or bevel in the letterforms themselves: a dormant layer a
   few percent above the ink surface, and a lit copy revealed only under a 260px-radius radial
   mask that follows the cursor. The lit rim is DERIVED from the glyph fill rather than stroked:
   an SVG filter dilates the fill's alpha and subtracts the original (feMorphology + feComposite
   operator="out"), so the outline is a closed band around every contour and counter by
   construction. Stroking, whether via -webkit-text-stroke or SVG stroke on <text>, synthesizes
   joins at curvature and corner points and came apart at this scale, leaving detached fragments
   on O, D and t; a derived rim has no joins to fail, on any letter.
   The mask centre lives in CSS custom properties (--mx/--my)
   updated from mousemove and eased in a rAF lerp rather than a CSS transition, so the lit area
   exists only where the cursor currently is and trails it as it moves. The thin stroke keeps
   the footer links legible where the glow passes under them.
   Reduced motion renders the dormant layer only, with no tracking. */
function FooterWatermark() {
  const ref = React.useRef(null);
  const litRef = React.useRef(null);
  const reduced = window.REDUCED && window.REDUCED.matches;
  React.useEffect(() => {
    if (reduced) return;
    const box = ref.current;
    const lit = litRef.current;
    if (!box || !lit || !box.parentElement) return;
    const host = box.parentElement;
    const OFF = -9999;
    let cur = { x: OFF, y: OFF };
    let target = { x: OFF, y: OFF };
    let inside = false;
    let raf = 0;
    const tick = () => {
      /* ~180ms ease-out: each frame closes 18% of the remaining distance. */
      const done = Math.abs(target.x - cur.x) < 0.4 && Math.abs(target.y - cur.y) < 0.4;
      if (done) { cur = { x: target.x, y: target.y }; } else { cur = { x: cur.x + (target.x - cur.x) * 0.18, y: cur.y + (target.y - cur.y) * 0.18 }; }
      lit.style.setProperty('--mx', cur.x.toFixed(1) + 'px');
      lit.style.setProperty('--my', cur.y.toFixed(1) + 'px');
      raf = done && !inside ? 0 : requestAnimationFrame(tick);
    };
    const onMove = (e) => {
      const r = host.getBoundingClientRect();
      const next = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (!inside) { cur = next; }
      target = next;
      inside = true;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onLeave = () => { inside = false; target = { x: OFF, y: OFF }; cur = { x: OFF, y: OFF }; if (!raf) raf = requestAnimationFrame(tick); };
    host.addEventListener('mousemove', onMove);
    host.addEventListener('mouseleave', onLeave);
    return () => { host.removeEventListener('mousemove', onMove); host.removeEventListener('mouseleave', onLeave); cancelAnimationFrame(raf); };
  }, [reduced]);
  const type = { fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 'clamp(220px, 42vw, 620px)', lineHeight: 1, letterSpacing: '-0.03em', whiteSpace: 'nowrap', position: 'absolute', left: '50%', top: '50%', translate: '-50% -50%' };
  const spot = 'radial-gradient(260px circle at var(--mx, -9999px) var(--my, -9999px), #000 0, transparent 100%)';
  return (
    <div ref={ref} aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <span style={Object.assign({}, type, { color: 'rgba(255,249,244,0.04)' })}>OppDate</span>
      {!reduced && (
        <div ref={litRef} style={{ position: 'absolute', inset: 0, WebkitMaskImage: spot, maskImage: spot }}>
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, display: 'block' }}>
            <defs>
              <filter id="om-rim" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
                <feMorphology in="SourceAlpha" operator="dilate" radius="1.6" result="fat" />
                <feComposite in="fat" in2="SourceAlpha" operator="out" result="rim" />
                <feFlood floodColor="#FAEDD9" floodOpacity="0.72" result="tint" />
                <feComposite in="tint" in2="rim" operator="in" result="line" />
                <feGaussianBlur in="rim" stdDeviation="7" result="halo" />
                <feFlood floodColor="#F3DFBE" floodOpacity="0.5" result="haloTint" />
                <feComposite in="haloTint" in2="halo" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="line" />
                </feMerge>
              </filter>
            </defs>
            <text
              x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
              fill="#000" filter="url(#om-rim)"
              style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 'clamp(220px, 42vw, 620px)', letterSpacing: '-0.03em' }}
            >OppDate</text>
          </svg>
        </div>
      )}
    </div>
  );
}

function BottomOfPage() {
  return (
    <div>
      <Results />
      <Services />
      <Faq />
      <ClosingCta />
      <div style={{ position: 'relative', background: 'var(--surface-dark)', isolation: 'isolate' }}>
        <FooterWatermark />
        <Footer markSrc={MARK_FOOT} columns={FOOTER_COLS} style={{ background: 'transparent', position: 'relative', zIndex: 1 }} />
      </div>
    </div>
  );
}

window.OM = Object.assign(window.OM || {}, { FOOTER_COLS, Results, ServiceCard, useScrollExpand, Services, Faq, ClosingCta, FooterWatermark, BottomOfPage });
