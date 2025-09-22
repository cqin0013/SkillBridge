// src/pages/Analyzer/SkillGap/SkillGap.jsx
// Step 4: Show ability gaps (Not Met). Robustly normalizes data from props/session/API.
// English comments explain logic; UI texts remain concise.

import { useRef, useMemo, useState, useEffect } from "react";
import HelpToggle from "../../../components/ui/HelpToggle/HelpToggle";
import SectionBox from "../../../components/ui/SectionBox/SectionBox";
import GapTable from "../../../components/ui/GapTable";
import { Typography } from "antd";
import { suggestJobs } from "../../../lib/api/JobSuggestionApi";

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

/** Treat value as array; if object present, wrap; falsy => [] */
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

/** Normalize unmatched payload into a consistent grouped/flat shape (more tolerant). */
function normalizeUnmatched(src) {
  if (!src || typeof src !== "object") {
    return { knowledge: [], skill: [], tech: [], unmatchedFlat: [] };
  }

  // Accept more aliases commonly seen in payloads or caches
  const knowledge = arr(
    src.knowledge ?? src.knowledges ?? src.missingKnowledge ?? src.Knowledge
  );
  const skill = arr(
    src.skill ?? src.skills ?? src.missingSkills ?? src.Skill ?? src.Skills
  );
  const tech = arr(
    src.tech ?? src.techs ?? src.missingTech ?? src.technology ?? src.technologies ?? src.Tech
  );

  // Prefer a provided flat list, else try other common container keys, else rebuild from groups
  let unmatchedFlat =
    (Array.isArray(src.unmatchedFlat) && src.unmatchedFlat.slice()) ||
    (Array.isArray(src.unmatched) && src.unmatched.slice()) ||
    (Array.isArray(src.unmatched_items) && src.unmatched_items.slice()) ||
    (Array.isArray(src.items) && src.items.slice()) ||
    [];

  if (!unmatchedFlat.length) {
    knowledge.forEach((x) =>
      unmatchedFlat.push({ type: "Knowledge", title: x?.title || x?.name, code: x?.code })
    );
    skill.forEach((x) =>
      unmatchedFlat.push({ type: "Skill", title: x?.title || x?.name, code: x?.code })
    );
    tech.forEach((x) =>
      unmatchedFlat.push({ type: "Tech", title: x?.title || x?.name, code: x?.code })
    );
  }

  // Clean empties
  unmatchedFlat = unmatchedFlat.filter(
    (x) => (x?.title || x?.name || x?.code || "").toString().trim().length > 0
  );

  // If items in flat list didn't carry `type`, try infer from code prefix or fallback "-"
  unmatchedFlat = unmatchedFlat.map((x) => {
    if (x.type) return x;
    // weak heuristics can be added here; for now fallback
    return { ...x, type: x.type || (x.category ?? "-") };
  });

  return { knowledge, skill, tech, unmatchedFlat };
}

export default function SkillGap({
  targetJobCode,     // e.g. "15-2031.00"
  targetJobTitle,    // optional display
  unmatched,         // { unmatchedFlat?, knowledge?, skill?, tech?, ... }
  onPrev,
  onNext,
  setActionsProps,   // optional (control PageActions in scaffold)
}) {
  const [showHelp, setShowHelp] = useState(false);
  const [localUnmatched, setLocalUnmatched] = useState(unmatched || null);
  const printRef = useRef(null);

  /* 1) Read session snapshot when local is empty */
  useEffect(() => {
    if (localUnmatched) return;
    try {
      const cached = sessionStorage.getItem("sb_unmatched");
      if (cached) {
        setLocalUnmatched(JSON.parse(cached));
      }
    } catch {/* noop */}
  }, [localUnmatched]);

  /* 2) If parent passes fresher unmatched later, adopt it */
  useEffect(() => {
    if (unmatched) setLocalUnmatched(unmatched);
  }, [unmatched]);

  /* 3) Fallback: re-fetch suggestions and pick the same occupation's unmatched */
  useEffect(() => {
    if (localUnmatched) return; // we already have data

    // Selected occupation (parent) saved by Step 3
    let selectedJob = null;
    try {
      const raw = sessionStorage.getItem("sb_selected_job");
      if (raw) selectedJob = JSON.parse(raw);
    } catch {/* noop */}
    if (!selectedJob) return;

    // Selections from Step 2
    let selections = [];
    let majorFirst = null;
    try {
      const metaRaw = sessionStorage.getItem("sb_selections_meta");
      if (metaRaw) {
        const meta = JSON.parse(metaRaw);
        if (Array.isArray(meta?.selections)) selections = meta.selections;
        const mf = meta?.majorFirst ?? meta?.major_first;
        if (mf != null) majorFirst = String(mf).trim() || null;
      }
    } catch {/* noop */}
    if (!selections.length) return;

    const isSameOccupation = (item) => {
      const a = (item?.raw?.occupation_code ?? item?.raw?.code ?? "").toString().trim();
      const b = (selectedJob?.raw?.occupation_code ?? selectedJob?.raw?.code ?? "").toString().trim();
      if (a && b && a === b) return true;

      const ta = (item?.raw?.occupation_title ?? item?.title ?? "").toString().trim().toLowerCase();
      const tb = (selectedJob?.raw?.occupation_title ?? selectedJob?.title ?? "").toString().trim().toLowerCase();
      return !!ta && !!tb && ta === tb;
    };

    (async () => {
      try {
        const list = await suggestJobs({ selections, majorFirst });
        const found = (list || []).find(isSameOccupation);
        const unmatchedFromApi =
          found?.raw?.unmatched ??
          found?.unmatched ?? // tolerate if backend placed it top-level
          null;

        if (unmatchedFromApi) {
          setLocalUnmatched(unmatchedFromApi);
          try {
            sessionStorage.setItem("sb_unmatched", JSON.stringify(unmatchedFromApi));
          } catch {/* noop */}
        }
      } catch (e) {
        console.error("[SkillGap] fallback fetch unmatched failed:", e);
      }
    })();
  }, [localUnmatched]);

  /* 4) Normalize and build rows */
  const normalized = useMemo(() => normalizeUnmatched(localUnmatched), [localUnmatched]);

  const rows = useMemo(
    () =>
      (normalized.unmatchedFlat || []).map((x) => ({
        name: x?.title || x?.name || x?.code || "-",
        type: x?.type || "-",
        status: "miss",
      })),
    [normalized.unmatchedFlat]
  );

  // Visible debug (comment out in production)
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log(
      "[SkillGap] counts",
      { knowledge: normalized.knowledge.length, skill: normalized.skill.length, tech: normalized.tech.length, flat: rows.length }
    );
  }, [normalized.knowledge.length, normalized.skill.length, normalized.tech.length, rows.length]);

  /* 5) Persist snapshot for downstream (Step 5) */
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
      window.dispatchEvent(
        new CustomEvent("sb:unmatched:update", { detail: { unmatched: normalized } })
      );
    } catch {/* noop */}
  }, [normalized.knowledge, normalized.skill, normalized.tech, normalized.unmatchedFlat]);

  /* 6) Wire PageActions */
  useEffect(() => {
    if (typeof setActionsProps === "function") {
      setActionsProps({
        onPrev,
        onNext,
        nextText: "Next",
        // Uncomment if you want to block Next when no gaps:
        // nextDisabled: rows.length === 0,
        // nextDisabledReason: rows.length === 0 ? "No gaps to plan for." : undefined,
      });
    }
  }, [setActionsProps, onPrev, onNext, rows.length]);

  const displayOccupation = targetJobTitle || targetJobCode || "-";

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
