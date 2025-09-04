// components/ui/InputWithClear.jsx
import "./InputWithClear.css";

export default function InputWithClear({
  value, onChange, onClear, inputProps={}, buttonLabel="Clear"
}) {
  return (
    <div className="gi-input-wrap">
      <input className="gi-input" value={value} onChange={onChange} {...inputProps}/>
      {value && (
        <button type="button" className="gi-clear" aria-label={buttonLabel} onClick={onClear}>×</button>
      )}
    </div>
  );
}
