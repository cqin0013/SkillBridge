// src/components/analyzer/SelectedSummary.tsx
// Builder-agnostic summary renderer.
// - Group by id prefix "<section>:...".
// - compact: prefer first non-pill value per section, else show count.
// - full: render non-pill value rows + pill chips.
// No `any` used.

import { useMemo } from "react";
import clsx from "clsx";
import { useSummaryItemsLive } from "../../summary/registry";
import type { DraftOverrides, SummaryItem } from "../../summary/types";

type Props = {
  compact?: boolean;
  showTitle?: boolean;
  drafts?: DraftOverrides;
  className?: string;
};

/** Extract section from id prefix before the first ":"; fallback to "Other". */
function sectionFromId(id: string): string {
  const i = id.indexOf(":");
  return i > 0 ? id.slice(0, i) : "Other";
}

/** Split items into pills vs non-pills. */
function splitByPill(items: ReadonlyArray<SummaryItem>) {
  const pills: SummaryItem[] = [];
  const values: SummaryItem[] = [];
  for (const it of items) {
    if (it.pill) pills.push(it);
    else values.push(it);
  }
  return { pills, values };
}

/** Title-case for section headers. */
function titleCase(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function SelectedSummary({
  compact,
  showTitle = true,
  drafts,
  className,
}: Props) {
  const items = useSummaryItemsLive(drafts);

  // Group items by section
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

  if (compact) {
    // Compact: for each section, prefer a readable non-pill value; else show count
    return (
      <div className={className}>
        {showTitle && <h3 className="text-sm font-semibold mb-2">Summary</h3>}
        <ul className="space-y-2 text-sm">
          {Array.from(grouped.entries()).map(([section, list]) => {
            const { values } = splitByPill(list);
            const firstValue = values.find((v) => v.value != null)?.value as string | undefined;
            const right = firstValue ?? String(list.length);
            return (
              <li key={section} className="flex justify-between">
                <span className="text-ink-soft">{titleCase(section)}</span>
                <span className="font-medium">{right}</span>
              </li>
            );
          })}
          {grouped.size === 0 && <li className="text-ink-soft">—</li>}
        </ul>
      </div>
    );
  }

  // Full: render values (non-pill) then chips (pill)
  return (
    <div className={clsx("space-y-5", className)}>
      {showTitle && <h3 className="text-base font-semibold">Your selections</h3>}
      {Array.from(grouped.entries()).map(([section, list]) => {
        const { pills, values } = splitByPill(list);
        return (
          <section key={section}>
            <h4 className="text-sm font-semibold text-ink mb-2">{titleCase(section)}</h4>

            {values.length > 0 ? (
              <ul className="text-sm space-y-1 mb-2">
                {values.map((it) => (
                  <li key={it.id} className="flex justify-between">
                    <span className="text-ink-soft">{it.label}</span>
                    <span className="font-medium">{it.value ?? "—"}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {pills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {pills.map((it) => (
                  <span
                    key={it.id}
                    className="inline-flex items-center rounded-full border border-black/10 bg-white px-3 h-8 text-xs"
                    title={it.label}
                  >
                    {it.label}
                  </span>
                ))}
              </div>
            ) : values.length === 0 ? (
              <div className="text-sm text-ink-soft">—</div>
            ) : null}
          </section>
        );
      })}
      {grouped.size === 0 && <div className="text-sm text-ink-soft">—</div>}
    </div>
  );
}
