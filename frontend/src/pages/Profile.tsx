// C:\Users\隐居小号\SkillBridge\skillbridge\src\pages\Profile\Profile.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { useAppDispatch } from "../store/hooks";

// Panels
import JobIntentPanel, {
  type CareerChoiceState,
  type SearchResultProps as JISearchResultProps,
  type SelectQuestionProps as JISelectQuestionProps,
} from "../components/analyzer/profile/JobIntentPanel";
import SkillRoadMap, { type AbilityWithSchedule } from "../components/analyzer/profile/SkillRoadMap";
import TrainingAdviceList, { type TrainingAdvice as TrainingAdviceItem } from "../components/analyzer/profile/TrainingAdviceList";

// Redux actions
import {
  setChosenRoles,
  setChosenAbilities,
  setInterestedIndustryCodes,
  setPreferredRegion,
  setSelectedJob,
  setTrainingAdvice,
} from "../store/analyzerSlice";

import { skillCategories } from "../data/skill.static";
import { knowledgeCategories } from "../data/knowledge.static";
import { techSkillCategories } from "../data/techskill.static";
import type { AnalyzerRouteState } from "../types/routes";

/** Build a public TGA/VET link when only a code is present */
const fallbackCourseUrl = (code: string): string =>
  `https://training.gov.au/Search/TrainingComponent.aspx?code=${encodeURIComponent(code)}`;

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

