const { Button, Eyebrow, Icon, AccordionRow, IllustrationSlot, LinkArrow, Footer } = window.OppDateDesignSystem_4aa598;
const EBOOK_MARK = (window.__resources && window.__resources.monogram) || 'assets/oppdate-monogram.png';

/* White hero, on purpose: eBooks is a library you browse rather than a service delivered by a
   person, so this page carries the lighter register while the closing zone stays ink. */
function EbookHero() {
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
  return (
    <section id="ebook-top" className="om-tex om-tex-light" style={{ background: 'var(--surface-card)' }}>
      <div data-no-reveal className="wrap split" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,54%) minmax(0,46%)', gap: 56, alignItems: 'center', padding: '64px var(--container-pad) 88px' }}>
        <div>
          <div {...step(0, { marginBottom: 18 })}><Eyebrow>Written guides</Eyebrow></div>
          <h1 {...step(1, { maxWidth: '20ch', fontSize: 'clamp(36px, 4.2vw, 54px)' })}>The complete written guide to <span style={{ color: 'var(--decor-numeral)' }}>applications</span>.</h1>
          <p {...step(2, { marginTop: 22, fontSize: 'var(--type-body-large-size)', lineHeight: 'var(--type-body-large-leading)', color: 'var(--text-body)', maxWidth: '46ch' })}>
            Practical insights and proven strategies to help you succeed. Buy it once and it is yours: it stays in your dashboard library, and you can read it in the app or download it to read anywhere.
          </p>
          <div {...step(3, { marginTop: 30 })}>
            <Button as="a" href="#catalog">See the guide</Button>
          </div>
        </div>
        <div {...step(4)}>
          <img className="split-visual ebook-photo" src={(window.__resources && window.__resources.ebooksHero) || 'assets/ebooks-hero.webp'} alt="A fanned stack of five OppDate guide covers, with The Scholarship Playbook at the front" />
        </div>
      </div>
    </section>
  );
}

const EBOOK_STEPS = [
  { i: '01', icon: 'book-open', title: 'Pick your guide', body: 'Read what the guide covers, from first search through to arriving.' },
  { i: '02', icon: 'check-circle', title: 'Buy it once, own it forever', body: 'A single purchase, no subscription and no expiry. The guide stays in your library.' },
  { i: '03', icon: 'download', title: 'Read in the app or offline', body: 'Read in the built-in reader, or download the file and read it anywhere.' },
];

