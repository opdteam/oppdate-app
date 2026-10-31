const RESEND_API_URL = 'https://api.resend.com/emails'

interface EmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return false

  const from = process.env.EMAIL_FROM || 'OppDate <noreply@oppdate.com>'

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

// ─── Layout ─────────────────────────────────────────────────────────────────

const WEB_URL = process.env.WEB_URL || 'https://oppdate.com'

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
<body style="margin:0;padding:0;background:#f5f0eb;font-family:Georgia,'Times New Roman',serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- preheader (hidden preview text) -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;</div>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f0eb;min-height:100vh;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1a1107;padding:28px 40px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <img src="${WEB_URL}/assets/oppdate-monogram.png" alt="OppDate" width="36" height="36" style="display:block;border:0;" />
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Amber divider -->
        <tr>
          <td style="height:3px;background:linear-gradient(90deg,#c4881c,#d4973a,#c4881c);font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            ${bodyContent}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px 32px;border-top:1px solid #ede8e1;">
            <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a09070;line-height:1.5;">
              You are receiving this email because you have an active OppDate account.
            </p>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a09070;line-height:1.5;">
              &copy; ${new Date().getFullYear()} OppDate &mdash; All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`
}

function greeting(name: string): string {
  return `<p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:17px;color:#1a1107;line-height:1.5;">Hi ${name},</p>`
}

function ctaButton(label: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;">
    <tr>
      <td style="background:#c4881c;border-radius:5px;">
        <a href="${url}" target="_blank" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.2px;">${label}</a>
      </td>
    </tr>
  </table>`
}

function bodyText(html: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#3d2f1a;line-height:1.7;">${html}</div>`
}

function highlight(text: string): string {
  return `<strong style="color:#1a1107;">${text}</strong>`
}

function badge(text: string): string {
  return `<span style="display:inline-block;padding:3px 10px;background:#fdf3e3;border:1px solid #e4b86a;border-radius:4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;color:#8a5e10;">${text}</span>`
}

// ─── Status label map ────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  eligibility_screening: 'Eligibility Screening',
  document_collection:   'Document Collection',
  awaiting_payment:      'Awaiting Payment',
  payment_confirmed:     'Payment Confirmed',
  submitted:             'Application Submitted',
  under_review:          'Under Review',
  decision_pending:      'Decision Pending',
  accepted:              'Accepted',
  rejected:              'Not Selected',
  withdrawn:             'Withdrawn',
}

