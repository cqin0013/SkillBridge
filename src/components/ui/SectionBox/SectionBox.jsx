import { Card, Typography } from "antd";
import useResponsive from "../../../lib/hooks/useResponsive"; // adjust path if needed
import "./SectionBox.css";

const { Title } = Typography;

/**
 * SectionBox
 * A lightweight wrapper around AntD Card with two visual variants and
 * automatic compact padding on mobile.
 *
 * Props:
 * - title?: ReactNode
 * - extra?: ReactNode                  // right-side actions in the header
 * - footer?: ReactNode                 // optional footer under the body
 * - compact?: boolean                  // force dense paddings regardless of viewport
 * - variant?: "default" | "question"   // "question" uses a light blue header
 * - className?: string
 * - bodyStyle?: React.CSSProperties    // (legacy alias) extra body styles; merged into styles.body
 * - children: React.ReactNode
 *
 * Notes:
 * - AntD v5 deprecates `bordered`, `headStyle`, and `bodyStyle`.
 *   Use `variant="outlined"` and `styles={{ header, body }}` instead.
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
  const { isMobile } = useResponsive();
  const dense = compact || isMobile; // auto-compact on mobile

  const cls = `section-box section-box--${variant} ${className}`.trim();

  const cardStyles = {
    header: {
      // If there is no title/extra, remove header padding entirely
      padding: title || extra ? (dense ? "8px 12px" : "10px 16px") : 0,
    },
    body: {
      padding: dense ? 12 : 16,
      ...(bodyStyle || {}), 
    },
  };

  return (
    <Card
      variant="outlined"                 
      className={cls}
      title={
        title ? (
          <Title level={5} style={{ margin: 0 }}>
            {title}
          </Title>
        ) : null
      }
      extra={extra || null}
      styles={cardStyles}                
    >
      <div className="stage-box">{children}</div>

      {footer ? <div className="section-box__footer">{footer}</div> : null}
    </Card>
  );
}
