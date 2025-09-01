// src/pages/Analyzer/AnalyzerWizard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import AnalyzerIntro from "./AnalyzerIntro/AnalyzerIntro";
import GetInfo from "./GetInfo/GetInfo";
import AbilityAnalyzer from "./AbilityAnalyzer/AbilityAnalyzer";
import JobSuggestion from "./JobSuggestion/JobSuggestion";
import SkillGap from "./SkillGap/SkillGap";

import PrevSummary from "../../components/ui/PrevSummary";
import ProgressBar from "../../components/ui/ProgressBar";
import { Modal, message } from "antd";
import "./AnalyzerWizard.css";

const TOTAL_STEPS = 5; // 0..4
const clamp = (n) =>
  Math.max(0, Math.min(TOTAL_STEPS - 1, Number.isFinite(n) ? n : 0));

function initialStepFromURL() {
  const params = new URLSearchParams(window.location.search);
  const s = parseInt(params.get("step"), 10);
  return Number.isNaN(s) ? 0 : clamp(s);
}

export default function AnalyzerWizard() {
  // ✅ 初次渲染按 URL 初始化
  const [step, setStep] = useState(() => initialStepFromURL());

  const [roles, setRoles] = useState([]);
  const [stateCode, setStateCode] = useState("All");
  const [abilities, setAbilities] = useState([]);
  const [targetJob, setTargetJob] = useState("");

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // ✅ 外部 URL 变化时，同步到内部 step
  useEffect(() => {
    const s = parseInt(searchParams.get("step"), 10);
    if (!Number.isNaN(s)) {
      const cs = clamp(s);
      setStep((prev) => (prev !== cs ? cs : prev));
    } else if (step !== 0 && !searchParams.has("step")) {
      // 若 URL 没有 step 参数且我们不在 0，就不要强制跳回 0
      // 保持内部状态，避免闪烁
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // 统一跳转：本地 step + URL 参数
  const goTo = (n) => {
    const s = clamp(n);
    setStep(s);
    if (s === 0) {
      const next = new URLSearchParams(searchParams);
      next.delete("step");
      setSearchParams(next, { replace: true });
    } else {
      const next = new URLSearchParams(searchParams);
      next.set("step", String(s));
      setSearchParams(next, { replace: true });
    }
  };

  // 离开提醒
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

  // 保存 Roadmap 的简单实现（可替换为后端 API）
  const saveRoadmap = () => {
    const payload = {
      timestamp: new Date().toISOString(),
      roles,
      stateCode,
      abilities,
      targetJob,
    };
    try {
      localStorage.setItem("sb_roadmap", JSON.stringify(payload));
    } catch {
      // 忽略存储异常
    }
    return payload;
  };

  // 完成时的确认流程
  const handleFinish = () => {
    Modal.confirm({
      title: "Generate roadmap?",
      content:
        "Do you want to generate a roadmap and save it to your Profile? If you leave now, your data will not be saved.",
      okText: "Generate Roadmap",
      cancelText: "Leave without saving",
      onOk: () => {
        const data = saveRoadmap();
        message.success("Roadmap generated and saved to your Profile.");
        // 跳到 Profile，同时带上 state（可在 Profile 里读取）
        navigate("/Profile", { state: { roadmap: data } });
      },
      onCancel: () => {
        message.info("If you leave, your data will not be saved.");
        // 清空并回到 Intro
        setRoles([]);
        setStateCode("All");
        setAbilities([]);
        setTargetJob("");
        goTo(0);
      },
    });
  };

  return (
    <div className={`analyzer-wrap ${step === 0 ? "is-intro" : ""}`}>
      {step !== 0 && <PrevSummary items={prevItems} />}
      {step !== 0 && <ProgressBar current={step} total={TOTAL_STEPS} />}

      {step === 0 && <AnalyzerIntro onStart={() => goTo(1)} />}

      {step === 1 && (
        <GetInfo
          roles={roles}
          setRoles={setRoles}
          stateCode={stateCode}
          setStateCode={setStateCode}
          onPrev={() => goTo(0)}
          onNext={() => goTo(2)}
        />
      )}

      {step === 2 && (
        <AbilityAnalyzer
          abilities={abilities}
          onPrev={() => goTo(1)}
          onNext={(a) => {
            setAbilities(a);
            goTo(3);
          }}
        />
      )}

      {step === 3 && (
        <JobSuggestion
          targetJob={targetJob}
          setTargetJob={setTargetJob}
          onPrev={() => goTo(2)}
          onNext={() => goTo(4)}
        />
      )}

      {step === 4 && (
        <SkillGap
          targetJob={targetJob}
          abilities={abilities}
          onPrev={() => goTo(3)}
          onFinish={handleFinish} 
        />
      )}
    </div>
  );
}
