// src/components/ui/Button.tsx
// Reusable Button with a11y refinements:
// - Link/anchor: when "disabled", remove from tab order and mark aria-disabled
// - Loading announcements via aria-live
// - Touch target meets 44px minimum where possible
// - target="_blank" gets a safe rel fallback

import * as React from "react"
import { Link } from "react-router-dom"
import clsx from "clsx"

export type ButtonVariant = "primary" | "accent" | "ghost"
type ButtonSize = "sm" | "md" | "lg"

const base =
  // Ensure min tap target; combine with explicit heights below
  "inline-flex items-center justify-center rounded-full font-semibold transition " +
  "focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60 disabled:pointer-events-none " +
  "min-h-[44px]" // WCAG suggested minimum touch target

const sizes: Record<ButtonSize, string> = {
  // Keep explicit heights, but min-h guards small cases
  sm: "h-11 px-4 text-sm", // 44px
  md: "h-11 px-5 text-sm", // 44px
  lg: "h-12 px-6 text-base", // 48px
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white border border-primary hover:bg-primary/90 " +
    "focus-visible:ring-primary/40",
  accent:
    "bg-accent text-black hover:bg-accent/90 shadow-card " +
    "focus-visible:ring-accent/40",
  ghost:
    "bg-transparent text-ink hover:bg-black/10 " +
    "focus-visible:ring-black/20",
}

type CommonProps = {
  id?: string
  title?: string
  children: React.ReactNode
  className?: string
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  onClick?: React.MouseEventHandler<HTMLElement>
  // a11y
  "aria-describedby"?: string
}

type ButtonAsButton = CommonProps & {
  to?: undefined
  href?: undefined
  target?: undefined
  rel?: undefined
}

type ButtonAsLink = CommonProps & {
  href: string
  to?: undefined
  target?: string
  rel?: string
}

type ButtonAsRouterLink = CommonProps & {
  to: string
  href?: undefined
  target?: undefined
  rel?: undefined
}

export type ButtonProps = ButtonAsButton | ButtonAsLink | ButtonAsRouterLink

function isRouterLink(p: ButtonProps): p is ButtonAsRouterLink {
  return typeof (p as ButtonAsRouterLink).to === "string"
}
function isAnchor(p: ButtonProps): p is ButtonAsLink {
  return typeof (p as ButtonAsLink).href === "string"
}

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
    onClick,
  } = props

  const isDisabled = !!disabled || !!loading
  const classes = clsx(base, sizes[size], variants[variant], className)

  // Helper: safe rel when opening new tab
  const withSafeRel = (rel?: string, target?: string) =>
    target === "_blank" ? rel ? rel : "noopener noreferrer" : rel

  // Shared "loading" announcer (screen-reader friendly)
  // Note: We keep it inside the control so SRs read the change quickly.
  const srLoading = loading ? (
    <span aria-live="polite" className="sr-only">
      Loading…
    </span>
  ) : null

  // Render: React Router <Link>
  if (isRouterLink(props)) {
    const { to } = props
    const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
      if (isDisabled) { e.preventDefault(); return }
      onClick?.(e)
    }
    return (
      <Link
        id={id}
        title={title}
        to={to}
        className={classes}
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        // Remove from tab order when disabled to avoid focus trap/confusion
        tabIndex={isDisabled ? -1 : undefined}
        onClick={handleClick}
      >
        {children}
        {srLoading}
      </Link>
    )
  }

  // Render: <a href="...">
  if (isAnchor(props)) {
    const { href, target, rel } = props
    const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
      if (isDisabled) { e.preventDefault(); return }
      onClick?.(e)
    }
    return (
      <a
        id={id}
        title={title}
        href={href}
        target={target}
        rel={withSafeRel(rel, target)}
        className={classes}
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        tabIndex={isDisabled ? -1 : undefined}
        onClick={handleClick}
      >
        {children}
        {srLoading}
      </a>
    )
  }

  // Render: <button>
  const handleButtonClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    if (isDisabled) { e.preventDefault(); return }
    onClick?.(e)
  }

  return (
    <button
      id={id}
      title={title}
      type="button"
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      onClick={handleButtonClick}
    >
      {children}
      {srLoading}
    </button>
  )
}
