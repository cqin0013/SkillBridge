import { Button, Typography, Space } from "antd";
import { useNavigate } from "react-router-dom";
import "./Hero.css";
// Pull out subcomponents
const { Title, Paragraph } = Typography;

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
