// HeroIntro.tsx
import { useRef } from "react";
import { Link, type To } from "react-router-dom"; // ← add Link & To type
import clsx from "clsx";
import { useRevealOnView } from "../hooks/userRevealOnView";

type Tone = "blue" | "yellow" | "white";

type HeroIntroProps = {
  title: string;
  description: string;
  image: string;
  tone?: Tone;
  className?: string;
  imageAlt?: string;
  imageDecorative?: boolean;

  /** CTA button text */
  ctaLabel?: string;
  /** If provided, CTA becomes a <Link> to this route (takes precedence over onStart) */
  ctaTo?: To;                    // ← NEW: pass route path, e.g., "/analyzer/getInfo"
  /** Fallback click handler when ctaTo is not provided */
  onStart?: () => void;

  /** Whether to render a decorative wave at the bottom edge */
  showWave?: boolean;
  /** Wave fill color (commonly the background color of the next section) */
  waveColor?: string;
  /** Visual height of the wave; tune to your design */
  waveHeight?: number;
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
  ctaTo,                      // ← NEW
  onStart,
  showWave = true,
  waveColor = "#ffffff",
  waveHeight = 75,
}: HeroIntroProps) {
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  useRevealOnView(leftRef);
  useRevealOnView(rightRef);

  const computedAlt = imageDecorative ? "" : (imageAlt || title);
  const showCTA = Boolean((ctaTo || onStart) && ctaLabel);

  return (
    <section
      className={clsx(
        "relative w-full box-border",
        "overflow-x-hidden isolate",
        "px-4 sm:px-6 lg:px-8 pt-10 sm:pt-12 lg:pt-20 pb-14 sm:pb-16 lg:pb-24",
        TONE_BG[tone],
        className
      )}
    >
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 items-center gap-6 sm:gap-10 lg:gap-16">
        {/* Left: text column */}
        <div
          ref={leftRef}
          className={clsx(
            "min-w-0",
            "opacity-0 md:-translate-x-6",
            "transform-gpu transition-all duration-700 ease-out will-change-transform"
          )}
        >
          <h1
            className={clsx(
              "font-bold text-ink leading-tight",
              "[font-size:clamp(1.375rem,4.4vw,2.75rem)]",
              "break-words [overflow-wrap:anywhere] hyphens-auto",
              "max-w-[28ch]"
            )}
          >
            {title}
          </h1>

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
              {/* If ctaTo is provided, render as a Link; otherwise render a button */}
              {ctaTo ? (
                <Link
                  to={ctaTo}
                  className={clsx(
                    "inline-flex items-center justify-center rounded-full",
                    "px-6 sm:px-7 h-11 sm:h-12 font-semibold",
                    "bg-primary text-white",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    "cursor-pointer"
                  )}
                >
                  {ctaLabel}
                </Link>
              ) : (
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
              )}
            </div>
          )}
        </div>

        {/* Right: image column */}
        <div
          ref={rightRef}
          className={clsx(
            "relative flex items-center justify-center min-w-0",
            "opacity-0 md:translate-x-6",
            "transform-gpu transition-all duration-700 ease-out will-change-transform",
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
                "max-w-[88vw] sm:max-w-[92vw] lg:max-w-[680px]"
              )}
            />
          ) : (
            <div className="h-[220px] w-[320px] bg-black/5" aria-hidden="true" />
          )}
        </div>
      </div>

      {/* Decorative bottom wave */}
      {showWave && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-[1px]"
          style={{ height: waveHeight }}
        >
          <svg
            viewBox="0 0 1440 64"
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            className="block w-full h-full"
          >
            <path
              d="M0,16 L0,64 L1440,64 L1440,16
                 C1300,6 1200,0 1080,6
                 C960,12 840,28 720,24
                 C600,20 480,0 360,6
                 C240,12 120,28 0,16 Z"
              fill={waveColor}
            />
          </svg>
        </div>
      )}
    </section>
  );
}
