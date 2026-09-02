import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EnrollmentTimelinePoint } from "~/services/analyticsService";
import { formatCurrency } from "~/lib/utils";

const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

// Every monthly bucket date ends in "-01". Daily buckets can too (e.g.
// "2026-03-01"), so granularity is detected once per chart from the shape
// of the whole series, not per point.
function isMonthlySeries(data: EnrollmentTimelinePoint[]): boolean {
  return data.length > 1 && data.every((point) => point.date.endsWith("-01"));
}

function parseUtcDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function formatAxisLabel(date: string, monthly: boolean): string {
  return parseUtcDate(date).toLocaleDateString("en-US", {
    month: "short",
    day: monthly ? undefined : "numeric",
    year: monthly ? "numeric" : undefined,
    timeZone: "UTC",
  });
}

function formatFullDate(date: string, monthly: boolean): string {
  return parseUtcDate(date).toLocaleDateString("en-US", {
    month: "long",
    day: monthly ? undefined : "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

interface TimelineTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: EnrollmentTimelinePoint }>;
  monthly: boolean;
}

function TimelineTooltip({ active, payload, monthly }: TimelineTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-sm">
      <p className="font-medium">{formatFullDate(point.date, monthly)}</p>
      <div className="mt-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Revenue</span>
          <span className="ml-auto pl-4 font-medium tabular-nums">
            {formatCurrency(point.revenue)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-slate-400" />
          <span className="text-muted-foreground">Enrollments</span>
          <span className="ml-auto pl-4 font-medium tabular-nums">
            {point.enrollments}
          </span>
        </div>
      </div>
    </div>
  );
}

interface RevenueTimelineChartProps {
  data: EnrollmentTimelinePoint[];
}

export function RevenueTimelineChart({ data }: RevenueTimelineChartProps) {
  const monthly = isMonthlySeries(data);

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid
            vertical={false}
            stroke="rgba(148,163,184,0.25)"
          />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => formatAxisLabel(value, monthly)}
            minTickGap={32}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={(value: number) => compactCurrency.format(value)}
            width={64}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            allowDecimals={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Bar
            yAxisId="right"
            dataKey="enrollments"
            fill="#94a3b8"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="revenue"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Tooltip
            cursor={{ fill: "rgba(148,163,184,0.1)" }}
            content={<TimelineTooltip monthly={monthly} />}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
