// Shared types for the summary system.

import type { RootState } from "../store";
import type { RoleLite } from "../store/analyzerSlice";

/** Summary */
export type SummaryRoot = Pick<RootState, "analyzer">;


export type { RoleLite };

export type DraftOverrides = {
  region?: string;
  industryCodes?: string[];
  roles?: RoleLite[];
  abilityCounts?: { knowledge: number; tech: number; skill: number; total: number };
};

export type SummaryItem = {
  id: string;
  label: string;
  value?: string | number;
  pill?: boolean;
};

export type SummaryBuilder1<S = SummaryRoot> = (state: S) => SummaryItem[];
export type SummaryBuilder2<S = SummaryRoot> = (
  state: S,
  drafts?: DraftOverrides
) => SummaryItem[];

export type SummaryBuilder<S = SummaryRoot> =
  | SummaryBuilder1<S>
  | SummaryBuilder2<S>;

