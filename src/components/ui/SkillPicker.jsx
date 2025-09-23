// src/components/ui/SkillPicker/SkillPicker.jsx
import { useEffect, useMemo, useState } from "react";
import { Modal, Tabs, Input, Checkbox, Tag, Button } from "antd";
import useResponsive from "../../lib/hooks/useResponsive"; // adjust path if needed
import "./SkillPicker.css";

/**
 * SkillPicker
 * Props:
 * - categories: Array<{ id: string, label: string, skills: string[] }>
 * - open: boolean
 * - onClose: () => void
 * - onConfirm: (selectedNames: string[]) => void
 * - initiallySelected?: string[]
 * - title?: string
 * - maxSelectable?: number  // optional upper limit for selection count
 */
export default function SkillPicker({
  categories = [],
  open,
  onClose,
  onConfirm,
  initiallySelected = [],
  title = "Pick your skills",
  maxSelectable, // optional
}) {
  // Responsive flags (no CSS @media used)
  const { isDesktop, isTablet, isMobile } = useResponsive();

  // Decide modal width by device
  const modalWidth = isMobile ? 360 : isTablet ? 640 : 720;

  // Grid columns for the skills list area (decided purely by JS)
  const gridCols = isMobile
    ? "1fr"
    : isTablet
    ? "repeat(2, minmax(0, 1fr))"
    : "repeat(3, minmax(0, 1fr))";

  // Input & button sizes by device
  const controlSize = isMobile ? "middle" : "large";
  const btnSize = isMobile ? "middle" : "large";
  const tabBarGutter = isMobile ? 8 : 16;

  // Active tab key; default to first category id
  const [activeKey, setActiveKey] = useState(categories[0]?.id || "");
  // Search keyword for the current category
  const [kw, setKw] = useState("");
  // Selected names (as a Set for fast toggle)
  const [picked, setPicked] = useState(new Set(initiallySelected));

  // When modal opens, re-initialize picked from initiallySelected
  useEffect(() => {
    if (open) {
      setPicked(new Set(initiallySelected));
      // Ensure we have a valid active tab
      if (!categories.find((c) => c.id === activeKey)) {
        setActiveKey(categories[0]?.id || "");
      }
      // Reset keyword on open
      setKw("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initiallySelected, categories]);

  // Compute whether the upper limit is reached
  const limitReached =
    typeof maxSelectable === "number" && picked.size >= maxSelectable;

  // Current category's skills with keyword filter applied
  const currentSkills = useMemo(() => {
    const cat =
      categories.find((c) => c.id === activeKey) || categories[0] || null;
    if (!cat) return [];
    const list = Array.isArray(cat.skills) ? cat.skills : [];
    const k = kw.trim().toLowerCase();
    return k ? list.filter((s) => s.toLowerCase().includes(k)) : list;
  }, [categories, activeKey, kw]);

  // Toggle selection for a given skill name
  const toggle = (name) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        // Remove if already selected
        next.delete(name);
        return next;
      }
      // Add new selection; enforce upper limit using *next* size
      if (typeof maxSelectable === "number" && next.size >= maxSelectable) {
        return prev; // limit reached, ignore add
      }
      next.add(name);
      return next;
    });
  };

  // Build Tabs items (rendered panel uses responsive grid via inline style)
  const tabsItems = useMemo(
    () =>
      categories.map((c) => ({
        key: c.id,
        label: (
          <span>
            {c.label}{" "}
            <Tag style={{ marginLeft: 6 }} bordered={false}>
              {Array.isArray(c.skills) ? c.skills.length : 0}
            </Tag>
          </span>
        ),
        children: (
          <div className="sp-body" style={{ minWidth: 0 }}>
            <Input
              allowClear
              placeholder="Search in this category…"
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              className="sp-search"
              size={controlSize}
            />
            <div
              className="sp-grid"
              style={{
                display: "grid",
                gridTemplateColumns: gridCols,
                gap: isMobile ? 8 : 10,
                minWidth: 0, // let children shrink; prevents horizontal overflow
              }}
            >
              {currentSkills.map((name) => {
                const checked = picked.has(name);
                // Disable unchecked items if upper limit is reached
                const disabled = !checked && limitReached;
                return (
                  <label
                    key={name}
                    className={`sp-item ${checked ? "is-picked" : ""} ${
                      disabled ? "is-disabled" : ""
                    }`}
                    title={
                      disabled && typeof maxSelectable === "number"
                        ? `Up to ${maxSelectable} items`
                        : ""
                    }
                    style={{
                      // Larger tap target on mobile
                      padding: isMobile ? "8px 10px" : "6px 8px",
                      borderRadius: 8,
                      minWidth: 0,
                    }}
                  >
                    <Checkbox
                      checked={checked}
                      onChange={() => toggle(name)}
                      disabled={disabled}
                      style={{
                        // Add a bit of spacing for touch
                        marginRight: isMobile ? 10 : 8,
                      }}
                    />
                    <span
                      className="sp-name"
                      // Ensure long text can shrink inside grid
                      style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={name}
                    >
                      {name}
                    </span>
                  </label>
                );
              })}
              {currentSkills.length === 0 && (
                <div className="sp-empty">No results</div>
              )}
            </div>
          </div>
        ),
      })),
    [categories, currentSkills, kw, picked, limitReached, gridCols, isMobile, controlSize]
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={title}
      width={modalWidth}
      // Ensure modal never exceeds viewport width on tiny phones
      style={{ maxWidth: "calc(100vw - 24px)" }}
      footer={[
        // Use a flex container to left-align the count
        <div
          key="count"
          style={{
            flex: 1,
            textAlign: "left",
            display: "inline-block",
            marginRight: "auto",
            minWidth: 0,
          }}
        >
          <span className="sp-count">
            Selected: {picked.size}
            {typeof maxSelectable === "number" ? ` / ${maxSelectable}` : ""}
          </span>
          {limitReached && (
            <span style={{ marginLeft: 8, color: "var(--color-muted, #6b7280)" }}>
              (The upper limit has been reached)
            </span>
          )}
        </div>,
        <Button key="cancel" onClick={onClose} size={btnSize}>
          Cancel
        </Button>,
        <Button
          key="ok"
          type="primary"
          onClick={() => onConfirm(Array.from(picked))}
          disabled={picked.size === 0}
          size={btnSize}
        >
          Add {picked.size ? `(${picked.size})` : ""}
        </Button>,
      ]}
    >
      <Tabs
        activeKey={activeKey || categories[0]?.id}
        onChange={(k) => {
          setActiveKey(k);
          setKw(""); // reset search when switching category
        }}
        items={tabsItems}
        tabBarGutter={tabBarGutter}
        size={isMobile ? "small" : "middle"}
      />
    </Modal>
  );
}
