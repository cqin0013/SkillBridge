import React from "react";
import "./GapTable.css";

export default function GapTable({ rows }) {
  return (
    <table className="gap-table">
      <thead>
        <tr>
          <th>Target Ability & Importance</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ name, jobImportance, covered }) => (
          <tr key={name} className={covered ? "ok" : "miss"}>
            <td>
              <div className="sg-cell">
                <span className="sg-name">{name}</span>
                <span className="sg-badge">{jobImportance}/100</span>
              </div>
            </td>
            <td>{covered ? "Covered" : "Missing"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
