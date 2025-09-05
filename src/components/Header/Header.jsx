// Header.jsx
// Purpose: Main site header with brand logo, navigation links, and a responsive menu button.
// - Shows logo + brand name on the left (clickable link to home).
// - Navigation links on the right (Analyzer, Profile).
// - On small screens, a hamburger menu toggles the nav open/closed.

import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import "./Header.css";
import StrangerThinkLogo from "../../assets/images/StrangerThink.jpg"; // Import local logo image

// Utility function to compute NavLink class based on active state
const linkClass = ({ isActive }) =>
  `st-link${isActive ? " is-active" : ""}`;

const Header = () => {
  // State for mobile nav menu toggle
  const [open, setOpen] = useState(false);

  return (
    <header className="st-header" aria-label="Main navigation">
      {/* Left: Brand area (logo + brand name) */}
      <div className="st-brand" aria-label="SkillBridge brand">
        <img
          src={StrangerThinkLogo}
          alt="SkillBridge Logo"
          className="brand-logo"
        />
        {/* Brand name links back to homepage */}
        <Link to="/" className="brand-name">
          SkillBridge
        </Link>
      </div>

      {/* Right: Navigation links (desktop and mobile) */}
      <nav className={`st-nav ${open ? "is-open" : ""}`} aria-label="Primary">
        {/* Special case: Home link only visible/needed on mobile nav */}
        <NavLink to="/" className={`${linkClass} st-link-home`}>
          Home
        </NavLink>

        {/* Analyzer link */}
        <NavLink to="/Analyzer" className={linkClass}>
          Analyzer
        </NavLink>

        {/* Profile link */}
        <NavLink to="/profile" className={linkClass}>
          Profile
        </NavLink>
      </nav>

      {/* Mobile menu toggle button ("hamburger") */}
      <button
        className="st-menu"
        aria-label="Toggle menu"      // Accessible label for screen readers
        aria-expanded={open}         // Reflects open/closed state for accessibility
        onClick={() => setOpen(!open)} // Toggle open state
      >
        {/* Three bars of the hamburger icon */}
        <span className="st-bar" />
        <span className="st-bar" />
        <span className="st-bar" />
      </button>
    </header>
  );
};

export default Header;
