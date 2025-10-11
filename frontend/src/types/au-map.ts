// Strong types for Australian states and values
export type AuState = "NSW" | "VIC" | "QLD" | "SA" | "WA" | "TAS" | "NT" | "ACT";
export type StateValueMap = Partial<Record<AuState, number>>;

/** ABS STE_CODE21 (1..8) to AuState code */
export const STE_TO_AU: Record<string, AuState> = {
  "1": "NSW",
  "2": "VIC",
  "3": "QLD",
  "4": "SA",
  "5": "WA",
  "6": "TAS",
  "7": "NT",
  "8": "ACT",
};
