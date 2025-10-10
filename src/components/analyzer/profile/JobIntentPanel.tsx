// src/components/analyzer/profile/CareerChoicePanel.tsx
import React, { useMemo, useState } from "react";

/** English comments are required by the user. No `any` in TypeScript. */

/** A strongly-typed shape of the panel state */
export type CareerChoiceState = {
  pastJobs: string[];        // previously selected occupations
  targetJob: string | null;  // desired single occupation
  region: string;            // region string in English
};

/** Props expected from parent */
export type CareerChoicePanelProps = {
  /** Initial data shown by the panel */
  value: CareerChoiceState;

  /** Called whenever user saves any edit */
  onChange: (next: CareerChoiceState) => void;

  /** Region options (English) for single-select */
  regionOptions: string[];

  /**
   * Inject your SearchResult component for picking occupations.
   * We avoid importing app-specific components directly to keep this panel portable.
   * You pass a React component that matches the typed contract below.
   */
  SearchResult: React.ComponentType<SearchResultProps>;

  /**
   * Inject your SelectQuestion component for single-select region picking.
   */
  SelectQuestion: React.ComponentType<SelectQuestionProps>;

  /** Optional: customize labels */
  labels?: {
    pastJobs?: string;
    targetJob?: string;
    region?: string;
    edit?: string;
    save?: string;
    cancel?: string;
    empty?: string;
    pastJobsHelp?: string;
    targetJobHelp?: string;
    regionHelp?: string;
  };
};

/** Contract for the injected SearchResult used for occupations */
export type SearchResultProps = {
  /** Title shown on the picker UI */
  title: string;
  /** Current selection passed in */
  selected: string[];
  /** Whether this picker is open */
  open: boolean;
  /** Close the picker without applying changes */
  onClose: () => void;
  /**
   * Save the selection and close.
   * For single-select, we still return string[] with length 0 or 1 to keep the contract uniform.
   */
  onSave: (nextSelected: string[]) => void;
  /** If true, only allow one selection */
  single?: boolean;
  /** Optional maximum count when multi-select */
  maxCount?: number;
  /** Optional helper text */
  helperText?: string;
};

/** Contract for the injected SelectQuestion used for region single-select */
export type SelectQuestionProps = {
  /** Title shown on the picker UI */
  title: string;
  /** Whether this picker is open */
  open: boolean;
  /** Available options (English) */
  options: string[];
  /** Currently selected value */
  value: string | null;
  /** Close without saving */
  onClose: () => void;
  /** Save selection and close */
  onSave: (value: string) => void;
  /** Helper text */
  helperText?: string;
};

/** Local UI state to control which editor is open */
type EditorState =
  | { kind: "idle" }
  | { kind: "editPast" }
  | { kind: "editTarget" }
  | { kind: "editRegion" };

/**
 * CareerChoicePanel
 * - Shows current choices.
 * - Opens specialized pickers on edit.
 * - Enforces max 5 for past jobs and single select for target job.
 */
export function CareerChoicePanel(props: CareerChoicePanelProps) {
  const {
    value,
    onChange,
    regionOptions,
    SearchResult,
    SelectQuestion,
    labels,
  } = props;

  const text = useMemo(
    () => ({
      pastJobs: labels?.pastJobs ?? "Past occupations",
      targetJob: labels?.targetJob ?? "Target occupation",
      region: labels?.region ?? "Region",
      edit: labels?.edit ?? "Edit",
      save: labels?.save ?? "Save",
      cancel: labels?.cancel ?? "Cancel",
      empty: labels?.empty ?? "None",
      pastJobsHelp:
        labels?.pastJobsHelp ??
        "You can choose up to 5 past occupations.",
      targetJobHelp:
        labels?.targetJobHelp ??
        "Choose one target occupation.",
      regionHelp:
        labels?.regionHelp ??
        "Choose one region (English).",
    }),
    [labels]
  );

  const [editor, setEditor] = useState<EditorState>({ kind: "idle" });

  /** Render a simple row with label, values, and an Edit button */
  const Row: React.FC<{
    label: string;
    valueView: React.ReactNode;
    onEdit: () => void;
  }> = ({ label, valueView, onEdit }) => (
    <div className="flex items-start justify-between gap-4 rounded-2xl border p-4">
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="mt-1 text-sm">
          {valueView}
        </div>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
        onClick={onEdit}
        aria-label={`Edit ${label}`}
      >
        {text.edit}
      </button>
    </div>
  );

  /** Controlled save helpers */
  const savePast = (next: string[]) => {
    const unique = Array.from(new Set(next)).slice(0, 5);
    onChange({ ...value, pastJobs: unique });
    setEditor({ kind: "idle" });
  };

  const saveTarget = (next: string[]) => {
    const chosen: string | null = next[0] ?? null;
    onChange({ ...value, targetJob: chosen });
    setEditor({ kind: "idle" });
  };

  const saveRegion = (next: string) => {
    onChange({ ...value, region: next });
    setEditor({ kind: "idle" });
  };

  /** Readable value chips */
  const Chips: React.FC<{ items: string[] }> = ({ items }) => {
    if (items.length === 0) return <span className="text-gray-500">{text.empty}</span>;
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((s) => (
          <span
            key={s}
            className="rounded-full border px-2 py-0.5 text-xs"
          >
            {s}
          </span>
        ))}
      </div>
    );
  };

  return (
    <section className="space-y-4">
      <Row
        label={text.pastJobs}
        valueView={<Chips items={value.pastJobs} />}
        onEdit={() => setEditor({ kind: "editPast" })}
      />
      <Row
        label={text.targetJob}
        valueView={
          <span className="text-gray-800">
            {value.targetJob ?? <span className="text-gray-500">{text.empty}</span>}
          </span>
        }
        onEdit={() => setEditor({ kind: "editTarget" })}
      />
      <Row
        label={text.region}
        valueView={<span className="text-gray-800">{value.region}</span>}
        onEdit={() => setEditor({ kind: "editRegion" })}
      />

      {/* Past jobs picker (multi, max 5) */}
      <SearchResult
        title={text.pastJobs}
        selected={value.pastJobs}
        open={editor.kind === "editPast"}
        onClose={() => setEditor({ kind: "idle" })}
        onSave={savePast}
        single={false}
        maxCount={5}
        helperText={text.pastJobsHelp}
      />

      {/* Target job picker (single) */}
      <SearchResult
        title={text.targetJob}
        selected={value.targetJob ? [value.targetJob] : []}
        open={editor.kind === "editTarget"}
        onClose={() => setEditor({ kind: "idle" })}
        onSave={saveTarget}
        single
        helperText={text.targetJobHelp}
      />

      {/* Region picker (single) */}
      <SelectQuestion
        title={text.region}
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

export default CareerChoicePanel;
