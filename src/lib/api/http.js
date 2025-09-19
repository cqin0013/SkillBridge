// src/services/http.js

// --- Helpers ---------------------------------------------------------------

const DEFAULT_FALLBACK = "https://skillbridge-hnxm.onrender.com";

function normalizeBase(url) {
  try {
    const u = new URL(url);
    u.protocol = "https:";                 // avoid mixed-content on https sites
    return u.toString().replace(/\/$/, "");
  } catch {
    return (url || "").replace(/\/$/, "");
  }
}

function getEnv(name, fallback = "") {
  const v = (import.meta?.env?.[name] ?? "").toString().trim();
  return v || fallback;
}

const PRIMARY_BASE  = normalizeBase(getEnv("VITE_API_BASE", ""));
const FALLBACK_BASE = normalizeBase(getEnv("VITE_FALLBACK_API_BASE", DEFAULT_FALLBACK));
const TIMEOUT_MS    = Number(getEnv("VITE_API_TIMEOUT_MS", "15000")) || 15000;

// Restore last chosen base in this browser session (avoid flapping)
const SAVED = (() => {
  try { return sessionStorage.getItem("api_base") || ""; } catch { return ""; }
})();

let CURRENT_BASE = normalizeBase(SAVED || PRIMARY_BASE || FALLBACK_BASE);

// --- Public getters/setters ------------------------------------------------

export function getApiBase() {
  return CURRENT_BASE;
}

export function setApiBase(nextBase) {
  CURRENT_BASE = normalizeBase(nextBase);
  try { sessionStorage.setItem("api_base", CURRENT_BASE); } catch {}
  return CURRENT_BASE;
}

// --- Core fetch with timeout ----------------------------------------------

async function fetchWithTimeout(url, init = {}, timeoutMs = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function safeText(res) {
  try { return await res.text(); } catch { return ""; }
}

function isNetworkLikeError(err) {
  // TypeError: network error / CORS failure in fetch()
  // AbortError: timeout via AbortController
  return err?.name === "AbortError" || err instanceof TypeError;
}

// --- Global JSON fetcher with auto-fallback --------------------------------

/**
 * Fetch JSON relative to CURRENT_BASE. If a network-level failure happens,
 * automatically switch to FALLBACK_BASE and retry once.
 *
 * - 4xx/5xx with a response WILL NOT trigger fallback (to avoid masking app bugs).
 * - Only network-like errors (CORS/timeout/DNS) will switch base.
 *
 * @param {string} path - e.g. "/occupations/search-and-titles?s=data"
 * @param {RequestInit} init
 * @param {{retryOn5xx?: boolean}} opts - set retryOn5xx=true if you also want to fallback on 5xx
 */
export async function fetchJson(path, init = {}, opts = {}) {
  const { retryOn5xx = false } = opts;

  const attempt = async (base) => {
    const url = `${normalizeBase(base)}${path.startsWith("/") ? "" : "/"}${path}`;
    const res = await fetchWithTimeout(url, init);
    if (!res.ok) {
      const text = await safeText(res);
      const error = new Error(`HTTP ${res.status} ${res.statusText} – ${text}`);
      error.status = res.status;
      throw error;
    }
    return res.json();
  };

  // 1) Try current base
  try {
    return await attempt(CURRENT_BASE);
  } catch (err) {
    const shouldFallback =
      isNetworkLikeError(err) ||
      (retryOn5xx && typeof err.status === "number" && err.status >= 500);

    // 2) If allowed, switch to fallback and persist once per session
    if (shouldFallback && CURRENT_BASE !== FALLBACK_BASE) {
      setApiBase(FALLBACK_BASE);
      return attempt(CURRENT_BASE); // CURRENT_BASE has been switched
    }
    throw err;
  }
}
