import React from "react";
import { Button } from "antd";
import "./AbilityList.css"
/**
 * AbilityList
 * Props:
 * - items: { name: string, level?: number, code?: string, aType?: 'knowledge'|'tech'|'skill' }[]
 * - tag: 'knowledge' | 'tech' | 'skill'
 * - onRemove(name, tag): void
 */
export default function AbilityList({ items, tag, onRemove }) {
  if (!items?.length) {
    return <div style={{ color: "var(--color-muted)" }}>No items.</div>;
  }

  return (
    <div className="abl-list" style={{ marginTop: ".25rem" }}>
      {items.map((it) => (
        <div key={`${tag}|${it.name}`} className="abl-row">
          <div className="abl-name">{it.name}</div>
          <div className="abl-controls">
            <Button size="small" type="text" onClick={() => onRemove(it.name, tag)}>
              Remove
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
