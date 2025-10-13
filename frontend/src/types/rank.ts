// src/types/rank.ts
export type AbilityType = "knowledge" | "skill" | "tech";

export type AbilitySelection = {
  type: AbilityType;
  code: string;
};

export type RankByCodesReq = {
  selections: AbilitySelection[];
  industry: string;        // FULL name
};

export type RankByCodesItem = {
  occupation_code: string;     // SOC
  occupation_title: string;
  score: number;
  count: number;
  unmatched: { knowledge: string[]; skill: string[]; tech: string[] };
  anzsco: Array<{ code: string; title: string; description?: string | null }>;
};

export type RankByCodesRes = {
  cached: boolean;
  total_selected: number;
  industry: string;
  limit: number;
  items: RankByCodesItem[];
};
