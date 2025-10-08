// src/components/analyzer/AbilityList.tsx
// Toolbar + list renderer for abilities per category.
// - Shows selected count and an inline "Edit" button.
// - Renders all abilities as chips; each chip has a centered remove button.
// - De-duplicates by (tag|code||name) to keep count stable.
//

import * as React from "react";
import clsx from "clsx";

type AType = "knowledge" | "tech" | "skill";

type Ability = {
  /** Display name shown to user */
  name: string;
  /** Optional stable code for identity */
  code?: string;
};

type Props = {
  /** Items already chosen for this category */
  items: Ability[];
  /** Category tag for callbacks */
  tag: AType;
  /** Open picker to edit this list */
  onEdit: (tag: AType) => void;
  /** Remove one item by name and category */
  onRemove: (name: string, tag: AType) => void;
  /** Optional wrapper class */
  className?: string;
};

export default function AbilityList({
  items,
  tag,
  onEdit,
  onRemove,
  className,
}: Props) {
  // De-duplicate and keep original order of first occurrence.
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

  const count = unique.length;

  return (
    <div className={clsx("min-w-0", className)}>
      {/* Toolbar: count + Edit */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs sm:text-sm text-ink-soft">
          Selected: {count}
        </span>
        <span className="grow" aria-hidden />
        <button
          type="button"
          onClick={() => onEdit(tag)}
          className="px-3 py-1.5 rounded-md border text-sm hover:bg-black/5
                     focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          Edit
        </button>
      </div>

      {/* Chips: show all, no "show more" */}
      {count === 0 ? (
        <div className="text-sm text-ink-soft">No items</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {unique.map((a, i) => (
            <span
              key={`${tag}:${a.code ?? a.name}:${i}`}
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white pl-3 pr-1 h-8 text-xs"
              title={a.name}
            >
              {a.name}
              <button
                type="button"
                onClick={() => onRemove(a.name, tag)}
                aria-label={`Remove ${a.name}`}
                className="grid h-5 w-5 place-items-center rounded-full
                           border border-black/10 text-ink hover:bg-black/5
                           focus:outline-none focus:ring-2 focus:ring-primary/50 leading-none"
                title={`Remove ${a.name}`}
              >
                <span aria-hidden>×</span>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
