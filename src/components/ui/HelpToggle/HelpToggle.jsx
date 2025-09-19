// src/components/ui/HelpToggle/HelpToggle.jsx
import React from "react";
import { Button, Popover } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import "./HelpToggle.css";

/**
 * Ant Design-only HelpToggle
 *
 * 新增：
 * - compact: boolean  // 开启“小圈大问号”模式（默认 false）
 */
export default function HelpToggle({
  children,
  open,
  onOpenChange,
  placement = "bottomLeft",
  size = "middle",     // 外圈我们用 CSS 控制，这里给个中等，避免多余体积
  iconSize = 20,       // 仍然支持老的传参；compact 模式下会被 CSS 接管
  compact = false,     // ✅ 开启后：圈更小、问号更大
}) {
  const btnClass = compact ? "help-toggle help-toggle--compact" : "help-toggle";

  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      trigger="click"
      placement={placement}
      content={<div className="help-popover">{children}</div>}
    >
      <Button
        type="primary"
        shape="circle"
        size={size}
        aria-label="Help"
        className={btnClass}
        icon={<QuestionCircleOutlined style={{ fontSize: iconSize }} />}
      />
    </Popover>
  );
}
