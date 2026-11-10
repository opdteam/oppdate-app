import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'
import type { LegalSection } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Read the OppDate Terms of Service to understand your rights and responsibilities when using our platform.',
}

const sections: LegalSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    content: (
      <>
        <p>
          OppDate is an AI-powered opportunity platform that helps individuals discover, evaluate, and apply for international scholarships, fellowships, internships, training programmes, and entry-level jobs. These Terms of Service govern your access to and use of the OppDate website, mobile experience, AI Guide, and all associated services (collectively, the "Platform").
        </p>
        <p>
          By creating an account or using any part of the Platform, you agree to be bound by these Terms. If you do not agree, do not use OppDate.
        </p>
      </>
    ),
  },
  {
    id: 'eligibility',
    title: 'Eligibility',
    content: (
      <>
        <p>You must be at least 16 years old to use OppDate. By using the Platform, you confirm that:</p>
        <ul>
          <li>You are at least 16 years of age, or have the consent of a parent or legal guardian who has read and agreed to these Terms on your behalf.</li>
          <li>You have the legal capacity to enter into a binding agreement in your jurisdiction.</li>
          <li>You are not prohibited from using the Platform under any applicable law.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'accounts',
    title: 'Accounts and Registration',
    content: (
      <>
        <p>
          To access most features, you must register for an account. You agree to provide accurate, current, and complete information during registration and to keep your account information updated.
        </p>
        <p>You are responsible for:</p>
        <ul>
          <li>Maintaining the confidentiality of your login credentials.</li>
          <li>All activity that occurs under your account, whether or not authorised by you.</li>
          <li>Notifying us immediately at <strong>support@oppdate.com</strong> if you suspect unauthorised access to your account.</li>
        </ul>
        <p>
          We reserve the right to suspend or terminate accounts that contain false information, violate these Terms, or are inactive for extended periods.
        </p>
      </>
    ),
  },
  {
    id: 'services',
    title: 'Platform Services',
    content: (
      <>
        <p>OppDate offers the following core services:</p>
        <ul>
          <li><strong>Opportunity Discovery</strong> - Browse and search a curated database of verified global opportunities with AI-powered matching and recommendations.</li>
          <li><strong>OppDate Apply</strong> - A done-for-you application service where the OppDate team prepares, compiles, and submits your application materials on your behalf, based on information and documents you provide.</li>
          <li><strong>OppDate Guide</strong> - An AI assistant that answers questions about opportunities, assesses your eligibility, and guides you through the application process.</li>
          <li><strong>Strategy Consultations</strong> - Paid one-on-one video sessions with OppDate advisors for personalised application strategy.</li>
          <li><strong>Mentorship Programmes</strong> - Structured mentorship engagements with experienced professionals.</li>
          <li><strong>E-books and Resources</strong> - Downloadable guides, templates, and reference materials for applicants.</li>
        </ul>
        <p>
          Availability of specific services may vary by region, subscription tier, and over time. We reserve the right to modify, suspend, or discontinue any service at any time with reasonable notice.
        </p>
      </>
    ),
  },
  {
    id: 'oppdate-apply',
    title: 'OppDate Apply - Scope and Limits',
    content: (
      <>
        <p>
          OppDate Apply is a professional application assistance service. When you purchase OppDate Apply for an opportunity, you authorise the OppDate team to act on your behalf in preparing and submitting your application to the target institution or programme.
        </p>
        <p>You acknowledge and agree that:</p>
        <ul>
          <li><strong>No guarantee of outcome.</strong> OppDate does not guarantee that any application will result in an offer, interview, acceptance, visa approval, or any other outcome. Selection decisions are made entirely by the respective institutions and are beyond our control.</li>
          <li><strong>Your information must be accurate.</strong> You are solely responsible for the truthfulness and completeness of all information and documents you provide. Submitting false, misleading, or fabricated materials is a serious violation of these Terms and may result in permanent account termination.</li>
          <li><strong>Credential security.</strong> Where access credentials to external portals are required for submission, you are responsible for changing those credentials after the submission is complete. OppDate will not retain, store, or reuse any credentials provided for a specific submission beyond the duration of that application.</li>
          <li><strong>Fees are non-refundable once submission has commenced.</strong> See the Payments section for the full refund policy.</li>
          <li><strong>Deadlines.</strong> While OppDate makes every reasonable effort to submit applications before deadlines, we are not liable for missed deadlines caused by late submission of your required documents, inaccurate information you provided, or technical failures on the part of the target institution's portal.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'ai-guide',
    title: 'OppDate Guide (AI)',
    content: (
      <>
        <p>
          OppDate Guide is an AI-powered assistant designed to help you understand opportunities, assess your eligibility, and prepare for applications. It is available to Premium subscribers.
        </p>
        <p>Important limitations you must understand:</p>
        <ul>
          <li><strong>Not professional advice.</strong> OppDate Guide does not provide legal, immigration, financial, or academic advice. Its responses are informational only. Always verify critical information with official programme sources.</li>
          <li><strong>Accuracy not guaranteed.</strong> The AI may produce inaccurate, incomplete, or outdated information. When the Guide references external sources, those sources should be consulted directly.</li>
          <li><strong>Conversations are logged.</strong> Your Guide conversations may be reviewed by the OppDate team for quality assurance, safety monitoring, and service improvement. See our Privacy Policy for details.</li>
          <li><strong>No eligibility guarantee.</strong> A positive eligibility assessment from OppDate Guide does not guarantee your eligibility as determined by the target institution.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions and Payments',
    content: (
      <>
        <p>
          OppDate offers free and paid subscription tiers. Premium subscriptions unlock AI recommendations, OppDate Guide access, priority support, and additional platform features.
        </p>
        <ul>
          <li><strong>Billing.</strong> Subscriptions are billed in advance on a monthly or annual basis. By subscribing, you authorise us to charge your payment method on a recurring basis until you cancel.</li>
          <li><strong>Cancellation.</strong> You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of the current billing period. No partial refunds are issued for unused subscription time.</li>
          <li><strong>OppDate Apply fees.</strong> Application service fees are charged at the time of booking and are non-refundable once the OppDate team has commenced work on your application. If we have not yet started work, a full refund will be issued within 7 business days of a written request to support@oppdate.com.</li>
          <li><strong>Consultation and mentorship fees.</strong> Paid session fees are non-refundable once the session has taken place. If you cancel at least 24 hours before a scheduled session, a full refund or credit will be issued at our discretion.</li>
          <li><strong>E-book purchases.</strong> Digital content purchases are final and non-refundable once download or access has been granted.</li>
          <li><strong>Currency and taxes.</strong> Prices are displayed in USD. You are responsible for any applicable taxes in your jurisdiction.</li>
          <li><strong>Payment processors.</strong> Payments are processed by Stripe, Paystack, or Flutterwave depending on your region. By making a payment, you also agree to the applicable payment processor's terms.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'user-conduct',
    title: 'User Conduct',
    content: (
      <>
        <p>You agree not to use OppDate to:</p>
        <ul>
          <li>Submit false, fraudulent, or plagiarised application materials.</li>
          <li>Impersonate another person or misrepresent your identity or qualifications.</li>
          <li>Attempt to gain unauthorised access to any part of the Platform or its infrastructure.</li>
          <li>Scrape, crawl, or harvest data from the Platform without written authorisation.</li>
          <li>Use OppDate Guide to generate harmful, illegal, or deceptive content.</li>
          <li>Resell, sublicence, or commercially exploit any part of the Platform without our written consent.</li>
          <li>Interfere with the proper functioning of the Platform or its servers.</li>
          <li>Violate any applicable local, national, or international law or regulation.</li>
        </ul>
        <p>
          We reserve the right to investigate suspected violations and take appropriate action, including suspending or permanently terminating accounts and reporting conduct to relevant authorities.
        </p>
      </>
    ),
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual Property',
    content: (
      <>
        <p>
          All content on the Platform - including opportunity listings, AI-generated guidance, written materials, design, software, and trademarks - is owned by or licensed to OppDate and is protected by applicable intellectual property laws.
        </p>
        <p>
          You retain ownership of the content you provide to us (your personal information, documents, and application materials). By uploading content to OppDate, you grant us a limited, non-exclusive licence to use, store, and process that content solely for the purpose of delivering our services to you.
        </p>
        <p>
          Purchased e-books and downloadable resources are licensed for your personal, non-commercial use only. You may not redistribute, resell, or reproduce them without our written consent.
        </p>
      </>
    ),
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers and Limitation of Liability',
    content: (
      <>
        <p>
          The Platform is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
        </p>
        <p>We do not warrant that:</p>
        <ul>
          <li>The Platform will be uninterrupted, error-free, or free from viruses or harmful components.</li>
          <li>Any opportunity listed on the Platform will remain open, accurate, or available at the time of your application.</li>
          <li>AI-generated content is accurate, complete, or current.</li>
        </ul>
        <p>
          To the fullest extent permitted by applicable law, OppDate's total cumulative liability to you for any claim arising out of or relating to these Terms or the Platform shall not exceed the greater of (a) the amount you paid to OppDate in the 12 months preceding the claim, or (b) USD 100.
        </p>
        <p>
          OppDate shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of or inability to use the Platform.
        </p>
      </>
    ),
  },
  {
    id: 'termination',
    title: 'Termination',
    content: (
      <>
        <p>
          You may delete your account at any time from your profile settings. Upon deletion, your personal data will be handled in accordance with our Privacy Policy.
        </p>
        <p>
          We may suspend or terminate your access to the Platform immediately and without notice if you breach these Terms, engage in fraudulent activity, or if we are required to do so by law. Upon termination, your right to use the Platform ceases immediately.
        </p>
        <p>
          Provisions of these Terms that by their nature should survive termination - including intellectual property, disclaimers, limitation of liability, and dispute resolution - shall survive.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to These Terms',
    content: (
      <>
        <p>
          We may update these Terms from time to time. When we make material changes, we will notify you by email or by displaying a prominent notice on the Platform at least 14 days before the changes take effect.
        </p>
        <p>
          Your continued use of the Platform after the effective date of any changes constitutes your acceptance of the revised Terms. If you do not agree to the revised Terms, you must stop using the Platform and may delete your account.
        </p>
      </>
    ),
  },
  {
    id: 'governing-law',
    title: 'Governing Law and Disputes',
    content: (
      <>
        <p>
          These Terms are governed by and construed in accordance with applicable laws, without regard to conflict of law principles. We encourage you to contact us first at <strong>support@oppdate.com</strong> to resolve any dispute informally.
        </p>
        <p>
          If we cannot resolve a dispute informally within 30 days, both parties agree to attempt resolution through mediation before initiating any formal legal proceedings.
        </p>
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Contact Us',
    content: (
      <>
        <p>If you have questions about these Terms, please contact us:</p>
        <ul>
          <li>Email: <strong>support@oppdate.com</strong></li>
          <li>Platform: Use the Help section within your OppDate account</li>
        </ul>
        <div className="notice">
          <p>For account deletion requests, data access requests, or privacy concerns, please use the contact details in our <a href="/legal/privacy">Privacy Policy</a>.</p>
        </div>
      </>
    ),
  },
]

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      subtitle="Please read these terms carefully before using OppDate. They explain what you can expect from us and what we expect from you."
      effectiveDate="1 November 2026"
      lastUpdated="7 November 2026"
      sections={sections}
      companionLabel="Privacy Policy"
      companionHref="/legal/privacy"
    />
  )
}
