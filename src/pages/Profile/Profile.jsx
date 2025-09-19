// /pages/profile/Profile.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, Empty, Button, Drawer, Space, Popconfirm, message } from "antd";
import dayjs from "dayjs";
import { getRoadmap, clearRoadmap } from "../../utils/roadmapStore";
import { exportNodeToPdf } from "../../utils/exportPDF";
import Roadmap from "../../components/ui/RoadMap/RoadMap.jsx";
import RoadmapEditor from "../../components/ui/RoadMap/RoadmapEditor";
import StageBox from "../../components/ui/StageBox/StageBox";
import PrevSummary from "../../components/ui/PrevSummary/PrevSummary";
import { INDUSTRY_OPTIONS } from "../../lib/constants/industries";

export default function Profile() {
  const [steps, setSteps] = useState([]);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const roadmapRef = useRef(null);

  // PrevSummary data
  const [prev, setPrev] = useState({
    roles: [],
    stateCode: "All",
    industryIds: [],
    targetJobTitle: "",
    targetJobCode: "",
    abilitiesCount: 0,
  });

  // 兼容数组 & 对象两种返回
  useEffect(() => {
    const data = getRoadmap();
    setSteps(Array.isArray(data) ? data : (data?.steps || []));
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
    } catch {}
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
  const onClose = (updated) => { if (updated) setSteps(updated); setOpen(false); };
  const onClear = () => { clearRoadmap(); setSteps([]); message.success("Roadmap cleared."); };

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
      <div style={{ marginBottom: 12 }}>
        <PrevSummary
          pillText="Your info"
          roles={prev.roles}
          locationLabel={prev.stateCode}
          industries={industryNames}
          abilitiesCount={prev.abilitiesCount}
          targetJobTitle={prev.targetJobTitle}
          targetJobCode={prev.targetJobCode}
        />
      </div>

      <Card
        title="My Learning Roadmap"
        extra={
          <Space wrap>
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
      </Card>

      <Drawer
        title={steps?.length ? "Edit Learning Roadmap" : "Create Learning Roadmap"}
        width={820}
        open={open}
        onClose={() => onClose()}
        destroyOnHidden   // fix deprecated destroyOnClose
      >
        <RoadmapEditor initial={steps} onClose={onClose} />
      </Drawer>
    </div>
  );
}
