import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'
import type { LegalSection } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Learn how OppDate collects, uses, and protects your personal information.',
}

const sections: LegalSection[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    content: (
      <>
        <p>
          OppDate ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains what personal information we collect when you use the OppDate platform, how we use it, who we share it with, and the rights you have over your data.
        </p>
        <p>
          This Policy applies to all users of the OppDate website and platform, including free and paid subscribers, applicants using OppDate Apply, and visitors who have not created an account.
        </p>
        <div className="notice">
          <p><strong>Summary:</strong> We collect only what we need to run our services. We do not sell your personal data. We use industry-standard security practices to protect it.</p>
        </div>
      </>
    ),
  },
  {
    id: 'data-collected',
    title: 'Information We Collect',
    content: (
      <>
        <p>We collect information in three ways: information you give us directly, information generated as you use the platform, and information from third-party services you connect.</p>

        <p><strong>Information you provide directly:</strong></p>
        <ul>
          <li><strong>Account registration</strong> - name, email address, password (stored as a secure hash), country, and profile preferences.</li>
          <li><strong>Onboarding preferences</strong> - your goals, field of study, education level, interests, and nationality, used to personalise opportunity recommendations.</li>
          <li><strong>Application materials</strong> - CVs, personal statements, certificates, transcripts, and any other documents you upload to your credential library or submit as part of an OppDate Apply engagement.</li>
          <li><strong>Payment information</strong> - billing details collected and processed by our payment partners (Stripe, Paystack, Flutterwave). We do not store raw card numbers on our servers.</li>
          <li><strong>Communications</strong> - messages you send through the in-platform messaging system to the OppDate team, and any support enquiries.</li>
          <li><strong>OppDate Guide conversations</strong> - messages you exchange with the AI Guide, stored for quality assurance and service improvement.</li>
        </ul>

        <p><strong>Information generated automatically:</strong></p>
        <ul>
          <li>Log data including IP address, browser type, device type, referring URLs, and pages visited.</li>
          <li>Usage data including opportunities viewed, searches performed, features used, and session duration.</li>
          <li>Application status and pipeline progression within OppDate Apply.</li>
        </ul>

        <p><strong>Information from third parties:</strong></p>
        <ul>
          <li>If you sign in using Google OAuth, we receive your name, email address, and profile picture from Google, subject to your Google account privacy settings.</li>
          <li>Payment confirmation data from Stripe, Paystack, or Flutterwave upon successful transactions.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'how-we-use',
    title: 'How We Use Your Information',
    content: (
      <>
        <p>We use the information we collect for the following purposes:</p>
        <ul>
          <li><strong>Providing and improving our services</strong> - delivering the platform features you use, processing your applications, scheduling consultations, and fulfilling purchases.</li>
          <li><strong>AI-powered personalisation</strong> - generating opportunity recommendations, eligibility assessments, and OppDate Guide responses tailored to your profile and history.</li>
          <li><strong>Communications</strong> - sending transactional emails (booking confirmations, application updates, password resets), and service notifications. We will only send marketing communications if you have opted in.</li>
          <li><strong>Safety and fraud prevention</strong> - detecting and preventing fraudulent activity, verifying identity where required, and enforcing our Terms of Service.</li>
          <li><strong>Analytics and service improvement</strong> - understanding how users interact with the platform to improve features, fix bugs, and prioritise development.</li>
          <li><strong>Legal compliance</strong> - meeting our obligations under applicable law, including responding to lawful requests from authorities.</li>
        </ul>
        <p>
          We process your data on the following legal bases: performance of a contract (to deliver services you have paid for), legitimate interests (to improve and secure the platform), compliance with legal obligations, and consent where explicitly obtained.
        </p>
      </>
    ),
  },
  {
    id: 'credentials',
    title: 'Application Credentials and Sensitive Documents',
    content: (
      <>
        <p>
          OppDate Apply may require you to provide access credentials to external application portals (e.g. a university submission portal) so that our team can submit on your behalf. We handle these with the highest level of care:
        </p>
        <ul>
          <li>Credentials shared through the messaging system are used solely for the specific submission they were provided for.</li>
          <li>We do not store external login credentials in our database. After submission, you are responsible for changing those credentials immediately.</li>
          <li>Application documents (CVs, transcripts, statements) are stored securely in cloud storage with access restricted to your assigned application team member and platform administrators.</li>
          <li>Sensitive document fields in the database are encrypted at rest using AES-256 encryption.</li>
        </ul>
        <div className="notice">
          <p><strong>Important:</strong> Always change any passwords or credentials you share with us immediately after your application has been submitted. OppDate will never ask for banking credentials, national ID PINs, or any credential that is not directly related to your application portal.</p>
        </div>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'How We Share Your Information',
    content: (
      <>
        <p>We do not sell your personal data. We share your information only in the following circumstances:</p>
        <ul>
          <li><strong>Service providers</strong> - we share data with trusted third-party vendors who help us operate the platform, including cloud hosting, payment processors, email delivery, error monitoring, and AI processing services. These providers are bound by data processing agreements and may only use your data to provide their services to us.</li>
          <li><strong>OppDate Apply submissions</strong> - when submitting your application on your behalf, we share your application materials with the target institution as directed by you.</li>
          <li><strong>Legal requirements</strong> - we may disclose your information if required to do so by law, court order, or in response to a lawful request from a government authority.</li>
          <li><strong>Business transfers</strong> - in the event of a merger, acquisition, or sale of all or part of our business, your data may be transferred as part of that transaction. We will notify you before your data becomes subject to a different privacy policy.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'ai-data',
    title: 'AI Processing and OppDate Guide',
    content: (
      <>
        <p>
          OppDate Guide is powered by third-party AI services. Messages you send and relevant context from your session are processed externally to generate responses. This is necessary for the Guide to function.
        </p>
        <p>
          Your Guide conversations are stored on OppDate's servers and may be reviewed by the OppDate team for quality assurance and safety monitoring. We do not use your conversations to train external AI models.
        </p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'Data Retention',
    content: (
      <>
        <p>We retain your personal data for as long as your account is active or as needed to provide services. Specifically:</p>
        <ul>
          <li><strong>Account data</strong> - retained until you delete your account, plus 30 days to allow for recovery requests.</li>
          <li><strong>Application materials and documents</strong> - retained for 24 months after your last active application, after which they are deleted unless you request earlier deletion.</li>
          <li><strong>Payment records</strong> - retained for 7 years as required for financial record-keeping and tax compliance.</li>
          <li><strong>Guide conversation logs</strong> - retained for 12 months from the date of the session, then permanently deleted.</li>
          <li><strong>Log and usage data</strong> - retained for 90 days.</li>
        </ul>
        <p>
          When we delete your data, it is removed from our active systems and from backups within 30 days.
        </p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    content: (
      <>
        <p>We implement industry-standard security measures to protect your personal data, including:</p>
        <ul>
          <li>TLS encryption for all data in transit between your browser and our servers.</li>
          <li>AES-256 encryption at rest for sensitive database fields.</li>
          <li>Passwords stored as cryptographic hashes - we cannot recover your plain-text password.</li>
          <li>JWT-based authentication with short-lived access tokens.</li>
          <li>Role-based access controls limiting which team members can access which data.</li>
          <li>Third-party file storage (Cloudflare R2) with private bucket access and signed URLs for downloads.</li>
          <li>Real-time error monitoring and alerting via Sentry.</li>
        </ul>
        <p>
          No method of transmission over the internet or electronic storage is completely secure. While we strive to protect your personal data, we cannot guarantee its absolute security. In the event of a data breach affecting your rights and freedoms, we will notify you and relevant authorities as required by applicable law.
        </p>
      </>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your Rights',
    content: (
      <>
        <p>Depending on your location, you may have the following rights regarding your personal data:</p>
        <ul>
          <li><strong>Access</strong> - request a copy of the personal data we hold about you.</li>
          <li><strong>Correction</strong> - request that we correct inaccurate or incomplete data.</li>
          <li><strong>Deletion</strong> - request that we delete your personal data, subject to our legal obligations to retain certain records.</li>
          <li><strong>Portability</strong> - request your data in a structured, machine-readable format.</li>
          <li><strong>Objection</strong> - object to our processing of your data where we rely on legitimate interests as the legal basis.</li>
          <li><strong>Withdrawal of consent</strong> - where we process data based on your consent, you may withdraw that consent at any time without affecting the lawfulness of prior processing.</li>
          <li><strong>Restriction</strong> - request that we restrict processing of your data in certain circumstances.</li>
        </ul>
        <p>
          To exercise any of these rights, contact us at <strong>privacy@oppdate.com</strong>. We will respond within 30 days. We may need to verify your identity before processing your request.
        </p>
        <div className="notice">
          <p>You can delete your account directly from your profile settings at any time. This initiates our data deletion process without needing to contact us.</p>
        </div>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and Tracking',
    content: (
      <>
        <p>
          OppDate uses a minimal set of cookies and local storage to operate the platform:
        </p>
        <ul>
          <li><strong>Authentication</strong> - we store your JWT access token in localStorage to keep you signed in. This is essential for the platform to function.</li>
          <li><strong>Preferences</strong> - local storage keys may store UI preferences such as collapsed panel states, so the interface remembers your choices between visits.</li>
          <li><strong>Analytics</strong> - we may use privacy-respecting analytics tools to understand how the platform is used in aggregate. These do not track you individually across the web.</li>
        </ul>
        <p>
          We do not use third-party advertising cookies or sell data to ad networks.
        </p>
      </>
    ),
  },
  {
    id: 'children',
    title: "Children's Privacy",
    content: (
      <>
        <p>
          OppDate is not directed at children under the age of 16. We do not knowingly collect personal data from anyone under 16 without verifiable parental consent. If you believe we have collected data from a child under 16 without appropriate consent, please contact us at <strong>privacy@oppdate.com</strong> and we will delete it promptly.
        </p>
      </>
    ),
  },
  {
    id: 'international',
    title: 'International Data Transfers',
    content: (
      <>
        <p>
          OppDate operates globally and your data may be transferred to and processed in countries other than your own, including the United States, where our infrastructure providers are based. These countries may have different data protection laws than your jurisdiction.
        </p>
        <p>
          Where we transfer data internationally, we ensure appropriate safeguards are in place, such as standard contractual clauses or reliance on providers that participate in recognised frameworks.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to This Policy',
    content: (
      <>
        <p>
          We may update this Privacy Policy from time to time. When we make material changes, we will notify you by email or by displaying a prominent notice on the platform. The "last updated" date at the top of this page will always reflect the most recent revision.
        </p>
        <p>
          Your continued use of OppDate after a policy change constitutes your acceptance of the revised policy.
        </p>
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Contact and Data Requests',
    content: (
      <>
        <p>For any privacy-related questions, data access requests, or concerns, contact us:</p>
        <ul>
          <li>Email: <strong>privacy@oppdate.com</strong></li>
          <li>General support: <strong>support@oppdate.com</strong></li>
          <li>Platform: Use the Help section within your OppDate account</li>
        </ul>
        <p>
          We aim to respond to all data-related requests within 30 days. For account deletion, you can also proceed directly from your profile settings without contacting us.
        </p>
        <div className="notice">
          <p>If you are unsatisfied with our response to a privacy concern, you may have the right to lodge a complaint with the relevant data protection authority in your country.</p>
        </div>
      </>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      subtitle="We believe you have a right to know exactly what happens to your data. This policy explains it plainly - no legalese where plain language works better."
      effectiveDate="1 November 2026"
      lastUpdated="7 November 2026"
      sections={sections}
      companionLabel="Terms of Service"
      companionHref="/legal/terms"
    />
  )
}
