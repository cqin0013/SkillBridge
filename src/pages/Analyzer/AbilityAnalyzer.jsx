// AbilityAnalyzer.jsx
// Component for selecting and managing a user's Knowledge, Skills, and Tech Skills.
// Handles both manual input (via SkillPicker) and auto-suggestions from occupation codes.

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

// Backend API base (hosted on Render)
const API_BASE = "https://skillbridge-hnxm.onrender.com";

/** Helper: Build picker categories for Skills */
const buildSkillCats = () => [
  { id: "content", label: "Content", skills: (skillCategories.content || []).map(s => s.name) },
  { id: "process", label: "Process", skills: (skillCategories.process || []).map(s => s.name) },
  { id: "resourceManagement", label: "Resource Management", skills: (skillCategories.crossFunctional?.resourceManagement || []).map(s => s.name) },
  { id: "technical", label: "Technical", skills: (skillCategories.crossFunctional?.technical || []).map(s => s.name) },
];

/** Helper: Build picker categories for Knowledge */
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

/** Helper: Build picker categories for Tech Skills */
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
 * AbilityAnalyzer Component
 *
 * Props:
 * - occupationCodes: string | string[] | undefined
 * - abilities: optional list of abilities (string or object form)
 * - onPrev: callback when user clicks "Back"
 * - onNext: callback when user clicks "Next", receives final list
 */
export default function AbilityAnalyzer({ occupationCodes, abilities = [], onPrev, onNext }) {
  // Normalize incoming abilities into consistent shape
  const normalizeOne = (a) => {
    if (typeof a === "string") return { name: a, aType: "skill" };
    const name = a.name || a.title || "";
    const code = a.code;
    const aType = a.aType || a.type || "skill";
    return { name, code, aType };
  };
  const normalizedIncoming = (abilities || []).map(normalizeOne);

  // State: local ability list, loading indicators, error message
  const [localAbilities, setLocalAbilities] = useState(normalizedIncoming);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState("");

  // Persist selections into localStorage (so they can be reused later)
  const persistSelections = (list) => {
    const selections = list.map((x) => ({
      type: x.aType || x.type || "skill",
      code: x.code || x.name,
      name: x.name,
    }));
    localStorage.setItem("sb_selections", JSON.stringify(selections));
  };

  // Help toggle (for explanatory popup in step 2)
  const [qHelpOpen, setQHelpOpen] = useState(false);

  // Fetch suggestions based on occupationCodes
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

        // Call API for each occupation code
        const results = await Promise.all(
          codes.map(async (code) => {
            const res = await fetch(`${API_BASE}/occupations/${encodeURIComponent(code)}/titles`);
            if (!res.ok) throw new Error(`Fetch failed for ${code}: ${res.status}`);
            return res.json();
          })
        );

        // Extract abilities
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

        // Merge incoming + fetched abilities without duplicates
        const map = new Map();
        [...normalizedIncoming, ...fetched].forEach((it) => {
          const key = it.code || `n:${it.name}|${it.aType || "skill"}`;
          if (!map.has(key)) map.set(key, it);
        });
        const merged = [...map.values()];
        setLocalAbilities(merged);
        persistSelections(merged);
      } catch (err) {
        console.error(err);
        setLoadErr("Failed to load abilities from occupation code(s). Please retry.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [JSON.stringify(occupationCodes)]);

  // State for shared SkillPicker modal
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCats, setPickerCats] = useState([]);
  const [pickerTitle, setPickerTitle] = useState("Pick items");
  const [pickerType, setPickerType] = useState("skill");

  // Add multiple abilities at once
  const addMany = (names, aType = "skill") => {
    setLocalAbilities((prev) => {
      const seen = new Set(prev.map((x) => `${x.aType || "skill"}|${x.name}`));
      const next = [...prev];
      names.forEach((n) => {
        const key = `${aType}|${n}`;
        if (!seen.has(key)) next.push({ name: n, aType });
      });
      persistSelections(next);
      return next;
    });
  };

  // Remove a single ability
  const removeOne = (name, aType) =>
    setLocalAbilities((xs) => {
      const next = xs.filter((x) => !(x.name === name && (x.aType || "skill") === aType));
      persistSelections(next);
      return next;
    });

  // Open different category pickers
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

  // Group abilities by type for display
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

  // Toggle expand/collapse of each group
  const [openKeys, setOpenKeys] = useState(["knowledge", "tech", "skill"]);
  const toggleKey = (key) =>
    setOpenKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  // Disable "Next" if no abilities or still loading
  const nextDisabled = !localAbilities.length || loading;
  const nextDisabledReason = loading
    ? "Loading abilities from occupation…"
    : !localAbilities.length
    ? "Please add at least one ability."
    : null;

  // Preselect items in picker (only of the current type)
  const selectedForCurrentType = useMemo(
    () => localAbilities.filter((x) => (x.aType || "skill") === pickerType).map((x) => x.name),
    [localAbilities, pickerType]
  );

  // Only accept items that exist in the current category
  const currentNames = useMemo(
    () => new Set((pickerCats || []).flatMap((c) => c?.skills || [])),
    [pickerCats]
  );

  return (
    <section className="ability-page">
      <div className="container">
        {/* Card 1: Step header & instructions */}
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
          {loadErr && <Alert type="warning" showIcon style={{ marginTop: ".5rem" }} message={loadErr} />}
        </StageBox>

        {/* Card 2: Help + Groups + Add buttons */}
        <StageBox>
          <div className="ability-second-card">
            <div className="question-row">
              <h3 className="question-title">Add abilities you already have</h3>
              <HelpToggle show={qHelpOpen} onToggle={() => setQHelpOpen(v => !v)}>
                <b>What counts as an “ability”?</b><br />
                • <i>Knowledge</i>: theory or domain know-how (e.g., “Project Management”).<br />
                • <i>Tech Skills</i>: tools/technologies (e.g., “Excel”, “React”).<br />
                • <i>Skills</i>: behaviors/methods (e.g., “Stakeholder communication”).<br />
              </HelpToggle>
            </div>

            {/* Display grouped abilities */}
            <div className="ability-groups-row" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
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
              <span style={{ marginLeft: 6, color: "var(--color-muted)" }}>Total: {localAbilities.length}</span>
            </div>
          </div>
        </StageBox>

        {/* Navigation actions */}
        <PageActions
          onPrev={onPrev}
          onNext={() => {
            persistSelections(localAbilities);
            onNext(localAbilities);
          }}
          nextDisabled={nextDisabled}
          nextDisabledReason={nextDisabledReason}
        />

        {/* Shared picker modal */}
        <SkillPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onConfirm={(picked) => {
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
