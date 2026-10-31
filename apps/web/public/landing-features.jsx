const omRes = (id, path) => (window.__resources && window.__resources[id]) || path;
const { Card, Badge, Eyebrow, Icon, Button, CountdownChip, IllustrationSlot, LinkArrow } = window.OppDateDesignSystem_4aa598;

/* Flagship section. Panel fill, radius and body colour are lifted from AccordionRow's
   open state (var(--action), --radius-lg, rgba(255,249,244,0.86)) so the two read as
   the same treatment at different scales. */
const APPLY_BENEFITS = [
  'Full application takeover',
  'Higher acceptance rates',
  'Expert-led submissions',
  'Optimized application materials',
  'Direct access to the OppDate team',
  'Full process involvement',
  'Application tracking',
  'Clear upfront pricing',
  'Fast, efficient processing',
];

function OppDateApply() {
  return (
    <section id="oppdate-apply" style={{ background: 'var(--surface-card)' }}>
      <div className="wrap" style={{ padding: '80px var(--container-pad)' }}>
        <div className="split apply-panel" style={{ background: 'var(--action)', color: 'var(--text-on-dark)', borderRadius: 'var(--radius-lg)', padding: 56, display: 'grid', gridTemplateColumns: 'minmax(0,55%) minmax(0,45%)', gap: 56, alignItems: 'center' }}>
          <div>
            <Eyebrow tone="on-primary" style={{ marginBottom: 16, color: 'rgba(255,249,244,0.72)' }}>OppDate Apply</Eyebrow>
            <Badge tone="premium" style={{ marginBottom: 14, background: 'rgba(255,249,244,0.14)', color: 'var(--text-on-dark)' }}>Available with Premium</Badge>
            <h2 style={{ color: 'var(--text-on-dark)', maxWidth: '16ch' }}>Stop applying. Start winning.</h2>
            <p style={{ marginTop: 20, fontSize: 'var(--type-body-large-size)', lineHeight: 'var(--type-body-large-leading)', color: 'rgba(255,249,244,0.86)', maxWidth: '46ch' }}>
              OppDate Apply is our full-service application agent. You tell us where you want to go, we handle everything it takes to get you there.
            </p>
            <ul className="apply-list" style={{ listStyle: 'none', margin: '32px 0 0', padding: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
              {APPLY_BENEFITS.map((b) => (
                <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.45, color: 'var(--text-on-dark)' }}>
                  <span style={{ flex: 'none', width: 20, height: 20, marginTop: 1, borderRadius: 'var(--radius-pill)', background: 'rgba(255,249,244,0.16)', color: 'var(--text-on-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={13} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 36 }}>
              <Button as="a" href="/services/apply" variant="on-primary" size="lg">See how it works</Button>
            </div>
          </div>
          <img
            src={omRes('applyProgress', 'assets/application-progress.webp')}
            alt="My Applications dashboard: five applications with counts by status, and a Chevening Scholarship 2027 timeline showing payment confirmed, application assigned and documents under review, with a note from the OppDate team"
            loading="lazy"
            style={{ display: 'block', width: '100%', borderRadius: 'var(--radius-frame)' }}
          />
        </div>
      </div>
    </section>
  );
}

/* Radial progress ring. The eligibility-match visualization it is meant to match does
   not exist in the design system yet, so this defines the style: gold track, clay
   progress, round cap, sweeping in on scroll into view. Reuse it when that lands. */
function ProgressRing({ value = 78, size = 96, stroke = 8, children }) {
  const ref = React.useRef(null);
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div ref={ref} style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--action-wash)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--action)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={shown ? c * (1 - value / 100) : c}
          style={{ transition: 'stroke-dashoffset 1.1s var(--ease-out-soft)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>{children}</div>
    </div>
  );
}

function Tile({ area, children, style }) {
  return <Card interactive padding={24} style={{ gridArea: area, display: 'flex', flexDirection: 'column', ...style }}>{children}</Card>;
}

function TileText({ title, body }) {
  return (
    <div style={{ marginTop: 'auto', paddingTop: 20 }}>
      <Badge tone="premium" style={{ marginBottom: 10, fontSize: 9.5, padding: '4px 9px' }}>Available with Premium</Badge>
      <h3 style={{ fontSize: 19 }}>{title}</h3>
      <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5, color: 'var(--text-body)' }}>{body}</p>
    </div>
  );
}

const FILTER_ROWS = [
  { label: 'Region', chips: ['Africa', 'Europe', 'Global'], on: 1 },
  { label: 'Funding', chips: ['Funded', 'Paid', 'Unpaid'], on: 0 },
  { label: 'Deadline', chips: ['This week', 'This month'], on: 1 },
];

function FeatureHighlights() {
  return (
    <section style={{ background: 'var(--surface-card)' }}>
      <div className="wrap" style={{ padding: '80px var(--container-pad)' }}>
        <Eyebrow style={{ marginBottom: 16 }}>Feature highlights</Eyebrow>
        <h2 style={{ maxWidth: '20ch' }}>The small things that keep you moving.</h2>
        <div className="bento" style={{ marginTop: 48, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(3, minmax(200px, auto))', gridTemplateAreas: '"lib lib dead save" "lib lib notif prof" "ready blog blog blog"', gap: 20 }}>
          <Tile area="lib">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 120, justifyContent: 'center' }}>
              {FILTER_ROWS.map((r) => (
                <span key={r.label} style={{ display: 'grid', gridTemplateColumns: '78px 1fr', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-quiet)' }}>{r.label}</span>
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {r.chips.map((c, i) => (
                      <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 12px', borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, background: i === r.on ? 'var(--action)' : 'var(--surface-band)', color: i === r.on ? 'var(--color-text-inverse)' : 'var(--text-quiet)', border: i === r.on ? 'none' : '1px solid var(--line)' }}>
                        {i === r.on && <Icon name="check" size={12} />}
                        {c}
                      </span>
                    ))}
                  </span>
                </span>
              ))}
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--text-quiet)' }}>142 matches</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px', borderRadius: 'var(--radius-pill)', background: 'var(--action-wash)', color: 'var(--action)', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600 }}>
                  <Icon name="bookmark" size={13} />
                  Search saved
                </span>
              </span>
            </div>
            <TileText title="Saved searches" body="Filter by region, funding and closing date, then save the search. New listings that fit arrive without you searching again." />
          </Tile>
          <Tile area="dead">
            <span style={{ transform: 'scale(0.82)', transformOrigin: 'left top', display: 'inline-flex' }}>
              <CountdownChip tone="light" parts={['02d', '11h', '40m']} />
            </span>
            <TileText title="Deadline reminders" body="A nudge before every closing date, so nothing lapses while you are busy." />
          </Tile>
          <Tile area="save">
            <span style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--action-wash)', color: 'var(--action)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="bookmark" size={20} />
            </span>
            <TileText title="Save opportunities" body="Keep a shortlist and come back to it when you are ready to apply." />
          </Tile>
          <Tile area="notif">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 30, padding: '0 12px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-band)', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--color-text-ink)', alignSelf: 'flex-start' }}>
              <span className="om-pulse" style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--action)' }} />
              3 new matches
            </span>
            <TileText title="OppDate notifications" body="New listings in your field reach you the day they go live." />
          </Tile>
          <Tile area="prof">
            <span style={{ display: 'flex', gap: 5, alignSelf: 'stretch' }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} style={{ flex: 1, height: 6, borderRadius: 999, background: n <= 4 ? 'var(--action)' : 'var(--action-wash)' }} />
              ))}
            </span>
            <TileText title="Profile strength" body="See what is missing from your profile before an organisation does." />
          </Tile>
          <Tile area="ready" style={{ alignItems: 'flex-start' }}>
            <ProgressRing value={78} size={92}>
              <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 24, color: 'var(--color-text-ink)' }}>78</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-quiet)' }}>Ready</span>
            </ProgressRing>
            <TileText title="Readiness score" body="How prepared you are for a given opportunity, scored before you start." />
          </Tile>
          <Tile area="blog" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {['Writing a motivation letter that gets read', 'What funders actually check first', 'Five interview mistakes that cost offers'].map((t) => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-band)', border: '1px solid var(--line)', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-text-ink)' }}>
                  <Icon name="book-open" size={14} />
                  {t}
                </span>
              ))}
            </div>
            <div className="om-blog-foot" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginTop: 24 }}>
              <div style={{ minWidth: 0 }}>
                <Badge tone="premium" style={{ marginBottom: 10, fontSize: 9.5, padding: '4px 9px' }}>Available with Premium</Badge>
                <h3 style={{ fontSize: 19 }}>Blogs</h3>
                <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5, color: 'var(--text-body)', maxWidth: '52ch' }}>Practical writing on applications from people who have been through it.</p>
              </div>
              <LinkArrow href="#blogs">Read the blog</LinkArrow>
            </div>
          </Tile>
        </div>
      </div>
    </section>
  );
}

window.OM = Object.assign(window.OM || {}, { OppDateApply, ProgressRing, FeatureHighlights });
