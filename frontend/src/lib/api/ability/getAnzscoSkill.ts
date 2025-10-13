// Get abilities by a single ANZSCO code.
// No persistence. React Query will refetch on mount to overwrite cache.
import { getJSON } from "../apiClient";
import type { SkillsByCodeRes } from "../../../types/api";

export function getAnzscoSkills(code: string): Promise<SkillsByCodeRes> {
  const c = code.trim();
  if (!c) throw new Error("Missing ANZSCO code");
  return getJSON<SkillsByCodeRes>(`/anzsco/${encodeURIComponent(c)}/skills`);
}
