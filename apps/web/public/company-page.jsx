/* Company page sections — registered to window.OMCO for the mount script.
   Enhanced with: topographic contour hero, staggered entrances, constellation
   particle fields, scroll-linked mission rail, bento masonry layout with
   magnetic tilt cards + cursor particle trails, drag-and-drop file upload. */
(function () {
  const { Eyebrow, Icon, Button, LinkArrow } = window.OppDateDesignSystem_4aa598;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ================================================================
     SHARED: Constellation canvas for dark sections
     Drifting dots connected by faint lines when close enough,
     giving a "global network" feeling. Runs on <canvas> for perf.
     ================================================================ */
  function Constellation({ count, lineAlpha, dotAlpha, speed }) {
    const ref = React.useRef(null);
    const particles = React.useRef(null);
    React.useEffect(() => {
      const canvas = ref.current;
      if (!canvas || REDUCED.matches) return;
      const ctx = canvas.getContext('2d');
      let w, h, raf;
      const resize = () => { w = canvas.width = canvas.offsetWidth; h = canvas.height = canvas.offsetHeight; };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);
      if (!particles.current) {
        particles.current = Array.from({ length: count }, () => ({
          x: Math.random() * (w || 800),
          y: Math.random() * (h || 600),
          vx: (Math.random() - 0.5) * speed,
          vy: (Math.random() - 0.5) * speed,
          r: 1.2 + Math.random() * 1.4,
        }));
      }
      const pts = particles.current;
      const draw = () => {
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(232,168,77,' + dotAlpha + ')';
          ctx.fill();
        }
        const linkDist = 120;
        for (let i = 0; i < pts.length; i++) {
          for (let j = i + 1; j < pts.length; j++) {
            const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
            const d = dx * dx + dy * dy;
            if (d < linkDist * linkDist) {
              const a = (1 - Math.sqrt(d) / linkDist) * lineAlpha;
              ctx.beginPath();
              ctx.moveTo(pts[i].x, pts[i].y);
              ctx.lineTo(pts[j].x, pts[j].y);
              ctx.strokeStyle = 'rgba(232,168,77,' + a + ')';
              ctx.lineWidth = 0.6;
              ctx.stroke();
            }
          }
        }
        raf = requestAnimationFrame(draw);
      };
      draw();
      return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    }, [count, lineAlpha, dotAlpha, speed]);
    return (
      <canvas ref={ref} aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', width: '100%', height: '100%' }} />
    );
  }

  const TopoContours = window.TopoContours;

  /* ================================================================
     HERO — staggered entrance + topo contours + scroll parallax
     ================================================================ */
  function CompanyHero() {
    const [inLoad, setInLoad] = React.useState(false);
    const [scrollY, setScrollY] = React.useState(0);
    React.useEffect(() => {
      const r = requestAnimationFrame(() => setInLoad(true));
      return () => cancelAnimationFrame(r);
    }, []);
    React.useEffect(() => {
      if (REDUCED.matches) return;
      const onScroll = () => setScrollY(window.scrollY);
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }, []);
    const step = (i) => ({
      className: 'om-rev' + (inLoad ? ' om-in' : ''),
      style: { '--rx': '0px', transitionDelay: i * 120 + 'ms' },
    });
    const parallaxY = REDUCED.matches ? 0 : scrollY * -0.12;
    return (
      <section
        id="company-top"
        style={{ position: 'relative', isolation: 'isolate', background: 'var(--surface-card)', padding: '72px var(--container-pad) 88px', overflow: 'hidden' }}
      >
        <TopoContours />
        <div data-no-reveal className="wrap" style={{ textAlign: 'center', position: 'relative', zIndex: 1, transform: 'translateY(' + parallaxY + 'px)' }}>
          <div {...step(0)}>
            <Eyebrow style={{ marginBottom: 18 }}>About OppDate</Eyebrow>
          </div>
          <h1
            {...step(1)}
            style={{
              ...step(1).style,
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(36px, 4.2vw, 58px)',
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
              color: 'var(--color-text-ink)',
              margin: '0 auto',
              maxWidth: '20ch',
            }}
          >
            Connecting ambition{' '}
            <span style={{ color: 'var(--decor-numeral)' }}>to opportunity,</span>{' '}
            everywhere.
          </h1>
          <p
            {...step(2)}
            style={{
              ...step(2).style,
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--type-body-large-size, 18px)',
              lineHeight: 1.6,
              color: 'var(--text-body)',
              maxWidth: '52ch',
              margin: '20px auto 0',
            }}
          >
            Great potential is everywhere, yet capable people miss out on
            life-changing opportunities every day because they find them too
            late or get lost in the application process alone. OppDate
            changes that.
          </p>
        </div>
      </section>
    );
  }

  /* ================================================================
     MISSION — scroll-linked horizontal progress rail
     ================================================================ */
  const MISSION_PILLARS = [
    { icon: 'globe', title: 'Global access', body: 'We aggregate opportunities across continents so geography is never a barrier to ambition.' },
    { icon: 'shield-check', title: 'Verified listings', body: 'Every opportunity is vetted for legitimacy, eligibility accuracy, and deadline integrity.' },
    { icon: 'rocket', title: 'End-to-end support', body: 'From discovery to submission, our tools and team guide you through every step of the process.' },
  ];

  function useMissionRail() {
    const containerRef = React.useRef(null);
    const [progress, setProgress] = React.useState(0);
    React.useEffect(() => {
      if (REDUCED.matches) { setProgress(1); return; }
      const el = containerRef.current;
      if (!el) return;
      const onScroll = () => {
        const r = el.getBoundingClientRect();
        const viewMid = window.innerHeight * 0.6;
        const start = r.top;
        const end = r.bottom - 100;
        const range = end - start;
        if (range <= 0) return;
        const p = Math.max(0, Math.min(1, (viewMid - start) / range));
        setProgress(p);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      return () => window.removeEventListener('scroll', onScroll);
    }, []);
    return [containerRef, progress];
  }

  function MissionSection() {
    const [railRef, progress] = useMissionRail();
    return (
      <section id="about" style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--line)' }}>
        <div className="wrap" style={{ padding: '80px var(--container-pad)' }}>
          <Eyebrow style={{ marginBottom: 16 }}>About Us</Eyebrow>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--type-h2-size, 48px)', fontWeight: 700, lineHeight: 1.05, color: 'var(--color-text-ink)', maxWidth: '22ch', margin: 0 }}>
            Democratising access to life-changing opportunities.
          </h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--type-body-large-size, 18px)', lineHeight: 1.6, color: 'var(--text-body)', maxWidth: '58ch', marginTop: 18 }}>
            OppDate grants you early access to verified opportunities alongside every tool,
            resource, and specialized service you need to secure them, all within one unified platform.
          </p>
          <div ref={railRef} style={{ position: 'relative', marginTop: 48 }}>
            {/* Horizontal rail */}
            <div className="co-mission-rail" style={{ position: 'absolute', top: 22, left: 0, right: 0, height: 2, background: 'var(--line)', borderRadius: 1, zIndex: 0 }}>
              <div style={{ height: '100%', borderRadius: 1, background: 'var(--action)', transformOrigin: 'left', transform: 'scaleX(' + progress + ')', transition: REDUCED.matches ? 'none' : 'transform 80ms linear' }} />
            </div>
            <div className="co-roles" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20, position: 'relative', zIndex: 1 }}>
              {MISSION_PILLARS.map((p, i) => {
                const active = progress > (i / MISSION_PILLARS.length) + 0.05;
                return (
                  <div key={p.title} style={{ padding: 28, borderRadius: 'var(--radius-lg)', background: 'var(--surface-card)', border: '1px solid ' + (active ? 'var(--action)' : 'var(--line)'), transition: 'border-color 400ms var(--ease-out-soft), box-shadow 400ms var(--ease-out-soft)', boxShadow: active ? '0 4px 20px rgba(194,65,12,0.12)' : 'none' }}>
                    <span className={active ? 'co-icon-pop' : ''} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 'var(--radius-pill)', background: active ? 'var(--action)' : 'var(--action-wash)', color: active ? 'var(--color-text-inverse)' : 'var(--action)', transition: 'background 400ms var(--ease-out-soft), color 400ms var(--ease-out-soft)' }}>
                      <Icon name={p.icon} size={20} />
                    </span>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 21, fontWeight: 600, lineHeight: 1.15, color: 'var(--color-text-ink)', marginTop: 18 }}>{p.title}</h3>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15.5, lineHeight: 1.6, color: 'var(--text-body)', marginTop: 10 }}>{p.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ================================================================
     TIMING — immersive 3-act narrative
     Scene 1: Full-width, animated floating notification cards drift
              upward like a live feed. Text overlays.
     Scene 2: Narrowed, large countdown clock dominates center,
              urgent warm tone shift, text wraps around clock.
     Scene 3: Fragmented chaos - scattered CSS document shapes at
              angles, text amid the disorder.
     Closing: Gold line draws from center, manifesto text.
     ================================================================ */

  var FAKE_ALERTS = [
    { title: 'Rhodes Scholarship 2027', tag: '98% match', deadline: '32 days left' },
    { title: 'Google STEP Internship', tag: 'New', deadline: '18 days left' },
    { title: 'Chevening Award - UK', tag: '94% match', deadline: '45 days left' },
    { title: 'MIT Media Lab Fellowship', tag: 'New', deadline: '12 days left' },
    { title: 'DAAD Research Grant', tag: '91% match', deadline: '28 days left' },
    { title: 'Mastercard Foundation', tag: '96% match', deadline: '8 days left' },
  ];

  var MOBILE_MQ = window.matchMedia('(max-width: 768px)');

  function AlertCard({ a, highlight, style }) {
    return (
      <div style={Object.assign({
        padding: '12px 16px',
        borderRadius: 'var(--radius-lg)',
        background: 'rgba(22,14,8,0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(232,168,77,' + (highlight ? '0.35' : '0.1') + ')',
        boxShadow: highlight ? '0 0 20px rgba(194,65,12,0.15)' : 'none',
      }, style || {})}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: '#FFF9F4', lineHeight: 1.3, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px',
            borderRadius: 'var(--radius-pill)', letterSpacing: '0.04em',
            background: a.tag === 'New' ? 'rgba(194,65,12,0.25)' : 'rgba(76,175,80,0.2)',
            color: a.tag === 'New' ? 'var(--action)' : '#66BB6A',
          }}>{a.tag}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,249,244,0.45)', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>{a.deadline}</span>
        </div>
      </div>
    );
  }

  /* Desktop: absolute-positioned vertical feed on the right half.
     Mobile: horizontal ticker strip that scrolls left continuously. */
  function FloatingAlerts({ visible }) {
    var [offset, setOffset] = React.useState(0);
    var [isMobile, setIsMobile] = React.useState(MOBILE_MQ.matches);

    React.useEffect(function () {
      var handler = function (e) { setIsMobile(e.matches); };
      MOBILE_MQ.addEventListener('change', handler);
      return function () { MOBILE_MQ.removeEventListener('change', handler); };
    }, []);

    React.useEffect(function () {
      if (!visible || REDUCED.matches) return;
      var raf;
      var start = null;
      var speed = isMobile ? 30 : 40;
      var range = isMobile ? 1200 : 600;
      var step = function (ts) {
        if (!start) start = ts;
        setOffset(((ts - start) / speed) % range);
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      return function () { cancelAnimationFrame(raf); };
    }, [visible, isMobile]);

    if (isMobile) {
      var totalW = FAKE_ALERTS.length * 192;
      return (
        <div style={{
          overflow: 'hidden', pointerEvents: 'none',
          marginBottom: 24,
          maskImage: 'linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)',
          opacity: visible ? 1 : 0,
          transition: REDUCED.matches ? 'none' : 'opacity 600ms ease',
        }}>
          <div style={{
            display: 'flex', gap: 12, width: totalW * 2,
            transform: 'translateX(-' + offset + 'px)',
          }}>
            {FAKE_ALERTS.concat(FAKE_ALERTS).map(function (a, i) {
              return (
                <AlertCard key={i} a={a} highlight={i === 0 || i === FAKE_ALERTS.length}
                  style={{ flex: '0 0 180px' }}
                />
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '50%', overflow: 'hidden', pointerEvents: 'none' }}>
        {FAKE_ALERTS.map(function (a, i) {
          var col = i % 2;
          var leftPct = 6 + col * 46;
          var baseY = i * 100;
          var y = ((baseY - offset + 600) % 600) - 100;
          var opacity = y < 0 ? 0 : y > 500 ? 0 : (y < 80 ? y / 80 : y > 420 ? (500 - y) / 80 : 1) * 0.85;
          return (
            <AlertCard key={i} a={a} highlight={i === 0}
              style={{
                position: 'absolute',
                left: leftPct + '%',
                top: y,
                width: 'clamp(180px, 22vw, 240px)',
                opacity: visible ? opacity : 0,
                transition: REDUCED.matches ? 'none' : 'opacity 300ms ease',
              }}
            />
          );
        })}
      </div>
    );
  }

  function CountdownClock({ active }) {
    var _a = React.useState(0);
    var angle = _a[0]; var setAngle = _a[1];
    var raf = React.useRef(null);
    React.useEffect(function () {
      if (!active || REDUCED.matches) {
        if (active) setAngle(360);
        return;
      }
      var start = null;
      var step = function (ts) {
        if (!start) start = ts;
        var t = Math.min((ts - start) / 2400, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        setAngle(eased * 360);
        if (t < 1) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
      return function () { if (raf.current) cancelAnimationFrame(raf.current); };
    }, [active]);

    var r = 90;
    var circ = 2 * Math.PI * r;
    var dashOffset = circ - (angle / 360) * circ;
    return (
      <div className="co-clock" style={{ position: 'relative', width: 220, height: 220, flexShrink: 0 }}>
        {/* Pulsing radial glow behind the clock - beacon effect */}
        <div className="co-clock-beacon" style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 300, height: 300,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(194,65,12,0.2) 0%, rgba(232,168,77,0.08) 40%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        {/* Second pulse ring - offset timing for layered effect */}
        <div className="co-clock-beacon-outer" style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 380, height: 380,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,168,77,0.06) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <svg viewBox="0 0 220 220" style={{ position: 'relative', width: '100%', height: '100%' }}>
          <circle cx="110" cy="110" r={r} fill="none" stroke="rgba(255,249,244,0.05)" strokeWidth="4" />
          <circle cx="110" cy="110" r={r} fill="none" stroke="var(--decor-numeral)" strokeWidth="4"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dashOffset}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          />
          <circle cx="110" cy="110" r={r + 12} fill="none" stroke="var(--decor-numeral)" strokeWidth="1"
            className="co-ring-pulse" style={{ opacity: 0.2, transformOrigin: '50% 50%' }}
          />
          <circle cx="110" cy="110" r={r - 15} fill="none" stroke="rgba(255,249,244,0.03)" strokeWidth="1" />
        </svg>
        <div className="co-clock-center" style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="clock" size={28} style={{ color: 'var(--decor-numeral)', marginBottom: 6 }} />
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 800, color: 'var(--decor-numeral)', lineHeight: 1 }}>24h</span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, color: 'rgba(255,249,244,0.45)', marginTop: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>remaining</span>
        </div>
      </div>
    );
  }

  var SCATTER_DOCS = [
    { w: 72, h: 90, rot: -12, x: '8%', y: '15%', opacity: 0.5 },
    { w: 60, h: 78, rot: 22, x: '75%', y: '8%', opacity: 0.35 },
    { w: 54, h: 70, rot: -6, x: '62%', y: '65%', opacity: 0.4 },
    { w: 66, h: 84, rot: 15, x: '25%', y: '70%', opacity: 0.3 },
    { w: 48, h: 62, rot: -18, x: '85%', y: '45%', opacity: 0.25 },
    { w: 56, h: 72, rot: 8, x: '45%', y: '5%', opacity: 0.35 },
  ];

  function ScatteredDocs({ visible }) {
    return (
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {SCATTER_DOCS.map(function (d, i) {
          var delay = i * 100;
          return (
            <div key={i} style={{
              position: 'absolute', left: d.x, top: d.y,
              width: d.w, height: d.h,
              borderRadius: 6,
              border: '1px solid rgba(178,58,42,0.2)',
              background: 'linear-gradient(135deg, rgba(178,58,42,0.08) 0%, rgba(22,14,8,0.4) 100%)',
              transform: visible ? 'rotate(' + d.rot + 'deg) scale(1)' : 'rotate(0deg) scale(0.5)',
              opacity: visible ? d.opacity : 0,
              transition: REDUCED.matches ? 'none' : 'transform 800ms var(--ease-out-soft) ' + delay + 'ms, opacity 600ms ease ' + delay + 'ms',
            }}>
              {/* Fake text lines */}
              <div style={{ padding: 8 }}>
                <div style={{ height: 3, width: '70%', borderRadius: 2, background: 'rgba(255,249,244,0.08)', marginBottom: 5 }} />
                <div style={{ height: 2, width: '90%', borderRadius: 2, background: 'rgba(255,249,244,0.05)', marginBottom: 4 }} />
                <div style={{ height: 2, width: '60%', borderRadius: 2, background: 'rgba(255,249,244,0.05)', marginBottom: 4 }} />
                <div style={{ height: 2, width: '80%', borderRadius: 2, background: 'rgba(255,249,244,0.04)' }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  /* Ambient background layer that shifts mood with scroll progress.
     Scene 1: warm amber glow on the right (opportunity radiating).
     Scene 2: intensifying gold/red center pulse (urgency beacon).
     Scene 3: dark vignette closing in + diagonal static lines (stress).
     Closing: calm dark with single gold pinpoint center. */
  function TimingAmbient({ progress }) {
    var s1Amt = Math.max(0, Math.min(1, progress / 0.35));
    var s2Amt = Math.max(0, Math.min(1, (progress - 0.3) / 0.35));
    var s3Amt = Math.max(0, Math.min(1, (progress - 0.6) / 0.3));
    var closeAmt = Math.max(0, Math.min(1, (progress - 0.85) / 0.15));

    var glowHue = 30 + s2Amt * -12 + s3Amt * -10;
    var glowSat = 80 + s2Amt * 15;
    var glowLight = 18 + s1Amt * 6 - s3Amt * 8;
    var glowAlpha = 0.06 + s1Amt * 0.1 + s2Amt * 0.08 - closeAmt * 0.12;

    var vignetteSpread = 70 - s3Amt * 25;

    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        {/* Base gradient - deep warm tones instead of flat brown */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 120% 100% at 50% 0%, #1E130A 0%, #110B06 50%, #0A0604 100%)',
        }} />

        {/* Scene 1: amber glow from right side */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 60% 80% at 80% 40%, hsla(' + glowHue + ',' + glowSat + '%,' + glowLight + '%,' + (s1Amt * 0.18) + ') 0%, transparent 70%)',
          transition: REDUCED.matches ? 'none' : 'opacity 600ms ease',
        }} />

        {/* Scene 2: urgency beacon from center-right, warmer and more intense */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle 400px at 65% 55%, rgba(194,65,12,' + (s2Amt * 0.12) + ') 0%, rgba(232,168,77,' + (s2Amt * 0.06) + ') 40%, transparent 70%)',
        }} />

        {/* Scene 3: closing vignette - darkness creeps in from edges */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse ' + vignetteSpread + '% ' + vignetteSpread + '% at 50% 50%, transparent 0%, rgba(5,3,2,' + (s3Amt * 0.7) + ') 100%)',
        }} />

        {/* Scene 3: diagonal stress lines */}
        {s3Amt > 0 && (
          <svg style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            opacity: s3Amt * 0.06,
            transition: REDUCED.matches ? 'none' : 'opacity 500ms ease',
          }}>
            {Array.from({ length: 18 }, function (_, i) {
              var x1 = (i * 120) - 200;
              return React.createElement('line', {
                key: i, x1: x1, y1: 0, x2: x1 + 800, y2: '100%',
                stroke: '#B23A2A', strokeWidth: 0.5,
              });
            })}
          </svg>
        )}

        {/* Closing: calm gold pinpoint */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle 200px at 50% 60%, rgba(232,168,77,' + (closeAmt * 0.1) + ') 0%, transparent 100%)',
        }} />

        {/* Subtle noise texture overlay for depth */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.03,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          backgroundSize: '200px 200px',
        }} />
      </div>
    );
  }

  function useTimingReveal(ref) {
    var _s = React.useState(0);
    var progress = _s[0]; var setProgress = _s[1];
    React.useEffect(function () {
      var el = ref.current;
      if (!el) return;
      if (REDUCED.matches) { setProgress(1); return; }
      var onScroll = function () {
        var r = el.getBoundingClientRect();
        var viewMid = window.innerHeight * 0.6;
        var p = Math.max(0, Math.min(1, (viewMid - r.top) / (r.height * 0.65)));
        setProgress(p);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      return function () { window.removeEventListener('scroll', onScroll); };
    }, []);
    return progress;
  }

  function TimingSection() {
    var sectionRef = React.useRef(null);
    var progress = useTimingReveal(sectionRef);
    var s1 = progress > 0.05;
    var s2 = progress > 0.35;
    var s3 = progress > 0.65;
    var closing = progress > 0.88;

    return (
      <section id="timing" ref={sectionRef} style={{ background: '#0A0604', position: 'relative', isolation: 'isolate', overflow: 'hidden' }}>
        <TimingAmbient progress={progress} />
        <Constellation count={40} lineAlpha={0.08} dotAlpha={0.3} speed={0.12} />
        <div className="wrap" style={{ position: 'relative', zIndex: 2 }}>

          {/* Header */}
          <div style={{ textAlign: 'center', padding: '80px var(--container-pad) 0' }}>
            <Eyebrow tone="gold" style={{ marginBottom: 16 }}>The advantage of timing</Eyebrow>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--type-h2-size, 48px)', fontWeight: 700, lineHeight: 1.08, color: 'var(--text-on-dark)', maxWidth: '20ch', margin: '0 auto' }}>
              You know the feeling.
            </h2>
          </div>

          {/* Scene 1 — floating alert feed + text */}
          <div className="co-scene1" style={{
            position: 'relative', padding: '64px var(--container-pad)',
            opacity: s1 ? 1 : 0,
            transition: REDUCED.matches ? 'none' : 'opacity 800ms var(--ease-out-soft)',
          }}>
            <FloatingAlerts visible={s1} />
            <div style={{ position: 'relative', zIndex: 2, maxWidth: 480 }}>
              <h3 style={{
                fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 3vw, 40px)',
                fontWeight: 700, lineHeight: 1.08, color: 'var(--text-on-dark)', margin: 0,
              }}>
                You spot something perfect
              </h3>
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: 17, lineHeight: 1.65,
                color: 'rgba(255,249,244,0.72)', marginTop: 16, maxWidth: '38ch',
              }}>
                You are scrolling through your feed and spot an extraordinary internship,
                a prestigious scholarship, or a career-defining role. You feel an immediate
                rush of excitement and tap the link.
              </p>
            </div>
          </div>

          {/* Divider line */}
          <div style={{ height: 1, background: 'rgba(255,249,244,0.06)', margin: '0 var(--container-pad)' }} />

          {/* Scene 2 — narrowed, clock dominates center */}
          <div style={{
            position: 'relative',
            padding: '56px var(--container-pad)',
            background: 'radial-gradient(ellipse 80% 100% at 50% 50%, rgba(194,65,12,0.06) 0%, rgba(232,168,77,0.03) 40%, transparent 80%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48,
            flexWrap: 'wrap',
            opacity: s2 ? 1 : 0,
            transform: s2 ? 'translateY(0)' : 'translateY(20px)',
            transition: REDUCED.matches ? 'none' : 'opacity 700ms var(--ease-out-soft), transform 700ms var(--ease-out-soft)',
          }}>
            <div style={{ maxWidth: 380 }}>
              <h3 style={{
                fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 3.5vw, 44px)',
                fontWeight: 800, lineHeight: 1.05,
                color: 'var(--decor-numeral)', margin: 0,
              }}>
                The deadline is{' '}
                <span style={{ display: 'inline-block', position: 'relative' }}>
                  tomorrow.
                  <span style={{
                    position: 'absolute', bottom: -4, left: 0, height: 3,
                    width: s2 ? '100%' : '0%', borderRadius: 2,
                    background: 'var(--decor-numeral)', opacity: 0.5,
                    transition: REDUCED.matches ? 'none' : 'width 800ms var(--ease-out-soft) 400ms',
                  }} />
                </span>
              </h3>
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: 17, lineHeight: 1.65,
                color: 'rgba(255,249,244,0.68)', marginTop: 16, maxWidth: '36ch',
              }}>
                Then you see it. The closing date is tomorrow. The excitement curdles into
                panic. You have less than 24 hours to assemble references, write a compelling
                statement, and submit everything.
              </p>
            </div>
            <CountdownClock active={s2} />
          </div>

          {/* Divider line */}
          <div style={{ height: 1, background: 'rgba(255,249,244,0.06)', margin: '0 var(--container-pad)' }} />

          {/* Scene 3 — fragmented chaos, scattered documents */}
          <div style={{
            position: 'relative', minHeight: 340,
            padding: '56px var(--container-pad)',
            opacity: s3 ? 1 : 0,
            transform: s3 ? 'translateY(0)' : 'translateY(20px)',
            transition: REDUCED.matches ? 'none' : 'opacity 700ms var(--ease-out-soft), transform 700ms var(--ease-out-soft)',
          }}>
            <ScatteredDocs visible={s3} />
            <div style={{ position: 'relative', zIndex: 2, maxWidth: 440, margin: '0 auto', textAlign: 'center' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 56, height: 56, borderRadius: 'var(--radius-pill)',
                background: 'rgba(178,58,42,0.15)', border: '1px solid rgba(178,58,42,0.25)',
                marginBottom: 20,
              }}>
                <Icon name="alert-triangle" size={26} style={{ color: '#B23A2A' }} />
              </div>
              <h3 style={{
                fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 3vw, 40px)',
                fontWeight: 700, lineHeight: 1.08, color: 'var(--text-on-dark)', margin: 0,
              }}>
                You are scrambling.
              </h3>
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: 17, lineHeight: 1.65,
                color: 'rgba(255,249,244,0.68)', marginTop: 16,
              }}>
                Pulling together documents, rushing essays late into the night,
                and submitting under pressure against candidates who have been
                quietly preparing for months.
              </p>
            </div>
          </div>

          {/* Closing manifesto */}
          <div style={{
            textAlign: 'center', padding: '40px var(--container-pad) 80px',
            opacity: closing ? 1 : 0,
            transform: closing ? 'translateY(0)' : 'translateY(16px)',
            transition: REDUCED.matches ? 'none' : 'opacity 700ms var(--ease-out-soft), transform 700ms var(--ease-out-soft)',
          }}>
            {/* Gold line draws from center */}
            <div style={{
              width: closing ? 64 : 0, height: 2,
              background: 'var(--decor-numeral)', borderRadius: 1,
              margin: '0 auto 32px',
              transition: REDUCED.matches ? 'none' : 'width 600ms var(--ease-out-soft) 200ms',
            }} />
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(20px, 2.4vw, 28px)', lineHeight: 1.4, color: 'var(--decor-numeral)', maxWidth: '32ch', margin: '0 auto' }}>
              That is why we built OppDate - to put you ahead of the starting line.
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.6, color: 'rgba(255,249,244,0.5)', maxWidth: '44ch', margin: '16px auto 0' }}>
              Here, you gain early access to verified opportunities before they reach the general crowd.
              We track openings and deadlines so you claim one advantage: the time to
              breathe, prepare, and submit your strongest work.
            </p>
          </div>
        </div>
      </section>
    );
  }

  /* ================================================================
     DISCOVERY — interactive accordion strips
     Three vertical strips side by side. The active strip expands
     to show full content (icon, title, body, illustration placeholder)
     while others compress to show only a rotated title + icon.
     Click/hover to switch. Smooth width transitions.
     ================================================================ */
  const DISCOVERY_STRIPS = [
    {
      icon: 'shield-check',
      title: 'Eligibility clarity',
      body: 'Know whether you qualify before you spend time preparing. Our screening tools cross-reference your profile against each listing\'s requirements and give you a clear match score upfront.',
      imgPrompt: 'AI image prompt: Clean UI mockup showing a checklist with green checkmarks next to eligibility criteria, modern app interface, warm amber accent colors on dark surface, isometric perspective',
      accent: 'var(--action)',
    },
    {
      icon: 'file-text',
      title: 'Documents ready',
      body: 'Your CV, transcripts, and references - uploaded once, reused everywhere. No more re-entering the same information across 20 different portals.',
      imgPrompt: 'AI image prompt: Organized document folder with neatly arranged files, modern flat design, warm amber and cream color palette, soft shadows, clean editorial style',
      accent: 'var(--decor-numeral)',
    },
    {
      icon: 'compass',
      title: 'Guided from start to finish',
      body: 'Tools and services for everything that happens after you find the right fit. From consultation bookings to essay reviews, the full pipeline lives in one place.',
      imgPrompt: 'AI image prompt: Abstract path or roadmap illustration showing stages from discovery to submission, warm gradient from amber to orange, modern minimalist design, editorial quality',
      accent: '#B87333',
    },
  ];

  var DISC_INTERVAL = 5000;

  function DiscoverySection() {
    const [active, setActive] = React.useState(0);
    const [entered, setEntered] = React.useState(false);
    const [paused, setPaused] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const sectionRef = React.useRef(null);
    const timerRef = React.useRef(null);
    const startRef = React.useRef(null);
    const rafRef = React.useRef(null);

    React.useEffect(() => {
      const el = sectionRef.current;
      if (!el) return;
      if (REDUCED.matches) { setEntered(true); return; }
      const obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { setEntered(true); obs.disconnect(); }
      }, { threshold: 0.2 });
      obs.observe(el);
      return () => obs.disconnect();
    }, []);

    React.useEffect(() => {
      if (paused || !entered) return;
      startRef.current = performance.now();
      setProgress(0);
      var tick = function (now) {
        var elapsed = now - startRef.current;
        var p = Math.min(elapsed / DISC_INTERVAL, 1);
        setProgress(p);
        if (p < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setActive(function (prev) { return (prev + 1) % DISCOVERY_STRIPS.length; });
        }
      };
      rafRef.current = requestAnimationFrame(tick);
      return function () { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [active, paused, entered]);

    var handleSelect = function (i) {
      setActive(i);
      setPaused(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(function () { setPaused(false); }, 8000);
    };

    const strip = DISCOVERY_STRIPS[active];

    return (
      <section id="beyond-discovery" ref={sectionRef} style={{ background: 'var(--row-rest)' }}>
        <div className="wrap" style={{ padding: '80px var(--container-pad)' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <Eyebrow style={{ marginBottom: 16 }}>More than discovery</Eyebrow>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--type-h2-size, 48px)', fontWeight: 700, lineHeight: 1.05, color: 'var(--color-text-ink)', maxWidth: '24ch', margin: '0 auto' }}>
              Anyone can surface a listing. Few platforms equip you to win it.
            </h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--type-body-large-size, 18px)', lineHeight: 1.6, color: 'var(--text-body)', maxWidth: '52ch', margin: '18px auto 0' }}>
              Most platforms stop at the listing. You are still left guessing whether you qualify,
              scrambling for documents, writing from scratch, and tracking everything in a spreadsheet.
            </p>
          </div>

          {/* Accordion strip tabs */}
          <div className="co-strips" style={{
            display: 'flex', gap: 6,
            opacity: entered ? 1 : 0,
            transform: entered ? 'translateY(0)' : 'translateY(24px)',
            transition: REDUCED.matches ? 'none' : 'opacity 700ms var(--ease-out-soft), transform 700ms var(--ease-out-soft)',
          }}>
            {DISCOVERY_STRIPS.map((s, i) => {
              var isActive = active === i;
              return (
                <button
                  key={s.title}
                  className={'co-strip' + (isActive ? ' co-strip-active' : '')}
                  onClick={() => handleSelect(i)}
                  style={{
                    flex: isActive ? '1 1 0' : '0 0 auto',
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: isActive ? '14px 24px' : '14px 20px',
                    borderRadius: 'var(--radius-pill)',
                    background: isActive ? 'var(--surface-card)' : 'transparent',
                    border: '1px solid ' + (isActive ? 'var(--action)' : 'var(--line)'),
                    cursor: 'pointer',
                    transition: REDUCED.matches ? 'none' : 'all 400ms var(--ease-out-soft)',
                    boxShadow: isActive ? '0 4px 16px rgba(194,65,12,0.1)' : 'none',
                    maxWidth: isActive ? '100%' : 'auto',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Auto-advance progress bar */}
                  {isActive && (
                    <span style={{
                      position: 'absolute', bottom: 0, left: 0, height: 2,
                      width: (progress * 100) + '%',
                      background: s.accent, opacity: paused ? 0 : 0.5,
                      borderRadius: 1,
                      transition: paused ? 'opacity 300ms ease' : 'none',
                    }} />
                  )}
                  <span style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-pill)', flexShrink: 0,
                    background: isActive ? s.accent : 'var(--action-wash)',
                    color: isActive ? 'var(--color-text-inverse)' : s.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: REDUCED.matches ? 'none' : 'background 300ms ease, color 300ms ease',
                  }}>
                    <Icon name={s.icon} size={18} />
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
                    color: isActive ? 'var(--color-text-ink)' : 'var(--text-body)',
                    whiteSpace: 'nowrap',
                  }}>
                    {s.title}
                  </span>
                  {isActive && (
                    <span style={{
                      marginLeft: 'auto',
                      fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: s.accent, opacity: 0.7,
                    }}>
                      {'0' + (i + 1)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active strip content panel */}
          <div className="co-strip-panel" style={{
            marginTop: 20,
            padding: 32,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface-card)',
            border: '1px solid var(--action)',
            boxShadow: '0 8px 32px rgba(194,65,12,0.08)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 32,
            alignItems: 'center',
          }}>
            <div key={active + '-text'} style={{
              opacity: 1,
              animation: REDUCED.matches ? 'none' : 'co-strip-fade 400ms var(--ease-out-soft)',
            }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(26px, 2.8vw, 36px)', fontWeight: 700, lineHeight: 1.1, color: 'var(--color-text-ink)', margin: 0 }}>
                {strip.title}
              </h3>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 17, lineHeight: 1.65, color: 'var(--text-body)', marginTop: 16, maxWidth: '38ch' }}>
                {strip.body}
              </p>
            </div>

            <div key={active + '-img'} style={{
              borderRadius: 'var(--radius-lg)',
              background: 'var(--row-rest)',
              border: '1px solid var(--line)',
              aspectRatio: '4/3',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              animation: REDUCED.matches ? 'none' : 'co-strip-fade 400ms var(--ease-out-soft) 100ms both',
            }}>
              <div style={{ textAlign: 'center', padding: 24 }}>
                <Icon name={strip.icon} size={40} style={{ color: strip.accent, opacity: 0.5 }} />
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, lineHeight: 1.5, color: 'var(--text-body)', opacity: 0.4, maxWidth: '26ch', margin: '14px auto 0' }}>
                  {strip.imgPrompt}
                </p>
              </div>
            </div>
          </div>

          {/* Strip navigation dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
            {DISCOVERY_STRIPS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                aria-label={'Show ' + s.title}
                style={{
                  width: active === i ? 28 : 8, height: 8,
                  borderRadius: 'var(--radius-pill)', border: 'none',
                  background: active === i ? 'var(--action)' : 'var(--line-strong)',
                  cursor: 'pointer', padding: 0,
                  transition: REDUCED.matches ? 'none' : 'width 300ms var(--ease-out-soft), background 300ms ease',
                }}
              />
            ))}
          </div>

          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(18px, 2vw, 24px)', fontStyle: 'italic', lineHeight: 1.45, color: 'var(--text-body)', maxWidth: '48ch', marginTop: 40, textAlign: 'center', marginLeft: 'auto', marginRight: 'auto' }}>
            OppDate is designed for everything that happens after you find the right fit.
          </p>
        </div>
      </section>
    );
  }

  /* ================================================================
     GLOBAL REACH MAP — animated SVG world map with continent draw-in,
     52 country dots, connection arcs, region highlighting, stat strip
     ================================================================ */
  var CONTINENT_PATHS = [
    { id: 'northamerica', d: 'M108,52 L139,52 L167,45 L181,41 L200,38 L222,41 L236,45 L261,45 L278,52 L289,59 L272,69 L256,72 L239,79 L236,86 L244,97 L261,100 L272,90 L283,83 L300,79 L317,86 L325,93 L333,103 L342,114 L347,121 L353,131 L342,131 L333,131 L322,134 L314,138 L311,141 L306,148 L300,152 L294,152 L292,159 L289,166 L283,176 L278,183 L272,193 L275,200 L278,207 L275,200 L272,197 L267,190 L261,190 L253,190 L250,193 L242,190 L236,193 L231,203 L231,217 L231,224 L236,224 L247,228 L256,234 L261,245 L267,255 L272,259 L278,262 L283,266 L278,266 L269,259 L261,252 L256,241 L244,241 L236,238 L231,234 L222,231 L208,224 L206,217 L197,210 L189,197 L183,190 L175,183 L172,176 L164,166 L156,148 L156,134 L153,124 L147,114 L139,103 L131,100 L122,93 L111,86 L108,52 Z M28,72 L42,62 L50,55 L64,48 L78,48 L89,52 L106,55 L119,55 L125,62 L119,72 L108,83 L89,86 L75,93 L56,100 L39,107 L28,110 L19,100 L22,86 L28,72 Z' },
    { id: 'southamerica', d: 'M283,286 L292,276 L297,269 L306,269 L311,259 L322,259 L331,259 L339,269 L347,279 L356,283 L361,290 L367,297 L372,300 L378,303 L386,303 L392,310 L394,321 L403,321 L403,331 L397,338 L392,345 L389,352 L389,362 L383,372 L378,372 L369,379 L364,390 L361,397 L356,407 L353,410 L347,414 L342,417 L339,424 L325,428 L319,438 L319,448 L314,455 L314,466 L308,472 L303,476 L306,483 L311,483 L317,476 L311,459 L303,452 L300,438 L297,424 L297,414 L300,403 L303,390 L306,376 L306,359 L303,348 L292,341 L289,334 L286,328 L283,317 L278,303 L278,293 L283,286 Z' },
    { id: 'europe', d: 'M472,169 L478,166 L475,159 L475,145 L486,141 L494,141 L500,145 L508,145 L514,141 L519,141 L522,141 L519,134 L508,131 L503,128 L494,128 L486,128 L486,121 L492,117 L500,117 L506,114 L511,114 L517,107 L522,103 L525,103 L528,97 L533,100 L533,93 L531,90 L528,86 L533,72 L539,66 L544,55 L550,52 L556,52 L567,48 L578,48 L583,52 L583,59 L578,69 L572,83 L569,86 L567,93 L561,100 L556,103 L550,103 L542,107 L539,114 L542,117 L547,124 L553,128 L558,131 L564,138 L569,145 L578,148 L572,155 L567,162 L564,169 L569,166 L575,162 L581,152 L572,148 L561,155 L553,155 L544,159 L542,162 L536,166 L544,166 L542,162 L544,159 L539,152 L536,148 L533,141 L522,141 L517,145 L508,145 L503,148 L497,155 L492,162 L486,169 L481,166 L472,169 Z M486,121 L486,117 L489,110 L492,103 L489,100 L486,93 L492,90 L500,90 L503,97 L506,107 L503,114 L500,117 L494,121 L486,121 Z M472,114 L475,110 L478,103 L481,103 L475,107 L472,110 L472,114 Z' },
    { id: 'africa', d: 'M453,241 L453,221 L464,207 L472,193 L478,183 L486,176 L494,172 L508,166 L519,166 L528,166 L531,179 L536,179 L550,179 L564,183 L578,183 L592,190 L597,190 L600,197 L606,207 L617,231 L619,252 L622,255 L628,266 L633,276 L639,286 L633,293 L625,300 L617,310 L611,321 L611,331 L606,341 L600,348 L597,362 L597,376 L592,386 L586,397 L581,407 L578,410 L572,410 L564,410 L556,410 L550,403 L547,393 L542,386 L536,372 L533,355 L533,334 L536,314 L531,307 L528,297 L522,290 L517,283 L511,276 L506,272 L500,272 L492,276 L486,276 L478,276 L472,269 L464,262 L458,255 L456,248 L453,241 Z' },
    { id: 'asia', d: 'M583,148 L592,141 L600,134 L606,128 L611,121 L617,114 L625,107 L633,100 L639,93 L644,86 L653,79 L661,72 L667,66 L667,52 L667,45 L694,45 L722,52 L750,45 L778,45 L806,41 L833,38 L861,41 L889,45 L917,41 L944,41 L972,52 L986,59 L944,69 L939,79 L936,93 L931,103 L925,114 L917,121 L903,128 L897,131 L889,134 L875,141 L864,145 L861,148 L856,155 L853,162 L850,172 L850,176 L856,172 L858,166 L861,155 L864,145 L856,148 L847,152 L839,155 L836,162 L833,169 L839,176 L836,190 L833,197 L828,207 L822,210 L817,214 L811,217 L806,224 L800,224 L800,238 L794,238 L792,252 L789,259 L786,272 L786,283 L783,290 L786,283 L786,272 L778,259 L772,245 L767,238 L761,231 L756,224 L750,217 L744,217 L742,228 L739,238 L736,245 L733,252 L728,266 L722,269 L717,266 L714,266 L703,252 L700,238 L697,224 L694,217 L689,210 L683,207 L675,207 L661,210 L656,217 L653,234 L644,238 L639,248 L633,255 L628,252 L622,248 L619,238 L622,217 L633,210 L644,214 L656,207 L667,210 L672,210 L683,203 L689,197 L694,190 L689,183 L683,176 L675,176 L667,169 L658,169 L653,166 L644,166 L639,162 L633,155 L622,148 L611,148 L600,148 L592,148 L583,148 Z M861,186 L867,179 L872,176 L878,172 L883,169 L889,162 L892,155 L894,145 L897,138 L903,141 L897,148 L892,155 L889,162 L886,169 L881,172 L875,176 L869,179 L864,183 L861,186 Z' },
    { id: 'oceania', d: 'M861,334 L869,334 L878,334 L883,341 L889,348 L894,355 L900,362 L906,369 L911,376 L917,383 L922,390 L925,397 L922,407 L917,414 L911,424 L906,428 L894,428 L889,424 L881,417 L878,414 L875,410 L872,407 L867,403 L861,403 L856,403 L847,407 L839,410 L828,414 L822,410 L819,407 L817,397 L817,386 L817,376 L819,369 L828,362 L833,355 L839,348 L844,345 L850,341 L856,338 L861,334 Z M983,417 L986,421 L992,424 L994,428 L992,434 L986,434 L983,428 L983,421 L983,417 Z M972,441 L978,441 L983,445 L978,452 L972,452 L967,448 L969,445 L972,441 Z M892,303 L897,303 L906,307 L911,310 L917,314 L922,310 L931,314 L933,317 L931,321 L922,317 L914,317 L906,317 L897,314 L892,310 L892,303 Z M767,300 L775,297 L783,293 L789,290 L794,293 L800,303 L806,317 L811,321 L819,321 L828,321 L833,321 L839,317 L833,310 L828,307 L819,314 L811,317 L806,314 L800,307 L794,300 L789,297 L781,300 L772,303 L767,300 Z M803,286 L808,290 L814,293 L819,293 L825,290 L828,283 L828,276 L822,272 L817,276 L811,279 L806,283 L803,286 Z' },
    { id: 'greenland', d: 'M356,66 L367,59 L383,52 L403,45 L422,38 L439,31 L450,24 L444,17 L422,10 L403,10 L383,10 L361,17 L353,24 L347,31 L344,38 L347,45 L353,52 L356,66 Z' },
  ];

  var COUNTRY_DOTS = [
    { region: 'africa', name: 'Nigeria', x: 509, y: 271 },
    { region: 'africa', name: 'Ghana', x: 496, y: 274 },
    { region: 'africa', name: 'Kenya', x: 602, y: 298 },
    { region: 'africa', name: 'South Africa', x: 578, y: 383 },
    { region: 'africa', name: 'Egypt', x: 587, y: 190 },
    { region: 'africa', name: 'Ethiopia', x: 607, y: 262 },
    { region: 'africa', name: 'Tanzania', x: 609, y: 317 },
    { region: 'africa', name: 'Rwanda', x: 583, y: 300 },
    { region: 'africa', name: 'Uganda', x: 591, y: 292 },
    { region: 'africa', name: 'Senegal', x: 452, y: 242 },
    { region: 'africa', name: 'Cameroon', x: 532, y: 280 },
    { region: 'africa', name: 'Morocco', x: 479, y: 177 },
    { region: 'africa', name: 'Tunisia', x: 528, y: 166 },
    { region: 'africa', name: 'Ivory Coast', x: 485, y: 270 },
    { region: 'africa', name: 'Mozambique', x: 597, y: 346 },
    { region: 'africa', name: 'Zimbabwe', x: 586, y: 354 },
    { region: 'africa', name: 'Botswana', x: 572, y: 378 },
    { region: 'africa', name: 'Namibia', x: 548, y: 371 },
    { region: 'europe', name: 'UK', x: 500, y: 116 },
    { region: 'europe', name: 'Germany', x: 537, y: 112 },
    { region: 'europe', name: 'France', x: 506, y: 124 },
    { region: 'europe', name: 'Netherlands', x: 514, y: 112 },
    { region: 'europe', name: 'Sweden', x: 550, y: 89 },
    { region: 'europe', name: 'Norway', x: 530, y: 87 },
    { region: 'europe', name: 'Denmark', x: 535, y: 101 },
    { region: 'europe', name: 'Switzerland', x: 521, y: 131 },
    { region: 'europe', name: 'Belgium', x: 512, y: 118 },
    { region: 'europe', name: 'Ireland', x: 483, y: 109 },
    { region: 'europe', name: 'Spain', x: 490, y: 154 },
    { region: 'europe', name: 'Italy', x: 535, y: 149 },
    { region: 'northamerica', name: 'USA', x: 286, y: 159 },
    { region: 'northamerica', name: 'Canada', x: 290, y: 137 },
    { region: 'northamerica', name: 'Mexico', x: 225, y: 226 },
    { region: 'northamerica', name: 'Jamaica', x: 287, y: 231 },
    { region: 'northamerica', name: 'Trinidad and Tobago', x: 329, y: 257 },
    { region: 'northamerica', name: 'Costa Rica', x: 267, y: 259 },
    { region: 'asiapacific', name: 'India', x: 714, y: 194 },
    { region: 'asiapacific', name: 'China', x: 823, y: 156 },
    { region: 'asiapacific', name: 'Japan', x: 888, y: 170 },
    { region: 'asiapacific', name: 'South Korea', x: 853, y: 163 },
    { region: 'asiapacific', name: 'Singapore', x: 788, y: 288 },
    { region: 'asiapacific', name: 'Malaysia', x: 783, y: 282 },
    { region: 'asiapacific', name: 'Philippines', x: 836, y: 243 },
    { region: 'asiapacific', name: 'Australia', x: 914, y: 415 },
    { region: 'asiapacific', name: 'New Zealand', x: 986, y: 436 },
    { region: 'asiapacific', name: 'Indonesia', x: 797, y: 314 },
    { region: 'global', name: 'UAE', x: 651, y: 209 },
    { region: 'global', name: 'Turkey', x: 591, y: 156 },
    { region: 'global', name: 'Brazil', x: 380, y: 372 },
    { region: 'global', name: 'Colombia', x: 294, y: 277 },
    { region: 'global', name: 'Chile', x: 304, y: 408 },
    { region: 'global', name: 'Argentina', x: 338, y: 412 },
  ];

  var MAP_REGIONS = [
    { id: 'africa', label: 'Africa', color: 'rgba(232,168,77,0.9)', glow: 'rgba(232,168,77,0.35)' },
    { id: 'europe', label: 'Europe', color: 'rgba(194,65,12,0.9)', glow: 'rgba(194,65,12,0.35)' },
    { id: 'northamerica', label: 'N. America', color: 'rgba(212,132,58,0.9)', glow: 'rgba(212,132,58,0.35)' },
    { id: 'asiapacific', label: 'Asia Pacific', color: 'rgba(232,168,77,0.9)', glow: 'rgba(232,168,77,0.35)' },
    { id: 'global', label: 'Global', color: 'rgba(194,65,12,0.9)', glow: 'rgba(194,65,12,0.35)' },
  ];

  var MAP_STATS = [
    { target: 52, suffix: '', comma: false, label: 'Countries' },
    { target: 5, suffix: '', comma: false, label: 'Regions' },
    { target: 10000, suffix: '+', comma: true, label: 'Opportunities' },
    { target: 100, suffix: '%', comma: false, label: 'Verified' },
  ];

  function useCountUp(target, duration, trigger) {
    var _s = React.useState(0);
    var val = _s[0], setVal = _s[1];
    var _d = React.useState(false);
    var done = _d[0], setDone = _d[1];
    var started = React.useRef(false);
    React.useEffect(function () {
      if (!trigger || started.current || REDUCED.matches) {
        if (REDUCED.matches && trigger) { setVal(target); setDone(true); }
        return;
      }
      started.current = true;
      var start = performance.now();
      var step = function (now) {
        var t = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        setVal(Math.round(eased * target));
        if (t < 1) requestAnimationFrame(step);
        else { setVal(target); setDone(true); }
      };
      requestAnimationFrame(step);
    }, [trigger, target, duration]);
    return [val, done];
  }

  function MapStat({ stat, index, visible }) {
    var _cu = useCountUp(stat.target, 1400, visible);
    var animVal = _cu[0], done = _cu[1];
    var display = (stat.comma ? animVal.toLocaleString() : animVal) + stat.suffix;
    return (
      <div style={{
        textAlign: 'center',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 600ms ease ' + (1600 + index * 150) + 'ms, transform 600ms var(--ease-out-soft) ' + (1600 + index * 150) + 'ms',
      }}>
        <div style={{
          fontFamily: 'var(--font-serif)', fontSize: 'clamp(26px, 2.8vw, 36px)', fontWeight: 700, lineHeight: 1,
          color: 'var(--decor-numeral)', letterSpacing: '-0.02em',
          transform: done ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 350ms var(--ease-out-soft)',
        }}>
          {display}
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'rgba(255,249,244,0.55)', marginTop: 6, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
          {stat.label}
        </div>
      </div>
    );
  }

  function regionColor(regionId) {
    var r = MAP_REGIONS.find(function (m) { return m.id === regionId; });
    return r ? r.color : 'rgba(232,168,77,0.9)';
  }

  function useMapReveal() {
    var ref = React.useRef(null);
    var _s = React.useState(false);
    var visible = _s[0], setVisible = _s[1];
    React.useEffect(function () {
      var el = ref.current;
      if (!el) return;
      if (REDUCED.matches) { setVisible(true); return; }
      var obs = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { setVisible(true); obs.disconnect(); }
      }, { threshold: 0.15 });
      obs.observe(el);
      return function () { obs.disconnect(); };
    }, []);
    return [ref, visible];
  }

  function ConnectionArcs({ visible, hovered }) {
    var _s = React.useState([]);
    var arcs = _s[0], setArcs = _s[1];
    var timer = React.useRef(null);
    var arcCount = React.useRef(0);

    React.useEffect(function () {
      if (!visible || REDUCED.matches) return;
      var spawn = function () {
        var pool = hovered ? COUNTRY_DOTS.filter(function (d) { return d.region === hovered; }) : COUNTRY_DOTS;
        if (pool.length < 2) pool = COUNTRY_DOTS;
        var a = pool[Math.floor(Math.random() * pool.length)];
        var b = pool[Math.floor(Math.random() * pool.length)];
        if (a === b) b = pool[(pool.indexOf(a) + 1) % pool.length];
        var id = ++arcCount.current;
        setArcs(function (prev) {
          var next = prev.concat([{ id: id, from: a, to: b }]);
          if (next.length > 4) next = next.slice(next.length - 4);
          return next;
        });
      };
      spawn();
      timer.current = setInterval(spawn, 2200);
      return function () { clearInterval(timer.current); };
    }, [visible, hovered]);

    return arcs.map(function (arc) {
      var mx = (arc.from.x + arc.to.x) / 2;
      var my = Math.min(arc.from.y, arc.to.y) - 40 - Math.random() * 30;
      var d = 'M' + arc.from.x + ',' + arc.from.y + ' Q' + mx + ',' + my + ' ' + arc.to.x + ',' + arc.to.y;
      var col = hovered ? regionColor(hovered) : 'rgba(232,168,77,0.55)';
      return (
        <path
          key={arc.id}
          d={d}
          fill="none"
          stroke={col}
          strokeWidth="1.4"
          strokeLinecap="round"
          className="co-map-arc"
          style={{ opacity: 0 }}
        />
      );
    });
  }

  function MapTooltip({ dot, svgRef }) {
    if (!dot || !svgRef.current) return null;
    var svg = svgRef.current;
    var pt = svg.createSVGPoint();
    pt.x = dot.x; pt.y = dot.y;
    var ctm = svg.getScreenCTM();
    if (!ctm) return null;
    var screenPt = pt.matrixTransform(ctm);
    var rect = svg.getBoundingClientRect();
    var left = screenPt.x - rect.left;
    var top = screenPt.y - rect.top - 28;
    return (
      <div className="co-map-tooltip" style={{
        position: 'absolute', left: left, top: top,
        transform: 'translate(-50%, -100%)',
        pointerEvents: 'none', zIndex: 10,
      }}>
        {dot.name}
      </div>
    );
  }

  function GlobalReachMap() {
    var _reveal = useMapReveal();
    var sectionRef = _reveal[0], visible = _reveal[1];
    var svgRef = React.useRef(null);
    var _hov = React.useState(null);
    var hovered = _hov[0], setHovered = _hov[1];
    var _tip = React.useState(null);
    var tooltip = _tip[0], setTooltip = _tip[1];

    var dotOpacity = function (regionId) {
      if (!hovered) return 1;
      return regionId === hovered ? 1 : 0.18;
    };
    var continentOpacity = function () {
      return hovered ? 0.5 : 0.7;
    };

    return (
      <section ref={sectionRef} id="global-reach" style={{ position: 'relative', isolation: 'isolate', background: 'var(--surface-dark)', overflow: 'hidden' }}>
        <Constellation count={25} lineAlpha={0.06} dotAlpha={0.25} speed={0.15} />
        <div className="om-glow" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
        <div className="wrap" style={{ padding: '80px var(--container-pad)', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <Eyebrow tone="gold" style={{ marginBottom: 16 }}>Global Reach</Eyebrow>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--type-h2-size, 48px)', fontWeight: 700, lineHeight: 1.05, color: 'var(--text-on-dark)', maxWidth: '24ch', margin: '0 auto' }}>
              Opportunity knows no borders.
            </h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--type-body-large-size, 18px)', lineHeight: 1.6, color: 'rgba(255,249,244,0.68)', maxWidth: '52ch', margin: '16px auto 0' }}>
              52 countries across 5 regions, with verified opportunities spanning scholarships, internships, jobs, and funded programmes.
            </p>
          </div>

          {/* Region pills */}
          <div className="co-map-pills" style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
            {MAP_REGIONS.map(function (r) {
              var active = hovered === r.id;
              return (
                <button
                  key={r.id}
                  className={'co-map-pill' + (active ? ' active' : '')}
                  onMouseEnter={function () { setHovered(r.id); }}
                  onMouseLeave={function () { setHovered(null); }}
                  onClick={function () { setHovered(hovered === r.id ? null : r.id); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '7px 16px', borderRadius: 'var(--radius-pill)',
                    border: '1px solid ' + (active ? r.color : 'rgba(255,249,244,0.12)'),
                    background: active ? 'rgba(255,249,244,0.08)' : 'transparent',
                    cursor: 'pointer', transition: 'all 250ms var(--ease-out-soft)',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, boxShadow: active ? '0 0 8px ' + r.glow : 'none', transition: 'box-shadow 250ms ease' }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: active ? '#FFF9F4' : 'rgba(255,249,244,0.6)', transition: 'color 250ms ease' }}>
                    {r.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* SVG Map */}
          <div className="co-map-wrap" style={{ position: 'relative', width: '100%', maxWidth: 900, margin: '0 auto' }}>
            <svg
              ref={svgRef}
              viewBox="0 0 1000 500"
              style={{ width: '100%', height: 'auto', display: 'block' }}
              aria-label="World map showing OppDate presence in 52 countries"
              role="img"
            >
              <defs>
                <radialGradient id="dot-glow-amber">
                  <stop offset="0%" stopColor="rgba(232,168,77,0.6)" />
                  <stop offset="100%" stopColor="rgba(232,168,77,0)" />
                </radialGradient>
                <radialGradient id="dot-glow-orange">
                  <stop offset="0%" stopColor="rgba(194,65,12,0.6)" />
                  <stop offset="100%" stopColor="rgba(194,65,12,0)" />
                </radialGradient>
              </defs>

              {/* Continent outlines with stroke-dashoffset draw-in */}
              {CONTINENT_PATHS.map(function (c, i) {
                return (
                  <path
                    key={c.id}
                    d={c.d}
                    fill="rgba(232,168,77,0.04)"
                    stroke="rgba(232,168,77,0.22)"
                    strokeWidth="0.9"
                    strokeLinejoin="round"
                    className="co-map-continent"
                    style={{
                      opacity: continentOpacity(),
                      strokeDasharray: 4000,
                      strokeDashoffset: visible ? 0 : 4000,
                      transition: 'stroke-dashoffset 2.8s cubic-bezier(0.22,1,0.36,1) ' + (i * 180) + 'ms, opacity 400ms ease',
                    }}
                  />
                );
              })}

              {/* Subtle grid lines */}
              {[100, 200, 300, 400].map(function (y) {
                return <line key={'h' + y} x1="20" y1={y} x2="980" y2={y} stroke="rgba(255,249,244,0.03)" strokeWidth="0.5" />;
              })}
              {[200, 400, 600, 800].map(function (x) {
                return <line key={'v' + x} x1={x} y1="20" x2={x} y2="480" stroke="rgba(255,249,244,0.03)" strokeWidth="0.5" />;
              })}

              {/* Connection arcs */}
              <ConnectionArcs visible={visible} hovered={hovered} />

              {/* Country dots */}
              {COUNTRY_DOTS.map(function (dot, i) {
                var col = regionColor(dot.region);
                var delay = visible ? (600 + i * 50) : 0;
                return (
                  <g
                    key={dot.name}
                    style={{
                      opacity: visible ? dotOpacity(dot.region) : 0,
                      transition: 'opacity 500ms ease ' + delay + 'ms',
                    }}
                    onMouseEnter={function () { setTooltip(dot); setHovered(dot.region); }}
                    onMouseLeave={function () { setTooltip(null); setHovered(null); }}
                  >
                    {/* Outer glow ring */}
                    <circle
                      cx={dot.x} cy={dot.y} r="10"
                      fill="none" stroke={col} strokeWidth="0.5"
                      className="co-map-ring"
                      style={{
                        opacity: hovered === dot.region ? 0.4 : 0,
                        transform: 'scale(' + (hovered === dot.region ? 1 : 0.5) + ')',
                        transformOrigin: dot.x + 'px ' + dot.y + 'px',
                        transition: 'opacity 300ms ease, transform 300ms ease',
                      }}
                    />
                    {/* Ping animation ring */}
                    <circle
                      cx={dot.x} cy={dot.y} r="3.5"
                      fill="none" stroke={col} strokeWidth="0.8"
                      className="co-map-ping"
                      style={{ animationDelay: (i * 120 + Math.random() * 800) + 'ms', transformOrigin: dot.x + 'px ' + dot.y + 'px' }}
                    />
                    {/* Core dot */}
                    <circle
                      cx={dot.x} cy={dot.y}
                      r={hovered === dot.region ? 4 : 3}
                      fill={col}
                      style={{ cursor: 'pointer', transition: 'r 200ms ease, fill 200ms ease' }}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Tooltip */}
            <MapTooltip dot={tooltip} svgRef={svgRef} />

            {/* Vignette overlay at edges */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'radial-gradient(ellipse 85% 80% at center, transparent 55%, var(--surface-dark) 100%)',
              zIndex: 2,
            }} />
          </div>

          {/* Stat strip */}
          <div className="co-map-stats" style={{ display: 'flex', justifyContent: 'center', gap: 48, marginTop: 40, flexWrap: 'wrap' }}>
            {MAP_STATS.map(function (s, i) {
              return <MapStat key={s.label} stat={s} index={i} visible={visible} />;
            })}
          </div>
        </div>
      </section>
    );
  }

  /* ================================================================
     PREMIUM — split layout with contrast visual
     Left: manifesto text with decorative monogram watermark.
     Right: illustrative image placeholder with scroll parallax.
     Gold divider accent. Scroll-triggered entrance.
     ================================================================ */
  function PremiumSection() {
    const sectionRef = React.useRef(null);
    const [visible, setVisible] = React.useState(false);
    const [scrollY, setScrollY] = React.useState(0);

    React.useEffect(() => {
      const el = sectionRef.current;
      if (!el) return;
      if (REDUCED.matches) { setVisible(true); return; }
      const obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
      }, { threshold: 0.15 });
      obs.observe(el);
      return () => obs.disconnect();
    }, []);

    React.useEffect(() => {
      if (REDUCED.matches) return;
      const onScroll = () => setScrollY(window.scrollY);
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const imgRef = React.useRef(null);
    const parallaxOffset = React.useMemo(() => {
      if (REDUCED.matches || !imgRef.current) return 0;
      const rect = imgRef.current && imgRef.current.getBoundingClientRect ? imgRef.current.getBoundingClientRect() : null;
      return 0;
    }, []);

    return (
      <section id="premium" ref={sectionRef} style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--line)', overflow: 'hidden' }}>
        <div className="wrap split" style={{ padding: '80px var(--container-pad)', display: 'grid', gridTemplateColumns: 'minmax(0, 55%) minmax(0, 45%)', gap: 56, alignItems: 'center', position: 'relative' }}>

          {/* Watermark monogram behind text */}
          <div aria-hidden="true" style={{
            position: 'absolute', left: '-4%', top: '50%', transform: 'translateY(-50%)',
            width: 320, height: 320, opacity: 0.03,
            backgroundImage: 'url(' + ((window.__resources && window.__resources.monogram) || 'assets/oppdate-monogram.png') + ')',
            backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
            pointerEvents: 'none',
          }} />

          {/* Text side */}
          <div style={{
            position: 'relative', zIndex: 1,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateX(0)' : 'translateX(-32px)',
            transition: REDUCED.matches ? 'none' : 'opacity 700ms var(--ease-out-soft), transform 700ms var(--ease-out-soft)',
          }}>
            <Eyebrow style={{ marginBottom: 16 }}>Premium by design</Eyebrow>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--type-h2-size, 48px)', fontWeight: 700, lineHeight: 1.05, color: 'var(--color-text-ink)', maxWidth: '18ch', margin: 0 }}>
              Free platforms are built for volume, not outcomes.
            </h2>

            {/* Gold divider */}
            <div style={{
              width: visible ? 56 : 0, height: 2,
              background: 'var(--decor-numeral)', borderRadius: 1,
              marginTop: 28, marginBottom: 28,
              transition: REDUCED.matches ? 'none' : 'width 600ms var(--ease-out-soft) 300ms',
            }} />

            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--type-body-large-size, 18px)', lineHeight: 1.65, color: 'var(--text-body)', maxWidth: '44ch' }}>
              When public boards push millions of rushed applications toward the same listings,
              selection teams resort to automated filters to survive the flood.
              Qualified candidates end up overlooked because the pipeline is overcrowded.
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--type-body-large-size, 18px)', lineHeight: 1.65, color: 'var(--text-body)', maxWidth: '44ch', marginTop: 20 }}>
              Our full platform sits behind a members-only gateway to protect the standard for
              everyone inside. The subscription serves as an intentional filter against casual traffic
              and noise, keeping our tools and listings reserved for committed, prepared applicants.
            </p>
            <div style={{ marginTop: 32 }}>
              <LinkArrow href="/pricing">See our pricing</LinkArrow>
            </div>
          </div>

          {/* Image side with parallax */}
          <div ref={imgRef} className="co-premium-img" style={{
            position: 'relative',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateX(0) translateY(0)' : 'translateX(40px)',
            transition: REDUCED.matches ? 'none' : 'opacity 700ms var(--ease-out-soft) 200ms, transform 700ms var(--ease-out-soft) 200ms',
          }}>
            {/* Main image placeholder */}
            <div style={{
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              background: 'linear-gradient(145deg, var(--row-rest) 0%, rgba(232,168,77,0.08) 100%)',
              border: '1px solid var(--line)',
              aspectRatio: '3/4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              {/* Decorative gradient overlay */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
                background: 'linear-gradient(to top, rgba(194,65,12,0.08), transparent)',
                pointerEvents: 'none',
              }} />
              <div style={{ textAlign: 'center', padding: 32, position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 'var(--radius-pill)',
                  background: 'var(--action-wash)', color: 'var(--action)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <Icon name="lock" size={28} />
                </div>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, lineHeight: 1.5, color: 'var(--text-body)', opacity: 0.4, maxWidth: '24ch', margin: '0 auto' }}>
                  AI image prompt: Split visual comparison - left side shows a chaotic crowd of overlapping application forms, right side shows a clean curated space with organized documents and a golden gate/barrier between them, warm amber and cream tones, modern editorial illustration
                </p>
              </div>
            </div>

            {/* Floating stat badge */}
            <div className="co-premium-badge" style={{
              position: 'absolute', bottom: -16, left: -16,
              padding: '14px 20px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface-card)',
              border: '1px solid var(--line)',
              boxShadow: '0 8px 24px rgba(26,15,6,0.1)',
              display: 'flex', alignItems: 'center', gap: 12,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translate(0, 0) scale(1)' : 'translate(-12px, 12px) scale(0.9)',
              transition: REDUCED.matches ? 'none' : 'opacity 500ms var(--ease-out-soft) 600ms, transform 500ms var(--ease-out-soft) 600ms',
            }}>
              <span style={{
                width: 36, height: 36, borderRadius: 'var(--radius-pill)',
                background: 'var(--action)', color: 'var(--color-text-inverse)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="trending-up" size={18} />
              </span>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 700, color: 'var(--color-text-ink)', lineHeight: 1 }}>3x</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-body)', marginTop: 2 }}>higher completion rate</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ================================================================
     FOUNDER — floating glass letter card
     The founder's words sit inside a frosted glass card that hovers
     over the dark textured background with a subtle floating animation.
     Large decorative quote mark as a watermark behind the glass.
     Gold-tinted border pulses gently. Key phrases get scroll-triggered
     gold underline highlights. No portrait, no name.
     ================================================================ */
  function useHighlightReveal(ref) {
    const [revealed, setRevealed] = React.useState(false);
    React.useEffect(() => {
      const el = ref.current;
      if (!el) return;
      if (REDUCED.matches) { setRevealed(true); return; }
      const obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { setRevealed(true); obs.disconnect(); }
      }, { threshold: 0.4 });
      obs.observe(el);
      return () => obs.disconnect();
    }, []);
    return revealed;
  }

  function GoldHighlight({ children, delay, revealed }) {
    return (
      <span style={{ position: 'relative', display: 'inline' }}>
        {children}
        <span style={{
          position: 'absolute', bottom: -2, left: 0,
          width: revealed ? '100%' : '0%', height: 2,
          background: 'linear-gradient(90deg, var(--decor-numeral), rgba(232,168,77,0.5))',
          borderRadius: 1,
          transition: REDUCED.matches ? 'none' : 'width 800ms var(--ease-out-soft) ' + delay + 'ms',
        }} />
      </span>
    );
  }

  function FounderSection() {
    const cardRef = React.useRef(null);
    const revealed = useHighlightReveal(cardRef);
    const [floatY, setFloatY] = React.useState(0);

    React.useEffect(() => {
      if (REDUCED.matches) return;
      let raf;
      let start = null;
      const animate = (ts) => {
        if (!start) start = ts;
        const elapsed = (ts - start) / 1000;
        setFloatY(Math.sin(elapsed * 0.8) * 6);
        raf = requestAnimationFrame(animate);
      };
      raf = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(raf);
    }, []);

    return (
      <section id="founder" style={{ background: '#0E0905', position: 'relative', isolation: 'isolate', overflow: 'hidden' }}>
        {/* Deep warm mesh gradient */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #160E08 0%, #120B06 40%, #1A110A 70%, #0E0905 100%)',
          pointerEvents: 'none',
        }} />
        {/* Warm gold spotlight at center */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: '45%', left: '50%',
          width: 900, height: 700,
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(232,168,77,0.1) 0%, rgba(194,65,12,0.04) 40%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        {/* Secondary warm glow at top-right for mesh depth */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, right: 0,
          width: 600, height: 500,
          background: 'radial-gradient(ellipse at 80% 20%, rgba(194,65,12,0.05) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        <div className="wrap" style={{ padding: '100px var(--container-pad)', position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center' }}>

          {/* Quote mark - breaks above the card, gold on slate */}
          <div aria-hidden="true" style={{
            position: 'absolute', top: 48, left: '50%', transform: 'translateX(-50%)',
            fontFamily: 'var(--font-serif)', fontSize: 'clamp(100px, 14vw, 160px)',
            lineHeight: 0.7, color: 'var(--decor-numeral)', opacity: revealed ? 0.15 : 0,
            userSelect: 'none', pointerEvents: 'none', zIndex: 2,
            transition: REDUCED.matches ? 'none' : 'opacity 1s var(--ease-out-soft) 200ms',
          }}>
            {'\u201C'}
          </div>

          {/* Light frosted glass card on dark slate */}
          <div
            ref={cardRef}
            className="co-glass-letter"
            style={{
              position: 'relative',
              maxWidth: 640,
              width: '100%',
              padding: '48px 48px 44px',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(255,252,248,0.07)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(255,249,244,0.12)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.3), 0 1px 0 rgba(255,249,244,0.08) inset, 0 -1px 0 rgba(255,249,244,0.03) inset',
              textAlign: 'center',
              transform: 'translateY(' + floatY + 'px)',
              opacity: revealed ? 1 : 0,
              transition: REDUCED.matches ? 'none' : 'opacity 800ms var(--ease-out-soft)',
            }}
          >
            {/* Border glow - brighter on slate */}
            <div className="co-glass-glow" aria-hidden="true" style={{
              position: 'absolute', inset: -1, borderRadius: 'var(--radius-lg)',
              border: '1px solid transparent',
              pointerEvents: 'none',
            }} />

            <Eyebrow tone="gold" style={{ marginBottom: 24, position: 'relative', zIndex: 1 }}>A note from our founder</Eyebrow>

            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(18px, 2.2vw, 24px)', lineHeight: 1.7, color: 'rgba(255,249,244,0.92)', maxWidth: '38ch', margin: '0 auto', position: 'relative', zIndex: 1 }}>
              <GoldHighlight revealed={revealed} delay={400}>You are capable.</GoldHighlight>{' '}
              You need a system built to prove it, so we built one dedicated
              space for you to spot, prepare for, and win your next big opportunity.
            </p>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(18px, 2.2vw, 24px)', lineHeight: 1.7, color: 'rgba(255,249,244,0.92)', maxWidth: '38ch', margin: '20px auto 0', position: 'relative', zIndex: 1 }}>
              Every alert, tool, and service inside this app is here to{' '}
              <GoldHighlight revealed={revealed} delay={800}>back you up from start to finish.</GoldHighlight>
            </p>

            {/* Gold divider */}
            <div style={{
              width: revealed ? 48 : 0, height: 2,
              background: 'var(--decor-numeral)', borderRadius: 1,
              margin: '28px auto',
              transition: REDUCED.matches ? 'none' : 'width 600ms var(--ease-out-soft) 1000ms',
            }} />

            <p style={{
              fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, lineHeight: 1.5,
              color: 'var(--decor-numeral)', margin: 0, position: 'relative', zIndex: 1,
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translateY(0)' : 'translateY(12px)',
              transition: REDUCED.matches ? 'none' : 'opacity 600ms var(--ease-out-soft) 1200ms, transform 600ms var(--ease-out-soft) 1200ms',
            }}>
              Get the right timing. Use the right tools. Trust the right system.
            </p>
            <p className="co-founder-tagline" style={{
              fontFamily: 'var(--font-serif)', fontSize: 26, fontStyle: 'italic', fontWeight: 700,
              color: '#FFF9F4', marginTop: 20, letterSpacing: '-0.01em',
              position: 'relative', zIndex: 1,
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'scale(1)' : 'scale(0.9)',
              transition: REDUCED.matches ? 'none' : 'opacity 500ms var(--ease-out-soft) 1500ms, transform 500ms var(--ease-out-soft) 1500ms',
            }}>
              Stay OppDated.
            </p>
          </div>
        </div>
      </section>
    );
  }

  /* ================================================================
     COMPANY CTA — transition between Founder note and Work With Us
     Mirrors landing-page ClosingCta style (dark + dotted texture).
     ================================================================ */
  function CompanyCta() {
    return (
      <section className="om-tex om-tex-ink om-glow" style={{ background: 'var(--surface-dark)' }}>
        <div className="wrap" style={{ padding: '100px var(--container-pad)', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--text-on-dark)', maxWidth: '18ch', margin: '0 auto' }}>Want in?</h2>
          <p style={{ color: 'var(--text-on-dark-quiet)', fontSize: 'var(--type-body-large-size)', lineHeight: 'var(--type-body-large-leading)', maxWidth: '48ch', margin: '20px auto 0' }}>
            From joining our team and offering guidance to partnering with us or listing opportunities, there is room for you here. See all the ways we can build together.
          </p>
          <div style={{ marginTop: 32 }}>
            <Button as="a" href="/contact#work-with-us">Work with us</Button>
          </div>
        </div>
      </section>
    );
  }

  window.OMCO = { CompanyHero, MissionSection, TimingSection, DiscoverySection, GlobalReachMap, PremiumSection, FounderSection, CompanyCta };
})();
