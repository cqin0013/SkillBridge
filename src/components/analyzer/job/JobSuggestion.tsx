// src/components/analyzer/job/JobSuggestion.tsx
// Split layout: left industry list, right occupation groups.
// Optional badges: shortageCount and avgMatch only render when provided.

import React, { useMemo, useState } from "react";
import clsx from "clsx";

/** One detailed role item you will render inside a group (slot content) */
export type GroupChild = React.ReactNode;

/** Occupation group under an industry */
export type OccupationGroup = {
  id: string;
  title: string;              // e.g. "Software Development"
  jobsCount?: number;         // e.g. 4 → shown as "4 jobs" on the left of badges
  shortageCount?: number;     // optional → red badge "4 shortages"
  avgMatch?: number;          // optional → gray badge "89%"
  children: GroupChild;       // grid/cards for roles
  collapsible?: boolean;
  defaultOpen?: boolean;
};

/** One industry in the left pane */
export type IndustryItem = {
  key: string;                // stable key
  title: string;              // e.g. "Technology"
  groupCount?: number;        // pill at right of the item
  groups: OccupationGroup[];  // right pane data
};

export type JobSuggestionProps = {
  industries: IndustryItem[];       // left list data
  defaultSelectedKey?: string;       // initial selected industry
  className?: string;
  /** a11y text for expand/collapse */
  expandHint?: string;
  collapseHint?: string;
};

/** Small rounded pill used for numbers */
function Pill({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "danger" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "danger" ? "bg-rose-100 text-rose-800" : "bg-gray-100 text-gray-800"
      )}
    >
      {children}
    </span>
  );
}

/** Chevron icon used on group header */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={clsx("h-4 w-4 transition-transform", open ? "rotate-180" : "rotate-0")}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.06l3.71-2.83a.75.75 0 1 1 .92 1.18l-4.2 3.2a.75.75 0 0 1-.92 0l-4.2-3.2a.75.75 0 0 1-.02-1.06z" />
    </svg>
  );
}

/** One group card on the right */
function GroupCard({
  g,
  expandHint,
  collapseHint,
}: {
  g: OccupationGroup;
  expandHint: string;
  collapseHint: string;
}) {
  const [open, setOpen] = useState<boolean>(Boolean(g.defaultOpen));
  const toggle = () => g.collapsible && setOpen((v) => !v);

  return (
    <article
      aria-labelledby={`group-${g.id}`}
      onClick={toggle}
      className={clsx(
        "rounded-xl border bg-white p-4 cursor-pointer",
        "border-accent hover:shadow-sm"
      )}
      title={open ? collapseHint : expandHint}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h3 id={`group-${g.id}`} className="text-lg font-semibold text-ink">
            {g.title}
          </h3>
          {/* jobs count text on the left (optional) */}
          {typeof g.jobsCount === "number" && (
            <p className="mt-1 text-sm text-ink-soft">{g.jobsCount} jobs</p>
          )}
        </div>

        {/* optional badges on the right */}
        <div className="flex items-center gap-2">
          {typeof g.shortageCount === "number" && (
            <Pill tone="danger">{g.shortageCount} shortages</Pill>
          )}
          {typeof g.avgMatch === "number" && <Pill>{g.avgMatch}%</Pill>}

          {g.collapsible && <Chevron open={open} />}
        </div>
      </div>

      {/* body */}
      <div className={clsx("mt-4", g.collapsible && !open && "hidden")}>{g.children}</div>
    </article>
  );
}

/** Main split component */
export default function JobSuggestion({
  industries,
  defaultSelectedKey,
  className,
  expandHint = "Expand to show jobs",
  collapseHint = "Collapse to hide jobs",
}: JobSuggestionProps) {
  const initialKey = useMemo(
    () => defaultSelectedKey ?? industries[0]?.key ?? "",
    [defaultSelectedKey, industries]
  );
  const [activeKey, setActiveKey] = useState<string>(initialKey);

  const active = industries.find((i) => i.key === activeKey);

  return (
    <section className={clsx("rounded-2xl border border-border bg-white p-5 shadow-card", className)}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left: Industries */}
        <aside className="lg:col-span-4">
          <h2 className="text-2xl font-bold text-ink">Industries</h2>
          <p className="mt-1 text-ink-soft text-sm">
            {industries.length} total
          </p>

          <ul className="mt-4 space-y-2">
            {industries.map((it) => {
              const selected = it.key === activeKey;
              return (
                <li key={it.key}>
                  <button
                    type="button"
                    onClick={() => setActiveKey(it.key)}
                    className={clsx(
                      "w-full rounded-2xl border px-4 py-4 text-left",
                      selected
                        ? "bg-primary text-ink-invert border-transparent"
                        : "bg-white text-ink border-border hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold">{it.title}</div>
                        <div className={clsx("mt-1 text-sm", selected ? "text-ink-invert/80" : "text-ink-soft")}>
                          {typeof it.groupCount === "number" ? `${it.groupCount} occupation groups` : ""}
                        </div>
                      </div>
                      {typeof it.groupCount === "number" && (
                        <span
                          className={clsx(
                            "ml-2 inline-flex h-7 min-w-[2rem] items-center justify-center rounded-full px-2 text-sm font-semibold",
                            selected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-800"
                          )}
                        >
                          {it.groupCount}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Right: Groups of the selected industry */}
        <main className="lg:col-span-8">
          <h2 className="text-2xl font-bold text-ink">Occupation groups</h2>
          <p className="mt-1 text-ink-soft text-sm">
            {typeof active?.groupCount === "number" ? `${active.groupCount} groups` : ""}
          </p>

          <div className="mt-4 space-y-4">
            {active?.groups.map((g) => (
              <GroupCard key={g.id} g={g} expandHint={expandHint} collapseHint={collapseHint} />
            ))}

            {!active?.groups?.length && (
              <div className="rounded-md border border-dashed border-border p-4 text-sm text-ink-soft">
                No groups for this industry.
              </div>
            )}
          </div>
        </main>
      </div>
    </section>
  );
}
