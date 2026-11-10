/* Terms of Service page content. Loaded by /legal/terms/index.html */

const e = React.createElement;

const SECTIONS = [
  {
    id: 'overview',
    title: 'Overview',
    content: e('div', null,
      e('p', null, 'OppDate is an AI-powered opportunity platform that helps individuals discover, evaluate, and apply for international scholarships, fellowships, internships, training programmes, and entry-level jobs. These Terms of Service govern your access to and use of the OppDate website, mobile experience, AI Guide, and all associated services (collectively, the "Platform").'),
      e('p', null, 'By creating an account or using any part of the Platform, you agree to be bound by these Terms. If you do not agree, do not use OppDate.'),
      e('div', { className: 'notice' },
        e('p', null, e('strong', null, 'OppDate is operated by Infinity Studioz.'), ' References to "OppDate", "we", "our", or "us" in these Terms mean Infinity Studioz and its authorised representatives.')
      )
    ),
  },
  {
    id: 'eligibility',
    title: 'Eligibility',
    content: e('div', null,
      e('p', null, 'You must be at least 16 years old to use OppDate. By using the Platform, you confirm that:'),
      e('ul', null,
        e('li', null, 'You are at least 16 years of age, or have the consent of a parent or legal guardian who has read and agreed to these Terms on your behalf.'),
        e('li', null, 'You have the legal capacity to enter into a binding agreement in your jurisdiction.'),
        e('li', null, 'You are not prohibited from using the Platform under any applicable law.')
      )
    ),
  },
  {
    id: 'accounts',
    title: 'Accounts and Registration',
    content: e('div', null,
      e('p', null, 'To access most features, you must register for an account. You agree to provide accurate, current, and complete information during registration and to keep your account information updated.'),
      e('p', null, 'You are responsible for:'),
      e('ul', null,
        e('li', null, 'Maintaining the confidentiality of your login credentials.'),
        e('li', null, 'All activity that occurs under your account, whether or not authorised by you.'),
        e('li', null, 'Notifying us immediately at ', e('strong', null, 'support@oppdate.com'), ' if you suspect unauthorised access to your account.')
      ),
      e('p', null, 'We reserve the right to suspend or terminate accounts that contain false information, violate these Terms, or are inactive for extended periods.')
    ),
  },
  {
    id: 'services',
    title: 'Platform Services',
    content: e('div', null,
      e('p', null, 'OppDate offers the following core services:'),
      e('ul', null,
        e('li', null, e('strong', null, 'Opportunity Discovery'), ' - Browse and search a curated database of verified global opportunities with AI-powered matching and recommendations.'),
        e('li', null, e('strong', null, 'OppDate Apply'), ' - A done-for-you application service where the OppDate team prepares, compiles, and submits your application materials on your behalf, based on information and documents you provide.'),
        e('li', null, e('strong', null, 'OppDate Guide'), ' - An AI assistant that answers questions about opportunities, assesses your eligibility, and guides you through the application process.'),
        e('li', null, e('strong', null, 'Strategy Consultations'), ' - Paid one-on-one video sessions with OppDate advisors for personalised application strategy.'),
        e('li', null, e('strong', null, 'Mentorship Programmes'), ' - Structured mentorship engagements with experienced professionals.'),
        e('li', null, e('strong', null, 'E-books and Resources'), ' - Downloadable guides, templates, and reference materials for applicants.')
      ),
      e('p', null, 'Availability of specific services may vary by region, subscription tier, and over time. We reserve the right to modify, suspend, or discontinue any service at any time with reasonable notice.')
    ),
  },
  {
    id: 'oppdate-apply',
    title: 'OppDate Apply - Scope and Limits',
    content: e('div', null,
      e('p', null, 'OppDate Apply is a professional application assistance service. When you purchase OppDate Apply for an opportunity, you authorise the OppDate team to act on your behalf in preparing and submitting your application to the target institution or programme.'),
      e('p', null, 'You acknowledge and agree that:'),
      e('ul', null,
        e('li', null, e('strong', null, 'No guarantee of outcome.'), ' OppDate does not guarantee that any application will result in an offer, interview, acceptance, visa approval, or any other outcome. Selection decisions are made entirely by the respective institutions and are beyond our control.'),
        e('li', null, e('strong', null, 'Your information must be accurate.'), ' You are solely responsible for the truthfulness and completeness of all information and documents you provide. Submitting false, misleading, or fabricated materials is a serious violation of these Terms and may result in permanent account termination.'),
        e('li', null, e('strong', null, 'Credential security.'), ' Where access credentials to external portals are required for submission, you are responsible for changing those credentials after the submission is complete. OppDate will not retain, store, or reuse any credentials provided for a specific submission beyond the duration of that application.'),
        e('li', null, e('strong', null, 'Fees are non-refundable once submission has commenced.'), ' See the Payments section for the full refund policy.'),
        e('li', null, e('strong', null, 'Deadlines.'), ' While OppDate makes every reasonable effort to submit applications before deadlines, we are not liable for missed deadlines caused by late submission of your required documents, inaccurate information you provided, or technical failures on the part of the target institution\'s portal.')
      )
    ),
  },
  {
    id: 'ai-guide',
    title: 'OppDate Guide (AI)',
    content: e('div', null,
      e('p', null, 'OppDate Guide is an AI-powered assistant designed to help you understand opportunities, assess your eligibility, and prepare for applications. It is available to Premium subscribers.'),
      e('p', null, 'Important limitations you must understand:'),
      e('ul', null,
        e('li', null, e('strong', null, 'Not professional advice.'), ' OppDate Guide does not provide legal, immigration, financial, or academic advice. Its responses are informational only. Always verify critical information with official programme sources.'),
        e('li', null, e('strong', null, 'Accuracy not guaranteed.'), ' The AI may produce inaccurate, incomplete, or outdated information. When the Guide references external sources, those sources should be consulted directly.'),
        e('li', null, e('strong', null, 'Conversations are logged.'), ' Your Guide conversations may be reviewed by the OppDate team for quality assurance, safety monitoring, and service improvement. See our Privacy Policy for details.'),
        e('li', null, e('strong', null, 'No eligibility guarantee.'), ' A positive eligibility assessment from OppDate Guide does not guarantee your eligibility as determined by the target institution.')
      )
    ),
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions and Payments',
    content: e('div', null,
      e('p', null, 'OppDate offers free and paid subscription tiers. Premium subscriptions unlock AI recommendations, OppDate Guide access, priority support, and additional platform features.'),
      e('ul', null,
        e('li', null, e('strong', null, 'Billing.'), ' Subscriptions are billed in advance on a monthly or annual basis. By subscribing, you authorise us to charge your payment method on a recurring basis until you cancel.'),
        e('li', null, e('strong', null, 'Cancellation.'), ' You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of the current billing period. No partial refunds are issued for unused subscription time.'),
        e('li', null, e('strong', null, 'OppDate Apply fees.'), ' Application service fees are charged at the time of booking and are non-refundable once the OppDate team has commenced work on your application. If we have not yet started work, a full refund will be issued within 7 business days of a written request to support@oppdate.com.'),
        e('li', null, e('strong', null, 'Consultation and mentorship fees.'), ' Paid session fees are non-refundable once the session has taken place. If you cancel at least 24 hours before a scheduled session, a full refund or credit will be issued at our discretion.'),
        e('li', null, e('strong', null, 'E-book purchases.'), ' Digital content purchases are final and non-refundable once download or access has been granted.'),
        e('li', null, e('strong', null, 'Currency and taxes.'), ' Prices are displayed in USD. You are responsible for any applicable taxes in your jurisdiction.'),
        e('li', null, e('strong', null, 'Payment processors.'), ' Payments are processed by Stripe, Paystack, or Flutterwave depending on your region. By making a payment, you also agree to the applicable payment processor\'s terms.')
      )
    ),
  },
  {
    id: 'user-conduct',
    title: 'User Conduct',
    content: e('div', null,
      e('p', null, 'You agree not to use OppDate to:'),
      e('ul', null,
        e('li', null, 'Submit false, fraudulent, or plagiarised application materials.'),
        e('li', null, 'Impersonate another person or misrepresent your identity or qualifications.'),
        e('li', null, 'Attempt to gain unauthorised access to any part of the Platform or its infrastructure.'),
        e('li', null, 'Scrape, crawl, or harvest data from the Platform without written authorisation.'),
        e('li', null, 'Use OppDate Guide to generate harmful, illegal, or deceptive content.'),
        e('li', null, 'Resell, sublicence, or commercially exploit any part of the Platform without our written consent.'),
        e('li', null, 'Interfere with the proper functioning of the Platform or its servers.'),
        e('li', null, 'Violate any applicable local, national, or international law or regulation.')
      ),
      e('p', null, 'We reserve the right to investigate suspected violations and take appropriate action, including suspending or permanently terminating accounts and reporting conduct to relevant authorities.')
    ),
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual Property',
    content: e('div', null,
      e('p', null, 'All content on the Platform - including opportunity listings, AI-generated guidance, written materials, design, software, and trademarks - is owned by or licensed to OppDate and is protected by applicable intellectual property laws.'),
      e('p', null, 'You retain ownership of the content you provide to us (your personal information, documents, and application materials). By uploading content to OppDate, you grant us a limited, non-exclusive licence to use, store, and process that content solely for the purpose of delivering our services to you.'),
      e('p', null, 'Purchased e-books and downloadable resources are licensed for your personal, non-commercial use only. You may not redistribute, resell, or reproduce them without our written consent.')
    ),
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers and Limitation of Liability',
    content: e('div', null,
      e('p', null, 'The Platform is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.'),
      e('p', null, 'We do not warrant that:'),
      e('ul', null,
        e('li', null, 'The Platform will be uninterrupted, error-free, or free from viruses or harmful components.'),
        e('li', null, 'Any opportunity listed on the Platform will remain open, accurate, or available at the time of your application.'),
        e('li', null, 'AI-generated content is accurate, complete, or current.')
      ),
      e('p', null, 'To the fullest extent permitted by applicable law, OppDate\'s total cumulative liability to you for any claim arising out of or relating to these Terms or the Platform shall not exceed the greater of (a) the amount you paid to OppDate in the 12 months preceding the claim, or (b) USD 100.'),
      e('p', null, 'OppDate shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of or inability to use the Platform.')
    ),
  },
  {
    id: 'termination',
    title: 'Termination',
    content: e('div', null,
      e('p', null, 'You may delete your account at any time from your profile settings. Upon deletion, your personal data will be handled in accordance with our Privacy Policy.'),
      e('p', null, 'We may suspend or terminate your access to the Platform immediately and without notice if you breach these Terms, engage in fraudulent activity, or if we are required to do so by law. Upon termination, your right to use the Platform ceases immediately.'),
      e('p', null, 'Provisions of these Terms that by their nature should survive termination - including intellectual property, disclaimers, limitation of liability, and dispute resolution - shall survive.')
    ),
  },
  {
    id: 'changes',
    title: 'Changes to These Terms',
    content: e('div', null,
      e('p', null, 'We may update these Terms from time to time. When we make material changes, we will notify you by email or by displaying a prominent notice on the Platform at least 14 days before the changes take effect.'),
      e('p', null, 'Your continued use of the Platform after the effective date of any changes constitutes your acceptance of the revised Terms. If you do not agree to the revised Terms, you must stop using the Platform and may delete your account.')
    ),
  },
  {
    id: 'governing-law',
    title: 'Governing Law and Disputes',
    content: e('div', null,
      e('p', null, 'These Terms are governed by and construed in accordance with applicable laws, without regard to conflict of law principles. We encourage you to contact us first at ', e('strong', null, 'support@oppdate.com'), ' to resolve any dispute informally.'),
      e('p', null, 'If we cannot resolve a dispute informally within 30 days, both parties agree to attempt resolution through mediation before initiating any formal legal proceedings.')
    ),
  },
  {
    id: 'contact',
    title: 'Contact Us',
    content: e('div', null,
      e('p', null, 'If you have questions about these Terms, please contact us:'),
      e('ul', null,
        e('li', null, 'Email: ', e('strong', null, 'support@oppdate.com')),
        e('li', null, 'Platform: Use the Help section within your OppDate account')
      ),
      e('div', { className: 'notice' },
        e('p', null, 'For account deletion requests, data access requests, or privacy concerns, please use the contact details in our ', e('a', { href: '/legal/privacy' }, 'Privacy Policy'), '.')
      )
    ),
  },
];

function TermsPageApp() {
  return React.createElement(window.LegalPage, {
    pageType: 'terms',
    title: 'Built on',
    accentWord: 'trust',
    subtitle: 'These terms define the relationship between you and OppDate. Plain language, fair rules, no hidden catches.',
    effectiveDate: '1 November 2026',
    lastUpdated: '7 November 2026',
    companionLabel: 'Privacy Policy',
    companionHref: '/legal/privacy',
    sections: SECTIONS,
  });
}

const root = ReactDOM.createRoot(document.getElementById('om-app'));
root.render(React.createElement(TermsPageApp));
