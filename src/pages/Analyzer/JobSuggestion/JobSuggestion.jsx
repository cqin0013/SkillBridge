// Purpose: Load job suggestions; user must (1) choose a sub-occupation for a card
//  (2) click "Select" on that card. Only then the parent PageActions.Next is enabled.

import React, { useEffect, useMemo, useState } from "react";
import { Empty, Spin, Typography } from "antd";
import JobCard from "./components/JobCard/JobCard";
import { suggestJobs } from "../../../lib/api/JobSuggestionApi";

const { Paragraph } = Typography;

// Session keys read by later steps (SkillGap)
const KEY_SELECTED_JOB = "sb_selected_job";
const KEY_SELECTED_CODE = "sb_selected_anzsco";
const KEY_SELECTED_UNIT = "sb_selected_unitgroup";

/** Read prior meta (selections, majorFirst, etc.) from sessionStorage */
function readPrevSelections() {
  try {
    const raw = sessionStorage.getItem("sb_selections_meta");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Read user's region preference; "all" maps to "national" downstream */
function readUserRegionPref() {
  const keys = [
    "sb_region_pref",
    "sb_interest_region",
    "sb_user_region",
    "sb_location_pref",
    "sb_region",
    "sb_selections_meta",
  ];
  for (const k of keys) {
    try {
      const raw = sessionStorage.getItem(k);
      if (!raw) continue;
      if (k === "sb_selections_meta") {
        const meta = JSON.parse(raw);
        if (meta?.region) return meta.region;
        if (meta?.regionPref) return meta.regionPref;
        continue;
      }
      const val = JSON.parse(raw);
      if (typeof val === "string") return val;
      if (val?.region) return val.region;
    } catch {
      const plain = sessionStorage.getItem(k);
      if (plain) return plain;
    }
  }
  return "all";
}

/**
 * Props expected by AnalyzerWizard:
 * - setActionsProps: (cfgOrUpdater) => void   // parent controls PageActions; we only update nextDisabled
 * - setTargetJob: (code:string|null, title?:string|null) => void
 * - onUnmatchedChange?: (obj|null) => void    // (kept for compatibility, unused here)
 */
export default function JobSuggestion({
  setActionsProps,
  setTargetJob,
}) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Which card is "Selected" via its Select button
  const [selectedKey, setSelectedKey] = useState(null);
  // For each card (by key), which sub-occupation the user picked in the <Select>
  const [pickedCodeByKey, setPickedCodeByKey] = useState({});

  // Derive selected job & its picked sub-occupation code
  const selectedJob = useMemo(
    () => jobs.find((j) => j.key === selectedKey) || null,
    [jobs, selectedKey]
  );
  const selectedCode = selectedJob ? pickedCodeByKey[selectedJob.key] || null : null;

  // Region preference (passed to JobCard to show shortage tag)
  const [regionPref] = useState(() => readUserRegionPref());

  // Load suggestions on mount
  useEffect(() => {
    const meta = readPrevSelections();
    const selections = Array.isArray(meta?.selections) ? meta.selections : [];
    const majorFirst =
      (meta?.majorFirst ?? meta?.major_first ?? "").toString().trim() || null;

    if (!Array.isArray(selections) || selections.length === 0) {
      setError("No selections found. Please complete the previous step first.");
      return;
    }

    (async () => {
      setLoading(true);
      setError("");
      try {
        const list = await suggestJobs({ selections, majorFirst });
        // Keep all jobs; limit to first 10 for a focused UI
        setJobs(list.slice(0, 10));
      } catch (e) {
        setError("Failed to load suggestions.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * Persist selection for downstream steps.
   * We only persist when BOTH conditions are met:
   *  1) a card is selected (user clicked "Select")
   *  2) a sub-occupation is chosen for that card
   * Otherwise we clear keys so parent knows Next should be disabled.
   */
  useEffect(() => {
    const bothReady = Boolean(selectedJob && selectedCode);
    if (bothReady) {
      sessionStorage.setItem(KEY_SELECTED_JOB, JSON.stringify(selectedJob));
      sessionStorage.setItem(KEY_SELECTED_CODE, String(selectedCode));
      sessionStorage.setItem(KEY_SELECTED_UNIT, String(selectedCode).slice(0, 4));
      try {
        setTargetJob?.(selectedCode, selectedJob?.title || null);
      } catch {}
    } else {
      sessionStorage.removeItem(KEY_SELECTED_JOB);
      sessionStorage.removeItem(KEY_SELECTED_CODE);
      sessionStorage.removeItem(KEY_SELECTED_UNIT);
      try {
        setTargetJob?.(null, null);
      } catch {}
    }
  }, [selectedJob, selectedCode, setTargetJob]);

  /**
   * IMPORTANT: Only update nextDisabled/nextDisabledReason while preserving parent's handlers.
   * Use a functional update so we merge with existing onNext/onPrev/nextText configuration.
   */
  useEffect(() => {
    const nextDisabled = !(selectedJob && selectedCode);
    setActionsProps?.((prev) => ({
      ...prev,
      nextDisabled,
      nextDisabledReason: nextDisabled
        ? "Please pick a sub-occupation and then click Select on a job card."
        : undefined,
    }));
  }, [selectedJob, selectedCode, setActionsProps]);

  return (
    <div style={{ padding: 16 }}>
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
          <Spin tip="Matching suitable jobs for you…" />
        </div>
      )}

      {!loading && error && <Paragraph type="danger">{error}</Paragraph>}

      {!loading && !error && jobs.length === 0 && (
        <Empty description="No matching jobs (try adjusting your abilities)" />
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {jobs.map((item) => (
          <JobCard
            key={item.key}
            item={item}
            selected={selectedKey === item.key}
            pickedCode={pickedCodeByKey[item.key] || null}
            onPickAnzsco={(code) =>
              setPickedCodeByKey((m) => ({ ...m, [item.key]: code }))
            }
            onSelect={() => setSelectedKey(item.key)}
            regionPref={regionPref}
          />
        ))}
      </div>
    </div>
  );
}
