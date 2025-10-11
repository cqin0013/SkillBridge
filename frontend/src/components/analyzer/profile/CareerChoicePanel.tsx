// src/components/analyzer/profile/CareerChoicePanel.tsx
import React, { useMemo, useState } from "react";
import { Briefcase, Target as TargetIcon, MapPin, X } from "lucide-react";
import type { AnzscoOccupation } from "../../../types/domain";
import SearchComboWithResults from "../SearchComboWithResults";
import type { RoleLite, SelectedJob } from "../../../store/analyzerSlice";

type SelectedJobValue = Exclude<SelectedJob, null>;

/** A strongly-typed shape of the panel state */
export type CareerChoiceState = {
  pastJobs: RoleLite[];
  targetJob: SelectedJobValue | null;
  region: string; // region string in English
};

/** Minimal option shape reused by the search combo */
export type Option = { value: string; label: string };

/** Inputs that drive the occupation search combo (controlled by parent) */
export type OccupationSearchInputs = {
  industryOptions: readonly Option[];
  industryCode: string;
  onIndustryChange: (code: string) => void;

  keyword: string;
  onKeywordChange: (kw: string) => void;

  onSearch: () => void;

  results: readonly AnzscoOccupation[];
  isFetching: boolean;
  isError: boolean;
  noResults: boolean;
  searchError?: string;
};

/** Props expected from parent */
export type CareerChoicePanelProps = {
  value: CareerChoiceState;
  onChange: (next: CareerChoiceState) => void;
  regionOptions: string[];
  SelectQuestion: React.ComponentType<SelectQuestionProps>;
  occupationSearch: OccupationSearchInputs;
  labels?: {
    pastJobs?: string;
    targetJob?: string;
    region?: string;
    edit?: string;
    empty?: string;
    pastJobsHelp?: string;
    targetJobHelp?: string;
    regionHelp?: string;
  };
};

/** Contract for the injected SelectQuestion used for region single-select */
export type SelectQuestionProps = {
  title: string;
  open: boolean;
  options: string[];
  value: string | null;
  onClose: () => void;
  onSave: (value: string) => void;
  helperText?: string;
};

/** Local UI state to control which editor is open */
type EditorState =
  | { kind: "idle" }
  | { kind: "editPast" }
  | { kind: "editTarget" }
  | { kind: "editRegion" };

/**
 * Desktop: show all three sections inside ONE bordered box, laid out as a table:
 * - Past 37.5% | Target 25% | Region 37.5%
 * - Vertical separators between columns
 * Mobile/tablet: stacked vertically with spacing between rows
 * Editors: enlarged modal; show selected chips under search with remove button
 * Data rule: store occupation code for APIs but show the readable title
 */
