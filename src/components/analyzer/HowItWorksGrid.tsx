// src/components/analyzer/HowItWorksGrid.tsx
import React, { useRef } from "react";
import clsx from "clsx";
import { useRevealOnView } from "../../hooks/userRevealOnView";

/** One step item model passed from parent */
export type HowItWorksStep = {
  /** Unique id for the step (used as key and aria attributes) */
  id: string;
  /** Short title displayed on the card */
  title: string;
  /** One or two sentences describing the step */
  desc: string;
  /** Icon node provided by parent; sized by this component */
  icon: React.ReactNode;
};

/** Props for the reusable HowItWorks grid */
export type HowItWorksGridProps = {
  /** Steps to render in order */
  steps: readonly HowItWorksStep[];
  /** Optional className for outer section */
  className?: string;
  /**
   * Optional accessible label id for the region, e.g. the id of an H2 outside.
   * When provided, we expose aria-labelledby for better a11y structure.
   */
  labelledById?: string;
};

/** Single step card with reveal-on-view animation */
const StepCard: React.FC<HowItWorksStep & { delayMs?: number }> = ({
  title,
  desc,
  icon,
  delayMs = 0,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useRevealOnView(ref, delayMs);

  return (
    <div
      ref={ref}
      className={clsx(
        "flex flex-col items-center text-center gap-4 px-2 py-4",
        // fade + translate animation
        "opacity-0 translate-y-3 transform-gpu transition-all duration-600 ease-out will-change-transform"
      )}
      style={{ transitionDelay: `${delayMs}ms` }}
      role="listitem"
    >
      <div
        className="w-20 h-20 rounded-2xl bg-primary text-white flex items-center justify-center"
        aria-hidden="true"
      >
        {/* Parent controls icon; we constrain visual size here */}
        <div className="w-9 h-9">{icon}</div>
      </div>
      <div className="text-xl font-semibold text-ink">{title}</div>
      <p className="text-ink-soft leading-relaxed max-w-[22rem]">{desc}</p>
    </div>
  );
};

/**
 * HowItWorksGrid
 * Reusable, headerless steps grid.
 * - Parent supplies icons, ids, titles, descriptions.
 * - Parent also renders the section heading/intro text adjacent to this grid.
 */
const HowItWorksGrid: React.FC<HowItWorksGridProps> = ({
  steps,
  className,
  labelledById,
}) => {
  // Header animation (applies to the whole grid)
  const containerRef = useRef<HTMLDivElement | null>(null);
  useRevealOnView(containerRef, 0);

  return (
    <section
      ref={containerRef}
      className={clsx(
        "py-8 sm:py-10 opacity-0 translate-y-2 transform-gpu transition-all duration-600 ease-out will-change-transform",
        className
      )}
      aria-labelledby={labelledById}
    >
      {/* Steps grid only; header is owned by the parent page */}
      <div
        role="list"
        className="mx-auto max-w-6xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
      >
        {steps.map((s, i) => (
          <StepCard
            key={s.id}
            id={s.id}
            title={s.title}
            desc={s.desc}
            icon={s.icon}
            delayMs={i * 80}
          />
        ))}
      </div>
    </section>
  );
};

export default HowItWorksGrid;
