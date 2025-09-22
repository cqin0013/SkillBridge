// src/lib/api/AnzscoShortageApi.js
// Shortage data by ANZSCO. This file exposes two layers:
//
// 1) Core API (current):
//    - getShortageByAnzsco({ anzsco, prefix4, regions, includeOccupations? })
//      -> returns { prefix, unitGroupTitle, ratings, occupations, raw }
//
// 2) Compatibility shim for existing UI (Insight page expects numbers):
//    - EMPTY_SHORTAGE_COUNTS (zeros for all AU states)
//    - getAnzscoShortageMap({ anzscoCode }) -> { counts: Record<state,number>, metadata }
//      We convert textual ratings to numeric "counts" so the choropleth can color states.
//
// This keeps old callers working while you migrate the UI to the new ratings format.

import { http } from "../../utils/http";
import { getCache, setCache } from "../../utils/cache";

/** Base host (override via .env: VITE_SHORTAGE_BASE or VITE_DEMAND_BASE) */
export const SHORTAGE_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_SHORTAGE_BASE || import.meta.env.VITE_DEMAND_BASE)) ||
  "https://progressive-alysia-skillbridge-437200d9.koyeb.app";

export const SHORTAGE_BY_ANZSCO_PATH = "/api/shortage/by-anzsco";

/** Cache TTL (6 hours) */
const SIX_HOURS = 6 * 60 * 60 * 1000;

/** AU states used by the map */
export const EMPTY_SHORTAGE_COUNTS = {
  NSW: 0,
  VIC: 0,
  QLD: 0,
  SA: 0,
  WA: 0,
  TAS: 0,
  NT: 0,
  ACT: 0,
};

function toPrefix4(input) {
  const s = String(input || "").replace(/\D/g, "");
  return s.slice(0, 4);
}

function buildUrl(path) {
  return `${SHORTAGE_BASE.replace(/\/+$/, "")}${path}`;
}

/**
 * Normalize server payload into a stable shape:
 * {
 *   prefix: "2613",
 *   unitGroupTitle: "Software and Applications Programmers",
 *   ratings: { national: "Shortage", NSW: "Shortage", ... },
 *   occupations: [{ code, title, shortage }, ...],
 *   raw
 * }
 */
export function normalizeShortageByAnzsco(payload) {
  if (!payload || typeof payload !== "object") {
    return { prefix: null, unitGroupTitle: null, ratings: {}, occupations: [], raw: payload };
  }

  const prefix =
    payload.anzsco_prefix ??
    payload.prefix ??
    payload.anzscoPrefix ??
    (payload.anzsco_group && toPrefix4(payload.anzsco_group)) ??
    null;

  const unitGroupTitle =
    payload.unit_group_title ??
    payload.group_title ??
    payload.title ??
    payload.unitGroupTitle ??
    null;

  const ratings =
    (payload.ratings && typeof payload.ratings === "object" && payload.ratings) || {};

  // Optional 6-digit occupations (if provided)
  const occRaw =
    Array.isArray(payload.occupations) ? payload.occupations :
    Array.isArray(payload.items) ? payload.items :
    [];

  const occupations = occRaw.map((it) => {
    const code = it.anzsco_code ?? it.code ?? it.anzscoCode ?? null;
    const title = it.anzsco_title ?? it.title ?? it.occupation_title ?? null;
    const shortage = it.shortage ?? it.rating ?? it.status ?? null;
    return {
      code: code != null ? String(code) : null,
      title: title != null ? String(title) : null,
      shortage: shortage != null ? String(shortage) : null,
      raw: it,
    };
  });

  return {
    prefix: prefix != null ? String(prefix) : null,
    unitGroupTitle: unitGroupTitle != null ? String(unitGroupTitle) : null,
    ratings,
    occupations,
    raw: payload,
  };
}

/* ---------------------------------- Core API ---------------------------------- */
/**
 * POST /api/shortage/by-anzsco
 *
 * @param {Object} params
 * @param {string|number} params.anzsco   4 or 6 digits; we will take first 4
 * @param {string} [params.prefix4]       precomputed 4-digit prefix if you have it
 * @param {string[]} [params.regions]     e.g. ["NSW","VIC","QLD","national"]; server has defaults
 * @param {boolean} [params.includeOccupations=true]
 * @param {AbortSignal} [params.signal]
 * @param {number} [params.timeout]
 *
 * @returns {Promise<{prefix, unitGroupTitle, ratings, occupations, raw}>}
 */
export async function getShortageByAnzsco({
  anzsco,
  prefix4,
  regions,
  includeOccupations = true,
  signal,
  timeout,
} = {}) {
  const prefix = toPrefix4(prefix4 || anzsco);
  if (!prefix) throw new Error("getShortageByAnzsco: 'anzsco' (4 or 6 digits) is required");

  const cacheKey = `shortage:prefix:${prefix}:${(regions || []).join(",")}:${includeOccupations ? 1 : 0}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const url = buildUrl(SHORTAGE_BY_ANZSCO_PATH);

  // Body keys follow the API docs; we keep it permissive on the client.
  const body = {
    anzsco_prefix: prefix,
    ...(Array.isArray(regions) && regions.length ? { regions } : {}),
    include_occupations: !!includeOccupations,
  };

  const res = await http.post(url, body, { signal, timeout });
  const normalized = normalizeShortageByAnzsco(res);
  setCache(cacheKey, normalized, SIX_HOURS);
  return normalized;
}

/* --------------------------- Compatibility helpers --------------------------- */
/**
 * Map textual ratings to numeric "counts" for the choropleth.
 * You can tune these weights anytime. Higher = darker color on map.
 */
const RATING_SCORES = {
  Shortage: 100,
  "National shortage": 100,
  "Recruitment difficulty": 70,
  "No shortage": 20,
  Unknown: 0,
  "Not available": 0,
};

function scoreForRating(val) {
  if (!val) return 0;
  const s = String(val).trim();
  return RATING_SCORES[s] ?? 0;
}

/**
 * Convert { NSW: "Shortage", VIC: "No shortage", national: "Shortage", ... }
 * to { NSW: 100, VIC: 20, ... } while preserving unknowns as 0.
 */
export function ratingsToCounts(ratings = {}) {
  const out = { ...EMPTY_SHORTAGE_COUNTS };
  Object.keys(out).forEach((state) => {
    out[state] = scoreForRating(ratings[state]);
  });
  return out;
}

/**
 * Legacy/compat API for Insight page.
 * Accepts either { anzscoCode } or { anzsco } and returns:
 * {
 *   counts: Record<state,number>,   // numeric score per state (for map colors)
 *   metadata: { national?: number, prefix?: string, unitGroupTitle?: string }
 * }
 */
export async function getAnzscoShortageMap({ anzscoCode, anzsco, signal, timeout } = {}) {
  const code = anzscoCode ?? anzsco;
  if (!code && code !== 0) throw new Error("getAnzscoShortageMap: 'anzscoCode' is required");

  const resp = await getShortageByAnzsco({ anzsco: code, signal, timeout });

  const counts = ratingsToCounts(resp?.ratings || {});
  const nationalScore = scoreForRating(resp?.ratings?.national);

  return {
    counts,
    metadata: {
      national: Number.isFinite(nationalScore) ? nationalScore : null,
      prefix: resp?.prefix ?? null,
      unitGroupTitle: resp?.unitGroupTitle ?? null,
    },
    raw: resp,
  };
}
