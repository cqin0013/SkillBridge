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

import * as React from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";

export type ButtonVariant = "primary" | "accent" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const base = [
  "inline-flex items-center justify-center",
  "rounded-full",
  "font-semibold",
  "transition",
  "focus-visible:outline-none",
  "focus-visible:ring-2",
  "cursor-pointer",
  "disabled:cursor-not-allowed",
  "disabled:opacity-60",
  "disabled:pointer-events-none",
  "min-h-[44px]",
];

const sizes: Record<ButtonSize, string[]> = {
  sm: ["h-11", "px-4", "text-sm"],     // approx. 44px tall
  md: ["h-11", "px-5", "text-sm"],     // approx. 44px tall with more padding
  lg: ["h-12", "px-6", "text-base"],   // approx. 48px tall, larger text
};

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
};

type CommonProps = {
  id?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  "aria-describedby"?: string;
  /** SR-only message announced while loading (defaults to "Loading..."). */
  loadingLabel?: string;
  /** For icon-only buttons, provide a text label for screen readers. */
  "aria-label"?: string;
};

type ButtonAsButton = CommonProps & {
  to?: undefined;
  href?: undefined;
  target?: undefined;
  rel?: undefined;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
};

type ButtonAsLink = CommonProps & {
  href: string;
  to?: undefined;
  target?: string;
  rel?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

type ButtonAsRouterLink = CommonProps & {
  to: string;
  href?: undefined;
  target?: undefined;
  rel?: undefined;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink | ButtonAsRouterLink;

function isRouterLink(props: ButtonProps): props is ButtonAsRouterLink {
  return typeof (props as ButtonAsRouterLink).to === "string";
}

function isAnchor(props: ButtonProps): props is ButtonAsLink {
  return typeof (props as ButtonAsLink).href === "string";
}

function withSafeRel(rel?: string, target?: string): string | undefined {
  if (target !== "_blank") return rel;
  const base = "noopener noreferrer";
  if (!rel) return base;
  const tokens = new Set((rel + " " + base).split(/\s+/).filter(Boolean));
  return Array.from(tokens).join(" ");
}

function isUnsafeHref(href: string): boolean {
  const value = href.trim();
  const lower = value.toLowerCase();
  if (lower.startsWith("javascript:")) return true;
  if (/^(https?:|mailto:|tel:|\/|#|\?|\.)/i.test(value)) return false;
  return true;
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
    loadingLabel = "Loading...",
  } = props;

  const routerMode = isRouterLink(props);
  const anchorMode = isAnchor(props);
  const isDisabled = Boolean(disabled || loading);

  const classes = clsx([...base, ...sizes[size], ...variants[variant], className]);

  const srLoading = loading ? (
    <span aria-live="polite" className="sr-only">
      {loadingLabel}
    </span>
  ) : null;

  if (routerMode) {
    const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
      if (isDisabled) {
        event.preventDefault();
        return;
      }
      props.onClick?.(event);
    };

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
    );
  }

  if (anchorMode) {
    const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
      if (isDisabled) {
        event.preventDefault();
        return;
      }
      const href = props.href ?? "";
      if (isUnsafeHref(href)) {
        event.preventDefault();
        return;
      }
      props.onClick?.(event);
    };

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
    );
  }

  const handleButtonClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    if (isDisabled) {
      event.preventDefault();
      return;
    }
    (props as ButtonAsButton).onClick?.(event);
  };

  return (
    <button
      id={id}
      title={title}
      type={(props as ButtonAsButton).type ?? "button"}
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
  );
}
