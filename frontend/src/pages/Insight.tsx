// frontend/src/pages/Insight.tsx
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import type { FeatureCollection, Geometry } from "geojson";

import rawGeo from "../assets/au-states.json";
import { normalizeAuStates } from "../lib/utils/normalizeAuState";

import AuSvgMap from "../components/insight/AuMap";
import { useShortage } from "../hooks/queries/useShortage";
import type { ShortageRes } from "../types/shortage";
import type { RootState } from "../store";

import {
  type StateCode,
  getStateCode,
  initializeStateValues,type StateProps,
} from "../types/state";

// ============================================================================
// Constants
// ============================================================================

const GEO_DATA: FeatureCollection<Geometry, StateProps> = normalizeAuStates(
  rawGeo as FeatureCollection<Geometry, Record<string, unknown>>
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert API shortage response to map-compatible state values
 */
function transformShortageData(res?: ShortageRes): Record<StateCode, number> {
  const stateValues = initializeStateValues(0);

  if (!res) return stateValues;

  // Handle modern API format: latest_by_state array
  if (Array.isArray(res.latest_by_state)) {
    res.latest_by_state.forEach((entry) => {
      const stateCode = getStateCode(entry.state);
      const value = entry.nsc_emp;
      
      if (stateCode && typeof value === "number" && Number.isFinite(value)) {
        stateValues[stateCode] = value;
      }
    });
    return stateValues;
  }

  // Handle legacy API format: shortage object
  if (res.shortage && typeof res.shortage === "object") {
    Object.entries(res.shortage).forEach(([key, value]) => {
      const stateCode = getStateCode(key);
      if (stateCode && typeof value === "number" && Number.isFinite(value)) {
        stateValues[stateCode] = value;
      }
    });
  }

  return stateValues;
}

/**
 * Custom hook to get target ANZSCO code
 */
function useTargetAnzsco(): string {
  const params = useParams<{ anzsco?: string }>();
  const fromRoute = params.anzsco?.trim() ?? "";

  const fromRedux = useSelector(
    (state: RootState) => state.analyzer?.selectedJob?.code?.trim() ?? ""
  );

  return fromRoute || fromRedux || "";
}

/**
 * Check if any state has non-zero shortage value
 */
function hasShortageData(values: Record<StateCode, number>): boolean {
  return Object.values(values).some((value) => value > 0);
}

// ============================================================================
// UI Components
// ============================================================================

function InfoBanner({
  anzscoCode,
  isFetching,
  isError,
  hasData,
}: {
  anzscoCode: string;
  isFetching: boolean;
  isError: boolean;
  hasData: boolean;
}) {
  if (hasData) return null;

  let message: string;

  if (!anzscoCode) {
    message = "No target job selected. Please choose a job in Profile or complete the Analyzer flow.";
  } else if (isFetching) {
    message = "Loading target job shortage data…";
  } else if (isError) {
    message = "Failed to load shortage data. Please try again later.";
  } else {
    message = "No shortage data available for this occupation. All states show zero.";
  }

  return (
    <div
      className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
      role="status"
      aria-live="polite"
    >
      {isFetching && (
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
            aria-hidden="true"
          />
          <span>{message}</span>
        </div>
      )}
      {!isFetching && <span>{message}</span>}
    </div>
  );
}

function handleStateSelect(stateCode: string, value: number): void {
  console.log(`Selected state: ${stateCode}, Employment value: ${value}`);
}

// ============================================================================
// Main Component
// ============================================================================

export default function Insight(): React.ReactElement {
  const anzscoCode = useTargetAnzsco();
  const { data, isFetching, isError } = useShortage(anzscoCode);

  const stateValues = useMemo(
    () => transformShortageData(data),
    [data]
  );

  const hasData = useMemo(
    () => hasShortageData(stateValues),
    [stateValues]
  );

  const geoData = useMemo(() => GEO_DATA, []);

  return (
    <div className="px-4 py-6 space-y-4">
      <h1 className="sr-only">Skill Shortage Insights</h1>

      <InfoBanner
        anzscoCode={anzscoCode}
        isFetching={isFetching}
        isError={isError}
        hasData={hasData}
      />

      <div className="flex justify-center">
        <AuSvgMap
          geo={geoData}
          values={stateValues}
          className="w-[340px] sm:w-[520px] md:w-[720px] lg:w-[900px]"
          onSelect={handleStateSelect}
          aria-label="Interactive map of Australian skill shortages by state"
        />
      </div>
    </div>
  );
}