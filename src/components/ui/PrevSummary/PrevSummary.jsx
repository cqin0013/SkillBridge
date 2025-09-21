// src/components/PrevSummary/PrevSummary.jsx
import React from "react";
import { Card, Descriptions, Typography } from "antd";
import useResponsive from "../../../lib/hooks/useResponsive"; // { isDesktop, isTablet, isMobile }
import "./PrevSummary.css";

const { Text } = Typography;

/**
 * formatValue
 * - If the value is an array, join with semicolons.
 * - If it's a string, trim whitespace.
 * - If it's a number, return as-is.
 * - Otherwise return an em dash ("—").
 */
const formatValue = (val) => {
  if (Array.isArray(val)) {
    return val.length > 0 ? val.join(" ; ") : "—";
  }
  if (typeof val === "string") {
    return val.trim() || "—";
  }
  if (typeof val === "number") {
    return val;
  }
  return "—";
};

/**
 * PrevSummary
 * Small summary card that lists previously provided inputs:
 * roles, target location, industries, abilities count, and target job.
 *
 * Requirement (from user): hide this card on mobile screens.
 * We use the project's `useResponsive()` hook and early-return `null` when `isMobile` is true.
 */
export default function PrevSummary({
  pillText = "Your info",
  roles,
  locationLabel,
  industries,
  abilitiesCount,
  targetJobTitle,
  targetJobCode,
}) {
  // Hide on mobile: width < 768px based on your useResponsive.js
  const { isMobile } = useResponsive();
  if (isMobile) return null;

  const hasRoles = Array.isArray(roles) && roles.length > 0;
  const hasIndustries = Array.isArray(industries) && industries.length > 0;
  const hasLocation =
    typeof locationLabel === "string" && locationLabel.trim().length > 0;
  const hasAbilities = Number.isFinite(abilitiesCount);
  const hasTargetJob = Boolean(
    (targetJobTitle && targetJobTitle.trim()) ||
      (targetJobCode && String(targetJobCode).trim())
  );

  const shouldRender =
    hasRoles || hasLocation || hasIndustries || hasAbilities || hasTargetJob;
  if (!shouldRender) return null;

  return (
    <Card
      className="prev-summary-card"
      size="small"
      bordered
      title={<Text type="secondary">{pillText}</Text>}
    >
      <Descriptions column={1} size="small" colon={false}>
        {hasRoles && (
          <Descriptions.Item label="Past roles">
            <div className="prev-wrap">{formatValue(roles)}</div>
          </Descriptions.Item>
        )}

        {hasLocation && (
          <Descriptions.Item label="Target location">
            <div className="prev-wrap">{formatValue(locationLabel)}</div>
          </Descriptions.Item>
        )}

        {hasIndustries && (
          <Descriptions.Item label="Target industries">
            <div className="prev-wrap">{formatValue(industries)}</div>
          </Descriptions.Item>
        )}

        {hasAbilities && (
          <Descriptions.Item label="Abilities">
            <div className="prev-wrap">{abilitiesCount}</div>
          </Descriptions.Item>
        )}

        {hasTargetJob && (
          <Descriptions.Item label="Target job">
            <div className="prev-wrap">
              {targetJobTitle || targetJobCode || "—"}
            </div>
          </Descriptions.Item>
        )}
      </Descriptions>
    </Card>
  );
}
