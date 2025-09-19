// src/services/occupationsApi.js

const DEFAULT_API_BASE = "https://skillbridge-hnxm.onrender.com";

/**
 * 获取 API 基础地址
 */
export function getApiBase() {
  // ✅ 只保留 Vite 的 import.meta.env
  return import.meta?.env?.VITE_API_BASE || DEFAULT_API_BASE;
}

/**
 * POST /occupations/rank-by-codes
 */
export async function rankOccupationsByCodes(payload, options = {}) {
  const { signal, base } = options;
  const API_BASE = base || getApiBase();

  const res = await fetch(`${API_BASE}/occupations/rank-by-codes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      knowledge_codes: payload?.knowledge_codes || [],
      skill_codes: payload?.skill_codes || [],
      tech_codes: payload?.tech_codes || [],
    }),
    signal,
  });

  if (!res.ok) {
    const text = await safeText(res);
    throw new Error(`Request failed: ${res.status} ${res.statusText} – ${text}`);
  }

  const data = await res.json().catch(() => ({}));
  return Array.isArray(data?.items) ? data.items : [];
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
