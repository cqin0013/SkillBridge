// Parallel fetch of abilities for up to 5 codes. Returns a stable data ref.
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { getAnzscoSkills } from "../../lib/api/ability/getAnzscoSkill";
import { mapSkillsToAbilities } from "../../lib/utils/mapper";
import type { AbilityLite } from "../../types/domain";

export function useAbilitiesByCodes(codes: string[] | undefined) {
  const list = useMemo(
    () => (codes ?? []).map((c) => c.trim()).filter(Boolean).slice(0, 5),
    [codes],
  );

  const results = useQueries({
    queries: list.map((code) => ({
      queryKey: ["anzsco", "skills", code],
      staleTime: 0,
      gcTime: 60 * 60 * 1000,
      refetchOnMount: "always" as const,
      refetchOnWindowFocus: false,
      retry: 1,
      queryFn: () => getAnzscoSkills(code),
      select: mapSkillsToAbilities, // -> AbilityLite[]
    })),
  });

  const loading = results.some((r) => r.isLoading);
  const error = results.find((r) => r.isError)?.error ?? null;

  // Only recompute when underlying query data actually updates
  const updateStamp = results.map((r) => String(r.dataUpdatedAt ?? 0)).join(",");
  const data = useMemo<AbilityLite[] | null>(() => {
    if (!results.every((r) => r.data)) return null;
    return results.flatMap((r) => r.data as AbilityLite[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateStamp]);

  return { loading, error, data };
}
