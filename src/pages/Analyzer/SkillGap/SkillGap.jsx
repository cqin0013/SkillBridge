// src/pages/Analyzer/SkillGap/SkillGap.jsx
import React, { useRef, useMemo, useState } from "react";
import StageBox from "../../../components/ui/StageBox";
import HelpToggle from "../../../components/ui/HelpToggle";
import PageActions from "../../../components/ui/PageActions";
import GapTable from "../../../components/ui/GapTable";
import Tip from "../../../components/ui/Tip";
import { Button, message } from "antd";
import { exportNodeToPdf } from "../../../utils/exportPDF";
import "../Analyzer.css";

/**
 * Props:
 * - targetJob: string
 * - unmatched: {
 *     knowledge?: {code:string,title:string}[],
 *     skill?: {code:string,title:string}[],
 *     tech?: {code:string,title:string}[],
 *     matchedCount?: number,
 *     percent?: number
 *   }
 */
export default function SkillGap({ targetJob, unmatched, onPrev, onFinish }) {
  const [showHelp, setShowHelp] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef(null);

  // 直接把 title 放到表格
  const rows = useMemo(() => {
    const toRows = (arr = []) => arr.map((x) => ({ name: x.title || x.code || "-", status: "miss" }));
    return [...toRows(unmatched?.knowledge), ...toRows(unmatched?.skill), ...toRows(unmatched?.tech)];
  }, [unmatched]);

  const handleExportPdf = async () => {
    try {
      setDownloading(true);
      await exportNodeToPdf(printRef.current, `SkillGap_${targetJob || "Unknown"}.pdf`);
      message.success("PDF exported.");
    } catch (e) {
      console.error(e);
      message.error("Failed to export PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="anlz-page">
      <div className="container">
        {/* 上卡片：说明 */}
        <StageBox pill="Step 4" title={`Skill Gaps for ${targetJob || "-"}`}>
          <Tip title="How to use this page" defaultOpen={true}>
            <ol style={{ margin: 0, paddingLeft: "1.1rem" }}>
              <li>These are the abilities your selected job did <b>not</b> match in the previous step.</li>
              <li>Each row is a <b>Missing</b> skill/knowledge. Prioritize them first.</li>
              <li>Use <b>Export PDF</b> to download the list and plan your learning.</li>
            </ol>
          </Tip>
        </StageBox>

        {/* 下卡片：问题 + 帮助 + 导出 + 表格 */}
        <StageBox>
          <div className="anlz-second-card">
            <div className="question-row">
              <h3 className="question-title">Skills you need to improve</h3>
              <HelpToggle show={showHelp} onToggle={() => setShowHelp(!showHelp)}>
                We list the abilities returned by the last step’s <i>unmatched</i> result. All are marked as
                <b> Missing</b> by default.
              </HelpToggle>
            </div>

            <div className="sg-toolbar">
              <Button onClick={handleExportPdf} loading={downloading} size="middle">
                Export PDF
              </Button>
            </div>

            <div ref={printRef} className="sg-print-area">
              <GapTable rows={rows} />
            </div>
          </div>
        </StageBox>

        <PageActions onPrev={onPrev} finish={onFinish} />
      </div>
    </section>
  );
}
