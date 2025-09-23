
import { Button } from "antd";
import "./AbilityList.css";
import useResponsive from "../../../../lib/hooks/useResponsive";

/**
 * AbilityList
 * Props:
 * - items: { name: string, level?: number, code?: string, aType?: 'knowledge'|'tech'|'skill' }[]
 * - tag: 'knowledge' | 'tech' | 'skill'
 * - onRemove(name, tag): void
 */
export default function AbilityList({ items = [], tag = "skill", onRemove }) {
  const { isMobile } = useResponsive();
  const btnSize = isMobile ? "middle" : "small"; // larger tap target on mobile

  if (!items?.length) {
    return <div className="abl-empty">No items.</div>;
  }

  return (
    <div className="abl-list">
      {items.map((it) => (
        <div
          key={`${it.aType || tag}|${it.code || it.name}`}
          className="abl-row"
        >
          <div className="abl-name" title={it.name}>
            {it.name}
          </div>
          <div className="abl-controls">
            <Button
              size={btnSize}
              type="text"
              className="abl-remove-btn"
              onClick={() => onRemove?.(it.name, it.aType || tag)}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
