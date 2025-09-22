// src/lib/gate.js
export const GATE_FLAG = "gate_unlocked_v1";

export function isGateUnlocked() {
  try { return sessionStorage.getItem(GATE_FLAG) === "1"; } catch { return false; }
}
export function unlockGate() {
  try { sessionStorage.setItem(GATE_FLAG, "1"); } catch {}
}
export function lockGate() {
  try { sessionStorage.removeItem(GATE_FLAG); } catch {}
}

export async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(pw) {
  const expected = String(import.meta.env.VITE_GATE_HASH || "").toLowerCase().trim();
  if (!expected) throw new Error("Missing VITE_GATE_HASH");
  const actual = await sha256Hex(String(pw || ""));
  return actual === expected;
}
