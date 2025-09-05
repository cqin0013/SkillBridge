// /pages/profile/Profile.jsx
// Purpose: Display, edit, clear, and export a user's Learning Roadmap.
// - Reads roadmap steps from a local store (utils/roadmapStore)
// - Provides an editor in a Drawer to modify steps
// - Exports the visible roadmap DOM to a PDF
// - Uses a StageBox at top to give consistent guidance and context

import React, { useEffect, useState, useRef } from "react";
import { Card, Empty, Button, Drawer, Space, Popconfirm, message } from "antd";
import dayjs from "dayjs";
import { getRoadmap, clearRoadmap } from "../../utils/roadmapStore";
import { exportNodeToPdf } from "../../utils/exportPDF";
import Roadmap from "../../components/ui/RoadMap";      // Visual read-only roadmap view (mind the exact filename/casing)
import RoadmapEditor from "../../components/ui/RoadmapEditor"; // Editor UI for adding/reordering/removing steps

// Consistent top section that shows a pill, title, subtitle and a collapsible tip
import StageBox from "../../components/ui/StageBox";

export default function Profile() {
  // 'steps' is an ordered list of roadmap items displayed by <Roadmap />
  const [steps, setSteps] = useState([]);

  // Drawer visibility for the editor
  const [open, setOpen] = useState(false);

  // Export state to disable the button and show spinner while exporting
  const [exporting, setExporting] = useState(false);

  // Ref that wraps the roadmap content we want to export as a PDF
  const roadmapRef = useRef(null);

  // Load roadmap from local store on first mount
  useEffect(() => {
    const data = getRoadmap();
    // Store shape: { steps: [{ title: string, desc?: string, date?: string, ... }, ...] }
    setSteps(data?.steps || []);
  }, []);

  // Open the Drawer for editing
  const onEdit = () => setOpen(true);

  // Close the Drawer; if editor returns updated steps, apply them
  const onClose = (updated) => {
    if (updated) setSteps(updated);
    setOpen(false);
  };

  // Clear the saved roadmap and UI state
  const onClear = () => {
    clearRoadmap();
    setSteps([]);
    message.success("Roadmap cleared.");
  };

  // Export the current visual roadmap (DOM) to PDF
  const onExportPdf = async () => {
    if (!roadmapRef.current) return; // Nothing to export if the ref is not set

    try {
      setExporting(true);

      // Filename is timestamped, e.g. Roadmap_20250131_1530.pdf
      const filename = `Roadmap_${dayjs().format("YYYYMMDD_HHmm")}.pdf`;

      // Uses a utility (e.g. html2canvas + jsPDF under the hood) to export the node
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
    // Outer container; page-level paddings can be adjusted in global styles
    <div className="container" style={{ padding: 16 }}>
      <Card
        title="My Learning Roadmap"
        // Action buttons in the card header; only show when we actually have steps
        extra={
          <Space wrap>
            {steps?.length > 0 && (
              <>
                {/* Open the editor Drawer */}
                <Button onClick={onEdit} type="primary">
                  Edit Roadmap
                </Button>

                {/* Export the rendered roadmap to a PDF file */}
                <Button onClick={onExportPdf} loading={exporting}>
                  Export PDF
                </Button>

                {/* Clear all steps with a confirmation prompt */}
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
        {/* Consistent explanatory header using StageBox */}
        <StageBox
          pill="Step: Roadmap"                 // Small pill label for context
          title="Roadmap Overview"            // Main heading for this page section
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
          defaultTipOpen={true}               // Show the guidance by default on first visit
        />

        {steps?.length ? (
          // When steps exist: show the read-only roadmap.
          // The wrapper div is what gets exported to PDF.
          <div ref={roadmapRef}>
            <Roadmap steps={steps} />
          </div>
        ) : (
          // Empty state when there is no roadmap:
          // Provide a primary action to create/edit and disable export
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

      {/* Drawer hosts the interactive RoadmapEditor.
         'destroyOnClose' ensures a clean state each time the Drawer closes. */}
      <Drawer
        title={steps?.length ? "Edit Learning Roadmap" : "Create Learning Roadmap"}
        width={820}
        open={open}
        onClose={() => onClose()}
        destroyOnClose
      >
        {/* Editor returns updated steps to parent via onClose(updated) */}
        <RoadmapEditor initial={steps} onClose={onClose} />
      </Drawer>
    </div>
  );
}
