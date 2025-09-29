// src/components/home/FeatureCard.tsx
// Responsive, self-centering feature card
// ---------------------------------------------------
// Features:
// - Single card always horizontally centered with mx-auto
// - Internal layout: flex/col + center alignment ensures image and title are centered
// - Image tile and icon scale fluidly using clamp() for responsive design
// - Card paddings, font sizes, and layout adapt across screen breakpoints
// - Reveal-on-view entrance animation with optional staggered delay
// - Border: visible only on screens <1024px (lg breakpoint), color matches tone
// - Accessible: respects prefers-reduced-motion, aria-hidden for decorative blocks

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
  tone?: Tone
  className?: string
  revealDelayMs?: number
}

// Utility: map tone to gradient background classes
function toneBg(tone: Tone = "neutral") {
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

// Utility: map tone to matching light border color
function toneBorder(tone: Tone = "neutral") {
  switch (tone) {
    case "gold":
      return "border-[#FCDFA8]"
    case "green":
      return "border-[#BCE7D7]"
    case "blue":
      return "border-[#BFD1FF]"
    default:
      return "border-gray-200"
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
  // Ref for reveal-on-view animation
  const revealRef = useRef<HTMLDivElement | null>(null)

  // Set up reveal-on-view effect using IntersectionObserver
  useEffect(() => {
    const el = revealRef.current
    if (!el || typeof window === "undefined") return

    // Accessibility: if user prefers reduced motion, show immediately
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) {
      el.classList.remove("opacity-0", "translate-y-2")
      el.classList.add("opacity-100", "translate-y-0")
      return
    }

    // If already in viewport at first render, reveal immediately
    const initialBox = el.getBoundingClientRect()
    const viewportH = window.innerHeight || document.documentElement.clientHeight
    if (initialBox.top < viewportH * 0.9) {
      if (revealDelayMs > 0) el.style.transitionDelay = `${revealDelayMs}ms`
      el.classList.remove("opacity-0", "translate-y-2")
      el.classList.add("opacity-100", "translate-y-0")
      return
    }

    // Otherwise: observe until card enters viewport
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
      ref={revealRef}
      className={[
        // Layout: single card row will center itself using mx-auto
        "group flex flex-col items-center text-center mx-auto",
        // Styling: rounded corners, white semi-transparent background
        "rounded-3xl bg-white/80 backdrop-blur-sm",
        // Responsive paddings
        "p-5 sm:p-6 lg:p-8 shadow-card transition",
        // Initial state: hidden (opacity 0, slight offset)
        "opacity-0 translate-y-2 transform-gpu duration-500 will-change-transform",
        // Hover/focus states: slight lift and stronger shadow
        "hover:translate-y-[-2px] hover:shadow-lg focus-within:translate-y-[-2px] focus-within:shadow-lg",
        // Constrain max width for good readability
        "max-w-[min(100%,42rem)]",
        // Border: show on small/medium (<1024px), remove on lg+
        `border lg:border-0 ${toneBorder(tone)}`,
        className || "",
      ].join(" ")}
    >
      {/* Colored gradient tile that holds the icon */}
      <div
        className={[
          "relative mb-5 sm:mb-6",
          "rounded-2xl bg-gradient-to-tr",
          toneBg(tone),
          "flex items-center justify-center",
          "shadow-sm ring-1 ring-black/5",
          // Responsive tile sizing using clamp (min, preferred, max)
          "h-[clamp(72px,12vw,120px)] w-[clamp(128px,22vw,220px)]",
          "mx-auto",
        ].join(" ")}
        aria-hidden="true"
      >
        {image && (
          <img
            src={image}
            alt={imageAlt || ""}
            width={120}
            height={120}
            loading="lazy"
            decoding="async"
            // Responsive icon sizing using clamp
            className="h-[clamp(40px,8vw,88px)] w-[clamp(40px,8vw,88px)] object-contain drop-shadow-sm filter saturate-50 opacity-[0.85]"
          />
        )}
        {/* Decorative white pills (purely visual) */}
        <div className="pointer-events-none absolute bottom-3 left-4 flex gap-2 opacity-70">
          <span className="h-[6px] w-8 rounded-full bg-white/70" />
          <span className="h-[6px] w-5 rounded-full bg-white/60" />
          <span className="h-[6px] w-3 rounded-full bg-white/50" />
        </div>
      </div>

      {/* Title (responsive font size, always centered) */}
      <h3 className="font-extrabold text-ink leading-tight [font-size:clamp(1.125rem,2.2vw,1.5rem)]">
        {title}
      </h3>

      {/* Description text (fluid size, readable line-length) */}
      <p
        className={[
          "mt-3 text-ink-soft leading-relaxed",
          "[font-size:clamp(0.95rem,1.7vw,1.0625rem)]",
          "max-w-[66ch]",
        ].join(" ")}
      >
        {description}
      </p>

      {/* Call-to-action button */}
      <div className="mt-6 sm:mt-7">
        <Button variant={ctaVariant} size="md" to={to} className="shadow-sm">
          {ctaLabel}
        </Button>
      </div>
    </article>
  )
}
