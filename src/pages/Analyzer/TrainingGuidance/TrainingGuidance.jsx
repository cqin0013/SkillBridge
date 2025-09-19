// src/pages/Analyzer/SkillGap/TrainingGuidance.jsx
// Content-only body for Step 5. Used inside TwoCardScaffold from Analyzer.jsx.

import React, { useEffect } from "react";
import SectionBox from "../../../components/ui/SectionBox/SectionBox";

// Cards (same directory)
import SkillLevelCard from "./components/SkillLevelCard/SkillLevelCard";
import TrainingGuidanceCard from "./components/TrainingGuidanceCard/TrainingGuidanceCard";

/* ---------- Exported page intro (for TwoCardScaffold header) ---------- */
export const pageIntro = {
  stepPill: "Step 5",
  title: "Training Guidance",
  introContent: (
    <div style={{ margin: 0 }}>
      Review the required skill level for your selected occupation and explore tailored training
      suggestions by location and industry. Use these insights to plan your learning roadmap.
    </div>
  ),
  actionsContent: (
    <ol style={{ margin: 0, paddingLeft: "1.1rem" }}>
      <li>Check your target occupation’s expected skill level.</li>
      <li>Review the training guidance with location/industry context.</li>
      <li>Click <b>Finish</b> to complete the flow and save your outcome.</li>
    </ol>
  ),
};

export default function TrainingGuidance({
  occupationTitle,
  anzscoCodeLike,
  addressText = "Melbourne VIC 3000",
  abilities,            // reserved for future use
  unmatched,            // reserved for future use
  onPrev,
  onFinish,             // called when user clicks Finish
  /** NEW: push actions state up to TwoCardScaffold so it renders the bottom buttons */
  setActionsProps,      // (optional) function(props) => void
}) {
  const displayOccupation = occupationTitle || anzscoCodeLike || "-";

  // Wire bottom actions (Prev / Finish) to the scaffold
  useEffect(() => {
    if (typeof setActionsProps === "function") {
      setActionsProps({
        onPrev,
        onNext: onFinish,
        nextText: "Finish",
        // 如需控制可用状态，可在此加入 nextDisabled/nextDisabledReason
        // nextDisabled: false,
        // nextDisabledReason: undefined,
      });
    }
  }, [setActionsProps, onPrev, onFinish]);

  return (
    <>
      {/* Card 1: Skill level */}
      <SectionBox variant="question" title={`Required skill level — ${displayOccupation}`}>
        <SkillLevelCard
          occupationTitle={occupationTitle}
          anzscoCodeLike={anzscoCodeLike}
        />
      </SectionBox>

      {/* Card 2: Training guidance */}
      <SectionBox variant="question" title="Training guidance">
        <TrainingGuidanceCard
          occupationTitle={occupationTitle}
          anzscoCodeLike={anzscoCodeLike}
          addressText={addressText}
        />
      </SectionBox>
    </>
  );
}
