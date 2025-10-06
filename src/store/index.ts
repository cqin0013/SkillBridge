// src/store/index.ts
// Configures Redux store with redux-persist for analyzer workflow state.

import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from "redux-persist";
import type { PersistConfig } from "redux-persist";
import storage from "redux-persist/lib/storage";

import analyzerReducer from "./analyzerSlice";

const rootReducer = combineReducers({
  analyzer: analyzerReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

const persistConfig: PersistConfig<RootState> = {
  key: "skillbridge",
  storage,
  whitelist: ["analyzer"],
  version: 1,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Ignore redux-persist non-serializable checks
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type AppDispatch = typeof store.dispatch;
