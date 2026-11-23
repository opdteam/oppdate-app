const RESEND_API_URL = "https://api.resend.com/emails";

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from = process.env.EMAIL_FROM || "OppDate <noreply@oppdate.com>";

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const WEB_URL = process.env.WEB_URL || "https://oppdate.com";
const LOGO_URL = `${WEB_URL}/assets/oppdate-monogram.png`;

// Inline SVG icons as data URIs (email-safe, no external dependencies)
const ICONS = {
  checkCircle: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' fill='none'%3E%3Ccircle cx='24' cy='24' r='24' fill='%2322863a'/%3E%3Cpath d='M14 24l7 7 13-13' stroke='%23fff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E`,
  receipt: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' fill='none'%3E%3Crect x='4' y='3' width='20' height='22' rx='2' stroke='%23c4881c' stroke-width='1.5'/%3E%3Cpath d='M9 9h10M9 13h10M9 17h6' stroke='%23c4881c' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E`,
  hash: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' fill='none'%3E%3Cpath d='M4 7h10M4 11h10M7 4v10M11 4v10' stroke='%23a09070' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E`,
  layers: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' fill='none'%3E%3Cpath d='M9 2L2 6l7 4 7-4-7-4zM2 9l7 4 7-4M2 12l7 4 7-4' stroke='%23a09070' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E`,
  creditCard: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' fill='none'%3E%3Crect x='2' y='4' width='14' height='10' rx='2' stroke='%23a09070' stroke-width='1.3'/%3E%3Cpath d='M2 8h14' stroke='%23a09070' stroke-width='1.3'/%3E%3C/svg%3E`,
  gateway: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' fill='none'%3E%3Crect x='2' y='4' width='14' height='10' rx='2' stroke='%23a09070' stroke-width='1.3'/%3E%3Cpath d='M5 11h3M10 11h3' stroke='%23a09070' stroke-width='1.3' stroke-linecap='round'/%3E%3C/svg%3E`,
  transfer: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' fill='none'%3E%3Cpath d='M4 7h10M14 7l-3-3M4 11h10M4 11l3 3' stroke='%23a09070' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E`,
  calendar: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' fill='none'%3E%3Crect x='3' y='4' width='12' height='11' rx='2' stroke='%23a09070' stroke-width='1.3'/%3E%3Cpath d='M3 8h12M6 2v3M12 2v3' stroke='%23a09070' stroke-width='1.3' stroke-linecap='round'/%3E%3C/svg%3E`,
  barChart: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none'%3E%3Crect x='5' y='12' width='4' height='7' rx='1' fill='%23c4881c'/%3E%3Crect x='10' y='8' width='4' height='11' rx='1' fill='%23c4881c'/%3E%3Crect x='15' y='5' width='4' height='14' rx='1' fill='%23c4881c'/%3E%3C/svg%3E`,
  shield: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' fill='none'%3E%3Cpath d='M20 4L6 10v8c0 8.8 6 16 14 18 8-2 14-9.2 14-18v-8L20 4z' stroke='%23ef4444' stroke-width='2' fill='none'/%3E%3Cpath d='M15 20l4 4 7-8' stroke='%23ef4444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E`,
  mail: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' fill='none'%3E%3Crect x='4' y='8' width='32' height='24' rx='3' stroke='%23c4881c' stroke-width='2'/%3E%3Cpath d='M4 11l16 10 16-10' stroke='%23c4881c' stroke-width='2'/%3E%3C/svg%3E`,
  clock: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' fill='none'%3E%3Ccircle cx='20' cy='20' r='16' stroke='%23c4881c' stroke-width='2'/%3E%3Cpath d='M20 10v10l6 4' stroke='%23c4881c' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E`,
  search: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' fill='none'%3E%3Ccircle cx='17' cy='17' r='10' stroke='%23c4881c' stroke-width='2'/%3E%3Cpath d='M25 25l8 8' stroke='%23c4881c' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E`,
  users: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' fill='none'%3E%3Ccircle cx='15' cy='13' r='5' stroke='%23c4881c' stroke-width='2'/%3E%3Cpath d='M5 32c0-5.5 4.5-10 10-10s10 4.5 10 10' stroke='%23c4881c' stroke-width='2'/%3E%3Ccircle cx='28' cy='13' r='4' stroke='%23c4881c' stroke-width='1.5'/%3E%3Cpath d='M30 22c3 1 5 4 5 7' stroke='%23c4881c' stroke-width='1.5'/%3E%3C/svg%3E`,
  key: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' fill='none'%3E%3Ccircle cx='26' cy='14' r='8' stroke='%23c4881c' stroke-width='2'/%3E%3Cpath d='M20 20L6 34M6 34l5-1M6 34l1-5' stroke='%23c4881c' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E`,
  star: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' fill='none'%3E%3Cpath d='M20 4l5 10h11l-9 7 4 11-11-7-11 7 4-11-9-7h11z' stroke='%23c4881c' stroke-width='2' fill='none'/%3E%3C/svg%3E`,
  bell: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' fill='none'%3E%3Cpath d='M20 4c-6 0-10 4-10 10v8l-3 3h26l-3-3v-8c0-6-4-10-10-10z' stroke='%23c4881c' stroke-width='2'/%3E%3Cpath d='M16 35c1 2 3 3 4 3s3-1 4-3' stroke='%23c4881c' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E`,
};

