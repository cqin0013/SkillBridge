
import { useEffect, useMemo, useState } from "react";
import { getCache, setCache } from "../../utils/cache";

// Module-level in-memory fallback for non-TTL mode
const HOOK_MEM = new Map();

/**
 * Bind React state to storage.
 * - Default: plain localStorage (no TTL), supports namespace; falls back to memory when unavailable
 * - If ttlMs is provided: uses cache.js (with TTL and its own memory fallback)
 * - Safe in SSR/No-Storage environments
 * - Cross-tab sync via 'storage' event (only when localStorage is available)
 *
 * @param {string} key
 * @param {any} initialValue
 * @param {{ namespace?: string, ttlMs?: number, sliding?: boolean }} [options]
 *   - namespace: for non-TTL mode only
 *   - ttlMs: enable TTL mode (cache.js handles ns "sb_" + key internally)
 *   - sliding: refresh TTL on every read/write
 */
export function useLocalStorage(key, initialValue, options = {}) {
  const { namespace = "", ttlMs, sliding = false } = options;

  const canUseStorage = useMemo(() => {
    try {
      if (typeof window === "undefined") return false;
      const k = "__ls_probe__";
      window.localStorage.setItem(k, "1");
      window.localStorage.removeItem(k);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Actual key observed for cross-tab sync (only meaningful if storage works)
  const observedKey = ttlMs ? `sb_${key}` : `${namespace}${key}`;

  const read = () => {
    // storage disabled or SSR
    if (!canUseStorage) {
      if (ttlMs) {
        const val = getCache(key);
        return val == null ? initialValue : val;
      } else {
        return HOOK_MEM.has(observedKey)
          ? HOOK_MEM.get(observedKey)
          : initialValue;
      }
    }

    // storage available
    try {
      if (ttlMs) {
        const val = getCache(key);
        if (val == null) return initialValue;
        if (sliding) setCache(key, val, ttlMs);
        return val;
      } else {
        const raw = window.localStorage.getItem(observedKey);
        return raw !== null ? JSON.parse(raw) : initialValue;
      }
    } catch {
      return initialValue;
    }
  };

  const [value, setValue] = useState(read);

  // Persist changes
  useEffect(() => {
    if (!canUseStorage) {
      if (ttlMs) {
        setCache(key, value, ttlMs); // cache.js handles memory fallback if needed
      } else {
        HOOK_MEM.set(observedKey, value); // in-memory for this tab only
      }
      return;
    }

    try {
      if (ttlMs) {
        setCache(key, value, ttlMs);
      } else {
        window.localStorage.setItem(observedKey, JSON.stringify(value));
      }
    } catch {
      // storage failed; keep value in memory to avoid UI breakage
      if (!ttlMs) HOOK_MEM.set(observedKey, value);
    }
  }, [canUseStorage, observedKey, key, ttlMs, value]);

  // Cross-tab synchronization (only when localStorage works and non-TTL mode)
  useEffect(() => {
    if (!canUseStorage || ttlMs) return;

    const onStorage = (e) => {
      if (e.key !== observedKey) return;
      try {
        setValue(e.newValue !== null ? JSON.parse(e.newValue) : initialValue);
      } catch {
        setValue(initialValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [canUseStorage, observedKey, ttlMs, initialValue]);

  return [value, setValue];
}
