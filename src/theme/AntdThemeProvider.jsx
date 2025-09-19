import React, { useEffect, useMemo } from "react";
import { ConfigProvider, theme as antdTheme, App as AntApp } from "antd";

/**
 * 全局主题 Provider
 * props:
 * - mode: 'light' | 'dark'
 * - density: 'default' | 'compact'
 * - primary: 品牌主色（默认 #1E3A8A）
 * - accent:  点缀色（默认 #F59E0B 金色）
 */
export default function BrandThemeProvider({
  children,
  mode = "light",
  density = "default",
  primary = "#1E3A8A",
  accent = "#F59E0B",
}) {
  // 算法选择
  const algorithms = useMemo(() => {
    return [
      antdTheme.defaultAlgorithm,
      mode === "dark" ? antdTheme.darkAlgorithm : null,
      density === "compact" ? antdTheme.compactAlgorithm : null,
    ].filter(Boolean);
  }, [mode, density]);

  // 注入自定义语义变量（非 AntD token），供纯 CSS 使用
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", primary);
    root.style.setProperty("--brand-accent", accent);
    root.setAttribute("data-mode", mode);
    root.setAttribute("data-density", density);
  }, [primary, accent, mode, density]);

  return (
    <ConfigProvider
      theme={{
        cssVar: { key: "sb" }, // 开启 CSS 变量，--sb-colorPrimary 之类
        algorithm: algorithms,
        token: {
          colorPrimary: primary,
          borderRadius: 8,
          fontSize: 16,
          fontSizeSM: 14,
          fontSizeLG: 18,
          fontSizeIcon: 18,
        },
        components: {
          Input:  { controlHeight: 44 },
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
          Card:  { borderRadiusLG: 8 },
          Layout: { headerHeight: 64 },
          Table: { headerBg: "#fafafa", fontSize: 15 },
        },
      }}
    >
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
}
