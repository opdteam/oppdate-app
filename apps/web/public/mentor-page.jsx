const { Button, Eyebrow, Icon, AccordionRow, IllustrationSlot, LinkArrow, Footer } = window.OppDateDesignSystem_4aa598;
const MENTOR_MARK = (window.__resources && window.__resources.monogram) || 'assets/oppdate-monogram.png';

/* Hero entrance mirrors the landing hero: one mount-fired sequence, eyebrow through image,
   on the same diagonal the global scroll reveal uses. The grid opts out of the generic scan
   so these five steps own the order. */
function MentorHero() {
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
    <section id="mentor-top" className="om-tex om-tex-ink om-glow" style={{ background: 'var(--surface-dark)' }}>
      <div data-no-reveal className="wrap split" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,55%) minmax(0,45%)', gap: 56, alignItems: 'center', padding: '64px var(--container-pad) 88px' }}>
        <div>
          <h1 {...step(1, { color: 'var(--text-on-dark)', maxWidth: '18ch', fontSize: 'clamp(36px, 4.2vw, 56px)' })}>
            Guidance from people who have <span style={{ color: 'var(--decor-numeral)' }}>already done this</span>.
          </h1>
          <p {...step(2, { marginTop: 24, color: 'var(--text-on-dark-quiet)', fontSize: 'var(--type-body-large-size)', lineHeight: 'var(--type-body-large-leading)', maxWidth: '46ch' })}>
            Match with a dedicated mentor who has mastered the process and knows the exact strategies behind every successful admission. Get expert insight applied directly to your plans and documents. Not a single consultation call, but continuous guidance on a flexible monthly timeline.
          </p>
          <div {...step(3, { marginTop: 30 })}>
            <Button as="a" href="#programs" onClick={(e) => { e.preventDefault(); document.getElementById('programs')?.scrollIntoView({ behavior: 'smooth' }); }}>Begin Mentorship</Button>
          </div>
        </div>
        <div {...step(4)}>
          <img className="split-visual mentor-shot" src={(window.__resources && window.__resources.mentorship) || 'assets/mentorship.webp'} alt="Messages screen showing a mentorship thread with a mentor sharing a profile audit template" />
        </div>
      </div>
    </section>
  );
}

/* Page-level promise: what mentorship is, independent of any one program's cycle. Copy is the
   client's, verbatim. Cycle length lives with each program card, never on the page as a whole. */
const BUILD_WITH = [
  ['users', 'Done-with-you application guidance'],
  ['search-check', 'Full profile audit and strategy for your specific case'],
  ['file-pen-line', 'Application and document building, reviewed and refined together'],
  ['message-square', 'Private messaging thread with your mentor'],
  ['compass', 'Strategic onboarding session to map your application plan'],
  ['play', 'Starts the day you make payment. Your first cycle runs for 30 days.'],
  ['handshake', 'Begins with a one time introduction session where your mentor dives into your background, profile, and goals to build your winning strategy and application plan.'],
  ['repeat', 'Need more time? Seamlessly extend your support by purchasing an additional 1-month cycle, for as many months as you need.'],
];

function MentorBuild() {
  return (
    <section id="how" style={{ background: 'var(--surface-card)' }}>
      <div className="wrap" style={{ padding: '80px var(--container-pad)' }}>
        <Eyebrow style={{ marginBottom: 16 }}>How it works</Eyebrow>
        <h2 style={{ maxWidth: '26ch' }}>Here's how we build your winning application with you.</h2>
        <div className="mentor-build" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '0 40px', marginTop: 40 }}>
          {BUILD_WITH.map(([icon, label], i) => (
            <span key={label} data-reveal style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '20px 0', borderTop: '1px solid var(--line)' }}>
              <span style={{ flex: 'none', width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--action-wash)', color: 'var(--action)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={19} /></span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: 1.55, color: 'var(--color-text-ink)', textWrap: 'pretty' }}>{label}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Extract level tag from title: "(BSC)" -> "BSC", "(MSC)" -> "MSC" */
function extractLevel(title) {
  const m = title.match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : null;
}

const PROGRAM_BODY = "With this program, you get a dedicated private mentor for a full 30-day cycle. One-on-one, intentional, and fully involved. This isn't group advice or recycled templates. A matched mentor works with you directly on your documents, materials, recommendations, and the positioning choices that actually move the needle.";

