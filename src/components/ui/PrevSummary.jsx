import React from "react";

/**
 * 上一步摘要
 * @param {string[]} items - 要展示的摘要行
 * @param {string} pillText - 左上角胶囊文字（默认 "Previous page"）
 */
export default function PrevSummary({ items, pillText = "Previous page" }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="prev-summary" role="note" aria-label="Previous step summary">
      <span className="prev-pill">{pillText}</span>
      <ul className="prev-list">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
