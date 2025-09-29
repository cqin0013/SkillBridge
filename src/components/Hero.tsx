// src/components/Hero.tsx
// Left-aligned hero with lighter left-side scrim and coupled intro animation.
// Adds a bottom "fade" divider (image gradually becomes transparent/solid color)
// so the next section background shows through smoothly.

import * as React from "react";

type DividerMode = "none" | "wave" | "fade";

type HeroProps = {
  title: string;
  subtitle?: string;
  bg: string;                // background image url
  headerHeight?: number;     // px; default 64 (Tailwind h-16)
  scrollTargetId?: string;   // id of the next section, default "features"
  // Divider options
  divider?: DividerMode;
  dividerColor?: string;     // used by wave; for fade it's the target color (usually next section bg)
  dividerHeight?: number;    // px height of the SVG wave or fade band
  waveFlip?: boolean;        // for wave only
};

export default function Hero({
  title,
  subtitle,
  bg,
  headerHeight = 64,
  scrollTargetId = "features",
  divider = "fade",          // default to fade
  dividerColor = "#ffffff",  // fade-to or wave fill color
  dividerHeight = 120,
  waveFlip = false,
}: HeroProps) {
  // CSS var for header height (type-safe)
  type CSSVars = React.CSSProperties & Record<"--header-h", string>;
  const style: CSSVars = { ["--header-h"]: `${headerHeight}px` };

  // Mount animations (respect reduced-motion; dynamic import gsap)
  React.useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let mounted = true;
    (async () => {
      const { default: gsap } = await import("gsap");
      if (!mounted) return;

      // Coupled timeline: scrim -> lighter, title -> wipe + fade
      const tl = gsap.timeline();
      tl.fromTo(".hero-scrim", { opacity: 0.75 }, { opacity: 0.42, duration: 1.1, ease: "power2.out" }, 0);
      tl.from(".hero-title", { opacity: 0, duration: 0.7, ease: "power2.out" }, 0.1);
      tl.fromTo(".hero-title-mask", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1.0, ease: "power2.out" }, 0.1);

      // Looping nudge for the scroll hint arrow
      gsap.to(".hero-scroll-hint", { y: 6, repeat: -1, yoyo: true, duration: 0.9, ease: "sine.inOut" });
    })();

    return () => { mounted = false; };
  }, []);

  // Click handler for "SCROLL" (smooth scroll with header offset)
  const onScrollClick = React.useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const target = document.getElementById(scrollTargetId);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const absoluteTop = rect.top + window.pageYOffset;
    const y = Math.max(absoluteTop - headerHeight, 0);

    window.scrollTo({ top: y, left: 0, behavior: prefersReduced ? "auto" : "smooth" });
  }, [scrollTargetId, headerHeight]);

  return (
    <section
      className="
        relative isolate
        -mt-[var(--header-h,64px)] pt-[var(--header-h,64px)]
        min-h-[calc(100dvh-var(--header-h,64px))]
        text-white
      "
      style={style}
      aria-label="Intro hero"
    >
      {/* Background image (base layer) */}
      <div className="absolute inset-0 z-0 bg-center bg-cover" style={{ backgroundImage: `url(${bg})` }} aria-hidden="true" />

      {/* Lighter left-side scrim (animation target: .hero-scrim) */}
      <div
        className="
          hero-scrim pointer-events-none absolute inset-0 z-10
          bg-gradient-to-r from-black/60 via-black/35 to-transparent
        "
        aria-hidden="true"
      />

      {/* Content (top layer), left-aligned */}
      <div className="relative z-20 mx-auto max-w-6xl px-4">
        <div className="flex min-h-[calc(100dvh-var(--header-h,64px))] items-center justify-start text-left">
          <div className="max-w-2xl">
            {/* Title: clip-path wipe + fade (position stays fixed) */}
            <h1 className="hero-title text-[2.25rem] lg:text-[3.5rem] font-extrabold leading-tight">
              <span className="hero-title-mask inline-block">{title}</span>
            </h1>

            {subtitle && <p className="mt-4 text-[1.125rem] lg:text-[1.25rem] text-white/90">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Bottom "SCROLL" hint (clickable) */}
      <div className="absolute inset-x-0 bottom-6 z-20 flex flex-col items-center">
        <a
          href={`#${scrollTargetId}`}
          onClick={onScrollClick}
          className="group inline-flex flex-col items-center rounded-md px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          aria-label="Scroll to the next section"
        >
          <span className="text-sm lg:text-base font-bold tracking-[0.5em] drop-shadow" style={{ color: "#637DAB" }}>
            SCROLL
          </span>
          <svg className="hero-scroll-hint mt-1 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true" style={{ color: "#DE9526" }}>
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>

      {/* --- Divider: fade or wave --- */}
      {divider === "fade" && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
          style={{ height: `${dividerHeight}px` }}
          aria-hidden="true"
        >
          {/* Transparent -> dividerColor (usually next section background) */}
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0) 0%, ${dividerColor} 85%, ${dividerColor} 100%)`,
            }}
          />
        </div>
      )}

      {divider === "wave" && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 leading-none"
          style={{ height: `${dividerHeight}px`, transform: waveFlip ? "scaleY(-1) translateZ(0)" : "translateZ(0)" }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none" width="100%" height="100%" role="presentation" focusable="false" style={{ display: "block" }}>
            <path
              d="M0,48 C160,96 320,96 480,72 C640,48 800,0 960,16 C1120,32 1280,96 1440,80 L1440,120 L0,120 Z"
              fill={dividerColor}
            />
          </svg>
        </div>
      )}
    </section>
  );
}
