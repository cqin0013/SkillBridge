// src/components/ui/GapTable.jsx
import React from "react";
import "./GapTable.css";

const STATUS_LABEL = {
  ok: "Met",
  miss: "Not Met",
  partial: "Partially Met",
};

export default function GapTable({ rows = [], hideMet = false }) {
  //：accept {name, status} and {name, covered}
  const normalizeStatus = (r) => {
    if (r && typeof r === "object") {
      if (r.status) {
        const s = String(r.status).toLowerCase();
        return s === "ok" ? "ok" : s === "partial" ? "partial" : "miss";
      }
      return r.covered ? "ok" : "miss";
    }
    return "miss";
  };

  // 
  const normalized = Array.isArray(rows)
    ? rows
        .map((r) => {
          const status = normalizeStatus(r);
          return { ...r, status };
        })
        .filter((r) => (hideMet ? r.status !== "ok" : true))
    : [];

  if (normalized.length === 0) {
    return (
      <table className="gap-table">
        <thead>
          <tr>
            <th>Target Ability</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr className="miss">
            <td colSpan={2} style={{ color: "var(--sb-ink-sub)" }}>
              No data to show.
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <table className="gap-table">
      <thead>
        <tr>
          <th>Target Ability</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {normalized.map((row, i) => {
          const status = row.status;
          const name = row?.name ?? "-";
          const type = row?.type; // "Knowledge" | "Skill" | "Tech"
          return (
            <tr key={`${name}-${i}`} className={status}>
              <td>
                <div className="sg-cell">
                  <span className="sg-name">{name}</span>
                  {type ? <span className="sg-badge">{type}</span> : null}
                </div>
              </td>
              <td>{STATUS_LABEL[status]}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
