// src/pages/analyzer/AnalyzerAbilities.tsx
/**
 * AnalyzerAbilities
 * - Fetch + merge abilities by occupation codes.
 * - Local list lazily hydrates from Redux chosenAbilities so Back restores chips.
 * - Per-section collapse; body uses AbilityList to show count, Edit, and chips.
 * - "Analyzing..." when empty + loading; inline error on failure (GlobalError).
 * - Next disabled until at least one ability exists (tooltip via title).
 * - Local edits sync to Redux so SelectedSummary shows counts.
 * - Route fallback: if Redux is empty, read data from location.state and write back to Redux.
 */

import {
  useEffect,
  useMemo,
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useStepNav } from "../../hooks/useRouteStep";
import AnalyzerLayout from "../../layouts/AnalyzerLayout";
import Button from "../../components/ui/Button";
import AbilityPicker, { type AbilityCategory } from "../../components/analyzer/AbilityPicker";
import AbilityList from "../../components/analyzer/AbilityList";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import GlobalError from "../../components/common/GlobalError";

import { skillCategories } from "../../data/skill.static";
import { knowledgeCategories } from "../../data/knowledge.static";
import { techSkillCategories } from "../../data/techskill.static";

import { useAbilitiesByCodes } from "../../hooks/queries/useAbilitiesByCodes";
import type { RootState } from "../../store";
import { useAppDispatch } from "../../store/hooks";
import {
  setChosenAbilities,
  setChosenRoles,
  setPreferredRegion,
  setInterestedIndustryCodes,
} from "../../store/analyzerSlice";
import type { AnalyzerRouteState } from "../../types/routes";

type AType = "knowledge" | "tech" | "skill";
type AbilityLite = { name: string; code?: string; aType: AType };

/** Normalize any incoming ability-like value to AbilityLite. */
const normalizeOne = (a: unknown): AbilityLite => {
  if (typeof a === "string") return { name: a, aType: "skill" };
  const v = a as { name?: string; title?: string; code?: string; aType?: string; type?: string };
  return { name: v.name ?? v.title ?? "", code: v.code, aType: (v.aType ?? v.type ?? "skill") as AType };
};

/** Build a stable identity key for set membership. */
const identityOf = (it: AbilityLite): string => `${it.aType}|${it.code ?? it.name}`;

/** Static category builders for the picker. */
const buildSkillCats = (): AbilityCategory[] => [
  { id: "content", label: "Content", skills: (skillCategories.content ?? []).map((s) => s.name) },
  { id: "process", label: "Process", skills: (skillCategories.process ?? []).map((s) => s.name) },
  { id: "resourceManagement", label: "Resource Management", skills: (skillCategories.crossFunctional?.resourceManagement ?? []).map((s) => s.name) },
  { id: "technical", label: "Technical", skills: (skillCategories.crossFunctional?.technical ?? []).map((s) => s.name) },
];

