import { useEffect } from "react";
import { Row, Col, Typography, Button, Space } from "antd";
import introImg from "../../../assets/images/AnalyzerIntro.png";
import "./AnalyzerIntro.css";

const { Title, Paragraph, Text } = Typography;

/**
 * AnalyzerIntro
 * - Applies a themed background and disables page scrolling for this screen.
 * - Measures header/footer heights and sets a CSS variable so the hero fits
 *   exactly in the remaining viewport, keeping the footer visible without scroll.
 */
export default function AnalyzerIntro({ onStart }) {
  useEffect(() => {
    // Guard for non-DOM environments (SSR)
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const htmlEl = document.documentElement;
    const bodyEl = document.body;

    // Apply themed classes
    htmlEl.classList.add("intro-theme");
    bodyEl.classList.add("intro-theme");

    // Prevent scrolling on this page only
    bodyEl.classList.add("intro-no-scroll");

    // Trigger enter animation a frame later
    requestAnimationFrame(() => bodyEl.classList.add("intro-mounted"));

    // Measure available height: viewport - header - footer - safe areas
    const measureAndApply = () => {
      const header =
        document.querySelector(".ant-layout-header") ||
        document.querySelector("header");
      const footer =
        document.querySelector(".ant-layout-footer") ||
        document.querySelector("footer");

      const headerH = header?.offsetHeight || 0;
      const footerH = footer?.offsetHeight || 0;

      // Optional safe-area CSS variables (0 if not defined)
      const safeTop =
        parseInt(
          getComputedStyle(htmlEl).getPropertyValue("--sat") || "0",
          10
        ) || 0;
      const safeBottom =
        parseInt(
          getComputedStyle(htmlEl).getPropertyValue("--sab") || "0",
          10
        ) || 0;

      const viewportH = window.visualViewport?.height || window.innerHeight || 0;
      const available = Math.max(0, viewportH - headerH - footerH - safeTop - safeBottom);

      // Expose values to CSS
      htmlEl.style.setProperty("--intro-min-h", `${available}px`);
      htmlEl.style.setProperty("--intro-footer-h", `${footerH}px`);
    };

    // Initial measure + reactive updates
    measureAndApply();
    window.addEventListener("resize", measureAndApply);
    window.addEventListener("orientationchange", measureAndApply);
    // Some mobile browsers fire this when the URL bar shows/hides
    window.visualViewport?.addEventListener("resize", measureAndApply);

    return () => {
      // Cleanup theme + scroll lock
      htmlEl.classList.remove("intro-theme");
      bodyEl.classList.remove("intro-theme", "intro-mounted", "intro-no-scroll");

      // Cleanup CSS variables
      htmlEl.style.removeProperty("--intro-min-h");
      htmlEl.style.removeProperty("--intro-footer-h");

      // Remove listeners
      window.removeEventListener("resize", measureAndApply);
      window.removeEventListener("orientationchange", measureAndApply);
      window.visualViewport?.removeEventListener("resize", measureAndApply);
    };
  }, []);

  return (
    <section className="intro-hero" aria-label="Analyzer introduction">
      <div className="intro-container">
        <Row gutter={[24, 24]} align="middle" justify="space-between">
          <Col xs={24} md={14} lg={13}>
            <div className="intro-stack">
              <Text className="intro-eyebrow" strong>
                Career Transition • Skills Gap • Roadmaps
              </Text>

              <Title level={1} className="intro-title">
                Career Ability Analyzer
              </Title>

              <div className="accent-rule" aria-hidden="true" />

              <Paragraph className="intro-desc">
                Discover matching roles from your background, see skill gaps,
                and get a tailored learning roadmap.
              </Paragraph>

              <Space style={{ marginTop: 12 }}>
                <Button type="primary" size="large" onClick={onStart}>
                  Get Started
                </Button>
              </Space>
            </div>
          </Col>

          <Col xs={24} md={10} lg={10}>
            <div className="intro-visual">
              <img
                src={introImg}
                alt="Ability analysis illustration"
                className="intro-image"
                draggable="false"
              />
            </div>
          </Col>
        </Row>
      </div>
    </section>
  );
}
