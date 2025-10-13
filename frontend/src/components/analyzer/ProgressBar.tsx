// src/components/analyzer/ProgressBar.tsx
// Step-based progress indicator: numbered circles connected by lines.
// Pure Tailwind responsive sizing. No JS media queries.
// - Circles: 28px (mobile) → 40px (sm) → 48px (md)
// - Connectors shorten on small screens
// - Hover shows tooltip with step name

import React from "react";
import clsx from "clsx";

export type ProgressBarProps = {
  /** 1-based current step index (clamped into [1, steps.length]) */
  current: number;
  /** Step names; length determines total steps */
  steps: string[];
  /** Extra class for root container */
  className?: string;
  /** Primary color for reached steps (defaults to var(--color-primary)) */
  primaryColor?: string;
  /** Gray color for upcoming steps */
  grayColor?: string;

  /** @deprecated Size is controlled by Tailwind breakpoints now */
  size?: number;
  /** @deprecated Line thickness is controlled by Tailwind now */
  lineThickness?: number;
};

const clamp = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, n));

const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  steps,
  className,
  primaryColor = "var(--color-primary, #3A5CFF)",
  grayColor = "#D1D5DB",
}) => {
  const total = Math.max(1, steps.length);
  const cur = clamp(current, 1, total);

  return (
    <div
      className={clsx(
        // Centered row; wrap if too narrow; responsive horizontal gaps
        "flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 md:gap-x-6 gap-y-3",
        className
      )}
      role="group"
      aria-label="progress steps"
    >
      {steps.map((name, i) => {
        const reached = i + 1 <= cur;
        const showConnector = i < total - 1;

        return (
          <div key={i} className="flex items-center">
            {/* Circle */}
            <div className="relative group inline-flex items-center justify-center">
              <div
                // Numbered circle with responsive size and text
                className={clsx(
                  "rounded-full select-none inline-flex items-center justify-center",
                  "w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12",
                  "text-xs sm:text-sm md:text-base font-medium",
                  reached ? "text-white ring-2 ring-black/5" : "text-gray-400 ring-1 ring-black/10"
                )}
                style={{
                  background: reached ? primaryColor : grayColor,
                  transition: "background 150ms ease",
                }}
                aria-current={i + 1 === cur ? "step" : undefined}
                aria-label={`Step ${i + 1}: ${name}`}
              >
                {i + 1}
              </div>

              {/* Tooltip below circle */}
              <div
                className={clsx(
                  "pointer-events-none absolute left-1/2 top-full -translate-x-1/2 mt-1",
                  "opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                )}
                role="tooltip"
              >
                <div className="px-2 py-1 text-xs rounded shadow whitespace-nowrap bg-gray-900 text-gray-50">
                  {name}
                </div>
              </div>
            </div>

            {/* Connector */}
            {showConnector && (
              <div
                aria-hidden
                className={clsx(
                  "opacity-90",
                  "mx-2 sm:mx-4 md:mx-6",
                  "h-[2px]",
                  "w-8 sm:w-16 md:w-20"
                )}
                style={{ background: reached ? primaryColor : grayColor }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProgressBar;
