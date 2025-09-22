// src/pages/Analyzer/TrainingGuidance/TrainingGuidance.jsx
// Content-only body for the "Training recommendations (VET courses)" step.
// It assumes the parent container is TwoCardScaffold (like other steps).
//
// What this component does:
// - Reads the chosen occupation (ANZSCO) code & title from props or sessionStorage.
// - Optionally reads/fetches the occupation's skill level (for display).
// - Calls GET /api/anzsco/{code}/training-advice?limit={n} via TrainingAdviceApi.
// - Renders a clean list of VET courses with basic metadata.
// - Exposes Prev/Next via setActionsProps (so the Scaffold can render PageActions).

import React, { useEffect, useMemo, useState } from "react";
import { Alert, Spin, List, Typography, Space } from "antd";
import SectionBox from "../../../components/ui/SectionBox/SectionBox";
import HelpToggle from "../../../components/ui/HelpToggle/HelpToggle";
import { getTrainingAdvice } from "../../../lib/api/TrainingAdviceApi";
import { getAnzscoDemand } from "../../../lib/api/AnzscoDemandApi";

const { Paragraph, Text } = Typography;

const isAnzscoCode = (val) => /^\d{6}$/.test(String(val || "").trim());


/* ---------- Exported page intro (for TwoCardScaffold header) ---------- */
export const pageIntro = {
  stepPill: "Step 5",
  title: "Training Recommendations (VET Courses)",
  introContent: (
    <Paragraph style={{ margin: 0 }}>
      Based on your selected occupation, we list relevant{" "}
      <b>VET courses</b> you can consider to strengthen your capabilities and
      fill skill gaps. This can help you prepare for the role more efficiently.
    </Paragraph>
  ),
  actionsContent: (
    <ol style={{ margin: 0, paddingLeft: "1.1rem" }}>
      <li>Confirm the target occupation and review the recommended courses.</li>
      <li>Use the list to plan your upskilling (certificates, short courses).</li>
      <li>Click <b>Next</b> to continue to the learning roadmap.</li>
    </ol>
  ),
};

/**
 * Props:
 * - targetJobCode?: string           // 6-digit ANZSCO (e.g. "261313")
 * - targetJobTitle?: string
 * - skillLevel?: string | number     // optional; will be fetched if absent
 * - limit?: number                   // how many courses to request (default 10)
 * - onPrev?: () => void
 * - onNext?: () => void
 
 */
