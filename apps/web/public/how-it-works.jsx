const { Eyebrow, Icon } = window.OppDateDesignSystem_4aa598;

const STEPS = [
{ i: '01', icon: 'search', title: 'Discover', color: 'var(--color-status-pending-bg)', ink: 'var(--color-text-ink)', body: 'Matched opportunities across 190+ countries, updated daily so listings stay current.' },
{ i: '02', icon: 'shield-check', title: 'Check eligibility', color: 'var(--color-accent-gold)', ink: 'var(--color-text-ink)', body: "Answer a few questions and know if you qualify before you spend time preparing, screened against the opportunity's own criteria." },
{ i: '03', icon: 'layers', title: 'Apply with your library', color: 'var(--color-primary)', ink: 'var(--color-text-inverse)', body: 'Upload your CV, transcripts and portfolio once, then select what you need for every future application.' },
{ i: '04', icon: 'activity', title: 'Track every status', color: 'var(--color-primary-press)', ink: 'var(--color-text-inverse)', body: 'See exactly where each application stands, in real time, without chasing anyone for updates.' }];


/* The rail between the badges is scroll linked, not a static line: its fill height tracks
   the reading line down the section, and the gradient behind it carries each step's own
   badge colour, so a segment takes that colour as you pass it. */
function HowItWorks() {
  const wrapRef = React.useRef(null);
  const badgeRefs = React.useRef([]);
  const [rail, setRail] = React.useState({ top: 0, height: 0, fill: 0, stops: [] });

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
      const line = window.scrollY + window.innerHeight * 0.55 - wrapTop;
      const fill = Math.max(0, Math.min(height, line - top));
      const stops = centers.map((c) => (c - top) / height * 100);
      setRail({ top, height, fill, stops });
    };
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {window.removeEventListener('scroll', measure);window.removeEventListener('resize', measure);};
  }, []);

  const gradient = rail.stops.length === STEPS.length ?
  'linear-gradient(to bottom, ' + STEPS.map((s, n) => {
    const from = n === 0 ? 0 : rail.stops[n];
    const to = n === STEPS.length - 1 ? 100 : rail.stops[n + 1];
    return s.color + ' ' + from + '%, ' + s.color + ' ' + to + '%';
  }).join(', ') + ')' :
  'var(--action)';

  return (
    <section id="how-it-works" style={{ background: 'var(--surface-dark)' }}>
      <div className="wrap" style={{ padding: '120px var(--container-pad)' }}>
        <Eyebrow tone="gold" style={{ marginBottom: 20 }}>How it works</Eyebrow>
        <h2 style={{ color: 'var(--text-on-dark)', maxWidth: '20ch' }}>From first search to submitted application.</h2>
        <div ref={wrapRef} style={{ position: 'relative', marginTop: 48 }}>
          <div style={{ position: 'absolute', left: 29, top: rail.top, height: rail.height, width: 2, background: 'var(--line-on-dark)', borderRadius: 2 }} />
          <div style={{ position: 'absolute', left: 29, top: rail.top, height: rail.fill, width: 2, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: rail.height, width: '100%', background: gradient }} />
          </div>
          {STEPS.map((s, n) =>
          <a key={s.i} href="#how-it-works" style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 24, padding: '24px 0', textDecoration: 'none', borderBottom: n === STEPS.length - 1 ? 'none' : '1px solid var(--line-on-dark)' }}>
              <span ref={(el) => badgeRefs.current[n] = el} style={{ position: 'relative', zIndex: 1, flex: 'none', width: 60, height: 60, borderRadius: 'var(--radius-pill)', border: '1.5px solid var(--line-on-dark)', background: 'var(--surface-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ width: 40, height: 40, borderRadius: 'var(--radius-pill)', background: s.color, color: s.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={s.icon} size={20} />
                </span>
              </span>
              <span style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                  <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 15, letterSpacing: '0.04em', color: 'var(--decor-numeral)' }}>{s.i}</span>
                  <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'var(--type-h3-size)', lineHeight: 1.25, color: 'var(--text-on-dark)' }}>{s.title}</span>
                </span>
                <span style={{ display: 'block', marginTop: 10, fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: 1.55, color: 'var(--text-on-dark-quiet)', maxWidth: '58ch' }}>{s.body}</span>
              </span>
              <span className="om-step-arrow" style={{ width: 40, height: 40, flex: 'none', borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line-on-dark)', background: 'transparent', color: 'var(--text-on-dark)', transition: 'var(--transition-interactive)', alignSelf: 'center' }}>
                <Icon name="arrow-up-right" size={18} />
              </span>
            </a>
          )}
        </div>
      </div>
    </section>);

}

window.OM = Object.assign(window.OM || {}, { HowItWorks });
