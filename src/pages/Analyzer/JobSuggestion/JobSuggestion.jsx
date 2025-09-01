import React, { useState } from "react";
import StageBox from "../../../components/ui/StageBox";
import HelpToggle from "../../../components/ui/HelpToggle";
import PageActions from "../../../components/ui/PageActions";
import JobCardGrid from "../../../components/ui/JobCardGrid";
import "./JobSuggestion.css";

// 示例数据：你可替换为真实算法/接口结果
const JOBS = [
  {
    job: "Data Analyst",
    match: 86,
    details: [
      { name: "SQL", importance: 85 },
      { name: "Excel", importance: 70 },
    ],
  },
  {
    job: "BI Analyst",
    match: 80,
    details: [{ name: "PowerBI", importance: 78 }],
  },
];

export default function JobSuggestion({
  targetJob,
  setTargetJob,
  onPrev,
  onNext,
}) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <section className="jobs-page">
      <StageBox pill="Step 3" title="Job Suggestions">
        <HelpToggle
          show={showHelp}
          onToggle={() => setShowHelp(!showHelp)}
          label="Show tips"
        >
          根据你的角色与能力推荐的候选岗位，请选择一个进入能力差距分析。
        </HelpToggle>

        <JobCardGrid
          jobs={JOBS}
          targetJob={targetJob}
          onSelect={setTargetJob}
        />
      </StageBox>

      {/* 页尾按钮：靠内容末尾 */}
      <PageActions onPrev={onPrev} onNext={onNext} nextDisabled={!targetJob} />
    </section>
  );
}
