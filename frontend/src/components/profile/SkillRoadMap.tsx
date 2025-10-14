// Skill roadmap editor with filtering, batch selection, and accessible actions
// - Uses shared <Button /> component for consistent style and disabled tooltips
// - Dates are optional; status derives from presence and comparison with today

import React, { useMemo, useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  TrendingUp,
  Clock,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Filter,
  ArrowUpDown,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import Button from "../ui/Button";
import { skillCategories } from "../../data/skill.static";
import { knowledgeCategories } from "../../data/knowledge.static";
import { techSkillCategories } from "../../data/techskill.static";

// Ability types matching your project structure
type AbilityType = "skill" | "knowledge" | "tech";

export type SkillRoadmapItem = {
  id: string;
  abilityType: AbilityType;
  category: string;
  skill: string;
  code?: string;
  startDate?: string;
  endDate?: string;
};

type StatusInfo = {
  status: "not-started" | "in-progress" | "completed" | "not-scheduled";
  label: string;
  color: string; // Tailwind color classes for badge
  icon: typeof Clock; // Icon component type
  sortOrder: number; // Lower first in sorting
};

type SkillRoadMapProps = {
  initialSkills?: SkillRoadmapItem[];
  onChange?: (next: SkillRoadmapItem[]) => void;
};

// Create stable ids for new items
const createId = (): string =>
  `skill-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// Parse string date to Date if valid
const parseDateStrict = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
};

// Format date for UI (fallback text if empty)
const formatDateLabel = (value?: string): string => {
  const dt = parseDateStrict(value);
  return dt ? dt.toLocaleDateString() : "Not scheduled";
};

// Ensure each item has an id
const normalizeInitial = (items?: SkillRoadmapItem[]): SkillRoadmapItem[] =>
  (items ?? []).map((item) => ({
    ...item,
    id: item.id ?? createId(),
  }));

export default function SkillRoadMap({
  initialSkills,
  onChange,
}: SkillRoadMapProps): React.ReactElement {
  const [skills, setSkills] = useState<SkillRoadmapItem[]>(() =>
    normalizeInitial(initialSkills)
  );
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingSkill, setEditingSkill] = useState<SkillRoadmapItem | null>(
    null
  );
  const [collapsed, setCollapsed] = useState<boolean>(false);

  // Filters and batch selection state
  const [filterType, setFilterType] = useState<AbilityType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState<boolean>(false);

  // Local form state for add/edit
  const [formData, setFormData] = useState<{
    abilityType: AbilityType | "";
    category: string;
    skill: string;
    code: string;
    startDate: string;
    endDate: string;
  }>({
    abilityType: "",
    category: "",
    skill: "",
    code: "",
    startDate: "",
    endDate: "",
  });

  /** Propagate to parent and local set */
  const syncSkills = (next: SkillRoadmapItem[]): void => {
    setSkills(next);
    onChange?.(next);
  };

  /** Category options by type */
  const getCategoryOptions = (type: AbilityType | ""): string[] => {
    if (!type) return [];
    if (type === "skill") {
      return ["content", "process", "crossFunctional"];
    }
    if (type === "knowledge") {
      return [
        "management",
        "production",
        "technical",
        "science",
        "health",
        "education",
        "culture",
        "public",
        "communication",
      ];
    }
    // tech
    return [
      "business",
      "productivity",
      "development",
      "database",
      "education",
      "industry",
      "network",
      "system",
      "security",
      "communication",
      "management",
    ];
  };

  /** Skill options by type + category */
  const getSkillOptions = (
    type: AbilityType | "",
    category: string
  ): Array<{ name: string; code?: string }> => {
    if (!type || !category) return [];
    if (type === "skill") {
      if (category === "content") return skillCategories.content;
      if (category === "process") return skillCategories.process;
      if (category === "crossFunctional") {
        return [
          ...skillCategories.crossFunctional.resourceManagement,
          ...skillCategories.crossFunctional.technical,
        ];
      }
    } else if (type === "knowledge") {
      return (
        knowledgeCategories[category as keyof typeof knowledgeCategories] || []
      );
    } else if (type === "tech") {
      return techSkillCategories[category as keyof typeof techSkillCategories] || [];
    }
    return [];
  };

  /** Compute status from dates with sort priority */
  const getSkillStatus = (
    startDate?: string,
    endDate?: string
  ): StatusInfo => {
    const start = parseDateStrict(startDate);
    const end = parseDateStrict(endDate);

    if (!start || !end) {
      return {
        status: "not-scheduled",
        label: "Not scheduled",
        color: "bg-gray-100 text-ink-soft border-border",
        icon: Clock,
        sortOrder: 4, // Last priority
      };
    }

    const today = new Date();

    if (today < start) {
      return {
        status: "not-started",
        label: "Not Started",
        color: "bg-gray-100 text-ink-soft border-border",
        icon: Clock,
        sortOrder: 3,
      };
    }
    if (today >= start && today <= end) {
      return {
        status: "in-progress",
        label: "In Progress",
        color: "bg-primary/10 text-primary border-primary",
        icon: TrendingUp,
        sortOrder: 2,
      };
    }
    return {
      status: "completed",
      label: "Date Passed",
      color: "bg-accent/20 text-black border-accent",
      icon: AlertCircle,
      sortOrder: 1, // First priority
    };
  };

  /** Filter + sort list deterministically */
  const filteredAndSortedSkills = useMemo(() => {
    let result = [...skills];

    if (filterType !== "all") {
      result = result.filter((s) => s.abilityType === filterType);
    }
    if (filterStatus !== "all") {
      result = result.filter((s) => {
        const status = getSkillStatus(s.startDate, s.endDate).status;
        return status === filterStatus;
      });
    }

    result.sort((a, b) => {
      const statusA = getSkillStatus(a.startDate, a.endDate);
      const statusB = getSkillStatus(b.startDate, b.endDate);
      return statusA.sortOrder - statusB.sortOrder;
    });

    return result;
  }, [skills, filterType, filterStatus]);

  /** Summary counts for collapsed view */
  const summary = useMemo(() => {
    const total = skills.length;

    const notScheduled = skills.reduce((acc, s) => {
      const start = parseDateStrict(s.startDate);
      const end = parseDateStrict(s.endDate);
      return acc + (!start || !end ? 1 : 0);
    }, 0);

    let inProgress = 0;
    let datePassed = 0;
    for (const s of skills) {
      const st = getSkillStatus(s.startDate, s.endDate).status;
      if (st === "in-progress") inProgress += 1;
      if (st === "completed") datePassed += 1;
    }

    return { total, notScheduled, inProgress, datePassed };
  }, [skills]);

  // -----------------------
  // CRUD handlers
  // -----------------------
  const canSubmitBase = Boolean(
    formData.abilityType && formData.category && formData.skill
  );

  const canSubmitAdd = canSubmitBase;
  const addDisabledReason = !formData.abilityType
    ? "Please select ability type."
    : !formData.category
      ? "Please select category."
      : !formData.skill
        ? "Please select skill."
        : undefined;

  const canSubmitEdit = canSubmitBase;
  const editDisabledReason = addDisabledReason;

  const handleAddSkill = (): void => {
    if (!canSubmitAdd) return;
    const newSkill: SkillRoadmapItem = {
      id: createId(),
      abilityType: formData.abilityType as AbilityType,
      category: formData.category,
      skill: formData.skill,
      code: formData.code?.trim() ? formData.code.trim() : undefined,
      // Dates optional
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
    };
    syncSkills([...skills, newSkill]);
    resetForm();
    setShowAddModal(false);
  };

  const handleEditSkill = (): void => {
    if (!editingSkill || !canSubmitEdit) return;
    syncSkills(
      skills.map((skill) =>
        skill.id === editingSkill.id
          ? {
              ...skill,
              abilityType: formData.abilityType as AbilityType,
              category: formData.category,
              skill: formData.skill,
              code: formData.code?.trim() ? formData.code.trim() : undefined,
              startDate: formData.startDate || undefined,
              endDate: formData.endDate || undefined,
            }
          : skill
      )
    );
    resetForm();
    setShowEditModal(false);
    setEditingSkill(null);
  };

  const handleRemoveSkill = (id: string): void => {
    syncSkills(skills.filter((skill) => skill.id !== id));
    if (selectedIds.has(id)) {
      const next = new Set(selectedIds);
      next.delete(id);
      setSelectedIds(next);
    }
  };

  const openEditModal = (skill: SkillRoadmapItem): void => {
    setEditingSkill(skill);
    setFormData({
      abilityType: skill.abilityType,
      category: skill.category,
      skill: skill.skill,
      code: skill.code || "",
      startDate: skill.startDate ?? "",
      endDate: skill.endDate ?? "",
    });
    setShowEditModal(true);
  };

  const resetForm = (): void => {
    setFormData({
      abilityType: "",
      category: "",
      skill: "",
      code: "",
      startDate: "",
      endDate: "",
    });
  };

  // -----------------------
  // Batch operations
  // -----------------------
  const toggleSelection = (id: string): void => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = (): void => {
    if (selectedIds.size === filteredAndSortedSkills.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedSkills.map((s) => s.id)));
    }
  };

  const handleBatchDelete = (): void => {
    if (selectedIds.size === 0) return;
    if (confirm(`Delete ${selectedIds.size} selected skill(s)?`)) {
      syncSkills(skills.filter((s) => !selectedIds.has(s.id)));
      setSelectedIds(new Set());
      setShowBatchActions(false);
    }
  };

  const resetFilters = (): void => {
    setFilterType("all");
    setFilterStatus("all");
  };

  // -----------------------
  // Modal scaffold
  // -----------------------
  const Modal = ({
    show,
    title,
    children,
  }: {
    show: boolean;
    title: string;
    children: React.ReactNode;
  }): React.ReactElement | null => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-3 sm:p-4">
        <div
          className="bg-white rounded-xl shadow-modal w-full max-h-[98vh] overflow-y-auto
             max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl">
          <div className="p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-ink mb-3 sm:mb-4">
              {title}
            </h2>
            {children}
          </div>
        </div>
      </div>
    );
  };

  // -----------------------
  // Form content for Add/Edit
  // -----------------------
  const FormContent = ({
    onSubmit,
    submitLabel,
    disabled,
    disabledReason,
  }: {
    onSubmit: () => void;
    submitLabel: string;
    disabled: boolean;
    disabledReason?: string;
  }): React.ReactElement => {
    return (
      <div className="space-y-4">
        {/* Ability type */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Ability Type
          </label>
          <select
            value={formData.abilityType}
            onChange={(e) =>
              setFormData({
                ...formData,
                abilityType: e.target.value as AbilityType | "",
                category: "",
                skill: "",
                code: "",
              })
            }
            className="w-full p-2.5 sm:p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-ink"
          >
            <option value="">Select Type</option>
            <option value="skill">Skill</option>
            <option value="knowledge">Knowledge</option>
            <option value="tech">Tech Skill</option>
          </select>
        </div>

        {/* Category */}
        {formData.abilityType && (
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value,
                  skill: "",
                  code: "",
                })
              }
              className="w-full p-2.5 sm:p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-ink"
            >
              <option value="">Select Category</option>
              {getCategoryOptions(formData.abilityType).map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Skill */}
        {formData.category && (
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Skill
            </label>
            <select
              value={formData.skill}
              onChange={(e) => {
                const selectedOption = getSkillOptions(
                  formData.abilityType,
                  formData.category
                ).find((opt) => opt.name === e.target.value);
                setFormData({
                  ...formData,
                  skill: e.target.value,
                  code: selectedOption?.code || "",
                });
              }}
              className="w-full p-2.5 sm:p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-ink"
            >
              <option value="">Select Skill</option>
              {getSkillOptions(formData.abilityType, formData.category).map(
                (opt) => (
                  <option key={opt.code || opt.name} value={opt.name}>
                    {opt.name}
                  </option>
                )
              )}
            </select>
          </div>
        )}

        {/* Dates are optional */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
              }
              className="w-full p-2.5 sm:p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-ink"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              End Date
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) =>
                setFormData({ ...formData, endDate: e.target.value })
              }
              className="w-full p-2.5 sm:p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-ink"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 sm:pt-4">
          <Button
            variant="primary"
            size="md"
            onClick={onSubmit}
            disabled={disabled}
            tooltipWhenDisabled={disabled ? disabledReason : undefined}
            aria-label={submitLabel}
            className="w-full sm:flex-1"
          >
            {submitLabel}
          </Button>

          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              resetForm();
              setShowAddModal(false);
              setShowEditModal(false);
              setEditingSkill(null);
            }}
            aria-label="Cancel"
            className="w-full sm:flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 items-start sm:items-center mb-6 sm:mb-8">
          <h3 className="text-xl sm:text-xl lg:text-xl font-heading font-bold text-ink">
            {/* Intentionally empty or you can put a small title */}
          </h3>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {skills.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBatchActions(!showBatchActions)}
                  aria-label={showBatchActions ? "Exit batch mode" : "Enter batch mode"}
                  className={
                    showBatchActions
                      ? "border-primary text-primary bg-primary/10"
                      : undefined
                  }
                >
                  <CheckSquare size={18} className="mr-1.5" />
                  Batch
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCollapsed((v) => !v)}
                  aria-label={collapsed ? "Show all" : "Show less"}
                >
                  {collapsed ? <ChevronDown size={18} className="mr-1.5" /> : <ChevronUp size={18} className="mr-1.5" />}
                  {collapsed ? "Show all" : "Show less"}
                </Button>
              </>
            )}

            <Button
              variant="primary"
              size="md"
              onClick={() => setShowAddModal(true)}
              aria-label="Add new skill"
            >
              <Plus size={18} className="sm:hidden mr-1" />
              <Plus size={20} className="hidden sm:inline-block mr-1" />
              Add Skill
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        {skills.length > 0 && !collapsed && (
          <div className="bg-white rounded-xl shadow-card border border-border p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={18} className="text-primary" />
              <h3 className="font-semibold text-ink">Filters</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) =>
                    setFilterType(e.target.value as AbilityType | "all")
                  }
                  className="w-full p-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="all">All Types</option>
                  <option value="skill">Skill</option>
                  <option value="knowledge">Knowledge</option>
                  <option value="tech">Tech Skill</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full p-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Date Passed</option>
                  <option value="in-progress">In Progress</option>
                  <option value="not-started">Not Started</option>
                  <option value="not-scheduled">Not Scheduled</option>
                </select>
              </div>
            </div>

            {(filterType !== "all" || filterStatus !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                aria-label="Clear all filters"
                className="mt-3 inline-flex items-center gap-1 text-primary hover:underline"
              >
                <X size={14} />
                Clear all filters
              </Button>
            )}
          </div>
        )}

        {/* Batch actions bar */}
        {showBatchActions && selectedIds.size > 0 && (
          <div className="bg-primary/10 border border-primary rounded-xl p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-sm font-medium text-ink">
              {selectedIds.size} skill{selectedIds.size > 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleBatchDelete}
                aria-label="Delete selected skills"
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 size={16} className="mr-1.5" />
                Delete Selected
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                aria-label="Cancel batch selection"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Collapsed summary */}
        {collapsed && skills.length > 0 ? (
          <div className="bg-white rounded-xl shadow-card border border-border p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-heading font-semibold text-ink mb-3 sm:mb-4">
              Summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="rounded-lg border border-border p-3 sm:p-4">
                <div className="text-xs sm:text-sm text-ink-soft mb-1">Total</div>
                <div className="text-xl sm:text-2xl font-bold text-ink">
                  {summary.total}
                </div>
              </div>
              <div className="rounded-lg border border-border p-3 sm:p-4">
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-ink-soft mb-1">
                  <AlertCircle size={14} />
                  <span>Date Passed</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-ink">
                  {summary.datePassed}
                </div>
              </div>
              <div className="rounded-lg border border-border p-3 sm:p-4">
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-ink-soft mb-1">
                  <Clock size={14} />
                  <span>Not Scheduled</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-ink">
                  {summary.notScheduled}
                </div>
              </div>
              <div className="rounded-lg border border-border p-3 sm:p-4">
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-ink-soft mb-1">
                  <TrendingUp size={14} />
                  <span>In Progress</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-ink">
                  {summary.inProgress}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {skills.length === 0 ? (
              <div className="bg-white rounded-xl shadow-card border border-border p-8 sm:p-12 text-center">
                <Calendar
                  size={56}
                  className="mx-auto mb-3 text-ink-soft/40 sm:hidden"
                />
                <Calendar
                  size={64}
                  className="mx-auto mb-4 text-ink-soft/40 hidden sm:block"
                />
                <h2 className="text-lg sm:text-2xl font-heading font-semibold text-ink mb-2">
                  Not selected yet
                </h2>
                <p className="text-ink-soft mb-4 sm:mb-6 text-sm sm:text-base">
                  Start building your learning roadmap by adding your first skill
                </p>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setShowAddModal(true)}
                  aria-label="Add your first skill"
                >
                  Add Your First Skill
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-card border border-border">
                {/* Sorting info header */}
                <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-gray-50/50">
                  <div className="flex items-center gap-2 text-sm text-ink-soft">
                    <ArrowUpDown size={16} />
                    <span>
                      Sorted: Date Passed → In Progress → Not Started → Not Scheduled
                    </span>
                  </div>
                  {showBatchActions && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleSelectAll}
                      aria-label={
                        selectedIds.size === filteredAndSortedSkills.length
                          ? "Deselect all"
                          : "Select all"
                      }
                      className="text-primary hover:underline"
                    >
                      {selectedIds.size === filteredAndSortedSkills.length ? (
                        <>
                          <CheckSquare size={16} className="mr-1" />
                          Deselect All
                        </>
                      ) : (
                        <>
                          <Square size={16} className="mr-1" />
                          Select All
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Scrollable list */}
                <div className="max-h-[600px] overflow-y-auto">
                  <div className="p-3 sm:p-4 space-y-3">
                    {filteredAndSortedSkills.map((skill) => {
                      const statusInfo = getSkillStatus(
                        skill.startDate,
                        skill.endDate
                      );
                      const StatusIcon = statusInfo.icon;
                      const isSelected = selectedIds.has(skill.id);

                      return (
                        <div
                          key={skill.id}
                          className={`bg-white rounded-xl border p-4 sm:p-5 hover:shadow-lg transition ${
                            isSelected ? "border-primary bg-primary/5" : "border-border"
                          }`}
                        >
                          <div className="flex items-start gap-3 sm:gap-4">
                            {/* Batch checkbox */}
                            {showBatchActions && (
                              <button
                                onClick={() => toggleSelection(skill.id)}
                                className="mt-1 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/40 rounded"
                                aria-label={isSelected ? "Unselect skill" : "Select skill"}
                              >
                                {isSelected ? (
                                  <CheckSquare size={20} className="text-primary" />
                                ) : (
                                  <Square size={20} className="text-ink-soft" />
                                )}
                              </button>
                            )}

                            <div className="flex-1 min-w-0">
                              {/* Title */}
                              <h3 className="text-base sm:text-lg lg:text-xl font-heading font-bold text-ink leading-snug whitespace-normal break-words">
                                {skill.skill}
                              </h3>

                              {/* Meta */}
                              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-ink-soft">
                                <span className="capitalize font-medium">
                                  {skill.abilityType}
                                </span>
                                <span>→</span>
                                <span className="capitalize">{skill.category}</span>

                                <span
                                  className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-medium border ${statusInfo.color}`}
                                >
                                  <StatusIcon size={12} />
                                  {statusInfo.label}
                                </span>

                                <span className="flex items-center gap-1">
                                  <Calendar size={14} className="opacity-70" />
                                  <span>Start: {formatDateLabel(skill.startDate)}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar size={14} className="opacity-70" />
                                  <span>End: {formatDateLabel(skill.endDate)}</span>
                                </span>
                              </div>
                            </div>

                            {/* Row actions */}
                            {!showBatchActions && (
                              <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditModal(skill)}
                                  aria-label="Edit skill"
                                  tooltipWhenDisabled={undefined}
                                  className="p-1.5 sm:p-2 text-primary hover:bg-primary/10 rounded-lg"
                                >
                                  <Edit2 size={18} className="sm:hidden" />
                                  <Edit2 size={20} className="hidden sm:block" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveSkill(skill.id)}
                                  aria-label="Remove skill"
                                  className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 size={18} className="sm:hidden" />
                                  <Trash2 size={20} className="hidden sm:block" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Results footer */}
                {filteredAndSortedSkills.length > 0 && (
                  <div className="px-4 py-3 border-top border-border bg-gray-50/50 text-center text-sm text-ink-soft">
                    Showing {filteredAndSortedSkills.length} of {skills.length} skill
                    {skills.length !== 1 ? "s" : ""}
                  </div>
                )}

                {/* Empty after filter */}
                {filteredAndSortedSkills.length === 0 && skills.length > 0 && (
                  <div className="p-8 text-center">
                    <Filter size={48} className="mx-auto mb-3 text-ink-soft/40" />
                    <h3 className="text-lg font-semibold text-ink mb-2">
                      No skills match your filters
                    </h3>
                    <p className="text-ink-soft mb-4">Try adjusting your filter criteria</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                      aria-label="Clear all filters"
                      className="text-primary hover:underline"
                    >
                      Clear all filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Add Modal */}
        <Modal show={showAddModal} title="Add New Skill">
          <FormContent
            onSubmit={handleAddSkill}
            submitLabel="Add Skill"
            disabled={!canSubmitAdd}
            disabledReason={addDisabledReason}
          />
        </Modal>

        {/* Edit Modal */}
        <Modal show={showEditModal} title="Edit Skill">
          <FormContent
            onSubmit={handleEditSkill}
            submitLabel="Update Skill"
            disabled={!canSubmitEdit}
            disabledReason={editDisabledReason}
          />
        </Modal>
      </div>
    </div>
  );
}
