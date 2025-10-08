// src/lib/api/jobs/getTrainingAdvice.ts
import { getJSON } from "../apiClient";
import type { TrainingAdviceRes } from "../../../types/training";

/** GET /api/anzsco/{code}/training-advice */
export function getTrainingAdvice(anzscoCode: string) {
  const code = anzscoCode.trim();
  if (!code) throw new Error("anzsco code is required");
  return getJSON<TrainingAdviceRes>(`/api/anzsco/${encodeURIComponent(code)}/training-advice`);
}
