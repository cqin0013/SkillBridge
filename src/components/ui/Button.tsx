// src/components/ui/Button.tsx
/**
 * Reusable Button (simple version without React.memo and forwardRef).
 *
 * - Render modes: native <button>, <a> anchor, React Router <Link>.
 * - Variants: primary | accent | ghost. Sizes: sm | md | lg.
 * - A11y: SR-only loading text (aria-live), aria-disabled/aria-busy,
 *         removes tabbability for <a>/<Link> when disabled,
 *         minimum 44px touch target (WCAG).
 * - Safety: blocks "javascript:" href; adds "noopener noreferrer" for target="_blank".
 *
 * Notes:
 * - Exposes `type?: "button" | "submit" | "reset"` for native <button> usage in forms.
 * - Exposes `"aria-label"?: string` for icon-only buttons.
 * - No `any`. Event handler types are strict per render mode.
 */

import * as React from "react"
import { Link } from "react-router-dom"
import clsx from "clsx"

// Visual variants the component supports
export type ButtonVariant = "primary" | "accent" | "ghost"

// Supported size tokens
type ButtonSize = "sm" | "md" | "lg"

// Base classes shared by all modes (array + clsx friendly)
const base = [
  "inline-flex items-center justify-center", // Flexbox centering
  "rounded-full",                            // Rounded shape
  "font-semibold",                           // Semibold text
  "transition",                              // Smooth transitions
  "focus-visible:outline-none",              // Focus-visible only
  "focus-visible:ring-2",                    // Focus ring for keyboard users
  "disabled:opacity-60",                     // Disabled visual feedback
  "disabled:pointer-events-none",            // Disable pointer events
  "min-h-[44px]",                            // Minimum touch target (WCAG)
]

// Size-specific classes
const sizes: Record<ButtonSize, string[]> = {
  sm: ["h-11", "px-4", "text-sm"],     // ≈44px tall
  md: ["h-11", "px-5", "text-sm"],     // ≈44px tall with more padding
  lg: ["h-12", "px-6", "text-base"],   // ≈48px tall, larger text
}

// Variant-specific classes
const variants: Record<ButtonVariant, string[]> = {
  primary: [
    "bg-primary text-white border border-primary",
    "hover:bg-primary/90",
    "focus-visible:ring-primary/40",
  ],
  accent: [
    "bg-accent text-black shadow-card",
    "hover:bg-accent/90",
    "focus-visible:ring-accent/40",
  ],
  ghost: [
    "bg-transparent text-ink",
    "hover:bg-black/10",
    "focus-visible:ring-black/20",
  ],
}

// Shared props across all modes
type CommonProps = {
  id?: string
  title?: string
  children: React.ReactNode
  className?: string
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  "aria-describedby"?: string
  /** SR-only message announced while loading (defaults to "Loading…"). */
  loadingLabel?: string
  /** For icon-only buttons, provide a text label for screen readers. */
  "aria-label"?: string
}

// Mode: native <button>
type ButtonAsButton = CommonProps & {
  to?: undefined
  href?: undefined
  target?: undefined
  rel?: undefined
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  /** Allow usage inside forms */
  type?: "button" | "submit" | "reset"
}

// Mode: <a> anchor
type ButtonAsLink = CommonProps & {
  href: string
  to?: undefined
  target?: string
  rel?: string
  onClick?: React.MouseEventHandler<HTMLAnchorElement>
}

// Mode: React Router <Link> (renders as <a>)
type ButtonAsRouterLink = CommonProps & {
  to: string
  href?: undefined
  target?: undefined
  rel?: undefined
  onClick?: React.MouseEventHandler<HTMLAnchorElement>
}

// Union of all supported modes
export type ButtonProps = ButtonAsButton | ButtonAsLink | ButtonAsRouterLink

// Type guards to narrow union props at runtime + compile-time
function isRouterLink(p: ButtonProps): p is ButtonAsRouterLink {
  return typeof (p as ButtonAsRouterLink).to === "string"
}
function isAnchor(p: ButtonProps): p is ButtonAsLink {
  return typeof (p as ButtonAsLink).href === "string"
}

// Local helper: ensure safe rel when opening new tabs
function withSafeRel(rel?: string, target?: string): string | undefined {
  if (target !== "_blank") return rel
  const base = "noopener noreferrer"
  if (!rel) return base
  // Ensure required tokens are present; keep user's ones (e.g., nofollow)
  const tokens = new Set((rel + " " + base).split(/\s+/).filter(Boolean))
  return Array.from(tokens).join(" ")
}

// Local helper: allow safe protocols and site-relative URLs; block javascript:
function isUnsafeHref(href: string): boolean {
  const value = href.trim()
  const low = value.toLowerCase()
  if (low.startsWith("javascript:")) return true
  // Allow http/https/mailto/tel, and site-relative paths/hash/query
  if (/^(https?:|mailto:|tel:|\/|#|\?|\.)/i.test(value)) return false
  return false
}

// Main component (no memo, no forwardRef)
export default function Button(props: ButtonProps) {
  const {
    id,
    title,
    children,
    variant = "primary",
    size = "md",
    className,
    loading,
    disabled,
    loadingLabel = "Loading…",
  } = props

  // Determine render mode
  const routerMode = isRouterLink(props)
  const anchorMode = isAnchor(props)

  // Disabled while either disabled or loading to prevent double activation
  const isDisabled = Boolean(disabled || loading)

  // Compose final className from base + size + variant + custom
  const classes = clsx([...base, ...sizes[size], ...variants[variant], className])

  // SR-only live region used when loading
  const srLoading = loading ? (
    <span aria-live="polite" className="sr-only">
      {loadingLabel}
    </span>
  ) : null

  // ===== Router <Link> mode =====
  if (routerMode) {
    const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
      if (isDisabled) { e.preventDefault(); return }
      props.onClick?.(e)
    }

    return (
      <Link
        id={id}
        title={title}
        to={props.to}
        className={classes}
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        aria-label={props["aria-label"]}
        tabIndex={isDisabled ? -1 : undefined}
        onClick={handleClick}
      >
        {children}
        {srLoading}
      </Link>
    )
  }

  // ===== Anchor <a> mode =====
  if (anchorMode) {
    const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
      if (isDisabled) { e.preventDefault(); return }
      const href = props.href ?? ""
      if (isUnsafeHref(href)) { e.preventDefault(); return }
      props.onClick?.(e)
    }

    return (
      <a
        id={id}
        title={title}
        href={props.href}
        target={props.target}
        rel={withSafeRel(props.rel, props.target)}
        className={classes}
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        aria-label={props["aria-label"]}
        tabIndex={isDisabled ? -1 : undefined}
        onClick={handleClick}
      >
        {children}
        {srLoading}
      </a>
    )
  }

  // ===== Native <button> mode =====
  const handleButtonClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    if (isDisabled) { e.preventDefault(); return }
    ;(props as ButtonAsButton).onClick?.(e)
  }

  return (
    <button
      id={id}
      title={title}
      type={(props as ButtonAsButton).type ?? "button"} // expose type for forms
      className={classes}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      aria-label={props["aria-label"]}
      onClick={handleButtonClick}
    >
      {children}
      {srLoading}
    </button>
  )
}
