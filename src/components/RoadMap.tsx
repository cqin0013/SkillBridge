import React from "react";

/**
 * MilestonesRoadmap
 * -------------------------------------------------------------
 * A responsive React component that recreates a "milestones roadmap"
 * like the reference image using a single, scalable SVG. Tailwind CSS
 * classes are used for layout and typography, but you can replace them
 * with your own styles.
 *
 * ✅ Accessible: each step is a <button> with aria-label
 * ✅ Responsive: SVG scales with container width
 * ✅ Customizable: pass steps, colors, and titles via props
 * ✅ No external images required
 */

export type RoadmapStep = {
  id: string;               // unique id
  badge: string;            // A / B / C / ...
  title: string;            // e.g., "PROMOTE"
  description?: string;     // optional small text under title
  x: number;                // SVG coord (viewBox space)
  y: number;                // SVG coord (viewBox space)
};

export interface MilestonesRoadmapProps {
  title?: string;
  subtitle?: string;
  startLabel?: string;
  steps?: RoadmapStep[];
  onStepClick?: (id: string) => void;
  /**
   * Colors
   */
  bg?: string;            // background fill
  pathColor?: string;     // main path color
  pathDashColor?: string; // dashed path color
  startColor?: string;    // start circle
  badgeColor?: string;    // badge circle fill
  badgeText?: string;     // badge text color
}

const defaultSteps: RoadmapStep[] = [
  { id: "A", badge: "A", title: "PROMOTE", description: "Write a text here.", x: 330, y: 520 },
  { id: "B", badge: "B", title: "ATTRACT", description: "Write a text here.", x: 480, y: 300 },
  { id: "C", badge: "C", title: "ADOPT", description: "Write a text here.", x: 760, y: 530 },
  { id: "D", badge: "D", title: "BUILD", description: "Write a text here.", x: 965, y: 300 },
  { id: "E", badge: "E", title: "IMPROVE", description: "Write a text here.", x: 1000, y: 520 },
];

export default function MilestonesRoadmap({
  title = "MILESTONES ROADMAP",
  subtitle = "Finding the solution",
  startLabel = "START",
  steps = defaultSteps,
  onStepClick,
  bg = "#FFF07A",            // warm yellow
  pathColor = "#ffffff",     // white outline
  pathDashColor = "#6E6AE3", // purple dashes
  startColor = "#2D2570",    // deep purple
  badgeColor = "#FF6B6B",    // coral
  badgeText = "#ffffff",
}: MilestonesRoadmapProps) {
  // SVG coordinate system
  const vb = { w: 1200, h: 700 };

  const handleClick = (id: string) => () => onStepClick?.(id);

  return (
    <div className="w-full max-w-[1200px] mx-auto rounded-2xl shadow-lg overflow-hidden">
      {/* Header band */}
      <div className="p-6 bg-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 grid place-items-center text-xs font-semibold text-gray-500 select-none">
            YOUR<br/>LOGO
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-indigo-800">{title}</h1>
            <p className="text-sm md:text-base text-indigo-700/70 -mt-1">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Roadmap drawing */}
      <div className="bg-indigo-50 p-4">
        <svg
          viewBox={`0 0 ${vb.w} ${vb.h}`}
          role="img"
          aria-label="Milestones roadmap"
          className="w-full h-auto"
        >
          {/* Background */}
          <rect x={0} y={0} width={vb.w} height={vb.h} fill={bg} />

          {/* Curvy road path */}
          {/* Main white underlay */}
          <path
            id="road"
            d="M 120 430 C 300 360, 480 460, 600 320 C 720 190, 880 420, 1020 360 C 1130 312, 1160 470, 1180 520"
            fill="none"
            stroke={pathColor}
            strokeWidth={70}
            strokeLinecap="round"
          />
          {/* Dashed inner track */}
          <path
            d="M 120 430 C 300 360, 480 460, 600 320 C 720 190, 880 420, 1020 360 C 1130 312, 1160 470, 1180 520"
            fill="none"
            stroke={pathDashColor}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray="18 16"
          />

          {/* START bubble */}
          <g transform={`translate(90,420)`}>
            <circle r={75} fill={startColor} />
            <text
              x={0}
              y={8}
              textAnchor="middle"
              fontSize={36}
              fontWeight={800}
              fill="#ffffff"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              {startLabel}
            </text>
          </g>

          {/* Labels near the top like in the sample */}
          <g transform="translate(250,140)">
            <text fontSize={20} fontWeight={800} fill="#3f3065">ATTRACT</text>
            <text y={26} fontSize={14} fill="#3f3065cc">Write a text here. Edit it easily on our website.</text>
          </g>
          <g transform="translate(820,140)">
            <text fontSize={20} fontWeight={800} fill="#3f3065">BUILD</text>
            <text y={26} fontSize={14} fill="#3f3065cc">Write a text here. Edit it easily on our website.</text>
          </g>

          {/* Dynamic steps */}
          {steps.map((s) => (
            <g key={s.id} transform={`translate(${s.x},${s.y})`}>
              {/* badge */}
              <circle r={52} fill={badgeColor} />
              <text
                textAnchor="middle"
                y={12}
                fontSize={36}
                fontWeight={800}
                fill={badgeText}
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                {s.badge}
              </text>

              {/* interactive hotspot */}
              <foreignObject x={-52} y={-52} width={104} height={104}>
                <button
                  aria-label={`Go to step ${s.badge}: ${s.title}`}
                  onClick={handleClick(s.id)}
                  className="w-full h-full rounded-full opacity-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400"
                />
              </foreignObject>

              {/* step text block (to the right or above depending on y) */}
              <g transform={`translate(${s.y > 450 ? -60 : 60}, ${s.y > 450 ? 90 : -90})`}>
                <text fontSize={18} fontWeight={800} fill="#3f3065">{s.title}</text>
                {s.description && (
                  <text y={24} fontSize={14} fill="#3f3065cc">{s.description}</text>
                )}
              </g>
            </g>
          ))}

          {/* Footer hint */}
          <text x={vb.w/2} y={vb.h - 16} textAnchor="middle" fontSize={12} fill="#3f3065aa">
            Editable SVG Roadmap · You can customize titles, colors and step positions via props
          </text>
        </svg>
      </div>
    </div>
  );
}

/**
 * Usage example
 * -------------------------------------------------------------
 * <MilestonesRoadmap
 *   onStepClick={(id) => console.log("clicked", id)}
 *   steps=[
 *     { id: 'A', badge: 'A', title: 'PROMOTE', x: 330, y: 520 },
 *     { id: 'B', badge: 'B', title: 'ATTRACT', x: 480, y: 300 },
 *     { id: 'C', badge: 'C', title: 'ADOPT',   x: 760, y: 530 },
 *     { id: 'D', badge: 'D', title: 'BUILD',   x: 965, y: 300 },
 *     { id: 'E', badge: 'E', title: 'IMPROVE', x: 1000, y: 520 },
 *   ]
 * />
 */
