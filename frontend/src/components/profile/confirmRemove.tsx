// src/components/ConfirmRemove.tsx
// A single-file Confirm-Remove trigger + dialog (React + TSX).
// - Trigger can be a primary button or a circular icon button.
// - Dialog is accessible: focus trap, ESC to close, restore focus.
// - No `any`. Uses your Button variants for consistent theming.

import React from "react";
import type { ReactElement } from "react";
import Button from "../ui/Button"; // uses primary/ghost variants :contentReference[oaicite:2]{index=2}

type TriggerMode = "button" | "circle";

type ConfirmRemoveProps = {
  /** Choose trigger look: "button" shows text, "circle" shows an icon-only button */
  mode?: TriggerMode;
  /** Button text when mode = "button" */
  label?: string;

  /** Dialog title text */
  title?: string;
  /** Dialog body message */
  message?: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;

  /** Disable the trigger */
  disabled?: boolean;

  /** Called only when user confirms */
  onConfirm: () => void | Promise<void>;

  /** Optional class on the trigger */
  className?: string;
};

export default function ConfirmRemove({
  mode = "button",
  label = "Remove",
  title = "Confirm remove",
  message = "Are you sure you want to delete this? This action cannot be undone. You can add it back manually later.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  disabled,
  onConfirm,
  className,
}: ConfirmRemoveProps): ReactElement {
  const [open, setOpen] = React.useState<boolean>(false);

  // Simple open/close helpers
  const openDialog = (): void => setOpen(true);
  const closeDialog = (): void => setOpen(false);

  // Trigger UI
  const trigger =
    mode === "button" ? (
      <Button
        variant="primary" // brand primary color :contentReference[oaicite:3]{index=3}
        size="md"
        onClick={openDialog}
        disabled={disabled}
        className={className}
      >
        {label}
      </Button>
    ) : (
      // Circle icon button variant using primary color
      <Button
        variant="primary"
        size="sm"
        onClick={openDialog}
        disabled={disabled}
        className={`h-11 w-11 rounded-full p-0 ${className ?? ""}`}
        aria-label={label}
        title={label}
      >
        {/* Trash icon (no external deps) */}
        <svg
          viewBox="0 0 24 24"
          role="img"
          aria-label="Remove"
          fill="currentColor"
          className="h-[20px] w-[20px] md:h-[22px] md:w-[22px] shrink-0"
        >
          <path d="M9 3h6a1 1 0 0 1 1 1v1h4v2h-1v12a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V7H4V5h4V4a1 1 0 0 1 1-1Zm1 2v0h4V5h-4ZM7 7v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7H7Zm4 3h2v8h-2v-8Z" />
        </svg>
      </Button>
    );

  return (
    <>
      {trigger}
      {open && (
        <ConfirmDialogUI
          title={title}
          message={message}
          confirmText={confirmText}
          cancelText={cancelText}
          onConfirm={async () => {
            await onConfirm();
            closeDialog();
          }}
          onCancel={closeDialog}
        />
      )}
    </>
  );
}

/* ---------------- Internal Dialog UI ---------------- */

type DialogProps = {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Accessible confirm dialog.
 * - Focus: auto-focus element marked with [data-autofocus], fallback to first focusable.
 * - Focus trap: Tab/Shift+Tab cycles inside the panel.
 * - ESC / backdrop click to cancel.
 * - Restore focus to the opener on unmount.
 * - Styles rely on project tokens (shadow-modal, colors):contentReference[oaicite:4]{index=4}.
 */
function ConfirmDialogUI({
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: DialogProps): ReactElement {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const lastActiveRef = React.useRef<HTMLElement | null>(null);

  // Collect focusable elements inside the dialog panel
  const getFocusable = React.useCallback((): HTMLElement[] => {
    const root = panelRef.current;
    if (!root) return [];
    const selector = [
      "button:not([disabled])",
      "a[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector));
    // Filter out hidden elements
    return nodes.filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
  }, []);

  // On mount: remember opener, lock scroll, move initial focus
  React.useEffect(() => {
    lastActiveRef.current = document.activeElement as HTMLElement | null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const target =
      (panelRef.current?.querySelector<HTMLElement>("[data-autofocus]") as HTMLElement | null) ??
      getFocusable()[0] ??
      null;
    target?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      lastActiveRef.current?.focus();
    };
  }, [getFocusable]);

  // ESC to cancel
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  // Keep focus inside the panel
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key !== "Tab") return;
    const items = getFocusable();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-remove-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}      // backdrop click cancels
      onKeyDown={onKeyDown}   // focus trap
    >
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()} // stop backdrop close when clicking panel
        className="w-[min(520px,90vw)] rounded-2xl bg-white p-6 shadow-modal focus:outline-none"
      >
        <h2 id="confirm-remove-title" className="text-lg font-semibold text-ink">
          {title}
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{message}</p>

        <div className="mt-5 flex justify-end gap-3">
          {/* Cancel button uses ghost variant (neutral) :contentReference[oaicite:5]{index=5} */}
          <Button
            variant="ghost"
            size="md"
            onClick={onCancel}
            className="min-w-[90px]"
            aria-label={cancelText}
            {...{ "data-autofocus": true }} // initial focus target
          >
            {cancelText}
          </Button>

          {/* Confirm button uses primary variant (brand color) :contentReference[oaicite:6]{index=6} */}
          <Button
            variant="primary"
            size="md"
            onClick={onConfirm}
            className="min-w-[90px]"
            aria-label={confirmText}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
