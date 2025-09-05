// JobSuggestion.jsx
// Step 3: Rank and display recommended occupations based on the user's abilities.
// Uses a POST to /occupations/rank-by-codes with three arrays of codes.
// The user selects one job card; we compute unmatched items and persist to sessionStorage.

import React, { useEffect, useMemo, useState } from "react";
import StageBox from "../../components/ui/StageBox";
import HelpToggle from "../../components/ui/HelpToggle";
import PageActions from "../../components/ui/PageActions";
import JobCardGrid from "../../components/ui/JobCardGrid";
import { Alert, Spin } from "antd";
import "./Analyzer.css";

const API_BASE = "https://skillbridge-hnxm.onrender.com";

export default function JobSuggestion({
  abilities = [],
  targetJob,
  setTargetJob,
  onUnmatchedChange,
  onPrev,
  onNext,
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]); // ranked job results from backend
  const [showHelp, setShowHelp] = useState(false);

  // Prefer the latest selections persisted by AbilityAnalyzer; fallback to props
  const latestAbilities = useMemo(() => {
    try {
      const raw = localStorage.getItem("sb_selections");
      if (raw) return JSON.parse(raw);
    } catch (err){
      console.error("Failed to parse sb_selections from localStorage:", err);
    }
    return abilities;
  }, [abilities]);

  // Prepare arrays of codified abilities to send as request body
  const arraysB = useMemo(() => {
    const knowledge_codes = [];
    const skill_codes = [];
    const tech_codes = [];
    latestAbilities.forEach((a) => {
      const code = a?.code || a?.name; // fallback to name if code missing
      const t = a?.aType || a?.type;
      if (!code || !t) return;
      if (t === "knowledge") knowledge_codes.push(code);
      else if (t === "skill") skill_codes.push(code);
      else if (t === "tech") tech_codes.push(code);
    });
    return { knowledge_codes, skill_codes, tech_codes };
  }, [latestAbilities]);

  // Total count of codified abilities; used as denominator for match percentage
  const totalCodified = useMemo(
    () =>
      arraysB.knowledge_codes.length +
      arraysB.skill_codes.length +
      arraysB.tech_codes.length,
    [arraysB]
  );

  // Fetch ranked jobs; sorts by matched count and keeps top 10
  useEffect(() => {
    let aborted = false;
    const run = async () => {
      setLoading(true);
      setErr("");
      setItems([]);

      if (totalCodified === 0) {
        setErr("No codified abilities to rank. Please keep some suggestions with codes.");
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE}/occupations/rank-by-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(arraysB),
      });

      if (!res.ok) {
        setErr(`Request failed: ${res.status}`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (aborted) return;

      const arr = Array.isArray(data?.items) ? data.items : [];
      const sorted = [...arr].sort((a, b) => Number(b.count || 0) - Number(a.count || 0));
      setItems(sorted.slice(0, 10));
      setLoading(false);
    };

    run();
    return () => {
      aborted = true; // prevent state after unmount
    };
  }, [arraysB, totalCodified]);

  // Build the "unmatched" flat list for a selected job and push to parent/session
  const buildAndPushUnmatched = (jobLike) => {
    const found =
      (typeof jobLike === "string"
        ? items.find((x) => x.occupation_code === jobLike) ||
          items.find((x) => x.occupation_title === jobLike)
        : jobLike) || null;

    const matchedCount = Number(found?.count || 0);
    const percent = totalCodified > 0 ? Math.round((matchedCount / totalCodified) * 100) : 0;

    const flat = [];
    const add = (arr, typeLabel) => {
      (Array.isArray(arr) ? arr : []).forEach((x) =>
        flat.push({ type: typeLabel, title: x.title, code: x.code })
      );
    };
    const un = found?.unmatched || {};
    add(un.knowledge, "Knowledge");
    add(un.skill, "Skill");
    add(un.tech, "Tech");

    const payload = { unmatchedFlat: flat, matchedCount, percent };
    sessionStorage.setItem("sb_targetJob", found?.occupation_code || jobLike || "");
    sessionStorage.setItem("sb_unmatched", JSON.stringify(payload));
    onUnmatchedChange?.(payload);
  };

  // Convert backend items -> JobCardGrid items with a computed match%
  const jobs = useMemo(() => {
    return items.map((it) => {
      const count = Number(it.count || 0);
      const percent = totalCodified > 0 ? Math.round((count / totalCodified) * 100) : 0;
      return {
        job: it.occupation_title,
        code: it.occupation_code,
        match: percent,
        details: [{ name: `${count} / ${totalCodified} matched` }],
      };
    });
  }, [items, totalCodified]);

  // Handle card selection from JobCardGrid
  const handleSelect = (sel) => {
    let key = typeof sel === "string" ? sel : null;
    if (!key && sel && typeof sel === "object") key = sel.code || sel.job || null;
    if (!key) return;
    setTargetJob(key);
    buildAndPushUnmatched(key);
  };

  // If targetJob exists (from parent or after refresh), rebuild unmatched when items arrive
  useEffect(() => {
    if (!targetJob || !items.length) return;
    buildAndPushUnmatched(targetJob);
  }, [targetJob, items]);

  const nextDisabled = !targetJob;
  const nextDisabledReason = !targetJob ? "Please select a job card to continue." : null;

  const handleNext = () => {
    if (targetJob) buildAndPushUnmatched(targetJob);
    onNext?.();
  };

  return (
    <section className="anlz-page">
      <div className="container">
        {/* Top StageBox with how-to-use guidance */}
        <StageBox
          pill="Step 3"
          title="Job Suggestions"
          tipTitle="What to do in this step"
          tipContent={
            <ol style={{ margin: 0, paddingLeft: "1.1rem" }}>
              <li>Review the recommended occupations and their match scores.</li>
              <li>Click a card to <b>select</b> the target job.</li>
              <li>Click <b>Next</b> to view the <i>unmatched</i> abilities for the selected job.</li>
            </ol>
          }
        >
          {loading && (
            <div style={{ marginTop: 8 }}>
              <Spin /> <span style={{ marginLeft: 8 }}>Ranking occupations…</span>
            </div>
          )}
          {err && <Alert type="warning" showIcon style={{ marginTop: 8 }} message={err} />}
        </StageBox>

        {/* Bottom card: white content area with HelpToggle + grid of job cards */}
        <StageBox>
          <div className="anlz-second-card">
            <div className="question-row">
              <h3 className="question-title">Recommended jobs for you</h3>
            </div>

            <div className="question-row" style={{ marginTop: -8 }}>
              <div style={{ flex: 1 }} />
              <HelpToggle show={showHelp} onToggle={() => setShowHelp((v) => !v)}>
                Click a card to select a job. We only show match scores here; the next page lists
                the <i>unmatched</i> ability names in detail.
              </HelpToggle>
            </div>

            <JobCardGrid jobs={jobs} targetJob={targetJob} onSelect={handleSelect} />
          </div>
        </StageBox>

        <PageActions
          onPrev={onPrev}
          onNext={handleNext}
          nextDisabled={nextDisabled}
          nextDisabledReason={nextDisabledReason}
        />
      </div>
    </section>
  );
}
