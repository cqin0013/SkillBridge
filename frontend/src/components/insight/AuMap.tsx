// Interactive SVG map of Australia with choropleth coloring
// Mobile optimized: Info card hidden on small screens


import { useEffect, useMemo, useRef, useState } from "react";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { geoConicConformal, geoIdentity, geoPath, geoBounds, type GeoProjection } from "d3-geo";
import { scaleQuantize } from "d3-scale";
import type { StateProps } from "../../types/state";

export interface AuSvgMapProps {
  /** Normalized GeoJSON: feature.properties has {code,name} */
  geo: FeatureCollection<Geometry, StateProps>;
  /** Metric keyed by state code; missing keys are treated as 0 */
  values: Record<string, number>;
  /** Tailwind width classes for responsive container */
  className?: string;
  /** Callback when a state is clicked */
  onSelect?(code: string, value: number): void;
}

/** Color palette for the choropleth map */
const GRAY_ZERO = "#CBD5E1";   
const PRIMARY = "#5E75A4";     
const RAMP: ReadonlyArray<string> = [
  "#E9EEF6", 
  "#C9D3E6", 
  "#A9BDD9", 
  "#89A4C7", 
  "#6D8CB6", 
  PRIMARY
];

/**
 * AuSvgMap Component
 * 
 * Renders an interactive choropleth map of Australian states/territories
 * 
 * Features:
 * - Auto-detects coordinate system (planar vs geographic)
 * - Responsive sizing with ResizeObserver
 * - Color scale based on data values
 * - Interactive state selection
 * - State info card (hidden on mobile < 640px)
 * - Hover effects on state paths
 * - Accessible labels and legend
 * 
 * Mobile Optimization:
 * - Info card only shows on desktop (≥ 640px)
 * - Selected state data passed via onSelect callback
 * - Parent component handles mobile display differently
 */
export default function AuSvgMap({
  geo,
  values,
  className = "w-[340px] sm:w-[520px] md:w-[720px] lg:w-[900px]",
  onSelect,
}: AuSvgMapProps): React.ReactElement {
  // Observe container width for responsive viewBox scaling
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 900, h: 620 });

  /**
   * Resize observer to maintain aspect ratio
   * Keeps map responsive while preserving proportions
   */
  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const ro = new ResizeObserver((entries) => {
      const w = Math.max(320, Math.floor(entries[0].contentRect.width));
      const h = Math.floor((11 / 16) * w); // maintain ~16:11 aspect ratio
      setSize({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /**
   * Auto-detect coordinate system and build appropriate projection
   * Planar (large values) uses identity, geographic uses conic conformal
   */
  const projection: GeoProjection = useMemo(() => {
    const [[x0, y0], [x1, y1]] = geoBounds(geo);
    const looksPlanar = Math.abs(x1 - x0) > 200 || Math.abs(y1 - y0) > 200;
    const p = looksPlanar 
      ? geoIdentity().reflectY(true) 
      : geoConicConformal().parallels([-18, -36]);
    p.fitExtent([[20, 20], [size.w - 20, size.h - 20]], geo);
    return p as GeoProjection;
  }, [geo, size.w, size.h]);

  const path = useMemo(() => geoPath(projection), [projection]);

  /**
   * Calculate min/max for positive values to build color scale
   * Ignores 0 or negative values for better contrast
   */
  const [minPos, maxPos] = useMemo(() => {
    const positive = Object.values(values).filter((v) => v > 0);
    return positive.length ? [Math.min(...positive), Math.max(...positive)] : [0, 0];
  }, [values]);

  /**
   * Color scale maps positive values to the color ramp
   * Uses quantize scale for discrete color steps
   */
  const color = useMemo(
    () => scaleQuantize<string>().domain([minPos, maxPos]).range(RAMP),
    [minPos, maxPos]
  );

  // Track currently selected state
  const [active, setActive] = useState<{ code: string; name: string; value: number } | null>(null);
  const features: ReadonlyArray<Feature<Geometry, StateProps>> = geo.features;

  return (
    <div ref={wrapRef} className={`mx-auto relative ${className}`}>
      {/* 
        Selected state info card - positioned at top-right corner
        HIDDEN ON MOBILE: Only displays on sm breakpoint and above (≥ 640px)
      */}
      {active && (
        <div className="hidden sm:block absolute top-0 right-0 z-10 bg-white border border-slate-300 rounded-lg shadow-lg px-4 py-3 min-w-[180px]">
          <div className="text-sm font-semibold text-slate-700">{active.name}</div>
          <div className="text-xs text-slate-500 mt-0.5">Code: {active.code}</div>
          <div className="text-lg font-bold text-primary mt-1">
            {active.value.toLocaleString("en-AU")}
          </div>
        </div>
      )}

      <svg
        viewBox={`0 0 ${size.w} ${size.h}`}
        className="w-full h-auto block"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Australia choropleth map"
      >
        {/* Background */}
        <rect width={size.w} height={size.h} fill="#ffffff" />
        
        {/* State polygons with interactive fills */}
        <g>
          {features.map((f) => {
            const code = f.properties.code;
            const name = f.properties.name;
            const d = path(f) ?? "";
            const raw = values[code];
            const v = Number.isFinite(raw) ? raw : 0;
            
            // Determine fill color based on value
            const fill = v > 0 && minPos !== maxPos 
              ? color(v) 
              : v > 0 
                ? PRIMARY 
                : GRAY_ZERO;

            return (
              <path
                key={code}
                d={d}
                fill={fill}
                stroke="#64748B"
                strokeWidth={0.8}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setActive({ code, name, value: v });
                  onSelect?.(code, v);
                }}
                onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
                role="button"
                aria-label={`${name}: ${v.toLocaleString("en-AU")}`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActive({ code, name, value: v });
                    onSelect?.(code, v);
                  }
                }}
              />
            );
          })}
        </g>

        {/* State code labels at centroid positions */}
        <g>
          {features.map((f) => {
            let [cx, cy] = geoPath(projection).centroid(f);
            // Fallback to bounding box center if centroid is invalid
            if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
              const [[bx0, by0], [bx1, by1]] = geoPath(projection).bounds(f);
              cx = (bx0 + bx1) / 2;
              cy = (by0 + by1) / 2;
            }
            return (
              <text
                key={f.properties.code}
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontWeight={700}
                fontSize={12}
                fill="#334155"
                pointerEvents="none"
              >
                {f.properties.code}
              </text>
            );
          })}
        </g>
      </svg>

      {/* Legend and instructions */}
      <div className="mt-3 flex flex-col items-center gap-2 text-sm text-slate-700">
        {/* Color ramp legend */}
        <div className="flex items-center gap-3">
          <span className="text-slate-600">Legend:</span>
          <div className="flex h-4 overflow-hidden rounded border border-slate-300">
            <div className="w-6" style={{ background: GRAY_ZERO }} title="0 or missing" />
            {RAMP.map((c, i) => (
              <div key={i} className="w-6" style={{ background: c }} />
            ))}
          </div>
        </div>
        
        {/* Legend explanation */}
        <div className="text-xs text-slate-600">
          <span className="inline-block w-3 h-3 align-middle mr-1 rounded" style={{ background: GRAY_ZERO }} />
          0 or missing → gray;&nbsp;
          <span className="inline-block w-3 h-3 align-middle mr-1 rounded" style={{ background: PRIMARY }} />
          larger value → deeper primary.
        </div>
        
        {/* Instruction text */}
        {!active && (
          <div className="mt-1 text-slate-500 text-xs">
            Click a state to view its employment value.
          </div>
        )}
      </div>
    </div>
  );
}