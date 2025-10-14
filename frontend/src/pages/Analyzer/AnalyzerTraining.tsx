import React, { useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import AnalyzerLayout from "../../layouts/AnalyzerLayout";
import TrainingCourses, { type TrainingCourse } from "../../components/analyzer/TrainingCourse";
import Button from "../../components/ui/Button";
import GlobalError from "../../components/common/GlobalError";
import { useTrainingAdvice } from "../../hooks/queries/useTrainingAdvice";
import type { RootState } from "../../store";
import { useAppDispatch } from "../../store/hooks";
import { setTrainingAdvice } from "../../store/analyzerSlice";
import type { AnalyzerRouteState } from "../../types/routes";

/** Narrow object guard */
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/** Normalize API payload → TrainingCourse[] (safe on unknown) */
function toCourses(payload: unknown): TrainingCourse[] {
  const arr: unknown[] =
    isRecord(payload) && Array.isArray((payload as Record<string, unknown>).vet_courses)
      ? ((payload as Record<string, unknown>).vet_courses as unknown[])
      : [];

  const idFields = ["vet_course_code", "qualification_code", "course_id", "code", "id"] as const;
  const nameFields = ["course_name", "qualification_name", "name", "title"] as const;

  const seen = new Set<string>();
  const out: TrainingCourse[] = [];

  for (const it of arr) {
    if (!isRecord(it)) continue;

    const id =
      (idFields.map((k) => it[k]).find((v) => typeof v === "string" && v.trim()) as string | undefined)?.trim() ?? "";
    const name =
      (nameFields.map((k) => it[k]).find((v) => typeof v === "string" && v.trim()) as string | undefined)?.trim() ?? "";

    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name });
  }

  return out;
}

export default function AnalyzerTraining(): React.ReactElement {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const store = useSelector((s: RootState) => s.analyzer);
  const selectedJob = store.selectedJob; // { code, title } | null

  const anzscoCode = selectedJob?.code ?? "";
  const { data, isFetching, isError } = useTrainingAdvice(anzscoCode);

  const courses = useMemo<TrainingCourse[]>(() => toCourses(data), [data]);

  /** Persist advice into Redux after load succeeds (store empty list too) */
  useEffect(() => {
    if (!selectedJob) return;
    if (isFetching || isError) return;
    dispatch(
      setTrainingAdvice({
        occupation: { code: selectedJob.code, title: selectedJob.title },
        courses,
      })
    );
  }, [dispatch, selectedJob, isFetching, isError, courses]);

  /** Finish → push to Profile with route-state fallback */
  const handleFinish = (): void => {
    if (!selectedJob) return;

    const state: AnalyzerRouteState & { notice: string } = {
      roles: store.chosenRoles,
      abilities: store.chosenAbilities,
      industries: store.interestedIndustryCodes ?? [],
      region: store.preferredRegion ?? "",
      selectedJob,
      unmatched: store.selectedJobUnmatched ?? null,
      training: {
        occupation: { code: selectedJob.code, title: selectedJob.title },
        courses,
      },
      notice:
        "Analysis results have been saved to your profile. You can view and edit your profile.",
    };

    navigate("/profile", { state, replace: true });
  };

  return (
    <AnalyzerLayout
      title="Training advice"
      helpContent={{
        title: "How to use this page",
        subtitle: "We list training courses related to your selected occupation.",
        features: [
          "Each row shows Course name, Course ID, and an official link.",
          "If the list is empty, no course is currently offered for this occupation.",
        ],
        tips: ["Open links in a new tab and verify details on the official site."],
      }}
    >
      {!selectedJob && (
        <GlobalError
          feedbackHref="/feedback"
          message="There is an issue with the system. Please try again later, or send us feedback."
        />
      )}

      {selectedJob && isFetching && (
        <div className="mt-4 text-sm text-ink-soft" aria-live="polite">
          Loading training courses…
        </div>
      )}

      {selectedJob && isError && (
        <GlobalError
          feedbackHref="/feedback"
          message="Failed to load training courses. Please try again later, or send us feedback."
        />
      )}

      {selectedJob && !isFetching && !isError && (
        <div className="mt-4">
          <TrainingCourses occupation={selectedJob.title} courses={courses} />
        </div>
      )}

      <footer className="mt-10 flex items-center justify-end">
        <Button variant="primary" size="md" onClick={handleFinish}>
          Finish
        </Button>
      </footer>
    </AnalyzerLayout>
  );
}