const buildKnowledgeCats = (): AbilityCategory[] => [
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

const buildTechSkillCats = (): AbilityCategory[] => [
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

type AnalyzerAbilitiesProps = {
  occupationCodes?: string | string[];
  abilities?: Array<string | AbilityLite>;
  onNext?: (list: AbilityLite[]) => void;
};

function PageImpl(
  { occupationCodes, abilities = [], onNext }: AnalyzerAbilitiesProps,
  ref: React.Ref<{ commitAndNext: () => void }>,
) {
  const dispatch = useAppDispatch();
  const { goPrev, goNext } = useStepNav();

  // Route fallback (roles/region/industries may be carried via navigation state)
  const { state } = useLocation();
  const routeState = (state as AnalyzerRouteState) || undefined;

  // Read persisted abilities to hydrate local list on first mount
  const persisted = useSelector((s: RootState) => s.analyzer);
  const reduxAbilities = persisted.chosenAbilities;

  // If Redux lost parts (after storage fallback), repopulate from route state
  useEffect(() => {
    if (!persisted.chosenRoles.length && routeState?.roles?.length) {
      dispatch(setChosenRoles(routeState.roles));
    }
    if (!persisted.preferredRegion && routeState?.region) {
      dispatch(setPreferredRegion(routeState.region));
    }
    if (
      (!persisted.interestedIndustryCodes ||
        !persisted.interestedIndustryCodes.length) &&
      routeState?.industries?.length
    ) {
      dispatch(setInterestedIndustryCodes(routeState.industries));
    }
  }, [persisted, routeState, dispatch]);

  // Local selections hydrate once from props or Redux
  const [localAbilities, setLocalAbilities] = useState<AbilityLite[]>(
    () => (abilities.length ? abilities.map(normalizeOne) : reduxAbilities)
  );

  // Guard: if first render had empty props and Redux later rehydrates, fill once
  const hydratedOnce = useRef<boolean>(false);
  useEffect(() => {
    if (hydratedOnce.current) return;
    if (!localAbilities.length && reduxAbilities.length) {
      setLocalAbilities(reduxAbilities);
      hydratedOnce.current = true;
    }
  }, [reduxAbilities, localAbilities.length]);

  const [errorMsg, setErrorMsg] = useState<string>("");

  const [open, setOpen] = useState<Record<AType, boolean>>({
    knowledge: true,
    tech: true,
    skill: true,
  });
  const toggleCard = (k: AType): void => setOpen((p) => ({ ...p, [k]: !p[k] }));

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCats, setPickerCats] = useState<AbilityCategory[]>([]);
  const [pickerTitle, setPickerTitle] = useState("Edit items");
  const [pickerType, setPickerType] = useState<AType>("skill");

  const pickerMeta = useMemo(
    () =>
      ({
        knowledge: { title: "Edit knowledge by category", cats: buildKnowledgeCats() },
        tech: { title: "Edit tech skills by category", cats: buildTechSkillCats() },
        skill: { title: "Edit skills by category", cats: buildSkillCats() },
      }) as const,
    []
  );

  // Occupation codes from props or Redux roles
  const chosenRoles = useSelector((s: RootState) => s.analyzer.chosenRoles);

  const codes = useMemo<string[]>(() => {
    const fromProp =
      typeof occupationCodes === "string"
        ? [occupationCodes]
        : Array.isArray(occupationCodes)
        ? occupationCodes
        : [];
    const base = fromProp.length ? fromProp : (chosenRoles ?? []).map((r) => r.id);
    const uniq: string[] = [];
    const seen = new Set<string>();
    for (const c of base) {
      const v = (c ?? "").trim();
      if (!v || seen.has(v)) continue;
      seen.add(v);
      uniq.push(v);
    }
    return uniq.slice(0, 5);
  }, [occupationCodes, chosenRoles]);

  // Fetch abilities by occupation codes
  const { loading, error, data } = useAbilitiesByCodes(codes);

  // Merge fetched abilities into current list (never clear on failure)
  useEffect(() => {
    if (!data) return;
    try {
      setLocalAbilities((prev) => {
        const map = new Map(prev.map((it) => [identityOf(it), it]));
        let changed = false;
        for (const raw of data) {
          const it = normalizeOne(raw);
          const k = identityOf(it);
          if (!map.has(k)) {
            map.set(k, it);
            changed = true;
          }
        }
        return changed ? Array.from(map.values()) : prev;
      });
    } catch {
      setErrorMsg("Failed to merge abilities. Please retry.");
    }
  }, [data]);

  // Keep Redux in sync so SelectedSummary shows ability count
  useEffect(() => {
    dispatch(setChosenAbilities(localAbilities));
  }, [localAbilities, dispatch]);

  // Group by type for lists and counters
  const groups = useMemo(() => {
    const knowledge: AbilityLite[] = [];
    const tech: AbilityLite[] = [];
    const skill: AbilityLite[] = [];
    localAbilities.forEach((it) => {
      if (it.aType === "knowledge") knowledge.push(it);
      else if (it.aType === "tech") tech.push(it);
      else skill.push(it);
    });
    return { knowledge, tech, skill };
  }, [localAbilities]);

  // Bulk add from picker
  const addMany = (names: string[], aType: AType): void => {
    setLocalAbilities((prev) => {
      const seen = new Set(prev.map(identityOf));
      const next = [...prev];
      for (const n of names) {
        const candidate: AbilityLite = { name: n, aType };
        const key = identityOf(candidate);
        if (!seen.has(key)) next.push(candidate);
      }
      return next;
    });
  };

  // Remove one by name+aType
  const removeOne = (name: string, aType: AType): void => {
    setLocalAbilities((xs) => xs.filter((x) => !(x.name === name && x.aType === aType)));
  };

  // Open picker for a specific type
  const openEditor = (type: AType): void => {
    const meta = pickerMeta[type];
    setPickerType(type);
    setPickerTitle(meta.title);
    setPickerCats(meta.cats);
    setPickerOpen(true);
  };

  // Expose imperative API
  useImperativeHandle(ref, () => ({
    commitAndNext: () => onNext?.(localAbilities),
  }));

  const nextDisabled = localAbilities.length === 0;
  const nextTitle = nextDisabled ? "Select at least one ability to continue" : undefined;

  // Analyzing state: nothing selected yet and still loading without an error
  const showAnalyzing = loading && localAbilities.length === 0 && !error;

  const handleNext = (): void => {
    if (nextDisabled) return;
    onNext?.(localAbilities);
    goNext();
  };

  return (
    <AnalyzerLayout
      className="pb-24"
      title="Review & curate abilities"
      helpContent={{
        title: "How to use this page",
        subtitle: "Review suggested abilities and edit by category when needed.",
        features: [
          "Use Edit to add abilities by category.",
          "Collapse sections you do not need to view.",
        ],
        tips: [
          "At least one ability is required to proceed.",
          "Your selections sync to the summary panel automatically.",
        ],
      }}
    >
      {showAnalyzing && (
        <div className="mt-4 text-sm text-ink-soft" aria-live="polite">
          Analyzing...
        </div>
      )}

      {(error || errorMsg) && (
        <div className="mt-4">
          <GlobalError
            feedbackHref="/feedback"
            message="We're having an issue right now. Please try again later, or send us feedback."
          />
        </div>
      )}

      <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Knowledge */}
        <div className="rounded-2xl border border-border p-4 min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleCard("knowledge")}
              aria-expanded={open.knowledge}
              className="h-7 w-7 rounded-full border border-border text-xs grid place-items-center"
              title={open.knowledge ? "Collapse" : "Expand"}
            >
              {open.knowledge ? "−" : "+"}
            </button>
            <h3 className="font-semibold text-sm sm:text-base md:text-lg">Knowledge</h3>
          </div>
          {open.knowledge && (
            <AbilityList
              items={groups.knowledge}
              tag="knowledge"
              onEdit={openEditor}
              onRemove={removeOne}
            />
          )}
        </div>

        {/* Tech */}
        <div className="rounded-2xl border border-border p-4 min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleCard("tech")}
              aria-expanded={open.tech}
              className="h-7 w-7 rounded-full border border-border text-xs grid place-items-center"
              title={open.tech ? "Collapse" : "Expand"}
            >
              {open.tech ? "−" : "+"}
            </button>
            <h3 className="font-semibold text-sm sm:text-base md:text-lg">Tech Skills</h3>
          </div>
          {open.tech && (
            <AbilityList
              items={groups.tech}
              tag="tech"
              onEdit={openEditor}
              onRemove={removeOne}
            />
          )}
        </div>

        {/* Skills */}
        <div className="rounded-2xl border border-border p-4 min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleCard("skill")}
              aria-expanded={open.skill}
              className="h-7 w-7 rounded-full border border-border text-xs grid place-items-center"
              title={open.skill ? "Collapse" : "Expand"}
            >
              {open.skill ? "−" : "+"}
            </button>
            <h3 className="font-semibold text-sm sm:text-base md:text-lg">Skills</h3>
          </div>
          {open.skill && (
            <AbilityList
              items={groups.skill}
              tag="skill"
              onEdit={openEditor}
              onRemove={removeOne}
            />
          )}
        </div>
      </section>

      <footer className="mt-10 flex items-center justify-end gap-3">
        <Button variant="ghost" onClick={goPrev}>Back</Button>
        <Button onClick={handleNext} disabled={nextDisabled} title={nextTitle}>
          Next
        </Button>
      </footer>

      <AbilityPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={pickerTitle}
        categories={pickerCats}
        initiallySelected={localAbilities.filter((x) => x.aType === pickerType).map((x) => x.name)}
        onConfirm={(picked) => {
          addMany(picked, pickerType);
          setPickerOpen(false);
        }}
      />
    </AnalyzerLayout>
  );
}

/** Named forwardRef export if parent needs imperative API */
export const AnalyzerAbilitiesInner = forwardRef(PageImpl);

/** Default export with page-level ErrorBoundary */
export default function AnalyzerAbilities(): React.ReactElement {
  return (
    <ErrorBoundary feedbackHref="/feedback">
      <AnalyzerAbilitiesInner />
    </ErrorBoundary>
  );
}
