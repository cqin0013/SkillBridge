// Tutorial steps for the Profile page
// This page is fully customizable - users can manually edit all fields
// Only selecting a target job triggers automatic training advice analysis

import type { TutorialStep } from "../components/tutorial/Tutorial";

/**
 * Generate tutorial steps for Profile page
 * Returns array of steps with detailed guidance for all profile features
 */
export const getProfileTutorialSteps = (): TutorialStep[] => [
  // Step 1: Welcome and page overview
  {
    id: "profile-welcome",
    target: "#profile-header",
    title: "Welcome to Your Profile!",
    content:
      "This is your personalized career command center. Unlike the analyzer test, everything here is fully customizable. You can manually add, edit, or remove any information to suit your career goals. Let's explore what you can do!",
    placement: "bottom",
  },

  // Step 2: Career Intent section introduction
  {
    id: "career-intent-intro",
    target: "#career-intent",
    title: "Step 1: Define Your Career Intent",
    content:
      "This section is completely customizable. Add your past roles, choose your target occupation, and select your preferred work location. All fields can be edited at any time to reflect your evolving career goals.",
    placement: "bottom",
  },

  // Step 3: Past jobs - manual entry
  {
    id: "past-jobs-custom",
    target: "#career-intent",
    title: "Past Roles (Fully Customizable)",
    content:
      "Click 'Edit' to search and add up to 5 past occupations. You can add any roles manually - they don't need to come from the analyzer test. These help us understand your experience but won't trigger automatic analysis.",
    placement: "bottom",
  },

  // Step 4: Target job - this is special!
  {
    id: "target-job-auto-analysis",
    target: "#career-intent ",
    title: "Target Occupation (Auto-Analysis)",
    content:
      "This is important! When you select a target occupation, we automatically fetch relevant training courses for you. This is the ONLY field that triggers automatic analysis. Change it anytime to get fresh training recommendations.",
    placement: "top",
  },

  // Step 5: Region selection - manual only
  {
    id: "region-manual",
    target: "#career-intent ",
    title: "Preferred Region (Your Choice)",
    content:
      "Choose the Australian state or territory where you want to work. This is purely informational and can be updated anytime. It doesn't affect the training advice - that's based solely on your target occupation.",
    placement: "top",
  },

  // Step 6: Skill Roadmap - fully manual
  {
    id: "skill-roadmap-manual",
    target: "#skill-roadmap",
    title: "Step 2: Your Skill Roadmap",
    content:
      "This is your personal skill development tracker. You can manually add any skills you want to learn, set timelines, and organize them by category. If you've completed the analyzer test, missing skills will appear here automatically, but you're free to customize everything.",
    placement: "top",
  },

  // Step 7: Roadmap features and customization
  {
    id: "roadmap-features",
    target: "#skill-roadmap",
    title: "Customize Your Learning Plan",
    content:
      "Add target dates to each skill, manually add new skills, change categories, or remove items. Use filters to organize by type (Knowledge, Tech, Skills) or status (Not Started, In Progress, Completed). Everything here is under your control.",
    placement: "top",
  },

  // Step 8: Empty roadmap guidance
  {
    id: "empty-roadmap-guidance",
    target: "#skill-roadmap",
    title: "Need Help Identifying Skills?",
    content:
      "If your roadmap is empty, consider taking the Analyzer test. It will assess your abilities against your target role and automatically populate this roadmap with the skills you're missing. But remember - this is optional! You can build your roadmap completely manually.",
    placement: "top",
  },

  // Step 9: Training Advice - auto-generated
  {
    id: "training-auto-generated",
    target: "#training-advice",
    title: "Step 3: Training Advice (Auto-Generated)",
    content:
      "Based ONLY on your target occupation, we automatically fetch relevant VET (Vocational Education and Training) courses from Australia's official registry. This list updates whenever you change your target job. Remove courses that don't fit your needs.",
    placement: "top",
  },

  // Step 10: Training list management
  {
    id: "training-management",
    target: "#training-advice .rounded-xl.border",
    title: "Manage Your Course List",
    content:
      "Review each course and click the remove button (×) to exclude courses that aren't relevant. The list regenerates automatically when you select a different target occupation. Click any course title to view full details on the official training website.",
    placement: "top",
  },

  // Step 11: Want detailed analysis reminder
  {
    id: "analyzer-test-reminder",
    target: "#training-advice",
    title: "Want More Detailed Analysis?",
    content:
      "The training advice here is based only on your target occupation. For a comprehensive skill gap analysis that considers your past experience and abilities, take the Analyzer test. It provides personalized recommendations based on your complete profile.",
    placement: "top",
  },

  // Step 12: VET Terminology tool
  {
    id: "vet-terminology-tool",
    target: "#vet-terminology",
    title: "Step 4: VET Terminology Dictionary",
    content:
      "Confused by course jargon? Use this dictionary to look up unfamiliar VET (Vocational Education and Training) terms before enrolling in courses. Search for any term to get a clear explanation.",
    placement: "top",
  },

  // Step 13: VET search demonstration
  {
    id: "vet-search-demo",
    target: "#vet-terminology input",
    title: "Quick Term Lookup",
    content:
      "Type any unfamiliar term (like 'AQF', 'RTO', or 'competency') and we'll show you what it means. This helps you make informed decisions about training courses without needing to research elsewhere.",
    placement: "bottom",
  },

  // Step 14: Export PDF feature
  {
    id: "export-pdf-feature",
    target: "#career-intent button[aria-label*='Export']",
    title: "Export Your Profile",
    content:
      "Need to save or share your profile? Click 'Export PDF' to download a formatted document containing your career intent, skill roadmap, and training advice. If the Export PDF function isn't working, try a screenshot instead.",
    placement: "left",
  },

  // Step 15: Help toggle location
  {
    id: "help-toggle-hint",
    target: "#profile-header .shrink-0 [data-help-toggle]",
    title: "Quick Help Anytime",
    content:
      "See this question mark icon? Click it for quick tips about each section. Each help popup provides context-specific guidance without interrupting your workflow.",
    placement: "left",
  },

  // Step 16: Tutorial replay reminder
  {
    id: "tutorial-replay",
    target: "#profile-header button[aria-label*='Tutorial']",
    title: "Replay This Tutorial",
    content:
      "You can replay this tutorial anytime by clicking the 'View Tutorial' button at the top of the page. Perfect for when you need a refresher on any feature!",
    placement: "left",
  },

  // Step 17: Final summary and action plan
  {
    id: "final-action-plan",
    target: "#profile-header",
    title: "Your Action Plan",
    content:
      "Ready to get started? Here's your workflow: (1) Set your target occupation to get training courses, (2) Manually plan your skill roadmap with timelines, (3) Review and remove irrelevant courses, (4) Look up any unfamiliar terms. For detailed skill gap analysis, take the Analyzer test!",
    placement: "bottom",
  },
];