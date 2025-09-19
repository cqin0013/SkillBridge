// src/pages/Analyzer/SkillGap/SkillGap.jsx
// Content-only body for Step 4. Used inside TwoCardScaffold from Analyzer.jsx.

import React, { useRef, useMemo, useState, useEffect } from "react";
import HelpToggle from "../../../components/ui/HelpToggle/HelpToggle";
import SectionBox from "../../../components/ui/SectionBox/SectionBox";
import GapTable from "../../../components/ui/GapTable";
import { Typography } from "antd";

const { Paragraph } = Typography;

/* ---------- Exported page intro (for TwoCardScaffold header) ---------- */
export const pageIntro = {
  stepPill: "Step 4",
  title: "Skill Gaps",
  introContent: (
    <Paragraph style={{ margin: 0 }}>
      Compare your abilities with the target job’s requirements. Below we show the abilities that were
      <b> not matched</b> by your selected occupation.
    </Paragraph>
  ),
  actionsContent: (
    <ol style={{ margin: 0, paddingLeft: "1.1rem" }}>
      <li>Review the list of <b>Not Met</b> items grouped by classification.</li>
      <li>Use the list to plan your training in the next step.</li>
      <li>Click <b>Next</b> to generate a learning roadmap.</li>
    </ol>
  ),
};

/** 将任意形状的 unmatched 规范化为 { knowledge[], skill[], tech[], unmatchedFlat[] } */
function normalizeUnmatched(src) {
  if (!src) {
    return { knowledge: [], skill: [], tech: [], unmatchedFlat: [] };
  }
  const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
  const knowledge = arr(src.knowledge ?? src.knowledges ?? src.missingKnowledge);
  const skill = arr(src.skill ?? src.skills ?? src.missingSkills);
  const tech = arr(src.tech ?? src.techs ?? src.missingTech ?? src.technology);

  // 优先用传入的 unmatchedFlat；否则由三类拼装
  let unmatchedFlat = Array.isArray(src.unmatchedFlat) ? src.unmatchedFlat.slice() : [];
  if (!unmatchedFlat.length) {
    knowledge.forEach((x) => unmatchedFlat.push({ type: "Knowledge", title: x?.title || x?.name, code: x?.code }));
    skill.forEach((x) => unmatchedFlat.push({ type: "Skill", title: x?.title || x?.name, code: x?.code }));
    tech.forEach((x) => unmatchedFlat.push({ type: "Tech", title: x?.title || x?.name, code: x?.code }));
  }

  // 去掉空项
  unmatchedFlat = unmatchedFlat.filter((x) => (x?.title || x?.code || "").toString().trim().length > 0);

  return { knowledge, skill, tech, unmatchedFlat };
}

export default function SkillGap({
  targetJobCode,
  targetJobTitle,
  unmatched,          // { unmatchedFlat?, knowledge?, skill?, tech?, ... }
  onPrev,
  onNext,
  /** push actions state up to TwoCardScaffold so it can render PageActions */
  setActionsProps,    // (optional) function(props) => void
}) {
  const [showHelp, setShowHelp] = useState(false);
  const [localUnmatched, setLocalUnmatched] = useState(unmatched || null);
  const printRef = useRef(null);

  // 首次加载：如无 props，则尝试从 sessionStorage 读取兜底
  useEffect(() => {
    if (localUnmatched) return;
    try {
      const cached = sessionStorage.getItem("sb_unmatched");
      if (cached) {
        setLocalUnmatched(JSON.parse(cached));
      }
    } catch {
      /* noop */
    }
  }, [localUnmatched]);

  // props 变化 -> 同步到本地
  useEffect(() => {
    if (unmatched) setLocalUnmatched(unmatched);
  }, [unmatched]);

  // 规范化 rows（仅 Not Met）
  const normalized = useMemo(() => normalizeUnmatched(localUnmatched), [localUnmatched]);

  const rows = useMemo(
    () =>
      (normalized.unmatchedFlat || []).map((x) => ({
        name: x?.title || x?.code || "-",
        type: x?.type || "-",
        status: "miss",
      })),
    [normalized.unmatchedFlat]
  );

  // 将规范化的缺失项持久化（供 Finish/生成 Roadmap 使用）
  useEffect(() => {
    try {
      sessionStorage.setItem(
        "sb_unmatched",
        JSON.stringify({
          knowledge: normalized.knowledge,
          skill: normalized.skill,
          tech: normalized.tech,
          unmatchedFlat: normalized.unmatchedFlat,
          updatedAt: Date.now(),
        })
      );
      // 同页联动通知
      window.dispatchEvent(
        new CustomEvent("sb:unmatched:update", { detail: { unmatched: normalized } })
      );
    } catch {
      /* noop */
    }
  }, [normalized.knowledge, normalized.skill, normalized.tech, normalized.unmatchedFlat]);

  const displayOccupation = targetJobTitle || targetJobCode || "-";

  // 将页面动作接给 Scaffold
  useEffect(() => {
    if (typeof setActionsProps === "function") {
      setActionsProps({
        onPrev,
        onNext,
        nextText: "Next",
        // 如果希望没有缺口时禁止下一步，可打开以下两行：
        // nextDisabled: rows.length === 0,
        // nextDisabledReason: rows.length === 0 ? "No gaps to plan for." : undefined,
      });
    }
  }, [setActionsProps, onPrev, onNext, rows.length]);

  // UI（内容区）
  return (
    <>
      <SectionBox
        variant="question"
        title={`Unmatched abilities (Not Met) — ${displayOccupation}`}
        extra={
          <HelpToggle show={showHelp} onToggle={() => setShowHelp((v) => !v)}>
            We list the ability <b>title</b> and its <b>classification</b> (Knowledge, Skill, or Tech).
          </HelpToggle>
        }
      >
        {rows.length ? (
          <div ref={printRef} className="sg-print-area">
            <GapTable rows={rows} hideMet />
          </div>
        ) : (
          <p style={{ fontStyle: "italic", color: "var(--color-muted, #6b7280)", margin: 0 }}>
            You already match this job well.
          </p>
        )}
      </SectionBox>
    </>
  );
}
