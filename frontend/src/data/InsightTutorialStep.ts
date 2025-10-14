import type { TutorialStep } from "../components/tutorial/Tutorial";

/**
 * Tutorial steps for the Insight page
 * Each step highlights a different section and explains its purpose
 */
export const insightTutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    target: "#hero-section",
    title: "Welcome to Career Insights!",
    content:
      "This dashboard provides comprehensive career data and growth projections for your selected occupation. Let's explore the key features together.",
    placement: "bottom",
  },
  {
    id: "job-title",
    target: "#job-title",
    title: "your target job group",
    content:
      "This is your target job group.",
    placement: "bottom",
  },
  {
    id: "quick-stats",
    target: "#quick-stats",
    title: "Quick Statistics Overview",
    content:
      "Get a snapshot of key metrics at a glance: projected growth rates, and national rankings.",
    placement: "bottom",
  },
  {
    id: "growth-stats",
    target: "#growth-statistics",
    title: "Major Group Statistics",
    content:
      "View detailed growth projections for your occupation's major group. This includes 5-year and 10-year growth rates, current employment figures, and expected new job openings.",
    placement: "bottom",
  },
  {
    id: "growth-comparison",
    target: "#growth-comparison",
    title: "Growth Rate Comparison",
    content:
      "Compare your occupation's growth rate against related occupations and the national average. This helps you understand how your field performs relative to others.",
    placement: "bottom",
  },
  {
    id: "geographic-map",
    target: "#geographic-map",
    title: "Geographic Distribution",
    content:
      "Explore job demand across Australian states and territories. Click on any state to view detailed employment statistics for that region. Darker colors indicate higher demand.",
    placement: "top",
  },
  {
    id: "complete",
    target: "#hero-section",
    title: "You're All Set!",
    content:
      "You now know how to navigate your career insights dashboard. Explore the data, compare regions, and make informed decisions about your career path. You can restart this tutorial anytime from the hero section.",
    placement: "bottom",
  },
];


