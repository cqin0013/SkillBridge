import React, { useState, useCallback } from "react";
import { Card, Typography, Space, Button } from "antd";
import { CaretRightOutlined } from "@ant-design/icons";
import "./StageBox.css";

const { Title } = Typography;

/**
 * Distinct StageBox: header row + arrow; collapsed by default.
 * Props:
 *  - step?: ReactNode         // 推荐：传 "Step 1"
 *  - pill?: ReactNode         // 兼容旧写法（TwoCardScaffold 里的 stepPill）
 *  - title?: ReactNode
 *  - introTitle?: ReactNode
 *  - introContent?: ReactNode
 *  - actionsTitle?: ReactNode
 *  - actionsContent?: ReactNode
 *  - extra?: ReactNode
 *  - accent?: string          // 头部/描边主题色，默认 indigo
 *  - defaultCollapsed?: boolean (default true)
 *  - collapsed?: boolean
 *  - onCollapsedChange?: (bool)=>void
 *  - hint?: ReactNode         // 折叠时箭头旁提示，默认 "Click to view details"
 */
export default function StageBox({
  step,
  pill,                         // 👈 兼容旧 prop
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
  const stepLabel = step ?? pill; // 👈 兼容：优先用 step，没有就用 pill

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

  const hasBody = !!(introContent || actionsContent);

  return (
    <Card bordered={false} className="sb-stage" style={{ "--sb-accent": accent }} bodyStyle={{ padding: 0 }}>
      {/* Header */}
      <div className="sb-stage__head">
        <div className="sb-stage__left">
          {stepLabel ? <span className="sb-stage__step">{stepLabel}</span> : null}
          <Title level={4} className="sb-stage__title">{title}</Title>
        </div>

        <Space size={8} align="center" className="sb-stage__right">
          {extra || null}
          {hasBody && collapsed && hint ? <span className="sb-stage__hint">{hint}</span> : null}
          {hasBody && (
            <Button
              type="text"
              shape="circle"
              size="small"
              className="sb-stage__arrow"
              aria-label={collapsed ? "Expand section" : "Collapse section"}
              aria-expanded={!collapsed}
              onClick={(e) => { e.stopPropagation(); toggle(); }}
              icon={<CaretRightOutlined className={collapsed ? "" : "is-open"} />}
            />
          )}
        </Space>
      </div>

      {/* Body (only when expanded) */}
      {!collapsed && hasBody && (
        <div className="sb-stage__body">
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
