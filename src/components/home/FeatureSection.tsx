// src/components/home/FeatureSection.tsx
// FeatureSection supports two visual styles:
// 1) "panel": text on the left + large decorative panel on the right.
//    Image is statically larger (no hover zoom); the whole card animates on hover.
// 2) "image": legacy two-column media + text.
//    Media block is taller to make the image visually larger (no hover zoom);
//    the whole card animates on hover.
//
// Notes:
// - Entrance animation uses IntersectionObserver to reveal on first view.
// - Hover/focus animate the entire card (lift + subtle scale + shadow).
// - Image hover zoom is intentionally removed per requirements.

import { useEffect, useId, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import Button from "../ui/Button"

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
  // media (used by both styles; in "panel" it becomes the visual inside the panel)
  image?: string
  imageAlt?: string
  imageClassName?: string       // allow caller to scale the image
  // actions
  to: string
  ctaLabel?: string
  ctaVariant?: ButtonVariant
  // layout controls
  mediaSide?: "left" | "right"  // only used by "image" style
  aspect?: Aspect               // only used by "image" style
  size?: Size                   // controls paddings, type scale, panel height
  visual?: Visual               // force "panel" or "image"
  width?: Width                 // container width scale
  panelHeightClassName?: string // override panel height if needed
  className?: string
  ctaClassName?: string
}

