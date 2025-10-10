// Search occupations by industry FULL NAME and keyword.
// No persistence. Pure fetch via apiClient.
import { getJSON } from "../apiClient";
import type { SearchOccupationRes } from "../../../types/api";

export function searchOccupations(
  industry: string,
  keyword: string,
  limit = 10,
): Promise<SearchOccupationRes> {
  const i = industry.trim();
  const k = keyword.trim();
  if (!i || k.length < 2) throw new Error("Invalid search params");
  return getJSON<SearchOccupationRes>("/anzsco/search", { industry: i, s: k, limit });
}
