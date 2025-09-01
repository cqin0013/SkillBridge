import React, { useEffect, useMemo, useState } from "react";
import AnalyzerIntro from "./AnalyzerIntro/AnalyzerIntro";
import GetInfo from "./GetInfo/GetInfo";
import AbilityAnalyzer from "./AbilityAnalyzer/AbilityAnalyzer";
import JobSuggestion from "./JobSuggestion/JobSuggestion";
import SkillGap from "./SkillGap/SkillGap";

// ✅ 改为引入独立组件
import PrevSummary from "../../components/ui/PrevSummary";
import ProgressBar from "../../components/ui/ProgressBar";

import "./AnalyzerWizard.css";

export default function AnalyzerWizard() {
  const [step, setStep] = useState(0);
  const [roles, setRoles] = useState([]);
  const [stateCode, setStateCode] = useState("All");
  const [abilities, setAbilities] = useState([]);
  const [targetJob, setTargetJob] = useState("");

  // 是否有未保存编辑
  const hasEdits =
    roles.length ||
    abilities.length ||
    (stateCode && stateCode !== "All") ||
    targetJob;

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

  // 上一步摘要
  const prevItems = useMemo(() => {
    switch (step) {
      case 1:
        return ["Read how it works"];
      case 2:
        return [`Roles: ${roles.join(", ") || "-"}`, `Location: ${stateCode}`];
      case 3:
        return [
          `Roles: ${roles.join(", ") || "-"}`,
          `Abilities: ${abilities.length}`,
        ];
      case 4:
        return [
          `Selected job: ${targetJob || "-"}`,
          `Roles: ${roles.join(", ") || "-"}`,
        ];
      default:
        return null;
    }
  }, [step, roles, stateCode, abilities.length, targetJob]);

  return (
    <div className={`analyzer-wrap ${step === 0 ? "is-intro" : ""}`}>
      {step !== 0 && <PrevSummary items={prevItems} />}
      {step !== 0 && <ProgressBar current={step} total={5} />}

      {step === 0 && <AnalyzerIntro onStart={() => setStep(1)} />}

      {step === 1 && (
        <GetInfo
          roles={roles}
          setRoles={setRoles}
          stateCode={stateCode}
          setStateCode={setStateCode}
          onPrev={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <AbilityAnalyzer
          abilities={abilities}
          onPrev={() => setStep(1)}
          onNext={(a) => {
            setAbilities(a);
            setStep(3);
          }}
        />
      )}

      {step === 3 && (
        <JobSuggestion
          targetJob={targetJob}
          setTargetJob={setTargetJob}
          onPrev={() => setStep(2)}
          onNext={() => setStep(4)}
        />
      )}

      {step === 4 && (
        <SkillGap
          targetJob={targetJob}
          abilities={abilities}
          onPrev={() => setStep(3)}
          onFinish={() => {
            alert("分析完成 🎉");
            setStep(0);
          }}
        />
      )}
    </div>
  );
}
