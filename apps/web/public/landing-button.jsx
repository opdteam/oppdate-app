/* Button anatomy extension: at 56px (xl) and 52px (lg) every pill carries an inset
   circular badge at its trailing end holding a Lucide arrow-up-right. The badge fill
   always inverts against the pill fill. 40px (sm) pills carry the same badge at 24px,
   including the nav CTA and the newsletter submit.
   Applied by intercepting element creation, so CTAs rendered inside design system
   components (nav, footer, accordion panels) pick it up too, not just page level ones.
   NewsletterForm is intercepted as well: its submit is a raw button with a text arrow
   inside the design system source, so it is re-rendered here with the badged Button in
   its place. Same pill, same field, same tokens, only the submit anatomy changes. */
(function () {
  const NS = window.OppDateDesignSystem_4aa598;
  const Base = NS.Button;
  const { Icon } = NS;
  const DIA = { xl: 40, lg: 36, sm: 24 };
  const ARROW = { xl: 18, lg: 16, sm: 13 };

  /* Distinct type so the interception below does not re-enter itself. */
  const Plain = (props) => Base(props);

  function ButtonWithBadge({ size = 'xl', variant = 'primary', children, style, ...rest }) {
    const dia = DIA[size];
    if (!dia) return <Plain size={size} variant={variant} style={style} {...rest}>{children}</Plain>;
    return (
      <Plain
        size={size}
        variant={variant}
        style={{ position: 'relative', paddingRight: dia + 16, ...style }}
        {...rest}
      >
        {children}
        <span className="om-btn-badge" style={{ width: dia, height: dia, background: variant === 'primary' ? 'var(--color-text-inverse)' : 'var(--action)', color: variant === 'primary' ? 'var(--action)' : 'var(--color-text-inverse)' }}>
          <span className="om-btn-arrow"><Icon name="arrow-up-right" size={ARROW[size]} /></span>
        </span>
      </Plain>
    );
  }

  const BaseNewsletter = NS.NewsletterForm;

  function NewsletterFormBadged({ placeholder = 'Your email address', ctaLabel = 'Stay updated', onSubmit, style, className, ...rest }) {
    const [focus, setFocus] = React.useState(false);
    return (
      <form
        className={'om-newsletter' + (className ? ' ' + className : '')}
        onSubmit={(e) => { e.preventDefault(); if (onSubmit) onSubmit(e); }}
        style={{
          display: 'flex', alignItems: 'stretch', minWidth: 380, maxWidth: '100%',
          borderRadius: 'var(--radius-pill)', padding: '4px 4px 4px 20px',
          background: 'rgba(255,249,244,0.08)',
          border: '1px solid ' + (focus ? 'rgba(232,168,77,0.60)' : 'rgba(255,249,244,0.20)'),
          transition: 'border-color var(--duration-fast) var(--ease-out-soft)',
          ...style,
        }}
        {...rest}
      >
        <input
          type="email"
          aria-label="Email"
          placeholder={placeholder}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-on-dark)', fontFamily: 'var(--font-sans)', fontSize: 14 }}
        />
        <ButtonWithBadge type="submit" size="sm">{ctaLabel}</ButtonWithBadge>
      </form>
    );
  }

  const create = React.createElement;
  React.createElement = function (type, props) {
    const args = Array.prototype.slice.call(arguments, 1);
    const swap = type === Base ? ButtonWithBadge : type === BaseNewsletter ? NewsletterFormBadged : type;
    return create.apply(React, [swap].concat(args));
  };

  NS.Button = ButtonWithBadge;
  NS.NewsletterForm = NewsletterFormBadged;
  window.ButtonWithBadge = ButtonWithBadge;
})();
