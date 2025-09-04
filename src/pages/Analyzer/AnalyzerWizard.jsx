// src/pages/Analyzer/AnalyzerWizard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import AnalyzerIntro from "./AnalyzerIntro/AnalyzerIntro";
import GetInfo from "./GetInfo/GetInfo";
import AbilityAnalyzer from "./AbilityAnalyzer/AbilityAnalyzer";
import JobSuggestion from "./JobSuggestion/JobSuggestion";
import SkillGap from "./SkillGap/SkillGap";

import PrevSummary from "../../components/ui/PrevSummary";
import ProgressBar from "../../components/ui/ProgressBar";
import { message } from "antd";
import "./AnalyzerWizard.css";

const TOTAL_STEPS = 5;
const clamp = (n) => Math.max(0, Math.min(TOTAL_STEPS - 1, Number.isFinite(n) ? n : 0));

function initialStepFromURL() {
  const params = new URLSearchParams(window.location.search);
  const s = parseInt(params.get("step"), 10);
  return Number.isNaN(s) ? 0 : clamp(s);
}

export default function AnalyzerWizard() {
  const [step, setStep] = useState(() => initialStepFromURL());

  const [roles, setRoles] = useState([]);
  const [stateCode, setStateCode] = useState("All");
  const [abilities, setAbilities] = useState([]);
  const [targetJob, setTargetJob] = useState("");
  const [unmatched, setUnmatched] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const s = parseInt(searchParams.get("step"), 10);
    if (!Number.isNaN(s)) {
      const cs = clamp(s);
      setStep((prev) => (prev !== cs ? cs : prev));
    }
  }, [searchParams]);

  const goTo = (n) => {
    const s = clamp(n);
    setStep(s);
    const next = new URLSearchParams(searchParams);
    if (s === 0) next.delete("step");
    else next.set("step", String(s));
    setSearchParams(next, { replace: true });
  };

  const hasEdits = roles.length || abilities.length || (stateCode && stateCode !== "All") || targetJob;
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (hasEdits) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasEdits]);

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

  const handleFinish = () => {
    message.success("Finished. Your selections have not been saved.");
    setRoles([]);
    setStateCode("All");
    setAbilities([]);
    setTargetJob("");
    setUnmatched(null);
    goTo(0);
  };

  return (
    <div className={`analyzer-wrap ${step === 0 ? "is-intro" : ""}`}>
      {step !== 0 && <PrevSummary items={prevItems} />}
      {step !== 0 && <ProgressBar current={step} total={TOTAL_STEPS} />}

      {step === 0 && <AnalyzerIntro onStart={() => goTo(1)} />}

      {step === 1 && (
        <GetInfo
          stateCode={stateCode}
          setStateCode={setStateCode}
          onPrev={() => goTo(0)}
          onNext={(payload) => {
            // 兼容：可传数组或 {abilities, roles}
            if (Array.isArray(payload)) {
              setAbilities(payload);
            } else if (payload && typeof payload === "object") {
              setAbilities(payload.abilities || []);
              setRoles(Array.isArray(payload.roles) ? payload.roles : []);
            }
            goTo(2);
          }}
        />
      )}

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

      {step === 3 && (
        <JobSuggestion
          abilities={abilities}
          targetJob={targetJob}
          setTargetJob={setTargetJob}
          onUnmatchedChange={setUnmatched} // ⬅️ 直接存
          onPrev={() => goTo(2)}
          onNext={() => goTo(4)}
        />
      )}

      {step === 4 && (
        <SkillGap
          targetJob={targetJob}
          unmatched={unmatched} // ⬅️ 传给 SkillGap
          onPrev={() => goTo(3)}
          onFinish={handleFinish}
        />
      )}
    </div>
  );
}
