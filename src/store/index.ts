// src/store/index.ts
// Application-wide Redux store setup.
// - Mounts the "analyzer" slice under state.analyzer
// - Exposes RootState and AppDispatch types for typed hooks

import { configureStore } from "@reduxjs/toolkit";
import analyzerReducer from "./analyzerSlice"; // your slice

export const store = configureStore({
  reducer: {
    // Keep the key "analyzer" consistent with your selectors (state.analyzer)
    analyzer: analyzerReducer,
  },
  // middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
  // devTools: true // enabled by default in development
});

// Inferred types used across the app
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
