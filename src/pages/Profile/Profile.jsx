// /pages/profile/Profile.jsx
import React, { useEffect, useState, useRef } from "react";
import { Card, Empty, Button, Drawer, Space, Popconfirm, message } from "antd";
import dayjs from "dayjs";
import { getRoadmap, clearRoadmap } from "../../utils/roadmapStore";
import { exportNodeToPdf } from "../../utils/exportPDF";
import Roadmap from "../../components/ui/RoadMap"; // 注意大小写与文件名一致
import RoadmapEditor from "../../components/ui/RoadmapEditor";

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
                <Button onClick={onEdit} type="primary">Edit Roadmap</Button>
                <Popconfirm title="Clear roadmap?" onConfirm={onClear}>
                  <Button danger>Clear</Button>
                </Popconfirm>
              </>
            )}
          </Space>
        }
      >
        {steps?.length ? (
          <>
            {/* 放在卡片内容里的导出工具栏 */}
            <div
              className="profile-card-toolbar"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 12,
              }}
            >
              <Button onClick={onExportPdf} loading={exporting}>
                Export PDF
              </Button>
            </div>

            {/* 实际导出的节点（整段会被转成 PDF） */}
            <div ref={roadmapRef}>
              <Roadmap steps={steps} />
            </div>
          </>
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
