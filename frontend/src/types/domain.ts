// UI/Domain models used by components and pages.

export interface AnzscoOccupation {
  /** Business-stable unique id for UI selection */
  code: string;
  /** Human readable label */
  title: string;
    description?: string;
}

export type AbilityType = "knowledge" | "tech" | "skill";

export interface AbilityLite {
  id: string;           // e.g., "tech|SQL" or "skill|S01"
  name: string;         // display name
  type: AbilityType;
  code?: string;        // optional backend code
}