// Golden aurora wave SVG for header background (embedded, email-safe)
const HEADER_AURORA = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='120' viewBox='0 0 600 120'%3E%3Cdefs%3E%3ClinearGradient id='g1' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23c4881c' stop-opacity='0.15'/%3E%3Cstop offset='50%25' stop-color='%23d4973a' stop-opacity='0.25'/%3E%3Cstop offset='100%25' stop-color='%23c4881c' stop-opacity='0.08'/%3E%3C/linearGradient%3E%3ClinearGradient id='g2' x1='1' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%23e4b86a' stop-opacity='0.12'/%3E%3Cstop offset='100%25' stop-color='%23c4881c' stop-opacity='0.06'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M0 80 Q150 20 300 60 T600 40 V120 H0Z' fill='url(%23g1)'/%3E%3Cpath d='M0 90 Q200 40 400 70 T600 50 V120 H0Z' fill='url(%23g2)'/%3E%3C/svg%3E`;

// Wavy divider SVG
const WAVE_DIVIDER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='20' viewBox='0 0 600 20'%3E%3Cpath d='M0 10 Q75 0 150 10 T300 10 T450 10 T600 10 V20 H0Z' fill='%23fdf8f0' opacity='0.6'/%3E%3C/svg%3E`;

function layout(preheader: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>OppDate</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
</head>
<body style="margin:0;padding:0;background:#f0ebe5;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- preheader -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;</div>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0ebe5;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1a1107;padding:0;position:relative;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-image:url('${HEADER_AURORA}');background-position:right bottom;background-repeat:no-repeat;background-size:cover;">
              <tr>
                <td style="padding:28px 36px 24px;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="vertical-align:middle;padding-right:12px;">
                        <img src="${LOGO_URL}" alt="OppDate" width="38" height="38" style="display:block;border:0;" />
                      </td>
                      <td style="vertical-align:middle;border-left:2px solid rgba(196,136,28,0.4);padding-left:12px;">
                        <span style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">OppDate</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Amber gradient bar -->
        <tr>
          <td style="height:3px;background:linear-gradient(90deg,#c4881c,#d4973a,#e4b86a,#d4973a,#c4881c);font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:0;">
            ${bodyContent}
          </td>
        </tr>

        <!-- Sign-off -->
        <tr>
          <td align="center" style="padding:8px 36px 20px;">
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#c4881c;font-style:italic;letter-spacing:0.3px;font-weight:700;">Stay OppDated.</p>
            <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a09070;">Thank you for being part of the OppDate community.</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#1a1107;padding:24px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle;">
                  <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#a09070;line-height:1.5;">
                    You are receiving this email because you have an active OppDate account.
                  </p>
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#6b5840;line-height:1.5;">
                    &copy; ${new Date().getFullYear()} OppDate &mdash; All rights reserved.
                  </p>
                </td>
                <td width="40" style="vertical-align:middle;text-align:right;">
                  <img src="${LOGO_URL}" alt="" width="28" height="28" style="display:block;border:0;opacity:0.4;" />
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`;
}

