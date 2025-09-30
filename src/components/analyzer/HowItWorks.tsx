// src/components/analyzer/HowItWorks.tsx
// English comments only inside code
import React, { useRef } from "react";
import clsx from "clsx";
import { useRevealOnView } from "../../hooks/userRevealOnView";

type Props = {
  className?: string;
};

/** Inline SVG icons (no external deps) */
const IconUser: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="8" r="4" fill="currentColor" />
    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const IconCheck: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M8 12l3 3 5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconTarget: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);
const IconBook: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M4 6a2 2 0 012-2h11a3 3 0 013 3v13a2 2 0 00-2-2H6a2 2 0 00-2 2V6z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M9 6h9M9 10h9M9 14h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** StepCard – flat style with reveal animation support */
type StepCardProps = {
  title: string;
  desc: string;
  icon: React.ReactNode;
  delayMs?: number;
};

const StepCard: React.FC<StepCardProps> = ({ title, desc, icon, delayMs = 0 }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useRevealOnView(ref, delayMs);

  return (
    <div
      ref={ref}
      className={clsx(
        "flex flex-col items-center text-center gap-4 px-2 py-4",
        "opacity-0 translate-y-3 transform-gpu transition-all duration-600 ease-out will-change-transform"
      )}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      <div className="w-20 h-20 rounded-2xl bg-primary text-white flex items-center justify-center" aria-hidden="true">
        <div className="w-9 h-9">{icon}</div>
      </div>
      <div className="text-xl font-semibold text-ink">{title}</div>
      <p className="text-ink-soft leading-relaxed max-w-[22rem]">{desc}</p>
    </div>
  );
};

/** HowItWorks – flat, centered, with animated header and steps only */
const HowItWorks: React.FC<Props> = ({ className }) => {
  // Header animation
  const headerRef = useRef<HTMLDivElement | null>(null);
  useRevealOnView(headerRef, 0);

  return (
    <section aria-labelledby="how-it-works" className={clsx("py-8 sm:py-10", className)}>
      {/* Section header (animated) */}
      <header
        ref={headerRef}
        className={clsx(
          "mx-auto max-w-5xl text-center mb-8 sm:mb-10",
          "opacity-0 translate-y-2 transform-gpu transition-all duration-600 ease-out will-change-transform"
        )}
      >
        <h2 id="how-it-works" className="text-2xl sm:text-3xl font-bold text-ink">How it works</h2>
        <p className="mt-3 text-ink-soft">Four simple steps to get a tailored career development report.</p>
      </header>

      {/* Steps grid */}
      <div role="list" className="mx-auto max-w-6xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <StepCard title="Step 1: Input personal info" desc="Provide your past occupation and interested industry" icon={<IconUser className="w-full h-full" />} delayMs={0} />
        <StepCard title="Step 2: Confirm analysis" desc="The system builds your capability profile automatically" icon={<IconCheck className="w-full h-full" />} delayMs={80} />
        <StepCard title="Step 3: Select target jobs" desc="Pick career options that match your aspirations" icon={<IconTarget className="w-full h-full" />} delayMs={160} />
        <StepCard title="Step 4: Get advice" desc="Identify gaps and receive personalized training guidance" icon={<IconBook className="w-full h-full" />} delayMs={240} />
      </div>
    </section>
  );
};

export default HowItWorks;
