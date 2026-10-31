/* Network hub illustration, rebuilt from the locked OppDate Network Hub spec (v2.2).
   Geometry, colours, shadows and animation timings are reproduced verbatim; the map dots
   and connecting lines are generated once on mount, exactly as the source build did. */
const HUB_MARK = (window.__resources && window.__resources.monogram) || 'assets/oppdate-monogram.png';

const HUB_NODES = [
  { label: 'Scholarships', icon: 'graduation-cap', left: 14, top: 30 },
  { label: 'Admissions', icon: 'school', left: 42, top: 18 },
  { label: 'Jobs', icon: 'briefcase', left: 74, top: 22 },
  { label: 'Fellowships', icon: 'award', left: 90, top: 46 },
  { label: 'Grants', icon: 'hand-coins', left: 20, top: 62 },
  { label: 'Internships', icon: 'id-card', left: 48, top: 82 },
  { label: 'Volunteering', icon: 'hand-heart', left: 78, top: 74 },
  { label: 'Programs', icon: 'layers', left: 10, top: 80 },
];

const HUB_BLOBS = [
  { cx: 18, cy: 32, rx: 14, ry: 12, density: 1.0 },
  { cx: 22, cy: 46, rx: 4, ry: 3, density: 0.9 },
  { cx: 28, cy: 64, rx: 7, ry: 14, density: 1.0 },
  { cx: 51, cy: 28, rx: 7, ry: 6, density: 1.1 },
  { cx: 53, cy: 44, rx: 9, ry: 6, density: 0.95 },
  { cx: 56, cy: 58, rx: 8, ry: 11, density: 1.0 },
  { cx: 62, cy: 38, rx: 5, ry: 4, density: 0.9 },
  { cx: 72, cy: 44, rx: 5, ry: 6, density: 1.0 },
  { cx: 80, cy: 36, rx: 9, ry: 7, density: 1.05 },
  { cx: 81, cy: 52, rx: 6, ry: 4, density: 0.95 },
  { cx: 86, cy: 72, rx: 7, ry: 5, density: 1.0 },
  { cx: 94, cy: 78, rx: 2, ry: 2, density: 0.9 },
];

function hubMapDots() {
  const step = 1.6;
  const dots = [];
  for (let y = 8; y <= 92; y += step) {
    for (let x = 4; x <= 96; x += step) {
      for (const b of HUB_BLOBS) {
        const nx = (x - b.cx) / b.rx, ny = (y - b.cy) / b.ry;
        if (nx * nx + ny * ny < 1) {
          if (Math.random() > 0.18 * b.density) break;
          dots.push({ x: x + (Math.random() - 0.5) * 0.6, y: y + (Math.random() - 0.5) * 0.6, r: 0.32 + Math.random() * 0.18 });
          break;
        }
      }
    }
  }
  return dots;
}

function hubPath(left, top) {
  const dx = 50 - left, dy = 50 - top;
  const midX = (left + 50) / 2 + dy * 0.1;
  const midY = (top + 50) / 2 - dx * 0.1;
  return 'M ' + left + ' ' + top + ' Q ' + midX + ' ' + midY + ' 50 50';
}

function NetworkHub({ style }) {
  const { Icon } = window.OppDateDesignSystem_4aa598;
  /* Entrance: hub first, then the pills bloom outward in listed order, then the lines
     brighten. Hovering a pill lifts it and lights only its own connector. */
  const [ref, inView] = window.useInView({ threshold: 0.25 });
  const [hot, setHot] = React.useState(-1);
  /* Generated once per mount: the scatter is intentionally non-deterministic, but it must
     not re-roll on every render. */
  const dots = React.useMemo(hubMapDots, []);
  const lines = React.useMemo(() => HUB_NODES.map((n) => ({ d: hubPath(n.left, n.top), delay: (Math.random() * -2.4) + 's' })), []);
  return (
    <div ref={ref} className={'hero-visual' + (inView ? ' in' : '')} aria-hidden="true" style={style}>
      <svg className="bg-map" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#C9B89D" />)}
      </svg>
      <svg className="lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        {lines.map((l, i) => <path key={'b' + i} d={l.d} stroke={hot === i ? '#B5520F' : '#C4A882'} strokeWidth={hot === i ? 1.1 : 0.85} fill="none" opacity={hot === i ? 0.85 : 0.6} strokeLinecap="round" />)}
        {lines.map((l, i) => <path key={'f' + i} className="flow" d={l.d} stroke={hot === i ? '#8E3F05' : '#A78A66'} strokeWidth={hot === i ? 1.5 : 1.1} fill="none" opacity="0.85" strokeLinecap="round" style={{ animationDelay: l.delay, animationDuration: hot === i ? '1.2s' : '2.4s' }} />)}
      </svg>
      <div className="hub"><img src={HUB_MARK} alt="" /></div>
      {HUB_NODES.map((n, i) => (
        <div key={n.label} className="node" onMouseEnter={() => setHot(i)} onMouseLeave={() => setHot(-1)} style={{ left: n.left + '%', top: n.top + '%', transitionDelay: (0.18 + i * 0.07) + 's' }}>
          <span className="nico"><Icon name={n.icon} size={14} strokeWidth={2} /></span>
          {n.label}
        </div>
      ))}
    </div>
  );
}

window.OM = Object.assign(window.OM || {}, { NetworkHub });
