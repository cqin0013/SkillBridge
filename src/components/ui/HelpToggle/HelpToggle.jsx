
import { Button, Popover } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import "./HelpToggle.css";
import useResponsive from "../../../lib/hooks/useResponsive";

/**
 * HelpToggle
 * - Shows a circular help button that toggles a popover with help content.
 * - Hides entirely on mobile by default (configurable via hideOnMobile).
 */
export default function HelpToggle({
  children,
  open,
  onOpenChange,
  placement = "bottomLeft",
  size = "middle",
  iconSize = 20,
  compact = false,
  hideOnMobile = true, 
}) {
  const { isMobile } = useResponsive();

  // If configured to hide on mobile and current viewport is mobile, render nothing
  if (hideOnMobile && isMobile) {
    return null;
  }

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
