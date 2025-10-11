import * as React from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Feature, Geometry, Polygon, MultiPolygon } from "geojson";

type StateProps = { code?: string; name?: string };

export default function AuMap() {
  const W = 900, H = 520;

  const [fc, setFc] = React.useState<FeatureCollection<Polygon|MultiPolygon, StateProps> | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/au-states.json")
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => setFc(d as FeatureCollection<Polygon|MultiPolygon, StateProps>))
      .catch(e => setErr(String(e)));
  }, []);

  const projection = React.useMemo(() => {
    const base = geoMercator();
    return fc
      ? base.fitExtent([[12,12],[W-12,H-12]], fc as unknown as FeatureCollection)
      : base.center([133,-28]).scale(850).translate([W/2,H/2]);
  }, [fc]);

  const path = React.useMemo(() => geoPath(projection), [projection]);

  // 关键状态直出
  if (err) return <div style={{color:"#b91c1c"}}>Error: {err}</div>;
  if (!fc) return <div>Loading /au-states.json …</div>;

  const d0 = path(fc.features[0] as Feature<Geometry, StateProps>) ?? "";

  return (
    <div>
      <div style={{fontSize:12, marginBottom:8}}>
        features: {fc.features.length} | sampleD: {d0.slice(0,60)}…
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%", height:H}}>
        {/* 背景很浅，方便看线 */}
        <rect width={W} height={H} fill="#f8fafc" />

        {/* 只画描边，避免被填充/背景遮挡 */}
        {fc.features.map((f, i) => {
          const d = path(f as Feature<Geometry, StateProps>) ?? "";
          if (!d) return null;
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="#111827"
              strokeWidth={1.2}
            />
          );
        })}
      </svg>
    </div>
  );
}
