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
  onSelect?(code: string, value: number): void;
}

/** Color constants */
const GRAY_ZERO = "#CBD5E1";   // zero or missing
const PRIMARY = "#5E75A4";     // theme color
/** Light → dark tints ending at PRIMARY */
const RAMP: ReadonlyArray<string> = ["#E9EEF6", "#C9D3E6", "#A9BDD9", "#89A4C7", "#6D8CB6", PRIMARY];

/**
 * Responsive plain-SVG choropleth.
 * - ResizeObserver to fit projection to container width
 * - Auto-detects planar vs lon/lat coordinates
 * - 0 = gray; >0 = themed quantized colors
 * - Includes legend and selected-state readout
 */
export default function AuSvgMap({
  geo,
  values,
  className = "w-[340px] sm:w-[520px] md:w-[720px] lg:w-[900px]",
  onSelect,
}: AuSvgMapProps): React.ReactElement {
  /** Observe container size for responsive viewBox */
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 900, h: 620 });

  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const ro = new ResizeObserver((entries) => {
      const w = Math.max(320, Math.floor(entries[0].contentRect.width));
      const h = Math.floor((11 / 16) * w); // keep ~16:11 aspect
      setSize({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** Auto-detect coordinate system and build projection */
  const projection: GeoProjection = useMemo(() => {
    const [[x0, y0], [x1, y1]] = geoBounds(geo);
    const looksPlanar = Math.abs(x1 - x0) > 200 || Math.abs(y1 - y0) > 200;
    const p = looksPlanar ? geoIdentity().reflectY(true) : geoConicConformal().parallels([-18, -36]);
    p.fitExtent([[20, 20], [size.w - 20, size.h - 20]], geo);
    return p as GeoProjection;
  }, [geo, size.w, size.h]);

  const path = useMemo(() => geoPath(projection), [projection]);

  /** Color scale only for positive values; zero stays gray */
  const [minPos, maxPos] = useMemo(() => {
    const positive = Object.values(values).filter((v) => v > 0);
    return positive.length ? [Math.min(...positive), Math.max(...positive)] : [0, 0];
  }, [values]);

  const color = useMemo(
    () => scaleQuantize<string>().domain([minPos, maxPos]).range(RAMP),
    [minPos, maxPos]
  );

  const [active, setActive] = useState<{ code: string; name: string; value: number } | null>(null);

  const features: ReadonlyArray<Feature<Geometry, StateProps>> = geo.features;

  return (
    <div ref={wrapRef} className={`mx-auto ${className}`}>
      <svg
        viewBox={`0 0 ${size.w} ${size.h}`}
        width="100%"
        height="auto"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Australia choropleth"
      >
        <rect width={size.w} height={size.h} fill="#ffffff" />
        <g>
          {features.map((f) => {
            const code = f.properties.code;
            const name = f.properties.name;
            const d = path(f) ?? "";
            const raw = values[code];                  // incoming value
            const v = Number.isFinite(raw) ? raw : 0;  // fallback to 0
            const fill = v > 0 && minPos !== maxPos ? color(v) : v > 0 ? PRIMARY : GRAY_ZERO;

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
              />
            );
          })}
        </g>

        {/* Labels at centroid with bbox fallback */}
        <g>
          {features.map((f) => {
            let [cx, cy] = geoPath(projection).centroid(f);
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

      {/* Legend + selected info */}
      <div className="mt-3 flex flex-col items-center gap-2 text-sm text-slate-700">
        <div className="flex items-center gap-3">
          <span className="text-slate-600">Legend:</span>
          <div className="flex h-4 overflow-hidden rounded border border-slate-300">
            <div className="w-6" style={{ background: GRAY_ZERO }} title="0 or missing" />
            {RAMP.map((c, i) => (
              <div key={i} className="w-6" style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="text-xs text-slate-600">
          <span className="inline-block w-3 h-3 align-middle mr-1 rounded" style={{ background: GRAY_ZERO }} />
          0 or missing → gray;&nbsp;
          <span className="inline-block w-3 h-3 align-middle mr-1 rounded" style={{ background: PRIMARY }} />
          larger value → deeper primary.
        </div>
        <div className="mt-1 min-h-[24px]">
          {active ? (
            <span>
              {active.name} ({active.code}): <span className="font-semibold">{active.value}</span>
            </span>
          ) : (
            <span className="text-slate-500">Click a state to view its value.</span>
          )}
        </div>
      </div>
    </div>
  );
}
