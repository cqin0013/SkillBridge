// src/pages/Analyzer/AnalyzerEntry.tsx
// Synchronize Redux <-> ?step while using path-based routes.

import { Suspense } from "react";
import { useStepSync } from "../../hooks/useStepSync"; 
import AnalyzerRoutes from "./AnalyzerRoutes";

export default function AnalyzerEntry() {
  useStepSync(); // side effect only
  return (
    <Suspense fallback={<div className="p-6 text-sm text-ink-soft">Loading…</div>}>
      <AnalyzerRoutes />
    </Suspense>
  );

}
