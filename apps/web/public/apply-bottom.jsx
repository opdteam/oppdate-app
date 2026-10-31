const { Button, Eyebrow, Icon, AccordionRow, IllustrationSlot, LinkArrow, Footer } = window.OppDateDesignSystem_4aa598;
const APPLY_FOOT_MARK = (window.__resources && window.__resources.monogram) || 'assets/oppdate-monogram.png';

/* Footer is the landing page's footer verbatim: same columns, same cursor-tracked watermark.
   Both come from landing-bottom.jsx so the two pages can never drift apart. */

function ApplySupport() {
  return (
    <section style={{ background: 'var(--surface-card)' }}>
      <div className="wrap split" style={{ padding: '80px var(--container-pad)', display: 'grid', gridTemplateColumns: 'minmax(0,44%) minmax(0,56%)', gap: 56, alignItems: 'center' }}>
        <div>
          <Eyebrow style={{ marginBottom: 16 }}>Ongoing support</Eyebrow>
          <h2 style={{ fontSize: 'var(--type-h2-split-size)', lineHeight: 'var(--type-h2-split-leading)', maxWidth: '18ch' }}>The thread is run by people.</h2>
          <p style={{ marginTop: 20, color: 'var(--text-body)', maxWidth: '42ch', fontSize: 'var(--type-body-large-size)', lineHeight: 'var(--type-body-large-leading)' }}>
            From step four onward, the OppDate team handles your application directly. They ask for what they need, report what they have done, and answer in the same place the application lives.
          </p>
          <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
            {[['users', 'Named team members you can reply to'], ['clock', 'Replies within the working day'], ['bell', 'A notification at every status change']].map(([icon, label]) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ flex: 'none', width: 30, height: 30, borderRadius: 999, background: 'var(--action-wash)', color: 'var(--action)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={16} /></span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15.5, color: 'var(--color-text-ink)' }}>{label}</span>
              </span>
            ))}
          </div>
        </div>
        <img className="split-visual apply-thread-shot" src={(window.__resources && window.__resources.messagingThread) || 'assets/messaging-thread.webp'} alt="The OppDate Apply messaging thread, showing the team's first message, an attached checklist, the applicant's replies with an uploaded CV, and an Awaiting your reply status" />
      </div>
    </section>
  );
}

function ApplyPricing() {
  const parts = [
    { icon: 'briefcase', title: 'OppDate Service Fee', body: "Our fee for preparing and optimizing your complete application package, including all required materials. This includes submission where permitted, or guided submission where it isn't. Fees are set per listing, based on scope" },
    { icon: 'building-2', title: 'Institution Application Fee', body: 'The fee charged by the institution to receive your application. For applications with a fee, this amount is added exactly as charged by them.' },
  ];
  return (
    <section id="pricing" style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--line)' }}>
      <div className="wrap" style={{ padding: '80px var(--container-pad)' }}>
        <Eyebrow style={{ marginBottom: 16 }}>Pricing</Eyebrow>
        <h2 style={{ maxWidth: '22ch' }}>Two fees. Both shown before you pay.</h2>
        <div className="apply-price" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 44 }}>
          {parts.map((p) => (
            <div key={p.title} data-reveal style={{ padding: 28, borderRadius: 'var(--radius-lg)', background: 'var(--surface-card)', border: '1px solid var(--line)' }}>
              <span style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--action-wash)', color: 'var(--action)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={p.icon} size={21} /></span>
              <h3 style={{ marginTop: 18, fontSize: 21 }}>{p.title}</h3>
              <p style={{ marginTop: 10, fontSize: 15.5, lineHeight: 1.6, color: 'var(--text-body)' }}>{p.body}</p>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 24, fontSize: 16, lineHeight: 1.6, color: 'var(--text-body)', maxWidth: '68ch' }}>
          Amounts vary by listing, so no figure is quoted here. In every case the fees and the total appear together at step three, and nothing is charged until you accept that total.
        </p>
      </div>
    </section>
  );
}

