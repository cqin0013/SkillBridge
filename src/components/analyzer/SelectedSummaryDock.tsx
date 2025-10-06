// Slide-in dock that hides on the LEFT edge; a small opener on the RIGHT.
// Clicking the transparent backdrop closes it.

import { useMemo, useState } from "react";
import clsx from "clsx";
import SelectedSummary from "./SelectedSummary";
import type { DraftOverrides, SummaryItem } from "../../summary/types";

type Props = {
  items?: ReadonlyArray<SummaryItem>;
  drafts?: DraftOverrides;
  /** Panel width in px */
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
  items,
  drafts,
  panelWidth = 320,
  defaultOpen = false,
  position = "left",
  showBackdrop = true,
  className,
}: Props) {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const isLeft = position === "left";

  // Translate off-screen when closed, depending on the side
  const transform = useMemo(() => {
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

      {/* Dock panel */}
      <aside
        className={clsx(
          "fixed top-0 bottom-0 z-50",
          isLeft ? "left-0" : "right-0",
          open ? "pointer-events-auto" : "pointer-events-none"
        )}
        style={{ width: open ? panelWidth : 0 }}
        aria-label="Selections dock"
      >
        <div
          className={clsx(
            "h-full pointer-events-auto",
            "rounded-r-xl rounded-l-xl border border-black/10 bg-white shadow-lg",
            "transition-transform duration-300 ease-out",
            className
          )}
          style={{ width: panelWidth, transform }}
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

          <div className="p-3">
            {/* Read-only summary; pass drafts to reflect live changes */}
            <SelectedSummary showTitle={false} compact drafts={drafts} items={items} />
          </div>
        </div>
      </aside>

      {/* Edge opener on the RIGHT, shown only when the dock is closed */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open selections"
          title="Open selections"
          className={clsx(
            "fixed z-50 top-1/2 -translate-y-1/2",
            "right-3",
            "h-10 w-10 rounded-full shadow-lg",
            "bg-primary text-white flex items-center justify-center"
          )}
        >
          {/* Chevron-left icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M14.5 5L8.5 12l6 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </>
  );
}
