// React Query hook for fetching glossary term details.

import { useQuery } from "@tanstack/react-query";
import { getDetailByKeyword, type GlossaryDetail } from "../../lib/api/glossary/getDetailByKeyword";

/**
 * Hook to fetch VET glossary term details.
 * Returns term description, related terms, acronyms, etc.
 */
export function useGlossaryDetail(keyword: string | null) {
  return useQuery<GlossaryDetail>({
    queryKey: ["glossary", "detail", keyword],
    queryFn: () => getDetailByKeyword(keyword!),
    enabled: Boolean(keyword && keyword.trim()),
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 1,
  });
}