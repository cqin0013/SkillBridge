
// Core builder that emits Region (value row) + Industries/Roles (summary value row + chips)

import type {
  SummaryBuilder,
  SummaryItem,
  SummaryRoot,
  RoleLite,
} from "./types";
import { registerSummaryBuilder } from "./registry";
import { INDUSTRIES } from "../data/industries";
import {
  stateLabelFromValue,
  type AustralianStateValue,
} from "../data/au-state";

/** Map ANZSIC code -> readable label (dataset uses `labelEn`). */
function industryLabelByCode(code: string): string {
  const hit = INDUSTRIES.find((i) => i.code === code);
  return hit?.labelEn ?? code;
}

const coreBuilder: SummaryBuilder<SummaryRoot> = (state, drafts) => {
  const s = state.analyzer;

  // ---------- Normalize inputs ----------
  // Region
  const regionSrc =
    drafts?.region ?? (s?.preferredRegion as string | null | undefined);
  const region: string | undefined = regionSrc == null ? undefined : regionSrc;

  // Industry codes
  const industryCodes: string[] =
    drafts?.industryCodes ??
    ((s?.interestedIndustryCodes as string[] | null | undefined) ?? []);

  // Roles
  const roles: RoleLite[] =
    drafts?.roles ?? ((s?.chosenRoles as RoleLite[] | null | undefined) ?? []);

  // ---------- Build items ----------
  const items: SummaryItem[] = [];

  // Region as a non-pill value row so compact mode shows the readable value
  if (region) {
    const pretty = stateLabelFromValue(region as AustralianStateValue) ?? region;
    items.push({
      id: `region:${region}`,
      label: "Region",
      value: pretty,
      pill: false,
    });
  }

  // Industries
  if (industryCodes.length > 0) {
    const labels = industryCodes.map(industryLabelByCode);

    // Summary value row (non-pill) used by compact mode
    items.push({
      id: "industry:__summary",
      label: "Industries",
      value: labels.join(" • "),
      pill: false,
    });

    // Individual chips for full mode readability
    for (const code of industryCodes) {
      items.push({
        id: `industry:${code}`,
        label: industryLabelByCode(code),
        pill: true, // chips in full mode
      });
    }
  }

  // Roles
  if (roles.length > 0) {
    const titles = roles.map((r) => r.title);

    // Summary value row (non-pill) used by compact mode
    items.push({
      id: "role:__summary",
      label: "Roles",
      value: titles.join(" • "),
      pill: false,
    });

    // Individual chips for full mode readability
    for (const r of roles) {
      items.push({
        id: `role:${r.id}`,
        label: r.title,
        pill: true, // chips in full mode
      });
    }
  }

  return items;
};

/** Call once at app bootstrap */
export function registerDefaultSummaryBuilders() {
  registerSummaryBuilder("core", coreBuilder, 20);
}
