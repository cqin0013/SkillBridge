// src/pages/analyzer/AnalyzerAbilities.tsx
/**
 * AnalyzerAbilities
 * - Fetch + merge abilities via useAbilitiesByCodes.
 * - Fallback: read occupation codes from Redux chosenRoles when prop missing.
 * - Collapse/expand cards; inline Edit opens AbilityPicker.
 * - Next disabled until at least one ability exists (with tooltip reason).
 * - When no abilities yet and loading, show "Analyzing...".
 * - On API failure, show inline error with link to /feedback.
 * - Sync local selections into Redux so SelectedSummary can show counts.
 */

import {
  useEffect,
  useMemo,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useStepNav } from "../../hooks/useRouteStep";
import AnalyzerLayout from "../../layouts/AnalyzerLayout";
import Button from "../../components/ui/Button";
import AbilityPicker, { type AbilityCategory } from "../../components/analyzer/AbilityPicker";
import AbilityList from "../../components/analyzer/AbilityList";

import { skillCategories } from "../../data/skill.static";
import { knowledgeCategories } from "../../data/knowledge.static";
import { techSkillCategories } from "../../data/techskill.static";

import { useAbilitiesByCodes } from "../../hooks/queries/useAbilitiesByCodes";
import type { RootState } from "../../store";
import { useAppDispatch } from "../../store/hooks";
import { setChosenAbilities } from "../../store/analyzerSlice";

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

  // Local selection
  const [localAbilities, setLocalAbilities] = useState<AbilityLite[]>(
    () => (abilities ?? []).map(normalizeOne),
  );
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Card open states
  const [open, setOpen] = useState<Record<AType, boolean>>({
    knowledge: true,
    tech: true,
    skill: true,
  });
  const toggleCard = (k: AType): void => setOpen((p) => ({ ...p, [k]: !p[k] }));

  // Picker modal state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCats, setPickerCats] = useState<AbilityCategory[]>([]);
  const [pickerTitle, setPickerTitle] = useState("Edit items");
  const [pickerType, setPickerType] = useState<AType>("skill");

  // Fallback occupation codes from Redux if prop missing
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

  // Merge fetched abilities once data arrives
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
        if (!seen.has(key)) {
          next.push(candidate);
          seen.add(key);
        }
      }
      return next;
    });
  };

  // Remove one by name+aType
  const removeOne = (name: string, aType: AType): void =>
    setLocalAbilities((xs) => xs.filter((x) => !(x.name === name && x.aType === aType)));

  // Open picker for a specific type
  const openEditor = (type: AType): void => {
    setPickerType(type);
    if (type === "knowledge") {
      setPickerTitle("Edit knowledge by category");
      setPickerCats(buildKnowledgeCats());
    } else if (type === "tech") {
      setPickerTitle("Edit tech skills by category");
      setPickerCats(buildTechSkillCats());
    } else {
      setPickerTitle("Edit skills by category");
      setPickerCats(buildSkillCats());
    }
    setPickerOpen(true);
  };

  // Expose imperative API
  useImperativeHandle(ref, () => ({
    commitAndNext: () => onNext?.(localAbilities),
  }));

  const nextDisabled = localAbilities.length === 0;
  const nextTitle = nextDisabled ? "Select at least one ability to continue" : undefined;

  // Analyzing state: nothing selected yet and still loading without an error
  const showAnalyzing = (loading && localAbilities.length === 0 && !error);

  const handleNext = (): void => {
    if (nextDisabled) return;
    onNext?.(localAbilities);
    goNext();
  };

  return (
    <AnalyzerLayout className="pb-24">
      <header className="mt-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-ink">Review & curate abilities</h1>
        <p className="mt-2 text-ink-soft text-sm sm:text-base">
          Edit each section. Collapse sections you do not need to view.
        </p>
      </header>

      {/* Loading without selections → Analyzing */}
      {showAnalyzing && (
        <div className="mt-4 text-sm text-ink-soft" aria-live="polite">
          Analyzing...
        </div>
      )}

      {/* Error state (API failure) */}
      {(error || errorMsg) && (
        <div className="mt-4 rounded-md bg-red-50 text-red-700 p-3 text-sm">
          We're having an issue right now. Please try again later or let us know via{" "}
          <Link to="/feedback" className="underline font-medium">
            Feedback
          </Link>
          .
        </div>
      )}

      <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Knowledge */}
        <div className="rounded-2xl border border-border p-4 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
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
              <Button size="sm" variant="ghost" onClick={() => openEditor("knowledge")}>Edit</Button>
            </div>
            <span className="text-xs sm:text-sm text-ink-soft">{groups.knowledge.length}</span>
          </div>
          {open.knowledge && (
            <AbilityList items={groups.knowledge} tag="knowledge" onRemove={removeOne} />
          )}
        </div>

        {/* Tech */}
        <div className="rounded-2xl border border-border p-4 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
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
              <Button size="sm" variant="ghost" onClick={() => openEditor("tech")}>Edit</Button>
            </div>
            <span className="text-xs sm:text-sm text-ink-soft">{groups.tech.length}</span>
          </div>
          {open.tech && (
            <AbilityList items={groups.tech} tag="tech" onRemove={removeOne} />
          )}
        </div>

        {/* Skills */}
        <div className="rounded-2xl border border-border p-4 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
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
              <Button size="sm" variant="ghost" onClick={() => openEditor("skill")}>Edit</Button>
            </div>
            <span className="text-xs sm:text-sm text-ink-soft">{groups.skill.length}</span>
          </div>
          {open.skill && (
            <AbilityList items={groups.skill} tag="skill" onRemove={removeOne} />
          )}
        </div>
      </section>

      <footer className="mt-10 flex items-center justify-end gap-3">
        <Button variant="ghost" onClick={goPrev}>Back</Button>
        <Button onClick={handleNext} disabled={nextDisabled} title={nextTitle}>
          Next
        </Button>
      </footer>

      {/* Category picker modal */}
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

export default forwardRef(PageImpl);
