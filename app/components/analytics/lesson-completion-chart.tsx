import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LessonCompletionRate } from "~/services/analyticsService";

interface LessonCompletionTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: LessonCompletionRate }>;
}

function LessonCompletionTooltip({
  active,
  payload,
}: LessonCompletionTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-sm">
      <p className="font-medium">{point.title}</p>
      <div className="mt-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Started</span>
          <span className="ml-auto pl-4 font-medium tabular-nums">
            {point.startedCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-green-500" />
          <span className="text-muted-foreground">Completed</span>
          <span className="ml-auto pl-4 font-medium tabular-nums">
            {point.completedCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Completion rate</span>
          <span className="ml-auto pl-4 font-medium tabular-nums">
            {point.rate}%
          </span>
        </div>
      </div>
    </div>
  );
}

interface LessonCompletionChartProps {
  data: LessonCompletionRate[];
}

export function LessonCompletionChart({ data }: LessonCompletionChartProps) {
  return (
    <div className="w-full" style={{ height: Math.max(160, data.length * 48) }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            vertical={true}
            horizontal={false}
            stroke="rgba(148,163,184,0.25)"
          />
          <XAxis
            type="number"
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(value: number) => `${value}%`}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="title"
            width={160}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Bar
            dataKey="rate"
            fill="#10b981"
            radius={[0, 4, 4, 0]}
            maxBarSize={28}
          />
          <Tooltip
            cursor={{ fill: "rgba(148,163,184,0.1)" }}
            content={<LessonCompletionTooltip />}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
