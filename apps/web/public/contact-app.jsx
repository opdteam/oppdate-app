/* Contact page mount — follows company-app.jsx pattern. */
(function () {
  const contactDs = () => window.OppDateDesignSystem_4aa598 || {};
  const contactSections = () => window.OMCQ || {};
  const contactBottom = () => window.OM || {};
  const CONTACT_NAV_MARK =
    (window.__resources && window.__resources.monogram) || 'assets/oppdate-monogram.png';

  function ContactPage() {
    const NavBar = contactDs().NavBar;
    const CursorBadge = contactDs().CursorBadge;
    const Footer = contactDs().Footer;
    const S = contactSections();
    const B = contactBottom();

    const params = new URLSearchParams(window.location.search);
    const initialCategory = params.get('category') || '';

    return (
      <>
        <NavBar markSrc={CONTACT_NAV_MARK} />
        <S.InquirySection selectedCategory={initialCategory} />
        <div style={{ position: 'relative', background: 'var(--surface-dark)', isolation: 'isolate' }}>
          <B.FooterWatermark />
          <Footer
            markSrc={CONTACT_NAV_MARK}
            columns={B.FOOTER_COLS}
            style={{ background: 'transparent', position: 'relative', zIndex: 1 }}
          />
        </div>
        <CursorBadge label="Contact" />
      </>
    );
  }

  let __contactRoot = null;

  function mountContact() {
    const ds = contactDs();
    const sec = contactSections();
    const bot = contactBottom();
    const ready =
      ds.NavBar &&
      ds.Icon &&
      ds.Footer &&
      bot.FooterWatermark &&
      bot.FOOTER_COLS &&
      typeof sec.InquirySection === 'function';
    if (!ready) return void setTimeout(mountContact, 30);
    if (!__contactRoot)
      __contactRoot = ReactDOM.createRoot(document.getElementById('om-app'));
    __contactRoot.render(<ContactPage />);
  }
  mountContact();
})();
