// src/components/analyzer/HeroIntro.tsx
// English comments only inside code
import React, { useRef } from "react";
import clsx from "clsx";
import { useRevealOnView } from "../../hooks/userRevealOnView";

type Tone = "blue" | "yellow" | "white";

type HeroIntroProps = {
  title: string;
  description: string;
  image: string;
  tone?: Tone;
  className?: string;
  imageAlt?: string;
  imageDecorative?: boolean;
  ctaLabel?: string;
  onStart?: () => void;
};

const TONE_BG: Record<Tone, string> = {
  blue:   "bg-gradient-to-b from-[#E3EAFF] via-[#EAF0FF] to-[#F6F8FF]",
  yellow: "bg-gradient-to-b from-[#FFEAD0] via-[#FFF1DC] to-[#FFF7EA]",
  white:  "bg-white",
};

export default function HeroIntro({
  title,
  description,
  image,
  tone = "blue",
  className,
  imageAlt,
  imageDecorative,
  ctaLabel = "Start now",
  onStart,
}: HeroIntroProps) {
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  useRevealOnView(leftRef);
  useRevealOnView(rightRef);

  const computedAlt = imageDecorative ? "" : (imageAlt || title);
  const showCTA = Boolean(onStart && ctaLabel);

  return (
    <section
      className={clsx(
        "relative w-full box-border",
        // Clip any horizontal overflow, especially on small screens
        "overflow-x-hidden isolate",
        // Safe paddings
        "px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-20",
        TONE_BG[tone],
        className
      )}
    >
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 items-center gap-6 sm:gap-10 lg:gap-16">
        {/* Left: text column (allow shrink) */}
        <div
          ref={leftRef}
          className={clsx(
            "min-w-0",
            // No horizontal shift on small screens; only animate on md+
            "opacity-0 md:-translate-x-6",
            "transform-gpu transition-all duration-700 ease-out will-change-transform"
          )}
        >
          {/* Responsive title with robust wrapping */}
          <h1
            className={clsx(
              "font-bold text-ink leading-tight",
              "[font-size:clamp(1.375rem,4.4vw,2.75rem)]", // slightly lower floor for very narrow screens
              "break-words [overflow-wrap:anywhere] hyphens-auto",
              "max-w-[28ch]"
            )}
          >
            {title}
          </h1>

          {/* Description with wrapping and line length constraint */}
          <p
            className={clsx(
              "mt-3 sm:mt-5 text-ink-soft leading-relaxed",
              "[font-size:clamp(0.95rem,2.2vw,1.125rem)]",
              "break-words [overflow-wrap:anywhere] hyphens-auto",
              "max-w-[65ch]"
            )}
          >
            {description}
          </p>

          {showCTA && (
            <div className="mt-6 sm:mt-7">
              <button
                type="button"
                onClick={onStart}
                className={clsx(
                  "inline-flex items-center justify-center rounded-full",
                  "px-6 sm:px-7 h-11 sm:h-12 font-semibold",
                  "bg-primary text-white",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  "cursor-pointer"
                )}
              >
                {ctaLabel}
              </button>
            </div>
          )}
        </div>

        {/* Right: image column (allow shrink) */}
        <div
          ref={rightRef}
          className={clsx(
            "relative flex items-center justify-center min-w-0",
            // No horizontal shift on small screens; only animate on md+
            "opacity-0 md:translate-x-6",
            "transform-gpu transition-all duration-700 ease-out will-change-transform",
            // Prevent image shadow/translate leak on narrow viewports
            "overflow-hidden"
          )}
        >
          {image ? (
            <img
              src={image}
              alt={computedAlt}
              loading="eager"
              decoding="async"
              draggable={false}
              className={clsx(
                "w-full h-auto object-contain",
                // Hard cap on small screens to avoid pushing layout
                "max-w-[88vw] sm:max-w-[92vw] lg:max-w-[680px]"
              )}
            />
          ) : (
            <div className="h-[220px] w-[320px] bg-black/5" aria-hidden="true" />
          )}
        </div>
      </div>
    </section>
  );
}
