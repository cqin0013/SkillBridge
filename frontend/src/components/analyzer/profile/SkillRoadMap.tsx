// src/components/analyzer/SkillRoadmapWithSchedule.tsx
import React, { useMemo, useState } from "react";
import AbilityPicker, { type AbilityCategory } from "../AbilityPicker";
import SkillTypeCategoryPicker from "./SkillTypeCategoryPicker";

/** Ability type union aligned with AnalyzerAbilities */
export type AType = "knowledge" | "tech" | "skill";

/** Base ability item */
export type AbilityLite = { name: string; code?: string; aType: AType };

/** Ability with schedule fields (ISO yyyy-mm-dd, inclusive) */
export type AbilityWithSchedule = AbilityLite & {
  start?: string;
  end?: string;
};

/** Public props */
export type SkillRoadmapWithScheduleProps = {
  /** Current abilities with schedule */
  value: AbilityWithSchedule[];
  /** Save handler after editing */
  onChange: (next: AbilityWithSchedule[]) => void;

  /** Category builders reused from AnalyzerAbilities */
  buildKnowledgeCats: () => AbilityCategory[];
  buildTechSkillCats: () => AbilityCategory[];
  buildSkillCats: () => AbilityCategory[];

  /** Optional UI labels */
  labels?: {
    title?: string;
    subtitle?: string;
    edit?: string;
    save?: string;
    cancel?: string;
    showLess?: string;
    showFull?: string;
    totals?: string;
    ongoing?: string;
    upcoming?: string;
    expired?: string;
    kLabel?: string;
    tLabel?: string;
    sLabel?: string;
    scheduleTitle?: string;
    startCol?: string;
    endCol?: string;
  };
};

/** Build stable identity to dedupe items across lists */
const identityOf = (it: AbilityLite): string => `${it.aType}|${it.code ?? it.name}`;

/** Parse yyyy-mm-dd to Date (00:00), return undefined if invalid */
const parseDate = (s?: string): Date | undefined => {
  if (!s) return undefined;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/** Status buckets used in Show less view */
type Status = "ongoing" | "upcoming" | "expired";
/** Rules:
 * - upcoming: start > today
 * - expired: end < today
 * - ongoing: otherwise (includes missing dates)
 */
const statusOf = (a: AbilityWithSchedule, today: Date): Status => {
  const start = parseDate(a.start);
  const end = parseDate(a.end);
  // strip time to compare date-only
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (start && start > t) return "upcoming";
  if (end && end < t) return "expired";
  return "ongoing";
};

/** Small chips for full view */
const Chips: React.FC<{ items: string[] }> = ({ items }) => {
  if (!items.length) return <span className="text-gray-500">None</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((s) => (
        <span key={s} className="rounded-full border px-2 py-0.5 text-xs">{s}</span>
      ))}
    </div>
  );
};

