const mentorDs = () => window.OppDateDesignSystem_4aa598 || {};
const mentorSections = () => window.OMM || {};
const MENTOR_NAV_MARK = (window.__resources && window.__resources.monogram) || 'assets/oppdate-monogram.png';

function MentorBackToTop() {
  const { Icon } = mentorDs();
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const hero = document.getElementById('mentor-top');
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

function MentorPage() {
  const { NavBar, CursorBadge } = mentorDs();
  const S = mentorSections();
  return (
    <div>
      <NavBar markSrc={MENTOR_NAV_MARK} />
      <S.MentorHero />
      <S.MentorBuild />
      <S.MentorPrograms />
      <S.MentorBottom />
      <CursorBadge label="Mentorship" />
      <MentorBackToTop />
    </div>
  );
}

const __mentorNeeded = ['MentorHero', 'MentorBuild', 'MentorPrograms', 'MentorBottom'];
let __mentorRoot = null;
function mountMentor() {
  const ready = mentorDs().NavBar && mentorDs().Icon && __mentorNeeded.every((k) => typeof mentorSections()[k] === 'function');
  if (!ready) return void setTimeout(mountMentor, 30);
  if (!__mentorRoot) __mentorRoot = ReactDOM.createRoot(document.getElementById('om-app'));
  __mentorRoot.render(<MentorPage />);
}
mountMentor();
