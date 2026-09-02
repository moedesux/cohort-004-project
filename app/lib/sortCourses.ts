import type { CourseDetail } from "~/services/analyticsService";

// ─── Course Sorting ───
// Pure sorting for the instructor hub course table. Uses a type-only import
// of `CourseDetail` so the module (and its tests) stay free of the database.

export type CourseSortKey =
  | "revenue"
  | "enrollments"
  | "avgCompletionRate"
  | "rating";
export type SortDirection = "asc" | "desc";
export type SortState = { key: CourseSortKey; direction: SortDirection } | null;

/**
 * Returns a new array of course details sorted by `key` in `direction`.
 *
 * - `rating` is `number | null`: unrated courses (null) sort last in BOTH
 *   directions, and their relative order is preserved.
 * - Ties on any key keep their original relative order (stable).
 * - The input array is never mutated.
 */
export function sortCourseDetails(
  details: CourseDetail[],
  key: CourseSortKey,
  direction: SortDirection
): CourseDetail[] {
  const factor = direction === "asc" ? 1 : -1;
  return details
    .map((course, index) => ({ course, index }))
    .sort((a, b) => {
      const av = a.course[key];
      const bv = b.course[key];
      if (av === null && bv === null) return a.index - b.index;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (av !== bv) return (av - bv) * factor;
      return a.index - b.index;
    })
    .map((entry) => entry.course);
}
