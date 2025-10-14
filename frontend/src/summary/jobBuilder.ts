// Summary builder: show the selected target job as a single chip (pill).

import type { SummaryBuilder, SummaryItem, SummaryRoot } from "./types";
import { registerSummaryBuilder } from "./registry";
import type { SelectedJob } from "../store/analyzerSlice";

// Extend root so we can read analyzer.selectedJob safely.
type RootWithJob = SummaryRoot & {
  analyzer?: { selectedJob?: SelectedJob };
};

// Builder returns one pill when a job exists, otherwise empty.
const jobBuilder: SummaryBuilder<RootWithJob> = (
  state: RootWithJob
): SummaryItem[] => {
  const sj = state.analyzer?.selectedJob ?? null;
  if (!sj) return [];
  return [
    {
      id: `job:${sj.code}`,
      label: sj.title,
      pill: true,
    },
  ];
};

// Register once at app bootstrap (priority 30 is between core(20) and abilities(40))
export function registerJobSummaryBuilder(): void {
  registerSummaryBuilder("job", jobBuilder, 30);
}
