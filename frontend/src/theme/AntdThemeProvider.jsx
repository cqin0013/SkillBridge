
import { useEffect } from "react";
import { ConfigProvider, App as AntApp } from "antd";

/**
 * Global Theme Provider (light-only)
 * - Exposes brand colors via Ant Design tokens and CSS variables
 */
export default function BrandThemeProvider({
  children,
  primary = "#1E3A8A", 
  accent = "#F59E0B",  
}) {
  // Inject semantic CSS variables for custom (non-AntD) styles
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", primary);
    root.style.setProperty("--brand-accent", accent);
    root.setAttribute("data-mode", "light");     
    root.setAttribute("data-density", "default");
  }, [primary, accent]);

  return (
    <ConfigProvider
      theme={{
        cssVar: { key: "sb" }, 
        token: {
          colorPrimary: primary,
          colorInfo: accent,
          borderRadius: 8,
          fontSize: 16,
          fontSizeSM: 14,
          fontSizeLG: 18,
          fontSizeIcon: 18,
        },
        components: {
          Input: { controlHeight: 44 },
          Select: { controlHeight: 44 },
          Button: {
            controlHeight: 48,
            controlHeightLG: 54,
            borderRadius: 999,
            fontWeight: 800,
            paddingInline: 20,
            paddingInlineLG: 24,
            fontSize: 16,
            fontSizeLG: 18,
          },
          Typography: {
            fontSizeHeading1: 40,
            fontSizeHeading2: 32,
            fontSizeHeading3: 26,
            fontSizeHeading4: 20,
            fontSizeHeading5: 18,
            titleMarginBottom: 8,
          },
          Card: { borderRadiusLG: 8 },
          Layout: { headerHeight: 64 },
          Table: { headerBg: "#fafafa", fontSize: 15 },
        },
      }}
    >
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
}
