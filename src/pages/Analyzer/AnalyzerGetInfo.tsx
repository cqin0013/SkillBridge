// src/pages/analyzer/AnalyzerGetInfo.tsx
// Page: uses AnalyzerLayout (ProgressBar + SummaryDock).
// - Search API requires industry FULL NAME (labelEn). We map from code/slug → name.
// - Re-search always refetches even with the same params.
// - Next button is enabled only when all three questions are completed.
// - Disabled state shows an instant tooltip (no native title delay).
// - On Next, persist facts to Redux and navigate forward.

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";

import AnalyzerLayout from "../../layouts/AnalyzerLayout";
import ComboSearchQuestion from "../../components/analyzer/ComboSearchQuestion";
import SelectQuestion from "../../components/analyzer/SelectQuestion";
import SearchResults from "../../components/analyzer/SearchResults";

import { useStepNav } from "../../hooks/useRouteStep";
import { industryOptions, industryNameOf } from "../../data/industries";
import { AU_STATE_OPTIONS } from "../../data/au-state";

import { useAnzscoSearch } from "../../hooks/queries/userAnzscoSearch";
import type { AnzscoOccupation } from "../../types/domain";

import {
  setPreferredRegion,
  setInterestedIndustryCodes,
  setChosenRoles,
} from "../../store/analyzerSlice";

// Hook param uses industry full name
type SearchParams = { industry: string; keyword: string; limit?: number } | null;

