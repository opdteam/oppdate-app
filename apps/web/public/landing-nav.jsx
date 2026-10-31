/* Nav anatomy extension, by interception (same pattern as landing-button.jsx):
   - "OppDate Apply" is appended to the nav row, styled like the trigger labels but a plain
     link with no panel.
   - The lockup is wrapped so it can be centred in the bar: links sit left, lockup centres,
     Log in and the CTA sit right. Ink surface, dropdowns and button styling are untouched.
   - The sticky nav container is marked so the global scroll reveal skips it. */
(function () {
  const NS = window.OppDateDesignSystem_4aa598;
  const create = React.createElement;
  const linkStyle = { fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500, padding: '8px 0', color: 'rgba(255,249,244,0.75)', textDecoration: 'none', transition: 'color var(--duration-fast) var(--ease-out-soft)' };
  /* NavBar and Footer both render the lockup with href="#top" and tone="dark"; only the
     nav sets markSize 40 at size 22 (the footer uses size 28), so the wrap is gated on that. */

  function ApplyLink() {
    return (
      <a
        href="/services/apply"
        style={linkStyle}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--action)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,249,244,0.75)')}
      >
        OppDate Apply
      </a>
    );
  }

  const MOBILE_SECTIONS = [
    { title: 'Opportunities', links: [['Browse all', '/opportunities'], ['Scholarships', '/opportunities?type=scholarship'], ['Admissions', '/opportunities?type=admission'], ['Jobs', '/opportunities?type=job'], ['Fellowships', '/opportunities?type=fellowship'], ['Grants', '/opportunities?type=grant'], ['Volunteering', '/opportunities?type=volunteering'], ['Programs', '/opportunities?type=program'], ['Internships', '/opportunities?type=internship']] },
    { title: 'Services', links: [['Consultations', '/services/consultations'], ['Mentorship', '/services/mentorship'], ['eBooks', '/services/ebooks']] },
    { title: 'OppDate Apply', links: [['How it works', '/services/apply#flow'], ['Pricing', '/pricing'], ['Start an application', '/services/apply#start']] },
  ];

  /* Two-line burger that morphs into an X. The shipped control swaps a menu icon for an x
     with no transition, so it is replaced with two bars that rotate and converge. */
  function Burger({ open, onClick }) {
    const bar = { position: 'absolute', left: 11, width: 22, height: 2, borderRadius: 2, background: 'currentColor', transition: 'translate var(--duration-base) var(--ease-out-soft), rotate var(--duration-base) var(--ease-out-soft)' };
    return (
      <button
        type="button"
        className="oppdate-nav-burger om-burger"
        aria-label={open ? 'Close menu' : 'Menu'}
        aria-expanded={open}
        onClick={onClick}
        style={{ display: 'none', position: 'relative', width: 44, height: 44, background: 'none', border: 'none', color: 'var(--text-on-dark)', cursor: 'pointer', padding: 0 }}
      >
        <span style={Object.assign({}, bar, { top: 21, translate: open ? '0 0' : '0 -4px', rotate: open ? '45deg' : '0deg' })} />
        <span style={Object.assign({}, bar, { top: 21, translate: open ? '0 0' : '0 4px', rotate: open ? '-45deg' : '0deg' })} />
      </button>
    );
  }

  /* The shipped NavBar unmounts the panel the instant its state flips, so there is no exit
     to animate against. The panel registers its retract here; the burger and the in-panel
     links call it and only then hand control back to the shipped close handler. */
  let panelExit = null;
  const EXIT_MS = 420;

  /* Slides in from the left on mount, retracts the same way on close, scrolls internally
     when the categorised content runs past the viewport, and locks the page behind it. */
  function MobilePanel({ close, style }) {
    const [shown, setShown] = React.useState(false);
    React.useEffect(() => {
      const r = requestAnimationFrame(() => setShown(true));
      const body = document.body;
      const prevOverflow = body.style.overflow;
      const prevPad = body.style.paddingRight;
      const gap = window.innerWidth - document.documentElement.clientWidth;
      body.style.overflow = 'hidden';
      if (gap > 0) body.style.paddingRight = gap + 'px';
      return () => {
        cancelAnimationFrame(r);
        body.style.overflow = prevOverflow;
        body.style.paddingRight = prevPad;
      };
    }, []);
    React.useEffect(() => {
      panelExit = (done) => { setShown(false); setTimeout(done, EXIT_MS); };
      return () => { panelExit = null; };
    }, []);
    const closeAnimated = (e) => {
      if (!close) return;
      setShown(false);
      setTimeout(() => close(e), EXIT_MS);
    };
    const linkStyleM = { display: 'flex', alignItems: 'center', gap: 10, padding: '13px 0', borderBottom: '1px solid var(--line-on-dark)', fontFamily: 'var(--font-sans)', fontSize: 17, fontWeight: 500, color: 'var(--text-on-dark)', textDecoration: 'none' };
    return (
      <div style={Object.assign({}, style, { overflow: 'hidden' })}>
        <div style={{ translate: shown ? '0 0' : '-100% 0', transition: 'translate ' + EXIT_MS + 'ms var(--ease-out-soft)' }}>
          <div style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto', padding: 24 }}>
            {MOBILE_SECTIONS.map((s) => (
              <div key={s.title} style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--decor-numeral)', marginBottom: 6 }}>{s.title}</div>
                {s.links.map(([label, href, tag]) => (
                  <a key={label} href={href} onClick={closeAnimated} style={Object.assign({}, linkStyleM, tag ? { color: 'var(--text-on-dark-quiet)' } : null)}>
                    {label}
                    {tag && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 'var(--radius-pill)', background: 'rgba(255,249,244,0.1)', color: 'var(--text-on-dark-quiet)' }}>{tag}</span>}
                  </a>
                ))}
              </div>
            ))}
            {/* Get started already sits in the persistent header row, so the panel body
                carries Log In instead: same pill anatomy, inverted: white fill, ink label,
                clay badge. The badge classes are the shared ones, so the arrow keeps its
                2px up-right hover shift. */}
            {isAuthenticated ? (
              <a
                href="/dashboard"
                onClick={closeAnimated}
                style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 52, padding: '0 52px', borderRadius: 'var(--radius-pill)', background: 'var(--action)', color: 'var(--color-text-inverse)', fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, textDecoration: 'none' }}
              >
                Dashboard
                <span className="om-btn-badge" style={{ width: 36, height: 36, background: 'var(--color-text-inverse)', color: 'var(--action)' }}>
                  <span className="om-btn-arrow"><NS.Icon name="arrow-up-right" size={16} /></span>
                </span>
              </a>
            ) : (
              <>
                <a
                  href="/auth/login"
                  onClick={closeAnimated}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 52, padding: '0 52px', borderRadius: 'var(--radius-pill)', background: 'var(--color-text-inverse)', color: 'var(--color-text-ink)', fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, textDecoration: 'none' }}
                >
                  Log In
                  <span className="om-btn-badge" style={{ width: 36, height: 36, background: 'var(--action)', color: 'var(--color-text-inverse)' }}>
                    <span className="om-btn-arrow"><NS.Icon name="arrow-up-right" size={16} /></span>
                  </span>
                </a>
                <a
                  href="/auth/register"
                  onClick={closeAnimated}
                  className="om-panel-cta"
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 52, marginTop: 12, padding: '0 52px', borderRadius: 'var(--radius-pill)', background: 'var(--action)', color: 'var(--color-text-inverse)', fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, textDecoration: 'none' }}
                >
                  Get started
                  <span className="om-btn-badge" style={{ width: 36, height: 36, background: 'var(--color-text-inverse)', color: 'var(--action)' }}>
                    <span className="om-btn-arrow"><NS.Icon name="arrow-up-right" size={16} /></span>
                  </span>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isAuthenticated = !!(typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('oppdate_token'));

  // Map TagCloud link labels to their actual routes
  // Listings page filter param only supports: scholarships, internships, jobs, training, funded
  // Region and deadline filters are not yet implemented — land on /opportunities (all listings)
  const GROUP_LINK_HREFS = {
    // By region — no region filter in app yet, land on all listings
    'Africa':        '/opportunities',
    'Europe':        '/opportunities',
    'North America': '/opportunities',
    'Asia Pacific':  '/opportunities',
    'Global':        '/opportunities',
    // By type — map to supported filter params
    'Funded':        '/opportunities?filter=funded',
    'Paid':          '/opportunities',
    'Unpaid':        '/opportunities',
    'Remote':        '/opportunities',
    // Deadlines — no deadline filter in app yet, land on all listings
    'Closing this week': '/opportunities',
    'This month':        '/opportunities',
  };

  React.createElement = function (type, props) {
    const args = Array.prototype.slice.call(arguments, 1);
    if (type === 'nav' && props && props.className === 'oppdate-nav-center') {
      args.push(create(ApplyLink, { key: 'oppdate-apply' }));
    }
    /* Both panels ship non-left anchoring (Opportunities align="center", Services
       align="right"). Force flush-left: the trigger button has no horizontal padding, so
       left:0 lands on the label's first glyph. The om-mega class carries the height condense. */
    if (type === 'div' && props && props.style && props.style.zIndex === 70) {
      args[0] = Object.assign({}, props, {
        className: ['om-mega', props.className].filter(Boolean).join(' '),
        style: Object.assign({}, props.style, { left: 0, right: 'auto', transform: 'none' }),
      });
    }
    if (type === 'div' && props && props.style && props.style.position === 'sticky') {
      args[0] = Object.assign({}, props, { 'data-no-reveal': true });
    }
    /* Mobile panel: the shipped list is Opportunities / Services / Log in, missing OppDate
       Apply, and flat. Rebuilt as categorised sections carrying each dropdown's primary links,
       with Log in and Get started at the foot. The close handler is lifted off the shipped
       anchors so the panel still dismisses on tap. */
    if (type === 'div' && props && props.style && props.style.padding === 24 && props.style.borderTop === '1px solid var(--line-on-dark)') {
      const shipped = args[1];
      const close = shipped && shipped[0] && shipped[0].props ? shipped[0].props.onClick : undefined;
      const style = Object.assign({}, props.style);
      delete style.padding;
      return create(MobilePanel, { close, style });
    }
    /* The shipped burger swaps icons with no transition; replaced with the morphing pair.
       Skips its own output (om-burger), which would otherwise re-enter this branch forever. */
    if (type === 'button' && props && props.className === 'oppdate-nav-burger') {
      const icon = args[1];
      const open = !!(icon && icon.props && icon.props.name === 'x');
      const onClick = (e) => {
        if (open && panelExit) panelExit(() => props.onClick(e));
        else props.onClick(e);
      };
      return create(Burger, { open, onClick });
    }
    if (type === NS.Wordmark && props && props.href === '#top' && props.markSize === 40 && props.size === 22) {
      return create('span', { className: 'om-nav-mark' }, create.apply(React, [type].concat(args)));
    }
    /* Swap nav auth CTAs for authenticated users */
    if (isAuthenticated && type === 'a' && props && props.href === '#login') {
      return null;
    }
    if (isAuthenticated && type === 'a' && props && props.href === '#start') {
      args[0] = Object.assign({}, props, { href: '/dashboard', children: 'Dashboard' });
      return create.apply(React, ['a'].concat(args));
    }
    if (!isAuthenticated && type === 'a' && props && props.href === '#login') {
      args[0] = Object.assign({}, props, { href: '/auth/login' });
      return create.apply(React, ['a'].concat(args));
    }
    if (!isAuthenticated && type === 'a' && props && props.href === '#start') {
      args[0] = Object.assign({}, props, { href: '/auth/register' });
      return create.apply(React, ['a'].concat(args));
    }
    // Intercept TagCloud group links (region/type/deadline) which ship with href="#"
    if (type === 'a' && props && props.href === '#' && typeof props.children === 'string') {
      const dest = GROUP_LINK_HREFS[props.children];
      if (dest) {
        args[0] = Object.assign({}, props, { href: dest });
        return create.apply(React, ['a'].concat(args));
      }
    }
    return create.apply(React, [type].concat(args));
  };
})();
