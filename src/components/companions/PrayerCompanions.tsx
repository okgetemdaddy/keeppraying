import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Handshake, Settings2 } from "lucide-react";
import { useCompanions } from "@/hooks/useCompanions";
import CheckInCard from "./CheckInCard";
import GroupMoodRing from "./GroupMoodRing";
import GoalProgress from "./GoalProgress";
import EncouragementComposer from "./EncouragementComposer";
import { useState } from "react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Member {
  user_id: string;
  profile?: { full_name?: string | null } | null;
  profiles?: { full_name?: string | null } | null;
}

interface PrayerCompanionsProps {
  groupType: "family" | "circle";
  groupId: string;
  members: Member[];
  isLeader: boolean;
  userId: string | undefined;
}

export default function PrayerCompanions({ groupType, groupId, members, isLeader, userId }: PrayerCompanionsProps) {
  const {
    settings,
    hasCheckedIn,
    myCheckin,
    moodCounts,
    sharedMessages,
    goals,
    encouragements,
    loading,
    submitCheckin,
    createGoal,
    incrementGoal,
    sendEncouragement,
    updateSettings,
  } = useCompanions(groupType, groupId);

  const [showSettings, setShowSettings] = useState(false);
  const isEnabled = settings?.enabled ?? false;

  if (loading) return null;

  // Not enabled — show CTA for leaders
  if (!isEnabled) {
    if (!isLeader) return null;
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/3 p-6 text-center space-y-3"
      >
        <Handshake className="w-8 h-8 text-primary mx-auto" />
        <h3 className="font-display text-base font-semibold text-foreground">
          Prayer Companions
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Enable gentle weekly check-ins, shared prayer goals, and encouragement notes 
          for your {groupType === "family" ? "family" : "circle"} — a sacred space to 
          walk together in faithfulness.
        </p>
        <div className="flex items-center justify-center gap-2 pt-1">
          <Switch
            checked={false}
            onCheckedChange={() => updateSettings({ enabled: true })}
          />
          <span className="text-xs font-medium text-foreground">Enable Companions</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
          <Handshake className="w-5 h-5 text-primary" />
          Prayer Companions
        </h3>
        {isLeader && (
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Leader settings */}
      {showSettings && isLeader && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Companions active</span>
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) => updateSettings({ enabled: checked })}
              className="scale-90"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Check-in day</span>
            <Select
              value={settings?.checkin_day || "Sunday"}
              onValueChange={(day) => updateSettings({ checkin_day: day })}
            >
              <SelectTrigger className="w-[120px] h-8 text-xs rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>
      )}

      {/* Check-in card */}
      <CheckInCard
        hasCheckedIn={hasCheckedIn}
        myCheckin={myCheckin}
        onSubmit={submitCheckin}
      />

      {/* Group mood ring */}
      <GroupMoodRing moodCounts={moodCounts} sharedMessages={sharedMessages} />

      {/* Goals */}
      <GoalProgress
        goals={goals}
        userId={userId}
        onCreateGoal={createGoal}
        onIncrementGoal={incrementGoal}
      />

      {/* Encouragement */}
      <EncouragementComposer
        members={members}
        userId={userId}
        encouragements={encouragements}
        onSend={sendEncouragement}
      />
    </motion.div>
  );
}
