/**
 * PrivacyPolicyPage 
 * --------------------------------------------------
 * Drop-in React component for a /privacy route.
 * Matches StrangerThink’s model: no website entity, no server storage,
 * no third-party trackers, contact via in-app Feedback only.
 *
 * Accessibility:
 * - Uses <main>/<section> landmarks and hierarchical headings.
 *
 * Styling:
 * - Tailwind utility classes; minimal deps.
 */

type PrivacyProps = {
  /** Team or product name shown in the policy */
  brand?: string;
  /** Route to your in-app feedback page/button */
  feedbackPath?: string;
  /** ISO-like date for the “Last updated” line */
  lastUpdated?: string;
};

export default function PrivacyPolicyPage({
  brand = "StrangerThink",
  feedbackPath = "/feedback",
  lastUpdated = "2025-09-30",
}: PrivacyProps) {
  return (
    <main id="content" className="mx-auto max-w-3xl px-4 py-12 lg:py-16">
      {/* Title */}
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
          This Privacy Policy explains how {brand} (“we”, “us”, “our”) handles information when you
          use our services (the “Services”). By using the Services, you agree to this Policy.
        </p>
      </section>

      {/* Who we are */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">1. Who we are</h2>
        <p>
          We are the {brand} team. We do not operate a public website or corporate entity for this
          project. For questions or requests, please contact us via the in-app{" "}
          <a href={feedbackPath} className="text-primary underline underline-offset-2">
            Feedback
          </a>
          .
        </p>
      </section>

      {/* Information we collect */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">2. Information we collect</h2>
        <p>
          By design, we do <strong>not collect, transmit, or store</strong> your personal data on
          our servers. All inputs and calculations run locally in your browser and exist only for
          the current session.
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>In-session data:</strong> page state (e.g., filters, selections, typed text)
            may exist temporarily in memory or session storage to make the page work.
          </li>
          <li>
            This data is <strong>not uploaded</strong> to us and is cleared when you close the tab
            or end the session.
          </li>
        </ul>
      </section>

      {/* How we use it */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">3. How we use your information</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Run features locally in your browser for the current session.</li>
          <li>We do not perform server-side analytics, profiling, or advertising.</li>
          <li>We do not send marketing communications.</li>
        </ul>
      </section>

      {/* Legal bases */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">4. Legal bases (where applicable)</h2>
        <p>
          Because we do not conduct server-side processing of personal data, separate legal bases
          are generally not implicated. If this changes, we will notify you and obtain consent where
          required.
        </p>
      </section>

      {/* Cookies */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">5. Cookies and similar technologies</h2>
        <p>
          We do not use non-essential cookies, third-party trackers, or analytics SDKs. We may use
          session-level browser storage solely to keep the current page working; it is cleared when
          the session ends.
        </p>
      </section>

      {/* Sharing */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">6. How we share information</h2>
        <p>
          We do not sell personal information and, because we do not collect it, we have nothing to
          share with third parties. If required by law, we may disclose whatever minimal
          information we actually possess (typically none).
        </p>
      </section>

      {/* Transfers */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">7. International data transfers</h2>
        <p>No server-side personal data is processed, so no cross-border transfers occur.</p>
      </section>

      {/* Retention */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">8. Data retention</h2>
        <p>
          We do not retain personal data on servers. In-browser session data is discarded when you
          close the tab or end the session. Content you submit via{" "}
          <a href={feedbackPath} className="text-primary underline underline-offset-2">
            Feedback
          </a>{" "}
          is used only to handle your request and kept for the shortest necessary period.
        </p>
      </section>

      {/* Security */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">9. Security</h2>
        <p>
          Local processing reduces transmission risk. If applicable, transport encryption (HTTPS) is
          used. No system is perfectly secure—please avoid entering sensitive personal information.
        </p>
      </section>

      {/* Rights */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">10. Your privacy rights</h2>
        <p>
          Because we do not maintain server-side records, requests like access, deletion, or
          portability typically do not apply. If you submitted content via{" "}
          <a href={feedbackPath} className="text-primary underline underline-offset-2">
            Feedback
          </a>{" "}
          and want it removed, include details in your message and we will handle it where
          feasible.
        </p>
      </section>

      {/* Children */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">11. Children’s privacy</h2>
        <p>
          The Services are not directed to children under 13 (or the age required by your
          jurisdiction). Do not submit personal information for children.
        </p>
      </section>

      {/* Automated decisions */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">12. Automated decision-making</h2>
        <p>
          We do not perform solely automated decision-making with legal or similarly significant
          effects. If this changes, we will explain the logic, significance, and your rights.
        </p>
      </section>

      {/* Third-party links */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">13. Third-party links</h2>
        <p>
          The Services may contain links to third-party sites or services. Their privacy practices
          are their own; please review their policies.
        </p>
      </section>

      {/* Changes */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">14. Changes to this Policy</h2>
        <p>
          We may update this Policy and will adjust the “Last updated” date above. For material
          changes, we may provide more prominent notice.
        </p>
      </section>

      {/* Contact */}
      <section className="mt-8 space-y-3 text-ink">
        <h2 className="text-2xl font-bold">15. How to contact us</h2>
        <p>
          For questions or requests about this Policy or your information, please use the in-app{" "}
          <a href={feedbackPath} className="text-primary underline underline-offset-2">
            Feedback
          </a>
          .
        </p>
      </section>
    </main>
  );
}
