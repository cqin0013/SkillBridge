// Content-only body for the "Training recommendations (VET courses)" step.

import { useEffect, useMemo, useState } from "react";
import { Alert, Spin, List, Typography, Space } from "antd";
import SectionBox from "../../../components/ui/SectionBox/SectionBox";
import HelpToggle from "../../../components/ui/HelpToggle/HelpToggle";
import { getTrainingAdvice } from "../../../lib/api/TrainingAdviceApi";

const { Text } = Typography;

const isAnzscoCode = (val) => /^\d{6}$/.test(String(val || "").trim());

/** Resolve a single ANZSCO code + title from props first, then sessionStorage. */
function resolveTargetFromContext(targetJobCode, targetJobTitle) {
  let code = targetJobCode != null ? String(targetJobCode).trim() : "";
  let title = targetJobTitle || "";

  try {
    // If no code via props, try sessionStorage fallbacks
    if (!isAnzscoCode(code)) {
      const listRaw = sessionStorage.getItem("sb_targetJobCodes");
      if (listRaw) {
        const list = JSON.parse(listRaw);
        if (Array.isArray(list)) {
          const found = list.map((x) => String(x || "").trim()).find(isAnzscoCode);
          if (found) code = found;
        }
      }
    }
    if (!isAnzscoCode(code)) {
      const stored = sessionStorage.getItem("sb_targetJobCode");
      const trimmed = stored ? String(stored).trim() : "";
      if (isAnzscoCode(trimmed)) code = trimmed;
    }
    // Title fallback
    if (!title) {
      const storedTitle = sessionStorage.getItem("sb_targetJobTitle");
      if (storedTitle) title = storedTitle;
    }
  } catch {
    /* noop */
  }

  return { code: isAnzscoCode(code) ? code : "", title };
}

/**
 * Props:
 * - targetJobCode?: string   // 6-digit ANZSCO (e.g. "261313")
 * - targetJobTitle?: string
 * - limit?: number           // number of courses to request (default 10)
 */
export default function TrainingGuidance({
  targetJobCode,
  targetJobTitle,
  limit = 10,
}) {
  // 1) Resolve single code + title
  const resolved = useMemo(
    () => resolveTargetFromContext(targetJobCode, targetJobTitle),
    [targetJobCode, targetJobTitle]
  );
  const { code: anzscoCode, title: occupationTitle } = resolved;

  // 2) Local state for fetching courses
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [courses, setCourses] = useState([]);

  // 3) Fetch training advice once code is available
  useEffect(() => {
    let aborted = false;
    const ctrl = new AbortController();

    const run = async () => {
      // No valid code → show error and bail
      if (!isAnzscoCode(anzscoCode)) {
        setErr("No occupation code found. Please go back and select a job first.");
        setCourses([]);
        try {
          sessionStorage.removeItem("sb_training_advice");
        } catch {}
        return;
      }

      setLoading(true);
      setErr("");
      setCourses([]);

      try {
        const res = await getTrainingAdvice({
          anzscoCode,
          limit,
          signal: ctrl.signal,
        });
        if (aborted) return;

        const list = Array.isArray(res?.courses) ? res.courses : [];
        setCourses(list);

        // Cache a compact payload for Profile page
        const advicePayload = {
          anzsco: res?.anzsco?.code || anzscoCode,
          title: res?.anzsco?.title || occupationTitle || "",
          found: list.length,
          generatedAt: new Date().toISOString(),
          items: list.map((course) => ({
            tgaCode:
              course.code ||
              course.raw?.vet_course_code ||
              course.raw?.course_code ||
              course.raw?.code ||
              "",
            title:
              course.name ||
              course.raw?.course_name ||
              course.code ||
              "(Unnamed course)",
          })),
        };
        try {
          sessionStorage.setItem("sb_training_advice", JSON.stringify(advicePayload));
        } catch {}
      } catch (e) {
        if (aborted || e?.name === "AbortError") return;
        setErr(e?.message || "Failed to load training advice.");
        setCourses([]);
        try {
          sessionStorage.removeItem("sb_training_advice");
        } catch {}
      } finally {
        if (!aborted) setLoading(false);
      }
    };

    run();
    return () => {
      aborted = true;
      ctrl.abort();
    };
  }, [anzscoCode, occupationTitle, limit]);

  const headerTitle = useMemo(() => {
    const name = occupationTitle || anzscoCode || "Occupation";
    return `Training recommendations - ${name}`;
  }, [occupationTitle, anzscoCode]);

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
            {anzscoCode ? <Text type="secondary">ANZSCO: {anzscoCode}</Text> : null}
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
                  {item.code ? <Text type="secondary">Course code: {item.code}</Text> : null}
                </Space>
              </List.Item>
            )}
          />
        )}
      </SectionBox>
    </>
  );
}
