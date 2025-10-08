// src/layouts/AnalyzerLayout.tsx
// Layout renders ProgressBar, an optional centered page header (Title + Help),
// a right-aligned actions slot, page content, and the SelectedSummaryDock.
//
// - Current step index comes from useRouteStep().
// - Step labels are local constants (keep in sync with routes).
// - Summary uses page drafts first, then Redux fallback.
// - Optional header:
//    * Title centered
//    * HelpToggle placed right next to the title
//    * Right-side actions area for buttons (e.g., Export PDF)

import React, { useMemo, type PropsWithChildren, type ReactNode } from "react";
import { useSelector } from "react-redux";
import clsx from "clsx";

import ProgressBar from "../components/analyzer/ProgressBar";
import SelectedSummaryDock from "../components/analyzer/SelectedSummaryDock";
import HelpToggle, { type HelpContent as HelpToggleContent } from "../components/ui/HelpToggle";
import { useRouteStep } from "../hooks/useRouteStep";
import type { RootState } from "../store";

export type RoleLite = { id: string; title: string };

export type SummaryDrafts = {
  region?: string;
  industryCodes?: string[];
  roles?: RoleLite[];
  abilityCounts?: { knowledge: number; tech: number; skill: number; total: number };
};

/** Minimal Help content contract to avoid leaking UI details */
export type AnalyzerHelpContent = {
  title?: string;
  subtitle?: string;
  features?: Array<string | ReactNode>;
  /** Free form list; allow ReactNode to support rich items if the HelpToggle supports it */
  howTo?: Array<string | ReactNode>;
  tips?: Array<string | ReactNode>;
};

type AnalyzerLayoutProps = PropsWithChildren<{
  /** Optional prefilled data for the summary dock */
  summaryDrafts?: SummaryDrafts;
  /** Right dock width in px */
  panelWidth?: number;
  /** Extra class on the root container */
  className?: string;

  /** Optional page header title; when omitted, header is hidden */
  title?: string;
  /** Optional Help content; when provided, HelpToggle renders right next to the title */
  helpContent?: AnalyzerHelpContent;
  /** Right-aligned actions area (e.g., Export PDF) */
  headerActions?: ReactNode;
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

const toNodeList = (
  items?: Array<string | ReactNode>
): HelpToggleContent["features"] => {
  if (!items) return undefined;
  return items.map((item) => item) as HelpToggleContent["features"];
};

const AnalyzerLayout: React.FC<AnalyzerLayoutProps> = ({
  children,
  summaryDrafts,
  panelWidth = 340,
  className,
  title,
  helpContent,
  headerActions,
}) => {
  const stepIndex = useRouteStep();

  // Progress bar omits the Intro step; fall back to full list if slice is empty.
  const progressSteps = useMemo(() => {
    const titles = STEP_TITLES.slice(1);
    return titles.length > 0 ? [...titles] : [...STEP_TITLES];
  }, []);
  const showProgress = stepIndex > 0;
  const progressCurrent = Math.min(
    Math.max(stepIndex, 1),
    progressSteps.length
  );

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
      {showProgress && (
        <div className="mx-auto mt-6 mb-4 max-w-6xl px-4 sm:px-6 lg:px-8">
          <ProgressBar current={progressCurrent} steps={progressSteps} />
        </div>
      )}

      {/* Optional page header:
          - Center block (title + help) is absolutely centered within the header row
          - Right block holds actions (e.g., Export PDF)
          - If no `title` is provided, the entire header row is omitted */}

      {title ? (
        <div className="mx-auto mb-4 max-w-6xl px-4 sm:px-6 lg:px-8">
          <header className="grid grid-cols-[1fr_auto_1fr] items-center h-10">
            {/* left spacer */}
            <div />

            {/* center block: title + help side-by-side */}
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-ink">{title}</h1>
              {helpContent ? (
                <HelpToggle
                  content={{
                    title: helpContent.title,
                    subtitle: helpContent.subtitle,
                    features: toNodeList(helpContent.features),
                    howTo: toNodeList(helpContent.howTo),
                    tips: toNodeList(helpContent.tips),
                  }}
                />
              ) : null}
            </div>

            {/* right actions */}
            <div className="justify-self-end">{headerActions}</div>
          </header>
        </div>
      ) : null}

      {/* Main content */}
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">{children}</div>

      {/* Right summary dock */}
      <SelectedSummaryDock drafts={drafts} panelWidth={panelWidth} />
    </div>
  );
};

export default AnalyzerLayout;
