// Minimal footer: always visible, team name only.

import { Layout, Typography } from "antd";
import "./Footer.css";

const { Footer } = Layout;

export default function AppFooter() {
  return (
    <Footer
      className="footer-mini"
      aria-label="Application footer"
      role="contentinfo"
    >
      <Typography.Text type="secondary">Stranger Thinks</Typography.Text>
    </Footer>
  );
}