function EbookHow() {
  const wrapRef = React.useRef(null);
  const badgeRefs = React.useRef([]);
  const [rail, setRail] = React.useState({ top: 0, height: 0, fill: 0, centers: [] });
  React.useLayoutEffect(() => {
    const measure = () => {
      const wrap = wrapRef.current;
      const els = badgeRefs.current.filter(Boolean);
      if (!wrap || els.length < 2) return;
      const wrapTop = wrap.getBoundingClientRect().top + window.scrollY;
      const centers = els.map((el) => {
        const r = el.getBoundingClientRect();
        return r.top + window.scrollY + r.height / 2 - wrapTop;
      });
      const top = centers[0];
      const height = centers[centers.length - 1] - top;
      const line = window.scrollY + window.innerHeight * 0.5 - wrapTop;
      setRail({ top, height, fill: Math.max(0, Math.min(height, line - top)), centers });
    };
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => { window.removeEventListener('scroll', measure); window.removeEventListener('resize', measure); };
  }, []);
  const reached = (n) => rail.centers.length === EBOOK_STEPS.length && rail.top + rail.fill >= rail.centers[n] - 1;
  return (
    <section id="how" style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--line)' }}>
      <div className="wrap" style={{ padding: '80px var(--container-pad)' }}>
        <Eyebrow style={{ marginBottom: 16 }}>How it works</Eyebrow>
        <h2 style={{ maxWidth: '22ch' }}>Three steps from buying to reading.</h2>
        <div ref={wrapRef} style={{ position: 'relative', marginTop: 48 }}>
          <div className="ebook-rail" style={{ position: 'absolute', left: 27, top: rail.top, height: rail.height, width: 2, background: 'var(--line)', borderRadius: 2 }} />
          <div className="ebook-rail" style={{ position: 'absolute', left: 27, top: rail.top, height: rail.fill, width: 2, background: 'var(--action)', borderRadius: 2 }} />
          {EBOOK_STEPS.map((s, n) => (
            <div key={s.i} className="ebook-step" style={{ position: 'relative', display: 'grid', gridTemplateColumns: '56px minmax(0,1fr)', gap: 28, paddingBottom: n === EBOOK_STEPS.length - 1 ? 0 : 40 }}>
              <span ref={(el) => (badgeRefs.current[n] = el)} style={{ position: 'relative', zIndex: 1, width: 56, height: 56, borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: reached(n) ? 'var(--action)' : 'var(--surface-card)', color: reached(n) ? 'var(--color-text-inverse)' : 'var(--text-quiet)', border: '1.5px solid ' + (reached(n) ? 'var(--action)' : 'var(--line)'), transition: 'background-color .4s var(--ease-out-soft), color .4s var(--ease-out-soft), border-color .4s var(--ease-out-soft)' }}>
                <Icon name={s.icon} size={22} />
              </span>
              <div style={{ paddingTop: 4 }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                  <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 15, letterSpacing: '0.04em', color: 'var(--decor-numeral)' }}>{s.i}</span>
                  <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'var(--type-h3-size)', lineHeight: 1.25 }}>{s.title}</span>
                </span>
                <p style={{ marginTop: 10, fontSize: 16, lineHeight: 1.6, color: 'var(--text-body)', maxWidth: '54ch' }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EbookTitleCard({ ebook, index }) {
  const fmtCents = (c) => (c / 100).toFixed(2);
  const saving = ebook.premiumPriceUsd != null
    ? 'Members save $' + ((ebook.priceUsd - ebook.premiumPriceUsd) / 100).toFixed(2)
    : null;
  return (
    <div className="ebook-single" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,300px) minmax(0,1fr)', gap: 44, alignItems: 'center', marginTop: index === 0 ? 44 : 28, padding: 32, borderRadius: 'var(--radius-lg)', background: 'var(--surface-band)', border: '1px solid var(--line)' }}>
      {ebook.coverImageUrl
        ? <img className="ebook-cover" src={ebook.coverImageUrl} alt={ebook.title + ', by ' + ebook.author} />
        : <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: 'var(--radius-md)', background: 'linear-gradient(145deg, #B5520F 0%, #7A2D05 100%)', display: 'flex', alignItems: 'flex-end', padding: 20, boxSizing: 'border-box' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 18, color: '#fff', lineHeight: 1.2 }}>{ebook.title}</span>
          </div>
      }
      <div>
        <h3 style={{ fontSize: 'clamp(28px, 3vw, 38px)', lineHeight: 1.15, textTransform: 'uppercase' }}>{ebook.title}</h3>
        <p style={{ marginTop: 8, fontFamily: 'var(--font-sans)', fontSize: 14.5, color: 'var(--text-quiet)' }}>By {ebook.author}</p>
        <p style={{ marginTop: 18, fontSize: 'var(--type-body-large-size)', lineHeight: 'var(--type-body-large-leading)', color: 'var(--text-body)', maxWidth: '52ch' }}>{ebook.description}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--line)' }}>
          <span>
            <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-quiet)' }}>Standard</span>
            <span style={{ display: 'block', marginTop: 4, fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 24 }}>${fmtCents(ebook.priceUsd)}</span>
          </span>
          {ebook.premiumPriceUsd != null && (
            <span>
              <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--action)' }}>Premium member</span>
              <span style={{ display: 'block', marginTop: 4, fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 24, color: 'var(--action)' }}>${fmtCents(ebook.premiumPriceUsd)}</span>
              {saving && <span style={{ display: 'block', marginTop: 4, fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--text-quiet)' }}>{saving}</span>}
            </span>
          )}
        </div>
        <div style={{ marginTop: 26 }}>
          <Button onClick={() => {
            const token = localStorage.getItem('oppdate_token');
            if (token) {
              window.location.href = '/services/ebooks/checkout?book=' + ebook.slug;
            } else {
              window.location.href = '/auth/login?redirect=' + encodeURIComponent('/services/ebooks/checkout?book=' + ebook.slug);
            }
          }}>Buy this guide</Button>
        </div>
      </div>
    </div>
  );
}

