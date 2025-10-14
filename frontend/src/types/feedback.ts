
/**
 * Allowed feedback categories for the UI select.
 */
export type FeedbackCategory = "Bug" | "Feature request" | "Idea" | "Other";

/**
 * Request payload expected by the backend.
 * Optional fields use '?' so we can omit them when empty.
 */
export interface FeedbackReq {
  name?: string;
  email?: string;
  category: FeedbackCategory;
  message: string;
  agree: boolean;
  meta?: {
    /** Where the submission comes from, e.g. "web". */
    source?: string;
    /** Current page path to help trace issues. */
    page?: string;
  };
}

/**
 * Normalized API response for the feedback endpoint.
 * Use the discriminant 'status' to branch safely.
 */
export type FeedbackRes =
  | { status: "ok"; id: string }
  | { status: "error"; message: string };

/**
 * Type guard for the success variant.
 */
export function isFeedbackOk(
  res: FeedbackRes
): res is Extract<FeedbackRes, { status: "ok" }> {
  return res.status === "ok";
}

/**
 * Type guard for the error variant.
 */
export function isFeedbackError(
  res: FeedbackRes
): res is Extract<FeedbackRes, { status: "error" }> {
  return res.status === "error";
}
