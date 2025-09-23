// src/components/IntroHero/IntroHero.jsx
// UI: Ant Design components for button, typography, and spacing layout
import { Button, Typography, Space } from "antd";

// Routing: SPA navigation without full page reloads
import { useNavigate } from "react-router-dom";

// Styles: this file is expected to set the background using the CSS var --hero-bg
import "./Hero.css";

// Pull out subcomponents
const { Title, Paragraph } = Typography;

/**
 * IntroHero — a reusable "first-screen" (hero) section.
 *
 * Design goals:
 * - Show a full-bleed background image with a readable content column on top.
 * - Present a clear headline, optional subtitle, and a primary call-to-action (CTA).
 * - Provide room for additional actions (links/buttons) next to the primary CTA.
 * - Allow overriding the height if the default hero height doesn't fit the page.
 *
 * Background image contract:
 * - The component passes a CSS custom property `--hero-bg: url(<bgImage>)`.
 * - `Hero.css` should read it (e.g. `.sb-hero { background: var(--hero-bg) ... }`).
 *
 * Navigation contract:
 * - Clicking the primary CTA will:
 *    1) Call `onCtaClick()` if provided (highest priority).
 *    2) Otherwise, navigate to `ctaHref` via react-router `navigate()`, if provided.
 *    3) Otherwise, do nothing (button can be omitted by passing empty ctaText).
 *
 * Accessibility:
 * - The outer <section> carries `aria-label="Intro hero"` to announce its role.
 * - The right-side visual spacer is `aria-hidden`, as it is decorative only.
 *
 * @param {Object} props
 * @param {string} props.title                 - Main headline text (H1). Recommended for SEO and a11y.
 * @param {string} [props.subtitle]            - Optional subtitle/description shown under the title.
 * @param {string} props.bgImage               - Background image URL. Required (used by CSS via --hero-bg).
 * @param {string} [props.ctaText="Get started"] - Primary CTA button text. If falsy, the button is not rendered.
 * @param {string} [props.ctaHref]             - Route path to navigate to if `onCtaClick` is not supplied.
 * @param {() => void} [props.onCtaClick]      - Optional click handler for the primary CTA (takes precedence).
 * @param {React.ReactNode} [props.extraActions] - Optional additional actions (e.g., secondary button/link).
 * @param {string | number} [props.height]     - Optional height override (e.g., "70vh" or 640).
 *
 * @example
 * <IntroHero
 *   title="SkillBridge"
 *   subtitle="Match your skills to jobs and training in Australia."
 *   bgImage="/assets/hero.jpg"
 *   ctaText="Start analyzing"
 *   ctaHref="/analyzer"
 *   extraActions={<Button size="large" shape="round">Learn more</Button>}
 * />
 */
export default function IntroHero({
  title,
  subtitle,
  bgImage,
  ctaText = "Get started",
  ctaHref,
  onCtaClick,
  extraActions,
  height,
}) {
  // Router navigate function for SPA-style internal navigation
  const navigate = useNavigate();

  /**
   * Handle clicks on the primary CTA.
   * Priority:
   *  1) If an explicit `onCtaClick` is given, call it and stop.
   *  2) Else if `ctaHref` is provided, navigate to that route.
   *  3) Else do nothing (button may be omitted by passing empty `ctaText`).
   */
  const handleClick = () => {
    if (onCtaClick) return onCtaClick();
    if (ctaHref) return navigate(ctaHref);
  };

  return (
    // Semantic region for the hero. CSS reads `--hero-bg` to paint the background.
    <section
      className="sb-hero"
      style={{
        // Hand over the background image to CSS via a custom property
        "--hero-bg": `url(${bgImage})`,
        // Allow consumers to override the computed height (e.g. "70vh" or 640)
        ...(height ? { height } : null),
      }}
      aria-label="Intro hero"
    >
      {/* Inner layout container; styles handle responsive grid and spacing */}
      <div className="sb-hero__inner">
        {/* Left column: textual content (title, subtitle, actions) */}
        <div className="sb-hero__col">
          {/* Title is optional—but recommended; rendered as an H1 by AntD Typography */}
          {title && (
            <Title level={1} className="sb-hero__title">
              {title}
            </Title>
          )}

          {/* Optional subtitle/description */}
          {subtitle && (
            <Paragraph className="sb-hero__subtitle">{subtitle}</Paragraph>
          )}

          {/* Actions row: primary CTA plus any extra actions passed in */}
          <Space className="sb-hero__actions" align="center">
            {/* Render the primary CTA only if there is button text */}
            {ctaText && (
              <Button
                type="primary"
                size="large"
                shape="round"
                onClick={handleClick}
              >
                {ctaText}
              </Button>
            )}

            {/* Slot for secondary/tertiary actions (e.g., "Learn more") */}
            {extraActions}
          </Space>
        </div>

        {/* Right column spacer — purely visual to reveal more of the background.
            Mark it aria-hidden so assistive tech ignores it. */}
        <div className="sb-hero__spacer" aria-hidden="true" />
      </div>
    </section>
  );
}
