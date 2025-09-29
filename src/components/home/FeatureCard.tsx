// src/components/home/FeatureCard.tsx
// A reusable feature card with image tile, title, description and a CTA button.
// Now includes a "reveal-on-view" entrance animation (first time visible),
// consistent with FeatureSection. Optional `revealDelayMs` supports staggered grids.

import { useEffect, useRef } from "react"
import Button from "../ui/Button"

type ButtonVariant = "primary" | "accent" | "ghost"
type Tone = "gold" | "blue" | "green" | "neutral"

export type FeatureCardProps = {
  title: string
  description: string
  to: string
  image?: string
  imageAlt?: string
  ctaLabel?: string
  ctaVariant?: ButtonVariant
  tone?: Tone                   // controls the colored tile background
  className?: string
  revealDelayMs?: number        // optional: delay to stagger multiple cards
}

function toneBg(tone: Tone = "neutral") {
  // Softer, business-friendly tints (lighter than before)
  switch (tone) {
    case "gold":
      return "from-[#FFEAD0] to-[#FFE0A8]"
    case "green":
      return "from-[#E6F8F1] to-[#CFF2E5]"
    case "blue":
      return "from-[#E3EAFF] to-[#CFE0FF]"
    default:
      return "from-[#F7F9FC] to-[#F1F4F9]"
  }
}

export default function FeatureCard({
  title,
  description,
  to,
  image,
  imageAlt,
  ctaLabel = `Use ${title}`,
  ctaVariant = "primary",
  tone = "neutral",
  className,
  revealDelayMs = 0,
}: FeatureCardProps) {
  // Ref used for reveal-on-view entrance animation
  const revealRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = revealRef.current
    if (!el || typeof window === "undefined") return

    // Respect reduced motion preference: show immediately with no animation
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) {
      el.classList.remove("opacity-0", "translate-y-2")
      el.classList.add("opacity-100", "translate-y-0")
      return
    }

    // Avoid flashing if initially above the fold (SSR hydration/fast paint)
    const initialBox = el.getBoundingClientRect()
    const viewportH = window.innerHeight || document.documentElement.clientHeight
    if (initialBox.top < viewportH * 0.9) {
      if (revealDelayMs > 0) el.style.transitionDelay = `${revealDelayMs}ms`
      el.classList.remove("opacity-0", "translate-y-2")
      el.classList.add("opacity-100", "translate-y-0")
      return
    }

    // Observe first intersection, then reveal and unobserve
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            if (revealDelayMs > 0) el.style.transitionDelay = `${revealDelayMs}ms`
            el.classList.remove("opacity-0", "translate-y-2")
            el.classList.add("opacity-100", "translate-y-0")
            io.unobserve(el)
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -12%" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [revealDelayMs])

  return (
    <article
      // Initial state matches FeatureSection: transparent + slight downward offset,
      // then transitions to fully visible and settled when observed.
      ref={revealRef}
      className={[
        "group rounded-3xl border border-border bg-white p-6 shadow-card transition",
        "opacity-0 translate-y-2 transform-gpu duration-500 will-change-transform",
        "hover:translate-y-[-2px] hover:shadow-lg focus-within:translate-y-[-2px] focus-within:shadow-lg",
        className || "",
      ].join(" ")}
    >
      {/* Colored image tile (softer gradient) */}
      <div
        className={`relative mb-6 h-28 w-40 rounded-2xl bg-gradient-to-tr ${toneBg(tone)} flex items-center justify-center shadow-sm ring-1 ring-black/5`}
        aria-hidden="true"
      >
        {image && (
          <img
            src={image}
            alt={imageAlt || ""}
            loading="lazy"
            decoding="async"
            width={96}
            height={96}
            // De-emphasize the icon: lower saturation and opacity
            className="h-12 w-12 object-contain drop-shadow-sm filter saturate-50 opacity-85"
          />
        )}
        {/* Decorative white pills */}
        <div className="pointer-events-none absolute bottom-3 left-4 flex gap-2 opacity-70">
          <span className="h-[6px] w-8 rounded-full bg-white/70" />
          <span className="h-[6px] w-5 rounded-full bg-white/60" />
          <span className="h-[6px] w-3 rounded-full bg-white/50" />
        </div>
      </div>

      {/* Copy */}
      <h3 className="text-xl font-extrabold text-ink">{title}</h3>
      <p className="mt-3 text-ink-soft leading-relaxed">{description}</p>

      {/* CTA */}
      <div className="mt-6">
        <Button variant={ctaVariant} size="md" to={to} className="shadow-sm">
          {ctaLabel}
        </Button>
      </div>
    </article>
  )
}
