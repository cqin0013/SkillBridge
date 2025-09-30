// src/components/layout/Footer.tsx
/**
 * Footer (three-column layout)
 * - Left: Brand + tagline + byline
 * - Middle: Quick Links (internal routes)
 * - Right: Feedback CTA (internal /feedback page)
 *
 * Visual:
 * - Dark background using project token `bg-ink` with `text-ink-invert`
 * - Subtle divider above the bottom bar
 *
 * Accessibility:
 * - <footer role="contentinfo"> landmark
 * - Nav groups have aria-labels
 * - Links include visible focus styles
 */


import { Link } from "react-router-dom"
import Button from "./ui/Button"

// ---- Configurable content ----------------------------------------------------

const SITE_NAME = "SkillBridge"
const TAGLINE =
  "Empowering learning through innovative tools and insights."
const BYLINE = "By StrangerThink"

// Internal quick links (add/remove as needed)
type QuickLink = { label: string; to: string }
const QUICK_LINKS: QuickLink[] = [
  { label: "Analyzer", to: "/analyzer" },
  { label: "Insight", to: "/insight" },
  { label: "Glossary", to: "/glossary" },
  { label: "Profile", to: "/profile" },

]

// Bottom legal links (hide by leaving the array empty)
const LEGAL_LINKS: QuickLink[] = [
  { label: "Privacy Policy", to: "/PrivacyPolicy" },
  { label: "Terms of Service", to: "/Terms" },
]

// -----------------------------------------------------------------------------

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer role="contentinfo" className="bg-ink text-ink-invert">
      {/* Top section ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {/* Brand / left column */}
          <div>
            {/* Site title */}
            <h2 className="text-2xl font-extrabold tracking-tight">
              {SITE_NAME}
            </h2>

            {/* One-line value proposition */}
            <p className="mt-6 text-xl/7 text-white/80">
              {TAGLINE}
            </p>

            {/* Byline */}
            <p className="mt-6 text-lg text-white/70">{BYLINE}</p>
          </div>

          {/* Quick Links / middle column */}
          <div>
            <h3 className="text-xl font-extrabold">Quick Links</h3>

            <nav aria-label="Quick links" className="mt-6">
              <ul className="space-y-4">
                {QUICK_LINKS.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="
                        text-lg text-white/80 hover:text-white transition
                        rounded focus-visible:outline-none
                        focus-visible:ring-2 focus-visible:ring-white/30
                      "
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Feedback / right column */}
          <div>
            <h3 className="text-xl font-extrabold">Feedback</h3>
            <p className="mt-6 text-white">
              Share ideas or report an issue. We'd love to hear from you.
            </p>

            {/* Use your shared Button component for consistent styling */}
            <div className="mt-6">
              <Button
                to="/feedback"           // SPA route to the internal feedback page
                variant="accent"         // On dark footer, accent stands out with black text
                size="lg"
                title="Open the feedback form"
                aria-describedby={undefined}
              >
                Send Feedback
              </Button>
            </div>
          </div>
        </div>

        {/* Divider above bottom bar */}
        <div className="mt-12 border-t border-white/10" />

        {/* Bottom bar: copyright + legal links -------------------------------------- */}
        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Left: © line */}
          <p className="text-base text-white/70">
            © {year} {SITE_NAME}. All rights reserved.
          </p>

          {/* Right: legal links (auto-hide if LEGAL_LINKS is empty) */}
          {LEGAL_LINKS.length > 0 && (
            <nav aria-label="Legal">
              <ul className="flex flex-wrap items-center gap-x-8 gap-y-2">
                {LEGAL_LINKS.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="
                        text-base text-white/80 hover:text-white transition
                        rounded focus-visible:outline-none
                        focus-visible:ring-2 focus-visible:ring-white/30
                      "
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </section>
    </footer>
  )
}
