import { useQuery } from "@tanstack/react-query";
import { searchOccupations } from "../../lib/api/ability/searchOccupations";
import { mapSearchItemToDomain } from "../../lib/utils/mapper";
import type { AnzscoOccupation } from "../../types/domain";

export type SearchParams = { industry: string; keyword: string; limit?: number } | null;

export function useAnzscoSearch(params: SearchParams) {
  const enabled = Boolean(params && params.industry && params.keyword && params.keyword.trim().length >= 2);
  const industry = params?.industry ?? "";
  const keyword = params?.keyword ?? "";
  const limit = params?.limit ?? 10;

  return useQuery<AnzscoOccupation[]>({
    queryKey: ["anzsco", "search", industry, keyword, limit],
    enabled,
    staleTime: 0,
    gcTime: 60 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      const res = await searchOccupations(industry, keyword, limit);
      return res.items.map(mapSearchItemToDomain);
    },
  });
}


export type { AnzscoOccupation };
