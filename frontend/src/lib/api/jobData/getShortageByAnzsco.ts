// src/lib/api/jobs/getShortage.ts
import { getJSON } from "../apiClient";
import type { ShortageRes } from "../../../types/shortage";

/**
 * GET /api/shortage/by-anzsco
 * Params:
 *  - code: ANZSCO code, e.g. "111111"
 *  - prefix4 (optional): first 4 digits for grouping, e.g. "1111"
 */
export function getShortageByAnzsco(code: string, prefix4?: string) {
  const c = code.trim();
  if (!c) throw new Error("anzsco code is required");
  const params: Record<string, string> = { code: c };
  if (prefix4) params.prefix4 = prefix4.trim();
  return getJSON<ShortageRes>("/api/shortage/by-anzsco", params);
}
