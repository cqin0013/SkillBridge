// src/pages/Analyzer/AbilityAnalyzer/AbilityAnalyzer.jsx
// Pure content body for Step 2. It assumes the parent is TwoCardScaffold from Analyzer.jsx.

import React, {
  useEffect,
  useMemo,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Button, Alert, Spin, Tag, Card, Typography, Space } from "antd";
import HelpToggle from "../../../components/ui/HelpToggle/HelpToggle";
import SkillPicker from "../../../components/ui/SkillPicker";
import AbilityList from "./components/AbilityList";

import { skillCategories } from "../../../assets/data/skill.static";
import { knowledgeCategories } from "../../../assets/data/knowledge.static";
import { techSkillCategories } from "../../../assets/data/techskill.static";

import "./AbilityAnalyzer.css"; // local-only styles (do NOT import Analyzer.css here)

const { Title, Paragraph, Text } = Typography;

// Backend API base (hosted on Render)
const API_BASE = "https://skillbridge-hnxm.onrender.com";

/** Session keys */
const SESSION_KEY = "sb_selections";
const SESSION_META_KEY = "sb_selections_meta";

/** Helpers to build picker categories */
const buildSkillCats = () => [
  { id: "content", label: "Content", skills: (skillCategories.content || []).map(s => s.name) },
  { id: "process", label: "Process", skills: (skillCategories.process || []).map(s => s.name) },
  { id: "resourceManagement", label: "Resource Management", skills: (skillCategories.crossFunctional?.resourceManagement || []).map(s => s.name) },
  { id: "technical", label: "Technical", skills: (skillCategories.crossFunctional?.technical || []).map(s => s.name) },
];
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

/** Normalize and identity helpers */
const normalizeOne = (a) => {
  if (typeof a === "string") return { name: a, aType: "skill" };
  const name = a.name || a.title || "";
  const code = a.code;
  const aType = a.aType || a.type || "skill";
  return { name, code, aType };
};
const identityOf = (it) => `${it.aType || "skill"}|${it.code || it.name}`;

/**
 * Props (Step 2):
 * - abilities: array (initial abilities)
 * - onNext(finalAbilities): void
 * - occupationCodes?: string|string[]
 * - onGuardChange?: (disabled: boolean, reason?: string) => void
 *
 * Exposed via ref (optional):
 * - commitAndNext(): void
 * - getGuard(): { disabled: boolean, reason: string|null }
 */
