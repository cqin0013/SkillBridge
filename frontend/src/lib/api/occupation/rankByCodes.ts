// src/lib/api/jobData/rankByCodes.ts
import { postJSON } from "../../api/apiClient";
import type { RankByCodesReq, RankByCodesRes } from "../../../types/rank";

export function rankByCodes(body: RankByCodesReq, limit = 10) {
  return postJSON<RankByCodesReq, RankByCodesRes>(
    "/occupations/rank-by-codes",
    body,
    { limit }
  );
}
