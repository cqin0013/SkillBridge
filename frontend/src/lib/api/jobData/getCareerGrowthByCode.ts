
import { getJSON } from "../apiClient";
import type { CareerGrowthResponse } from "../../../types/careerGrowth";

/**
 * Fetch career growth data by 4-digit ANZSCO code
 * 
 * @param code - 4-digit ANZSCO code (e.g., "2613")
 * @returns Promise resolving to complete career growth data
 * @throws Error if code is invalid or API request fails
 * 
 * @example
 * ```typescript
 * const data = await getCareerGrowthByCode("2613");
 * console.log(data.fiveYearGrowthRate); // 15.2
 * ```
 */
export function getCareerGrowthByCode(code: string): Promise<CareerGrowthResponse> {
  // Validate code format
  const trimmedCode = code.trim();
  if (!trimmedCode) {
    throw new Error("ANZSCO code is required");
  }
  if (trimmedCode.length !== 4) {
    throw new Error("ANZSCO code must be exactly 4 digits");
  }
  if (!/^\d{4}$/.test(trimmedCode)) {
    throw new Error("ANZSCO code must contain only digits");
  }

  // Make GET request using shared API client
  return getJSON<CareerGrowthResponse>(
    `/api/career-growth/${encodeURIComponent(trimmedCode)}`
  );
}