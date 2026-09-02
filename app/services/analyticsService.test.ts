import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";

let testDb: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;

vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));

// Import after mock so the module picks up our test db
import {
  getCourseAnalytics,
  getInstructorAnalyticsSummary,
  getEnrollmentTimeline,
} from "./analyticsService";

describe("analyticsService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  // ─── Seeding helpers ───

  function createStudent(name: string, email: string) {
    return testDb
      .insert(schema.users)
      .values({ name, email, role: schema.UserRole.Student })
      .returning()
      .get();
  }

  function createCourse(
    title: string,
    slug: string,
    status: schema.CourseStatus = schema.CourseStatus.Published
  ) {
    return testDb
      .insert(schema.courses)
      .values({
        title,
        slug,
        description: "Test course",
        instructorId: base.instructor.id,
        categoryId: base.category.id,
        status,
      })
      .returning()
      .get();
  }

  function seedEnrollment(
    userId: number,
    courseId: number,
    enrolledAt?: string,
    completedAt?: string | null
  ) {
    return testDb
      .insert(schema.enrollments)
      .values({
        userId,
        courseId,
        enrolledAt: enrolledAt ?? new Date().toISOString(),
        completedAt,
      })
      .returning()
      .get();
  }

  function seedPurchase(
    userId: number,
    courseId: number,
    pricePaid: number,
    createdAt?: string
  ) {
    return testDb
      .insert(schema.purchases)
      .values({
        userId,
        courseId,
        pricePaid,
        createdAt: createdAt ?? new Date().toISOString(),
      })
      .returning()
      .get();
  }

  // ─── getCourseAnalytics ───

  describe("getCourseAnalytics", () => {
    it("returns zeros when the course has no enrollments or purchases", () => {
      expect(getCourseAnalytics(base.course.id)).toEqual({
        revenue: 0,
        enrollments: 0,
        completedStudents: 0,
        avgCompletionRate: 0,
      });
    });

    it("sums purchase prices in cents", () => {
      const student2 = createStudent("Student Two", "student2@example.com");
      seedPurchase(base.user.id, base.course.id, 10000);
      seedPurchase(student2.id, base.course.id, 5000);

      expect(getCourseAnalytics(base.course.id).revenue).toBe(15000);
    });

    it("computes completion rate as Math.round(completed/enrollments*100)", () => {
      const student2 = createStudent("Student Two", "student2@example.com");
      const student3 = createStudent("Student Three", "student3@example.com");
      const student4 = createStudent("Student Four", "student4@example.com");

      seedEnrollment(base.user.id, base.course.id);
      seedEnrollment(student2.id, base.course.id);
      seedEnrollment(student3.id, base.course.id, undefined, "2026-01-01T00:00:00.000Z");
      seedEnrollment(student4.id, base.course.id, undefined, "2026-01-01T00:00:00.000Z");

      const analytics = getCourseAnalytics(base.course.id);
      expect(analytics.enrollments).toBe(4);
      expect(analytics.completedStudents).toBe(2);
      expect(analytics.avgCompletionRate).toBe(50);
    });

    it("rounds 1 of 3 completions down to 33", () => {
      const student2 = createStudent("Student Two", "student2@example.com");
      const student3 = createStudent("Student Three", "student3@example.com");

      seedEnrollment(base.user.id, base.course.id, undefined, "2026-01-01T00:00:00.000Z");
      seedEnrollment(student2.id, base.course.id);
      seedEnrollment(student3.id, base.course.id);

      expect(getCourseAnalytics(base.course.id).avgCompletionRate).toBe(33);
    });

    it("applies an inclusive ISO date window to enrollments", () => {
      const student2 = createStudent("Student Two", "student2@example.com");
      const student3 = createStudent("Student Three", "student3@example.com");

      seedEnrollment(base.user.id, base.course.id, "2026-01-15T12:00:00.000Z");
      // Just before the window starts — excluded
      seedEnrollment(student2.id, base.course.id, "2026-01-31T23:59:59.000Z");
      // Exactly on the boundary instant — included
      seedEnrollment(student3.id, base.course.id, "2026-02-01T00:00:00.000Z");

      const analytics = getCourseAnalytics(base.course.id, "2026-02-01", "2026-02-28");
      expect(analytics.enrollments).toBe(1);
      expect(analytics.completedStudents).toBe(0);
    });

    it("applies the date window to purchase revenue", () => {
      const student2 = createStudent("Student Two", "student2@example.com");
      seedPurchase(base.user.id, base.course.id, 5000, "2026-01-10T10:00:00.000Z");
      seedPurchase(student2.id, base.course.id, 7000, "2026-03-05T10:00:00.000Z");

      expect(
        getCourseAnalytics(base.course.id, "2026-02-01", "2026-02-28").revenue
      ).toBe(0);
    });

    it("counts completions regardless of completion date — the window gates enrollment only", () => {
      // Enrolled inside the window, completed outside it (April).
      seedEnrollment(
        base.user.id,
        base.course.id,
        "2026-02-10T00:00:00.000Z",
        "2026-04-15T00:00:00.000Z"
      );

      const analytics = getCourseAnalytics(base.course.id, "2026-02-01", "2026-02-28");
      expect(analytics.enrollments).toBe(1);
      expect(analytics.completedStudents).toBe(1);
    });
  });

  // ─── getInstructorAnalyticsSummary ───

  describe("getInstructorAnalyticsSummary", () => {
    it("returns zeros and empty courseDetails for an instructor with no courses", () => {
      const otherInstructor = testDb
        .insert(schema.users)
        .values({
          name: "Other Instructor",
          email: "other-instructor@example.com",
          role: schema.UserRole.Instructor,
        })
        .returning()
        .get();

      expect(getInstructorAnalyticsSummary(otherInstructor.id)).toEqual({
        totalRevenue: 0,
        totalStudents: 0,
        avgCompletionRate: 0,
        publishedCourses: 0,
        courseDetails: [],
      });
    });

    it("reports per-course zeros and published count for an instructor with an inactive course", () => {
      const summary = getInstructorAnalyticsSummary(base.instructor.id);

      expect(summary.totalRevenue).toBe(0);
      expect(summary.totalStudents).toBe(0);
      expect(summary.avgCompletionRate).toBe(0);
      expect(summary.publishedCourses).toBe(1);
      expect(summary.courseDetails).toEqual([
        {
          id: base.course.id,
          title: "Test Course",
          slug: "test-course",
          status: schema.CourseStatus.Published,
          revenue: 0,
          enrollments: 0,
          completedStudents: 0,
          avgCompletionRate: 0,
        },
      ]);
    });

    it("aggregates across courses in id order and averages rounded per-course rates", () => {
      const courseB = createCourse("Course B", "course-b");
      const courseC = createCourse(
        "Course C",
        "course-c",
        schema.CourseStatus.Draft
      );

      // Course A (base.course): 4 enrollments, 2 completed → 50
      const studentsA = [
        base.user,
        createStudent("Student A2", "a2@example.com"),
        createStudent("Student A3", "a3@example.com"),
        createStudent("Student A4", "a4@example.com"),
      ];
      for (const student of studentsA.slice(0, 2)) {
        seedEnrollment(student.id, base.course.id, undefined, "2026-01-01T00:00:00.000Z");
      }
      for (const student of studentsA.slice(2)) {
        seedEnrollment(student.id, base.course.id);
      }
      seedPurchase(studentsA[0].id, base.course.id, 10000);
      seedPurchase(studentsA[1].id, base.course.id, 15000);

      // Course B: 3 enrollments, 1 completed → 33
      const studentsB = [
        createStudent("Student B1", "b1@example.com"),
        createStudent("Student B2", "b2@example.com"),
        createStudent("Student B3", "b3@example.com"),
      ];
      seedEnrollment(studentsB[0].id, courseB.id, undefined, "2026-01-01T00:00:00.000Z");
      seedEnrollment(studentsB[1].id, courseB.id);
      seedEnrollment(studentsB[2].id, courseB.id);
      seedPurchase(studentsB[0].id, courseB.id, 10000);

      // Course C: draft, no activity.

      const summary = getInstructorAnalyticsSummary(base.instructor.id);

      expect(summary.totalRevenue).toBe(35000);
      expect(summary.totalStudents).toBe(7);
      expect(summary.publishedCourses).toBe(2);
      // Average of the already-rounded per-course rates: (50 + 33) / 2 = 41.5 → 42
      expect(summary.avgCompletionRate).toBe(42);
      expect(summary.courseDetails).toEqual([
        {
          id: base.course.id,
          title: "Test Course",
          slug: "test-course",
          status: schema.CourseStatus.Published,
          revenue: 25000,
          enrollments: 4,
          completedStudents: 2,
          avgCompletionRate: 50,
        },
        {
          id: courseB.id,
          title: "Course B",
          slug: "course-b",
          status: schema.CourseStatus.Published,
          revenue: 10000,
          enrollments: 3,
          completedStudents: 1,
          avgCompletionRate: 33,
        },
        {
          id: courseC.id,
          title: "Course C",
          slug: "course-c",
          status: schema.CourseStatus.Draft,
          revenue: 0,
          enrollments: 0,
          completedStudents: 0,
          avgCompletionRate: 0,
        },
      ]);
    });

    it("counts duplicate enrollments for the same user without deduplication", () => {
      seedEnrollment(base.user.id, base.course.id);
      seedEnrollment(base.user.id, base.course.id);

      const summary = getInstructorAnalyticsSummary(base.instructor.id);
      expect(summary.totalStudents).toBe(2);
    });
  });

  // ─── getEnrollmentTimeline ───

  describe("getEnrollmentTimeline", () => {
    it("returns [] for a course with no enrollments or purchases", () => {
      expect(getEnrollmentTimeline(base.course.id)).toEqual([]);
    });

    it("returns [] when the explicit window excludes all records", () => {
      seedEnrollment(base.user.id, base.course.id, "2026-03-10T09:00:00.000Z");
      seedPurchase(base.user.id, base.course.id, 2500, "2026-03-11T09:00:00.000Z");

      expect(
        getEnrollmentTimeline(base.course.id, "2026-01-01", "2026-01-31")
      ).toEqual([]);
    });

    it("buckets daily with contiguous zero-filled buckets", () => {
      const student2 = createStudent("Student Two", "student2@example.com");
      const student3 = createStudent("Student Three", "student3@example.com");

      seedEnrollment(base.user.id, base.course.id, "2026-03-01T08:00:00.000Z");
      seedEnrollment(student2.id, base.course.id, "2026-03-01T15:30:00.000Z");
      seedPurchase(base.user.id, base.course.id, 2500, "2026-03-01T10:00:00.000Z");
      seedPurchase(student2.id, base.course.id, 5000, "2026-03-02T10:00:00.000Z");
      seedEnrollment(student3.id, base.course.id, "2026-03-03T23:00:00.000Z");

      expect(getEnrollmentTimeline(base.course.id, "2026-03-01", "2026-03-03")).toEqual([
        { date: "2026-03-01", enrollments: 2, revenue: 2500 },
        { date: "2026-03-02", enrollments: 0, revenue: 5000 },
        { date: "2026-03-03", enrollments: 1, revenue: 0 },
      ]);
    });

    it("treats a date-only end bound as inclusive of the whole end day", () => {
      seedPurchase(base.user.id, base.course.id, 1500, "2026-03-03T12:00:00.000Z");

      expect(getEnrollmentTimeline(base.course.id, "2026-03-01", "2026-03-03")).toEqual([
        { date: "2026-03-01", enrollments: 0, revenue: 0 },
        { date: "2026-03-02", enrollments: 0, revenue: 0 },
        { date: "2026-03-03", enrollments: 0, revenue: 1500 },
      ]);
    });

    it("buckets monthly with zero-filled months for long windows", () => {
      const student2 = createStudent("Student Two", "student2@example.com");
      const student3 = createStudent("Student Three", "student3@example.com");

      seedEnrollment(base.user.id, base.course.id, "2026-01-15T09:00:00.000Z");
      seedEnrollment(student2.id, base.course.id, "2026-04-10T09:00:00.000Z");
      seedEnrollment(student3.id, base.course.id, "2026-06-21T09:00:00.000Z");
      seedPurchase(student3.id, base.course.id, 10000, "2026-06-20T09:00:00.000Z");

      expect(getEnrollmentTimeline(base.course.id, "2026-01-01", "2026-06-30")).toEqual([
        { date: "2026-01-01", enrollments: 1, revenue: 0 },
        { date: "2026-02-01", enrollments: 0, revenue: 0 },
        { date: "2026-03-01", enrollments: 0, revenue: 0 },
        { date: "2026-04-01", enrollments: 1, revenue: 0 },
        { date: "2026-05-01", enrollments: 0, revenue: 0 },
        { date: "2026-06-01", enrollments: 1, revenue: 10000 },
      ]);
    });

    it("stays daily up to spanDays of 62 and switches to monthly beyond", () => {
      const student2 = createStudent("Student Two", "student2@example.com");

      seedEnrollment(base.user.id, base.course.id, "2026-01-02T09:00:00.000Z");
      seedPurchase(student2.id, base.course.id, 1000, "2026-03-01T09:00:00.000Z");

      // spanDays = 62 (2026-01-01..2026-03-04) → daily: 63 contiguous day buckets
      const daily = getEnrollmentTimeline(base.course.id, "2026-01-01", "2026-03-04");
      expect(daily).toHaveLength(63);
      expect(daily[0]).toEqual({ date: "2026-01-01", enrollments: 0, revenue: 0 });
      expect(daily[62]).toEqual({ date: "2026-03-04", enrollments: 0, revenue: 0 });
      expect(daily.find((point) => point.date === "2026-01-02")).toEqual({
        date: "2026-01-02",
        enrollments: 1,
        revenue: 0,
      });
      expect(daily.find((point) => point.date === "2026-03-01")).toEqual({
        date: "2026-03-01",
        enrollments: 0,
        revenue: 1000,
      });

      // spanDays = 63 (2026-01-01..2026-03-05) → monthly: one bucket per month
      expect(getEnrollmentTimeline(base.course.id, "2026-01-01", "2026-03-05")).toEqual([
        { date: "2026-01-01", enrollments: 1, revenue: 0 },
        { date: "2026-02-01", enrollments: 0, revenue: 0 },
        { date: "2026-03-01", enrollments: 0, revenue: 1000 },
      ]);
    });

    it("defaults to the first record through today (monthly) when no window is given", () => {
      seedEnrollment(base.user.id, base.course.id, "2026-01-10T09:00:00.000Z");
      seedPurchase(base.user.id, base.course.id, 12345, "2026-05-20T09:00:00.000Z");

      const firstOfCurrentMonth = new Date().toISOString().slice(0, 7) + "-01";
      const timeline = getEnrollmentTimeline(base.course.id);

      expect(timeline[0].date).toBe("2026-01-01");
      expect(timeline[timeline.length - 1].date).toBe(firstOfCurrentMonth);
      expect(timeline.every((point) => point.date.endsWith("-01"))).toBe(true);
      expect(timeline.find((point) => point.date === "2026-01-01")).toEqual({
        date: "2026-01-01",
        enrollments: 1,
        revenue: 0,
      });
      expect(timeline.find((point) => point.date === "2026-05-01")).toEqual({
        date: "2026-05-01",
        enrollments: 0,
        revenue: 12345,
      });
      expect(timeline.reduce((sum, point) => sum + point.enrollments, 0)).toBe(1);
      expect(timeline.reduce((sum, point) => sum + point.revenue, 0)).toBe(12345);
    });
  });
});
