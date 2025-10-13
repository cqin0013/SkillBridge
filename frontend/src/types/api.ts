// Backend response models. Keep these in sync with server contracts.

export interface SearchOccupationItem {
  code: string;
  title: string;
  // Add server-provided fields if needed (e.g., unitGroup, majorGroup)
}

export interface SearchOccupationRes {
  industry: string;
  items: Array<{
    anzsco_code: string;
    anzsco_title: string;
  }>;
}

export interface AbilityTitle {
  code?: string;
  title: string;
}

export interface SkillsByCodeRes {
  anzsco: {
    code: string;
    major_first?: string;
    major_name?: string;
  };
  knowledge_titles: AbilityTitle[];
  tech_titles: AbilityTitle[];
  skill_titles: AbilityTitle[];
}
