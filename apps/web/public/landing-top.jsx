const { AnnouncementBar, NavBar, Button, Eyebrow, Badge, StatBlock } = window.OppDateDesignSystem_4aa598;
const MARK = (window.__resources && window.__resources.monogram) || 'assets/oppdate-monogram.png';
const TEX_CELL = 22;

function HeroTexture() {
  const ref = React.useRef(null);
  const [box, setBox] = React.useState({ w: 0, h: 0 });
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const shapes = React.useMemo(() => {
    const cols = Math.floor(box.w / TEX_CELL);
    const rows = Math.floor(box.h / TEX_CELL);
    if (cols < 2 || rows < 2) return [];
    const total = cols * rows;
    const taken = new Set();
    const pick = (n, kind) => {
      const out = [];
      for (let k = 0; k < n; k++) {
        const c = Math.floor(Math.random() * total);
        if (taken.has(c)) continue;
        taken.add(c);
        out.push({
          kind,
          key: kind + c,
          x: (c % cols) * TEX_CELL + TEX_CELL / 2,
          y: Math.floor(c / cols) * TEX_CELL + TEX_CELL / 2,
          still: Math.random() < 0.35,
          dur: (3.2 + Math.random() * 3.4).toFixed(2) + 's',
          delay: (-Math.random() * 6).toFixed(2) + 's',
          spin: (14 + Math.random() * 16).toFixed(1) + 's',
        });
      }
      return out;
    };
    return pick(Math.min(110, Math.round(total * 0.05)), 'dot').concat(pick(Math.min(38, Math.round(total * 0.012)), 'star'));
  }, [box.w, box.h]);

  return (
    <div ref={ref} aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', color: '#1A0F06' }}>
      {shapes.map((s) => s.kind === 'dot' ? (
        <span key={s.key} className="om-tex-pulse" style={{ position: 'absolute', left: s.x - 2, top: s.y - 2, width: 4, height: 4, borderRadius: '50%', background: 'currentColor', animationDuration: s.dur, animationDelay: s.delay }} />
      ) : (
        <span key={s.key} className="om-tex-spin" style={{ position: 'absolute', left: s.x - 5.5, top: s.y - 5.5, width: 11, height: 11, animationDuration: s.spin, animationDelay: s.delay }}>
          <span className={s.still ? undefined : 'om-tex-twinkle'} style={{ display: 'block', width: '100%', height: '100%', opacity: s.still ? 0.55 : undefined, animationDuration: s.dur, animationDelay: s.delay }}>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M12 0C12 6.6 17.4 12 24 12C17.4 12 12 17.4 12 24C12 17.4 6.6 12 0 12C6.6 12 12 6.6 12 0Z" /></svg>
          </span>
        </span>
      ))}
    </div>
  );
}

/* Hero entrance: same diagonal fade as the global scroll rule, fired once on mount and
   sequenced eyebrow → headline → body → CTAs → illustration. The hero grid opts out of the
   global scan (data-no-reveal) so these five steps own the order instead of the generic
   per-sibling stagger. Reduced motion is handled by the shared CSS: settled, no transition. */
