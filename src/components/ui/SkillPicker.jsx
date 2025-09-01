import React, { useMemo, useState } from "react";
import { Modal, Tabs, Input, Checkbox, Tag, Button } from "antd";
import "./SkillPicker.css";

/**
 * SkillPicker
 * - categories: { id, label, skills: string[] }[]
 * - open: boolean
 * - onClose(): void
 * - onConfirm(selected: string[]): void
 * - initiallySelected: string[]
 */
export default function SkillPicker({
  categories = [],
  open,
  onClose,
  onConfirm,
  initiallySelected = [],
  title = "Pick your skills",
}) {
  const [activeKey, setActiveKey] = useState(categories[0]?.id || "");
  const [kw, setKw] = useState("");
  const [picked, setPicked] = useState(new Set(initiallySelected));

  const currentSkills = useMemo(() => {
    const cat = categories.find((c) => c.id === activeKey) || categories[0];
    if (!cat) return [];
    const k = kw.trim().toLowerCase();
    const list = cat.skills || [];
    return k ? list.filter((s) => s.toLowerCase().includes(k)) : list;
  }, [categories, activeKey, kw]);

  const toggle = (name) => {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const tabsItems = categories.map((c) => ({
    key: c.id,
    label: (
      <span>
        {c.label}{" "}
        <Tag style={{ marginLeft: 6 }} bordered={false}>
          {c.skills.length}
        </Tag>
      </span>
    ),
    children: (
      <div className="sp-body">
        <Input
          allowClear
          placeholder="Search in this category…"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          className="sp-search"
        />
        <div className="sp-grid">
          {currentSkills.map((name) => (
            <label key={name} className={`sp-item ${picked.has(name) ? "is-picked" : ""}`}>
              <Checkbox
                checked={picked.has(name)}
                onChange={() => toggle(name)}
              />
              <span className="sp-name">{name}</span>
            </label>
          ))}
          {currentSkills.length === 0 && (
            <div className="sp-empty">No results</div>
          )}
        </div>
      </div>
    ),
  }));

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={title}
      width={720}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="ok"
          type="primary"
          onClick={() => onConfirm(Array.from(picked))}
        >
          Add {picked.size ? `(${picked.size})` : ""}
        </Button>,
      ]}
    >
      <Tabs
        activeKey={activeKey || categories[0]?.id}
        onChange={(k) => {
          setActiveKey(k);
          setKw("");
        }}
        items={tabsItems}
      />
    </Modal>
  );
}
