/* Contact page sections - Work With Us bento grid + inquiry form.
   Registered to window.OMCQ for the mount script. */
(function () {
  const { Eyebrow, Icon, Button, LinkArrow } = window.OppDateDesignSystem_4aa598;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

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

  const ROLES = [
    { id: 'careers', icon: 'briefcase', title: 'Careers', body: 'Join the team building the future of opportunity access. We are always looking for passionate people who believe in our mission.', cta: 'View open roles' },
    { id: 'get-featured', icon: 'star', title: 'Get Featured', body: 'Put your scholarship, grant, or programme in front of thousands of driven applicants on OppDate.', cta: 'Submit your listing' },
    { id: 'partner', icon: 'handshake', title: 'Partner With Us', body: 'Universities, NGOs, and companies looking to expand their reach. Let us build a pipeline of qualified, motivated applicants for your programmes.', cta: 'Explore partnerships' },
    { id: 'consultant', icon: 'graduation-cap', title: 'Become a Consultant', body: 'You have deep expertise in applications, admissions, or career strategy. Offer 1-on-1 consultation sessions through our platform.', cta: 'Apply as consultant' },
    { id: 'mentor', icon: 'heart-handshake', title: 'Become a Mentor', body: 'Guide the next generation through the application process. Share your experience, review documents, and help people land their dream opportunities.', cta: 'Apply as mentor' },
    { id: 'list-ebook', icon: 'book-open', title: 'List Your eBook', body: 'Publish and sell your guides on scholarships, visa processes, or career strategy to a global audience on OppDate.', cta: 'Start listing' },
  ];

  const ROLE_TO_CATEGORY = {
    'careers': 'careers',
    'get-featured': 'get-featured',
    'partner': 'partner-with-us',
    'consultant': 'become-a-consultant',
    'mentor': 'become-a-mentor',
    'list-ebook': 'list-your-ebook',
  };

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
              <Button as="button" variant="secondary-on-light" size="lg" onClick={() => setStatus('idle')}>
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
            <div className="co-inquiry-sticky">
              <div aria-hidden="true" className="co-inquiry-accent" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2, background: 'linear-gradient(180deg, var(--action) 0%, var(--decor-numeral) 100%)', opacity: 0.6 }} />
              <div className="co-inquiry-left" style={{ paddingLeft: 24 }}>
                <Eyebrow style={{ marginBottom: 16 }}>Get in touch</Eyebrow>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--type-h2-split-size, 40px)', fontWeight: 700, lineHeight: 1.08, color: 'var(--color-text-ink)', maxWidth: '18ch', margin: 0 }}>
                  Start a conversation.
                </h2>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: 1.55, color: 'var(--text-body)', maxWidth: '36ch', marginTop: 18 }}>
                  Choose a category, tell us about yourself, and we will route your inquiry to the right person on our team.
                </p>

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

  window.OMCQ = { WorkWithUsSection, ROLE_TO_CATEGORY, InquirySection };
})();
