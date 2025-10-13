// src/components/analyzer/SkillGap.tsx
import React from "react";

/** Skill item definition */
export interface SkillItem {
  /** Skill name, e.g. "Python Programming" */
  name: string;
  /** Status, only two possible values */
  status: "Reached" | "Missing";
}

/** Props for SkillGap component */
interface SkillGapProps {
  /** Optional skill list, will render only if provided */
  skills?: SkillItem[];
}

/**
 * SkillGap Component
 * - Only renders when `skills` is provided
 * - Shows only items marked as "Missing"
 * - Two-column layout: left = skill name, right = status
 */
const SkillGap: React.FC<SkillGapProps> = ({ skills }) => {
  if (!skills || skills.length === 0) return null;

  const missingSkills = skills.filter((s) => s.status === "Missing");
  if (missingSkills.length === 0) return null;

  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm">
      <h2 className="text-lg font-semibold mb-3 text-gray-800">
        Skill Gap Overview
      </h2>
      <ul className="divide-y divide-gray-100">
        {missingSkills.map((skill) => (
          <li
            key={skill.name}
            className="flex justify-between items-center py-2 text-gray-800"
          >
            <span>{skill.name}</span>
            <span className="font-medium text-gray-600">{skill.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SkillGap;
