import React, { useMemo } from "react";
import { Select, Tag } from "antd";
// import "./IndustrySelect.css";

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
}) {
  const selectMode = multiple ? "multiple" : undefined;

  const selectOptions = useMemo(() => {
    const base = options.map((o) => ({ label: o.name, value: o.id }));
    if (allowAll) {
      return [{ label: "All industries", value: ALL_VALUE }, ...base];
    }
    return base;
  }, [options, allowAll]);

  const handleChange = (val) => {
    if (!multiple) {
      onChange?.(val === ALL_VALUE ? ALL_VALUE : val);
      return;
    }
    const arr = Array.isArray(val) ? val : [];
    if (arr.includes(ALL_VALUE)) {
      onChange?.(options.map((o) => o.id));
    } else {
      onChange?.(arr);
    }
  };

  const computedValue = useMemo(() => {
    if (!multiple) return value ?? undefined;
    const arr = Array.isArray(value) ? value : [];
    return arr;
  }, [value, multiple]);

  return (
    <div className={`industry-select-wrapper ${wrapperClassName}`}>
      <Select
        className={`industry-select ${className}`} 
        size={size}                                  
        mode={selectMode}
        value={computedValue}
        onChange={handleChange}
        options={selectOptions}
        placeholder={placeholder}
        showSearch={!!showFilter}
        optionFilterProp="label"
        allowClear
        tagRender={() => null}       // 多选时不在输入框里渲染 tag
        maxTagCount={0}
        dropdownMatchSelectWidth
      />

      {/* multiple selector */}
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
