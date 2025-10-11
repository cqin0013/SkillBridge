import { postJSON } from "../apiClient";
import type { ShortageRes } from "../../../types/shortage";

/**
 * POST /api/shortage/by-anzsco
 * Body: { "anzsco_code": "111111" }
 */
export function getShortageByAnzsco(code: string) {
  const c = code.trim();
  if (!c) throw new Error("anzsco code is required");

  // Send JSON body as backend requires
  return postJSON<{ anzsco_code: string }, ShortageRes>(
    "/api/shortage/by-anzsco",
    { anzsco_code: c }
  );
}
