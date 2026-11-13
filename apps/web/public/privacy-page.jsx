/* Privacy Policy page content. Loaded by /legal/privacy/index.html */

const e = React.createElement;

const SECTIONS = [
  {
    id: 'introduction',
    title: 'Introduction',
    content: e('div', null,
      e('p', null, 'OppDate LLC ("OppDate," "we," "our," "us") is committed to protecting your privacy. This Privacy Policy explains what personal information we collect when you use the OppDate platform, how we use it, who we share it with, and the rights you have over your data.'),
      e('p', null, 'This Policy applies to all users of the OppDate website and platform, including free and paid subscribers, applicants using OppDate Apply, and visitors who have not created an account.'),
      e('div', { className: 'notice' },
        e('p', null, e('strong', null, 'Summary:'), ' We collect only what we need to run our services. We do not sell your personal data. We use industry-standard security practices to protect it.')
      )
    ),
  },
  {
    id: 'definitions',
    title: 'Definitions',
    content: e('div', null,
      e('p', null, 'In this Policy, the following terms refer to:'),
      e('ul', null,
        e('li', null, e('strong', null, '"OppDate," "OppDate LLC," "OPPDATE," "we," "us," and "our"'), ' refer to OppDate LLC, a limited liability company organized under the laws of the State.'),
        e('li', null, e('strong', null, '"You" and "User"'), ' refer to the individual who uses the Platform, whether as a free user, paid subscriber, applicant, or visitor.'),
        e('li', null, e('strong', null, '"Platform"'), ' refers to the OppDate website, mobile experience, OppDate Guide, and all associated services operated by OppDate LLC.'),
        e('li', null, e('strong', null, '"OppDate Apply"'), ' refers to the application assistance service offered by OppDate LLC, available as Done-For-You Submissions and Guided Submissions as described in our Terms.'),
        e('li', null, e('strong', null, '"OppDate Guide"'), ' refers to the AI-powered assistant available to Premium subscribers.'),
        e('li', null, e('strong', null, '"Personal Data"'), ' refers to any information that identifies you or can be used to identify you, including your name, email address, and application materials.'),
        e('li', null, e('strong', null, '"State"'), ' refers to Ohio.'),
        e('li', null, e('strong', null, '"Country"'), ' refers to the United States.')
      )
    ),
  },
  {
    id: 'data-collected',
    title: 'Information We Collect',
    content: e('div', null,
      e('p', null, 'We collect information in three ways: information you give us directly, information generated as you use the platform, and information from third-party services you connect.'),
      e('p', null, e('strong', null, 'Information you provide directly:')),
      e('ul', null,
        e('li', null, e('strong', null, 'Account registration'), ' - name, email address, password (stored as a secure hash), country, and profile preferences.'),
        e('li', null, e('strong', null, 'Onboarding preferences'), ' - your goals, field of study, education level, interests, and nationality, used to personalise opportunity recommendations.'),
        e('li', null, e('strong', null, 'Application materials'), ' - CVs, personal statements, certificates, transcripts, and any other documents you upload to your credential library or submit as part of an OppDate Apply engagement.'),
        e('li', null, e('strong', null, 'Payment information'), ' - billing details collected and processed by our payment partners (Stripe, Paystack, Flutterwave). We do not store raw card numbers on our servers.'),
        e('li', null, e('strong', null, 'Communications'), ' - messages you send through the in-platform messaging system to the OppDate team, and any support enquiries.'),
        e('li', null, e('strong', null, 'OppDate Guide conversations'), ' - messages you exchange with the AI Guide, stored for quality assurance and service improvement.')
      ),
      e('p', null, e('strong', null, 'Information generated automatically:')),
      e('ul', null,
        e('li', null, 'Log data including IP address, browser type, device type, referring URLs, and pages visited.'),
        e('li', null, 'Usage data including opportunities viewed, searches performed, features used, and session duration.'),
        e('li', null, 'Application status and pipeline progression within OppDate Apply.')
      ),
      e('p', null, e('strong', null, 'Information from third parties:')),
      e('ul', null,
        e('li', null, 'If you sign in using Google OAuth, we receive your name, email address, and profile picture from Google, subject to your Google account privacy settings.'),
        e('li', null, 'Payment confirmation data from Stripe, Paystack, or Flutterwave upon successful transactions.')
      )
    ),
  },
  {
    id: 'how-we-use',
    title: 'How We Use Your Information',
    content: e('div', null,
      e('p', null, 'We use the information we collect for the following purposes:'),
      e('ul', null,
        e('li', null, e('strong', null, 'Providing and improving our services'), ' - delivering the platform features you use, processing your applications, scheduling consultations, and fulfilling purchases.'),
        e('li', null, e('strong', null, 'AI-powered personalisation'), ' - generating opportunity recommendations, eligibility assessments, and OppDate Guide responses tailored to your profile and history.'),
        e('li', null, e('strong', null, 'Communications'), ' - sending transactional emails (booking confirmations, application updates, password resets), and service notifications. We will only send marketing communications if you have opted in.'),
        e('li', null, e('strong', null, 'Safety and fraud prevention'), ' - detecting and preventing fraudulent activity, verifying identity where required, and enforcing our Terms of Service.'),
        e('li', null, e('strong', null, 'Analytics and service improvement'), ' - understanding how users interact with the platform to improve features, fix bugs, and prioritise development.'),
        e('li', null, e('strong', null, 'Legal compliance'), ' - meeting our obligations under applicable law, including responding to lawful requests from authorities.')
      ),
      e('p', null, 'We process your data on the following legal bases: performance of a contract (to deliver services you have paid for), legitimate interests (to improve and secure the platform), compliance with legal obligations, and consent where explicitly obtained.')
    ),
  },
  {
    id: 'credentials',
    title: 'Application Credentials and Sensitive Documents',
    content: e('div', null,
      e('p', null, 'OppDate Apply may require you to provide access credentials to external application portals (e.g. a university submission portal) so that our team can submit on your behalf. We handle these with the highest level of care:'),
      e('ul', null,
        e('li', null, 'Credentials shared through the messaging system are used solely for the specific submission they were provided for.'),
        e('li', null, 'We do not store external login credentials in our database. After submission, you are responsible for changing those credentials immediately.'),
        e('li', null, 'Application documents (CVs, transcripts, statements) are stored securely in cloud storage with access restricted to your assigned application team member and platform administrators.'),
        e('li', null, 'Sensitive document fields in the database are encrypted at rest using AES-256 encryption.')
      ),
      e('div', { className: 'notice' },
        e('p', null, e('strong', null, 'Important:'), ' Once your submission is complete, we will remind you to change any passwords or credentials you shared with us. OppDate will never ask for banking credentials, national ID PINs, or any credential that is not directly related to your application portal.')
      )
    ),
  },
  {
    id: 'sharing',
    title: 'How We Share Your Information',
    content: e('div', null,
      e('p', null, 'We do not sell your personal data. We share your information only in the following circumstances:'),
      e('ul', null,
        e('li', null, e('strong', null, 'Service providers'), ' - we share data with trusted third-party vendors who help us operate the platform, including cloud hosting, payment processors, email delivery, error monitoring, and AI processing services. These providers are bound by data processing agreements and may only use your data to provide their services to us.'),
        e('li', null, e('strong', null, 'OppDate Apply submissions'), ' - when submitting your application on your behalf, we share your application materials with the target institution as directed by you.'),
        e('li', null, e('strong', null, 'Legal requirements'), ' - we may disclose your information if required to do so by law, court order, or in response to a lawful request from a government authority.'),
        e('li', null, e('strong', null, 'Business transfers'), ' - in the event of a merger, acquisition, or sale of all or part of our business, your data may be transferred as part of that transaction. We will notify you before your data becomes subject to a different privacy policy.')
      )
    ),
  },
  {
    id: 'ai-data',
    title: 'AI Processing and OppDate Guide',
    content: e('div', null,
      e('p', null, 'OppDate Guide is powered by third-party AI services. Messages you send and relevant context from your session are processed externally to generate responses. This is necessary for the Guide to function.'),
      e('p', null, 'Your Guide conversations are stored on OppDate\'s servers and may be reviewed by the OppDate team for quality assurance and safety monitoring. OppDate does not use your conversations to train AI models.'),
      e('p', null, 'OppDate does not control and is not liable for how third-party AI service providers independently process, retain, or use data once it is sent to them to generate a response, as such processing is governed by those providers\' own policies.')
    ),
  },
  {
    id: 'retention',
    title: 'Data Retention',
    content: e('div', null,
      e('p', null, 'We retain your personal data for as long as your account is active or as needed to provide services. Specifically:'),
      e('ul', null,
        e('li', null, e('strong', null, 'Account data'), ' - retained until you delete your account, plus 30 days to allow for recovery requests.'),
        e('li', null, e('strong', null, 'Application materials and documents'), ' - retained for 24 months after your last active application, after which they are deleted unless you request earlier deletion.'),
        e('li', null, e('strong', null, 'Payment records'), ' - retained for 7 years as required for financial record-keeping and tax compliance.'),
        e('li', null, e('strong', null, 'Guide conversation logs'), ' - retained for 12 months from the date of the session, then permanently deleted.'),
        e('li', null, e('strong', null, 'Log and usage data'), ' - retained for 90 days.')
      ),
      e('p', null, 'When we delete your data, it is removed from our active systems and from backups within 30 days.')
    ),
  },
  {
    id: 'security',
    title: 'Security',
    content: e('div', null,
      e('p', null, 'We implement industry-standard security measures to protect your personal data, including:'),
      e('ul', null,
        e('li', null, 'TLS encryption for all data in transit between your browser and our servers.'),
        e('li', null, 'AES-256 encryption at rest for sensitive database fields.'),
        e('li', null, 'Passwords stored as cryptographic hashes - we cannot recover your plain-text password.'),
        e('li', null, 'JWT-based authentication with short-lived access tokens.'),
        e('li', null, 'Role-based access controls limiting which team members can access which data.'),
        e('li', null, 'Third-party file storage (Cloudflare R2) with private bucket access and signed URLs for downloads.'),
        e('li', null, 'Real-time error monitoring and alerting via Sentry.')
      ),
      e('p', null, 'No method of transmission over the internet or electronic storage is completely secure. While we strive to protect your personal data, we cannot guarantee its absolute security. In the event of a data breach affecting your rights and freedoms, we will notify you and relevant authorities as required by applicable law.')
    ),
  },
  {
    id: 'your-rights',
    title: 'Your Rights',
    content: e('div', null,
      e('p', null, 'Depending on your location, you may have the following rights regarding your personal data:'),
      e('ul', null,
        e('li', null, e('strong', null, 'Access'), ' - request a copy of the personal data we hold about you.'),
        e('li', null, e('strong', null, 'Correction'), ' - request that we correct inaccurate or incomplete data.'),
        e('li', null, e('strong', null, 'Deletion'), ' - request that we delete your personal data, subject to our legal obligations to retain certain records.'),
        e('li', null, e('strong', null, 'Portability'), ' - request your data in a structured, machine-readable format.'),
        e('li', null, e('strong', null, 'Objection'), ' - object to our processing of your data where we rely on legitimate interests as the legal basis.'),
        e('li', null, e('strong', null, 'Withdrawal of consent'), ' - where we process data based on your consent, you may withdraw that consent at any time without affecting the lawfulness of prior processing.'),
        e('li', null, e('strong', null, 'Restriction'), ' - request that we restrict processing of your data in certain circumstances.')
      ),
      e('p', null, 'To exercise any of these rights, contact us at ', e('strong', null, 'support@oppdate.app'), '. We will respond within 30 days. We may need to verify your identity before processing your request.'),
      e('div', { className: 'notice' },
        e('p', null, 'You can delete your account directly from your profile settings at any time. This initiates our data deletion process without needing to contact us.')
      )
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and Tracking',
    content: e('div', null,
      e('p', null, 'OppDate uses a minimal set of cookies and local storage to operate the platform:'),
      e('ul', null,
        e('li', null, e('strong', null, 'Authentication'), ' - we store your JWT access token in localStorage to keep you signed in. This is essential for the platform to function.'),
        e('li', null, e('strong', null, 'Preferences'), ' - local storage keys may store UI preferences such as collapsed panel states, so the interface remembers your choices between visits.'),
        e('li', null, e('strong', null, 'Analytics'), ' - we may use privacy-respecting analytics tools to understand how the platform is used in aggregate. These do not track you individually across the web.')
      ),
      e('p', null, 'We do not use third-party advertising cookies or sell data to ad networks.')
    ),
  },
  {
    id: 'children',
    title: "Children's Privacy",
    content: e('div', null,
      e('p', null, 'OppDate is not directed at children under the age of 16. Users under 18 must have parental consent as described in our Terms. We do not knowingly collect personal data from anyone under 16 without verifiable parental consent. If you believe we have collected data from a child under 16 without appropriate consent, please contact us at ', e('strong', null, 'support@oppdate.app'), ' and we will delete it promptly.')
    ),
  },
  {
    id: 'international',
    title: 'International Data Transfers',
    content: e('div', null,
      e('p', null, 'OppDate operates globally, which means your information may be transferred to, stored, or processed in countries outside your country of residence, including the Country. These countries may have different data protection laws than those in your jurisdiction.'),
      e('p', null, 'When we transfer personal information internationally, we take reasonable steps to ensure it is protected and handled in accordance with applicable laws and this Privacy Policy.')
    ),
  },
  {
    id: 'changes',
    title: 'Changes to This Policy',
    content: e('div', null,
      e('p', null, 'We may update this Privacy Policy from time to time. When we make material changes, we will notify you by email or by displaying a prominent notice on the platform.'),
      e('p', null, 'Your continued use of OppDate after a policy change constitutes your acceptance of the revised policy.')
    ),
  },
  {
    id: 'contact',
    title: 'Contact and Data Requests',
    content: e('div', null,
      e('p', null, 'For any privacy-related questions, data access requests, or concerns, contact us:'),
      e('ul', null,
        e('li', null, 'Email: ', e('strong', null, 'support@oppdate.app')),
        e('li', null, 'Platform: Use the Help section within your OppDate account'),
        e('li', null, 'Address: 6545 Market Ave. North, STE 100, Canton, OH, 44721, USA')
      ),
      e('p', null, 'We aim to respond to all data-related requests within 30 days. For account deletion, you can also proceed directly from your profile settings without contacting us.'),
      e('div', { className: 'notice' },
        e('p', null, 'If you are unsatisfied with our response to a privacy concern, you may have the right to lodge a complaint with the relevant data protection authority in your country.')
      )
    ),
  },
];

function PrivacyPageApp() {
  return React.createElement(window.LegalPage, {
    pageType: 'privacy',
    title: 'Your data, your',
    accentWord: 'rights',
    subtitle: 'We collect only what we need, never sell what we have, and give you full control over what stays. This is how we handle your data.',
    effectiveDate: '1 November 2026',
    lastUpdated: '13 November 2026',
    companionLabel: 'Terms of Service',
    companionHref: '/legal/terms',
    sections: SECTIONS,
  });
}

const root = ReactDOM.createRoot(document.getElementById('om-app'));
root.render(React.createElement(PrivacyPageApp));
