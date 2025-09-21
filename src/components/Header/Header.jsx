// src/components/Header/Header.jsx
import React, { useState, useEffect, useRef } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import StrangerThinkLogo from "../../assets/images/StrangerThink.png";
import useResponsive from "../../lib/hooks/useResponsive";
import "./Header.css";

const linkClass = ({ isActive }) => `st-link${isActive ? " is-active" : ""}`;

export default function Header() {
  // ✅ 只用 isDesktop，非桌面（平板+手机）都当“触控模式”
  const { isDesktop } = useResponsive();

  const [open, setOpen] = useState(false);
  const navRef = useRef(null);
  const btnRef = useRef(null);
  const { pathname } = useLocation();

  // 路由变化时收起
  useEffect(() => setOpen(false), [pathname]);

  // 点击外部收起
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

  // ESC 收起
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // 进入桌面时若菜单打开则收起
  useEffect(() => { if (isDesktop && open) setOpen(false); }, [isDesktop, open]);

  // ✅ 给 header 打模式类名（供 CSS 使用）
  const modeClass = isDesktop ? "is-desktop" : "is-touch";

  return (
    <header className={`st-header ${modeClass}`} aria-label="Main navigation">
      <Link to="/" className="st-brand" aria-label="SkillBridge home">
        <img src={StrangerThinkLogo} alt="SkillBridge logo" className="brand-logo" />
        <span className="brand-name">SkillBridge</span>
      </Link>

      {/* 桌面：内联导航 */}
      {isDesktop && (
        <nav id="primary-nav" className="st-nav" aria-label="Primary">
          <NavLink to="/Analyzer" className={linkClass}>Analyzer</NavLink>
          <NavLink to="/Profile"  className={linkClass}>Profile</NavLink>
          <NavLink to="/Insight"  className={linkClass}>Insight</NavLink>
        </nav>
      )}

      {/* 触控（平板+手机）：汉堡 + 下拉 */}
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
