/** Canonical properties for an AU state feature used by the app. */
export interface StateProps {
  /** Abbreviation like NSW, VIC, QLD, SA, WA, TAS, NT, ACT */
  code: string;
  /** Human-readable name, e.g., "New South Wales" */
  name: string;
}
