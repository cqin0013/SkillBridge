import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from "geojson";
import type { StateProps } from "../../types/state";

/** ABS STE_CODE21 -> abbreviation. OT (9) intentionally omitted. */
const STE_TO_ABBR: Record<string, string> = {
  "1": "NSW", "2": "VIC", "3": "QLD", "4": "SA",
  "5": "WA",  "6": "TAS", "7": "NT",  "8": "ACT"
};

/** Map raw ABS properties into {code,name} and drop OT if present. */
export function normalizeAuStates(
  fc: FeatureCollection<Geometry, GeoJsonProperties>
): FeatureCollection<Geometry, StateProps> {
  const features = fc.features
    .filter((f) => String((f.properties ?? {}).STE_CODE21) !== "9")
    .map((f: Feature<Geometry, GeoJsonProperties>) => {
      const p = f.properties ?? {};
      const code = STE_TO_ABBR[String(p.STE_CODE21)];
      const name = (p.STE_NAME21 as string) || (p.name as string) || "";
      return { ...f, properties: { code, name } as StateProps };
    });

  return { type: "FeatureCollection", features };
}
