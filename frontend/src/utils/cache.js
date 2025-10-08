
/**
 * Lightweight cache with:
 * - Namespace prefix (avoid key collisions)
 * - Optional TTL (ms)
 * - localStorage → sessionStorage → in-memory Map fallback
 * - Pluggable UI notifier (setCacheNotifier) — fires ONLY on extreme failure
 * - Safe JSON (de)serialization + SSR guards
 */

const NS = "sb_"; // namespace prefix

// Shared in-memory map (same tab). Keeps UI alive if storage is disabled.
const MEM =
  typeof window !== "undefined"
    ? (window.__SB_MEM ||= new Map())
    : new Map();

/*  Storage capability probes  */
function hasLocal() {
  try {
    if (typeof window === "undefined") return false;
    const k = "__probe_l__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch { return false; }
}

function hasSession() {
  try {
    if (typeof window === "undefined") return false;
    const k = "__probe_s__";
    window.sessionStorage.setItem(k, "1");
    window.sessionStorage.removeItem(k);
    return true;
  } catch { return false; }
}

/*  JSON helpers  */
function safeStringify(value) {
  try { return JSON.stringify(value); } catch { return null; }
}
function safeParse(json, fallback = null) {
  try { return JSON.parse(json); } catch { return fallback; }
}
function fullKey(key) {
  return NS + String(key);
}

/*  Notifier API */
/**
 * Optional UI notifier. Register once in app entry:
 *
 *   import { message } from "antd";
 *   import { setCacheNotifier } from "@/utils/cache";
 *   setCacheNotifier(({ message: text }) => message.error(text));
 *
 * It will be called ONLY on extreme write failure (all tiers failed).
 */
let __notifier = null;
const __notifiedCodes = new Set();

export function setCacheNotifier(fn) {
  __notifier = typeof fn === "function" ? fn : null;
}
function notifyOnce(payload) {
  if (!__notifier || !payload?.code) return;
  if (__notifiedCodes.has(payload.code)) return;
  __notifiedCodes.add(payload.code);
  try { __notifier(payload); } catch {}
}

/* SET  */
/**
 * Set a cache entry with multi-tier fallback.
 * @param {string} key   Logical key (without namespace)
 * @param {any}    value JSON-serializable value
 * @param {number} [ttlMs] Optional TTL in milliseconds
 * @returns {{tier: 'local'|'session'|'memory'|null}}
 */
export function setCache(key, value, ttlMs) {
  const k = fullKey(key);
  const expiresAt = Number.isFinite(ttlMs) ? Date.now() + ttlMs : null;
  const payload = { v: value, e: expiresAt };
  const json = safeStringify(payload);
  if (!json) return { tier: null };

  // 1) localStorage
  try {
    if (hasLocal()) {
      window.localStorage.setItem(k, json);
      return { tier: "local" };
    }
  } catch { /* fall through */ }

  // 2) sessionStorage
  try {
    if (hasSession()) {
      window.sessionStorage.setItem(k, json);
      return { tier: "session" }; // no UI notification by design
    }
  } catch { /* fall through */ }

  // 3) In-memory fallback (current tab only)
  try {
    MEM.set(k, json);
    return { tier: "memory" }; // still no UI notification
  } catch {
    // EXTREME FAILURE: even memory write failed — notify ONCE as error
    notifyOnce({
      code: "CACHE_WRITE_FAILED",
      message: "Failed to save data. All storage tiers are unavailable.",
    });
    return { tier: null };
  }
}

/* GET */
/**
 * Get a cache entry. Returns null if missing or expired.
 * Multi-tier read: local → session → memory.
 * (No UI notifications on read paths.)
 * @param {string} key
 * @returns {any|null}
 */
export function getCache(key) {
  const k = fullKey(key);

  const readPayload = (raw) => {
    const payload = safeParse(raw, null);
    if (!payload || typeof payload !== "object") return null;
    const { v, e } = payload;
    if (e && Date.now() > e) {
      // expired: best-effort cleanup across tiers
      try { window.localStorage?.removeItem(k); } catch {}
      try { window.sessionStorage?.removeItem(k); } catch {}
      try { MEM.delete(k); } catch {}
      return null;
    }
    return v;
  };

  try {
    const rawL = window.localStorage?.getItem(k);
    if (rawL) return readPayload(rawL);
  } catch {}

  try {
    const rawS = window.sessionStorage?.getItem(k);
    if (rawS) return readPayload(rawS);
  } catch {}

  try {
    const rawM = MEM.get(k);
    if (rawM) return readPayload(rawM);
  } catch {}

  return null;
}

/* DEL */
export function delCache(key) {
  const k = fullKey(key);
  try { window.localStorage?.removeItem(k); } catch {}
  try { window.sessionStorage?.removeItem(k); } catch {}
  try { MEM.delete(k); } catch {}
}

/**
 * Clear ALL keys under this namespace across all tiers.
 * Use with care.
 */
export function clearCacheNamespace() {
  const startsWithNS = (x) => x && x.startsWith(NS);

  try {
    const ls = window.localStorage;
    if (ls) {
      const del = [];
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (startsWithNS(k)) del.push(k);
      }
      del.forEach((k) => ls.removeItem(k));
    }
  } catch {}

  try {
    const ss = window.sessionStorage;
    if (ss) {
      const del = [];
      for (let i = 0; i < ss.length; i++) {
        const k = ss.key(i);
        if (startsWithNS(k)) del.push(k);
      }
      del.forEach((k) => ss.removeItem(k));
    }
  } catch {}

  try {
    for (const k of MEM.keys()) {
      if (startsWithNS(k)) MEM.delete(k);
    }
  } catch {}
}
