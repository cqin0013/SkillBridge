// Canonical list of Australian states and territories for UI selects.
// - `value` uses standard postal abbreviations (NSW, VIC, ...).
// - Includes an "All" sentinel item for "All states" filtering.
// - Exposes helpers to work with codes safely.

export type AustralianStateCode =
  | "NSW" // New South Wales
  | "VIC" // Victoria
  | "QLD" // Queensland
  | "SA"  // South Australia
  | "WA"  // Western Australia
  | "TAS" // Tasmania
  | "NT"  // Northern Territory
  | "ACT" // Australian Capital Territory;

export type AllStatesSentinel = "All";

/** Union type for select values */
export type AustralianStateValue = AustralianStateCode | AllStatesSentinel;

/** Generic option shape for select-like components */
export type Option = { label: string; value: AustralianStateValue };

/** Stable, display-ready options (includes the "All" sentinel) */
export const AU_STATE_OPTIONS: Readonly<Option[]> = [
  { label: "All states", value: "All" },
  { label: "New South Wales (NSW)", value: "NSW" },
  { label: "Victoria (VIC)", value: "VIC" },
  { label: "Queensland (QLD)", value: "QLD" },
  { label: "South Australia (SA)", value: "SA" },
  { label: "Western Australia (WA)", value: "WA" },
  { label: "Tasmania (TAS)", value: "TAS" },
  { label: "Northern Territory (NT)", value: "NT" },
  { label: "Australian Capital Territory (ACT)", value: "ACT" },
] as const;

/** Fast lookup tables */
export const STATE_LABELS: Readonly<Record<AustralianStateCode, string>> = {
  NSW: "New South Wales (NSW)",
  VIC: "Victoria (VIC)",
  QLD: "Queensland (QLD)",
  SA:  "South Australia (SA)",
  WA:  "Western Australia (WA)",
  TAS: "Tasmania (TAS)",
  NT:  "Northern Territory (NT)",
  ACT: "Australian Capital Territory (ACT)",
} as const;

export const STATE_CODES: Readonly<AustralianStateCode[]> = Object.keys(
  STATE_LABELS
) as AustralianStateCode[];

/** Type guard: check if a string is a valid state code */
export function isStateCode(s: string): s is AustralianStateCode {
  return (STATE_CODES as string[]).includes(s);
}

/** Normalize arbitrary input to a state value (code or "All"), otherwise undefined */
export function normalizeStateValue(
  input: string | null | undefined
): AustralianStateValue | undefined {
  if (!input) return undefined;
  if (input === "All") return "All";
  const up = input.toUpperCase();
  return isStateCode(up) ? (up as AustralianStateCode) : undefined;
}

/** Get label from code (returns undefined for unknown values) */
export function stateLabelFromValue(val: AustralianStateValue): string | undefined {
  if (val === "All") return "All states";
  return STATE_LABELS[val];
}
