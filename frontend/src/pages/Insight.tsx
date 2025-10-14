// Career Insights page with comprehensive data visualization
// - Tutorial button only shows when occupation is selected
// - Mobile-optimized tutorial launcher (icon-only on small screens)
// - Shows geographic distribution, growth statistics, and comparisons


import { useMemo, useState } from "react"
import { useSelector } from "react-redux"
import { Link } from "react-router-dom"
import type { FeatureCollection, Geometry } from "geojson"

import rawGeo from "../assets/au-states.json"
import { normalizeAuStates } from "../lib/utils/normalizeAuState"

import HeroIntro from "../components/HeroIntro"
import AuSvgMap from "../components/insight/AuMap"
import OccupationGrowthStats from "../components/insight/OccupationGrowthCard"
import GrowthComparisonChart from "../components/insight/GrowthComparisonChart"
import HelpToggleSmall from "../components/ui/HelpToggleSmall"
import ErrorBoundary from "../components/common/ErrorBoundary"
import TutorialLauncher from "../components/tutorial/TutorialLauncher"
import { insightTutorialSteps } from "../data/InsightTutorialStep"
import InsightImage from "../assets/image/data.svg"

import { useShortage } from "../hooks/queries/useShortage"
import { useCareerGrowth } from "../hooks/queries/useCareerGrowth"
import type { ShortageRes } from "../types/shortage"
import type { RootState } from "../store"
import type { CareerGrowthResponse } from "../types/careerGrowth"

import {
  type StateCode,
  type StateProps,
  getStateCode,
  initializeStateValues,
} from "../types/state"

// ============================================================================
// Redux & Utils
// ============================================================================

/**
 * Read the currently selected ANZSCO code from Redux
 * Returns empty string if no occupation is selected
 */
const useTargetAnzsco = () =>
  useSelector((s: RootState) => s.analyzer?.selectedJob?.code?.trim() ?? "")

/**
 * Extract the 4-digit major group code from ANZSCO
 * Used for career growth API queries
 */
const getMajorGroupCode = (code: string) => code.trim().slice(0, 4)

/**
 * Safe number parser with fallback to 0
 * Handles both number and string inputs
 */
const safeNumber = (v: unknown): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

/**
 * Safe string parser with fallback to empty string
 */
const safeString = (v: unknown): string => (typeof v === "string" ? v : "")

/**
 * Convert shortage API response into map-friendly state→value dictionary
 * Handles both array and object formats from the API
 */
function toEmploymentValues(res?: ShortageRes): Record<StateCode, number> {
  const out = initializeStateValues(0)
  if (!res) return out

  // Handle array format: latest_by_state
  if (Array.isArray(res.latest_by_state)) {
    for (const row of res.latest_by_state) {
      const code = getStateCode(row.state)
      if (code) out[code] = safeNumber(row.nsc_emp)
    }
  } 
  // Handle object format: shortage
  else if (res.shortage && typeof res.shortage === "object") {
    for (const [name, val] of Object.entries(res.shortage)) {
      const code = getStateCode(name)
      if (code) out[code] = safeNumber(val)
    }
  }
  return out
}

/**
 * Check if at least one state has data > 0
 */
const hasAnyData = (values: Record<StateCode, number>) =>
  Object.values(values).some((v) => v > 0)

// ============================================================================
// UI Components
// ============================================================================

/**
 * Section header with decorative square and help tooltip
 * Used for major sections throughout the page
 */
function SectionHeader({
  title,
  helpContent,
  level = 2,
}: {
  title: string
  helpContent: string
  level?: 2 | 3
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {/* Decorative square - hidden from screen readers */}
      <div
        aria-hidden="true"
        className="h-9 w-9 rounded-lg bg-primary/15 ring-1 ring-primary/30 sm:h-10 sm:w-10"
      />
      {level === 2 ? (
        <h2 className="text-2xl font-heading font-extrabold text-ink sm:text-3xl">{title}</h2>
      ) : (
        <h3 className="text-xl font-heading font-bold text-ink sm:text-2xl">{title}</h3>
      )}
      <HelpToggleSmall text={helpContent} placement="bottom" openOn="click" />
    </div>
  )
}

