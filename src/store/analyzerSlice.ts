import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export type RoleLite = { id: string; title: string };
export type AbilityLite = { name: string; aType: "knowledge" | "tech" | "skill"; code?: string };
export type AbilityCounts = { knowledge: number; tech: number; skill: number; total: number };

export interface AnalyzerState {
  step: number;
  totalSteps: number;
  preferredRegion?: string | null;
  interestedIndustryCodes: string[];
  chosenRoles: RoleLite[];
  chosenAbilities: AbilityLite[];   // <- full list
  abilityCounts: AbilityCounts;     // <- counts only
}

const initialState: AnalyzerState = {
  step: 0,
  totalSteps: 5,
  preferredRegion: undefined,
  interestedIndustryCodes: [],
  chosenRoles: [],
  chosenAbilities: [],
  abilityCounts: { knowledge: 0, tech: 0, skill: 0, total: 0 },
};

const analyzerSlice = createSlice({
  name: "analyzer",
  initialState,
  reducers: {
    setPreferredRegion(state, action: PayloadAction<string | null | undefined>) {
      state.preferredRegion = action.payload ?? undefined;
    },
    setInterestedIndustryCodes(state, action: PayloadAction<string[]>) {
      state.interestedIndustryCodes = action.payload ?? [];
    },
    addRole(state, action: PayloadAction<RoleLite>) {
      const exists = state.chosenRoles.some((r) => r.id === action.payload.id);
      if (!exists) state.chosenRoles.push(action.payload);
    },
    removeRole(state, action: PayloadAction<string>) {
      state.chosenRoles = state.chosenRoles.filter((r) => r.id !== action.payload);
    },
    setChosenRoles(state, action: PayloadAction<RoleLite[]>) {
      state.chosenRoles = action.payload ?? [];
    },

    setChosenAbilities(state, action: PayloadAction<AbilityLite[]>) { // <- new
      state.chosenAbilities = action.payload ?? [];
    },
    clearChosenAbilities(state) {                                     // <- optional
      state.chosenAbilities = [];
    },
    setAbilityCounts(state, action: PayloadAction<AbilityCounts>) {
      state.abilityCounts = action.payload;
    },

    setStep(state, action: PayloadAction<number>) {
      state.step = Math.max(0, Math.min(action.payload, state.totalSteps));
    },
  },
});

export const {
  setPreferredRegion,
  setInterestedIndustryCodes,
  addRole,
  removeRole,
  setChosenRoles,
  setChosenAbilities,     // <- export
  clearChosenAbilities,   // <- export
  setAbilityCounts,       // <- export
  setStep,
} = analyzerSlice.actions;

export default analyzerSlice.reducer;
