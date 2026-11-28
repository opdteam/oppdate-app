(function () {
  const blogDs = () => window.OppDateDesignSystem_4aa598 || {};
  const blogSections = () => window.OMBLOG || {};
  const blogBottom = () => window.OM || {};
  const BLOG_NAV_MARK = (window.__resources && window.__resources.monogram) || 'assets/oppdate-monogram.png';

  function BlogBackToTop() {
    const [show, setShow] = React.useState(false);
    React.useEffect(() => {
      const check = () => setShow(window.scrollY > window.innerHeight * 0.5);
      window.addEventListener('scroll', check, { passive: true });
      check();
      return () => window.removeEventListener('scroll', check);
    }, []);
    const Icon = blogDs().Icon;
    if (!Icon) return null;
    const reduced = window.REDUCED && window.REDUCED.matches;
    return (
      <button
        type="button"
        aria-label="Back to top"
        className="om-circle-btn"
        onClick={() => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })}
        style={{
          position: 'fixed', right: 28, bottom: 28, zIndex: 80,
          width: 52, height: 52, borderRadius: 'var(--radius-pill)',
          border: '1px solid var(--line-strong)', background: 'var(--surface-card)',
          color: 'var(--text-body)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          transition: 'opacity var(--duration-base) var(--ease-out-soft), translate var(--duration-base) var(--ease-out-soft), border-color var(--duration-fast) ease, background var(--duration-fast) ease, color var(--duration-fast) ease',
          opacity: show ? 1 : 0, translate: show ? '0 0' : '0 12px',
          pointerEvents: show ? 'auto' : 'none',
        }}
      >
        <Icon name="arrow-up" size={20} />
      </button>
    );
  }

  function BlogPage() {
    const NavBar = blogDs().NavBar;
    const Footer = blogDs().Footer;
    const CursorBadge = blogDs().CursorBadge;
    const S = blogSections();
    const B = blogBottom();

    return (
      <>
        <NavBar markSrc={BLOG_NAV_MARK} />
        <S.BlogHero />
        <S.BlogListing />
        <S.BlogNewsletter />
        <div style={{ position: 'relative', background: 'var(--surface-dark)', isolation: 'isolate' }}>
          <B.FooterWatermark />
          <Footer
            markSrc={BLOG_NAV_MARK}
            columns={B.FOOTER_COLS}
            style={{ background: 'transparent', position: 'relative', zIndex: 1 }}
          />
        </div>
        <CursorBadge label="Blog" />
        <BlogBackToTop />
      </>
    );
  }

  let __blogRoot = null;

  function mountBlog() {
    const ds = blogDs();
    const sec = blogSections();
    const bot = blogBottom();
    const ready =
      ds.NavBar && ds.Icon && ds.Footer &&
      bot.FooterWatermark && bot.FOOTER_COLS &&
      sec.BlogHero && sec.BlogListing && sec.BlogNewsletter;

    if (!ready) return void setTimeout(mountBlog, 30);

    if (!__blogRoot)
      __blogRoot = ReactDOM.createRoot(document.getElementById('om-app'));
    __blogRoot.render(<BlogPage />);
  }

  mountBlog();
})();
