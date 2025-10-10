// src/pages/analyzer/AnalyzerGetInfo.tsx
// Uses AnalyzerLayout header (Title + HelpToggle) and ProgressBar + SummaryDock.
// - Search API requires the industry's FULL NAME; we map code/slug → name.
// - Re-search always refetches even with the same params.
// - Next enabled only when all three questions are completed.
// - On Next, persist to Redux and pass router state as fallback to the next step.
// - Cap selected roles to MAX_ROLES with tooltip and helper messages.

import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";

import ErrorBoundary from "../../components/common/ErrorBoundary";
import AnalyzerLayout from "../../layouts/AnalyzerLayout";
import SelectQuestion from "../../components/analyzer/SelectQuestion";
import Button from "../../components/ui/Button";
import SearchComboWithResults from "../../components/analyzer/SearchComboWithResults";

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
import type { RootState } from "../../store";
import type { AnalyzerRouteState } from "../../types/routes";

// ---- Maximum selected roles allowed on this step ----
const MAX_ROLES = 5;

// Hook param uses industry full name
type SearchParams = { industry: string; keyword: string; limit?: number } | null;

/** Page body isolated so the route-level ErrorBoundary can wrap it cleanly */
function PageBody(): React.ReactElement {
  const { goPrev, goNext } = useStepNav();
  const qc = useQueryClient();
  const dispatch = useDispatch();

  // Read persisted selections to hydrate local drafts
  const persisted = useSelector((s: RootState) => s.analyzer);

  // Local drafts (lazy init from Redux so Back restores selections)
  const [industryCode, setIndustryCode] = useState<string>(""); // store code (A..T) or slug
  const [keyword, setKeyword] = useState<string>("");
  const [region, setRegion] = useState<string>(persisted.preferredRegion ?? "");
  const [interests, setInterests] = useState<string[]>(
    persisted.interestedIndustryCodes ?? []
  );
  const [draftRoles, setDraftRoles] = useState<Array<{ id: string; title: string }>>(
    persisted.chosenRoles ?? []
  );

  // Submitted snapshot used by the search hook
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
    // Allow searching even if cap reached; user just cannot add more.
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

    setSubmittedIndustryCode(industryCode);
    setSubmittedKeyword(k);

    // Force refetch for this concrete key
    qc.invalidateQueries({
      queryKey: ["anzsco", "search", industryFullName, k, 12],
    });
  };

  // Selected ids for highlight/disable
  const pickedIds = useMemo(() => draftRoles.map((r) => r.id), [draftRoles]);

  // Add/remove role (id = ANZSCO code; title = occupation title)
  const handleAddRole = (occ: AnzscoOccupation): void => {
    if (draftRoles.length >= MAX_ROLES) return; // cap
    setDraftRoles((prev) =>
      prev.some((x) => x.id === occ.code) ? prev : prev.concat({ id: occ.code, title: occ.title })
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

  // Persist to Redux and go next with router-state fallback
  const handleSubmitAndNext = (): void => {
    if (nextDisabled) return;

    const preferred: string | null = region ?? null;
    const industries: string[] | null = interests.length > 0 ? interests : null;

    dispatch(setPreferredRegion(preferred));
    dispatch(setInterestedIndustryCodes(industries));
    dispatch(setChosenRoles(draftRoles));

    const state: AnalyzerRouteState = {
      roles: draftRoles.length ? draftRoles : undefined,
      region: region || undefined,
      industries: interests.length ? interests : undefined,
    };

    goNext(state);
  };

  // Flags for empty-result messaging
  const noResults = Boolean(
    !isFetching && !isError && params && Array.isArray(uiResults) && uiResults.length === 0
  );

  // Derived flags for cap
  const reachedCap = draftRoles.length >= MAX_ROLES;
  const addDisabledReason =
    "You have reached the limit of 5 roles. Remove one to add another.";

  return (
    <AnalyzerLayout
      summaryDrafts={{ region, industryCodes: interests, roles: draftRoles }}
      title="Tell us about your background"
      helpContent={{
        title: "What to do on this page",
        subtitle:
          "Choose your previous industry, search and pick at least one role, then set a preferred location and interested industries.",
        features: [
          "Search requires a keyword of at least 2 characters.",
          "Industry must be selected to enable search.",
          "Select up to five roles only.",
        ],
        tips: [
          "Select at most five roles. Pick the most representative work experiences to avoid unnecessary analysis noise.",
        ],
      }}
    >
      {/* Unified form + results */}
      <SearchComboWithResults
        industryOptions={industryOptions}
        industryCode={industryCode}
        onIndustryChange={setIndustryCode}
        keyword={keyword}
        onKeywordChange={setKeyword}
        onSearch={handleSearchClick}
        searchError={searchErr}
        results={uiResults}
        isFetching={isFetching}
        isError={isError}
        noResults={noResults}
        pickedIds={pickedIds}
        onAdd={handleAddRole}
        onRemove={handleRemoveRole}
        maxSelectable={MAX_ROLES}
        selectedCount={draftRoles.length}
        addDisabledReason={addDisabledReason}
      />

      {/* Selected roles preview (chips) */}
      <section className="mt-6">
        <h3 className="text-sm font-semibold text-ink">
          Selected roles ({draftRoles.length}/{MAX_ROLES})
        </h3>
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
                  className="h-5 w-5 grid place-items-center rounded-full border border-black/20 bg-white text-ink hover:bg-black/5 text-xs leading-none"

                >
                  <span aria-hidden>×</span>
                </button>
              </span>
            ))}
          </div>
        )}
        {reachedCap && (
          <p className="mt-2 text-xs text-ink-soft">
            You have selected the maximum of {MAX_ROLES}. Remove one to add another.
          </p>
        )}
      </section>

      {/* Preferred location (single) */}
      <section className="mt-10">
        <SelectQuestion
          mode="single"
          title="2. Preferred location (single choice)"
          subtitle="Choose all if you are not sure"
          options={AU_STATE_OPTIONS}
          value={region ? [region] : []}
          onChange={(arr) => setRegion(arr[0] ?? "")}
          columns={2}
          name="preferred-location"
        />
      </section>

      {/* Interested industries (multi) */}
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

      {/* Footer actions */}
      <footer className="mt-10 flex items-center justify-end gap-3">
        <Button variant="ghost" size="md" onClick={goPrev} aria-label="Go back to previous step">
          Back
        </Button>

        <div className="relative group">
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmitAndNext}
            disabled={nextDisabled}
            aria-label={nextDisabled ? "Disabled. Complete required fields." : "Go to next step"}
          >
            Next
          </Button>

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

      {nextDisabled && (
        <p className="mt-2 text-xs text-amber-700">Complete: {nextBlockers.join(" • ")}</p>
      )}
    </AnalyzerLayout>
  );
}

export default function AnalyzerGetInfo(): React.ReactElement {
  // Route-level boundary isolates failures within this page
  return (
    <ErrorBoundary feedbackHref="/feedback">
      <PageBody />
    </ErrorBoundary>
  );
}
