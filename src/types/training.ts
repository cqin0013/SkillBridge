// src/types/training.ts
export interface TrainingAnzscoInfo {
  code: string;
  title: string;
}

export interface VetCourse {
  vet_course_code: string;
  course_name: string;
}

export interface TrainingAdviceRes {
  anzsco: TrainingAnzscoInfo;
  total: number;
  vet_courses: VetCourse[];
}
