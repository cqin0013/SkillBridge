// src/summary/registry.ts
// Central plugin registry that aggregates items from all builders.
// Works with builders that take 1 arg (state) or 2 args (state, drafts).
// We only select the `analyzer` slice to avoid unnecessary re-renders.

import { useMemo } from "react";
import { shallowEqual } from "react-redux";
import { useAppSelector } from "../store/hooks";
import type {
  SummaryRoot,
  SummaryItem,
  DraftOverrides,
  SummaryBuilder,
  SummaryBuilder1,
  SummaryBuilder2,
} from "./types";

// HMR-safe registry
type Registered = { key: string; order: number; build: SummaryBuilder<SummaryRoot> };
const registry: Registered[] = [];

/** Register once per key. Lower `order` runs earlier. */
export function registerSummaryBuilder(
  key: string,
  build: SummaryBuilder<SummaryRoot>,
  order = 100
): void {
  if (registry.some((r) => r.key === key)) return;
  registry.push({ key, build, order });
  registry.sort((a, b) => a.order - b.order);
}

/** Optional: clear all builders (useful for tests). */
export function clearSummaryBuilders(): void {
  registry.length = 0;
}

/** Aggregate results from all builders (supports 1-arg and 2-arg signatures). */
export function buildSummaryItems(
  state: SummaryRoot,
  drafts?: DraftOverrides
): SummaryItem[] {
  const out: SummaryItem[] = [];
  for (const r of registry) {
    try {
      const part =
        (r.build.length >= 2
          ? (r.build as SummaryBuilder2<SummaryRoot>)(state, drafts)
          : (r.build as SummaryBuilder1<SummaryRoot>)(state)) || [];
      if (part.length) out.push(...part);
    } catch {
      // keep UI resilient; consider logging if needed
      // console.error("[summary] builder failed:", r.key, err);
    }
  }
  return out;
}

/** UI hook: pick analyzer slice and build live summary items. */
export function useSummaryItemsLive(drafts?: DraftOverrides): SummaryItem[] {
  const summaryState = useAppSelector(
    (s) => ({ analyzer: s.analyzer }),
    shallowEqual
  );
  return useMemo(() => buildSummaryItems(summaryState, drafts), [summaryState, drafts]);
}
