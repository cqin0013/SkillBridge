// src/hooks/queries/useTrainingAdvice.ts
import { useQuery } from "@tanstack/react-query";
import { getTrainingAdvice } from "../../lib/api/occupation/getTrainingAdviceByCode";
import type { TrainingAdviceRes } from "../../types/training";

export function useTrainingAdvice(anzscoCode: string) {
  return useQuery<TrainingAdviceRes>({
    queryKey: ["training-advice", anzscoCode],
    queryFn: () => getTrainingAdvice(anzscoCode),
    enabled: Boolean(anzscoCode),
    staleTime: 5 * 60 * 1000,
  });
}
