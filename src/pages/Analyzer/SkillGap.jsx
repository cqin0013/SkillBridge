import React, { useRef, useMemo, useState, useEffect } from "react";
import StageBox from "../../components/ui/StageBox";
import HelpToggle from "../../components/ui/HelpToggle";
import PageActions from "../../components/ui/PageActions";
import GapTable from "../../components/ui/GapTable";
import { Button, message, Modal } from "antd";
import { saveRoadmap } from "../../utils/roadmapStore";
import "./Analyzer.css";

export default function SkillGap({ targetJob, unmatched, onPrev, onFinish }) {
  const [showHelp, setShowHelp] = useState(false);
  const [localUnmatched, setLocalUnmatched] = useState(unmatched || null);
  const printRef = useRef(null);

  useEffect(() => {
    if (!localUnmatched) {
      const cached = sessionStorage.getItem("sb_unmatched");
      if (cached) setLocalUnmatched(JSON.parse(cached));
    }
  }, [localUnmatched]);

  useEffect(() => {
    if (unmatched) setLocalUnmatched(unmatched);
  }, [unmatched]);

  const rows = useMemo(() => {
    let flat = localUnmatched?.unmatchedFlat;
    if (!Array.isArray(flat)) {
      flat = [];
      const add = (arr, typeLabel) =>
        (Array.isArray(arr) ? arr : []).forEach((x) =>
          flat.push({ type: typeLabel, title: x?.title, code: x?.code })
        );
      const un = localUnmatched || {};
      add(un.knowledge, "Knowledge");
      add(un.skill, "Skill");
      add(un.tech, "Tech");
    }
    return (flat || []).map((x) => ({
      name: x?.title || x?.code || "-",
      type: x?.type || "-",
      status: "miss",
    }));
  }, [localUnmatched]);

  const defaultRoadmapSteps = useMemo(
    () => rows.map((r) => ({ title: r.name, desc: r.type })),
    [rows]
  );

  const handleFinish = () => {
    if (!rows.length) {
      Modal.info({
        title: "Great match!",
        content: "You already match this job well. No learning roadmap is available.",
        okText: "OK",
        onOk: () => onFinish?.(),
      });
      return;
    }
    Modal.confirm({
      title: "Generate roadmap?",
      content:
        "Generate a learning roadmap from your unmatched abilities and add it to your Profile?",
      okText: "Yes, generate",
      cancelText: "No, thanks",
      onOk: () => {
        saveRoadmap(defaultRoadmapSteps);
        message.success("Roadmap generated and added to Profile.");
        onFinish?.();
      },
      onCancel: () => onFinish?.(),
    });
  };

  return (
    <section className="anlz-page">
      <div className="container">
        <StageBox
          pill="Step 4"
          title={`Skill Gaps for ${targetJob || "-"}`}
          tipTitle="How to use this page"
          tipContent={
            <ol style={{ margin: 0, paddingLeft: "1.1rem" }}>
              <li>Below are the abilities your selected job did <b>not</b> match.</li>
              <li>We only show <b>Not Met</b> items here (with their classification).</li>
              <li>Use <b>Export PDF</b> to download the list.</li>
            </ol>
          }
        />

        <StageBox>
          <div className="anlz-second-card">
            <div className="question-row">
              <h3 className="question-title">Unmatched abilities (Not Met)</h3>
              <HelpToggle show={showHelp} onToggle={() => setShowHelp(!showHelp)}>
                We show the ability <b>title</b> and its <b>classification</b> (Knowledge, Skill, or Tech).
              </HelpToggle>
            </div>

            {rows.length ? (
              <>
                <div ref={printRef} className="sg-print-area">
                  <GapTable rows={rows} hideMet />
                </div>
              </>
            ) : (
              <p style={{ fontStyle: "italic", color: "var(--color-muted)" }}>
                You already match this job well. No learning roadmap is available.
              </p>
            )}
          </div>
        </StageBox>

        <PageActions onPrev={onPrev} onNext={handleFinish} nextText="Finish" />
      </div>
    </section>
  );
}
