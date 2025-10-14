// Path-driven step resolver and navigator for the analyzer wizard.
// - STEP_PATHS must match your AnalyzerRoutes in order.
// - Helpers support passing router state between steps.

import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { AnalyzerRouteState } from "../types/routes";

/** Ordered list of absolute step paths. Keep in sync with <AnalyzerRoutes>. */
export const STEP_PATHS = [
  "/analyzer/intro",
  "/analyzer/get-info",
  "/analyzer/abilities",
  "/analyzer/job-suggestion",
  "/analyzer/skill-gap",
  "/analyzer/training",
] as const;

export type StepPath = (typeof STEP_PATHS)[number];
export const TOTAL_STEPS = STEP_PATHS.length;

/** Return the current step index resolved from location.pathname. */
export function useRouteStep(): number {
  const { pathname } = useLocation();
  const i = STEP_PATHS.findIndex((p) => pathname.startsWith(p));
  return i >= 0 ? i : 0;
}

/** Navigation helpers with router-state passthrough. */
export function useStepNav(): {
  goPrev: () => void;
  goNext: (state?: AnalyzerRouteState, replace?: boolean) => void;
  goTo: (path: StepPath, state?: AnalyzerRouteState, replace?: boolean) => void;
  canPrev: boolean;
  canNext: boolean;
  stepIndex: number;
} {
  const navigate = useNavigate();
  const stepIndex = useRouteStep();

  const canPrev = stepIndex > 0;
  const canNext = stepIndex < TOTAL_STEPS - 1;

  const goPrev = useCallback(() => {
    if (!canPrev) return;
    const target = STEP_PATHS[stepIndex - 1];
    navigate(target);
  }, [canPrev, stepIndex, navigate]);

  const goNext = useCallback(
    (state?: AnalyzerRouteState, replace = false) => {
      if (!canNext) return;
      const target = STEP_PATHS[stepIndex + 1];
      navigate(target, { state, replace });
    },
    [canNext, stepIndex, navigate]
  );

  const goTo = useCallback(
    (path: StepPath, state?: AnalyzerRouteState, replace = false) => {
      navigate(path, { state, replace });
    },
    [navigate]
  );

  return { goPrev, goNext, goTo, canPrev, canNext, stepIndex };
}
