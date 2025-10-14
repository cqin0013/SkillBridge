// Get Info step for the Analyzer wizard
// - Uses AnalyzerLayout header (Title + HelpToggle) and ProgressBar + SummaryDock
// - Search API requires the industry's FULL NAME; we map code/slug → name
// - Re-search always refetches even with the same params
// - Next enabled only when all three questions are completed
// - On Next, persist to Redux and pass router state as fallback to the next step
// - Cap selected roles to MAX_ROLES with tooltip and helper messages
// - Validate inputs strictly: industry code and ANZSCO code
// - Normalize roles before persisting: { id, title }
// - Uses TutorialLauncher component for guided walkthrough

import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import AnalyzerLayout from "../../layouts/AnalyzerLayout";
import SelectQuestion from "../../components/analyzer/SelectQuestion";
import Button from "../../components/ui/Button";
import SearchComboWithResults from "../../components/analyzer/SearchComboWithResults";
// Tutorial system: launcher opens a step-by-step spotlight overlay
import TutorialLauncher from "../../components/tutorial/TutorialLauncher";

import { useStepNav } from "../../hooks/useRouteStep";
import { industryOptions, industryNameOf } from "../../data/industries";
import { AU_STATE_OPTIONS } from "../../data/au-state";
import { getInfoTutorialSteps } from "../../data/GetInfoTutorialSteps";

import { useAnzscoSearch } from "../../hooks/queries/userAnzscoSearch";
import type { AnzscoOccupation } from "../../types/domain";

import {
  setPreferredRegion,
  setInterestedIndustryCodes,
  setChosenRoles,
} from "../../store/analyzerSlice";
import type { RootState } from "../../store";
import type { AnalyzerRouteState } from "../../types/routes";

// Maximum selected roles allowed on this step
const MAX_ROLES = 5;

// Hook param uses industry full name
type SearchParams = { industry: string; keyword: string; limit?: number } | null;

/**
 * Validate that a string is a supported industry code present in options.
 */
function isValidIndustryCode(code: string): boolean {
  if (!code) return false;
  return industryOptions.some((opt) => opt.value === code);
}

/**
 * Validate ANZSCO code (commonly 6 digits). Adjust if your backend differs.
 */
function isValidAnzscoCode(code: string): boolean {
  return typeof code === "string" && /^\d{6}$/.test(code.trim());
}

/**
 * Normalize any role-like input into { id, title } with de-duplication.
 * Ensures consistent { id, title } shape for Redux and route state.
 */
function normalizeRoles(
  roles: Array<{ id?: string; title?: string } | { code?: string; title?: string } | string>
): Array<{ id: string; title: string }> {
  const out: Array<{ id: string; title: string }> = [];
  const seen = new Set<string>();
  for (const r of roles) {
    let id = "";
    let title = "";
    if (typeof r === "string") {
      id = r.trim();
      title = r.trim();
    } else if ("id" in r && typeof r.id === "string") {
      id = r.id.trim();
      title = (r.title ?? r.id).trim();
    } else if ("code" in r && typeof r.code === "string") {
      id = r.code.trim();
      title = (r.title ?? r.code).trim();
    }
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, title });
  }
  return out;
}

/**
 * Page body isolated so the route-level ErrorBoundary can wrap it cleanly.
 * Handles all local UI state, server queries, validation, and persistence.
 */
