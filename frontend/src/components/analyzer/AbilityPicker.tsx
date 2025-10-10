// src/components/analyzer/AbilityPicker.tsx
/**
 * AbilityPicker
 * - Modal with category tabs and checkable pills.
 * - Clear visual difference: left nav (categories) vs right panel (options).
 * - Shows a legend to indicate "Selectable" vs "Selected".
 * - Keyboard: ESC to close. Click overlay to close.
 * - Button text changed to "Edit selected".
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Button from "../../components/ui/Button";

export type AbilityCategory = {
  /** Unique category id */
  id: string;
  /** Display label */
  label: string;
  /** Flat list of option names */
  skills: string[];
};

export type AbilityPickerProps = {
  open: boolean;
  title: string;
  categories: AbilityCategory[];
  initiallySelected?: string[];
  onClose: () => void;
  onConfirm: (picked: string[]) => void;
};

export default function AbilityPicker({
  open,
  title,
  categories,
  initiallySelected = [],
  onClose,
  onConfirm,
}: AbilityPickerProps) {
  const [active, setActive] = useState<string>(() => categories[0]?.id ?? "");
  const [picked, setPicked] = useState<Set<string>>(new Set(initiallySelected));
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset when reopened
  useEffect(() => {
    if (!open) return;
    setActive(categories[0]?.id ?? "");
    setPicked(new Set(initiallySelected));
  }, [open, categories, initiallySelected]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Close on outside click
  const onOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === overlayRef.current) onClose();
  };

  const activeList = useMemo(
    () => categories.find((c) => c.id === active)?.skills ?? [],
    [categories, active],
  );

  const toggle = (name: string): void => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  if (!open) return null;

  const selectedCount = picked.size;

  return (
    <div
      ref={overlayRef}
      onMouseDown={onOverlayMouseDown}
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-modal">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-ink truncate">
              {title}
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-ink-soft">
              {selectedCount} selected
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-black/10"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col sm:flex-row gap-0">
          {/* Left nav: categories */}
          <aside className="sm:w-56 shrink-0 border-r border-border bg-black/[0.03] p-4">
            <div className="text-[11px] sm:text-xs uppercase tracking-wide text-ink-soft mb-2">
              Categories
            </div>
            <ul className="flex sm:flex-col gap-2">
              {categories.map((c) => {
                const isActive = c.id === active;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setActive(c.id)}
                      className={[
                        "w-full text-left rounded-lg px-4 py-2 text-sm sm:text-[15px] transition",
                        isActive
                          ? "bg-primary text-white shadow-sm"
                          : "bg-white border border-black/10 text-ink hover:bg-black/5",
                      ].join(" ")}
                    >
                      {c.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Right panel: options */}
          <section className="min-w-0 grow p-5">
            {/* Legend */}
            <div className="mb-3 flex items-center gap-4 text-[11px] sm:text-xs text-ink-soft">
              <span className="inline-flex items-center gap-2">
                <span className="inline-block rounded-full border border-black/15 bg-white h-6 px-3 leading-6">
                  Selectable
                </span>
                <span>— tap to add</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block rounded-full bg-accent text-primary-ink h-6 px-3 leading-6">
                  ✓ Selected
                </span>
                <span>— tap to remove</span>
              </span>
            </div>

            {/* Option pills */}
            <div className="flex flex-wrap gap-2">
              {activeList.map((name) => {
                const chosen = picked.has(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggle(name)}
                    className={[
                      "rounded-full px-3 min-h-[36px] h-9 text-sm sm:text-[15px] transition",
                      "focus:outline-none focus:ring-2 focus:ring-primary/50",
                      chosen
                        ? // selected: solid accent pill with check
                          "bg-accent text-primary-ink"
                        : // selectable: white pill with light border
                          "bg-white border border-black/15 hover:bg-black/5",
                    ].join(" ")}
                    aria-pressed={chosen}
                  >
                    {chosen ? "✓ " : ""}
                    {name}
                  </button>
                );
              })}
              {activeList.length === 0 && (
                <div className="text-sm text-ink-soft">No options in this category.</div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(Array.from(picked))}>
            Edit selected
          </Button>
        </div>
      </div>
    </div>
  );
}
