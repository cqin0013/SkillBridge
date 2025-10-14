import { getJSON } from "../apiClient";
import type { DemandRes } from "../../../types/demand";

/** GET /api/anzsco/{code}/demand?state=SA */
export function getDemand(code: string, state?: string): Promise<DemandRes> {
  if (!code) return Promise.reject(new Error("code required"));
  return getJSON<DemandRes>(`/api/anzsco/${code}/demand`, state ? { state } : undefined);
}
