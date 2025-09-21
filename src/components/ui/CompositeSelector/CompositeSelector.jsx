
import { Input, Typography } from "antd";
import "./CompositeSelector.css";

const { Text } = Typography;

/**
 * keyword input + single select + multi select
 * - All fields are fully controlled (value & onChange come from parent)
 * - The single/multi selects are passed in as Components so you can plug in IndustrySelect or Antd Select
 */
export default function CompositeSelector({
  // Keyword input config
  input = {
    label: "Keyword",
    value: "",
    onChange: () => {},
    onEnter: () => {},
    placeholder: "Type and press Enter…",
    loading: false,
    errorMsg: "",
    showEnterHint: false,
  },

  // Single select config
  single = {
    label: "Single select",
    Component: null,
    componentProps: {},
  },

  // Multi select config
  multi = {
    label: "Multi select",
    Component: null,
    componentProps: {},
  },

  className = "",
}) {
  const SingleComp = single.Component;
  const MultiComp = multi.Component;

  return (
    <div className={`composite-selector ${className}`}>
      <div className="cs-row">
        <h3 className="cs-title">{input.label}</h3>
        <Input
          value={input.value}
          onChange={(e) => input.onChange?.(e.target.value)}
          onPressEnter={input.onEnter}
          placeholder={input.placeholder}
          allowClear
          disabled={!!input.loading}
        />
        {input.showEnterHint && input.value && (
          <div className="cs-hint" aria-live="polite">Please press Enter ↵</div>
        )}
        {input.errorMsg && <div className="cs-error">{input.errorMsg}</div>}
      </div>

      {/* Single select */}
      {SingleComp && (
        <>
          <div className="cs-divider" />
          <div className="cs-row">
            <h3 className="cs-title">{single.label}</h3>
            <SingleComp {...single.componentProps} />
          </div>
        </>
      )}

      {/* Multi select */}
      {MultiComp && (
        <>
          <div className="cs-divider" />
          <div className="cs-row">
            <h3 className="cs-title">{multi.label}</h3>
            <MultiComp {...multi.componentProps} />
            {Array.isArray(multi.componentProps?.value) &&
              multi.componentProps.value.length === 0 && (
                <Text type="secondary" className="cs-subtle">
                  (Optional) Leave blank to consider all.
                </Text>
              )}
          </div>
        </>
      )}
    </div>
  );
}
