// src/data/static.js
// Skill catalog (condensed from O*NET). Used for local, static rendering.

export const skillCategories = {
  content: [
    { key: "active_listening", name: "Active Listening", desc: "Giving full attention to what other people are saying, taking time to understand the points being made, asking questions as appropriate, and not interrupting at inappropriate times." },
    { key: "mathematics", name: "Mathematics", desc: "Using mathematics to solve problems." },
    { key: "reading_comprehension", name: "Reading Comprehension", desc: "Understanding written sentences and paragraphs in work-related documents." },
    { key: "science", name: "Science", desc: "Using scientific rules and methods to solve problems." },
    { key: "speaking", name: "Speaking", desc: "Talking to others to convey information effectively." },
    { key: "writing", name: "Writing", desc: "Communicating effectively in writing as appropriate for the needs of the audience." },
  ],
  process: [
    { key: "active_learning", name: "Active Learning", desc: "Understanding the implications of new information for both current and future problem-solving and decision-making." },
    { key: "critical_thinking", name: "Critical Thinking", desc: "Using logic and reasoning to identify the strengths and weaknesses of alternative solutions, conclusions, or approaches to problems." },
    { key: "learning_strategies", name: "Learning Strategies", desc: "Selecting and using training/instructional methods and procedures appropriate for the situation when learning or teaching new things." },
    { key: "monitoring", name: "Monitoring", desc: "Monitoring/Assessing performance of yourself, other individuals, or organizations to make improvements or take corrective action." },
  ],
  crossFunctional: {
    resourceManagement: [
      { key: "mgmt_financial", name: "Management of Financial Resources", desc: "Determining how money will be spent to get the work done, and accounting for these expenditures." },
      { key: "mgmt_material", name: "Management of Material Resources", desc: "Obtaining and seeing to the appropriate use of equipment, facilities, and materials needed to do certain work." },
      { key: "mgmt_personnel", name: "Management of Personnel Resources", desc: "Motivating, developing, and directing people as they work, identifying the best people for the job." },
      { key: "time_management", name: "Time Management", desc: "Managing one's own time and the time of others." },
    ],
    technical: [
      { key: "equipment_maintenance", name: "Equipment Maintenance", desc: "Performing routine maintenance on equipment and determining when and what kind of maintenance is needed." },
      { key: "equipment_selection", name: "Equipment Selection", desc: "Determining the kind of tools and equipment needed to do a job." },
      { key: "installation", name: "Installation", desc: "Installing equipment, machines, wiring, or programs to meet specifications." },
      { key: "operation_control", name: "Operation and Control", desc: "Controlling operations of equipment or systems." },
      { key: "operations_analysis", name: "Operations Analysis", desc: "Analyzing needs and product requirements to create a design." },
      { key: "operations_monitoring", name: "Operations Monitoring", desc: "Watching gauges, dials, or other indicators to make sure a machine is working properly." },
      { key: "programming", name: "Programming", desc: "Writing computer programs for various purposes." },
      { key: "quality_control", name: "Quality Control Analysis", desc: "Conducting tests and inspections of products, services, or processes to evaluate quality or performance." },
      { key: "repairing", name: "Repairing", desc: "Repairing machines or systems using the needed tools." },
      { key: "technology_design", name: "Technology Design", desc: "Generating or adapting equipment and technology to serve user needs." },
      { key: "troubleshooting", name: "Troubleshooting", desc: "Determining causes of operating errors and deciding what to do about it." },
    ],
  },
};

// Optional helpers for your UI
export const allSkillGroups = [
  { id: "content", label: "Content" },
  { id: "process", label: "Process" },
  { id: "crossFunctional.resourceManagement", label: "Resource Management" },
  { id: "crossFunctional.technical", label: "Technical" },
];

export default skillCategories;
