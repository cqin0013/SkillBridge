// src/pages/Analyzer/SkillGap/TrainingGuidance.jsx
// Content-only body for Step 5. Used inside TwoCardScaffold from Analyzer.jsx.

import React, { useEffect } from "react";
import SectionBox from "../../../components/ui/SectionBox/SectionBox";
import SkillLevelCard from "../../../components/ui/SkillLevelCard/SkillLevelCard";
import TrainingGuidanceCard from "../../../components/ui/TrainingGuidanceCard/TrainingGuidanceCard";

/** Fallback mock advice (no advice/link/note, only basic course info) */
const MOCK_ADVICE = {
  anzsco: "411711",
  found: 0,
  items: [
    {
      tgaCode: "52909WA",
      title: "Advanced Diploma of Indigenous Pastoral Ministry",
      componentType: ["AccreditedCourse"],
    },
    {
      tgaCode: "11076NAT",
      title: "Diploma of Leadership in Disability Services",
      componentType: ["AccreditedCourse"],
    },
    {
      tgaCode: "52908WA",
      title: "Advanced Diploma of Indigenous Ministry and Lifestyle Health Promotion",
      componentType: ["AccreditedCourse"],
    },
  ],
};

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
  /** ONLY the numeric level 1–5 (defaults to 1) */
  skillLevel = 1,
  /** Optional object; if absent we try sessionStorage; if still missing we fall back to mock */
  trainingAdvice,
  onPrev,
  onFinish,
  /** Provided by TwoCardScaffold to wire the bottom actions */
  setActionsProps,
}) {
  const displayOccupation = occupationTitle || anzscoCodeLike || "-";

  // Wire bottom actions (Prev / Finish) to the scaffold
  useEffect(() => {
    if (typeof setActionsProps === "function") {
      setActionsProps({
        onPrev,
        onNext: onFinish,
        nextText: "Finish",
      });
    }
  }, [setActionsProps, onPrev, onFinish]);

  // Determine advice data: prop -> sessionStorage -> mock
  let adviceData = trainingAdvice;
  if (!adviceData) {
    try {
      const raw = sessionStorage.getItem("sb_training_advice");
      adviceData = raw ? JSON.parse(raw) : null;
    } catch {
      adviceData = null;
    }
  }
  if (!adviceData) {
    adviceData = MOCK_ADVICE;
  }

  return (
    <>
      {/* Card 1: Skill level — ONLY pass the numeric level; meaning is explained inside the card */}
      <SectionBox variant="question" title={`Required skill level — ${displayOccupation}`}>
        <SkillLevelCard
          skillLevel={skillLevel}
          occupationTitle={occupationTitle}
          anzscoCodeLike={anzscoCodeLike}
        />
      </SectionBox>

      {/* Card 2: Training guidance */}
      <SectionBox variant="question" title="Training guidance">
        <TrainingGuidanceCard
          data={adviceData}
          occupationTitle={occupationTitle}
          anzscoCodeLike={anzscoCodeLike}
          addressText={addressText}
        />
      </SectionBox>
    </>
  );
}
