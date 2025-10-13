// src/components/analyzer/SearchResults.tsx
// Generic result list with add/remove controls.
// - Strict typing, no `any`.
// - Supports maxSelectable: when reached, "Add" is disabled with a tooltip.
// - Separates React key from business id to avoid duplicate keys.

import * as React from "react";
import Button from "../ui/Button";

type Props<T> = {
  /** Primary list prop */
  items?: T[];
  /** Legacy alias kept for compatibility */
  results?: T[];
  /** Called when user clicks Add (will not fire if disabled by maxSelectable) */
  onAdd: (item: T) => void;
  /** Optional remove handler, called with the item id */
  onRemove?: (id: string) => void;
  /** Already-picked ids to highlight */
  pickedIds?: string[];
  /** Optional extractor for item id; defaults to value of `code` if present */
  getId?: (item: T) => string | null;
  /** Empty state text */
  emptyText?: string;
  /** New: limit how many can be selected in total */
  maxSelectable?: number;
  /** New: current selected count (used with maxSelectable) */
  selectedCount?: number;
  /** New: tooltip when add is disabled by cap */
  addDisabledReason?: string;
};

function extractCode(x: unknown): string | null {
  if (!x || typeof x !== "object") return null;
  if (!("code" in x)) return null;
  const v = (x as { code?: unknown }).code;
  return typeof v === "string" ? v : null;
}

function extractTitle(x: unknown): string | null {
  if (!x || typeof x !== "object") return null;
  if (!("title" in x)) return null;
  const v = (x as { title?: unknown }).title;
  return typeof v === "string" ? v : null;
}

function extractDesc(x: unknown): string | null {
  if (!x || typeof x !== "object") return null;
  if (!("description" in x)) return null;
  const v = (x as { description?: unknown }).description;
  return typeof v === "string" ? v : null;
}

export default function SearchResults<T>({
  items,
  results,
  onAdd,
  onRemove,
  pickedIds = [],
  getId,
  emptyText = "No results",
  maxSelectable,
  selectedCount = 0,
  addDisabledReason = "You have reached the maximum. Remove some to add more.",
}: Props<T>): React.ReactElement {
  const list: T[] = items ?? results ?? [];

  // Extract stable business id
  const getBusinessId = React.useCallback(
    (it: T): string | null => {
      const custom = getId?.(it);
      if (custom) return custom;
      const code = extractCode(it);
      if (code) return code;
      return null;
    },
    [getId],
  );

  if (!list.length) {
    return <div className="sr-empty">{emptyText}</div>;
  }

  const reachedCap: boolean =
    typeof maxSelectable === "number" ? selectedCount >= maxSelectable : false;

  return (
    <ul className="sr-list mt-4 space-y-2">
      {list.map((it, idx) => {
        const bizId = getBusinessId(it); // may be null
        const reactKey = bizId ?? `idx-${idx}`;
        const picked = bizId ? pickedIds.includes(bizId) : false;

        const title = extractTitle(it) ?? `Item ${idx + 1}`;
        const code = extractCode(it);
        const desc = extractDesc(it);

        // Add is disabled when cap reached and this item is not already picked
        const addDisabled = !picked && reachedCap;

        return (
          <li
            key={reactKey}
            className={`sr-item flex items-center justify-between rounded-md border px-3 py-2 ${
              picked ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200"
            }`}
          >
            <div className="min-w-0 pr-3">
              <div className="font-medium truncate">{title}</div>
              {code && <div className="text-xs text-gray-500">Code: {code}</div>}
              {desc && <div className="mt-1 text-sm text-gray-600 line-clamp-2">{desc}</div>}
            </div>

            <div className="relative flex items-center gap-2 shrink-0">
              {picked && onRemove && bizId ? (
                <Button variant="ghost" size="sm" onClick={() => onRemove(bizId)}>
                  Remove
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!addDisabled) onAdd(it);
                    }}
                    disabled={addDisabled}
                    aria-label={addDisabled ? addDisabledReason : "Add"}
                  >
                    Add
                  </Button>

                  {/* Simple hover tooltip only when disabled by cap */}
                  {addDisabled && (
                    <div className="absolute -top-8 right-0 hidden whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-xs text-white md:block">
                      {addDisabledReason}
                    </div>
                  )}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
