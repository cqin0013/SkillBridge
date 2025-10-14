import type { PersistConfig, Transform } from "redux-persist";
import type { PersistedState } from "redux-persist/es/types";
import { createTransform } from "redux-persist";

import storage from "./browserStorage"; // fallback adapter: localStorage → sessionStorage → in-memory
import type { RootState } from "./index";
import { initialState as analyzerInitial } from "./analyzerSlice";

export const PERSIST_VERSION = 3;

/** Narrow to a plain object (no array, no class instance) */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && Object.getPrototypeOf(v) === Object.prototype;
}

/** Remove redux-persist meta key from an arbitrary value */
function stripPersistMeta(v: unknown): unknown {
  if (!isPlainObject(v)) return v;
  const rest = { ...(v as Record<string, unknown>) };
  delete (rest as Record<string, unknown>)._persist;
  return rest;
}

/** Shallow merge a raw object into a known baseline shape */
function mergeFromPersist<B extends Record<string, unknown>>(baseline: B, raw: unknown): B {
  if (!isPlainObject(raw)) return baseline;
  const out: B = { ...baseline };
  (Object.keys(baseline) as Array<keyof B>).forEach((k) => {
    const v = (raw as Record<string, unknown>)[String(k)];
    if (v !== undefined) (out as Record<keyof B, unknown>)[k] = v as B[typeof k];
  });
  return out;
}

/** Normalize legacy persisted value into current RootState shape */
export function normalizeState(input: unknown): RootState {
  const raw = isPlainObject(input) ? input : {};
  return {
    analyzer: mergeFromPersist(analyzerInitial, (raw as Record<string, unknown>)["analyzer"]),
  };
}

/** Identity transform placeholder (kept for future stripping if needed) */
export const stripVolatile: Transform<RootState, RootState> = createTransform(
  (state) => state,
  (rehydrated) => rehydrated
);

/** Factory for the root persist config */
export function createRootPersistConfig(): PersistConfig<RootState> {
  return {
    key: "root",
    version: PERSIST_VERSION,
    storage, // resilient adapter
    blacklist: ["transient", "runtime"],
    migrate: async (persisted: PersistedState | unknown): Promise<PersistedState> => {
      if (persisted == null) return undefined as unknown as PersistedState;
      const withoutMeta = stripPersistMeta(persisted);
      const next = normalizeState(withoutMeta);
      return next as unknown as PersistedState;
    },
    transforms: [stripVolatile],
  };
}
