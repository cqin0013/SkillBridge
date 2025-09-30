// src/pages/PrivacyPolicy.tsx
/**
 * PrivacyPolicyPage
 * -----------------
 * Drop-in React component for a /privacy route.
 *
 * Props let you quickly tailor the brand, site URL, and email without editing the copy.
 * Accessibility:
 * - Uses semantic landmarks (<main/section>) and headings (h1..h2).
 * - Mailto links have clear text.
 *
 * Styling:
 * - Uses your Tailwind tokens (text-ink, text-ink-soft, container width helpers).
 * - Keep it minimal so it works even without the typography plugin.
 */

import * as React from "react"

type PrivacyProps = {
  /** Brand or company name shown in the policy */
  brand?: string
  /** Public website URL shown in "Who we are" */
  website?: string
  /** Contact mailbox for privacy requests */
  contactEmail?: string
  /** ISO-like date string for the "Last updated" line */
  lastUpdated?: string
}

export default function PrivacyPolicyPage({
  brand = "StrangerThink",
  website = "https://www.strangerthink.com",
  contactEmail = "privacy@strangerthink.com",
  lastUpdated = "2025-09-30",
}: PrivacyProps) {
  return (
    <main id="content" className="mx-auto max-w-3xl px-4 py-12 lg:py-16">
      {/* Page title + meta */}
      <section aria-labelledby="privacy-title" className="space-y-2">
        <h1 id="privacy-title" className="text-3xl lg:text-4xl font-extrabold text-ink">
          Privacy Policy
        </h1>
        <p className="text-ink-soft">
          <strong>Last updated:</strong> {lastUpdated}
        </p>
      </section>

      {/* Intro */}
      <section className="mt-6 space-y-4 text-ink leading-relaxed">
        <p>
          This Privacy Policy explains how {brand} (“we”, “us”, “our”) collects, uses, discloses,
          and protects your information when you visit our website and use our services
          (the “Services”). By using the Services, you agree to this Policy.
        </p>
      </section>

      {/* Who we are */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">1. Who we are</h2>
        <p>
          {brand}
          <br />
          Website:{" "}
          <a href={website} className="text-primary underline underline-offset-2">
            {website}
          </a>
          <br />
          Contact:{" "}
          <a href={`mailto:${contactEmail}`} className="text-primary underline underline-offset-2">
            {contactEmail}
          </a>
        </p>
      </section>

      {/* Information we collect */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">2. Information we collect</h2>
        <p>We collect information directly from you, automatically, and from third parties.</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Account &amp; contact data:</strong> name, email address, authentication data,
            and profile details you provide.
          </li>
          <li>
            <strong>Usage &amp; device data:</strong> IP address, device/browser type, pages
            viewed, timestamps, approximate location, and similar analytics (via cookies or SDKs).
          </li>
          <li>
            <strong>Communications:</strong> messages you send to us (support requests, feedback)
            and related metadata.
          </li>
          <li>
            <strong>Transaction data (if applicable):</strong> order history and billing metadata.
            Payment card details are handled by our payment processor and are not stored on our
            servers.
          </li>
          <li>
            <strong>User content:</strong> content you upload or submit through the Services.
          </li>
        </ul>
      </section>

      {/* How we use it */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">3. How we use your information</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Provide, operate, and maintain the Services.</li>
          <li>Create and manage your account; respond to inquiries and support requests.</li>
          <li>Improve and personalize the Services; run analytics and product research.</li>
          <li>Ensure security, prevent fraud, and enforce our Terms.</li>
          <li>Send service communications (important notices or changes).</li>
          <li>With your consent, send marketing communications (you can opt out anytime).</li>
        </ul>
      </section>

      {/* Legal bases */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">4. Legal bases for processing (where applicable)</h2>
        <p>
          Depending on your location, we process your personal data under one or more legal bases
          such as: performance of a contract, legitimate interests (e.g., to secure and improve the
          Services), compliance with legal obligations, and consent (e.g., certain cookies or
          marketing).
        </p>
      </section>

      {/* Cookies */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">5. Cookies and similar technologies</h2>
        <p>
          We use cookies and similar technologies to operate the site, remember preferences, and
          analyze traffic. You can manage cookies in your browser settings. Where required, we will
          request your consent for non-essential cookies. If we host a separate Cookie Policy, it
          will be linked here.
        </p>
      </section>

      {/* Sharing */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">6. How we share information</h2>
        <p>We do not sell personal information. We may share information with:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Service providers:</strong> cloud hosting, analytics, payment processing,
            customer support, email delivery, and security vendors who process data on our behalf
            under appropriate agreements.
          </li>
          <li>
            <strong>Business transfers:</strong> if we are involved in a merger, acquisition, or
            asset sale.
          </li>
          <li>
            <strong>Legal and safety:</strong> to comply with law, lawful requests, or to protect
            rights, safety, and the integrity of the Services.
          </li>
        </ul>
      </section>

      {/* International transfers */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">7. International data transfers</h2>
        <p>
          We may transfer, store, and process your information in countries other than your own.
          Where required, we implement appropriate safeguards (such as standard contractual clauses)
          to protect your information.
        </p>
      </section>

      {/* Retention */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">8. Data retention</h2>
        <p>
          We keep personal information only as long as necessary for the purposes described in this
          Policy (for example, while your account is active), to comply with legal obligations,
          resolve disputes, and enforce agreements. When no longer needed, we delete or anonymize
          the data.
        </p>
      </section>

      {/* Security */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">9. Security</h2>
        <p>
          We use administrative, technical, and physical safeguards designed to protect personal
          information (e.g., encryption in transit, access controls). However, no system is
          completely secure, and we cannot guarantee absolute security.
        </p>
      </section>

      {/* Rights */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">10. Your privacy rights</h2>
        <p>
          Depending on your jurisdiction, you may have the right to request access, correction,
          deletion, portability, or restriction of your personal information, as well as the right
          to object to certain processing or withdraw consent. To exercise these rights, contact us
          at{" "}
          <a href={`mailto:${contactEmail}`} className="text-primary underline underline-offset-2">
            {contactEmail}
          </a>
          . We may need to verify your identity before responding.
        </p>
        <p className="text-ink-soft">
          If you are in the EEA/UK, you may also lodge a complaint with your local data protection
          authority. If you are in California, you may have rights under the CCPA/CPRA (including
          the right to know, delete, and correct).
        </p>
      </section>

      {/* Children */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">11. Children’s privacy</h2>
        <p>
          Our Services are not directed to children under the age of 13 (or the age required by
          your jurisdiction), and we do not knowingly collect personal information from children. If
          you believe a child has provided us personal information, please contact us so we can take
          appropriate action.
        </p>
      </section>

      {/* Automated decision-making */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">12. Automated decision-making</h2>
        <p>
          We do not engage in solely automated decision-making that produces legal or similarly
          significant effects about you. If this changes, we will describe the logic involved,
          significance, and your rights.
        </p>
      </section>

      {/* Third-party links */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">13. Third-party links</h2>
        <p>
          The Services may contain links to third-party sites or services. We are not responsible
          for their privacy practices. We encourage you to review their policies.
        </p>
      </section>

      {/* Changes */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">14. Changes to this Policy</h2>
        <p>
          We may update this Policy from time to time. We will post the updated version on this page
          and adjust the “Last updated” date above. If changes are material, we may provide
          additional notice.
        </p>
      </section>

      {/* Contact */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">15. How to contact us</h2>
        <p>
          If you have questions or requests regarding this Policy or your personal information,
          contact us at{" "}
          <a href={`mailto:${contactEmail}`} className="text-primary underline underline-offset-2">
            {contactEmail}
          </a>
          .
        </p>
      </section>
    </main>
  )
}
