import React, { useMemo, useRef, useState, useLayoutEffect } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleQuantize } from "d3-scale";
import { schemeBlues } from "d3-scale-chromatic";
import { geoCentroid } from "d3-geo";

/**
 * Small hook to observe an element's size (no external deps).
 * Useful for deriving a responsive projection scale from the map container width.
 */
function useElementSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const cr = entry.contentRect;
      setSize({ width: Math.round(cr.width), height: Math.round(cr.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, ...size };
}

/**
 * Choropleth map of Australian states/territories (responsive scale).
 *
 * Props:
 * - counts: Record<stateCode, number>   e.g., { VIC: 120, NSW: 85, ... }
 * - geoUrl: TopoJSON/GeoJSON object or URL compatible with react-simple-maps
 * - onRegionClick?: (code: string) => void
 * - title?: string
 * - legendPosition?: "right" | "bottom" (default: "right")
 * - showLegend?: boolean (default: true)
 * - selected?: "ALL" | string | string[]  (default: "ALL")
 */
function AUSChoropleth({
  counts = {},
  geoUrl,
  onRegionClick,
  title = "",
  legendPosition = "right",
  showLegend = true,
  selected = "ALL",
}) {
  /** Normalize selection prop into a Set for quick checks (or null = show all) */
  const selectedSet = useMemo(() => {
    if (selected === "ALL" || selected == null) return null;
    if (Array.isArray(selected)) return new Set(selected.filter(Boolean));
    return new Set([selected]);
  }, [selected]);

  /** Mapping display name -> state code for different GeoJSON schemas */
  const NAME_TO_CODE = {
    "New South Wales": "NSW",
    Victoria: "VIC",
    Queensland: "QLD",
    "South Australia": "SA",
    "Western Australia": "WA",
    Tasmania: "TAS",
    "Northern Territory": "NT",
    "Australian Capital Territory": "ACT",
    "Australian Capital Teritory": "ACT", // common typo in some datasets
  };

  /** Extract numeric values from counts (ignore NaN/undefined) */
  const values = useMemo(
    () => Object.values(counts).filter((v) => Number.isFinite(v)),
    [counts]
  );

  /** Min/Max for color scale domain */
  const [minV, maxV] = useMemo(() => {
    if (!values.length) return [0, 0];
    return [Math.min(...values), Math.max(...values)];
  }, [values]);

  /** Total sum for percentage readout (detail line) */
  const totalSum = useMemo(() => {
    return values.reduce((a, b) => a + b, 0);
  }, [values]);

  /** Color scale: quantize numeric range into 9 discrete blues */
  const colorScale = useMemo(
    () => scaleQuantize().domain([minV, maxV]).range(schemeBlues[9]),
    [minV, maxV]
  );

  /** Number formatters */
  const nf = useMemo(() => new Intl.NumberFormat("en-US"), []);
  const pf = useMemo(
    () => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }),
    []
  );

  /** Hover state for detail readout */
  const [hover, setHover] = useState({ name: "", code: "", value: undefined });
  const setHoverIfChanged = (next) => {
    if (
      hover.code === next.code &&
      hover.name === next.name &&
      hover.value === next.value
    ) return;
    setHover(next);
  };

  /**
   * Build legend buckets (NO percentages here).
   * If all values are equal, show a single bucket with that flat value.
   */
  const legend = useMemo(() => {
    if (!values.length) return [];
    if (minV === maxV) {
      // Edge case: flat data (all same value)
      return [{ color: schemeBlues[9][4], from: minV, to: maxV }];
    }
    const range = colorScale.range();
    const stops = range.map((c) => colorScale.invertExtent(c));
    return stops.map(([a, b], i) => ({
      color: range[i],
      from: Math.floor(a ?? minV),
      to: Math.floor(b ?? maxV),
    }));
  }, [colorScale, minV, maxV, values]);

  /** Helpers to extract code/name from a feature across different schemas */
  const getCodeFromFeature = (feature) => {
    const p = feature?.properties || {};
    const abbr = p.STE_ABBR || p.STATE_ABBR;
    if (abbr) return abbr;
    const name =
      p.STE_NAME21 || p.STATE_NAME || p.STE_NAME16 || p.name || p.NAME || "";
    return NAME_TO_CODE[name] || "";
  };
  const getNameFromFeature = (feature) => {
    const p = feature?.properties || {};
    return p.STE_NAME21 || p.STATE_NAME || p.STE_NAME16 || p.name || p.NAME || "Unknown";
  };

  /** Fill color logic: if no data or flat domain, use a neutral gray */
  const getFill = (code) => {
    const v = counts[code];
    if (!Number.isFinite(v) || minV === maxV) return "#e5e7eb"; // tailwind gray-200
    return colorScale(v);
  };

  /** Layout grid: map + legend either on the right or bottom */
  const outerStyle = useMemo(() => {
    if (showLegend && legendPosition === "bottom") {
      return { display: "grid", gridTemplateRows: "1fr auto", rowGap: 12, width: "100%", height: "100%" };
    }
    return { display: "grid", gridTemplateColumns: showLegend ? "1fr auto" : "1fr", gap: 16, width: "100%", height: "100%" };
  }, [showLegend, legendPosition]);

  /** Pointer hint: coarse pointer (touch) vs fine pointer (mouse) */
  const isCoarsePointer = useMemo(() => {
    if (typeof window === "undefined") return false;
    try { return window.matchMedia?.("(pointer: coarse)")?.matches || false; } catch { return false; }
  }, []);
  const hintText = isCoarsePointer ? "Tap a state" : "Hover a state";

  /** Responsive projection scale derived from measured container width */
  const { ref: mapAreaRef, width: mapW } = useElementSize();
  const projScale = useMemo(() => {
    const w = mapW || 1200; // desktop-ish fallback
    // Empirically nice: scale ~ 0.75 * width, clamped
    return Math.min(900, Math.max(420, Math.round(w * 0.75)));
  }, [mapW]);

  /** Visual params */
  const dimOpacity = 0.35;
  const selStroke = "#111827";
  const selStrokeWidth = 1.6;

  return (
    <div style={outerStyle} aria-label="Australia choropleth">
      {/* === Map panel === */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: 8,
          padding: 12,
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          width: "100%",
          height: "100%",
          display: "grid",
          gridTemplateRows: title ? "auto 1fr auto" : "1fr auto",
          overflow: "visible", // avoid clipping labels/legend
        }}
      >
        {title ? (
          <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600, textAlign: "left" }}>
            {title}
          </h3>
        ) : null}

        {/* Measured area: SVG fills this; projection scale derives from its width */}
        <div ref={mapAreaRef} style={{ width: "100%", height: "100%" }}>
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: projScale, center: [134, -25] }}
            style={{ width: "100%", height: "100%" }}
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) => {
                // Track label positions per selected region to avoid duplicates
                const labelByCode = new Map(); // code -> {x,y}

                const polygons = geographies.map((geo) => {
                  const code = getCodeFromFeature(geo);
                  const name = getNameFromFeature(geo);
                  const value = counts[code];
                  const fill = getFill(code);
                  const isSelected = !selectedSet || selectedSet.has(code);

                  if (selectedSet && isSelected && code && !labelByCode.has(code)) {
                    try {
                      const [cx, cy] = geoCentroid(geo);
                      if (Number.isFinite(cx) && Number.isFinite(cy)) {
                        labelByCode.set(code, { x: cx, y: cy });
                      }
                    } catch { /* ignore invalid geometries */ }
                  }

                  const handleClick = () => code && onRegionClick?.(code);

                  const geoProps = isCoarsePointer
                    ? { onClick: handleClick, onTouchEnd: handleClick }
                    : {
                        onClick: handleClick,
                        onMouseEnter: () => setHoverIfChanged({ name, code, value }),
                        onMouseLeave: () => setHoverIfChanged({ name: "", code: "", value: undefined }),
                      };

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      {...geoProps}
                      style={{
                        default: {
                          fill,
                          outline: "none",
                          stroke: isSelected ? selStroke : "#fff",
                          strokeWidth: isSelected ? selStrokeWidth : 0.8,
                          opacity: selectedSet ? (isSelected ? 1 : dimOpacity) : 1,
                          transition: "opacity .12s ease, stroke-width .12s ease",
                          cursor: "pointer",
                        },
                        hover: {
                          fill,
                          outline: "none",
                          stroke: selStroke,
                          strokeWidth: selStrokeWidth,
                          opacity: 1,
                        },
                        pressed: { fill, outline: "none" },
                      }}
                    />
                  );
                });

                // Optional code labels at centroids for selected regions
                const labels = selectedSet
                  ? Array.from(labelByCode.entries()).map(([code, { x, y }]) => (
                      <g key={`label-${code}`} pointerEvents="none">
                        {/* halo for legibility */}
                        <text
                          x={x} y={y}
                          textAnchor="middle" alignmentBaseline="middle"
                          style={{
                            fontSize: 12, fontWeight: 900,
                            fill: "white", stroke: "white", strokeWidth: 3,
                            paintOrder: "stroke", opacity: 0.9,
                          }}
                        >
                          {code}
                        </text>
                        {/* foreground */}
                        <text
                          x={x} y={y}
                          textAnchor="middle" alignmentBaseline="middle"
                          style={{ fontSize: 12, fontWeight: 900, fill: "#111827" }}
                        >
                          {code}
                        </text>
                      </g>
                    ))
                  : null;

                return (
                  <>
                    {polygons}
                    {labels}
                  </>
                );
              }}
            </Geographies>
          </ComposableMap>
        </div>

        {/* === Detail line (now includes PERCENTAGE) === */}
        <div
          style={{ marginTop: 8, fontSize: 12, color: "#374151", minHeight: 18 }}
          aria-live="polite"
        >
          {hover.code ? (
            <span>
              <b>{hover.name} ({hover.code})</b>:{" "}
              {Number.isFinite(hover.value)
                ? `${nf.format(hover.value)} (${totalSum > 0 ? pf.format((hover.value / totalSum) * 100) : 0}%)`
                : "no data"}
            </span>
          ) : (
            <span>{hintText}</span>
          )}
        </div>
      </div>

      {/* === Legend (NO percentage here; only numeric ranges + color swatches) === */}
      {showLegend && (
        <div
          style={{
            alignSelf: legendPosition === "bottom" ? "stretch" : "start",
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 8,
            padding: 12,
            width: legendPosition === "bottom" ? "100%" : 220,
          }}
          aria-label="Legend"
        >
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Legend</div>
          {legend.map((seg, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "20px 1fr",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 16,
                  background: seg.color,
                  border: "1px solid #e5e7eb",
                }}
              />
              <div style={{ fontSize: 12 }}>
                {minV === maxV
                  ? nf.format(seg.from)
                  : `${nf.format(seg.from)} – ${nf.format(seg.to)}`}
              </div>
            </div>
          ))}
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
            Darker = higher values
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(AUSChoropleth);
