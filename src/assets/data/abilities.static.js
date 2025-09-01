// src/data/abilities.static.js
// SkillBridge — Static ability taxonomy (lean: no descriptions, no role-to-ability)

/** Proficiency levels for UI controls */
export const PROFICIENCY_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];

/**
 * Four major categories -> groups -> leaf abilities
 * (kept onetCode only at category/group level; items are {id, name})
 */
export const ABILITY_TAXONOMY = {
  version: "skillbridge-abilities-v1",
  categories: [
    {
      id: "cognitive",
      label: "Cognitive Abilities",
      onetCode: "1.A",
      groups: [
        {
          id: "attention",
          label: "Attention",
          onetCode: "1.A.1.a",
          items: [
            { id: "selective-attention", name: "Selective Attention" },
            { id: "time-sharing", name: "Time Sharing" },
          ],
        },
        {
          id: "reasoning",
          label: "Idea Generation & Reasoning",
          onetCode: "1.A.1.b",
          items: [
            { id: "category-flexibility", name: "Category Flexibility" },
            { id: "deductive-reasoning", name: "Deductive Reasoning" },
            { id: "inductive-reasoning", name: "Inductive Reasoning" },
            { id: "fluency-of-ideas", name: "Fluency of Ideas" },
            { id: "information-ordering", name: "Information Ordering" },
            { id: "originality", name: "Originality" },
            { id: "problem-sensitivity", name: "Problem Sensitivity" },
          ],
        },
        {
          id: "memory",
          label: "Memory",
          onetCode: "1.A.1.c",
          items: [{ id: "memorization", name: "Memorization" }],
        },
        {
          id: "perceptual",
          label: "Perceptual Abilities",
          onetCode: "1.A.1.d",
          items: [
            { id: "flexibility-of-closure", name: "Flexibility of Closure" },
            { id: "perceptual-speed", name: "Perceptual Speed" },
            { id: "speed-of-closure", name: "Speed of Closure" },
          ],
        },
        {
          id: "quantitative",
          label: "Quantitative Abilities",
          onetCode: "1.A.1.e",
          items: [
            { id: "mathematical-reasoning", name: "Mathematical Reasoning" },
            { id: "number-facility", name: "Number Facility" },
          ],
        },
        {
          id: "spatial",
          label: "Spatial Abilities",
          onetCode: "1.A.1.f",
          items: [
            { id: "spatial-orientation", name: "Spatial Orientation" },
            { id: "visualization", name: "Visualization" },
          ],
        },
        {
          id: "verbal",
          label: "Verbal Abilities",
          onetCode: "1.A.1.g",
          items: [
            { id: "oral-comprehension", name: "Oral Comprehension" },
            { id: "oral-expression", name: "Oral Expression" },
            { id: "written-comprehension", name: "Written Comprehension" },
            { id: "written-expression", name: "Written Expression" },
          ],
        },
      ],
    },

    {
      id: "physical",
      label: "Physical Abilities",
      onetCode: "1.B",
      groups: [
        {
          id: "endurance",
          label: "Endurance",
          items: [{ id: "stamina", name: "Stamina" }],
        },
        {
          id: "flexibility-balance-coordination",
          label: "Flexibility / Balance / Coordination",
          items: [
            { id: "extent-flexibility", name: "Extent Flexibility" },
            { id: "dynamic-flexibility", name: "Dynamic Flexibility" },
            { id: "gross-body-coordination", name: "Gross Body Coordination" },
            { id: "gross-body-equilibrium", name: "Gross Body Equilibrium" },
          ],
        },
        {
          id: "strength",
          label: "Strength",
          items: [
            { id: "dynamic-strength", name: "Dynamic Strength" },
            { id: "explosive-strength", name: "Explosive Strength" },
            { id: "static-strength", name: "Static Strength" },
            { id: "trunk-strength", name: "Trunk Strength" },
          ],
        },
      ],
    },

    {
      id: "psychomotor",
      label: "Psychomotor Abilities",
      onetCode: "1.C",
      groups: [
        {
          id: "fine-control",
          label: "Fine Control & Precision",
          items: [
            { id: "arm-hand-steadiness", name: "Arm-Hand Steadiness" },
            { id: "wrist-finger-speed", name: "Wrist-Finger Speed" },
            { id: "finger-dexterity", name: "Finger Dexterity" },
            { id: "manual-dexterity", name: "Manual Dexterity" },
            { id: "control-precision", name: "Control Precision" },
          ],
        },
        {
          id: "coordination-timing",
          label: "Coordination & Timing",
          items: [
            { id: "multilimb-coordination", name: "Multilimb Coordination" },
            { id: "rate-control", name: "Rate Control" },
            { id: "reaction-time", name: "Reaction Time" },
            { id: "response-orientation", name: "Response Orientation" },
          ],
        },
      ],
    },

    {
      id: "sensory",
      label: "Sensory Abilities",
      onetCode: "1.D",
      groups: [
        {
          id: "auditory-speech",
          label: "Auditory & Speech",
          items: [
            { id: "auditory-attention", name: "Auditory Attention" },
            { id: "hearing-sensitivity", name: "Hearing Sensitivity" },
            { id: "speech-recognition", name: "Speech Recognition" },
            { id: "speech-clarity", name: "Speech Clarity" },
          ],
        },
        {
          id: "vision",
          label: "Vision",
          items: [
            { id: "near-vision", name: "Near Vision" },
            { id: "far-vision", name: "Far Vision" },
            { id: "depth-perception", name: "Depth Perception" },
            { id: "peripheral-vision", name: "Peripheral Vision" },
            { id: "glare-sensitivity", name: "Glare Sensitivity" },
            { id: "night-vision", name: "Night Vision" },
            { id: "visual-color-discrimination", name: "Color Discrimination" },
          ],
        },
      ],
    },
  ],
};

/* ------------------ Helpers (still useful) ------------------ */

/** Flatten all leaf abilities into [{path, categoryId, groupId, id, name}] */
export function flattenAbilities() {
  const rows = [];
  ABILITY_TAXONOMY.categories.forEach((cat) => {
    cat.groups.forEach((grp) => {
      grp.items.forEach((it) => {
        rows.push({
          path: `${cat.label} / ${grp.label} / ${it.name}`,
          categoryId: cat.id,
          groupId: grp.id,
          id: it.id,
          name: it.name,
        });
      });
    });
  });
  return rows;
}

/** Simple name-only keyword search */
export function searchAbilities(keyword = "") {
  const k = keyword.trim().toLowerCase();
  if (!k) return [];
  return flattenAbilities().filter((r) => r.name.toLowerCase().includes(k));
}

/** Default export */
export default {
  PROFICIENCY_LEVELS,
  ABILITY_TAXONOMY,
  flattenAbilities,
  searchAbilities,
};