const APPLY_FAQS = [
  ['What happens if I am not eligible?', 'The eligibility step tells you before any payment. Instead of stopping there, you are shown opportunities you do qualify for, drawn from the same field, region and funding filters.', 'Check eligibility', 'shield-check'],
  ['How are my documents handled?', 'Documents come from your credential library and are used only for the application you authorized. Anything marked Needs refinement or Needs creation is worked on with you, and you review it before submission.', 'See the library', 'files'],
  ['What if a submission requires my institutional login?', 'Some portals only accept a submission from your own account. In those cases we prepare everything, guide you through the final submission in the thread, and confirm receipt afterwards.', 'Talk to the team', 'key-round'],
  ['Can I track everything in one place?', 'Yes. The application sits on your dashboard with its live status, and the thread holds every message, document and confirmation for it. There is no second system to check.', 'See the tracker', 'activity'],
];

function ApplyFaq() {
  const [open, setOpen] = React.useState(0);
  return (
    <section style={{ background: 'var(--surface-card)' }}>
      <div className="wrap split" style={{ padding: '80px var(--container-pad)', display: 'grid', gridTemplateColumns: 'minmax(0,36%) minmax(0,64%)', gap: 56, alignItems: 'start' }}>
        <div>
          <Eyebrow style={{ marginBottom: 16 }}>Questions</Eyebrow>
          <h2 style={{ fontSize: 'var(--type-h2-split-size)', lineHeight: 'var(--type-h2-split-leading)' }}>About OppDate Apply.</h2>
          <p style={{ marginTop: 20, color: 'var(--text-body)', maxWidth: '32ch' }}>If something here is unclear, ask the team before you start an application.</p>
          <div style={{ marginTop: 16 }}><LinkArrow href="/auth/register">Contact support</LinkArrow></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {APPLY_FAQS.map(([t, b, c, icon], i) => (
            <AccordionRow key={t} title={t} body={b} ctaLabel={c} ctaHref="#start" icon={icon} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ApplyClosing() {
  return (
    <section id="start" className="om-tex om-tex-ink om-glow" style={{ background: 'var(--surface-dark)' }}>
      <div className="wrap" style={{ padding: '112px var(--container-pad)', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-on-dark)', maxWidth: '22ch', margin: '0 auto' }}>Start an application with the team.</h2>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }}>
          <Button as="a" href="/auth/register">Get started</Button>
          <Button as="a" href="/opportunities" variant="secondary-on-ink">Browse opportunities</Button>
        </div>
      </div>
    </section>
  );
}

const TRACKS = [
  { letter: 'A', icon: 'package-check', title: 'Full Service Submission', who: 'We submit', body: 'Where permitted, we take full charge of the process and securely submit the finalized application directly on your behalf.', dark: true },
  { letter: 'B', icon: 'route', title: 'Guided Self Submission', who: 'You submit, we guide', body: 'If an organization strictly requires applicant only submissions, third-party uploads can negatively impact your outcome. For these destinations, we build your complete, submission ready package and guide you step-by-step through your personal final upload.' },
];

/* Two submission tracks, presented as a pair rather than a choice: the system selects the track,
   so the section states the rule first and then what each track means in practice. */
function ApplySubmission() {
  return (
    <section id="submission" style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--line)' }}>
      <div className="wrap" style={{ padding: '80px var(--container-pad)' }}>
        <div className="apply-sub-head" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,42%) minmax(0,58%)', gap: 48, alignItems: 'start' }}>
          <div>
            <Eyebrow style={{ marginBottom: 16 }}>Submission</Eyebrow>
            <h2 style={{ fontSize: 'var(--type-h2-split-size)', lineHeight: 'var(--type-h2-split-leading)', maxWidth: '18ch' }}>How your submission works.</h2>
          </div>
          <div>
            <p style={{ fontSize: 'var(--type-body-large-size)', lineHeight: 'var(--type-body-large-leading)', color: 'var(--text-body)', maxWidth: '58ch' }}>
              We tailor our submission process to match the exact requirements of your target organization to ensure your application remains fully compliant and safe from being flagged.
            </p>
            <p style={{ marginTop: 16, fontSize: 'var(--type-body-large-size)', lineHeight: 'var(--type-body-large-leading)', color: 'var(--text-body)', maxWidth: '58ch' }}>
              Depending on your destination, your application will follow one of two tracks automatically configured by our system.
            </p>
          </div>
        </div>
        <div style={{ marginTop: 48 }}>
          <div data-reveal style={{ display: 'flex', justifyContent: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '14px 22px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-dark)', color: 'var(--text-on-dark)' }}>
              <span style={{ flex: 'none', display: 'flex', color: 'var(--decor-numeral)' }}><Icon name="scan-search" size={19} /></span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600 }}>Your application is checked against the organization's submission requirements</span>
            </span>
          </div>
          <div className="apply-fork" aria-hidden="true"><span className="fork-stem" /><span className="fork-bar" /><span className="fork-drop fork-drop-l" /><span className="fork-drop fork-drop-r" /></div>
          <div className="apply-tracks" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 20 }}>
            {TRACKS.map((t) => (
              <div key={t.title} data-reveal className="apply-track" style={{ display: 'flex', flexDirection: 'column', padding: 32, borderRadius: 'var(--radius-lg)', background: t.dark ? 'var(--surface-dark)' : 'var(--surface-band)', color: t.dark ? 'var(--text-on-dark)' : 'var(--color-text-ink)', border: '1px solid ' + (t.dark ? 'var(--surface-dark)' : 'var(--line)') }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ flex: 'none', width: 46, height: 46, borderRadius: 'var(--radius-md)', background: t.dark ? 'rgba(255,249,244,0.1)' : 'var(--action-wash)', color: t.dark ? 'var(--text-on-dark)' : 'var(--action)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={t.icon} size={22} /></span>
                    <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 15, letterSpacing: '0.08em', color: t.dark ? 'var(--decor-numeral)' : 'var(--action)' }}>TRACK {t.letter}</span>
                  </span>
                  <span style={{ flex: 'none', padding: '6px 12px', borderRadius: 'var(--radius-pill)', border: '1px solid ' + (t.dark ? 'var(--line-on-dark)' : 'var(--line-strong)'), fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 600, color: t.dark ? 'var(--text-on-dark-quiet)' : 'var(--text-quiet)' }}>{t.who}</span>
                </span>
                <h3 style={{ marginTop: 22, fontSize: 24, color: t.dark ? 'var(--text-on-dark)' : 'var(--color-text-ink)', textWrap: 'pretty' }}>{t.title}</h3>
                <p style={{ marginTop: 12, fontSize: 15.5, lineHeight: 1.65, color: t.dark ? 'var(--text-on-dark-quiet)' : 'var(--text-body)' }}>{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ApplyBottom() {
  return (
    <div>
      <ApplySubmission />
      <ApplySupport />
      <ApplyPricing />
      <ApplyFaq />
      <ApplyClosing />
      <div style={{ position: 'relative', background: 'var(--surface-dark)', isolation: 'isolate' }}>
        {window.OM && window.OM.FooterWatermark ? <window.OM.FooterWatermark /> : null}
        <Footer markSrc={APPLY_FOOT_MARK} columns={(window.OM && window.OM.FOOTER_COLS) || []} style={{ background: 'transparent', position: 'relative', zIndex: 1 }} />
      </div>
    </div>
  );
}

window.OMA = Object.assign(window.OMA || {}, { ApplySubmission, ApplySupport, ApplyPricing, ApplyFaq, ApplyClosing, ApplyBottom });
