import React, { useMemo, useState } from "react";
import StageBox from "../../../components/ui/StageBox";
import HelpToggle from "../../../components/ui/HelpToggle";
import PageActions from "../../../components/ui/PageActions";
import SkillPicker from "../../../components/ui/SkillPicker";
import ProficiencyPicker from "../../../components/ui/ProficiencyPicker";
import { Input, Button } from "antd";
import { skillCategories } from "../../../assets/data/skill.static";
import "./AbilityAnalyzer.css";

// 分类转换
const buildCategories = () => [
  { id: "content", label: "Content", skills: (skillCategories.content || []).map(s => s.name) },
  { id: "process", label: "Process", skills: (skillCategories.process || []).map(s => s.name) },
  { id: "resourceManagement", label: "Resource Management", skills: (skillCategories.crossFunctional?.resourceManagement || []).map(s => s.name) },
  { id: "technical", label: "Technical", skills: (skillCategories.crossFunctional?.technical || []).map(s => s.name) },
];
const SKILL_CATEGORIES = buildCategories();
const QUICK_MASTER = SKILL_CATEGORIES.flatMap(c => c.skills);

/**
 * 保存为对象：{name, level}
 * props.onNext 会拿到数组：[{name, level}, ...]
 */
export default function AbilityAnalyzer({ abilities = [], onPrev, onNext }) {
  // 统一转对象
  const initial = abilities.map(a => (typeof a === "string" ? { name: a, level: 3 } : a));
  const [localAbilities, setLocalAbilities] = useState(initial);
  const [kw, setKw] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const filtered = useMemo(() => {
    const k = kw.trim().toLowerCase();
    const existing = new Set(localAbilities.map(x => x.name));
    return k.length >= 2
      ? QUICK_MASTER.filter(a => a.toLowerCase().includes(k) && !existing.has(a)).slice(0, 12)
      : [];
  }, [kw, localAbilities]);

  const addOne = (name) => {
    setLocalAbilities((prev) => {
      if (prev.some(x => x.name === name)) return prev;
      return [...prev, { name, level: 3 }];
    });
  };

  const addMany = (names) => {
    setLocalAbilities((prev) => {
      const set = new Set(prev.map(x => x.name));
      const next = [...prev];
      names.forEach((n) => { if (!set.has(n)) next.push({ name: n, level: 3 }); });
      return next;
    });
  };

  const removeOne = (name) => setLocalAbilities(xs => xs.filter(x => x.name !== name));
  const changeLevel = (name, level) =>
    setLocalAbilities(xs => xs.map(x => x.name === name ? { ...x, level } : x));

  return (
    <section className="ability-page">
      <StageBox pill="Step 2" title="Your Abilities">
        <h3>
          Add abilities you already have
          <HelpToggle show={showHelp} onToggle={() => setShowHelp(!showHelp)}>
            Add skills and set your current proficiency. You can search above or open the category picker.
          </HelpToggle>
        </h3>

        {/* 快速搜索 */}
        <Input
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          placeholder="Type at least 2 letters to search abilities…"
          allowClear
        />

        {/* 搜索建议 */}
        {filtered.length > 0 && (
          <div className="abl-suggest">
            {filtered.map((ab) => (
              <button key={ab} type="button" onClick={() => { addOne(ab); setKw(""); }}>
                {ab}
              </button>
            ))}
          </div>
        )}

        {/* 已选技能 + 熟练度 */}
        {localAbilities.length > 0 && (
          <div className="abl-list">
            {localAbilities.map((it) => (
              <div key={it.name} className="abl-row">
                <div className="abl-name">{it.name}</div>
                <div className="abl-controls">
                  <ProficiencyPicker value={it.level} onChange={(lv) => changeLevel(it.name, lv)} />
                  <Button size="small" type="text" onClick={() => removeOne(it.name)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 打开分类选择器 */}
        <div style={{ marginTop: "0.75rem" }}>
          <Button onClick={() => setPickerOpen(true)}>Add skills</Button>
        </div>
      </StageBox>

      <PageActions onPrev={onPrev} onNext={() => onNext(localAbilities)} nextDisabled={!localAbilities.length} />

      <SkillPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={(picked) => { addMany(picked); setPickerOpen(false); }}
        initiallySelected={localAbilities.map(x => x.name)}
        categories={SKILL_CATEGORIES}
        title="Pick skills by category"
      />
    </section>
  );
}
