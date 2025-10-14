import { useMemo, useState } from "react";
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

const CARD_BODY_MAX_H = 96; // px
const MAX_KEYWORD_LEN = 20; // Max characters allowed for keyword

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
  /** Track expanded cards */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  /** Track which cards overflow and need a toggle */
  const [overflow, setOverflow] = useState<Record<string, boolean>>({});

  const reachedCap = selectedCount >= maxSelectable;

  const trimmed = keyword.trim();

  /** English letters only validation (empty is allowed so user can type) */
  const englishOk = trimmed === "" || /^[A-Za-z][A-Za-z\s'-]*$/.test(trimmed);

  /** True when keyword length exceeds the 20 char limit */
  const tooLong = trimmed.length > MAX_KEYWORD_LEN;

  const makeMeasureRef = (code: string) => (el: HTMLDivElement | null) => {
    if (!el) return;
    const need = el.scrollHeight > CARD_BODY_MAX_H + 1;
    setOverflow((p) => (p[code] === need ? p : { ...p, [code]: need }));
  };

  const industryOptionsWithPlaceholder = useMemo<Option[]>(
    () => [{ value: "", label: "Select an industry…" }, ...industryOptions],
    [industryOptions],
  );

  return (
    <section className="mt-2">
      {/* Search form */}
      <div className="grid gap-3 sm:grid-cols-[300px_minmax(0,1fr)_auto]">
        {/* Industry select */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Industry</span>
          <select
            className="h-10 w-full min-w-[260px] rounded-lg border border-border px-3"
            value={industryCode}
            onChange={(e) => onIndustryChange(e.target.value)}
            aria-label="Industry"
          >
            {industryOptionsWithPlaceholder.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {/* Keyword input */}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">
            Keyword <span className="text-ink-soft">(max {MAX_KEYWORD_LEN})</span>
          </span>
          <input
            className="h-10 rounded-lg border border-border px-3"
            placeholder="Type a role keyword (e.g., analyst)"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            aria-label="Keyword"
            // Hard limit in the input element to stop further typing
            maxLength={MAX_KEYWORD_LEN}
          />
        </label>

        {/* Search button */}
        <div className="self-end">
          <Button
            variant="primary"
            size="md"
            onClick={onSearch}
            aria-label="Search roles"
            // Disable when non-English or too long
            disabled={!englishOk || tooLong}
            tooltipWhenDisabled={
              !englishOk
                ? "Please enter English letters only."
                : tooLong
                ? `Please use at most ${MAX_KEYWORD_LEN} characters.`
                : undefined
            }
          >
            Search roles
          </Button>
        </div>
      </div>

      {/* Validation messages */}
      {!englishOk && (
        <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-900">
          Please enter English letters only.
        </div>
      )}

      {tooLong && (
        <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Your keyword is too long. Use at most {MAX_KEYWORD_LEN} characters.
        </div>
      )}

      {searchError && (
        <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-900">{searchError}</div>
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
        <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-900">
          Our system may be having an issue right now. Please try again later or{" "}
          <a
            href="/feedback"
            className="font-medium underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            send feedback
          </a>
          .
        </div>
      )}

      {noResults && englishOk && !isFetching && !tooLong && (
        <div className="mt-3 rounded-md bg-blue-50 p-3 text-sm text-blue-900">
          This industry does not contain roles matching your keyword. Please verify your input or try a different
          industry.
        </div>
      )}

      {isFetching && <div className="mt-3 text-sm text-ink-soft">Searching…</div>}

      {/* Results grid */}
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {results.map((it) => {
          const picked = pickedIds.includes(it.code);
          const disableAdd = reachedCap && !picked;

          const rawDesc = (it as { description?: unknown }).description;
          const desc: string = typeof rawDesc === "string" ? rawDesc : "";
          const hasDesc = desc.trim().length > 0;
          const expandedNow = Boolean(expanded[it.code]);
          const showToggle = hasDesc && (overflow[it.code] ?? false); // Show toggle only when overflowing

          return (
            <li key={it.code} className="h-full">
              <article className="relative h-full rounded-xl border border-border p-4 shadow-card">
                <div className="flex h-full flex-col">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 max-w-full">
                      <div className="flex items-start gap-2">
                        <h4
                          className="min-w-0 break-words whitespace-normal text-sm font-semibold leading-5 text-ink"
                          title={it.title}
                        >
                          {it.title}
                        </h4>
                        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-ink-soft">
                          {it.code}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {!picked ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onAdd(it)}
                          disabled={disableAdd}
                          aria-label="Add role"
                          tooltipWhenDisabled={
                            disableAdd
                              ? addDisabledReason ??
                                `Limit reached: maximum ${maxSelectable} roles. Remove one before adding.`
                              : undefined
                          }
                        >
                          Add
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => onRemove(it.code)} aria-label="Remove role">
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  {hasDesc && (
                    <div className="relative mt-2">
                      <div
                        ref={makeMeasureRef(it.code)}
                        className={`break-words whitespace-normal text-xs leading-5 text-ink-soft ${
                          expandedNow ? "" : "max-h-[96px] overflow-hidden"
                        }`}
                        style={!expandedNow ? { maxHeight: CARD_BODY_MAX_H } : undefined}
                      >
                        {desc}
                      </div>

                      {!expandedNow && showToggle && (
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent" />
                      )}

                      {showToggle && (
                        <button
                          type="button"
                          onClick={() => setExpanded((p) => ({ ...p, [it.code]: !p[it.code] }))}
                          className="absolute bottom-1 right-0 translate-y-0 rounded-full p-1 text-ink-soft hover:text-ink"
                          aria-label={expandedNow ? "Collapse" : "Expand to view all"}
                          title={expandedNow ? "Collapse" : "View full description"}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                            {expandedNow ? (
                              <path d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
                            ) : (
                              <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
                            )}
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
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
