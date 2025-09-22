// src/pages/Insight/Insight.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Modal, Spin, Card, List, Typography } from "antd";
import AUSChoropleth from "../../components/AUSChoropleth";
import AUS_TOPO from "../../assets/australia_states.topo.json";
import useResponsive from "../../lib/hooks/useResponsive";
import StageBox from "../../components/ui/StageBox/StageBox";
import PastOccupationSearch from "../../components/ui/PastOccupationSearch/PastOccupationSearch";
import Citation from "../../components/ui/Citation/Citation";
import { getAnzscoShortageMap, EMPTY_SHORTAGE_COUNTS } from "../../lib/api/AnzscoShortageApi";
import { getTrainingAdvice } from "../../lib/api/TrainingAdviceApi";
import "./Insight.css";

const { Text } = Typography;

/** Safe sessionStorage getter (SSR-safe). */
function getSessionString(key, fallback = "") {
  if (typeof window === "undefined") return fallback;
  try {
    const v = window.sessionStorage.getItem(key);
    return (v && String(v).trim()) || fallback;
  } catch {
    return fallback;
  }
}

/** Human-readable names for the bottom sheet. */
const STATE_NAME = {
  NSW: "New South Wales",
  VIC: "Victoria",
  QLD: "Queensland",
  SA: "South Australia",
  WA: "Western Australia",
  TAS: "Tasmania",
  NT: "Northern Territory",
  ACT: "Australian Capital Territory",
};

