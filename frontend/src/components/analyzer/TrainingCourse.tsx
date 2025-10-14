
/** One training course item */
export type TrainingCourse = {
  /** Course ID, e.g. ICT40120 */
  id: string;
  /** Course display name */
  name: string;
};

/** Props for TrainingCourses component */
interface TrainingCoursesProps {
  /** Occupation title shown at the top */
  occupation: string;
  /** Optional list of courses */
  courses?: TrainingCourse[];
  /** Optional extra className for outer <section> */
  className?: string;
}

/** Build the official TGA course URL from an ID */
function buildCourseUrl(courseId: string): string {
  const trimmed = courseId.trim();
  return `https://training.gov.au/training/details/${encodeURIComponent(trimmed)}`;
}

/**
 * TrainingCourses
 * - Renders an occupation title and a table of courses.
 * - Each row shows Course Name | Course ID | Link (opens in new tab).
 * - If no courses are provided, shows an English fallback message.
 */
const TrainingCourses: React.FC<TrainingCoursesProps> = ({ occupation, courses, className }) => {
  // Sanitize and keep valid items only
  const list: TrainingCourse[] = Array.isArray(courses)
    ? courses.filter(
        (c) => Boolean(c) && c.id.trim().length > 0 && c.name.trim().length > 0
      )
    : [];

  const hasCourses = list.length > 0;

  return (
    <section className={className}>
      <h2 className="mb-3 text-xl font-semibold text-ink">{occupation}</h2>

      {!hasCourses ? (
        <div className="rounded-md border bg-white p-4 text-gray-700">
          No courses are currently offered for this occupation.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 font-medium">Course name</th>
                <th className="px-4 py-2 font-medium">Course ID</th>
                <th className="px-4 py-2 font-medium">Link</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2">{c.id}</td>
                  <td className="px-4 py-2">
                    <a
                      href={buildCourseUrl(c.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-primary"
                    >
                      {buildCourseUrl(c.id)}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default TrainingCourses;
