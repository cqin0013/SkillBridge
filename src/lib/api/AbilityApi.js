// ANZSCO: search by first-industry + keyword, and fetch abilities by 6-digit code.

import { getCache, setCache } from "../../utils/cache";

/** Base host (override via .env: VITE_ABILITY_BASE or VITE_JOBS_BASE) */
export const ABILITY_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_ABILITY_BASE || import.meta.env.VITE_JOBS_BASE)) ||
  "https://progressive-alysia-skillbridge-437200d9.koyeb.app";

/*  helpers  */
const ONE_DAY = 24 * 60 * 60 * 1000;
const SEVEN_DAYS = 7 * ONE_DAY;

const buildUrl = (path) => `${ABILITY_BASE.replace(/\/+$/, "")}${path}`;
const arrify = (x) => (Array.isArray(x) ? x : x ? [x] : []);

/** GET JSON via fetch with optional timeout */
async function getJson(url, { signal, timeout } = {}) {
  // Optional timeout using AbortController if no external signal is provided
  let controller = null;
  if (!signal && typeof AbortController !== "undefined" && typeof timeout === "number" && timeout > 0) {
    controller = new AbortController();
    signal = controller.signal;
    setTimeout(() => controller.abort(), timeout);
  }

  const res = await fetch(url, { method: "GET", signal });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // ignore parse errors; leave data as null
  }

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data ?? {};
}

/**
 * Normalize a list of raw ability items to the unified shape:
 *   { name, code, aType: "knowledge" | "skill" | "tech" }
 * Accepts items shaped like:
 *   - string                     -> name
 *   - { title?, name?, code? }   -> name/code
 */
function normalizeAbilityArray(list, aType) {
  return arrify(list)
    .map((it) => {
      if (typeof it === "string") return { name: it, code: null, aType };
      if (!it) return null;
      const name = it.name || it.title || it.skill || it.technology || it.code || "";
      const code = it.code ?? it.skill_code ?? it.tech_code ?? null;
      if (!name) return null;
      return { name, code, aType };
    })
    .filter(Boolean);
}

/**
 * Deduplicate mixed ability items by (type + code) or fallback to (type + lowercase name).
 */
export function dedupeAbilities(list = []) {
  const out = [];
  const seen = new Set();
  list.forEach((raw) => {
    if (!raw) return;
    const name = raw.name || raw.title || "";
    const type = (raw.aType || raw.type || "skill").toLowerCase();
    const code = raw.code || null;
    const key = `${type}|${(code || name).toString().toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ name, code, aType: type });
    }
  });
  return out;
}

/*  ANZSCO search (Step 1)  */
/**
 * Search 6-digit ANZSCO by "first industry + keyword".
 * GET /anzsco/search?first=2&s=engineer&limit=12
 *
 * Cache TTL: 1 day (search results change slowly).
 */
export async function searchAnzscoByFirstAndKeyword({
  first,
  keyword,
  limit = 12,
  signal,
  timeout,
}) {
  const q = String(keyword || "").trim();
  const f = String(first ?? "");
  const url = buildUrl(
    `/anzsco/search?first=${encodeURIComponent(f)}&s=${encodeURIComponent(
      q
    )}&limit=${encodeURIComponent(limit)}`
  );

  const cacheKey = `anzsco:search:first=${f}:q=${q}:l=${limit}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const data = await getJson(url, { signal, timeout });
  setCache(cacheKey, data, ONE_DAY);
  return data;
}

/*  Abilities by ANZSCO code (Step 2)  */
/**
 * Reverse search SOC capability set from 6-digit ANZSCO code.
 * GET /anzsco/{code}/skills
 *
 * Cache TTL: 7 days (ability lists rarely change).
 */
export async function getAbilitiesByAnzscoCode({ anzscoCode, signal, timeout }) {
  const code = String(anzscoCode || "").trim();
  if (!code) throw new Error("getAbilitiesByAnzscoCode: 'anzscoCode' is required");
  const url = buildUrl(`/anzsco/${encodeURIComponent(code)}/skills`);

  const cacheKey = `anzsco:${code}:skills`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const data = await getJson(url, { signal, timeout });
  setCache(cacheKey, data, SEVEN_DAYS);
  return data;
}

/*  Payload → abilities mapper  */
/**
 * Map various server payload shapes into normalized ability arrays.
 * Supports keys:
 *   knowledge: knowledge_titles | knowledge | knowledges
 *   skills   : skill_titles | skills
 *   tech     : tech_titles | tech | technology | technologies
 *
 * @returns {{
 *   knowledge: Array<{name,code,aType:"knowledge"}>,
 *   skill:     Array<{name,code,aType:"skill"}>,
 *   tech:      Array<{name,code,aType:"tech"}>,
 *   flat:      Array<{name,code,aType}>
 * }}
 */
export function mapAbilitiesPayload(payload) {
  // Try multiple keys for robustness.
  const kRaw =
    payload?.knowledge_titles ??
    payload?.knowledge ??
    payload?.knowledges ??
    payload?.Knowledge ??
    null;

  const sRaw =
    payload?.skill_titles ??
    payload?.skills ??
    payload?.skill ??
    payload?.Skills ??
    null;

  const tRaw =
    payload?.tech_titles ??
    payload?.tech ??
    payload?.technology ??
    payload?.technologies ??
    payload?.Tech ??
    null;

  const knowledge = normalizeAbilityArray(kRaw, "knowledge");
  const skill = normalizeAbilityArray(sRaw, "skill");
  const tech = normalizeAbilityArray(tRaw, "tech");

  const flat = dedupeAbilities([...knowledge, ...skill, ...tech]);
  return { knowledge, skill, tech, flat };
}

/** Convenience helper when only the flat list is needed. */
export function mapAbilitiesToFlat(payload) {
  return mapAbilitiesPayload(payload).flat;
}

/*  Compatibility wrapper */
/**
 * Compatibility helper so older imports can keep calling getAnzscoSkills(code, opts).
 * Accepts either the new object signature or the legacy positional arguments.
 */
export function getAnzscoSkills(arg, opts) {
  if (typeof arg === "string" || typeof arg === "number") {
    return getAbilitiesByAnzscoCode({ anzscoCode: arg, ...(opts || {}) });
  }

  if (arg && typeof arg === "object" && !Array.isArray(arg)) {
    return getAbilitiesByAnzscoCode({ ...arg, ...(opts || {}) });
  }

  if (opts && typeof opts === "object") {
    return getAbilitiesByAnzscoCode(opts);
  }

  return getAbilitiesByAnzscoCode({});
}
