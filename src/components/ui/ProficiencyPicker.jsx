import React from "react";
import { Rate, Tooltip } from "antd";
import "./Proficiency.css";

const LABELS = ["Novice", "Beginner", "Intermediate", "Advanced", "Expert"];

/** level: 1..5 */
export default function ProficiencyPicker({ value = 3, onChange }) {
  return (
    <Tooltip title={LABELS[value - 1]}>
      <Rate allowClear={false} value={value} onChange={onChange} count={5} />
    </Tooltip>
  );
}
