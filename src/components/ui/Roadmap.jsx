import React, { useMemo } from "react";
import ProficiencyTag from "../ui/ProficiencyTag";
import "./Roadmap.css";

/**
 * items: Array<{
 *   name: string,
 *   importance: number,   // 0-100
 *   level: number,        // 1..5 当前熟练度
 *   targetLevel?: number  // 1..5 目标熟练度（默认 4）
 * }>
 */
export default function Roadmap({ items = [] }) {
  const normalized = useMemo(
    () =>
      items.map((it) => ({
        ...it,
        targetLevel: it.targetLevel ?? 4,
        gap: Math.max((it.targetLevel ?? 4) - (it.level ?? 3), 0),
      })),
    [items]
  );

  // 排序：importance ↓，gap ↓，若相同则随机顺序
  const sorted = useMemo(() => {
    const arr = [...normalized];
    arr.sort((a, b) => {
      if (b.importance !== a.importance) return b.importance - a.importance;
      if (b.gap !== a.gap) return b.gap - a.gap;
      return Math.random() < 0.5 ? -1 : 1;
    });
    return arr;
  }, [normalized]);

  return (
    <section className="sb-roadmap">
      <header className="sb-roadmap__header">
        <h2 className="sb-roadmap__title">Learning Roadmap</h2>
        <p className="sb-roadmap__sub">
          Ordered by importance and proficiency gap
        </p>
      </header>

      <ul className="sb-roadmap__list">
        {sorted.map((it, idx) => {
          const prev = sorted[idx - 1];
          const next = sorted[idx + 1];
          const sameAsPrev =
            prev && prev.importance === it.importance && prev.gap === it.gap;
          const sameAsNext =
            next && next.importance === it.importance && next.gap === it.gap;

          return (
            <li key={it.name} className="sb-roadmap__step">
              <div className="sb-roadmap__stephead">
                <span className="sb-step-label">Step {idx + 1}</span>
                <span className="sb-step-name">{it.name}</span>
              </div>

              <div className="sb-roadmap__meta">
                <span>Importance {Math.round(it.importance)}</span>
                <div className="sb-roadmap__levels">
                  <ProficiencyTag level={it.level} />
                  <span className="arrow">→</span>
                  <ProficiencyTag level={it.targetLevel} />
                </div>
                <span className="sb-gap">
                  Gap {Math.max(it.targetLevel - it.level, 0)}
                </span>
              </div>

              {(sameAsPrev || sameAsNext) && (
                <p className="equal-note">
                  ⚖️ This step can be swapped with{" "}
                  {sameAsPrev ? "the previous step" : "the next step"}.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
