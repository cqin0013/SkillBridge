// frontend/src/pages/Profile.tsx
// Page: Profile
// Handles career profile management with Redux state and route fallback.
// Converts between Redux format ({ code, title }) and UI format ({ id, title }) where needed.

import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { useAppDispatch } from "../store/hooks";

// Components
import CareerChoicePanel, {
  type CareerChoiceState,
  type OccupationSearchInputs,
} from "../components/profile/CareerChoicePanel";
import SkillRoadMap, { type SkillRoadmapItem } from "../components/profile/SkillRoadMap";
import TrainingAdviceList, { type TrainingAdvice } from "../components/profile/TrainingAdviceList";
import VetGlossarySearch from "../components/profile/VetGlossarySearch";
import HelpToggleSmall from "../components/ui/HelpToggleSmall";

// Redux actions
import {
  setChosenRoles,
  setChosenAbilities,
  setInterestedIndustryCodes,
  setPreferredRegion,
  setSelectedJob,
  setTrainingAdvice,
} from "../store/analyzerSlice";
import type { AbilityLite, UnmatchedBuckets, RoleLite, SelectedJob } from "../store/analyzerSlice";

// Data and hooks
import { industryOptions, industryNameOf } from "../data/industries";
import { skillCategories } from "../data/skill.static";
import { knowledgeCategories } from "../data/knowledge.static";
import { techSkillCategories } from "../data/techskill.static";
import { useAnzscoSearch } from "../hooks/queries/userAnzscoSearch";
import type { AnalyzerRouteState } from "../types/routes";
import type { AnzscoOccupation } from "../types/domain";

/** Build a public TGA/VET link when only a code is present */
const fallbackCourseUrl = (code: string): string =>
  `https://training.gov.au/training/details/${encodeURIComponent(code)}`;

/** Region options for single-select */
const REGION_OPTIONS = [
  "New South Wales",
  "Victoria",
  "Queensland",
  "Western Australia",
  "South Australia",
  "Tasmania",
  "Northern Territory",
  "Australian Capital Territory",
];

/** Course item structure from Redux/route state */
type CourseItem = {
  name?: string;
  title?: string;
  id?: string;
  code?: string;
  url?: string;
};

type SelectedJobValue = Exclude<SelectedJob, null>;

/**
 * Normalize roles from various formats into RoleLite[] with { id, title }.
 * Handles both string arrays and object arrays.
 */
const normalizeRoles = (
  roles: Array<RoleLite | string> | null | undefined
): RoleLite[] => {
  if (!Array.isArray(roles)) return [];
  const seen = new Set<string>();
  const cleaned: RoleLite[] = [];
  roles.forEach((role) => {
    if (!role) return;
    const id = (typeof role === "string" ? role : role.id ?? "").trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    const title = typeof role === "string" ? role : role.title || id;
    cleaned.push({ id, title });
  });
  return cleaned;
};

/**
 * Normalize selected job from various formats into { code, title } | null.
 * This is the Redux format used throughout the app for API calls.
 */
const normalizeSelectedJob = (
  job: SelectedJob | string | null | undefined
): SelectedJobValue | null => {
  if (!job) return null;
  if (typeof job === "string") {
    const code = job.trim();
    if (!code) return null;
    return { code, title: code };
  }
  const code = (job.code ?? "").trim();
  if (!code) return null;
  return { code, title: job.title || code };
};

/** Local-only type for search params (keep them plain strings; avoid `undefined`) */
type SearchParams = { industry: string; keyword: string; limit?: number };

/** Safely normalize any value to a string name */
const normName = (v: unknown): string => (typeof v === "string" ? v : "");

/** Build a stable key for AbilityLite; return null if neither code nor name is valid */
const abilityKey = (a: AbilityLite): string | null => {
  const name = normName((a as { name?: unknown }).name);
  const code = typeof (a as { code?: unknown }).code === "string" ? (a as { code?: string }).code : "";
  if (!name && !code) return null;
  return `${a.aType}:${code || name.toLowerCase()}`;
};

/** Build a stable key for SkillRoadmapItem; return null if neither code nor skill is valid */
const roadmapKey = (it: SkillRoadmapItem): string | null => {
  const name = normName((it as { skill?: unknown }).skill);
  const code = typeof (it as { code?: unknown }).code === "string" ? (it as { code?: string }).code : ""
  if (!name && !code) return null;
  return `${it.abilityType}:${code || name.toLowerCase()}`;
};

