// src/summary/abilityBuilder.ts
// Emit a non-pill summary row so compact mode shows the count.
// Also emit pill chips for full mode.

import type { SummaryBuilder, SummaryItem, SummaryRoot, DraftOverrides } from "./types";
import { registerSummaryBuilder } from "./registry";

type AType = "knowledge" | "tech" | "skill";
type AbilityLite = { name: string; code?: string; aType: AType };

type AnalyzerWithAbilities = { chosenAbilities?: AbilityLite[] | null | undefined };
type DraftWithAbilities = DraftOverrides & { abilities?: AbilityLite[] };

const abilityBuilder: SummaryBuilder<SummaryRoot> = (state, drafts) => {
  const s = state.analyzer as AnalyzerWithAbilities;
  const fromDrafts = (drafts as DraftWithAbilities | undefined)?.abilities;
  const source: AbilityLite[] = fromDrafts ?? (s?.chosenAbilities ?? []);

  const items: SummaryItem[] = [];

  // Summary value row: compact will show this value
  items.push({
    id: "ability:__summary",
    label: "Abilities",
    value: String(source.length), // show count
    pill: false,
  });

  // Detail chips for full mode
  for (const a of source) {
    items.push({
      id: `ability:${a.aType}:${a.code || a.name}`,
      label: a.name,
      pill: true,
    });
  }

  return items;
};

export function registerAbilitySummaryBuilder() {
  registerSummaryBuilder("abilities", abilityBuilder, 40);
}
