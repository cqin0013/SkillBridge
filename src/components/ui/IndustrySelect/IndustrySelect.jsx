import  { useMemo } from "react";
import { Select, Tag } from "antd";
import "./IndustrySelect.css";

// Special token used when "All industries" is enabled and selected
const ALL_VALUE = "__ALL__";

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
  const selectMode = multiple ? "multiple" : undefined;
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

    // If "All industries" is chosen, expand to all IDs 
    if (arr.includes(ALL_VALUE)) {
      onChange?.(options.map((o) => o.id));
    } else {
      onChange?.(arr);
    }
  };

  const computedValue = useMemo(() => {
    if (!multiple) return value ?? undefined;
    return Array.isArray(value) ? value : [];
  }, [value, multiple]);

  // Compose classes for the <Select>
  const selectClass = [
    "industry-select",
    tagless && "tagless",      
    fixedHeight && "h-40",     
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

export { ALL_VALUE };
