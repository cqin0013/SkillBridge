import { postJSON } from "./apiClient";
import type { FeedbackReq, FeedbackRes } from "../../types/feedback";

/**
 * Send feedback to the backend and normalize heterogeneous responses.
 * This function converts `{ ok: true }` or `{ status: "ok" }`
 * to a single union: { status: "ok" | "error", ... }.
 */
export async function sendFeedback(body: FeedbackReq): Promise<FeedbackRes> {
  // Call the shared POST helper; response shape may vary across environments.
  const raw = await postJSON<FeedbackReq, unknown>("/contact", body);

  // Defensive conversion to plain object.
  const obj =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};

  // Normalize `{ ok: true }`.
  if (obj.ok === true) {
    const id = typeof obj.id === "string" ? obj.id : "";
    return { status: "ok", id };
  }

  // Normalize `{ status: "ok" }`.
  if (obj.status === "ok") {
    const id = typeof obj.id === "string" ? obj.id : "";
    return { status: "ok", id };
  }

  // Everything else → error. Prefer server-provided message if present.
  const message =
    typeof obj.message === "string"
      ? obj.message
      : "Unexpected response from server.";
  return { status: "error", message };
}
