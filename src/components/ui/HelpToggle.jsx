import React from "react";
import { QuestionCircleOutlined } from "@ant-design/icons";
import "./HelpToggle.css";

export default function HelpToggle({ show, onToggle, children }) {
  return (
    <div className="help-toggle">
      <button
        type="button"
        className="help-btn"
        aria-expanded={show}
        onClick={onToggle}
      >
        <QuestionCircleOutlined className="help-icon" />
      </button>
      {children && (
        <div className={`help-hint ${show ? "is-visible" : "is-hidden"}`}>
          {children}
        </div>
      )}
    </div>
  );
}
