
//GET /api/anzsco/{anzscoCode}/training-advice?limit=10

/** Base host (override via .env: VITE_TRAINING_BASE) */
export const TRAINING_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_TRAINING_BASE) ||
  "https://progressive-alysia-skillbridge-437200d9.koyeb.app";

/** Build absolute URL for the training-advice endpoint */
function buildTrainingAdviceUrl(anzscoCode, limit) {
  const base = TRAINING_BASE.replace(/\/+$/, "");
  const code = encodeURIComponent(String(anzscoCode || "").trim());
  const qs = typeof limit === "number" ? `?limit=${Math.max(1, limit)}` : "";
  return `${base}/api/anzsco/${code}/training-advice${qs}`;
}

/** GET JSON via fetch with optional AbortController timeout */
async function getJson(url, { signal, timeout } = {}) {
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
    // fallback: return empty object if JSON parse fails
    data = {};
  }

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}


export function normalizeTrainingAdvice(payload) {
  const anzsco = {
    code:
      payload?.anzsco?.code ??
      payload?.anzsco?.anzsco_code ??
      payload?.anzsco_code ??
      null,
    title:
      payload?.anzsco?.title ??
      payload?.anzsco?.anzsco_title ??
      payload?.anzsco_title ??
      null,
  };

  const rawList = Array.isArray(payload?.vet_courses) ? payload.vet_courses : [];

  const courses = rawList.map((c) => ({
    code: c.vet_course_code ?? c.course_code ?? c.code ?? null,
    name: c.course_name ?? c.name ?? "(Unnamed course)",
    raw: c,
  }));

  return {
    anzsco,
    total: Number.isFinite(payload?.total) ? Number(payload.total) : courses.length,
    courses,
    raw: payload,
  };
}

export async function getTrainingAdvice({ anzscoCode, limit = 10, signal, timeout } = {}) {
  if (!anzscoCode && anzscoCode !== 0) {
    throw new Error("getTrainingAdvice: 'anzscoCode' is required");
  }

  const url = buildTrainingAdviceUrl(anzscoCode, limit);
  const res = await getJson(url, { signal, timeout });
  return normalizeTrainingAdvice(res);
}
