/* Company page sections — registered to window.OMCO for the mount script.
   Enhanced with: topographic contour hero, staggered entrances, constellation
   particle fields, scroll-linked mission rail, bento masonry layout with
   magnetic tilt cards + cursor particle trails, drag-and-drop file upload. */
(function () {
  const { Eyebrow, Icon, Button } = window.OppDateDesignSystem_4aa598;
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
            OppDate connects talent with global opportunity: scholarships,
            internships, jobs, and funded programmes, all in one place with the
            guidance to land them.
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
      <section id="mission" style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--line)' }}>
        <div className="wrap" style={{ padding: '80px var(--container-pad)' }}>
          <Eyebrow style={{ marginBottom: 16 }}>Our Mission</Eyebrow>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--type-h2-size, 48px)', fontWeight: 700, lineHeight: 1.05, color: 'var(--color-text-ink)', maxWidth: '22ch', margin: 0 }}>
            Democratising access to life-changing opportunities.
          </h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--type-body-large-size, 18px)', lineHeight: 1.6, color: 'var(--text-body)', maxWidth: '58ch', marginTop: 18 }}>
            Millions of scholarships, grants, and programmes go unfilled every year. Not because
            people are unqualified, but because they never hear about them. OppDate exists to change that.
            Where you were born should not determine what you can become.
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
     WORK WITH US — magnetic tilt cards with cursor-following spotlight,
     parallax icon depth, and staggered card-deal entrance
     ================================================================ */
  const ROLES = [
    { id: 'careers', icon: 'briefcase', title: 'Careers', body: 'Join the team building the future of opportunity access. We are always looking for passionate people who believe in our mission.', cta: 'View open roles' },
    { id: 'get-featured', icon: 'star', title: 'Get Featured', body: 'Put your scholarship, grant, or programme in front of thousands of driven applicants on OppDate.', cta: 'Submit your listing' },
    { id: 'partner', icon: 'handshake', title: 'Partner With Us', body: 'Universities, NGOs, and companies looking to expand their reach. Let us build a pipeline of qualified, motivated applicants for your programmes.', cta: 'Explore partnerships' },
    { id: 'consultant', icon: 'graduation-cap', title: 'Become a Consultant', body: 'You have deep expertise in applications, admissions, or career strategy. Offer 1-on-1 consultation sessions through our platform.', cta: 'Apply as consultant' },
    { id: 'mentor', icon: 'heart-handshake', title: 'Become a Mentor', body: 'Guide the next generation through the application process. Share your experience, review documents, and help people land their dream opportunities.', cta: 'Apply as mentor' },
    { id: 'list-ebook', icon: 'book-open', title: 'List Your eBook', body: 'Publish and sell your guides on scholarships, visa processes, or career strategy to a global audience on OppDate.', cta: 'Start listing' },
  ];

  function useTiltTrail(cardRef, canvasRef) {
    const [tilt, setTilt] = React.useState({ rx: 0, ry: 0, active: false });
    const raf = React.useRef(null);
    const target = React.useRef({ rx: 0, ry: 0 });
    const current = React.useRef({ rx: 0, ry: 0 });
    const particles = React.useRef([]);
    const drawing = React.useRef(false);

    React.useEffect(() => {
      if (REDUCED.matches) return;
      const el = cardRef.current;
      const canvas = canvasRef.current;
      if (!el || !canvas) return;
      const ctx = canvas.getContext('2d');
      let running = false;
      const lerp = (a, b, t) => a + (b - a) * t;

      const resizeCanvas = () => {
        canvas.width = el.offsetWidth;
        canvas.height = el.offsetHeight;
      };
      resizeCanvas();
      const ro = new ResizeObserver(resizeCanvas);
      ro.observe(el);

      const drawParticles = () => {
        const pts = particles.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = pts.length - 1; i >= 0; i--) {
          const p = pts[i];
          p.life -= 0.014;
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.97;
          p.vy *= 0.97;
          if (p.life <= 0) { pts.splice(i, 1); continue; }
          const alpha = p.life * p.life * 0.45;
          const r = p.r * (0.6 + p.life * 0.4);
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + p.rgb + ',' + alpha + ')';
          ctx.fill();
        }
        if (pts.length > 0 || drawing.current) {
          requestAnimationFrame(drawParticles);
        } else {
          drawing.current = false;
        }
      };
      const ensureDrawing = () => {
        if (!drawing.current) { drawing.current = true; requestAnimationFrame(drawParticles); }
      };

      let spawnCounter = 0;
      const animate = () => {
        const c = current.current;
        const t = target.current;
        c.rx = lerp(c.rx, t.rx, 0.12);
        c.ry = lerp(c.ry, t.ry, 0.12);
        setTilt({ rx: c.rx, ry: c.ry, active: true });
        if (Math.abs(c.rx - t.rx) > 0.01 || Math.abs(c.ry - t.ry) > 0.01) {
          raf.current = requestAnimationFrame(animate);
        } else { running = false; }
      };
      const onMove = (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const nx = (e.clientX - rect.left) / rect.width;
        const ny = (e.clientY - rect.top) / rect.height;
        target.current = { rx: (ny - 0.5) * -8, ry: (nx - 0.5) * 8 };
        if (!running) { running = true; raf.current = requestAnimationFrame(animate); }
        spawnCounter++;
        if (spawnCounter % 2 === 0) {
          const pts = particles.current;
          if (pts.length < 60) {
            const colors = ['194,65,12', '212,132,58', '232,168,77'];
            for (let k = 0; k < 2; k++) {
              pts.push({
                x: x + (Math.random() - 0.5) * 8,
                y: y + (Math.random() - 0.5) * 8,
                vx: (Math.random() - 0.5) * 0.8,
                vy: (Math.random() - 0.5) * 0.8,
                r: 1.4 + Math.random() * 1.8,
                life: 0.7 + Math.random() * 0.3,
                rgb: colors[Math.floor(Math.random() * colors.length)],
              });
            }
          }
          ensureDrawing();
        }
      };
      const onLeave = () => {
        if (raf.current) cancelAnimationFrame(raf.current);
        const settle = () => {
          const c = current.current;
          c.rx = lerp(c.rx, 0, 0.08);
          c.ry = lerp(c.ry, 0, 0.08);
          setTilt({ rx: c.rx, ry: c.ry, active: false });
          if (Math.abs(c.rx) > 0.05 || Math.abs(c.ry) > 0.05) {
            raf.current = requestAnimationFrame(settle);
          } else {
            setTilt({ rx: 0, ry: 0, active: false });
            running = false;
          }
        };
        running = true;
        raf.current = requestAnimationFrame(settle);
      };
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
      return () => {
        el.removeEventListener('mousemove', onMove);
        el.removeEventListener('mouseleave', onLeave);
        if (raf.current) cancelAnimationFrame(raf.current);
        drawing.current = false;
        ro.disconnect();
      };
    }, []);
    return tilt;
  }

  function useCardDeal(containerRef) {
    const [dealt, setDealt] = React.useState(false);
    React.useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      if (REDUCED.matches) { setDealt(true); return; }
      const obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { setDealt(true); obs.disconnect(); }
      }, { threshold: 0.15 });
      obs.observe(el);
      return () => obs.disconnect();
    }, []);
    return dealt;
  }

  /* Bento grid area names per card index (desktop).
     Layout:
     ┌──────────┬──────────┬──────────┐
     │ careers  │ featured │ partner  │
     │ (hero,   ├──────────┤          │
     │  2 rows) │ consult  │          │
     ├──────────┼──────────┼──────────┤
     │ mentor   │ mentor   │ ebook    │
     └──────────┴──────────┴──────────┘
     Careers is the hero tile (tall left). Partner spans 2 rows on
     the right. Mentor spans 2 cols on the bottom left. */
  const BENTO_AREAS = ['careers', 'featured', 'partner', 'consult', 'mentor', 'ebook'];
  const HERO_IDS = { careers: true, partner: true, mentor: true };

  function RoleCard({ role, onInquire, index, dealt, area }) {
    const cardRef = React.useRef(null);
    const canvasRef = React.useRef(null);
    const tilt = useTiltTrail(cardRef, canvasRef);
    const isActive = tilt.active;
    const isHero = HERO_IDS[area];
    const dealDelay = (index * 80 + 60) + 'ms';

    return (
      <div
        ref={cardRef}
        id={role.id}
        className="co-role-card"
        style={{
          gridArea: area,
          perspective: 600,
          opacity: dealt ? 1 : 0,
          transform: dealt ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
          transition: 'opacity 600ms var(--ease-out-soft) ' + dealDelay + ', transform 600ms var(--ease-out-soft) ' + dealDelay,
        }}
      >
        <div
          className="co-tilt-inner"
          style={{
            height: '100%',
            padding: isHero ? 32 : 24,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface-card)',
            border: '1px solid ' + (isActive ? 'rgba(194,65,12,0.25)' : 'var(--line)'),
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            transform: 'rotateX(' + tilt.rx + 'deg) rotateY(' + tilt.ry + 'deg)',
            transition: isActive ? 'border-color 300ms ease' : 'transform 500ms var(--ease-out-soft), border-color 300ms ease',
            willChange: isActive ? 'transform' : 'auto',
            transformStyle: 'preserve-3d',
          }}
        >
          <canvas ref={canvasRef} aria-hidden="true" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            pointerEvents: 'none', zIndex: 0, borderRadius: 'var(--radius-lg)',
          }} />
          {/* Accent strip on hero cards */}
          {isHero && <div style={{
            position: 'absolute', top: 0, left: 0, width: 3, height: '100%',
            background: 'linear-gradient(180deg, var(--action) 0%, rgba(232,168,77,0.4) 100%)',
            borderRadius: '3px 0 0 3px', zIndex: 2,
          }} />}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: isHero ? 52 : 44, height: isHero ? 52 : 44,
                borderRadius: 'var(--radius-pill)',
                background: isActive ? 'var(--action)' : 'var(--action-wash)',
                color: isActive ? 'var(--color-text-inverse)' : 'var(--action)',
                transition: 'background 280ms var(--ease-out-soft), color 280ms var(--ease-out-soft), transform 300ms var(--ease-out-soft)',
                transform: 'translate3d(' + (tilt.ry * 0.6) + 'px, ' + (tilt.rx * -0.6) + 'px, 20px)',
                boxShadow: isActive ? '0 4px 16px rgba(194,65,12,0.3)' : 'none',
              }}
            >
              <Icon name={role.icon} size={isHero ? 24 : 20} />
            </span>
            <h3 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: isHero ? 26 : 20,
              fontWeight: 600, lineHeight: 1.15,
              color: 'var(--color-text-ink)', marginTop: isHero ? 22 : 16,
              transform: 'translate3d(' + (tilt.ry * 0.2) + 'px, ' + (tilt.rx * -0.2) + 'px, 8px)',
            }}>{role.title}</h3>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: isHero ? 16 : 14.5,
              lineHeight: 1.6, color: 'var(--text-body)',
              marginTop: isHero ? 14 : 10, flex: 1,
            }}>{role.body}</p>
            <button
              onClick={() => onInquire(role.id, role.title)}
              className="co-role-cta"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                marginTop: isHero ? 24 : 16, padding: 0,
                border: 'none', background: 'none', fontFamily: 'var(--font-sans)',
                fontSize: isHero ? 15.5 : 14, fontWeight: 600,
                color: 'var(--action)', cursor: 'pointer',
              }}
            >
              {role.cta}
              <span className="co-role-cta-arrow" style={{ display: 'inline-flex', transition: 'transform 250ms var(--ease-out-soft)' }}>
                <Icon name="arrow-right" size={16} />
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  function WorkWithUsSection({ onInquire }) {
    const gridRef = React.useRef(null);
    const dealt = useCardDeal(gridRef);
    return (
      <section id="work-with-us" className="co-wws" style={{ position: 'relative', borderTop: '1px solid var(--line)', overflow: 'hidden' }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, opacity: 0.028, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '200px', pointerEvents: 'none', zIndex: 0 }} />
        <div className="wrap" style={{ padding: '80px var(--container-pad)', position: 'relative', zIndex: 1 }}>
          <Eyebrow style={{ marginBottom: 16 }}>Work With Us</Eyebrow>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--type-h2-size, 48px)', fontWeight: 700, lineHeight: 1.05, color: 'var(--color-text-ink)', maxWidth: '22ch', margin: 0 }}>
            There is a place for you here.
          </h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--type-body-large-size, 18px)', lineHeight: 1.6, color: 'var(--text-body)', maxWidth: '58ch', marginTop: 18 }}>
            Whether you want to join our team, list a programme, or share your expertise,
            we would love to hear from you.
          </p>
          <div ref={gridRef} className="co-bento" style={{ marginTop: 48 }}>
            {ROLES.map((r, i) => (
              <RoleCard key={r.id} role={r} onInquire={onInquire} index={i} dealt={dealt} area={BENTO_AREAS[i]} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ================================================================
     INQUIRY FORM — with drag-and-drop + category highlight flash
     ================================================================ */
  const CATEGORY_OPTIONS = [
    { value: 'careers', label: 'Careers' },
    { value: 'get-featured', label: 'Get Featured' },
    { value: 'partner-with-us', label: 'Partner With Us' },
    { value: 'become-a-consultant', label: 'Become a Consultant' },
    { value: 'become-a-mentor', label: 'Become a Mentor' },
    { value: 'list-your-ebook', label: 'List Your eBook' },
    { value: 'general', label: 'General Inquiry' },
  ];

  const CATEGORY_ICONS = {
    'careers': 'briefcase',
    'get-featured': 'star',
    'partner-with-us': 'handshake',
    'become-a-consultant': 'graduation-cap',
    'become-a-mentor': 'heart-handshake',
    'list-your-ebook': 'book-open',
    'general': 'message-circle',
  };

  const ROLE_TO_CATEGORY = {
    'careers': 'careers',
    'get-featured': 'get-featured',
    'partner': 'partner-with-us',
    'consultant': 'become-a-consultant',
    'mentor': 'become-a-mentor',
    'list-ebook': 'list-your-ebook',
  };

  function InquirySection({ selectedCategory }) {
    const [category, setCategory] = React.useState(selectedCategory || '');
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [file, setFile] = React.useState(null);
    const [status, setStatus] = React.useState('idle');
    const [errorMsg, setErrorMsg] = React.useState('');
    const [dragOver, setDragOver] = React.useState(false);
    const [catFlash, setCatFlash] = React.useState(false);
    const fileRef = React.useRef(null);
    const formRef = React.useRef(null);
    const charCount = message.length;

    React.useEffect(() => {
      if (selectedCategory && selectedCategory !== category) {
        setCategory(selectedCategory);
        setCatFlash(true);
        const t = setTimeout(() => setCatFlash(false), 800);
        return () => clearTimeout(t);
      }
    }, [selectedCategory]);

    const handleFile = (f) => {
      if (!f) return;
      if (f.size > 10 * 1024 * 1024) { setErrorMsg('File exceeds 10MB limit.'); return; }
      const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
      if (!allowed.includes(f.type)) { setErrorMsg('File type not allowed. Use PDF, DOCX, JPG, or PNG.'); return; }
      setFile(f);
      setErrorMsg('');
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!category || !name.trim() || !email.trim() || !message.trim()) { setErrorMsg('Please fill in all required fields.'); return; }
      setStatus('loading');
      setErrorMsg('');
      const fd = new FormData();
      fd.append('category', category);
      fd.append('name', name.trim());
      fd.append('email', email.trim());
      fd.append('message', message.trim());
      if (file) fd.append('file', file);
      try {
        const apiBase = window.__apiBase || '';
        const res = await fetch(apiBase + '/api/v1/inquiries', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok) { setStatus('success'); setName(''); setEmail(''); setMessage(''); setFile(null); if (fileRef.current) fileRef.current.value = ''; }
        else { setErrorMsg(data.error || 'Something went wrong. Please try again.'); setStatus('idle'); }
      } catch { setErrorMsg('Network error. Please check your connection and try again.'); setStatus('idle'); }
    };

    const removeFile = () => { setFile(null); if (fileRef.current) fileRef.current.value = ''; };

    if (status === 'success') {
      return (
        <section id="inquiry" className="co-inquiry-section" style={{ position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, opacity: 0.028, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '200px', pointerEvents: 'none', zIndex: 0 }} />
          <div className="wrap" style={{ padding: '80px var(--container-pad)', textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <span className="co-success-check" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 'var(--radius-pill)', background: 'var(--action)', color: 'var(--color-text-inverse)', marginBottom: 20 }}>
              <Icon name="check" size={28} />
            </span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--type-h2-split-size, 40px)', fontWeight: 700, lineHeight: 1.08, color: 'var(--color-text-ink)', margin: 0 }}>Inquiry submitted.</h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--type-body-large-size, 18px)', lineHeight: 1.6, color: 'var(--text-body)', maxWidth: '46ch', margin: '14px auto 0' }}>
              Thank you for reaching out. Our team will review your inquiry and get back to you within 24-48 hours.
            </p>
            <div style={{ marginTop: 28 }}>
              <Button as="a" href="#company-top" variant="secondary-on-light" size="lg" onClick={() => setStatus('idle')}>
                Send another inquiry
              </Button>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section id="inquiry" className="co-inquiry-section" style={{ position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, opacity: 0.028, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '200px', pointerEvents: 'none', zIndex: 0 }} />
        <div className="wrap" style={{ padding: '80px var(--container-pad)', position: 'relative', zIndex: 1 }}>
          <div className="co-inquiry-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 40%) minmax(0, 60%)', gap: 56, alignItems: 'start' }}>
            <div style={{ position: 'relative' }}>
              <div aria-hidden="true" className="co-inquiry-accent" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2, background: 'linear-gradient(180deg, var(--action) 0%, var(--decor-numeral) 100%)', opacity: 0.6 }} />
              <div className="co-inquiry-left" style={{ paddingLeft: 24 }}>
                <Eyebrow style={{ marginBottom: 16 }}>Get in touch</Eyebrow>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--type-h2-split-size, 40px)', fontWeight: 700, lineHeight: 1.08, color: 'var(--color-text-ink)', maxWidth: '18ch', margin: 0 }}>
                  Start a conversation.
                </h2>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: 1.55, color: 'var(--text-body)', maxWidth: '36ch', marginTop: 18 }}>
                  Choose a category, tell us about yourself, and we will route your inquiry to the right person on our team.
                </p>
                <div style={{ display: 'grid', gap: 16, marginTop: 32 }}>
                  {[['mail', 'Quick response', 'You will hear back within 24-48 hours'], ['shield-check', 'Secure and private', 'Your data is handled securely'], ['paperclip', 'Attachments welcome', 'Attach a CV or supporting document']].map(([icon, title, desc]) => (
                    <div key={icon} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--action-wash)', color: 'var(--action)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name={icon} size={16} />
                      </span>
                      <div>
                        <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--color-text-ink)' }}>{title}</span>
                        <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-quiet)', marginTop: 2 }}>{desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="co-inquiry-card">
            <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
              {/* Category pills */}
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--color-text-ink)', marginBottom: 10, letterSpacing: '0.01em' }}>
                  What can we help with? <span style={{ color: 'var(--action)' }}>*</span>
                </label>
                <div className="co-cat-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {CATEGORY_OPTIONS.map((o) => {
                    const active = category === o.value;
                    const flashing = catFlash && active;
                    return (
                      <button key={o.value} type="button" className={'co-cat-pill' + (active ? ' active' : '') + (flashing ? ' flash' : '')} onClick={() => setCategory(o.value)}>
                        <Icon name={CATEGORY_ICONS[o.value]} size={14} />
                        <span>{o.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name + Email */}
              <div className="co-name-email" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--color-text-ink)', marginBottom: 6 }}>Full name <span style={{ color: 'var(--action)' }}>*</span></label>
                  <input type="text" className="co-inquiry-input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--color-text-ink)', marginBottom: 6 }}>Email <span style={{ color: 'var(--action)' }}>*</span></label>
                  <input type="email" className="co-inquiry-input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>

              {/* Message with counter */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <label style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--color-text-ink)' }}>Message <span style={{ color: 'var(--action)' }}>*</span></label>
                  {charCount > 400 && <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: charCount > 800 ? 'var(--action)' : 'var(--text-quiet)' }}>{charCount}/5000</span>}
                </div>
                <textarea className="co-inquiry-textarea" placeholder="Tell us what you are looking for..." value={message} onChange={(e) => setMessage(e.target.value)} maxLength={5000} required />
              </div>

              {/* File upload with drag-and-drop */}
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--color-text-ink)', marginBottom: 6 }}>
                  Attachment <span style={{ color: 'var(--text-quiet)', fontWeight: 400 }}>(optional)</span>
                </label>
                {file ? (
                  <div className="co-file-label has-file">
                    <Icon name="file-text" size={18} style={{ color: 'var(--action)', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-text-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-quiet)', flexShrink: 0 }}>{(file.size / 1024).toFixed(0)} KB</span>
                    <button type="button" onClick={removeFile} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 'var(--radius-pill)', border: 'none', background: 'rgba(194,65,12,0.1)', color: 'var(--action)', cursor: 'pointer', flexShrink: 0, padding: 0 }}>
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ) : (
                  <label
                    className={'co-file-label' + (dragOver ? ' co-file-drag' : '')}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                    style={{ cursor: 'pointer' }}
                  >
                    <Icon name="upload" size={18} style={{ color: dragOver ? 'var(--action)' : 'var(--text-quiet)', transition: 'color 150ms ease' }} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: dragOver ? 'var(--action)' : 'var(--text-body)', transition: 'color 150ms ease' }}>
                      {dragOver ? 'Drop your file here' : 'Upload CV, portfolio, or document'}
                    </span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-quiet)', marginLeft: 'auto' }}>PDF, DOCX, JPG, PNG (10MB max)</span>
                    <input ref={fileRef} type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files && e.target.files[0])} />
                  </label>
                )}
              </div>

              {errorMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(178,58,42,0.06)', border: '1px solid rgba(178,58,42,0.18)' }}>
                  <Icon name="alert-circle" size={16} style={{ color: '#B23A2A', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#B23A2A' }}>{errorMsg}</span>
                </div>
              )}

              <div>
                <button type="submit" className={'co-submit-btn' + (status === 'loading' ? ' loading' : '')} disabled={status === 'loading'}>
                  {status === 'loading' ? (<><span className="co-spinner" />Submitting...</>) : 'Submit inquiry'}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}>
                  <Icon name="lock" size={13} style={{ color: 'var(--text-quiet)' }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-quiet)', fontWeight: 400 }}>Your data is encrypted and secure</span>
                </div>
              </div>
            </form>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ================================================================
     CLOSING CTA — with constellation backdrop
     ================================================================ */
  function CompanyClosingCta() {
    return (
      <section className="om-tex om-tex-ink om-glow" style={{ background: 'var(--surface-dark)' }}>
        <div className="wrap" style={{ padding: '112px var(--container-pad)', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--type-h2-size, 48px)', fontWeight: 700, lineHeight: 1.05, color: 'var(--text-on-dark)', maxWidth: '22ch', margin: '0 auto' }}>
            Your next opportunity is waiting.
          </h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--type-body-large-size, 18px)', lineHeight: 1.6, color: 'rgba(255,249,244,0.72)', maxWidth: '48ch', margin: '18px auto 0' }}>
            Browse thousands of verified scholarships, internships, jobs, and funded programmes from around the world.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
            <Button as="a" href="/auth/register" size="lg">Get started</Button>
            <Button as="a" href="/opportunities" variant="secondary-on-ink" size="lg">Browse opportunities</Button>
          </div>
        </div>
      </section>
    );
  }

  window.OMCO = { CompanyHero, MissionSection, GlobalReachMap, WorkWithUsSection, InquirySection, CompanyClosingCta, ROLE_TO_CATEGORY };
})();
