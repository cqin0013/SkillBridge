/**
 * AnalyzerAbilities
 * - Fetch + merge abilities by occupation codes.
 * - Local list lazily hydrates from Redux chosenAbilities so Back restores chips.
 * - Per-section collapse; body uses AbilityList to show count, Edit, and chips.
 * - "Analyzing..." when empty + loading; inline error on failure (GlobalError).
 * - If API returns empty successfully, show a guidance notice to customize or go back.
 * - Next disabled until at least one ability exists.
 * - Local edits sync to Redux.
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
import type { AbilityLite, AType } from "../../store/analyzerSlice";
import type { AnalyzerRouteState } from "../../types/routes";

/** Normalize any incoming ability-like value to AbilityLite. */
const normalizeOne = (a: unknown): AbilityLite => {
  if (typeof a === "string") return { name: a, aType: "skill" };
  const v = a as { name?: string; title?: string; code?: string; aType?: string; type?: string };
  return { name: v.name ?? v.title ?? "", code: v.code, aType: (v.aType ?? v.type ?? "skill") as AType };
};

/** Build a stable identity key for set membership. */
const identityOf = (it: AbilityLite): string => `${it.aType}|${it.code ?? it.name}`;

/** Category builders for picker */
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
  ref: React.Ref<{ commitAndNext: () => void }>
) {
  const dispatch = useAppDispatch();
  const { goPrev, goNext } = useStepNav();
  const { state } = useLocation();
  const routeState = (state as AnalyzerRouteState) || undefined;

  const persisted = useSelector((s: RootState) => s.analyzer);
  const reduxAbilities = persisted.chosenAbilities;

  // Route fallback for missing Redux data
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

  // Local list hydrated from props or Redux
  const [localAbilities, setLocalAbilities] = useState<AbilityLite[]>(
    () => (abilities.length ? abilities.map(normalizeOne) : reduxAbilities)
  );
  const hydratedOnce = useRef(false);
  useEffect(() => {
    if (hydratedOnce.current) return;
    if (!localAbilities.length && reduxAbilities.length) {
      setLocalAbilities(reduxAbilities);
      hydratedOnce.current = true;
    }
  }, [reduxAbilities, localAbilities.length]);

  const [errorMsg, setErrorMsg] = useState("");
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
    () => ({
      knowledge: { title: "Edit knowledge by category", cats: buildKnowledgeCats() },
      tech: { title: "Edit tech skills by category", cats: buildTechSkillCats() },
      skill: { title: "Edit skills by category", cats: buildSkillCats() },
    }),
    []
  );

  // Determine occupation codes
  const chosenRoles = useSelector((s: RootState) => s.analyzer.chosenRoles);
  const codes = useMemo<string[]>(() => {
    const fromProp =
      typeof occupationCodes === "string"
        ? [occupationCodes]
        : Array.isArray(occupationCodes)
        ? occupationCodes
        : [];
    const base = fromProp.length ? fromProp : (chosenRoles ?? []).map((r) => r.id);
    const seen = new Set<string>();
    const uniq: string[] = [];
    for (const c of base) {
      const v = (c ?? "").trim();
      if (!v || seen.has(v)) continue;
      seen.add(v);
      uniq.push(v);
    }
    return uniq.slice(0, 5);
  }, [occupationCodes, chosenRoles]);

  // Fetch by codes
  const { loading, error, data } = useAbilitiesByCodes(codes);

  // Merge fetched abilities into local list
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

  // Keep Redux in sync
  useEffect(() => {
    dispatch(setChosenAbilities(localAbilities));
  }, [localAbilities, dispatch]);

  // Groups for rendering
  const groups = useMemo(() => {
    const knowledge: AbilityLite[] = [];
    const tech: AbilityLite[] = [];
    const skill: AbilityLite[] = [];
    for (const it of localAbilities) {
      if (it.aType === "knowledge") knowledge.push(it);
      else if (it.aType === "tech") tech.push(it);
      else skill.push(it);
    }
    return { knowledge, tech, skill };
  }, [localAbilities]);

  /** Apply only diff (add/remove) for one category */
  const applyPickerDiff = (pickedNames: string[], aType: AType): void => {
    const currentNames = new Set(
      localAbilities.filter((x) => x.aType === aType).map((x) => x.name)
    );
    const nextNames = new Set(pickedNames);
    const toAdd: string[] = [];
    const toRemove: string[] = [];

    for (const n of nextNames) if (!currentNames.has(n)) toAdd.push(n);
    for (const n of currentNames) if (!nextNames.has(n)) toRemove.push(n);

    setLocalAbilities((prev) => {
      const next = prev.filter(
        (x) => !(x.aType === aType && toRemove.includes(x.name))
      );
      const seen = new Set(next.map(identityOf));
      for (const n of toAdd) {
        const cand = { name: n, aType } as AbilityLite;
        const key = identityOf(cand);
        if (!seen.has(key)) {
          next.push(cand);
          seen.add(key);
        }
      }
      return next;
    });
  };

  /** Open manual editor starting from skills category */
  const openManual = (): void => {
    const meta = pickerMeta.skill;
    setPickerType("skill");
    setPickerTitle(meta.title);
    setPickerCats(meta.cats);
    setPickerOpen(true);
  };

  const openEditor = (type: AType): void => {
    const meta = pickerMeta[type];
    setPickerType(type);
    setPickerTitle(meta.title);
    setPickerCats(meta.cats);
    setPickerOpen(true);
  };

  useImperativeHandle(ref, () => ({
    commitAndNext: () => onNext?.(localAbilities),
  }));

  const nextDisabled = localAbilities.length === 0;
  const nextTitle = nextDisabled ? "Select at least one ability to continue" : undefined;

  // Loading state when nothing yet
  const showAnalyzing = loading && localAbilities.length === 0 && !error;

  // API succeeded but returned an empty list
  const apiEmpty =
    !loading &&
    !error &&
    Array.isArray(data) &&
    data.length === 0 &&
    localAbilities.length === 0;

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
        features: ["Use Edit to add abilities by category.", "Collapse sections you do not need to view."],
        tips: ["At least one ability is required to proceed.", "Your selections sync to the summary panel automatically."],
      }}
    >
      {showAnalyzing && <div className="mt-4 text-sm text-ink-soft">Analyzing...</div>}

      {(error || errorMsg) && (
        <div className="mt-4">
          <GlobalError
            feedbackHref="/feedback"
            message="We're having an issue right now. Please try again later, or send us feedback."
          />
        </div>
      )}

      {apiEmpty && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-900">
          <p className="mb-3">
            The occupation you selected has no required abilities in our data. You can customize abilities manually, or go back to choose another occupation.
          </p>
          <div className="flex gap-3">
            <Button onClick={openManual}>Customize</Button>
            <Button variant="ghost" onClick={goPrev}>Go back</Button>
          </div>
        </div>
      )}

      <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(["knowledge", "tech", "skill"] as AType[]).map((type) => (
          <div key={type} className="rounded-2xl border border-border p-4 min-w-0">
            <div className="mb-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleCard(type)}
                aria-expanded={open[type]}
                className="h-7 w-7 rounded-full border border-border text-xs grid place-items-center"
                title={open[type] ? "Collapse" : "Expand"}
              >
                {open[type] ? "−" : "+"}
              </button>
              <h3 className="font-semibold text-sm sm:text-base md:text-lg capitalize">
                {type === "tech" ? "Tech Skills" : type}
              </h3>
            </div>
            {open[type] && (
              <AbilityList
                items={groups[type]}
                tag={type}
                onEdit={openEditor}
                onRemove={(name) =>
                  setLocalAbilities((xs) => xs.filter((x) => !(x.name === name && x.aType === type)))
                }
              />
            )}
          </div>
        ))}
      </section>

      <footer className="mt-10 flex items-center justify-end gap-3">
        <Button variant="ghost" onClick={goPrev}>
          Back
        </Button>
        <Button onClick={handleNext} disabled={nextDisabled} title={nextTitle} tooltipWhenDisabled="Please add at least one ability first">
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
          applyPickerDiff(picked, pickerType);
          setPickerOpen(false);
        }}
      />
    </AnalyzerLayout>
  );
}

export const AnalyzerAbilitiesInner = forwardRef(PageImpl);

export default function AnalyzerAbilities(): React.ReactElement {
  return (
    <ErrorBoundary feedbackHref="/feedback">
      <AnalyzerAbilitiesInner />
    </ErrorBoundary>
  );
}