function EbookTitle() {
  const [ebooks, setEbooks] = React.useState(null);

  React.useEffect(() => {
    const base = (window.__apiBase || '').replace(/\/$/, '');
    fetch(base + '/api/v1/ebooks')
      .then((r) => r.json())
      .then((res) => setEbooks(Array.isArray(res.data) ? res.data : []))
      .catch(() => setEbooks([]));
  }, []);

  const hasEbooks = ebooks && ebooks.length > 0;

  return (
    <section id="catalog" style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--line)' }}>
      <div className="wrap" style={{ padding: '80px var(--container-pad)' }}>
        <Eyebrow style={{ marginBottom: 16 }}>Available now</Eyebrow>
        <h2 style={{ maxWidth: '22ch' }}>The guide that is out today.</h2>

        {ebooks === null && (
          <div style={{ marginTop: 44, padding: 32, borderRadius: 'var(--radius-lg)', background: 'var(--surface-band)', border: '1px solid var(--line)', minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--text-quiet)' }}>Loading...</span>
          </div>
        )}

        {ebooks !== null && !hasEbooks && (
          <p style={{ marginTop: 28, fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--text-quiet)' }}>More guides coming soon.</p>
        )}

        {hasEbooks && ebooks.map((ebook, i) => (
          <EbookTitleCard key={ebook.id} ebook={ebook} index={i} />
        ))}

        {hasEbooks && (
          <p style={{ marginTop: 18, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-quiet)' }}>More guides coming soon.</p>
        )}
      </div>
    </section>
  );
}

const EBOOK_INCLUDED = [
  ['book-marked', 'In-app reader with bookmarking, progress tracking and adjustable text size'],
  ['file-down', 'Offline download in PDF or ePub'],
  ['library', 'Permanent access from your dashboard library'],
];

function EbookIncluded() {
  return (
    <section style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--line)' }}>
      <div className="wrap" style={{ padding: '80px var(--container-pad)' }}>
        <Eyebrow style={{ marginBottom: 16 }}>What is included</Eyebrow>
        <h2 style={{ maxWidth: '20ch' }}>However you read it.</h2>
        <div className="ebook-incl" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 20, marginTop: 44 }}>
          {EBOOK_INCLUDED.map(([icon, label]) => (
            <div key={label} data-reveal style={{ padding: 24, borderRadius: 'var(--radius-lg)', background: 'var(--surface-band)', border: '1px solid var(--line)' }}>
              <span style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--action-wash)', color: 'var(--action)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={21} /></span>
              <h3 style={{ marginTop: 18, fontSize: 18, textWrap: 'pretty' }}>{label}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EbookTrust() {
  return (
    <section style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--line)' }}>
      <div className="wrap split" style={{ padding: '80px var(--container-pad)', display: 'grid', gridTemplateColumns: 'minmax(0,46%) minmax(0,54%)', gap: 56, alignItems: 'center' }}>
        <div>
          <Eyebrow style={{ marginBottom: 16 }}>Who writes them</Eyebrow>
          <h2 style={{ fontSize: 'var(--type-h2-split-size)', lineHeight: 'var(--type-h2-split-leading)', maxWidth: '20ch' }}>Written by people who have won these applications.</h2>
          <p style={{ marginTop: 20, color: 'var(--text-body)', maxWidth: '44ch', fontSize: 'var(--type-body-large-size)', lineHeight: 'var(--type-body-large-leading)' }}>
            Every guide is written by someone who has been through the process it covers and reviewed by the OppDate team before it goes into the library. The examples are real applications, not invented ones.
          </p>
        </div>
        <img className="split-visual ebook-photo" src={(window.__resources && window.__resources.ebooksLibrary) || 'assets/ebooks-library.png'} alt="My eBooks library with three titles, each showing its category, author and reading progress" />
      </div>
    </section>
  );
}

const EBOOK_FAQS = [
  ['Do I get updates if a guide is revised?', 'Yes. Revised editions replace the copy in your library at no extra cost.', 'See the library', 'refresh-cw'],
  ['Can I read offline?', 'Yes. Every guide can be downloaded as a PDF or ePub, and the in-app reader has bookmarking and progress tracking.', 'What is included', 'file-down'],
  ['Is this a subscription?', 'No. You pay once for a guide and keep permanent access to it from your dashboard library.', 'Browse the library', 'badge-check'],
  ['Do Premium members get a discount?', 'Yes. Premium members pay the discounted member price shown on every guide, and no separate eBooks subscription is needed.', 'See pricing', 'percent'],
  ['Where do I find my eBooks after I buy them?', 'In your dashboard library, permanently.', 'What is included', 'library'],
];

function EbookFaq() {
  const [open, setOpen] = React.useState(0);
  return (
    <section style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--line)' }}>
      <div className="wrap split" style={{ padding: '80px var(--container-pad)', display: 'grid', gridTemplateColumns: 'minmax(0,36%) minmax(0,64%)', gap: 56, alignItems: 'start' }}>
        <div>
          <Eyebrow style={{ marginBottom: 16 }}>Questions</Eyebrow>
          <h2 style={{ fontSize: 'var(--type-h2-split-size)', lineHeight: 'var(--type-h2-split-leading)' }}>About eBooks.</h2>
          <p style={{ marginTop: 20, color: 'var(--text-body)', maxWidth: '32ch' }}>If something here is unclear, ask the team before you buy.</p>
          <div style={{ marginTop: 16 }}><LinkArrow href="/auth/register">Contact support</LinkArrow></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {EBOOK_FAQS.map(([t, b, c, icon], i) => (
            <AccordionRow key={t} title={t} body={b} ctaLabel={c} ctaHref="#catalog" icon={icon} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function EbookClosing() {
  return (
    <section id="start" className="om-tex om-tex-ink om-glow" style={{ background: 'var(--surface-dark)' }}>
      <div className="wrap" style={{ padding: '112px var(--container-pad)', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-on-dark)', maxWidth: '22ch', margin: '0 auto' }}>Start with the guide for the stage you are at.</h2>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
          <Button as="a" href="#catalog">Browse the library</Button>
        </div>
      </div>
    </section>
  );
}

function EbookBottom() {
  return (
    <div>
      <EbookIncluded />
      <EbookTrust />
      <EbookFaq />
      <EbookClosing />
      <div style={{ position: 'relative', background: 'var(--surface-dark)', isolation: 'isolate' }}>
        {window.OM && window.OM.FooterWatermark ? <window.OM.FooterWatermark /> : null}
        <Footer markSrc={EBOOK_MARK} columns={(window.OM && window.OM.FOOTER_COLS) || []} style={{ background: 'transparent', position: 'relative', zIndex: 1 }} />
      </div>
    </div>
  );
}

window.OME = Object.assign(window.OME || {}, { EbookHero, EbookHow, EbookTitle, EbookIncluded, EbookTrust, EbookFaq, EbookClosing, EbookBottom });
