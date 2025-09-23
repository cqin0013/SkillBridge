import "./RoadMap.css";
import useResponsive from "../../../lib/hooks/useResponsive"; 

/**
 * Read-only roadmap list.
 * - Pure presentational: receives `steps` and renders cards on a vertical timeline.
 * - Responsiveness is handled in JS via `useResponsive` (no CSS media queries needed).
 *
 * Props:
 * - steps?: Array<{ id?: string, title: string, desc?: string, date?: string }>
 * - className?: string
 */
export default function Roadmap({ steps = [], className = "" }) {
  if (!steps.length) return null;

  // Breakpoints → pick compact sizes for mobile, roomier sizes for larger screens.
  const { isMobile, isTablet } = useResponsive();

  // UI tokens controlled by JS instead of CSS media queries
  const ui = isMobile
    ? {
        containerPadLeft: 22,
        cardPad: 12,
        circleSize: 22,
        circleBorder: 3,
        circleFont: 11,
        titleSize: 16,
        dateSize: 12,
      }
    : isTablet
    ? {
        containerPadLeft: 26,
        cardPad: 14,
        circleSize: 26,
        circleBorder: 3,
        circleFont: 12,
        titleSize: 17,
        dateSize: 13,
      }
    : {
        containerPadLeft: 28,
        cardPad: 16,
        circleSize: 28,
        circleBorder: 4,
        circleFont: 12,
        titleSize: 18,
        dateSize: 13,
      };

  return (
    <section
      className={`roadmap-container ${className}`}
      aria-label="Roadmap"
      style={{ paddingLeft: ui.containerPadLeft }}
    >
      <div className="roadmap-line" aria-hidden="true" />
      <ol className="roadmap-list">
        {steps.map((step, idx) => (
          <li key={idx} className="roadmap-item">
            {/* Timeline dot with the step index; sized responsively via inline styles */}
            <div
              className="roadmap-circle"
              aria-hidden="true"
              style={{
                width: ui.circleSize,
                height: ui.circleSize,
                borderWidth: ui.circleBorder,
                fontSize: ui.circleFont,
                lineHeight: `${ui.circleSize - ui.circleBorder * 2}px`,
              }}
            >
              {idx + 1}
            </div>

            {/* Card body; spacing and font sizes adapt to breakpoint */}
            <article
              className="roadmap-card"
              style={{ padding: ui.cardPad }}
            >
              <header className="roadmap-card__header">
                <h3
                  className="roadmap-card__title"
                  style={{ fontSize: ui.titleSize }}
                >
                  {step.title}
                </h3>

                {step.date && (
                  <time
                    className="roadmap-card__date"
                    dateTime={step.date /* Prefer ISO-8601 like 2025-09-21 */}
                    style={{ fontSize: ui.dateSize }}
                  >
                    {step.date}
                  </time>
                )}
              </header>

              {step.desc && <p className="roadmap-card__desc">{step.desc}</p>}
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