/** Unified editor: one modal with tabs + schedule table */
const UnifiedAbilityEditor: React.FC<{
  open: boolean;
  onClose: () => void;
  current: AbilityWithSchedule[];
  cats: { knowledge: AbilityCategory[]; tech: AbilityCategory[]; skill: AbilityCategory[] };
  onConfirmAll: (next: AbilityWithSchedule[]) => void;
  labels: {
    save: string; cancel: string; scheduleTitle: string; startCol: string; endCol: string;
  };
}> = ({ open, onClose, current, cats, onConfirmAll, labels }) => {
  const [tab, setTab] = useState<AType>("skill");

  // Split selected names by type for the picker
  const initialNamesByType = useMemo(() => {
    const k: string[] = [], t: string[] = [], s: string[] = [];
    current.forEach((x) => {
      if (x.aType === "knowledge") k.push(x.name);
      else if (x.aType === "tech") t.push(x.name);
      else s.push(x.name);
    });
    return { k, t, s };
  }, [current]);

  const [selK, setSelK] = useState<string[]>(initialNamesByType.k);
  const [selT, setSelT] = useState<string[]>(initialNamesByType.t);
  const [selS, setSelS] = useState<string[]>(initialNamesByType.s);

  // Schedule map keyed by identity
  const [schedule, setSchedule] = useState<Record<string, { start?: string; end?: string }>>(() => {
    const acc: Record<string, { start?: string; end?: string }> = {};
    current.forEach((x) => { acc[identityOf(x)] = { start: x.start, end: x.end }; });
    return acc;
  });

  const handleConfirmNames = (names: string[], aType: AType): void => {
    if (aType === "knowledge") setSelK(names);
    if (aType === "tech") setSelT(names);
    if (aType === "skill") setSelS(names);
  };

  // Merge selected names with schedule map
  const mergedList = useMemo<AbilityWithSchedule[]>(() => {
    const list: AbilityWithSchedule[] = [
      ...selK.map((n) => ({ name: n, aType: "knowledge" as const })),
      ...selT.map((n) => ({ name: n, aType: "tech" as const })),
      ...selS.map((n) => ({ name: n, aType: "skill" as const })),
    ];
    const map = new Map<string, AbilityWithSchedule>();
    list.forEach((m) => {
      const key = identityOf(m);
      map.set(key, { ...m, ...(schedule[key] ?? {}) });
    });
    return Array.from(map.values());
  }, [selK, selT, selS, schedule]);

  const onChangeDate = (key: string, field: "start" | "end", v: string): void => {
    setSchedule((prev) => ({ ...prev, [key]: { ...(prev[key] ?? {}), [field]: v || undefined } }));
  };

  const pickerProps = useMemo(() => {
    if (tab === "knowledge") {
      return {
        title: "Edit knowledge by category",
        categories: cats.knowledge,
        initiallySelected: selK,
        onConfirm: (picked: string[]) => handleConfirmNames(picked, "knowledge"),
      };
    }
    if (tab === "tech") {
      return {
        title: "Edit tech skills by category",
        categories: cats.tech,
        initiallySelected: selT,
        onConfirm: (picked: string[]) => handleConfirmNames(picked, "tech"),
      };
    }
    return {
      title: "Edit skills by category",
      categories: cats.skill,
      initiallySelected: selS,
      onConfirm: (picked: string[]) => handleConfirmNames(picked, "skill"),
    };
  }, [tab, cats, selK, selT, selS]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 sm:p-8">
      <div className="w-full max-w-5xl rounded-2xl bg-white p-4 sm:p-6">
        {/* Tabs + actions */}
        <div className="mb-3 flex items-center gap-2">
          {(["skill", "tech", "knowledge"] as AType[]).map((k) => (
            <button
              key={k}
              type="button"
              className={`rounded-xl border px-3 py-1.5 text-sm ${tab === k ? "bg-gray-900 text-white" : "hover:bg-gray-50"}`}
              onClick={() => setTab(k)}
              aria-current={tab === k ? "page" : undefined}
            >
              {k === "skill" ? "Skills" : k === "tech" ? "Tech Skills" : "Knowledge"}
            </button>
          ))}
          <div className="grow" />
          <button type="button" className="rounded-xl border px-3 py-1.5 text-sm" onClick={() => onConfirmAll(mergedList)}>
            {labels.save}
          </button>
          <button type="button" className="rounded-xl border px-3 py-1.5 text-sm" onClick={onClose}>
            {labels.cancel}
          </button>
        </div>

        {/* Category picker (same UX as AnalyzerAbilities) */}
        <AbilityPicker
          open
          onClose={onClose}
          title={pickerProps.title}
          categories={pickerProps.categories}
          initiallySelected={pickerProps.initiallySelected}
          onConfirm={pickerProps.onConfirm}
        />

        {/* Schedule editor */}
        <div className="mt-4">
          <div className="mb-2 text-sm font-medium">{labels.scheduleTitle}</div>
          <div className="max-h-[320px] overflow-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Skill</th>
                  <th className="px-3 py-2 text-left">{labels.startCol}</th>
                  <th className="px-3 py-2 text-left">{labels.endCol}</th>
                </tr>
              </thead>
              <tbody>
                {mergedList.map((row) => {
                  const key = identityOf(row);
                  const cur = schedule[key] ?? {};
                  return (
                    <tr key={key} className="border-t">
                      <td className="px-3 py-2">{row.aType}</td>
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          className="w-[11rem] rounded border px-2 py-1"
                          value={cur.start ?? ""}
                          onChange={(e) => onChangeDate(key, "start", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          className="w-[11rem] rounded border px-2 py-1"
                          value={cur.end ?? ""}
                          onChange={(e) => onChangeDate(key, "end", e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
                {mergedList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-gray-500">No items selected</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">Empty start/end is treated as ongoing.</p>
        </div>
      </div>
    </div>
  );
};

/** Main component with Show less / Show full and unified editor */
const SkillRoadmapWithSchedule: React.FC<SkillRoadmapWithScheduleProps> = ({
  value,
  onChange,
  buildKnowledgeCats,
  buildTechSkillCats,
  buildSkillCats,
  labels,
}) => {
  const text = {
    title: labels?.title ?? "Skill roadmap",
    subtitle: labels?.subtitle ?? "One editor with per-skill start/end dates.",
    edit: labels?.edit ?? "Edit",
    save: labels?.save ?? "Save",
    cancel: labels?.cancel ?? "Cancel",
    showLess: labels?.showLess ?? "Show less",
    showFull: labels?.showFull ?? "Show full",
    totals: labels?.totals ?? "Totals",
    ongoing: labels?.ongoing ?? "Ongoing",
    upcoming: labels?.upcoming ?? "Upcoming",
    expired: labels?.expired ?? "Expired",
    kLabel: labels?.kLabel ?? "Knowledge",
    tLabel: labels?.tLabel ?? "Tech Skills",
    sLabel: labels?.sLabel ?? "Skills",
    scheduleTitle: labels?.scheduleTitle ?? "Set start/end dates",
    startCol: labels?.startCol ?? "Start",
    endCol: labels?.endCol ?? "End",
  };

  const [open, setOpen] = useState(false);
  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [showLess, setShowLess] = useState(false);

  // Reuse the same category data as AnalyzerAbilities
  const cats = useMemo(
    () => ({
      knowledge: buildKnowledgeCats(),
      tech: buildTechSkillCats(),
      skill: buildSkillCats(),
    }),
    [buildKnowledgeCats, buildTechSkillCats, buildSkillCats]
  );

  // Full view grouping
  const groups = useMemo(() => {
    const knowledge: string[] = [], tech: string[] = [], skill: string[] = [];
    value.forEach((x) => {
      if (x.aType === "knowledge") knowledge.push(x.name);
      else if (x.aType === "tech") tech.push(x.name);
      else skill.push(x.name);
    });
    return { knowledge, tech, skill };
  }, [value]);

  // Counters for Show less view
  const today = new Date();
  const counters = useMemo(() => {
    let ongoing = 0, upcoming = 0, expired = 0;
    value.forEach((v) => {
      const st = statusOf(v, today);
      if (st === "ongoing") ongoing += 1;
      else if (st === "upcoming") upcoming += 1;
      else expired += 1;
    });
    return { total: value.length, ongoing, upcoming, expired };
  }, [value, today]);

  return (
    <section className="rounded-2xl border p-4 sm:p-6">
      <header className="mb-4 flex items-start gap-2">
        <div className="grow">
          <h2 className="text-base font-semibold sm:text-lg">{text.title}</h2>
          <p className="mt-1 text-sm text-gray-600">{text.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-primary bg-primary text-white px-3 py-1.5 text-sm hover:bg-primary/90"
            onClick={() => setAddSkillOpen(true)}
          >
            + Add Skill
          </button>
          <button
            type="button"
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
            onClick={() => setShowLess((s) => !s)}
          >
            {showLess ? text.showFull : text.showLess}
          </button>
          <button
            type="button"
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
            onClick={() => setOpen(true)}
          >
            {text.edit}
          </button>
        </div>
      </header>

      {showLess ? (
        // Compact counters only
        <div className="rounded-xl border p-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-gray-500">{text.totals}</div>
              <div className="text-lg font-semibold">{counters.total}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-gray-500">{text.ongoing}</div>
              <div className="text-lg font-semibold">{counters.ongoing}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-gray-500">{text.upcoming}</div>
              <div className="text-lg font-semibold">{counters.upcoming}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-gray-500">{text.expired}</div>
              <div className="text-lg font-semibold">{counters.expired}</div>
            </div>
          </div>
        </div>
      ) : (
        // Full grouped view
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border p-3">
            <div className="mb-2 text-sm font-medium">{text.kLabel}</div>
            <Chips items={groups.knowledge} />
          </div>
          <div className="rounded-xl border p-3">
            <div className="mb-2 text-sm font-medium">{text.tLabel}</div>
            <Chips items={groups.tech} />
          </div>
          <div className="rounded-xl border p-3">
            <div className="mb-2 text-sm font-medium">{text.sLabel}</div>
            <Chips items={groups.skill} />
          </div>
        </div>
      )}

      {/* Editor modal */}
      <UnifiedAbilityEditor
        open={open}
        onClose={() => setOpen(false)}
        current={value}
        cats={cats}
        onConfirmAll={(next) => {
          const map = new Map<string, AbilityWithSchedule>();
          next.forEach((n) => map.set(identityOf(n), n)); // dedupe keep latest schedule
          onChange(Array.from(map.values()));
          setOpen(false);
        }}
        labels={{
          save: text.save,
          cancel: text.cancel,
          scheduleTitle: text.scheduleTitle,
          startCol: text.startCol,
          endCol: text.endCol,
        }}
      />

      {/* Add Skill modal */}
      <SkillTypeCategoryPicker
        open={addSkillOpen}
        onClose={() => setAddSkillOpen(false)}
        onConfirm={(newSkills) => {
          // Add new skills to existing value
          const updated = [...value];
          newSkills.forEach((skill) => {
            const key = identityOf(skill);
            // Only add if not already present
            if (!updated.some((v) => identityOf(v) === key)) {
              updated.push(skill);
            }
          });
          onChange(updated);
          setAddSkillOpen(false);
        }}
        buildKnowledgeCats={buildKnowledgeCats}
        buildTechSkillCats={buildTechSkillCats}
        buildSkillCats={buildSkillCats}
      />
    </section>
  );
};

export default SkillRoadmapWithSchedule;
