const { Card, Badge, Eyebrow, Icon, LinkArrow } = window.OppDateDesignSystem_4aa598;

/* Eligibility detail: the questions the assistant asks are generated from the listing, so the
   panel shows a short conversational run rather than a static requirement list. */
function EligibilityDetail() {
  const qs = ['Which degree are you currently enrolled in?', 'Have you completed at least two years of study?', 'Do you hold citizenship in an eligible country?'];
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {qs.map((q, i) =>
      <div key={q} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'var(--surface-band)', border: '1px solid var(--line)' }}>
          <span style={{ flex: 'none', width: 24, height: 24, borderRadius: 999, background: 'var(--action-wash)', color: 'var(--action)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.5, color: 'var(--color-text-ink)' }}>{q}</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 18px', borderRadius: 'var(--radius-md)', background: 'var(--action)', color: 'var(--text-on-dark)' }}>
        <span style={{ flex: 'none', marginTop: 1 }}><Icon name="compass" size={18} /></span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.55 }}>If you do not qualify, the check returns opportunities you do qualify for in the same session, drawn from the same field, region and funding filters.</span>
      </div>
    </div>);

}

const DOC_STATES = [
{ label: 'Ready', note: 'Pulled straight from your credential library', dot: 'var(--action)' },
{ label: 'Needs refinement', note: 'We tighten what you already have', dot: 'var(--color-accent-gold)' },
{ label: 'Needs creation', note: 'Written from scratch with you', dot: 'var(--line-strong)' }];


function DocumentsDetail() {
  const rows = [['CV', 0], ['Statement of purpose', 1], ['Two references', 2], ['Transcript', 0]];
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {rows.map(([doc, s]) =>
      <div key={doc} className="apply-doc-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 18px', borderRadius: 'var(--radius-md)', background: 'var(--surface-band)', border: '1px solid var(--line)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <Icon name="file-text" size={17} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--color-text-ink)' }}>{doc}</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flex: 'none' }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: DOC_STATES[s].dot }} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--text-quiet)' }}>{DOC_STATES[s].label}</span>
          </span>
        </div>
      )}
      <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
        {DOC_STATES.map((s) =>
        <span key={s.label} className="apply-doc-key" style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', alignItems: 'baseline', columnGap: 10, rowGap: 2, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-quiet)' }}>
            <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--color-text-ink)', whiteSpace: 'nowrap' }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: s.dot, flex: 'none' }} />
              {s.label}
            </strong>
            <span>{s.note}</span>
          </span>
        )}
      </div>
    </div>);

}

function PaymentDetail() {
  const lines = [
    ['OppDate Service Fee', 'Preparing and optimizing your complete application package', 'per listing'],
    ['Institution Application Fee', 'Added exactly as the institution charges it', 'when applicable'],
  ];
  return (
    <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', overflow: 'hidden' }}>
      {lines.map(([l, note, tag], i) =>
      <div key={l} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, padding: '16px 18px', borderBottom: '1px solid var(--line)', background: 'var(--surface-card)' }}>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: i === 0 ? 'var(--color-text-ink)' : 'var(--text-quiet)' }}>{l}</span>
            <span style={{ display: 'block', marginTop: 4, fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--text-quiet)' }}>{note}</span>
          </span>
          <span style={{ flex: 'none', padding: '4px 10px', borderRadius: 'var(--radius-pill)', background: i === 0 ? 'var(--action-wash)' : 'var(--surface-band)', border: i === 0 ? 'none' : '1px solid var(--line)', fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: i === 0 ? 'var(--action)' : 'var(--text-quiet)' }}>{tag}</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, padding: '16px 18px', background: 'var(--surface-band)' }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 17, color: 'var(--color-text-ink)' }}>Total, shown before you pay</span>
        <Icon name="equal" size={18} />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 18px', background: 'var(--action-wash)' }}>
        <span style={{ flex: 'none', marginTop: 1, color: 'var(--action)' }}><Icon name="pen-line" size={17} /></span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14.5, lineHeight: 1.55, color: 'var(--color-text-ink)' }}>Final consent is granted here.</span>
      </div>
    </div>);

}

const RECEIVED_STATUSES = ['Payment confirmed', 'In preparation', 'Under review', 'Submitted'];

