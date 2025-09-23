
// Shortage data by ANZSCO (prefix4).


import { getCache, setCache } from "../../utils/cache";
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
/** Base host (override via .env: VITE_SHORTAGE_BASE or VITE_DEMAND_BASE) */
export const SHORTAGE_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_SHORTAGE_BASE || import.meta.env.VITE_DEMAND_BASE)) ||
  "https://progressive-alysia-skillbridge-437200d9.koyeb.app";

export const SHORTAGE_BY_ANZSCO_PATH = "/api/shortage/by-anzsco";

/** Cache TTL (6 hours) */
const SIX_HOURS = 6 * 60 * 60 * 1000;

/* --------------------------------- helpers --------------------------------- */

/** Strip to first 4 digits of ANZSCO code */
function toPrefix4(input) {
  const s = String(input || "").replace(/\D/g, "");
  return s.slice(0, 4);
}

function buildUrl(path) {
  return `${SHORTAGE_BASE.replace(/\/+$/, "")}${path}`;
}

/** POST JSON via fetch */
async function postJson(url, body, { signal, timeout } = {}) {
  let controller = null;
  if (!signal && typeof AbortController !== "undefined" && timeout > 0) {
    controller = new AbortController();
    signal = controller.signal;
    setTimeout(() => controller.abort(), timeout);
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    signal,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* noop */
  }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data ?? {};
}

/* Core API */
/**
 * Get shortage employment snapshot by ANZSCO prefix4.
 * We only keep: state + nsc_emp from latest_by_state.
 *
 * @param {Object} params
 * @param {string|number} params.anzsco - 6-digit code; we take first 4 digits
 * @returns {Promise<Array<{ state: string, nsc_emp: number }>>}
 */
export async function getLatestEmploymentByState({ anzsco, signal, timeout } = {}) {
  const prefix = toPrefix4(anzsco);
  if (!prefix) throw new Error("getLatestEmploymentByState: 'anzsco' required");

  const cacheKey = `shortage:latest:${prefix}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const url = buildUrl(SHORTAGE_BY_ANZSCO_PATH);
  const body = { anzsco_prefix: prefix };

  const res = await postJson(url, body, { signal, timeout });

  // Safely extract latest_by_state array
  const arr = Array.isArray(res?.latest_by_state) ? res.latest_by_state : [];
  const simplified = arr
    .map((it) => ({
      state: String(it?.state || "").trim(),
      nsc_emp: Number(it?.nsc_emp ?? 0),
    }))
    .filter((x) => x.state && !Number.isNaN(x.nsc_emp));

  setCache(cacheKey, simplified, SIX_HOURS);
  return simplified;
}
