
// Purpose: API helper for suggesting jobs from user's selections.

import { INDUSTRY_OPTIONS } from "../../lib/constants/industries";

/** Base URL: from env or fallback to Koyeb host */
export const JOBS_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_JOBS_BASE || import.meta.env.VITE_ABILITY_BASE)) ||
  "https://progressive-alysia-skillbridge-437200d9.koyeb.app";

/** Fixed backend endpoint for job suggestions */
export const JOBS_SUGGEST_PATH = "/occupations/rank-by-codes";

/** Compose absolute URL safely (strip trailing slashes from base) */
function buildUrl(path) {
  return `${JOBS_BASE.replace(/\/+$/, "")}${path}`;
}

/** Tiny helper: JSON POST via fetch with sane defaults */
async function postJson(url, body, { signal, timeout } = {}) {
  // Optional timeout controller
  let controller = null;
  if (!signal && typeof AbortController !== "undefined" && typeof timeout === "number" && timeout > 0) {
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

  // Try to parse JSON even on non-2xx for better error surfaces
  let data = null;
  try {
    data = await res.json();
  } catch {
    // ignore parse errors; keep data as null
  }

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  // Align with prior code that read res?.data ?? res
  return data ?? {};
}

export async function suggestJobs({ selections = [], majorFirst = null } = {}) {
  const url = buildUrl(JOBS_SUGGEST_PATH);

  // Build body exactly as backend expects.
  const body = { selections };

  // Only include major_first when user selected a valid major group (1–8).
  const mf = String(majorFirst ?? "").trim();
  if (/^[1-8]$/.test(mf)) body.major_first = mf;

  // Debug: print payload being sent
  console.log("[JobSuggest] POST", url, JSON.stringify(body, null, 2));

  try {
    const data = await postJson(url, body);

    const totalSelected = Number(data?.total_selected ?? 0);
    const list = Array.isArray(data?.items) ? data.items : [];

    // Normalize → filter jobs that have ANZSCO codes → sort by score → top 10
    return list
      .map((it) => normalizeJobItem(it, totalSelected))
      .filter((job) => job.anzscoOptions && job.anzscoOptions.length > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  } catch (err) {
    // Print backend error details to console for easier debugging
    const serverMsg = err?.data ?? err?.message ?? "(no server message)";
    console.error("[JobSuggest] 400 payload:", body);
    console.error("[JobSuggest] server says:", serverMsg);
    throw err; // rethrow so page can show error
  }
}


function normalizeJobItem(it, totalSelected = 0) {
  const title = String(it?.occupation_title ?? it?.title ?? "").trim();
  const occCodeRaw = String(it?.occupation_code ?? it?.code ?? "");
  const occCode = occCodeRaw.replace(/[^0-9.]/g, ""); // keep SOC-like dot

  // Prefer `anzsco` array; fallback to other keys
  let rawList = it?.anzsco ?? it?.anzsco_codes ?? it?.anzsco_list ?? null;

  // Normalize to array for processing
  if (rawList && !Array.isArray(rawList)) rawList = [rawList];
  if (typeof rawList === "string") rawList = [rawList];

  // Map raw items into normalized ANZSCO options
  const anzscoOptions = Array.isArray(rawList)
    ? rawList
        .map((c) =>
          typeof c === "object"
            ? normalizeAnzscoItem(c)
            : normalizeAnzscoItem({ code: c })
        )
        .filter((o) => !!o.code) // drop invalid ones
    : [];

  // Compute match score from count / total_selected if provided
  let score = 0;
  if (typeof it?.count === "number" && totalSelected > 0) {
    score = Math.max(
      0,
      Math.min(100, Math.round((it.count / totalSelected) * 100))
    );
  }

  return {
    key: `${title}|${occCode}` || cryptoLikeId(),
    title,
    score,
    summary: "", // not provided by server yet
    source: "server",
    anzscoOptions, // array of { code, title, description, industry (name) }
    skills: [],
    missingSkills: [],
    raw: it,
  };
}

/**
 * Normalize ANZSCO item into { code, title, description, industryName, unitGroup... }
 * Industry: map first digit of code to INDUSTRY_OPTIONS name.
 */
function normalizeAnzscoItem(it) {
  const codeRaw = it?.code ?? it?.anzsco_code ?? it?.id ?? "";
  const code = String(codeRaw ?? "").replace(/[^0-9]/g, "");
  const name = String(it?.title ?? it?.anzsco_title ?? it?.name ?? "").trim();
  const description = String(
    it?.description ?? it?.anzsco_description ?? it?.desc ?? ""
  ).trim();

  if (!code) return { code: "", title: name, description, industry: null };

  // First digit maps to industry option name
  const industryDigit = code.length > 0 ? code[0] : null;
  const industry =
    INDUSTRY_OPTIONS.find((opt) => opt.id === industryDigit)?.name || null;

  return {
    code,
    title: name,
    description,
    industry, // human-readable industry name, not the digit id
    unitGroup: code.slice(0, 4),
    minorGroup: code.slice(0, 3),
    subMajor: code.slice(0, 2),
    major: code.slice(0, 1),
  };
}

/** Generate a random unique key for UI list rendering */
function cryptoLikeId() {
  return `job_${Math.random().toString(36).slice(2, 9)}`;
}

export default { suggestJobs };
