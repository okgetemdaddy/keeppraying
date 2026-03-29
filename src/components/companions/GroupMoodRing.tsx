import { motion } from "framer-motion";

interface MoodCounts {
  thriving: number;
  steady: number;
  struggling: number;
  total: number;
}

interface SharedMessage {
  id: string;
  share_text: string | null;
  mood: string;
}

interface GroupMoodRingProps {
  moodCounts: MoodCounts;
  sharedMessages: SharedMessage[];
}

const MOOD_COLORS = {
  thriving: "hsl(42 85% 46%)", // gold
  steady: "hsl(210 55% 70%)", // soft blue
  struggling: "hsl(350 50% 65%)", // muted rose
};

const MOOD_EMOJIS = {
  thriving: "🌟",
  steady: "🕊️",
  struggling: "🤲",
};

export default function GroupMoodRing({ moodCounts, sharedMessages }: GroupMoodRingProps) {
  const { thriving, steady, struggling, total } = moodCounts;

  if (total === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 text-center"
      >
        <p className="text-sm text-muted-foreground">
          No check-ins yet this week. Be the first to share how you're doing.
        </p>
      </motion.div>
    );
  }

  // SVG donut chart
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const segments = [
    { count: thriving, color: MOOD_COLORS.thriving, label: "Thriving", emoji: "🌟" },
    { count: steady, color: MOOD_COLORS.steady, label: "Steady", emoji: "🕊️" },
    { count: struggling, color: MOOD_COLORS.struggling, label: "Struggling", emoji: "🤲" },
  ].filter((s) => s.count > 0);

  let offset = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 space-y-4"
    >
      <h4 className="font-display text-sm font-semibold text-foreground text-center">
        Group Mood This Week
      </h4>

      <div className="flex items-center justify-center gap-6">
        {/* Ring */}
        <div className="relative w-[130px] h-[130px]">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            {segments.map((seg, i) => {
              const segLength = (seg.count / total) * circumference;
              const dashOffset = circumference - offset;
              offset += segLength;
              return (
                <motion.circle
                  key={seg.label}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="12"
                  strokeDasharray={`${segLength} ${circumference - segLength}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.2 }}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground">{total}</span>
            <span className="text-[10px] text-muted-foreground">check-ins</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="text-foreground font-medium">
                {seg.emoji} {seg.count} {seg.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Shared messages */}
      {sharedMessages.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Shared reflections</p>
          {sharedMessages.slice(0, 5).map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-2 p-2.5 rounded-xl bg-muted/30"
            >
              <span className="text-sm mt-0.5">{MOOD_EMOJIS[msg.mood as keyof typeof MOOD_EMOJIS] || "✨"}</span>
              <p className="text-xs text-muted-foreground leading-relaxed">{msg.share_text}</p>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
