// src/App.jsx
import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "antd/dist/reset.css";

import AntdThemeProvider from "./theme/AntdThemeProvider";          
import MainLayout from "./layouts/MainLayout";


const Home = lazy(() => import("./pages/Home/Home.jsx"));
const Analyzer = lazy(() => import("./pages/Analyzer/Analyzer.jsx"));
const Insight = lazy(() => import("./pages/Insight/Insight.jsx"));
const Profile = lazy(() => import("./pages/Profile/Profile.jsx"));

export default function App() {
  return (
    <AntdThemeProvider>
      <Router>
        {/* 可换成骨架屏/Spinner，这里用最小空占位，避免额外样式依赖 */}
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Home />} />
              <Route path="Analyzer" element={<Analyzer />} />
              <Route path="Insight" element={<Insight />} />
              <Route path="Profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </AntdThemeProvider>
  );
}
