// C:\Users\隐居小号\SkillBridge\skillbridge\src\components\analyzer\profile\TrainingAdviceList.tsx
import React from "react";

/** One training advice item */
export type TrainingAdvice = {
  /** Human-readable training/course name */
  title: string;
  /** Identifier code displayed as a small badge */
  code: string;
  /** External URL to the provider or syllabus */
  url: string;
};

/** Public props for the list */
export type TrainingAdviceListProps = {
  /** Items to render; empty array will show an empty state */
  items: Readonly<TrainingAdvice[]>;
  /** Optional list title shown above the grid */
  title?: string;
  /** Optional aria-label for the section landmark */
  ariaLabel?: string;
  /** Optional handler when user clicks a training card */
  onSelect?: (item: TrainingAdvice) => void;
  /** Optional: limit visible items; useful for previews */
  maxVisible?: number;
};

/** Ensure URL has a protocol so <a href> is valid */
function ensureHttp(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

/**
 * TrainingAdviceList
 * - Renders a responsive grid of training advice cards.
 * - Each card shows title, code badge, and a CTA link (opens in new tab).
 * - Optional onSelect callback for analytics or custom behavior.
 */
const TrainingAdviceList: React.FC<TrainingAdviceListProps> = ({
  items,
  title = "Training advice",
  ariaLabel = "Training advice list",
  onSelect,
  maxVisible,
}) => {
  // Cut to maxVisible if provided
  const list = typeof maxVisible === "number" ? items.slice(0, Math.max(0, maxVisible)) : items;

  return (
    <section aria-label={ariaLabel}>
      <header className="mb-3">
        <h3 className="text-base font-semibold">{title}</h3>
      </header>

      {list.length === 0 ? (
        <div className="rounded-xl border p-6 text-sm text-gray-500">No training available</div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((it) => {
            const key = `${it.code}|${it.url}`;
            const safeUrl = ensureHttp(it.url);
            return (
              <li key={key}>
                <article className="group h-full rounded-xl border p-4 hover:shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h4 className="line-clamp-2 text-sm font-medium">{it.title}</h4>
                    <span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] text-gray-700">
                      {it.code}
                    </span>
                  </div>
                  <div className="mt-3">
                    <a
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block rounded-lg border px-3 py-1.5 text-sm underline-offset-2 hover:bg-gray-50 hover:underline"
                      aria-label={`Open ${it.title}`}
                      onClick={() => onSelect?.(it)}
                    >
                      Open link
                    </a>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default TrainingAdviceList;
