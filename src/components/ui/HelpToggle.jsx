import React from "react";
import "./HelpToggle.css";

export default function HelpToggle({ show, onToggle, label, children }) {
  return (
    <div>
      <button
        type="button"
        className="help-btn"
        aria-expanded={show}
        aria-label={label}
        onClick={onToggle}
      >
        ?
      </button>
      {children && (
        <p className={`help-hint ${show ? "is-visible" : "is-hidden"}`}>
          {children}
        </p>
      )}
    </div>
  );
}
