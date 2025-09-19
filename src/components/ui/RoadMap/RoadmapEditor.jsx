import React, { useMemo, useState } from "react";
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
import { saveRoadmap } from "../../../utils/roadmapStore";

// 静态库（你已提供）
import { knowledgeCategories } from "../../../assets/data/knowledge.static";
import { skillCategories } from "../../../assets/data/skill.static";
import { techSkillCategories } from "../../../assets/data/techskill.static";

/** 拍平多层结构为 [{ code, name, type }] */
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

const TYPE_COLORS = {
  Knowledge: "geekblue",
  Skill: "purple",
  Tech: "volcano",
};

export default function RoadmapEditor({ initial = [], onClose }) {
  // 已有步骤
  const [steps, setSteps] = useState(
    initial.map((s, idx) => ({
      title: s.title || s.name || `Step ${idx + 1}`,
      desc: s.desc || s.type || "",
      date: s.date || null,
      type:
        s.type || (s.desc && ["Knowledge", "Skill", "Tech"].includes(s.desc) ? s.desc : undefined),
    }))
  );

  // Library（仅在点击 Add 时显示）
  const [pickerOpen, setPickerOpen] = useState(false);

  // 三类库拍平 + options
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

  const options = {
    knowledge: lib.knowledge.map((x) => ({ value: x.code, label: x.name })),
    skill: lib.skill.map((x) => ({ value: x.code, label: x.name })),
    tech: lib.tech.map((x) => ({ value: x.code, label: x.name })),
  };

  // 选择器的临时选中
  const [pick, setPick] = useState({ knowledge: [], skill: [], tech: [] });

  // ------- 基本操作 -------
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    setSteps(next);
  };

  const update = (i, patch) => {
    const next = [...steps];
    next[i] = { ...next[i], ...patch };
    setSteps(next);
  };

  const remove = (i) => setSteps(steps.filter((_, k) => k !== i));

  const onSave = () => {
    const cleaned = steps
      .map((s) => ({ ...s, title: (s.title || "").trim() }))
      .filter((s) => s.title.length > 0);
    saveRoadmap(cleaned);
    message.success("Roadmap saved to Profile.");
    onClose?.(cleaned);
  };

  // ------- 从库里添加 -------
  const addFrom = (typeKey) => {
    const chosen = pick[typeKey]; // code[]
    if (!chosen?.length) return;

    const sourceArr =
      typeKey === "knowledge" ? lib.knowledge : typeKey === "skill" ? lib.skill : lib.tech;

    const byCode = new Map(sourceArr.map((x) => [x.code, x]));
    const toAdd = chosen
      .map((code) => byCode.get(code))
      .filter(Boolean)
      .map((x) => ({
        title: x.name,
        desc: typeKey === "knowledge" ? "Knowledge" : typeKey === "skill" ? "Skill" : "Tech",
        type: typeKey === "knowledge" ? "Knowledge" : typeKey === "skill" ? "Skill" : "Tech",
        date: null,
      }));

    // 去重（title+type）
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
    if (added) message.success(`Added ${added} item(s).`);
  };

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
                key={`${s.title}-${i}`}
                style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, marginBottom: 10 }}
              >
                <Space style={{ width: "100%", justifyContent: "space-between" }} align="start">
                  <div style={{ flex: 1 }}>
                    <Space style={{ marginBottom: 8 }}>
                      <Tag color={TYPE_COLORS[s.type || s.desc] || "default"}>
                        {s.type || s.desc || "Step"}
                      </Tag>
                    </Space>
                    <Input
                      value={s.title}
                      onChange={(e) => update(i, { title: e.target.value })}
                      placeholder="Ability / Topic"
                      style={{ marginBottom: 8, fontWeight: 600 }}
                    />
                    <Input
                      value={s.desc}
                      onChange={(e) => update(i, { desc: e.target.value })}
                      placeholder="Notes (e.g., why this matters / resources)"
                      style={{ marginBottom: 8 }}
                    />
                    <DatePicker
                      value={s.date ? dayjs(s.date) : null}
                      onChange={(d) => update(i, { date: d ? d.format("YYYY-MM-DD") : null })}
                    />
                  </div>
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

        {/* 右侧留空/可放提示 */}
        <Col xs={24} lg={10}>
          <Card>
            <p style={{ margin: 0 }}>
              Click <b>Add</b> to pick abilities from the built-in libraries (Knowledge / Skill / Tech).
            </p>
          </Card>
        </Col>
      </Row>

      {/* Library 抽屉：点击 Add 才出现 */}
      <Drawer
        title="Add from Library"
        open={pickerOpen}
        width={560}
        onClose={() => setPickerOpen(false)}
        destroyOnClose
      >
        {LibraryTabs}
        <Space style={{ marginTop: 16 }}>
          <Button type="primary" onClick={() => setPickerOpen(false)}>
            Done
          </Button>
          <Button onClick={() => setPick({ knowledge: [], skill: [], tech: [] })}>Clear all selections</Button>
        </Space>
      </Drawer>
    </div>
  );
}
