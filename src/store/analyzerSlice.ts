// src/store/analyzerSlice.ts
// Slice for the Analyzer wizard business state.
// English comments only inside code.

import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { TrainingCourse } from "../components/analyzer/TrainingCourse";

export type AType = "knowledge" | "tech" | "skill";

/** Minimal ability unit selected by user */
export type AbilityLite = { name: string; code?: string; aType: AType };

/** Minimal role unit chosen in previous step */
export type RoleLite = { id: string; title: string };

/** Final picked job in JobSuggestion step */
export type SelectedJob = { code: string; title: string } | null;

/** Unmatched buckets returned by ranking API for the selected job */
export type UnmatchedBuckets = { knowledge: string[]; skill: string[]; tech: string[] };

/** Training advice persisted from the Training step */
export type TrainingAdviceState = {
  occupation: { code: string; title: string };
  courses: TrainingCourse[];
};

/** Full Analyzer slice state */
export type AnalyzerState = {
  /** Roles confirmed in the GetInfo step */
  chosenRoles: RoleLite[];
  /** Abilities curated in the Abilities step */
  chosenAbilities: AbilityLite[];
  /** Hash (or key) that identifies the occupation codes used to compute abilities */
  lastCodesKey: string | null;
  /** Target region (state/territory) for demand queries */
  preferredRegion: string | null;
  /** Interested industry filters (codes) */
  interestedIndustryCodes: string[] | null;
  /** Current step of the multi-step wizard */
  step: number;
  /** The role user picked on JobSuggestion step */
  selectedJob: SelectedJob;
  /** Unmatched abilities for the selected job only */
  selectedJobUnmatched: UnmatchedBuckets | null;
  /** Normalized training advice for the selected job */
  trainingAdvice: TrainingAdviceState | null;
};

/** Baseline defaults (also used by persist migration) */
export const initialState: AnalyzerState = {
  chosenRoles: [],
  chosenAbilities: [],
  lastCodesKey: null,
  preferredRegion: null,
  interestedIndustryCodes: null,
  step: 0,
  selectedJob: null,
  selectedJobUnmatched: null,
  trainingAdvice: null,
};

const analyzerSlice = createSlice({
  name: "analyzer",
  initialState,
  reducers: {
    /** Set the current wizard step */
    setStep(state, action: PayloadAction<number>) {
      state.step = action.payload;
    },
    /** Save confirmed roles; invalidate previous compute key */
    setChosenRoles(state, action: PayloadAction<RoleLite[]>) {
      state.chosenRoles = action.payload;
      state.lastCodesKey = null;
    },
    /** Live-update curated abilities */
    setChosenAbilities(state, action: PayloadAction<AbilityLite[]>) {
      state.chosenAbilities = action.payload;
    },
    /** Record the latest source key after recompute */
    setAbilitiesSourceKey(state, action: PayloadAction<string>) {
      state.lastCodesKey = action.payload;
    },
    /** Set preferred region for demand lookups */
    setPreferredRegion(state, action: PayloadAction<string | null>) {
      state.preferredRegion = action.payload;
    },
    /** Set interested industry code filters */
    setInterestedIndustryCodes(state, action: PayloadAction<string[] | null>) {
      state.interestedIndustryCodes = action.payload;
    },
    /**
     * Persist selected job.
     * Also clear job-scoped data when changing/clearing selection.
     */
    setSelectedJob(state, action: PayloadAction<SelectedJob>) {
      state.selectedJob = action.payload ?? null;
      state.selectedJobUnmatched = null;
      state.trainingAdvice = null;
    },
    /** Save unmatched buckets for the currently selected job */
    setSelectedJobUnmatched(state, action: PayloadAction<UnmatchedBuckets | null>) {
      state.selectedJobUnmatched = action.payload;
    },
    /** Save normalized training advice for the selected job */
    setTrainingAdvice(state, action: PayloadAction<TrainingAdviceState | null>) {
      state.trainingAdvice = action.payload;
    },
  },
});

export const {
  setStep,
  setChosenRoles,
  setChosenAbilities,
  setAbilitiesSourceKey,
  setPreferredRegion,
  setInterestedIndustryCodes,
  setSelectedJob,
  setSelectedJobUnmatched,
  setTrainingAdvice,
} = analyzerSlice.actions;

export default analyzerSlice.reducer;
