import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Check, Loader2 } from "lucide-react";
import type { Mood, CompanionCheckin } from "@/hooks/useCompanions";

const MOODS: { value: Mood; emoji: string; label: string; desc: string }[] = [
  { value: "thriving", emoji: "🌟", label: "Thriving", desc: "God's presence feels close" },
  { value: "steady", emoji: "🕊️", label: "Steady", desc: "Walking faithfully day by day" },
  { value: "struggling", emoji: "🤲", label: "Struggling", desc: "In need of prayer and grace" },
];

interface CheckInCardProps {
  hasCheckedIn: boolean;
  myCheckin: CompanionCheckin | undefined;
  onSubmit: (mood: Mood, shareText?: string, isShared?: boolean) => Promise<any>;
}

export default function CheckInCard({ hasCheckedIn, myCheckin, onSubmit }: CheckInCardProps) {
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [shareText, setShareText] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleMoodSelect = (mood: Mood) => {
    setSelectedMood(mood);
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleSubmit = async () => {
    if (!selectedMood) return;
    setSubmitting(true);
    await onSubmit(selectedMood, shareText || undefined, isShared);
    setSubmitting(false);
    setSubmitted(true);
  };

  if (hasCheckedIn || submitted) {
    const mood = myCheckin?.mood || selectedMood;
    const moodData = MOODS.find((m) => m.value === mood);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 text-center space-y-3"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.1 }}
          className="text-4xl"
        >
          {moodData?.emoji || "✨"}
        </motion.div>
        <p className="text-sm font-medium text-foreground">
          This week you're feeling <span className="text-primary font-semibold">{moodData?.label}</span>
        </p>
        <div className="flex items-center justify-center gap-1.5 text-emerald-600">
          <Check className="w-4 h-4" />
          <span className="text-xs">Check-in complete — God sees your faithfulness</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 space-y-5"
    >
      <div className="text-center space-y-1">
        <h3 className="font-display text-base font-semibold text-foreground">
          How has your prayer life been this week?
        </h3>
        <p className="text-xs text-muted-foreground">
          No pressure — just a gentle reflection between you and the Lord.
        </p>
      </div>

      {/* Mood selector */}
      <div className="flex justify-center gap-3">
        {MOODS.map((mood) => (
          <motion.button
            key={mood.value}
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => handleMoodSelect(mood.value)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all min-w-[90px] ${
              selectedMood === mood.value
                ? "border-primary bg-primary/8 shadow-md"
                : "border-transparent bg-muted/40 hover:bg-muted/60"
            }`}
          >
            <motion.span
              className="text-3xl"
              animate={selectedMood === mood.value ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {mood.emoji}
            </motion.span>
            <span className="text-xs font-medium text-foreground">{mood.label}</span>
            <span className="text-[10px] text-muted-foreground leading-tight">{mood.desc}</span>
          </motion.button>
        ))}
      </div>

      {/* Optional share */}
      <AnimatePresence>
        {selectedMood && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <Textarea
              placeholder="Share a word of encouragement or a prayer request… (optional)"
              value={shareText}
              onChange={(e) => setShareText(e.target.value)}
              className="rounded-xl text-sm resize-none bg-muted/30 border-border/50"
              rows={2}
              maxLength={280}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={isShared}
                  onCheckedChange={setIsShared}
                  className="scale-90"
                />
                <span className="text-xs text-muted-foreground">Share with group</span>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground gap-2 text-sm px-5"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Submit Check-in
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
