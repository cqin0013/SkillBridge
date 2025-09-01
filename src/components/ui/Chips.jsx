import React from "react";
import "./Chips.css";

export default function Chips({ items, onRemove }) {
  return (
    <div className="chips">
      {items.map((item) => (
        <span key={item} className="chip">
          {item}
          <button
            className="chip-x"
            aria-label={`Remove ${item}`}
            onClick={() => onRemove(item)}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
