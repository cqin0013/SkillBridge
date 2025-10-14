// Reusable form component that supports both single-select and multi-select modes.
// The component keeps a unified value shape (string[]) regardless of mode.

import { useId } from "react";
import type { FC } from "react";
import clsx from "clsx";

/** Option type definition */
export interface MultiOption {
  /** Unique option identifier / value */
  value: string;
  /** Display label shown to users */
  label: string;
  /** Optional flag to disable this option */
  disabled?: boolean;
}

/** Props accepted by MultiSelectQuestion */
export interface MultiSelectQuestionProps {
  /** Main question title */
  title: string;
  /** Optional subtitle or description text */
  subtitle?: string;
  /** List of selectable options */
  options: ReadonlyArray<MultiOption>;
  /**
   * Current selected values. For single-select mode, length ≤ 1.
   * Always using an array keeps data shape consistent.
   */
  value: string[];
  /** Callback fired when selection changes */
  onChange: (next: string[]) => void;

  /** Mode of selection: multiple (default) or single */
  mode?: "multiple" | "single";
  /** Whether a selected single option can be deselected by clicking again */
  allowDeselectSingle?: boolean;
  /** Maximum number of items that can be selected (multi-select only) */
  maxSelected?: number;

  /** Optional helper text displayed below the title */
  helperText?: string;

  /** Number of columns in desktop layout (default 2) */
  columns?: 1 | 2 | 3;
  /** Optional custom className */
  className?: string;
  /** Optional radio group name for single-select; auto-generated if omitted */
  name?: string;
}

/**
 * MultiSelectQuestion component
 * - Renders options as selectable cards
 * - Supports both single and multiple selection modes
 */
const MultiSelectQuestion: FC<MultiSelectQuestionProps> = ({
  title,
  subtitle,
  options,
  value,
  onChange,
  mode = "multiple",
  allowDeselectSingle = true,
  maxSelected,
  helperText,
  columns = 2,
  className,
  name,
}) => {
  /** Generate a stable name for radio group when in single mode */
  const autoName = useId();
  const radioName = name ?? `choice-${autoName}`;

  /** Check if selection limit is reached (applies only to multi-select) */
  const atLimit =
    mode !== "single" &&
    typeof maxSelected === "number" &&
    value.length >= maxSelected;

  /** Helper: check if a given option is currently selected */
  const isChecked = (val: string) =>
    mode === "single" ? value[0] === val : value.includes(val);

  /**
   * Toggle selection state for a given option
   * - In single mode, replaces the selected value
   * - In multi mode, adds/removes values with respect to maxSelected
   */
  const toggle = (val: string, disabled?: boolean) => {
    if (disabled) return;

    if (mode === "single") {
      const checked = isChecked(val);
      if (checked) {
        if (allowDeselectSingle) onChange([]); // clear if deselection allowed
      } else {
        onChange([val]); // select exclusively
      }
    } else {
      const checked = value.includes(val);
      if (checked) {
        // remove from selection
        onChange(value.filter((v) => v !== val));
      } else {
        if (atLimit) return; // prevent exceeding limit
        onChange([...value, val]); // add to selection
      }
    }
  };

  /** Column layout class for desktop view */
  const colClass =
    columns === 3
      ? "lg:grid-cols-3"
      : columns === 1
      ? "lg:grid-cols-1"
      : "lg:grid-cols-2";

  /** Input type and group role based on selection mode */
  const inputType = mode === "single" ? "radio" : "checkbox";
  const groupRole = mode === "single" ? "radiogroup" : "group";

  return (
    <section className={clsx("w-full", className)}>
      {/* Question title and optional text */}
      <header className="mb-4">
        <h3 className="text-lg sm:text-xl font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-1 text-ink-soft text-sm">{subtitle}</p>}
        {helperText && <p className="mt-1 text-ink-soft text-xs">{helperText}</p>}
      </header>

      {/* Options grid */}
      <div
        className={clsx("grid grid-cols-1 gap-3 sm:gap-4", colClass)}
        role={groupRole}
        aria-label={title}
      >
        {options.map((opt) => {
          const checked = isChecked(opt.value);
          const disabled = !!opt.disabled || (!checked && atLimit);

          return (
            <label
              key={opt.value}
              className={clsx(
                "relative flex items-center gap-3 rounded-2xl border p-4 cursor-pointer select-none",
                "transition-colors",
                checked
                  ? "border-primary/60 bg-primary/5"
                  : "border-black/10 bg-white hover:border-black/20",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              {/* Visually hidden native input for accessibility */}
              <input
                type={inputType}
                name={mode === "single" ? radioName : undefined}
                className="sr-only"
                checked={checked}
                onChange={() => toggle(opt.value, disabled)}
                disabled={disabled}
                aria-label={opt.label}
              />

              {/* Custom styled checkbox/radio control */}
              <span
                aria-hidden="true"
                className={clsx(
                  "inline-flex h-5 w-5 items-center justify-center rounded border",
                  mode === "single" ? "rounded-full" : "rounded",
                  checked
                    ? "bg-primary border-primary text-white"
                    : "bg-white border-black/25",
                  "ring-0"
                )}
              >
                {checked &&
                  (mode === "single" ? (
                    // Radio dot when selected
                    <span className="block h-2.5 w-2.5 rounded-full bg-white" />
                  ) : (
                    // Checkbox checkmark when selected
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M16.7 5.7L8.5 13.9 4 9.4"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ))}
              </span>

              {/* Option label text */}
              <span className="text-ink">{opt.label}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
};

export default MultiSelectQuestion;
