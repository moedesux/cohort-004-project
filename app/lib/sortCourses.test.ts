import { describe, it, expect } from "vitest";
import type { CourseDetail } from "~/services/analyticsService";
import { CourseStatus } from "~/db/schema";
import { sortCourseDetails } from "./sortCourses";

// Pure unit tests for the instructor hub course-table sort logic. No
// database access: `CourseDetail` is a type-only import, and
// `CourseStatus` (a TS string enum) comes from the schema module, which
// only holds drizzle table definitions and no database instance.

function makeCourse(overrides: Partial<CourseDetail> = {}): CourseDetail {
  return {
    id: 1,
    title: "Course",
    slug: "course",
    status: CourseStatus.Published,
    revenue: 0,
    enrollments: 0,
    completedStudents: 0,
    avgCompletionRate: 0,
    rating: null,
    ...overrides,
  };
}

function ids(courses: CourseDetail[]): number[] {
  return courses.map((course) => course.id);
}

describe("sortCourseDetails", () => {
  it("sorts by revenue ascending", () => {
    const courses = [
      makeCourse({ id: 1, revenue: 30000 }),
      makeCourse({ id: 2, revenue: 10000 }),
      makeCourse({ id: 3, revenue: 20000 }),
    ];
    expect(ids(sortCourseDetails(courses, "revenue", "asc"))).toEqual([
      2, 3, 1,
    ]);
  });

  it("sorts by revenue descending", () => {
    const courses = [
      makeCourse({ id: 1, revenue: 30000 }),
      makeCourse({ id: 2, revenue: 10000 }),
      makeCourse({ id: 3, revenue: 20000 }),
    ];
    expect(ids(sortCourseDetails(courses, "revenue", "desc"))).toEqual([
      1, 3, 2,
    ]);
  });

  it("sorts by enrollments ascending", () => {
    const courses = [
      makeCourse({ id: 1, enrollments: 30 }),
      makeCourse({ id: 2, enrollments: 5 }),
      makeCourse({ id: 3, enrollments: 12 }),
    ];
    expect(ids(sortCourseDetails(courses, "enrollments", "asc"))).toEqual([
      2, 3, 1,
    ]);
  });

  it("sorts by enrollments descending", () => {
    const courses = [
      makeCourse({ id: 1, enrollments: 30 }),
      makeCourse({ id: 2, enrollments: 5 }),
      makeCourse({ id: 3, enrollments: 12 }),
    ];
    expect(ids(sortCourseDetails(courses, "enrollments", "desc"))).toEqual([
      1, 3, 2,
    ]);
  });

  it("sorts by avgCompletionRate ascending", () => {
    const courses = [
      makeCourse({ id: 1, avgCompletionRate: 90 }),
      makeCourse({ id: 2, avgCompletionRate: 10 }),
      makeCourse({ id: 3, avgCompletionRate: 55 }),
    ];
    expect(ids(sortCourseDetails(courses, "avgCompletionRate", "asc"))).toEqual(
      [2, 3, 1]
    );
  });

  it("sorts by avgCompletionRate descending", () => {
    const courses = [
      makeCourse({ id: 1, avgCompletionRate: 90 }),
      makeCourse({ id: 2, avgCompletionRate: 10 }),
      makeCourse({ id: 3, avgCompletionRate: 55 }),
    ];
    expect(
      ids(sortCourseDetails(courses, "avgCompletionRate", "desc"))
    ).toEqual([1, 3, 2]);
  });

  it("sorts by rating ascending", () => {
    const courses = [
      makeCourse({ id: 1, rating: 4.5 }),
      makeCourse({ id: 2, rating: 3.2 }),
      makeCourse({ id: 3, rating: 4.9 }),
    ];
    expect(ids(sortCourseDetails(courses, "rating", "asc"))).toEqual([2, 1, 3]);
  });

  it("sorts by rating descending", () => {
    const courses = [
      makeCourse({ id: 1, rating: 4.5 }),
      makeCourse({ id: 2, rating: 3.2 }),
      makeCourse({ id: 3, rating: 4.9 }),
    ];
    expect(ids(sortCourseDetails(courses, "rating", "desc"))).toEqual([
      3, 1, 2,
    ]);
  });

  it("puts null ratings last in both directions", () => {
    const courses = [
      makeCourse({ id: 1, rating: 4.5 }),
      makeCourse({ id: 2, rating: null }),
      makeCourse({ id: 3, rating: 2.5 }),
      makeCourse({ id: 4, rating: null }),
    ];
    expect(ids(sortCourseDetails(courses, "rating", "asc"))).toEqual([
      3, 1, 2, 4,
    ]);
    expect(ids(sortCourseDetails(courses, "rating", "desc"))).toEqual([
      1, 3, 2, 4,
    ]);
  });

  it("keeps original order when every rating is null", () => {
    const courses = [
      makeCourse({ id: 1, rating: null }),
      makeCourse({ id: 2, rating: null }),
      makeCourse({ id: 3, rating: null }),
    ];
    expect(ids(sortCourseDetails(courses, "rating", "asc"))).toEqual([1, 2, 3]);
    expect(ids(sortCourseDetails(courses, "rating", "desc"))).toEqual([
      1, 2, 3,
    ]);
  });

  it("keeps ties in their original relative order (stable)", () => {
    const courses = [
      makeCourse({ id: 1, revenue: 10000 }),
      makeCourse({ id: 2, revenue: 20000 }),
      makeCourse({ id: 3, revenue: 10000 }),
      makeCourse({ id: 4, revenue: 20000 }),
    ];
    expect(ids(sortCourseDetails(courses, "revenue", "asc"))).toEqual([
      1, 3, 2, 4,
    ]);
    expect(ids(sortCourseDetails(courses, "revenue", "desc"))).toEqual([
      2, 4, 1, 3,
    ]);
  });

  it("keeps ties among rated courses in their original relative order", () => {
    const courses = [
      makeCourse({ id: 1, rating: 3.5 }),
      makeCourse({ id: 2, rating: 4.8 }),
      makeCourse({ id: 3, rating: 3.5 }),
    ];
    expect(ids(sortCourseDetails(courses, "rating", "asc"))).toEqual([1, 3, 2]);
  });

  it("does not mutate the input array and returns a new array", () => {
    const courses = [
      makeCourse({ id: 1, revenue: 30000 }),
      makeCourse({ id: 2, revenue: 10000 }),
    ];
    const snapshot = courses.map((course) => ({ ...course }));

    const result = sortCourseDetails(courses, "revenue", "asc");

    expect(result).not.toBe(courses);
    expect(courses).toEqual(snapshot);
    expect(ids(result)).toEqual([2, 1]);
  });

  it("returns an empty array for an empty input", () => {
    const empty: CourseDetail[] = [];
    expect(sortCourseDetails(empty, "rating", "desc")).toEqual([]);
  });
});
