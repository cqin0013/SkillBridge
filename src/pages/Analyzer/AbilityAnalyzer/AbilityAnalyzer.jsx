// src/pages/Analyzer/AbilityAnalyzer/AbilityAnalyzer.jsx
// Step 2: Review & curate abilities.
// - Imports abilities from ANZSCO code(s) on mount / when codes change
// - Lets users add/remove abilities by category
// - Persists a snapshot in sessionStorage for other steps
// - Also writes a normalized "selections" array ({type, code}) into sb_selections_meta,
//   optionally including "majorFirst" if available (so JobSuggestion can POST directly)
// - Notifies the parent AFTER commit (via useEffect) to avoid React warnings.

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

import { getAnzscoSkills, mapAbilitiesToFlat } from "../../../lib/api/AbilityApi";

import "./AbilityAnalyzer.css";

const { Title, Paragraph, Text } = Typography;

/** Session keys used by other steps (PrevSummary, JobSuggestion, etc.) */
const SESSION_KEY = "sb_selections";
const SESSION_META_KEY = "sb_selections_meta";

/* ---------- Category builders for the shared picker ---------- */
const buildSkillCats = () => [
  { id: "content", label: "Content", skills: (skillCategories.content || []).map((s) => s.name) },
  { id: "process", label: "Process", skills: (skillCategories.process || []).map((s) => s.name) },
  { id: "resourceManagement", label: "Resource Management", skills: (skillCategories.crossFunctional?.resourceManagement || []).map((s) => s.name) },
  { id: "technical", label: "Technical", skills: (skillCategories.crossFunctional?.technical || []).map((s) => s.name) },
];
const buildKnowledgeCats = () => [
  { id: "management", label: "Management", skills: (knowledgeCategories.management || []).map((s) => s.name) },
  { id: "production", label: "Production", skills: (knowledgeCategories.production || []).map((s) => s.name) },
  { id: "technical", label: "Technical", skills: (knowledgeCategories.technical || []).map((s) => s.name) },
  { id: "science", label: "Science", skills: (knowledgeCategories.science || []).map((s) => s.name) },
  { id: "health", label: "Health", skills: (knowledgeCategories.health || []).map((s) => s.name) },
  { id: "education", label: "Education", skills: (knowledgeCategories.education || []).map((s) => s.name) },
  { id: "culture", label: "Culture", skills: (knowledgeCategories.culture || []).map((s) => s.name) },
  { id: "public", label: "Public", skills: (knowledgeCategories.public || []).map((s) => s.name) },
  { id: "communication", label: "Communication", skills: (knowledgeCategories.communication || []).map((s) => s.name) },
];
const buildTechSkillCats = () => [
  { id: "business", label: "Business", skills: (techSkillCategories.business || []).map((s) => s.name) },
  { id: "productivity", label: "Productivity", skills: (techSkillCategories.productivity || []).map((s) => s.name) },
  { id: "development", label: "Development", skills: (techSkillCategories.development || []).map((s) => s.name) },
  { id: "database", label: "Database", skills: (techSkillCategories.database || []).map((s) => s.name) },
  { id: "education", label: "Education", skills: (techSkillCategories.education || []).map((s) => s.name) },
  { id: "industry", label: "Industry", skills: (techSkillCategories.industry || []).map((s) => s.name) },
  { id: "network", label: "Network", skills: (techSkillCategories.network || []).map((s) => s.name) },
  { id: "system", label: "System", skills: (techSkillCategories.system || []).map((s) => s.name) },
  { id: "security", label: "Security", skills: (techSkillCategories.security || []).map((s) => s.name) },
  { id: "communication", label: "Communication", skills: (techSkillCategories.communication || []).map((s) => s.name) },
  { id: "management", label: "Management", skills: (techSkillCategories.management || []).map((s) => s.name) },
];

