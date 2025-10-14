// src/pages/Analyzer/AnalyzerJobSuggestion.tsx
// Uses split JobSuggestion card (left industries, right occupation groups).
// Computes matchPct via hook result and passes into groups.
// On Next, stores the selected job's unmatched buckets into Redux.
// Route fallback: if Redux is missing pieces after a refresh/private mode,
// read them from `location.state` and write back to Redux.
// English comments only inside code.

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSelector, shallowEqual } from "react-redux";
import AnalyzerLayout from "../../layouts/AnalyzerLayout";
import JobSuggestion from "../../components/analyzer/job/JobSuggestion";
import JobCard from "../../components/analyzer/job/JobCard";
import Button from "../../components/ui/Button";
import { useStepNav } from "../../hooks/useRouteStep";
import { useDemand } from "../../hooks/queries/useDemand";
import { useRankByCodesMany } from "../../hooks/queries/useRankByCodeMany";
import { useAppDispatch } from "../../store/hooks";
import type { RootState } from "../../store";
import {
  setSelectedJob,
  setSelectedJobUnmatched,
  setChosenAbilities,
  setChosenRoles,
  setInterestedIndustryCodes,
  setPreferredRegion,
} from "../../store/analyzerSlice";
import type { AbilityLite, AType, SelectedJob } from "../../store/analyzerSlice";
import { industryNameOf } from "../../data/industries";
import type { AnalyzerRouteState } from "../../types/routes";

/** Selection payload for ranking */
type SelectionItem = { type: AType; code: string };

/** Detailed role inside an occupation group */
type AnzscoItem = {
  code: string;
  title: string;
  description?: string | null;
  // some backends may put unmatched here
  unmatched?: { knowledge: string[]; skill: string[]; tech: string[] };
};

/** One occupation group returned by ranking API (with matchPct on group level) */
type OccupationGroupItem = {
  occupation_code: string;
  occupation_title: string;
  matchPct?: number; // computed in hook select()
  anzsco: AnzscoItem[];
  // some backends may put unmatched at the group level
  unmatched?: { knowledge: string[]; skill: string[]; tech: string[] };
};

