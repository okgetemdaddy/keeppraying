import { useState } from "react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import InviteShareModal from "@/components/InviteShareModal";
import type { SermonPlan, SermonPlanMember } from "@/hooks/useSermonPlans";
import {
  Bell, BellOff, Heart, Users, Calendar, CheckCircle2,
  Share2, Church, Sparkles,
} from "lucide-react";

interface WeekOfPrayerPanelProps {
  plan: SermonPlan;
  membership: SermonPlanMember;
  onToggle: (planId: string, accountability: boolean, encouragement: boolean) => void;
  onMarkDay: (planId: string, day: string) => void;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function WeekOfPrayerPanel({ plan, membership, onToggle, onMarkDay }: WeekOfPrayerPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);

  const completedCount = DAYS.filter((d) => membership.completed_days?.[d]).length;
  const progressPercent = Math.round((completedCount / DAYS.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="prayer-card rounded-2xl p-5 space-y-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Church className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground leading-snug">
              Week of Prayer
            </h3>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{plan.sermon_title}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setInviteOpen(true)}
          className="rounded-xl gap-1.5 text-xs flex-shrink-0"
        >
          <Share2 className="w-3.5 h-3.5" />
          Invite
        </Button>
      </div>

      {/* Progress ring */}
      <div className="flex items-center gap-4">
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="24" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
            <circle
              cx="28" cy="28" r="24" fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 24}`}
              strokeDashoffset={`${2 * Math.PI * 24 * (1 - progressPercent / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
            {completedCount}/{DAYS.length}
          </span>
        </div>
        <div className="space-y-1 flex-1">
          <p className="text-sm font-medium text-foreground">Daily Progress</p>
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
        </div>
      </div>

      {/* Toggles section */}
      <div className="space-y-3 pt-2 border-t border-border/50">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          My Preferences
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {membership.accountability_enabled ? (
              <Bell className="w-4 h-4 text-primary" />
            ) : (
              <BellOff className="w-4 h-4 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">Daily Accountability</p>
              <p className="text-[10px] text-muted-foreground">Reminders to complete your daily prayer</p>
            </div>
          </div>
          <Switch
            checked={membership.accountability_enabled}
            onCheckedChange={(checked) => {
              onToggle(plan.id, checked, membership.encouragement_enabled);
              toast({
                title: checked ? "Accountability reminders enabled 🔔" : "Accountability reminders turned off",
                description: checked
                  ? "You'll receive daily nudges to stay faithful."
                  : "You won't receive daily reminders for this plan.",
              });
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className={`w-4 h-4 ${membership.encouragement_enabled ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <p className="text-sm font-medium text-foreground">Encouragement</p>
              <p className="text-[10px] text-muted-foreground">Receive words of encouragement from members</p>
            </div>
          </div>
          <Switch
            checked={membership.encouragement_enabled}
            onCheckedChange={(checked) => {
              onToggle(plan.id, membership.accountability_enabled, checked);
              toast({
                title: checked ? "Encouragement enabled 💛" : "Encouragement turned off",
                description: checked
                  ? "Group members can send you encouraging messages."
                  : "You won't receive encouragement messages.",
              });
            }}
          />
        </div>
      </div>

      {/* Invite modal */}
      <InviteShareModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        type="sermon_plan"
        targetId={plan.id}
        targetName={plan.sermon_title}
      />
    </motion.div>
  );
}
