// src/components/IntroHero/IntroHero.jsx
import { Button, Typography, Space } from "antd";
import { useNavigate } from "react-router-dom";
import "./Hero.css";

const { Title, Paragraph } = Typography;

/**
 * 可复用的首屏 Hero
 * Props:
 * - title: string
 * - subtitle?: string
 * - bgImage: string (必传)
 * - ctaText?: string
 * - ctaHref?: string   // 或者配合 onCtaClick 使用
 * - onCtaClick?: () => void
 * - extraActions?: ReactNode  // 额外按钮/链接
 * - height?: string | number  // 可覆盖默认高度
 */
export default function IntroHero({
  title,
  subtitle,
  bgImage,
  ctaText = "Get started",
  ctaHref,
  onCtaClick,
  extraActions,
  height,
}) {
  const navigate = useNavigate();
  const handleClick = () => {
    if (onCtaClick) return onCtaClick();
    if (ctaHref) return navigate(ctaHref);
  };

  return (
    <section
      className="sb-hero"
      style={{
        "--hero-bg": `url(${bgImage})`,
        ...(height ? { height } : null),
      }}
      aria-label="Intro hero"
    >
      <div className="sb-hero__inner">
        <div className="sb-hero__col">
          {title && (
            <Title level={1} className="sb-hero__title">
              {title}
            </Title>
          )}
          {subtitle && (
            <Paragraph className="sb-hero__subtitle">{subtitle}</Paragraph>
          )}

          <Space className="sb-hero__actions" align="center">
            {ctaText && (
              <Button
                type="primary"
                size="large"
                shape="round"
                onClick={handleClick}
              >
                {ctaText}
              </Button>
            )}
            {extraActions}
          </Space>
        </div>

        {/* 右侧占位用于露出背景，不放内容 */}
        <div className="sb-hero__spacer" aria-hidden="true" />
      </div>
    </section>
  );
}
