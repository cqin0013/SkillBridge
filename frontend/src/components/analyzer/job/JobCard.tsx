import { useMemo } from "react";
import Button from "../../ui/Button";

/**
 * JobCard
 * - Smallest typography among the three levels (industry > occupation > role).
 * - Uses shared Button for consistent styles and a11y.
 * - Shows shortage badge with tone; supports "selected" state.
 */
export type JobCardProps = {
  /** Role title (ANZSCO detailed occupation) */
  title: string;
  /** Optionally hide match bar on some pages */
  showMatch?: boolean;
  /** Value 0..100 for match bar */
  matchPercent?: number;
  /** Short summary paragraph */
  summary?: string;

  /** Shortage text & tone from API */
  shortageText?: string | null;
  /** strong: green, soft: light green, default: neutral */
  shortageTone?: "strong" | "soft" | "default";
  /** Loading spinner state for shortage fetch */
  loadingShortage?: boolean;

  /** Selection state and handler */
  selected?: boolean;
  onSelect?: () => void;

  /** Additional className */
  className?: string;
};

export default function JobCard({
  title,
  showMatch = false,
  matchPercent = 0,
  summary,
  shortageText,
  shortageTone = "default",
  loadingShortage = false,
  selected = false,
  onSelect,
  className,
}: JobCardProps) {
  // Derive shortage tone classes from semantic token names
  const shortageClass = useMemo(() => {
    switch (shortageTone) {
      case "strong":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "soft":
        return "bg-emerald-25 text-emerald-700 border-emerald-100"; // keep lighter appearance
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  }, [shortageTone]);

  const percent = Math.max(0, Math.min(100, matchPercent));

  return (
    <article
      className={[
        "rounded-xl border border-border bg-white p-4 shadow-card focus-within:ring-2 focus-within:ring-primary/40",
        className ?? "",
      ].join(" ")}
      aria-label={title}
    >
      {/* Role title uses the smallest heading style among three levels */}
      <h4 className="text-base sm:text-lg font-semibold text-ink">{title}</h4>

      {summary && <p className="mt-1 text-sm text-ink-soft">{summary}</p>}

      {/* Match bar is optional */}
      {showMatch && (
        <div className="mt-3" aria-label="Match level" role="img" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-2 w-full rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-primary transition-[width]"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="mt-1 inline-block text-xs text-ink-soft">{percent}% match</span>
        </div>
      )}

      {/* Shortage badge with loading state */}
      <div className="mt-3">
        <span
          className={[
            "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium",
            shortageClass,
          ].join(" ")}
          aria-live="polite"
        >
          {loadingShortage ? (
            <>
              <span className="inline-block size-3 animate-spin rounded-full border-2 border-ink/30 border-t-transparent" aria-hidden="true" />
              Loading shortage…
            </>
          ) : (
            <>{shortageText || "No data"}</>
          )}
        </span>
      </div>

      {/* Action row */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-xs text-ink-soft">ANZSCO role</div>
        <Button
          variant={selected ? "accent" : "ghost"}
          size="sm"
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={selected ? "Deselect this job" : "Select this job"}
          title={selected ? "Selected" : "Select this job"}
        >
          {selected ? "Selected" : "Select"}
        </Button>
      </div>
    </article>
  );
}
