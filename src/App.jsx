// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";

import Home from "./pages/Home/Home.jsx";
import Analyzer from "./pages/Analyzer/Analyzer.jsx"
import Insight from "./pages/Insight/Insight.jsx";
import Profile from "./pages/Profile/Profile.jsx";
import About from "./pages/About/About.jsx";
import "./App.css";

export default function App() {
  return (
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
  );
}
