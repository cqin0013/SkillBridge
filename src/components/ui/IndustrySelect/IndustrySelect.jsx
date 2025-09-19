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
  className = "",          // ✅ 用于命中 .ant-select 根元素
  wrapperClassName = "",   // ✅ 新增：如果还想给外层包一层 class
  size = "large",          // ✅ 默认 large，方便与 Input/Button 对齐
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
        className={`industry-select ${className}`}  // ✅ 让等高样式命中 .ant-select
        size={size}                                  // ✅ 与 Input/Button 一致
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

      {/* 自定义的已选行业展示区（多选时） */}
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
