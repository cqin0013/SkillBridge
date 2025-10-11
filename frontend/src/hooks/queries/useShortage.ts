import { useQuery } from "@tanstack/react-query";
import { getShortageByAnzsco } from "../../lib/api/jobData/getShortageByAnzsco";
import type { ShortageRes } from "../../types/shortage";

/** Fetch shortage data by full ANZSCO code using POST JSON body */
export function useShortage(anzscoCode: string) {
  return useQuery<ShortageRes>({
    queryKey: ["shortage", anzscoCode],
    queryFn: () => getShortageByAnzsco(anzscoCode),
    enabled: Boolean(anzscoCode),
    staleTime: 5 * 60 * 1000,
  });
}
