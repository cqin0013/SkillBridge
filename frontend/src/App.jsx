
import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "antd/dist/reset.css";
import AntdThemeProvider from "./theme/AntdThemeProvider";
import MainLayout from "./layouts/MainLayout";
import { Spin } from "antd";
import RequireGate from "./routes/RequireGate";

const Home = lazy(() => import("./pages/Home/Home.jsx"));
const Analyzer = lazy(() => import("./pages/Analyzer/Analyzer.jsx"));
const Insight = lazy(() => import("./pages/Insight/Insight.jsx"));
const Profile = lazy(() => import("./pages/Profile/Profile.jsx"));
const PasswordGate = lazy(() => import("./pages/Gate/PasswordGate.jsx"));


export default function App() {
  return (
    <AntdThemeProvider>
      <Router>
        <Suspense fallback={<div style={{display:"grid",placeItems:"center",minHeight:"40vh"}}><Spin /></div>}>
          <Routes>       
            <Route path="/gate" element={<PasswordGate />} />          
            <Route path="/" element={<MainLayout />}>
              <Route
                index
                element={
                  <RequireGate>
                    <Home />
                  </RequireGate>
                }
              />
              <Route
                path="Analyzer"
                element={
                  <RequireGate>
                    <Analyzer />
                  </RequireGate>
                }
              />
              <Route
                path="Insight"
                element={
                  <RequireGate>
                    <Insight />
                  </RequireGate>
                }
              />
              <Route
                path="Profile"
                element={
                  <RequireGate>
                    <Profile />
                  </RequireGate>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </AntdThemeProvider>
  );
}