function MentorPrograms() {
  const [programmes, setProgrammes] = React.useState([]);

  React.useEffect(() => {
    const base = (window.__apiBase || '').replace(/\/$/, '');
    fetch(base + '/api/v1/mentorships/programmes')
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json && json.data) setProgrammes(json.data.filter(p => p.active)); })
      .catch(() => {});
  }, []);

  return (
    <section id="programs" style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--line)' }}>
      <div className="wrap" style={{ padding: '80px var(--container-pad)' }}>
        <Eyebrow style={{ marginBottom: 16 }}>Programs</Eyebrow>
        <h2 style={{ maxWidth: '24ch' }}>Choose the program that matches your level.</h2>
        <div className="mentor-programs" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 24, marginTop: 44 }}>
          {programmes.map((p) => {
            const level = extractLevel(p.title);
            const displayTitle = p.title.replace(/\s*\([^)]+\)\s*$/, '');
            const fee = Math.round(p.monthlyPriceUsd / 100);
            return (
              <div key={p.id} data-reveal className="mentor-program" style={{ display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-lg)', background: 'var(--surface-card)', border: '1px solid var(--line)', overflow: 'hidden' }}>
                <div style={{ position: 'relative', aspectRatio: '16 / 9', background: 'var(--surface-dark)' }}>
                  {p.headerImageUrl
                    ? <img src={p.headerImageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(150deg, rgba(194,65,12,0.4), rgba(22,14,8,0.9) 64%), repeating-linear-gradient(135deg, rgba(255,249,244,0.05) 0 2px, transparent 2px 10px)' }} />
                  }
                  {level && <span style={{ position: 'absolute', left: 20, top: 18, padding: '6px 12px', borderRadius: 'var(--radius-pill)', background: 'var(--action)', color: 'var(--color-text-inverse)', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}>{level}</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 28 }}>
                  <h3 style={{ fontSize: 22, textWrap: 'pretty' }}>{displayTitle} {level && <span style={{ color: 'var(--text-quiet)', fontWeight: 500 }}>({level})</span>}</h3>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginTop: 12 }}>
                    <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 34, lineHeight: 1, color: 'var(--color-text-ink)' }}>${fee}</span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--text-quiet)' }}>per 30-day cycle</span>
                  </span>
                  <p style={{ marginTop: 16, fontSize: 15.5, lineHeight: 1.6, color: 'var(--text-body)' }}>{p.description || PROGRAM_BODY}</p>
                  <span style={{ marginTop: 'auto', paddingTop: 26, display: 'block' }}>
                    <Button as="a" href={`/services/mentorship/enrol?programme=${p.id}`} size="lg" style={{ width: '100%' }}>Begin Mentorship</Button>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ marginTop: 22, fontFamily: 'var(--font-sans)', fontSize: 14.5, color: 'var(--text-quiet)' }}>More programs will be added as the roster grows.</p>
      </div>
    </section>
  );
}

const MENTOR_FAQS = [
  ['How long does a program run?', 'Each program states its own cycle length on its card. The programs available today run for 30 days from the day you pay, and you can extend by purchasing another cycle.', 'See the programs', 'calendar-days'],
  ['How do I talk to my mentor?', 'In a private thread that opens when you are matched. Messages, notes and scheduled sessions all live there for the whole cycle.', 'See how it works', 'message-circle'],
  ['Who will I be matched with?', 'A mentor whose background fits the process you are working through. If the match is not right, tell the team in your thread and we rematch you, carrying your notes and history across.', 'Contact support', 'refresh-cw'],
  ['What happens when a cycle ends?', 'Your notes, tasks and thread history stay in your account. Purchase another cycle whenever you want to carry on, with the same mentor.', 'Begin Mentorship', 'archive'],
];

function MentorFaq() {
  const [open, setOpen] = React.useState(0);
  return (
    <section style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--line)' }}>
      <div className="wrap split" style={{ padding: '80px var(--container-pad)', display: 'grid', gridTemplateColumns: 'minmax(0,36%) minmax(0,64%)', gap: 56, alignItems: 'start' }}>
        <div>
          <Eyebrow style={{ marginBottom: 16 }}>Questions</Eyebrow>
          <h2 style={{ fontSize: 'var(--type-h2-split-size)', lineHeight: 'var(--type-h2-split-leading)' }}>About mentorship.</h2>
          <p style={{ marginTop: 20, color: 'var(--text-body)', maxWidth: '32ch' }}>If something here is unclear, ask the team before you start.</p>
          <div style={{ marginTop: 16 }}><LinkArrow href="/auth/register">Contact support</LinkArrow></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MENTOR_FAQS.map(([t, b, c, icon], i) => (
            <AccordionRow key={t} title={t} body={b} ctaLabel={c} ctaHref="#start" icon={icon} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function MentorClosing() {
  return (
    <section id="start" className="om-tex om-tex-ink om-glow" style={{ background: 'var(--surface-dark)' }}>
      <div className="wrap" style={{ padding: '112px var(--container-pad)', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-on-dark)', maxWidth: '24ch', margin: '0 auto' }}>Maximize your chances, and avoid navigating the process alone.</h2>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
          <Button as="a" href="#programs">Begin Mentorship</Button>
        </div>
      </div>
    </section>
  );
}

function MentorBottom() {
  return (
    <div>
      <MentorFaq />
      <MentorClosing />
      <div style={{ position: 'relative', background: 'var(--surface-dark)', isolation: 'isolate' }}>
        {window.OM && window.OM.FooterWatermark ? <window.OM.FooterWatermark /> : null}
        <Footer markSrc={MENTOR_MARK} columns={(window.OM && window.OM.FOOTER_COLS) || []} style={{ background: 'transparent', position: 'relative', zIndex: 1 }} />
      </div>
    </div>
  );
}

window.OMM = Object.assign(window.OMM || {}, { MentorHero, MentorBuild, MentorPrograms, MentorFaq, MentorClosing, MentorBottom });
