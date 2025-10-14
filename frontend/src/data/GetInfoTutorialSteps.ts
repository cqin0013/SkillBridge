// Tutorial steps for the AnalyzerGetInfo page
// Guides users through role search, location selection, and industry selection

import type { TutorialStep } from "../components/tutorial/Tutorial";

export const getInfoTutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    target: "main",
    title: "Welcome to Get Info!",
    content:
      "This is where you'll tell us about your career interests and preferences. Let's walk through how to use this page effectively.",
    placement: "bottom",
  },
  {
    id: "summary-dock-button",
    target: "[data-summary-dock]",
    title: "Your Selection Summary",
    content:
      "See this circular button? Click it anytime to open the summary panel, which shows a real-time overview of all your selections on this page. The panel updates automatically as you make choices.",
    placement: "right",
  },
  {
    id: "search-roles",
    target: "[data-section='role-search']",
    title: "Search for Roles",
    content:
      "Start by searching for your past occupations. Select an industry first, then type keywords to find relevant roles. You can select up to 5 roles that match your career interests.",
    placement: "bottom",
  },
  {
    id: "search-reminder",
    target: "[data-section='role-search']",
    title: "Remember to Select a Role!",
    content:
      "After searching, don't forget to click on a role from the search results to add it to your selection. Your chosen roles will appear as chips below the search area.",
    placement: "bottom",
  },
  {
    id: "role-chips",
    target: "[data-role-chips]",
    title: "Manage Your Selections",
    content:
      "Your selected roles appear as chips here. Click the × button on any chip to remove it. Remember, you can select up to 5 roles to keep your analysis focused.",
    placement: "bottom",
  },
  {
    id: "location",
    target: "[data-section='location']",
    title: "Choose Your Location",
    content:
      "Select your preferred work location in Australia. This helps us provide region-specific career insights and job market data. If you're flexible, you can choose 'All states'.",
    placement: "top",
  },
  {
    id: "industries",
    target: "[data-section='industries']",
    title: "Select Industries of Interest",
    content:
      "Pick the industries you'd like to explore. You can select multiple industries (up to 20) to broaden your career opportunities. This helps us match you with diverse options.",
    placement: "top",
  },
  {
    id: "next-button",
    target: "footer button",
    title: "Disabled Button Help",
    content:
      "Notice the 'Next' button? If it's disabled (grayed out), hover your mouse over it to see what's required to proceed(only in destop). The tooltip will show you exactly which fields need to be completed.",
    placement: "top",
  },
  {
    id: "progress",
    target: "[data-progress-bar]",
    title: "Track Your Progress",
    content:
      "The progress bar at the top shows where you are in the analysis journey. You'll go through several steps: gathering information, selecting abilities, reviewing job suggestions, identifying skill gaps, and getting training recommendations.",
    placement: "bottom",
  },
  {
    id: "help",
    target: "[data-help-toggle]",
    title: "Need Help?",
    content:
      "Click the help icon (?) anytime you need more detailed guidance about this page. It provides comprehensive tips and explanations for each feature.",
    placement: "left",
  },
];