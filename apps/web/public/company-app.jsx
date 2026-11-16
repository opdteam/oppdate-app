/* Company page mount — follows pricing-app.jsx pattern exactly. */
(function () {
  const companyDs = () => window.OppDateDesignSystem_4aa598 || {};
  const companySections = () => window.OMCO || {};
  const companyBottom = () => window.OM || {};
  const COMPANY_NAV_MARK =
    (window.__resources && window.__resources.monogram) || 'assets/oppdate-monogram.png';

  function CompanyBackToTop() {
    const [show, setShow] = React.useState(false);
    React.useEffect(() => {
      const check = () => {
        const hero = document.getElementById('company-top');
        if (hero) {
          const r = hero.getBoundingClientRect();
          setShow(r.bottom < 0);
        } else {
          setShow(window.scrollY > window.innerHeight);
        }
      };
      window.addEventListener('scroll', check, { passive: true });
      check();
      return () => window.removeEventListener('scroll', check);
    }, []);
    const Icon = companyDs().Icon;
    if (!Icon) return null;
    const reduced = window.REDUCED && window.REDUCED.matches;
    return (
      <button
        type="button"
        aria-label="Back to top"
        className="om-circle-btn"
        onClick={() =>
          window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
        }
        style={{
          position: 'fixed',
          right: 28,
          bottom: 28,
          zIndex: 80,
          width: 52,
          height: 52,
          borderRadius: 'var(--radius-pill)',
          border: '1px solid var(--line-strong)',
          background: 'var(--surface-card)',
          color: 'var(--text-body)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition:
            'opacity var(--duration-base) var(--ease-out-soft), translate var(--duration-base) var(--ease-out-soft), border-color var(--duration-fast) ease, background var(--duration-fast) ease, color var(--duration-fast) ease',
          opacity: show ? 1 : 0,
          translate: show ? '0 0' : '0 12px',
          pointerEvents: show ? 'auto' : 'none',
        }}
      >
        <Icon name="arrow-up" size={20} />
      </button>
    );
  }

  function CompanyPage() {
    const NavBar = companyDs().NavBar;
    const CursorBadge = companyDs().CursorBadge;
    const Footer = companyDs().Footer;
    const S = companySections();
    const B = companyBottom();

    const [selectedCategory, setSelectedCategory] = React.useState('');

    const handleInquire = (roleId, roleTitle) => {
      const mapped = S.ROLE_TO_CATEGORY[roleId] || 'general';
      setSelectedCategory(mapped);
      const el = document.getElementById('inquiry');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
      <>
        <NavBar markSrc={COMPANY_NAV_MARK} />
        <S.CompanyHero />
        <S.MissionSection />
        <S.GlobalReachMap />
        <S.WorkWithUsSection onInquire={handleInquire} />
        <S.InquirySection selectedCategory={selectedCategory} />
        <div style={{ position: 'relative', background: 'var(--surface-dark)', isolation: 'isolate' }}>
          <B.FooterWatermark />
          <Footer
            markSrc={COMPANY_NAV_MARK}
            columns={B.FOOTER_COLS}
            style={{ background: 'transparent', position: 'relative', zIndex: 1 }}
          />
        </div>
        <CursorBadge label="Company" />
        <CompanyBackToTop />
      </>
    );
  }

  const __companyNeeded = [
    'CompanyHero',
    'MissionSection',
    'GlobalReachMap',
    'WorkWithUsSection',
    'InquirySection',
  ];
  let __companyRoot = null;

  function mountCompany() {
    const ds = companyDs();
    const sec = companySections();
    const bot = companyBottom();
    const ready =
      ds.NavBar &&
      ds.Icon &&
      ds.Footer &&
      bot.FooterWatermark &&
      bot.FOOTER_COLS &&
      __companyNeeded.every((k) => typeof sec[k] === 'function');
    if (!ready) return void setTimeout(mountCompany, 30);
    if (!__companyRoot)
      __companyRoot = ReactDOM.createRoot(document.getElementById('om-app'));
    __companyRoot.render(<CompanyPage />);
    if (window.location.hash) {
      var hashId = window.location.hash.slice(1);
      var attempts = 0;
      (function scrollToHash() {
        var target = document.getElementById(hashId);
        if (target) { target.scrollIntoView({ behavior: 'auto', block: 'start' }); return; }
        if (++attempts < 20) setTimeout(scrollToHash, 50);
      })();
    }
  }
  mountCompany();
})();
