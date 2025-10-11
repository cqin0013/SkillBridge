// src/components/ui/HelpToggleSmall.tsx
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { HelpCircle } from "lucide-react";

type Placement = "top" | "bottom" | "left" | "right";
type OpenOn = "hover" | "click" | "both";

type Props = {
  /** Text or rich content inside the tooltip */
  text: ReactNode;
  /** Where the tooltip should appear relative to the trigger */
  placement?: Placement;
  /** Optional custom trigger; defaults to a small help icon */
  trigger?: ReactNode;
  /** Control how the tooltip opens */
  openOn?: OpenOn;
  /** Optional extra class for the root wrapper */
  className?: string;
  /** Optional delay in ms before showing on hover */
  hoverDelay?: number;
};

export default function HelpToggleSmall({
  text,
  placement = "top",
  trigger,
  openOn = "hover",
  className,
  hoverDelay = 80,
}: Props) {
  // Track open state
  const [open, setOpen] = useState<boolean>(false);
  // For small hover-intent delay
  const hoverTimerRef = useRef<number | null>(null);
  // Refs for outside-click and focus management
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const id = useId();

  /** Cleanup any pending timers to avoid leaks */
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    };
  }, []);

  /** Close on outside click */
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent): void => {
      const target = e.target as Node;
      if (!rootRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  /** Close on Escape for accessibility */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        setOpen(false);
        // Return focus to the trigger for keyboard users
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  /** Show with a small delay to prevent flicker */
  const scheduleOpen = (): void => {
    if (open) return;
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => setOpen(true), hoverDelay);
  };

  /** Immediate close on leave */
  const closeNow = (): void => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    setOpen(false);
  };

  /** Click toggle when enabled */
  const onClickToggle = (): void => {
    if (openOn === "click" || openOn === "both") setOpen((v) => !v);
  };

  const onMouseEnter = (): void => {
    if (openOn === "hover" || openOn === "both") scheduleOpen();
  };

  const onMouseLeave = (): void => {
    if (openOn === "hover" || openOn === "both") closeNow();
  };

  /** Keyboard: open on focus, close on blur */
  const onFocus = (): void => {
    if (openOn === "hover" || openOn === "both") setOpen(true);
  };
  const onBlur = (e: React.FocusEvent): void => {
    // Close if focus moves outside the root wrapper
    if (!rootRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
  };

  // Compute placement classes for the tooltip box and its arrow
  const placementBox = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }[placement];

  const placementArrow = {
    top: "top-full left-1/2 -translate-x-1/2",
    bottom: "bottom-full left-1/2 -translate-x-1/2",
    left: "left-full top-1/2 -translate-y-1/2",
    right: "right-full top-1/2 -translate-y-1/2",
  }[placement];

  return (
    <span
      ref={rootRef}
      className={clsx("relative inline-flex", className)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onBlur={onBlur}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={onClickToggle}
        onFocus={onFocus}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-sm
                   hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/40"
        title="Help"
      >
        {trigger ?? <HelpCircle size={14} />}
      </button>

      {open && (
        <div
          ref={tooltipRef}
          id={id}
          role="tooltip"
          className={clsx(
            "absolute z-[100] max-w-xs rounded-md border border-gray-200 bg-white px-3 py-2 text-xs leading-relaxed text-ink shadow-lg",
            "animate-in fade-in-0 zoom-in-95",
            placementBox
          )}
        >
          {/* Tooltip content */}
          {text}

          {/* Small arrow */}
          <span
            className={clsx(
              "pointer-events-none absolute h-2 w-2 rotate-45 border border-gray-200 bg-white",
              // Hide one side of border to visually merge with the box border
              placement === "top" && "border-t-0 border-l-0",
              placement === "bottom" && "border-b-0 border-r-0",
              placement === "left" && "border-l-0 border-b-0",
              placement === "right" && "border-r-0 border-t-0",
              placementArrow
            )}
          />
        </div>
      )}
    </span>
  );
}
