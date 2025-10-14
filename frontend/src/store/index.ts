// Store composition that consumes the single persist config.

import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import analyzerReducer from "./analyzerSlice";
import { createRootPersistConfig } from "./persist";

// Compose root reducer
const rootReducer = combineReducers({
  analyzer: analyzerReducer,

});

// Export RootState based on the actual reducer shape
export type RootState = ReturnType<typeof rootReducer>;

// Wrap with persistReducer using the single-source config
const persistedReducer = persistReducer(createRootPersistConfig(), rootReducer);

// Create the store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: {
        // Ignore redux-persist internal actions that carry non-serializable payloads
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }),
});

// Create persistor for <PersistGate>
export const persistor = persistStore(store);

// Typed helpers
export type AppStore = typeof store;
export type AppDispatch = AppStore["dispatch"];
