// Synchronize the wizard "step" between Redux and the URL query (?step=).
// - On mount: read ?step and dispatch to Redux (clamped).
// - On Redux change: write ?step to URL (remove when step === 0) with history.replace.
// This keeps deep-links and refresh behavior consistent.

import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setStep } from "../store/analyzerSlice";

function parseStepFromQuery(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

export function useStepSync() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const step = useAppSelector((state) => state.analyzer.step);

  // Avoid feedback loop by remembering the last step we wrote to the URL
  const lastWrittenRef = useRef<number | null>(null);

  // 1) On mount / query change: adopt step from URL once
  useEffect(() => {
    const qStep = parseStepFromQuery(searchParams.get("step"));
    if (qStep !== null && qStep !== step) {
      // Dispatch to Redux; slice's clamp will keep bounds safe
      dispatch(setStep(qStep));
      lastWrittenRef.current = qStep;
    }
    // Only react to changes in the query string
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // 2) When Redux step changes: reflect into URL (replace, not push)
  useEffect(() => {
    if (lastWrittenRef.current === step) return; // already in sync from URL -> Redux

    const next = new URLSearchParams(searchParams);
    if (step === 0) {
      // Remove ?step for the initial step to keep URLs clean
      next.delete("step");
    } else {
      next.set("step", String(step));
    }
    lastWrittenRef.current = step;
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // 3) Expose current step for convenience (optional)
  return { step };
}

