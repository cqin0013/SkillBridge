// Central types for ability-like taxonomies (skills, knowledge, tech skills).

/** Atomic item inside any taxonomy group */
export interface AbilityItem {
  /** Code from source data (kept as opaque string) */
  code: string;
  /** Human readable name */
  name: string;
}

/** Skill taxonomy shape */
export interface SkillCategories {
  content: AbilityItem[];
  process: AbilityItem[];
  crossFunctional: {
    resourceManagement: AbilityItem[];
    technical: AbilityItem[];
  };
}

/** Knowledge taxonomy shape */
export interface KnowledgeCategories {
  management: AbilityItem[];
  production: AbilityItem[];
  technical: AbilityItem[];
  science: AbilityItem[];
  health: AbilityItem[];
  education: AbilityItem[];
  culture: AbilityItem[];
  public: AbilityItem[];
  communication: AbilityItem[];
}

/** Tech skill taxonomy shape */
export interface TechSkillCategories {
  business: AbilityItem[];
  productivity: AbilityItem[];
  development: AbilityItem[];
  database: AbilityItem[];
  education: AbilityItem[];
  industry: AbilityItem[];
  network: AbilityItem[];
  system: AbilityItem[];
  security: AbilityItem[];
  communication: AbilityItem[];
  management: AbilityItem[];
}

/** Top-level category names for each taxonomy (as readonly tuples) */
export const SKILL_CATEGORY_NAMES = ['content', 'process', 'crossFunctional'] as const;
export type SkillCategoryName = typeof SKILL_CATEGORY_NAMES[number];

export const SKILL_CROSS_FUNCTIONAL_NAMES = ['resourceManagement', 'technical'] as const;
export type SkillCrossFunctionalName = typeof SKILL_CROSS_FUNCTIONAL_NAMES[number];

export const KNOWLEDGE_CATEGORY_NAMES = [
  'management',
  'production',
  'technical',
  'science',
  'health',
  'education',
  'culture',
  'public',
  'communication',
] as const;
export type KnowledgeCategoryName = typeof KNOWLEDGE_CATEGORY_NAMES[number];

export const TECHSKILL_CATEGORY_NAMES = [
  'business',
  'productivity',
  'development',
  'database',
  'education',
  'industry',
  'network',
  'system',
  'security',
  'communication',
  'management',
] as const;
export type TechSkillCategoryName = typeof TECHSKILL_CATEGORY_NAMES[number];
