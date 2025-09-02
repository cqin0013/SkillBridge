import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import Roadmap from "../../components/ui/Roadmap.jsx";
import "./Profile.css";

/**
 * 读取来源：
 * 1) location.state.roadmap  （来自 AnalyzerWizard 的 navigate 传参）
 * 2) localStorage.sb_roadmap （回退方案）
 */
export default function Profile() {
  const location = useLocation();
  const stateData = location.state?.roadmap;

  const data = useMemo(() => {
    if (stateData) return stateData;
    try {
      const raw = localStorage.getItem("sb_roadmap");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [stateData]);

  const items = useMemo(() => {
    // 统一映射：把 abilities + importance 合成 Roadmap 需要的结构
    // 允许两种来源：
    //  - data.abilities: [{name, level}] 与某处 importanceMap 合并 
    //  - data.items:     [{name, importance, level}]
    if (!data) return [];

    if (Array.isArray(data.items)) return data.items;

    // 若只存了 abilities，给个示例重要度（实际可来自服务器/SkillGap计算）
    const importanceMap = data.importanceMap || {};
    return (data.abilities || []).map((a) => ({
      name: a.name || a,
      level: a.level || 3,
      importance: importanceMap[a.name || a] ?? 70,
    }));
  }, [data]);

  return (
    <main className="profile-page">
      <header className="profile-header">
        <h1>My Profile</h1>
        <p className="muted">Generated from your latest analysis.</p>
      </header>

      {items.length === 0 ? (
        <p className="muted">No roadmap yet. Go to Analyzer to generate one.</p>
      ) : (
        <Roadmap
          items={items}
          title="SkillBridge Roadmap"
          subtitle="Prioritized by importance, with suggestions based on your proficiency."
        />
      )}
    </main>
  );
}
