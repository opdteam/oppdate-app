const applyDs = () => window.OppDateDesignSystem_4aa598 || {};
const applySections = () => window.OMA || {};
const APPLY_NAV_MARK = (window.__resources && window.__resources.monogram) || 'assets/oppdate-monogram.png';

/* Same affordance as the landing page: appears once the hero zone has scrolled past. */
function ApplyBackToTop() {
  const { Icon } = applyDs();
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const hero = document.getElementById('apply-top');
    const onScroll = () => setShown(hero ? hero.getBoundingClientRect().bottom < 0 : window.scrollY > window.innerHeight);
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

function ApplyPage() {
  const { NavBar, CursorBadge } = applyDs();
  const S = applySections();
  return (
    <div>
      <NavBar markSrc={APPLY_NAV_MARK} />
      <S.ApplyHero />
      <S.ApplyFlow />
      <S.ApplyBottom />
      <CursorBadge label="OppDate Apply" />
      <ApplyBackToTop />
    </div>
  );
}

const __applyNeeded = ['ApplyHero', 'ApplyFlow', 'ApplyBottom'];
let __applyRoot = null;
function mountApply() {
  const ready = applyDs().NavBar && applyDs().Icon && __applyNeeded.every((k) => typeof applySections()[k] === 'function');
  if (!ready) return void setTimeout(mountApply, 30);
  if (!__applyRoot) __applyRoot = ReactDOM.createRoot(document.getElementById('om-app'));
  __applyRoot.render(<ApplyPage />);
}
mountApply();
