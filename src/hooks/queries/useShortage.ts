// src/hooks/queries/useShortage.ts
import { useQuery } from "@tanstack/react-query";
import { getShortageByAnzsco } from "../../lib/api/jobData/getShortageByAnzsco";
import type { ShortageRes } from "../../types/shortage";

export function useShortage(anzscoCode: string, prefix4?: string) {
  return useQuery<ShortageRes>({
    queryKey: ["shortage", anzscoCode, prefix4 ?? "ALL"],
    queryFn: () => getShortageByAnzsco(anzscoCode, prefix4),
    enabled: Boolean(anzscoCode),
    staleTime: 5 * 60 * 1000,
  });
}
