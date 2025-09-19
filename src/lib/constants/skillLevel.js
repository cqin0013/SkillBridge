// src/lib/constants/skillLevel.js

export const SKILL_LEVEL_REQUIREMENTS = {
  1: {
    label: "Skill Level 1",
    bullets: [
      "Requires a bachelor degree or higher (or equivalent).",
      "If no formal qualification, at least 5 years of relevant work experience; or a combination of qualification + experience.",
      "Typical for Managers and Professionals.",
    ],
  },
  2: {
    label: "Skill Level 2",
    bullets: [
      "Requires an AQF Diploma or equivalent training and experience.",
      "Can also be satisfied by relevant experience and on-the-job training.",
      "Common for advanced Technicians & Trades roles.",
    ],
  },
  3: {
    label: "Skill Level 3",
    bullets: [
      "Requires an AQF Certificate IV, or substantial relevant work experience.",
      "Focus on technical competence and ability to work independently.",
    ],
  },
  4: {
    label: "Skill Level 4",
    bullets: [
      "Requires an AQF Certificate II/III, or equivalent on-the-job training.",
      "Common for Clerical/Admin, Sales, Community & Personal Service, Machinery Operators.",
    ],
  },
  5: {
    label: "Skill Level 5",
    bullets: [
      "Requires an AQF Certificate I, or short period of on-the-job training.",
      "Covers basic operational, manual labour, or service roles.",
    ],
  },
};

/**
 * Approximate ANZSCO → Skill Level mapping
 * 1 Managers → Level 1
 * 2 Professionals → Level 1
 * 3 Technicians & Trades → Level 2
 * 4,5,6,7 → Level 4
 * 8 Labourers → Level 5
 */
export function deriveSkillLevelFromANZSCO(anzscoLike) {
  if (!anzscoLike) return null;
  const s = String(anzscoLike).trim();
  const first = s.replace(/\D/g, "").charAt(0);
  switch (first) {
    case "1":
    case "2":
      return 1;
    case "3":
      return 2;
    case "4":
    case "5":
    case "6":
    case "7":
      return 4;
    case "8":
      return 5;
    default:
      return null;
  }
}
