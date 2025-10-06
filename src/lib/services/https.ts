// src/lib/services/https.ts
// Minimal HTTP layer with timeout, JSON parsing, and normalized errors.
// apiClient.ts builds absolute URLs and passes them here.

export class HttpError extends Error {
  /** HTTP status code if available */
  readonly status?: number;
  /** Response body text for diagnostics */
  readonly bodyText?: string;
  /** Final requested URL */
  readonly url?: string;

  constructor(message: string, opts?: { status?: number; bodyText?: string; url?: string }) {
    super(message);
    this.name = "HttpError";
    this.status = opts?.status;
    this.bodyText = opts?.bodyText;
    this.url = opts?.url;
  }
}

/** Extra options beyond native fetch */
interface RequestOptions {
  /** Abort after N ms */
  timeoutMs?: number;
  /** Additional headers */
  headers?: Record<string, string>;
}

/** Default timeout (ms) */
const DEFAULT_TIMEOUT = 15000;

/** Common headers for JSON requests */
const baseJsonHeaders: Record<string, string> = {
  "Accept": "application/json",
};

/** Create an AbortSignal that fires after timeoutMs */
function withTimeout(timeoutMs: number): AbortController {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  // Clear timer on abort
  controller.signal.addEventListener("abort", () => clearTimeout(id), { once: true });
  return controller;
}

/** Parse response as JSON if content-type indicates JSON, else text -> throw for non-2xx */
async function parseJsonOrText<T>(res: Response, url: string): Promise<T> {
  const ctype = res.headers.get("content-type") ?? "";
  const isJson = ctype.includes("application/json") || ctype.includes("+json");

  if (res.ok) {
    if (isJson) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return (await res.json()) as T;
    }
    // If server returns non-JSON but 2xx, treat as empty object or text wrapper
    const text = await res.text();

    return (text as unknown) as T;
  }

  // Non-2xx: include body text for diagnostics
  const bodyText = isJson ? JSON.stringify(await res.clone().json()).slice(0, 2000) : (await res.text()).slice(0, 2000);
  throw new HttpError(`HTTP ${res.status} ${res.statusText}`, { status: res.status, bodyText, url });
}

/** Low-level GET returning typed JSON (or text) */
export async function httpGet<T>(url: string, options?: RequestOptions): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT;
  const controller = withTimeout(timeoutMs);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...baseJsonHeaders,
      ...(options?.headers ?? {}),
    },
    signal: controller.signal,
    credentials: "include",
  });

  return parseJsonOrText<T>(res, url);
}

/** Low-level POST with JSON body and typed JSON response */
export async function httpPost<TReq, TRes>(
  url: string,
  body: TReq,
  options?: RequestOptions,
): Promise<TRes> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT;
  const controller = withTimeout(timeoutMs);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...baseJsonHeaders,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    body: JSON.stringify(body),
    signal: controller.signal,
    credentials: "include",
  });

  return parseJsonOrText<TRes>(res, url);
}

/** Optional: DELETE/PUT helpers if needed */
export async function httpDelete<T>(url: string, options?: RequestOptions): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT;
  const controller = withTimeout(timeoutMs);

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      ...baseJsonHeaders,
      ...(options?.headers ?? {}),
    },
    signal: controller.signal,
    credentials: "include",
  });

  return parseJsonOrText<T>(res, url);
}

export async function httpPut<TReq, TRes>(
  url: string,
  body: TReq,
  options?: RequestOptions,
): Promise<TRes> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT;
  const controller = withTimeout(timeoutMs);

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      ...baseJsonHeaders,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    body: JSON.stringify(body),
    signal: controller.signal,
    credentials: "include",
  });

  return parseJsonOrText<TRes>(res, url);
}
