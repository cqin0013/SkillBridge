// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ConfigProvider, theme as antdTheme } from "antd";
import "antd/dist/reset.css";           // AntD v5 重置样式（可选，建议保留）
import "./App.css";                     // 全局设计变量 + 基础样式

import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home/Home.jsx";
import Analyzer from "./pages/Analyzer/Analyzer.jsx";
import Insight from "./pages/Insight/Insight.jsx";
import Profile from "./pages/Profile/Profile.jsx";
import About from "./pages/About/About.jsx";

export default function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.defaultAlgorithm,
        token: {
          // 统一主题色 & 基础设计
          colorPrimary: "var(--color-primary)",
          colorSuccess: "var(--color-success)",
          colorWarning: "var(--color-warning)",
          colorError: "var(--color-error)",
          colorText: "var(--color-text)",
          colorTextSecondary: "var(--color-text-sub)",
          borderRadius: 12,
          fontSize: 14,
          controlHeight: 40,
        },
        components: {
          Button: { borderRadius: 999, fontWeight: 800 },
          Input: { borderRadius: 10 },
          Select: { borderRadius: 10 },
          Progress: { lineWidth: 10, lineBorderRadius: 999 },
          Tooltip: { colorBgSpotlight: "#fff" },
        },
      }}
    >
      <Router>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="Analyzer" element={<Analyzer />} />
            <Route path="Insight" element={<Insight />} />
            <Route path="Profile" element={<Profile />} />
            <Route path="About" element={<About />} />
          </Route>
        </Routes>
      </Router>
    </ConfigProvider>
  );
}