export default function CareerChoicePanel(props: CareerChoicePanelProps) {
  const {
    value,
    onChange,
    regionOptions,
    SelectQuestion,
    occupationSearch,
    labels,
  } = props;

  const text = useMemo(
    () => ({
      pastJobs: labels?.pastJobs ?? "Past",
      targetJob: labels?.targetJob ?? "Target",
      region: labels?.region ?? "Region",
      edit: labels?.edit ?? "Edit",
      empty: labels?.empty ?? "None",
      pastJobsHelp:
        labels?.pastJobsHelp ??
        "You can choose up to 5 past occupations. Stored with their official code.",
      targetJobHelp:
        labels?.targetJobHelp ??
        "Choose a single target occupation. Stored with its official code.",
      regionHelp: labels?.regionHelp ?? "Choose one region (English).",
    }),
    [labels]
  );

  const [editor, setEditor] = useState<EditorState>({ kind: "idle" });

  /** Save helpers that persist RoleLite / SelectedJob entries */
  const updatePast = (next: RoleLite[]) => {
    const unique = Array.from(new Map(next.map((role) => [role.id, role])).values()).slice(0, 5);
    onChange({ ...value, pastJobs: unique });
  };

  const updateTarget = (next: SelectedJobValue | null) => {
    onChange({ ...value, targetJob: next });
  };

  const saveRegion = (next: string) => {
    onChange({ ...value, region: next });
    setEditor({ kind: "idle" });
  };

  /** Chips renderer for summary */
  const Chips: React.FC<{ items: RoleLite[] }> = ({ items }) => {
    if (items.length === 0) return <span className="text-ink-soft">{text.empty}</span>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((role) => (
          <span
            key={role.id}
            className="rounded-full border border-border bg-gray-50 px-2 py-0.5 text-xs text-ink"
          >
            {role.title || role.id}
          </span>
        ))}
      </div>
    );
  };

  const toRoleLite = (occ: AnzscoOccupation): RoleLite => ({
    id: occ.code,
    title: occ.title || occ.code,
  });

  const toSelectedJob = (occ: AnzscoOccupation): SelectedJobValue => ({
    code: occ.code,
    title: occ.title || occ.code,
  });

  const addPast = (occ: AnzscoOccupation): void => {
    const next = [...value.pastJobs, toRoleLite(occ)];
    updatePast(next);
  };
  const removePast = (id: string): void => {
    const next = value.pastJobs.filter((role) => role.id !== id);
    updatePast(next);
  };

  const addTarget = (occ: AnzscoOccupation): void => {
    updateTarget(toSelectedJob(occ));
  };
  const removeTarget = (): void => {
    updateTarget(null);
  };

  /** Selected chips row under the search */
  const SelectedChipsRow: React.FC<{
    picked: Array<{ id: string; title: string }>;
    onRemove: (id: string) => void;
    max?: number;
  }> = ({ picked, onRemove, max }) => {
    if (!picked.length) return null;
    return (
      <div className="mt-4">
        <div className="mb-2 text-xs text-ink-soft">
          Selected {max ? `(${picked.length}/${max})` : `(${picked.length})`}
        </div>
        <div className="flex flex-wrap gap-2">
          {picked.map((item) => (
            <span
              key={item.id}
              className="group inline-flex items-center gap-1 rounded-full border border-border bg-gray-50 px-2 py-0.5 text-xs text-ink"
            >
              {item.title || item.id}
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-ink-soft hover:bg-gray-200"
                aria-label={`Remove ${item.title}`}
                title="Remove"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-4">
      {/* Single box that contains all three segments */}
      <div className="rounded-xl border border-border p-4 shadow-card">
        {/* Desktop: table-like layout with three columns; Mobile: stacked rows with spacing */}
        {/* Mobile/Tablet stacked */}
        <div className="flex lg:hidden flex-col gap-4">
          {/* Past */}
          <div className="flex items-center gap-2 min-w-0">
            <Briefcase className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="text-xs font-semibold shrink-0 text-ink">{text.pastJobs}:</span>
            <div className="flex-1 min-w-0">
              <Chips items={value.pastJobs} />
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg bg-primary text-ink-invert px-2.5 py-1 text-xs font-semibold hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1 shadow-sm"
              onClick={() => setEditor({ kind: "editPast" })}
              aria-label={`Edit ${text.pastJobs}`}
            >
              {text.edit}
            </button>
          </div>

          <div className="h-px bg-border" />

          {/* Target */}
          <div className="flex items-center gap-2 min-w-0">
            <TargetIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="text-xs font-semibold shrink-0 text-ink">{text.targetJob}:</span>
            <div className="flex-1 min-w-0 text-sm truncate text-ink">
              {value.targetJob ? value.targetJob.title : <span className="text-ink-soft">{text.empty}</span>}
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg bg-primary text-ink-invert px-2.5 py-1 text-xs font-semibold hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1 shadow-sm"
              onClick={() => setEditor({ kind: "editTarget" })}
              aria-label={`Edit ${text.targetJob}`}
            >
              {text.edit}
            </button>
          </div>

          <div className="h-px bg-border" />

          {/* Region */}
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="text-xs font-semibold shrink-0 text-ink">{text.region}:</span>
            <div className="flex-1 min-w-0 text-sm truncate text-ink">{value.region}</div>
            <button
              type="button"
              className="shrink-0 rounded-lg bg-primary text-ink-invert px-2.5 py-1 text-xs font-semibold hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1 shadow-sm"
              onClick={() => setEditor({ kind: "editRegion" })}
              aria-label={`Edit ${text.region}`}
            >
              {text.edit}
            </button>
          </div>
        </div>

        {/* Desktop: true table for precise 37.5% | 25% | 37.5% with vertical separators */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col style={{ width: "37.5%" }} />
              <col style={{ width: "25%" }} />
              <col style={{ width: "37.5%" }} />
            </colgroup>
            <tbody>
              <tr className="align-top">
                {/* Past */}
                <td className="pr-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <Briefcase className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="text-xs font-semibold shrink-0 text-ink">{text.pastJobs}:</span>
                    <div className="flex-1 min-w-0">
                      <Chips items={value.pastJobs} />
                    </div>
                    <button
                      type="button"
                      className="shrink-0 rounded-lg bg-primary text-ink-invert px-2.5 py-1 text-xs font-semibold hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1 shadow-sm"
                      onClick={() => setEditor({ kind: "editPast" })}
                      aria-label={`Edit ${text.pastJobs}`}
                    >
                      {text.edit}
                    </button>
                  </div>
                </td>

                {/* Vertical separator */}
                <td className="pl-4 pr-4 border-l border-border">
                  {/* Target */}
                  <div className="flex items-center gap-2 min-w-0">
                    <TargetIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="text-xs font-semibold shrink-0 text-ink">{text.targetJob}:</span>
                    <div className="flex-1 min-w-0 text-sm truncate text-ink">
                      {value.targetJob ? value.targetJob.title : <span className="text-ink-soft">{text.empty}</span>}
                    </div>
                    <button
                      type="button"
                      className="shrink-0 rounded-lg bg-primary text-ink-invert px-2.5 py-1 text-xs font-semibold hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1 shadow-sm"
                      onClick={() => setEditor({ kind: "editTarget" })}
                      aria-label={`Edit ${text.targetJob}`}
                    >
                      {text.edit}
                    </button>
                  </div>
                </td>

                {/* Vertical separator */}
                <td className="pl-4 border-l border-border">
                  {/* Region */}
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="text-xs font-semibold shrink-0 text-ink">{text.region}:</span>
                    <div className="flex-1 min-w-0 text-sm truncate text-ink">{value.region}</div>
                    <button
                      type="button"
                      className="shrink-0 rounded-lg bg-primary text-ink-invert px-2.5 py-1 text-xs font-semibold hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1 shadow-sm"
                      onClick={() => setEditor({ kind: "editRegion" })}
                      aria-label={`Edit ${text.region}`}
                    >
                      {text.edit}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Past jobs editor popup: multi-select (cap 5). Wider and taller for long results */}
      {editor.kind === "editPast" && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-modal w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-border p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-heading font-bold text-ink">Edit {text.pastJobs}</h3>
                <button
                  onClick={() => setEditor({ kind: "idle" })}
                  className="p-1 hover:bg-gray-100 rounded-lg transition"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5 text-ink-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-ink-soft">{text.pastJobsHelp}</p>
            </div>
            <div className="p-6">
              <SearchComboWithResults
                industryOptions={occupationSearch.industryOptions}
                industryCode={occupationSearch.industryCode}
                onIndustryChange={occupationSearch.onIndustryChange}
                keyword={occupationSearch.keyword}
                onKeywordChange={occupationSearch.onKeywordChange}
                onSearch={occupationSearch.onSearch}
                searchError={occupationSearch.searchError}
                results={occupationSearch.results}
                isFetching={occupationSearch.isFetching}
                isError={occupationSearch.isError}
                noResults={occupationSearch.noResults}
                pickedIds={value.pastJobs.map((role) => role.id)}
                onAdd={addPast}
                onRemove={removePast}
                maxSelectable={5}
                selectedCount={value.pastJobs.length}
                addDisabledReason="Limit reached: 5 roles selected."
              />

              {/* Show selected names under the search with removable chips */}
              <SelectedChipsRow
                picked={value.pastJobs.map((role) => ({ id: role.id, title: role.title }))}
                onRemove={removePast}
                max={5}
              />
            </div>
          </div>
        </div>
      )}

      {/* Target job editor popup: single-select (cap 1). Wider and taller */}
      {editor.kind === "editTarget" && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-modal w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-border p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-heading font-bold text-ink">Edit {text.targetJob}</h3>
                <button
                  onClick={() => setEditor({ kind: "idle" })}
                  className="p-1 hover:bg-gray-100 rounded-lg transition"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5 text-ink-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-ink-soft">{text.targetJobHelp}</p>
            </div>
            <div className="p-6">
              <SearchComboWithResults
                industryOptions={occupationSearch.industryOptions}
                industryCode={occupationSearch.industryCode}
                onIndustryChange={occupationSearch.onIndustryChange}
                keyword={occupationSearch.keyword}
                onKeywordChange={occupationSearch.onKeywordChange}
                onSearch={occupationSearch.onSearch}
                searchError={occupationSearch.searchError}
                results={occupationSearch.results}
                isFetching={occupationSearch.isFetching}
                isError={occupationSearch.isError}
                noResults={occupationSearch.noResults}
                pickedIds={value.targetJob ? [value.targetJob.code] : []}
                onAdd={addTarget}
                onRemove={() => removeTarget()}
                maxSelectable={1}
                selectedCount={value.targetJob ? 1 : 0}
                addDisabledReason="You can only choose one target occupation."
              />

              {/* Single selected target shown as removable chip */}
              <SelectedChipsRow
                picked={value.targetJob ? [{ id: value.targetJob.code, title: value.targetJob.title }] : []}
                onRemove={() => removeTarget()}
                max={1}
              />
            </div>
          </div>
        </div>
      )}

      {/* Region single-select editor */}
      <SelectQuestion
        title={`Edit ${text.region}`}
        open={editor.kind === "editRegion"}
        options={regionOptions}
        value={value.region ?? null}
        onClose={() => setEditor({ kind: "idle" })}
        onSave={saveRegion}
        helperText={text.regionHelp}
      />
    </section>
  );
}










