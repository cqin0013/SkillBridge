// src/layouts/AnalyzerLayout.tsx
// Layout renders ProgressBar and SelectedSummaryDock.
// - Current step comes from route via useRouteStep().
// - Step labels are local constants (keep in sync with routes).
// - Summary uses page drafts first, then Redux fallback.

import React, { useMemo } from "react";
import type { PropsWithChildren } from "react";
import { useSelector } from "react-redux";
import clsx from "clsx";

import ProgressBar from "../components/analyzer/ProgressBar";
import SelectedSummaryDock from "../components/analyzer/SelectedSummaryDock";
import { useRouteStep, TOTAL_STEPS } from "../hooks/useRouteStep";
import type { RootState } from "../store";

export type RoleLite = { id: string; title: string };

export type SummaryDrafts = {
  region?: string;
  industryCodes?: string[];
  roles?: RoleLite[];
  abilityCounts?: { knowledge: number; tech: number; skill: number; total: number };
};

type AnalyzerLayoutProps = PropsWithChildren<{
  summaryDrafts?: SummaryDrafts;
  panelWidth?: number;
  className?: string;
}>;

// Step labels shown in the progress bar.
// Keep order consistent with STEP_PATHS in useRouteStep.ts.
const STEP_TITLES = [
  "Intro",
  "Get info",
  "Abilities",
  "Job suggestions",
  "Skill gap",
  "Training advice",
] as const;

const AnalyzerLayout: React.FC<AnalyzerLayoutProps> = ({
  children,
  summaryDrafts,
  panelWidth = 340,
  className,
}) => {
  const stepIndex = useRouteStep();

  // Guard length mismatch and provide fallback labels.
  const steps = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i < TOTAL_STEPS; i += 1) {
      arr.push(STEP_TITLES[i] ?? `Step ${i + 1}`);
    }
    return arr;
  }, []);

  // Redux fallback when drafts are not provided by the page.
  const persisted = useSelector((state: RootState) => state.analyzer);
  const drafts = summaryDrafts ?? {
    region: persisted.preferredRegion ?? "",
    industryCodes: persisted.interestedIndustryCodes ?? [],
    roles: persisted.chosenRoles ?? [],
  };

  return (
    <div className={clsx("pb-12", className)}>
      {/* Progress bar section */}
      <div className="mx-auto mt-6 mb-8 max-w-6xl px-4 sm:px-6 lg:px-8">
        <ProgressBar current={stepIndex} steps={steps} />
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
        {children}
      </div>

      {/* Right summary dock */}
      <SelectedSummaryDock drafts={drafts} panelWidth={panelWidth} />
    </div>
  );
};

export default AnalyzerLayout;
