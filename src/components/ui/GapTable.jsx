import React from "react";
import "./GapTable.css";

export default function GapTable({ rows }) {
  return (
    <table className="gap-table">
      <thead>
        <tr>
          <th>Target Ability</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ name, covered }) => (
          <tr key={name} className={covered ? "ok" : "miss"}>
            <td>
              <div className="sg-cell">
                <span className="sg-name">{name}</span>

              </div>
            </td>
            <td>{covered ? "Covered" : "Missing"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
