
import  { useState, useCallback, useId } from "react";
import { Card, Typography, Space, Button } from "antd";
import { CaretRightOutlined } from "@ant-design/icons";
import useResponsive from "../../../lib/hooks/useResponsive"; 
import "./StageBox.css";

const { Title } = Typography;

/**
 * StageBox — Distinct, collapsible section card with a header strip and caret.
 *
 * Features:
 * - Collapsed by default (configurable), with controlled/uncontrolled modes.
 * - Optional "step" pill (compatible legacy `pill`).
 * - Two content blocks: "intro" and "actions" with customizable headings.
 * - Accent color controls the header strip and border gradient.
 * - Responsive polish via `useResponsive()` (smaller title & no hint on mobile).
 *
 * Props:
 *  - step?: React.ReactNode               // recommended: "Step 1"
 *  - pill?: React.ReactNode               // legacy alias of step (TwoCardScaffold)
 *  - title?: React.ReactNode
 *  - introTitle?: React.ReactNode         // default "Page introduction"
 *  - introContent?: React.ReactNode
 *  - actionsTitle?: React.ReactNode       // default "What you can do on this page"
 *  - actionsContent?: React.ReactNode
 *  - extra?: React.ReactNode              // right-side header slot (e.g., buttons)
 *  - accent?: string                      // theme color for header/border; default indigo
 *  - defaultCollapsed?: boolean           // uncontrolled initial state, default true
 *  - collapsed?: boolean                  // controlled state
 *  - onCollapsedChange?: (collapsed:boolean)=>void
 *  - hint?: React.ReactNode               // hint text shown when collapsed; default "Click to view details"
 */
export default function StageBox({
  step,
  pill, // compatibility alias
  title,
  introTitle = "Page introduction",
  introContent,
  actionsTitle = "What you can do on this page",
  actionsContent,
  extra,
  accent = "#6366f1",
  defaultCollapsed = true,
  collapsed: collapsedProp,
  onCollapsedChange,
  hint = "Click to view details",
}) {
  // Responsive flags (we only need isMobile here)
  const { isMobile } = useResponsive();

  // Prefer `step`; fall back to legacy `pill` if absent
  const stepLabel = step ?? pill;

  // Controlled vs uncontrolled
  const isControlled = typeof collapsedProp === "boolean";
  const [innerCollapsed, setInnerCollapsed] = useState(!!defaultCollapsed);
  const collapsed = isControlled ? !!collapsedProp : innerCollapsed;

  const setCollapsed = useCallback(
    (next) => {
      if (!isControlled) setInnerCollapsed(next);
      onCollapsedChange?.(next);
    },
    [isControlled, onCollapsedChange]
  );

  const toggle = useCallback(() => setCollapsed(!collapsed), [collapsed, setCollapsed]);

  // Decide whether the body exists at all (if not, hide the caret)
  const hasBody = !!(introContent || actionsContent);

  // Slightly smaller headline on mobile for better fit
  const headingLevel = isMobile ? 5 : 4;

  // Show hint only if collapsed & has body; also suppress hint on mobile to save space
  const showHint = hasBody && collapsed && hint && !isMobile;

  // a11y: associate toggle button with the content region
  const bodyId = useId();

  return (
    <Card
      variant="borderless"
      className="sb-stage"
      style={{ "--sb-accent": accent }}
      styles={{ body: { padding: 0 } }}
    >
      {/* Header strip */}
      <div className="sb-stage__head">
        <div className="sb-stage__left">
          {stepLabel ? <span className="sb-stage__step">{stepLabel}</span> : null}
          <Title level={headingLevel} className="sb-stage__title">
            {title}
          </Title>
        </div>

        <Space size={8} align="center" className="sb-stage__right">
          {extra || null}
          {showHint ? <span className="sb-stage__hint">{hint}</span> : null}

          {hasBody && (
            <Button
              type="text"
              shape="circle"
              size="small"
              className="sb-stage__arrow"
              aria-label={collapsed ? "Expand section" : "Collapse section"}
              aria-expanded={!collapsed}
              aria-controls={bodyId}
              onClick={(e) => {
                e.stopPropagation();
                toggle();
              }}
              icon={<CaretRightOutlined className={collapsed ? "" : "is-open"} />}
            />
          )}
        </Space>
      </div>

      {/* Body (rendered only when expanded) */}
      {!collapsed && hasBody && (
        <div id={bodyId} className="sb-stage__body">
          {introContent && (
            <div className="sb-block">
              <div className="sb-block__title">{introTitle}</div>
              <div className="sb-block__content">{introContent}</div>
            </div>
          )}

          {actionsContent && (
            <div className="sb-block">
              <div className="sb-block__title">{actionsTitle}</div>
              <div className="sb-block__content">{actionsContent}</div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
