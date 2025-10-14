import type { FeatureCollection, Geometry, Position } from "geojson";

/** Heuristic: true if tuple looks like [lat, lon] instead of [lon, lat]. */
function looksLikeLatLon(t: [number, number]): boolean {
  const [a, b] = t;
  const latOK = a >= -90 && a <= 90;
  const lonOK = b >= -180 && b <= 180;
  return latOK && lonOK;
}

/** Swap [lat,lon] -> [lon,lat] for Polygon/MultiPolygon geometries when needed. */
export function fixLatLonOrder<TProps>(
  fc: FeatureCollection<Geometry, TProps>
): FeatureCollection<Geometry, TProps> {
  const first =
    (fc.features[0]?.geometry as { coordinates?: unknown })?.coordinates as
      | number[][][][]
      | undefined;

  // If structure missing or already looks like [lon,lat], return as-is
  const firstPt = (first && first[0] && (first[0] as number[][][])[0] && (first[0] as number[][][])[0][0]) as
    | [number, number]
    | undefined;
  if (!firstPt || !looksLikeLatLon(firstPt)) return fc;

  const swap = (p: Position): Position => [p[1], p[0], ...p.slice(2)];

  const fixGeom = (g: Geometry): Geometry => {
    if (g.type === "Polygon") {
      return { ...g, coordinates: g.coordinates.map((ring) => ring.map(swap)) };
    }
    if (g.type === "MultiPolygon") {
      return {
        ...g,
        coordinates: g.coordinates.map((poly) => poly.map((ring) => ring.map(swap))),
      };
    }
    return g; // other geometry types not used here
  };

  return {
    type: "FeatureCollection",
    features: fc.features.map((f) => ({ ...f, geometry: fixGeom(f.geometry) })),
  };
}
