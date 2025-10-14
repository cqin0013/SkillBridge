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

/** Normalized course shape used by Redux and UI */
export interface TrainingCourse {
  /** Public course code (e.g., TGA code) */
  id: string;
  /** Human-friendly course name */
  name: string;
  /** Optional details page URL */
  url?: string;
}