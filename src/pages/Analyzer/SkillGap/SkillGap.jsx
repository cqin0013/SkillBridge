import React, { useRef, useState } from "react";
import StageBox from "../../../components/ui/StageBox";
import HelpToggle from "../../../components/ui/HelpToggle";
import PageActions from "../../../components/ui/PageActions";
import GapTable from "../../../components/ui/GapTable";
import { Button, message } from "antd";           // ✅ 确保已安装 antd
import { exportNodeToPdf } from "../../../utils/exportPDF"; // ✅ 第2步里的工具
import "./SkillGap.css";

// Example rows: should be generated dynamically from targetJob + abilities
const MOCK_ROWS = [
  { name: "SQL", jobImportance: 90, covered: true },
  { name: "Python", jobImportance: 85, covered: false },
  { name: "PowerBI", jobImportance: 70, covered: true },
];

export default function SkillGap({ targetJob, onPrev, onFinish }) {
  const [showHelp, setShowHelp] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef(null);

  const handleExportPdf = async () => {
    try {
      setDownloading(true);
      await exportNodeToPdf(
        printRef.current,
        `SkillGap_${targetJob || "Unknown"}.pdf`
      );
      message.success("PDF exported.");
    } catch (e) {
      console.error(e);
      message.error("Failed to export PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="sg-page">
      <StageBox pill="Step 4" title={`Skill Gaps for ${targetJob || "-"}`}>
        {/* 标题 + 问号 */}
        <h3>
          Skills you need to improve
          <HelpToggle show={showHelp} onToggle={() => setShowHelp(!showHelp)}>
            Focus on filling gaps where skills are both <b>not covered</b> and have
            <b> high importance</b> (e.g., above 80/100).
          </HelpToggle>
        </h3>

        {/* ✅ 顶部工具条：右上角始终可见 */}
        <div className="sg-toolbar">
          <Button onClick={handleExportPdf} loading={downloading} size="middle">
            Export PDF
          </Button>
        </div>

        {/* 导出的区域 */}
        <div ref={printRef} className="sg-print-area">
          <GapTable rows={MOCK_ROWS} />
        </div>
      </StageBox>

      {/* 底部翻页按钮 */}
      <PageActions onPrev={onPrev} finish={onFinish} />
    </section>
  );
}
