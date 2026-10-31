/* @ds-bundle: {"format":4,"namespace":"OppDateDesignSystem_4aa598","components":[{"name":"AccordionRow","sourcePath":"components/oppdate/AccordionRow.jsx"},{"name":"AnnouncementBar","sourcePath":"components/oppdate/AnnouncementBar.jsx"},{"name":"Badge","sourcePath":"components/oppdate/Badge.jsx"},{"name":"Button","sourcePath":"components/oppdate/Button.jsx"},{"name":"Card","sourcePath":"components/oppdate/Card.jsx"},{"name":"CountdownChip","sourcePath":"components/oppdate/CountdownChip.jsx"},{"name":"CursorBadge","sourcePath":"components/oppdate/CursorBadge.jsx"},{"name":"Eyebrow","sourcePath":"components/oppdate/Eyebrow.jsx"},{"name":"FOOTER_COLUMNS","sourcePath":"components/oppdate/Footer.jsx"},{"name":"Footer","sourcePath":"components/oppdate/Footer.jsx"},{"name":"HeroLadder","sourcePath":"components/oppdate/HeroLadder.jsx"},{"name":"Icon","sourcePath":"components/oppdate/Icon.jsx"},{"name":"IllustrationSlot","sourcePath":"components/oppdate/IllustrationSlot.jsx"},{"name":"IndexRow","sourcePath":"components/oppdate/IndexRow.jsx"},{"name":"LinkArrow","sourcePath":"components/oppdate/LinkArrow.jsx"},{"name":"MegaPanel","sourcePath":"components/oppdate/MegaPanel.jsx"},{"name":"OPPORTUNITY_ITEMS","sourcePath":"components/oppdate/NavBar.jsx"},{"name":"OPPORTUNITY_GROUPS","sourcePath":"components/oppdate/NavBar.jsx"},{"name":"SERVICE_ITEMS","sourcePath":"components/oppdate/NavBar.jsx"},{"name":"NavBar","sourcePath":"components/oppdate/NavBar.jsx"},{"name":"NewsletterForm","sourcePath":"components/oppdate/NewsletterForm.jsx"},{"name":"StatBlock","sourcePath":"components/oppdate/StatBlock.jsx"},{"name":"Wordmark","sourcePath":"components/oppdate/Wordmark.jsx"}],"sourceHashes":{"components/oppdate/AccordionRow.jsx":"cbde6cff2dd9","components/oppdate/AnnouncementBar.jsx":"bddae811db1e","components/oppdate/Badge.jsx":"42a55cbebcf4","components/oppdate/Button.jsx":"bedc11d1a46f","components/oppdate/Card.jsx":"333fec3455d3","components/oppdate/CountdownChip.jsx":"4b9e5a974262","components/oppdate/CursorBadge.jsx":"dd7d809cf347","components/oppdate/Eyebrow.jsx":"d57b719fd2fb","components/oppdate/Footer.jsx":"99c08be90ff9","components/oppdate/HeroLadder.jsx":"cc6b3cd31d08","components/oppdate/Icon.jsx":"600a3520c743","components/oppdate/IllustrationSlot.jsx":"5366b422fb27","components/oppdate/IndexRow.jsx":"448cfa0fa776","components/oppdate/LinkArrow.jsx":"07b75446de6d","components/oppdate/MegaPanel.jsx":"40d0a6f7f4dd","components/oppdate/NavBar.jsx":"cd16e4ee0f21","components/oppdate/NewsletterForm.jsx":"3a153533d21b","components/oppdate/StatBlock.jsx":"7422949f5dc8","components/oppdate/Wordmark.jsx":"6e2caba304eb","ui_kits/landing/bottom.jsx":"a260fe211af5","ui_kits/landing/page.jsx":"b04567611180","ui_kits/landing/top.jsx":"224f4d27886b"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.OppDateDesignSystem_4aa598 = window.OppDateDesignSystem_4aa598 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/oppdate/AnnouncementBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Full width strip above the nav. Not sticky, scrolls away with the page. */
function AnnouncementBar({
  children = 'OppDate is now live. Discover exclusive global opportunities with Premium access.',
  ctaLabel = 'Get started',
  ctaHref = '#start',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      height: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      background: 'var(--action)',
      color: 'var(--text-on-dark)',
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 500,
      padding: '0 20px',
      textAlign: 'center',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", null, children), ctaLabel && /*#__PURE__*/React.createElement("a", {
    href: ctaHref,
    style: {
      color: 'var(--text-on-dark)',
      fontWeight: 600,
      textDecoration: 'underline',
      textUnderlineOffset: 3,
      whiteSpace: 'nowrap'
    }
  }, ctaLabel, " \u2192"));
}
Object.assign(__ds_scope, { AnnouncementBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/oppdate/AnnouncementBar.jsx", error: String((e && e.message) || e) }); }

// components/oppdate/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  premium: {
    background: 'var(--action-wash)',
    color: 'var(--action-press)'
  },
  success: {
    background: 'var(--color-status-success-bg)',
    color: 'var(--color-status-success)'
  },
  pending: {
    background: 'var(--color-status-pending-bg)',
    color: 'var(--color-status-pending)'
  },
  info: {
    background: 'var(--color-status-info-bg)',
    color: 'var(--color-status-info)'
  },
  gold: {
    background: 'var(--decor-numeral)',
    color: 'var(--color-ink)'
  },
  onInk: {
    background: 'rgba(255,249,244,0.10)',
    color: 'var(--text-on-dark)'
  }
};