export default function Insight() {
  const { isMobile } = useResponsive();

  /** Map counts state (and helpers) */
  const createEmptyCounts = useCallback(() => ({ ...EMPTY_SHORTAGE_COUNTS }), []);
  const [mapCounts, setMapCounts] = useState(createEmptyCounts);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState("");
  const [nationalTotal, setNationalTotal] = useState(null);

  /** Selected occupation (code + title) */
  const [jobCode, setJobCode] = useState(() => getSessionString("sb_targetJobCode", ""));
  const [jobTitle, setJobTitle] = useState(() => getSessionString("sb_targetJobTitle", "Selected Job"));

  // Keep code/title in sync with sessionStorage changes (e.g., selected in another step/tab)
  useEffect(() => {
    const handler = () => {
      setJobTitle(getSessionString("sb_targetJobTitle", "Selected Job"));
      setJobCode(getSessionString("sb_targetJobCode", ""));
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  /** Map selection; "ALL" means no label overlays */
  const [selected, setSelected] = useState("ALL");
  const selectedName = selected && selected !== "ALL" ? STATE_NAME[selected] : "";
  const selectedCount = selected && selected !== "ALL" ? mapCounts[selected] ?? 0 : nationalTotal ?? 0;

  /** Single-select job picker (modal) */
  const [pickerOpen, setPickerOpen] = useState(false);
  const [renderModal, setRenderModal] = useState(false);
  const [singleSel, setSingleSel] = useState(() => {
    try {
      const raw = window.sessionStorage.getItem("pos_selected");
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) && arr.length > 0 ? [arr[0]] : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    if (pickerOpen) setRenderModal(true);
  }, [pickerOpen]);

  const handleModalClose = () => setPickerOpen(false);
  const handleOpenModal = () => {
    setRenderModal(true);
    setPickerOpen(true);
  };
  const handleAfterOpenChange = (opened) => !opened && setRenderModal(false);

  /** Enforce single selection and update (title + code) immediately. */
  const handleChangeSingle = (arr) => {
    const first = Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
    const next = first ? [first] : [];
    setSingleSel(next);

    const nextTitle = first?.occupation_title || "Selected Job";
    const nextCode =
      first?.occupation_code || first?.anzsco_code || first?.code || "";
    const normalizedCode = nextCode ? String(nextCode).trim() : "";

    setJobTitle(nextTitle);
    setJobCode(normalizedCode);
    try {
      window.sessionStorage.setItem("sb_targetJobTitle", nextTitle);
      window.sessionStorage.setItem("sb_targetJobCode", normalizedCode);
      window.sessionStorage.setItem("pos_selected", JSON.stringify(next));
    } catch {}
    if (first) handleModalClose();
  };

  /* =========================
   * A) Load shortage map data
   * ========================= */
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const resetCounts = (message) => {
      setMapCounts(createEmptyCounts());
      setNationalTotal(null);
      setMapError(message || "");
    };

    const run = async () => {
      const trimmedCode = String(jobCode || "").trim();
      if (!trimmedCode) {
        resetCounts("Select a job to view state shortage data.");
        setMapLoading(false);
        return;
      }

      setMapLoading(true);
      setMapError("");

      try {
        const result = await getAnzscoShortageMap({
          anzscoCode: trimmedCode,
          signal: controller.signal,
        });
        if (cancelled) return;

        const merged = createEmptyCounts();
        const incomingCounts = result?.counts || {};
        let hasData = false;
        Object.entries(incomingCounts).forEach(([region, value]) => {
          const key = String(region || "").toUpperCase();
          const num = Number(value);
          if (!Number.isFinite(num)) return;
          if (Object.prototype.hasOwnProperty.call(merged, key)) {
            merged[key] = num;
            if (num !== 0) hasData = true;
          }
        });

        setMapCounts(merged);
        const national = Number(result?.metadata?.national);
        setNationalTotal(Number.isFinite(national) ? national : null);
        if (!hasData) setMapError("No regional shortage data returned for this occupation.");
      } catch (error) {
        if (controller.signal.aborted) return;
        resetCounts(error?.message || "Failed to load ANZSCO shortage data.");
      } finally {
        if (!cancelled) setMapLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [jobCode, createEmptyCounts]);

  /* ====================================
   * B) Load training advice (VET courses)
   * ==================================== */
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [trainingError, setTrainingError] = useState("");
  const [trainingCourses, setTrainingCourses] = useState([]); // [{code,name}]
  const [trainingTotal, setTrainingTotal] = useState(null);

  useEffect(() => {
    let aborted = false;
    const ctrl = new AbortController();

    const run = async () => {
      const code = String(jobCode || "").trim();
      if (!code) {
        setTrainingCourses([]);
        setTrainingTotal(null);
        setTrainingError("Pick an occupation to view training advice.");
        return;
      }
      setTrainingLoading(true);
      setTrainingError("");
      try {
        const res = await getTrainingAdvice({
          anzscoCode: code,
          limit: 10,
          signal: ctrl.signal,
        });
        if (aborted) return;
        setTrainingCourses(res.courses || []);
        setTrainingTotal(res.total ?? (res.courses || []).length);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setTrainingCourses([]);
        setTrainingTotal(null);
        setTrainingError(e?.message || "Failed to load training advice.");
      } finally {
        if (!aborted) setTrainingLoading(false);
      }
    };

    run();
    return () => {
      aborted = true;
      ctrl.abort();
    };
  }, [jobCode]);

  /* =================
   * Render
   * ================= */
  return (
    <main className={`insight-screen${isMobile ? " is-mobile" : ""}`}>
      {/* Header (StageBox) */}
      <div className="insight-stage">
        <StageBox
          step="Insights"
          title={`Job opportunities for ${jobTitle}`}
          accent="#6366f1"
          defaultCollapsed={true}
          hint="Click to view details"
          introTitle="Page introduction"
          introContent={
            <div>
              <p style={{ margin: 0 }}>
                This page shows a choropleth map of Australian states/territories.
                Tap/click a state to view estimated openings and highlight it on the map.
              </p>
            </div>
          }
          actionsTitle="What you can do on this page"
          actionsContent={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Select a state on the map to focus and label it.</li>
              <li>On mobile, the legend is hidden; use the bottom sheet for details.</li>
              <li>Select "ALL" from your controller to reset the view.</li>
            </ul>
          }
        />
      </div>

      {/* Map section */}
      <div className={`insight-map-wrap${isMobile ? " is-mobile" : ""}`}>
        <div className="map-viewport" style={{ position: "relative" }}>
          {mapLoading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.64)",
                zIndex: 2,
              }}
            >
              <Spin tip="Loading ANZSCO shortage data..." size="large" />
            </div>
          )}

          <AUSChoropleth
            counts={mapCounts}
            geoUrl={AUS_TOPO}
            title=""
            showLegend={!isMobile}
            legendPosition={isMobile ? "bottom" : "right"}
            onRegionClick={(code) => setSelected(code)}
            selected={selected || "ALL"}
          />
        </div>

        {mapError && (
          <Alert type="warning" showIcon message={mapError} style={{ marginTop: 12 }} />
        )}

        {nationalTotal != null && (
          <div style={{ marginTop: 12, color: "#4b5563" }}>
            Estimated national openings: <strong>{nationalTotal.toLocaleString()}</strong>
          </div>
        )}

        <Citation
          source="Jobs and Skills Australia - NERO"
          url="https://www.jobsandskills.gov.au/data/nero"
          year={2025}
          className="insight-citation"
        />
      </div>

      {/* Bottom sheet with state info */}
      {selected && selected !== "ALL" && (
        <div className="state-sheet" role="dialog" aria-modal="true" aria-label="State info">
          <div className="state-sheet__content">
            <div className="state-sheet__header">
              <h3 className="state-sheet__title">{selectedName}</h3>
              <button className="state-sheet__close" aria-label="Close" onClick={() => setSelected("ALL")}>
                ×
              </button>
            </div>
            <div className="state-sheet__body">
              <p className="state-sheet__metric">
                Estimated openings: <strong>{selectedCount.toLocaleString()}</strong>
              </p>
              <p className="state-sheet__hint">
                {isMobile ? "Tap another state on the map to update." : "Click another state on the map to update."}
              </p>
            </div>
          </div>
        </div>
      )}


      {/* Floating action button (bottom-right) */}
      <div className="insight-fab">
        <Button
          type="primary"
          shape="round"
          size={isMobile ? "middle" : "large"}
          onClick={handleOpenModal}
        >
          Want to explore another job? Click here
        </Button>
      </div>

      {/* v5 Modal hosting the single-select job picker */}
      {renderModal && (
        <Modal
          open={pickerOpen}
          onCancel={handleModalClose}
          afterOpenChange={handleAfterOpenChange}
          title="Search another job"
          width={isMobile ? undefined : 720}
          style={{ top: 24 }}
          styles={{ body: { paddingBlock: 12 } }}
          footer={null}
          maskClosable={false}
        >
          <PastOccupationSearch selected={singleSel} onChangeSelected={handleChangeSingle} />
          <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
            Only one job can be selected here. Picking a job will update the page header.
          </div>
        </Modal>
      )}
    </main>
  );
}
