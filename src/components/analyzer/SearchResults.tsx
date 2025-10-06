// Generic result list with add/remove controls.
// - Separates React key from business id to avoid duplicate keys.
// - Business id: getId(item) -> code -> null.
// - React key: business id or index fallback to guarantee uniqueness.
// - Renders optional description when present.
// - Uses shared <Button> component.

import * as React from "react";
import Button from "../ui/Button"; // uses project Button

type Props<T> = {
  /** Primary list prop */
  items?: T[];
  /** Legacy alias kept for compatibility */
  results?: T[];
  /** Called when user adds an item */
  onAdd: (item: T) => void;
  /** Optional remove handler, called with the item id */
  onRemove?: (id: string) => void;
  /** Already-picked ids to highlight */
  pickedIds?: string[];
  /** Optional extractor for item id; defaults to value of `code` if present */
  getId?: (item: T) => string | null;
  /** Empty state text */
  emptyText?: string;
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
}: Props<T>) {
  const list: T[] = items ?? results ?? [];

  // Business id extractor. May return null.
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

  return (
    <ul className="sr-list mt-4 space-y-2">
      {list.map((it, idx) => {
        const bizId = getBusinessId(it); // may be null
        const reactKey = bizId ?? `idx-${idx}`; // unique fallback
        const picked = bizId ? pickedIds.includes(bizId) : false;

        const title = extractTitle(it) ?? `Item ${idx + 1}`;
        const code = extractCode(it);
        const desc = extractDesc(it);

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

            <div className="flex items-center gap-2 shrink-0">
              {picked && onRemove && bizId ? (
                <Button variant="ghost" size="sm" onClick={() => onRemove(bizId)}>
                  Remove
                </Button>
              ) : (
                <Button size="sm" onClick={() => onAdd(it)}>
                  Add
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
