// src/pages/Analyzer/AnalyzerEntry.tsx
// Entry host for /analyzer/*
// - Redirect /analyzer -> /analyzer/intro
// - Render all child routes via <AnalyzerRoutes/>

import { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useStepSync } from "../../hooks/useStepSync";
import AnalyzerRoutes from "./AnalyzerRoutes";

export default function AnalyzerEntry(): React.ReactElement {
  // Side-effect only: sync query step with Redux, safe on mount
  useStepSync();

  return (
    <Suspense fallback={<div className="p-6 text-sm text-ink-soft">Loading…</div>}>
      <Routes>
        {/* When visiting /analyzer, immediately go to /analyzer/intro */}
        <Route index element={<Navigate to="intro" replace />} />

        {/* All other analyzer subpaths are handled by AnalyzerRoutes */}
        <Route path="*" element={<AnalyzerRoutes />} />
      </Routes>
    </Suspense>
  );
}
