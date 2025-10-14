// Component displays major group growth statistics and employment projections.
// - Shows ANZSCO major group (first 4 digits) category information
// - Displays 5-year and 10-year growth rates with rankings
// - Shows employment numbers and projected new jobs by 2034
// - If no code is provided, displays a prompt message
// - Uses project's design system with card layout and clean typography

import React from "react";
import { TrendingUp, Users, Briefcase } from "lucide-react";

/**
 * Props for OccupationGrowthStats component
 */
export interface OccupationGrowthStatsProps {
  /** Complete 6-digit ANZSCO code (e.g., "261313") */
  anzscoCode?: string;
  /** Major group title (e.g., "ICT Professionals") - derived from first 4 digits */
  majorGroupTitle?: string;
  /** 5-year growth rate percentage */
  fiveYearGrowthRate?: number;
  /** 10-year growth rate percentage */
  tenYearGrowthRate?: number;
  /** Ranking among major groups (e.g., "3rd out of 43") */
  growthRanking?: string;
  /** Current employment number */
  currentEmployment?: number;
  /** Projected new jobs by 2034 */
  projectedNewJobs?: number;
  /** Optional CSS class for the root element */
  className?: string;
}

/**
 * OccupationGrowthStats Component
 * 
 * Displays occupation growth statistics and employment projections
 * for an ANZSCO major group category.
 * 
 * Features:
 * - Responsive two-column grid layout
 * - Growth rates with visual indicators
 * - Employment statistics with icons
 * - Fallback message when no data provided
 * - Follows project's design system
 */
export default function OccupationGrowthStats({
  anzscoCode,
  majorGroupTitle,
  fiveYearGrowthRate,
  tenYearGrowthRate,
  growthRanking,
  currentEmployment,
  projectedNewJobs,
  className = "",
}: OccupationGrowthStatsProps): React.ReactElement {
  // Show prompt message if no code is provided
  if (!anzscoCode || !majorGroupTitle) {
    return (
      <div className={`rounded-xl border border-border bg-white shadow-card p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <p className="text-ink-soft text-center">
            Please select a target occupation in your profile or complete the analyzer test first.
          </p>
        </div>
      </div>
    );
  }

  /**
   * Format number with thousands separator
   */
  const formatNumber = (num?: number): string => {
    if (num === undefined || num === null) return "N/A";
    return new Intl.NumberFormat("en-AU").format(num);
  };

  /**
   * Format growth rate with + sign for positive values
   */
  const formatGrowthRate = (rate?: number): string => {
    if (rate === undefined || rate === null) return "N/A";
    const sign = rate >= 0 ? "+" : "";
    return `${sign}${rate.toFixed(1)}%`;
  };

  return (
    <div className={`rounded-xl border border-border bg-white shadow-card p-6 ${className}`}>
      {/* Title Section */}

      {/* Stats Grid - Two columns on larger screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Growth Rates Column */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink-soft mb-1">
                5-Year Growth Rate
              </div>
              <div className="text-2xl font-bold text-ink">
                {formatGrowthRate(fiveYearGrowthRate)}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink-soft mb-1">
                10-Year Growth Rate
              </div>
              <div className="text-2xl font-bold text-ink">
                {formatGrowthRate(tenYearGrowthRate)}
              </div>
            </div>
          </div>

          {growthRanking && (
            <div className="pt-2 border-t border-border">
              <div className="text-sm text-ink-soft">
                <span className="font-medium">Ranking: </span>
                {growthRanking}
              </div>
            </div>
          )}
        </div>

        {/* Employment Column */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-accent" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink-soft mb-1">
                Current Employment
              </div>
              <div className="text-2xl font-bold text-ink">
                {formatNumber(currentEmployment)}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
              <Briefcase className="h-5 w-5 text-accent" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink-soft mb-1">
                Projected New Jobs (by 2034)
              </div>
              <div className="text-2xl font-bold text-ink">
                {formatNumber(projectedNewJobs)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}