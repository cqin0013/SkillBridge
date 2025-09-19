// src/services/http.js

// --- Constants --------------------------------------------------------------

/**
 * Default fallback API base. Must be a plain https URL (no quotes, no trailing slash).
 * Your backend is serving routes directly under /occupations/... (no /api prefix).
 */
const DEFAULT_FALLBACK = "https://skillbridge-hnxm.onrender.com";

// --- Utilities --------------------------------------------------------------

/** Remove wrapping single or double quotes and trim whitespace. */
function stripWrappingQuotes(s) {
  return (s || "").trim().replace(/^['"]+|['"]+$/g, "");
}

/**
 * Normalize a base URL:
 * - strip accidental quotes
 * - force https protocol (avoid mixed content)
 * - remove trailing slash
 * If the value isn't a full URL, return the cleaned string with trailing slash removed.
 */
function normalizeBase(url) {
  const cleaned = stripWrappingQuotes(url);
  try {
    const u = new URL(cleaned);
    u.protocol = "https:"; // enforce https
    return u.toString().replace(/\/$/, "");
  } catch {
    // Not a valid absolute URL (shouldn't happen for our API base),
    // still remove any trailing slash to avoid "//path"
    return cleaned.replace(/\/$/, "");
  }
}

/** Read a Vite env var and apply defaults + sanitization. */
function getEnv(name, fallback = "") {
  const raw = (import.meta?.env?.[name] ?? "").toString();
  const cleaned = stripWrappingQuotes(raw);
  return cleaned || fallback;
}

// --- Derived bases & timeout -----------------------------------------------

const PRIMARY_BASE  = normalizeBase(getEnv("VITE_API_BASE", ""));
const FALLBACK_BASE = normalizeBase(getEnv("VITE_FALLBACK_API_BASE", DEFAULT_FALLBACK));
const TIMEOUT_MS    = Number(getEnv("VITE_API_TIMEOUT_MS", "15000")) || 15000;

/**
 * Restore last chosen base in this browser session (avoid flapping between bases).
 * Also sanitize here to purge any legacy quoted values from older builds.
 */
const SAVED = (() => {
  try {
    const v = sessionStorage.getItem("api_base") || "";
    return normalizeBase(v);
  } catch {
    return "";
  }
})();

/** The base used for subsequent requests (primary -> saved -> fallback). */
let CURRENT_BASE = normalizeBase(SAVED || PRIMARY_BASE || FALLBACK_BASE);

// --- Public getters/setters -------------------------------------------------

/** Get the currently effective API base. */
export function getApiBase() {
  return CURRENT_BASE;
}

/**
 * Set a new API base at runtime and persist for this session.
 * Value is sanitized and normalized (quotes removed, https enforced, no trailing slash).
 */
export function setApiBase(nextBase) {
  CURRENT_BASE = normalizeBase(nextBase);
  try { sessionStorage.setItem("api_base", CURRENT_BASE); } catch {}
  return CURRENT_BASE;
}

// --- Core fetch with timeout -----------------------------------------------

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
  // TypeError: network/CORS failure with fetch()
  // AbortError: timeout via AbortController
  return err?.name === "AbortError" || err instanceof TypeError;
}

// --- Global JSON fetcher with auto-fallback --------------------------------

/**
 * Fetch JSON relative to CURRENT_BASE. If a *network-level* failure happens,
 * automatically switch to FALLBACK_BASE and retry once.
 *
 * Notes:
 * - 4xx/5xx with a response WILL NOT trigger fallback (to avoid masking app bugs).
 * - Set opts.retryOn5xx=true if you also want to fallback on 5xx.
 *
 * @param {string} path - e.g. "/occupations/search-and-titles?s=data"
 * @param {RequestInit} init
 * @param {{retryOn5xx?: boolean}} opts
 */
export async function fetchJson(path, init = {}, opts = {}) {
  const { retryOn5xx = false } = opts;

  const attempt = async (base) => {
    const baseClean = normalizeBase(base);
    const url = `${baseClean}${path.startsWith("/") ? "" : "/"}${path}`;
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
