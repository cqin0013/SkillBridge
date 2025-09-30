// src/components/home/FeatureSection.tsx
// FeatureSection supports two visual styles: "panel" and "image".
// - Small screens: image first in DOM (better reading order).
// - Large screens: both blocks are pinned to the same grid row (row-start-1),
//   with text in col 1 and image in col 2.
// - Entrance animation via useRevealOnView hook.
// - Tooltips are decorative (aria-hidden), using global .tt-group/.tt-bubble.

import { useId, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import clsx from "clsx"
import Button from "../ui/Button"
import { useRevealOnView } from "../../hooks/userRevealOnView" // <-- fixed name

type Aspect = "square" | "wide"
type ButtonVariant = "primary" | "accent" | "ghost"
type Size = "normal" | "large" | "xl"
type Visual = "panel" | "image"
type Width = "6xl" | "7xl" | "wider" | "full"

type Props = {
  id?: string
  // core copy
  title: string
  description: string
  // extras for the panel style
  badgeLabel?: string
  bullets?: string[]
  // media (used by both styles)
  image?: string
  imageAlt?: string
  imageDecorative?: boolean  // if true, alt is forced to empty
  imageClassName?: string    // allow caller to scale the image
  // actions
  to: string
  ctaLabel?: string
  ctaVariant?: ButtonVariant
  // layout controls
  mediaSide?: "left" | "right"  // only used by "image" style
  aspect?: Aspect               // only used by "image" style
  size?: Size                   // paddings, type scale, panel height
  visual?: Visual               // force "panel" or "image"
  width?: Width                 // container width scale
  panelHeightClassName?: string // override panel height if needed
  className?: string
  ctaClassName?: string
}

const CONTAINER_WIDTH: Record<Width, string> = {
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  "wider": "max-w-[90rem]",  // ~1440px
  "full": "max-w-none",
}

const SECTION_PADDING: Record<Size, string> = {
  xl: "py-32 lg:py-40",
  large: "py-28 lg:py-36",
  normal: "py-20 lg:py-28",
}

const TITLE_SCALE: Record<Size, string> = {
  xl: "text-5xl lg:text-6xl",
  large: "text-4xl lg:text-5xl",
  normal: "text-3xl lg:text-4xl",
}

const DESC_SCALE: Record<Size, string> = {
  xl: "text-2xl",
  large: "text-xl",
  normal: "text-lg",
}

const GRID_GAP: Record<Size, string> = {
  xl: "gap-14 lg:gap-16",
  large: "gap-12",
  normal: "gap-12",
}

const PANEL_HEIGHTS: Record<Size, string> = {
  xl: "h-[520px] lg:h-[580px]",
  large: "h-[460px] lg:h-[520px]",
  normal: "h-[380px] lg:h-[440px]",
}

const IMG_BOX: Record<Size, string> = {
  xl: "h-[420px] w-[420px] lg:h-[440px] lg:w-[440px]",
  large: "h-[380px] w-[380px] lg:h-[400px] lg:w-[400px]",
  normal: "h-[300px] w-[300px] lg:h-[340px] lg:w-[340px]",
}

const PANEL_MAX_W: Record<Size, string> = {
  xl: "max-w-[880px]",
  large: "max-w-[820px]",
  normal: "max-w-[760px]",
}

export default function FeatureSection({
  id,
  title,
  description,
  badgeLabel,
  bullets,
  image,
  imageAlt,
  imageDecorative,
  imageClassName,
  to,
  ctaLabel = "Learn more",
  ctaVariant = "primary",
  mediaSide = "right",
  aspect = "wide",
  size = "xl",
  visual,
  width = "wider",
  panelHeightClassName,
  className,
  ctaClassName,
}: Props) {
  const navigate = useNavigate()
  const mode: Visual = visual ?? (bullets && bullets.length > 0 ? "panel" : "image")

  // Tooltip ids (for aria-describedby on triggers if needed)
  const mediaTtId = useId()
  const copyTtId = useId()
  const ctaTtId = useId()

  // Reveal animation (intersection observer)
  const revealRef = useRef<HTMLDivElement | null>(null)
  useRevealOnView(revealRef)

  // SPA CTA navigation
  const onCta = () => navigate(to)

  // ---------- Panel style ----------
  if (mode === "panel") {
    // alt text fallback; or empty if decorative
    const computedAlt = imageDecorative ? "" : (imageAlt || title)

    return (
      <section id={id} className={className}>
        <div className={clsx("mx-auto", CONTAINER_WIDTH[width], "px-3 lg:px-6", SECTION_PADDING[size])}>
          {/* Card wrapper: entrance + hover/focus lift (disabled in motion-reduce) */}
          <div
            ref={revealRef}
            className={clsx(
              "opacity-0 translate-y-2 transform-gpu duration-500 will-change-transform",
              "rounded-3xl bg-gradient-to-br from-white to-primary/15 p-6 lg:p-12 shadow-card",
              "hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg",
              "focus-within:-translate-y-1 focus-within:scale-[1.01] focus-within:shadow-lg",
              "motion-reduce:transform-none motion-reduce:hover:transform-none motion-reduce:focus-within:transform-none"
            )}
          >
            {/* Large screens: 2 columns; pin both items to row 1 */}
            <div className={clsx("grid grid-cols-1 items-center lg:grid-cols-2", GRID_GAP[size])}>
              {/* IMAGE first in DOM (small screens first);
                 on large screens: col 2, row 1 to stay on the same horizontal line */}
              <div className="relative lg:col-start-2 lg:row-start-1">
                <div className="rounded-3xl bg-gradient-to-b from-primary/5 via-primary/5 to-transparent">
                  <div
                    className={clsx(
                      "relative mx-auto flex w-full items-center justify-center rounded-2xl",
                      "bg-gradient-to-tr from-primary/25 to-primary/10",
                      panelHeightClassName || PANEL_HEIGHTS[size],
                      PANEL_MAX_W[size]
                    )}
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={computedAlt}
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        width={840}
                        height={420}
                        sizes="(min-width:1024px) 50vw, 100vw"
                        className={clsx(
                          "relative object-contain drop-shadow-lg filter saturate-75 opacity-90",
                          imageClassName || IMG_BOX[size]
                        )}
                      />
                    ) : (
                      <div className="relative h-96 w-96 rounded-2xl bg-primary shadow-card" />
                    )}
                    {/* Decorative dots */}
                    <span aria-hidden="true" className="absolute top-6 left-6 h-6 w-6 rounded-full bg-primary/15" />
                    <span aria-hidden="true" className="absolute bottom-6 right-6 h-4 w-4 rounded-full bg-primary/15" />
                  </div>
                </div>
                {/* Tooltip (decorative): no role, keep aria-hidden */}
                <span id={mediaTtId} aria-hidden="true" className="tt-bubble">
                  Click to visit
                </span>
              </div>

              {/* TEXT second in DOM;
                 on large screens: col 1, row 1 to align horizontally with image */}
              <div className="lg:col-start-1 lg:row-start-1">
                {badgeLabel && (
                  <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-bold text-white shadow-sm">
                    {badgeLabel}
                  </span>
                )}

                <h2 className={clsx("mt-3 font-extrabold text-ink", TITLE_SCALE[size])}>{title}</h2>

                <p className={clsx("mt-5 text-ink-soft", DESC_SCALE[size])}>{description}</p>

                {bullets && bullets.length > 0 && (
                  <ul className="mt-6 space-y-3">
                    {bullets.map((item, i) => (
                      <li key={`${item}-${i}`} className="flex items-start gap-3">
                        <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="text-ink">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className={clsx("mt-10", "tt-group inline-block")} aria-describedby={ctaTtId}>
                  <Button
                    variant={ctaVariant}
                    size="lg"
                    className={clsx("shadow-sm", ctaClassName)}
                    onClick={onCta}
                  >
                    {ctaLabel}
                  </Button>
                  <span id={ctaTtId} aria-hidden="true" className="tt-bubble">
                    Click to visit
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // ---------- Legacy "image" style ----------
  const aspectClass = aspect === "square" ? "aspect-square" : "aspect-[16/10]"
  const mediaOrder = mediaSide === "left" ? "lg:order-first" : "lg:order-last"
  const computedAlt = imageDecorative ? "" : (imageAlt || title)

  return (
    <section id={id} className={className}>
      <div className={clsx("mx-auto max-w-6xl px-4", SECTION_PADDING[size])}>
        <div
          ref={revealRef}
          className={clsx(
            "opacity-0 translate-y-2 transform-gpu duration-500 will-change-transform",
            "grid grid-cols-1 items-center gap-10 lg:grid-cols-2",
            "hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg",
            "focus-within:-translate-y-1 focus-within:scale-[1.01] focus-within:shadow-lg",
            "motion-reduce:transform-none motion-reduce:hover:transform-none motion-reduce:focus-within:transform-none"
          )}
        >
          {/* MEDIA first in DOM; order controls large-screen side, still same row */}
          <Link
            to={to}
            aria-label={`Open ${title}`}
            aria-describedby={mediaTtId}
            className={clsx(
              "relative block overflow-hidden rounded-2xl border border-border shadow-card",
              aspectClass,
              mediaOrder,
              "w-full",
              "min-h-[220px] sm:min-h-[280px] lg:min-h-[340px]",
              "tt-group"
            )}
          >
            {image && (
              <img
                src={image}
                alt={computedAlt}
                loading="lazy"
                decoding="async"
                width={1600}
                height={1000}
                sizes="(min-width:1024px) 50vw, 100vw"
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent" />
            <span id={mediaTtId} aria-hidden="true" className="tt-bubble">
              Click to visit
            </span>
          </Link>

          {/* COPY block */}
          <div>
            <Link
              to={to}
              aria-label={`Open ${title}`}
              aria-describedby={copyTtId}
              className="group/title tt-group block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <h2 className="text-3xl lg:text-4xl font-extrabold text-ink">{title}</h2>
              <p className="mt-4 text-ink-soft text-lg">{description}</p>
              <span id={copyTtId} aria-hidden="true" className="tt-bubble ml-2 relative">
                Click to visit
              </span>
            </Link>

            <div className="mt-8 tt-group inline-block" aria-describedby={ctaTtId}>
              <Button
                variant={ctaVariant}
                size="lg"
                className={clsx("shadow-sm", ctaClassName)}
                onClick={onCta}
              >
                {ctaLabel}
              </Button>
              <span id={ctaTtId} aria-hidden="true" className="tt-bubble">
                Click to visit
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
