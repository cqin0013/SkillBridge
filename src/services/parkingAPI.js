/**
 * Simple API layer for parking data.
 * Endpoints:
 *  - GET /api/parking?near=lat,lng&radius=300[&onlyAvailable=true]
 *      When onlyAvailable=true, backend filters to available bays;
 *      otherwise returns all bays.
 *  - GET /api/bays/{bayId}
 */

const BASE =
  import.meta?.env?.VITE_API_BASE?.trim() ||
  "https://fit-8mtq.onrender.com";

// ---- helpers (local) ----
const toNum = (v) => (v === "" || v == null ? NaN : Number(v));
const isFiniteNum = (n) => typeof n === "number" && Number.isFinite(n);

/**
 * GET /api/parking
 * Normalize each item to: { bayId, lat, lng, rtAvailable: boolean|null, timestamp }
 */
export async function fetchAvailableBays({
  lat,
  lng,
  radius = 300,
  onlyAvailable = false,
}) {
  if (!isFiniteNum(lat) || !isFiniteNum(lng)) {
    throw new Error("fetchAvailableBays: invalid lat/lng");
  }
  // 后端容错；UI 会限制在 300-1000，这里再做宽松夹取
  const r = Math.max(50, Math.min(5000, Number(radius) || 300));

  const qs = new URLSearchParams({
    near: `${lat},${lng}`,
    radius: String(r),
  });
  if (onlyAvailable) qs.set("onlyAvailable", "true"); // 勾选时才追加

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

      // 兼容不同字段名判断实时可用性
      const rtAvailable =
        typeof x.rtAvailable === "boolean"
          ? x.rtAvailable
          : typeof x.available === "boolean"
          ? x.available
          : typeof x.isAvailable === "boolean"
          ? x.isAvailable
          : typeof x.occupied === "boolean"
          ? !x.occupied
          : typeof x.unoccupied === "boolean"
          ? x.unoccupied
          : null;

      const timestamp = x.timestamp ?? null;
      return { bayId, lat: la, lng: ln, rtAvailable, timestamp };
    })
    .filter((b) => b.bayId && isFiniteNum(b.lat) && isFiniteNum(b.lng));
}

/**
 * GET /api/bays/{bayId}
 * Normalize to: { pastOccupied: boolean|null, raw: object }
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

/** Optional: format "lat,lng" with 6 decimals */
export function makeBayIdFromCoords(lat, lng) {
  return `${(+lat).toFixed(6)},${(+lng).toFixed(6)}`;
}