/** Unique identity string used for remount keys (URL-safe) */
const abilityIdentityKey = (ability: AbilityLite): string => {
  const name = normName(ability.name);
  const base = ability.code ?? name;
  const safe = base ? encodeURIComponent(base) : `unnamed-${ability.aType}`;
  return `${ability.aType}:${safe}`;
};

/** Unique filter for abilities with runtime guards */
const uniqueAbilities = (abilities: AbilityLite[]): AbilityLite[] => {
  const seen = new Set<string>();
  const result: AbilityLite[] = [];
  for (const a of abilities) {
    const k = abilityKey(a);
    const name = normName(a.name);
    if (!k || !name) continue; // skip invalid rows
    if (!seen.has(k)) {
      seen.add(k);
      result.push({ ...a, name }); // ensure name is a plain string
    }
  }
  return result;
};

/** Collapse unmatched buckets into flat abilities */
const collapseUnmatchedBuckets = (buckets: UnmatchedBuckets | null | undefined): AbilityLite[] => {
  if (!buckets) return [];
  const collect = (list: string[] | undefined, aType: AbilityLite["aType"]): AbilityLite[] =>
    (list ?? [])
      .filter((name): name is string => Boolean(name))
      .map((name) => ({ name, aType }));

  return [
    ...collect(buckets.skill, "skill"),
    ...collect(buckets.knowledge, "knowledge"),
    ...collect(buckets.tech, "tech"),
  ];
};

/** Case-insensitive name match or exact code match */
const matchesAbility = (entry: { name?: string; code?: string } | undefined, ability: AbilityLite): boolean => {
  if (!entry) return false;
  if (ability.code && entry.code && entry.code === ability.code) return true;
  const entryName = normName(entry.name);
  const abName = normName(ability.name);
  if (entryName && abName && entryName.toLowerCase() === abName.toLowerCase()) return true;
  return false;
};

/** Find category for the ability from static tables */
const findCategoryForAbility = (ability: AbilityLite): string => {
  if (ability.aType === "skill") {
    if ((skillCategories.content ?? []).some((item) => matchesAbility(item, ability))) return "content";
    if ((skillCategories.process ?? []).some((item) => matchesAbility(item, ability))) return "process";
    const cross = skillCategories.crossFunctional ?? { resourceManagement: [], technical: [] };
    if ((cross.resourceManagement ?? []).some((item) => matchesAbility(item, ability))) return "crossFunctional";
    if ((cross.technical ?? []).some((item) => matchesAbility(item, ability))) return "crossFunctional";
    return "content";
  }

  if (ability.aType === "knowledge") {
    for (const key of Object.keys(knowledgeCategories) as Array<keyof typeof knowledgeCategories>) {
      const list = knowledgeCategories[key] ?? [];
      if (list.some((item) => matchesAbility(item, ability))) return key;
    }
    return "management";
  }

  if (ability.aType === "tech") {
    for (const key of Object.keys(techSkillCategories) as Array<keyof typeof techSkillCategories>) {
      const list = techSkillCategories[key] ?? [];
      if (list.some((item) => matchesAbility(item, ability))) return key;
    }
    return "business";
  }

  return "content";
};

/** Map abilities to SkillRoadmapItem with empty schedule */
const toSkillRoadmapItems = (abilities: AbilityLite[]): SkillRoadmapItem[] =>
  abilities.map((ability, index) => {
    const category = findCategoryForAbility(ability);
    const fallbackId = `${abilityIdentityKey(ability)}:${index}`;
    return {
      id: fallbackId,
      abilityType: ability.aType,
      category,
      skill: normName(ability.name),
      code: typeof ability.code === "string" ? ability.code : undefined,
      startDate: undefined,
      endDate: undefined,
    };
  });

/** Build a stable key from a list of abilities */
const buildAbilitySourceKey = (source: string, abilities: AbilityLite[]): string => {
  const parts = abilities.map((ability) => abilityIdentityKey(ability));
  return `${source}:${parts.join("|") || "empty"}`;
};

/** De-duplicate SkillRoadmapItem safely */
const dedupeRoadmapItems = (items: SkillRoadmapItem[]): SkillRoadmapItem[] => {
  const seen = new Set<string>();
  const out: SkillRoadmapItem[] = [];
  for (const it of items) {
    const k = roadmapKey(it);
    if (!k) continue;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(it);
    }
  }
  return out;
};

