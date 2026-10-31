const { Button, Eyebrow, Icon, Card, AccordionRow, IllustrationSlot, LinkArrow, Footer, Badge } = window.OppDateDesignSystem_4aa598;
const CONSULT_MARK = (window.__resources && window.__resources.monogram) || 'assets/oppdate-monogram.png';

/* Hero: white zone, centred, light dot texture masked out below the fold line. The one to one
   promise carries the page, so the hero holds copy and the two actions only. */
function ConsultHero() {
  return (
    <section id="consult-top" className="om-tex om-tex-light" style={{ background: 'var(--surface-card)' }}>
      <div className="wrap" style={{ padding: '64px var(--container-pad) 88px', textAlign: 'center' }}>
        <Eyebrow style={{ marginBottom: 18 }}>Consultations</Eyebrow>
        <h1 style={{ margin: '0 auto', maxWidth: '20ch', fontSize: 'clamp(36px, 4.2vw, 58px)' }}>Private one-to-one sessions <span style={{ color: 'var(--decor-numeral)' }}>tailored to you</span>.</h1>
        <p style={{ margin: '22px auto 0', maxWidth: '52ch', fontSize: 'var(--type-body-large-size)', lineHeight: 'var(--type-body-large-leading)', color: 'var(--text-body)' }}>
          Equipping you with clarity, strategic direction, and an actionable plan. Booked by the hour, with someone who has read your file first.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 32 }}>
          <Button as="button" onClick={() => document.getElementById('tiers').scrollIntoView({ behavior: 'smooth', block: 'start' })}>Book a consultation</Button>
        </div>
      </div>
    </section>
  );
}

const CONSULT_STEPS = [
  { i: '01', icon: 'timer', title: 'Choose a session', body: 'Thirty, sixty or ninety minutes, depending on how much ground you need to cover.' },
  { i: '02', icon: 'calendar-check', title: 'Pick a date & time', body: 'Availability is live, so every slot you can see is a slot you can actually take.' },
  { i: '03', icon: 'video', title: 'Get your link', body: 'Your consultant reads your file before the call, and the session link arrives with the confirmation.' },
];

