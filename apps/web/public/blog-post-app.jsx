(function () {
  const postDs = () => window.OppDateDesignSystem_4aa598 || {};
  const postSections = () => window.OMBLOGPOST || {};
  const postBottom = () => window.OM || {};
  const POST_NAV_MARK = (window.__resources && window.__resources.monogram) || 'assets/oppdate-monogram.png';

  function BlogPostPage() {
    const NavBar = postDs().NavBar;
    const Footer = postDs().Footer;
    const CursorBadge = postDs().CursorBadge;
    const S = postSections();
    const B = postBottom();

    return (
      <>
        <NavBar markSrc={POST_NAV_MARK} />
        <S.BlogPostView />
        <div style={{ position: 'relative', background: 'var(--surface-dark)', isolation: 'isolate' }}>
          <B.FooterWatermark />
          <Footer
            markSrc={POST_NAV_MARK}
            columns={B.FOOTER_COLS}
            style={{ background: 'transparent', position: 'relative', zIndex: 1 }}
          />
        </div>
        <CursorBadge label="Blog" />
      </>
    );
  }

  let __postRoot = null;

  function mountPost() {
    const ds = postDs();
    const sec = postSections();
    const bot = postBottom();
    const ready =
      ds.NavBar && ds.Icon && ds.Footer &&
      bot.FooterWatermark && bot.FOOTER_COLS &&
      sec.BlogPostView;

    if (!ready) return void setTimeout(mountPost, 30);

    if (!__postRoot)
      __postRoot = ReactDOM.createRoot(document.getElementById('om-app'));
    __postRoot.render(<BlogPostPage />);
  }

  mountPost();
})();
