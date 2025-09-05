// AnalyzerWizard.jsx
// Orchestrates the multi-step Analyzer flow:
//   Step 0: Intro
//   Step 1: GetInfo        (select past roles & work location; build abilities from roles)
//   Step 2: AbilityAnalyzer (review/add/remove abilities manually)
//   Step 3: JobSuggestion   (rank jobs by ability overlap; choose a target job)
//   Step 4: SkillGap        (show unmatched abilities and generate a roadmap)
//
// It keeps step state synced to URL (?step=n), handles session persistence for
// selected target job / unmatched list, and shows a top summary/progress bar.

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import AnalyzerIntro from "./AnalyzerIntro/AnalyzerIntro";
import GetInfo from "./GetInfo";
import AbilityAnalyzer from "./AbilityAnalyzer";
import JobSuggestion from "./JobSuggestion";
import SkillGap from "./SkillGap";

import PrevSummary from "../../components/ui/PrevSummary";
import ProgressBar from "../../components/ui/ProgressBar";
import { message } from "antd";
import "./AnalyzerWizard.css";

const TOTAL_STEPS = 5;
const clamp = (n) => Math.max(0, Math.min(TOTAL_STEPS - 1, Number.isFinite(n) ? n : 0));

/** Read initial step from URL (?step=) so refresh/deep-links are preserved. */
function initialStepFromURL() {
  const params = new URLSearchParams(window.location.search);
  const s = parseInt(params.get("step"), 10);
  return Number.isNaN(s) ? 0 : clamp(s);
}

export default function AnalyzerWizard() {
  // Overall step
  const [step, setStep] = useState(() => initialStepFromURL());

  // Cross-step data
  const [roles, setRoles] = useState([]);              // array of selected past role titles
  const [stateCode, setStateCode] = useState("All");   // AU state preference
  const [abilities, setAbilities] = useState([]);      // [{name,aType,code?}]
  const [targetJob, setTargetJob] = useState("");      // occupation_code or title
  const [unmatched, setUnmatched] = useState(null);    // { unmatchedFlat:[{type,title,code}], matchedCount, percent }

  // URL sync for `?step=`
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const s = parseInt(searchParams.get("step"), 10);
    if (!Number.isNaN(s)) {
      const cs = clamp(s);
      setStep((prev) => (prev !== cs ? cs : prev));
    }
  }, [searchParams]);

  /** Helper to navigate to a specific step and update URL param. */
  const goTo = (n) => {
    const s = clamp(n);
    setStep(s);
    const next = new URLSearchParams(searchParams);
    if (s === 0) next.delete("step");
    else next.set("step", String(s));
    setSearchParams(next, { replace: true });
  };

  // When entering Step 4, recover targetJob/unmatched from sessionStorage if needed
  useEffect(() => {
    if (step === 4) {
      if (!unmatched) {
        const cached = sessionStorage.getItem("sb_unmatched");
        if (cached) setUnmatched(JSON.parse(cached));
      }
      if (!targetJob) {
        const tj = sessionStorage.getItem("sb_targetJob");
        if (tj) setTargetJob(tj);
      }
    }
  }, [step, unmatched, targetJob]);

  // Warn the user if navigating away with edits in progress
  const hasEdits =
    roles.length || abilities.length || (stateCode && stateCode !== "All") || targetJob;

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (hasEdits) {
        e.preventDefault();
        e.returnValue = ""; // triggers the browser's native dialog
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasEdits]);

  // Build a condensed "previous summary" for the sticky header component
  const prevItems = useMemo(() => {
    switch (step) {
      case 1:
        return ["Read how it works"];
      case 2:
        return [`Roles: ${roles.join(", ") || "-"}`, `Location: ${stateCode}`];
      case 3:
        return [`Roles: ${roles.join(", ") || "-"}`];
      case 4:
        return [`Selected job: ${targetJob || "-"}`, `Roles: ${roles.join(", ") || "-"}`];
      default:
        return null;
    }
  }, [step, roles, stateCode, targetJob]);

  // Finish handler: clear everything and go back to intro
  const handleFinish = () => {
    message.success("Finished. Your selections have not been saved.");
    setRoles([]); setStateCode("All"); setAbilities([]);
    setTargetJob(""); setUnmatched(null);
    sessionStorage.removeItem("sb_unmatched");
    sessionStorage.removeItem("sb_targetJob");
    goTo(0);
  };

  return (
    <div className={`analyzer-wrap ${step === 0 ? "is-intro" : ""}`}>
      {/* Sticky previous summary + progress bar on steps 1-4 */}
      {step !== 0 && <PrevSummary items={prevItems} />}
      {step !== 0 && <ProgressBar current={step} total={TOTAL_STEPS} />}

      {/* Step 0: Intro */}
      {step === 0 && <AnalyzerIntro onStart={() => goTo(1)} />}

      {/* Step 1: Select past roles + state, build abilities */}
      {step === 1 && (
        <GetInfo
          stateCode={stateCode}
          setStateCode={setStateCode}
          onPrev={() => goTo(0)}
          onNext={(payload) => {
            // Accept from child either an array of abilities, or a structured object { abilities, roles }
            if (Array.isArray(payload)) setAbilities(payload);
            else if (payload && typeof payload === "object") {
              setAbilities(payload.abilities || []);
              setRoles(Array.isArray(payload.roles) ? payload.roles : []);
            }
            goTo(2);
          }}
        />
      )}

      {/* Step 2: Review/edit abilities */}
      {step === 2 && (
        <AbilityAnalyzer
          abilities={abilities}
          onPrev={() => goTo(1)}
          onNext={(finalAbilities) => {
            setAbilities(finalAbilities);
            goTo(3);
          }}
        />
      )}

      {/* Step 3: Suggested jobs based on abilities */}
      {step === 3 && (
        <JobSuggestion
          abilities={abilities}
          targetJob={targetJob}
          setTargetJob={setTargetJob}
          onUnmatchedChange={setUnmatched}
          onPrev={() => goTo(2)}
          onNext={() => goTo(4)}
        />
      )}

      {/* Step 4: Unmatched list + generate roadmap */}
      {step === 4 && (
        <SkillGap
          targetJob={targetJob}
          unmatched={unmatched}
          abilities={abilities}        // passed so GapTable can show "Met" if needed
          onPrev={() => goTo(3)}
          onFinish={handleFinish}
        />
      )}
    </div>
  );
}
