const pricingDs = () => window.OppDateDesignSystem_4aa598 || {};
const pricingSections = () => window.OMP || {};
const PRICING_NAV_MARK = window.__resources && window.__resources.monogram || 'assets/oppdate-monogram.png';

function PricingBackToTop() {
  const { Icon } = pricingDs();
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const hero = document.getElementById('pricing-top');
    const onScroll = () => setShown(hero ? hero.getBoundingClientRect().bottom < 0 : window.scrollY > window.innerHeight);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {window.removeEventListener('scroll', onScroll);window.removeEventListener('resize', onScroll);};
  }, []);
  return (
    <button
      type="button"
      aria-label="Back to top"
      className="om-circle-btn"
      onClick={() => window.scrollTo({ top: 0, behavior: window.REDUCED && window.REDUCED.matches ? 'auto' : 'smooth' })}
      style={{ position: 'fixed', right: 28, bottom: 28, zIndex: 80, width: 52, height: 52, borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line-strong)', background: 'var(--surface-card)', color: 'var(--color-text-ink)', boxShadow: 'var(--shadow-card)', cursor: 'pointer', opacity: shown ? 1 : 0, translate: shown ? '0 0' : '0 12px', pointerEvents: shown ? 'auto' : 'none', transition: 'opacity var(--duration-base) var(--ease-out-soft), translate var(--duration-base) var(--ease-out-soft), background-color var(--duration-fast) var(--ease-out-soft), border-color var(--duration-fast) var(--ease-out-soft), color var(--duration-fast) var(--ease-out-soft)' }}>
      
      <Icon name="arrow-up" size={22} />
    </button>);

}

function PricingPage() {
  const { NavBar, CursorBadge } = pricingDs();
  const S = pricingSections();
  return (
    <div>
      <NavBar markSrc={PRICING_NAV_MARK} />
      <S.PricingHero />
      <S.PricingCompare />
      <S.PricingBottom />
      <CursorBadge label="Pricing" />
      <PricingBackToTop />
    </div>);

}

const __pricingNeeded = ['PricingHero', 'PricingCompare', 'PricingBottom'];
let __pricingRoot = null;
function mountPricing() {
  const ready = pricingDs().NavBar && pricingDs().Icon && __pricingNeeded.every((k) => typeof pricingSections()[k] === 'function');
  if (!ready) return void setTimeout(mountPricing, 30);
  if (!__pricingRoot) __pricingRoot = ReactDOM.createRoot(document.getElementById('om-app'));
  __pricingRoot.render(<PricingPage />);
}
mountPricing();