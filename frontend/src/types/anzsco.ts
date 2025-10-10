// src/types/anzsco.ts
// Shared ANZSCO domain types for UI, hooks and services.

/**
 * Search request params accepted by the ANZSCO API.
 * `first` represents the ANZSIC division ("1"–"8" after normalization).
 */
export type AnzscoSearchParams = {
  first: string;
  keyword: string;
  limit?: number;
};

/**
 * Normalised occupation shape consumed by the UI.
 */
export type AnzscoOccupation = {
  code: string;
  title: string;
  first?: string;
  description?: string;
};
