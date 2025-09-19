// src/services/occupationsApi.js
import { fetchJson, getApiBase } from "./http";

/**
 * Optional: expose current base for diagnostics
 */
export { getApiBase } from "./http";

/**
 * GET /occupations/search-and-titles
 * @param {Object} params
 * @param {string} params.s - keyword
 * @param {number} [params.limit=10]
 * @param {string} [params.include="title,description"]
 */
export async function searchOccupations({ s, limit = 10, include = "title,description" }) {
  const qs = new URLSearchParams({
    s: s ?? "",
    limit: String(limit),
    include,
  }).toString();

  // retryOn5xx: true → 如果主 API 返回 5xx 也会切到 fallback
  const data = await fetchJson(`/occupations/search-and-titles?${qs}`, { method: "GET" }, { retryOn5xx: true });
  return Array.isArray(data?.items) ? data.items : [];
}

/**
 * POST /occupations/rank-by-codes
 * payload: { knowledge_codes: string[], skill_codes: string[], tech_codes: string[] }
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
