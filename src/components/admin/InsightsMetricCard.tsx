import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface InsightsMetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: number | null; // positive = up, negative = down
  icon: LucideIcon;
  delay?: number;
}

export default function InsightsMetricCard({ label, value, sub, trend, icon: Icon, delay = 0 }: InsightsMetricCardProps) {
  const trendColor = trend === null || trend === undefined ? "" : trend > 0 ? "text-emerald-500" : trend < 0 ? "text-destructive" : "text-muted-foreground";
  const trendLabel = trend === null || trend === undefined ? "" : `${trend > 0 ? "+" : ""}${trend}% vs last week`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="prayer-card p-5 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <div className="font-display text-3xl font-bold text-foreground">{value}</div>
      {(sub || trendLabel) && (
        <div className="flex items-center gap-2 text-xs">
          {trendLabel && <span className={trendColor}>{trendLabel}</span>}
          {sub && <span className="text-muted-foreground">{sub}</span>}
        </div>
      )}
    </motion.div>
  );
}
