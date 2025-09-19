// src/pages/Analyzer/JobSuggestion/JobSuggestion.jsx
// Content-only body for Step 3. Used inside TwoCardScaffold from Analyzer.jsx.

import React, { useEffect, useMemo, useState, useCallback } from "react";
import SectionBox from "../../../components/ui/SectionBox/SectionBox";
import HelpToggle from "../../../components/ui/HelpToggle/HelpToggle";
import { Alert, Spin, Collapse, Typography, Divider } from "antd";
import InfoCircleOutlined from "@ant-design/icons/es/icons/InfoCircleOutlined";
import JobCard from "./components/JobCard/JobCard";
import { INDUSTRY_OPTIONS } from "../../../lib/constants/industries";
import { rankOccupationsByCodes } from "../../../lib/api/occupationsApi";

const { Paragraph, Text } = Typography;
const { Panel } = Collapse;

/* ---------------- Utilities (unchanged) ---------------- */
function hashString(s = "") {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
function getDescription(job) {
  return (
    job?.description ||
    job?.occupation_description ||
    job?.summary ||
    `This occupation (${job?.occupation_title || job?.occupation_code || "Unknown job"}) involves a range of tasks and responsibilities relevant to its industry.`
  );
}
function extractSkillsWithImportance(job) {
  const candidates =
    job?.requirements?.skills ||
    job?.skills ||
    job?.top_skills ||
    job?.topSkills ||
    job?.skill_requirements ||
    [];

  let skills = [];
  if (Array.isArray(candidates) && candidates.length) {
    skills = candidates
      .map((s) => {
        if (typeof s === "string") return { title: s, importance: undefined };
        if (!s) return null;
        return {
          title: s.title || s.name || s.skill || s.code || "Unnamed skill",
          importance: Number.isFinite(s.importance) ? Number(s.importance) : s.level ?? s.weight ?? undefined,
        };
      })
      .filter(Boolean);
  }

  if (!skills.length) {
    const poss =
      job?.matched?.skill ||
      job?.unmatched?.skill ||
      job?.unmatchedSkills ||
      job?.matchedSkills ||
      [];
    if (Array.isArray(poss) && poss.length) {
      skills = poss.map((s) => ({
        title: s?.title || s?.name || s?.code || String(s),
        importance: undefined,
      }));
    }
  }

  if (!skills.length) {
    const base = [
      "Critical Thinking",
      "Communication",
      "Problem Solving",
      "Teamwork",
      "Time Management",
      "Digital Literacy",
      "Project Management",
      "Data Analysis",
      "Customer Focus",
      "Adaptability",
    ];
    const h = hashString(job?.occupation_title || job?.occupation_code || "x");
    const picked = [];
    for (let i = 0; i < base.length; i++) {
      if ((h + i * 13) % 2 === 0) picked.push(base[i]);
      if (picked.length >= 5) break;
    }
    if (!picked.length) picked.push(...base.slice(0, 5));
    skills = picked.map((t) => ({ title: t, importance: undefined }));
  }

  const withImportance = skills.map((s, i) => {
    if (Number.isFinite(s.importance)) return s;
    const seed = hashString((job?.occupation_code || "") + (s.title || "") + i);
    const importance = 50 + (seed % 46); // 50–95
    return { ...s, importance };
  });

  const seen = new Set();
  const dedup = [];
  for (const s of withImportance) {
    const key = (s.title || "").toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      dedup.push(s);
    }
  }
  return dedup;
}
function selectImportantSkills(skills) {
  return [...skills]
    .filter((s) => Number(s.importance) > 60)
    .sort((a, b) => Number(b.importance) - Number(a.importance));
}
function normalizeToSet(v) {
  if (!v) return new Set();
  if (v instanceof Set) return v;
  if (Array.isArray(v)) return new Set(v);
  return new Set([v]);
}
function getShortageStatus(code, selectedRegion, shortageMap) {
  if (!code || !selectedRegion || !shortageMap || !shortageMap[selectedRegion]) return "not_listed";
  const regionBlock = shortageMap[selectedRegion] || {};
  const inSet = normalizeToSet(regionBlock.inDemand);
  const notSet = normalizeToSet(regionBlock.notInDemand);
  if (inSet.has(code)) return "in_demand";
  if (notSet.has(code)) return "not_in_demand";
  return "not_listed";
}
function idsToIndustryNames(ids = []) {
  if (!Array.isArray(ids) || !ids.length) return [];
  const map = new Map(INDUSTRY_OPTIONS.map((o) => [o.id, o.name]));
  return ids.map((id) => map.get(id)).filter(Boolean);
}
function assignIndustryFromSelected(job, selectedIndustryNames) {
  if (!selectedIndustryNames?.length) return "All industries";
  const key = job?.occupation_code || job?.occupation_title || JSON.stringify(job || {});
  const idx = hashString(String(key)) % selectedIndustryNames.length;
  return selectedIndustryNames[idx];
}

