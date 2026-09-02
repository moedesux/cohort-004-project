import { data } from "react-router";
import type { Route } from "./+types/api.course.$courseId.analytics";
import { getCurrentUserId } from "~/lib/session";
import { getUserById } from "~/services/userService";
import { getCourseWithDetails } from "~/services/courseService";
import { getCourseAnalytics, getEnrollmentTimeline } from "~/services/analyticsService";
import { UserRole } from "~/db/schema";

// This route is consumed in-page via `fetcher.load`, so failures are
// returned (not thrown) as 4xx responses. Thrown errors escalate to the
// nearest route error boundary and would replace the whole course editor
// page; returned responses are parsed into `fetcher.data` so the analytics
// tab can render its own local error state. Direct HTTP consumers still
// receive the same status codes and bodies.
export async function loader({ request, params }: Route.LoaderArgs) {
  const courseId = parseInt(params.courseId, 10);

  if (isNaN(courseId)) {
    return data("Invalid course ID", { status: 400 });
  }

  const currentUserId = await getCurrentUserId(request);

  if (!currentUserId) {
    return data("Unauthorized", { status: 401 });
  }

  const user = getUserById(currentUserId);

  if (!user || (user.role !== UserRole.Instructor && user.role !== UserRole.Admin)) {
    return data("Forbidden", { status: 403 });
  }

  const course = getCourseWithDetails(courseId);

  if (!course) {
    return data("Course not found", { status: 404 });
  }

  if (course.instructorId !== currentUserId && user.role !== UserRole.Admin) {
    return data("Forbidden", { status: 403 });
  }

  const analytics = getCourseAnalytics(courseId);

  return Response.json({
    totalEnrollments: analytics.enrollments,
    totalRevenue: analytics.revenue,
    timeline: getEnrollmentTimeline(courseId),
  });
}
