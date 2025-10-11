// src/components/analyzer/SearchComboWithResults.tsx
import React from "react";
import type { AnzscoOccupation } from "../../types/domain";
import Button from "../ui/Button";

/** Generic option for the industry select */
export type Option = { value: string; label: string };

export type SearchComboWithResultsProps = {
  industryOptions: readonly Option[];
  industryCode: string;
  onIndustryChange: (code: string) => void;

  keyword: string;
  onKeywordChange: (kw: string) => void;

  onSearch: () => void;

  searchError?: string;

  results: readonly AnzscoOccupation[];
  isFetching: boolean;
  isError: boolean;
  noResults: boolean;

  pickedIds: readonly string[];
  onAdd: (occ: AnzscoOccupation) => void;
  onRemove: (code: string) => void;

  maxSelectable: number;
  selectedCount: number;
  addDisabledReason?: string;
};

const SearchComboWithResults: React.FC<SearchComboWithResultsProps> = ({
  industryOptions,
  industryCode,
  onIndustryChange,
  keyword,
  onKeywordChange,
  onSearch,
  searchError,
  results,
  isFetching,
  isError,
  noResults,
  pickedIds,
  onAdd,
  onRemove,
  maxSelectable,
  selectedCount,
  addDisabledReason,
}) => {
  const reachedCap = selectedCount >= maxSelectable;

  // English-only input validator: allow empty, letters, spaces, apostrophes, hyphens
  const trimmed = keyword.trim();
  const englishOk = trimmed === "" || /^[A-Za-z][A-Za-z\s'-]*$/.test(trimmed);

  return (
    <section className="mt-2">
      {/* Form block */}
      <div className="grid gap-3 sm:grid-cols-[240px_minmax(0,1fr)_auto]">
        {/* Industry select */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Industry</span>
          <select
            className="h-10 rounded-lg border border-border px-3"
            value={industryCode}
            onChange={(e) => onIndustryChange(e.target.value)}
            aria-label="Industry"
          >
            {industryOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {/* Keyword input */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Keyword</span>
          <input
            className="h-10 rounded-lg border border-border px-3"
            placeholder="Type a role keyword (e.g., analyst)"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            aria-label="Keyword"
          />
        </label>

        {/* Search button */}
        <div className="self-end">
          <Button
            variant="primary"
            size="md"
            onClick={onSearch}
            aria-label="Search roles"
            disabled={!englishOk}
            // Instant tooltip when disabled
            tooltipWhenDisabled={!englishOk ? "Please enter English letters only." : undefined}
          >
            Search roles
          </Button>
        </div>
      </div>

      {/* Validation or helper messages */}
      {!englishOk && (
        <div className="mt-3 rounded-md bg-amber-50 text-amber-900 p-3 text-sm">
          Please enter English letters only.
        </div>
      )}

      {searchError && (
        <div className="mt-3 rounded-md bg-amber-50 text-amber-800 p-3 text-sm">
          {searchError}
        </div>
      )}

      {reachedCap && (
        <div
          className="mt-2 inline-flex items-center gap-2 rounded-md border border-border bg-black/5 px-2 py-1 text-xs text-ink"
          title={addDisabledReason}
        >
          Limit reached: {maxSelectable} roles selected. Remove one before adding another.
        </div>
      )}

      {isError && (
        <div className="mt-3 rounded-md bg-red-50 text-red-900 p-3 text-sm">
          Our system may be having an issue right now. Please try again later or{" "}
          <a
            href="/feedback"
            className="underline underline-offset-2 font-medium"
            target="_blank"
            rel="noreferrer"
          >
            send feedback
          </a>
          .
        </div>
      )}

      {noResults && englishOk && !isFetching && (
        <div className="mt-3 rounded-md bg-blue-50 text-blue-900 p-3 text-sm">
          This industry does not contain roles matching your keyword. Please verify your input or try a different industry.
        </div>
      )}

      {isFetching && <div className="mt-3 text-sm text-ink-soft">Searching…</div>}

      {/* Results grid */}
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {results.map((it) => {
          const picked = pickedIds.includes(it.code);
          const disableAdd = reachedCap && !picked;

          // Coerce optional description safely
          const rawDesc = (it as { description?: unknown }).description;
          const desc: string = typeof rawDesc === "string" ? rawDesc : "";
          const hasDesc = desc.trim().length > 0;

          return (
            <li key={it.code}>
              {/* Text wraps to fit container */}
              <article className="h-auto rounded-xl border border-border p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 max-w-full">
                    {/* Title + code */}
                    <div className="flex items-start gap-2">
                      <h4
                        className="text-sm font-semibold text-ink break-words whitespace-normal leading-5"
                        title={it.title}
                      >
                        {it.title}
                      </h4>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-ink-soft shrink-0">
                        {it.code}
                      </span>
                    </div>

                    {/* Optional description */}
                    {hasDesc && (
                      <p className="mt-2 text-xs leading-5 text-ink-soft break-words whitespace-normal">
                        {desc}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">
                    {!picked ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onAdd(it)}
                        disabled={disableAdd}
                        aria-label="Add role"
                        // Instant tooltip when disabled by cap
                        tooltipWhenDisabled={
                          disableAdd
                            ? (addDisabledReason ??
                              `Limit reached: maximum ${maxSelectable} roles. Remove one before adding.`)
                            : undefined
                        }
                      >
                        Add
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(it.code)}
                        aria-label="Remove role"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default SearchComboWithResults;
