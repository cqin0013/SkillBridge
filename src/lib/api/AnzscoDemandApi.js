// src/lib/api/AnzscoDemandApi.js
// Regional/National shortage ratings by 6-digit ANZSCO code.
// Example endpoint:
//   GET /api/anzsco/261313/demand
//
// Response example:
// {
//   "anzsco": { "anzsco_code": "261313", "anzsco_title": "Software Engineer" },
//   "skill_level": "1",
//   "ratings": {
//     "national": "Shortage",
//     "NSW": "Shortage", "VIC": "Shortage", ...
//   }
// }

import { http } from "../../utils/http";
import { getCache, setCache } from "../../utils/cache";

/** Base host (override via .env: VITE_DEMAND_BASE) */
export const DEMAND_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_DEMAND_BASE) ||
  "https://progressive-alysia-skillbridge-437200d9.koyeb.app";

/* --------------------------------- helpers -------------------------------- */
const SIX_HOURS = 6 * 60 * 60 * 1000;

const buildUrl = (code) =>
  `${DEMAND_BASE.replace(/\/+$/, "")}/api/anzsco/${encodeURIComponent(
    String(code || "").trim()
  )}/demand`;

/** Normalize different possible field names into a stable object. */
export function normalizeDemandPayload(payload) {
  const code =
    payload?.anzsco?.anzsco_code ??
    payload?.anzsco?.code ??
    payload?.anzsco_code ??
    null;

  const title =
    payload?.anzsco?.anzsco_title ??
    payload?.anzsco?.title ??
    payload?.anzsco_title ??
    null;

  const skillLevelRaw = payload?.skill_level ?? payload?.skillLevel ?? null;
  const skillLevel = skillLevelRaw != null ? Number(skillLevelRaw) : null;

  const ratings =
    (payload && typeof payload.ratings === "object" && payload.ratings) || {};

  return {
    code: code != null ? String(code) : null,
    title: title != null ? String(title) : null,
    skillLevel,
    ratings, // e.g. { national: "Shortage", NSW: "Shortage", ... }
    raw: payload,
  };
}

/**
 * Fetch shortage ratings for a single ANZSCO code.
 * Cached for 6 hours.
 */
export async function getDemandByCode({ anzscoCode, signal, timeout }) {
  const code = String(anzscoCode || "").trim();
  if (!code) throw new Error("getDemandByCode: 'anzscoCode' is required");

  const cacheKey = `demand:${code}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const url = buildUrl(code);
  const res = await http.get(url, { signal, timeout });
  const normalized = normalizeDemandPayload(res);

  setCache(cacheKey, normalized, SIX_HOURS);
  return normalized;
}

/**
 * Batch fetch demand ratings for multiple codes.
 * Returns a Map<code, normalizedDemand> for convenience.
 */
export async function fetchBatchDemand(codes = [], { signal, timeout } = {}) {
  const uniq = [...new Set((codes || []).map((c) => String(c || "").trim()).filter(Boolean))];
  const results = await Promise.all(
    uniq.map(async (code) => {
      try {
        const data = await getDemandByCode({ anzscoCode: code, signal, timeout });
        return [code, data];
      } catch (e) {
        return [code, null];
      }
    })
  );
  return new Map(results); // Map("261313" => { code, title, ratings, ... }, ...)
}

/**
 * Utility: get shortage string for a specific region key from a normalized item.
 * Region is e.g. "NSW" | "VIC" | "QLD" | "national" (case-insensitive).
 */
export function regionShortage(demandItem, region) {
  if (!demandItem || !region) return null;
  const key = String(region).toUpperCase();
  const ratings = demandItem.ratings || {};
  if (key === "NATIONAL") return ratings.national ?? ratings.NATIONAL ?? null;
  return ratings[key] ?? ratings[key.toUpperCase()] ?? ratings[key.toLowerCase()] ?? null;
}

/**
 * 批量给“职位列表”补充紧缺度信息。
 * jobs: 形如 normalizeJobList(...) 后的数组（包含 occupationCode）
 * options.region: "national" | "NSW" | "VIC" | "QLD" | "SA" | "WA" | "TAS" | "NT" | "ACT"
 * 返回：新的数组，每一项附加 { demand, shortage } 字段
 */
export async function enrichJobsWithDemand(
  jobs = [],
  { region = "national", signal, timeout } = {}
) {
  // 1) 收集唯一 code
  const codes = [
    ...new Set(
      (jobs || [])
        .map((j) => String(j.occupationCode || j.code || "").trim())
        .filter(Boolean)
    ),
  ];

  if (codes.length === 0) return jobs.map((j) => ({ ...j, demand: null, shortage: null }));

  // 2) 批量获取紧缺度
  const demandMap = await fetchBatchDemand(codes, { signal, timeout }); // Map<code, normalizedDemand|null>

  // 3) 合并回原列表
  return (jobs || []).map((j) => {
    const code = String(j.occupationCode || j.code || "").trim();
    const demand = demandMap.get(code) || null;
    const shortage = region ? regionShortage(demand, region) : null;
    return { ...j, demand, shortage };
  });
}

// 兼容旧调用名：getAnzscoDemand
export async function getAnzscoDemand(arg, opts) {
  // 支持 getAnzscoDemand("261313") 或 getAnzscoDemand({ anzscoCode: "261313" })
  const anzscoCode =
    typeof arg === "string"
      ? arg
      : arg?.anzscoCode || arg?.code || "";

  return getDemandByCode({ anzscoCode, ...(opts || {}) });
}

/** Map user's region preference into a region key used by demand data. */
export function normalizeRegionPref(pref) {
  if (!pref) return "national";
  const v = String(pref).trim().toLowerCase();
  if (v === "all" || v === "any") return "national";
  // Accept common state codes; the demand payload is case-insensitive in regionShortage()
  return v.toUpperCase(); // e.g., "NSW" | "VIC" | ...
}

/**
 * Convenience: fetch demand by code and immediately extract shortage string
 * for a given region preference (e.g., "all" -> "national").
 * Returns { demand, shortage }.
 */
export async function getShortageByCodeAndRegion({ anzscoCode, region, signal, timeout }) {
  const demand = await getDemandByCode({ anzscoCode, signal, timeout });
  const key = normalizeRegionPref(region); // map "all" to "national"
  const shortage = regionShortage(demand, key);
  return { demand, shortage };
}