// frontend/src/lib/api/apiClient.ts

import { httpGet, httpPost, type RequestOptions } from "../services/https";
/** Primitive query types; undefined keys are skipped. */
type QueryPrimitive = string | number | boolean | undefined;

/** Query object type: values can be single or array. */
export type Query = Record<string, QueryPrimitive | QueryPrimitive[]>;

/** Base URL normalization: strip trailing slashes. */
const RAW = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";
const BASE = RAW.trim().replace(/\/+$/, "");

/**
 * Build full URL with optional query string.
 * Arrays → repeated params (e.g. ?a=1&a=2)
 */
function buildUrl(path: string, q?: Query): string {
  const rel = path.startsWith("/") ? path : `/${path}`;

  let qs = "";
  if (q) {
    const usp = new URLSearchParams();
    for (const [key, value] of Object.entries(q)) {
      if (Array.isArray(value)) {
        value.forEach((v) => {
          if (v !== undefined) usp.append(key, String(v));
        });
      } else if (value !== undefined) {
        usp.append(key, String(value));
      }
    }
    const queryString = usp.toString();
    qs = queryString ? `?${queryString}` : "";
  }

  return BASE ? `${BASE}${rel}${qs}` : `${rel}${qs}`;
}

/** Print request info in dev environment. */
function logRequest(method: "GET" | "POST", url: string): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(`[API ${method}]`, url);
  }
}

/**
 * Perform a JSON GET request.
 * Automatically serializes query parameters.
 */
export function getJSON<T>(path: string, q?: Query, options?: RequestOptions): Promise<T> {
  const url = buildUrl(path, q);
  logRequest("GET", url);
  return httpGet<T>(url, options);
}

/**
 * Perform a JSON POST request.
 * Body is serialized to JSON by httpPost.
 * Optional query parameters can be appended.
 * Options allow custom timeout and headers.
 */
export function postJSON<TReq, TRes>(
  path: string,
  body: TReq,
  q?: Query,
  options?: RequestOptions  // ✅ 添加 options 参数
): Promise<TRes> {
  const url = buildUrl(path, q);
  logRequest("POST", url);
  return httpPost<TReq, TRes>(url, body, options);  // ✅ 传递 options
}

/** Optional: log base URL when running in dev mode */
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.log("[VITE_API_BASE]", BASE || "(proxy/relative)");
}