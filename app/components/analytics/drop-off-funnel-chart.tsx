import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LessonDropOffPoint } from "~/services/analyticsService";

interface DropOffTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: LessonDropOffPoint }>;
}

function DropOffTooltip({ active, payload }: DropOffTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-sm">
      <p className="font-medium">{point.title}</p>
      <div className="mt-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Students started</span>
          <span className="ml-auto pl-4 font-medium tabular-nums">
            {point.startedCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-slate-400" />
          <span className="text-muted-foreground">Of widest lesson</span>
          <span className="ml-auto pl-4 font-medium tabular-nums">
            {point.rate}%
          </span>
        </div>
      </div>
    </div>
  );
}

interface DropOffFunnelChartProps {
  data: LessonDropOffPoint[];
}

export function DropOffFunnelChart({ data }: DropOffFunnelChartProps) {
  return (
    <div
      className="w-full"
      style={{ height: Math.max(160, data.length * 48) }}
    >
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
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="title"
            width={160}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Bar
            dataKey="startedCount"
            fill="#3b82f6"
            radius={[0, 4, 4, 0]}
            maxBarSize={28}
          />
          <Tooltip
            cursor={{ fill: "rgba(148,163,184,0.1)" }}
            content={<DropOffTooltip />}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
