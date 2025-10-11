// src/summary/types.ts
// Shared types for the summary system (鍏煎 1鍙?2鍙?builder).

import type { RootState } from "../store";
import type { RoleLite } from "../store/analyzerSlice";

/** Summary 鐩墠鍙渶瑕?analyzer 杩欐鐘舵€侊紱浠ュ悗瑕佹墿灞曞彲鍔犲叾瀹?slice銆?*/
export type SummaryRoot = Pick<RootState, "analyzer">;

/** 鏋佺畝瑙掕壊缁撴瀯锛堢ず渚嬶級銆?*/
export type { RoleLite };

/** 褰撳墠椤电殑鑽夌瑕嗙洊锛堟湭鍏ュ簱鐨勫嵆鏃堕€夋嫨锛夈€?*/
export type DraftOverrides = {
  region?: string;
  industryCodes?: string[];
  roles?: RoleLite[];
  abilityCounts?: { knowledge: number; tech: number; skill: number; total: number };
};

/** 姹囨€婚潰鏉跨殑涓€琛屾暟鎹€?*/
export type SummaryItem = {
  id: string;
  label: string;
  value?: string | number;
  pill?: boolean;
};

/** 鑰佺鍚嶏細鍙帴鏀?state銆?*/
export type SummaryBuilder1<S = SummaryRoot> = (state: S) => SummaryItem[];
/** 鏂扮鍚嶏細state + drafts锛堟帹鑽愶級銆?*/
export type SummaryBuilder2<S = SummaryRoot> = (
  state: S,
  drafts?: DraftOverrides
) => SummaryItem[];

/** 缁熶竴瀵煎嚭绫诲瀷锛氫袱绉嶇鍚嶉兘鏀寔銆?*/
export type SummaryBuilder<S = SummaryRoot> =
  | SummaryBuilder1<S>
  | SummaryBuilder2<S>;

