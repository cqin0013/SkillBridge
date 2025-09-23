// Purpose: Render a job suggestion; allow picking a sub-occupation (ANZSCO code).
// Mobile fix: dropdown options wrap to multiple lines and are not width-limited by the trigger.

import { useEffect, useMemo, useState } from "react";
import { Button, Select, Tooltip, Typography, Tag } from "antd";
import "./JobCard.css";
import { getShortageByCodeAndRegion } from "../../../../../lib/api/AnzscoDemandApi";
import useResponsive from "../../../../../lib/hooks/useResponsive";

const { Paragraph, Text } = Typography;

/** Map API shortage text to normalized display text + color. */
function mapShortageDisplay(raw) {
  if (raw == null || String(raw).trim() === "") {
    return { text: "not in the shortage list", color: undefined };
  }
  const val = String(raw).trim().toLowerCase().replace(/\s+/g, " ");
  if (/\bno\s*shortage\b/.test(val) || /\bsurplus\b/.test(val)) {
    return { text: "no shortage", color: "green" };
  }
  if (/\bshortage\b/.test(val)) {
    return { text: "shortage", color: "red" };
  }
  return { text: String(raw), color: undefined };
}

/**
 * Props
 * - item: {
 *     title: string,
 *     score: number,
 *     anzscoOptions?: Array<{ code: string, title?: string, description?: string, industry?: string|null }>
 *   }
 * - selected: boolean
 * - pickedCode: string|null
 * - onPickAnzsco: (code: string)=>void
 * - onSelect: () => void
 * - regionPref: string
 */
export default function JobCard({
  item,
  selected,
  pickedCode,
  onPickAnzsco,
  onSelect,
  regionPref = "all",
}) {
  const { isMobile } = useResponsive();
  const controlSize = isMobile ? "middle" : "large";
  const actionBtnSize = isMobile ? "middle" : "large";

  // Build a ReactNode label that can wrap on small screens.
  const buildOptionLabel = (o) => (
    <div className="jobcard-option">
      <span className="jobcard-code">{o.code}</span>
      <span className="jobcard-sep"> — </span>
      <span className="jobcard-title">{o.title || "Untitled"}</span>
    </div>
  );

  // Prepare Select options; provide a string field `search` for filtering.
  const antOptions = useMemo(
    () =>
      (item?.anzscoOptions || []).map((o) => ({
        value: o.code,
        label: buildOptionLabel(o),
        search: `${o.code} ${o.title || ""}`.trim(),
      })),
    [item?.anzscoOptions]
  );

  const selectedOption = useMemo(
    () => (item?.anzscoOptions || []).find((o) => o.code === pickedCode) || null,
    [item?.anzscoOptions, pickedCode]
  );

  const [shortage, setShortage] = useState(null);
  const [loadingShortage, setLoadingShortage] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function run() {
      if (!pickedCode) {
        setShortage(null);
        return;
      }
      try {
        setLoadingShortage(true);
        const { shortage: s } = await getShortageByCodeAndRegion({
          anzscoCode: pickedCode,
          region: regionPref,
        });
        if (!ignore) setShortage(s ?? null);
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

  const shortageTag = useMemo(() => {
    if (!pickedCode) return null;
    if (loadingShortage) return <Tag>checking shortage status…</Tag>;
    const { text, color } = mapShortageDisplay(shortage);
    return <Tag color={color}>{text}</Tag>;
  }, [pickedCode, shortage, loadingShortage]);

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
          className="job-card__select"
          placeholder="Choose sub-occupation"
          value={pickedCode || undefined}
          onChange={(v) => onPickAnzsco && onPickAnzsco(v)}
          style={{ width: "100%" }}
          size={controlSize}
          options={antOptions}
          showSearch
          optionFilterProp="search"               // search against our custom string
          dropdownMatchSelectWidth={false}        // dropdown can be wider than trigger
          dropdownStyle={{
            maxWidth: "92vw",
            minWidth: isMobile ? "92vw" : 480,   // give room on phones
          }}
          listHeight={isMobile ? 320 : 360}       // a bit taller on phones
          getPopupContainer={(t) => t.parentElement} // position within card to avoid viewport issues
        />

        {(!item?.anzscoOptions || item.anzscoOptions.length === 0) && (
          <Paragraph type="secondary" style={{ marginTop: 8 }}>
            No sub-occupations available for this job.
          </Paragraph>
        )}

        {selectedOption && (
          <div className="job-card__anzsco-detail">
            <div className="job-card__anzsco-title">
              {selectedOption.code} — {selectedOption.title || "Untitled"}
            </div>

            {industry && (
              <Paragraph className="job-card__anzsco-industry">Industry: {industry}</Paragraph>
            )}

            {selectedOption.description && (
              <Paragraph className="job-card__anzsco-desc">{selectedOption.description}</Paragraph>
            )}

            <div className="job-card__anzsco-shortage">
              <Text type="secondary">Shortage status at your target location:</Text>
              <span style={{ marginLeft: 8 }}>{shortageTag}</span>
            </div>
          </div>
        )}
      </div>

      {/* Primary action */}
      <div className="job-card__actions">
        <Tooltip title="Choose this as your target job">
          <Button size={actionBtnSize} type={selected ? "primary" : "default"} onClick={onSelect}>
            {selected ? "Selected" : "Select this job"}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
