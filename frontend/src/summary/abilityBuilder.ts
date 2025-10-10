// src/summary/abilityBuilder.ts
// Builder that emits a single value row with Knowledge/Tech/Skills counts.
// The renderer stays dumb; it will just show this value row.
// No `any`.

import type { SummaryBuilder, SummaryItem, SummaryRoot, DraftOverrides } from "./types";
import { registerSummaryBuilder } from "./registry";

type AType = "knowledge" | "tech" | "skill";
type AbilityLite = { name: string; code?: string; aType: AType };

// Extend drafts to optionally carry abilities so pages can pass live picks.
type DraftWithAbilities = DraftOverrides & { abilities?: AbilityLite[] };

const abilityCountsBuilder: SummaryBuilder<SummaryRoot> = (state, drafts) => {
  const fromDrafts = (drafts as DraftWithAbilities | undefined)?.abilities;
  const chosen = fromDrafts ?? ((state.analyzer as { chosenAbilities?: AbilityLite[] | null })?.chosenAbilities ?? []);

  let knowledge = 0;
  let tech = 0;
  let skill = 0;
  for (const a of chosen) {
    if (a?.aType === "knowledge") knowledge += 1;
    else if (a?.aType === "tech") tech += 1;
    else if (a?.aType === "skill") skill += 1;
  }

  const items: SummaryItem[] = [
    {
      id: "ability:counts",
      label: "Counts",
      value: `Knowledge:${knowledge} • Tech:${tech} • Skills:${skill}`,
      pill: false,
    },
  ];

  return items;
};

export function registerAbilityCountsBuilder(): void {
  // Priority higher than generic core if needed; adjust weight as you like.
  registerSummaryBuilder("ability-counts", abilityCountsBuilder, 40);
}
