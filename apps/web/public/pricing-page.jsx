const { Button, Eyebrow, Icon, AccordionRow, LinkArrow, Footer } = window.OppDateDesignSystem_4aa598;
const PRICING_MARK = (window.__resources && window.__resources.monogram) || 'assets/oppdate-monogram.png';

function PricingHero() {
  return (
    <section id="pricing-top" className="om-tex om-tex-light" style={{ background: 'var(--surface-card)' }}>
      <div className="wrap" style={{ padding: '64px var(--container-pad) 80px', textAlign: 'center' }}>
        <Eyebrow style={{ marginBottom: 18 }}>Pricing</Eyebrow>
        <h1 style={{ margin: '0 auto', maxWidth: '18ch', fontSize: 'clamp(36px, 4.2vw, 58px)' }}>Clear pricing,<br /><span style={{ color: 'var(--decor-numeral)' }}>no surprises</span>.</h1>
        <p style={{ margin: '22px auto 0', maxWidth: '54ch', fontSize: 'var(--type-body-large-size)', lineHeight: 'var(--type-body-large-leading)', color: 'var(--text-body)' }}>
          One subscription covers access to the platform. The services you actually use are priced on their own, pay as you go, and you see the cost before you commit.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
          <Button as="a" href="/auth/register">Get started</Button>
        </div>
      </div>
    </section>
  );
}

const COMPARE = [
  ['Create an account', true],
  ['Book consultations', true],
  ['Apply for mentorships', true],
  ['Purchase eBooks', true],
  ['OppDate notifications', 'some'],
  ['Browse opportunities', false],
  ['Basic saved searches', false],
  ['OppDate Guide', false],
  ['Exclusive Oppdates', false],
  ['AI eligibility screening', false],
  ['Personalized matching', false],
  ['Application tracker', false],
  ['Deadline reminders', false],
  ['Profile strength', false],
  ['Readiness score', false],
  ['Access to OppDate Apply', false],
];

/* Restrained comparison: one table, thin dividers, even row height. The cells carry a clay
   check or a neutral dash, so the column shape is the argument. */