// Hero block with icon, heading, and subtitle
function heroBlock(icon: string, heading: string, subtitle: string, iconSize = 48): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:32px 36px 24px;">
  <tr>
    <td>
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align:middle;padding-right:16px;">
            <img src="${icon}" alt="" width="${iconSize}" height="${iconSize}" style="display:block;border:0;" />
          </td>
          <td style="vertical-align:middle;border-left:3px solid #ede8e1;padding-left:16px;">
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#1a1107;line-height:1.3;">${heading}</p>
            <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6b5840;">${subtitle}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

function greeting(name: string): string {
  return `<p style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;color:#1a1107;line-height:1.5;">Hi ${name},</p>`;
}

function ctaButton(label: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:28px auto 0;">
    <tr>
      <td style="background:linear-gradient(135deg,#c4881c,#a06b10);border-radius:8px;box-shadow:0 2px 8px rgba(196,136,28,0.3);">
        <a href="${url}" target="_blank" style="display:inline-block;padding:14px 36px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">${label} &rarr;</a>
      </td>
    </tr>
  </table>`;
}

function bodyText(html: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#3d2f1a;line-height:1.7;">${html}</div>`;
}

function highlight(text: string): string {
  return `<strong style="color:#1a1107;">${text}</strong>`;
}

function badge(text: string, color = "#22863a"): string {
  const bgMap: Record<string, string> = {
    "#22863a": "#e6f4ea",
    "#c4881c": "#fdf3e3",
    "#ef4444": "#fde8e8",
    "#1a1107": "#f5f0eb",
  };
  const bg = bgMap[color] || "#f5f0eb";
  return `<span style="display:inline-block;padding:4px 14px;background:${bg};border:1px solid ${color};border-radius:20px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:${color};letter-spacing:0.3px;vertical-align:middle;">${text}</span>`;
}

// Callout block with icon + left border (like the "You're all set!" section)
function calloutBlock(icon: string, heading: string, text: string, borderColor = "#c4881c"): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">
  <tr>
    <td style="padding:0;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align:top;padding-right:14px;">
            <img src="${icon}" alt="" width="24" height="24" style="display:block;border:0;" />
          </td>
          <td style="vertical-align:top;border-left:3px solid ${borderColor};padding-left:14px;">
            <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#1a1107;">${heading}</p>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6b5840;line-height:1.6;">${text}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

// Receipt row with icon
function receiptRow(icon: string, label: string, value: string, isLast = false, mono = false): string {
  const border = isLast ? "" : "border-bottom:1px solid #ede8e1;";
  const valueStyle = mono
    ? "font-family:Consolas,'Courier New',monospace;font-size:12px;color:#6b5840;word-break:break-all;"
    : "font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1107;";
  return `<tr>
    <td style="padding:12px 0;${border}width:20px;vertical-align:middle;">
      <img src="${icon}" alt="" width="18" height="18" style="display:block;border:0;" />
    </td>
    <td style="padding:12px 8px;${border}font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#a09070;vertical-align:middle;width:110px;">${label}</td>
    <td style="padding:12px 0;${border}${valueStyle}font-weight:600;vertical-align:middle;">${value}</td>
  </tr>`;
}

const STATUS_LABEL: Record<string, string> = {
  eligibility_screening: "Eligibility Screening",
  document_collection: "Document Collection",
  awaiting_payment: "Awaiting Payment",
  payment_confirmed: "Payment Confirmed",
  submitted: "Application Submitted",
  under_review: "Under Review",
  decision_pending: "Decision Pending",
  accepted: "Accepted",
  rejected: "Not Selected",
  withdrawn: "Withdrawn",
};

