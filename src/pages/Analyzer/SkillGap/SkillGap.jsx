import React, { useState } from "react";
import StageBox from "../../../components/ui/StageBox";
import HelpToggle from "../../../components/ui/HelpToggle";
import PageActions from "../../../components/ui/PageActions";
import GapTable from "../../../components/ui/GapTable";
import "./SkillGap.css";

// 示例：可根据 targetJob + abilities 动态生成
const MOCK_ROWS = [
  { name: "SQL", jobImportance: 90, covered: true },
  { name: "Python", jobImportance: 85, covered: false },
  { name: "PowerBI", jobImportance: 70, covered: true },
];

export default function SkillGap({ targetJob,  onPrev, onFinish }) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <section className="sg-page">
      <StageBox pill="Step 4" title={`Skill Gaps for ${targetJob || "-"}`}>
        <HelpToggle
          show={showHelp}
          onToggle={() => setShowHelp(!showHelp)}
          label="Show tips"
        >
          优先补齐“未覆盖”且“重要度高”的能力（例如 &gt;80/100）。
        </HelpToggle>

        <GapTable rows={MOCK_ROWS} />
      </StageBox>

      {/* 页尾按钮：靠内容末尾（Finish） */}
      <PageActions onPrev={onPrev} finish={onFinish} />
    </section>
  );
}
