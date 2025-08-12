/**
 * Pure logic: derive UI texts from API booleans.
 *
 * Rules (English):
 * - availability (from /api/parking):  rtAvailable -> "available"/"unavailable"
 * - history & prediction (from /api/bays/{bayId}):
 *    pastOccupied = true  -> history: "occupied in the past",   prediction: "50% available"
 *    pastOccupied = false -> history: "available in the past",   prediction: "available"
 *    pastOccupied = null  -> history/prediction: "unknown"
 */

/**
 * @param {{ rtAvailable: boolean|null|undefined, pastOccupied: boolean|null|undefined }}
 * @returns {{ availability: "available"|"unavailable"|undefined,
 *            history: string, prediction: string }}
 */
export function deriveBayTexts({ rtAvailable, pastOccupied }) {
  const availability =
    rtAvailable == null
      ? undefined
      : rtAvailable
      ? "available"
      : "unavailable";

  let history = "unknown";
  let prediction = "unknown";

  if (typeof pastOccupied === "boolean") {
    if (pastOccupied) {
      history = "occupied in the past";
      prediction = "50% available";
    } else {
      history = "available in the past";
      prediction = "available";
    }
  }

  return { availability, history, prediction };
}

/** Format a display name like "12345 bay" from a bayId. */
export const formatBayName = (bayId) => (bayId ? `${bayId} bay` : "");

/** Small helper for timestamps -> "Xm ago" */
export function timeAgo(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