/** Small pill label. Decorative and informational only, never clickable. */
function Badge({
  tone = 'premium',
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      fontWeight: 700,
      lineHeight: 1.4,
      padding: '5px 10px',
      borderRadius: 'var(--radius-pill)',
      whiteSpace: 'nowrap',
      ...TONES[tone],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/oppdate/Badge.jsx", error: String((e && e.message) || e) }); }

// components/oppdate/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const HEIGHTS = {
  sm: 40,
  lg: 52,
  xl: 56
};
const PADS = {
  sm: 20,
  lg: 28,
  xl: 30
};
const FONTS = {
  sm: 15,
  lg: 16,
  xl: 16
};

/**
 * The only button in the system. Always a full pill, three heights, three variants.
 * Primary is the clay orange; there is no second interactive colour.
 */
function Button({
  variant = 'primary',
  size = 'xl',
  as = 'button',
  href,
  iconRight,
  iconLeft,
  fullWidth = false,
  disabled = false,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const Tag = as === 'a' ? 'a' : 'button';
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: HEIGHTS[size],
    padding: `0 ${PADS[size]}px`,
    width: fullWidth ? '100%' : undefined,
    fontFamily: 'var(--font-sans)',
    fontSize: FONTS[size],
    fontWeight: 700,
    lineHeight: 1,
    borderRadius: 'var(--radius-pill)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    border: '1.5px solid transparent',
    transition: 'var(--transition-interactive), box-shadow var(--duration-base) var(--ease-out-soft)',
    opacity: disabled ? 0.45 : 1,
    transform: press && !disabled ? 'translateY(1px)' : 'none'
  };
  const skins = {
    primary: {
      background: press ? 'var(--action-press)' : hover ? 'var(--action-hover)' : 'var(--action)',
      color: 'var(--text-on-dark)',
      boxShadow: hover && !press ? '0 6px 16px rgba(194,65,12,0.22)' : '0 1px 2px rgba(194,65,12,0.10)'
    },
    'secondary-on-light': {
      background: hover ? 'rgba(22,14,8,0.05)' : 'transparent',
      color: 'var(--color-text-ink)',
      borderColor: 'var(--color-text-ink)'
    },
    'secondary-on-ink': {
      background: hover ? 'rgba(255,249,244,0.06)' : 'transparent',
      color: 'var(--text-on-dark)',
      borderColor: hover ? 'rgba(255,249,244,0.8)' : 'rgba(255,249,244,0.4)'
    },
    'on-primary': {
      background: 'var(--color-text-inverse)',
      color: 'var(--action)',
      boxShadow: hover ? '0 6px 16px rgba(0,0,0,0.18)' : 'none'
    }
  };
  return /*#__PURE__*/React.createElement(Tag, _extends({
    href: Tag === 'a' ? href : undefined,
    disabled: Tag === 'button' ? disabled : undefined,
    "aria-disabled": disabled || undefined,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      ...base,
      ...skins[variant],
      ...style
    }
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/oppdate/Button.jsx", error: String((e && e.message) || e) }); }

// components/oppdate/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** White card with a warm border, 24px radius and a primary-keyed shadow. */
function Card({
  tone = 'light',
  interactive = true,
  padding = 32,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const dark = tone === 'ink';
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      background: dark ? 'var(--surface-dark-raised)' : 'var(--surface-card)',
      border: dark ? '1px solid var(--line-on-dark)' : '1px solid var(--line)',
      borderRadius: 'var(--radius-card)',
      boxShadow: dark ? 'none' : hover && interactive ? 'var(--elevation-card-hover)' : 'var(--elevation-card-rest)',
      color: dark ? 'var(--text-on-dark-quiet)' : 'var(--text-body)',
      padding,
      transition: 'var(--transition-lift)',
      transform: hover && interactive ? 'translateY(-3px)' : 'none',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/oppdate/Card.jsx", error: String((e && e.message) || e) }); }

// components/oppdate/CountdownChip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Monospace deadline chip, "Application closes in 6d 23h 15m". */
function CountdownChip({
  parts = [],
  label,
  tone = 'ink',
  style,
  ...rest
}) {
  const dark = tone === 'ink';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
      ...style
    }
  }, rest), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      color: dark ? 'var(--text-on-dark-quiet)' : 'var(--text-quiet)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, parts.map((p, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      background: dark ? 'rgba(255,249,244,0.1)' : 'var(--surface-band)',
      color: dark ? 'var(--text-on-dark)' : 'var(--color-text-ink)',
      fontFamily: 'var(--font-mono)',
      fontWeight: 700,
      fontSize: 'var(--type-countdown-size)',
      lineHeight: 1,
      padding: '8px 12px',
      borderRadius: 'var(--radius-sm)',
      minWidth: 44,
      textAlign: 'center',
      fontVariantNumeric: 'tabular-nums'
    }
  }, p))));
}
Object.assign(__ds_scope, { CountdownChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/oppdate/CountdownChip.jsx", error: String((e && e.message) || e) }); }

// components/oppdate/CursorBadge.jsx
try { (() => {
/**
 * The signature interaction: a small pill bearing the OppDate mark that trails
 * the pointer with a short lag while it crosses an image-heavy area.
 * Mounts nothing below 960px, there is no pointer to follow.
 */
function CursorBadge({
  label = 'OppDate',
  targetSelector = '[data-cursor-badge]',
  lag = 0.18
}) {
  const ref = React.useRef(null);
  const [enabled, setEnabled] = React.useState(false);
  const [active, setActive] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 961px) and (pointer: fine)');
    const sync = () => setEnabled(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  React.useEffect(() => {
    if (!enabled) return;
    let mx = 0,
      my = 0,
      bx = 0,
      by = 0,
      raf = 0;
    const move = e => {
      mx = e.clientX;
      my = e.clientY;
    };
    const over = e => {
      if (e.target.closest && e.target.closest(targetSelector)) setActive(true);
    };
    const out = e => {
      if (e.target.closest && e.target.closest(targetSelector)) setActive(false);
    };
    const tick = () => {
      bx += (mx - bx) * lag;
      by += (my - by) * lag;
      if (ref.current) {
        ref.current.style.left = bx + 'px';
        ref.current.style.top = by + 'px';
      }
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('mousemove', move);
    document.addEventListener('mouseover', over);
    document.addEventListener('mouseout', out);
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', move);
      document.removeEventListener('mouseover', over);
      document.removeEventListener('mouseout', out);
    };
  }, [enabled, targetSelector, lag]);
  if (!enabled) return null;
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      position: 'fixed',
      left: 0,
      top: 0,
      pointerEvents: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: 'var(--color-text-inverse)',
      color: 'var(--color-text-ink)',
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      fontWeight: 700,
      padding: '6px 12px',
      borderRadius: 'var(--radius-pill)',
      boxShadow: 'var(--shadow-cursor-badge)',
      transform: 'translate(-50%, -50%)',
      opacity: active ? 1 : 0,
      transition: 'opacity var(--duration-fast) ease',
      zIndex: 40,
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 999,
      background: 'var(--action)'
    }
  }), label);
}
Object.assign(__ds_scope, { CursorBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/oppdate/CursorBadge.jsx", error: String((e && e.message) || e) }); }

// components/oppdate/Eyebrow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Uppercase 11px label that sits above a heading or menu column. */
function Eyebrow({
  tone = 'light',
  children,
  style,
  ...rest
}) {
  const colors = {
    light: 'var(--text-quiet)',
    dark: 'rgba(255,249,244,0.5)',
    gold: 'var(--decor-numeral)',
    action: 'var(--action)'
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-eyebrow-size)',
      fontWeight: 700,
      letterSpacing: 'var(--type-eyebrow-tracking)',
      textTransform: 'uppercase',
      lineHeight: 1.4,
      color: colors[tone],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Eyebrow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/oppdate/Eyebrow.jsx", error: String((e && e.message) || e) }); }

// components/oppdate/HeroLadder.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
@keyframes opd-key-float{0%{transform:translate3d(0,0,0) rotate(-5deg)}50%{transform:translate3d(0,-14px,0) rotate(5deg)}100%{transform:translate3d(0,0,0) rotate(-5deg)}}
@keyframes opd-key-glow{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:.6;transform:scale(1.14)}}
@keyframes opd-reach-a{0%{transform:translateY(0) rotate(0deg)}38%{transform:translateY(-13px) rotate(-1.1deg)}56%{transform:translateY(-11px) rotate(-.7deg)}100%{transform:translateY(0) rotate(0deg)}}
@keyframes opd-reach-b{0%{transform:translateY(0) rotate(0deg)}44%{transform:translateY(-16px) rotate(1.2deg)}60%{transform:translateY(-13px) rotate(.8deg)}100%{transform:translateY(0) rotate(0deg)}}
@keyframes opd-breathe{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@media (prefers-reduced-motion: reduce){.opd-anim{animation:none !important}}
`;
const L = {
  key: {
    left: 60.5,
    top: 36.875,
    width: 6,
    height: 6.375
  },
  figureLeft: {
    left: 14.375,
    top: 65.625,
    width: 18.4375,
    height: 32.1875
  },
  figureRight: {
    left: 32.625,
    top: 65,
    width: 17.375,
    height: 35
  }
};
const abs = r => ({
  position: 'absolute',
  left: r.left + '%',
  top: r.top + '%',
  width: r.width + '%',
  height: r.height + '%'
});
const fill = {
  width: '100%',
  height: '100%',
  display: 'block',
  objectFit: 'contain'
};

/**
 * The hero scene, "The Ladder", composed from separated illustration layers and
 * animated per the illustration brief. Layers are swappable: hand the final
 * artwork in as PNG or SVG and the choreography carries over unchanged.
 */
function HeroLadder({
  assetBase = 'assets/illustrations/layers',
  tintKey = true,
  parallax = true,
  style,
  ...rest
}) {
  const wrap = React.useRef(null);
  const keyRef = React.useRef(null);
  React.useEffect(() => {
    if (!parallax) return;
    const mq = window.matchMedia('(min-width: 961px) and (pointer: fine)');
    if (!mq.matches) return;
    let tx = 0,
      ty = 0,
      cx = 0,
      cy = 0,
      raf = 0;
    const move = e => {
      const el = wrap.current;
      if (!el) return;
      const b = el.getBoundingClientRect();
      const kx = b.left + b.width * (L.key.left + L.key.width / 2) / 100;
      const ky = b.top + b.height * (L.key.top + L.key.height / 2) / 100;
      const dx = e.clientX - kx,
        dy = e.clientY - ky;
      const dist = Math.hypot(dx, dy) || 1;
      const pull = Math.max(0, 1 - dist / (b.width * 0.55));
      tx = dx / dist * 12 * pull;
      ty = dy / dist * 12 * pull;
    };
    const tick = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      if (keyRef.current) keyRef.current.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0) rotate(' + (cx * 0.35).toFixed(2) + 'deg)';
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('mousemove', move);
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', move);
    };
  }, [parallax]);
  return /*#__PURE__*/React.createElement("div", _extends({
    ref: wrap,
    style: {
      position: 'relative',
      width: '100%',
      aspectRatio: '1 / 1',
      background: '#FFFFFF',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("style", {
    dangerouslySetInnerHTML: {
      __html: CSS
    }
  }), /*#__PURE__*/React.createElement("img", {
    className: "opd-anim",
    src: assetBase + '/scene-base.png',
    alt: "A girl climbs a ladder toward a floating key while the opd mascot steadies it",
    style: {
      ...fill,
      position: 'absolute',
      inset: 0,
      animation: 'opd-breathe 6.5s var(--ease-out-soft) infinite'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "opd-anim",
    style: {
      ...abs(L.figureLeft),
      transformOrigin: '50% 100%',
      animation: 'opd-reach-a 3.1s var(--ease-out-soft) infinite'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: assetBase + '/figure-left.png',
    alt: "",
    style: fill
  })), /*#__PURE__*/React.createElement("div", {
    className: "opd-anim",
    style: {
      ...abs(L.figureRight),
      transformOrigin: '50% 100%',
      animation: 'opd-reach-b 3.7s var(--ease-out-soft) infinite .4s'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: assetBase + '/figure-right.png',
    alt: "",
    style: fill
  })), /*#__PURE__*/React.createElement("div", {
    ref: keyRef,
    style: {
      ...abs(L.key),
      willChange: 'transform'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "opd-anim",
    style: {
      width: '100%',
      height: '100%',
      position: 'relative',
      animation: 'opd-key-float 3.4s var(--ease-out-soft) infinite'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "opd-anim",
    style: {
      position: 'absolute',
      inset: '-45%',
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(232,168,77,0.55) 0%, rgba(232,168,77,0) 68%)',
      animation: 'opd-key-glow 3.4s var(--ease-out-soft) infinite'
    }
  }), /*#__PURE__*/React.createElement("img", {
    src: assetBase + '/key.png',
    alt: "",
    style: {
      ...fill,
      position: 'relative',
      filter: tintKey ? 'sepia(1) saturate(3.4) hue-rotate(-12deg) brightness(1.06) drop-shadow(0 0 10px rgba(232,168,77,0.65))' : 'none'
    }
  }))));
}
Object.assign(__ds_scope, { HeroLadder });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/oppdate/HeroLadder.jsx", error: String((e && e.message) || e) }); }

// components/oppdate/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const pascal = n => n.split(/[-_]/).map(s => s[0].toUpperCase() + s.slice(1)).join('');

/**
 * Thin wrapper over the Lucide icon set (loaded from CDN by the host page).
 * OppDate uses Lucide at 1.85 stroke weight everywhere.
 */
function Icon({
  name,
  size = 16,
  strokeWidth = 1.85,
  color = 'currentColor',
  style,
  ...rest
}) {
  const [, force] = React.useState(0);
  React.useEffect(() => {
    if (window.lucide && window.lucide.icons) return;
    let alive = true;
    const id = setInterval(() => {
      if (window.lucide && window.lucide.icons) {
        clearInterval(id);
        if (alive) force(n => n + 1);
      }
    }, 120);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  const node = window.lucide && window.lucide.icons && window.lucide.icons[pascal(name)];
  const base = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: {
      display: 'block',
      flex: 'none',
      ...style
    },
    ...rest
  };
  if (!node) return /*#__PURE__*/React.createElement("svg", _extends({}, base, {
    "aria-hidden": "true"
  }));
  return /*#__PURE__*/React.createElement("svg", _extends({}, base, {
    "aria-hidden": "true"
  }), node.map(([tag, attrs], i) => React.createElement(tag, {
    key: i,
    ...attrs
  })));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/oppdate/Icon.jsx", error: String((e && e.message) || e) }); }

// components/oppdate/AccordionRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * A row that expands into a full clay orange panel carrying its own copy and CTA,
 * rather than revealing plain text.
 */
function AccordionRow({
  title,
  body,
  ctaLabel,
  ctaHref = '#',
  open: controlledOpen,
  defaultOpen = false,
  onToggle,
  style,
  ...rest
}) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolled;
  const toggle = () => {
    if (controlledOpen === undefined) setUncontrolled(o => !o);
    if (onToggle) onToggle(!open);
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: toggle,
    role: "button",
    tabIndex: 0,
    "aria-expanded": open,
    onKeyDown: e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    },
    style: {
      background: open ? 'var(--action)' : 'var(--surface-band)',
      color: open ? 'var(--text-on-dark)' : 'var(--color-text-ink)',
      borderRadius: open ? 'var(--radius-lg)' : 'var(--radius-md)',
      padding: open ? '24px 28px' : '20px 24px',
      cursor: 'pointer',
      transition: 'background-color var(--duration-base) var(--ease-out-soft), padding var(--duration-base) var(--ease-out-soft), border-radius var(--duration-base) var(--ease-out-soft)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 600,
      fontSize: 20,
      lineHeight: 1.3
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 'none',
      display: 'flex',
      color: open ? 'var(--text-on-dark)' : 'var(--action)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: open ? 'minus' : 'plus',
    size: 20
  }))), open && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 16,
      lineHeight: 1.55,
      color: 'rgba(255,249,244,0.86)',
      maxWidth: '58ch'
    }
  }, body), ctaLabel && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    as: "a",
    href: ctaHref,
    variant: "on-primary",
    size: "sm"
  }, ctaLabel))));
}
Object.assign(__ds_scope, { AccordionRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/oppdate/AccordionRow.jsx", error: String((e && e.message) || e) }); }

// components/oppdate/IllustrationSlot.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * A placeholder frame for brand illustration that has not been delivered yet.
 * It is deliberately obvious, so nobody ships it by accident.
 */
function IllustrationSlot({
  title = 'Hero illustration',
  note,
  ratio = '4 / 3',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      aspectRatio: ratio,
      width: '100%',
      background: 'var(--surface-card)',
      border: '1.5px dashed var(--line-strong)',
      borderRadius: 'var(--radius-frame)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: 32,
      textAlign: 'center',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 600,
      fontSize: 20,
      color: 'var(--color-text-ink)'
    }
  }, title), note && /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      lineHeight: 1.55,
      color: 'var(--text-quiet)',
      maxWidth: '46ch'
    }
  }, note));
}
Object.assign(__ds_scope, { IllustrationSlot });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/oppdate/IllustrationSlot.jsx", error: String((e && e.message) || e) }); }

// components/oppdate/IndexRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Numbered list row: 01 in gold, a Fraunces title, and a circular arrow affordance. */
function IndexRow({
  index,
  title,
  description,
  href = '#',
  tone = 'light',
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const dark = tone === 'dark';
  return /*#__PURE__*/React.createElement("a", _extends({
    href: href,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      padding: '24px 0',
      textDecoration: 'none',
      borderBottom: dark ? '1px solid var(--line-on-dark)' : '1px solid var(--line)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 700,
      fontSize: 'var(--type-index-size)',
      color: 'var(--decor-numeral)',
      minWidth: 28
    }
  }, index), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-serif)',
      fontWeight: 600,
      fontSize: 'var(--type-h3-size)',
      lineHeight: 1.15,
      color: dark ? 'var(--text-on-dark)' : 'var(--color-text-ink)'
    }
  }, title), description && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      marginTop: 8,
      fontFamily: 'var(--font-sans)',
      fontSize: 16,
      lineHeight: 1.55,
      color: dark ? 'var(--text-on-dark-quiet)' : 'var(--text-quiet)'
    }
  }, description)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      flex: 'none',
      borderRadius: 'var(--radius-pill)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid ' + (hover ? 'var(--action)' : dark ? 'var(--line-on-dark)' : 'var(--line-strong)'),
      background: hover ? 'var(--action)' : 'transparent',
      color: hover ? 'var(--text-on-dark)' : dark ? 'var(--text-on-dark)' : 'var(--color-text-ink)',
      transition: 'var(--transition-interactive)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "arrow-up-right",
    size: 18
  })));
}
Object.assign(__ds_scope, { IndexRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/oppdate/IndexRow.jsx", error: String((e && e.message) || e) }); }

// components/oppdate/LinkArrow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Inline text link with a trailing arrow that slides on hover. */
function LinkArrow({
  href = '#',
  tone = 'light',
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const color = tone === 'dark' ? 'var(--text-on-dark)' : 'var(--action)';
  return /*#__PURE__*/React.createElement("a", _extends({
    href: href,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      color,
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      fontWeight: 600,
      textDecoration: hover ? 'underline' : 'none',
      textUnderlineOffset: 3,
      transition: 'color var(--duration-fast) var(--ease-out-soft)',
      ...style
    }
  }, rest), children, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      transform: hover ? 'translateX(3px)' : 'none',
      transition: 'transform var(--duration-fast) var(--ease-out-soft)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "arrow-right",
    size: 16
  })));
}
Object.assign(__ds_scope, { LinkArrow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/oppdate/LinkArrow.jsx", error: String((e && e.message) || e) }); }

// components/oppdate/MegaPanel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function MegaItem({
  item
}) {
  const [hover, setHover] = React.useState(false);
  const disabled = !!item.soon;
  return /*#__PURE__*/React.createElement("a", {
    href: disabled ? undefined : item.href || '#',
    "aria-disabled": disabled || undefined,
    onMouseEnter: () => !disabled && setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '9px 10px',
      borderRadius: 'var(--radius-sm)',
      textDecoration: 'none',
      background: hover ? 'rgba(255,249,244,0.07)' : 'transparent',
      opacity: disabled ? 0.4 : 1,
      cursor: disabled ? 'default' : 'pointer',
      transition: 'background-color var(--duration-fast) var(--ease-out-soft)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      flex: 'none',
      borderRadius: 'var(--radius-sm)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: hover ? 'rgba(232,168,77,0.22)' : 'rgba(255,249,244,0.08)',
      color: 'var(--decor-numeral)',
      transition: 'background-color var(--duration-fast) var(--ease-out-soft)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: item.icon,
    size: 16
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      fontWeight: 500,
      color: 'var(--text-on-dark)'
    }
  }, item.label), item.soon ? /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "gold",
    style: {
      fontSize: 9,
      padding: '3px 8px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase'
    }
  }, "Soon") : item.sub && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      color: hover ? 'var(--decor-numeral)' : 'rgba(255,249,244,0.35)',
      transition: 'color var(--duration-fast)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-right",
    size: 14
  })));
}
function TagCloud({
  title,
  links
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(__ds_scope.Eyebrow, {
    tone: "dark",
    style: {
      marginBottom: 10
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '6px 8px'
    }
  }, links.map((l, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: l
  }, i > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'rgba(255,249,244,0.3)'
    }
  }, "\xB7"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'rgba(255,249,244,0.82)',
      textDecoration: 'none'
    },
    onMouseEnter: e => e.currentTarget.style.color = 'var(--decor-numeral)',
    onMouseLeave: e => e.currentTarget.style.color = 'rgba(255,249,244,0.82)'
  }, l)))));
}

/** The dark panel that drops from a nav trigger. Two layouts: wide (two column) and narrow. */
function MegaPanel({
  variant = 'wide',
  eyebrow,
  items = [],
  groups = [],
  align = 'center',
  style,
  ...rest
}) {
  const wide = variant === 'wide';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: 'absolute',
      top: 'calc(100% + 14px)',
      zIndex: 70,
      left: align === 'center' ? '50%' : 'auto',
      right: align === 'right' ? 0 : 'auto',
      transform: align === 'center' ? 'translateX(-50%)' : 'none',
      width: wide ? 640 : 280,
      background: 'var(--surface-dark-raised)',
      border: '1px solid var(--line-on-dark)',
      borderRadius: 'var(--radius-lg)',
      padding: 28,
      boxShadow: 'var(--shadow-ink-drop)',
      color: 'var(--text-on-dark)',
      display: wide ? 'grid' : 'block',
      gridTemplateColumns: wide ? '280px 1fr' : undefined,
      gap: 28,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", null, eyebrow && /*#__PURE__*/React.createElement(__ds_scope.Eyebrow, {
    tone: "gold",
    style: {
      marginBottom: 12
    }
  }, eyebrow), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      margin: '0 -10px'
    }
  }, items.map(it => /*#__PURE__*/React.createElement(MegaItem, {
    key: it.label,
    item: it
  })))), wide && groups.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, groups.map(g => /*#__PURE__*/React.createElement(TagCloud, {
    key: g.title,
    title: g.title,
    links: g.links
  }))));
}
Object.assign(__ds_scope, { MegaPanel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/oppdate/MegaPanel.jsx", error: String((e && e.message) || e) }); }

// components/oppdate/NewsletterForm.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Pill shaped email capture that lives in the footer bottom strip. */
function NewsletterForm({
  placeholder = 'Your email address',
  ctaLabel = 'Stay updated',
  onSubmit,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("form", _extends({
    className: "om-newsletter",
    onSubmit: e => {
      e.preventDefault();
      if (onSubmit) onSubmit(e);
    },
    style: {
      display: 'flex',
      alignItems: 'stretch',
      minWidth: 380,
      maxWidth: '100%',
      borderRadius: 'var(--radius-pill)',
      padding: '4px 4px 4px 20px',
      background: 'rgba(255,249,244,0.08)',
      border: '1px solid ' + (focus ? 'rgba(232,168,77,0.60)' : 'rgba(255,249,244,0.20)'),
      transition: 'border-color var(--duration-fast) var(--ease-out-soft)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("input", {
    type: "email",
    "aria-label": "Email",
    placeholder: placeholder,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      minWidth: 0,
      background: 'transparent',
      border: 'none',
      outline: 'none',
      color: 'var(--text-on-dark)',
      fontFamily: 'var(--font-sans)',
      fontSize: 14
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      background: hover ? 'var(--action-hover)' : 'var(--action)',
      color: 'var(--text-on-dark)',
      border: 'none',
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 600,
      padding: '10px 20px',
      borderRadius: 'var(--radius-pill)',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      transform: hover ? 'translateY(-1px)' : 'none',
      transition: 'var(--transition-interactive)'
    }
  }, ctaLabel, " \u2192"));
}
Object.assign(__ds_scope, { NewsletterForm });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/oppdate/NewsletterForm.jsx", error: String((e && e.message) || e) }); }

// components/oppdate/StatBlock.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** A large Fraunces numeral in decorative gold with a functional label beneath. */
function StatBlock({
  value,
  label,
  tone = 'light',
  align = 'left',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      textAlign: align,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 'var(--type-stat-size)',
      fontWeight: 800,
      lineHeight: 'var(--type-stat-leading)',
      color: 'var(--decor-numeral)',
      letterSpacing: '-0.01em'
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      lineHeight: 1.5,
      color: tone === 'dark' ? 'var(--text-on-dark-quiet)' : 'var(--text-quiet)'
    }
  }, label));
}
Object.assign(__ds_scope, { StatBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/oppdate/StatBlock.jsx", error: String((e && e.message) || e) }); }

// components/oppdate/Wordmark.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * OppDate lockup: the opd monogram plus the wordmark in Fraunces 600.
 * "Date" always renders in a non-ink colour so the two halves stay distinct.
 */
function Wordmark({
  size = 22,
  tone = 'light',
  showMark = true,
  markSize,
  markSrc = 'assets/oppdate-monogram.png',
  href = '/',
  as = 'a',
  ...rest
}) {
  const onDark = tone === 'dark';
  const Tag = as;
  const ms = markSize || Math.round(size * 1.8);
  return /*#__PURE__*/React.createElement(Tag, _extends({
    href: as === 'a' ? href : undefined,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: size * 0.45,
      textDecoration: 'none',
      color: 'inherit'
    }
  }, rest), showMark && /*#__PURE__*/React.createElement("img", {
    src: markSrc,
    alt: "",
    width: ms,
    height: Math.round(ms * 0.66),
    style: {
      display: 'block',
      objectFit: 'contain',
      filter: onDark ? 'drop-shadow(0 3px 10px rgba(181,83,10,0.40))' : 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 600,
      fontSize: size,
      letterSpacing: '-0.01em',
      lineHeight: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: onDark ? 'var(--text-on-dark)' : 'var(--color-text-ink)'
    }
  }, "Opp"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: onDark ? 'var(--decor-numeral)' : 'var(--action)'
    }
  }, "Date")));
}
Object.assign(__ds_scope, { Wordmark });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/oppdate/Wordmark.jsx", error: String((e && e.message) || e) }); }

// components/oppdate/Footer.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const FOOTER_COLUMNS = [{
  title: 'Platform',
  links: ['Opportunities', 'OppDate Guide', 'Credential library', 'Application tracker']
}, {
  title: 'Services',
  links: ['Consultations', 'Mentorship', 'eBooks']
}, {
  title: 'Company',
  links: ['About', 'Blog', 'Careers', 'Press']
}, {
  title: 'Support',
  links: ['Help centre', 'Contact', 'Privacy policy', 'Terms of service']
}, {
  title: 'Connect',
  links: ['X / Twitter', 'LinkedIn', 'Instagram', 'Newsletter']
}];
const SOCIALS = [{
  slug: 'x',
  label: 'X'
}, {
  slug: 'linkedin',
  label: 'LinkedIn',
  src: 'https://unpkg.com/simple-icons@13.21.0/icons/linkedin.svg'
}, {
  slug: 'instagram',
  label: 'Instagram'
}];
const Divider = () => /*#__PURE__*/React.createElement("div", {
  style: {
    height: 1,
    background: 'rgba(255,249,244,0.12)',
    margin: '32px 0'
  }
});
function Social({
  slug,
  label,
  src
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("a", {
    href: "#",
    "aria-label": label,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid ' + (hover ? 'var(--action)' : 'rgba(255,249,244,0.20)'),
      background: hover ? 'var(--action)' : 'transparent',
      transition: 'var(--transition-interactive)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: src || 'https://cdn.simpleicons.org/' + slug + '/FFF9F4',
    alt: "",
    width: 15,
    height: 15,
    style: {
      display: 'block',
      filter: src ? 'brightness(0) invert(1)' : 'none'
    }
  }));
}

/** Ink footer: brand lockup, five link columns, socials, newsletter and legal strip. */
function Footer({
  markSrc = 'assets/oppdate-monogram.png',
  columns = FOOTER_COLUMNS,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("footer", _extends({
    style: {
      background: 'var(--surface-dark)',
      color: 'var(--text-on-dark)',
      padding: '64px 0 40px',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '0 var(--container-pad)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 32,
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(__ds_scope.Wordmark, {
    size: 28,
    tone: "dark",
    markSize: 44,
    markSrc: markSrc,
    href: "#top"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      fontFamily: 'var(--font-serif)',
      fontStyle: 'italic',
      fontSize: 16,
      color: 'var(--decor-numeral)'
    }
  }, "Opportunities, up to date.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    as: "a",
    href: "/auth/register",
    size: "sm"
  }, "Get started"), /*#__PURE__*/React.createElement("a", {
    href: "mailto:support@oppdate.com",
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'rgba(255,249,244,0.6)',
      textDecoration: 'none'
    }
  }, "support@oppdate.com"))), /*#__PURE__*/React.createElement(Divider, null), /*#__PURE__*/React.createElement("div", {
    className: "oppdate-footer-grid",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 32
    }
  }, columns.map(col => /*#__PURE__*/React.createElement("div", {
    key: col.title
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'rgba(255,249,244,0.45)',
      marginBottom: 16
    }
  }, col.title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, col.links.map(l => /*#__PURE__*/React.createElement("a", {
    key: Array.isArray(l) ? l[0] : l,
    href: Array.isArray(l) ? l[1] : "#",
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'rgba(255,249,244,0.75)',
      textDecoration: 'none'
    },
    onMouseEnter: e => e.currentTarget.style.color = '#FFFFFF',
    onMouseLeave: e => e.currentTarget.style.color = 'rgba(255,249,244,0.75)'
  }, Array.isArray(l) ? l[0] : l)))))), /*#__PURE__*/React.createElement(Divider, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 24,
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, SOCIALS.map(s => /*#__PURE__*/React.createElement(Social, _extends({
    key: s.slug
  }, s)))), /*#__PURE__*/React.createElement(__ds_scope.NewsletterForm, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 32,
      paddingTop: 24,
      borderTop: '1px solid rgba(255,249,244,0.12)',
      display: 'flex',
      flexWrap: 'wrap',
      gap: 16,
      justifyContent: 'space-between',
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      color: 'rgba(255,249,244,0.40)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 OppDate. All rights reserved."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, ['Terms of service', 'Privacy policy', 'Help centre'].map((l, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: l
  }, i > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'rgba(255,249,244,0.28)'
    }
  }, "\xB7"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: 'inherit',
      textDecoration: 'none'
    },
    onMouseEnter: e => e.currentTarget.style.color = '#FFFFFF',
    onMouseLeave: e => e.currentTarget.style.color = 'inherit'
  }, l)))))));
}
Object.assign(__ds_scope, { FOOTER_COLUMNS, Footer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/oppdate/Footer.jsx", error: String((e && e.message) || e) }); }

// components/oppdate/NavBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const OPPORTUNITY_ITEMS = [{
  icon: 'search',
  label: 'Browse all',
  href: '/opportunities'
}, {
  icon: 'graduation-cap',
  label: 'Scholarships',
  href: '/opportunities?type=scholarship',
  sub: true
}, {
  icon: 'school',
  label: 'Admissions',
  href: '/opportunities?type=admission',
  sub: true
}, {
  icon: 'briefcase',
  label: 'Jobs',
  href: '/opportunities?type=job',
  sub: true
}, {
  icon: 'award',
  label: 'Fellowships',
  href: '/opportunities?type=fellowship',
  sub: true
}, {
  icon: 'banknote',
  label: 'Grants',
  href: '/opportunities?type=grant',
  sub: true
}, {
  icon: 'heart-handshake',
  label: 'Volunteering',
  href: '/opportunities?type=volunteering',
  sub: true
}, {
  icon: 'layers',
  label: 'Programs',
  href: '/opportunities?type=program',
  sub: true
}, {
  icon: 'building-2',
  label: 'Internships',
  href: '/opportunities?type=internship',
  sub: true
}];
const OPPORTUNITY_GROUPS = [{
  title: 'By region',
  links: ['Africa', 'Europe', 'North America', 'Asia Pacific', 'Global']
}, {
  title: 'By type',
  links: ['Funded', 'Paid', 'Unpaid', 'Remote']
}, {
  title: 'Deadlines',
  links: ['Closing this week', 'This month']
}];
const SERVICE_ITEMS = [{
  icon: 'video',
  label: 'Consultations',
  href: '/services/consultations',
  sub: true
}, {
  icon: 'users',
  label: 'Mentorship',
  href: '/services/mentorship',
  sub: true
}, {
  icon: 'book-open',
  label: 'eBooks',
  href: '/services/ebooks',
  sub: true
}];
function Trigger({
  label,
  open,
  onOpen,
  onClose,
  onToggle,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    },
    onMouseEnter: onOpen,
    onMouseLeave: onClose
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-expanded": open,
    onClick: onToggle,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      fontWeight: 500,
      padding: '8px 0',
      color: open ? 'var(--action)' : 'rgba(255,249,244,0.75)',
      transition: 'color var(--duration-fast) var(--ease-out-soft)'
    },
    onMouseEnter: e => e.currentTarget.style.color = 'var(--action)',
    onMouseLeave: e => e.currentTarget.style.color = open ? 'var(--action)' : 'rgba(255,249,244,0.75)'
  }, label, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      transform: open ? 'rotate(180deg)' : 'none',
      transition: 'transform var(--duration-base) var(--ease-out-soft)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 14
  }))), open && children);
}

/** Solid ink sticky nav: lockup, two dropdown triggers, log in and one primary CTA. */
function NavBar({
  markSrc = 'assets/oppdate-monogram.png',
  onNavigate,
  style,
  ...rest
}) {
  const [open, setOpen] = React.useState(null);
  const [menu, setMenu] = React.useState(false);
  const timer = React.useRef(null);
  const openIn = id => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(id), 80);
  };
  const closeOut = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(null), 180);
  };
  React.useEffect(() => {
    const esc = e => {
      if (e.key === 'Escape') {
        setOpen(null);
        setMenu(false);
      }
    };
    const scroll = () => setOpen(null);
    window.addEventListener('keydown', esc);
    window.addEventListener('scroll', scroll, true);
    return () => {
      window.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', scroll, true);
    };
  }, []);
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 60,
      background: 'var(--surface-dark)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '16px var(--container-pad)',
      display: 'flex',
      alignItems: 'center',
      gap: 32
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Wordmark, {
    size: 22,
    tone: "dark",
    markSize: 40,
    markSrc: markSrc,
    href: "#top"
  }), /*#__PURE__*/React.createElement("nav", {
    className: "oppdate-nav-center",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 32,
      marginLeft: 16
    }
  }, /*#__PURE__*/React.createElement(Trigger, {
    label: "Opportunities",
    open: open === 'opps',
    onOpen: () => openIn('opps'),
    onClose: closeOut,
    onToggle: () => setOpen(open === 'opps' ? null : 'opps')
  }, /*#__PURE__*/React.createElement(__ds_scope.MegaPanel, {
    variant: "wide",
    eyebrow: "Explore opportunities",
    items: OPPORTUNITY_ITEMS,
    groups: OPPORTUNITY_GROUPS,
    align: "center"
  })), /*#__PURE__*/React.createElement(Trigger, {
    label: "Services",
    open: open === 'services',
    onOpen: () => openIn('services'),
    onClose: closeOut,
    onToggle: () => setOpen(open === 'services' ? null : 'services')
  }, /*#__PURE__*/React.createElement(__ds_scope.MegaPanel, {
    variant: "narrow",
    eyebrow: "More from OppDate",
    items: SERVICE_ITEMS,
    align: "right"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "oppdate-nav-actions",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "/auth/login",
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      fontWeight: 500,
      color: 'rgba(255,249,244,0.75)',
      textDecoration: 'none'
    },
    onMouseEnter: e => e.currentTarget.style.color = 'var(--action)',
    onMouseLeave: e => e.currentTarget.style.color = 'rgba(255,249,244,0.75)'
  }, "Log in"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    as: "a",
    href: "/auth/register",
    size: "sm",
    onClick: onNavigate
  }, "Get started")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "oppdate-nav-burger",
    "aria-label": "Menu",
    onClick: () => setMenu(m => !m),
    style: {
      display: 'none',
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      background: 'none',
      border: 'none',
      color: 'var(--text-on-dark)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: menu ? 'x' : 'menu',
    size: 22
  }))), menu && /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-dark)',
      borderTop: '1px solid var(--line-on-dark)',
      padding: 24
    }
  }, ['Opportunities', 'Services', 'Log in'].map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    onClick: () => setMenu(false),
    style: {
      display: 'block',
      padding: '16px 0',
      borderBottom: '1px solid var(--line-on-dark)',
      fontFamily: 'var(--font-sans)',
      fontSize: 18,
      fontWeight: 500,
      color: 'var(--text-on-dark)',
      textDecoration: 'none'
    }
  }, l)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    as: "a",
    href: "/auth/register",
    size: "lg",
    fullWidth: true
  }, "Get started"))));
}
Object.assign(__ds_scope, { OPPORTUNITY_ITEMS, OPPORTUNITY_GROUPS, SERVICE_ITEMS, NavBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/oppdate/NavBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing/bottom.jsx
try { (() => {
const {
  Card,
  Badge,
  Button,
  Eyebrow,
  IndexRow,
  AccordionRow,
  CountdownChip,
  LinkArrow,
  Footer
} = window.OppDateDesignSystem_4aa598;
const MARK2 = '../../assets/oppdate-monogram.png';
const Placeholder = ({
  label,
  height = 200,
  radius = 'var(--radius-card)'
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    height,
    borderRadius: radius,
    background: 'var(--surface-band)',
    border: '1.5px dashed var(--line-strong)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: 16,
    fontSize: 13,
    color: 'var(--text-quiet)'
  }
}, label);
function HowItWorks() {
  const rows = [['01', 'Tell us what you are looking for', 'Pick the categories, regions and funding types that apply to you.'], ['02', 'We verify before we publish', 'Every listing is checked against its source, so a dead link never reaches your feed.'], ['03', 'Track what you applied to', 'Applications, deadlines and outcomes stay in one place.'], ['04', 'Get help when you need it', 'Consultations, mentorship and eBooks sit alongside the listings.']];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-dark)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap",
    style: {
      padding: '120px var(--container-pad)'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    tone: "gold",
    style: {
      marginBottom: 20
    }
  }, "How it works"), /*#__PURE__*/React.createElement("h2", {
    style: {
      color: 'var(--text-on-dark)',
      maxWidth: '18ch'
    }
  }, "Four steps, no guesswork"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 48
    }
  }, rows.map(([i, t, d], n) => /*#__PURE__*/React.createElement(IndexRow, {
    key: i,
    index: i,
    title: t,
    description: d,
    tone: "dark",
    style: n === rows.length - 1 ? {
      borderBottom: 'none'
    } : undefined
  })))));
}
function Opportunities() {
  const items = [{
    type: 'Scholarship',
    title: 'Fully funded masters in Germany',
    place: 'Europe, funded',
    badge: 'premium',
    badgeLabel: 'Premium',
    parts: ['06d', '23h', '15m']
  }, {
    type: 'Internship',
    title: 'Summer research internship',
    place: 'North America, paid',
    badge: 'info',
    badgeLabel: '8 days left',
    parts: ['08d', '04h', '30m']
  }, {
    type: 'Fellowship',
    title: 'Climate policy fellowship',
    place: 'Global, remote',
    badge: 'pending',
    badgeLabel: 'In review',
    parts: ['21d', '11h', '02m']
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-card)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap",
    style: {
      padding: '80px var(--container-pad)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 24,
      alignItems: 'flex-end',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: 16
    }
  }, "Closing soon"), /*#__PURE__*/React.createElement("h2", {
    style: {
      maxWidth: '16ch'
    }
  }, "Open right now")), /*#__PURE__*/React.createElement(LinkArrow, {
    href: "/opportunities"
  }, "Browse all opportunities")), /*#__PURE__*/React.createElement("div", {
    className: "cards",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 24,
      marginTop: 40
    }
  }, items.map(it => /*#__PURE__*/React.createElement(Card, {
    key: it.title,
    padding: 24
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, it.type), /*#__PURE__*/React.createElement(Badge, {
    tone: it.badge
  }, it.badgeLabel)), /*#__PURE__*/React.createElement("h3", {
    style: {
      marginTop: 14
    }
  }, it.title), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 10,
      fontSize: 15,
      color: 'var(--text-quiet)'
    }
  }, it.place), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(CountdownChip, {
    tone: "light",
    label: "Closes in",
    parts: it.parts
  })))))));
}
function Services() {
  const rows = [['01', 'Consultations', 'One to one sessions on applications, documents and interviews.'], ['02', 'Mentorship', 'Longer term guidance from people who have been through it.'], ['03', 'eBooks', 'Written guides for scholarships, funding and relocation.']];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-page)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap split",
    style: {
      padding: '80px var(--container-pad)',
      display: 'grid',
      gridTemplateColumns: 'minmax(0,40%) minmax(0,60%)',
      gap: 64
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: 16
    }
  }, "More from OppDate"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 'var(--type-h2-split-size)',
      lineHeight: 'var(--type-h2-split-leading)'
    }
  }, "Support that sits beside the listings"), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 20,
      color: 'var(--text-quiet)',
      maxWidth: '38ch'
    }
  }, "Finding the opportunity is one part. These are the three services people ask for after that.")), /*#__PURE__*/React.createElement("div", null, rows.map(([i, t, d], n) => /*#__PURE__*/React.createElement(IndexRow, {
    key: i,
    index: i,
    title: t,
    description: d,
    style: n === rows.length - 1 ? {
      borderBottom: 'none'
    } : undefined
  })))));
}
function Testimonials() {
  const quotes = [['I found the scholarship I am now on through a listing that closed nine days later.', 'Adaeze O.', 'Masters student, Berlin'], ['The tracker meant I stopped losing deadlines across four different tabs.', 'Samuel K.', 'Fellowship applicant, Nairobi']];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-card)'
    },
    "data-cursor-badge": true
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap",
    style: {
      padding: '80px var(--container-pad)'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: 16
    }
  }, "In their words"), /*#__PURE__*/React.createElement("h2", {
    style: {
      maxWidth: '18ch'
    }
  }, "People already using it"), /*#__PURE__*/React.createElement("div", {
    className: "cards2",
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 24,
      marginTop: 40
    }
  }, quotes.map(([q, n, r]) => /*#__PURE__*/React.createElement(Card, {
    key: n,
    interactive: false,
    padding: 32
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 600,
      fontSize: 26,
      lineHeight: 1.3,
      color: 'var(--text-heading)'
    }
  }, q), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      height: 48,
      flex: 'none',
      borderRadius: '50%',
      background: 'var(--surface-band)',
      border: '2px solid var(--decor-numeral)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 9,
      color: 'var(--text-quiet)',
      textAlign: 'center',
      lineHeight: 1.1
    }
  }, "photo", /*#__PURE__*/React.createElement("br", null), "TBC"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      color: 'var(--text-heading)'
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: 'var(--text-quiet)'
    }
  }, r)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement(Placeholder, {
    label: "Product screenshot placeholder. Real imagery is being sourced separately.",
    height: 240,
    radius: "var(--radius-frame)"
  }))));
}
function Faq() {
  const rows = [['What counts as verified?', 'Every listing is checked against the source before it goes live, and removed when the source closes it.', 'See the process'], ['Do I need Premium to browse?', 'Browsing is free. Premium adds early access, saved searches and the application tracker.', 'Compare plans'], ['Which regions are covered?', 'Listings come from more than 190 countries, filterable by region, funding type and deadline.', 'Browse by region'], ['How often do listings change?', 'The full set refreshes daily. Deadline countdowns update on every load.', 'See what is new']];
  const [open, setOpen] = React.useState(0);
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-page)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap split",
    style: {
      padding: '80px var(--container-pad)',
      display: 'grid',
      gridTemplateColumns: 'minmax(0,40%) minmax(0,60%)',
      gap: 64
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: 16
    }
  }, "Questions"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 'var(--type-h2-split-size)',
      lineHeight: 'var(--type-h2-split-leading)'
    }
  }, "Before you sign up")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, rows.map(([t, b, c], i) => /*#__PURE__*/React.createElement(AccordionRow, {
    key: t,
    title: t,
    body: b,
    ctaLabel: c,
    open: open === i,
    onToggle: () => setOpen(open === i ? -1 : i)
  })))));
}
function ClosingCta() {
  return /*#__PURE__*/React.createElement("section", {
    id: "start",
    style: {
      background: 'var(--surface-dark)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap",
    style: {
      padding: '120px var(--container-pad)',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      color: 'var(--text-on-dark)',
      maxWidth: '20ch',
      margin: '0 auto'
    }
  }, "Start with what is open today"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--text-on-dark-quiet)',
      fontSize: 18,
      maxWidth: '52ch',
      margin: '20px auto 0'
    }
  }, "Create an account to save searches, track applications and see listings the day they open."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      justifyContent: 'center',
      marginTop: 32,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    as: "a",
    href: "/auth/register"
  }, "Get started"), /*#__PURE__*/React.createElement(Button, {
    as: "a",
    href: "/opportunities",
    variant: "secondary-on-ink"
  }, "Browse opportunities"))));
}
function BottomOfPage() {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(HowItWorks, null), /*#__PURE__*/React.createElement(Opportunities, null), /*#__PURE__*/React.createElement(Services, null), /*#__PURE__*/React.createElement(Testimonials, null), /*#__PURE__*/React.createElement(Faq, null), /*#__PURE__*/React.createElement(ClosingCta, null), /*#__PURE__*/React.createElement(Footer, {
    markSrc: MARK2
  }));
}
Object.assign(window, {
  HowItWorks,
  Opportunities,
  Services,
  Testimonials,
  Faq,
  ClosingCta,
  BottomOfPage
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing/bottom.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing/page.jsx
try { (() => {
const {
  CursorBadge
} = window.OppDateDesignSystem_4aa598;
function LandingPage() {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(window.TopOfPage, null), /*#__PURE__*/React.createElement(window.BottomOfPage, null), /*#__PURE__*/React.createElement(CursorBadge, {
    label: "OppDate"
  }));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(LandingPage, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing/page.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing/top.jsx
try { (() => {
const {
  AnnouncementBar,
  NavBar,
  Button,
  Eyebrow,
  StatBlock,
  LinkArrow
} = window.OppDateDesignSystem_4aa598;
const MARK = '../../assets/oppdate-monogram.png';
// Falls back to the flat sketch if the bundle predates HeroLadder.
const HeroLadder = window.OppDateDesignSystem_4aa598.HeroLadder || (() => /*#__PURE__*/React.createElement("img", {
  src: "../../assets/illustrations/hero-ladder-reference.jpeg",
  alt: "",
  style: {
    display: 'block',
    width: '100%',
    mixBlendMode: 'multiply'
  }
}));
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    id: "top",
    style: {
      background: 'var(--surface-card)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap split",
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,45%) minmax(0,55%)',
      gap: 48,
      alignItems: 'center',
      padding: '120px var(--container-pad)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: 20
    }
  }, "Opportunity discovery"), /*#__PURE__*/React.createElement("h1", {
    style: {
      maxWidth: '13ch'
    }
  }, "Verified opportunities, up to date"), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 24,
      fontSize: 18,
      lineHeight: 1.6,
      color: 'var(--text-body)',
      maxWidth: '46ch'
    }
  }, "Scholarships, internships, fellowships, jobs, grants and volunteering from more than 190 countries. Checked before they are published, refreshed every day."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 32
    }
  }, /*#__PURE__*/React.createElement(Button, {
    as: "a",
    href: "/auth/register"
  }, "Get started"), /*#__PURE__*/React.createElement(Button, {
    as: "a",
    href: "/opportunities",
    variant: "secondary-on-light"
  }, "Browse opportunities")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 28,
      fontFamily: 'var(--font-serif)',
      fontStyle: 'italic',
      fontWeight: 600,
      fontSize: 30,
      color: 'var(--text-heading)'
    }
  }, "Opportunities, up to date.")), /*#__PURE__*/React.createElement("div", {
    "data-cursor-badge": true,
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(HeroLadder, {
    assetBase: "../../assets/illustrations/layers"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      bottom: 8,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      background: 'var(--surface-band)',
      border: '1px solid var(--line-strong)',
      borderRadius: 'var(--radius-pill)',
      padding: '6px 14px',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-quiet)'
    }
  }, "Motion prototype on the reference sketch. Final colour artwork pending."))));
}
function StatsBand() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-band)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap",
    style: {
      padding: '80px var(--container-pad)',
      display: 'flex',
      flexWrap: 'wrap',
      gap: 64,
      alignItems: 'flex-end',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement(StatBlock, {
    value: "190+",
    label: "Countries with live listings"
  }), /*#__PURE__*/React.createElement(StatBlock, {
    value: "Daily",
    label: "Refresh of every category"
  }), /*#__PURE__*/React.createElement(StatBlock, {
    value: "Six",
    label: "Opportunity types, from scholarships to volunteering"
  }), /*#__PURE__*/React.createElement(LinkArrow, {
    href: "/opportunities"
  }, "See what is open this week")));
}
function TopOfPage() {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(AnnouncementBar, null), /*#__PURE__*/React.createElement(NavBar, {
    markSrc: MARK
  }), /*#__PURE__*/React.createElement(Hero, null), /*#__PURE__*/React.createElement(StatsBand, null));
}
Object.assign(window, {
  Hero,
  StatsBand,
  TopOfPage
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing/top.jsx", error: String((e && e.message) || e) }); }

__ds_ns.AccordionRow = __ds_scope.AccordionRow;

__ds_ns.AnnouncementBar = __ds_scope.AnnouncementBar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CountdownChip = __ds_scope.CountdownChip;

__ds_ns.CursorBadge = __ds_scope.CursorBadge;

__ds_ns.Eyebrow = __ds_scope.Eyebrow;

__ds_ns.FOOTER_COLUMNS = __ds_scope.FOOTER_COLUMNS;

__ds_ns.Footer = __ds_scope.Footer;

__ds_ns.HeroLadder = __ds_scope.HeroLadder;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IllustrationSlot = __ds_scope.IllustrationSlot;

__ds_ns.IndexRow = __ds_scope.IndexRow;

__ds_ns.LinkArrow = __ds_scope.LinkArrow;

__ds_ns.MegaPanel = __ds_scope.MegaPanel;

__ds_ns.OPPORTUNITY_ITEMS = __ds_scope.OPPORTUNITY_ITEMS;

__ds_ns.OPPORTUNITY_GROUPS = __ds_scope.OPPORTUNITY_GROUPS;

__ds_ns.SERVICE_ITEMS = __ds_scope.SERVICE_ITEMS;

__ds_ns.NavBar = __ds_scope.NavBar;

__ds_ns.NewsletterForm = __ds_scope.NewsletterForm;

__ds_ns.StatBlock = __ds_scope.StatBlock;

__ds_ns.Wordmark = __ds_scope.Wordmark;

})();
