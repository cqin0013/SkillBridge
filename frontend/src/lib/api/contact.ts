// Minimal API wrapper for the contact/feedback endpoint

import { postJSON } from "./apiClient"; 
import type { FeedbackReq, FeedbackRes } from "../../types/feedback";

/**
 * Send feedback payload to the backend contact endpoint.
 *
 * @param body - Validated form values mapped to API shape
 * @returns parsed JSON typed as FeedbackRes
 */
export function sendFeedback(body: FeedbackReq) {
  // Delegate to shared JSON POST helper
  return postJSON<FeedbackReq, FeedbackRes>("/contact", body);
}
