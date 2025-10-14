// Load and normalize ABS GeoJSON to our props schema
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { STE_TO_AU, type AuState } from "../../types/au-map";
import raw from "../../assets/au-states.json";

/** Raw feature props straight from mapshaper output */
type AbsProps = { code: string; name: string };

/** Normalized props used in the app */
export type AuProps = { code: AuState; name: string };

/** Normalize: drop unknowns, map numeric code -> AuState */
export function loadAuStates(): FeatureCollection<Polygon | MultiPolygon, AuProps> {
  const fc = raw as FeatureCollection<Polygon | MultiPolygon, AbsProps>;
  const features: Feature<Polygon | MultiPolygon, AuProps>[] = [];
  for (const f of fc.features) {
    const mapped = STE_TO_AU[f.properties.code];
    if (!mapped) continue;
    features.push({
      type: "Feature",
      geometry: f.geometry,
      properties: { code: mapped, name: f.properties.name },
    });
  }
  return { type: "FeatureCollection", features };
}
