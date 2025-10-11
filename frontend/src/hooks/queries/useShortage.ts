// frontend/src/hooks/queries/useShortage.ts
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
    staleTime: 10 * 60 * 1000,        // 10 minutes (增加到10分钟)
    gcTime: 15 * 60 * 1000,           // 15 minutes (添加缓存时间)
    retry: 2,                          // 重试2次
    retryDelay: 1000,                  // 重试延迟1秒
    refetchOnWindowFocus: false,       // 禁止窗口聚焦时重新请求
    refetchOnMount: false,             // 禁止组件挂载时重新请求（如果有缓存）
  });
}