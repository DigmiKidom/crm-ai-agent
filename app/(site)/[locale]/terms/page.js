import Link from "@/components/i18n/Link";
import Logo from "@/components/Logo";
import styles from "./page.module.css";

export const metadata = {
  title: "Terms of Use",
};

export default function TermsPage() {
  return (
    <div className={styles.wrap}>
      <Link className={styles.back} href="/">
        &larr; Back home
      </Link>
      <div style={{ marginBottom: 20 }}>
        <Logo href={null} markSize={26} />
      </div>
      <h1 className={styles.title}>Terms of Use</h1>
      <p className={styles.updated}>Last updated: August 8, 2026</p>

      <div className={styles.disclaimer}>
        This is a standard SaaS terms-of-use template, not legal advice. Placeholders like
        company name and governing law still need to be filled in, and a lawyer should review
        this — especially the liability and dispute sections — before you rely on it with real
        customers.
      </div>

      <div className={styles.content}>
        <h2>1. Acceptance of these terms</h2>
        <p>
          By creating an account or otherwise using CRM AI Agent (the &quot;Service&quot;), you
          agree to these Terms of Use. If you&apos;re agreeing on behalf of a company, you
          confirm you have the authority to bind that company to these terms.
        </p>

        <h2>2. What the Service does</h2>
        <p>
          The Service lets a company sign up, describe its business, and receive an
          AI-generated lead-capturing landing page and a configured CRM (contacts, pipeline,
          leads). Landing page copy and pipeline stages are generated using a third-party AI
          model (currently Google&apos;s Gemini) based on the information you provide, and can
          be edited after generation.
        </p>

        <h2>3. Accounts</h2>
        <p>
          You&apos;re responsible for the accuracy of the information you provide, for keeping
          your login credentials secure, and for all activity that happens under your account.
          Tell us promptly if you suspect unauthorized access to your account.
        </p>

        <h2>4. Acceptable use</h2>
        <p>You agree not to use the Service to:</p>
        <ul>
          <li>Collect, store, or send data you don&apos;t have the right to collect (e.g. leads gathered without consent where required by law);</li>
          <li>Send unsolicited communications (spam) to people captured through your landing page;</li>
          <li>Attempt to access another tenant&apos;s data, disrupt the Service, or circumvent its security;</li>
          <li>Publish content that is unlawful, fraudulent, deceptive, defamatory, harassing, hateful, sexually explicit, or that infringes anyone else&apos;s intellectual property or privacy rights;</li>
          <li>Impersonate another person or business, or misrepresent your affiliation with one;</li>
          <li>Publish links, downloads, scripts, or embedded media that distribute malware, run phishing pages, or mislead visitors about where a link leads;</li>
          <li>Use the Service for anything unlawful, fraudulent, or harmful to others.</li>
        </ul>

        <h2>4a. Your content, your responsibility</h2>
        <p>
          Everything published through your account — all text, images, video, links,
          embedded media, downloadable files, form fields, FAQ answers, phone numbers,
          social profiles, and WhatsApp messages — is <strong>your content</strong>, and you
          are <strong>solely responsible</strong> for it. That responsibility is yours
          regardless of who or what produced the material: content drafted by the AI agent,
          suggested by a template, written by a colleague on your team, or supplied by a
          contractor becomes yours the moment you publish it.
        </p>
        <p>Specifically, you represent and warrant that, for everything you publish:</p>
        <ul>
          <li>You own it or otherwise hold every right and licence needed to publish it, including for any image, logo, font, or media you upload;</li>
          <li>It is accurate and not misleading about your business, your prices, your qualifications, your licensing, or your affiliations;</li>
          <li>It complies with every law and regulation that applies to you and to your industry — including advertising, consumer-protection, professional-licensing, health-claim, and data-protection rules;</li>
          <li>You have obtained any consent required to collect, store, and contact the people who submit your lead forms, and you will honour their requests to stop.</li>
        </ul>
        <p>
          You are also responsible for the outbound messages you send through features the
          Service provides — including WhatsApp messages composed from a lead&apos;s details
          and any webhook you configure to receive lead data. The Service opens those
          conversations on your behalf; what you send in them, and to whom, is your decision
          and your legal responsibility.
        </p>

        <h2>4b. Our role — no monitoring, no endorsement</h2>
        <p>
          We host and display what you publish. We do not create, verify, endorse, or
          routinely monitor it, and we are not a publisher, author, or guarantor of any
          user-generated content on the Service. Nothing published on a landing page hosted
          here should be understood as reviewed or approved by us.
        </p>
        <p>
          To the maximum extent permitted by law, we disclaim all liability arising from
          user-generated content, including any loss or damage suffered by a visitor to a
          landing page, by a person whose details were submitted through one, or by any
          third party whose rights that content infringes. If someone brings a claim against
          us because of content published through your account, you agree to indemnify and
          hold us harmless against that claim, including reasonable legal costs.
        </p>
        <p>
          The fact that we <em>can</em> remove content (see section 4c) does not create an
          obligation to look for it, and choosing to act on one report does not commit us to
          reviewing anything else.
        </p>

        <h2>4c. Reporting, suspension, and termination</h2>
        <p>
          Every landing page published through the Service carries a &quot;Report this
          page&quot; link. Anyone — visitor, competitor, rights holder, or member of the
          public — may use it to bring content to our attention. Reports are reviewed by a
          person; filing one does not by itself remove anything.
        </p>
        <p>
          We reserve the right, at our sole discretion and{" "}
          <strong>without prior notice</strong>, to:
        </p>
        <ul>
          <li>Take down a landing page, so that visitors see a suspension notice in place of it;</li>
          <li>Suspend or terminate any account;</li>
          <li>Remove or disable specific content, media, or links.</li>
        </ul>
        <p>
          We may do so where we believe in good faith that content or conduct violates these
          terms, breaks the law, infringes someone&apos;s rights, endangers visitors or other
          customers, or exposes us to legal or reputational risk — and we may act on that
          belief before completing any investigation. We are not obliged to disclose who
          reported a page, and we will not share a reporter&apos;s identity with the account
          being reported.
        </p>
        <p>
          Taking a page down does not delete your account or your CRM data: unless we also
          suspend the account itself, you keep access to your leads and contacts and may
          correct the content and ask us to review the decision. Where we suspend an entire
          account, we will make reasonable efforts to give you a route to export your
          Customer Data, except where the law or the nature of the violation prevents it.
        </p>
        <p>
          We retain abuse reports — including the reason given, any notes, and the reporting
          IP address — for as long as needed to operate moderation, investigate repeat abuse,
          and defend against legal claims.
        </p>

        <h2>5. Your data</h2>
        <p>
          You retain ownership of the leads, contacts, and other business data you or your
          customers submit through the Service (&quot;Customer Data&quot;). You&apos;re
          responsible for having the appropriate rights and consents to collect and process
          that data, including any personal data covered by privacy laws applicable to you
          (e.g. GDPR, CCPA). We process Customer Data only to provide the Service to you.
        </p>

        <h2>6. AI-generated content</h2>
        <p>
          Landing page copy, pipeline stages, and template selection may be generated by an AI
          model. AI-generated content can be inaccurate or unsuitable for your context — review
          and edit it before relying on it or publishing it to a public landing page. You are
          responsible for the content you ultimately publish, regardless of how it was
          generated.
        </p>

        <h2>7. Third-party services</h2>
        <p>
          The Service relies on third-party providers to operate, including a database
          provider (MongoDB Atlas), an AI provider (Google Gemini), and a transactional email
          provider (Resend) for account verification and password reset emails. Availability of
          the Service depends in part on these providers.
        </p>

        <h2>8. Fees</h2>
        <p>
          Some plans may be free and others paid, as described at signup or in your account
          settings. [Placeholder — fill in your actual pricing/billing terms once billing is
          live.]
        </p>

        <h2>9. Termination</h2>
        <p>
          You may stop using the Service and request deletion of your account at any time. We
          may suspend or terminate accounts that violate these terms or pose a security risk to
          the Service or other tenants — immediately and without prior notice, on the grounds
          and by the means set out in section 4c.
        </p>

        <h2>10. Disclaimer of warranties</h2>
        <p>
          The Service is provided &quot;as is&quot; without warranties of any kind, express or
          implied, including warranties of merchantability, fitness for a particular purpose,
          or non-infringement. We don&apos;t guarantee the Service will be uninterrupted, secure,
          or error-free.
        </p>

        <h2>11. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, [Company Name] will not be liable for any
          indirect, incidental, special, consequential, or punitive damages, or any loss of
          profits or data, arising from your use of the Service. This includes any loss
          arising from content published by you or by any other customer, from a landing page
          being taken down under section 4c, or from a third party&apos;s dealings with a
          business whose page is hosted here. [Placeholder — a lawyer should tailor this
          section, including any liability cap, to your jurisdiction and business.]
        </p>

        <h2>12. Governing law</h2>
        <p>
          These terms are governed by the laws of [Jurisdiction — placeholder]. Any disputes
          will be resolved in the courts of that jurisdiction, unless otherwise required by
          applicable law.
        </p>

        <h2>13. Changes to these terms</h2>
        <p>
          We may update these terms from time to time. If we make material changes, we&apos;ll
          make reasonable efforts to notify account owners (e.g. by email or an in-app notice)
          before the changes take effect.
        </p>

        <h2>14. Contact</h2>
        <p>
          Questions about these terms? Contact us at [support email — placeholder].
        </p>
      </div>
    </div>
  );
}
