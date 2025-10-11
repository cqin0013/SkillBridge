// src/components/map/AuChoroplethGray.tsx
import * as React from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Feature, Geometry, Polygon, MultiPolygon } from "geojson";
import type { AuState } from "../../types/au-map";

type Props = { code?: string; name?: string };
const STE_TO_AU: Record<string, AuState> = { "1":"NSW","2":"VIC","3":"QLD","4":"SA","5":"WA","6":"TAS","7":"NT","8":"ACT" };
const toState = (p: Props): AuState => {
  const c = (p.code ?? "").toString(); if (STE_TO_AU[c]) return STE_TO_AU[c];
  const n = (p.name ?? "").toLowerCase();
  if (n.includes("wales")) return "NSW"; if (n.includes("victoria")) return "VIC";
  if (n.includes("queensland")) return "QLD"; if (n.startsWith("south")) return "SA";
  if (n.includes("western")) return "WA"; if (n.includes("tasmania")) return "TAS";
  if (n.includes("northern")) return "NT"; return "ACT";
};

export default function AuChoroplethGray({
  onSelect, height = 520, ariaLabel = "Australia state map",
}: { onSelect?: (s: AuState) => void; height?: number; ariaLabel?: string }) {
  const W = 900, H = height;
  const [fc, setFc] = React.useState<FeatureCollection<Polygon|MultiPolygon, Props> | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/au-states.json")
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => setFc(d as FeatureCollection<Polygon|MultiPolygon, Props>))
      .catch(e => setErr(String(e)));
  }, []);

  const projection = React.useMemo(() => {
    const base = geoMercator();
    return fc ? base.fitExtent([[10,10],[W-10,H-10]], fc as unknown as FeatureCollection)
              : base.center([133,-28]).scale(850).translate([W/2,H/2]);
  }, [fc, W, H]);
  const pathGen = React.useMemo(() => geoPath(projection), [projection]);

  return (
    <div>
      <div className="mb-2 text-xs">
        {err ? `Error: ${err}` : fc ? `features: ${fc.features.length}` : "Loading map…"}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} style={{ width: "100%", height: H }}>
        <rect width={W} height={H} fill="#f3f4f6" stroke="#ef4444" strokeWidth={1} />
        {fc && fc.features.map((f, i) => (
          <path
            key={`${toState(f.properties)}-${i}`}
            d={pathGen(f as Feature<Geometry, Props>) ?? ""}
            fill="#e5e7eb"
            stroke="#374151"
            strokeWidth={1.1}
            tabIndex={0}
            role="button"
            aria-label={toState(f.properties)}
            onClick={() => onSelect?.(toState(f.properties))}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(toState(f.properties)); } }}
            style={{ cursor: "pointer", outline: "none" }}
          />
        ))}
      </svg>
    </div>
  );
}
