// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, theme as antdTheme } from "antd";
import "antd/dist/reset.css";
import "./App.css";

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
      <Router /* 如果部署在子路径，可加 basename，例如 basename="/app" */>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<Home />} />
            {/* 路由统一用小写，更稳妥 */}
            <Route path="analyzer" element={<Analyzer />} />
            <Route path="insight" element={<Insight />} />
            <Route path="profile" element={<Profile />} />
            <Route path="about" element={<About />} />
            {/* 兜底：未知路径跳回首页或你的 404 组件 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </ConfigProvider>
  );
}