function ConsultHow() {
  return (
    <section id="how" style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--line)' }}>
      <div className="wrap" style={{ padding: '80px var(--container-pad)' }}>
        <Eyebrow style={{ marginBottom: 16 }}>How it works</Eyebrow>
        <h2 style={{ maxWidth: '22ch' }}>Three steps from booking to call.</h2>
        <div className="consult-steps" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 20, marginTop: 44 }}>
          {CONSULT_STEPS.map((s) => (
            <div key={s.i} data-reveal style={{ padding: 28, borderRadius: 'var(--radius-lg)', background: 'var(--surface-card)', border: '1px solid var(--line)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ flex: 'none', width: 44, height: 44, borderRadius: 'var(--radius-pill)', background: 'var(--action-wash)', color: 'var(--action)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={s.icon} size={21} /></span>
                <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 15, letterSpacing: '0.04em', color: 'var(--decor-numeral)' }}>{s.i}</span>
              </span>
              <h3 style={{ marginTop: 18, fontSize: 21 }}>{s.title}</h3>
              <p style={{ marginTop: 10, fontSize: 15.5, lineHeight: 1.6, color: 'var(--text-body)' }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Groups sessions: sessions sharing a groupKey become duration variants of one card.
// Sessions without a groupKey render as standalone cards.
function groupSessions(sessions) {
  const groups = [];
  const seen = {};
  for (const s of sessions) {
    if (s.groupKey) {
      if (!seen[s.groupKey]) {
        seen[s.groupKey] = { key: s.groupKey, variants: [] };
        groups.push(seen[s.groupKey]);
      }
      seen[s.groupKey].variants.push(s);
    } else {
      groups.push({ key: s.id, variants: [s] });
    }
  }
  return groups;
}

function SessionGroupCard({ group }) {
  const variants = group.variants.slice().sort((a, b) => a.durationMinutes - b.durationMinutes);
  const [picked, setPicked] = React.useState(variants[0].id);
  const pickedVariant = variants.find(v => v.id === picked) || variants[0];
  // Use the shortest-duration variant's title and description as the card header
  const lead = variants[0];

  return (
    <div className="consult-card" data-reveal style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,320px)', gap: 44, padding: 36, borderRadius: 'var(--radius-lg)', background: 'var(--surface-card)', border: '1px solid var(--line)', alignItems: 'start' }}>
      <div>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 26, color: 'var(--color-text-ink)' }}>{lead.title.replace(/\s*[-–]\s*(Quick Check|Full Review|Comprehensive Session|Comprehensive)$/i, '')}</span>
          <span style={{ padding: '5px 11px', borderRadius: 'var(--radius-pill)', background: 'var(--action-wash)', color: 'var(--action)', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>1-on-1</span>
        </span>
        {lead.description && (
          <p style={{ fontSize: 'var(--type-body-large-size)', lineHeight: 'var(--type-body-large-leading)', color: 'var(--text-body)' }}>{lead.description}</p>
        )}
      </div>
      <div>
        {variants.length > 1 && (
          <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-quiet)', marginBottom: 12 }}>Select duration</span>
        )}
        <div style={{ display: 'grid', gap: 10 }}>
          {variants.map((v) => {
            const on = picked === v.id;
            const fee = (v.priceUsd / 100).toFixed(0);
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setPicked(v.id)}
                aria-pressed={on}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '14px 18px', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', background: on ? 'var(--action-wash)' : 'var(--surface-card)', border: '1.5px solid ' + (on ? 'var(--action)' : 'var(--line)'), transition: 'background-color var(--duration-fast) var(--ease-out-soft), border-color var(--duration-fast) var(--ease-out-soft)' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{ flex: 'none', width: 16, height: 16, borderRadius: 999, border: '1.5px solid ' + (on ? 'var(--action)' : 'var(--line-strong)'), background: on ? 'var(--action)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-inverse)' }}>
                    {on && <Icon name="check" size={10} strokeWidth={3} />}
                  </span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--color-text-ink)' }}>{v.durationMinutes} min</span>
                </span>
                <span style={{ flex: 'none', fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 17, color: 'var(--color-text-ink)' }}>${fee}</span>
              </button>
            );
          })}
        </div>
        <span style={{ display: 'block', marginTop: 16 }}>
          <Button as="a" href={'/services/consultations/book?session=' + pickedVariant.id} size="lg" style={{ width: '100%' }}>
            Book this session
          </Button>
        </span>
        <p style={{ marginTop: 12, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-quiet)', margin: '12px 0 0' }}>Price shown at checkout before payment.</p>
      </div>
    </div>
  );
}

function ConsultTiers() {
  const [sessions, setSessions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const base = (window.__apiBase || '').replace(/\/$/, '');
    fetch(base + '/api/v1/consultations/sessions')
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json && json.data && json.data.length) {
          setSessions(json.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const groups = groupSessions(sessions);

  return (
    <section id="tiers" style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--line)' }}>
      <div className="wrap" style={{ padding: '80px var(--container-pad)' }}>
        <Eyebrow style={{ marginBottom: 16 }}>Sessions</Eyebrow>
        <h2 style={{ maxWidth: '24ch' }}>Book a session with an expert.</h2>
        {loading ? (
          <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2].map(i => (
              <div key={i} style={{ height: 140, borderRadius: 'var(--radius-lg)', background: 'var(--surface-hover)', border: '1px solid var(--line)', animation: 'om-shimmer 1.4s ease-in-out infinite' }} />
            ))}
          </div>
        ) : groups.length > 0 ? (
          <>
            <div style={{ display: 'grid', gap: 20, marginTop: 36 }}>
              {groups.map((g) => <SessionGroupCard key={g.key} group={g} />)}
            </div>
            <p style={{ marginTop: 22, fontFamily: 'var(--font-sans)', fontSize: 14.5, color: 'var(--text-quiet)' }}>More sessions will be added as the roster grows.</p>
          </>
        ) : null}
      </div>
    </section>
  );
}

