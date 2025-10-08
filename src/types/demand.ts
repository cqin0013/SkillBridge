// src/types/demand.ts
export type DemandRes = {
  anzsco: { anzsco_code: string; anzsco_title: string };
  skill_level: string | null;
  national_rating: string | null;
  state: string;
  state_code: string;
  state_rating: string | null;
};