function AbilityAnalyzer(
  { occupationCodes, abilities = [], onNext, onGuardChange },
  ref
) {
  // Normalize incoming abilities
  const normalizedIncoming = (abilities || []).map(normalizeOne);

  const [localAbilities, setLocalAbilities] = useState(normalizedIncoming);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState("");

  /** Session persistence (single source of truth for this page) */
  const writeSession = (list) => {
    const selections = list.map((x) => ({
      type: x.aType || x.type || "skill",
      code: x.code || x.name,
      name: x.name,
    }));
    const knowledge = list.filter((x) => (x.aType || "skill") === "knowledge").map((x) => x.name);
    const tech = list.filter((x) => (x.aType || "skill") === "tech").map((x) => x.name);
    const skill = list.filter((x) => (x.aType || "skill") === "skill").map((x) => x.name);

    const meta = {
      counts: {
        knowledge: knowledge.length,
        tech: tech.length,
        skill: skill.length,
        total: list.length,
      },
      prevsummary: { knowledge, tech, skill },
      updatedAt: Date.now(),
    };

    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(selections));
      sessionStorage.setItem(SESSION_META_KEY, JSON.stringify(meta));
    } catch {}

    // notify same-tab listeners (storage event won't fire in the same tab)
    try {
      window.dispatchEvent(new CustomEvent("sb:selections:update", { detail: { selections, meta } }));
    } catch {}
  };

  const readSessionSelections = () => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const arr = JSON.parse(raw);
      return Array.isArray(arr)
        ? arr.map((x) => normalizeOne({ name: x.name, code: x.code, aType: x.type }))
        : null;
    } catch {
      return null;
    }
  };

  // INIT: prefer sessionStorage snapshot if present; else use prop abilities
  useEffect(() => {
    const fromSession = readSessionSelections();
    if (fromSession && fromSession.length) {
      const map = new Map();
      [...fromSession, ...normalizedIncoming].forEach((it) => {
        const key = identityOf(it);
        if (!map.has(key)) map.set(key, it);
      });
      const merged = [...map.values()];
      setLocalAbilities(merged);
      writeSession(merged);
    } else {
      const m = new Map();
      normalizedIncoming.forEach((it) => {
        const k = identityOf(it);
        if (!m.has(k)) m.set(k, it);
      });
      const uniq = [...m.values()];
      setLocalAbilities(uniq);
      writeSession(uniq);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SYNC when parent updates abilities
  useEffect(() => {
    if (!abilities) return;
    setLocalAbilities((prev) => {
      const map = new Map(prev.map((it) => [identityOf(it), it]));
      normalizedIncoming.forEach((it) => {
        const key = identityOf(it);
        if (!map.has(key)) map.set(key, it);
      });
      const merged = [...map.values()];
      writeSession(merged);
      return merged;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(abilities)]);

  // Optional: fetch suggestions when occupationCodes provided
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

        // Build fetched abilities
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

        // Merge without duplicates
        setLocalAbilities((prev) => {
          const map = new Map(prev.map((it) => [identityOf(it), it]));
          fetched.forEach((it) => {
            const key = identityOf(it);
            if (!map.has(key)) map.set(key, it);
          });
          const merged = [...map.values()];
          writeSession(merged);
          return merged;
        });
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

  // Picker modal state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCats, setPickerCats] = useState([]);
  const [pickerTitle, setPickerTitle] = useState("Pick items");
  const [pickerType, setPickerType] = useState("skill");

  // Add/remove helpers
  const addMany = (names, aType = "skill") => {
    setLocalAbilities((prev) => {
      const seen = new Set(prev.map(identityOf));
      const next = [...prev];
      names.forEach((n) => {
        const candidate = { name: n, aType };
        const key = identityOf(candidate);
        if (!seen.has(key)) {
          next.push(candidate);
          seen.add(key);
        }
      });
      return next;
    });
  };

  const removeOne = (name, aType) =>
    setLocalAbilities((xs) => xs.filter((x) => !(x.name === name && (x.aType || "skill") === aType)));

  // Persist snapshot & notify whenever localAbilities changes
  useEffect(() => {
    writeSession(localAbilities);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(localAbilities)]);

  // Grouping
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

  // Expand/collapse
  const [openKeys, setOpenKeys] = useState(["knowledge", "tech", "skill"]);
  const toggleKey = (key) =>
    setOpenKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  // Guard for Next
  const guard = useMemo(() => {
    const disabled = !localAbilities.length || loading;
    const reason = loading
      ? "Loading abilities from occupation…"
      : !localAbilities.length
      ? "Please add at least one ability."
      : null;
    return { disabled, reason };
  }, [localAbilities.length, loading]);

  // Let parent know guard changes (to drive TwoCardScaffold.actionsProps)
  useEffect(() => {
    onGuardChange?.(guard.disabled, guard.reason || undefined);
  }, [guard, onGuardChange]);

  // Expose imperative API to parent (optional)
  useImperativeHandle(ref, () => ({
    commitAndNext: () => {
      writeSession(localAbilities);
      onNext?.(localAbilities);
    },
    getGuard: () => ({ ...guard }),
  }));

  // Picker helpers
  const selectedForCurrentType = useMemo(
    () => localAbilities.filter((x) => (x.aType || "skill") === pickerType).map((x) => x.name),
    [localAbilities, pickerType]
  );
  const currentNames = useMemo(
    () => new Set((pickerCats || []).flatMap((c) => c?.skills || [])),
    [pickerCats]
  );

  // UI
  return (
    <>
      {/* Top helper card */}
      <Card className="abl-top-card" variant="outlined">
        <div className="abl-top-card-row">
          <Title level={4} style={{ margin: 0 }}>Add abilities you already have</Title>
          <HelpToggle>
            <div style={{ maxWidth: 420 }}>
              <b>What counts as an “ability”?</b>
              <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                • <i>Knowledge</i>: theory or domain know-how (e.g., “Project Management”).<br />
                • <i>Tech Skills</i>: tools/technologies (e.g., “Excel”, “React”).<br />
                • <i>Skills</i>: behaviors/methods (e.g., “Stakeholder communication”).
              </Paragraph>
            </div>
          </HelpToggle>
        </div>

        {loading && (
          <div className="abl-loading">
            <Spin /> <span className="abl-loading-text">Loading abilities…</span>
          </div>
        )}
        {loadErr && <Alert type="warning" showIcon style={{ marginTop: 8 }} message={loadErr} />}
      </Card>

      {/* Groups */}
      <div className="ability-groups-row">
        {/* Knowledge */}
        <Card className="ability-group-card" variant="outlined">
          <div className="ability-group-header">
            <button type="button" className="group-toggle" onClick={() => toggleKey("knowledge")}>
              {openKeys.includes("knowledge") ? "▾" : "▸"}
            </button>
            <span>Knowledge</span> <Tag bordered={false}>{groups.knowledge.length}</Tag>
          </div>
          {openKeys.includes("knowledge") && (
            <div className="ability-group-body">
              <AbilityList items={groups.knowledge} tag="knowledge" onRemove={removeOne} />
            </div>
          )}
        </Card>

        {/* Tech */}
        <Card className="ability-group-card" variant="outlined">
          <div className="ability-group-header">
            <button type="button" className="group-toggle" onClick={() => toggleKey("tech")}>
              {openKeys.includes("tech") ? "▾" : "▸"}
            </button>
            <span>Tech Skills</span> <Tag bordered={false}>{groups.tech.length}</Tag>
          </div>
          {openKeys.includes("tech") && (
            <div className="ability-group-body">
              <AbilityList items={groups.tech} tag="tech" onRemove={removeOne} />
            </div>
          )}
        </Card>

        {/* Skills */}
        <Card className="ability-group-card" variant="outlined">
          <div className="ability-group-header">
            <button type="button" className="group-toggle" onClick={() => toggleKey("skill")}>
              {openKeys.includes("skill") ? "▾" : "▸"}
            </button>
            <span>Skills</span> <Tag bordered={false}>{groups.skill.length}</Tag>
          </div>
          {openKeys.includes("skill") && (
            <div className="ability-group-body">
              <AbilityList items={groups.skill} tag="skill" onRemove={removeOne} />
            </div>
          )}
        </Card>
      </div>

      {/* Add buttons */}
      <Space style={{ marginTop: 12 }} wrap>
        <Button
          onClick={() => { setPickerTitle("Pick knowledge by category"); setPickerCats(buildKnowledgeCats()); setPickerType("knowledge"); setPickerOpen(true); }}
          disabled={loading}
        >
          Add knowledge
        </Button>
        <Button
          onClick={() => { setPickerTitle("Pick tech skills by category"); setPickerCats(buildTechSkillCats()); setPickerType("tech"); setPickerOpen(true); }}
          disabled={loading}
        >
          Add tech skills
        </Button>
        <Button
          onClick={() => { setPickerTitle("Pick skills by category"); setPickerCats(buildSkillCats()); setPickerType("skill"); setPickerOpen(true); }}
          disabled={loading}
        >
          Add skills
        </Button>
        <Text type="secondary">Total: {localAbilities.length}</Text>
      </Space>

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
    </>
  );
}

export default forwardRef(AbilityAnalyzer);
