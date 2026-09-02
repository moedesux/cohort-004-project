// PROTOTYPE: throwaway code for layout decision. See grilling session.
import { useState, useEffect } from "react";
import { Link } from "react-router";
// Route types not auto-generated for prototype directory
import {
  ArrowLeft,
  DollarSign,
  Users,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Activity,
  Star,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const courseName = "React Mastery";
const kpiData = { revenue: 4850, enrollments: 142, avgCompletionRate: 47, totalLessons: 24 };

interface SalesDataPoint {
  date: string;
  enrollments: number;
  revenue: number;
}
const salesData: SalesDataPoint[] = [
  { date: "Jun 1", enrollments: 2, revenue: 99 },
  { date: "Jun 3", enrollments: 1, revenue: 49 },
  { date: "Jun 5", enrollments: 3, revenue: 149 },
  { date: "Jun 7", enrollments: 1, revenue: 99 },
  { date: "Jun 9", enrollments: 2, revenue: 199 },
  { date: "Jun 11", enrollments: 0, revenue: 0 },
  { date: "Jun 13", enrollments: 4, revenue: 396 },
  { date: "Jun 15", enrollments: 2, revenue: 99 },
  { date: "Jun 17", enrollments: 1, revenue: 49 },
  { date: "Jun 19", enrollments: 3, revenue: 297 },
  { date: "Jun 21", enrollments: 2, revenue: 199 },
  { date: "Jun 23", enrollments: 1, revenue: 99 },
  { date: "Jun 25", enrollments: 5, revenue: 495 },
  { date: "Jun 27", enrollments: 3, revenue: 149 },
  { date: "Jun 29", enrollments: 2, revenue: 199 },
];

interface LessonCompletion {
  lessonId: number;
  title: string;
  completionRate: number;
  startedCount: number;
  completedCount: number;
}
const lessonCompletions: LessonCompletion[] = [
  { lessonId: 1, title: "Setting Up the Project", completionRate: 98, startedCount: 142, completedCount: 139 },
  { lessonId: 2, title: "Components & JSX", completionRate: 89, startedCount: 139, completedCount: 124 },
  { lessonId: 3, title: "State & Props", completionRate: 82, startedCount: 124, completedCount: 102 },
  { lessonId: 4, title: "Hooks Deep Dive", completionRate: 71, startedCount: 102, completedCount: 72 },
  { lessonId: 5, title: "Context API", completionRate: 58, startedCount: 72, completedCount: 42 },
  { lessonId: 6, title: "Performance Optimization", completionRate: 45, startedCount: 42, completedCount: 19 },
  { lessonId: 7, title: "Testing with Jest", completionRate: 35, startedCount: 19, completedCount: 7 },
  { lessonId: 8, title: "Deployment", completionRate: 22, startedCount: 7, completedCount: 1 },
];

const funnelData = [
  { stage: "Enrolled", count: 142, rate: 100, color: "#3b82f6" },
  { stage: "Started L1", count: 139, rate: 98, color: "#60a5fa" },
  { stage: "Completed L1", count: 139, rate: 98, color: "#93c5fd" },
  { stage: "Started L4", count: 102, rate: 72, color: "#93c5fd" },
  { stage: "Completed L4", count: 72, rate: 51, color: "#bfdbfe" },
  { stage: "Started L7", count: 19, rate: 13, color: "#bfdbfe" },
  { stage: "Completed L7", count: 7, rate: 5, color: "#dbeafe" },
  { stage: "Finished", count: 1, rate: 1, color: "#dbeafe" },
];

const variantLabels: Record<string, string> = {
  A: "Stacked Charts",
  B: "Card Grid",
  C: "Tabbed",
};

// ─── Chart: SVG Line Chart ───────────────────────────────────────────────────

function LineChart({
  data,
  yKey,
  yLabel,
  color = "#3b82f6",
  height = 200,
  showArea = false,
}: {
  data: SalesDataPoint[];
  yKey: "enrollments" | "revenue";
  yLabel: string;
  color?: string;
  height?: number;
  showArea?: boolean;
}) {
  const maxVal = Math.max(...data.map((d) => d[yKey]));
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = 700;
  const chartH = height;
  const innerW = chartW - padding.left - padding.right;
  const innerH = chartH - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * innerW;
    const y = padding.top + innerH - (d[yKey] / Math.max(maxVal, 1)) * innerH;
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = linePath + ` L ${points[points.length - 1].x} ${padding.top + innerH} L ${points[0].x} ${padding.top + innerH} Z`;

  const yTicks = [0, Math.ceil(maxVal / 2), maxVal];
  const yTickLabels = yKey === "enrollments"
    ? ["0", "5", "10+"]
    : [`$0`, `$${Math.ceil((maxVal / 2) / 100) * 100}`, `$${Math.ceil(maxVal / 100) * 100}`];

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full min-w-[500px]" style={{ height }}>
        {/* Grid lines */}
        {yTicks.map((_, i) => {
          const y = padding.top + (i / (yTicks.length - 1)) * innerH;
          return (
            <line
              key={i}
              x1={padding.left}
              y1={y}
              x2={padding.left + innerW}
              y2={y}
              stroke="currentColor"
              className="text-muted/10"
              strokeWidth={1}
            />
          );
        })}

        {/* Y-axis labels */}
        {yTickLabels.map((label, i) => {
          const y = padding.top + (i / (yTicks.length - 1)) * innerH;
          return (
            <text
              key={i}
              x={padding.left - 8}
              y={y + 4}
              textAnchor="end"
              className="text-[10px] fill-muted-foreground"
            >
              {label}
            </text>
          );
        })}

        {/* X-axis labels (show every other) */}
        {points.map((p, i) =>
          i % 2 === 0 ? (
            <text
              key={i}
              x={p.x}
              y={chartH - 5}
              textAnchor="middle"
              className="text-[10px] fill-muted-foreground"
            >
              {data[i].date}
            </text>
          ) : null
        )}

        {/* Area fill */}
        {showArea && (
          <path d={areaPath} fill={color} opacity={0.08} />
        )}

        {/* Line */}
        <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill={color} />
            <circle cx={p.x} cy={p.y} r={2} fill="white" />
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Chart: Horizontal Bar (Lesson Completion) ───────────────────────────────

function HorizontalBarChart({ data }: { data: LessonCompletion[] }) {
  return (
    <div className="space-y-2">
      {data.map((l) => {
        const barColor =
          l.completionRate >= 70 ? "bg-green-500" : l.completionRate >= 40 ? "bg-amber-500" : "bg-red-500";
        return (
          <div key={l.lessonId} className="flex items-center gap-3">
            <span className="w-48 shrink-0 truncate text-xs text-muted-foreground text-right" title={l.title}>
              {l.title}
            </span>
            <div className="flex-1">
              <div className="h-6 overflow-hidden rounded bg-muted/50">
                <div
                  className={`h-full rounded ${barColor} transition-all`}
                  style={{ width: `${l.completionRate}%` }}
                />
              </div>
            </div>
            <span className="w-16 text-right text-xs font-medium">
              {l.completionRate}%
            </span>
            <span className="w-20 text-right text-[11px] text-muted-foreground">
              {l.completedCount}/{l.startedCount}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Chart: Funnel ───────────────────────────────────────────────────────────

function FunnelChart({ data }: { data: typeof funnelData }) {
  const maxCount = data[0].count;
  return (
    <div className="space-y-2">
      {data.map((stage, i) => {
        const widthPct = Math.max((stage.count / maxCount) * 100, 8);
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs text-muted-foreground text-right">{stage.stage}</span>
            <div className="flex-1 flex items-center gap-2">
              <div
                className="h-8 rounded-md transition-all"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: stage.color,
                  opacity: 0.7 + (i / data.length) * 0.3,
                  minWidth: "32px",
                }}
              />
            </div>
            <div className="w-20 text-right">
              <span className="text-xs font-medium">{stage.count}</span>
              <span className="ml-1 text-[11px] text-muted-foreground">({stage.rate}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Variant A: KPI Strip + Stacked Charts ───────────────────────────────────

function VariantA() {
  return (
    <div className="space-y-10">
      {/* KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <DollarSign className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">${kpiData.revenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
              <Users className="size-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{kpiData.enrollments}</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
              <GraduationCap className="size-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{kpiData.avgCompletionRate}%</p>
              <p className="text-xs text-muted-foreground">Completion Rate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <BookOpen className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{kpiData.totalLessons}</p>
              <p className="text-xs text-muted-foreground">Lessons</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart 1: Sales Timeline */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="size-4" />
          Enrollments Over Time
        </h2>
        <Card>
          <CardContent className="p-6">
            <LineChart data={salesData} yKey="enrollments" yLabel="Enrollments" color="#3b82f6" height={220} showArea />
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-3">Revenue</p>
              <LineChart data={salesData} yKey="revenue" yLabel="Revenue" color="#10b981" height={120} showArea />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart 2: Lesson Completion */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle2 className="size-4" />
          Lesson Completion Rates
        </h2>
        <Card>
          <CardContent className="p-6">
            <HorizontalBarChart data={lessonCompletions} />
          </CardContent>
        </Card>
      </div>

      {/* Chart 3: Drop-off Funnel */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="size-4 rotate-180" />
          Student Drop-off
        </h2>
        <Card>
          <CardContent className="p-6">
            <FunnelChart data={funnelData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Variant B: KPI Strip + Card Grid with Embedded Charts ───────────────────

function VariantB() {
  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: DollarSign, value: `$${kpiData.revenue.toLocaleString()}`, label: "Revenue", color: "text-blue-600 dark:text-blue-400" },
          { icon: Users, value: String(kpiData.enrollments), label: "Students", color: "text-green-600 dark:text-green-400" },
          { icon: GraduationCap, value: `${kpiData.avgCompletionRate}%`, label: "Completion", color: "text-purple-600 dark:text-purple-400" },
          { icon: BookOpen, value: String(kpiData.totalLessons), label: "Lessons", color: "text-amber-600 dark:text-amber-400" },
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

      {/* Chart Grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Sales Timeline */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Sales Timeline</h3>
            </div>
          </CardHeader>
          <CardContent>
            <LineChart data={salesData} yKey="enrollments" yLabel="Enrollments" color="#3b82f6" height={180} />
          </CardContent>
        </Card>

        {/* Drop-off Funnel */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 rotate-180 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Drop-off Funnel</h3>
            </div>
          </CardHeader>
          <CardContent>
            <FunnelChart data={funnelData} />
          </CardContent>
        </Card>

        {/* Lesson Completion — spans full width */}
        <Card className="sm:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Lesson Completion Rates</h3>
            </div>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={lessonCompletions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Variant C: Tabbed by Metric ─────────────────────────────────────────────

function VariantC() {
  return (
    <div className="space-y-6">
      {/* Slim KPI Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: DollarSign, value: `$${kpiData.revenue.toLocaleString()}`, label: "Revenue" },
          { icon: Users, value: String(kpiData.enrollments), label: "Students" },
          { icon: GraduationCap, value: `${kpiData.avgCompletionRate}%`, label: "Completion" },
          { icon: BookOpen, value: String(kpiData.totalLessons), label: "Lessons" },
        ].map(({ icon: Icon, value, label }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-3">
              <Icon className="size-4 text-muted-foreground" />
              <div>
                <p className="text-lg font-bold">{value}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">
            <Activity className="size-4" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="engagement">
            <TrendingUp className="size-4 rotate-180" />
            Engagement
          </TabsTrigger>
          <TabsTrigger value="content">
            <CheckCircle2 className="size-4" />
            Content
          </TabsTrigger>
        </TabsList>

        {/* Sales Tab */}
        <TabsContent value="sales" className="mt-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <h3 className="text-base font-semibold">Enrollment Trends</h3>
                <p className="text-sm text-muted-foreground">
                  Enrollments over the last 30 days
                </p>
              </CardHeader>
              <CardContent>
                <LineChart data={salesData} yKey="enrollments" yLabel="Enrollments" color="#3b82f6" height={280} showArea />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <h3 className="text-base font-semibold">Revenue</h3>
                <p className="text-sm text-muted-foreground">
                  Daily revenue from new enrollments
                </p>
              </CardHeader>
              <CardContent>
                <LineChart data={salesData} yKey="revenue" yLabel="Revenue" color="#10b981" height={200} showArea />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="mt-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <h3 className="text-base font-semibold">Student Drop-off Funnel</h3>
                <p className="text-sm text-muted-foreground">
                  Where students stop progressing
                </p>
              </CardHeader>
              <CardContent>
                <FunnelChart data={funnelData} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="mt-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <h3 className="text-base font-semibold">Lesson Completion Rates</h3>
                <p className="text-sm text-muted-foreground">
                  Completion rate per lesson — students drop off as lessons progress
                </p>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart data={lessonCompletions} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── PrototypeSwitcher ───────────────────────────────────────────────────────

function PrototypeSwitcher() {
  const [variant, setVariant] = useState("A");

  const variants = ["A", "B", "C"] as const;

  const cycle = (dir: 1 | -1) => {
    const idx = variants.indexOf(variant as (typeof variants)[number]);
    const next = ((idx + dir) + variants.length) % variants.length;
    const nextKey = variants[next];
    setVariant(nextKey);
    const url = new URL(window.location.href);
    url.searchParams.set("variant", nextKey);
    window.history.replaceState({}, "", url.toString());
  };

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
  }, [variant]);

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
    { title: `${courseName} Analytics — Prototype` },
    { name: "description", content: `Prototype layouts for ${courseName} analytics deep-dive` },
  ];
}

export default function PrototypeCourse() {
  const [variant, setVariant] = useState("A");

  useEffect(() => {
    const url = new URL(window.location.href);
    const v = url.searchParams.get("variant") || "A";
    setVariant(v);
  }, []);

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/instructor" className="hover:text-foreground">
          My Courses
        </Link>
        <span className="mx-2">/</span>
        <Link to="#" className="hover:text-foreground">
          {courseName}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Analytics</span>
      </nav>

      {/* Back link */}
      <Link
        to="/instructor"
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 size-4" />
        Back to Course Editor
      </Link>

      {/* Page title */}
      <h1 className="mb-8 text-3xl font-bold">Analytics</h1>

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
