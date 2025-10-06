// src/pages/Analyzer/AnalyzerEntry.tsx
// Synchronize Redux <-> ?step while using path-based routes.

import { useStepSync } from "../../hooks/useStepSync"; // ← 与文件名一致
import AnalyzerRoutes from "./AnalyzerRoutes";

export default function AnalyzerEntry() {
  useStepSync(); // side effect only
  return <AnalyzerRoutes />;
}
