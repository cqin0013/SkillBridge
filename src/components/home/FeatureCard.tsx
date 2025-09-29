// src/components/home/FeatureCard.tsx
// A reusable feature card with image tile, title, description and a CTA button.
// Visual tweaks: softer gradient tile and a de-emphasized icon (lower saturation/opacity).

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
}: FeatureCardProps) {
  return (
    <article
      className={[
        "group rounded-3xl border border-border bg-white p-6 shadow-card transition",
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
