// src/components/analyzer/profile/SkillTypeCategoryPicker.tsx
/**
 * SkillTypeCategoryPicker
 * - Three-step wizard: select type -> select category -> select skills
 * - Used to add new skills to the roadmap
 */

import { useState, useMemo } from "react";
import type { AbilityCategory } from "../AbilityPicker";
import Button from "../../ui/Button";

export type AType = "knowledge" | "tech" | "skill";

export type SkillTypeCategoryPickerProps = {
  open: boolean;
  onClose: () => void;
  /** Callback with selected skills and their type */
  onConfirm: (skills: Array<{ name: string; aType: AType }>) => void;
  /** Category builders */
  buildKnowledgeCats: () => AbilityCategory[];
  buildTechSkillCats: () => AbilityCategory[];
  buildSkillCats: () => AbilityCategory[];
};

type Step = "type" | "category" | "skills";

export default function SkillTypeCategoryPicker({
  open,
  onClose,
  onConfirm,
  buildKnowledgeCats,
  buildTechSkillCats,
  buildSkillCats,
}: SkillTypeCategoryPickerProps) {
  const [step, setStep] = useState<Step>("type");
  const [selectedType, setSelectedType] = useState<AType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());

  // Get categories based on selected type
  const categories = useMemo<AbilityCategory[]>(() => {
    if (!selectedType) return [];
    if (selectedType === "knowledge") return buildKnowledgeCats();
    if (selectedType === "tech") return buildTechSkillCats();
    return buildSkillCats();
  }, [selectedType, buildKnowledgeCats, buildTechSkillCats, buildSkillCats]);

  // Get skills for selected category
  const availableSkills = useMemo<string[]>(() => {
    if (!selectedCategory) return [];
    return categories.find((c) => c.id === selectedCategory)?.skills ?? [];
  }, [categories, selectedCategory]);

  // Reset state when modal opens/closes
  const resetState = () => {
    setStep("type");
    setSelectedType(null);
    setSelectedCategory(null);
    setSelectedSkills(new Set());
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleTypeSelect = (type: AType) => {
    setSelectedType(type);
    setStep("category");
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setStep("skills");
  };

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) next.delete(skill);
      else next.add(skill);
      return next;
    });
  };

  const handleConfirm = () => {
    if (!selectedType) return;
    const skills = Array.from(selectedSkills).map((name) => ({
      name,
      aType: selectedType,
    }));
    onConfirm(skills);
    resetState();
    onClose();
  };

  const handleBack = () => {
    if (step === "skills") {
      setStep("category");
      setSelectedCategory(null);
      setSelectedSkills(new Set());
    } else if (step === "category") {
      setStep("type");
      setSelectedType(null);
    }
  };

  if (!open) return null;

  const typeLabels: Record<AType, string> = {
    skill: "Skills",
    tech: "Tech Skills",
    knowledge: "Knowledge",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink">Add New Skills</h2>
            <p className="mt-0.5 text-sm text-ink-soft">
              {step === "type" && "Step 1: Choose skill type"}
              {step === "category" && "Step 2: Choose category"}
              {step === "skills" && `Step 3: Select ${typeLabels[selectedType!]}`}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={handleClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/10 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="min-h-[320px] p-5">
          {/* Step 1: Type Selection */}
          {step === "type" && (
            <div className="space-y-3">
              <p className="mb-4 text-sm text-ink-soft">
                Choose the type of skills you want to add:
              </p>
              {(["skill", "tech", "knowledge"] as AType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeSelect(type)}
                  className="w-full rounded-lg border border-black/15 bg-white px-6 py-4 text-left text-base transition hover:bg-black/5 hover:border-primary"
                >
                  <div className="font-medium text-ink">{typeLabels[type]}</div>
                  <div className="mt-1 text-sm text-ink-soft">
                    {type === "skill" && "Interpersonal and professional skills"}
                    {type === "tech" && "Technical and software skills"}
                    {type === "knowledge" && "Domain knowledge and expertise"}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Category Selection */}
          {step === "category" && (
            <div className="space-y-3">
              <p className="mb-4 text-sm text-ink-soft">
                Select a category from {typeLabels[selectedType!]}:
              </p>
              <div className="max-h-[360px] space-y-2 overflow-y-auto">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.id)}
                    className="w-full rounded-lg border border-black/15 bg-white px-5 py-3 text-left transition hover:bg-black/5 hover:border-primary"
                  >
                    <div className="font-medium text-ink">{cat.label}</div>
                    <div className="mt-0.5 text-xs text-ink-soft">
                      {cat.skills.length} skills available
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Skill Selection */}
          {step === "skills" && (
            <div>
              <p className="mb-4 text-sm text-ink-soft">
                Select skills to add ({selectedSkills.size} selected):
              </p>

              {/* Legend */}
              <div className="mb-3 flex items-center gap-4 text-xs text-ink-soft">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-6 rounded-full border border-black/15 bg-white px-3 leading-6">
                    Available
                  </span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-6 rounded-full bg-accent px-3 leading-6 text-primary-ink">
                    ✓ Selected
                  </span>
                </span>
              </div>

              {/* Skill Pills */}
              <div className="max-h-[300px] overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {availableSkills.map((skill) => {
                    const isSelected = selectedSkills.has(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => handleSkillToggle(skill)}
                        className={[
                          "min-h-[36px] rounded-full px-3 text-sm transition",
                          "focus:outline-none focus:ring-2 focus:ring-primary/50",
                          isSelected
                            ? "bg-accent text-primary-ink"
                            : "border border-black/15 bg-white hover:bg-black/5",
                        ].join(" ")}
                        aria-pressed={isSelected}
                      >
                        {isSelected ? "✓ " : ""}
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <div>
            {step !== "type" && (
              <Button variant="ghost" onClick={handleBack}>
                ← Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            {step === "skills" && (
              <Button
                onClick={handleConfirm}
                disabled={selectedSkills.size === 0}
              >
                Add {selectedSkills.size} skill{selectedSkills.size !== 1 ? "s" : ""}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
