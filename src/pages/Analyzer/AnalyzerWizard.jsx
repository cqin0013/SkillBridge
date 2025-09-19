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
import { saveRoadmap } from "../../utils/roadmapStore";

const TOTAL_STEPS = 6;
const clamp = (n) => Math.max(0, Math.min(TOTAL_STEPS - 1, Number.isFinite(n) ? n : 0));

export default function AnalyzerWizard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const s = parseInt(searchParams.get("step"), 10);
    if (!Number.isNaN(s)) setStep(clamp(s));
  }, [searchParams]);

  const goTo = (n) => {
    const s = clamp(n);
    setStep(s);
    const next = new URLSearchParams(searchParams);
    if (s === 0) next.delete("step"); else next.set("step", String(s));
    setSearchParams(next, { replace: true });
  };

  // Cross-step state
  const [roles, setRoles] = useState([]);
  const [stateCode, setStateCode] = useState("All");
  const [abilities, setAbilities] = useState([]);
  const [selectedIndustryIds, setSelectedIndustryIds] = useState([]);
  const [targetJobCode, setTargetJobCode] = useState("");
  const [targetJobTitle, setTargetJobTitle] = useState("");
  const [unmatched, setUnmatched] = useState(null);  // SkillGap 的缺失项

  // Industry id -> name map
  const industryNameMap = useMemo(() => {
    const m = new Map();
    (INDUSTRY_OPTIONS || []).forEach((o) => m.set(o.id, o.name));
    return m;
  }, []);
  const selectedIndustryNames = useMemo(
    () => (selectedIndustryIds || []).map((id) => industryNameMap.get(id) || id),
    [selectedIndustryIds, industryNameMap]
  );

  // 左侧摘要
  const leftSidebar =
    step !== 0 ? (
      <PrevSummary
        pillText="Your info"
        roles={(roles || []).map((r) => r?.title || r?.name || r?.code || String(r))}
        locationLabel={stateCode}
        industries={selectedIndustryNames}
        abilitiesCount={abilities.length}
        targetJobTitle={targetJobTitle}
        targetJobCode={targetJobCode}
      />
    ) : null;

  const progress = <ProgressBar current={step} total={TOTAL_STEPS} debug={false} />;

  /** —— 将 Profile 需要的摘要写入会话存储 —— */
  useEffect(() => {
    const payload = {
      roles: (roles || []).map((r) => r?.title || r?.name || r?.code || String(r)),
      stateCode,
      industryIds: selectedIndustryIds || [],
      targetJobCode,
      targetJobTitle,
      abilitiesCount: abilities?.length || 0,
    };
    try { sessionStorage.setItem("sb_profile_prev", JSON.stringify(payload)); } catch {}
  }, [
    JSON.stringify((roles || []).map((r) => r?.title || r?.name || r?.code || String(r))),
    stateCode,
    JSON.stringify(selectedIndustryIds || []),
    targetJobCode,
    targetJobTitle,
    abilities.length,
  ]);

  /** —— 缺失项兜底持久化（SkillGap 也会写，这里再兜一层） —— */
  useEffect(() => {
    try {
      if (unmatched) sessionStorage.setItem("sb_unmatched", JSON.stringify(unmatched));
    } catch {}
  }, [JSON.stringify(unmatched || {})]);

  /** 读取缺失项：优先内存，兜底 sessionStorage */
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

  /**
   * 把「缺失的能力」转换为 Roadmap steps（数组）。
   * 只传 unmatched ability，不附加任何“Target: …”之类的额外步骤。
   * step 结构与 Roadmap 组件/编辑器兼容：{ title, desc? }
   */
  const buildRoadmapStepsFromGaps = (gapObj) => {
    if (!gapObj) return [];

    // 直接优先用 flat 列表；否则从三类拼
    let flat = Array.isArray(gapObj.unmatchedFlat) ? gapObj.unmatchedFlat.slice() : null;

    const asArr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
    if (!flat || flat.length === 0) {
      const knowledge = asArr(gapObj.knowledge ?? gapObj.knowledges ?? gapObj.missingKnowledge);
      const skill     = asArr(gapObj.skill     ?? gapObj.skills     ?? gapObj.missingSkills);
      const tech      = asArr(gapObj.tech      ?? gapObj.techs      ?? gapObj.missingTech ?? gapObj.technology);

      flat = [];
      knowledge.forEach((x) => flat.push({ type: "Knowledge", title: x?.title || x?.name, code: x?.code }));
      skill.forEach((x)     => flat.push({ type: "Skill",     title: x?.title || x?.name, code: x?.code }));
      tech.forEach((x)      => flat.push({ type: "Tech",      title: x?.title || x?.name, code: x?.code }));
    }

    // 归一化为 steps：标题=能力名/代码；desc=分类
    let steps = (flat || [])
      .map((x) => ({
        title: (x?.title || x?.code || "").toString().trim(),
        desc: (x?.type || "").toString().trim() || undefined,
      }))
      .filter((s) => s.title.length > 0);

    // 去重（按 title + desc）
    const seen = new Set();
    steps = steps.filter((s) => {
      const key = `${s.title}__${s.desc || ""}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return steps;
  };

  /** Finish：只把 unmatched ability 生成到 Roadmap（数组），不包含目标职位名 */
  const handleFinish = () => {
    Modal.confirm({
      title: "Generate a learning roadmap?",
      content: "Generate a roadmap from your missing abilities and save it to Profile.",
      okText: "Yes, generate",
      cancelText: "No, just finish",
      onOk: () => {
        const gaps = readUnmatched();
        const steps = buildRoadmapStepsFromGaps(gaps); // 只包含缺失能力
        saveRoadmap(steps);                            // 注意：saveRoadmap 接收「数组」
        Modal.success({ title: "Roadmap generated", content: "Saved to Profile." });
        goTo(0);
      },
      onCancel: () => {
        Modal.success({ title: "Done", content: "You’ve finished the analyzer." });
        goTo(0);
      },
    });
  };

  // 控制 Step 3 的底部按钮（初始：Next 禁用）
  const [actionsStep3, setActionsStep3] = useState({
    onPrev: () => goTo(2),
    onNext: () => goTo(4),
    nextDisabled: true,
    nextDisabledReason: "Please select a job card to continue.",
  });

  return (
    <>
      {/* Step 0 */}
      {step === 0 && <AnalyzerIntro onStart={() => goTo(1)} />}

      {/* Step 1 */}
      {step === 1 && (
        <GetInfo
          step={step}
          totalSteps={TOTAL_STEPS}
          leftSidebar={leftSidebar}
          stateCode={stateCode}
          setStateCode={setStateCode}
          selectedIndustryIds={selectedIndustryIds}
          setSelectedIndustryIds={setSelectedIndustryIds}
          setAbilities={setAbilities}
          setRoles={setRoles}
          onPrev={() => goTo(0)}
          onNext={() => goTo(2)}
          progressBar={progress}
        />
      )}

      {/* Step 2 */}
      {step === 2 && (
        <TwoCardScaffold
          progressBar={progress}
          stepPill="Step 2"
          title="Analyze your abilities"
          introContent={<div>We will organize and deduplicate your abilities.</div>}
          actionsContent={<div>You can merge / remove abilities, then continue.</div>}
          leftSidebar={leftSidebar}
          leftOffsetTop={72}
          maxWidth="xl"
          actionsProps={{ onPrev: () => goTo(1), onNext: () => goTo(3) }}
        >
          <AbilityAnalyzer
            abilities={abilities}
            onPrev={() => goTo(1)}
            onNext={(finalAbilities) => { setAbilities(finalAbilities); goTo(3); }}
          />
        </TwoCardScaffold>
      )}

      {/* Step 3 */}
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
          // ✅ 不再写死；交给 actionsStep3（由子组件 JobSuggestion 动态更新）
          actionsProps={actionsStep3}
        >
          <JobSuggestion
            abilities={abilities}
            selectedIndustryIds={selectedIndustryIds}
            targetJob={targetJobCode}
            setTargetJob={(code, title) => {
              setTargetJobCode(code || "");
              setTargetJobTitle(title || "");
            }}
            onUnmatchedChange={setUnmatched}
            onPrev={() => goTo(2)}
            onNext={() => goTo(4)}
            // ✅ 把 setter 传下去，让子组件能控制 Next 禁用与文案
            setActionsProps={setActionsStep3}
          />
        </TwoCardScaffold>
      )}


      {/* Step 4 */}
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

      {/* Step 5 */}
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
            occupationTitle={targetJobTitle}
            anzscoCodeLike={targetJobCode}
            addressText={stateCode}
            abilities={abilities}
            unmatched={unmatched} 
            onPrev={() => goTo(4)}
            onFinish={handleFinish}
          />
        </TwoCardScaffold>
      )}
    </>
  );
}
