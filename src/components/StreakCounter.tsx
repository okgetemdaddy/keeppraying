import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";
import VerseLink from "@/components/VerseLink";
import { useStreak } from "@/hooks/useStreak";

interface StreakCounterProps {
  /** For board themes with custom text color */
  textColor?: string;
  compact?: boolean;
}

const MILESTONE_LABELS: Record<number, string> = {
  7: "🔥 One week of faithfulness!",
  30: "🌟 30 days — God is glorified!",
  100: "👑 100 days — a centurion of prayer!",
  365: "✨ One year of unbroken prayer!",
};

export function StreakCounter({ textColor, compact }: StreakCounterProps) {
  const { streak, milestone, dismissMilestone } = useStreak();

  if (streak.currentStreak === 0 && !milestone) return null;

  const color = textColor || "hsl(var(--foreground))";

  return (
    <>
      {/* Streak badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl"
        style={{
          background: "rgba(255,180,50,0.15)",
          border: "1px solid rgba(255,180,50,0.25)",
        }}
      >
        <motion.div
          animate={streak.currentStreak >= 7 ? { scale: [1, 1.2, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        >
          <Flame
            className={compact ? "w-3.5 h-3.5" : "w-4 h-4"}
            style={{ color: "hsl(38 92% 50%)" }}
            fill="hsl(38 92% 50%)"
          />
        </motion.div>
        <span
          className={`font-display font-bold ${compact ? "text-xs" : "text-sm"}`}
          style={{ color }}
        >
          {streak.currentStreak}
        </span>
        {!compact && (
          <span className="text-xs" style={{ color: `${color}80` }}>
            day{streak.currentStreak !== 1 ? "s" : ""}
          </span>
        )}
      </motion.div>

      {/* Milestone celebration overlay */}
      <AnimatePresence>
        {milestone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={dismissMilestone}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              className="relative p-8 rounded-3xl text-center max-w-sm mx-4"
              style={{
                background: "linear-gradient(135deg, hsl(42 80% 15%), hsl(25 60% 10%))",
                border: "2px solid hsl(42 80% 50% / 0.4)",
                boxShadow: "0 0 80px hsl(42 80% 50% / 0.3), 0 0 160px hsl(42 80% 50% / 0.1)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Gold glow ring */}
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 rounded-3xl"
                style={{
                  background: "radial-gradient(circle, hsl(42 80% 50% / 0.15), transparent 70%)",
                }}
              />

              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: 3, duration: 0.4 }}
                className="text-5xl mb-4"
              >
                🔥
              </motion.div>

              <h2
                className="font-display text-2xl font-bold mb-2"
                style={{ color: "hsl(42 80% 70%)" }}
              >
                {milestone} Day Streak!
              </h2>

              <p className="text-sm mb-6" style={{ color: "hsl(42 30% 70%)" }}>
                {MILESTONE_LABELS[milestone] || `${milestone} days of faithful prayer!`}
              </p>

              <p className="text-xs italic" style={{ color: "hsl(42 20% 55%)" }}>
                "Pray without ceasing." — 1 Thessalonians 5:17
              </p>

              <button
                onClick={dismissMilestone}
                className="mt-5 px-6 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: "hsl(42 80% 50% / 0.2)",
                  color: "hsl(42 80% 70%)",
                  border: "1px solid hsl(42 80% 50% / 0.3)",
                }}
              >
                Amen 🙏
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