function ReceivedDetail() {
  /* The status track advances one stage per beat and loops, so the panel reads as a process in
     motion rather than a frozen first stage. Paused for reduced-motion users. */
  const [stage, setStage] = React.useState(0);
  React.useEffect(() => {
    if (window.REDUCED && window.REDUCED.matches) return;
    const id = setInterval(() => setStage((s) => (s + 1) % (RECEIVED_STATUSES.length + 1)), 1100);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 18px', borderRadius: 'var(--radius-md)', background: 'var(--surface-dark)', color: 'var(--text-on-dark)' }}>
        <span style={{ flex: 'none', width: 30, height: 30, borderRadius: 999, background: 'var(--action)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="message-circle" size={16} /></span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.55 }}>A private thread opens automatically, and an automated first message confirms your application has been received. Everything after this happens in that thread.</span>
      </div>
      <div className="apply-statuses" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {RECEIVED_STATUSES.map((s, i) =>
        <span key={s} style={{ display: 'grid', gap: 8 }}>
            <span style={{ height: 4, borderRadius: 999, background: 'var(--action-wash)', overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', borderRadius: 999, background: 'var(--action)', transformOrigin: 'left center', transform: i < stage ? 'scaleX(1)' : 'scaleX(0)', transition: stage === 0 ? 'none' : 'transform .55s var(--ease-out-soft)' }} />
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600, color: i < stage ? 'var(--action)' : 'var(--text-quiet)', transition: stage === 0 ? 'none' : 'color .55s var(--ease-out-soft)' }}>{s}</span>
          </span>
        )}
      </div>
    </div>);

}

const FLOW = [
{ i: '01', icon: 'shield-check', title: 'Eligibility check', body: "A conversational assistant reads the requirements the listing publishes and asks only the questions those requirements depend on, so the answer is specific to that opportunity.", Detail: EligibilityDetail },
{ i: '02', icon: 'files', title: 'Document review', body: 'You mark each required document Ready, Needs refinement, or Needs creation. Documents already in your credential library are attached automatically, so nothing is uploaded twice.', Detail: DocumentsDetail },
{ i: '03', icon: 'receipt', title: 'Payment and authorization', body: 'The fees and the total are shown in full before you pay. You sign the Representation Authorization Agreement in this step, which authorizes us to prepare and, where permitted, submit your application.', Detail: PaymentDetail },
{ i: '04', icon: 'inbox', title: 'Received by the team', body: 'Your application reaches the team and a private thread opens immediately. Status banners move from Payment Confirmed through Submitted, so the current stage is always visible.', Detail: ReceivedDetail }];


/* Scroll-linked rail, same principle as the landing page's How it works: the fill tracks the
   reading line down the section, and each step's badge lights when the fill reaches it. */
function ApplyFlow() {
  const wrapRef = React.useRef(null);
  const badgeRefs = React.useRef([]);
  const [rail, setRail] = React.useState({ top: 0, height: 0, fill: 0, centers: [] });
  React.useLayoutEffect(() => {
    const measure = () => {
      const wrap = wrapRef.current;
      const els = badgeRefs.current.filter(Boolean);
      if (!wrap || els.length < 2) return;
      const wrapTop = wrap.getBoundingClientRect().top + window.scrollY;
      const centers = els.map((el) => {
        const r = el.getBoundingClientRect();
        return r.top + window.scrollY + r.height / 2 - wrapTop;
      });
      const top = centers[0];
      const height = centers[centers.length - 1] - top;
      const line = window.scrollY + window.innerHeight * 0.5 - wrapTop;
      setRail({ top, height, fill: Math.max(0, Math.min(height, line - top)), centers });
    };
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {window.removeEventListener('scroll', measure);window.removeEventListener('resize', measure);};
  }, []);
  const reached = (n) => rail.centers.length === FLOW.length && rail.top + rail.fill >= rail.centers[n] - 1;
  return (
    <section id="flow" style={{ background: 'var(--surface-card)' }}>
      <div className="wrap" style={{ padding: '88px var(--container-pad)' }}>
        <Eyebrow style={{ marginBottom: 16 }}>The flow</Eyebrow>
        <h2 style={{ maxWidth: '24ch' }}>How an application moves through OppDate Apply.</h2>
        <div ref={wrapRef} style={{ position: 'relative', marginTop: 56 }}>
          <div className="apply-rail" style={{ position: 'absolute', left: 27, top: rail.top, height: rail.height, width: 2, background: 'var(--line)', borderRadius: 2 }} />
          <div className="apply-rail" style={{ position: 'absolute', left: 27, top: rail.top, height: rail.fill, width: 2, background: 'var(--action)', borderRadius: 2 }} />
          {FLOW.map((s, n) =>
          <div key={s.i} className="apply-step" style={{ position: 'relative', display: 'grid', gridTemplateColumns: '56px minmax(0,1fr)', gap: 28, paddingBottom: n === FLOW.length - 1 ? 0 : 56 }}>
              <span ref={(el) => badgeRefs.current[n] = el} style={{ position: 'relative', zIndex: 1, width: 56, height: 56, borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: reached(n) ? 'var(--action)' : 'var(--surface-card)', color: reached(n) ? 'var(--color-text-inverse)' : 'var(--text-quiet)', border: '1.5px solid ' + (reached(n) ? 'var(--action)' : 'var(--line)'), transition: 'background-color .4s var(--ease-out-soft), color .4s var(--ease-out-soft), border-color .4s var(--ease-out-soft)' }}>
                <Icon name={s.icon} size={22} />
              </span>
              <div className="apply-step-body" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 40, alignItems: 'start' }}>
                <div>
                  <span style={{ display: 'block', fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 15, letterSpacing: '0.04em', color: 'var(--decor-numeral)' }}>{s.i}</span>
                  <h3 style={{ marginTop: 10, fontSize: 'var(--type-h3-size)', lineHeight: 1.25, maxWidth: '20ch' }}>{s.title}</h3>
                  <p style={{ marginTop: 14, fontSize: 16, lineHeight: 1.6, color: 'var(--text-body)', maxWidth: '46ch' }}>{s.body}</p>
                </div>
                <div data-reveal><s.Detail {...(n === 3 ? { 'data-comment-anchor': '0434a9a939-span-94-13' } : {})} /></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>);

}

window.OMA = Object.assign(window.OMA || {}, { ApplyFlow });