// Uses split JobSuggestion card (left industries, right occupation groups).
// Computes matchPct via hook result and passes into groups.
// On Next, stores the selected job's unmatched buckets into Redux.
// Route/cache fallback: if Redux is missing after refresh/private mode,
// read from location.state and write back to Redux.

import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { AbilityLite, AType, SelectedJob, RoleLite } from "../../store/analyzerSlice";
import { industryNameOf } from "../../data/industries";
import type { AnalyzerRouteState } from "../../types/routes";

/** Selection payload for ranking */
type SelectionItem = { type: AType; code: string };

/** Detailed role inside an occupation group */
type AnzscoItem = {
  code: string;
  title: string;
  description?: string | null;
  unmatched?: { knowledge: string[]; skill: string[]; tech: string[] };
};

/** One occupation group returned by ranking API (with matchPct on group level) */
type OccupationGroupItem = {
  occupation_code: string;
  occupation_title: string;
  matchPct?: number;
  anzsco: AnzscoItem[];
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

  // Safe shortage detection
  const nat = (data?.national_rating ?? "").toLowerCase();
  const st = (data?.state_rating ?? "").toLowerCase();
  const reNo = /\bno shortage\b|\bnot in shortage\b|\bnot in the shortage list\b|\bnon-shortage\b/;

  const natNoShortage = reNo.test(nat);
  const stNoShortage = reNo.test(st);

  const nationalShort = /\bshortage\b/.test(nat) && !natNoShortage;
  const stateShort = /\bshortage\b/.test(st) && !stNoShortage;

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
  } else {
    text = "Not in the shortage list";
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
 * - Fallback: hydrate Redux from route state when store is empty.
 */
export default function AnalyzerJobSuggestion(): React.ReactElement {
  const dispatch = useAppDispatch();
  const { goPrev, goNext } = useStepNav();

  // Route/cache fallback (may carry roles/region/industries/abilities from previous step)
  const { state } = useLocation();
  const routeState = (state as AnalyzerRouteState) || undefined;

  // Inputs and stored target from Redux
  const { abilities, industryCodes, region, storedTarget, rolesInStore } = useSelector(
    (s: RootState) => ({
      abilities: s.analyzer.chosenAbilities as AbilityLite[] | null,
      industryCodes: s.analyzer.interestedIndustryCodes as string[] | null,
      region: s.analyzer.preferredRegion as string | null,
      storedTarget: s.analyzer.selectedJob as SelectedJob,
      rolesInStore: s.analyzer.chosenRoles as (RoleLite | string)[],
    }),
    shallowEqual
  );

  // Fallback: write route data into Redux only when missing in store
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

  // Codes the user already selected in previous steps; filter them out of suggestions
  const excludedRoleCodes = useMemo(() => {
    const set = new Set<string>();
    (rolesInStore ?? []).forEach((role) => {
      if (typeof role === "string") {
        const code = role.trim();
        if (code) set.add(code);
      } else if (role && typeof role === "object") {
        const code = role.id?.trim() ?? "";
        if (code) set.add(code);
      }
    });
    return set;
  }, [rolesInStore]);

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
  const handlePick = useCallback(
    (code: string, title: string) => {
      setSelected((prev) => {
        const next = prev?.code === code ? null : { code, title };
        dispatch(setSelectedJob(next));
        if (!next) {
          dispatch(setSelectedJobUnmatched(null));
        }
        return next;
      });
    },
    [dispatch]
  );

  // Build data for the split JobSuggestion component
  const splitData = useMemo(() => {
    return many.list
      .map((one) => {
        const items = (one.data?.items ?? []) as OccupationGroupItem[];

        const groups = items
          .map((g) => {
            const visibleJobs = g.anzsco.filter((job) => {
              const code = job.code?.trim() ?? "";
              return code && !excludedRoleCodes.has(code);
            });

            if (visibleJobs.length === 0) return null;

            return {
              id: g.occupation_code,
              title: g.occupation_title,
              jobsCount: visibleJobs.length,
              avgMatch: typeof g.matchPct === "number" ? g.matchPct : undefined,
              collapsible: true,
              defaultOpen: false,
              children: (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {visibleJobs.map((job) => {
                    const chosen = selected?.code === job.code;
                    return (
                      <InlineDemandCard
                        key={job.code}
                        code={job.code}
                        title={job.title}
                        description={job.description ?? ""}
                        region={region}
                        selected={Boolean(chosen)}
                        onSelect={() => handlePick(job.code, job.title)}
                      />
                    );
                  })}
                </div>
              ),
            };
          })
          .filter((g): g is NonNullable<typeof g> => Boolean(g));

        if (groups.length === 0) return null;

        return {
          key: one.industry,
          title: one.industry,
          groupCount: groups.length,
          groups,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }, [many.list, region, selected, excludedRoleCodes, handlePick]);

  // On Next: persist unmatched buckets for the selected job only (support both shapes)
  const handleNext = () => {
    if (!selected) return;

    let unmatched: { knowledge: string[]; skill: string[]; tech: string[] } | null = null;

    for (const one of many.list) {
      const items = (one.data?.items ?? []) as OccupationGroupItem[];
      for (const grp of items) {
        const inGroup = grp.anzsco.some((z) => z.code === selected.code);
        if (inGroup && grp.unmatched) {
          unmatched = grp.unmatched;
          break;
        }
        const hit = grp.anzsco.find((z) => z.code === selected.code && z.unmatched);
        if (hit?.unmatched) {
          unmatched = hit.unmatched;
          break;
        }
      }
      if (unmatched) break;
    }

    // Debug: inspect unmatched buckets before persisting
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
        <Button
          variant="primary"
          size="md"
          onClick={handleNext}
          disabled={nextDisabled}
          aria-label={nextDisabled ? "Disabled. Pick a job to continue." : "Go to next step"}
          tooltipWhenDisabled="Pick a job to continue."
        >
          Next
        </Button>
      </footer>
    </AnalyzerLayout>
  );
}