/** A single role card that fetches shortage and derives tone/text. */
function InlineDemandCard(props: {
  title: string;
  description?: string | null;
  code: string;
  region: string | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const { data, isFetching } = useDemand(props.code, props.region ?? undefined);

  // ----- Safe shortage detection -----
  const nat = (data?.national_rating ?? "").toLowerCase();
  const st = (data?.state_rating ?? "").toLowerCase();

  const reNo = /\bno shortage\b|\bnot in shortage\b|\bnot in the shortage list\b|\bnon-shortage\b/;

  const natNoShortage = reNo.test(nat);
  const stNoShortage = reNo.test(st);

  // positive shortage but exclude negative phrases
  const nationalShort = /\bshortage\b/.test(nat) && !natNoShortage;
  const stateShort = /\bshortage\b/.test(st) && !stNoShortage;

  // ----- Display text & tone -----
  let text = "";
  let tone: "strong" | "soft" | "default" = "default";

  if (stateShort) {
    text = "Shortage";
    tone = "strong";
  } else if (nationalShort) {
    text = "Shortage nationally, but not in your target state";
    tone = "soft";
  } else if (natNoShortage || stNoShortage) {
    text = "Not shortage";
    tone = "default";
  } else {
    text = "Not in the shortage list";
    tone = "default";
  }

  return (
    <JobCard
      title={props.title}
      summary={props.description ?? ""}
      shortageText={text}
      shortageTone={tone}
      loadingShortage={isFetching}
      selected={props.selected}
      onSelect={props.onSelect}
      showMatch={false}
    />
  );
}

/**
 * AnalyzerJobSuggestion
 * - Split UI: left industries → right occupation groups → role cards grid.
 * - Queries multiple industries in parallel with useRankByCodesMany (each item has matchPct).
 * - Next disabled until a role is selected; selection and unmatched persisted to Redux.
 */
export default function AnalyzerJobSuggestion() {
  const dispatch = useAppDispatch();
  const { goPrev, goNext } = useStepNav();

  // Route fallback (may carry roles/region/industries/abilities from previous step)
  const { state } = useLocation();
  const routeState = (state as AnalyzerRouteState) || undefined;

  // Inputs and stored target from Redux
  const { abilities, industryCodes, region, storedTarget, rolesInStore } = useSelector(
    (s: RootState) => ({
      abilities: s.analyzer.chosenAbilities as AbilityLite[] | null,
      industryCodes: s.analyzer.interestedIndustryCodes as string[] | null,
      region: s.analyzer.preferredRegion as string | null,
      storedTarget: s.analyzer.selectedJob as SelectedJob,
      rolesInStore: s.analyzer.chosenRoles,
    }),
    shallowEqual
  );

  // Route → Redux fallback (only fill when missing)
  useEffect(() => {
    if ((!abilities || abilities.length === 0) && routeState?.abilities?.length) {
      dispatch(setChosenAbilities(routeState.abilities));
    }
    if ((!industryCodes || industryCodes.length === 0) && routeState?.industries?.length) {
      dispatch(setInterestedIndustryCodes(routeState.industries));
    }
    if (!region && routeState?.region) {
      dispatch(setPreferredRegion(routeState.region));
    }
    if ((!rolesInStore || rolesInStore.length === 0) && routeState?.roles?.length) {
      dispatch(setChosenRoles(routeState.roles));
    }
  }, [abilities, industryCodes, region, rolesInStore, routeState, dispatch]);

  // Local selection mirrors Redux to support toggle UX; hydrate from store
  const [selected, setSelected] = useState<SelectedJob>(storedTarget ?? null);

  // Build selection payload for backend
  const selections: SelectionItem[] = useMemo(() => {
    const src = abilities ?? [];
    const out: SelectionItem[] = [];
    for (const a of src) {
      if (!a?.code) continue;
      out.push({ type: a.aType, code: a.code });
    }
    return out;
  }, [abilities]);

  // Resolve full industry names from chosen codes; de-duplicate
  const industries = useMemo(() => {
    const codes = industryCodes ?? [];
    const names = codes
      .map((c) => industryNameOf(c) || "")
      .filter((n): n is string => n.length > 0);
    const seen = new Set<string>();
    const uniq: string[] = [];
    for (const n of names) {
      if (!seen.has(n)) {
        seen.add(n);
        uniq.push(n);
      }
    }
    return uniq;
  }, [industryCodes]);

  const canQuery = industries.length > 0 && selections.length > 0;

  // Parallel queries per industry (items carry matchPct from hook)
  const many = useRankByCodesMany(
    canQuery ? { industries, selections, limit: 12 } : undefined
  );

  // Collect all role codes present; if filters change, invalidate stale selection
  const allCodes: Set<string> = useMemo(() => {
    const set = new Set<string>();
    for (const one of many.list) {
      const items = (one.data?.items ?? []) as OccupationGroupItem[];
      for (const grp of items) {
        for (const z of grp.anzsco) set.add(z.code);
      }
    }
    return set;
  }, [many.list]);

  useEffect(() => {
    if (selected && !allCodes.has(selected.code)) {
      setSelected(null);
      dispatch(setSelectedJob(null));
      dispatch(setSelectedJobUnmatched(null));
    }
  }, [allCodes, selected, dispatch]);

  // Toggle pick and write-through to Redux so other steps see it
  const handlePick = (code: string, title: string) => {
    const next = selected?.code === code ? null : { code, title };
    setSelected(next);
    dispatch(setSelectedJob(next));
    if (!next) {
      dispatch(setSelectedJobUnmatched(null));
    }
  };

  // Build data for the split JobSuggestion component
  const splitData = useMemo(() => {
    return many.list.map((one) => {
      const items = (one.data?.items ?? []) as OccupationGroupItem[];
      return {
        key: one.industry,
        title: one.industry,
        groupCount: items.length,
        groups: items.map((g) => ({
          id: g.occupation_code,
          title: g.occupation_title,
          jobsCount: g.anzsco.length,
          avgMatch: typeof g.matchPct === "number" ? g.matchPct : undefined,
          collapsible: true,
          defaultOpen: false,
          children: (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {g.anzsco.map((z) => {
                const chosen = selected?.code === z.code;
                return (
                  <InlineDemandCard
                    key={z.code}
                    code={z.code}
                    title={z.title}
                    description={z.description ?? ""}
                    region={region}
                    selected={Boolean(chosen)}
                    onSelect={() => handlePick(z.code, z.title)}
                  />
                );
              })}
            </div>
          ),
        })),
      };
    });
  }, [many.list, region, selected]);

  // On Next: persist unmatched buckets for the selected job only (support both shapes)
  const handleNext = () => {
    if (!selected) return;

    let unmatched: { knowledge: string[]; skill: string[]; tech: string[] } | null = null;

    for (const one of many.list) {
      const items = (one.data?.items ?? []) as OccupationGroupItem[];
      for (const grp of items) {
        // case 1: unmatched lives on the group that contains the selected role
        const inGroup = grp.anzsco.some((z) => z.code === selected.code);
        if (inGroup && grp.unmatched) {
          unmatched = grp.unmatched;
          break;
        }
        // case 2: unmatched lives on the anzsco item itself
        const hit = grp.anzsco.find((z) => z.code === selected.code && z.unmatched);
        if (hit?.unmatched) {
          unmatched = hit.unmatched;
          break;
        }
      }
      if (unmatched) break;
    }

    dispatch(setSelectedJobUnmatched(unmatched));
    goNext();
  };

  const nextDisabled = !selected;

  return (
    <AnalyzerLayout
      className="pb-24"
      title="Suggested jobs"
      helpContent={{
        title: "How to use this page",
        subtitle: "Pick one role that fits you to proceed.",
        features: ["Jobs are ranked by how well your abilities and industries match."],
        howTo: [
          "Browse industries on the left; expand a group to see detailed jobs.",
          "Click a card to select or unselect a job.",
        ],
        tips: ["“Shortage” hints at demand in your region.", "If nothing shows, add more abilities or industries."],
      }}
    >
      {!canQuery && (
        <div className="mt-4 rounded-md bg-amber-50 text-amber-900 p-3 text-sm" role="alert">
          Please select at least one ability and at least one interested industry first.
        </div>
      )}

      {many.anyError && canQuery && (
        <div className="mt-4 rounded-md bg-red-50 text-red-700 p-3 text-sm" role="alert">
          Some industries failed to load. Try again or adjust your filters.
        </div>
      )}

      {many.anyFetching && canQuery && (
        <div className="mt-4 text-sm text-ink-soft" aria-live="polite">
          Loading suggestions…
        </div>
      )}

      {/* Split layout: left industries, right groups */}
      {canQuery && !many.anyFetching && (
        <div className="mt-6">
          <JobSuggestion industries={splitData} defaultSelectedKey={splitData[0]?.key} />
        </div>
      )}

      {/* Footer actions */}
      <footer className="mt-10 flex items-center justify-end gap-3">
        <Button variant="ghost" size="md" onClick={goPrev} aria-label="Go back to previous step">
          Back
        </Button>
        <div className="tt-group">
          <Button
            variant="primary"
            size="md"
            onClick={handleNext}
            disabled={nextDisabled}
            aria-label={nextDisabled ? "Disabled. Pick a job to continue." : "Go to next step"}
            title={nextDisabled ? "Pick a job to continue" : "Next"}
          >
            Next
          </Button>
          {nextDisabled && (
            <div className="tt-bubble tt--top" role="tooltip">
              Pick a job to continue.
            </div>
          )}
        </div>
      </footer>
    </AnalyzerLayout>
  );
}
