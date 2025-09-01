import React from "react";
//port classNames from "classnames";
import "./StageBox.css";

export default function StageBox({ pill, title, subtitle, children }) {
  return (
    <div className="stage-box" role="note">
      {pill && <span className="stage-pill">{pill}</span>}
      {title && <p className="stage-title">{title}</p>}
      {subtitle && <p className="stage-sub">{subtitle}</p>}
      {children}
    </div>
  );
}
