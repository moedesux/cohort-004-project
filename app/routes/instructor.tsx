import { useState } from "react";
import { Link, data, isRouteErrorResponse } from "react-router";
import type { Route } from "./+types/instructor";
import { getInstructorAnalyticsSummary } from "~/services/analyticsService";
import {
  sortCourseDetails,
  type CourseSortKey,
  type SortState,
} from "~/lib/sortCourses";
import { getCurrentUserId } from "~/lib/session";
import { getUserById } from "~/services/userService";
import { formatCurrency } from "~/lib/utils";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { StatCard } from "~/components/analytics/stat-card";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookOpen,
  DollarSign,
  GraduationCap,
  Plus,
  Users,
} from "lucide-react";
import { CourseStatus, UserRole } from "~/db/schema";

export function meta() {
  return [
    { title: "My Courses — Cadence" },
    { name: "description", content: "Manage your courses" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const currentUserId = await getCurrentUserId(request);

  if (!currentUserId) {
    throw data("Select a user from the DevUI panel to view your courses.", {
      status: 401,
    });
  }

  const user = getUserById(currentUserId);

  if (!user || user.role !== UserRole.Instructor) {
    throw data("Only instructors can access this page.", {
      status: 403,
    });
  }

  const summary = getInstructorAnalyticsSummary(currentUserId);
  return { summary };
}

function statusBadge(status: string) {
  switch (status) {
    case CourseStatus.Published:
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Published
        </span>
      );
    case CourseStatus.Draft:
      return (
        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          Draft
        </span>
      );
    case CourseStatus.Archived:
      return (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
          Archived
        </span>
      );
    default:
      return null;
  }
}

function completionBar(rate: number) {
  const color =
    rate >= 70 ? "bg-green-500" : rate >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full max-w-40 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{rate}%</span>
    </div>
  );
}

function SortableTh({
  label,
  sortKey,
  sort,
  onSortClick,
}: {
  label: string;
  sortKey: CourseSortKey;
  sort: SortState;
  onSortClick: (key: CourseSortKey) => void;
}) {
  const direction = sort && sort.key === sortKey ? sort.direction : null;
  const Icon =
    direction === "asc"
      ? ArrowUp
      : direction === "desc"
        ? ArrowDown
        : ArrowUpDown;

  return (
    <th
      className="px-4 py-3 text-left font-medium text-muted-foreground"
      aria-sort={
        direction === "asc"
          ? "ascending"
          : direction === "desc"
            ? "descending"
            : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSortClick(sortKey)}
        className="inline-flex items-center gap-1 text-left font-medium text-muted-foreground hover:text-foreground"
      >
        {label}
        <Icon className="inline size-3.5" />
      </button>
    </th>
  );
}

export function HydrateFallback() {
  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-40" />
          <Skeleton className="mt-2 h-5 w-72" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="mt-8 rounded-xl border">
        <div className="flex h-11 items-center gap-4 bg-muted/30 px-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="ml-auto h-4 w-12" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex h-[68px] items-center gap-4 border-b px-4 last:border-0"
          >
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-2 w-40 rounded-full" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="ml-auto h-7 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InstructorDashboard({
  loaderData,
}: Route.ComponentProps) {
  const { summary } = loaderData;

  // null = unsorted (loader order: course id ASC). Same key toggles direction;
  // a new key starts at "asc".
  const [sort, setSort] = useState<SortState>(null);

  function handleSortClick(key: CourseSortKey) {
    setSort((current) =>
      current && current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  }

  const rows = sort
    ? sortCourseDetails(summary.courseDetails, sort.key, sort.direction)
    : summary.courseDetails;

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">My Courses</span>
      </nav>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Courses</h1>
          <p className="mt-1 text-muted-foreground">
            Overview of revenue, students, and completion across all your
            courses
          </p>
        </div>
        <Link to="/instructor/new">
          <Button>
            <Plus className="mr-2 size-4" />
            New Course
          </Button>
        </Link>
      </div>

      {summary.courseDetails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GraduationCap className="mb-4 size-12 text-muted-foreground/50" />
          <h2 className="text-lg font-medium">No courses yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first course to get started.
          </p>
          <Link to="/instructor/new" className="mt-4">
            <Button>
              <Plus className="mr-2 size-4" />
              Create Course
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={DollarSign}
              tone="blue"
              value={formatCurrency(summary.totalRevenue)}
              label="Total Revenue"
            />
            <StatCard
              icon={Users}
              tone="green"
              value={String(summary.totalStudents)}
              label="Total Students"
            />
            <StatCard
              icon={GraduationCap}
              tone="purple"
              value={`${summary.avgCompletionRate}%`}
              label="Avg Completion"
            />
            <StatCard
              icon={BookOpen}
              tone="amber"
              value={`${summary.publishedCourses} published`}
              label="Courses"
            />
          </div>

          {summary.totalRevenue === 0 && summary.totalStudents === 0 ? (
            <div className="rounded-xl border bg-muted/30 p-6">
              <h2 className="font-medium">No analytics data yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sales and enrollment numbers will appear here once students buy
                or enroll in your courses.
              </p>
              <Link
                to={`/courses/${summary.courseDetails[0].slug}`}
                className="mt-3 inline-block text-sm font-medium hover:text-foreground"
              >
                View your public course page →
              </Link>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Course
                        </th>
                        <SortableTh
                          label="Revenue"
                          sortKey="revenue"
                          sort={sort}
                          onSortClick={handleSortClick}
                        />
                        <SortableTh
                          label="Students"
                          sortKey="enrollments"
                          sort={sort}
                          onSortClick={handleSortClick}
                        />
                        <SortableTh
                          label="Completion Rate"
                          sortKey="avgCompletionRate"
                          sort={sort}
                          onSortClick={handleSortClick}
                        />
                        <SortableTh
                          label="Rating"
                          sortKey="rating"
                          sort={sort}
                          onSortClick={handleSortClick}
                        />
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((course) => (
                        <tr
                          key={course.id}
                          className="border-b transition-colors last:border-0 hover:bg-muted/40"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium">{course.title}</div>
                            <div className="mt-1">
                              {statusBadge(course.status)}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {formatCurrency(course.revenue)}
                          </td>
                          <td className="px-4 py-3">{course.enrollments}</td>
                          <td className="px-4 py-3">
                            {course.enrollments > 0 ? (
                              completionBar(course.avgCompletionRate)
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {course.rating === null ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <span className="font-medium">
                                {course.rating.toFixed(1)} ★
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link to={`/instructor/${course.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                              >
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Something went wrong";
  let message = "An unexpected error occurred while loading your courses.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 401) {
      title = "Sign in required";
      message = typeof error.data === "string" ? error.data : "Please select a user from the DevUI panel.";
    } else if (error.status === 403) {
      title = "Access denied";
      message = typeof error.data === "string" ? error.data : "You don't have permission to access this page.";
    } else {
      title = `Error ${error.status}`;
      message = typeof error.data === "string" ? error.data : error.statusText;
    }
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="text-center">
        <AlertTriangle className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold">{title}</h1>
        <p className="mb-6 text-muted-foreground">{message}</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/courses">
            <Button variant="outline">Browse Courses</Button>
          </Link>
          <Link to="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
