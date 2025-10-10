// src/hooks/queries/useDemand.ts
// React Query wrapper for /api/anzsco/{code}/demand
// English comments only inside code.

import { useQuery } from "@tanstack/react-query";
import type { DemandRes } from "../../types/demand";
import { getDemand } from "../../lib/api/jobData/getDemanByCode";

type Options = {
  /** Whether query should run; used for lazy loading or visibility-based fetch */
  enabled?: boolean;
  /** Cache lifetime; defaults to 5 min */
  staleTimeMs?: number;
};

/** Normalize region string: "All"/"All states" become undefined */
function normalizeRegion(region?: string | null): string | undefined {
  if (!region) return undefined;
  const val = region.trim().toLowerCase();
  return val === "all" || val === "all states" ? undefined : region;
}

/**
 * Hook to fetch shortage/demand data for a given ANZSCO code and region.
 * - When region is undefined or "All", fetch national ratings.
 * - Automatically caches by code + region combination.
 * - Surfaces isError/error for UI fallback display.
 */
export function useDemand(
  code: string,
  region?: string | null,
  options?: Options
) {
  const normalizedRegion = normalizeRegion(region);
  const enabled = Boolean(options?.enabled ?? true);
  const staleTime = options?.staleTimeMs ?? 5 * 60 * 1000; // 5 minutes

  return useQuery<DemandRes>({
    // Stable, serializable cache key
    queryKey: ["demand", code, normalizedRegion ?? ""],
    // Query function that calls the backend
    queryFn: async () => {
      // Backend expects no "state" param for national-level
      return getDemand(code, normalizedRegion);
    },
    enabled,
    staleTime,
    retry: 1, // one retry on network fail
  });
}
