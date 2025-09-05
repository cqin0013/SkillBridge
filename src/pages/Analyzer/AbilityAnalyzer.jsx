// src/pages/Analyzer/AbilityAnalyzer/AbilityAnalyzer.jsx
import React, { useEffect, useMemo, useState } from "react";
import StageBox from "../../components/ui/StageBox";
import HelpToggle from "../../components/ui/HelpToggle";
import PageActions from "../../components/ui/PageActions";
import SkillPicker from "../../components/ui/SkillPicker";
import { Button, Alert, Spin, Tag } from "antd";

import AbilityList from "../../components/ui/AbilityList";

import { skillCategories } from "../../assets/data/skill.static";
import { knowledgeCategories } from "../../assets/data/knowledge.static";
import { techSkillCategories } from "../../assets/data/techskill.static";

// （按你的要求，保持不引入本地 CSS）
// import "./AbilityAnalyzer.css";

const API_BASE = "https://skillbridge-hnxm.onrender.com";

/** Build picker categories for Skills */
const buildSkillCats = () => [
  { id: "content", label: "Content", skills: (skillCategories.content || []).map(s => s.name) },
  { id: "process", label: "Process", skills: (skillCategories.process || []).map(s => s.name) },
  { id: "resourceManagement", label: "Resource Management", skills: (skillCategories.crossFunctional?.resourceManagement || []).map(s => s.name) },
  { id: "technical", label: "Technical", skills: (skillCategories.crossFunctional?.technical || []).map(s => s.name) },
];

/** Build picker categories for Knowledge */
const buildKnowledgeCats = () => [
  { id: "management", label: "Management", skills: (knowledgeCategories.management || []).map(s => s.name) },
  { id: "production", label: "Production", skills: (knowledgeCategories.production || []).map(s => s.name) },
  { id: "technical", label: "Technical", skills: (knowledgeCategories.technical || []).map(s => s.name) },
  { id: "science", label: "Science", skills: (knowledgeCategories.science || []).map(s => s.name) },
  { id: "health", label: "Health", skills: (knowledgeCategories.health || []).map(s => s.name) },
  { id: "education", label: "Education", skills: (knowledgeCategories.education || []).map(s => s.name) },
  { id: "culture", label: "Culture", skills: (knowledgeCategories.culture || []).map(s => s.name) },
  { id: "public", label: "Public", skills: (knowledgeCategories.public || []).map(s => s.name) },
  { id: "communication", label: "Communication", skills: (knowledgeCategories.communication || []).map(s => s.name) },
];

/** Build picker categories for Tech Skills */
const buildTechSkillCats = () => [
  { id: "business", label: "Business", skills: (techSkillCategories.business || []).map(s => s.name) },
  { id: "productivity", label: "Productivity", skills: (techSkillCategories.productivity || []).map(s => s.name) },
  { id: "development", label: "Development", skills: (techSkillCategories.development || []).map(s => s.name) },
  { id: "database", label: "Database", skills: (techSkillCategories.database || []).map(s => s.name) },
  { id: "education", label: "Education", skills: (techSkillCategories.education || []).map(s => s.name) },
  { id: "industry", label: "Industry", skills: (techSkillCategories.industry || []).map(s => s.name) },
  { id: "network", label: "Network", skills: (techSkillCategories.network || []).map(s => s.name) },
  { id: "system", label: "System", skills: (techSkillCategories.system || []).map(s => s.name) },
  { id: "security", label: "Security", skills: (techSkillCategories.security || []).map(s => s.name) },
  { id: "communication", label: "Communication", skills: (techSkillCategories.communication || []).map(s => s.name) },
  { id: "management", label: "Management", skills: (techSkillCategories.management || []).map(s => s.name) },
];

/**
 * Props:
 * - occupationCodes?: string | string[]
 * - abilities?: Array<string | {title?:string, name?:string, code?:string, type?:'knowledge'|'skill'|'tech', aType?:same}>
 * - onPrev: () => void
 * - onNext: (abilities: {name:string, code?:string, aType?:string}[]) => void
 */