/** Minimal search picker for JobIntentPanel */
const SearchResultAdapter: React.FC<JISearchResultProps> = ({
  title,
  selected,
  open,
  onClose,
  onSave,
  single,
  maxCount,
  helperText,
}) => {
  if (!open) return null;
  const pool = ["Software Engineer", "Data Analyst", "Product Manager", "UX Designer", "DevOps Engineer"];
  const toggle = (name: string): void => {
    if (single) {
      onSave([name]);
      return;
    }
    const set = new Set(selected);
    if (set.has(name)) set.delete(name);
    else set.add(name);
    const next = Array.from(set).slice(0, maxCount ?? 999);
    onSave(next);
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/30 p-6">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-4">
        <div className="text-base font-semibold">{title}</div>
        <p className="mt-1 text-sm text-gray-600">{helperText}</p>
        <ul className="mt-3 space-y-2">
          {pool.map((o) => (
            <li key={o}>
              <button type="button" className="w-full rounded-lg border px-3 py-2 text-left" onClick={() => toggle(o)}>
                {o} {selected.includes(o) ? "✓" : ""}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <button className="rounded-lg border px-3 py-1.5" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/** Minimal single-select dialog */
const SelectQuestionAdapter: React.FC<JISelectQuestionProps> = ({
  title,
  open,
  options,
  value,
  onClose,
  onSave,
  helperText,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/30 p-6">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-4">
        <div className="text-base font-semibold">{title}</div>
        <p className="mt-1 text-sm text-gray-600">{helperText}</p>
        <ul className="mt-3 space-y-2">
          {options.map((o) => (
            <li key={o}>
              <button type="button" className="w-full rounded-lg border px-3 py-2 text-left" onClick={() => onSave(o)}>
                {o} {value === o ? "✓" : ""}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <button className="rounded-lg border px-3 py-1.5" onClick={onClose}>
            Close
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

  const analyzer = useSelector((s: RootState) => s.analyzer);
  const notice = routeState?.notice;

  /** Hydrate Redux from route-state once if missing */
  useEffect(() => {
    if (!routeState) return;
    if (!analyzer.chosenRoles?.length && routeState.roles?.length) dispatch(setChosenRoles(routeState.roles));
    if (!analyzer.chosenAbilities?.length && routeState.abilities?.length) dispatch(setChosenAbilities(routeState.abilities));
    if ((!analyzer.interestedIndustryCodes || analyzer.interestedIndustryCodes.length === 0) && routeState.industries?.length)
      dispatch(setInterestedIndustryCodes(routeState.industries));
    if (!analyzer.preferredRegion && routeState.region) dispatch(setPreferredRegion(routeState.region));
    if (!analyzer.selectedJob && routeState.selectedJob) dispatch(setSelectedJob(routeState.selectedJob));
    if (!analyzer.trainingAdvice && routeState.training) dispatch(setTrainingAdvice(routeState.training));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // once

  /** Intent state centered on page */
  const [intent, setIntent] = useState<CareerChoiceState>(() => ({
    pastJobs: (analyzer.chosenRoles ?? []).map((r) => r.title ?? r.id ?? "").filter(Boolean),
    targetJob: analyzer.selectedJob?.title ?? null,
    region: analyzer.preferredRegion ?? "",
  }));
  const onIntentChange = (next: CareerChoiceState): void => {
    setIntent(next);
    dispatch(setChosenRoles(next.pastJobs.map((n) => ({ id: n, title: n }))));
    if (next.targetJob) dispatch(setSelectedJob({ code: "", title: next.targetJob }));
    else dispatch(setSelectedJob(null));
    dispatch(setPreferredRegion(next.region));
  };

  /** Category builders for SkillRoadMap */
  const buildSkillCats = () => [
    { id: "content", label: "Content", skills: (skillCategories.content ?? []).map((s) => s.name) },
    { id: "process", label: "Process", skills: (skillCategories.process ?? []).map((s) => s.name) },
    { id: "resourceManagement", label: "Resource Management", skills: (skillCategories.crossFunctional?.resourceManagement ?? []).map((s) => s.name) },
    { id: "technical", label: "Technical", skills: (skillCategories.crossFunctional?.technical ?? []).map((s) => s.name) },
  ];
  const buildKnowledgeCats = () => [
    { id: "management", label: "Management", skills: (knowledgeCategories.management ?? []).map((s) => s.name) },
    { id: "production", label: "Production", skills: (knowledgeCategories.production ?? []).map((s) => s.name) },
    { id: "technical", label: "Technical", skills: (knowledgeCategories.technical ?? []).map((s) => s.name) },
    { id: "science", label: "Science", skills: (knowledgeCategories.science ?? []).map((s) => s.name) },
    { id: "health", label: "Health", skills: (knowledgeCategories.health ?? []).map((s) => s.name) },
    { id: "education", label: "Education", skills: (knowledgeCategories.education ?? []).map((s) => s.name) },
    { id: "culture", label: "Culture", skills: (knowledgeCategories.culture ?? []).map((s) => s.name) },
    { id: "public", label: "Public", skills: (knowledgeCategories.public ?? []).map((s) => s.name) },
    { id: "communication", label: "Communication", skills: (knowledgeCategories.communication ?? []).map((s) => s.name) },
  ];
  const buildTechSkillCats = () => [
    { id: "business", label: "Business", skills: (techSkillCategories.business ?? []).map((s) => s.name) },
    { id: "productivity", label: "Productivity", skills: (techSkillCategories.productivity ?? []).map((s) => s.name) },
    { id: "development", label: "Development", skills: (techSkillCategories.development ?? []).map((s) => s.name) },
    { id: "database", label: "Database", skills: (techSkillCategories.database ?? []).map((s) => s.name) },
    { id: "education", label: "Education", skills: (techSkillCategories.education ?? []).map((s) => s.name) },
    { id: "industry", label: "Industry", skills: (techSkillCategories.industry ?? []).map((s) => s.name) },
    { id: "network", label: "Network", skills: (techSkillCategories.network ?? []).map((s) => s.name) },
    { id: "system", label: "System", skills: (techSkillCategories.system ?? []).map((s) => s.name) },
    { id: "security", label: "Security", skills: (techSkillCategories.security ?? []).map((s) => s.name) },
    { id: "communication", label: "Communication", skills: (techSkillCategories.communication ?? []).map((s) => s.name) },
    { id: "management", label: "Management", skills: (techSkillCategories.management ?? []).map((s) => s.name) },
  ];

  /** Unmatched skills for SkillRoadMap:
   *  Prefer Redux fields that commonly hold "gap/unmatched" data.
   *  Fallback to routeState.unmatched or empty.
   */
  const unmatchedValue = useMemo<AbilityWithSchedule[]>(() => {
    // Candidates from Redux: analyzer.skillGap?.unmatched, analyzer.unmatchedAbilities, analyzer.selectedJobUnmatched
    const fromRedux: Array<{ name: string; code?: string; aType: "knowledge" | "tech" | "skill" }> =
      // @ts-expect-error: optional chaining across unknown slice keys
      (analyzer.skillGap?.unmatched?.abilities ??
        // @ts-expect-error
        analyzer.unmatchedAbilities ??
        // @ts-expect-error
        analyzer.selectedJobUnmatched?.abilities ??
        []) as Array<{ name: string; code?: string; aType: "knowledge" | "tech" | "skill" }>;

    const fromRoute =
      (routeState?.unmatched &&
        // @ts-expect-error: accept common shapes { abilities: [...] } or just array
        (routeState.unmatched.abilities ?? routeState.unmatched)) ||
      [];

    const base = (fromRedux.length ? fromRedux : fromRoute) as Array<{
      name: string;
      code?: string;
      aType: "knowledge" | "tech" | "skill";
    }>;

    return base.map((x) => ({ name: x.name, code: x.code, aType: x.aType }));
  }, [analyzer, routeState]);

  const onSkillsChange = (next: AbilityWithSchedule[]): void => {
    // Persist names/types back to Redux analyzer slice if needed
    dispatch(setChosenAbilities(next.map((x) => ({ name: x.name, code: x.code, aType: x.aType }))));
  };

  /** Training advice: Redux first, then route-state */
  const trainingItems = useMemo<TrainingAdviceItem[]>(() => {
    const coursesRedux = analyzer.trainingAdvice?.courses ?? [];
    const coursesRoute = routeState?.training?.courses ?? [];
    const courses = coursesRedux.length ? coursesRedux : coursesRoute;
    return courses.map((c) => ({ title: c.name, code: c.id, url: fallbackCourseUrl(c.id) }));
  }, [analyzer.trainingAdvice, routeState]);

  return (
    // Centered layout using project tokens (container + balanced whitespace)
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-extrabold">Profile</h1>
        {notice && (
          <div className="mx-auto mt-3 max-w-3xl rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800">
            {notice}
          </div>
        )}
      </header>

      {/* Career intent */}
      <section className="mx-auto mb-6 max-w-4xl rounded-2xl border p-4">
        <h2 className="mb-3 text-base font-semibold text-center">Career intent</h2>
        <JobIntentPanel
          value={intent}
          onChange={onIntentChange}
          regionOptions={REGION_OPTIONS}
          SearchResult={SearchResultAdapter}
          SelectQuestion={SelectQuestionAdapter}
        />
      </section>

      {/* Skill roadmap: unmatched skills with editable start/end */}
      <section className="mx-auto mb-6 max-w-4xl rounded-2xl border p-4">
        <h2 className="mb-3 text-base font-semibold text-center">Skill roadmap (unmatched)</h2>
        <SkillRoadMap
          value={unmatchedValue}
          onChange={onSkillsChange}
          buildKnowledgeCats={buildKnowledgeCats}
          buildTechSkillCats={buildTechSkillCats}
          buildSkillCats={buildSkillCats}
        />
      </section>

      {/* Training advice: Redux first, else route-state */}
      <section className="mx-auto max-w-4xl rounded-2xl border p-4">
        <h2 className="mb-3 text-base font-semibold text-center">Training advice</h2>
        <TrainingAdviceList items={trainingItems} />
      </section>
    </div>
  );
}
