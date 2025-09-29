// src/components/home/FeatureSection.tsx
// English comments only inside code:
// FeatureSection supports two visual styles:
// 1) "panel": text on the left + large decorative panel on the right.
//    Enlarged variant supports wider container, bigger paddings/type, taller panel,
//    and a larger image via props.
// 2) "image": legacy two-column media + text.

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

  // Choose visual style; default to panel if bullets exist
  const mode: Visual = visual ?? (bullets && bullets.length > 0 ? "panel" : "image")

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
    size === "xl"    ? "h-[420px] lg:h-[500px]"
    : size === "large" ? "h-[360px] lg:h-[420px]"
    : "h-[320px] lg:h-[380px]"

  const panelHeights = panelHeightClassName || defaultPanelHeights

  const defaultImgSize =
    size === "xl"    ? "h-48 w-48 lg:h-56 lg:w-56"
    : size === "large" ? "h-36 w-36 lg:h-44 lg:w-44"
    : "h-32 w-32 lg:h-36 lg:w-36"

  // Reveal-on-view
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

  // Tooltip bubble (CSS-only)
  const tooltipClasses =
    "pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 " +
    "rounded px-2 py-1 text-xs bg-ink text-ink-invert shadow-card " +
    "opacity-0 scale-95 transition " +
    "group-hover/tt:opacity-100 group-hover/tt:scale-100 " +
    "group-focus-visible/tt:opacity-100 group-focus-visible/tt:scale-100"

  // SPA CTA
  const onCta = () => navigate(to)

  // ---------- Panel style (enlarged; white→primary gradient; no border) ----------
  if (mode === "panel") {
    return (
      <section id={id} className={className}>
        {/* Wider container and smaller side paddings to feel closer to edges */}
        <div className={`mx-auto ${containerWidth} px-3 lg:px-6 ${sectionPadding}`}>
          <div
            ref={revealRef}
            className="
              opacity-0 translate-y-2 transform-gpu transition duration-500 will-change-transform
              rounded-3xl
              bg-gradient-to-br from-white to-primary/15
              shadow-card p-6 lg:p-12
            "
          >
            <div className={`grid grid-cols-1 items-start ${gridGap} lg:grid-cols-2`}>
              {/* Left: copy */}
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

              {/* Right: visual panel (primary-tinted with subtle accent glow option) */}
              <div className="relative">
                <div className="rounded-3xl bg-gradient-to-b from-primary/10 via-primary/5 to-white p-8 lg:p-10 shadow-inner">
                  <div className={`relative mx-auto flex w-full max-w-[880px] items-center justify-center rounded-2xl bg-gradient-to-tr from-primary/25 to-primary/10 ${panelHeights}`}>
                    {/* Larger image if provided; otherwise fallback tile */}
                    {image ? (
                      <img
                        src={image}
                        alt={imageAlt || title}
                        loading="lazy"
                        decoding="async"
                        className={[
                          "relative object-contain drop-shadow-sm filter saturate-75 opacity-90",
                          imageClassName || defaultImgSize,
                        ].join(" ")}
                      />
                    ) : (
                      <div className="relative h-40 w-40 rounded-2xl bg-primary shadow-card" />
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
        <div
          ref={revealRef}
          className="
            opacity-0 translate-y-2 transform-gpu transition duration-500 will-change-transform
            grid grid-cols-1 items-center gap-10 lg:grid-cols-2
          "
        >
          {/* Media (clickable; hover scale) */}
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
                  transition-transform duration-300 ease-out
                  hover:scale-[1.03] focus:scale-[1.03]
                "
              />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent" />
            <span id={mediaTtId} role="tooltip" aria-hidden="true" className={tooltipClasses}>
              Click to visit
            </span>
          </Link>

          {/* Copy */}
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
