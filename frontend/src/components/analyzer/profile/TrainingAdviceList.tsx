// C:\Users\隐居小号\SkillBridge\skillbridge\src\components\analyzer\profile\TrainingAdviceList.tsx
import React from "react";
import { ExternalLink, GraduationCap } from "lucide-react";
import ConfirmRemove from "./confirmRemove";

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
  /** Handler when user confirms removal of an item */
  onRemove?: (item: TrainingAdvice) => void;
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
 * - Optional onRemove callback with confirmation dialog.
 */
const TrainingAdviceList: React.FC<TrainingAdviceListProps> = ({
  items,
  title = "Training advice",
  ariaLabel = "Training advice list",
  onSelect,
  onRemove,
  maxVisible,
}) => {
  // Cut to maxVisible if provided
  const list = typeof maxVisible === "number" ? items.slice(0, Math.max(0, maxVisible)) : items;

  return (
    <section aria-label={ariaLabel}>
      <header className="mb-3">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
      </header>

      {list.length === 0 ? (
        <div className="rounded-xl border border-border p-6 text-sm text-ink-soft">
          No training available
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((it) => {
            const key = `${it.code}|${it.url}`;
            const safeUrl = ensureHttp(it.url);
            return (
              <li key={key}>
                <article className="group relative h-full rounded-xl border border-border bg-white p-4 hover:shadow-card transition">
                  {/* Remove button in top-right corner */}
                  {onRemove && (
                    <div className="absolute top-2 right-2">
                      <ConfirmRemove
                        mode="circle"
                        title="Remove training advice"
                        message={`Are you sure you want to remove "${it.title}"? This action cannot be undone.`}
                        confirmText="Remove"
                        cancelText="Cancel"
                        onConfirm={() => onRemove(it)}
                      />
                    </div>
                  )}

                  {/* Icon and Title */}
                  <div className="mb-2 flex items-start gap-3">
                    <div className="shrink-0 mt-1">
                      <GraduationCap size={20} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="line-clamp-2 text-sm font-medium text-ink pr-8">
                        {it.title}
                      </h4>
                    </div>
                  </div>

                  {/* Code Badge */}
                  <div className="mb-3 ml-8">
                    <span className="inline-block rounded-full border border-border bg-gray-50 px-2.5 py-0.5 text-[11px] text-ink-soft font-medium">
                      {it.code}
                    </span>
                  </div>

                  {/* Action Button */}
                  <div className="mt-3 ml-8">
                    <a
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-white px-4 py-1.5 text-sm text-primary font-medium hover:bg-primary hover:text-ink-invert transition focus:outline-none focus:ring-2 focus:ring-primary/40"
                      aria-label={`Open ${it.title} in new tab`}
                      onClick={() => onSelect?.(it)}
                    >
                      <span>Visit course</span>
                      <ExternalLink size={14} />
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