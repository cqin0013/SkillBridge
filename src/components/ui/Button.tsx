// src/components/ui/Button.tsx
// Reusable Button that supports three render modes:
// 1) <button> (default)
// 2) <a href="...">  (external or hard link)
// 3) <Link to="..."> (React Router SPA link)
// It keeps a11y traits (focus ring, aria-busy) and exposes variant/size APIs.

import * as React from "react"
import { Link } from "react-router-dom"
import clsx from "clsx"

// ----- Variants & Sizes -----
export type ButtonVariant = "primary" | "accent" | "ghost"
type ButtonSize = "sm" | "md" | "lg"

const base =
  "inline-flex items-center justify-center rounded-full font-semibold transition " +
  "focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60 disabled:pointer-events-none"

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-10 px-5 text-sm",
  lg: "h-11 px-6 text-base",
}

const variants: Record<ButtonVariant, string> = {
  // primary: cold-blue outline/fill per your design tokens
  primary:
    "bg-primary text-white border border-primary hover:bg-primary/5 " +
    "focus-visible:ring-primary/40",
  // accent: warm-gold solid CTA with black text for strong contrast
  accent:
    "bg-accent text-black hover:brightness-105 shadow-card " +
    "focus-visible:ring-accent/40",
  // ghost: text-only, subtle
  ghost:
    "bg-transparent text-ink hover:bg-black/5 " +
    "focus-visible:ring-black/20",
}

// ----- Common props shared by all render modes -----
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

// ----- Three union shapes -----
// <button>
type ButtonAsButton = CommonProps & {
  to?: undefined
  href?: undefined
  target?: undefined
  rel?: undefined
}

// <a href>
type ButtonAsLink = CommonProps & {
  href: string
  to?: undefined
  target?: string
  rel?: string
}

// <Link to>
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

  // Compose classes once
  const classes = clsx(base, sizes[size], variants[variant], className)

  // Render: React Router <Link>
  if (isRouterLink(props)) {
    const { to } = props
    const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
      if (isDisabled) {
        e.preventDefault()
        return
      }
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
        onClick={handleClick}
      >
        {children}
      </Link>
    )
  }

  // Render: <a href="...">
  if (isAnchor(props)) {
    const { href, target, rel } = props
    const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
      if (isDisabled) {
        e.preventDefault()
        return
      }
      onClick?.(e)
    }
    return (
      <a
        id={id}
        title={title}
        href={href}
        target={target}
        rel={rel}
        className={classes}
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        onClick={handleClick}
      >
        {children}
      </a>
    )
  }

  // Render: <button>
  const handleButtonClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    if (isDisabled) {
      e.preventDefault()
      return
    }
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
    </button>
  )
}
