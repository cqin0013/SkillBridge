import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import "./Header.css";
import Logo from "./TeamLogo"; // 你的 Logo 组件

const linkClass = ({ isActive }) =>
  `st-link${isActive ? " is-active" : ""}`;

const Header = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="st-header" aria-label="Main navigation">
      {/* 左：品牌（Logo静态，SkillBridge文字可点击） */}
      <div className="st-brand" aria-label="SkillBridge brand">
        <Logo size="md" theme="light" align="left" />
        <Link to="/" className="brand-name">
          SkillBridge
        </Link>
      </div>

      {/* 右：导航（使用 NavLink 自动高亮当前路由） */}
      <nav className={`st-nav ${open ? "is-open" : ""}`} aria-label="Primary">
        <NavLink to="/Analyzer" className={linkClass}>
          Analyzer
        </NavLink>
        {/* <NavLink to="/Insight" className={linkClass}>Insight</NavLink> */}
        <NavLink to="/profile" className={linkClass}>
          Profile
        </NavLink>
        <NavLink to="/About" className={linkClass}>
          About
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
