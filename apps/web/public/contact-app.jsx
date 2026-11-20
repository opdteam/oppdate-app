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

    const [category, setCategory] = React.useState('');

    React.useEffect(function () {
      var hash = window.location.hash.slice(1);
      if (!hash || hash === 'work-with-us') return;
      var mapped = S.ROLE_TO_CATEGORY[hash];
      if (!mapped) return;
      setCategory(mapped);
      var attempts = 0;
      (function scrollToInquiry() {
        var el = document.getElementById('inquiry');
        if (el) {
          var reduced = window.REDUCED && window.REDUCED.matches;
          el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
          return;
        }
        if (++attempts < 20) setTimeout(scrollToInquiry, 50);
      })();
    }, []);

    const handleInquire = (roleId) => {
      const mapped = S.ROLE_TO_CATEGORY[roleId] || 'general';
      setCategory(mapped);
      var el = document.getElementById('inquiry');
      if (el) {
        var reduced = window.REDUCED && window.REDUCED.matches;
        el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      }
    };

    return (
      <>
        <NavBar markSrc={CONTACT_NAV_MARK} />
        <S.WorkWithUsSection onInquire={handleInquire} />
        <S.InquirySection selectedCategory={category} />
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
      typeof sec.WorkWithUsSection === 'function' &&
      typeof sec.InquirySection === 'function';
    if (!ready) return void setTimeout(mountContact, 30);
    if (!__contactRoot)
      __contactRoot = ReactDOM.createRoot(document.getElementById('om-app'));
    __contactRoot.render(<ContactPage />);
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
  mountContact();
})();
