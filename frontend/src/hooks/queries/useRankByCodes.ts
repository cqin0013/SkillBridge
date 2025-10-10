import { useQuery } from "@tanstack/react-query";
import { rankByCodes } from "../../lib/api/occupation/rankByCodes"
import type { RankByCodesReq, RankByCodesRes } from "../../types/rank";


type Params = RankByCodesReq & { limit?: number };

export function useRankByCodes(params?: Params) {
  const enabled = !!params && !!params.industry && params.selections.length > 0;

  return useQuery<RankByCodesRes>({

    queryKey: [
      "rank-by-codes",
      params?.industry ?? "",
      params?.limit ?? 10,
      JSON.stringify(params?.selections ?? []),
    ],
    queryFn: () => {
      const { limit = 10, ...body } = params!;
      return rankByCodes(body, limit);
    },
    enabled,
  });
}

