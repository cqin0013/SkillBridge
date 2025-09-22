// /src/pages/analyzer/AnalyzerWizard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Modal } from "antd";

import { TwoCardScaffold } from "./Analyzer";
import PrevSummary from "../../components/ui/PrevSummary/PrevSummary";
import ProgressBar from "../../components/ui/ProgressBar/ProgressBar";

import AnalyzerIntro from "./AnalyzerIntro/AnalyzerIntro";
import GetInfo from "./GetInfo/GetInfo";
import AbilityAnalyzer from "./AbilityAnalyzer/AbilityAnalyzer";
import JobSuggestion from "./JobSuggestion/JobSuggestion";
import SkillGap from "./SkillGap/SkillGap";
import TrainingGuidance from "./TrainingGuidance/TrainingGuidance";

import { INDUSTRY_OPTIONS } from "../../lib/constants/industries";
import { setCache } from "../../utils/cache";

/** Total number of steps in the wizard */
const TOTAL_STEPS = 6;
/** Keep step within valid range */
const clamp = (n) =>
  Math.max(0, Math.min(TOTAL_STEPS - 1, Number.isFinite(n) ? n : 0));

export default function AnalyzerWizard() {
  /* ---------------- URL step sync ---------------- */
  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStep] = useState(0);

  // Read ?step= from the URL and sync local state
  useEffect(() => {
    const s = parseInt(searchParams.get("step"), 10);
    if (!Number.isNaN(s)) setStep(clamp(s));
  }, [searchParams]);

  // Navigate to a step and update ?step= in the URL
  const goTo = (n) => {
    const s = clamp(n);
    setStep(s);
    const next = new URLSearchParams(searchParams);
    if (s === 0) next.delete("step");
    else next.set("step", String(s));
    setSearchParams(next, { replace: true });
  };

  /* ---------------- Cross-step states ---------------- */
  const [roles, setRoles] = useState([]); // Past roles
  const [excludedOccupationCodes, setExcludedOccupationCodes] = useState([]);
  const [stateCode, setStateCode] = useState("All"); // Preferred location (state)
  const [abilities, setAbilities] = useState([]); // User’s curated abilities (Step 2)
  const [selectedIndustryIds, setSelectedIndustryIds] = useState([]); // User’s selected industries
  const [targetJobCode, setTargetJobCode] = useState(""); // Chosen job code (Step 3)
  const [targetJobTitle, setTargetJobTitle] = useState(""); // Chosen job title (Step 3)
  const [unmatched, setUnmatched] = useState(null); // Unmatched abilities from Step 3

  /* ---------------- Helpers for industry names ---------------- */
  // Build id -> name map once
  const industryNameMap = useMemo(() => {
    const m = new Map();
    (INDUSTRY_OPTIONS || []).forEach((o) => m.set(o.id, o.name));
    return m;
  }, []);
  // Convert selected ids to readable names
  const selectedIndustryNames = useMemo(
    () => (selectedIndustryIds || []).map((id) => industryNameMap.get(id) || id),
    [selectedIndustryIds, industryNameMap]
  );

  /* ---------------- Left sidebar + progress ---------------- */
  const leftSidebar =
    step !== 0 ? (
      <PrevSummary
        pillText="Your info"
        roles={(roles || []).map(
          (r) => r?.title || r?.name || r?.code || String(r)
        )}
        locationLabel={stateCode}
        industries={selectedIndustryNames}
        abilitiesCount={abilities.length}
        targetJobTitle={targetJobTitle}
        targetJobCode={targetJobCode}
      />
    ) : null;

  const progress = <ProgressBar current={step} total={TOTAL_STEPS} debug={false} />;

  /* ---------------- Persist a small profile snapshot for quick resume ---------------- */
  useEffect(() => {
    const payload = {
      roles: (roles || []).map(
        (r) => r?.title || r?.name || r?.code || String(r)
      ),
      stateCode,
      industryIds: selectedIndustryIds || [],
      targetJobCode,
      targetJobTitle,
      abilitiesCount: abilities?.length || 0,
      selectedOccupationCodes: excludedOccupationCodes || [],
    };
    try {
      sessionStorage.setItem("sb_profile_prev", JSON.stringify(payload));
    } catch {}
  }, [
    JSON.stringify(
      (roles || []).map((r) => r?.title || r?.name || r?.code || String(r))
    ),
    stateCode,
    JSON.stringify(selectedIndustryIds || []),
    JSON.stringify(excludedOccupationCodes || []),
    targetJobCode,
    targetJobTitle,
    abilities.length,
  ]);

  /* ---------------- Persist unmatched as a fallback for Step 5 ---------------- */
  useEffect(() => {
    try {
      if (unmatched) sessionStorage.setItem("sb_unmatched", JSON.stringify(unmatched));
    } catch {}
  }, [JSON.stringify(unmatched || {})]);

  /* ---------------- Read unmatched helper ---------------- */
  const readUnmatched = () => {
    let g = unmatched;
    if (!g) {
      try {
        const raw = sessionStorage.getItem("sb_unmatched");
        if (raw) g = JSON.parse(raw);
      } catch {}
    }
    return g || null;
  };

  /* ---------------- Convert gaps -> roadmap steps (for Step 5) ---------------- */
  const buildRoadmapStepsFromGaps = (gapObj) => {
    if (!gapObj) return [];

    // Prefer a flat list if present
    let flat = Array.isArray(gapObj.unmatchedFlat)
      ? gapObj.unmatchedFlat.slice()
      : null;

    // If not, rebuild from grouped fields
    const asArr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
    if (!flat || flat.length === 0) {
      const knowledge = asArr(
        gapObj.knowledge ?? gapObj.knowledges ?? gapObj.missingKnowledge
      );
      const skill = asArr(gapObj.skill ?? gapObj.skills ?? gapObj.missingSkills);
      const tech = asArr(
        gapObj.tech ?? gapObj.techs ?? gapObj.missingTech ?? gapObj.technology
      );

      flat = [];
      knowledge.forEach((x) =>
        flat.push({ type: "Knowledge", title: x?.title || x?.name, code: x?.code })
      );
      skill.forEach((x) =>
        flat.push({ type: "Skill", title: x?.title || x?.name, code: x?.code })
      );
      tech.forEach((x) =>
        flat.push({ type: "Tech", title: x?.title || x?.name, code: x?.code })
      );
    }

    // Normalize to roadmap steps
    let steps = (flat || [])
      .map((x) => ({
        title: (x?.title || x?.code || "").toString().trim(),
        desc: (x?.type || "").toString().trim() || undefined,
      }))
      .filter((s) => s.title.length > 0);

    // Deduplicate by (title + desc)
    const seen = new Set();
    steps = steps.filter((s) => {
      const key = `${s.title}__${s.desc || ""}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return steps;
  };

  /* ---------------- Step 5: confirm & generate roadmap ---------------- */
  const handleFinish = () => {
    Modal.confirm({
      title: "Generate a learning roadmap?",
      content:
        "Generate a roadmap from your missing abilities and save it to Profile.",
      okText: "Yes, generate",
      cancelText: "No, just finish",
      onOk: () => {
        const gaps = readUnmatched();
        const steps = buildRoadmapStepsFromGaps(gaps);
        setCache("roadmap", { steps, updatedAt: Date.now() });
        Modal.success({ title: "Roadmap generated", content: "Saved to Profile." });
        goTo(0);
      },
      onCancel: () => {
        Modal.success({ title: "Done", content: "You’ve finished the analyzer." });
        goTo(0);
      },
    });
  };

  /* ---------------- Step 3: allow child to control Next disabled state ---------------- */
  const [actionsStep3, setActionsStep3] = useState({
    onPrev: () => goTo(2),
    onNext: () => goTo(4),
    nextDisabled: true,
    nextDisabledReason: "Please select a job card to continue.",
  });

  /* ---------------- Render steps ---------------- */
  return (
    <>
      {/* Step 0: Intro */}
      {step === 0 && <AnalyzerIntro onStart={() => goTo(1)} />}

      {/* Step 1: Collect info */}
      {step === 1 && (
        <GetInfo
          step={step}
          totalSteps={TOTAL_STEPS}
          leftSidebar={leftSidebar}
          stateCode={stateCode}
          setStateCode={setStateCode}
          selectedIndustryIds={selectedIndustryIds}
          excludedOccupationCodes={excludedOccupationCodes}
          setSelectedIndustryIds={setSelectedIndustryIds}
          setAbilities={setAbilities}
          setRoles={setRoles}
          onChosenChange={setExcludedOccupationCodes}
          onPrev={() => goTo(0)}
          onNext={() => goTo(2)}
          progressBar={progress}
        />
      )}

      {/* Step 2: Ability analyzer */}
      {step === 2 && (
        <TwoCardScaffold
          progressBar={progress}
          stepPill="Step 2"
          title="Analyze your abilities"
          introContent={
            <div>
              We will organize important abilities based on your past occupation and self check.
            </div>
          }
          actionsContent={<div>You can merge / remove abilities, then continue.</div>}
          leftSidebar={leftSidebar}
          leftOffsetTop={72}
          maxWidth="xl"
          actionsProps={{ onPrev: () => goTo(1), onNext: () => goTo(3) }}
        >
          <AbilityAnalyzer
            abilities={abilities}
            // Live updates: anytime user adds/removes abilities, update state immediately
            onAbilitiesChange={setAbilities}
            onPrev={() => goTo(1)}
            onNext={(finalAbilities) => {
              setAbilities(finalAbilities); // also set on “Next” for safety
              goTo(3);
            }}
          />
        </TwoCardScaffold>
      )}

      {/* Step 3: Job suggestion */}
      {step === 3 && (
        <TwoCardScaffold
          progressBar={progress}
          stepPill="Step 3"
          title="Suggested jobs"
          introContent={<div>Pick the target job you want to compare against.</div>}
          actionsContent={<div>Choose a target job to see matching and gaps.</div>}
          leftSidebar={leftSidebar}
          leftOffsetTop={72}
          maxWidth="xl"
          actionsProps={actionsStep3}
        >
          <JobSuggestion
            abilities={abilities} // latest abilities (live from Step 2)
            selectedIndustryIds={selectedIndustryIds}
            targetJob={targetJobCode}
            setTargetJob={(code, title) => {
              setTargetJobCode(code || "");
              setTargetJobTitle(title || "");
            }}
            onUnmatchedChange={setUnmatched}
            onPrev={() => goTo(2)}
            onNext={() => goTo(4)}
            setActionsProps={setActionsStep3} // let child enable/disable Next
          />
        </TwoCardScaffold>
      )}

      {/* Step 4: Skill gap */}
      {step === 4 && (
        <TwoCardScaffold
          progressBar={progress}
          stepPill="Step 4"
          title="Skill gaps"
          introContent={<div>Compare your abilities to the target job’s requirements.</div>}
          actionsContent={<div>Review unmatched items and plan your learning path.</div>}
          leftSidebar={leftSidebar}
          leftOffsetTop={72}
          maxWidth="xl"
          actionsProps={{ onPrev: () => goTo(3), onNext: () => goTo(5) }}
        >
          <SkillGap
            targetJobCode={targetJobCode}
            targetJobTitle={targetJobTitle}
            unmatched={unmatched}
            onPrev={() => goTo(3)}
            onNext={() => goTo(5)}
          />
        </TwoCardScaffold>
      )}

      {/* Step 5: Training guidance */}
      {step === 5 && (
        <TwoCardScaffold
          progressBar={progress}
          stepPill="Step 5"
          title="Training guidance"
          introContent={<div>Generate a learning roadmap from your gaps.</div>}
          actionsContent={<div>Confirm and save the roadmap to your profile.</div>}
          leftSidebar={leftSidebar}
          leftOffsetTop={72}
          maxWidth="xl"
          actionsProps={{ onPrev: () => goTo(4), onNext: handleFinish, nextText: "Finish" }}
        >
          <TrainingGuidance
            targetJobTitle={targetJobTitle}
            targetJobCode={targetJobCode}
            skillLevel={null}
            onPrev={() => goTo(4)}
            onNext={handleFinish}
          />
        </TwoCardScaffold>
      )}
    </>
  );
}
