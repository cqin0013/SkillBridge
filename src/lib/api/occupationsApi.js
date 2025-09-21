import { request as _request } from "../../utils/http";

/** Expose current API base for diagnostics/UI */
export const getApiBase = () =>
  (import.meta?.env?.VITE_API_BASE) || "https://skillbridge-hnxm.onrender.com";

/**
 * Internal wrapper: keep your old signature fetchJson(path, init, { retryOn5xx })
 * - Retries only on network errors or 5xx (max 2 retries, simple backoff)
 */
async function fetchJson(path, init, extra) {
  const doRetry = extra?.retryOn5xx === true;
  const maxRetries = doRetry ? 2 : 0; // try at most 3 times total (1 + 2 retries)
  let lastErr;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await _request(path, init);
    } catch (e) {
      const isHttp5xx = e?.name === "HttpError" && e.status >= 500;
      const isNetErr = !e?.status && e?.name !== "AbortError"; // DNS/reset/etc.
      if (attempt < maxRetries && (isHttp5xx || isNetErr)) {
        // simple backoff: 200ms, 400ms
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        continue;
      }
      lastErr = e;
      break;
    }
  }
  throw lastErr;
}

/**
 * GET /occupations/search-and-titles
 *
 * @param {Object} params
 * @param {string} params.s            - keyword
 * @param {number} [params.limit=10]   - maximum items to return
 * @param {string} [params.include="title,description"] - fields to include
 * @returns {Promise<Object[]>} items
 */
export async function searchOccupations({
  s,
  limit = 10,
  include = "title,description",
}) {
  const qs = new URLSearchParams({
    s: s ?? "",
    limit: String(limit),
    include,
  }).toString();

  const data = await fetchJson(
    `/occupations/search-and-titles?${qs}`,
    { method: "GET" },
    { retryOn5xx: true }
  );
  return Array.isArray(data?.items) ? data.items : [];
}

/**
 * POST /occupations/rank-by-codes
 *
 * @param {Object} payload
 * @param {string[]} payload.knowledge_codes
 * @param {string[]} payload.skill_codes
 * @param {string[]} payload.tech_codes
 * @returns {Promise<Object[]>} items
 */
export async function rankOccupationsByCodes(payload) {
  const body = JSON.stringify({
    knowledge_codes: payload?.knowledge_codes ?? [],
    skill_codes: payload?.skill_codes ?? [],
    tech_codes: payload?.tech_codes ?? [],
  });

  const data = await fetchJson(
    `/occupations/rank-by-codes`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    },
    { retryOn5xx: true }
  );

  return Array.isArray(data?.items) ? data.items : [];
}
