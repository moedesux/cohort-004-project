import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";

type Tone = "blue" | "green" | "purple" | "amber";

const tones: Record<Tone, { tile: string; icon: string }> = {
  blue: { tile: "bg-blue-50 dark:bg-blue-900/30", icon: "text-blue-600 dark:text-blue-400" },
  green: { tile: "bg-green-50 dark:bg-green-900/30", icon: "text-green-600 dark:text-green-400" },
  purple: { tile: "bg-purple-50 dark:bg-purple-900/30", icon: "text-purple-600 dark:text-purple-400" },
  amber: { tile: "bg-amber-50 dark:bg-amber-900/30", icon: "text-amber-600 dark:text-amber-400" },
};

interface StatCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  tone?: Tone;
}

export function StatCard({ icon: Icon, value, label, tone = "blue" }: StatCardProps) {
  const t = tones[tone];
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg", t.tile)}>
          <Icon className={cn("size-5", t.icon)} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
