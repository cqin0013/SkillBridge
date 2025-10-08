
import  { useState, useEffect, useRef } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import StrangerThinkLogo from "../../assets/images/StrangerThink.png";
import useResponsive from "../../lib/hooks/useResponsive";
import "./Header.css";

const linkClass = ({ isActive }) => `st-link${isActive ? " is-active" : ""}`;

export default function Header() {
  // Only use isDesktop. Non-desktop (tablet + mobile) are treated as "touch mode".
  const { isDesktop } = useResponsive();

  const [open, setOpen] = useState(false);
  const navRef = useRef(null);
  const btnRef = useRef(null);
  const { pathname } = useLocation();

  // Close menu on route change
  useEffect(() => setOpen(false), [pathname]);

  // Close menu when clicking outside
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

  // Close menu on ESC key
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // When switching to desktop, close the menu if it’s open
  useEffect(() => { if (isDesktop && open) setOpen(false); }, [isDesktop, open]);

  //  Add mode class to header 、
  const modeClass = isDesktop ? "is-desktop" : "is-touch";

  return (
    <header className={`st-header ${modeClass}`} aria-label="Main navigation">
      <Link to="/" className="st-brand" aria-label="SkillBridge home">
        <img src={StrangerThinkLogo} alt="SkillBridge logo" className="brand-logo" />
        <span className="brand-name">SkillBridge</span>
      </Link>

      {/* Desktop: inline navigation */}
      {isDesktop && (
        <nav id="primary-nav" className="st-nav" aria-label="Primary">
          <NavLink to="/Analyzer" className={linkClass}>Analyzer</NavLink>
          <NavLink to="/Profile"  className={linkClass}>Profile</NavLink>
          {/* <NavLink to="/Insight"  className={linkClass}>Insight</NavLink> */}
        </nav>
      )}

      {/* Touch (tablet + mobile): hamburger + dropdown */}
      {!isDesktop && (
        <>
          <nav
            id="primary-nav"
            ref={navRef}
            className={`st-nav ${open ? "is-open" : ""}`}
            aria-label="Primary"
          >
            <NavLink to="/Analyzer" className={linkClass}>Analyzer</NavLink>
            <NavLink to="/Profile"  className={linkClass}>Profile</NavLink>
            {/* <NavLink to="/Insight"  className={linkClass}>Insight</NavLink> */}
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
