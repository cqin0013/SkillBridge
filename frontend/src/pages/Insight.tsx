// frontend/src/pages/Insight.tsx
// Comprehensive occupation insight page displaying growth statistics,
// comparison charts, and geographical demand distribution.

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import type { FeatureCollection, Geometry } from "geojson";

import rawGeo from "../assets/au-states.json";
import { normalizeAuStates } from "../lib/utils/normalizeAuState";

import HeroIntro from "../components/HeroIntro";
import AuSvgMap from "../components/insight/AuMap";
import OccupationGrowthStats from "../components/insight/OccupationGrowthCard";
import GrowthComparisonChart from "../components/insight/GrowthComparisonChart";
import IndustryEmploymentComparison from "../components/insight/IndustryEmploymentComparison";
import HelpToggleSmall from "../components/ui/HelpToggleSmall";
import InsightImage from "../assets/image/data.svg";

import { useShortage } from "../hooks/queries/useShortage";
import type { ShortageRes } from "../types/shortage";
import type { RootState } from "../store";

import {
  type StateCode,
  getStateCode,
  initializeStateValues,
  type StateProps,
} from "../types/state";

import { getMockOccupationInsight, hasMockData } from "../data/occupationInsightMock";

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

/**
 * Info banner shown when no data is available
 */
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
    message =
      "No target job selected. Please choose a job in Profile or complete the Analyzer flow.";
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

/**
 * Section header with title and help toggle
 */
interface SectionHeaderProps {
  title: string;
  helpContent: string;
}

function SectionHeader({ title, helpContent }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h2 className="text-2xl font-heading font-bold text-ink">{title}</h2>
      <HelpToggleSmall text={helpContent} placement="bottom" openOn="click" />
    </div>
  );
}

/**
 * Quick stats cards showing key metrics at a glance
 */
interface QuickStatsProps {
  totalRegions: number;
  totalEmployment: number;
  avgGrowthRate?: number;
  hasValidData: boolean;
}