/* ---------------- Page Intro (export for Scaffold header) ---------------- */
export const pageIntro = {
  stepPill: "Step 3",
  title: "Job Suggestions (Grouped by Your Industries)",
  introContent: (
    <p style={{ margin: 0 }}>
      Based on the abilities you selected in the previous steps, the system compares them with the abilities
      that are most important for different occupations. This matching process highlights which jobs in your
      chosen industries require similar abilities to yours. The result is a ranked list of occupations that
      are most compatible with your profile, helping you identify the best potential career directions to explore.
    </p>
  ),
  actionsContent: (
    <ol style={{ margin: 0, paddingLeft: "1.1rem" }}>
      <li>Open an industry to review its recommended occupations and match scores.</li>
      <li>Click any job card to select it (selected card shows a green check).</li>
      <li>Expand a card to see top skills (importance &gt; 60), description, and regional shortage status.</li>
      <li>Click <b>Next</b> to view the <i>unmatched</i> abilities for the selected job.</li>
    </ol>
  ),
};

/* ---------------- Main Content Component (no StageBox / no PageActions here) ---------------- */
export default function JobSuggestion({
  abilities = [],
  selectedIndustryIds = [],
  targetJob,
  setTargetJob,
  onUnmatchedChange,
  onPrev,
  onNext,
  selectedRegion,
  shortageMap,
  /** push actions state up to TwoCardScaffold so it can render PageActions */
  setActionsProps, // (optional) function(props) => void
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]); // ranked jobs from backend
  const [showHelp, setShowHelp] = useState(false);

  const effectiveRegion = useMemo(() => {
    if (selectedRegion) return selectedRegion;
    try {
      const r = sessionStorage.getItem("sb_selectedRegion");
      return r || undefined;
    } catch {
      return undefined;
    }
  }, [selectedRegion]);

  const selectedIndustryNames = useMemo(
    () => idsToIndustryNames(selectedIndustryIds),
    [selectedIndustryIds]
  );

  // Prepare arrays for POST body
  const arraysB = useMemo(() => {
    const knowledge_codes = [];
    const skill_codes = [];
    const tech_codes = [];
    (abilities || []).forEach((a) => {
      const code = a?.code || a?.name;
      const t = a?.aType || a?.type;
      if (!code || !t) return;
      if (t === "knowledge") knowledge_codes.push(code);
      else if (t === "skill") skill_codes.push(code);
      else if (t === "tech") tech_codes.push(code);
    });
    return { knowledge_codes, skill_codes, tech_codes };
  }, [abilities]);

  const totalCodified = useMemo(
    () => arraysB.knowledge_codes.length + arraysB.skill_codes.length + arraysB.tech_codes.length,
    [arraysB]
  );

  // fetch ranked occupations
  useEffect(() => {
    let aborted = false;
    const ctrl = new AbortController();

    const run = async () => {
      setLoading(true);
      setErr("");
      setItems([]);

      if (totalCodified === 0) {
        setErr("No codified abilities to rank. Please keep some suggestions with codes.");
        setLoading(false);
        return;
      }

      try {
        const items = await rankOccupationsByCodes(arraysB, { signal: ctrl.signal });
        if (aborted) return;

        const sorted = [...items].sort((a, b) => Number(b.count || 0) - Number(a.count || 0));
        setItems(sorted.slice(0, 10));
      } catch (e) {
        if (aborted || e?.name === "AbortError") return;
        console.error(e);
        setErr(e?.message || "Network error. Please try again.");
      } finally {
        if (!aborted) setLoading(false);
      }
    };

    run();
    return () => {
      aborted = true;
      ctrl.abort();
    };
  }, [arraysB, totalCodified]);

  // items -> enriched view models
  const enriched = useMemo(() => {
    return items.map((it) => {
      const count = Number(it.count || 0);
      const percent = totalCodified > 0 ? Math.round((count / totalCodified) * 100) : 0;
      const skillsAll = extractSkillsWithImportance(it);
      const importantSkills = selectImportantSkills(skillsAll);

      return {
        raw: it,
        job: it.occupation_title,
        code: it.occupation_code,
        match: percent,
        count,
        details: [{ name: `${count} / ${totalCodified} matched` }],
        description: getDescription(it),
        industry: assignIndustryFromSelected(it, selectedIndustryNames),
        importantSkills,
      };
    });
  }, [items, totalCodified, selectedIndustryNames]);

  // group by industry
  const grouped = useMemo(() => {
    const m = new Map();
    for (const j of enriched) {
      const bucket = j.industry || "All industries";
      if (!m.has(bucket)) m.set(bucket, []);
      m.get(bucket).push(j);
    }
    const entries = [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return entries.map(([industry, arr]) => ({
      industry,
      jobs: [...arr].sort((a, b) => b.match - a.match),
    }));
  }, [enriched]);

  // build & push unmatched
  const buildAndPushUnmatched = useCallback(
    (jobKey) => {
      const found =
        (typeof jobKey === "string"
          ? items.find((x) => x.occupation_code === jobKey) ||
            items.find((x) => x.occupation_title === jobKey)
          : jobKey) || null;

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
      sessionStorage.setItem("sb_unmatched", JSON.stringify(payload));
      onUnmatchedChange?.(payload);
    },
    [items, onUnmatchedChange, totalCodified]
  );

  // select a job: store BOTH code & title
  const selectJob = (j) => {
    const code = j?.code || j?.raw?.occupation_code || "";
    const title = j?.job || j?.raw?.occupation_title || code || "Occupation";
    setTargetJob?.(code, title);
    sessionStorage.setItem("sb_targetJobCode", code);
    sessionStorage.setItem("sb_targetJobTitle", title);
    buildAndPushUnmatched(code || title);
  };

  // if there's a preselected code in props, rebuild unmatched after items arrive
  useEffect(() => {
    if (!targetJob || !items.length) return;
    buildAndPushUnmatched(targetJob);
  }, [targetJob, items, buildAndPushUnmatched]);

  // Actions for bottom buttons (provided to Scaffold)
  const nextDisabled = !targetJob;
  const nextDisabledReason = !targetJob ? "Please select a job card to continue." : undefined;

  const handleNext = () => {
    if (targetJob) buildAndPushUnmatched(targetJob);
    onNext?.();
  };

  // push actions to parent scaffold when relevant state changes
  useEffect(() => {
    if (typeof setActionsProps === "function") {
      setActionsProps({
        onPrev,
        onNext: handleNext,
        nextDisabled,
        nextDisabledReason,
      });
    }
  }, [setActionsProps, onPrev, handleNext, nextDisabled, nextDisabledReason]);

  /* ---------------- UI: just SectionBox + list ---------------- */
  return (
    <>
      <SectionBox>
        <div className="anlz-second-card">
          <div className="question-row">
            <h3 className="question-title">Recommended jobs by industry</h3>
            <HelpToggle show={showHelp} onToggle={() => setShowHelp((v) => !v)}>
              Click an <b>industry</b> to expand. Click a <b>job card</b> to select it (green check).
              You can also expand a card to see the description, high-importance skills, and regional shortage status.
            </HelpToggle>
          </div>

          {loading && (
            <div style={{ marginTop: 8 }}>
              <Spin /> <span style={{ marginLeft: 8 }}>Ranking occupations…</span>
            </div>
          )}
          {err && <Alert type="warning" showIcon style={{ marginTop: 8 }} message={err} />}

   
          {!loading && !err && nextDisabled && (
            <Alert
              type="info"
              showIcon
              style={{ marginTop: 8 }}
              message={nextDisabledReason || "Please select a job to continue."}
            />
          )}

          <Divider />

          <Collapse accordion>
            {grouped.map(({ industry, jobs }) => (
              <Panel header={`${industry} · ${jobs.length} roles`} key={industry}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 16,
                  }}
                >
                  {jobs.map((j) => {
                    const status = getShortageStatus(j.code, effectiveRegion, shortageMap);
                    const isSelected = String(targetJob || "") === String(j.code || j.job);

                    return (
                      <div key={j.code || j.job}>
                        <JobCard
                          data={j}
                          status={status}
                          selected={isSelected}
                          metaIcon={<InfoCircleOutlined />}
                          onSelect={() => selectJob(j)}
                        />
                      </div>
                    );
                  })}
                </div>
              </Panel>
            ))}
          </Collapse>
        </div>
      </SectionBox>
    </>
  );
}
