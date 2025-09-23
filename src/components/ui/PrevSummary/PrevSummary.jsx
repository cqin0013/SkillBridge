
import { Card, Descriptions, Typography } from "antd";
import useResponsive from "../../../lib/hooks/useResponsive";
import "./PrevSummary.css";

const { Text } = Typography;

const formatValue = (val) => {
  if (Array.isArray(val)) return val.length > 0 ? val.join(" ; ") : "—";
  if (typeof val === "string") return val.trim() || "—";
  if (typeof val === "number") return val;
  return "—";
};

export default function PrevSummary({
  pillText = "Your info",
  roles,
  locationLabel,
  industries,
  abilitiesCount,
  targetJobTitle,
  targetJobCode,
}) {
 
  const { isDesktop } = useResponsive();
  if (!isDesktop) return null;

  const hasRoles = Array.isArray(roles) && roles.length > 0;
  const hasIndustries = Array.isArray(industries) && industries.length > 0;
  const hasLocation = typeof locationLabel === "string" && locationLabel.trim().length > 0;
  const hasAbilities = Number.isFinite(abilitiesCount);
  const hasTargetJob = Boolean(
    (targetJobTitle && targetJobTitle.trim()) ||
    (targetJobCode && String(targetJobCode).trim())
  );

  const shouldRender = hasRoles || hasLocation || hasIndustries || hasAbilities || hasTargetJob;
  if (!shouldRender) return null;

  return (
    <Card
      className="prev-summary-card"
      size="small"
      variant="outlined" 
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
            <div className="prev-wrap">{targetJobTitle || targetJobCode || "—"}</div>
          </Descriptions.Item>
        )}
      </Descriptions>
    </Card>
  );
}
