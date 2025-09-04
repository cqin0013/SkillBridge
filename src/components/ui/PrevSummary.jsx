import React from "react";

/**
 * 上一步摘要
 * - items: string[] | string   当是 string 时，用分号(；或;)分隔
 * - pillText: string           左上角胶囊文字（默认 "Previous page"）
 */
export default function PrevSummary({ items, pillText = "Previous page" }) {
  const normalizeItems = (val) => {
    if (Array.isArray(val)) {
      return val.map(String).map(s => s.trim()).filter(Boolean);
    }
    if (typeof val === "string") {
      // 支持中文/英文分号，连续分号也OK；去掉前后空白并过滤空项
      return val
        .split(/[;；]+/)
        .map(s => s.trim())
        .filter(Boolean);
    }
    return [];
  };

  const list = normalizeItems(items);

  if (list.length === 0) return null;

  return (
    <div className="prev-summary" role="note" aria-label="Previous step summary">
      <span className="prev-pill">{pillText}</span>
      <ul className="prev-list">
        {list.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
