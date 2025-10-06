// src/lib/api/apiClient.ts
import { httpGet, httpPost } from "../services/https";

export type Query = Record<string, string | number | boolean | undefined>;

const RAW = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";
const BASE = RAW.trim().replace(/\/+$/, "");

/** Build absolute or relative URL with query string. */
function buildUrl(path: string, q?: Query): string {
  const rel = path.startsWith("/") ? path : `/${path}`;
  const qs = q
    ? "?" +
      Object.entries(q)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  return BASE ? `${BASE}${rel}${qs}` : `${rel}${qs}`;
}

/** Print request line in dev for debugging. */
function logRequest(method: "GET" | "POST", url: string): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(`[API ${method}]`, url);
  }
}

export function getJSON<T>(path: string, q?: Query): Promise<T> {
  const url = buildUrl(path, q);
  logRequest("GET", url);
  return httpGet<T>(url);
}

export function postJSON<TReq, TRes>(path: string, body: TReq, q?: Query): Promise<TRes> {
  const url = buildUrl(path, q);
  logRequest("POST", url);
  return httpPost<TReq, TRes>(url, body);
}

// Optional: log base at startup (dev only)
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.log("[VITE_API_BASE]", BASE || "(proxy/relative)");
}