export default function AbilityAnalyzer({
  occupationCodes,
  abilities = [],
  onPrev,
  onNext,
}) {
  // Normalize incoming (keep code/type if provided)
  const normalizeOne = (a) => {
    if (typeof a === "string") return { name: a, aType: "skill" };
    const name = a.name || a.title || "";
    const code = a.code;
    const aType = a.aType || a.type || "skill";
    return { name, code, aType };
  };
  const normalizedIncoming = (abilities || []).map(normalizeOne);

  const [localAbilities, setLocalAbilities] = useState(normalizedIncoming);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState("");

  // —— 新增：持久化到 localStorage —— //
  const persistSelections = (list) => {
    const selections = list.map((x) => ({
      type: x.aType || x.type || "skill",
      code: x.code || x.name,
      name: x.name,
    }));
    localStorage.setItem("sb_selections", JSON.stringify(selections));
  };

  // Help toggle for the "Add abilities..." question (in Card 2)
  const [qHelpOpen, setQHelpOpen] = useState(false);

  // Optionally fetch suggestions by occupationCodes, then merge
  useEffect(() => {
    const codes =
      typeof occupationCodes === "string"
        ? [occupationCodes]
        : Array.isArray(occupationCodes)
        ? occupationCodes
        : [];

    if (!codes.length) return;

    const fetchAll = async () => {
      try {
        setLoading(true);
        setLoadErr("");

        const results = await Promise.all(
          codes.map(async (code) => {
            const res = await fetch(`${API_BASE}/occupations/${encodeURIComponent(code)}/titles`);
            if (!res.ok) throw new Error(`Fetch failed for ${code}: ${res.status}`);
            return res.json();
          })
        );

        const fetched = [];
        for (const data of results) {
          const knowledge = Array.isArray(data.knowledge_titles) ? data.knowledge_titles : [];
          const skills = Array.isArray(data.skill_titles) ? data.skill_titles : [];
          const techs = Array.isArray(data.tech_titles) ? data.tech_titles : [];
          fetched.push(
            ...knowledge.map((x) => ({ name: x.title, code: x.code, aType: "knowledge" })),
            ...skills.map((x) => ({ name: x.title, code: x.code, aType: "skill" })),
            ...techs.map((x) => ({ name: x.title, code: x.code, aType: "tech" }))
          );
        }

        // merge by code if present, else by (type+name)
        const map = new Map();
        [...normalizedIncoming, ...fetched].forEach((it) => {
          const key = it.code || `n:${it.name}|${it.aType || "skill"}`;
          if (!map.has(key)) map.set(key, it);
        });
        const merged = [...map.values()];
        setLocalAbilities(merged);
        persistSelections(merged); // ★ 初始化时也存一次
      } catch (err) {
        console.error(err);
        setLoadErr("Failed to load abilities from occupation code(s). Please retry.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(occupationCodes)]);

  // Shared SkillPicker (modal) 状态
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCats, setPickerCats] = useState([]);
  const [pickerTitle, setPickerTitle] = useState("Pick items");
  const [pickerType, setPickerType] = useState("skill"); // 'skill' | 'knowledge' | 'tech'

  // 仅按“类型+名称”去重，保证不同类型的同名不会互相影响
  const addMany = (names, aType = "skill") => {
    setLocalAbilities((prev) => {
      const seen = new Set(prev.map((x) => `${x.aType || "skill"}|${x.name}`));
      const next = [...prev];
      names.forEach((n) => {
        const key = `${aType}|${n}`;
        if (!seen.has(key)) next.push({ name: n, aType });
      });
      persistSelections(next);   // ★ 新增：保存
      return next;
    });
  };

  const removeOne = (name, aType) =>
    setLocalAbilities((xs) => {
      const next = xs.filter((x) => !(x.name === name && (x.aType || "skill") === aType));
      persistSelections(next);   // ★ 新增：保存
      return next;
    });

  const openSkillPicker = () => {
    setPickerTitle("Pick skills by category");
    setPickerCats(buildSkillCats());
    setPickerType("skill");
    setPickerOpen(true);
  };
  const openKnowledgePicker = () => {
    setPickerTitle("Pick knowledge by category");
    setPickerCats(buildKnowledgeCats());
    setPickerType("knowledge");
    setPickerOpen(true);
  };
  const openTechSkillPicker = () => {
    setPickerTitle("Pick tech skills by category");
    setPickerCats(buildTechSkillCats());
    setPickerType("tech");
    setPickerOpen(true);
  };

  // Group into three lists
  const groups = useMemo(() => {
    const knowledge = [];
    const skill = [];
    const tech = [];
    localAbilities.forEach((it) => {
      const t = it.aType || "skill";
      if (t === "knowledge") knowledge.push(it);
      else if (t === "tech") tech.push(it);
      else skill.push(it);
    });
    return { knowledge, tech, skill };
  }, [localAbilities]);

  // 折叠开关（默认全部展开）
  const [openKeys, setOpenKeys] = useState(["knowledge", "tech", "skill"]);
  const toggleKey = (key) =>
    setOpenKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const nextDisabled = !localAbilities.length || loading;
  const nextDisabledReason = loading
    ? "Loading abilities from occupation…"
    : !localAbilities.length
    ? "Please add at least one ability."
    : null;

  // —— 关键修复：仅预选“当前选择器类型”的项目 —— //
  const selectedForCurrentType = useMemo(
    () =>
      localAbilities
        .filter((x) => (x.aType || "skill") === pickerType)
        .map((x) => x.name),
    [localAbilities, pickerType]
  );

  // —— 可选保护：仅接受当前选择器分类中真实存在的名称 —— //
  const currentNames = useMemo(
    () => new Set((pickerCats || []).flatMap((c) => c?.skills || [])),
    [pickerCats]
  );

  return (
    <section className="ability-page">
      <div className="container">
        {/* Card 1: step header + instructions（由 StageBox 的 tip props 渲染） */}
        <StageBox
          pill="Step 2"
          title="Your Abilities"
          tipTitle="What to do in this step"
          tipContent={
            <>
              1) Use the buttons below to add items from <b>Knowledge</b>, <b>Tech Skills</b>, or <b>Skills</b>.<br />
              2) Remove anything that doesn’t represent you.<br />
              3) When you’re ready, click <b>Next</b> to continue.
            </>
          }
        >
          {loading && (
            <div style={{ marginTop: ".5rem" }}>
              <Spin /> <span style={{ marginLeft: 8 }}>Loading abilities…</span>
            </div>
          )}
          {loadErr && (
            <Alert type="warning" showIcon style={{ marginTop: ".5rem" }} message={loadErr} />
          )}
        </StageBox>

        {/* Card 2: white background + help + groups + add buttons */}
        <StageBox>
          <div className="ability-second-card">
            <div className="question-row">
              <h3 className="question-title">Add abilities you already have</h3>
              <HelpToggle show={qHelpOpen} onToggle={() => setQHelpOpen(v => !v)}>
                <b>What counts as an “ability”?</b><br />
                • <i>Knowledge</i>: theory or domain know-how (e.g., “Project Management”, “Anatomy”).<br />
                • <i>Tech Skills</i>: tools/technologies you can use (e.g., “Excel”, “React”).<br />
                • <i>Skills</i>: behaviors and methods (e.g., “Stakeholder communication”, “Root-cause analysis”).<br />
                Tip: Start broad, then remove items that don’t fit you.
              </HelpToggle>
            </div>

            <div
              className="ability-groups-row"
              style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}
            >
              {/* Knowledge */}
              <div className="ability-group-card">
                <div className="ability-group-header">
                  <button type="button" className="group-toggle" onClick={() => toggleKey("knowledge")}>
                    {openKeys.includes("knowledge") ? "▾" : "▸"}
                  </button>
                  <span>Knowledge</span> <Tag>{groups.knowledge.length}</Tag>
                </div>
                {openKeys.includes("knowledge") && (
                  <div className="ability-group-body">
                    <AbilityList items={groups.knowledge} tag="knowledge" onRemove={removeOne} />
                  </div>
                )}
              </div>

              {/* Tech Skills */}
              <div className="ability-group-card">
                <div className="ability-group-header">
                  <button type="button" className="group-toggle" onClick={() => toggleKey("tech")}>
                    {openKeys.includes("tech") ? "▾" : "▸"}
                  </button>
                  <span>Tech Skills</span> <Tag>{groups.tech.length}</Tag>
                </div>
                {openKeys.includes("tech") && (
                  <div className="ability-group-body">
                    <AbilityList items={groups.tech} tag="tech" onRemove={removeOne} />
                  </div>
                )}
              </div>

              {/* Skills */}
              <div className="ability-group-card">
                <div className="ability-group-header">
                  <button type="button" className="group-toggle" onClick={() => toggleKey("skill")}>
                    {openKeys.includes("skill") ? "▾" : "▸"}
                  </button>
                  <span>Skills</span> <Tag>{groups.skill.length}</Tag>
                </div>
                {openKeys.includes("skill") && (
                  <div className="ability-group-body">
                    <AbilityList items={groups.skill} tag="skill" onRemove={removeOne} />
                  </div>
                )}
              </div>
            </div>

            {/* Add buttons */}
            <div style={{ marginTop: "0.75rem", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <Button onClick={openKnowledgePicker} disabled={loading}>Add knowledge</Button>
              <Button onClick={openTechSkillPicker} disabled={loading}>Add tech skills</Button>
              <Button onClick={openSkillPicker} disabled={loading}>Add skills</Button>
              <span style={{ marginLeft: 6, color: "var(--color-muted)" }}>
                Total: {localAbilities.length}
              </span>
            </div>
          </div>
        </StageBox>

        {/* Actions */}
        <PageActions
          onPrev={onPrev}
          onNext={() => {
            persistSelections(localAbilities); // ★ Next 前也存一遍
            onNext(localAbilities);
          }}
          nextDisabled={nextDisabled}
          nextDisabledReason={nextDisabledReason}
        />

        {/* Shared picker modal; add with current pickerType */}
        <SkillPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onConfirm={(picked) => {
            // 只接受当前选择器分类中真实存在的名称，避免串类误加
            const filtered = (picked || []).filter((n) => currentNames.has(n));
            addMany(filtered, pickerType);
            setPickerOpen(false);
          }}
          initiallySelected={selectedForCurrentType}
          categories={pickerCats}
          title={pickerTitle}
        />
      </div>
    </section>
  );
}