function formatStatus(status: string): string {
  return STATUS_LABEL[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Status context copy ─────────────────────────────────────────────────────

const STATUS_CONTEXT: Record<string, string> = {
  payment_confirmed:     'Your payment has been received and your application file has been opened. Our team will begin reviewing your documents shortly.',
  under_review:          'Our team is actively reviewing your application. We will be in touch if we need anything further.',
  decision_pending:      'Your application has completed our review process and a final decision is being made. We will notify you as soon as it is ready.',
  submitted:             'Your application has been formally submitted to the opportunity provider on your behalf.',
  accepted:              'Congratulations - your application has been accepted. Please log in to your dashboard for the next steps.',
  rejected:              'After careful review, we were unable to proceed with your application at this time. You can reach out to our team if you have questions.',
  withdrawn:             'Your application has been marked as withdrawn. Please contact our team if this was done in error.',
}

// ─── Templates ───────────────────────────────────────────────────────────────

export function applicationStatusEmail(userName: string, referenceId: string, newStatus: string): EmailParams {
  const label = formatStatus(newStatus)
  const context = STATUS_CONTEXT[newStatus] ?? 'Your application status has been updated. Log in to your dashboard to view the latest details.'
  const isDone = ['accepted', 'rejected', 'withdrawn'].includes(newStatus)

  const body = `
    ${greeting(userName)}
    ${bodyText(`
      <p style="margin:0 0 16px;">Your application ${highlight(referenceId)} has a new status:</p>
      <p style="margin:0 0 20px;">${badge(label)}</p>
      <p style="margin:0 0 16px;">${context}</p>
      ${isDone ? '' : '<p style="margin:0;color:#6b5840;">If you have any questions, reply to your application message thread and our team will respond.</p>'}
    `)}
    ${ctaButton('View your application', `${WEB_URL}/applications`)}
  `

  return {
    to: '',
    subject: `[${referenceId}] Status update: ${label}`,
    html: layout(`Your application ${referenceId} status has been updated to: ${label}.`, body),
  }
}

export interface PaymentReceiptParams {
  userName: string
  amount: string
  purpose: string
  referenceId?: string
  gatewayPaymentId?: string
  gateway?: string
  date?: string
}

export function paymentConfirmationEmail(params: PaymentReceiptParams): EmailParams {
  const { userName, amount, purpose, referenceId, gatewayPaymentId, gateway, date } = params
  const subject = referenceId ? `[${referenceId}] Payment confirmed` : 'Payment confirmed'
  const displayDate = date ?? new Date().toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

  const GATEWAY_NAMES: Record<string, string> = {
    stripe: 'Stripe',
    paystack: 'Paystack',
    flutterwave: 'Flutterwave',
    lemon_squeezy: 'Lemon Squeezy',
  }
  const gatewayName = gateway ? (GATEWAY_NAMES[gateway] ?? gateway) : null

  const receiptRows = [
    referenceId ? `<tr><td style="padding:8px 0;border-bottom:1px solid #ede8e1;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#a09070;width:40%;">Reference</td><td style="padding:8px 0;border-bottom:1px solid #ede8e1;font-family:'DM Mono',monospace,Arial,sans-serif;font-size:13px;color:#1a1107;font-weight:600;">${referenceId}</td></tr>` : '',
    `<tr><td style="padding:8px 0;border-bottom:1px solid #ede8e1;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#a09070;">Service</td><td style="padding:8px 0;border-bottom:1px solid #ede8e1;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1107;">${purpose}</td></tr>`,
    `<tr><td style="padding:8px 0;border-bottom:1px solid #ede8e1;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#a09070;">Amount</td><td style="padding:8px 0;border-bottom:1px solid #ede8e1;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1107;font-weight:600;">${amount}</td></tr>`,
    gatewayName ? `<tr><td style="padding:8px 0;border-bottom:1px solid #ede8e1;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#a09070;">Paid via</td><td style="padding:8px 0;border-bottom:1px solid #ede8e1;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1107;">${gatewayName}</td></tr>` : '',
    gatewayPaymentId ? `<tr><td style="padding:8px 0;border-bottom:1px solid #ede8e1;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#a09070;">Transaction ID</td><td style="padding:8px 0;border-bottom:1px solid #ede8e1;font-family:'DM Mono',monospace,Arial,sans-serif;font-size:11px;color:#6b5840;">${gatewayPaymentId}</td></tr>` : '',
    `<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#a09070;">Date</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1107;">${displayDate}</td></tr>`,
  ].filter(Boolean).join('')

  const body = `
    ${greeting(userName)}
    ${bodyText(`<p style="margin:0 0 24px;">We have received your payment. Here is your receipt:</p>`)}
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #ede8e1;border-radius:6px;overflow:hidden;margin:0 0 24px;">
      <tr><td style="background:#fdf3e3;padding:14px 18px;border-bottom:1px solid #ede8e1;" colspan="2">
        <span style="font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:700;color:#1a1107;">Payment Receipt</span>
      </td></tr>
      <tr><td colspan="2" style="padding:0 18px;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
          ${receiptRows}
        </table>
      </td></tr>
    </table>
    ${bodyText(`<p style="margin:0;color:#6b5840;">Keep this email as your proof of payment. If you have any questions, contact us through your dashboard.</p>`)}
    ${ctaButton('Go to your dashboard', `${WEB_URL}/dashboard`)}
  `

  return {
    to: '',
    subject,
    html: layout(`Payment of ${amount} confirmed for ${purpose}.`, body),
  }
}

export function consultationBookingEmail(userName: string, date: string, duration: number): EmailParams {
  const body = `
    ${greeting(userName)}
    ${bodyText(`
      <p style="margin:0 0 16px;">Your ${highlight(`${duration}-minute Strategy Session`)} is confirmed.</p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;background:#fdf3e3;border-left:3px solid #c4881c;border-radius:0 4px 4px 0;">
        <tr>
          <td style="padding:14px 18px;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6b3f0a;"><strong>Date &amp; time:</strong> ${date}</p>
            <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6b3f0a;"><strong>Duration:</strong> ${duration} minutes</p>
          </td>
        </tr>
      </table>
      <p style="margin:0;">The meeting link will be sent to you before your session. You can also view your booking details in your dashboard.</p>
    `)}
    ${ctaButton('View booking details', `${WEB_URL}/consultations`)}
  `

  return {
    to: '',
    subject: 'Strategy Session booking confirmed',
    html: layout(`Your ${duration}-minute Strategy Session has been confirmed for ${date}.`, body),
  }
}

export function mentorshipWelcomeEmail(userName: string, mentorName: string): EmailParams {
  const body = `
    ${greeting(userName)}
    ${bodyText(`
      <p style="margin:0 0 16px;">Your 30-Day Guidance membership is now active. Welcome.</p>
      <p style="margin:0 0 20px;">You have been matched with ${highlight(mentorName)}, who will be supporting you over the next 30 days.</p>
      <p style="margin:0;">Head to your messages to introduce yourself and discuss how you would like to structure your sessions together.</p>
    `)}
    ${ctaButton('Message your mentor', `${WEB_URL}/messages`)}
  `

  return {
    to: '',
    subject: 'Your 30-Day Guidance membership is active',
    html: layout(`You have been matched with ${mentorName}. Your mentorship begins now.`, body),
  }
}

export function newMessageEmail(userName: string): EmailParams {
  const body = `
    ${greeting(userName)}
    ${bodyText(`
      <p style="margin:0 0 16px;">The OppDate team has sent you a new message regarding your application.</p>
      <p style="margin:0;">Log in to your dashboard to read and respond. Timely replies help keep your application moving forward.</p>
    `)}
    ${ctaButton('Read the message', `${WEB_URL}/messages`)}
  `

  return {
    to: '',
    subject: 'New message from the OppDate team',
    html: layout('The OppDate team has sent you a new message. Log in to read and reply.', body),
  }
}

export function deadlineReminderEmail(userName: string, oppTitle: string, daysLeft: number): EmailParams {
  const urgency = daysLeft <= 2
  const dayWord = daysLeft === 1 ? 'day' : 'days'
  const urgencyNote = urgency
    ? '<p style="margin:16px 0 0;color:#b91c1c;font-weight:600;">This deadline is approaching fast. Please ensure your application is complete.</p>'
    : ''

  const body = `
    ${greeting(userName)}
    ${bodyText(`
      <p style="margin:0 0 16px;">This is a reminder that the deadline for an opportunity you are tracking is coming up.</p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;background:#fdf3e3;border-left:3px solid ${urgency ? '#ef4444' : '#c4881c'};border-radius:0 4px 4px 0;">
        <tr>
          <td style="padding:14px 18px;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#3d2f1a;"><strong>${oppTitle}</strong></p>
            <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${urgency ? '#b91c1c' : '#6b3f0a'};">Deadline in ${highlight(`${daysLeft} ${dayWord}`)}</p>
          </td>
        </tr>
      </table>
      <p style="margin:0;">Log in to check your application status and ensure everything is in order before the deadline closes.${urgencyNote}</p>
    `)}
    ${ctaButton('Check your application', `${WEB_URL}/applications`)}
  `

  return {
    to: '',
    subject: `Deadline in ${daysLeft} ${dayWord}: ${oppTitle}`,
    html: layout(`The deadline for "${oppTitle}" is in ${daysLeft} ${dayWord}. Make sure your application is ready.`, body),
  }
}

export function savedSearchAlertEmail(userName: string, searchName: string, matches: { title: string }[]): EmailParams {
  const shown = matches.slice(0, 5)
  const extra = matches.length > 5 ? `<p style="margin:12px 0 0;color:#6b5840;">...and ${matches.length - 5} more new matches.</p>` : ''
  const listItems = shown.map(m => `<li style="padding:5px 0;border-bottom:1px solid #ede8e1;">${m.title}</li>`).join('')

  const body = `
    ${greeting(userName)}
    ${bodyText(`
      <p style="margin:0 0 16px;">New opportunities matching your saved search ${highlight(`"${searchName}"`)}: ${highlight(`${matches.length} new match${matches.length === 1 ? '' : 'es'}`)}</p>
      <ul style="margin:0 0 8px;padding:0 0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#3d2f1a;line-height:1.7;list-style:none;">
        ${listItems}
      </ul>
      ${extra}
      <p style="margin:20px 0 0;">Log in to view the full listings and start your applications before the deadlines close.</p>
    `)}
    ${ctaButton('Browse new matches', `${WEB_URL}/opportunities`)}
  `

  return {
    to: '',
    subject: `${matches.length} new match${matches.length === 1 ? '' : 'es'} for "${searchName}"`,
    html: layout(`${matches.length} new opportunities match your saved search "${searchName}".`, body),
  }
}

export function securityAlertEmail(userName: string, event: string): EmailParams {
  const body = `
    ${greeting(userName)}
    ${bodyText(`
      <p style="margin:0 0 16px;">We detected the following activity on your OppDate account:</p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;background:#fff5f5;border-left:3px solid #ef4444;border-radius:0 4px 4px 0;">
        <tr>
          <td style="padding:14px 18px;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#7f1d1d;">${event}</p>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 16px;">If this was you, no further action is needed.</p>
      <p style="margin:0;">If you do not recognise this activity, change your password immediately and contact our support team at <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@oppdate.com'}" style="color:#c4881c;text-decoration:none;">${process.env.SUPPORT_EMAIL || 'support@oppdate.com'}</a>.</p>
    `)}
    ${ctaButton('Secure your account', `${WEB_URL}/settings`)}
  `

  return {
    to: '',
    subject: 'OppDate account security notice',
    html: layout('We detected new activity on your OppDate account.', body),
  }
}

export function adminInviteEmail(name: string, inviteLink: string): EmailParams {
  const body = `
    ${greeting(name)}
    ${bodyText(`
      <p style="margin:0 0 16px;">You have been invited to join the OppDate admin panel. Click the button below to set your password and activate your account.</p>
      <p style="margin:0 0 16px;">This link expires in 48 hours. If you did not expect this invitation, you can ignore this email.</p>
    `)}
    ${ctaButton('Accept invite', inviteLink)}
  `
  return {
    to: '',
    subject: 'You have been invited to the OppDate admin panel',
    html: layout('Your OppDate admin invitation', body),
  }
}
