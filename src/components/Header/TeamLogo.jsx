import React from "react";
import "./TeamLogo.css";

/**
 * Logo 组件（stranger thinks，上下排列）
 * props:
 * - size: 'sm' | 'md' | 'lg'  （默认 md）
 * - theme: 'light' | 'dark'    （默认 light）
 * - align: 'left' | 'center' | 'right'（默认 left）
 * - showMark: 是否显示左侧图形徽标（默认 true）
 */
export default function Logo({
  size = "md",
  theme = "light",
  align = "left",
}) {
  return (
    <div className={`stg-logo stg-${size} stg-${theme} stg-${align}`}>


      {/* 上下两行字标 */}
      <div className="stg-wordmark" aria-label="stranger thinks">
        <span className="stg-line stg-line--top">Stranger</span>
        <span className="stg-line stg-line--bottom">Thinks</span>
      </div>
    </div>
  );
}
