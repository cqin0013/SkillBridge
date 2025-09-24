import React, { useEffect, useState } from "react";
import { Card, Descriptions, Drawer, Typography, Button } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import DraggableBadgePortal from "../DraggableBadgePortal";

const { Text } = Typography;

export interface PrevSummaryProps {
  pillText?: string;
  roles?: string[];
  locationLabel?: string;
  industries?: string[];
  abilitiesCount?: number;
  targetJobTitle?: string;
  targetJobCode?: string | number;
  /** Main content container selector; MUST match your MainLayout's <main id="main-content"> */
  containerSelector?: string; // default "#main-content"
}

function formatValue(val: unknown): string | number {
  if (Array.isArray(val)) return val.length > 0 ? val.join(" ; ") : "—";
  if (typeof val === "string") return (val as string).trim() || "—";
  if (typeof val === "number") return val as number;
  return "—";
}

const PrevSummary: React.FC<PrevSummaryProps> = ({
  pillText = "Your info",
  roles,
  locationLabel,
  industries,
  abilitiesCount,
  targetJobTitle,
  targetJobCode,
  containerSelector = "#main-content", // ✅ make sure this matches MainLayout
}) => {
  const [width, setWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1500
  );
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const hasRoles = Array.isArray(roles) && roles.length > 0;
  const hasIndustries = Array.isArray(industries) && industries.length > 0;
  const hasLocation =
    typeof locationLabel === "string" && locationLabel.trim().length > 0;
  const hasAbilities = Number.isFinite(abilitiesCount);
  const hasTargetJob =
    (typeof targetJobTitle === "string" && targetJobTitle.trim().length > 0) ||
    (typeof targetJobCode !== "undefined" &&
      String(targetJobCode).trim().length > 0);

  const contentExists =
    hasRoles || hasLocation || hasIndustries || hasAbilities || hasTargetJob;

  const DetailContent = contentExists ? (
    <Descriptions column={1} size="small" colon={false}>
      {hasRoles && (
        <Descriptions.Item label="Past roles">
          <div>{formatValue(roles)}</div>
        </Descriptions.Item>
      )}
      {hasLocation && (
        <Descriptions.Item label="Target location">
          <div>{formatValue(locationLabel)}</div>
        </Descriptions.Item>
      )}
      {hasIndustries && (
        <Descriptions.Item label="Target industries">
          <div>{formatValue(industries)}</div>
        </Descriptions.Item>
      )}
      {hasAbilities && (
        <Descriptions.Item label="Abilities">
          <div>{abilitiesCount}</div>
        </Descriptions.Item>
      )}
      {hasTargetJob && (
        <Descriptions.Item label="Target job">
          <div>{targetJobTitle || targetJobCode || "—"}</div>
        </Descriptions.Item>
      )}
    </Descriptions>
  ) : (
    <div style={{ color: "rgba(0,0,0,.45)", fontStyle: "italic" }}>
      No information yet.
    </div>
  );

  const showDesktopCard = width >= 1500 && contentExists;
  const showMidTab = width >= 1000 && width < 1500;
  const showBadge = width < 1000;

  return (
    <>
      {showDesktopCard && (
        <Card
          size="small"
          variant="outlined"
          title={<Text type="secondary">{pillText}</Text>}
        >
          {DetailContent}
        </Card>
      )}

      {showMidTab && (
        <div className="my-2">
          <Button
            type="default"
            onClick={() => setOpen(true)}
            className="!h-10 !px-4 !rounded-full shadow-sm border border-black/10 hover:shadow-md hover:border-black/20"
            icon={<InfoCircleOutlined />}
          >
            {pillText}
          </Button>
        </div>
      )}

      <Drawer
        title={<Text type="secondary">{pillText}</Text>}
        placement="right"
        width={Math.min(420, Math.max(300, width * 0.9))}
        open={open}
        onClose={() => setOpen(false)}
        maskClosable
        destroyOnHidden
      >
        {DetailContent}
      </Drawer>

      {showBadge && (
        <DraggableBadgePortal
          containerSelector="#main-content"     // mount inside main (below header)
          onClick={() => setOpen(true)}
          icon={<InfoCircleOutlined />}
          size={56}
          margin={12}
          storageKey="prev-summary-badge-pos"
          initialEdge="left"
          initialVertical="top"                 // start near the top
          lockVertical="none"                   // ✅ no vertical lock; free Y movement
          snapToEdge                            // keep horizontal edge snapping
          bgClassName="bg-blue-600 dark:bg-blue-500"
          textClassName="text-white"
          className="shadow-md"                 // or "shadow-none" if you want no shadow
          iconSize={22}
          moveThreshold={4}                     // responsive drag, avoids mis-click
          zIndex={90}                              
        />
      )}
    </>
  );
};

export default PrevSummary;