function ConsultTrust() {
  return (
    <section style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--line)' }}>
      <div className="wrap split" style={{ padding: '80px var(--container-pad)', display: 'grid', gridTemplateColumns: 'minmax(0,46%) minmax(0,54%)', gap: 56, alignItems: 'center' }}>
        <div>
          <Eyebrow style={{ marginBottom: 16 }}>Who you speak to</Eyebrow>
          <h2 style={{ fontSize: 'var(--type-h2-split-size)', lineHeight: 'var(--type-h2-split-leading)', maxWidth: '20ch' }}>Someone who has read your file first.</h2>
          <p style={{ marginTop: 20, color: 'var(--text-body)', maxWidth: '44ch', fontSize: 'var(--type-body-large-size)', lineHeight: 'var(--type-body-large-leading)' }}>
            Consultants are matched to your field and receive your profile, documents and shortlist before the call. The session starts with your situation, not with an introduction.
          </p>
          <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
            {[['file-search', 'Your file is reviewed in advance'], ['target', 'Matched to your field and region'], ['list-checks', 'You leave with written action points']].map(([icon, label]) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ flex: 'none', width: 30, height: 30, borderRadius: 999, background: 'var(--action-wash)', color: 'var(--action)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={16} /></span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15.5, color: 'var(--color-text-ink)' }}>{label}</span>
              </span>
            ))}
          </div>
        </div>
        <img className="split-visual consult-shot" src={(window.__resources && window.__resources.consultations) || 'assets/consultations.jpg'} alt="An applicant on a one to one video consultation at her desk" />
      </div>
    </section>
  );
}

const CONSULT_FAQS = [
  ['How do I book a session?', 'Choose a session length, then pick a slot from live availability. Booking is confirmed once payment goes through, and the session link arrives with the confirmation.', 'calendar-check'],
  ['Can I reschedule?', 'Yes. Move a session from the booking in your dashboard up to 24 hours before it starts, and pick any open slot from the same availability.', 'refresh-cw'],
  ['What happens after the session?', 'Your consultant records the agreed next steps against your profile, so the plan is in the same place as your applications and documents.', 'activity'],
  ['Do sessions include a written follow-up?', 'Sixty and ninety minute sessions include written action points after the call. Thirty minute sessions are focused on one question, and the follow-up is the session itself.', 'file-text'],
];

function ConsultFaq() {
  const [open, setOpen] = React.useState(0);
  return (
    <section style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--line)' }}>
      <div className="wrap split" style={{ padding: '80px var(--container-pad)', display: 'grid', gridTemplateColumns: 'minmax(0,36%) minmax(0,64%)', gap: 56, alignItems: 'start' }}>
        <div>
          <Eyebrow style={{ marginBottom: 16 }}>Questions</Eyebrow>
          <h2 style={{ fontSize: 'var(--type-h2-split-size)', lineHeight: 'var(--type-h2-split-leading)' }}>About consultations.</h2>
          <p style={{ marginTop: 20, color: 'var(--text-body)', maxWidth: '32ch' }}>If something here is unclear, ask the team before you book.</p>
          <div style={{ marginTop: 16 }}><LinkArrow href="/auth/register">Contact support</LinkArrow></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CONSULT_FAQS.map(([t, b, icon], i) => (
            <AccordionRow key={t} title={t} body={b} icon={icon} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ConsultClosing() {
  return (
    <section id="start" className="om-tex om-tex-ink om-glow" style={{ background: 'var(--surface-dark)' }}>
      <div className="wrap" style={{ padding: '112px var(--container-pad)', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-on-dark)', maxWidth: '24ch', margin: '0 auto' }}>One hour with the right expert saves you months of guessing.</h2>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }}>
          <Button as="button" onClick={() => document.getElementById('tiers').scrollIntoView({ behavior: 'smooth', block: 'start' })}>Book a session</Button>
        </div>
      </div>
    </section>
  );
}

function ConsultBottom() {
  return (
    <div>
      <ConsultTrust />
      <ConsultFaq />
      <ConsultClosing />
      <div style={{ position: 'relative', background: 'var(--surface-dark)', isolation: 'isolate' }}>
        {window.OM && window.OM.FooterWatermark ? <window.OM.FooterWatermark /> : null}
        <Footer markSrc={CONSULT_MARK} columns={(window.OM && window.OM.FOOTER_COLS) || []} style={{ background: 'transparent', position: 'relative', zIndex: 1 }} />
      </div>
    </div>
  );
}

window.OMC = Object.assign(window.OMC || {}, { ConsultHero, ConsultHow, ConsultTiers, ConsultTrust, ConsultFaq, ConsultClosing, ConsultBottom, CONSULT_MARK });
