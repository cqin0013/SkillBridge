// src/routes/AnalyzerRoutes.tsx
// Child routes under parent "/analyzer/*" must be relative.

import { Routes, Route, Navigate } from "react-router-dom";
import AnalyzerIntro from "./AnalyzerIntro";
import AnalyzerGetInfo from "./AnalyzerGetInfo";
import AnalyzerAbility from "./AnalyzerAbility";
import AnalyzerJobSuggestion from "./AnalyzerJobSuggestion";
import AnalyzerSkillGap from "./AnalyzerSkillGap";
import AnalyzerTraining from "./AnalyzerTraining";

export default function AnalyzerRoutes() {
  return (
    <Routes>
      {/* When visiting "/analyzer", go to "intro" */}
      <Route index element={<Navigate to="intro" replace />} />

      {/* Step 0: Intro → "/analyzer/intro" */}
      <Route path="intro" element={<AnalyzerIntro />} />

      {/* Step 1: Get info → "/analyzer/get-info" */}
      <Route path="get-info" element={<AnalyzerGetInfo />} />

      {/* Step 2: Abilities → "/analyzer/abilities" */}
      <Route path="abilities" element={<AnalyzerAbility />} />

      <Route path="job-suggestion" element={<AnalyzerJobSuggestion />} /> 
      <Route path="skill-gap" element={<AnalyzerSkillGap />} /> 
      <Route path="training" element={<AnalyzerTraining />} />

      {/* Fallback inside "/analyzer/*" */}
      <Route path="*" element={<Navigate to="intro" replace />} />
    </Routes>
  );
}
