import { eq, and, gte, lte, isNotNull, inArray, sql } from "drizzle-orm";
import { db } from "~/db";
import {
  courses,
  enrollments,
  purchases,
  courseRatings,
  modules,
  lessons,
  lessonProgress,
  CourseStatus,
  LessonProgressStatus,
} from "~/db/schema";

// ─── Analytics Service ───
// Aggregates revenue, enrollment, and completion metrics for the instructor
// analytics hub. Prices are in integer cents; dates are ISO strings.

export interface CourseAnalytics {
  revenue: number; // cents
  enrollments: number; // raw enrollment row count (no dedup)
  completedStudents: number; // enrollments with completedAt set
  avgCompletionRate: number; // 0-100, rounded int
  rating: number | null; // all-time avg, 1 decimal, null when no ratings
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
  rating: number | null; // all-time avg, 1 decimal, null when no ratings
}

export interface InstructorAnalyticsSummary {
  totalRevenue: number; // cents
  totalStudents: number; // raw sum of enrollments across courses (no dedup)
  avgCompletionRate: number; // 0-100, rounded int
  publishedCourses: number; // count where status === CourseStatus.Published
  courseDetails: CourseDetail[]; // ordered by course id ASC (insertion order, matches current UI)
}

export interface EnrollmentTimelinePoint {
  date: string; // bucket start, UTC date "YYYY-MM-DD"
  enrollments: number;
  revenue: number; // cents
}

export interface LessonDropOffPoint {
  lessonId: number;
  title: string;
  startedCount: number; // students with an in_progress or completed record for this lesson
  rate: number; // 0-100, startedCount as a % of the course's widest lesson, Math.round
}

export interface LessonCompletionRate {
  lessonId: number;
  title: string;
  startedCount: number; // students with an in_progress or completed record (distinct users)
  completedCount: number; // students with a completed record (distinct users)
  rate: number; // 0-100, completedCount / startedCount, Math.round; 0 when startedCount is 0
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
 * - `rating` is the all-time average rating (1 decimal, null when the course
 *   has no ratings). It is intentionally NOT gated by the window: a course's
 *   rating is a standing reputation metric, not a per-period one.
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

  // All-time by design — the date window is deliberately not applied to
  // ratings (same rounding convention as ratingService.getAverageRating).
  const ratingRow = db
    .select({
      average: sql<number | null>`avg(${courseRatings.rating})`,
      count: sql<number>`count(*)`,
    })
    .from(courseRatings)
    .where(eq(courseRatings.courseId, courseId))
    .get();

  const rating =
    ratingRow && ratingRow.count > 0 && ratingRow.average !== null
      ? Math.round(ratingRow.average * 10) / 10
      : null;