export default function TrainingGuidance({
  targetJobCode,
  targetJobTitle,
  skillLevel,
  limit = 10,
  onPrev,
  onNext,
  setActionsProps, // (optional) function(props) => void
}) {
  // 1) Resolve occupation code & title (props first, then sessionStorage fallback)
  const resolved = useMemo(() => {
    let code = targetJobCode != null ? String(targetJobCode).trim() : "";
    let title = targetJobTitle;
    const candidateSet = new Set();

    if (isAnzscoCode(code)) {
      candidateSet.add(code);
    }

    try {
      const storedListRaw = sessionStorage.getItem("sb_targetJobCodes");
      if (storedListRaw) {
        const parsed = JSON.parse(storedListRaw);
        if (Array.isArray(parsed)) {
          parsed.forEach((value) => {
            const str = String(value || "").trim();
            if (isAnzscoCode(str)) candidateSet.add(str);
          });
        }
      }

      if (!code) {
        const storedCode = sessionStorage.getItem("sb_targetJobCode");
        if (storedCode) {
          const trimmed = String(storedCode).trim();
          code = trimmed;
          if (isAnzscoCode(trimmed)) candidateSet.add(trimmed);
        }
      }

      if (!title) {
        const storedTitle = sessionStorage.getItem("sb_targetJobTitle");
        if (storedTitle) title = storedTitle;
      }
    } catch {
      /* noop */
    }

    const codes = Array.from(candidateSet);
    const primaryCode = codes[0] || code || "";

    return {
      code: primaryCode || undefined,
      codes,
      title,
    };
  }, [targetJobCode, targetJobTitle]);

  // 2) Local state for skill level & data loading
  const resolvedCodesList = Array.isArray(resolved.codes) ? resolved.codes : [];
  const primaryResolvedCode = resolved.code;
  const resolvedTitleValue = resolved.title || "";
  const resolvedCodesKey = resolvedCodesList.join("|");

  const [localSkillLevel, setLocalSkillLevel] = useState(
    skillLevel != null ? String(skillLevel) : null
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [courses, setCourses] = useState([]);
  const initialDisplayCode = resolvedCodesList[0] || primaryResolvedCode || "";
  const [anzscoDisplay, setAnzscoDisplay] = useState({ code: initialDisplayCode, title: resolvedTitleValue });

  // 3) Fetch skill level (only if missing)
  useEffect(() => {
    let aborted = false;
    const ctrl = new AbortController();

    const maybeFetchSkillLevel = async () => {
      if (localSkillLevel != null) return;

      const demandCode =
        resolvedCodesList[0] ||
        (isAnzscoCode(primaryResolvedCode) ? String(primaryResolvedCode).trim() : "");
      if (!demandCode) return;

      try {
        const d = await getAnzscoDemand({ anzscoCode: demandCode, signal: ctrl.signal });
        if (!aborted) {
          const level = d?.skill_level != null ? String(d.skill_level) : null;
          setLocalSkillLevel(level);
        }
      } catch {
        // optional; ignore errors
      }
    };

    maybeFetchSkillLevel();
    return () => {
      aborted = true;
      ctrl.abort();
    };
  }, [resolvedCodesKey, primaryResolvedCode, localSkillLevel]);

  useEffect(() => {
    if (localSkillLevel != null) {
      try {
        sessionStorage.setItem("sb_skill_level", String(localSkillLevel));
      } catch {
        /* noop */
      }
    } else {
      try {
        sessionStorage.removeItem("sb_skill_level");
      } catch {
        /* noop */
      }
    }
  }, [localSkillLevel]);


  // 4) Fetch training advice (courses)
  useEffect(() => {
    let aborted = false;
    const ctrl = new AbortController();

    const run = async () => {
      const candidateCodes = resolvedCodesList.length
        ? resolvedCodesList
        : isAnzscoCode(primaryResolvedCode)
        ? [String(primaryResolvedCode).trim()]
        : [];

      if (!candidateCodes.length) {
        setErr("No occupation code found. Please go back and select a job first.");
        setCourses([]);
        setAnzscoDisplay({ code: primaryResolvedCode || "", title: resolvedTitleValue });
        try {
          sessionStorage.removeItem("sb_training_advice");
        } catch {
          /* noop */
        }
        return;
      }

      setLoading(true);
      setErr("");
      setCourses([]);

      const aggregated = new Map();
      const displayRecords = [];
      let lastError = null;

      try {
        for (const candidate of candidateCodes) {
          if (aborted) return;
          try {
            const res = await getTrainingAdvice({
              anzscoCode: candidate,
              limit,
              signal: ctrl.signal,
            });
            if (aborted) return;

            const displayCode = res?.anzsco?.code || candidate;
            const displayTitle = res?.anzsco?.title || resolvedTitleValue;
            displayRecords.push({ code: displayCode, title: displayTitle });

            const list = Array.isArray(res?.courses) ? res.courses : [];
            list.forEach((course, idx) => {
              const normalized = { ...course, sourceCode: displayCode };
              const keyCode = course?.code ? String(course.code).trim().toLowerCase() : "";
              const keyName = course?.name ? String(course.name).trim().toLowerCase() : "";
              const mapKey = keyCode || `${keyName}|${displayCode}|${idx}`;
              if (!aggregated.has(mapKey)) {
                aggregated.set(mapKey, normalized);
              }
            });
          } catch (err) {
            if (aborted || err?.name === "AbortError") return;
            lastError = err;
          }
        }
      } finally {
        if (!aborted) setLoading(false);
      }

      if (aborted) return;

      const codesForDisplay = Array.from(
        new Set(
          (displayRecords.length
            ? displayRecords.map((r) => r.code).filter(Boolean)
            : candidateCodes
          ).filter(Boolean)
        )
      );
      const titleForDisplay =
        displayRecords.find((r) => r.title)?.title || resolvedTitleValue;

      if (aggregated.size === 0) {
        setCourses([]);
        setAnzscoDisplay({
          code: codesForDisplay.join(", "),
          title: titleForDisplay,
        });
        try {
          sessionStorage.removeItem("sb_training_advice");
        } catch {
          /* noop */
        }
        setErr(lastError?.message || "No training advice was returned for these codes.");
        return;
      }

      const mergedCourses = Array.from(aggregated.values());
      setCourses(mergedCourses);
      setAnzscoDisplay({
        code: codesForDisplay.join(", "),
        title: titleForDisplay,
      });

      const advicePayload = {
        anzsco: codesForDisplay.join(", "),
        codes: codesForDisplay,
        title: titleForDisplay,
        found: aggregated.size,
        generatedAt: new Date().toISOString(),
        items: mergedCourses.map((course) => ({
          tgaCode: course.code || course.raw?.vet_course_code || course.raw?.course_code || course.raw?.code || "",
          title: course.name || course.raw?.course_name || course.code || "(Unnamed course)",
          componentType: Array.isArray(course.raw?.component_type)
            ? course.raw.component_type.filter(Boolean)
            : course.sourceCode
            ? [course.sourceCode]
            : [],
        })),
      };
      try {
        sessionStorage.setItem("sb_training_advice", JSON.stringify(advicePayload));
      } catch {
        /* noop */
      }
      setErr("");
    };

    run();
    return () => {
      aborted = true;
      ctrl.abort();
    };
  }, [resolvedCodesKey, primaryResolvedCode, resolvedTitleValue, limit]);

  const headerTitle = useMemo(() => {
    const name = anzscoDisplay.title || anzscoDisplay.code || "Occupation";
    return `Training recommendations - ${name}`;
  }, [anzscoDisplay.title, anzscoDisplay.code]);

  return (
    <>
      <SectionBox
        variant="question"
        title={headerTitle}
        extra={
          <HelpToggle>
            <div style={{ maxWidth: 420 }}>
              We list suggested <b>VET courses</b> related to your target occupation. Use them to
              plan your upskilling and address missing abilities identified in the previous step.
            </div>
          </HelpToggle>
        }
      >
        {/* Meta row */}
        <div style={{ marginBottom: 8 }}>
          <Space size={12} wrap>
            {anzscoDisplay.code ? (
              <Text type="secondary">ANZSCO: {anzscoDisplay.code}</Text>
            ) : null}
          </Space>
        </div>

        {loading && (
          <div style={{ marginTop: 8 }}>
            <Spin /> <span style={{ marginLeft: 8 }}>Loading training advice...</span>
          </div>
        )}

        {err && <Alert type="warning" showIcon style={{ marginTop: 8 }} message={err} />}

        {!loading && !err && courses.length === 0 && (
          <Alert
            type="info"
            showIcon
            style={{ marginTop: 8 }}
            message="No recommended courses were returned for this occupation."
          />
        )}

        {!loading && !err && courses.length > 0 && (
          <List
            style={{ marginTop: 8 }}
            dataSource={courses}
            bordered
            renderItem={(item) => (
              <List.Item>
                <Space direction="vertical" size={2}>
                  <Text strong>{item.name}</Text>
                  {item.code ? (
                    <Text type="secondary">Course code: {item.code}</Text>
                  ) : null}
                </Space>
              </List.Item>
            )}
          />
        )}

        {!loading && !err && courses.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <Text type="secondary">
              Tip: You can shortlist a few courses and discuss them with a career advisor.
            </Text>
          </div>
        )}
      </SectionBox>
    </>
  );
}
