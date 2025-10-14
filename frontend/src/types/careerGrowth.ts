
/**
 * Request parameters for career growth data
 */
export interface CareerGrowthRequest {
  /** 4-digit ANZSCO code */
  code: string;
}

/**
 * Complete response data for career growth statistics
 */
export interface CareerGrowthResponse {
  /** Queried ANZSCO code */
  anzscoCode: string;
  /** Major group title */
  majorGroupTitle: string;
  
  /** 5-year growth rate (%) */
  fiveYearGrowthRate: number;
  /** 10-year growth rate (%) */
  tenYearGrowthRate: number;
  /** Growth ranking (e.g., "3rd out of 43") */
  growthRanking: string;
  
  /** Current employment count */
  currentEmployment: number;
  /** Projected new jobs to be created */
  projectedNewJobs: number;
  
  /** National average growth rate (%) */
  nationalAverageRate: number;
  /** Average growth rate of related occupations (%) */
  relatedOccupationsRate: number;
  /** Growth rate of the selected occupation (%) */
  selectedOccupationRate: number;

}






