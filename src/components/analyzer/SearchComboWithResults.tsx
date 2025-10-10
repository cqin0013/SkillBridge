// src/components/analyzer/SearchComboWithResults.tsx
import React from "react";
import type { AnzscoOccupation } from "../../types/domain";
import Button from "../ui/Button";

/** Generic option for the industry select */
export type Option = { value: string; label: string };

export type SearchComboWithResultsProps = {
  /** Industry select options (read-only to avoid accidental mutation) */
  industryOptions: readonly Option[];
  /** Controlled industry code value */
  industryCode: string;
  /** Update industry code in parent */
  onIndustryChange: (code: string) => void;

  /** Controlled keyword value */
  keyword: string;
  /** Update keyword in parent */
  onKeywordChange: (kw: string) => void;

  /** Click search handler provided by parent */
  onSearch: () => void;

  /** Validation or business error near the form */
  searchError?: string;

  /** Result list from parent hook */
  results: readonly AnzscoOccupation[];
  /** Query flags from parent */
  isFetching: boolean;
  isError: boolean;
  /** True when no results for current params */
  noResults: boolean;

  /** Already picked ids to highlight/disable */
  pickedIds: readonly string[];
  /** Add one result (guarded by parent cap) */
  onAdd: (occ: AnzscoOccupation) => void;
  /** Remove by code */
  onRemove: (code: string) => void;

  /** Cap UI hints */
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
            <option value="">All industries</option>
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

        {/* Search button: use primary brand color */}
        <div className="self-end">
          <Button variant="primary" size="md" onClick={onSearch} aria-label="Search roles">
            Search roles
          </Button>
        </div>
      </div>

      {/* Validation or helper messages */}
      {searchError && (
        <div className="mt-3 rounded-md bg-amber-50 text-amber-800 p-3 text-sm">{searchError}</div>
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
          Failed to search. Please try again.
        </div>
      )}
      {noResults && (
        <div className="mt-3 rounded-md bg-blue-50 text-blue-900 p-3 text-sm">
          No roles found. Try another industry or keyword.
        </div>
      )}
      {isFetching && <div className="mt-3 text-sm text-ink-soft">Searching…</div>}

      {/* Results grid */}
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {results.map((it) => {
          const picked = pickedIds.includes(it.code);
          const disableAdd = reachedCap && !picked;
          const hasDesc =
            typeof (it as { description?: string }).description === "string" &&
            ((it as { description?: string }).description ?? "").trim().length > 0;

          return (
            <li key={it.code}>
              <article className="h-full rounded-xl border border-border p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {/* Title + code */}
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-ink">{it.title}</h4>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-ink-soft">
                        {it.code}
                      </span>
                    </div>
                    {/* Optional description */}
                    {hasDesc && (
                      <p className="mt-1 line-clamp-3 text-xs leading-5 text-ink-soft">
                        {(it as { description?: string }).description}
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
                        title={disableAdd ? addDisabledReason : "Add"}
                        aria-label="Add role"
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
