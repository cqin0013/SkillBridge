// src/types/shortage.ts
export interface ShortageQuery {
  input_code: string;
  match_prefix4: string;
}

export interface ShortageLatestByState {
  state: string;
  date: string;          // ISO string
  nsc_emp: number;       // latest employment count for this state
}

export interface ShortageStatsByState {
  state: string;
  samples: number;
  first_date: string;    // ISO
  last_date: string;     // ISO
  avg_nsc_emp: string;   // API returns string
  stddev_nsc_emp: number;
  min_nsc_emp: number;
  max_nsc_emp: number;
}

export interface ShortageYearlyTrend {
  state: string;
  year: number;
  avg_nsc_emp: string;   // API returns string
}

export interface ShortageRes {
  anzsco_code: string;
  anzsco_title?: string;
  shortage: Record<string, number>; // e.g. { NSW: 62, VIC: 58, ... }
}