function QuickStats({ totalRegions, totalEmployment, avgGrowthRate, hasValidData }: QuickStatsProps) {
  if (!hasValidData) return null;

  return (
    <section className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-slate-900 mb-1">{totalRegions}</div>
          <div className="text-sm text-slate-600">Active Regions</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-slate-900 mb-1">
            {totalEmployment.toLocaleString('en-AU')}
          </div>
          <div className="text-sm text-slate-600">Total Employment</div>
        </div>
        {avgGrowthRate !== undefined && (
          <div className="text-center col-span-2 md:col-span-1">
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {avgGrowthRate > 0 ? '+' : ''}{avgGrowthRate.toFixed(1)}%
            </div>
            <div className="text-sm text-slate-600">Projected Growth</div>
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function Insight(): React.ReactElement {
  const anzscoCode = useTargetAnzsco();
  const { data: shortageData, isFetching, isError } = useShortage(anzscoCode);

  // State for selected state in map
  const [selectedState, setSelectedState] = useState<string | null>(null);

  // Transform shortage data for map
  const stateValues = useMemo(
    () => transformShortageData(shortageData),
    [shortageData]
  );

  const hasData = useMemo(() => hasShortageData(stateValues), [stateValues]);

  const geoData = useMemo(() => GEO_DATA, []);

  // Get mock data for the occupation (if available)
  const mockData = useMemo(() => {
    if (!anzscoCode) return null;
    return getMockOccupationInsight(anzscoCode);
  }, [anzscoCode]);

  // Use mock data if available, otherwise show placeholder
  const hasMock = hasMockData(anzscoCode);

  // Calculate quick stats
  const quickStats = useMemo(() => {
    const activeRegions = Object.values(stateValues).filter(v => v > 0).length;
    const totalEmployment = Object.values(stateValues).reduce((sum, v) => sum + v, 0);
    const avgGrowth = mockData?.growth?.fiveYearGrowthRate;
    
    return {
      totalRegions: activeRegions,
      totalEmployment,
      avgGrowthRate: avgGrowth,
      hasValidData: activeRegions > 0 || totalEmployment > 0,
    };
  }, [stateValues, mockData]);

  // Handle state selection on map
  const handleStateSelect = (stateCode: string, value: number): void => {
    setSelectedState(stateCode);
    console.log(`Selected state: ${stateCode}, Employment value: ${value}`);
  };

  // Show message if no ANZSCO code is selected
  if (!anzscoCode) {
    return (
      <>
        <HeroIntro
          title="Discover Career Insights Tailored for You"
          description="Explore personalized occupation metrics, track employment trends across Australian states, and make informed career decisions with real-time labor market data."
          image={InsightImage}
          tone="blue"
          ctaLabel="View Tutorial"
          ctaTo="/tutorial"
          imageDecorative
        />
        
        <div className="px-4 sm:px-6 lg:px-8 py-12 max-w-7xl mx-auto">
          <div className="rounded-xl border border-border bg-white shadow-card p-8 text-center">
            <h2 className="text-2xl font-heading font-bold text-ink mb-3">
              No Occupation Selected
            </h2>
            <p className="text-ink-soft">
              Please select a target occupation in your Profile or complete the Career Analyzer to
              view detailed insights.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Hero Section */}
      <HeroIntro
        title="Your Personalized Career Insights"
        description={`Comprehensive employment data and growth projections for ${mockData?.growth?.majorGroupTitle || `ANZSCO ${anzscoCode}`}. Explore regional demand, industry trends, and future opportunities across Australia.`}
        image="/images/insight-hero.png"
        tone="blue"
        ctaLabel="View Tutorial"
        ctaTo="/tutorial"
        imageDecorative
      />

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-12 max-w-7xl mx-auto space-y-8">
        {/* Quick Stats Bar */}
        <QuickStats {...quickStats} />

        {/* Growth Statistics Section */}
        {mockData && (
          <section>
            <SectionHeader
              title="Major Group Statistics"
              helpContent="The first 4 digits of an ANZSCO code represent the Major Group classification. For example, code 2613 refers to 'Software and Applications Programmers' within the broader ICT Professionals category. This grouping helps track employment trends and growth projections for related occupations."
            />
            <OccupationGrowthStats
              anzscoCode={mockData.growth.anzscoCode}
              majorGroupTitle={mockData.growth.majorGroupTitle}
              fiveYearGrowthRate={mockData.growth.fiveYearGrowthRate}
              tenYearGrowthRate={mockData.growth.tenYearGrowthRate}
              growthRanking={mockData.growth.growthRanking}
              currentEmployment={mockData.growth.currentEmployment}
              projectedNewJobs={mockData.growth.projectedNewJobs}
            />
          </section>
        )}

        {/* Growth Comparison Chart Section */}
        {mockData && (
          <section>
            <GrowthComparisonChart
              selectedOccupationRate={mockData.growthComparison.selectedOccupationRate}
              selectedOccupationLabel={mockData.growthComparison.selectedOccupationLabel}
              relatedOccupationsRate={mockData.growthComparison.relatedOccupationsRate}
              nationalAverageRate={mockData.growthComparison.nationalAverageRate}
            />
          </section>
        )}

        {/* Industry Comparison Section */}
        {mockData && (
          <section>
            <IndustryEmploymentComparison
              industries={mockData.industryComparison.industries}
              title="Employment by Related Industry"
            />
          </section>
        )}

        {/* Geographic Distribution Map Section */}
        <section>
          <SectionHeader
            title="Geographic Demand Distribution"
            helpContent="Click on different states to view their specific demand data. Darker colors indicate higher demand or employment numbers for this occupation in that state. This helps you understand regional job market variations across Australia."
          />

          <InfoBanner
            anzscoCode={anzscoCode}
            isFetching={isFetching}
            isError={isError}
            hasData={hasData}
          />

          <div className="flex justify-center mt-4">
            <AuSvgMap
              geo={geoData}
              values={stateValues}
              className="w-[340px] sm:w-[520px] md:w-[720px] lg:w-[900px]"
              onSelect={handleStateSelect}
            />
          </div>

          {selectedState && (
            <div className="mt-4 text-center text-sm text-ink-soft">
              Selected: <span className="font-semibold text-ink">{selectedState}</span>
              {stateValues[selectedState as StateCode] > 0 && (
                <span>
                  {" "}
                  - Employment: {stateValues[selectedState as StateCode].toLocaleString("en-AU")}
                </span>
              )}
            </div>
          )}
        </section>

        {/* Development Notice */}
        {!hasMock && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold mb-1">Development Mode</p>
            <p>
              Mock data is currently available for these ANZSCO codes: 261313 (Software Engineer),
              254411 (Registered Nurse), 221111 (Accountant), 241111 (Primary School Teacher), 341111
              (Electrician). Try these codes to see full insights.
            </p>
          </div>
        )}
      </div>
    </>
  );
}