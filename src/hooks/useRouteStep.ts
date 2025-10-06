// src/hooks/useRouteStep.ts
// Path-driven step resolver and navigator for the analyzer wizard.
// - STEP_PATHS must match your AnalyzerRoutes paths in order.
// - Exposes current step index and simple prev/next/goTo helpers.

import { useLocation, useNavigate } from "react-router-dom";

/** Ordered list of step paths. Keep in sync with your <AnalyzerRoutes>. */
export const STEP_PATHS = [
  "/analyzer/intro",
  "/analyzer/get-info",
  "/analyzer/abilities",
  "/analyzer/jobs",        // add when the page exists
  "/analyzer/skill-gap",   // add when the page exists
  "/analyzer/training",    // add when the page exists
] as const;

export type StepPath = (typeof STEP_PATHS)[number];
export const TOTAL_STEPS = STEP_PATHS.length;

/** Normalize path for stable comparison (trim trailing slashes except root). */
const normalize = (p: string): string => (p === "/" ? "/" : p.replace(/\/+$/, ""));

/** Return the current step index resolved from location.pathname. */
export function useRouteStep(): number {
  const { pathname } = useLocation();
  const i = STEP_PATHS.indexOf(normalize(pathname) as StepPath);
  return i >= 0 ? i : 0;
}

/** Navigation helpers for previous/next/goTo based on STEP_PATHS. */
export function useStepNav() {
  const navigate = useNavigate();
  const curr = useRouteStep();
  const canPrev = curr > 0;
  const canNext = curr < TOTAL_STEPS - 1;

  /** Navigate to previous step if available. */
  const goPrev = (): void => {
    if (canPrev) navigate(STEP_PATHS[curr - 1]);
  };

  /** Navigate to next step if available. */
  const goNext = (): void => {
    if (canNext) navigate(STEP_PATHS[curr + 1]);
  };

  /** Navigate directly to a specific step path. */
  const goTo = (path: StepPath): void => {
    navigate(path);
  };

  return { curr, canPrev, canNext, goPrev, goNext, goTo };
}
