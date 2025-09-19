import React, { useState, useEffect, useRef } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import StrangerThinkLogo from "../../assets/images/StrangerThink.png";
import useResponsive from "../../lib/hooks/useResponsive";
import "./Header.css";

// Keep gold underline only; active state handled by CSS class
const linkClass = ({ isActive }) => `st-link${isActive ? " is-active" : ""}`;

export default function Header() {
  const { isDesktop, isMobile } = useResponsive();
  const [open, setOpen] = useState(false);
  const navRef = useRef(null);
  const btnRef = useRef(null);
  const { pathname } = useLocation();

  // Close dropdown when route changes
  useEffect(() => setOpen(false), [pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const onDocClick = (e) => {
      if (
        navRef.current && !navRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // Close with ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="st-header" aria-label="Main navigation">
      <Link to="/" className="st-brand" aria-label="SkillBridge home">
        <img src={StrangerThinkLogo} alt="SkillBridge logo" className="brand-logo" />
        <span className="brand-name">SkillBridge</span>
      </Link>

      {/* Desktop: inline nav on the right */}
      {isDesktop && (
        <nav id="primary-nav" className="st-nav" aria-label="Primary">
          <NavLink to="/Analyzer" className={linkClass}>Analyzer</NavLink>
          <NavLink to="/Profile"  className={linkClass}>Profile</NavLink>
          <NavLink to="/Insight"  className={linkClass}>Insight</NavLink>
        </nav>
      )}

      {/* Mobile: hamburger + dropdown */}
      {isMobile && (
        <>
          <nav
            id="primary-nav"
            ref={navRef}
            className={`st-nav ${open ? "is-open" : ""}`}
            aria-label="Primary"
          >
            <NavLink to="/Analyzer" className={linkClass}>Analyzer</NavLink>
            <NavLink to="/Profile"  className={linkClass}>Profile</NavLink>
            <NavLink to="/Insight"  className={linkClass}>Insight</NavLink>
          </nav>

          <button
            ref={btnRef}
            className="st-menu"
            aria-label="Toggle menu"
            aria-controls="primary-nav"
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
          >
            <span className="st-bar" />
            <span className="st-bar" />
            <span className="st-bar" />
          </button>
        </>
      )}
    </header>
  );
}
