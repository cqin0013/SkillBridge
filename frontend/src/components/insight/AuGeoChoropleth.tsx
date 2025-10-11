// Render AU states without zoom/pan. Accessible + clickable.
import * as React from "react";
import { geoMercator, geoPath } from "d3-geo";
import type {
  Feature, FeatureCollection, Geometry, Polygon, MultiPolygon
} from "geojson";
import raw from "../../assets/au-states.json";
import type { AuState, StateValueMap } from "../../types/au-map";

type Props = { code: string; name: string };
const FC = raw as FeatureCollection<Polygon | MultiPolygon, Props>;

export type AuChoroplethProps = {
  values: StateValueMap;               // state -> value
  active?: AuState | null;             // external highlight
  onSelect?: (s: AuState) => void;     // click/keyboard callback
  height?: number;                     // svg height px
  colors?: [string, string, string];   // low, mid, high
  ariaLabel?: string;
};

function parseHex(hex: string): [number, number, number] {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  const n = m ? parseInt(m[1], 16) : 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, t: number): string {
  const A = parseHex(a), B = parseHex(b);
  const r = Math.round(A[0] + (B[0] - A[0]) * t);
  const g = Math.round(A[1] + (B[1] - A[1]) * t);
  const bl = Math.round(A[2] + (B[2] - A[2]) * t);
  return `rgb(${r},${g},${bl})`;
}
function colorOf(v: number | null, min: number, max: number, stops: [string,string,string]): string {
  if (v === null) return "#e5e7eb";
  const t = Math.max(0, Math.min(1, (v - min) / (max - min || 1)));
  return t <= 0.5 ? mix(stops[0], stops[1], t / 0.5) : mix(stops[1], stops[2], (t - 0.5) / 0.5);
}

export default function AuChoropleth({
  values,
  active = null,
  onSelect,
  height = 520,
  colors = ["#dbeafe", "#60a5fa", "#1d4ed8"],
  ariaLabel = "Australia choropleth",
}: AuChoroplethProps) {
  // Build projection once; fit to SVG size to avoid empty paths
  const W = 900, H = height;
  const projection = React.useMemo(
    () => geoMercator().fitSize([W, H], FC as unknown as FeatureCollection),
    [H]
  );
  const pathGen = React.useMemo(() => geoPath(projection), [projection]);

  // Compute color domain and a quick lookup map
  const [min, max] = React.useMemo(() => {
    const arr = Object.values(values).filter((x): x is number => typeof x === "number");
    if (arr.length === 0) return [0, 100];
    const lo = Math.min(...arr), hi = Math.max(...arr);
    return lo === hi ? [lo - 1, hi + 1] : [lo, hi];
  }, [values]);

  // Render
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} style={{ width: "100%", height }}>
      <rect width={W} height={H} fill="#eff6ff" />
      {FC.features.map((f) => {
        // Expect properties.name like "New South Wales"; map to 3-letter code on the caller side.
        const name = f.properties.name;
        const code = (name.includes("Wales") ? "NSW"
          : name.includes("Victoria") ? "VIC"
          : name.includes("Queensland") ? "QLD"
          : name.startsWith("South") ? "SA"
          : name.includes("Western") ? "WA"
          : name.includes("Tasmania") ? "TAS"
          : name.includes("Northern") ? "NT"
          : "ACT") as AuState;

        const d = pathGen(f as Feature<Geometry, Props>) ?? "";
        const val = values[code] ?? null;
        const fill = colorOf(val, min, max, colors);
        const stroke = active === code ? "#111827" : "#374151";
        const sw = active === code ? 2 : 1.2;

        return (
          <path
            key={code}
            d={d}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            tabIndex={0}
            role="button"
            aria-label={`${name}${typeof val === "number" ? `, value ${val}` : ""}`}
            onClick={() => onSelect?.(code)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(code); }
            }}
            style={{ cursor: "pointer", outline: "none" }}
          />
        );
      })}
    </svg>
  );
}
