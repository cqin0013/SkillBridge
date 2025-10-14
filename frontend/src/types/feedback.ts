// Types for feedback API payload and response

/** Allowed category values from the UI select */
export type FeedbackCategory = "Bug" | "Feature request" | "Idea" | "Other";

/** Optional metadata sent with the feedback for debugging/analytics */
export interface FeedbackMeta {
  /** Channel where the feedback comes from, e.g. "web" */
  source: string;
  /** Current page path, e.g. "/feedback" */
  page: string;
}

/** Request body shape expected by the backend */
export interface FeedbackReq {
  /** Optional display name */
  name?: string;
  /** Optional email for follow-up */
  email?: string;
  /** Required category selected by the user */
  category: FeedbackCategory;
  /** Required free text from the textarea */
  message: string;
  /** Required consent flag mapped from the checkbox */
  agree: boolean;
  /** Optional structured metadata */
  meta?: FeedbackMeta;
}

/** Generic success/error shape returned by backend */
export interface FeedbackRes {
  /** "ok" on success, "error" on failure */
  status: "ok" | "error";
  /** Optional server message */
  message?: string;
  /** Optional server-generated id for the feedback */
  id?: string;
}
