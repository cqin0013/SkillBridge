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
        {/* 标题 + 问号图标 */}
        <h3>
          Recommended jobs for you
          <HelpToggle
            show={showHelp}
            onToggle={() => setShowHelp(!showHelp)}
          >
            These are suggested roles based on your selected experience and
            abilities. Please choose one to proceed with skill gap analysis.
          </HelpToggle>
        </h3>

        <JobCardGrid
          jobs={JOBS}
          targetJob={targetJob}
          onSelect={setTargetJob}
        />
      </StageBox>

      {/* 页尾按钮 */}
      <PageActions onPrev={onPrev} onNext={onNext} nextDisabled={!targetJob} />
    </section>
  );
}
