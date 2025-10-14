// Parallel rank queries per industry, with precomputed matchPct on each item.

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { rankByCodes } from "../../lib/api/occupation/rankByCodes";
import type { RankByCodesReq, RankByCodesRes } from "../../types/rank";

type Sel = RankByCodesReq["selections"][number];

/** Augment server item with a precomputed match percentage */
export type RankByCodesItemWithMatch =
  RankByCodesRes["items"][number] & { matchPct: number };

/** Response shape after select() transformation */
export type RankByCodesResWithMatch =
  Omit<RankByCodesRes, "items"> & { items: RankByCodesItemWithMatch[] };

export type UseRankByCodesManyParams =
  | {
      industries: string[];
      selections: Sel[];
      limit?: number;
    }
  | undefined;

export type OneIndustryResult = {
  industry: string;
  data?: RankByCodesResWithMatch;
  isFetching: boolean;
  isError: boolean;
  error?: unknown;
};

export type ManyIndustryResult = {
  list: OneIndustryResult[];
  anyFetching: boolean;
  anyError: boolean;
};

export function useRankByCodesMany(
  params: UseRankByCodesManyParams
): ManyIndustryResult {
  // Memoize inputs so deps are stable even when params is undefined
  const industries = useMemo(() => params?.industries ?? [], [params?.industries]);
  const selections = useMemo<Sel[]>(() => params?.selections ?? [], [params?.selections]);
  const limit = params?.limit ?? 10;

  // Enable only when we have all inputs
  const enabled = industries.length > 0 && selections.length > 0;

  // Stable key for selections array content
  const selKey = useMemo(() => JSON.stringify(selections), [selections]);

  const results = useQueries({
    queries: industries.map((industry) => ({
      queryKey: ["rank-by-codes", industry, selKey, limit],
      queryFn: () => rankByCodes({ industry, selections }, limit),
      enabled: enabled && industry.length > 0,
      staleTime: 5 * 60 * 1000, // 5 minutes

      // Precompute matchPct so all consumers get ready-to-use data
      select: (res: RankByCodesRes): RankByCodesResWithMatch => {
        const denom = Math.max(1, res.total_selected); // avoid divide-by-zero
        const items = res.items.map((it) => {
          const u = it.unmatched;
          const unmatchedCount =
            (u.knowledge?.length ?? 0) +
            (u.skill?.length ?? 0) +
            (u.tech?.length ?? 0);

          // matchPct = 100% - (unmatched / total_selected) * 100
          const pct = Math.round(100 - (unmatchedCount / denom) * 100);
          const matchPct = Math.min(100, Math.max(0, pct));

          return { ...it, matchPct };
        });
        return { ...res, items };
      },
    })),
  });

  const list: OneIndustryResult[] = results.map((q, i) => ({
    industry: industries[i],
    data: q.data as RankByCodesResWithMatch | undefined,
    isFetching: q.isFetching,
    isError: q.isError,
    error: q.error,
  }));

  return {
    list,
    anyFetching: results.some((q) => q.isFetching),
    anyError: results.some((q) => q.isError),
  };
}
