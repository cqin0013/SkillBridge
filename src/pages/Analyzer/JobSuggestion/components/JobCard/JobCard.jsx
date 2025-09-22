// src/pages/Analyzer/JobSuggestion/components/JobCard/JobCard.jsx
// Purpose: Render a job suggestion; allow picking a sub-occupation (ANZSCO code) provided by backend.
// Also show region-based shortage for the selected code, and display industry = first digit of code.
// Comments are written in English.

import React, { useEffect, useMemo, useState } from "react";
import { Button, Select, Tooltip, Typography, Tag } from "antd";
import "./JobCard.css";
import { getShortageByCodeAndRegion } from "../../../../../lib/api/AnzscoDemandApi";

const { Paragraph, Text } = Typography;

/**
 * Props
 * - item: {
 *     title: string,
 *     score: number,
 *     anzscoOptions?: Array<{
 *       code: string,            // 6-digit code string
 *       title?: string,          // sub-occupation title
 *       description?: string,    // sub-occupation description
 *       industry?: string|null,  // first digit of code (filled by normalizer); may be absent
 *     }>
 *   }
 * - selected: boolean                 // whether this job card is currently selected
 * - pickedCode: string|null           // currently chosen sub-occupation code for this job
 * - onPickAnzsco: (code: string)=>void
 * - onSelect: () => void
 * - regionPref: string                // user's region preference; "all" will map to "national"
 */
export default function JobCard({
  item,
  selected,
  pickedCode,
  onPickAnzsco,
  onSelect,
  regionPref = "all",
}) {
  // Turn backend-provided sub-occupations into AntD options for the <Select>.
  const antOptions = useMemo(
    () =>
      (item?.anzscoOptions || []).map((o) => ({
        value: o.code,
        label: `${o.code} — ${o.title || "Untitled"}`,
      })),
    [item?.anzscoOptions]
  );

  // Find the selected sub-occupation to display title/description/industry.
  const selectedOption = useMemo(
    () => (item?.anzscoOptions || []).find((o) => o.code === pickedCode) || null,
    [item?.anzscoOptions, pickedCode]
  );

  // Region shortage state for the selected sub-occupation.
  const [shortage, setShortage] = useState(null);
  const [loadingShortage, setLoadingShortage] = useState(false);

  // Fetch shortage whenever the chosen code or region preference changes.
  useEffect(() => {
    let ignore = false;
    async function run() {
      if (!pickedCode) {
        setShortage(null);
        return;
      }
      try {
        setLoadingShortage(true);
        const { shortage } = await getShortageByCodeAndRegion({
          anzscoCode: pickedCode,
          region: regionPref,
        });
        if (!ignore) setShortage(shortage ?? null);
      } catch {
        if (!ignore) setShortage(null);
      } finally {
        if (!ignore) setLoadingShortage(false);
      }
    }
    run();
    return () => {
      ignore = true;
    };
  }, [pickedCode, regionPref]);

  // Render a small tag based on shortage text.
  const shortageTag = useMemo(() => {
    if (!pickedCode) return null;
    if (loadingShortage) return <Tag>Checking…</Tag>;
    if (!shortage) return <Tag>Unknown</Tag>;
    const val = String(shortage).toLowerCase();
    if (val.includes("shortage")) return <Tag color="red">Shortage</Tag>;
    if (val.includes("no") || val.includes("surplus")) return <Tag color="green">No shortage</Tag>;
    return <Tag>{shortage}</Tag>;
  }, [pickedCode, shortage, loadingShortage]);

  // Derive industry from code if normalizer did not set it (fallback).
  const industry =
    selectedOption?.industry ??
    (pickedCode && pickedCode.length > 0 ? pickedCode[0] : null);

  return (
    <div className="job-card">
      <div className="job-card__header">
        <div className="job-card__title">{item.title}</div>
        <div className="job-card__score">Match: {item.score}%</div>
      </div>

      {/* Sub-occupation picker */}
      <div className="job-card__anzsco">
        <div className="job-card__subttl">Select sub-occupation for this role</div>
        <Select
          placeholder="Choose sub-occupation"
          value={pickedCode || undefined}
          onChange={(v) => onPickAnzsco && onPickAnzsco(v)}
          style={{ width: "100%" }}
          options={antOptions}
        />

        {/* Hint when no sub-occupations exist */}
        {(!item?.anzscoOptions || item.anzscoOptions.length === 0) && (
          <Paragraph type="secondary" style={{ marginTop: 8 }}>
            No sub-occupations available for this job.
          </Paragraph>
        )}

        {/* Selected sub-occupation details */}
        {selectedOption && (
          <div className="job-card__anzsco-detail">
            <div className="job-card__anzsco-title">
              {selectedOption.code} — {selectedOption.title || "Untitled"}
            </div>

            {/* Industry = first digit of code */}
            {industry && (
              <Paragraph className="job-card__anzsco-industry">
                Industry: {industry}
              </Paragraph>
            )}

            {selectedOption.description && (
              <Paragraph className="job-card__anzsco-desc">
                {selectedOption.description}
              </Paragraph>
            )}

            {/* Region-aware shortage indicator */}
            <div className="job-card__anzsco-shortage">
              <Text type="secondary">
                Region: {String(regionPref || "all").toUpperCase()} (ALL → NATIONAL)
              </Text>
              <span style={{ marginLeft: 8 }}>{shortageTag}</span>
            </div>
          </div>
        )}
      </div>

      {/* Primary action: select this job */}
      <div className="job-card__actions">
        <Tooltip title="Choose this as your target job">
          <Button type={selected ? "primary" : "default"} onClick={onSelect}>
            {selected ? "Selected" : "Select this job"}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
