// src/components/home/FeatureCard.tsx
// Responsive, self-centering feature card with reveal-on-view.
// - Single card centered with mx-auto.
// - Decorative gradient tile with responsive clamp() sizing.
// - A11y: respects prefers-reduced-motion; optional decorative image.

import { useRef } from "react"
import clsx from "clsx"
import Button from "../ui/Button"
import { useRevealOnView } from "../../hooks/userRevealOnView"

type ButtonVariant = "primary" | "accent" | "ghost"
type Tone = "gold" | "blue" | "green" | "neutral"

export type FeatureCardProps = {
  title: string
  description: string
  to: string
  image?: string
  imageAlt?: string
  imageDecorative?: boolean
  ctaLabel?: string
  ctaVariant?: ButtonVariant
  tone?: Tone
  className?: string
  revealDelayMs?: number
}

const TONE_BG = {
  gold:   "from-[#FFEAD0] to-[#FFE0A8]",
  green:  "from-[#E6F8F1] to-[#CFF2E5]",
  blue:   "from-[#E3EAFF] to-[#CFE0FF]",
  neutral:"from-[#F7F9FC] to-[#F1F4F9]",
} as const

const TONE_BORDER = {
  gold:   "border-[#FCDFA8]",
  green:  "border-[#BCE7D7]",
  blue:   "border-[#BFD1FF]",
  neutral:"border-gray-200",
} as const

export default function FeatureCard({
  title,
  description,
  to,
  image,
  imageAlt,
  imageDecorative,
  ctaLabel = `Use ${title}`,
  ctaVariant = "primary",
  tone = "neutral",
  className,
  revealDelayMs = 0,
}: FeatureCardProps) {
  const revealRef = useRef<HTMLDivElement | null>(null)
  useRevealOnView(revealRef, revealDelayMs)

  const computedAlt = imageDecorative ? "" : (imageAlt || "")

  return (
    <article
      ref={revealRef}
      className={clsx(
        // Layout & centering
        "group flex flex-col items-center text-center mx-auto",
        // Card surface
        "rounded-3xl bg-white/80 backdrop-blur-sm",
        "p-5 sm:p-6 lg:p-8 shadow-card transition",
        // Entrance state + hover focus lift (disabled when motion-reduce)
        "opacity-0 translate-y-2 transform-gpu duration-500 will-change-transform",
        "hover:translate-y-[-2px] hover:shadow-lg focus-within:translate-y-[-2px] focus-within:shadow-lg",
        "motion-reduce:transform-none motion-reduce:hover:transform-none motion-reduce:focus-within:transform-none",
        "max-w-[min(100%,42rem)]",
        // Border on small screens only
        "border lg:border-0",
        TONE_BORDER[tone],
        className
      )}
    >
      {/* Gradient tile holding the icon (decorative) */}
      <div
        className={clsx(
          "relative mb-5 sm:mb-6",
          "rounded-2xl bg-gradient-to-tr",
          TONE_BG[tone],
          "flex items-center justify-center",
          "shadow-sm ring-1 ring-black/5",
          "h-[clamp(72px,12vw,120px)] w-[clamp(128px,22vw,220px)]",
          "mx-auto"
        )}
        aria-hidden="true"
      >
        {image && (
          <img
            src={image}
            alt={computedAlt}
            width={120}
            height={120}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="h-[clamp(40px,8vw,88px)] w-[clamp(40px,8vw,88px)] object-contain drop-shadow-sm filter saturate-50 opacity-[0.85]"
          />
        )}
        {/* Decorative white pills */}
        <div className="pointer-events-none absolute bottom-3 left-4 flex gap-2 opacity-70">
          <span className="h-[6px] w-8 rounded-full bg-white/70" />
          <span className="h-[6px] w-5 rounded-full bg-white/60" />
          <span className="h-[6px] w-3 rounded-full bg-white/50" />
        </div>
      </div>

      {/* Title */}
      <h3 className="font-extrabold text-ink leading-tight [font-size:clamp(1.125rem,2.2vw,1.5rem)]">
        {title}
      </h3>

      {/* Description */}
      <p className={clsx(
        "mt-3 text-ink-soft leading-relaxed",
        "[font-size:clamp(0.95rem,1.7vw,1.0625rem)]",
        "max-w-[66ch]"
      )}>
        {description}
      </p>

      {/* CTA */}
      <div className="mt-6 sm:mt-7">
        <Button variant={ctaVariant} size="md" to={to} className="shadow-sm">
          {ctaLabel}
        </Button>
      </div>
    </article>
  )
}

