// src/pages/TermsOfService.tsx
/**
 * TermsOfServicePage
 * ------------------
 * Drop-in React component for a /terms route.
 *
 * Notes:
 * - This content is a general template and does not constitute legal advice.
 *   Please have a qualified lawyer review it for your specific jurisdiction.
 *
 * Accessibility:
 * - Semantic <main> and <section> landmarks; proper heading hierarchy.
 *
 * Styling:
 * - Uses your Tailwind tokens (text-ink, text-ink-soft, text-primary).
 * - Minimal dependencies; no plugins required.
 */

import * as React from "react"

type TermsProps = {
  /** Brand or company name used throughout the terms */
  brand?: string
  /** Public website shown in the header */
  website?: string
  /** Contact mailbox for legal or support matters */
  contactEmail?: string
  /** Effective date (ISO-like string) shown near the title */
  effectiveDate?: string
  /** Governing law locality (e.g., 'Victoria, Australia') */
  governingLaw?: string
  /** Courts/venue (e.g., 'the courts of Victoria, Australia') */
  venue?: string
}

export default function TermsOfServicePage({
  brand = "StrangerThink",
  website = "https://www.strangerthink.com",
  contactEmail = "legal@strangerthink.com",
  effectiveDate = "2025-09-30",
  governingLaw = "the laws of Victoria, Australia",
  venue = "the courts of Victoria, Australia",
}: TermsProps) {
  return (
    <main id="content" className="mx-auto max-w-3xl px-4 py-12 lg:py-16">
      {/* Page title + meta */}
      <section aria-labelledby="tos-title" className="space-y-2">
        <h1 id="tos-title" className="text-3xl lg:text-4xl font-extrabold text-ink">
          Terms of Service
        </h1>
        <p className="text-ink-soft">
          <strong>Effective date:</strong> {effectiveDate}
        </p>
      </section>

      {/* Intro */}
      <section className="mt-6 space-y-4 text-ink leading-relaxed">
        <p>
          These Terms of Service (“<strong>Terms</strong>”) govern your access to and use of the
          website, products, and services provided by {brand} (collectively, the “<strong>Services</strong>”).
          By accessing or using the Services, you agree to be bound by these Terms. If you do not
          agree, do not use the Services.
        </p>
        <p>
          Our website:{" "}
          <a href={website} className="text-primary underline underline-offset-2">
            {website}
          </a>
          . For privacy information, please see our Privacy Policy.
        </p>
      </section>

      {/* Acceptance; Changes */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">1. Acceptance of the Terms</h2>
        <p>
          You must be able to form a binding contract to use the Services. If you use the Services on behalf
          of an organization, you represent that you have authority to bind that organization, and “you”
          refers to both you and that organization.
        </p>
        <h2 className="text-2xl font-bold mt-8">2. Changes to the Terms</h2>
        <p>
          We may update these Terms from time to time. If material changes are made, we will post the updated
          Terms on this page and adjust the effective date above. Your continued use of the Services after the
          updated Terms become effective constitutes acceptance of the changes.
        </p>
      </section>

      {/* Accounts */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">3. Accounts and Security</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
          <li>You are responsible for all activities that occur under your account.</li>
          <li>
            Notify us promptly of any unauthorized access or suspected security breach at{" "}
            <a href={`mailto:${contactEmail}`} className="text-primary underline underline-offset-2">
              {contactEmail}
            </a>
            .
          </li>
          <li>We may suspend or terminate accounts that violate these Terms or pose security risks.</li>
        </ul>
      </section>

      {/* Acceptable Use */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">4. Acceptable Use</h2>
        <p>You agree not to, and not to allow third parties to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Use the Services for any unlawful, infringing, or harmful purpose.</li>
          <li>Attempt to gain unauthorized access to any systems or networks.</li>
          <li>Interfere with or disrupt the integrity or performance of the Services.</li>
          <li>Reverse engineer, decompile, or disassemble any part of the Services except as permitted by law.</li>
          <li>Upload malicious code, or violate others’ privacy or intellectual property rights.</li>
          <li>Use automated means to scrape or collect data in a manner not permitted by us.</li>
        </ul>
      </section>

      {/* Intellectual Property */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">5. Intellectual Property</h2>
        <p>
          The Services and all materials therein, including software, text, images, graphics, logos,
          and content (collectively, “<strong>Content</strong>”), are owned by {brand} or our licensors and are
          protected by intellectual property laws. Except as expressly permitted in these Terms, you may not
          use, copy, modify, or create derivative works based on the Content without our prior written consent.
        </p>
      </section>

      {/* License to Use; User Content */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">6. License to Use the Services</h2>
        <p>
          Subject to your compliance with these Terms, we grant you a limited, non-exclusive,
          non-transferable, revocable license to access and use the Services for your internal use.
        </p>

        <h2 className="text-2xl font-bold mt-8">7. User Content</h2>
        <p>
          You retain ownership of content you submit, upload, or otherwise make available through the Services
          (“<strong>User Content</strong>”). You grant {brand} a worldwide, non-exclusive, royalty-free license to host,
          reproduce, and display your User Content solely to operate and provide the Services. You represent
          that you have all rights necessary to grant this license, and that your User Content does not violate
          any law or third-party rights.
        </p>

        <h2 className="text-2xl font-bold mt-8">8. Feedback</h2>
        <p>
          If you provide feedback or suggestions, you grant us a non-exclusive, perpetual, irrevocable,
          royalty-free license to use the feedback for any purpose without obligation to you.
        </p>
      </section>

      {/* Third-Party Services */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">9. Third-Party Services</h2>
        <p>
          The Services may integrate with or link to third-party websites, products, or services.
          We are not responsible for third-party content or practices. Your use of third-party services
          is at your own risk and may be governed by separate terms and policies.
        </p>
      </section>

      {/* Fees (optional if you charge) */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">10. Fees and Payments (if applicable)</h2>
        <p>
          If the Services are offered for a fee, you agree to pay all applicable fees stated at the
          time of purchase or subscription. Prices and features may change; we will provide notice of
          any price changes before they become effective. Unless required by law, fees are non-refundable.
        </p>
      </section>

      {/* Termination */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">11. Termination</h2>
        <p>
          You may stop using the Services at any time. We may suspend or terminate your access to the
          Services if you violate these Terms, if required by law, or for security reasons. Upon termination,
          provisions that by their nature should survive (e.g., intellectual property, disclaimers, limitation
          of liability, indemnification) will remain in effect.
        </p>
      </section>

      {/* Disclaimers; Limitation; Indemnity */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">12. Disclaimers</h2>
        <p>
          THE SERVICES ARE PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE EXTENT PERMITTED BY LAW, WE DISCLAIM
          ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
          AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
        </p>

        <h2 className="text-2xl font-bold mt-8">13. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, {brand} AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS
          WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY
          LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF (OR INABILITY TO
          USE) THE SERVICES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
        </p>
        <p>
          TO THE EXTENT PERMITTED BY LAW, OUR AGGREGATE LIABILITY FOR ALL CLAIMS RELATING TO THE SERVICES
          WILL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID US (IF ANY) IN THE 12 MONTHS BEFORE THE CLAIM
          AROSE, OR (B) ONE HUNDRED AUSTRALIAN DOLLARS (AUD 100).
        </p>

        <h2 className="text-2xl font-bold mt-8">14. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless {brand} and its affiliates, officers, employees, and agents
          from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal
          fees) arising out of or related to your breach of these Terms or your misuse of the Services.
        </p>
      </section>

      {/* Governing Law; Disputes */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">15. Governing Law and Dispute Resolution</h2>
        <p>
          These Terms are governed by {governingLaw}, without regard to conflict-of-laws principles.
          You agree to submit to the exclusive jurisdiction of {venue}.
        </p>
        <p>
          Before filing a claim, the parties will attempt in good faith to resolve the dispute through
          informal negotiations for at least 30 days after notice of the dispute.
        </p>
      </section>

      {/* Misc */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">16. Miscellaneous</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Entire agreement:</strong> These Terms constitute the entire agreement between you and {brand}
            regarding the Services and supersede any prior agreements.
          </li>
          <li>
            <strong>Severability:</strong> If any provision is found unenforceable, the remaining provisions will
            remain in full force and effect.
          </li>
          <li>
            <strong>No waiver:</strong> Our failure to enforce any provision is not a waiver of our right to do so later.
          </li>
          <li>
            <strong>Assignment:</strong> You may not assign or transfer these Terms without our prior written consent.
            We may assign these Terms in connection with a merger, acquisition, or sale of assets.
          </li>
          <li>
            <strong>Headings:</strong> Headings are for convenience only and do not affect interpretation.
          </li>
        </ul>
      </section>

      {/* Contact */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">17. Contact</h2>
        <p>
          For questions about these Terms, contact us at{" "}
          <a href={`mailto:${contactEmail}`} className="text-primary underline underline-offset-2">
            {contactEmail}
          </a>
          .
        </p>
      </section>
    </main>
  )
}
