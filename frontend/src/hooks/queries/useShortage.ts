import { useQuery } from "@tanstack/react-query";
import { getShortageByAnzsco } from "../../lib/api/jobData/getShortageByAnzsco";
import type { ShortageRes } from "../../types/shortage";

/** 
 * Fetch shortage data by full ANZSCO code using POST JSON body
 * Increased staleTime and cacheTime to prevent request cancellation
 */
export function useShortage(anzscoCode: string) {
  return useQuery<ShortageRes>({
    queryKey: ["shortage", anzscoCode],
    queryFn: () => getShortageByAnzsco(anzscoCode),
    enabled: Boolean(anzscoCode),
    staleTime: 10 * 60 * 1000,        
    gcTime: 15 * 60 * 1000,           
    retry: 2,                          
    retryDelay: 1000,                  
    refetchOnWindowFocus: false,       
    refetchOnMount: false,             
  });
}