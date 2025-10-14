// Mappers to convert API models into domain models for UI.

import type {  SkillsByCodeRes } from "../../types/api";
import type { AnzscoOccupation, AbilityLite, AbilityType } from "../../types/domain";

/** Map search API item (supports both legacy and new field names) */
export function mapSearchItemToDomain(i: {
  code?: string;
  title?: string;
  anzsco_code?: string;
  anzsco_title?: string;
  anzsco_description?: string;
}): AnzscoOccupation {
  return {
    code: i.code ?? i.anzsco_code ?? "",
    title: i.title ?? i.anzsco_title ?? "",
    description: i.anzsco_description, // optional
  };
}

/** Core mapper: flatten skills payload to AbilityLite[] */
export function mapSkillsToAbilities(res: SkillsByCodeRes): AbilityLite[] {
  const pick = (arr: { code?: string; title: string }[], type: AbilityType): AbilityLite[] =>
    (arr ?? []).map((x) => ({
      id: `${type}|${x.code ?? x.title}`,
      name: x.title,
      type,
      code: x.code,
    }));

  return [
    ...pick(res.knowledge_titles, "knowledge"),
    ...pick(res.tech_titles, "tech"),
    ...pick(res.skill_titles, "skill"),
  ];
}

/* --------- Backward-compatible aliases --------- */
/** Alias used in部分代码 */
export const mapSkillsToFlat = mapSkillsToAbilities;
/** Alias to match page import: mapAbilitiesToFlat */
export const mapAbilitiesToFlat = mapSkillsToAbilities;