/** SelectQuestion adapter for region picker */
const SelectQuestionAdapter: React.FC<{
  title: string;
  open: boolean;
  options: string[];
  value: string | null;
  onClose: () => void;
  onSave: (value: string) => void;
  helperText?: string;
}> = ({ title, open, options, value, onClose, onSave, helperText }) => {
  const [selected, setSelected] = useState(value);
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-modal max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-heading font-bold text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-ink-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {helperText && <p className="text-sm text-ink-soft mb-4">{helperText}</p>}

        <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => setSelected(opt)}
              className="w-full text-left p-3 border border-border rounded-lg hover:bg-gray-50 transition"
              style={{
                borderColor: selected === opt ? "#5E75A4" : "#e2e8f0",
                backgroundColor: selected === opt ? "#5E75A4" : "white",
                color: selected === opt ? "white" : "#0f172a",
              }}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              if (selected) {
                onSave(selected);
                onClose();
              }
            }}
            className="flex-1 py-2 px-4 rounded-full font-semibold bg-primary text-ink-invert hover:bg-primary/90 transition"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-full font-semibold border border-border text-ink hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Profile(): React.ReactElement {
  const dispatch = useAppDispatch();
  const { state } = useLocation();
  const routeState = (state as (AnalyzerRouteState & { notice?: string }) | undefined) ?? undefined;

  // Read from Redux (primary source)
  const analyzer = useSelector((s: RootState) => s.analyzer);
  const notice = routeState?.notice;

  /** Hydrate Redux from route-state once if missing (fallback pattern) */
  useEffect(() => {
    if (!routeState) return;

    // Priority: Redux first, route state second
    if (!analyzer.chosenRoles?.length && routeState.roles?.length) {
      dispatch(setChosenRoles(normalizeRoles(routeState?.roles)));
    }
    if (!analyzer.chosenAbilities?.length && routeState.abilities?.length) {
      dispatch(setChosenAbilities(routeState.abilities));
    }
    if ((!analyzer.interestedIndustryCodes || analyzer.interestedIndustryCodes.length === 0) && routeState.industries?.length) {
      dispatch(setInterestedIndustryCodes(routeState.industries));
    }
    if (!analyzer.preferredRegion && routeState.region) {
      dispatch(setPreferredRegion(routeState.region));
    }
    if (!analyzer.selectedJob && routeState.selectedJob) {
      const normalized = normalizeSelectedJob(routeState.selectedJob);
      if (normalized) {
        dispatch(setSelectedJob(normalized));
      }
    }
    if (!analyzer.trainingAdvice && routeState.training) {
      dispatch(setTrainingAdvice(routeState.training));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  /**
   * Build the baseline ability source from Redux or route.
   * This mirrors your original logic to keep behavior consistent.
   */
  const abilitySource = useMemo(() => {
    const chosen = uniqueAbilities(analyzer.chosenAbilities ?? []);
    if (chosen.length > 0) {
      const key = buildAbilitySourceKey("redux", chosen);
      return { abilities: chosen, key, items: toSkillRoadmapItems(chosen) };
    }

    const routeAbilitiesRaw = Array.isArray(routeState?.abilities) ? (routeState.abilities as AbilityLite[]) : [];
    const routeAbilities = uniqueAbilities(routeAbilitiesRaw);
    if (routeAbilities.length > 0) {
      const key = buildAbilitySourceKey("route", routeAbilities);
      return { abilities: routeAbilities, key, items: toSkillRoadmapItems(routeAbilities) };
    }

    const unmatchedRedux = uniqueAbilities(collapseUnmatchedBuckets(analyzer.selectedJobUnmatched));
    if (unmatchedRedux.length > 0) {
      const key = buildAbilitySourceKey("redux-unmatched", unmatchedRedux);
      return { abilities: unmatchedRedux, key, items: toSkillRoadmapItems(unmatchedRedux) };
    }

    const unmatchedRoute = uniqueAbilities(collapseUnmatchedBuckets(routeState?.unmatched ?? null));
    if (unmatchedRoute.length > 0) {
      const key = buildAbilitySourceKey("route-unmatched", unmatchedRoute);
      return { abilities: unmatchedRoute, key, items: toSkillRoadmapItems(unmatchedRoute) };
    }

    return { abilities: [] as AbilityLite[], key: "none", items: [] as SkillRoadmapItem[] };
  }, [analyzer.chosenAbilities, analyzer.selectedJobUnmatched, routeState]);

  /**
   * On every page open, merge UNMATCHED abilities into the initial list.
   * Models "retest adds new abilities only" by appending anything missing.
   * Convert to roadmap items, then de-duplicate with safe keys.
   * Key is built from the merged abilities to refresh initial state when content changes.
   */
  const mergedInitial = useMemo(() => {
    const unmatchedRedux = uniqueAbilities(collapseUnmatchedBuckets(analyzer.selectedJobUnmatched));
    const unmatchedRoute = uniqueAbilities(collapseUnmatchedBuckets(routeState?.unmatched ?? null));

    // Baseline keys derived from current items
    const baselineKeys = new Set(
      abilitySource.items
        .map((it) => roadmapKey(it))
        .filter((k): k is string => Boolean(k))
    );

    // Collect extra abilities that are not yet present
    const extraAbilities: AbilityLite[] = [];
    const consider = (list: AbilityLite[]): void => {
      for (const a of list) {
        const k = abilityKey(a);
        if (!k) continue;
        if (!baselineKeys.has(k)) extraAbilities.push(a);
      }
    };
    consider(unmatchedRedux);
    consider(unmatchedRoute);

    // Merge and map
    const mergedAbilities = uniqueAbilities([...abilitySource.abilities, ...extraAbilities]);
    const mergedItems = dedupeRoadmapItems([
      ...abilitySource.items,
      ...toSkillRoadmapItems(extraAbilities),
    ]);

    const key = buildAbilitySourceKey("merged", mergedAbilities);
    return { key, items: mergedItems };
  }, [abilitySource, analyzer.selectedJobUnmatched, routeState?.unmatched]);

  /**
   * Career choice state (past jobs, target, region) - Redux first, fallback to route.
   * Convert Redux format ({ code, title }) to UI format ({ id, title }) for CareerChoicePanel.
   */
  const careerChoiceValue = useMemo((): CareerChoiceState => {
    // Priority 1: Redux
    const pastJobsRedux = normalizeRoles(analyzer.chosenRoles);
    const targetJobRedux = normalizeSelectedJob(analyzer.selectedJob);
    const regionRedux = analyzer.preferredRegion || "";

    // Priority 2: Route state (fallback)
    const pastJobsRoute = normalizeRoles(routeState?.roles);
    const targetJobRoute = normalizeSelectedJob(routeState?.selectedJob);
    const regionRoute = routeState?.region || "";

    const pastJobs = pastJobsRedux.length > 0 ? pastJobsRedux : pastJobsRoute;

    // Convert Redux format { code, title } to UI format { id, title }
    const targetJobSource = targetJobRedux ?? targetJobRoute;
    const targetJob = targetJobSource 
      ? { id: targetJobSource.code, title: targetJobSource.title }
      : null;

    return {
      pastJobs,
      targetJob,
      region: regionRedux || regionRoute,
    };
  }, [analyzer, routeState]);

  /**
   * Handle career choice changes from the panel.
   * Convert UI format ({ id, title }) back to Redux format ({ code, title }).
   */
  const onCareerChoiceChange = (next: CareerChoiceState): void => {
    // Persist changes back to Redux
    const normalizedRoles = normalizeRoles(next.pastJobs);
    dispatch(setChosenRoles(normalizedRoles));

    // Convert UI format { id, title } to Redux format { code, title }
    const targetJobForRedux = next.targetJob
      ? { code: next.targetJob.id, title: next.targetJob.title }
      : null;
    dispatch(setSelectedJob(targetJobForRedux));
    
    dispatch(setPreferredRegion(next.region));
  };

  /** Training advice items - Redux first, fallback to route */
  const trainingItems = useMemo<TrainingAdvice[]>(() => {
    const coursesRedux = analyzer.trainingAdvice?.courses ?? [];
    const coursesRoute = routeState?.training?.courses ?? [];
    const courses = coursesRedux.length ? coursesRedux : coursesRoute;

    return courses.map((c: CourseItem) => ({
      title: c.name || c.title || "",
      code: c.id || c.code || "",
      url: c.url || fallbackCourseUrl(c.id || c.code || ""),
    }));
  }, [analyzer.trainingAdvice, routeState]);

  /** Real occupation search with API */
  const [industryCode, setIndustryCode] = useState("");
  const [keyword, setKeyword] = useState("");
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);

  /**
   * The hook's data may be either an array or an object with a `results` array.
   * Locally assert this union shape to keep types strict without touching the hook.
   */
  type SearchResultShape =
    | { results?: AnzscoOccupation[] | null | undefined }
    | AnzscoOccupation[]
    | null
    | undefined;

  const {
    data: searchDataRaw,
    isFetching,
    isError,
  } = useAnzscoSearch(searchParams) as {
    data: SearchResultShape;
    isFetching: boolean;
    isError: boolean;
  };

  /** Normalize hook data into a plain array the child expects. */
  const normalizedResults = useMemo<AnzscoOccupation[]>(() => {
    if (Array.isArray(searchDataRaw)) {
      return searchDataRaw;
    }
    const maybe = searchDataRaw?.results;
    return Array.isArray(maybe) ? maybe : [];
  }, [searchDataRaw]);

  // Build props for the child component.
  const occupationSearch: OccupationSearchInputs = {
    industryOptions: industryOptions.map((opt) => ({ value: opt.value, label: opt.label })),
    industryCode,
    onIndustryChange: setIndustryCode,
    keyword,
    onKeywordChange: setKeyword,
    onSearch: () => {
      const industryName = industryNameOf(industryCode) ?? "";
      if (industryName || keyword.trim()) {
        setSearchParams({
          industry: industryName,
          keyword: keyword.trim(),
          limit: 20,
        });
      }
    },
    results: normalizedResults,
    isFetching,
    isError,
    noResults: !isFetching && normalizedResults.length === 0,
  };

  // Ref for scrolling to VET Terminology section
  const vetTerminologyRef = React.useRef<HTMLDivElement>(null);

  // Handler to scroll to VET Terminology section
  const scrollToVetTerminology = () => {
    vetTerminologyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-heading font-bold text-ink mb-2">Profile</h1>
          <p className="text-ink-soft">Manage your career journey and skills roadmap</p>

          {notice && (
            <div className="mt-4 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
              {notice}
            </div>
          )}
        </header>

        <div className="space-y-6">
          {/* Career Intent Section */}
          <section>
            <h2 className="text-2xl font-heading font-bold text-ink mb-4">Career Intent</h2>
            <CareerChoicePanel
              value={careerChoiceValue}
              onChange={onCareerChoiceChange}
              regionOptions={REGION_OPTIONS}
              SelectQuestion={SelectQuestionAdapter}
              occupationSearch={occupationSearch}
            />
          </section>

          {/* Skill Roadmap Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-heading font-bold text-ink">Skill Roadmap</h2>
              <HelpToggleSmall
                placement="left"
                openOn="both"
                text={
                  <div>
                    <div className="font-semibold text-primary mb-1">Heads-up</div>
                    <p>
                      If you run the analyzer again, this list will <strong>only add new abilities</strong> it finds.
                      It will <strong>not remove</strong> any existing items here.
                    </p>
                  </div>
                }
              />
            </div>

            <div className="rounded-xl border border-border p-6 bg-white shadow-card">
              <p className="text-sm text-ink-soft mb-4">
                Plan your skill development journey with timelines for each skill you want to acquire.
              </p>
              {/* Use mergedInitial so unmatched are appended on page open; key ensures re-init when merged set changes */}
              <SkillRoadMap key={mergedInitial.key} initialSkills={mergedInitial.items} />
            </div>
          </section>

          {/* Training Advice Section */}
          <section>
            <h2 className="text-2xl font-heading font-bold text-ink mb-4">Training Advice</h2>
            <div className="rounded-xl border border-border p-6 bg-white shadow-card">
              <TrainingAdviceList
                items={trainingItems}
                title=""
                onRemove={(item) => {
                  // Remove from Redux state by filtering and re-shaping to original structure.
                  const updated = trainingItems.filter((t) => t.code !== item.code);
                  dispatch(
                    setTrainingAdvice({
                      occupation: analyzer.trainingAdvice?.occupation || { code: "", title: "" },
                      courses: updated.map((t) => ({ id: t.code, name: t.title, url: t.url })),
                    })
                  );
                }}
              />

              {/* Help prompt to guide users to VET Terminology section */}
              {trainingItems.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <svg 
                      className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm text-blue-900 mb-2">
                        <strong>Confused by course terminology?</strong> Try our VET Terminology Dictionary below to look up unfamiliar terms.
                      </p>
                      <button
                        onClick={scrollToVetTerminology}
                        className="text-sm font-semibold text-blue-700 hover:text-blue-800 underline transition"
                      >
                        Go to VET Terminology →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* VET Terminology Section */}
          <section ref={vetTerminologyRef}>
            <h2 className="text-2xl font-heading font-bold text-ink mb-4">VET Terminology</h2>
            <VetGlossarySearch />
          </section>
        </div>
      </div>
    </div>
  );
}