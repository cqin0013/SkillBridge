/**
 * Pure logic: derive UI texts from API booleans.
 *
 * Rules :
 * - availability (from /api/parking):  "available"/"unavailable"
 * - history (from /api/bays/{bayId}):
 *    pastOccupied = true  -> "occupied in the past"
 *    pastOccupied = false -> "available in the past"
 *    pastOccupied = null  -> "unknown"
 *
 * - prediction 优先使用实时：
 *    rtAvailable === true  -> "available"
 *    rtAvailable === false && pastOccupied === false -> "50% available"
 *    rtAvailable === false && pastOccupied === true  -> "unavailable"
 *    rtAvailable === false && pastOccupied == null   -> "unknown"
 *    rtAvailable == null -> 回退到历史规则：
 *        pastOccupied === true  -> "50% available"
 *        pastOccupied === false -> "available"
 *        pastOccupied == null   -> "unknown"
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

  // history
  let history = "unknown";
  if (typeof pastOccupied === "boolean") {
    history = pastOccupied ? "occupied in the past" : "available in the past";
  }

  // prediction: realtime first, then fall back to history
  let prediction = "unknown";
  if (rtAvailable === true) {
    prediction = "available";
  } else if (rtAvailable === false) {
    if (pastOccupied === false) prediction = "50% available";
    else if (pastOccupied === true) prediction = "unavailable";
    else prediction = "unknown";
  } else {
    // no realtime, use historical heuristic
    if (pastOccupied === true) prediction = "50% available";
    else if (pastOccupied === false) prediction = "available";
    else prediction = "unknown";
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
