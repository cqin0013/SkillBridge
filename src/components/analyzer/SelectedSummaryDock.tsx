// src/components/analyzer/SelectedSummaryDock.tsx
// Slide-in dock with width clamp and side-aware opener.
// - Clamps panel width to viewport (never exceeds screen).
// - Works on both "left" and "right" sides.
// - Backdrop click closes the dock.
// - Passes only `drafts` to SelectedSummary (no unsupported props).
// - No `any` used.

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import SelectedSummary from "./SelectedSummary";
import type { DraftOverrides } from "../../summary/types";

type Props = {
  drafts?: DraftOverrides;
  /** Desired panel width in px (will be clamped to viewport). */
  panelWidth?: number;
  /** Initial open state */
  defaultOpen?: boolean;
  /** Dock side */
  position?: "left" | "right";
  /** Show a fullscreen clickable backdrop when open */
  showBackdrop?: boolean;
  className?: string;
};

export default function SelectedSummaryDock({
  drafts,
  panelWidth = 320,
  defaultOpen = false,
  position = "left",
  showBackdrop = true,
  className,
}: Props) {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const [vw, setVw] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerWidth : panelWidth
  );
  const isLeft = position === "left";

  // Track viewport width for live clamping on resize
  useEffect(() => {
    const onResize = (): void => setVw(window.innerWidth);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Effective width: min(requested, viewport - margin), with a sane minimum
  const effectiveWidth = useMemo<number>(() => {
    const margin = 16; // keep a small outer margin
    const minW = 260;  // avoid too-narrow panel on tiny screens
    const maxW = Math.max(minW, vw - margin);
    return Math.min(panelWidth, maxW);
  }, [panelWidth, vw]);

  // Translate off-screen when closed, depending on the side
  const transform = useMemo<string>(() => {
    const hidden = isLeft ? "translateX(-100%)" : "translateX(100%)";
    return open ? "translateX(0)" : hidden;
  }, [open, isLeft]);

  return (
    <>
      {open && showBackdrop && (
        <button
          type="button"
          aria-label="Close selections"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-transparent"
        />
      )}

      {/* Dock container (keeps layout hits low by zeroing width when closed) */}
      <aside
        className={clsx(
          "fixed top-0 bottom-0 z-50",
          isLeft ? "left-0" : "right-0",
          open ? "pointer-events-auto" : "pointer-events-none"
        )}
        style={{ width: open ? effectiveWidth : 0, maxWidth: "100vw" }}
        aria-label="Selections dock"
      >
        <div
          className={clsx(
            "h-full pointer-events-auto border border-black/10 bg-white shadow-lg",
            "transition-transform duration-300 ease-out",
            // side-aware rounding: only the inner edge is rounded
            isLeft ? "rounded-r-xl rounded-l-none" : "rounded-l-xl rounded-r-none",
            className
          )}
          style={{ width: effectiveWidth, transform, maxWidth: "100vw" }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-black/10">
            <div className="text-sm font-medium text-ink">Your selections</div>
            <button
              type="button"
              className="text-xs h-7 px-2 rounded-full border border-black/15 bg-white text-ink"
              onClick={() => setOpen(false)}
              aria-label="Collapse selections dock"
            >
              Close
            </button>
          </div>

          <div className="p-3 w-full max-w-full overflow-auto">
            {/* Read-only summary; pass drafts to reflect live changes */}
            <SelectedSummary showTitle={false} drafts={drafts} />
          </div>
        </div>
      </aside>

      {/* Edge opener, placed on the opposite edge of the panel */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open selections"
          title="Open selections"
          className={clsx(
            "fixed z-50 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-lg",
            "bg-primary text-white flex items-center justify-center",
            isLeft ? "left-3" : "right-3"
          )}
        >
          {/* Chevron points toward the dock */}
          {isLeft ? (
            // opening a left-side dock → chevron-right
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9.5 5l6 7-6 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            // opening a right-side dock → chevron-left
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M14.5 5l-6 7 6 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      )}
    </>
  );
}
