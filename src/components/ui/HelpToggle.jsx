// HelpToggle.jsx
import React, { useEffect, useRef, useCallback } from "react";
import { QuestionCircleOutlined } from "@ant-design/icons";
import "./HelpToggle.css";

export default function HelpToggle({
  show,
  onToggle,        
  setShow,         
  onClose,         
  closeOnBlur = true,
  closeOnEsc = true,
  children,
}) {
  const rootRef = useRef(null);

  const close = useCallback(() => {
    if (!show) return;
    if (typeof setShow === "function") setShow(false);
    else if (typeof onClose === "function") onClose();
    else if (typeof onToggle === "function") onToggle(); 
  }, [show, setShow, onClose, onToggle]);

  // auto close
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

  //  Esc -> close
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