export default function FeatureSection({
  id,
  title,
  description,
  badgeLabel,
  bullets,
  image,
  imageAlt,
  imageClassName,
  to,
  ctaLabel = "Learn more",
  ctaVariant = "primary",
  mediaSide = "right",
  aspect = "wide",
  size = "xl",                 // default larger
  visual,
  width = "wider",             // default wider container
  panelHeightClassName,
  className,
  ctaClassName,
}: Props) {
  const navigate = useNavigate()

  // Choose visual style; default to "panel" if bullets exist
  const mode: Visual = visual ?? (bullets && bullets.length > 0 ? "panel" : "image")

  // Accessibility ids for tooltips
  const mediaTtId = useId()
  const copyTtId = useId()
  const ctaTtId = useId()

  // Container width scale
  const containerWidth =
    width === "6xl" ? "max-w-6xl"
    : width === "7xl" ? "max-w-7xl"
    : width === "full" ? "max-w-none"
    : "max-w-[90rem]" // "wider" ~ 1440px

  // Vertical paddings and type scale
  const sectionPadding =
    size === "xl"    ? "py-32 lg:py-40"
    : size === "large" ? "py-28 lg:py-36"
    : "py-20 lg:py-28"

  const titleScale =
    size === "xl"    ? "text-5xl lg:text-6xl"
    : size === "large" ? "text-4xl lg:text-5xl"
    : "text-3xl lg:text-4xl"

  const descScale =
    size === "xl"    ? "text-2xl"
    : size === "large" ? "text-xl"
    : "text-lg"

  const gridGap =
    size === "xl"    ? "gap-14 lg:gap-16"
    : "gap-12"

  // Panel height and image default size
  const defaultPanelHeights =
    size === "xl"    ? "h-[460px] lg:h-[540px]" // slightly taller to make the visual larger
    : size === "large" ? "h-[400px] lg:h-[480px]"
    : "h-[340px] lg:h-[400px]"

  const panelHeights = panelHeightClassName || defaultPanelHeights

  // Statically larger image (no hover zoom); tweak per size tier
  const defaultImgSize =
    size === "xl"    ? "h-64 w-64 lg:h-72 lg:w-72"
    : size === "large" ? "h-44 w-44 lg:h-52 lg:w-52"
    : "h-36 w-36 lg:h-44 lg:w-44"

  // Reveal-on-view entrance animation
  const revealRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = revealRef.current
    if (!el || typeof window === "undefined") return
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) {
      el.classList.remove("opacity-0", "translate-y-2")
      el.classList.add("opacity-100", "translate-y-0")
      return
    }
    const initialBox = el.getBoundingClientRect()
    const viewportH = window.innerHeight || document.documentElement.clientHeight
    if (initialBox.top < viewportH * 0.9) {
      el.classList.remove("opacity-0", "translate-y-2")
      el.classList.add("opacity-100", "translate-y-0")
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
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
  }, [])

  // Tooltip bubble (CSS-only, activated on hover/focus)
  const tooltipClasses =
    "pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 " +
    "rounded px-2 py-1 text-xs bg-ink text-ink-invert shadow-card " +
    "opacity-0 scale-95 transition " +
    "group-hover/tt:opacity-100 group-hover/tt:scale-100 " +
    "group-focus-visible/tt:opacity-100 group-focus-visible/tt:scale-100"

  // SPA CTA navigation
  const onCta = () => navigate(to)

  // ---------- Panel style ----------
  if (mode === "panel") {
    return (
      <section id={id} className={className}>
        <div className={`mx-auto ${containerWidth} px-3 lg:px-6 ${sectionPadding}`}>
          {/* Card wrapper: the whole card animates on hover/focus (lift + subtle scale + shadow) */}
          <div
            ref={revealRef}
            className="
              opacity-0 translate-y-2 transform-gpu transition duration-500 will-change-transform
              rounded-3xl bg-gradient-to-br from-white to-primary/15 shadow-card p-6 lg:p-12
              hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg
              focus-within:-translate-y-1 focus-within:scale-[1.01] focus-within:shadow-lg
            "
          >
            <div className={`grid grid-cols-1 items-start ${gridGap} lg:grid-cols-2`}>
              {/* Left: copy block with optional badge, bullets, CTA */}
              <div>
                {badgeLabel && (
                  <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-bold text-white shadow-sm">
                    {badgeLabel}
                  </span>
                )}

                <h2 className={`mt-3 font-extrabold text-ink ${titleScale}`}>{title}</h2>

                <p className={`mt-5 text-ink-soft ${descScale}`}>{description}</p>

                {bullets && bullets.length > 0 && (
                  <ul className="mt-6 space-y-3">
                    {bullets.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="text-ink">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-10">
                  <Button
                    variant={ctaVariant}
                    size="lg"
                    className={["shadow-sm", ctaClassName].join(" ")}
                    onClick={onCta}
                    aria-describedby={ctaTtId}
                  >
                    {ctaLabel}
                  </Button>
                  <span id={ctaTtId} role="tooltip" aria-hidden="true" className={tooltipClasses}>
                    Click to visit
                  </span>
                </div>
              </div>

              {/* Right: visual panel with a larger static image (no hover zoom) */}
              <div className="relative">
                <div className="rounded-3xl bg-gradient-to-b from-primary/5 via-primary/5 to-transparent">
                  <div className={`relative mx-auto flex w-full max-w-[880px] items-center justify-center rounded-2xl bg-gradient-to-tr from-primary/25 to-primary/10 ${panelHeights}`}>
                    {image ? (
                      <img
                        src={image}
                        alt={imageAlt || title}
                        loading="lazy"
                        decoding="async"
                        className={[
                          // Base image styling (no hover transform)
                          "relative object-contain drop-shadow-sm filter saturate-75 opacity-90",
                          // Statically larger size tuned per "size" prop
                          imageClassName || defaultImgSize,
                        ].join(" ")}
                      />
                    ) : (
                      <div className="relative h-70 w-70 rounded-2xl bg-primary shadow-card" />
                    )}
                    {/* Decorative dots */}
                    <span aria-hidden="true" className="absolute top-6 left-6 h-6 w-6 rounded-full bg-primary/15" />
                    <span aria-hidden="true" className="absolute bottom-6 right-6 h-4 w-4 rounded-full bg-primary/15" />
                  </div>
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

  return (
    <section id={id} className={className}>
      <div className={`mx-auto max-w-6xl px-4 ${sectionPadding}`}>
        {/* Card wrapper: the whole card animates on hover/focus (lift + subtle scale + shadow) */}
        <div
          ref={revealRef}
          className="
            opacity-0 translate-y-2 transform-gpu transition duration-500 will-change-transform
            grid grid-cols-1 items-center gap-10 lg:grid-cols-2
            hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg
            focus-within:-translate-y-1 focus-within:scale-[1.01] focus-within:shadow-lg
          "
        >
          {/* Media block: taller container for a visually larger image (no hover zoom) */}
          <Link
            to={to}
            aria-label={`Open ${title}`}
            aria-describedby={mediaTtId}
            className={[
              "relative block overflow-hidden rounded-2xl border border-border shadow-card",
              "group/tt",
              aspectClass,
              mediaOrder,
              "w-full",
              // Make the media area taller to enlarge the perceived image size
              "min-h-[260px] sm:min-h-[320px] lg:min-h-[380px]",
            ].join(" ")}
          >
            {image && (
              <img
                src={image}
                alt={imageAlt || title}
                loading="lazy"
                decoding="async"
                width={1600}
                height={1000}
                sizes="(min-width:1024px) 50vw, 100vw"
                className="
                  absolute inset-0 h-full w-full object-cover
                  /* Intentionally no hover transform here */
                "
              />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent" />
            <span id={mediaTtId} role="tooltip" aria-hidden="true" className={tooltipClasses}>
              Click to visit
            </span>
          </Link>

          {/* Copy block */}
          <div>
            <Link
              to={to}
              aria-label={`Open ${title}`}
              aria-describedby={copyTtId}
              className="group/title group/tt block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <h2 className="text-3xl lg:text-4xl font-extrabold text-ink">{title}</h2>
              <p className="mt-4 text-ink-soft text-lg">{description}</p>
              <span id={copyTtId} role="tooltip" aria-hidden="true" className={["relative", tooltipClasses, "ml-2"].join(" ")}>
                Click to visit
              </span>
            </Link>

            <div className="mt-8">
              <Button
                variant={ctaVariant}
                size="lg"
                className={["shadow-sm", ctaClassName].join(" ")}
                onClick={onCta}
                aria-describedby={ctaTtId}
              >
                {ctaLabel}
              </Button>
              <span id={ctaTtId} role="tooltip" aria-hidden="true" className={tooltipClasses}>
                Click to visit
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
