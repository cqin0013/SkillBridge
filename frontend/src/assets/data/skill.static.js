// src/assets/data/skill.static.js

/**
 * 供 AbilityAnalyzer 使用的静态技能库
 * - content: 基础/通用认知与沟通技能（2.A.1.*）
 * - process: 学习/思维/社交过程技能（2.A.2.*、2.B.1.*、2.B.2.i、2.B.4.*）
 * - crossFunctional.resourceManagement: 资源管理（2.B.5.*）
 * - crossFunctional.technical: 技术/操作类（2.B.3.*）
 *
 * 注意：AbilityAnalyzer 中会用 .map(s => s.name)，因此必须包含 name 字段
 */

export const skillCategories = {
  content: [
    { code: "2.A.1.a", name: "Reading Comprehension" },
    { code: "2.A.1.b", name: "Active Listening" },
    { code: "2.A.1.c", name: "Writing" },
    { code: "2.A.1.d", name: "Speaking" },
    { code: "2.A.1.e", name: "Mathematics" },
    { code: "2.A.1.f", name: "Science" },
  ],

  process: [
    // 学习/思维
    { code: "2.A.2.a", name: "Critical Thinking" },
    { code: "2.A.2.b", name: "Active Learning" },
    { code: "2.A.2.c", name: "Learning Strategies" },
    { code: "2.A.2.d", name: "Monitoring" },

    // 社交/协作
    { code: "2.B.1.a", name: "Social Perceptiveness" },
    { code: "2.B.1.b", name: "Coordination" },
    { code: "2.B.1.c", name: "Persuasion" },
    { code: "2.B.1.d", name: "Negotiation" },
    { code: "2.B.1.e", name: "Instructing" },
    { code: "2.B.1.f", name: "Service Orientation" },

    // 复杂问题与系统性思维
    { code: "2.B.2.i", name: "Complex Problem Solving" },
    { code: "2.B.4.e", name: "Judgment and Decision Making" },
    { code: "2.B.4.g", name: "Systems Analysis" },
    { code: "2.B.4.h", name: "Systems Evaluation" },
  ],

  crossFunctional: {
    resourceManagement: [
      { code: "2.B.5.a", name: "Time Management" },
      { code: "2.B.5.b", name: "Management of Financial Resources" },
      { code: "2.B.5.c", name: "Management of Material Resources" },
      { code: "2.B.5.d", name: "Management of Personnel Resources" },
    ],

    technical: [
      { code: "2.B.3.a", name: "Operations Analysis" },
      { code: "2.B.3.b", name: "Technology Design" },
      { code: "2.B.3.c", name: "Equipment Selection" },
      { code: "2.B.3.d", name: "Installation" },
      { code: "2.B.3.e", name: "Programming" },
      { code: "2.B.3.g", name: "Operations Monitoring" },
      { code: "2.B.3.h", name: "Operation and Control" },
      { code: "2.B.3.j", name: "Equipment Maintenance" },
      { code: "2.B.3.k", name: "Troubleshooting" },
      { code: "2.B.3.l", name: "Repairing" },
      { code: "2.B.3.m", name: "Quality Control Analysis" },
    ],
  },
};

export default skillCategories;
