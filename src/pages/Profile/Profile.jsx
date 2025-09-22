// /src/pages/profile/Profile.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, Empty, Button, Drawer, Space, Popconfirm, message, Collapse } from "antd";
import dayjs from "dayjs";

import { exportNodeToPdf } from "../../utils/exportPDF";
import Roadmap from "../../components/ui/RoadMap/RoadMap.jsx";
import RoadmapEditor from "../../components/ui/RoadMap/RoadmapEditor";
import StageBox from "../../components/ui/StageBox/StageBox";
import PrevSummary from "../../components/ui/PrevSummary/PrevSummary";
import SectionBox from "../../components/ui/SectionBox/SectionBox";
import TrainingGuidanceCard from "../../components/ui/TrainingGuidanceCard/TrainingGuidanceCard.jsx";
import { INDUSTRY_OPTIONS } from "../../lib/constants/industries";

// use cache.js instead of roadmapStore
import { getCache, delCache } from "../../utils/cache";

export default function Profile() {
  const [steps, setSteps] = useState([]);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const roadmapRef = useRef(null);

  // Collapsibles
  const [infoOpen, setInfoOpen] = useState(true);
  const [roadmapCollapsed, setRoadmapCollapsed] = useState(false);
  const [adviceBoxOpen, setAdviceBoxOpen] = useState(true);

  // PrevSummary data (loaded from session)
  const [prev, setPrev] = useState({
    roles: [],
    stateCode: "All",
    industryIds: [],
    targetJobTitle: "",
    targetJobCode: "",
    abilitiesCount: 0,
  });

  // Training guidance payload (no mock fallback)
  const [adviceData, setAdviceData] = useState(null);

  // Load roadmap + prev summary + training session data
  useEffect(() => {
    // 1) read roadmap from cache (key 'roadmap' → stored under 'sb_roadmap')
    const cached = getCache("roadmap");
    const loadedSteps = Array.isArray(cached)
      ? cached
      : Array.isArray(cached?.steps)
      ? cached.steps
      : [];
    setSteps(loadedSteps);

    // 2) read profile snapshot for PrevSummary
    try {
      const raw = sessionStorage.getItem("sb_profile_prev");
      const base = raw ? JSON.parse(raw) : {};

      let abilitiesCount = base?.abilitiesCount ?? 0;
      if (!abilitiesCount) {
        const metaRaw = sessionStorage.getItem("sb_selections_meta");
        const meta = metaRaw ? JSON.parse(metaRaw) : null;
        abilitiesCount = meta?.counts?.total ?? 0;
      }

      setPrev({
        roles: base?.roles || [],
        stateCode: base?.stateCode || "All",
        industryIds: base?.industryIds || [],
        targetJobTitle: base?.targetJobTitle || "",
        targetJobCode: base?.targetJobCode || "",
        abilitiesCount,
      });

      // 3) read training advice (no mock; show empty if absent)
      const advRaw = sessionStorage.getItem("sb_training_advice");
      setAdviceData(advRaw ? JSON.parse(advRaw) : null);
    } catch {
      // On any parse error, still provide minimal defaults (no mock)
      setAdviceData(null);
    }
  }, []);

  // Map industry id -> name
  const industryNameMap = useMemo(() => {
    const m = new Map();
    (INDUSTRY_OPTIONS || []).forEach((o) => m.set(o.id, o.name));
    return m;
  }, []);
  const industryNames = useMemo(
    () => (prev.industryIds || []).map((id) => industryNameMap.get(id) || id),
    [prev.industryIds, industryNameMap]
  );

  const onEdit = () => setOpen(true);

  // Editor closes; when user clicked Save, it passes updated steps
  const onEditorClose = (updated) => {
    if (updated) setSteps(updated);
    setOpen(false);
  };

  const onClear = () => {
    // clear only roadmap key
    delCache("roadmap");
    setSteps([]);
    message.success("Roadmap cleared.");
  };

  const onExportPdf = async () => {
    if (!roadmapRef.current) return;
    try {
      setExporting(true);
      const filename = `Roadmap_${dayjs().format("YYYYMMDD_HHmm")}.pdf`;
      await exportNodeToPdf(roadmapRef.current, filename);
      message.success("Roadmap PDF exported.");
    } catch (e) {
      console.error(e);
      message.error("Failed to export PDF.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container" style={{ padding: 16 }}>
      {/* Collapsible: Your info */}
      <Collapse
        activeKey={infoOpen ? ["info"] : []}
        onChange={(keys) => setInfoOpen((keys || []).includes("info"))}
        style={{ marginBottom: 12 }}
        items={[
          {
            key: "info",
            label: "Your info",
            children: (
              <PrevSummary
                pillText="Your info"
                roles={prev.roles}
                locationLabel={prev.stateCode}
                industries={industryNames}
                abilitiesCount={prev.abilitiesCount}
                targetJobTitle={prev.targetJobTitle}
                targetJobCode={prev.targetJobCode}
              />
            ),
          },
        ]}
      />

      {/* Collapsible Roadmap Card */}
      <Card
        title="My Learning Roadmap"
        extra={
          <Space wrap>
            <Button onClick={() => setRoadmapCollapsed((v) => !v)}>
              {roadmapCollapsed ? "Expand" : "Collapse"}
            </Button>
            {steps?.length > 0 && (
              <>
                <Button onClick={onEdit} type="primary">Edit Roadmap</Button>
                <Button onClick={onExportPdf} loading={exporting}>Export PDF</Button>
                <Popconfirm
                  title="Clear roadmap?"
                  description="This will remove all steps in your roadmap."
                  okText="Clear"
                  cancelText="Cancel"
                  onConfirm={onClear}
                >
                  <Button danger>Clear</Button>
                </Popconfirm>
              </>
            )}
          </Space>
        }
      >
        {!roadmapCollapsed && (
          <>
            <StageBox
              pill="Step: Roadmap"
              title="Roadmap Overview"
              subtitle="Follow the stages below to track your progress."
              tipTitle="How to use this page"
              tipContent={
                <>
                  <p>This page shows your learning or project roadmap. Each stage has a title, optional date, and a short description.</p>
                  <p>
                    Use <strong>Edit Roadmap</strong> to add, remove, or reorder stages.
                    Click <strong>Export PDF</strong> to download a snapshot of your current roadmap.
                    If your goals change, you can <strong>Clear</strong> and rebuild the plan anytime.
                  </p>
                </>
              }
              defaultTipOpen={true}
            />

            {steps?.length ? (
              <div ref={roadmapRef}>
                <Roadmap steps={steps} />
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <Empty description="You already match your target job well. No roadmap needed." />
                <div style={{ marginTop: 12 }}>
                  <Space>
                    <Button type="primary" onClick={() => setOpen(true)}>Create / Edit Roadmap</Button>
                    <Button disabled>Export PDF</Button>
                  </Space>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Training guidance section (no mock; show empty if no data) */}
      <div style={{ marginTop: 16 }}>
        <Collapse
          activeKey={adviceBoxOpen ? ["advice"] : []}
          onChange={(keys) => setAdviceBoxOpen((keys || []).includes("advice"))}
          items={[
            {
              key: "advice",
              label: "Training guidance",
              children: (
                <SectionBox variant="question" title={null}>
                  {adviceData ? (
                    <TrainingGuidanceCard
                      data={adviceData}
                      occupationTitle={prev.targetJobTitle}
                      anzscoCodeLike={prev.targetJobCode}
                      addressText={"Melbourne VIC 3000"}
                    />
                  ) : (
                    <Empty description="No training guidance available." />
                  )}
                </SectionBox>
              ),
            },
          ]}
        />
      </div>

      <Drawer
        title={steps?.length ? "Edit Learning Roadmap" : "Create Learning Roadmap"}
        width={820}
        open={open}
        onClose={() => onEditorClose()}
      >
        <RoadmapEditor initial={steps} onClose={onEditorClose} />
      </Drawer>
    </div>
  );
}
