// Bar chart component comparing growth rates across three categories:
// - Selected occupation
// - Related occupations (average)
// - National average
// Uses Recharts library for clean, responsive visualization

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
 * Props for GrowthComparisonChart component
 */
export interface GrowthComparisonChartProps {
  /** Growth rate for the selected occupation (percentage) */
  selectedOccupationRate?: number;
  /** Label for the selected occupation */
  selectedOccupationLabel?: string;
  /** Average growth rate for related occupations (percentage) */
  relatedOccupationsRate?: number;
  /** National average growth rate (percentage) */
  nationalAverageRate?: number;
  /** Optional CSS class for the root element */
  className?: string;
}

/**
 * GrowthComparisonChart Component
 * 
 * Displays a horizontal bar chart comparing growth rates between:
 * - The user's selected occupation
 * - Related occupations (average)
 * - National average
 * 
 * Features:
 * - Responsive design with container
 * - Color-coded bars for visual hierarchy
 * - Formatted tooltips with percentage values
 * - Clean, minimal styling matching project design
 * - Handles missing data gracefully
 */
export default function GrowthComparisonChart({
  selectedOccupationRate,
  selectedOccupationLabel = "Selected Occupation",
  relatedOccupationsRate,
  nationalAverageRate,
  className = "",
}: GrowthComparisonChartProps): React.ReactElement {
  // Prepare data for the chart
  const chartData = [
    {
      name: "National Average",
      rate: nationalAverageRate ?? 0,
      hasData: nationalAverageRate !== undefined && nationalAverageRate !== null,
    },
    {
      name: "Related Occupations",
      rate: relatedOccupationsRate ?? 0,
      hasData: relatedOccupationsRate !== undefined && relatedOccupationsRate !== null,
    },
    {
      name: selectedOccupationLabel,
      rate: selectedOccupationRate ?? 0,
      hasData: selectedOccupationRate !== undefined && selectedOccupationRate !== null,
    },
  ];

  // Check if we have any valid data
  const hasAnyData = chartData.some((item) => item.hasData);

  // Color scheme - primary color for selected, softer tones for others
  const colors = ["#A9BDD9", "#89A4C7", "#5E75A4"]; // From light to dark (primary)

  /**
   * Custom tooltip component
   */
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      payload: {
        name: string;
        rate: number;
        hasData: boolean;
      };
    }>;
  }) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      if (!data.hasData) {
        return (
          <div className="bg-white border border-border rounded-lg shadow-card px-3 py-2">
            <p className="text-sm text-ink-soft">No data available</p>
          </div>
        );
      }
      return (
        <div className="bg-white border border-border rounded-lg shadow-card px-3 py-2">
          <p className="text-sm font-medium text-ink mb-1">{data.name}</p>
          <p className="text-sm text-ink-soft">
            Growth Rate: <span className="font-semibold text-primary">{data.rate.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  /**
   * Format Y-axis labels with percentage sign
   */
  const formatYAxis = (value: number) => {
    return `${value}%`;
  };

  // Show message if no data is available
  if (!hasAnyData) {
    return (
      <div className={`rounded-xl border border-border bg-white shadow-card p-6 ${className}`}>
        <h3 className="text-lg font-heading font-bold text-ink mb-4">Growth Rate Comparison</h3>
        <div className="flex items-center justify-center py-12">
          <p className="text-ink-soft text-center">
            No growth rate data available for comparison
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-border bg-white shadow-card p-6 ${className}`}>
      {/* Chart Title */}
      <h3 className="text-lg font-heading font-bold text-ink mb-6">
        Growth Rate Comparison
      </h3>

      {/* Chart Container */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            type="number"
            tickFormatter={formatYAxis}
            stroke="#64748b"
            style={{ fontSize: "0.875rem" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            stroke="#64748b"
            style={{ fontSize: "0.875rem" }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
          <Bar dataKey="rate" radius={[0, 8, 8, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.hasData ? colors[index] : "#e2e8f0"}
                opacity={entry.hasData ? 1 : 0.5}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend / Description */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: colors[2] }}
              aria-hidden="true"
            />
            <span className="text-ink-soft">{selectedOccupationLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: colors[1] }}
              aria-hidden="true"
            />
            <span className="text-ink-soft">Related Occupations</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: colors[0] }}
              aria-hidden="true"
            />
            <span className="text-ink-soft">National Average</span>
          </div>
        </div>
      </div>
    </div>
  );
}