/**
 * Loading skeleton component
 * Shows animated placeholders while data is being fetched
 */
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-8" aria-busy="true" aria-live="polite">
      <div className="h-32 rounded-xl bg-slate-200" />
      <div className="h-64 rounded-xl bg-slate-200" />
      <div className="h-96 rounded-xl bg-slate-200" />
    </div>
  )
}

/**
 * Empty state component
 * Displayed when no occupation is selected
 * Shows helpful message and action buttons
 */
function NoOccupationSelected() {
  return (
    <>
      {/* Hero section without tutorial button */}
      <div id="hero-section" className="relative">
        <HeroIntro
          title="Your Personalized Career Insights"
          description="Select a target occupation in your profile to view employment data, growth, and regional demand."
          image={InsightImage}
          tone="blue"
          imageDecorative
        />
      </div>

      {/* Empty state message with action buttons */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <h3 className="mb-2 text-xl font-semibold text-slate-900">No Occupation Selected</h3>
          <p className="mx-auto mb-6 max-w-md text-slate-600">
            Choose a target occupation in your profile or complete the analyzer test to see personalized career insights.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link 
              to="/profile" 
              className="rounded-lg bg-primary px-6 py-3 text-white hover:bg-primary-dark transition-colors"
            >
              Go to Profile
            </Link>
            <Link
              to="/analyzer"
              className="rounded-lg border border-primary bg-white px-6 py-3 text-primary hover:bg-blue-50 transition-colors"
            >
              Take Analyzer Test
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

// ============================================================================
// Main Page Component
// ============================================================================

/**
 * InsightInner - Main content component
 * Handles data fetching, state management, and rendering
 */
function InsightInner(): React.ReactElement {
  // Get selected occupation code from Redux
  const anzscoCode = useTargetAnzsco()
  const majorGroup = anzscoCode ? getMajorGroupCode(anzscoCode) : ""

  // Local state

  const [selectedState, setSelectedState] = useState<string | null>(null)

  // Fetch data from APIs
  const { 
    data: shortage, 
    isLoading: shortageLoading, 
    isFetching: shortageRefetching 
  } = useShortage(anzscoCode)
  
  const { 
    data: career, 
    isLoading: careerLoading, 

  } = useCareerGrowth(majorGroup)

  // Normalize geographic data
  const geoData: FeatureCollection<Geometry, StateProps> = useMemo(
    () => normalizeAuStates(rawGeo as FeatureCollection<Geometry, Record<string, unknown>>),
    []
  )

  // Process employment values for map visualization
  const employmentValues = useMemo(() => toEmploymentValues(shortage), [shortage])
  const mapHasData = hasAnyData(employmentValues)
  const isInitialLoading = (careerLoading || shortageLoading) && !career && !shortage

  // Normalize career growth data to safe UI values
  const safeCareer = useMemo(() => {
    if (!career) return null
    const c = career as unknown as Partial<CareerGrowthResponse>
    return {
      anzscoCode: safeString(c.anzscoCode),
      majorGroupTitle: safeString(c.majorGroupTitle),
      fiveYearGrowthRate: safeNumber(c.fiveYearGrowthRate),
      tenYearGrowthRate: safeNumber(c.tenYearGrowthRate),
      growthRanking: safeString(c.growthRanking),
      currentEmployment: safeNumber(c.currentEmployment),
      projectedNewJobs: safeNumber(c.projectedNewJobs),
      nationalAverageRate: safeNumber(c.nationalAverageRate),
      relatedOccupationsRate: safeNumber(c.relatedOccupationsRate),
      selectedOccupationRate: safeNumber(c.selectedOccupationRate),
    }
  }, [career])

  // Show empty state if no occupation is selected
  if (!anzscoCode) return <NoOccupationSelected />

  return (
    <>
      {/* Hero header with tutorial button (ONLY shows when job is selected) */}
      <div id="hero-section" className="relative">
        <HeroIntro
          title="Your Personalized Career Insights"
          description={
            safeCareer
              ? `Comprehensive data for ${safeCareer.majorGroupTitle}. Explore employment trends, growth projections, and regional demand across Australia.`
              : "Loading career insights..."
          }
          image={InsightImage}
          tone="blue"
          imageDecorative
        />
        
        {/* Tutorial launcher - only visible when occupation is selected */}
        <TutorialLauncher
          steps={insightTutorialSteps}
          placement="top-right"
          label="View Tutorial"
          variant="outline"
          ariaLabel="View Career Insights Tutorial"
          className="z-50"        
          headerOffset={64}          
          tutorialHeaderOffset={64} 
        />
      </div>

      {/* Main content area */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {isInitialLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Job title section with ID for tutorial targeting */}
            {safeCareer && (
              <div id="job-title" className="mb-8">
                <h2 className="text-2xl font-bold text-ink sm:text-3xl">
                  {safeCareer.majorGroupTitle}
                </h2>
                <p className="mt-2 text-sm text-ink-soft">
                  ANZSCO Major Group: {safeCareer.anzscoCode.slice(0, 4)}
                </p>
              </div>
            )}

            {/* Quick statistics section */}
            {safeCareer && (
              <section id="quick-stats" className="mb-8">
                <SectionHeader
                  title="Quick Statistics"
                  helpContent="Overview of key metrics for this occupation group including growth rates and rankings."
                />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="text-sm text-slate-600">5-Year Growth</div>
                    <div className="mt-1 text-2xl font-bold text-primary">
                      {safeCareer.fiveYearGrowthRate}%
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="text-sm text-slate-600">10-Year Growth</div>
                    <div className="mt-1 text-2xl font-bold text-primary">
                      {safeCareer.tenYearGrowthRate}%
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="text-sm text-slate-600">National Ranking</div>
                    <div className="mt-1 text-2xl font-bold text-primary">
                      {safeCareer.growthRanking}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Growth statistics section */}
            {safeCareer && (
              <section id="growth-statistics" className="mb-8">
                <SectionHeader
                  title="Growth Statistics"
                  helpContent="Detailed employment statistics and projections for this major occupation group."
                />
                <OccupationGrowthStats
                  anzscoCode={safeCareer.anzscoCode}
                  majorGroupTitle={safeCareer.majorGroupTitle}
                  fiveYearGrowthRate={safeCareer.fiveYearGrowthRate}
                  tenYearGrowthRate={safeCareer.tenYearGrowthRate}
                  growthRanking={safeCareer.growthRanking}
                  currentEmployment={safeCareer.currentEmployment}
                  projectedNewJobs={safeCareer.projectedNewJobs}
                />
              </section>
            )}

            {/* Growth comparison chart section */}
            {safeCareer && (
              <section id="growth-comparison" className="mb-8">
                <SectionHeader
                  title="Growth Comparison"
                  helpContent="Compare this occupation's growth rate with related occupations and national average."
                />
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-md">
                  <GrowthComparisonChart
                    selectedOccupationRate={safeCareer.selectedOccupationRate}
                    selectedOccupationLabel={safeCareer.majorGroupTitle || "Selected occupation"}
                    relatedOccupationsRate={safeCareer.relatedOccupationsRate}
                    nationalAverageRate={safeCareer.nationalAverageRate}
                  />
                </div>
              </section>
            )}

            {/* Geographic distribution map section */}
            <section id="geographic-map">
              <SectionHeader
                title="Geographic Distribution"
                helpContent="Click a state to view employment values. Darker shades indicate higher demand."
              />
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-md">
                {shortageLoading || shortageRefetching ? (
                  <div className="flex flex-col items-center justify-center py-12" aria-live="polite">
                    <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent text-primary" />
                    <p className="text-sm text-slate-600">Loading geographic data…</p>
                  </div>
                ) : (
                  <AuSvgMap
                    geo={geoData}
                    values={employmentValues}
                    onSelect={(code, value) =>
                      setSelectedState(`${code} — ${value.toLocaleString("en-AU")}`)
                    }
                  />
                )}
              </div>

              {/* Selected state display */}
              {mapHasData && selectedState && (
                <p className="mt-3 text-center text-sm text-ink-soft">
                  Selected: <span className="font-medium text-ink">{selectedState}</span>
                </p>
              )}

              {/* No data message */}
              {!mapHasData && !(shortageLoading || shortageRefetching) && (
                <p className="mt-3 text-center text-sm text-ink-soft">
                  No regional employment data available for this occupation.
                </p>
              )}
            </section>
          </>
        )}
      </div>


    </>
  )
}

/**
 * Insight - Main export component with error boundary
 */
export default function Insight(): React.ReactElement {
  return (
    <ErrorBoundary feedbackHref="/feedback">
      <InsightInner />
    </ErrorBoundary>
  )
}