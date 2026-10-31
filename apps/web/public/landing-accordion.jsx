/* AccordionRow anatomy change. The design system row paints the whole row, header included,
   clay orange when open. Here the header keeps the neutral surface and dark text in both
   states, and the answer arrives in a nested clay inset card below it, inset on both sides.
   The card's foot carries the row's icon badge on the left and the CTA on the right.
   Applied by interception, same pattern as landing-button.jsx, so every accordion on the
   page picks it up. */
(function () {
  const NS = window.OppDateDesignSystem_4aa598;
  const Base = NS.AccordionRow;
  const { Icon, Button } = NS;

  function IconBadge({ icon }) {
    if (!icon) return <span />;
    return (
      <span style={{ flex: 'none', width: 40, height: 40, borderRadius: 'var(--radius-pill)', background: 'var(--color-text-inverse)', color: 'var(--action)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {typeof icon === 'string'
          ? <Icon name={icon} size={20} />
          : <img src={icon.src} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />}
      </span>
    );
  }

  function AccordionRowInset({ title, body, ctaLabel, ctaHref = '#', icon, open: controlledOpen, defaultOpen = false, onToggle, style, ...rest }) {
    const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
    const open = controlledOpen !== undefined ? controlledOpen : uncontrolled;
    const toggle = () => {
      if (controlledOpen === undefined) setUncontrolled((o) => !o);
      if (onToggle) onToggle(!open);
    };
    return (
      <div
        onClick={toggle}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
        style={{ background: 'var(--row-rest)', color: 'var(--color-text-ink)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: 20, cursor: 'pointer', transition: 'background-color var(--duration-base) var(--ease-out-soft)', ...style }}
        {...rest}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '0 4px' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 20, lineHeight: 1.3, color: 'var(--color-text-ink)' }}>{title}</span>
          <span style={{ flex: 'none', display: 'flex', alignItems: 'center', height: 26, color: 'var(--action)' }}>
            <Icon name={open ? 'minus' : 'plus'} size={20} />
          </span>
        </div>
        {(
          <div inert={open ? undefined : ''} style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', visibility: open ? 'visible' : 'hidden', transition: 'grid-template-rows var(--duration-base) var(--ease-out-soft), visibility var(--duration-base)' }}>
            <div style={{ overflow: 'hidden', minHeight: 0 }}>
              <div style={{ margin: '16px 0 0', background: 'var(--action)', color: 'var(--text-on-dark)', borderRadius: 'var(--radius-md)', padding: 24, opacity: open ? 1 : 0, transition: 'opacity var(--duration-base) var(--ease-out-soft)' }}>
                <p data-no-reveal style={{ fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: 1.55, color: 'rgba(255,249,244,0.86)', maxWidth: '58ch' }}>{body}</p>
                <div className="acc-foot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 24 }} onClick={(e) => e.stopPropagation()}>
                  <IconBadge icon={icon} />
                  {ctaLabel && <Button as="a" href={ctaHref} variant="on-primary" size="sm" tabIndex={open ? 0 : -1}>{ctaLabel}</Button>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const create = React.createElement;
  React.createElement = function (type) {
    const args = Array.prototype.slice.call(arguments, 1);
    return create.apply(React, [type === Base ? AccordionRowInset : type].concat(args));
  };

  NS.AccordionRow = AccordionRowInset;
  window.AccordionRowInset = AccordionRowInset;
})();
