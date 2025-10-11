// src/components/analyzer/SearchComboWithResults.tsx
import React from "react";
import type { AnzscoOccupation } from "../../types/domain";

/** Option for industry select */
export type Option = { value: string; label: string };

/** Props: note the readonly array */
type Props = {
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

/**
 * SearchComboWithResults
 * Unified block: industry select + keyword + search + results.
 * Pure presentational; no internal state mutation of props.
 */
const SearchComboWithResults: React.FC<Props> = (props) => {
  const {
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
  } = props;

  const reachedCap = selectedCount >= maxSelectable;

  return (
    <section className="mt-2">
      {/* Form */}
      <div className="grid gap-3 sm:grid-cols-[240px_minmax(0,1fr)_auto]">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Industry</span>
          <select
            className="h-10 rounded-lg border px-3"
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

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Keyword</span>
          <input
            className="h-10 rounded-lg border px-3"
            placeholder="Type a role keyword (e.g., analyst)"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            aria-label="Keyword"
          />
        </label>

        <div className="self-end">
          <button
            type="button"
            className="h-10 rounded-lg border px-4 font-medium"
            onClick={onSearch}
            aria-label="Search roles"
          >
            Search roles
          </button>
        </div>
      </div>

      {/* Messages */}
      {searchError && (
        <div className="mt-3 rounded-md bg-amber-50 text-amber-800 p-3 text-sm">{searchError}</div>
      )}
      {reachedCap && (
        <div
          className="mt-2 inline-flex items-center gap-2 rounded-md border border-black/10 bg-black/5 px-2 py-1 text-xs text-ink"
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
      {isFetching && <div className="mt-3 text-sm text-ink-soft">Searching...</div>}

      {/* Results */}
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {results.map((it) => {
          const picked = pickedIds.includes(it.code);
          const disableAdd = reachedCap && !picked;
          return (
            <li key={it.code}>
              <article className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{it.title}</div>
                    <div className="text-xs text-gray-600">{it.code}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!picked ? (
                      <button
                        type="button"
                        className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-60"
                        onClick={() => onAdd(it)}
                        disabled={disableAdd}
                        title={disableAdd ? addDisabledReason : "Add"}
                        aria-label="Add role"
                      >
                        Add
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                        onClick={() => onRemove(it.code)}
                        aria-label="Remove role"
                      >
                        Remove
                      </button>
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

