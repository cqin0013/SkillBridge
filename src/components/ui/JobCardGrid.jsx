import React from "react";
import "./JobCardGrid.css";

export default function JobCardGrid({ jobs, targetJob, onSelect }) {
  return (
    <div className="jobs-grid">
      {jobs.map(({ job, match, details }) => {
        const isSel = targetJob === job;
        return (
          <button
            key={job}
            type="button"
            className={`job-card ${isSel ? "is-selected" : ""}`}
            onClick={() => onSelect(job)}
          >
            <div className="job-title">{job}</div>
            <div className="job-score">Match score: {match}/100</div>
            <div className="job-req">
              {details.map(({ name, importance }) => (
                <span key={name} className="req-chip">
                  <span className="req-name">{name}</span>
                  <span className="req-val">{importance}/100</span>
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