  return {
    revenue,
    enrollments: totalEnrollments,
    completedStudents,
    avgCompletionRate:
      totalEnrollments === 0
        ? 0
        : Math.round((completedStudents / totalEnrollments) * 100),
    rating,
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
 *
 * `rating` is all-time and intentionally window-independent: it is the
 * course's standing average rating (1 decimal, null when unrated).
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
 *
 * Each entry in `courseDetails` includes `rating`, the course's all-time
 * average rating (1 decimal, null when unrated) — intentionally independent
 * of any date window, since this summary is an all-time hub view.
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

const MS_PER_DAY = 86400000;

// Date-only bounds ("YYYY-MM-DD") become full instants so the end day is
// truly inclusive — a raw `lte` on a date-only string would cut off at
// midnight instead of covering the whole day. Full ISO bounds pass through.
function startInstantOf(startDate?: string): string | undefined {
  if (!startDate) return undefined;
  return startDate.length === 10 ? `${startDate}T00:00:00.000Z` : startDate;
}

function endInstantOf(endDate?: string): string | undefined {
  if (!endDate) return undefined;
  return endDate.length === 10 ? `${endDate}T23:59:59.999Z` : endDate;
}

/**
 * Builds a contiguous enrollment/revenue timeline for a single course, one
 * point per bucket, zero-filled:
 *
 * - Optional inclusive date window; date-only bounds are normalized to full
 *   instants before filtering (start → midnight, end → end of day).
 * - Window defaults to the first record through today (UTC).
 * - Granularity: daily buckets when the span is at most 62 days, otherwise
 *   one bucket per calendar month (bucket date = first of month).
 */
export function getEnrollmentTimeline(
  courseId: number,
  startDate?: string,
  endDate?: string
): EnrollmentTimelinePoint[] {
  const startInstant = startInstantOf(startDate);
  const endInstant = endInstantOf(endDate);

  const enrollmentRows = db
    .select({ date: enrollments.enrolledAt })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.courseId, courseId),
        startInstant ? gte(enrollments.enrolledAt, startInstant) : undefined,
        endInstant ? lte(enrollments.enrolledAt, endInstant) : undefined
      )
    )
    .all();

  const purchaseRows = db
    .select({ date: purchases.createdAt, revenue: purchases.pricePaid })
    .from(purchases)
    .where(
      and(
        eq(purchases.courseId, courseId),
        startInstant ? gte(purchases.createdAt, startInstant) : undefined,
        endInstant ? lte(purchases.createdAt, endInstant) : undefined
      )
    )
    .all();

  if (enrollmentRows.length === 0 && purchaseRows.length === 0) {
    return [];
  }

  const recordDates = [...enrollmentRows, ...purchaseRows].map((row) => row.date);
  const start = startDate
    ? startDate.slice(0, 10)
    : recordDates.reduce((min, date) => (date < min ? date : min)).slice(0, 10);
  const end = endDate ? endDate.slice(0, 10) : new Date().toISOString().slice(0, 10);

  if (start > end) {
    return [];
  }

  const spanDays = (Date.parse(end) - Date.parse(start)) / MS_PER_DAY;
  const monthly = spanDays > 62;

  const buckets = new Map<string, { enrollments: number; revenue: number }>();

  if (monthly) {
    let year = Number(start.slice(0, 4));
    let month = Number(start.slice(5, 7));
    const endYear = Number(end.slice(0, 4));
    const endMonth = Number(end.slice(5, 7));
    while (year < endYear || (year === endYear && month <= endMonth)) {
      buckets.set(`${year}-${String(month).padStart(2, "0")}-01`, {
        enrollments: 0,
        revenue: 0,
      });
      month += 1;
      if (month === 13) {
        month = 1;
        year += 1;
      }
    }
  } else {
    for (let ms = Date.parse(start); ms <= Date.parse(end); ms += MS_PER_DAY) {
      buckets.set(new Date(ms).toISOString().slice(0, 10), {
        enrollments: 0,
        revenue: 0,
      });
    }
  }

  const bucketDate = (isoDate: string) =>
    monthly ? isoDate.slice(0, 7) + "-01" : isoDate.slice(0, 10);

  for (const row of enrollmentRows) {
    const bucket = buckets.get(bucketDate(row.date));
    if (bucket) bucket.enrollments += 1;
  }
  for (const row of purchaseRows) {
    const bucket = buckets.get(bucketDate(row.date));
    if (bucket) bucket.revenue += row.revenue;
  }

  return [...buckets.entries()].map(([date, totals]) => ({
    date,
    enrollments: totals.enrollments,
    revenue: totals.revenue,
  }));
}

/**
 * Builds the lesson drop-off funnel for a single course: one entry per
 * lesson, in course order (modules by `position` ASC, then lessons by
 * `position` ASC within each module).
 *
 * A student "starts" a lesson when they have a `lesson_progress` row with
 * status `in_progress` or `completed`; `not_started` rows and students with
 * no row do not count. `startedCount` counts distinct students, so duplicate
 * rows for one user cannot inflate it.
 *
 * `rate` expresses each lesson's `startedCount` as a percentage of the
 * course's widest lesson (the max startedCount across the course), rounded
 * with `Math.round`. When no student has started anything, every `rate` is
 * 0. Returns `[]` for a course with no modules or no lessons.
 */
export function getLessonDropOffRates(courseId: number): LessonDropOffPoint[] {
  const courseModules = db
    .select({ id: modules.id })
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .orderBy(modules.position)
    .all();

  if (courseModules.length === 0) return [];

  const courseLessons = db
    .select({
      id: lessons.id,
      title: lessons.title,
      moduleId: lessons.moduleId,
      position: lessons.position,
    })
    .from(lessons)
    .where(inArray(lessons.moduleId, courseModules.map((m) => m.id)))
    .all();

  if (courseLessons.length === 0) return [];

  // Modules are already sorted by position, so a module's index in that list
  // is its rank — lessons sort by (module rank, lesson position), which is
  // the order a student walks the course.
  const moduleRank = new Map(courseModules.map((m, index) => [m.id, index]));
  const orderedLessons = [...courseLessons].sort(
    (a, b) =>
      moduleRank.get(a.moduleId)! - moduleRank.get(b.moduleId)! ||
      a.position - b.position
  );

  const startedRows = db
    .select({
      lessonId: lessonProgress.lessonId,
      startedCount: sql<number>`count(distinct ${lessonProgress.userId})`,
    })
    .from(lessonProgress)
    .where(
      and(
        inArray(
          lessonProgress.lessonId,
          courseLessons.map((l) => l.id)
        ),
        inArray(lessonProgress.status, [
          LessonProgressStatus.InProgress,
          LessonProgressStatus.Completed,
        ])
      )
    )
    .groupBy(lessonProgress.lessonId)
    .all();

  const startedByLesson = new Map(
    startedRows.map((row) => [row.lessonId, row.startedCount])
  );

  const maxStartedCount = Math.max(
    0,
    ...orderedLessons.map((lesson) => startedByLesson.get(lesson.id) ?? 0)
  );

  return orderedLessons.map((lesson) => {
    const startedCount = startedByLesson.get(lesson.id) ?? 0;
    return {
      lessonId: lesson.id,
      title: lesson.title,
      startedCount,
      rate:
        maxStartedCount === 0
          ? 0
          : Math.round((startedCount / maxStartedCount) * 100),
    };
  });
}

