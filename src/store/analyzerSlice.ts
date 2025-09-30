// src/store/analyzer-slice.ts
// Centralized cross-step state for the Analyzer wizard.
// Store only "final user choices" here; keep server resources in React Query.
// The slice stays small and serializable for predictable debugging.

import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction} from "@reduxjs/toolkit";
/** Minimal role shape accepted across steps (kept permissive for smooth migration). */
export type Role =
  | { title?: string; name?: string; code?: string }
  | string;

/** Ability types used across the app; a discriminant for UI and APIs. */
export type AbilityType = "knowledge" | "skill" | "tech";

/** Canonical ability contract shared by Step 1/2/3/4. */
export interface Ability {
  code: string;
  title: string;
  type: AbilityType;
}

/** Flat unmatched item used by Step 4/5 (UI-friendly shape). */
export interface UnmatchedFlat {
  title: string;
  desc?: "Knowledge" | "Skill" | "Tech";
}

/** Single source of truth for cross-step "final decisions". */
export interface AnalyzerState {
  // Wizard meta
  step: number;            // current step index (0..totalSteps-1)
  totalSteps: number;      // keep it here so ProgressBar/UI can read it easily

  // Cross-step selections (facts decided by the user)
  roles: Role[];
  stateCode: string;       // preferred location (state/region)
  selectedIndustryIds: string[];
  excludedOccupationCodes: string[];

  abilities: Ability[];    // curated abilities after Step 1/2

  targetJobCode: string;   // chosen ANZSCO/sub-occupation code in Step 3
  targetJobTitle: string;  // chosen job title in Step 3

  // Gaps computed in Step 3/4, consumed in Step 4/5
  unmatched: { unmatchedFlat?: UnmatchedFlat[] } | null;
}

/** Initial state mirrors the current 6-step flow; adjust if you add/remove steps. */
export const INITIAL_ANALYZER_STATE: AnalyzerState = {
  step: 0,
  totalSteps: 6,

  roles: [],
  stateCode: "All",
  selectedIndustryIds: [],
  excludedOccupationCodes: [],

  abilities: [],

  targetJobCode: "",
  targetJobTitle: "",

  unmatched: null,
};

/** Clamp helper keeps indices within legal bounds. */
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));

/**
 * Slice declaration
 * - We pass <AnalyzerState> generic so "state" is strongly typed in reducers.
 * - Immer under the hood lets us write "mutating" updates safely.
 */
const analyzerSlice = createSlice({
  name: "analyzer",
  initialState: INITIAL_ANALYZER_STATE,
  reducers: {
    // ---- Step navigation ----------------------------------------------------
    setStep(state, action: PayloadAction<number>) {
      // Always clamp to avoid out-of-range values coming from URL or UI.
      state.step = clamp(action.payload, 0, state.totalSteps - 1);
    },
    nextStep(state) {
      state.step = clamp(state.step + 1, 0, state.totalSteps - 1);
    },
    prevStep(state) {
      state.step = clamp(state.step - 1, 0, state.totalSteps - 1);
    },

    // ---- Cross-step facts (final user choices) ------------------------------
    setRoles(state, action: PayloadAction<Role[]>) {
      state.roles = action.payload || [];
    },
    setStateCode(state, action: PayloadAction<string>) {
      state.stateCode = action.payload || "All";
    },
    setSelectedIndustryIds(state, action: PayloadAction<string[]>) {
      state.selectedIndustryIds = action.payload || [];
    },
    setExcludedOccupationCodes(state, action: PayloadAction<string[]>) {
      state.excludedOccupationCodes = action.payload || [];
    },
    setAbilities(state, action: PayloadAction<Ability[]>) {
      state.abilities = action.payload || [];
    },
    setTargetJob(state, action: PayloadAction<{ code?: string; title?: string }>) {
      state.targetJobCode = action.payload.code || "";
      state.targetJobTitle = action.payload.title || "";
    },
    setUnmatched(state, action: PayloadAction<{ unmatchedFlat?: UnmatchedFlat[] } | null>) {
      state.unmatched = action.payload ?? null;
    },

    // ---- Utilities ----------------------------------------------------------
    resetAll() {
      // Return a fresh object to avoid lingering references.
      return { ...INITIAL_ANALYZER_STATE };
    },
    setTotalSteps(state, action: PayloadAction<number>) {
      const n = Math.max(1, Math.floor(action.payload || 1));
      state.totalSteps = n;
      // Keep current step valid if steps shrink.
      state.step = clamp(state.step, 0, n - 1);
    },
  },
});

// Action creators
export const {
  setStep,
  nextStep,
  prevStep,
  setRoles,
  setStateCode,
  setSelectedIndustryIds,
  setExcludedOccupationCodes,
  setAbilities,
  setTargetJob,
  setUnmatched,
  resetAll,
  setTotalSteps,
} = analyzerSlice.actions;

// Reducer
export default analyzerSlice.reducer;

// ---- Selectors (colocated for discoverability) ------------------------------

/**
 * Root selector: assumes the slice is mounted at state.analyzer.
 * If you mount it elsewhere, adjust the parameter type accordingly.
 */
export const selectAnalyzer = (s: { analyzer: AnalyzerState }) => s.analyzer;

/** Frequently used fine-grained selectors for better component perf. */
export const selectStep = (s: { analyzer: AnalyzerState }) => s.analyzer.step;
export const selectAbilities = (s: { analyzer: AnalyzerState }) => s.analyzer.abilities;
export const selectTargetJob = (s: { analyzer: AnalyzerState }) => ({
  code: s.analyzer.targetJobCode,
  title: s.analyzer.targetJobTitle,
});
