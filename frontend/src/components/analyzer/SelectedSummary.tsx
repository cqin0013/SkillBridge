// Dumb, reusable summary renderer.
// - Input decides WHAT to show (counts vs details). This component only renders.
// - Groups items by "<section>:..." prefix from `id`.
// - Value rows render as label/value lines; pills render as one-per-line chips.
// - To avoid duplication: if a section has pills, value rows are NOT rendered.
// - Width-safe: wraps long text, container scrolls if content overflows.


import { useMemo } from "react";
import clsx from "clsx";
import { useSummaryItemsLive } from "../../summary/registry";
import type { DraftOverrides, SummaryItem } from "../../summary/types";

type Props = {
  /** Optional compact header size; content logic is unchanged */
  compact?: boolean;
  /** Show top title */
  showTitle?: boolean;
  /** Live draft overrides passed from pages */
  drafts?: DraftOverrides;
  /** If provided, render these items instead of querying the registry */
  items?: ReadonlyArray<SummaryItem>;
  className?: string;
};

/** Extract section name from id prefix before the first ":"; fallback to "Other". */
function sectionFromId(id: string): string {
  const i = id.indexOf(":");
  return i > 0 ? id.slice(0, i) : "Other";
}

/** Split a group into non-pill "values" vs pill "chips". */
function splitByPill(items: ReadonlyArray<SummaryItem>) {
  const pills: SummaryItem[] = [];
  const values: SummaryItem[] = [];
  for (const it of items) {
    if (it.pill) pills.push(it);
    else values.push(it);
  }
  return { pills, values };
}

/** Simple title-case for section headers. */
function titleCase(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function SelectedSummary({
  compact,
  showTitle = true,
  drafts,
  items: itemsProp,
  className,
}: Props) {
  // Prefer explicit items; otherwise read live items from registry with optional drafts
  const live = useSummaryItemsLive(drafts);
  const items = itemsProp ?? live;

  // Group items by section prefix
  const grouped = useMemo(() => {
    const map = new Map<string, SummaryItem[]>();
    for (const it of items) {
      const sec = sectionFromId(it.id);
      const arr = map.get(sec);
      if (arr) arr.push(it);
      else map.set(sec, [it]);
    }
    return map;
  }, [items]);

  return (
    <div className={clsx("space-y-5 w-full max-w-full overflow-auto", className)}>
      {showTitle && (
        <h3 className={clsx(compact ? "text-sm" : "text-base", "font-semibold")}>
          Your selections
        </h3>
      )}

      {Array.from(grouped.entries()).map(([section, list]) => {
        const { pills, values } = splitByPill(list);

        return (
          <section key={section} className="min-w-0">
            <h4 className="text-sm font-semibold text-ink mb-2">{titleCase(section)}</h4>

            {/* Render value rows ONLY when there are no pills to avoid duplication */}
            {values.length > 0 && pills.length === 0 && (
              <ul className="text-sm space-y-1 mb-2">
                {values.map((it) => (
                  <li key={it.id} className="flex justify-between items-start gap-3 min-w-0">
                    <span className="text-ink-soft whitespace-normal break-words">
                      {it.label}
                    </span>
                    <span className="font-medium text-right whitespace-normal break-words">
                      {it.value ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Pills as one-per-line chips; long labels wrap */}
            {pills.length > 0 && (
              <ul className="space-y-2">
                {pills.map((it) => (
                  <li
                    key={it.id}
                    className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm min-w-0"
                    title={it.label}
                  >
                    <span className="block whitespace-normal break-words">{it.label}</span>
                  </li>
                ))}
              </ul>
            )}

            {pills.length === 0 && values.length === 0 && (
              <div className="text-sm text-ink-soft">—</div>
            )}
          </section>
        );
      })}

      {grouped.size === 0 && <div className="text-sm text-ink-soft">—</div>}
    </div>
  );
}
