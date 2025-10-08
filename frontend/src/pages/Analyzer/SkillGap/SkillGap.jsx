
// Step 4: Show ability gaps (Not Met). Robustly normalizes data from props/session/API.
// Fast UX: no artificial delay; spinner shows only during real fallback fetching.


import { useRef, useMemo, useState, useEffect } from "react";
import HelpToggle from "../../../components/ui/HelpToggle/HelpToggle";
import SectionBox from "../../../components/ui/SectionBox/SectionBox";
import GapTable from "../../../components/ui/GapTable";
import { Typography, Spin } from "antd";
import { suggestJobs } from "../../../lib/api/JobSuggestionApi";

const { Paragraph } = Typography;

/*  Exported page intro (for TwoCardScaffold header) */
export const pageIntro = {
  stepPill: "Step 4",
  title: "Skill Gaps",
  introContent: (
    <Paragraph style={{ margin: 0 }}>
      Compare your abilities with the target job's requirements. Below we show the abilities that were
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

  // If items in flat list didn't carry `type`, fall back to category or "-"
  unmatchedFlat = unmatchedFlat.map((x) => {
    if (x.type) return x;
    return { ...x, type: x.type || (x.category ?? "-") };
  });

  return { knowledge, skill, tech, unmatchedFlat };
}

/** Read cached unmatched from sessionStorage synchronously (avoid first-frame null). */
function readCachedUnmatched() {
  try {
    const cached = sessionStorage.getItem("sb_unmatched");
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

export default function SkillGap({
  targetJobCode,     
  targetJobTitle,    
  unmatched,        
  onPrev,
  onNext,
  setActionsProps,   
}) {
  // Initialize from props or cache to avoid initial empty render
  const [localUnmatched, setLocalUnmatched] = useState(
    () => unmatched ?? readCachedUnmatched()
  );

  // Fetching flag: only true during real network fallback
  const [isFetching, setIsFetching] = useState(false);

  const [showHelp, setShowHelp] = useState(false);
  const printRef = useRef(null);

  /* Adopt fresher props when they arrive */
  useEffect(() => {
    if (unmatched) setLocalUnmatched(unmatched);
  }, [unmatched]);

  /* Fallback: re-fetch suggestions and pick the same occupation's unmatched when we truly have nothing */
  useEffect(() => {
    if (localUnmatched) return; // prop or cache already available

    // Selected occupation (saved by Step 3)
    let selectedJob = null;
    try {
      const raw = sessionStorage.getItem("sb_selected_job");
      if (raw) selectedJob = JSON.parse(raw);
    } catch { /* noop */ }
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
    } catch { /* noop */ }
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
        setIsFetching(true);
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
          } catch { /* noop */ }
        } else {
          // Resolve to empty shape to indicate true "no gap"
          setLocalUnmatched({ knowledge: [], skill: [], tech: [], unmatchedFlat: [] });
        }
      } catch (e) {
        console.error("[SkillGap] fallback fetch unmatched failed:", e);
        // Resolve to empty shape to avoid permanent spinner
        setLocalUnmatched({ knowledge: [], skill: [], tech: [], unmatchedFlat: [] });
      } finally {
        setIsFetching(false);
      }
    })();
  }, [localUnmatched]);

  /* Normalize and build rows */
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
    console.log("[SkillGap] counts", {
      knowledge: normalized.knowledge.length,
      skill: normalized.skill.length,
      tech: normalized.tech.length,
      flat: rows.length,
    });
  }, [normalized.knowledge.length, normalized.skill.length, normalized.tech.length, rows.length]);

  /* Persist snapshot for downstream (Step 5) */
  useEffect(() => {
    if (!localUnmatched) return;
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
    } catch { /* noop */ }
  }, [localUnmatched, normalized.knowledge, normalized.skill, normalized.tech, normalized.unmatchedFlat]);

  /* Wire PageActions: disable Next only when truly fetching */
  useEffect(() => {
    if (typeof setActionsProps === "function") {
      setActionsProps({
        onPrev,
        onNext,
        nextText: "Next",
        nextDisabled: isFetching,
        nextDisabledReason: isFetching ? "Please wait while we generate your skill gaps." : undefined,
      });
    }
  }, [setActionsProps, onPrev, onNext, isFetching]);

  const displayOccupation = targetJobTitle || targetJobCode || "-";

  // Title node that wraps automatically on small screens or long strings
  const titleNode = (
    <div
      style={{
        whiteSpace: "normal",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
        lineHeight: 1.35,
      }}
    >
      {`Unmatched abilities (Not Met) — ${displayOccupation}`}
    </div>
  );

  return (
    <>
      <SectionBox
        variant="question"
        title={titleNode} 
        extra={
          <HelpToggle show={showHelp} onToggle={() => setShowHelp((v) => !v)}>
            We list the ability <b>title</b> and its <b>classification</b> (Knowledge, Skill, or Tech).
          </HelpToggle>
        }
      >
        {isFetching ? (
 
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 160,
              gap: 12,
              paddingBlock: 24,
            }}
          >
            <Spin tip="Generating your skill gaps…" />
          </div>
        ) : rows.length ? (
    
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