/**
 * Builds the per-lesson completion breakdown for a single course: one entry
 * per lesson, sorted by `rate` ASCENDING (worst-performing lesson first).
 * Equal rates are broken in course order — modules by `position` ASC, then
 * lessons by `position` ASC within each module.
 *
 * A student "starts" a lesson when they have a `lesson_progress` row with
 * status `in_progress` or `completed`; `not_started` rows and students with
 * no row do not count. `startedCount` and `completedCount` each count
 * distinct students, so duplicate rows for one user cannot inflate them
 * (`completedCount` counts only `completed` rows).
 *
 * `rate` is `completedCount` as a percentage of `startedCount`, rounded with
 * `Math.round`. When nobody has started a lesson, its `rate` is 0 — never
 * NaN. Returns `[]` for a course with no modules or no lessons.
 */
export function getLessonCompletionRates(
  courseId: number
): LessonCompletionRate[] {
  const courseModules = db
    .select({ id: modules.id })
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .orderBy(modules.position)
    .all();

  if (courseModules.length === 0) return [];

  const courseLessons = db
    .select({
      id: lessons.id,
      title: lessons.title,
      moduleId: lessons.moduleId,
      position: lessons.position,
    })
    .from(lessons)
    .where(
      inArray(
        lessons.moduleId,
        courseModules.map((m) => m.id)
      )
    )
    .all();

  if (courseLessons.length === 0) return [];

  // Modules are already sorted by position, so a module's index in that list
  // is its rank — lessons sort by (module rank, lesson position), which is
  // the order a student walks the course.
  const moduleRank = new Map(courseModules.map((m, index) => [m.id, index]));
  const orderedLessons = [...courseLessons].sort(
    (a, b) =>
      moduleRank.get(a.moduleId)! - moduleRank.get(b.moduleId)! ||
      a.position - b.position
  );

  const courseOrder = new Map(
    orderedLessons.map((lesson, index) => [lesson.id, index])
  );

  const startedRows = db
    .select({
      lessonId: lessonProgress.lessonId,
      startedCount: sql<number>`count(distinct ${lessonProgress.userId})`,
    })
    .from(lessonProgress)
    .where(
      and(
        inArray(
          lessonProgress.lessonId,
          courseLessons.map((l) => l.id)
        ),
        inArray(lessonProgress.status, [
          LessonProgressStatus.InProgress,
          LessonProgressStatus.Completed,
        ])
      )
    )
    .groupBy(lessonProgress.lessonId)
    .all();

  const startedByLesson = new Map(
    startedRows.map((row) => [row.lessonId, row.startedCount])
  );

  const completedRows = db
    .select({
      lessonId: lessonProgress.lessonId,
      completedCount: sql<number>`count(distinct ${lessonProgress.userId})`,
    })
    .from(lessonProgress)
    .where(
      and(
        inArray(
          lessonProgress.lessonId,
          courseLessons.map((l) => l.id)
        ),
        eq(lessonProgress.status, LessonProgressStatus.Completed)
      )
    )
    .groupBy(lessonProgress.lessonId)
    .all();

  const completedByLesson = new Map(
    completedRows.map((row) => [row.lessonId, row.completedCount])
  );

  const rates = orderedLessons.map((lesson) => {
    const startedCount = startedByLesson.get(lesson.id) ?? 0;
    const completedCount = completedByLesson.get(lesson.id) ?? 0;
    return {
      lessonId: lesson.id,
      title: lesson.title,
      startedCount,
      completedCount,
      rate:
        startedCount === 0
          ? 0
          : Math.round((completedCount / startedCount) * 100),
    };
  });

  // Worst-performing lesson first; equal rates keep course order.
  return rates.sort(
    (a, b) =>
      a.rate - b.rate ||
      courseOrder.get(a.lessonId)! - courseOrder.get(b.lessonId)!
  );
}
