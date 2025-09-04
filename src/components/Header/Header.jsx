import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import "./Header.css";
import StrangerThinkLogo from "../../assets/images/StrangerThink.jpg"; // 引入本地图片

const linkClass = ({ isActive }) =>
  `st-link${isActive ? " is-active" : ""}`;

const Header = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="st-header" aria-label="Main navigation">
      {/* 左：品牌（图片Logo + SkillBridge文字可点击） */}
      <div className="st-brand" aria-label="SkillBridge brand">
        <img
          src={StrangerThinkLogo}
          alt="SkillBridge Logo"
          className="brand-logo"
        />
        <Link to="/" className="brand-name">
          SkillBridge
        </Link>
      </div>

      {/* 右：导航 */}
      <nav className={`st-nav ${open ? "is-open" : ""}`} aria-label="Primary">
        {/* 移动端专属 Home 链接 */}
        <NavLink to="/" className={`${linkClass} st-link-home`}>
          Home
        </NavLink>

        <NavLink to="/Analyzer" className={linkClass}>
          Analyzer
        </NavLink>
        <NavLink to="/profile" className={linkClass}>
          Profile
        </NavLink>
      </nav>

      {/* 移动端菜单按钮 */}
      <button
        className="st-menu"
        aria-label="Toggle menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="st-bar" />
        <span className="st-bar" />
        <span className="st-bar" />
      </button>
    </header>
  );
};

export default Header;
