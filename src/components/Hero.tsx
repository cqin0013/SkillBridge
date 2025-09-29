// src/components/Hero.tsx
// Text-first hero (no global overlays).
// - Shows a full-width bottom veil (transparent → white) that contains the "SCROLL" hint.
// - The veil + hint hide immediately on any scroll or click, and reappear when back at top.

import * as React from "react"

type HeroProps = {
  title: string
  subtitle?: string
  headerHeight?: number            // sticky header height in px; default 64
  scrollTargetId?: string          // id of the next section to scroll into view
  hintTopThreshold?: number        // show veil+hint only when scrollY <= threshold (default 2)
  // Veil band (the container for the hint)
  veilHeight?: number              // px height of the bottom veil band (default 140)
  veilColor?: string               // base/target color of the veil (usually next section bg; default white)
}

export default function Hero({
  title,
  subtitle,
  headerHeight = 64,
  scrollTargetId = "features",
  hintTopThreshold = 2,
  veilHeight = 140,
  veilColor = "#ffffff",
}: HeroProps) {
  // CSS var for sticky header offset
  type CSSVars = React.CSSProperties & Record<"--header-h", string>
  const style: CSSVars = { ["--header-h"]: `${headerHeight}px` }

  // Veil + hint visibility (coupled to "at top")
  const [visible, setVisible] = React.useState(true)

  // Smooth-scroll to next section (with header offset)
  const scrollToNext = React.useCallback(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const el = document.getElementById(scrollTargetId)
    if (!el) return
    const rect = el.getBoundingClientRect()
    const y = Math.max(rect.top + window.pageYOffset - headerHeight, 0)
    window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" })
  }, [scrollTargetId, headerHeight])

  // Hide veil+hint on any scroll; show only when back at top (<= threshold)
  React.useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0
      const atTop = y <= hintTopThreshold
      setVisible(atTop)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll() // initialize on mount
    return () => window.removeEventListener("scroll", onScroll)
  }, [hintTopThreshold])

  // Styles for the bottom veil band (transparent → veilColor)
  const veilStyle: React.CSSProperties = {
    height: `${veilHeight}px`,
    backgroundImage: `linear-gradient(
      to bottom,
      rgba(255,255,255,0) 0%,
      ${veilColor} 85%,
      ${veilColor} 100%
    )`,
  }

  return (
    <section
      className="
        relative isolate
        -mt-[var(--header-h,64px)] pt-[var(--header-h,64px)]
        min-h-[calc(100dvh-var(--header-h,64px))] text-white
      "
      style={style}
      aria-label="Intro hero"
    >
      {/* Content only (no background, no overlays) */}
      <div className="relative z-10 mx-auto max-w-6xl px-4">
        <div className="flex min-h-[calc(100dvh-var(--header-h,64px))] items-center justify-start text-left">
          <div className="max-w-2xl">
            <h1 className="text-[2.25rem] lg:text-[3.5rem] font-extrabold leading-tight">
              <span className="inline-block">{title}</span>
            </h1>
            {subtitle && (
              <p className="mt-4 text-[1.125rem] lg:text-[1.25rem] text-white/90">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Full-width bottom veil that contains the SCROLL hint.
         It vanishes immediately on scroll/click and reappears at top. */}
      <div
        className={[
          "absolute inset-x-0 bottom-0 z-20 transition-opacity duration-100",
          visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
        style={veilStyle}
      >
        {/* Make the whole veil clickable as a big scroll target */}
        <button
          type="button"
          onClick={() => {
            setVisible(false) // hide instantly with the hint
            scrollToNext()
          }}
          aria-label="Scroll to the next section"
          className="
            relative flex h-full w-full items-center justify-center
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 
            cursor-pointer
          "
          // no background here: the parent veil provides the gradient
        >
          {/* Centered SCROLL label + arrow */}
          <span className="flex flex-col items-center">
            <span
              className="text-sm lg:text-base font-bold tracking-[0.5em] drop-shadow"
              style={{ color: "#637DAB" }}
            >
              SCROLL
            </span>
            <svg
              className="mt-1 h-5 w-5"
              viewBox="0 0 24 24"
              aria-hidden="true"
              style={{ color: "#DE9526" }}
            >
              <path
                d="M6 9l6 6 6-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      </div>
    </section>
  )
}
