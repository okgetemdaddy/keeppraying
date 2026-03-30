import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import type { SermonPlan, SermonPlanMember } from "@/hooks/useSermonPlans";
import { Church, CheckCircle2, Bell, BellOff, Heart } from "lucide-react";
import { Link } from "react-router-dom";

interface PlanProgressCardProps {
  plan: SermonPlan;
  membership: SermonPlanMember;
  onToggle: (planId: string, accountability: boolean, encouragement: boolean) => void;
  onMarkDay: (planId: string, day: string) => void;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function PlanProgressCard({ plan, membership, onToggle, onMarkDay }: PlanProgressCardProps) {
  const completedCount = DAYS.filter((d) => membership.completed_days?.[d]).length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="prayer-card rounded-2xl p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Church className="w-4 h-4 text-primary" />
        <Link to="/sermon-sync" className="text-sm font-display font-bold text-foreground hover:text-primary transition-colors truncate">
          {plan.sermon_title}
        </Link>
      </div>

      {/* Day chips */}
      <div className="flex flex-wrap gap-1.5">
        {DAYS.map((day) => {
          const done = !!membership.completed_days?.[day];
          return (
            <button
              key={day}
              onClick={() => { if (!done) onMarkDay(plan.id, day); }}
              disabled={done}
              className={`text-[10px] px-2 py-1 rounded-full font-medium transition-all ${
                done
                  ? "bg-primary/15 text-primary"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {done && <CheckCircle2 className="w-2.5 h-2.5 inline mr-0.5 -mt-0.5" />}
              {day.slice(0, 3)}
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground">
        {completedCount}/{DAYS.length} days complete
      </p>

      {/* Quick toggles */}
      <div className="flex items-center gap-4 pt-1 border-t border-border/40">
        <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
          {membership.accountability_enabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
          Reminders
          <Switch
            checked={membership.accountability_enabled}
            onCheckedChange={(c) => onToggle(plan.id, c, membership.encouragement_enabled)}
            className="scale-75 origin-left"
          />
        </label>
        <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
          <Heart className="w-3 h-3" />
          Encourage
          <Switch
            checked={membership.encouragement_enabled}
            onCheckedChange={(c) => onToggle(plan.id, membership.accountability_enabled, c)}
            className="scale-75 origin-left"
          />
        </label>
      </div>
    </motion.div>
  );
}
