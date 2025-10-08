// src/types/route.ts
// Route constants + the shape of the state object we attach to navigation.
// Keep paths in sync with STEP_PATHS (src/hooks/useRouteStep.ts).

import type {
  RoleLite,
  AbilityLite,
  SelectedJob,
  UnmatchedBuckets,
  TrainingAdviceState,
} from "../store/analyzerSlice";

export const ROUTE = {
  intro: "/analyzer/intro",
  getInfo: "/analyzer/get-info",
  abilities: "/analyzer/abilities",
  jobSuggestion: "/analyzer/job-suggestion",
  skillGap: "/analyzer/skill-gap",
  training: "/analyzer/training",
} as const;

export type AnalyzerRoutePath = (typeof ROUTE)[keyof typeof ROUTE];

/** State we optionally pass via navigate(path, { state }) for cross-page fallbacks. */
export type AnalyzerRouteState = Partial<{
  roles: RoleLite[];                 // selected roles
  abilities: AbilityLite[];          // curated abilities
  industries: string[];              // interested industry codes
  region: string;                    // preferred region
  selectedJob: SelectedJob;          // picked job
  unmatched: UnmatchedBuckets | null;// skill-gap buckets
  training: TrainingAdviceState | null; // training advice cache
}>;

/** Narrowing helper when reading location.state */
export function isAnalyzerRouteState(v: unknown): v is AnalyzerRouteState {
  return typeof v === "object" && v !== null;
}
