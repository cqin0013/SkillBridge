// src/components/form/ComboSearchQuestion.tsx
// A compound question: a Select + an Input + a primary Button.
// - All copy is passed in via props to keep it reusable across pages.
// - Controlled via props so the caller can lift state to Redux if needed.

import type { FC, ChangeEvent } from "react";
import clsx from "clsx";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ComboSearchQuestionProps {
  /** Main title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;

  /** Left select box */
  selectLabel?: string;           // e.g., "Industry"
  selectPlaceholder?: string;     // e.g., "All industries"
  selectOptions: ReadonlyArray<SelectOption>;
  selectValue: string;
  onSelectChange: (v: string) => void;

  /** Right input box */
  inputLabel?: string;            // e.g., "Keyword"
  inputPlaceholder?: string;      // e.g., "Enter role keyword"
  inputValue: string;
  onInputChange: (v: string) => void;

  /** CTA button */
  buttonLabel: string;            // e.g., "Search roles"
  onSubmit: () => void;

  /** Optional className for the root */
  className?: string;
}

const ComboSearchQuestion: FC<ComboSearchQuestionProps> = ({
  title,
  subtitle,
  selectLabel,
  selectPlaceholder = "Please select",
  selectOptions,
  selectValue,
  onSelectChange,
  inputLabel,
  inputPlaceholder = "Please enter",
  inputValue,
  onInputChange,
  buttonLabel,
  onSubmit,
  className,
}) => {
  return (
    <section className={clsx("w-full", className)}>
      <header className="mb-4">
        <h3 className="text-lg sm:text-xl font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-1 text-ink-soft text-sm">{subtitle}</p>}
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Select (left) */}
        <div className="flex flex-col">
          {selectLabel && (
            <label className="mb-1 text-sm text-ink-soft">{selectLabel}</label>
          )}
          <select
            className={clsx(
              "h-11 rounded-xl border border-black/15 bg-[#F7F7FA]",
              "px-3 text-ink outline-none",
              "focus:border-primary focus:ring-2 focus:ring-primary/30"
            )}
            value={selectValue}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onSelectChange(event.target.value)
            }
          >
            <option value="">{selectPlaceholder}</option>
            {selectOptions.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Input (middle) */}
        <div className="flex flex-col">
          {inputLabel && (
            <label className="mb-1 text-sm text-ink-soft">{inputLabel}</label>
          )}
          <input
            type="text"
            value={inputValue}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onInputChange(event.target.value)
            }
            placeholder={inputPlaceholder}
            className={clsx(
              "h-11 rounded-xl border border-black/15 bg-[#F7F7FA]",
              "px-3 text-ink outline-none",
              "focus:border-primary focus:ring-2 focus:ring-primary/30"
            )}
          />
        </div>

        {/* Button (right) */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={onSubmit}
            className={clsx(
              "inline-flex w-full sm:w-auto items-center justify-center",
              "h-11 rounded-full px-5 font-semibold",
              "bg-primary text-white",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              "transition-colors"
            )}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </section>
  );
};

export default ComboSearchQuestion;
