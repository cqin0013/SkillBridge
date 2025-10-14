// API call to fetch VET glossary term details by keyword.

import { getJSON } from "../apiClient";

/** Glossary term detail response */
export interface GlossaryDetail {
  term: string;
  description: string;
  acronym?: string;
  also_called?: string[];
  see_also?: string[];
}

/**
 * GET /api/glossary/detail
 * Fetch VET terminology details by keyword.
 * Returns term description, acronyms, related terms, etc.
 */
export function getDetailByKeyword(keyword: string): Promise<GlossaryDetail> {
  const kw = keyword.trim();
  if (!kw) throw new Error("Keyword is required");
  return getJSON<GlossaryDetail>("/api/glossary/detail", { q: kw });
}