import React, { useEffect, useMemo, useState } from "react";
import { Button } from "antd";
import AUSChoropleth from "../../components/AUSChoropleth";
import AUS_TOPO from "../../assets/australia_states.topo.json";
import useResponsive from "../../lib/hooks/useResponsive";
import StageBox from "../../components/ui/StageBox/StageBox";
import AppModal from "../../components/ui/AppModal/AppModal";
import PastOccupationSearch from "../../components/ui/PastOccupationSearch/PastOccupationSearch";
import Citation from "../../components/Citation";
import "./Insight.css";

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

  // Page header title (kept in sessionStorage by previous steps)
  const [jobTitle, setJobTitle] = useState(() =>
    getSessionString("sb_targetJobTitle", "Selected Job")
  );
  useEffect(() => {
    const handler = () =>
      setJobTitle(getSessionString("sb_targetJobTitle", "Selected Job"));
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // Demo counts; replace with API data if/when available
  const counts = useMemo(
    () => ({
      NSW: 14545,
      VIC: 11827,
      QLD: 13768,
      SA: 9620,
      WA: 12992,
      TAS: 5710,
      NT: 2520,
      ACT: 4650,
    }),
    []
  );

  // Map selection; "ALL" means no label overlays
  const [selected, setSelected] = useState("ALL");
  const selectedName =
    selected && selected !== "ALL" ? STATE_NAME[selected] : "";
  const selectedCount =
    selected && selected !== "ALL" ? counts[selected] ?? 0 : 0;

  // Single-select job picker (modal)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [singleSel, setSingleSel] = useState(() => {
    try {
      const raw = window.sessionStorage.getItem("pos_selected");
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) && arr.length > 0 ? [arr[0]] : [];
    } catch {
      return [];
    }
  });

  /** Enforce single selection and update title immediately. */
  const handleChangeSingle = (arr) => {
    const first = Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
    const next = first ? [first] : [];
    setSingleSel(next);
    const nextTitle = first?.occupation_title || "Selected Job";
    setJobTitle(nextTitle);
    try {
      window.sessionStorage.setItem("sb_targetJobTitle", nextTitle);
      window.sessionStorage.setItem("pos_selected", JSON.stringify(next));
    } catch {}
    if (first) setPickerOpen(false);
  };

  return (
    <main className={`insight-screen${isMobile ? " is-mobile" : ""}`}>
      {/* Header section (StageBox) */}
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
              <li>Select “ALL” from your controller to reset the view.</li>
            </ul>
          }
        />
      </div>

      {/* Map section */}
      <div className={`insight-map-wrap${isMobile ? " is-mobile" : ""}`}>
        {/* The map viewport keeps a stable height; page may grow naturally */}
        <div className="map-viewport">
          <AUSChoropleth
            counts={counts}
            geoUrl={AUS_TOPO}
            title=""
            showLegend={!isMobile}
            legendPosition={isMobile ? "bottom" : "right"}
            onRegionClick={(code) => setSelected(code)}
            selected={selected || "ALL"}
          />
        </div>

        {/* Data citation stuck to bottom-left of the map */}
        <Citation
          source="Jobs and Skills Australia – NERO"
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
              <button
                className="state-sheet__close"
                aria-label="Close"
                onClick={() => setSelected("ALL")}
              >
                ✕
              </button>
            </div>
            <div className="state-sheet__body">
              <p className="state-sheet__metric">
                Estimated openings: <strong>{selectedCount.toLocaleString()}</strong>
              </p>
              <p className="state-sheet__hint">
                {isMobile
                  ? "Tap another state on the map to update."
                  : "Click another state on the map to update."}
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
          onClick={() => setPickerOpen(true)}
        >
          Want to explore another job? Click here
        </Button>
      </div>

      {/* v5 Modal hosting the single-select job picker */}
      <AppModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Search another job"
        width={isMobile ? undefined : 720}
        top={24}
        bodyPaddingBlock={12}
      >
        <PastOccupationSearch
          selected={singleSel}
          onChangeSelected={handleChangeSingle}
        />
        <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
          Only one job can be selected here. Picking a job will update the page header.
        </div>
      </AppModal>
    </main>
  );
}
