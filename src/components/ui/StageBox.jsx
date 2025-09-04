import React, { useState } from "react";
import { InfoCircleOutlined } from "@ant-design/icons";
import "./StageBox.css";

/**
 * StageBox: 独立卡片容器，支持：
 * - pill: 角标（如 "Step 1"）
 * - title / subtitle
 * - tipTitle / tipContent: 可折叠的步骤提示
 * - children: 主体内容
 */
export default function StageBox({
  pill,
  title,
  subtitle,
  tipTitle,
  tipContent,
  defaultTipOpen = false,
  children,
}) {
  const [open, setOpen] = useState(!!defaultTipOpen);

  return (
    <div className="stage-box" role="note">
      {pill && <span className="stage-pill">{pill}</span>}
      {title && <p className="stage-title">{title}</p>}
      {subtitle && <p className="stage-sub">{subtitle}</p>}

      {tipTitle && (
        <div className="stage-tip">
          <button
            type="button"
            className="stage-tip-header"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
          >
            <InfoCircleOutlined className="stage-tip-icon" />
            <span className="stage-tip-title">{tipTitle}</span>
            <span className="stage-tip-toggle">{open ? "▲" : "▼"}</span>
          </button>
          {open && <div className="stage-tip-content">{tipContent}</div>}
        </div>
      )}

      <div className="stage-main">{children}</div>
    </div>
  );
}
