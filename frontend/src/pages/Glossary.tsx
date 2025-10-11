// src/pages/MapDebug.tsx
import * as React from "react";
import { geoPath, geoMercator } from "d3-geo";
import type {
  Feature,
  FeatureCollection,
  Geometry,
  Polygon,
  MultiPolygon,
} from "geojson";
import type { GeoPermissibleObjects } from "d3-geo";
import raw from "../../public/au-states.json";

type Props = { code: string; name: string };
const FC = raw as FeatureCollection<Polygon | MultiPolygon, Props>;

export default function MapDebug() {
  const W = 900, H = 700;

  // 1) 自适应投影
  const projection = React.useMemo(
    () => geoMercator().fitSize([W, H], (FC as unknown as GeoPermissibleObjects)),
    []
  );
  const path = React.useMemo(() => geoPath(projection), [projection]);

  // 2) 计算边界盒与每个州的 path 长度
  const bounds = React.useMemo(() => path.bounds(FC as unknown as GeoPermissibleObjects), [path]);
  const dList = React.useMemo(
    () => FC.features.map(f => path(f as Feature<Geometry, Props>) ?? ""),
    [path]
  );
  const emptyCount = dList.filter(d => d.length === 0).length;

  // 3) 打印关键调试信息
  // eslint-disable-next-line no-console
  console.log({ features: FC.features.length, bounds, emptyCount, sampleD: dList[0]?.slice(0, 80) });

  // 4) 取每个州的重心画圆点（便于观察是否在画布内）
  const centroids = React.useMemo(
    () => FC.features.map(f => ({ code: f.properties.code, xy: path.centroid(f as Feature<Geometry, Props>) })),
    [path]
  );

  return (
    <div className="p-4 space-y-2 text-sm">
      <div>features: {FC.features.length} | empty paths: {emptyCount}</div>
      <div>bounds: {JSON.stringify(bounds)}</div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 480, background: "#eef2ff" }}>
        {/* 画出 bounds 边框，应该是红色矩形 */}
        {bounds && (
          <rect
            x={bounds[0][0]}
            y={bounds[0][1]}
            width={Math.max(1, bounds[1][0] - bounds[0][0])}
            height={Math.max(1, bounds[1][1] - bounds[0][1])}
            fill="none"
            stroke="#ef4444"
            strokeWidth={2}
          />
        )}

        {/* 画出州块路径 */}
        {FC.features.map((f, i) => (
          <path
            key={f.properties.code}
            d={dList[i]}
            fill="#93c5fd"
            stroke="#1f2937"
            strokeWidth={1.5}
          />
        ))}

        {/* 画出重心点 */}
        {centroids.map(({ code, xy }) => (
          <g key={`c-${code}`}>
            <circle cx={xy[0]} cy={xy[1]} r={3} fill="#22c55e" />
          </g>
        ))}
      </svg>
    </div>
  );
}
