// /utils/roadmapStore.js
const KEY = "sb_roadmap";

export function saveRoadmap(steps = []) {
  const payload = { steps, updatedAt: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(payload));
}

export function getRoadmap() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { steps: [] };
  } catch {
    return { steps: [] };
  }
}

export function clearRoadmap() {
  localStorage.removeItem(KEY);
}
