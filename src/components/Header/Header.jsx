import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import "./Header.css";

export default function Header() {
  const [open, setOpen] = useState(false); // 手机菜单开关

  return (
    <header className="header">
      <div className="row">
        {/* 左侧：品牌区 */}
        <div className="brand">
          <span className="badge">TE17</span>
          <div>
            <h1 className="title">Melbourne CBD Parking Finder</h1>
            <p className="sub">Availability, history & guidance</p>
          </div>
        </div>

        {/* 手机端：菜单按钮 */}
        <button className="menu-btn" onClick={() => setOpen(!open)}>☰</button>

        {/* 右侧：导航 + CTA（桌面水平，手机下拉） */}
        <nav className={`nav ${open ? "show" : ""}`}>
          <ul className="menu" onClick={() => setOpen(false)}>
            <li><NavLink to="/"          className={({isActive}) => "nav-link" + (isActive ? " active" : "")}>Home</NavLink></li>
            <li><NavLink to="/search"    className={({isActive}) => "nav-link" + (isActive ? " active" : "")}>Search</NavLink></li>
            <li><NavLink to="/insight"   className={({isActive}) => "nav-link" + (isActive ? " active" : "")}>Insights</NavLink></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
