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

/**
 * HelpToggleSmall Component
 * 
 * A lightweight, responsive tooltip component for displaying contextual help.
 * 
 * Features:
 * - Fully responsive across all screen sizes (mobile to desktop)
 * - Smart positioning that adjusts to viewport boundaries
 * - Full keyboard navigation (Tab to focus, Escape to close)
 * - Screen reader accessible with proper ARIA attributes
 * - Flexible interaction modes: hover, click, or both
 * - Smooth animations with Tailwind
 * 
 * @example
 * <HelpToggleSmall
 *   text="This is helpful information"
 *   placement="top"
 *   openOn="both"
 * />
 */
export default function HelpToggleSmall({
  text,
  placement = "top",
  trigger,
  openOn = "hover",
  className,
  hoverDelay = 80,
}: Props) {
  /** Controls tooltip visibility */
  const [open, setOpen] = useState<boolean>(false);
  /** Current placement after viewport boundary adjustments */
  const [adjustedPlacement, setAdjustedPlacement] = useState<Placement>(placement);
  
  /** Timer for delayed hover open */
  const hoverTimerRef = useRef<number | null>(null);
  /** Root wrapper element */
  const rootRef = useRef<HTMLSpanElement>(null);
  /** Trigger button element */
  const triggerRef = useRef<HTMLButtonElement>(null);
  /** Tooltip content element */
  const tooltipRef = useRef<HTMLDivElement>(null);
  /** Flag to prevent position adjustment loops (fixes mobile flicker) */
  const hasAdjustedRef = useRef<boolean>(false);
  
  /** Unique ID for ARIA relationship between trigger and tooltip */
  const id = useId();

  /**
   * Smart positioning: Adjust tooltip position to stay within viewport
   * Prevents tooltip from being cut off at screen edges
   * 
   * FIX: Only adjust once when tooltip opens to prevent flickering
   */
  useEffect(() => {
    if (!open || !tooltipRef.current || !triggerRef.current) {
      // Reset adjustment flag when tooltip closes
      hasAdjustedRef.current = false;
      return;
    }

    // Skip if we've already adjusted position for this open session
    if (hasAdjustedRef.current) return;

    // Use requestAnimationFrame to ensure tooltip is rendered before measuring
    const rafId = requestAnimationFrame(() => {
      const tooltip = tooltipRef.current;
      const trigger = triggerRef.current;
      if (!tooltip || !trigger) return;

      const tooltipRect = tooltip.getBoundingClientRect();
      let newPlacement = placement;

      // Check horizontal boundaries
      if (tooltipRect.right > window.innerWidth - 10) {
        newPlacement = "left";
      } else if (tooltipRect.left < 10) {
        newPlacement = "right";
      }

      // Check vertical boundaries
      if (tooltipRect.bottom > window.innerHeight - 10) {
        newPlacement = "top";
      } else if (tooltipRect.top < 10) {
        newPlacement = "bottom";
      }

      // Only update if placement actually needs to change
      if (newPlacement !== adjustedPlacement) {
        setAdjustedPlacement(newPlacement);
      }
      
      // Mark as adjusted for this open session
      hasAdjustedRef.current = true;
    });

    return () => cancelAnimationFrame(rafId);
  }, [open]); // Remove placement and adjustedPlacement from dependencies to prevent loops

  /**
   * Reset adjusted placement when base placement prop changes
   */
  useEffect(() => {
    setAdjustedPlacement(placement);
    hasAdjustedRef.current = false;
  }, [placement]);

  /**
   * Cleanup: Clear any pending hover timers on unmount
   */
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    };
  }, []);

  /**
   * Outside click handler: Close tooltip when clicking outside
   */
  useEffect(() => {
    if (!open) return;
    
    const onDocClick = (e: MouseEvent): void => {
      const target = e.target as Node;
      if (!rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  /**
   * Escape key handler: Close tooltip and return focus to trigger
   * Essential for keyboard accessibility
   */
  useEffect(() => {
    if (!open) return;
    
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  /**
   * Hover interaction handlers
   */
  const onMouseEnter = (): void => {
    if (openOn === "click") return;
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => setOpen(true), hoverDelay);
  };

  const onMouseLeave = (): void => {
    if (openOn === "click") return;
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setOpen(false);
  };

  /**
   * Click interaction handler
   */
  const onClickToggle = (): void => {
    if (openOn === "hover") return;
    setOpen((prev) => !prev);
  };

  /**
   * Focus handler for keyboard navigation
   */
  const onFocus = (): void => {
    if (openOn === "click") return;
    setOpen(true);
  };

  /**
   * Blur handler
   */
  const onBlur = (e: React.FocusEvent): void => {
    if (openOn === "click") return;
    // Don't close if focus moves to the tooltip itself
    if (!rootRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  };

  /**
   * Get responsive width classes
   * Mobile: 90vw max 280px
   * Tablet (sm): max 320px
   * Desktop (md+): max 384-448px
   */
  const getResponsiveWidth = (): string => {
    return "w-[90vw] max-w-[280px] sm:max-w-[320px] md:max-w-sm lg:max-w-md";
  };

  /**
   * Compute tooltip position classes based on adjusted placement
   */
  const placementBox = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }[adjustedPlacement];

  /**
   * Compute arrow position classes
   */
  const placementArrow = {
    top: "top-full left-1/2 -translate-x-1/2 -mt-[1px]",
    bottom: "bottom-full left-1/2 -translate-x-1/2 -mb-[1px]",
    left: "left-full top-1/2 -translate-y-1/2 -ml-[1px]",
    right: "right-full top-1/2 -translate-y-1/2 -mr-[1px]",
  }[adjustedPlacement];

  /**
   * Arrow border classes - hide specific sides for visual merging
   */
  const arrowBorder = {
    top: "border-t-0 border-l-0",
    bottom: "border-b-0 border-r-0",
    left: "border-l-0 border-b-0",
    right: "border-r-0 border-t-0",
  }[adjustedPlacement];

  return (
    <span
      ref={rootRef}
      className={clsx("relative inline-flex", className)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onBlur={onBlur}
    >
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        aria-label="Show help information"
        onClick={onClickToggle}
        onFocus={onFocus}
        className="inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full 
                   bg-primary text-white shadow-sm transition-all duration-200
                   hover:bg-primary/90 hover:shadow-md
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/40
                   active:scale-95"
        title="Help"
      >
        {trigger ?? <HelpCircle size={14} />}
      </button>

      {/* Tooltip content */}
      {open && (
        <div
          ref={tooltipRef}
          id={id}
          role="tooltip"
          className={clsx(
            "absolute z-[9999]",
            getResponsiveWidth(),
            "rounded-lg border border-gray-200 bg-white shadow-xl",
            "px-3 py-2.5 sm:px-3.5 sm:py-3",
            "text-xs sm:text-sm leading-relaxed text-ink",
            "break-words hyphens-auto",
            "animate-in fade-in-0 zoom-in-95 duration-200",
            placementBox
          )}
        >
          {/* Text content */}
          <div className="space-y-1">{text}</div>

          {/* Tooltip arrow */}
          <span
            className={clsx(
              "pointer-events-none absolute h-2 w-2 rotate-45",
              "border border-gray-200 bg-white",
              arrowBorder,
              placementArrow
            )}
            aria-hidden="true"
          />
        </div>
      )}
    </span>
  );
}