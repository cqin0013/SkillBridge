// frontend/src/types/shortage.ts

/** Query metadata from API response */
export interface ShortageQuery {
  input_code: string;
  match_prefix4?: string;
}

/** Single state entry in latest_by_state array */
export interface ShortageLatestByState {
  state: string;
  date: string;          // ISO string like "2025-08-15T00:00:00.000Z"
  nsc_emp: number;       // Latest employment count for this state
}

/** Statistics by state (if API returns this) */
export interface ShortageStatsByState {
  state: string;
  samples: number;
  first_date: string;
  last_date: string;
  avg_nsc_emp: string;   // API returns string
  stddev_nsc_emp: number;
  min_nsc_emp: number;
  max_nsc_emp: number;
}

/** Yearly trend data (if API returns this) */
export interface ShortageYearlyTrend {
  state: string;
  year: number;
  avg_nsc_emp: string;
}

/**
 * API response structure for shortage data
 * Matches actual API response from /api/shortage/by-anzsco
 */
export interface ShortageRes {
  query?: ShortageQuery;
  latest_by_state?: ShortageLatestByState[];
  stats_by_state?: ShortageStatsByState[];
  yearly_trend?: ShortageYearlyTrend[];
  
  // Legacy fields (keep for backward compatibility)
  anzsco_code?: string;
  anzsco_title?: string;
  shortage?: Record<string, number>;
}