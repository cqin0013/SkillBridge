// HelpToggle.jsx
import React, { useEffect, useRef, useCallback } from "react";
import { QuestionCircleOutlined } from "@ant-design/icons";
import "./HelpToggle.css";

export default function HelpToggle({
  show,
  onToggle,        // 仍然支持你原来的切换函数
  setShow,         // 可选：更精确地设置显隐（推荐传）
  onClose,         // 可选：提供关闭回调
  closeOnBlur = true,
  closeOnEsc = true,
  children,
}) {
  const rootRef = useRef(null);

  const close = useCallback(() => {
    if (!show) return;
    if (typeof setShow === "function") setShow(false);
    else if (typeof onClose === "function") onClose();
    else if (typeof onToggle === "function") onToggle(); // 兜底：只能“切换”
  }, [show, setShow, onClose, onToggle]);

  // 点击组件外部自动关闭
  useEffect(() => {
    if (!closeOnBlur || !show) return;
    const handleOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        close();
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [closeOnBlur, show, close]);

  // 按下 Esc 关闭
  useEffect(() => {
    if (!closeOnEsc || !show) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeOnEsc, show, close]);

  return (
    <div className="help-toggle" ref={rootRef}>
      <button
        type="button"
        className="help-btn"
        aria-expanded={!!show}
        aria-haspopup="dialog"
        onClick={onToggle}
      >
        <QuestionCircleOutlined className="help-icon" />
      </button>

      {children && (
        <div
          className={`help-hint ${show ? "is-visible" : "is-hidden"}`}
          role="dialog"
          aria-hidden={!show}
        >
          {children}
        </div>
      )}
    </div>
  );
}
