import { useQuery } from "@tanstack/react-query";
import { getCareerGrowthByCode } from "../../lib/api/jobData/getCareerGrowthByCode";
import type { CareerGrowthResponse } from "../../types/careerGrowth";

/**
 * Options for useCareerGrowth hook
 */
interface UseCareerGrowthOptions {
  /** Whether the query should run; defaults to true if code is valid */
  enabled?: boolean;
  /** Cache lifetime in milliseconds; defaults to 10 minutes */
  staleTime?: number;
}

/**
 * React Query hook to fetch career growth data by ANZSCO code
 * 
 * Features:
 * - Automatic caching and refetching
 * - Loading and error states
 * - Retry logic on failure
 * - Type-safe data access
 * 
 * @param code - 4-digit ANZSCO code
 * @param options - Optional configuration
 * @returns React Query result with data, loading, and error states
 * 
 * @example
 * ```typescript
 * function CareerStats({ anzscoCode }: { anzscoCode: string }) {
 *   const { data, isLoading, isError } = useCareerGrowth(anzscoCode);
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   if (isError) return <div>Error loading data</div>;
 *   
 *   return (
 *     <div>
 *       <h3>{data.majorGroupTitle}</h3>
 *       <p>5-Year Growth: {data.fiveYearGrowthRate}%</p>
 *       <p>Current Employment: {data.currentEmployment.toLocaleString()}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCareerGrowth(
  code: string,
  options?: UseCareerGrowthOptions
) {
  // Normalize code
  const trimmedCode = code?.trim() || "";
  
  // Validate code format
  const isValidCode = trimmedCode.length === 4 && /^\d{4}$/.test(trimmedCode);
  
  // Determine if query should be enabled
  const shouldEnable = options?.enabled !== false && isValidCode;
  
  return useQuery<CareerGrowthResponse>({
    // Cache key - uniquely identifies this query
    queryKey: ["careerGrowth", trimmedCode],
    
    // Query function - fetches the data
    queryFn: () => getCareerGrowthByCode(trimmedCode),
    
    // Only run if code is valid and not explicitly disabled
    enabled: shouldEnable,
    
    // Cache for 10 minutes (or custom time)
    staleTime: options?.staleTime ?? 10 * 60 * 1000,
    
    // Keep in cache for 15 minutes after last use
    gcTime: 15 * 60 * 1000,
    
    // Retry twice on failure
    retry: 2,
    
    // Wait 1 second between retries
    retryDelay: 1000,
    
    // Don't refetch on window focus to prevent excessive requests
    refetchOnWindowFocus: false,
    
    // Don't refetch on mount if data is cached
    refetchOnMount: false,
  });
}


