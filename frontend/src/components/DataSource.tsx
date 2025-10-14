import React, { useId } from "react";
import { Globe2 } from "lucide-react";

/** Single data source item model */
export type DataSource = {
  id: string;
  name: string;
  url: string;
  description?: string;
};

/** Props for the read-only data sources section */
export type DataSourceProps = {
  /** List of sources (read-only to avoid accidental mutation) */
  sources: readonly DataSource[];
  /** Visible section title (used as an accessible region label) */
  title?: string;
};

/**
 * DataSource (a11y-enhanced, read-only)
 * - Semantics: <section role="region" aria-labelledby={headingId}>
 * - Headings: H2 for the section, cards stay simple (no nested headings needed)
 * - Keyboard: primary link has visible focus (focus:outline + ring)
 * - Layout: up to 3 cards per row; centers automatically; wraps when >3
 */
const DataSource: React.FC<DataSourceProps> = ({ sources, title = "Data sources" }) => {
  // Generate a stable, unique id to connect the region with its heading
  const headingId = useId();

  return (
    <section
      role="region"
      aria-labelledby={headingId}
      className="py-16 text-center bg-gradient-to-b from-white to-slate-50"
    >
      {/* Section heading announces the region to assistive tech */}
      <h2 id={headingId} className="text-xl sm:text-2xl font-semibold text-ink mb-10">
        {title}
      </h2>

      {/* Centered, responsive layout: max 3 per row, wraps gracefully */}
      <div className="flex flex-wrap justify-center gap-8 px-4 max-w-6xl mx-auto">
        {sources.map((s) => (
          <article
            key={s.id}
            className="w-[260px] sm:w-[280px] md:w-[300px] rounded-2xl border border-border bg-white p-6
                       shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300
                       flex flex-col items-center text-center"
          >
            {/* Unified, friendly icon for all cards */}
            <Globe2 className="w-10 h-10 text-primary mb-3" aria-hidden="true" focusable="false" />

            {/* Card title (not a document heading to avoid skipping levels) */}
            <div className="text-base font-semibold text-ink">{s.name}</div>

            {/* Optional short description for context */}
            {s.description && (
              <p className="mt-2 text-sm text-ink-soft leading-relaxed max-w-[240px]">
                {s.description}
              </p>
            )}

            {/* Primary action with descriptive text and visible focus style */}
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline
                         focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2 focus:ring-offset-white rounded"
              aria-label={`Visit ${s.name}`}
            >
              Visit source →
            </a>
          </article>
        ))}
      </div>
    </section>
  );
};

export default DataSource;
