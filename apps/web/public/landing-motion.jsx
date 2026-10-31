/* Global entrance motion. Text and content blocks enter on a diagonal: offset down and
   to one side, opacity 0, and settle along that path as they come into view. Bidirectional:
   the observer adds the class on entry and removes it on exit, so the entrance replays on
   every pass rather than firing once on mount. Reduced motion is handled in CSS: those users
   get the settled state with no transition in either direction.
   Content is never gated on the animation firing. The settled state is the default; the
   hidden state is opted into by the om-motion flag below, which is only set once an observer
   callback has actually been seen, and each element carries a watchdog that settles it if
   its own callback never arrives. Print always renders settled. */
(function () {
  const SEL = 'h1,h2,h3,h4,p,li,[data-reveal]';
  const root = document.documentElement;
  if (typeof IntersectionObserver !== 'function') return;
  root.classList.add('om-motion');
  let alive = false;
  /* If no callback lands, the observer is throttled or absent in this context: drop the
     hidden state entirely rather than leaving copy invisible. */
  const probe = new IntersectionObserver(() => { alive = true; probe.disconnect(); });
  probe.observe(document.documentElement);
  setTimeout(() => { if (!alive) root.classList.remove('om-motion'); }, 900);

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      e.target.dataset.omSeen = '1';
      e.target.classList.toggle('om-in', e.isIntersecting);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

  const tag = (el) => {
    if (el.classList.contains('om-rev') || el.closest('[data-no-reveal]')) return;
    el.classList.add('om-rev');
    const r = el.getBoundingClientRect();
    const fromRight = r.left + r.width / 2 > window.innerWidth / 2;
    el.style.setProperty('--rx', fromRight ? '24px' : '-24px');
    const sibs = el.parentElement ? Array.prototype.filter.call(el.parentElement.children, (c) => c.matches(SEL)) : [];
    const i = sibs.indexOf(el);
    if (i > 0) el.style.transitionDelay = Math.min(i, 5) * 60 + 'ms';
    io.observe(el);
    /* Components with an inline transition (DS Card's lift, the interactive token) would
       otherwise override the stylesheet rule and make the reveal snap. Append rather than
       replace, so the component's own hover transitions survive, reading the computed value
       because an inline shorthand set to an unresolved var() reads back as an empty string. */
    const revT = 'opacity .7s var(--ease-out-soft), translate .7s var(--ease-out-soft)';
    const existing = el.style.transition || getComputedStyle(el).transition;
    el.style.transition = existing && existing !== 'all 0s ease 0s' ? existing + ', ' + revT : revT;
    setTimeout(() => { if (!el.dataset.omSeen) el.classList.add('om-in'); }, 1200);
  };

  const scan = (root) => {
    if (!root || root.nodeType !== 1) return;
    if (root.matches && root.matches(SEL)) tag(root);
    root.querySelectorAll && root.querySelectorAll(SEL).forEach(tag);
  };

  const start = () => {
    scan(document.body);
    new MutationObserver((muts) => {
      muts.forEach((m) => m.addedNodes.forEach(scan));
    }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 0));
  else setTimeout(start, 0);
})();

/* Shared in-view state for the pieces that animate their own internals (counting numerals,
   drawing underlines). Same bidirectional contract as the class above, and the same rule
   that content never waits on a callback: if none arrives, the settled state is assumed. */
function useInView(options) {
  const ref = React.useRef(null);
  const [inView, setInView] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver !== 'function') { setInView(true); return; }
    let seen = false;
    const io = new IntersectionObserver(([e]) => { seen = true; setInView(e.isIntersecting); }, options || { threshold: 0.4 });
    io.observe(el);
    const t = setTimeout(() => { if (!seen) setInView(true); }, 1200);
    return () => { clearTimeout(t); io.disconnect(); };
  }, []);
  return [ref, inView];
}

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

function CountUp({ to, suffix = '', duration = 1500, style }) {
  const [ref, inView] = useInView({ threshold: 0.5 });
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    if (!inView) { setN(0); return; }
    if (REDUCED.matches) { setN(to); return; }
    let raf, t0;
    const step = (t) => {
      if (!t0) t0 = t;
      const p = Math.min((t - t0) / duration, 1);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return <span ref={ref} style={style}>{n.toLocaleString('en-US')}{suffix}</span>;
}

Object.assign(window, { useInView, CountUp, REDUCED });
