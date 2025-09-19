// src/components/ui/SectionBox/SectionBox.jsx
import React from "react";
import { Card, Typography } from "antd";
import "./SectionBox.css";

const { Title } = Typography;

/**
 * SectionBox
 * - Props:
 *   - title?: ReactNode
 *   - extra?: ReactNode
 *   - footer?: ReactNode
 *   - compact?: boolean
 *   - variant?: "default" | "question"  // question: 淡蓝头部
 *   - className?: string
 *   - bodyStyle?: React.CSSProperties
 */
export default function SectionBox({
  title,
  extra,
  footer,
  compact = false,
  variant = "default",
  className = "",
  bodyStyle,
  children,
}) {
  const cls = `section-box section-box--${variant} ${className}`.trim();

  return (
    <Card
      bordered
      className={cls}
      title={
        title ? (
          <Title level={5} style={{ margin: 0 }}>
            {title}
          </Title>
        ) : null
      }
      extra={extra || null}
      headStyle={{ padding: title || extra ? "10px 16px" : 0 }}
      bodyStyle={{ padding: compact ? 12 : 16, ...(bodyStyle || {}) }}
    >
      <div className="stage-box">{children}</div>
      {footer ? (
        <div className="section-box__footer">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}
