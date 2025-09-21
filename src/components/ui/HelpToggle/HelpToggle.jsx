// src/components/ui/HelpToggle/HelpToggle.jsx
import React from "react";
import { Button, Popover } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import "./HelpToggle.css";


export default function HelpToggle({
  children,
  open,
  onOpenChange,
  placement = "bottomLeft",
  size = "middle",     
  iconSize = 20,       
  compact = false,     
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
