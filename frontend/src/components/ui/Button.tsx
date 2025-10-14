/**
 * Reusable Button with instant disabled tooltip.
 * Tooltip supports auto-wrapping for long text.
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
  sm: ["h-11", "px-4", "text-sm"],
  md: ["h-11", "px-5", "text-sm"],
  lg: ["h-12", "px-6", "text-base"],
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
  loadingLabel?: string;      // SR-only loading text
  "aria-label"?: string;      // for icon-only
  /** Tooltip text shown instantly when disabled or loading */
  tooltipWhenDisabled?: string;
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

function isRouterLink(p: ButtonProps): p is ButtonAsRouterLink {
  return typeof (p as ButtonAsRouterLink).to === "string";
}
function isAnchor(p: ButtonProps): p is ButtonAsLink {
  return typeof (p as ButtonAsLink).href === "string";
}
function withSafeRel(rel?: string, target?: string): string | undefined {
  if (target !== "_blank") return rel;
  const baseRel = "noopener noreferrer";
  if (!rel) return baseRel;
  const tokens = new Set((rel + " " + baseRel).split(/\s+/).filter(Boolean));
  return Array.from(tokens).join(" ");
}
function isUnsafeHref(href: string): boolean {
  const v = href.trim().toLowerCase();
  if (v.startsWith("javascript:")) return true;
  return !/^(https?:|mailto:|tel:|\/|#|\?|\.)/i.test(href);
}

export default function Button(props: ButtonProps): React.ReactElement {
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
    tooltipWhenDisabled,
  } = props;

  const routerMode = isRouterLink(props);
  const anchorMode = isAnchor(props);
  const isDisabled = Boolean(disabled || loading);
  const showTooltip = Boolean(isDisabled && tooltipWhenDisabled);

  const classes = clsx([...base, ...sizes[size], ...variants[variant], className]);

  const srLoading = loading ? (
    <span aria-live="polite" className="sr-only">
      {loadingLabel}
    </span>
  ) : null;

  let core: React.ReactElement;

  if (routerMode) {
    const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
      if (isDisabled) {
        e.preventDefault();
        return;
      }
      props.onClick?.(e);
    };
    core = (
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
  } else if (anchorMode) {
    const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
      if (isDisabled) {
        e.preventDefault();
        return;
      }
      const href = props.href ?? "";
      if (isUnsafeHref(href)) {
        e.preventDefault();
        return;
      }
      props.onClick?.(e);
    };
    core = (
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
  } else {
    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
      if (isDisabled) {
        e.preventDefault();
        return;
      }
      (props as ButtonAsButton).onClick?.(e);
    };
    core = (
      <button
        id={id}
        title={title}
        type={(props as ButtonAsButton).type ?? "button"}
        className={classes}
        disabled={isDisabled}
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        aria-label={props["aria-label"]}
        onClick={handleClick}
      >
        {children}
        {srLoading}
      </button>
    );
  }

  if (!showTooltip) return core;

  const tooltipId = id ? `${id}-disabled-tip` : undefined;

  return (
    <span
      className={clsx("relative inline-block group", isDisabled && "cursor-not-allowed")}
      aria-describedby={tooltipId}
    >
      {core}
      <span
        id={tooltipId}
        role="tooltip"
        className={clsx(
          "pointer-events-none absolute left-1/2 top-[calc(100%+4px)] -translate-x-1/2",
          "z-[2147483647]",
          "rounded bg-black/85 px-2 py-1 text-xs text-white shadow",
          "max-w-xs text-left leading-tight",
          // show instantly on hover
          "opacity-0 group-hover:opacity-100 transition-opacity duration-0"
        )}
      >
        {tooltipWhenDisabled}
      </span>
    </span>
  );
}