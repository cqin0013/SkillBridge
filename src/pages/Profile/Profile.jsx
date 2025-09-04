// /pages/profile/Profile.jsx
import React, { useEffect, useState, useRef } from "react";
import { Card, Empty, Button, Drawer, Space, Popconfirm, message } from "antd";
import dayjs from "dayjs";
import { getRoadmap, clearRoadmap } from "../../utils/roadmapStore";
import { exportNodeToPdf } from "../../utils/exportPDF";
import Roadmap from "../../components/ui/RoadMap"; // 注意大小写与文件名一致
import RoadmapEditor from "../../components/ui/RoadmapEditor";

// ✅ 引入 StageBox
import StageBox from "../../components/ui/StageBox";

export default function Profile() {
  const [steps, setSteps] = useState([]);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const roadmapRef = useRef(null);

  useEffect(() => {
    const data = getRoadmap();
    setSteps(data?.steps || []);
  }, []);

  const onEdit = () => setOpen(true);
  const onClose = (updated) => {
    if (updated) setSteps(updated);
    setOpen(false);
  };

  const onClear = () => {
    clearRoadmap();
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
      <Card
        title="My Learning Roadmap"
        extra={
          <Space wrap>
            {steps?.length > 0 && (
              <>
                <Button onClick={onEdit} type="primary">
                  Edit Roadmap
                </Button>
                <Button onClick={onExportPdf} loading={exporting}>
                  Export PDF
                </Button>
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
        {/* ✅ 顶部 StageBox，统一引导信息 */}
        <StageBox
          pill="Step: Roadmap"
          title="Roadmap Overview"
          subtitle="Follow the stages below to track your progress."
          tipTitle="How to use this page"
          tipContent={
            <>
              <p>
                This page shows your learning or project roadmap. Each stage has a title,
                optional date, and a short description.
              </p>
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
          // ✅ 只保留实际 Roadmap 内容，不再重复按钮
          <div ref={roadmapRef}>
            <Roadmap steps={steps} />
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <Empty description="You already match your target job well. No roadmap needed." />
            <div style={{ marginTop: 12 }}>
              <Space>
                <Button type="primary" onClick={() => setOpen(true)}>
                  Create / Edit Roadmap
                </Button>
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
        destroyOnClose
      >
        <RoadmapEditor initial={steps} onClose={onClose} />
      </Drawer>
    </div>
  );
}