function formatStatus(status: string): string {
  return (
    STATUS_LABEL[status] ??
    status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

const STATUS_CONTEXT: Record<string, string> = {
  payment_confirmed:
    "Your payment has been received and your application file has been opened. Our team will begin reviewing your documents shortly.",
  under_review:
    "Our team is actively reviewing your application. We will be in touch if we need anything further.",
  decision_pending:
    "Your application has completed our review process and a final decision is being made. We will notify you as soon as it is ready.",
  submitted:
    "Your application has been formally submitted to the opportunity provider on your behalf.",
  accepted:
    "Congratulations -- your application has been accepted. Please log in to your dashboard for the next steps.",
  rejected:
    "After careful review, we were unable to proceed with your application at this time. You can reach out to our team if you have questions.",
  withdrawn:
    "Your application has been marked as withdrawn. Please contact our team if this was done in error.",
};

export function applicationStatusEmail(
  userName: string,
  referenceId: string,
  newStatus: string,
): EmailParams {
  const label = formatStatus(newStatus);
  const context =
    STATUS_CONTEXT[newStatus] ??
    "Your application status has been updated. Log in to your dashboard to view the latest details.";
  const isDone = ["accepted", "rejected", "withdrawn"].includes(newStatus);

  const statusColor = newStatus === "accepted" ? "#22863a" : newStatus === "rejected" ? "#ef4444" : "#c4881c";
  const heroIcon = newStatus === "accepted" ? ICONS.checkCircle : ICONS.mail;
  const heroHeading = newStatus === "accepted" ? "Application Accepted" : newStatus === "rejected" ? "Application Update" : "Status Update";

  const body = `
    ${heroBlock(heroIcon, heroHeading, `Your application ${referenceId} has been updated.`)}
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 36px 32px;">
      ${greeting(userName)}
      ${bodyText(`<p style="margin:0 0 20px;">We have received your payment and your application status has been updated.</p>`)}
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
        <tr>
          <td style="padding:0 16px 0 0;vertical-align:middle;">
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6b5840;">Current status:</span>
          </td>
          <td style="vertical-align:middle;">
            ${badge(label, statusColor)}
          </td>
        </tr>
      </table>
      ${bodyText(`<p style="margin:0 0 16px;">${context}</p>`)}
      ${isDone ? "" : calloutBlock(ICONS.barChart, "What happens next?", "If you have any questions, reply to your application message thread and our team will respond.")}
      ${ctaButton("View your application", `${WEB_URL}/applications`)}
    </td></tr></table>
  `;

  return {
    to: "",
    subject: `[${referenceId}] Status update: ${label}`,
    html: layout(
      `Your application ${referenceId} status has been updated to: ${label}.`,
      body,
    ),
  };
}

export interface PaymentReceiptParams {
  userName: string;
  amount: string;
  purpose: string;
  referenceId?: string;
  gatewayPaymentId?: string;
  gateway?: string;
  date?: string;
}

export function paymentConfirmationEmail(
  params: PaymentReceiptParams,
): EmailParams {
  const {
    userName,
    amount,
    purpose,
    referenceId,
    gatewayPaymentId,
    gateway,
    date,
  } = params;
  const subject = referenceId
    ? `[${referenceId}] Payment confirmed`
    : "Payment confirmed";
  const displayDate =
    date ??
    new Date().toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const GATEWAY_NAMES: Record<string, string> = {
    stripe: "Stripe",
    paystack: "Paystack",
    flutterwave: "Flutterwave",
    lemon_squeezy: "Lemon Squeezy",
  };
  const gatewayName = gateway ? (GATEWAY_NAMES[gateway] ?? gateway) : null;

  const rows = [
    referenceId ? receiptRow(ICONS.hash, "Reference", referenceId) : "",
    receiptRow(ICONS.layers, "Service", purpose),
    receiptRow(ICONS.creditCard, "Amount", `<span style="font-size:16px;">${amount}</span>`),
    gatewayName ? receiptRow(ICONS.gateway, "Paid via", gatewayName) : "",
    gatewayPaymentId ? receiptRow(ICONS.transfer, "Transaction ID", gatewayPaymentId, false, true) : "",
    receiptRow(ICONS.calendar, "Date &amp; Time", displayDate, true),
  ].filter(Boolean).join("");

  const body = `
    ${heroBlock(ICONS.checkCircle, "Payment Successful", "Your transaction has been confirmed.")}

    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 36px 8px;">
      ${greeting(userName)}
      ${bodyText(`<p style="margin:0 0 24px;">We have received your payment for ${purpose}.</p>`)}
    </td></tr></table>

    <!-- Receipt card -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 24px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #ede8e1;border-radius:10px;overflow:hidden;">
        <!-- Receipt header -->
        <tr>
          <td style="background:#fdf8f0;padding:18px 20px;border-bottom:1px solid #ede8e1;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="vertical-align:middle;padding-right:10px;">
                        <img src="${ICONS.receipt}" alt="" width="28" height="28" style="display:block;border:0;" />
                      </td>
                      <td style="vertical-align:middle;">
                        <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:700;color:#1a1107;">Payment Receipt</p>
                        <p style="margin:2px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#a09070;text-transform:uppercase;letter-spacing:1px;">OppDate Payment Confirmation</p>
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="vertical-align:middle;text-align:right;">
                  ${badge("Paid", "#22863a")}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Receipt rows -->
        <tr>
          <td style="padding:4px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              ${rows}
            </table>
          </td>
        </tr>

        <!-- Total bar -->
        <tr>
          <td style="background:#fdf3e3;padding:16px 20px;border-top:1px solid #ede8e1;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#1a1107;">Total Paid</td>
                <td style="text-align:right;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#c4881c;">${amount}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr></table>

    <!-- Callout + CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 36px 32px;">
      ${calloutBlock(ICONS.barChart, "You're all set!", "Keep this email as your proof of payment. You can access your account and continue your journey through your dashboard.")}
      ${ctaButton("Go to your dashboard", `${WEB_URL}/dashboard`)}
    </td></tr></table>
  `;

  return {
    to: "",
    subject,
    html: layout(`Payment of ${amount} confirmed for ${purpose}.`, body),
  };
}

export function consultationBookingEmail(
  userName: string,
  date: string,
  duration: number,
): EmailParams {
  const body = `
    ${heroBlock(ICONS.clock, "Booking Confirmed", `Your ${duration}-minute Strategy Session is scheduled.`)}
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 36px 32px;">
      ${greeting(userName)}
      ${bodyText(`<p style="margin:0 0 20px;">Your ${highlight(`${duration}-minute Strategy Session`)} has been confirmed.</p>`)}

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #ede8e1;border-radius:10px;overflow:hidden;margin:0 0 24px;">
        <tr><td style="background:#fdf8f0;padding:16px 20px;border-bottom:1px solid #ede8e1;">
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:700;color:#1a1107;">Session Details</p>
        </td></tr>
        <tr><td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${receiptRow(ICONS.calendar, "Date & time", date)}
            ${receiptRow(ICONS.clock, "Duration", `${duration} minutes`, true)}
          </table>
        </td></tr>
      </table>

      ${calloutBlock(ICONS.barChart, "What happens next?", "The meeting link will be sent to you before your session. You can also view your booking details in your dashboard.")}
      ${ctaButton("View booking details", `${WEB_URL}/consultations`)}
    </td></tr></table>
  `;

  return {
    to: "",
    subject: "Strategy Session booking confirmed",
    html: layout(
      `Your ${duration}-minute Strategy Session has been confirmed for ${date}.`,
      body,
    ),
  };
}

export function mentorshipWelcomeEmail(
  userName: string,
  mentorName: string,
): EmailParams {
  const body = `
    ${heroBlock(ICONS.users, "Mentorship Active", "Your 30-Day Guidance membership has started.")}
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 36px 32px;">
      ${greeting(userName)}
      ${bodyText(`
        <p style="margin:0 0 16px;">Your 30-Day Guidance membership is now active. Welcome.</p>
        <p style="margin:0 0 20px;">You have been matched with ${highlight(mentorName)}, who will be supporting you over the next 30 days.</p>
        <p style="margin:0;">Head to your messages to introduce yourself and discuss how you would like to structure your sessions together.</p>
      `)}
      ${ctaButton("Message your mentor", `${WEB_URL}/messages`)}
    </td></tr></table>
  `;

  return {
    to: "",
    subject: "Your 30-Day Guidance membership is active",
    html: layout(
      `You have been matched with ${mentorName}. Your mentorship begins now.`,
      body,
    ),
  };
}

export function newMessageEmail(userName: string): EmailParams {
  const body = `
    ${heroBlock(ICONS.mail, "New Message", "The OppDate team has sent you a message.")}
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 36px 32px;">
      ${greeting(userName)}
      ${bodyText(`
        <p style="margin:0 0 16px;">The OppDate team has sent you a new message regarding your application.</p>
        <p style="margin:0;">Log in to your dashboard to read and respond. Timely replies help keep your application moving forward.</p>
      `)}
      ${ctaButton("Read the message", `${WEB_URL}/messages`)}
    </td></tr></table>
  `;

  return {
    to: "",
    subject: "New message from the OppDate team",
    html: layout(
      "The OppDate team has sent you a new message. Log in to read and reply.",
      body,
    ),
  };
}

export function deadlineReminderEmail(
  userName: string,
  oppTitle: string,
  daysLeft: number,
): EmailParams {
  const urgency = daysLeft <= 2;
  const dayWord = daysLeft === 1 ? "day" : "days";

  const body = `
    ${heroBlock(ICONS.bell, urgency ? "Urgent Reminder" : "Deadline Reminder", `${daysLeft} ${dayWord} remaining for ${oppTitle}.`)}
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 36px 32px;">
      ${greeting(userName)}
      ${bodyText(`<p style="margin:0 0 20px;">This is a reminder that the deadline for an opportunity you are tracking is coming up.</p>`)}

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${urgency ? "#fca5a5" : "#ede8e1"};border-radius:10px;overflow:hidden;margin:0 0 24px;">
        <tr><td style="background:${urgency ? "#fef2f2" : "#fdf8f0"};padding:18px 20px;">
          <p style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:700;color:#1a1107;">${oppTitle}</p>
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${urgency ? "#b91c1c" : "#6b5840"};">
            Deadline in ${highlight(`${daysLeft} ${dayWord}`)}
            ${urgency ? " -- act now" : ""}
          </p>
        </td></tr>
      </table>

      ${bodyText(`<p style="margin:0;">Log in to check your application status and ensure everything is in order before the deadline closes.</p>`)}
      ${ctaButton("Check your application", `${WEB_URL}/applications`)}
    </td></tr></table>
  `;

  return {
    to: "",
    subject: `Deadline in ${daysLeft} ${dayWord}: ${oppTitle}`,
    html: layout(
      `The deadline for "${oppTitle}" is in ${daysLeft} ${dayWord}. Make sure your application is ready.`,
      body,
    ),
  };
}

export function savedSearchAlertEmail(
  userName: string,
  searchName: string,
  matches: { title: string }[],
): EmailParams {
  const shown = matches.slice(0, 5);
  const extra =
    matches.length > 5
      ? `<p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b5840;">...and ${matches.length - 5} more new matches.</p>`
      : "";
  const listItems = shown
    .map(
      (m, i) =>
        `<tr><td style="padding:10px 0;${i < shown.length - 1 ? "border-bottom:1px solid #ede8e1;" : ""}font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#3d2f1a;">${m.title}</td></tr>`,
    )
    .join("");

  const body = `
    ${heroBlock(ICONS.search, `${matches.length} New Match${matches.length === 1 ? "" : "es"}`, `New opportunities matching "${searchName}".`)}
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 36px 32px;">
      ${greeting(userName)}
      ${bodyText(`<p style="margin:0 0 20px;">We found new opportunities matching your saved search ${highlight(`"${searchName}"`)}.</p>`)}

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #ede8e1;border-radius:10px;overflow:hidden;margin:0 0 20px;">
        <tr><td style="background:#fdf8f0;padding:14px 20px;border-bottom:1px solid #ede8e1;">
          <span style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#1a1107;">Matching opportunities</span>
        </td></tr>
        <tr><td style="padding:4px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${listItems}
          </table>
        </td></tr>
      </table>
      ${extra}

      ${bodyText(`<p style="margin:0;">Log in to view the full listings and start your applications before the deadlines close.</p>`)}
      ${ctaButton("Browse new matches", `${WEB_URL}/opportunities`)}
    </td></tr></table>
  `;

  return {
    to: "",
    subject: `${matches.length} new match${matches.length === 1 ? "" : "es"} for "${searchName}"`,
    html: layout(
      `${matches.length} new opportunities match your saved search "${searchName}".`,
      body,
    ),
  };
}

export function securityAlertEmail(
  userName: string,
  event: string,
): EmailParams {
  const body = `
    ${heroBlock(ICONS.shield, "Security Notice", "We detected activity on your account.", 40)}
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 36px 32px;">
      ${greeting(userName)}
      ${bodyText(`<p style="margin:0 0 20px;">We detected the following activity on your OppDate account:</p>`)}

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #fca5a5;border-radius:10px;overflow:hidden;margin:0 0 24px;">
        <tr><td style="background:#fef2f2;padding:18px 20px;">
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#7f1d1d;font-weight:600;">${event}</p>
        </td></tr>
      </table>

      ${bodyText(`
        <p style="margin:0 0 16px;">If this was you, no further action is needed.</p>
        <p style="margin:0;">If you do not recognise this activity, change your password immediately and contact our support team at <a href="mailto:${process.env.SUPPORT_EMAIL || "support@oppdate.app"}" style="color:#c4881c;text-decoration:none;font-weight:600;">${process.env.SUPPORT_EMAIL || "support@oppdate.app"}</a>.</p>
      `)}
      ${ctaButton("Secure your account", `${WEB_URL}/settings`)}
    </td></tr></table>
  `;

  return {
    to: "",
    subject: "OppDate account security notice",
    html: layout("We detected new activity on your OppDate account.", body),
  };
}

export function welcomeEmail(userName: string): EmailParams {
  const body = `
    ${heroBlock(ICONS.checkCircle, "Welcome to OppDate", "Your account is set up and ready to go.")}
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 36px 32px;">
      ${greeting(userName)}
      ${bodyText(`<p style="margin:0 0 20px;">Here is what you can do from your dashboard:</p>`)}

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #ede8e1;border-radius:10px;overflow:hidden;margin:0 0 24px;">
        <tr>
          <td style="padding:14px 20px;background:#fdf8f0;border-bottom:1px solid #ede8e1;">
            <strong style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1107;">Browse opportunities</strong>
            <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b5840;">Scholarships, grants, fellowships, and more -- filtered to what matters to you.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 20px;background:#ffffff;border-bottom:1px solid #ede8e1;">
            <strong style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1107;">Save and track</strong>
            <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b5840;">Bookmark opportunities, set up search alerts, and never miss a deadline.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 20px;background:#fdf8f0;">
            <strong style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1107;">Apply with support</strong>
            <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b5840;">Upload your documents once and use OppDate Apply when you are ready for hands-on help.</p>
          </td>
        </tr>
      </table>

      ${bodyText(`<p style="margin:0;">Start by completing your profile -- it helps us surface the most relevant opportunities for you.</p>`)}
      ${ctaButton("Go to your dashboard", `${WEB_URL}/dashboard`)}
    </td></tr></table>
  `;

  return {
    to: "",
    subject: "Welcome to OppDate",
    html: layout("Your OppDate account is ready. Start exploring opportunities.", body),
  };
}

export function passwordResetEmail(
  userName: string,
  resetLink: string,
  expiry: string,
): EmailParams {
  const body = `
    ${heroBlock(ICONS.key, "Password Reset", "A password reset was requested for your account.")}
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 36px 32px;">
      ${greeting(userName)}
      ${bodyText(`
        <p style="margin:0 0 16px;">We received a request to reset the password on your OppDate account.</p>
        <p style="margin:0 0 16px;">Click the button below to choose a new password. This link expires in ${highlight(expiry)}.</p>
      `)}
      ${ctaButton("Reset your password", resetLink)}
      ${bodyText(`
        <p style="margin:24px 0 0;font-size:13px;color:#6b5840;">If you did not request this, you can safely ignore this email. Your password will remain unchanged.</p>
      `)}
    </td></tr></table>
  `;

  return {
    to: "",
    subject: "Reset your OppDate password",
    html: layout("A password reset was requested for your OppDate account.", body),
  };
}

export function subscriptionExpiryWarningEmail(
  userName: string,
  daysLeft: number,
): EmailParams {
  const dayWord = daysLeft === 1 ? "day" : "days";
  const body = `
    ${heroBlock(ICONS.star, "Subscription Expiring", `Your Premium access expires in ${daysLeft} ${dayWord}.`)}
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 36px 32px;">
      ${greeting(userName)}
      ${bodyText(`<p style="margin:0 0 20px;">Your OppDate Premium subscription expires in ${highlight(`${daysLeft} ${dayWord}`)}.</p>`)}

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #ede8e1;border-radius:10px;overflow:hidden;margin:0 0 24px;">
        <tr><td style="background:#fdf8f0;padding:18px 20px;">
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6b3f0a;line-height:1.6;">After your subscription ends, you will lose access to premium opportunity listings, priority application support, and AI-powered recommendations.</p>
        </td></tr>
      </table>

      ${bodyText(`<p style="margin:0;">Renew now to keep your access uninterrupted.</p>`)}
      ${ctaButton("Renew your subscription", `${WEB_URL}/pricing`)}
    </td></tr></table>
  `;

  return {
    to: "",
    subject: `Your OppDate Premium expires in ${daysLeft} ${dayWord}`,
    html: layout(`Your Premium subscription expires in ${daysLeft} ${dayWord}. Renew to keep access.`, body),
  };
}

export function subscriptionExpiredEmail(userName: string): EmailParams {
  const body = `
    ${heroBlock(ICONS.star, "Subscription Expired", "Your Premium membership has ended.")}
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 36px 32px;">
      ${greeting(userName)}
      ${bodyText(`
        <p style="margin:0 0 16px;">Your OppDate Premium subscription has expired.</p>
        <p style="margin:0 0 16px;">You still have access to your account, saved opportunities, and documents. However, premium features -- including full opportunity listings, priority support, and AI recommendations -- are no longer available.</p>
        <p style="margin:0;">Reactivate any time to pick up where you left off.</p>
      `)}
      ${ctaButton("Reactivate Premium", `${WEB_URL}/pricing`)}
    </td></tr></table>
  `;

  return {
    to: "",
    subject: "Your OppDate Premium subscription has expired",
    html: layout("Your Premium subscription has ended. Reactivate to regain full access.", body),
  };
}

export function adminInviteEmail(
  name: string,
  inviteLink: string,
): EmailParams {
  const body = `
    ${heroBlock(ICONS.shield, "Admin Invitation", "You have been invited to the OppDate admin panel.", 40)}
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 36px 32px;">
      ${greeting(name)}
      ${bodyText(`
        <p style="margin:0 0 16px;">Click the button below to set your password and activate your account.</p>
        <p style="margin:0 0 16px;">This link expires in 48 hours. If you did not expect this invitation, you can ignore this email.</p>
      `)}
      ${ctaButton("Accept invite", inviteLink)}
    </td></tr></table>
  `;
  return {
    to: "",
    subject: "You have been invited to the OppDate admin panel",
    html: layout("Your OppDate admin invitation", body),
  };
}
