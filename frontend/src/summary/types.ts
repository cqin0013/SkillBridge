// src/summary/types.ts
// Shared types for the summary system (兼容 1参/2参 builder).

import type { RootState } from "../store";

/** Summary 目前只需要 analyzer 这段状态；以后要扩展可加其它 slice。 */
export type SummaryRoot = Pick<RootState, "analyzer">;

/** 极简角色结构（示例）。 */
export type RoleLite = { id: string; title: string };

/** 当前页的草稿覆盖（未入库的即时选择）。 */
export type DraftOverrides = {
  region?: string;
  industryCodes?: string[];
  roles?: RoleLite[];
  abilityCounts?: { knowledge: number; tech: number; skill: number; total: number };
};

/** 汇总面板的一行数据。 */
export type SummaryItem = {
  id: string;
  label: string;
  value?: string | number;
  pill?: boolean;
};

/** 老签名：只接收 state。 */
export type SummaryBuilder1<S = SummaryRoot> = (state: S) => SummaryItem[];
/** 新签名：state + drafts（推荐）。 */
export type SummaryBuilder2<S = SummaryRoot> = (
  state: S,
  drafts?: DraftOverrides
) => SummaryItem[];

/** 统一导出类型：两种签名都支持。 */
export type SummaryBuilder<S = SummaryRoot> =
  | SummaryBuilder1<S>
  | SummaryBuilder2<S>;