function Hero() {
  const [inLoad, setInLoad] = React.useState(false);
  React.useEffect(() => {
    const r = requestAnimationFrame(() => setInLoad(true));
    return () => cancelAnimationFrame(r);
  }, []);
  const step = (i, fromRight) => ({
    className: 'om-rev' + (inLoad ? ' om-in' : ''),
    style: { '--rx': fromRight ? '24px' : '-24px', transitionDelay: i * 100 + 'ms' },
  });
  const merge = (i, fromRight, style) => {
    const s = step(i, fromRight);
    return { className: s.className, style: Object.assign({}, s.style, style) };
  };
  return (
    <section id="top" className="om-tex om-tex-light" style={{ background: 'var(--surface-card)' }}>
      <HeroTexture />
      <div data-no-reveal className="wrap split" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,52%) minmax(0,48%)', gap: 64, alignItems: 'start', padding: '40px var(--container-pad) 30px' }}>
        <div>
          <h1 {...merge(1, false, { maxWidth: '21ch', fontSize: 'clamp(34px, 3.7vw, 46px)' })}><span className="om-h1-line">Your next <span style={{ color: 'var(--decor-numeral)' }}>opportunity</span></span> is out there. <span style={{ display: 'block', fontSize: '0.6em', fontWeight: 'var(--type-tagline-weight)', fontStyle: 'italic', lineHeight: 'var(--type-tagline-leading)' }}>We will find it and help you secure it.</span></h1>
          <p {...merge(2, false, { marginTop: 24, fontSize: 'var(--type-body-large-size)', lineHeight: 'var(--type-body-large-leading)', color: 'var(--text-body)', maxWidth: '48ch' })}>
            OppDate is a premium platform with global opportunities, built to help you win. From timely, high-quality opportunities updated daily to all the tools and services you need to maximize your application.
          </p>
          <div {...merge(3, false, { display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 32 })}>
            <Button as="a" href="/opportunities">Browse opportunities</Button>
            <Button as="a" href="/services/apply" variant="secondary-on-light">See how OppDate Apply works</Button>
          </div>
        </div>
        <div {...merge(4, true, { position: 'relative', width: '100%' })}>
          <window.OM.NetworkHub />
        </div>
      </div>
    </section>
  );
}

const STATS = [
  { to: 10000, suffix: '+', label: 'Opportunities listed', lead: true },
  { to: 190, suffix: '+', label: 'Countries represented' },
  { to: 8, suffix: '+', label: 'Opportunity types' },
];

function Stat({ to, suffix, label, lead }) {
  const [ref, inView] = window.useInView({ threshold: 0.4 });
  return (
    <div ref={ref}>
      <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, color: lead ? 'var(--color-text-ink)' : 'var(--decor-numeral)', fontSize: lead ? 'clamp(56px, 6.6vw, 104px)' : 'clamp(38px, 3.6vw, 60px)' }}>
        <window.CountUp to={to} suffix={suffix} duration={lead ? 1800 : 1200} />
      </div>
      <div style={{ marginTop: 18, height: 3, borderRadius: 2, background: 'var(--action)', transformOrigin: 'left center', transform: inView ? 'scaleX(1)' : 'scaleX(0)', transition: 'transform 900ms var(--ease-out-soft) 120ms', width: lead ? '100%' : '72%' }} />
      <div style={{ marginTop: 16, fontFamily: 'var(--font-sans)', fontSize: lead ? 17 : 15, lineHeight: 1.5, color: lead ? 'var(--text-body)' : 'var(--text-quiet)' }}>{label}</div>
    </div>
  );
}

function StatsRow() {
  return (
    <section id="stats" className="om-tex om-tex-light" style={{ background: 'var(--surface-card)' }}>
      <div className="wrap cards3" style={{ padding: '0 var(--container-pad) 47px', display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 56, alignItems: 'end' }}>
        {STATS.map((s) => <Stat key={s.label} {...s} />)}
      </div>
    </section>
  );
}

function TopOfPage() {
  return (
    <div>
      <AnnouncementBar ctaLabel={null} style={{ height: 'auto', display: 'block', padding: '10px 20px', fontSize: 14, lineHeight: 1.45, textWrap: 'pretty' }}><strong style={{ fontWeight: 700 }}>OppDate is now live.</strong> Discover exclusive global opportunities with Premium access. <a href="/auth/register" style={{ color: 'var(--text-on-dark)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>Get started</a></AnnouncementBar>
      <NavBar markSrc={MARK} />
      <Hero />
    </div>
  );
}

window.OM = Object.assign(window.OM || {}, { HeroTexture, Hero, Stat, StatsRow, TopOfPage });
