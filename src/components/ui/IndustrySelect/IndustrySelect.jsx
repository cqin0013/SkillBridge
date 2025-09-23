// src/components/IndustrySelect/IndustrySelect.jsx
import React, { useMemo } from "react";
import { Select, Tag } from "antd";
import "./IndustrySelect.css";

// Special token used when "All industries" is enabled and selected
const ALL_VALUE = "__ALL__";

/**
 * IndustrySelect
 * A reusable wrapper around AntD <Select> for single/multiple industry picking.
 *
 * Features:
 * - Single or multiple mode (controlled via `multiple`).
 * - Optional "All industries" shortcut (via `allowAll`).
 * - Optional client-side filtering (via `showFilter`).
 * - In multiple mode, you can hide built-in tags inside the input ("tagless")
 *   and render chosen tags beneath the field instead (more compact).
 *
 * All fields are fully controlled: `value` and `onChange` come from the parent.
 *
 * @param {Object}   props
 * @param {string|string[]} props.value          - Current value; string for single, string[] for multiple
 * @param {(val:any) => void} props.onChange     - Change handler; receives string or string[] based on mode
 * @param {Array<{id:string|number, name:string}>} [props.options=[]] - Options list
 * @param {boolean}  [props.multiple=false]      - Enable multiple select
 * @param {boolean}  [props.allowAll=false]      - Show an "All industries" option
 * @param {boolean}  [props.showFilter=true]     - Enable search box inside Select
 * @param {string}   [props.placeholder="Select industry"] - Placeholder text
 * @param {string}   [props.className=""]        - Extra class for the <Select>
 * @param {string}   [props.wrapperClassName=""] - Extra class for the outer wrapper
 * @param {"small"|"middle"|"large"} [props.size="large"] - AntD size
 * @param {boolean}  [props.tagless=true]        - In multiple mode, hide tags inside the input
 * @param {boolean|number} [props.popupMatchSelectWidth=true] - AntD v5: dropdown width follows trigger or fixed width
 * @param {boolean}  [props.fixedHeight=false]   - Apply 40px height utility to match Input/Button
 */
export default function IndustrySelect({
  value,
  onChange,
  options = [],
  multiple = false,
  allowAll = false,
  showFilter = true,
  placeholder = "Select industry",
  className = "",
  wrapperClassName = "",
  size = "large",
  tagless = true,
  popupMatchSelectWidth = true, 
  fixedHeight = false,
}) {
  // AntD "mode" prop: undefined (single) or "multiple"
  const selectMode = multiple ? "multiple" : undefined;

  // Build AntD-friendly options only when input changes
  const selectOptions = useMemo(() => {
    const base = options.map((o) => ({ label: o.name, value: o.id }));
    return allowAll
      ? [{ label: "All industries", value: ALL_VALUE }, ...base]
      : base;
  }, [options, allowAll]);

  // Normalize onChange payload for single vs multiple modes
  const handleChange = (val) => {
    if (!multiple) {
      // Single: pass through; if ALL is chosen, forward the token
      onChange?.(val === ALL_VALUE ? ALL_VALUE : val);
      return;
    }

    // Multiple: always an array
    const arr = Array.isArray(val) ? val : [];

    // If "All industries" is chosen, expand to all IDs (omit the ALL token)
    if (arr.includes(ALL_VALUE)) {
      onChange?.(options.map((o) => o.id));
    } else {
      onChange?.(arr);
    }
  };

  // Normalize the controlled value for AntD Select
  const computedValue = useMemo(() => {
    if (!multiple) return value ?? undefined;
    return Array.isArray(value) ? value : [];
  }, [value, multiple]);

  // Compose classes for the <Select>
  const selectClass = [
    "industry-select",
    tagless && "tagless",       // affects height/overflow styles for multiple mode
    fixedHeight && "h-40",      // 40px height utility so it aligns with Input/Button
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`industry-select-wrapper ${wrapperClassName}`}>
      <Select
        className={selectClass}
        size={size}
        mode={selectMode}
        value={computedValue}
        onChange={handleChange}
        options={selectOptions}
        placeholder={placeholder}
        showSearch={!!showFilter}
        optionFilterProp="label"
        allowClear
        // Hide built-in tags inside the input when tagless=true (multiple mode only)
        tagRender={tagless ? () => null : undefined}
        maxTagCount={tagless ? 0 : "responsive"}
        popupMatchSelectWidth={popupMatchSelectWidth}
      />

      {/* External chosen-tag list (only for multiple mode and when at least one value is selected) */}
      {multiple && computedValue?.length > 0 && (
        <div className="industry-chosen-list">
          {computedValue.map((id) => {
            const item = options.find((o) => o.id === id);
            return (
              <Tag
                key={id}
                closable
                onClose={(e) => {
                  // Prevent AntD from removing the tag before we update value
                  e.preventDefault();
                  onChange?.(computedValue.filter((x) => x !== id));
                }}
              >
                {item?.name || id}
              </Tag>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Also export the ALL token if a parent wants to check or use it directly
export { ALL_VALUE };
