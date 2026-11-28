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

  function ButtonWithBadge({
    size = "xl",
    variant = "primary",
    children,
    style,
    ...rest
  }) {
    const dia = DIA[size];
    if (!dia)
      return (
        <Plain size={size} variant={variant} style={style} {...rest}>
          {children}
        </Plain>
      );
    return (
      <Plain
        size={size}
        variant={variant}
        style={{ position: "relative", paddingRight: dia + 16, ...style }}
        {...rest}
      >
        {children}
        <span
          className="om-btn-badge"
          style={{
            width: dia,
            height: dia,
            background:
              variant === "primary"
                ? "var(--color-text-inverse)"
                : "var(--action)",
            color:
              variant === "primary"
                ? "var(--action)"
                : "var(--color-text-inverse)",
          }}
        >
          <span className="om-btn-arrow">
            <Icon name="arrow-up-right" size={ARROW[size]} />
          </span>
        </span>
      </Plain>
    );
  }

  const BaseNewsletter = NS.NewsletterForm;

  const API_BASE = window.__API_URL || (window.location.hostname === "localhost" ? "http://localhost:4000" : "");

  function NewsletterFormBadged({
    placeholder = "Your email address",
    ctaLabel = "Stay OppDated",
    onSubmit,
    style,
    className,
    ...rest
  }) {
    const [focus, setFocus] = React.useState(false);
    const [email, setEmail] = React.useState("");
    const [state, setState] = React.useState("idle"); // idle | loading | success | error
    const [msg, setMsg] = React.useState("");
    const inputRef = React.useRef(null);

    async function handleSubmit(e) {
      e.preventDefault();
      if (onSubmit) onSubmit(e);
      if (!email.trim()) return;
      setState("loading");
      try {
        const res = await fetch(API_BASE + "/api/v1/newsletter/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });
        const data = await res.json();
        if (res.ok) {
          setState("success");
          setMsg(data.message || "You are subscribed!");
        } else {
          setState("error");
          setMsg(data.error || "Something went wrong.");
        }
      } catch {
        setState("error");
        setMsg("Network error. Please try again.");
      }
    }

    if (state === "success") {
      return (
        <div
          className={"om-newsletter" + (className ? " " + className : "")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 380,
            maxWidth: "100%",
            borderRadius: "var(--radius-pill)",
            padding: "12px 24px",
            background: "rgba(196,136,28,0.12)",
            border: "1px solid rgba(196,136,28,0.3)",
            animation: "om-fade-in 400ms var(--ease-out-soft)",
            ...style,
          }}
        >
          <Icon name="check-circle" size={18} style={{ color: "#c4881c", marginRight: 10, flexShrink: 0 }} />
          <span style={{ color: "var(--text-on-dark)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500 }}>
            {msg}
          </span>
        </div>
      );
    }

    return (
      <form
        className={"om-newsletter" + (className ? " " + className : "")}
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          alignItems: "stretch",
          minWidth: 380,
          maxWidth: "100%",
          borderRadius: "var(--radius-pill)",
          padding: "4px 4px 4px 20px",
          background: "rgba(255,249,244,0.08)",
          border:
            "1px solid " +
            (state === "error"
              ? "rgba(220,80,60,0.6)"
              : focus ? "rgba(232,168,77,0.60)" : "rgba(255,249,244,0.20)"),
          transition: "border-color var(--duration-fast) var(--ease-out-soft)",
          ...style,
        }}
        {...rest}
      >
        <input
          ref={inputRef}
          type="email"
          required
          aria-label="Email"
          placeholder={placeholder}
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (state === "error") setState("idle"); }}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          disabled={state === "loading"}
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-on-dark)",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            opacity: state === "loading" ? 0.6 : 1,
          }}
        />
        <ButtonWithBadge type="submit" size="sm" disabled={state === "loading"} style={state === "loading" ? { opacity: 0.7, pointerEvents: "none" } : undefined}>
          {state === "loading" ? "..." : ctaLabel}
        </ButtonWithBadge>
      </form>
    );
  }

  const create = React.createElement;
  React.createElement = function (type, props) {
    const args = Array.prototype.slice.call(arguments, 1);
    const swap =
      type === Base
        ? ButtonWithBadge
        : type === BaseNewsletter
          ? NewsletterFormBadged
          : type;
    return create.apply(React, [swap].concat(args));
  };

  NS.Button = ButtonWithBadge;
  NS.NewsletterForm = NewsletterFormBadged;
  window.ButtonWithBadge = ButtonWithBadge;
})();
