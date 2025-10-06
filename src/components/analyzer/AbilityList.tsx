// src/components/analyzer/AbilityList.tsx
// Ability list with per-list Edit action, collapsible body, and a11y-safe remove icon.
// - De-duplicates by (tag|code||name) before render.
// - Collapsible: show first N items, toggle to reveal all.
// - Remove button uses the × symbol with aria-label for screen readers.

import * as React from "react";
import Button from "../ui/Button";

type AType = "knowledge" | "tech" | "skill";

type Ability = {
  /** Display name shown to user */
  name: string;
  /** Optional stable code for React keys and identity */
  code?: string;
};

type Props = {
  /** Items already chosen for this category */
  items: Ability[];
  /** Category tag for callbacks */
  tag: AType;
  /** Remove one item */
  onRemove: (name: string, tag: AType) => void;
  /** Open picker to edit this list */
  onEdit?: (tag: AType) => void;
  /** Number of items visible when collapsed */
  initialVisible?: number;
};

export default function AbilityList({
  items,
  tag,
  onRemove,
  onEdit,
  initialVisible = 8,
}: Props) {
  // De-duplicate to avoid duplicate keys and rows
  const unique: Ability[] = React.useMemo(() => {
    const seen = new Set<string>();
    const out: Ability[] = [];
    (items ?? []).forEach((it) => {
      const id = `${tag}|${it.code ?? it.name}`;
      if (!seen.has(id)) {
        seen.add(id);
        out.push(it);
      }
    });
    return out;
  }, [items, tag]);

  // Collapsible state
  const [collapsed, setCollapsed] = React.useState<boolean>(true);
  const visible = collapsed ? unique.slice(0, initialVisible) : unique;
  const hiddenCount = Math.max(unique.length - visible.length, 0);

  if (!unique.length) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm text-ink-soft">No items</span>
        {onEdit && (
          <Button size="sm" variant="ghost" onClick={() => onEdit(tag)}>
            Edit
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {/* Toolbar: count, collapse toggle, edit */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs sm:text-sm text-ink-soft">
          Selected: {unique.length}
        </span>

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="ml-2 rounded-full border border-black/15 px-2.5 h-7 text-xs sm:text-sm
                       hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-expanded={!collapsed}
            aria-controls={`abl-list-${tag}`}
          >
            {collapsed ? `Show more (${hiddenCount})` : "Show less"}
          </button>
        )}

        <span className="grow" aria-hidden />
        {onEdit && (
          <Button size="sm" variant="ghost" onClick={() => onEdit(tag)}>
            Edit
          </Button>
        )}
      </div>

      {/* Items */}
      <ul id={`abl-list-${tag}`} className="space-y-2">
        {visible.map((it, idx) => {
          // Key always includes index to guarantee uniqueness
          const key = `${tag}:${it.code ?? it.name}:${idx}`;
          return (
            <li
              key={key}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 bg-white"
            >
              <span className="pr-3 whitespace-normal break-words text-[13px] sm:text-sm md:text-base">
                {it.name}
              </span>

              {/* Remove with × symbol; keep it a11y-friendly */}
              <button
                type="button"
                onClick={() => onRemove(it.name, tag)}
                aria-label={`Remove ${it.name}`}
                className="h-7 w-7 inline-flex items-center justify-center rounded-full
                           border border-black/15 text-ink hover:bg-black/5
                           focus:outline-none focus:ring-2 focus:ring-primary/50"
                title={`Remove ${it.name}`}
              >
                <span aria-hidden>×</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