function PageBody(): React.ReactElement {
  const { goPrev, goNext } = useStepNav();
  const qc = useQueryClient();
  const dispatch = useDispatch();

  // Read persisted selections to hydrate local drafts (Back will restore)
  const persisted = useSelector((s: RootState) => s.analyzer);

  // Local drafts (lazy init from Redux)
  const [industryCode, setIndustryCode] = useState<string>("");
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

  // UI message for search validation feedback
  const [searchErr, setSearchErr] = useState<string>("");

  /**
   * Build API params for the search hook:
   * - Map industry code → full industry name (API requires full name)
   * - Require minimum 2 chars for keyword to avoid noisy queries
   * - Return null to disable hook when invalid
   */
  const params: SearchParams = useMemo(() => {
    const k = submittedKeyword.trim();
    if (!k || k.length < 2) return null;

    if (!isValidIndustryCode(submittedIndustryCode)) return null;
    const industryFullName = industryNameOf(submittedIndustryCode);
    if (!industryFullName) return null;

    return { industry: industryFullName, keyword: k, limit: 12 };
  }, [submittedIndustryCode, submittedKeyword]);

  // Execute search (returns normalized AnzscoOccupation[])
  const { data, isFetching, isError } = useAnzscoSearch(params);
  const uiResults: AnzscoOccupation[] = data ?? [];

  /**
   * Click "Search":
   * - Validate current draft inputs
   * - Commit snapshot to trigger hook
   * - Force refetch via invalidateQueries even if key is the same
   */
  const handleSearchClick = (): void => {
    const k = keyword.trim();

    if (!isValidIndustryCode(industryCode)) {
      setSearchErr("Please choose a valid industry.");
      return;
    }
    const industryFullName = industryNameOf(industryCode);
    if (!industryFullName) {
      setSearchErr("Please choose a valid industry.");
      return;
    }
    if (k.length < 2) {
      setSearchErr("Please enter at least 2 characters for the keyword.");
      return;
    }
    setSearchErr("");

    setSubmittedIndustryCode(industryCode);
    setSubmittedKeyword(k);

    // Force refetch for this concrete key to ensure "re-search always refetches"
    qc.invalidateQueries({
      queryKey: ["anzsco", "search", industryFullName, k, 12],
    });
  };

  // Selected ids for highlight/disable in the result list
  const pickedIds = useMemo(() => draftRoles.map((r) => r.id), [draftRoles]);

  /**
   * Add role (id = ANZSCO code; title = occupation title).
   * Validates ANZSCO format and respects MAX_ROLES cap.
   */
  const handleAddRole = (occ: AnzscoOccupation): void => {
    if (!isValidAnzscoCode(occ.code)) return;
    if (draftRoles.length >= MAX_ROLES) return;
    setDraftRoles((prev) =>
      prev.some((x) => x.id === occ.code) ? prev : [...prev, { id: occ.code, title: occ.title }]
    );
  };

  /**
   * Remove role by id.
   */
  const handleRemoveRole = (id: string): void => {
    setDraftRoles((prev) => prev.filter((x) => x.id !== id));
  };

  /**
   * Compute blockers for enabling the Next button.
   * Next is enabled only when all three questions are completed.
   */
  const nextBlockers: string[] = useMemo(() => {
    const blocks: string[] = [];
    if (!draftRoles.length) blocks.push("Pick at least 1 role via Search.");
    if (!region) blocks.push("Select a preferred location.");
    if (!interests.length) blocks.push("Select at least 1 interested industry.");
    return blocks;
  }, [draftRoles, region, interests]);

  const nextDisabled = nextBlockers.length > 0;

  /**
   * Persist local drafts to Redux, then navigate to the next step.
   * - Re-validate and normalize roles
   * - Filter interests to valid industry codes
   * - Pass a route-state snapshot as a fallback for the next page
   */
  const handleSubmitAndNext = (): void => {
    if (nextDisabled) return;

    const cleanedRoles = draftRoles.filter((r) => isValidAnzscoCode(r.id));
    const normalized = normalizeRoles(cleanedRoles);

    dispatch(setChosenRoles(normalized));
    dispatch(setPreferredRegion(region));

    const cleanedInterests = interests.filter(isValidIndustryCode);
    dispatch(setInterestedIndustryCodes(cleanedInterests));

    const state: AnalyzerRouteState = {
      roles: normalized,
      region,
      industries: cleanedInterests,
    };

    goNext(state);
  };

  // Helper message for role cap
  const maxMsg =
    draftRoles.length >= MAX_ROLES
      ? `You have reached the maximum of ${MAX_ROLES} roles.`
      : `Select up to ${MAX_ROLES} roles.`;

  // No-results detection for better UX hints
  const noResults =
    !isFetching && !isError && uiResults.length === 0 && submittedKeyword.length >= 2;

  return (
    <AnalyzerLayout
      title="Get info"
      helpContent={{
        title: "How to use this page",
        subtitle: "Tell us about your career preferences and interests.",
        features: [
          "Search for occupations by industry and keyword (up to 5 selections).",
          "Choose your preferred work location in Australia.",
          "Select industries that interest you (multi-select, up to 20).",
        ],
        tips: [
          "Use the Search function to explore roles; submit selections with the chip.",
          "Re-search anytime — same params refetch; Remove chips via ×.",
          "Check the summary sidebar on the right to review your current selections at any time.",
          "Hover over the disabled 'Next' button to see what's required to proceed.",
        ],
      }}
      summaryDrafts={{
        region,
        industryCodes: interests,
        roles: draftRoles, // { id, title }[]
      }}
    >
      {/* Tutorial Launcher in the top-right corner. 
         * Opens a spotlight walkthrough that references elements by data-section. */}
        <TutorialLauncher
          steps={getInfoTutorialSteps}
          label="View Tutorial"
          placement="inline"
          variant="outline"

        />


      {/* Role search (Q1) */}
      <section className="mt-8" data-section="role-search">
        <h2 className="text-xl font-semibold text-ink mb-4">
          1. Which occupation roles are you interested in?
        </h2>

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
          addDisabledReason={`Maximum ${MAX_ROLES} roles can be selected.`}
        />

        {/* Selected roles chips */}
        {draftRoles.length > 0 && (
          <div className="mt-4" data-role-chips>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-medium text-ink">Selected roles:</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {draftRoles.length} / {MAX_ROLES}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {draftRoles.map((role) => (
                <span
                  key={role.id}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-sm text-ink"
                >
                  <span>{role.title}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRole(role.id)}
                    className="ml-1 rounded-full hover:bg-primary/20 p-0.5 transition-colors"
                    aria-label={`Remove ${role.title}`}
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-soft">{maxMsg}</p>
          </div>
        )}
      </section>

      {/* Location (Q2) */}
      <section className="mt-8" data-section="location">
        <SelectQuestion
          title="2. What is your preferred work location?"
          options={AU_STATE_OPTIONS}
          value={region ? [region] : []}
          onChange={(arr) => setRegion(arr[0] ?? "")}
          helperText="Choose a location..."
          mode="single"
        />
      </section>

      {/* Industries (Q3) */}
      <section className="mt-8" data-section="industries">
        <SelectQuestion
          title="3. Which industries are you interested in?"
          options={industryOptions}
          value={interests}
          onChange={setInterests}
          helperText="Select industries..."
          mode="multiple"
          maxSelected={20}
        />
      </section>

      {/* Footer: Back + Next */}
      <footer className="mt-12 flex items-center justify-end gap-3">
        <Button variant="ghost" size="md" onClick={goPrev} aria-label="Go back to intro">
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

          {/* Tooltip explaining blockers when Next is disabled */}
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

      {/* Inline reminder as text when disabled */}
      {nextDisabled && (
        <p className="mt-2 text-xs text-amber-700">
          Complete: {nextBlockers.join(" • ")}
        </p>
      )}
    </AnalyzerLayout>
  );
}

/**
 * Main component with error boundary wrapper.
 * Keeps the page resilient to render-time errors and links to feedback.
 */
export default function AnalyzerGetInfo(): React.ReactElement {
  return (
    <ErrorBoundary feedbackHref="/feedback">
      <PageBody />
    </ErrorBoundary>
  );
}
