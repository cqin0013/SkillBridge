// src/components/occupation/IndustryEmploymentComparison.tsx
// Bar chart component comparing employment numbers across similar industries.
// Highlights the selected industry to stand out from related industries.
// Uses Recharts library for clean, responsive horizontal bar chart visualization.

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

/**
 * Single industry data item
 */
export interface IndustryEmploymentData {
  /** Industry name or label */
  name: string;
  /** Employment number (total employees) */
  employment: number;
  /** Whether this is the selected/highlighted industry */
  isSelected?: boolean;
}

/**
 * Props for IndustryEmploymentComparison component
 */
export interface IndustryEmploymentComparisonProps {
  /** Array of industry employment data to compare */
  industries: IndustryEmploymentData[];
  /** Optional title override (defaults to "Employment Comparison by Industry") */
  title?: string;
  /** Optional CSS class for the root element */
  className?: string;
}

/**
 * Type definition for Recharts Tooltip props
 */
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: IndustryEmploymentData;
  }>;
}

/**
 * Type definition for Recharts YAxis tick props
 */
interface YAxisTickProps {
  x: number;
  y: number;
  payload: {
    value: string;
  };
}

/**
 * IndustryEmploymentComparison Component
 * 
 * Displays a horizontal bar chart comparing employment numbers across
 * similar industries within the same category. The selected industry
 * is visually highlighted with the primary color.
 * 
 * Features:
 * - Horizontal bar layout for easy label reading
 * - Selected industry highlighted in primary color
 * - Related industries shown in lighter gray
 * - Responsive design with container
 * - Formatted tooltips with thousand separators
 * - Sorted by employment (highest to lowest)
 * - Clean styling matching project design system
 */
export default function IndustryEmploymentComparison({
  industries,
  title = "Employment Comparison by Industry",
  className = "",
}: IndustryEmploymentComparisonProps): React.ReactElement {
  // Sort industries by employment (descending) for better visualization
  const sortedIndustries = React.useMemo(() => {
    return [...industries].sort((a, b) => b.employment - a.employment);
  }, [industries]);

  // Check if we have valid data
  const hasData = sortedIndustries.length > 0;

  /**
   * Format number with thousands separator (Australian format)
   */
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat("en-AU").format(num);
  };

  /**
   * Custom tooltip component with formatted numbers
   */
  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-border rounded-lg shadow-card px-4 py-3">
          <p className="text-sm font-semibold text-ink mb-1">{data.name}</p>
          <p className="text-sm text-ink-soft">
            Employment:{" "}
            <span className="font-semibold text-primary">
              {formatNumber(data.employment)}
            </span>
          </p>
          {data.isSelected && (
            <p className="text-xs text-accent mt-1 font-medium">
              ★ Your Selected Industry
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  /**
   * Format X-axis labels with abbreviated numbers (e.g., "1.2M", "500K")
   */
  const formatXAxis = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  /**
   * Custom Y-axis tick component with conditional styling
   */
  const CustomYAxisTick = (props: YAxisTickProps) => {
    const { x, y, payload } = props;
    const item = sortedIndustries.find((d) => d.name === payload.value);
    const isSelected = item?.isSelected ?? false;
    
    return (
      <text
        x={x}
        y={y}
        dy={4}
        textAnchor="end"
        fill={isSelected ? "#5E75A4" : "#64748b"}
        style={{
          fontSize: "0.875rem",
          fontWeight: isSelected ? 600 : 400,
        }}
      >
        {payload.value}
      </text>
    );
  };

  // Show message if no data is available
  if (!hasData) {
    return (
      <div className={`rounded-xl border border-border bg-white shadow-card p-6 ${className}`}>
        <h3 className="text-lg font-heading font-bold text-ink mb-4">{title}</h3>
        <div className="flex items-center justify-center py-12">
          <p className="text-ink-soft text-center">
            No industry employment data available for comparison
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-border bg-white shadow-card p-6 ${className}`}>
      {/* Chart Title */}
      <h3 className="text-lg font-heading font-bold text-ink mb-2">{title}</h3>
      <p className="text-sm text-ink-soft mb-6">
        Comparing {sortedIndustries.length} industries in the same category
      </p>

      {/* Chart Container */}
      <ResponsiveContainer width="100%" height={Math.max(300, sortedIndustries.length * 50)}>
        <BarChart
          data={sortedIndustries}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
          <XAxis
            type="number"
            tickFormatter={formatXAxis}
            stroke="#64748b"
            style={{ fontSize: "0.875rem" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={180}
            stroke="#64748b"
            style={{ fontSize: "0.875rem" }}
            tick={CustomYAxisTick}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
          <Bar dataKey="employment" radius={[0, 8, 8, 0]}>
            {sortedIndustries.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isSelected ? "#5E75A4" : "#CBD5E1"}
                opacity={entry.isSelected ? 1 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend / Key Information */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: "#5E75A4" }}
              aria-hidden="true"
            />
            <span className="text-ink-soft">Selected Industry</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: "#CBD5E1", opacity: 0.7 }}
              aria-hidden="true"
            />
            <span className="text-ink-soft">Related Industries</span>
          </div>
        </div>
        
        {/* Summary statistics */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-ink-soft">Total Employment</div>
            <div className="text-lg font-semibold text-ink mt-1">
              {formatNumber(sortedIndustries.reduce((sum, item) => sum + item.employment, 0))}
            </div>
          </div>
          <div>
            <div className="text-xs text-ink-soft">Average per Industry</div>
            <div className="text-lg font-semibold text-ink mt-1">
              {formatNumber(
                Math.round(
                  sortedIndustries.reduce((sum, item) => sum + item.employment, 0) /
                    sortedIndustries.length
                )
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-ink-soft">Your Industry Rank</div>
            <div className="text-lg font-semibold text-ink mt-1">
              {(() => {
                const selectedIndex = sortedIndustries.findIndex((i) => i.isSelected);
                return selectedIndex >= 0
                  ? `${selectedIndex + 1} of ${sortedIndustries.length}`
                  : "N/A";
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}