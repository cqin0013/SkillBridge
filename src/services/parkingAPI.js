/**
 * Simple API layer for parking data.
 * - fetchAvailableBays: GET /api/parking (available bays near a point)
 * - fetchBayPastOccupied: GET /api/bays/{bayId} (historical occupied)
 */

const BASE =
  import.meta?.env?.VITE_API_BASE?.trim() ||
  "https://fit-8mtq.onrender.com";

// ---- helpers (local) ----
const toNum = (v) => (v === "" || v == null ? NaN : Number(v));
const isFiniteNum = (n) => typeof n === "number" && Number.isFinite(n);

/**
 * GET /api/parking
 * Backend returns a list of AVAILABLE bays with bayId and coordinates.
 * We normalize to: { bayId, lat, lng, rtAvailable: true, timestamp }
 */
export async function fetchAvailableBays({ lat, lng, radius = 300 }) {
  if (!isFiniteNum(lat) || !isFiniteNum(lng)) {
    throw new Error("fetchAvailableBays: invalid lat/lng");
  }
  const r = Math.max(50, Math.min(5000, Number(radius) || 300));

  const qs = new URLSearchParams({
    near: `${lat},${lng}`,
    radius: String(r),
    onlyAvailable: "true",
  });

  const res = await fetch(`${BASE}/api/parking?${qs.toString()}`, {
    credentials: "omit",
  });
  if (!res.ok) throw new Error(`GET /api/parking ${res.status}`);

  const arr = await res.json();
  if (!Array.isArray(arr)) throw new Error("Invalid /api/parking payload");

  return arr
    .map((x) => {
      const bayId = String(x.bayId ?? x.id ?? "");
      const la = toNum(x.lat);
      const ln = toNum(x.lng ?? x.lon);
      const timestamp = x.timestamp ?? null;
      return {
        bayId,
        lat: la,
        lng: ln,
        rtAvailable: true, // by API semantics: this endpoint returns available bays
        timestamp,
      };
    })
    .filter(
      (b) => b.bayId && isFiniteNum(b.lat) && isFiniteNum(b.lng)
    );
}

/**
 * GET /api/bays/{bayId}
 * Backend returns { occupied?: boolean, unoccupied?: boolean, ... }.
 * We normalize to: { pastOccupied: boolean|null, raw: object }
 */
export async function fetchBayPastOccupied(bayId) {
  if (!bayId) throw new Error("fetchBayPastOccupied: missing bayId");

  const res = await fetch(`${BASE}/api/bays/${encodeURIComponent(bayId)}`, {
    credentials: "omit",
  });
  if (!res.ok) throw new Error(`GET /api/bays/${bayId} ${res.status}`);

  const j = await res.json();
  const pastOccupied =
    typeof j.occupied === "boolean"
      ? j.occupied
      : typeof j.unoccupied === "boolean"
      ? !j.unoccupied
      : null;

  return { pastOccupied, raw: j };
}

/**
 * Optional util: when you only have lat/lng and need a bayId key
 * formatted like "lat,lng" with 6 decimals (if your backend accepts it).
 */
export function makeBayIdFromCoords(lat, lng) {
  return `${(+lat).toFixed(6)},${(+lng).toFixed(6)}`;
}
