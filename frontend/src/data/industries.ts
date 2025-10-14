// Canonical list of Australian industries used by JSA industry profiles.
// These align to ANZSIC Divisions (A–S). Keep `code` stable; `slug` is URL-friendly.
// Display label is English only (labelEn), as requested.

export type JsaIndustry = {
  code: string;    // ANZSIC division letter (A–S). Best for storage/joins.
  slug: string;    // URL-safe, human-readable identifier (kebab-case).
  labelEn: string; // Display label (English).
};

export const INDUSTRIES: Readonly<JsaIndustry[]> = [
  { code: "A", slug: "agriculture-forestry-fishing",        labelEn: "Agriculture, Forestry and Fishing" },
  { code: "B", slug: "mining",                               labelEn: "Mining" },
  { code: "C", slug: "manufacturing",                        labelEn: "Manufacturing" },
  { code: "D", slug: "electricity-gas-water-waste",          labelEn: "Electricity, Gas, Water and Waste Services" },
  { code: "E", slug: "construction",                         labelEn: "Construction" },
  { code: "F", slug: "wholesale-trade",                      labelEn: "Wholesale Trade" },
  { code: "G", slug: "retail-trade",                         labelEn: "Retail Trade" },
  { code: "H", slug: "accommodation-food-services",          labelEn: "Accommodation and Food Services" },
  { code: "I", slug: "transport-postal-warehousing",         labelEn: "Transport, Postal and Warehousing" },
  { code: "J", slug: "information-media-telecommunications", labelEn: "Information Media and Telecommunications" },
  { code: "K", slug: "financial-insurance-services",         labelEn: "Financial and Insurance Services" },
  { code: "L", slug: "rental-hiring-real-estate",            labelEn: "Rental, Hiring and Real Estate Services" },
  { code: "M", slug: "professional-scientific-technical",    labelEn: "Professional, Scientific and Technical Services" },
  { code: "N", slug: "administrative-support-services",      labelEn: "Administrative and Support Services" },
  { code: "O", slug: "public-administration-safety",         labelEn: "Public Administration and Safety" },
  { code: "P", slug: "education-training",                   labelEn: "Education and Training" },
  { code: "Q", slug: "health-care-social-assistance",        labelEn: "Health Care and Social Assistance" },
  { code: "R", slug: "arts-recreation-services",             labelEn: "Arts and Recreation Services" },
  { code: "S", slug: "other-services",                       labelEn: "Other Services" },
  { code: "T", slug: "others",                               labelEn: "Others" },
] as const;

// ---- UI helpers ------------------------------------------------------------

export type Option = { value: string; label: string };

/** Options using code (A–S) as the `value`. Recommended for storage. */
export const industryOptions: Readonly<Option[]> = INDUSTRIES.map((i) => ({
  value: i.code,
  label: i.labelEn,
}));

/** Options using slug as the `value`. Handy for routing like /industries/:slug */
export const industryOptionsBySlug: Readonly<Option[]> = INDUSTRIES.map((i) => ({
  value: i.slug,
  label: i.labelEn,
}));

// ---- Lookups ---------------------------------------------------------------

export function findIndustryByCode(code: string): JsaIndustry | undefined {
  return INDUSTRIES.find((i) => i.code === code);
}

export function findIndustryBySlug(slug: string): JsaIndustry | undefined {
  return INDUSTRIES.find((i) => i.slug === slug);
}

export function codeFromSlug(slug: string): string | undefined {
  return findIndustryBySlug(slug)?.code;
}

export function slugFromCode(code: string): string | undefined {
  return findIndustryByCode(code)?.slug;
}
// Return industry full name (labelEn) for either code (A–T) or slug.
export function industryNameOf(input: string | undefined | null): string | undefined {
  if (!input) return undefined;
  const byCode = findIndustryByCode(input);
  if (byCode) return byCode.labelEn;
  const bySlug = findIndustryBySlug(input);
  if (bySlug) return bySlug.labelEn;
  // If input is already a full name, allow it to pass through.
  const byName = INDUSTRIES.find((i) => i.labelEn === input);
  return byName?.labelEn;
}