function PricingCompare() {
  const cell = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const head = { fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-quiet)' };
  return (
    <section id="plans" style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--line)' }}>
      <div className="wrap" style={{ padding: '80px var(--container-pad)' }}>
        <Eyebrow style={{ marginBottom: 16 }}>Free and Premium</Eyebrow>
        <h2 style={{ maxWidth: '22ch' }}>What each account gets.</h2>
        <div className="price-table" style={{ marginTop: 40, border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div className="price-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 140px 140px', alignItems: 'end', gap: 16, padding: '20px 24px', borderBottom: '1px solid var(--line)', background: 'var(--surface-band)' }}>
            <span style={head}>Capability</span>
            <span style={{ textAlign: 'center' }}>
              <span style={Object.assign({}, head, { display: 'block' })}>Free</span>
              <span className="price-fig" style={{ display: 'block', marginTop: 4, fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 19, color: 'var(--color-text-ink)' }}>$0</span>
            </span>
            <span style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--action)' }}>Premium</span>
              <span className="price-fig" style={{ display: 'block', marginTop: 4, fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 19, color: 'var(--color-text-ink)' }}>From $12<span className="price-per">/month</span><a href="#tiers" style={{ textDecoration: 'none', color: 'var(--action)' }} aria-label="See full pricing">*</a></span>
            </span>
          </div>
          {COMPARE.map(([label, free], i) => (
            <div key={label} className="price-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 140px 140px', alignItems: 'center', gap: 16, padding: '0 24px', minHeight: 56, borderBottom: i === COMPARE.length - 1 ? 'none' : '1px solid var(--line)' }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15.5, color: 'var(--color-text-ink)' }}>{label}</span>
              <span style={cell}>
                {free === true && <span style={{ color: 'var(--action)', display: 'flex' }}><Icon name="check" size={19} /></span>}
                {free === 'some' && <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--text-quiet)' }}>Some</span>}
                {free === false && <span style={{ width: 12, height: 2, borderRadius: 2, background: 'var(--line-strong)' }} />}
              </span>
              <span style={cell}><span style={{ color: 'var(--action)', display: 'flex' }}><Icon name="check" size={19} /></span></span>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 18, fontSize: 14.5, lineHeight: 1.6, color: 'var(--text-quiet)', maxWidth: '68ch' }}>
          A Free account is how you buy Consultations, Mentorship and eBooks, and it receives notifications tied to those purchases. Reaching the opportunity library itself, and everything built around it, is Premium.
        </p>
        <p style={{ marginTop: 10, fontSize: 14, color: 'var(--text-quiet)' }}>
          *Premium pricing varies by region. <a href="#tiers">See both plans below</a>.
        </p>
      </div>
    </section>
  );
}

const PLAN_TIERS = [
  { id: 'general', name: 'General', note: 'Standard pricing, available worldwide.', monthly: 29, yearly: 199, save: '43%' },
  { id: 'regional', name: 'Regional', note: 'Reduced pricing, available to residents of 26 countries.', monthly: 12, yearly: 99, save: '31%', regional: true },
];

const REGIONAL_COUNTRIES = [
  'Nigeria', 'Ghana', 'Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'Ethiopia', 'Zambia', 'Zimbabwe', 'Malawi',
  'Cameroon', 'Senegal', 'Ivory Coast', 'Egypt', 'Botswana', 'Namibia', 'India', 'Pakistan', 'Bangladesh',
  'Nepal', 'Sri Lanka', 'Philippines', 'Indonesia', 'Vietnam', 'Cambodia', 'Myanmar',
];

/* One billing switch drives both tiers, so the visitor picks a period and reads across rather
   than choosing a plan first. Nothing is auto-selected by location: both prices are always shown. */
function PricingTiers() {
  const [period, setPeriod] = React.useState('monthly');
  const [openList, setOpenList] = React.useState(false);
  const yearly = period === 'yearly';
  return (
    <section id="tiers" style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--line)' }}>
      <div className="wrap" style={{ padding: '80px var(--container-pad)' }}>
        <Eyebrow style={{ marginBottom: 16 }}>Premium plans</Eyebrow>
        <h2 style={{ maxWidth: '22ch' }}>Two Premium prices, both shown.</h2>
        <p style={{ marginTop: 18, fontSize: 'var(--type-body-large-size)', lineHeight: 'var(--type-body-large-leading)', color: 'var(--text-body)', maxWidth: '58ch' }}>
          Premium is priced by region. Pick a billing period and compare both plans; eligibility for regional pricing is confirmed at checkout.
        </p>
        <div style={{ display: 'inline-flex', gap: 4, marginTop: 28, padding: 4, borderRadius: 'var(--radius-pill)', background: 'var(--surface-band)', border: '1px solid var(--line)' }}>
          {[['monthly', 'Monthly'], ['yearly', 'Yearly']].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPeriod(id)}
              aria-pressed={period === id}
              style={{ padding: '9px 20px', borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, background: period === id ? 'var(--action)' : 'transparent', color: period === id ? 'var(--color-text-inverse)' : 'var(--text-body)', transition: 'background-color var(--duration-fast) var(--ease-out-soft), color var(--duration-fast) var(--ease-out-soft)' }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="price-tiers" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 20, marginTop: 32 }}>
          {PLAN_TIERS.map((t) => (
            <div key={t.id} data-reveal style={{ display: 'flex', flexDirection: 'column', padding: 30, borderRadius: 'var(--radius-lg)', background: 'var(--surface-card)', border: '1px solid var(--line)' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-quiet)' }}>{t.name}</span>
                <span style={{ padding: '5px 11px', borderRadius: 'var(--radius-pill)', background: 'var(--action-wash)', color: 'var(--action)', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Most popular</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 20 }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 46, lineHeight: 1, color: 'var(--color-text-ink)' }}>${yearly ? t.yearly : t.monthly}</span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--text-quiet)' }}>{yearly ? 'per year' : 'per month'}</span>
              </span>
              {yearly && (
                <span style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 7, marginTop: 14, padding: '7px 12px', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', border: '1px solid var(--action)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--color-text-ink)' }}>
                  <span style={{ display: 'flex', color: 'var(--action)' }}><Icon name="percent" size={13} /></span>
                  Save {t.save} against monthly
                </span>
              )}
              <span style={{ display: 'block', marginTop: 16, fontFamily: 'var(--font-sans)', fontSize: 14.5, lineHeight: 1.6, color: 'var(--text-body)' }}>{t.note}</span>
              {t.regional && (
                <span style={{ display: 'block', marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => setOpenList(!openList)}
                    aria-expanded={openList}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--action)' }}
                  >
                    <Icon name={openList ? 'chevron-up' : 'chevron-down'} size={15} />
                    See eligible countries
                  </button>
                  {openList && (
                    <span style={{ display: 'block', marginTop: 12, padding: '16px 18px', borderRadius: 'var(--radius-md)', background: 'var(--surface-band)', border: '1px solid var(--line)' }}>
                      <span className="price-countries" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '8px 16px' }}>
                        {REGIONAL_COUNTRIES.map((n) => (
                          <span key={n} style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--color-text-ink)' }}>
                            <span style={{ flex: 'none', width: 4, height: 4, borderRadius: 999, background: 'var(--action)' }} />
                            {n}
                          </span>
                        ))}
                      </span>
                      <span style={{ display: 'block', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-quiet)' }}>Eligibility is verified at checkout.</span>
                    </span>
                  )}
                </span>
              )}
              <span style={{ marginTop: 'auto', paddingTop: 26, display: 'block' }}>
                <Button as="a" href="/auth/register" variant="secondary-on-light" size="lg" style={{ width: '100%' }}>Get started</Button>
              </span>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 20, fontSize: 14.5, color: 'var(--text-quiet)', maxWidth: '68ch' }}>
          Both plans unlock the same Premium capabilities. Only the price differs.
        </p>
      </div>
    </section>
  );
}

