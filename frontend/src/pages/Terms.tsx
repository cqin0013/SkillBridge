/**
 * TermsOfServicePage (SkillBridge)
 * --------------------------------
 * Drop-in React component for a /terms route tailored to your project.
 *
 * What this is:
 * - A self-contained page that renders your Terms of Service with your constraints.
 *
 * What changed from the generic template:
 * - Removed "website" and email-based contact.
 * - Deleted original sections: Intellectual Property, License to Use, Fees, Termination, Limitation of Liability.
 * - Renumbered sections to keep a clean sequence.
 * - "Contact" now points users to the in-app Feedback entry point.
 * - No address, no copyright line, brand kept as plain text.
 *
 * Accessibility:
 * - Uses <main> and <section> landmarks and logical heading order.
 *
 * Styling:
 * - Tailwind tokens: text-ink, text-ink-soft, text-primary.
 * - No external UI dependencies; works in any React + Tailwind setup.
 */


type TermsProps = {
  /** Brand or company name shown in the document */
  brand?: string
  /** Effective date shown near the title, e.g., "2025-09-30" */
  effectiveDate?: string
  /** Governing law text, e.g., "the laws of Victoria, Australia" */
  governingLaw?: string
  /** Venue text, e.g., "the courts of Victoria, Australia" */
  venue?: string
  /**
   * Optional path to your in-app Feedback page.
   * Use this to route users to your feedback/contact flow instead of email.
   */
  feedbackPath?: string
}

export default function TermsOfServicePage({
  brand = "StrangerThink",
  effectiveDate = "2025-09-30",
  governingLaw = "the laws of Victoria, Australia",
  venue = "the courts of Victoria, Australia",
  feedbackPath = "/feedback",
}: TermsProps) {
  return (
    <main id="content" className="mx-auto max-w-3xl px-4 py-12 lg:py-16">
      {/* Page title and meta information users scan first */}
      <section aria-labelledby="tos-title" className="space-y-2">
        <h1 id="tos-title" className="text-3xl lg:text-4xl font-extrabold text-ink">
          Terms of Service
        </h1>
        <p className="text-ink-soft">
          <strong>Effective date:</strong> {effectiveDate}
        </p>
      </section>

      {/* Intro: scope and acceptance context */}
      <section className="mt-6 space-y-4 text-ink leading-relaxed">
        <p>
          These Terms of Service (“<strong>Terms</strong>”) govern your access to and use of the
          products and services provided by {brand} (collectively, the “<strong>Services</strong>”).
          By accessing or using the Services, you agree to be bound by these Terms. If you do not agree,
          do not use the Services.
        </p>
      </section>

      {/* 1 + 2: Acceptance and updates */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">1. Acceptance of the Terms</h2>
        <p>
          You must be able to form a binding contract to use the Services. If you use the Services on
          behalf of an organization, you represent that you have authority to bind that organization,
          and “you” refers to both you and that organization.
        </p>

        <h2 className="text-2xl font-bold mt-8">2. Changes to the Terms</h2>
        <p>
          We may update these Terms from time to time. If material changes are made, we will post the
          updated Terms on this page and adjust the effective date above. Your continued use of the
          Services after the updated Terms become effective constitutes acceptance of the changes.
        </p>
      </section>

      {/* 3: Account responsibilities kept simple but clear */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">3. Accounts and Security</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
          <li>You are responsible for all activities that occur under your account.</li>
          <li>
            If you suspect unauthorized access or a security issue, report it using the{" "}
            <a href={feedbackPath} className="text-primary underline underline-offset-2">
              Feedback
            </a>{" "}
            feature in the Platform.
          </li>
          <li>We may suspend accounts that violate these Terms or pose security risks.</li>
        </ul>
      </section>

      {/* 4: Acceptable use spelled out to reduce abuse and clarify boundaries */}
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

      {/* 5: User Content — still needed for uploads/inputs in your app */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">5. User Content</h2>
        <p>
          You retain ownership of content you submit, upload, or otherwise make available through the
          Services (“<strong>User Content</strong>”). You grant {brand} a worldwide, non-exclusive, royalty-free
          license to host, reproduce, and display your User Content solely to operate and provide the Services.
          You represent that you have all rights necessary to grant this license, and that your User Content
          does not violate any law or third-party rights.
        </p>
      </section>

      {/* 6: Feedback — clarifies reuse of suggestions without obligation */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">6. Feedback</h2>
        <p>
          If you provide feedback or suggestions, you grant us a non-exclusive, perpetual, irrevocable,
          royalty-free license to use the feedback for any purpose without obligation to you.
        </p>
      </section>

      {/* 7: Third-party integration disclaimer — common for APIs and embeds */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">7. Third-Party Services</h2>
        <p>
          The Services may integrate with or link to third-party websites, products, or services. We are not
          responsible for third-party content or practices. Your use of third-party services is at your own
          risk and may be governed by separate terms and policies.
        </p>
      </section>

      {/* 8: Disclaimers — kept, as you did not remove it */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">8. Disclaimers</h2>
        <p>
          THE SERVICES ARE PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE EXTENT PERMITTED BY LAW, WE DISCLAIM
          ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
          AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
        </p>
      </section>

      {/* 9: Indemnification — remains to allocate risk from misuse */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">9. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless {brand} and its affiliates, officers, employees, and agents
          from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal
          fees) arising out of or related to your breach of these Terms or your misuse of the Services.
        </p>
      </section>

      {/* 10: Governing law and dispute approach as per your AU state */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">10. Governing Law and Dispute Resolution</h2>
        <p>
          These Terms are governed by {governingLaw}, without regard to conflict-of-laws principles.
          You agree to submit to the exclusive jurisdiction of {venue}.
        </p>
        <p>
          Before filing a claim, the parties will attempt in good faith to resolve the dispute through
          informal negotiations for at least 30 days after notice of the dispute.
        </p>
      </section>

      {/* 11: Boilerplate clauses that keep the contract stable */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">11. Miscellaneous</h2>
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

      {/* 12: Contact via in-app Feedback, no email or address */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">12. Contact</h2>
        <p>
          For questions or reports, please use the{" "}
          <a href={feedbackPath} className="text-primary underline underline-offset-2">
            Feedback
          </a>{" "}
          feature within the Platform.
        </p>
      </section>
    </main>
  )
}
