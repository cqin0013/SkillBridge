
import { useMemo, useState } from "react";
import {
  Input,
  DatePicker,
  Button,
  Space,
  message,
  Tabs,
  Select,
  Card,
  Row,
  Col,
  Tag,
  Drawer,
} from "antd";
import dayjs from "dayjs";


/**
 * Logical storage key. The actual localStorage key will be "sb_roadmap".
 */
const LS_KEY = "sb_roadmap";

/**
 * In-memory fallback store: used when localStorage is unavailable
 * (incognito/quota blocked/policy). Lives only for the current tab/session.
 */
const MEM = new Map();

/** Probe whether localStorage is usable in this environment. */
function hasStorage() {
  try {
    if (typeof window === "undefined") return false;
    const k = "__ls_probe__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/**
 * Persist steps to localStorage; if write fails or storage is disabled,
 * silently fall back to in-memory Map so the UI keeps working.
 */
function persistSteps(steps) {
  const payload = JSON.stringify({ steps, updatedAt: Date.now() });
  if (!payload) return;
  try {
    if (hasStorage()) {
      window.localStorage.setItem(LS_KEY, payload);
    } else {
      MEM.set(LS_KEY, payload);
    }
  } catch {
    MEM.set(LS_KEY, payload);
  }
}

/** Tiny debounce utility used for autoSave mode. */
const debounce = (fn, ms = 500) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

/**
 * Generate a stable id for list items.
 * - Prefer `crypto.randomUUID()` when available
 * - Fallback to a time/rand-based id to avoid collisions
 * Ensures React keys won't change when the user edits titles.
 */
const genId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `step_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

/**
 * Flatten a nested library into a uniform array of records:
 *   [{ code, name, type }]
 * The input can be an array or an object-of-arrays; we traverse recursively.
 */
function flattenLib(obj, type) {
  const out = [];
  const walk = (node) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach((it) => out.push({ code: it.code, name: it.name, type }));
    } else if (typeof node === "object") {
      Object.values(node).forEach(walk);
    }
  };
  walk(obj);
  return out;
}

// Static libraries you already provide
import { knowledgeCategories } from "../../../assets/data/knowledge.static";
import { skillCategories } from "../../../assets/data/skill.static";
import { techSkillCategories } from "../../../assets/data/techskill.static";

// Visual tags for three step categories
const TYPE_COLORS = {
  Knowledge: "geekblue",
  Skill: "purple",
  Tech: "volcano",
};

/**
 * RoadmapEditor
 *
 * Responsibilities:
 * - Edit a list of steps (title/notes/date/type)
 * - Add steps from three static libraries (Knowledge / Skill / Tech)
 * - Persist the final list directly to localStorage (with in-memory fallback)
 *
 * Props:
 * - initial?: Array<{ id?: string, title?: string, desc?: string, date?: string, type?: string }>
 * - onClose?: (steps?: Array<...>) => void
 * - autoSave?: boolean          // if true, debounce-save on every change
 * - persistOnClose?: boolean    // if true, save when user clicks "Save"
 */
export default function RoadmapEditor({
  initial = [],
  onClose,
  autoSave = false,
  persistOnClose = true,
}) {
  /**
   * Initialize editor state from props:
   * - Provide a stable `id` for each step to use as React key
   * - Normalize fields (title/desc/date/type)
   */
  const [steps, setSteps] = useState(
    initial.map((s, idx) => ({
      id: s.id ?? genId(),
      title: s.title || s.name || `Step ${idx + 1}`,
      desc: s.desc || s.type || "",
      date: s.date || null,
      // When desc looks like a category, reflect it into `type`
      type:
        s.type || (s.desc && ["Knowledge", "Skill", "Tech"].includes(s.desc) ? s.desc : undefined),
    }))
  );

  /**
   * Debounced saver. Only used when autoSave=true.
   * Keeps I/O reasonable during fast typing/reordering.
   */
  const saveDebounced = useMemo(() => debounce(persistSteps, 500), []);

  /**
   * Library drawer visibility
   * - The drawer is a "choose from library" UI surfaced when user clicks "Add"
   */
  const [pickerOpen, setPickerOpen] = useState(false);

  /**
   * Flatten three libraries and sort alphabetically for better discovery
   */
  const lib = useMemo(() => {
    const knowledge = flattenLib(knowledgeCategories, "Knowledge").sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    const skill = flattenLib(skillCategories, "Skill").sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    const tech = flattenLib(techSkillCategories, "Tech").sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    return { knowledge, skill, tech };
  }, []);

  /**
   * Convert library arrays to Select options: { value, label }
   */
  const options = {
    knowledge: lib.knowledge.map((x) => ({ value: x.code, label: x.name })),
    skill: lib.skill.map((x) => ({ value: x.code, label: x.name })),
    tech: lib.tech.map((x) => ({ value: x.code, label: x.name })),
  };

  /**
   * Temporary multi-select choices in the drawer
   * - We only add to steps when the user confirms "Add selected"
   */
  const [pick, setPick] = useState({ knowledge: [], skill: [], tech: [] });


  /** Move a step up/down by swapping with its neighbor. */
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    setSteps(next);
    if (autoSave) saveDebounced(next);
  };

  /** Patch a step at index with partial updates. */
  const update = (i, patch) => {
    const next = [...steps];
    next[i] = { ...next[i], ...patch };
    setSteps(next);
    if (autoSave) saveDebounced(next);
  };

  /** Remove a step at index. */
  const remove = (i) => {
    const next = steps.filter((_, k) => k !== i);
    setSteps(next);
    if (autoSave) saveDebounced(next);
  };

  /**
   * Save handler
   * - Trim empty titles
   * - Persist to localStorage (with in-memory fallback) if persistOnClose=true
   * - Hand the final value to the caller via onClose
   */
  const onSave = () => {
    const cleaned = steps
      .map((s) => ({ ...s, title: (s.title || "").trim() }))
      .filter((s) => s.title.length > 0);

    if (persistOnClose) {
      persistSteps(cleaned);
      message.success("Roadmap saved.");
    }
    onClose?.(cleaned);
  };


  /**
   * Add selected items from a specific library (knowledge/skill/tech).
   * - Convert chosen codes to new step objects (with fresh ids)
   * - De-duplicate by (title + type) to avoid repeated entries
   */
  const addFrom = (typeKey) => {
    const chosen = pick[typeKey]; // array of `code`
    if (!chosen?.length) return;

    const sourceArr =
      typeKey === "knowledge" ? lib.knowledge : typeKey === "skill" ? lib.skill : lib.tech;

    const byCode = new Map(sourceArr.map((x) => [x.code, x]));
    const toAdd = chosen
      .map((code) => byCode.get(code))
      .filter(Boolean)
      .map((x) => ({
        id: genId(),
        title: x.name,
        desc: typeKey === "knowledge" ? "Knowledge" : typeKey === "skill" ? "Skill" : "Tech",
        type: typeKey === "knowledge" ? "Knowledge" : typeKey === "skill" ? "Skill" : "Tech",
        date: null,
      }));

    // De-duplication key: "title__type"
    const existKey = new Set(steps.map((s) => `${s.title}__${s.type || s.desc}`));
    const merged = [...steps];
    let added = 0;
    for (const s of toAdd) {
      const key = `${s.title}__${s.type || s.desc}`;
      if (!existKey.has(key)) {
        merged.push(s);
        existKey.add(key);
        added++;
      }
    }
    setSteps(merged);
    if (autoSave) saveDebounced(merged);
    if (added) message.success(`Added ${added} item(s).`);
  };

  /**
   * Drawer content: three tabs, each with a multi-select picker for a library.
   */
  const LibraryTabs = (
    <Tabs
      items={[
        {
          key: "knowledge",
          label: "Knowledge",
          children: (
            <>
              <Select
                mode="multiple"
                allowClear
                showSearch
                placeholder="Search knowledge…"
                style={{ width: "100%" }}
                options={options.knowledge}
                value={pick.knowledge}
                onChange={(v) => setPick((p) => ({ ...p, knowledge: v }))}
                optionFilterProp="label"
                maxTagCount="responsive"
              />
              <Space style={{ marginTop: 8 }}>
                <Button onClick={() => addFrom("knowledge")} type="primary">
                  Add selected
                </Button>
                <Button onClick={() => setPick((p) => ({ ...p, knowledge: [] }))}>
                  Clear selection
                </Button>
              </Space>
            </>
          ),
        },
        {
          key: "skill",
          label: "Skill",
          children: (
            <>
              <Select
                mode="multiple"
                allowClear
                showSearch
                placeholder="Search skills…"
                style={{ width: "100%" }}
                options={options.skill}
                value={pick.skill}
                onChange={(v) => setPick((p) => ({ ...p, skill: v }))}
                optionFilterProp="label"
                maxTagCount="responsive"
              />
              <Space style={{ marginTop: 8 }}>
                <Button onClick={() => addFrom("skill")} type="primary">
                  Add selected
                </Button>
                <Button onClick={() => setPick((p) => ({ ...p, skill: [] }))}>
                  Clear selection
                </Button>
              </Space>
            </>
          ),
        },
        {
          key: "tech",
          label: "Tech",
          children: (
            <>
              <Select
                mode="multiple"
                allowClear
                showSearch
                placeholder="Search tech…"
                style={{ width: "100%" }}
                options={options.tech}
                value={pick.tech}
                onChange={(v) => setPick((p) => ({ ...p, tech: v }))}
                optionFilterProp="label"
                maxTagCount="responsive"
              />
              <Space style={{ marginTop: 8 }}>
                <Button onClick={() => addFrom("tech")} type="primary">
                  Add selected
                </Button>
                <Button onClick={() => setPick((p) => ({ ...p, tech: [] }))}>
                  Clear selection
                </Button>
              </Space>
            </>
          ),
        },
      ]}
    />
  );

  return (
    <div>
      <Row gutter={[16, 16]}>
        {/* Left: main editor list */}
        <Col xs={24} lg={14}>
          <Card
            title="Steps"
            extra={
              <Button onClick={() => setPickerOpen(true)} type="dashed">
                Add
              </Button>
            }
          >
            {steps.map((s, i) => (
              <div
                key={s.id ?? i} // stable key avoids remounting when title changes
                style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, marginBottom: 10 }}
              >
                <Space style={{ width: "100%", justifyContent: "space-between" }} align="start">
                  <div style={{ flex: 1 }}>
                    <Space style={{ marginBottom: 8 }}>
                      <Tag color={TYPE_COLORS[s.type || s.desc] || "default"}>
                        {s.type || s.desc || "Step"}
                      </Tag>
                    </Space>

                    {/* Title input */}
                    <Input
                      value={s.title}
                      onChange={(e) => update(i, { title: e.target.value })}
                      placeholder="Ability / Topic"
                      style={{ marginBottom: 8, fontWeight: 600 }}
                      aria-label={`Title of step #${i + 1}`}
                    />

                    {/* Notes input */}
                    <Input
                      value={s.desc}
                      onChange={(e) => update(i, { desc: e.target.value })}
                      placeholder="Notes (e.g., why this matters / resources)"
                      style={{ marginBottom: 8 }}
                      aria-label={`Notes of step #${i + 1}`}
                    />

                    {/* Optional date */}
                    <DatePicker
                      value={s.date ? dayjs(s.date) : null}
                      onChange={(d) => update(i, { date: d ? d.format("YYYY-MM-DD") : null })}
                      aria-label={`Target date of step #${i + 1}`}
                      allowClear
                    />
                  </div>

                  {/* Reorder / remove controls */}
                  <Space direction="vertical">
                    <Button onClick={() => move(i, -1)} disabled={i === 0}>
                      Up
                    </Button>
                    <Button onClick={() => move(i, +1)} disabled={i === steps.length - 1}>
                      Down
                    </Button>
                    <Button danger onClick={() => remove(i)}>
                      Remove
                    </Button>
                  </Space>
                </Space>
              </div>
            ))}

            <Space>
              <Button type="primary" onClick={onSave}>
                Save to Profile
              </Button>
              <Button onClick={() => onClose?.()}>Close</Button>
            </Space>
          </Card>
        </Col>

        {/* Right: helper card (kept simple; could host tips/guides) */}
        <Col xs={24} lg={10}>
          <Card>
            <p style={{ margin: 0 }}>
              Click <b>Add</b> to pick abilities from the built-in libraries (Knowledge / Skill / Tech).
            </p>
          </Card>
        </Col>
      </Row>

      {/* Library drawer — appears only when user clicks Add */}
      <Drawer
        title="Add from Library"
        open={pickerOpen}
        width={560}
        onClose={() => setPickerOpen(false)}
      >
        {LibraryTabs}
        <Space style={{ marginTop: 16 }}>
          <Button type="primary" onClick={() => setPickerOpen(false)}>
            Done
          </Button>
          <Button onClick={() => setPick({ knowledge: [], skill: [], tech: [] })}>
            Clear all selections
          </Button>
        </Space>
      </Drawer>
    </div>
  );
}
