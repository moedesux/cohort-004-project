import { useEffect } from "react";
import { Link, useFetcher } from "react-router";
import {
  BookOpen,
  CheckCircle2,
  DollarSign,
  PlayCircle,
  TrendingUp,
  Users,
} from "lucide-react";
import type {
  EnrollmentTimelinePoint,
  LessonCompletionRate,
  LessonDropOffPoint,
} from "~/services/analyticsService";
import { formatCurrency } from "~/lib/utils";
import { StatCard } from "~/components/analytics/stat-card";
import { RevenueTimelineChart } from "~/components/analytics/revenue-timeline-chart";
import { DropOffFunnelChart } from "~/components/analytics/drop-off-funnel-chart";
import { LessonCompletionChart } from "~/components/analytics/lesson-completion-chart";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

interface AnalyticsTabData {
  totalEnrollments: number;
  totalRevenue: number;
  timeline: EnrollmentTimelinePoint[];
  completionRate: number; // 0-100, rounded
  dropOff: LessonDropOffPoint[];
  lessonCompletion: LessonCompletionRate[];
}

// The resource route responds to failures with 4xx JSON bodies (plain
// strings, matching the rest of the API) instead of throwing, so the fetch
// error stays in this tab rather than the page's error boundary. The
// response body is parsed into `fetcher.data`, so both shapes can arrive.
type AnalyticsTabResult = AnalyticsTabData | string;

function isAnalyticsData(result: AnalyticsTabResult): result is AnalyticsTabData {
  return typeof result === "object" && result !== null;
}

// Section anchors for the sticky nav.
const sections: Array<{ id: string; label: string }> = [
  { id: "analytics-sales", label: "Sales" },
  { id: "analytics-engagement", label: "Engagement" },
  { id: "analytics-content", label: "Content" },
];

interface AnalyticsTabProps {
  courseId: number;
  courseSlug: string;
}

export function AnalyticsTab({ courseId, courseSlug }: AnalyticsTabProps) {
  const fetcher = useFetcher<AnalyticsTabResult>();

  // Lazy loading: this effect runs on client mount of the tab content, so
  // analytics are fetched only when the tab is first activated.
  useEffect(() => {
    fetcher.load(`/api/course/${courseId}/analytics`);
  }, [courseId]);

  const result = fetcher.data;

  if (fetcher.state !== "idle" || result === undefined) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-80" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!isAnalyticsData(result)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <p className="text-muted-foreground">Couldn't load analytics data.</p>
        <Button
          variant="outline"
          onClick={() => fetcher.load(`/api/course/${courseId}/analytics`)}
        >
          Retry
        </Button>
      </div>
    );
  }

  const {
    totalEnrollments,
    totalRevenue,
    timeline,
    completionRate,
    dropOff,
    lessonCompletion,
  } = result;

  const hasLessonProgress = dropOff.some((point) => point.startedCount > 0);

  const totalLessons = lessonCompletion.length;
  const avgLessonCompletion =
    totalLessons === 0
      ? 0
      : Math.round(
          lessonCompletion.reduce((sum, lesson) => sum + lesson.rate, 0) /
            totalLessons
        );

  if (totalEnrollments === 0 && totalRevenue === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <h2 className="text-lg font-semibold">No analytics data yet</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Once students enroll or make a purchase, your sales metrics will show
          up here.
        </p>
        <Button asChild variant="outline">
          <Link to={`/courses/${courseSlug}`}>View public course page</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <nav className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="flex gap-1">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {section.label}
            </a>
          ))}
        </div>
      </nav>

      <section id="analytics-sales" className="scroll-mt-12 pt-6">
        <h2 className="text-lg font-semibold">Sales</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enrollment and revenue activity for this course, all time.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <StatCard
            icon={Users}
            value={String(totalEnrollments)}
            label="Total enrollments"
            tone="blue"
          />
          <StatCard
            icon={DollarSign}
            value={formatCurrency(totalRevenue)}
            label="Total revenue"
            tone="green"
          />
        </div>

        <Card className="mt-4">
          <CardContent className="p-5">
            <RevenueTimelineChart data={timeline} />
          </CardContent>
        </Card>
      </section>

      <section id="analytics-engagement" className="scroll-mt-12 pt-6">
        <h2 className="text-lg font-semibold">Engagement</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          How students move through the course, lesson by lesson.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <StatCard
            icon={PlayCircle}
            value={String(dropOff[0]?.startedCount ?? 0)}
            label="First-lesson starters"
            tone="purple"
          />
          <StatCard
            icon={TrendingUp}
            value={`${completionRate}%`}
            label="Overall completion rate"
            tone="amber"
          />
        </div>

        {hasLessonProgress ? (
          <Card className="mt-4">
            <CardContent className="p-5">
              <DropOffFunnelChart data={dropOff} />
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-4">
            <CardContent className="flex flex-col items-center justify-center gap-2 p-10 text-center">
              <p className="text-sm font-medium">No lesson progress yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Once students start lessons, you'll see how far they get and where
                they drop off.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      <section id="analytics-content" className="scroll-mt-12 pt-6">
        <h2 className="text-lg font-semibold">Content</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          How students complete each lesson, worst first.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <StatCard
            icon={BookOpen}
            value={String(totalLessons)}
            label="Total lessons"
            tone="blue"
          />
          <StatCard
            icon={CheckCircle2}
            value={`${avgLessonCompletion}%`}
            label="Avg lesson completion"
            tone="green"
          />
        </div>

        {totalLessons > 0 ? (
          <Card className="mt-4">
            <CardContent className="p-5">
              <LessonCompletionChart data={lessonCompletion} />
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-4">
            <CardContent className="flex flex-col items-center justify-center gap-2 p-10 text-center">
              <p className="text-sm font-medium">No lessons yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Add lessons in the Content tab to track lesson completion here.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
