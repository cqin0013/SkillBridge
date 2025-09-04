import React, { useState } from "react";
import "./Tip.css";

/**
 * Simple collapsible tip box.
 * Props:
 * - title: string
 * - children: tip content
 * - defaultOpen?: boolean
 */
export default function Tip({ title = "What to do in this step", children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`tip ${open ? "is-open" : ""}`}>
      <button className="tip-header" type="button" onClick={() => setOpen(!open)}>
        <span className="tip-title">{title}</span>
        <span className="tip-caret">{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="tip-body">{children}</div>}
    </div>
  );
}