const PAY_PER = [
  { icon: 'video', title: 'Consultations', href: '/services/consultations', body: 'Priced per session length, with 30, 60 and 90 minute tiers. The fee is set per length and shown clearly before you commit.' },
  { icon: 'users', title: 'Mentorship', href: '/services/mentorship', body: 'One flat monthly fee for 30-Day Guidance, renewable for as long as you need it. The fee is shown before you start and does not change on renewal.' },
  { icon: 'book-open', title: 'eBooks', href: '/services/ebooks', body: 'Pay once per title and own it forever. Each guide is priced individually and shown clearly before you buy.', premiumNote: 'Premium subscribers pay a discounted price on every title.' },
];

function PricingServices() {
  return (
    <section style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--line)' }}>
      <div className="wrap" style={{ padding: '80px var(--container-pad)' }}>
        <Eyebrow style={{ marginBottom: 16 }}>Pay per service</Eyebrow>
        <h2 style={{ maxWidth: '24ch' }}>These three need no subscription.</h2>
        <p style={{ marginTop: 18, fontSize: 'var(--type-body-large-size)', lineHeight: 'var(--type-body-large-leading)', color: 'var(--text-body)', maxWidth: '62ch' }}>
          Consultations, Mentorship and eBooks are available on any account, Free or Premium. You pay for the session, programme or title you choose, and nothing else.
        </p>
        <div className="price-services" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 20, marginTop: 40 }}>
          {PAY_PER.map((p) => (
            <div key={p.title} data-reveal style={{ display: 'flex', flexDirection: 'column', padding: 28, borderRadius: 'var(--radius-lg)', background: 'var(--surface-band)', border: '1px solid var(--line)' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--action-wash)', color: 'var(--action)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={p.icon} size={21} /></span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-quiet)' }}>Free or Premium</span>
              </span>
              <h3 style={{ marginTop: 18, fontSize: 22 }}>{p.title}</h3>
              <p style={{ marginTop: 10, fontSize: 15.5, lineHeight: 1.6, color: 'var(--text-body)' }}>{p.body}</p>
              {p.premiumNote && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', border: '1px solid var(--action)' }}>
                  <span style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 'var(--radius-sm, 6px)', background: 'var(--action)', color: 'var(--color-text-inverse)' }}>
                    <Icon name="percent" size={13} />
                  </span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, lineHeight: 1.4, color: 'var(--color-text-ink)' }}>{p.premiumNote}</span>
                </span>
              )}
              <span style={{ marginTop: 'auto', paddingTop: 20 }}><LinkArrow href={p.href}>See {p.title}</LinkArrow></span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingApply() {
  return (
    <section style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--line)' }}>
      <div className="wrap" style={{ padding: '80px var(--container-pad)' }}>
        <div className="price-apply" style={{ background: 'var(--action)', color: 'var(--text-on-dark)', borderRadius: 'var(--radius-lg)', padding: 56, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 48, alignItems: 'center' }}>
          <div>
            <Eyebrow tone="on-primary" style={{ marginBottom: 16, color: 'rgba(255,249,244,0.72)' }}>OppDate Apply</Eyebrow>
            <h2 style={{ color: 'var(--text-on-dark)', maxWidth: '18ch' }}>The one service behind Premium.</h2>
          </div>
          <div>
            <p style={{ fontSize: 'var(--type-body-large-size)', lineHeight: 'var(--type-body-large-leading)', color: 'rgba(255,249,244,0.9)', maxWidth: '46ch' }}>
              OppDate Apply is available to Premium subscribers. Once you are ready to apply, each application has its own transparent fee: the OppDate Service Fee, plus the Institution Application Fee where the institution charges one, shown in full before you commit.
            </p>
            <div style={{ marginTop: 28 }}>
              <Button as="a" href="/services/apply" variant="on-primary" size="lg"><span className="cta-long">See how OppDate Apply works</span><span className="cta-short">Check How It Works</span></Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const PRICING_FAQS = [
  ['What is included in Premium?', 'OppDate Guide, Exclusive Oppdates, AI eligibility screening, personalized matching, the application tracker, deadline reminders, notifications, profile strength and readiness score, plus access to OppDate Apply. Premium is priced by region, from $12 per month.', 'Compare plans', 'crown'],
  ['Do I need Premium for Consultations, Mentorship or eBooks?', 'No. All three are available on any account, Free or Premium, and are paid for individually.', 'See the services', 'layers'],
  ['Do I need Premium to use OppDate Apply?', 'Yes. OppDate Apply is a Premium service, and each application also carries its own OppDate Service Fee, plus the institution fee where one applies, shown before you pay.', 'See how it works', 'shield-check'],
  ['Can I cancel Premium anytime?', 'Yes. Cancel from your account settings and Premium runs to the end of the period you have paid for. Anything you bought outright, such as an eBook, stays yours.', 'Get started', 'refresh-cw'],
];

function PricingFaq() {
  const [open, setOpen] = React.useState(0);
  return (
    <section style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--line)' }}>
      <div className="wrap split" style={{ padding: '80px var(--container-pad)', display: 'grid', gridTemplateColumns: 'minmax(0,36%) minmax(0,64%)', gap: 56, alignItems: 'start' }}>
        <div>
          <Eyebrow style={{ marginBottom: 16 }}>Questions</Eyebrow>
          <h2 style={{ fontSize: 'var(--type-h2-split-size)', lineHeight: 'var(--type-h2-split-leading)' }}>About pricing.</h2>
          <p style={{ marginTop: 20, color: 'var(--text-body)', maxWidth: '32ch' }}>If something here is unclear, ask the team before you subscribe.</p>
          <div style={{ marginTop: 16 }}><LinkArrow href="/auth/register">Contact support</LinkArrow></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PRICING_FAQS.map(([t, b, c, icon], i) => (
            <AccordionRow key={t} title={t} body={b} ctaLabel={c} ctaHref="#plans" icon={icon} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingClosing() {
  return (
    <section id="start" className="om-tex om-tex-ink om-glow" style={{ background: 'var(--surface-dark)' }}>
      <div className="wrap" style={{ padding: '112px var(--container-pad)', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-on-dark)', maxWidth: '24ch', margin: '0 auto' }}>Become fully OppDated and unlock everything OppDate was built for.</h2>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
          <Button as="a" href="/auth/register">Go Premium</Button>
        </div>
      </div>
    </section>
  );
}

function PricingBottom() {
  return (
    <div>
      <PricingTiers />
      <PricingServices />
      <PricingApply />
      <PricingFaq />
      <PricingClosing />
      <div style={{ position: 'relative', background: 'var(--surface-dark)', isolation: 'isolate' }}>
        {window.OM && window.OM.FooterWatermark ? <window.OM.FooterWatermark /> : null}
        <Footer markSrc={PRICING_MARK} columns={(window.OM && window.OM.FOOTER_COLS) || []} style={{ background: 'transparent', position: 'relative', zIndex: 1 }} />
      </div>
    </div>
  );
}

window.OMP = Object.assign(window.OMP || {}, { PricingHero, PricingCompare, PricingTiers, PricingServices, PricingApply, PricingFaq, PricingClosing, PricingBottom });
