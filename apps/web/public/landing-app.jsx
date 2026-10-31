/* Resolved lazily, not destructured at load: in a bundled build the design system script
   can evaluate after this one, so a top-level destructure captures undefined. */
const dsNS = () => window.OppDateDesignSystem_4aa598 || {};
/* Sections live on window.OM, not bare window: the design system bundle carries the UI kit's
   own TopOfPage/BottomOfPage and would overwrite same-named globals; the kit's hero then runs
   a parallax loop against layer images this page does not ship. */
const omSections = () => window.OM || {};

/* Appears once the hero has scrolled past, so it never competes with the hero CTAs.
   Same circular control language as the carousel and bento arrows: outlined at rest,
   solid clay on hover. */
function BackToTop() {
  const { Icon } = dsNS();
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const hero = document.getElementById('top');
    const onScroll = () => {
      const past = hero ? hero.getBoundingClientRect().bottom < 0 : window.scrollY > window.innerHeight;
      setShown(past);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);
  return (
    <button
      type="button"
      aria-label="Back to top"
      className="om-circle-btn"
      onClick={() => window.scrollTo({ top: 0, behavior: window.REDUCED && window.REDUCED.matches ? 'auto' : 'smooth' })}
      style={{ position: 'fixed', right: 28, bottom: 28, zIndex: 80, width: 52, height: 52, borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line-strong)', background: 'var(--surface-card)', color: 'var(--color-text-ink)', boxShadow: 'var(--shadow-card)', cursor: 'pointer', opacity: shown ? 1 : 0, translate: shown ? '0 0' : '0 12px', pointerEvents: shown ? 'auto' : 'none', transition: 'opacity var(--duration-base) var(--ease-out-soft), translate var(--duration-base) var(--ease-out-soft), background-color var(--duration-fast) var(--ease-out-soft), border-color var(--duration-fast) var(--ease-out-soft), color var(--duration-fast) var(--ease-out-soft)' }}
    >
      <Icon name="arrow-up" size={22} />
    </button>
  );
}

function LandingPage() {
  const { CursorBadge } = dsNS();
  const OMS = omSections();
  return (
    <div>
      <OMS.TopOfPage />
      <OMS.StatsRow />
      <OMS.WhatYouGet />
      <OMS.OppDateApply />
      <OMS.CredentialLibrary />
      <OMS.FeatureHighlights />
      <OMS.HowItWorks />
      <OMS.BottomOfPage />
      <CursorBadge label="OppDate" />
      <BackToTop />
    </div>
  );
}

/* Bundled/offline builds can load these babel scripts out of order, so wait for the design
   system namespace AND the section components to register before mounting, rather than
   assuming source order. */
/* Names here must not collide with anything on window: Babel transpiles top-level const to
   var, so every top-level binding in these scripts becomes a window property. */
const __omNeeded = ['NetworkHub', 'TopOfPage', 'StatsRow', 'HowItWorks', 'WhatYouGet', 'OppDateApply', 'CredentialLibrary', 'FeatureHighlights', 'BottomOfPage'];
let __omRoot = null;
function mountLanding() {
  const ready = dsNS().CursorBadge && dsNS().Icon && __omNeeded.every((k) => typeof omSections()[k] === 'function');
  if (!ready) return void setTimeout(mountLanding, 30);
  /* Mounted into #om-app, not #root: the design system bundle carries the UI kit's own
     page.jsx, which mounts a second LandingPage into #root referencing globals that do not
     exist yet. With no #root present, that mount fails inside its own try/catch instead. */
  if (!__omRoot) __omRoot = ReactDOM.createRoot(document.getElementById('om-app'));
  __omRoot.render(<LandingPage />);
}
mountLanding();