/* ---------- Normalization helpers ---------- */
// Convert any incoming item shape into a consistent { name, code, aType } object.
const normalizeOne = (a) => {
  if (typeof a === "string") return { name: a, aType: "skill" };
  const name = a.name || a.title || "";
  const code = a.code;
  const aType = a.aType || a.type || "skill";
  return { name, code, aType };
};
// Unique identity used for de-duplication.
const identityOf = (it) => `${it.aType || "skill"}|${it.code || it.name}`;

/**
 * Props:
 * - occupationCodes?: string|string[]  // 6-digit ANZSCO code(s) to auto-import abilities
 * - abilities?: array                  // seed abilities from previous step
 * - majorFirst?: string|number|null    // OPTIONAL: ANZSCO major first digit ("1"–"8"); if omitted, we will not save it
 * - onNext(finalAbilities): void       // called when user clicks Next
 * - onGuardChange(disabled, reason?)   // report Next-button guard to parent
 * - onAbilitiesChange?(list)           // (optional) notify parent AFTER commit
 *
 * Ref (optional):
 * - commitAndNext()
 * - getGuard() -> { disabled, reason }
 */
function AbilityAnalyzer(
  { occupationCodes, abilities = [], majorFirst = null, onNext, onGuardChange, onAbilitiesChange },
  ref
) {
  /** localAbilities drives the UI; we *persist* and *notify* from effects */
  const normalizedIncoming = (abilities || []).map(normalizeOne);
  const [localAbilities, setLocalAbilities] = useState(normalizedIncoming);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState("");

  /** Resolve majorFirst from prop or from session (best-effort) */
  const resolveMajorFirst = () => {
    // Prefer prop if provided
    const mfProp = String(majorFirst ?? "").trim();
    if (/^[1-8]$/.test(mfProp)) return mfProp;

    // Fallback: try previous meta stored in session
    try {
      const raw = sessionStorage.getItem(SESSION_META_KEY);
      if (raw) {
        const meta = JSON.parse(raw);
        const mf = String(meta?.majorFirst ?? meta?.major_first ?? "").trim();
        if (/^[1-8]$/.test(mf)) return mf;
      }
    } catch {}
    return null; // not chosen
  };

  /** Persist current abilities (and optional majorFirst) to sessionStorage & broadcast an event */
  const writeSession = (list) => {
    // 1) Build normalized "selections" for backend: [{ type, code }]
    const selections = list
      .map((x) => ({
        type: (x.aType || x.type || "skill").toLowerCase(),
        code: x.code || x.name, // if no code was provided, fallback to name
        name: x.name,
      }))
      // keep only items that actually have a code/name
      .filter((x) => String(x.code || "").trim());

    // 2) Human-friendly buckets for preview cards
    const knowledge = list.filter((x) => (x.aType || "skill") === "knowledge").map((x) => x.name);
    const tech = list.filter((x) => (x.aType || "skill") === "tech").map((x) => x.name);
    const skill = list.filter((x) => (x.aType || "skill") === "skill").map((x) => x.name);

    // 3) Build meta for JobSuggestion and summary widgets
    const mf = resolveMajorFirst(); // single digit or null
    const meta = {
      // ☑️ This "selections" array is what JobSuggestion expects and will POST to backend
      selections: selections.map((s) => ({ type: s.type, code: s.code })),
      // Optional: only set when actually chosen; if null/empty -> JobSuggestion won't send major_first
      ...(mf ? { majorFirst: mf } : {}),
      // Stats for UI
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
      // Legacy compact key (other pages might still read this)
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(selections));
      // Canonical key read by JobSuggestion
      sessionStorage.setItem(SESSION_META_KEY, JSON.stringify(meta));

      // Notify in-tab listeners
      window.dispatchEvent(new CustomEvent("sb:selections:update", { detail: meta }));
    } catch {}
  };

  /** Read session snapshot if user returns to this step */
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

  /* ---------- INIT: merge session + incoming abilities ---------- */
  useEffect(() => {
    const fromSession = readSessionSelections();
    const map = new Map();
    [...(fromSession || []), ...normalizedIncoming].forEach((it) => {
      const key = identityOf(it);
      if (!map.has(key)) map.set(key, it);
    });
    const merged = [...map.values()];
    setLocalAbilities(merged);
    writeSession(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- SYNC when parent updates abilities ---------- */
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

  /* ---------- Auto-import abilities from ANZSCO code(s) ---------- */
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

        const results = await Promise.all(codes.map((code) => getAnzscoSkills(code)));
        const fetched = results.flatMap((payload) => mapAbilitiesToFlat(payload));

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

  /* ---------- Picker state & change helpers ---------- */
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCats, setPickerCats] = useState([]);
  const [pickerTitle, setPickerTitle] = useState("Pick items");
  const [pickerType, setPickerType] = useState("skill");

  // Add many abilities (dedup by type|code|name), then persist
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
      writeSession(next);
      return next;
    });
  };

  // Remove one ability, then persist
  const removeOne = (name, aType) =>
    setLocalAbilities((xs) => {
      const next = xs.filter((x) => !(x.name === name && (x.aType || "skill") === aType));
      writeSession(next);
      return next;
    });

  // Group abilities for display
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

  /* ---------- Next-button guard ---------- */
  const guard = useMemo(() => {
    const disabled = !localAbilities.length || loading;
    const reason = loading
      ? "Loading abilities from occupation..."
      : !localAbilities.length
      ? "Please add at least one ability."
      : null;
    return { disabled, reason };
  }, [localAbilities.length, loading]);

  // Report guard up to the scaffold
  useEffect(() => {
    onGuardChange?.(guard.disabled, guard.reason || undefined);
  }, [guard, onGuardChange]);

  /* ---------- Notify parent AFTER commit (fixes the React warning) ---------- */
  useEffect(() => {
    onAbilitiesChange?.(localAbilities);
  }, [onAbilitiesChange, JSON.stringify(localAbilities)]);

  // Expose imperative API to parent
  useImperativeHandle(ref, () => ({
    commitAndNext: () => {
      writeSession(localAbilities);
      onNext?.(localAbilities);
    },
    getGuard: () => ({ ...guard }),
  }));

  // Selected items in the current picker tab
  const selectedForCurrentType = useMemo(
    () => localAbilities.filter((x) => (x.aType || "skill") === pickerType).map((x) => x.name),
    [localAbilities, pickerType]
  );
  const currentNames = useMemo(
    () => new Set((pickerCats || []).flatMap((c) => c?.skills || [])),
    [pickerCats]
  );

  /* ---------- UI ---------- */
  return (
    <>
      {/* Helper card */}
      <Card className="abl-top-card" variant="outlined">
        <div className="abl-top-card-row">
          <Title level={4} style={{ margin: 0 }}>Add abilities you already have</Title>
          <HelpToggle>
            <div style={{ maxWidth: 420 }}>
              <b>What counts as an "ability"?</b>
              <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                <i>Knowledge</i>: theory or domain know-how.<br />
                <i>Tech Skills</i>: tools/technologies.<br />
                <i>Skills</i>: behaviors/methods.
              </Paragraph>
            </div>
          </HelpToggle>
        </div>

        {loading && (
          <div className="abl-loading">
            <Spin /> <span className="abl-loading-text">Loading abilities...</span>
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
              {openKeys.includes("knowledge") ? "-" : "+"}
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
              {openKeys.includes("tech") ? "-" : "+"}
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
              {openKeys.includes("skill") ? "-" : "+"}
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
          onClick={() => {
            setPickerTitle("Pick knowledge by category");
            setPickerCats(buildKnowledgeCats());
            setPickerType("knowledge");
            setPickerOpen(true);
          }}
          disabled={loading}
        >
          Add knowledge
        </Button>
        <Button
          onClick={() => {
            setPickerTitle("Pick tech skills by category");
            setPickerCats(buildTechSkillCats());
            setPickerType("tech");
            setPickerOpen(true);
          }}
          disabled={loading}
        >
          Add tech skills
        </Button>
        <Button
          onClick={() => {
            setPickerTitle("Pick skills by category");
            setPickerCats(buildSkillCats());
            setPickerType("skill");
            setPickerOpen(true);
          }}
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
