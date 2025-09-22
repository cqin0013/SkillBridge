// src/utils/http.js

/**
 * Minimal HTTP client
 * - Base URL via import.meta.env.VITE_API_BASE (fallback provided)
 * - Optional timeout with AbortController
 * - JSON request/response helpers
 * - Semantic errors: HttpError / TimeoutError / AbortError (native)
 */

const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE) ||
  "https://progressive-alysia-skillbridge-437200d9.koyeb.app";

const DEFAULT_TIMEOUT = 10000; // 10s

/** Build absolute URL robustly (keeps base query/hash intact) */
function buildUrl(path) {
  // Treat only null/undefined/"" as empty path; keep 0 etc.
  if (path === null || path === undefined) return new URL(".", API_BASE).href;
  const str = String(path);
  if (str === "") return new URL(".", API_BASE).href;

  // Absolute URL? return as-is
  try {
    return new URL(str).href;
  } catch {
    // Relative -> resolve against API_BASE (handles slashes, query, hash)
    return new URL(str, API_BASE).href;
  }
}

/** Normalize any HeadersInit to a plain object */
function headersToObject(h) {
  if (!h) return {};
  // Headers instance
  if (typeof Headers !== "undefined" && h instanceof Headers) {
    return Object.fromEntries(h.entries());
  }
  // Iterable of tuples (e.g., [['X-Foo','bar']])
  if (typeof h[Symbol.iterator] === "function" && !("forEach" in h)) {
    try {
      return Object.fromEntries(h);
    } catch {}
  }
  // Plain object or Map-like with forEach
  if (typeof h.forEach === "function" && !("entries" in h)) {
    const obj = {};
    h.forEach((v, k) => (obj[k] = v));
    return obj;
  }
  return { ...h };
}

function withTimeout(externalSignal, ms = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  let timedOut = false;
  let timer = null;

  // Allow "no timeout" by skipping the timer when ms <= 0 or null/undefined
  if (ms > 0) {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, ms);
  }

  const abortCaller = () => controller.abort(externalSignal?.reason);

  if (externalSignal) {
    if (externalSignal.aborted) {
      if (timer) clearTimeout(timer);
      controller.abort(externalSignal.reason);
      return { signal: controller.signal, clear: () => {}, didTimeout: () => false };
    }
    externalSignal.addEventListener("abort", abortCaller);
  }

  const clear = () => {
    if (timer) clearTimeout(timer);
    if (externalSignal) externalSignal.removeEventListener("abort", abortCaller);
  };

  return { signal: controller.signal, clear, didTimeout: () => timedOut };
}

async function parseBody(res) {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  return await res.text();
}

/**
 * Core request
 * @param {string} path
 * @param {{ method?: string, headers?: HeadersInit, body?: any, timeout?: number|null, signal?: AbortSignal, credentials?: RequestCredentials }} [opts]
 */
export async function request(path, opts = {}) {
  const {
    method = "GET",
    headers,
    body,
    timeout = DEFAULT_TIMEOUT,
    signal,
    credentials = "same-origin",
  } = opts;

  const url = buildUrl(path);

  // Normalize & merge headers
  const baseHeaders = headersToObject({ Accept: "application/json" });
  const userHeaders = headersToObject(headers);
  const mergedHeaders = { ...baseHeaders, ...userHeaders };

  const { signal: finalSignal, clear, didTimeout } = withTimeout(signal, timeout);

  try {
    const res = await fetch(url, {
      method,
      headers: mergedHeaders,
      body,
      signal: finalSignal,
      credentials,
    });

    const data = await parseBody(res);

    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.name = "HttpError";
      err.status = res.status;
      err.url = url;
      err.body = data;
      throw err;
    }

    return data;
  } catch (e) {
    // Keep native AbortError for caller-initiated aborts; classify timeouts.
    if (e && (e.name === "AbortError" || e.code === "ABORT_ERR")) {
      if (didTimeout()) {
        const err = new Error("Request timeout");
        err.name = "TimeoutError";
        err.code = "TIMEOUT";
        err.url = url;
        throw err;
      }
      // External/user abort: augment original error and rethrow
      try {
        if (e.code == null) e.code = "ABORTED";
        if (signal && "reason" in signal) e.reason = signal.reason;
        e.url = url;
      } catch {
        const wrapped = new Error(e.message || "Request aborted");
        wrapped.name = e.name || "AbortError";
        wrapped.code = "ABORTED";
        wrapped.url = url;
        if (signal && "reason" in signal) wrapped.reason = signal.reason;
        wrapped.stack = e.stack;
        throw wrapped;
      }
      throw e;
    }
    throw e;
  } finally {
    clear();
  }
}

/** Convenience helpers (JSON in/out) */
function jsonHeaders(h = {}) {
  return { "Content-Type": "application/json", ...headersToObject(h) };
}

export const http = {
  get: (path, opts = {}) => request(path, opts),

  post: (path, json, opts = {}) =>
    request(path, {
      method: "POST",
      headers: json !== undefined ? jsonHeaders(opts.headers) : headersToObject(opts.headers),
      body: json !== undefined ? JSON.stringify(json) : undefined,
      ...opts,
    }),

  put: (path, json, opts = {}) =>
    request(path, {
      method: "PUT",
      headers: json !== undefined ? jsonHeaders(opts.headers) : headersToObject(opts.headers),
      body: json !== undefined ? JSON.stringify(json) : undefined,
      ...opts,
    }),

  patch: (path, json, opts = {}) =>
    request(path, {
      method: "PATCH",
      headers: json !== undefined ? jsonHeaders(opts.headers) : headersToObject(opts.headers),
      body: json !== undefined ? JSON.stringify(json) : undefined,
      ...opts,
    }),

  delete: (path, json, opts = {}) =>
    request(path, {
      method: "DELETE",
      headers: json !== undefined ? jsonHeaders(opts.headers) : headersToObject(opts.headers),
      body: json !== undefined ? JSON.stringify(json) : undefined,
      ...opts,
    }),
};
