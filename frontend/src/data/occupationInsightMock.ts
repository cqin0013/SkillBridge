// frontend/src/data/occupationInsightMock.ts
// Mock data for occupation insights and growth statistics
// Used for development and testing of the Insight page

import type { IndustryEmploymentData } from "../components/insight/IndustryEmploymentComparison";

/**
 * Mock data for occupation growth statistics
 */
export interface MockOccupationGrowth {
  anzscoCode: string;
  majorGroupTitle: string;
  fiveYearGrowthRate: number;
  tenYearGrowthRate: number;
  growthRanking: string;
  currentEmployment: number;
  projectedNewJobs: number;
}

/**
 * Mock data for growth rate comparison
 */
export interface MockGrowthComparison {
  selectedOccupationRate: number;
  selectedOccupationLabel: string;
  relatedOccupationsRate: number;
  nationalAverageRate: number;
}

/**
 * Mock data for industry employment comparison
 */
export interface MockIndustryComparison {
  industries: IndustryEmploymentData[];
}

/**
 * Complete mock data for a specific occupation
 */
export interface MockOccupationInsight {
  growth: MockOccupationGrowth;
  growthComparison: MockGrowthComparison;
  industryComparison: MockIndustryComparison;
}

/**
 * Mock data repository keyed by ANZSCO code
 */
export const MOCK_OCCUPATION_INSIGHTS: Record<string, MockOccupationInsight> = {
  // Software Engineer (261313)
  "261313": {
    growth: {
      anzscoCode: "261313",
      majorGroupTitle: "ICT Professionals",
      fiveYearGrowthRate: 15.2,
      tenYearGrowthRate: 32.8,
      growthRanking: "3rd out of 43",
      currentEmployment: 156200,
      projectedNewJobs: 51200,
    },
    growthComparison: {
      selectedOccupationRate: 15.2,
      selectedOccupationLabel: "Software Engineer",
      relatedOccupationsRate: 12.8,
      nationalAverageRate: 8.5,
    },
    industryComparison: {
      industries: [
        { name: "Software Publishing", employment: 89500, isSelected: false },
        { name: "Computer Systems Design", employment: 156200, isSelected: true },
        { name: "Data Processing Services", employment: 67800, isSelected: false },
        { name: "IT Consulting", employment: 142300, isSelected: false },
        { name: "Telecommunications", employment: 98700, isSelected: false },
      ],
    },
  },

  // Registered Nurse (254411)
  "254411": {
    growth: {
      anzscoCode: "254411",
      majorGroupTitle: "Health Professionals",
      fiveYearGrowthRate: 11.5,
      tenYearGrowthRate: 24.7,
      growthRanking: "5th out of 43",
      currentEmployment: 289400,
      projectedNewJobs: 71500,
    },
    growthComparison: {
      selectedOccupationRate: 11.5,
      selectedOccupationLabel: "Registered Nurse",
      relatedOccupationsRate: 10.2,
      nationalAverageRate: 8.5,
    },
    industryComparison: {
      industries: [
        { name: "Hospitals", employment: 289400, isSelected: true },
        { name: "Aged Care Services", employment: 178900, isSelected: false },
        { name: "Medical Services", employment: 156200, isSelected: false },
        { name: "Community Health", employment: 134700, isSelected: false },
        { name: "Home Health Care", employment: 98300, isSelected: false },
      ],
    },
  },

  // Accountant (221111)
  "221111": {
    growth: {
      anzscoCode: "221111",
      majorGroupTitle: "Business and Finance Professionals",
      fiveYearGrowthRate: 8.3,
      tenYearGrowthRate: 17.9,
      growthRanking: "12th out of 43",
      currentEmployment: 198700,
      projectedNewJobs: 35600,
    },
    growthComparison: {
      selectedOccupationRate: 8.3,
      selectedOccupationLabel: "Accountant",
      relatedOccupationsRate: 7.8,
      nationalAverageRate: 8.5,
    },
    industryComparison: {
      industries: [
        { name: "Accounting Services", employment: 198700, isSelected: true },
        { name: "Financial Planning", employment: 123400, isSelected: false },
        { name: "Tax Services", employment: 87600, isSelected: false },
        { name: "Corporate Finance", employment: 156800, isSelected: false },
        { name: "Audit Services", employment: 92300, isSelected: false },
      ],
    },
  },

  // Primary School Teacher (241111)
  "241111": {
    growth: {
      anzscoCode: "241111",
      majorGroupTitle: "Education Professionals",
      fiveYearGrowthRate: 6.7,
      tenYearGrowthRate: 14.2,
      growthRanking: "18th out of 43",
      currentEmployment: 187500,
      projectedNewJobs: 26600,
    },
    growthComparison: {
      selectedOccupationRate: 6.7,
      selectedOccupationLabel: "Primary School Teacher",
      relatedOccupationsRate: 6.2,
      nationalAverageRate: 8.5,
    },
    industryComparison: {
      industries: [
        { name: "Primary Education", employment: 187500, isSelected: true },
        { name: "Preschool Education", employment: 78900, isSelected: false },
        { name: "Special Education", employment: 45600, isSelected: false },
        { name: "Education Support", employment: 134200, isSelected: false },
        { name: "Private Tutoring", employment: 56700, isSelected: false },
      ],
    },
  },

  // Electrician (341111)
  "341111": {
    growth: {
      anzscoCode: "341111",
      majorGroupTitle: "Technicians and Trades Workers",
      fiveYearGrowthRate: 9.8,
      tenYearGrowthRate: 21.3,
      growthRanking: "9th out of 43",
      currentEmployment: 143200,
      projectedNewJobs: 30500,
    },
    growthComparison: {
      selectedOccupationRate: 9.8,
      selectedOccupationLabel: "Electrician",
      relatedOccupationsRate: 8.9,
      nationalAverageRate: 8.5,
    },
    industryComparison: {
      industries: [
        { name: "Electrical Services", employment: 143200, isSelected: true },
        { name: "Building Construction", employment: 178900, isSelected: false },
        { name: "Industrial Maintenance", employment: 98400, isSelected: false },
        { name: "Electrical Contracting", employment: 124700, isSelected: false },
        { name: "Renewable Energy", employment: 67800, isSelected: false },
      ],
    },
  },
};

/**
 * Get mock insight data for a specific ANZSCO code
 * Returns undefined if no mock data exists for the given code
 */
export function getMockOccupationInsight(
  anzscoCode: string
): MockOccupationInsight | undefined {
  return MOCK_OCCUPATION_INSIGHTS[anzscoCode];
}

/**
 * Check if mock data exists for a specific ANZSCO code
 */
export function hasMockData(anzscoCode: string): boolean {
  return anzscoCode in MOCK_OCCUPATION_INSIGHTS;
}

/**
 * Get all available mock ANZSCO codes
 */
export function getAvailableMockCodes(): string[] {
  return Object.keys(MOCK_OCCUPATION_INSIGHTS);
}