export default function AnalyzerGetInfo() {
  const { goPrev, goNext } = useStepNav();
  const qc = useQueryClient();
  const dispatch = useDispatch();

  // Local drafts
  const [industryCode, setIndustryCode] = useState<string>(""); // store code (A..T) or slug
  const [keyword, setKeyword] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [interests, setInterests] = useState<string[]>([]);
  const [draftRoles, setDraftRoles] = useState<Array<{ id: string; title: string }>>([]);

  // Submitted trigger snapshot
  const [submittedIndustryCode, setSubmittedIndustryCode] = useState<string>("");
  const [submittedKeyword, setSubmittedKeyword] = useState<string>("");

  // UI message for search validation
  const [searchErr, setSearchErr] = useState<string>("");

  // Build API params: map code/slug → FULL NAME (labelEn)
  const params: SearchParams = useMemo(() => {
    const k = submittedKeyword.trim();
    if (!k || k.length < 2) return null;

    const industryFullName = industryNameOf(submittedIndustryCode);
    if (!industryFullName) return null;

    return { industry: industryFullName, keyword: k, limit: 12 };
  }, [submittedIndustryCode, submittedKeyword]);

  // Execute search (returns normalized AnzscoOccupation[])
  const { data, isFetching, isError } = useAnzscoSearch(params);
  const uiResults: AnzscoOccupation[] = data ?? [];

  // Click "Search" → validate + commit snapshot; always refetch even if params unchanged
  const handleSearchClick = (): void => {
    const k = keyword.trim();
    const industryFullName = industryNameOf(industryCode);

    if (!industryFullName) {
      setSearchErr("Please choose an industry.");
      return;
    }
    if (k.length < 2) {
      setSearchErr("Please enter at least 2 characters for the keyword.");
      return;
    }
    setSearchErr("");

    // Commit submitted snapshot
    setSubmittedIndustryCode(industryCode);
    setSubmittedKeyword(k);

    // Force refetch for the concrete key to overwrite any in-memory cache
    qc.invalidateQueries({
      queryKey: ["anzsco", "search", industryFullName, k, 12],
    });
  };

  // Selected ids for highlight/disable
  const pickedIds = useMemo(() => draftRoles.map((r) => r.id), [draftRoles]);

  // Add/remove role
  const handleAddRole = (occ: AnzscoOccupation): void => {
    setDraftRoles((prev) =>
      prev.some((x) => x.id === occ.code) ? prev : prev.concat({ id: occ.code, title: occ.title }),
    );
  };
  const handleRemoveRole = (code: string): void => {
    setDraftRoles((prev) => prev.filter((x) => x.id !== code));
  };

  // Guard for Next
  const nextBlockers: string[] = useMemo(() => {
    const blocks: string[] = [];
    if (!draftRoles.length) blocks.push("Pick at least 1 role via Search.");
    if (!region) blocks.push("Select a preferred location.");
    if (!interests.length) blocks.push("Select at least 1 interested industry.");
    return blocks;
  }, [draftRoles.length, region, interests.length]);

  const nextDisabled = nextBlockers.length > 0;

  // Persist to Redux and go next
  const handleSubmitAndNext = (): void => {
    if (nextDisabled) return;
    dispatch(setPreferredRegion(region || undefined));
    dispatch(setInterestedIndustryCodes(interests)); // still store codes
    dispatch(setChosenRoles(draftRoles));
    goNext();
  };

  // Flags for empty-result messaging
  const noResults =
    !isFetching && !isError && params && Array.isArray(uiResults) && uiResults.length === 0;

  return (
    <AnalyzerLayout
      summaryDrafts={{
        region,
        industryCodes: interests,
        roles: draftRoles,
      }}
    >
      {/* Title + subtitle */}
      <header className="mt-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-ink">Tell us about your background</h1>
        <p className="mt-2 text-ink-soft">
          Select your previous industry and search related roles. Then choose your preferred location and the industries you are interested in.
        </p>
      </header>

      {/* 1) Industry + keyword + Search */}
      <section className="mt-8">
        <ComboSearchQuestion
          title="1. Your previous industry and role search"
          subtitle="Choose an industry and enter a keyword, then click Search."
          selectLabel="Industry"
          selectPlaceholder="All industries"
          selectOptions={industryOptions} // value = code (A..T)
          selectValue={industryCode}
          onSelectChange={setIndustryCode}
          inputLabel="Keyword"
          inputPlaceholder="Type a role keyword (e.g., analyst)"
          inputValue={keyword}
          onInputChange={setKeyword}
          buttonLabel="Search roles"
          onSubmit={handleSearchClick}
        />

        {/* Validation + network feedback */}
        {searchErr && (
          <div className="mt-3 rounded-md bg-amber-50 text-amber-800 p-3 text-sm">{searchErr}</div>
        )}

        {/* API failure → friendly message with Feedback link */}
        {isError && (
          <div className="mt-3 rounded-md bg-red-50 text-red-700 p-3 text-sm">
            We're having an issue right now. Please try again later or let us know via{" "}
            <Link to="/Feedback" className="underline font-medium">
              Feedback
            </Link>
            .
          </div>
        )}

        {/* No results for this industry/keyword */}
        {noResults && (
          <div className="mt-3 rounded-md bg-blue-50 text-blue-900 p-3 text-sm">
            No roles found for this keyword in the selected industry. Try another industry or
            keyword.
          </div>
        )}

        {isFetching && <div className="mt-3 text-sm text-ink-soft">Searching…</div>}

        {/* Results */}
        <SearchResults<AnzscoOccupation>
          items={uiResults}
          pickedIds={pickedIds}
          onAdd={handleAddRole}
          onRemove={handleRemoveRole}
        />
      </section>

      {/* Selected roles preview (chips) */}
      <section className="mt-6">
        <h3 className="text-sm font-semibold text-ink">Selected roles ({draftRoles.length})</h3>
        {draftRoles.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Nothing selected yet.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {draftRoles.map((r) => (
              <span
                key={r.id}
                className="inline-flex items-center gap-2 h-8 px-3 rounded-full border border-black/15 bg-black/5 text-sm"
              >
                {r.title}
                <button
                  type="button"
                  onClick={() => handleRemoveRole(r.id)}
                  aria-label={`Remove ${r.title}`}
                  className="h-5 w-5 grid place-items-center rounded-full border border-black/20 bg-white text-ink hover:bg-black/5"
                >
                  <span aria-hidden>×</span>
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 2) Preferred location (single) */}
      <section className="mt-10">
        <SelectQuestion
          mode="single"
          title="2. Preferred location (single choice)"
          subtitle="Choose all if you are not sure"
          options={AU_STATE_OPTIONS}
          value={region ? [region] : []}
          onChange={(arr) => setRegion(arr[0] ?? "")}
          columns={2}
          helperText="This helps us surface more relevant roles."
          name="preferred-location"
        />
      </section>

      {/* 3) Interested industries (multi) */}
      <section className="mt-10">
        <SelectQuestion
          title="3. Which industries interest you? (multi-select)"
          subtitle=""
          helperText=" "
          options={industryOptions}
          value={interests}
          onChange={setInterests}
          maxSelected={20}
          columns={2}
        />
      </section>

      {/* Footer actions with instant tooltip */}
      <footer className="mt-10 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={goPrev}
          className="h-11 px-5 rounded-full border border-black/15 bg-white text-ink"
        >
          Back
        </button>

        <div className="relative group">
          <button
            type="button"
            onClick={handleSubmitAndNext}
            disabled={nextDisabled}
            className={`h-11 px-6 rounded-full font-semibold ${
              nextDisabled ? "bg-gray-300 text-white cursor-not-allowed" : "bg-primary text-white"
            }`}
          >
            Next
          </button>

          {/* Instant tooltip on hover/focus when disabled */}
          {nextDisabled && (
            <div
              role="tooltip"
              className="pointer-events-none absolute right-0 -top-2 translate-y-[-100%] w-72
                         rounded-md border border-black/10 bg-neutral-900 text-white text-xs
                         shadow-lg p-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
                         transition-opacity"
            >
              <div className="font-semibold mb-1">Complete before continuing:</div>
              <ul className="list-disc pl-4 space-y-0.5">
                {nextBlockers.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </footer>

      {/* Always-on lightweight hint below when disabled */}
      {nextDisabled && (
        <p className="mt-2 text-xs text-amber-700">Complete: {nextBlockers.join(" • ")}</p>
      )}
    </AnalyzerLayout>
  );
}
