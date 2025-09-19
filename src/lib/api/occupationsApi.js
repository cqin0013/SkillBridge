// src/services/occupationsApi.js
import { fetchJson, getApiBase } from "./http";

// Optional: re-export for diagnostics (e.g., console.log(getApiBase()))
export { getApiBase } from "./http";

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

  // retryOn5xx=true: also fallback to the secondary base if server returns 5xx
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
