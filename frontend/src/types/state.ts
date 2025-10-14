/**
 * Australian States and Territories Configuration
 * 
 * Centralized configuration for state codes, names, and mappings
 * used across the application for data visualization and API integration.
 */

// ============================================================================
// Type Definitions
// ============================================================================

/** Australian state and territory codes (ISO 3166-2:AU) */
export const STATE_CODES = [
  "NSW",
  "VIC", 
  "QLD",
  "SA",
  "WA",
  "TAS",
  "NT",
  "ACT"
] as const;

/** Union type of all valid state codes */
export type StateCode = typeof STATE_CODES[number];

/**
 * Canonical properties for an AU state feature used in GeoJSON/maps
 * This replaces the old StateProps from stateprop.ts
 */
export interface StateProps {
  /** State abbreviation (e.g., NSW, VIC, QLD, SA, WA, TAS, NT, ACT) */
  code: string;
  /** Human-readable full name (e.g., "New South Wales") */
  name: string;
}

/** State information object with additional metadata */
export interface StateInfo {
  /** State code (e.g., "NSW") */
  code: StateCode;
  /** Full state name */
  name: string;
  /** Short display name (optional) */
  shortName?: string;
  /** Capital city (optional) */
  capital?: string;
}

// ============================================================================
// State Names
// ============================================================================

/** Full state and territory names */
export const STATE_NAMES: Record<StateCode, string> = {
  NSW: "New South Wales",
  VIC: "Victoria",
  QLD: "Queensland",
  SA: "South Australia",
  WA: "Western Australia",
  TAS: "Tasmania",
  NT: "Northern Territory",
  ACT: "Australian Capital Territory",
} as const;

/** Short state names for compact display */
export const STATE_SHORT_NAMES: Record<StateCode, string> = {
  NSW: "NSW",
  VIC: "VIC",
  QLD: "QLD",
  SA: "SA",
  WA: "WA",
  TAS: "TAS",
  NT: "NT",
  ACT: "ACT",
} as const;

/** Capital cities by state */
export const STATE_CAPITALS: Record<StateCode, string> = {
  NSW: "Sydney",
  VIC: "Melbourne",
  QLD: "Brisbane",
  SA: "Adelaide",
  WA: "Perth",
  TAS: "Hobart",
  NT: "Darwin",
  ACT: "Canberra",
} as const;

// ============================================================================
// Mapping: Full Name → Code
// ============================================================================

/**
 * Map full state names to state codes
 * Used for converting API responses that use full names
 */
export const STATE_NAME_TO_CODE: Readonly<Record<string, StateCode>> = {
  "New South Wales": "NSW",
  "Victoria": "VIC",
  "Queensland": "QLD",
  "South Australia": "SA",
  "Western Australia": "WA",
  "Tasmania": "TAS",
  "Northern Territory": "NT",
  "Australian Capital Territory": "ACT",
} as const;

/**
 * Alternative/informal state name mappings
 * Handles variations in API responses
 */
export const STATE_NAME_ALIASES: Readonly<Record<string, StateCode>> = {
  // Abbreviations (lowercase)
  "nsw": "NSW",
  "vic": "VIC",
  "qld": "QLD",
  "sa": "SA",
  "wa": "WA",
  "tas": "TAS",
  "nt": "NT",
  "act": "ACT",
  
  // Common variations
  "Australian Capital Terr.": "ACT",
  "Australian Capital Terr": "ACT",
  "Northern Terr.": "NT",
  "Northern Terr": "NT",
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get state code from any name format (case-insensitive)
 * 
 * Handles:
 * - Full names: "New South Wales" → "NSW"
 * - Codes: "NSW" → "NSW"
 * - Lowercase: "nsw" → "NSW"
 * - Aliases: "Australian Capital Terr." → "ACT"
 * 
 * @param name - State name in any format
 * @returns State code or undefined if not found
 */
export function getStateCode(name: string): StateCode | undefined {
  if (!name) return undefined;
  
  const normalized = name.trim();
  
  // Check if already a valid code
  if (STATE_CODES.includes(normalized as StateCode)) {
    return normalized as StateCode;
  }
  
  // Check full name mapping
  if (normalized in STATE_NAME_TO_CODE) {
    return STATE_NAME_TO_CODE[normalized];
  }
  
  // Check aliases (case-insensitive)
  const lower = normalized.toLowerCase();
  if (lower in STATE_NAME_ALIASES) {
    return STATE_NAME_ALIASES[lower];
  }
  
  return undefined;
}

/**
 * Get full state name from code
 * 
 * @param code - State code (e.g., "NSW")
 * @returns Full state name or undefined if invalid code
 */
export function getStateName(code: string): string | undefined {
  if (STATE_CODES.includes(code as StateCode)) {
    return STATE_NAMES[code as StateCode];
  }
  return undefined;
}

/**
 * Get state information object
 * 
 * @param code - State code
 * @returns Complete state information or undefined
 */
export function getStateInfo(code: StateCode): StateInfo | undefined {
  if (!STATE_CODES.includes(code)) return undefined;
  
  return {
    code,
    name: STATE_NAMES[code],
    shortName: STATE_SHORT_NAMES[code],
    capital: STATE_CAPITALS[code],
  };
}

/**
 * Get all states as info objects
 * 
 * @returns Array of all state information objects
 */
export function getAllStates(): StateInfo[] {
  return STATE_CODES.map((code) => ({
    code,
    name: STATE_NAMES[code],
    shortName: STATE_SHORT_NAMES[code],
    capital: STATE_CAPITALS[code],
  }));
}

/**
 * Validate if a string is a valid state code
 * 
 * @param value - Value to check
 * @returns True if valid state code
 */
export function isValidStateCode(value: unknown): value is StateCode {
  return typeof value === "string" && STATE_CODES.includes(value as StateCode);
}

/**
 * Initialize state values object with default value
 * 
 * @param defaultValue - Default value for each state (default: 0)
 * @returns Object with all state codes as keys
 */
export function initializeStateValues<T = number>(
  defaultValue: T = 0 as T
): Record<StateCode, T> {
  return Object.fromEntries(
    STATE_CODES.map((code) => [code, defaultValue])
  ) as Record<StateCode, T>;
}

// ============================================================================
// Constants for UI
// ============================================================================

/** State options for dropdowns/selects */
export const STATE_OPTIONS = STATE_CODES.map((code) => ({
  value: code,
  label: STATE_NAMES[code],
}));

/** State options with short names */
export const STATE_OPTIONS_SHORT = STATE_CODES.map((code) => ({
  value: code,
  label: STATE_SHORT_NAMES[code],
}));

export interface StateValue {
  rating: string;      // e.g. "Active" | "Unknown"
  employment: number;  // employment count
}