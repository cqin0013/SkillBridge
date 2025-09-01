import React from "react";

const LABELS = ["Novice", "Beginner", "Intermediate", "Advanced", "Expert"];

export default function ProficiencyTag({ level = 3 }) {
  const label = LABELS[level - 1] || "Unknown";
  return (
    <span className={`sb-prof-tag lvl-${level}`} title={label}>
      {label}
    </span>
  );
}
