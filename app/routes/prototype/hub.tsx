// PROTOTYPE: throwaway code for layout decision. See grilling session.
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
// Route types not auto-generated for prototype directory
import {
  DollarSign,
  Users,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Star,
  ChevronRight,
  LayoutGrid,
  Columns,
  ArrowUpRight,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CourseAnalytics {
  id: number;
  title: string;
  slug: string;
  status: "published" | "draft" | "archived";
  coverColor: string;
  revenue: number;
  enrollments: number;
  completedStudents: number;
  totalLessons: number;
  avgCompletionRate: number;
  newEnrollmentsThisWeek: number;
  rating: number;
}

const mockCourses: CourseAnalytics[] = [
  {
    id: 1,
    title: "React Mastery",
    slug: "react-mastery",
    status: "published",
    coverColor: "#3b82f6",
    revenue: 4850,
    enrollments: 142,
    completedStudents: 67,
    totalLessons: 24,
    avgCompletionRate: 47,
    newEnrollmentsThisWeek: 8,
    rating: 4.6,
  },
  {
    id: 2,
    title: "TypeScript Deep Dive",
    slug: "typescript-deep-dive",
    status: "published",
    coverColor: "#2563eb",
    revenue: 3200,
    enrollments: 98,
    completedStudents: 52,
    totalLessons: 18,
    avgCompletionRate: 53,
    newEnrollmentsThisWeek: 5,
    rating: 4.8,
  },
  {
    id: 3,
    title: "Node.js Architecture",
    slug: "nodejs-architecture",
    status: "published",
    coverColor: "#16a34a",
    revenue: 1650,
    enrollments: 55,
    completedStudents: 18,
    totalLessons: 30,
    avgCompletionRate: 33,
    newEnrollmentsThisWeek: 2,
    rating: 4.2,
  },
  {
    id: 4,
    title: "GraphQL Fundamentals",
    slug: "graphql-fundamentals",
    status: "draft",
    coverColor: "#dc2626",
    revenue: 0,
    enrollments: 0,
    completedStudents: 0,
    totalLessons: 12,
    avgCompletionRate: 0,
    newEnrollmentsThisWeek: 0,
    rating: 0,
  },
];

const totalRevenue = mockCourses.reduce((sum, c) => sum + c.revenue, 0);
const totalStudents = mockCourses.reduce((sum, c) => sum + c.enrollments, 0);
const publishedCourses = mockCourses.filter(
  (c) => c.status === "published"
).length;
const avgCompletion =
  Math.round(
    mockCourses
      .filter((c) => c.enrollments > 0)
      .reduce((sum, c) => sum + c.avgCompletionRate, 0) /
      mockCourses.filter((c) => c.enrollments > 0).length
  ) || 0;

const variantLabels: Record<string, string> = {
  A: "Table Layout",
  B: "Card Grid",
  C: "Mixed",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

function statusBadge(status: string) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
  switch (status) {
    case "published":
      return (
        <span
          className={`${base} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400`}
        >
          Published
        </span>
      );
    case "draft":
      return (
        <span
          className={`${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400`}
        >
          Draft
        </span>
      );
    case "archived":
      return (
        <span
          className={`${base} bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400`}
        >
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
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${rate}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-10 text-right">{rate}%</span>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  if (!rating) return <span className="text-muted-foreground text-xs">N/A</span>;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`size-3.5 ${
            star <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-muted"
          }`}
        />
      ))}
      <span className="ml-1 text-xs font-medium">{rating.toFixed(1)}</span>
    </div>
  );
}

// ─── Variant A: Aggregate KPIs + Sortable Table ──────────────────────────────

function VariantA() {
  const [sortField, setSortField] = useState<string>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const sorted = [...mockCourses].sort((a, b) => {
    const aVal = a[sortField as keyof CourseAnalytics];
    const bVal = b[sortField as keyof CourseAnalytics];
    const cmp = typeof aVal === "number" ? (aVal as number) - (bVal as number) : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronRight className="size-3 text-muted-foreground/50" />;
    return <ArrowUpRight className={`size-3 transition-transform ${sortDir === "asc" ? "rotate-0" : "rotate-180"}`} />;
  };

  return (
    <div className="space-y-8">
      {/* KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <DollarSign className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
              <Users className="size-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalStudents}</p>
              <p className="text-xs text-muted-foreground">Total Students</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
              <GraduationCap className="size-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgCompletion}%</p>
              <p className="text-xs text-muted-foreground">Avg Completion</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <BookOpen className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{publishedCourses} published</p>
              <p className="text-xs text-muted-foreground">Courses</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {(
                    [
                      ["course", "Course"],
                      ["revenue", "Revenue"],
                      ["enrollments", "Students"],
                      ["avgCompletionRate", "Completion Rate"],
                      ["rating", "Rating"],
                      ["actions", "Actions"],
                    ] as [string, string][]
                  ).map(([field, label]) => (
                    <th key={field} className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {field === "actions" ? (
                        label
                      ) : (
                        <button
                          onClick={() => handleSort(field)}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          {label}
                          <SortIcon field={field} />
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((course) => (
                  <tr
                    key={course.id}
                    className="border-b last:border-0 transition-colors hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="size-3 rounded-full"
                          style={{ backgroundColor: course.coverColor }}
                        />
                        <div>
                          <p className="font-medium">{course.title}</p>
                          {statusBadge(course.status)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(course.revenue)}
                    </td>
                    <td className="px-4 py-3">{course.enrollments}</td>
                    <td className="px-4 py-3">
                      {course.enrollments > 0
                        ? completionBar(course.avgCompletionRate)
                        : (
                            <span className="text-muted-foreground">—</span>
                          )}
                    </td>
                    <td className="px-4 py-3">
                      <StarRating rating={course.rating} />
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Variant B: Per-Course Cards with Mini-Stat Badges ────────────────────────

function CourseCardB({ course }: { course: CourseAnalytics }) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="h-2" style={{ backgroundColor: course.coverColor }} />
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground">
              Course #{course.id}
            </p>
            <h3 className="mt-0.5 line-clamp-1 text-base font-semibold">
              {course.title}
            </h3>
          </div>
          {statusBadge(course.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mini stat badges */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium">
            <DollarSign className="size-3" />
            {formatCurrency(course.revenue)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium">
            <Users className="size-3" />
            {course.enrollments} students
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium">
            <TrendingUp className="size-3" />
            {course.avgCompletionRate}% complete
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            {course.rating.toFixed(1)}
          </span>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Completion</span>
            <span>{course.avgCompletionRate}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${
                course.avgCompletionRate >= 70
                  ? "bg-green-500"
                  : course.avgCompletionRate >= 40
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${course.avgCompletionRate}%` }}
            />
          </div>
        </div>

        <Button className="w-full" variant="outline" size="sm">
          View Analytics <ChevronRight className="ml-1 size-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

function VariantB() {
  return (
    <div className="space-y-6">
      {/* Slimmer KPI Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: DollarSign, value: formatCurrency(totalRevenue), label: "Revenue", color: "text-blue-600 dark:text-blue-400" },
          { icon: Users, value: String(totalStudents), label: "Students", color: "text-green-600 dark:text-green-400" },
          { icon: GraduationCap, value: `${avgCompletion}%`, label: "Completion", color: "text-purple-600 dark:text-purple-400" },
          { icon: BookOpen, value: `${publishedCourses}`, label: "Published", color: "text-amber-600 dark:text-amber-400" },
        ].map(({ icon: Icon, value, label, color }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-3">
              <Icon className={`size-4 ${color}`} />
              <div>
                <p className="text-lg font-bold">{value}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Card Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {mockCourses.map((course) => (
          <CourseCardB key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
}

// ─── Variant C: Mix — Aggregate Cards + Compact Per-Course Cards ──────────────

function CourseCardC({ course }: { course: CourseAnalytics }) {
  return (
    <Card className="overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: course.coverColor }} />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="size-2.5 rounded-full"
              style={{ backgroundColor: course.coverColor }}
            />
            <h3 className="line-clamp-1 text-sm font-semibold">{course.title}</h3>
          </div>
          {statusBadge(course.status)}
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <DollarSign className="size-3" />
            <span className="font-medium text-foreground">{formatCurrency(course.revenue)}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="size-3" />
            <span>{course.enrollments}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <GraduationCap className="size-3" />
            <span>{course.avgCompletionRate}%</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            <span>{course.rating.toFixed(1)}</span>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${
                  course.avgCompletionRate >= 70
                    ? "bg-green-500"
                    : course.avgCompletionRate >= 40
                    ? "bg-amber-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${course.avgCompletionRate}%` }}
              />
            </div>
          </div>
        </div>
        <Button variant="ghost" size="xs" className="mt-2 w-full justify-center text-xs text-muted-foreground hover:text-foreground">
          Drill down <ChevronRight className="ml-0.5 size-3" />
        </Button>
      </CardContent>
    </Card>
  );
}

function VariantC() {
  return (
    <div className="space-y-8">
      {/* KPI Cards — full size */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: DollarSign, value: formatCurrency(totalRevenue), label: "Total Revenue", sub: "Across all courses", bg: "bg-blue-50 dark:bg-blue-900/20" },
          { icon: Users, value: String(totalStudents), label: "Total Students", sub: "All enrollments", bg: "bg-green-50 dark:bg-green-900/20" },
          { icon: GraduationCap, value: `${avgCompletion}%`, label: "Avg Completion", sub: "Published courses", bg: "bg-purple-50 dark:bg-purple-900/20" },
          { icon: TrendingUp, value: "15 this week", label: "New Enrollments", sub: "Last 7 days", bg: "bg-amber-50 dark:bg-amber-900/20" },
        ].map(({ icon: Icon, value, label, sub, bg }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                <Icon className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground/70">{sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section divider */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Course Breakdown</h2>
        <div className="flex-1 border-t" />
      </div>

      {/* Compact card grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {mockCourses.map((course) => (
          <CourseCardC key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
}

// ─── PrototypeSwitcher ───────────────────────────────────────────────────────

function PrototypeSwitcher() {
  const [variant, setVariant] = useState("A");

  const variants = ["A", "B", "C"] as const;

  const cycle = useCallback(
    (dir: 1 | -1) => {
      const idx = variants.indexOf(variant as (typeof variants)[number]);
      const next = ((idx + dir) + variants.length) % variants.length;
      const nextKey = variants[next];
      setVariant(nextKey);
      const url = new URL(window.location.href);
      url.searchParams.set("variant", nextKey);
      window.history.replaceState({}, "", url.toString());
    },
    [variant]
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    const v = url.searchParams.get("variant");
    if (v && variantLabels[v]) {
      setVariant(v);
    }
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || document.activeElement?.getAttribute("contenteditable") === "true") return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        cycle(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        cycle(-1);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [cycle]);

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-white shadow-lg ring-1 ring-gray-700/50">
        <button
          onClick={() => cycle(-1)}
          className="flex size-7 items-center justify-center rounded-full hover:bg-gray-700"
          aria-label="Previous variant"
        >
          ←
        </button>
        <span className="min-w-[140px] text-center text-sm font-medium">
          {variant} ({variantLabels[variant]})
        </span>
        <button
          onClick={() => cycle(1)}
          className="flex size-7 items-center justify-center rounded-full hover:bg-gray-700"
          aria-label="Next variant"
        >
          →
        </button>
        <div className="mx-1 h-4 w-px bg-gray-700" />
        <button
          onClick={() => window.history.back()}
          className="flex size-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"
          aria-label="Close prototype"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Route ───────────────────────────────────────────────────────────────────

export function meta() {
  return [
    { title: "Analytics Hub — Prototype" },
    { name: "description", content: "Prototype layouts for multi-course analytics hub" },
  ];
}

export default function PrototypeHub() {
  const [variant, setVariant] = useState<string>("A");

  useEffect(() => {
    const url = new URL(window.location.href);
    const v = url.searchParams.get("variant") || "A";
    setVariant(v);
  }, []);

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link to="/instructor" className="hover:text-foreground">
          My Courses
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Analytics</span>
      </nav>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview across all your courses
        </p>
      </div>

      {/* Variants */}
      {variant === "A" && <VariantA />}
      {variant === "B" && <VariantB />}
      {variant === "C" && <VariantC />}
      {!["A", "B", "C"].includes(variant) && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-900/30 dark:bg-yellow-900/20 dark:text-yellow-300">
          Unknown variant: <code>{variant}</code>. Try <code>?variant=A</code>, <code>?variant=B</code>, or <code>?variant=C</code>.
        </div>
      )}

      <PrototypeSwitcher />
    </div>
  );
}
