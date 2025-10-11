import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import type { FeatureCollection, Geometry } from "geojson";
import rawGeo from "../assets/au-states.json";
import { normalizeAuStates } from "../lib/utils/normalizeAuState";
import type { StateProps } from "../types/stateProp";
import AuSvgMap from "../components/insight/AuMap";
import { useShortage } from "../hooks/queries/useShortage";         
import type { ShortageRes } from "../types/shortage";

/** Normalize once at module load. */
const geo: FeatureCollection<Geometry, StateProps> = normalizeAuStates(
  rawGeo as FeatureCollection<Geometry, Record<string, unknown>>
);

/** Known state codes */
const STATE_CODES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] as const;


/** Convert API payload into { NSW: number, ... } with 0 fallback */
function toValues(res?: ShortageRes): Record<string, number> {
  const zeros: Record<string, number> = Object.fromEntries(STATE_CODES.map((c) => [c, 0]));
  if (!res || typeof res.shortage !== "object" || res.shortage === null) return zeros;

  const out = { ...zeros };
  for (const k of STATE_CODES) {
    const v = res.shortage[k];
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

/** Preferred source: route ':anzsco' → Redux 'profile.targetAnzsco' */
function useTargetAnzsco(): string {
  const params = useParams<{ anzsco?: string }>();
  const fromRoute = params.anzsco ?? "";
  type RootState = { profile?: { targetAnzsco?: string } };
  const fromRedux = useSelector((s: RootState) => s.profile?.targetAnzsco ?? "");
  return fromRoute || fromRedux || "";
}

export default function InsightSvg(): React.ReactElement {
  // 1) get code
  const anzscoCode = useTargetAnzsco();

  // 2) query (disabled if empty)
  const { data, isFetching, isError } = useShortage(anzscoCode);

  // 3) values with 0 fallback
  const values = useMemo(() => toValues(data), [data]);

  // 4) banner condition
  const hasNonZero = useMemo(() => Object.values(values).some((v) => v > 0), [values]);

  const memoGeo = useMemo(() => geo, []);

  return (
    <div className="px-4 py-6 space-y-4">
      {!hasNonZero && (
        <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {anzscoCode
            ? (isFetching
                ? "Loading target job data…"
                : isError
                  ? "Failed to load. Showing zeros."
                  : "No positive values returned. Showing zeros.")
            : "请先在 Profile 选择一个 target job，或去 Analyzer 页面选择职位。当前地图以 0 值（灰色）展示。"}
        </div>
      )}

      <AuSvgMap
        geo={memoGeo}
        values={values}  // 若数据没到，组件会把缺失当 0 并显示灰色
        className="w-[340px] sm:w-[520px] md:w-[720px] lg:w-[900px]"
        onSelect={(code, v) => console.log("clicked:", code, v)}
      />
    </div>
  );
}
