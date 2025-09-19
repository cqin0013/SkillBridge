// src/layouts/MainLayout.jsx
import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import "./MainLayout.css";

/**
 * App layout with a sticky footer using flex column.
 * The footer naturally sits at the bottom without overlapping content.
 */
export default function MainLayout() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <div className={`app-shell ${isHome ? "is-home" : ""}`}>
      {/* Header stays at the top */}
      <Header />

      {/* Main grows to fill remaining height to push footer to the bottom */}
      <main id="main-content" className="app-main" role="main">
        <Outlet />
      </main>

      {/* Footer only on non-home pages */}
      {!isHome && <Footer />}
    </div>
  );
}
