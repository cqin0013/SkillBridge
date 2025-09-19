// src/services/occupationsApi.js

// Default API base URL (fallback if no env variable is set)
const DEFAULT_API_BASE = "https://skillbridge-hnxm.onrender.com";

/**
 * Normalize a base URL:
 * - Force HTTPS protocol (avoid browser blocking due to mixed content)
 * - Remove trailing slash
 */
function normalizeBase(url) {
  try {
    const u = new URL(url);
    u.protocol = "https:"; // always enforce https
    return u.toString().replace(/\/$/, "");
  } catch {
    // If input is not a full URL (e.g. "/api"), just trim trailing slash
    return (url || "").replace(/\/$/, "");
  }
}

/**
 * Get the API base URL:
 * - First use Vite environment variable (VITE_API_BASE)
 * - Fallback to default API base if not defined
 */
export function getApiBase() {
  const envBase = (import.meta?.env?.VITE_API_BASE || "").trim();
  return normalizeBase(envBase || DEFAULT_API_BASE);
}

/**
 * Safe text extraction from a response.
 * Useful for error messages if the response body is not JSON.
 */
async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

/**
 * Fetch JSON with timeout and retry logic:
 * - timeoutMs: how long to wait before aborting the request
 * - retries: how many times to retry after a failure (e.g. cold start, network hiccup)
 */
async function fetchJsonWithRetry(url, init = {}, { timeoutMs = 15000, retries = 1 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      if (!res.ok) {
        const text = await safeText(res);
        throw new Error(`HTTP ${res.status} ${res.statusText} – ${text}`);
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
      // Retry after short delay if not the last attempt
      if (attempt < retries) await new Promise(r => setTimeout(r, 800));
    } finally {
      clearTimeout(id);
    }
  }
  throw lastErr;
}

/**
 * POST /occupations/rank-by-codes
 *
 * This endpoint ranks occupations based on provided codes.
 *
 * @param {Object} payload - Request body
 * @param {string[]} payload.knowledge_codes - Knowledge codes
 * @param {string[]} payload.skill_codes - Skill codes
 * @param {string[]} payload.tech_codes - Technology codes
 * @param {Object} options - Optional settings
 * @param {AbortSignal} options.signal - AbortController signal for cancellation
 * @param {string} options.base - Override API base URL
 *
 * @returns {Promise<Object[]>} - List of ranked occupations (or empty array if none)
 */
export async function rankOccupationsByCodes(payload, options = {}) {
  const { signal, base } = options;
  const API_BASE = normalizeBase(base || getApiBase());

  const body = JSON.stringify({
    knowledge_codes: payload?.knowledge_codes ?? [],
    skill_codes: payload?.skill_codes ?? [],
    tech_codes: payload?.tech_codes ?? [],
  });

  const data = await fetchJsonWithRetry(
    `${API_BASE}/occupations/rank-by-codes`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal,
    },
    { timeoutMs: 20000, retries: 1 } // allow one retry in case of transient failure
  );

  return Array.isArray(data?.items) ? data.items : [];
}
