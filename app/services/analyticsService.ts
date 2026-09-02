import { eq, and, gte, lte, isNotNull, sql } from "drizzle-orm";
import { db } from "~/db";
import { courses, enrollments, purchases, CourseStatus } from "~/db/schema";

// ─── Analytics Service ───
// Aggregates revenue, enrollment, and completion metrics for the instructor
// analytics hub. Prices are in integer cents; dates are ISO strings.

export interface CourseAnalytics {
  revenue: number; // cents
  enrollments: number; // raw enrollment row count (no dedup)
  completedStudents: number; // enrollments with completedAt set
  avgCompletionRate: number; // 0-100, rounded int
}

export interface CourseDetail {
  id: number;
  title: string;
  slug: string;
  status: CourseStatus;
  revenue: number; // cents
  enrollments: number;
  completedStudents: number;
  avgCompletionRate: number;
}

export interface InstructorAnalyticsSummary {
  totalRevenue: number; // cents
  totalStudents: number; // raw sum of enrollments across courses (no dedup)
  avgCompletionRate: number; // 0-100, rounded int
  publishedCourses: number; // count where status === CourseStatus.Published
  courseDetails: CourseDetail[]; // ordered by course id ASC (insertion order, matches current UI)
}

/**
 * Computes the analytics metrics for a single course, optionally restricted
 * to an inclusive ISO date window:
 * - `revenue` sums purchases whose `createdAt` is inside the window.
 * - `enrollments` / `completedStudents` count enrollment rows whose
 *   `enrolledAt` is inside the window. Completion status is read from the
 *   enrollment row regardless of when it happened — the window gates
 *   enrollment, not completion (a student who enrolled inside the window but
 *   completed outside it still counts toward `completedStudents`).
 *
 * Window bounds are compared as ISO text (lexicographic), inclusive on both
 * ends (`>=` start, `<=` end).
 */
function computeCourseAnalytics(
  courseId: number,
  startDate?: string,
  endDate?: string
): CourseAnalytics {
  const revenueRow = db
    .select({ total: sql<number>`coalesce(sum(${purchases.pricePaid}), 0)` })
    .from(purchases)
    .where(
      and(
        eq(purchases.courseId, courseId),
        startDate ? gte(purchases.createdAt, startDate) : undefined,
        endDate ? lte(purchases.createdAt, endDate) : undefined
      )
    )
    .get();

  const revenue = revenueRow?.total ?? 0;

  const enrollmentFilter = and(
    eq(enrollments.courseId, courseId),
    startDate ? gte(enrollments.enrolledAt, startDate) : undefined,
    endDate ? lte(enrollments.enrolledAt, endDate) : undefined
  );

  const enrollmentRow = db
    .select({ count: sql<number>`count(*)` })
    .from(enrollments)
    .where(enrollmentFilter)
    .get();

  const completedRow = db
    .select({ count: sql<number>`count(*)` })
    .from(enrollments)
    .where(and(enrollmentFilter, isNotNull(enrollments.completedAt)))
    .get();

  const totalEnrollments = enrollmentRow?.count ?? 0;
  const completedStudents = completedRow?.count ?? 0;

  return {
    revenue,
    enrollments: totalEnrollments,
    completedStudents,
    avgCompletionRate:
      totalEnrollments === 0
        ? 0
        : Math.round((completedStudents / totalEnrollments) * 100),
  };
}

/**
 * Aggregates revenue, enrollment, and completion metrics for a single course.
 *
 * Optional ISO date window, inclusive on both ends: `startDate`/`endDate`
 * filter `purchases.createdAt` for revenue and `enrollments.enrolledAt` for
 * enrollment counts. The window gates enrollment, not completion — a student
 * who enrolled inside the window but completed outside it still counts toward
 * `completedStudents`.
 */
export function getCourseAnalytics(
  courseId: number,
  startDate?: string,
  endDate?: string
): CourseAnalytics {
  return computeCourseAnalytics(courseId, startDate, endDate);
}

/**
 * Aggregates the instructor's full analytics hub summary: totals across all
 * their courses plus a per-course breakdown, ordered by course id ASC
 * (insertion order, matching the previous course grid UI).
 *
 * `avgCompletionRate` averages the (already rounded) per-course rates over
 * courses with at least one enrollment; courses with no enrollments are
 * excluded from the average.
 */
export function getInstructorAnalyticsSummary(
  instructorId: number
): InstructorAnalyticsSummary {
  const instructorCourses = db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      status: courses.status,
    })
    .from(courses)
    .where(eq(courses.instructorId, instructorId))
    .orderBy(courses.id)
    .all();

  const courseDetails: CourseDetail[] = instructorCourses.map((course) => ({
    id: course.id,
    title: course.title,
    slug: course.slug,
    status: course.status,
    ...computeCourseAnalytics(course.id),
  }));

  const totalRevenue = courseDetails.reduce((sum, c) => sum + c.revenue, 0);
  const totalStudents = courseDetails.reduce((sum, c) => sum + c.enrollments, 0);

  const enrolledCourseRates = courseDetails
    .filter((c) => c.enrollments > 0)
    .map((c) => c.avgCompletionRate);
  const avgCompletionRate =
    enrolledCourseRates.length === 0
      ? 0
      : Math.round(
          enrolledCourseRates.reduce((sum, rate) => sum + rate, 0) /
            enrolledCourseRates.length
        );

  const publishedCourses = courseDetails.filter(
    (c) => c.status === CourseStatus.Published
  ).length;

  return {
    totalRevenue,
    totalStudents,
    avgCompletionRate,
    publishedCourses,
    courseDetails,
  };
}
