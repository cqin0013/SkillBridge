// src/lib/api/apiClient.ts
import { httpGet, httpPost } from "../services/https";

/** Query types: support primitives and arrays (serialized as repeated params). */
type QueryPrimitive = string | number | boolean | undefined;
export type Query = Record<string, QueryPrimitive | QueryPrimitive[]>;

const RAW = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";
const BASE = RAW.trim().replace(/\/+$/, "");

/** Build absolute or relative URL with query string (arrays => repeated params). */
function buildUrl(path: string, q?: Query): string {
  const rel = path.startsWith("/") ? path : `/${path}`;

  let qs = "";
  if (q) {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) {
      if (Array.isArray(v)) {
        v.forEach((val) => {
          if (val !== undefined) usp.append(k, String(val));
        });
      } else if (v !== undefined) {
        usp.append(k, String(v));
      }
    }
    const s = usp.toString();
    qs = s ? `?${s}` : "";
  }

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
