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
import SkillLevelCard from "../../components/ui/SkillLevelCard/SkillLevelCard.jsx";
import TrainingGuidanceCard from "../../components/ui/TrainingGuidanceCard/TrainingGuidanceCard.jsx";
import { INDUSTRY_OPTIONS } from "../../lib/constants/industries";

//  use cache.js instead of roadmapStore
import { getCache, delCache } from "../../utils/cache";

/** Fallback mock advice (from your screenshot) when nothing is provided */
const MOCK_ADVICE = {
  anzsco: "411711",
  found: 0,
  items: [
    {
      tgaCode: "52909WA",
      title: "Advanced Diploma of Indigenous Pastoral Ministry",
      componentType: ["AccreditedCourse"],
      advice: null,
      link: "https://training.gov.au/Training/Details/52909WA",
    },
    {
      tgaCode: "11076NAT",
      title: "Diploma of Leadership in Disability Services",
      componentType: ["AccreditedCourse"],
      advice: null,
      link: "https://training.gov.au/Training/Details/11076NAT",
    },
    {
      tgaCode: "52908WA",
      title: "Advanced Diploma of Indigenous Ministry and Lifestyle Health Promotion",
      componentType: ["AccreditedCourse"],
      advice: null,
      link: "https://training.gov.au/Training/Details/52908WA",
    },
  ],
  note: "No UsageRecommendations in TGA; returned top matches with detail links.",
};

export default function Profile() {
  const [steps, setSteps] = useState([]);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const roadmapRef = useRef(null);

  // Collapsibles
  const [infoOpen, setInfoOpen] = useState(true);
  const [roadmapCollapsed, setRoadmapCollapsed] = useState(false);
  const [skillBoxOpen, setSkillBoxOpen] = useState(true);
  const [adviceBoxOpen, setAdviceBoxOpen] = useState(true);

  // PrevSummary data
  const [prev, setPrev] = useState({
    roles: [],
    stateCode: "All",
    industryIds: [],
    targetJobTitle: "",
    targetJobCode: "",
    abilitiesCount: 0,
  });

  // Training bits for the two SectionBoxes
  const [skillLevel, setSkillLevel] = useState(1); // default to 1
  const [adviceData, setAdviceData] = useState(null);

  // Load roadmap + prev summary + training session data
  useEffect(() => {
    //  read roadmap from cache (key 'roadmap' → stored under 'sb_roadmap')
    const cached = getCache("roadmap");
    const loadedSteps = Array.isArray(cached)
      ? cached
      : Array.isArray(cached?.steps)
      ? cached.steps
      : [];
    setSteps(loadedSteps);

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

      // Training related from sessionStorage (with sensible defaults)
      const slRaw = sessionStorage.getItem("sb_skill_level");
      setSkillLevel(slRaw ? Number(slRaw) : 1);

      const advRaw = sessionStorage.getItem("sb_training_advice");
      setAdviceData(advRaw ? JSON.parse(advRaw) : MOCK_ADVICE);
    } catch {
      // On any parse error, still provide defaults
      setSkillLevel(1);
      setAdviceData(MOCK_ADVICE);
    }
  }, []);

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
    //  clear only roadmap key
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
      {/*  Collapsible: Your info  */}
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
                  <p style={{ color: "#b91c1c", fontWeight: 600 }}>
                    Notice: If the Analyzer test was not completed or you didn’t select to
                    generate a roadmap, nothing will be shown here automatically.
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

      {/* Two SectionBoxes */}
      <div style={{ marginTop: 16 }}>
        <Collapse
          activeKey={skillBoxOpen ? ["skill"] : []}
          onChange={(keys) => setSkillBoxOpen((keys || []).includes("skill"))}
          style={{ marginBottom: 12 }}
          items={[
            {
              key: "skill",
              label: `Required skill level — ${prev.targetJobTitle || prev.targetJobCode || "-"}`,
              children: (
                <SectionBox variant="question" title={null /* header handled by Collapse label */}>
                  <SkillLevelCard
                    skillLevel={skillLevel ?? 1}
                    occupationTitle={prev.targetJobTitle}
                    anzscoCodeLike={prev.targetJobCode}
                  />
                </SectionBox>
              ),
            },
          ]}
        />

        <Collapse
          activeKey={adviceBoxOpen ? ["advice"] : []}
          onChange={(keys) => setAdviceBoxOpen((keys || []).includes("advice"))}
          items={[
            {
              key: "advice",
              label: "Training guidance",
              children: (
                <SectionBox variant="question" title={null}>
                  <TrainingGuidanceCard
                    data={adviceData || MOCK_ADVICE}
                    occupationTitle={prev.targetJobTitle}
                    anzscoCodeLike={prev.targetJobCode}
                    addressText={"Melbourne VIC 3000"}
                  />
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
