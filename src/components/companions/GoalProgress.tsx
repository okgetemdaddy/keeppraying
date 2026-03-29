import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Target, Loader2 } from "lucide-react";
import type { CompanionGoal } from "@/hooks/useCompanions";

interface GoalProgressProps {
  goals: CompanionGoal[];
  userId: string | undefined;
  onCreateGoal: (title: string, targetCount: number) => Promise<void>;
  onIncrementGoal: (goalId: string, currentCount: number) => Promise<void>;
}

function ProgressRing({ current, target }: { current: number; target: number }) {
  const pct = Math.min(current / target, 1);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const filled = pct * circ;

  return (
    <div className="relative w-16 h-16">
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
        <motion.circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="url(#goldGrad)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ - filled}`}
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${filled} ${circ - filled}` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(42 85% 46%)" />
            <stop offset="100%" stopColor="hsl(35 82% 54%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-bold text-foreground">{current}/{target}</span>
      </div>
    </div>
  );
}

export default function GoalProgress({ goals, userId, onCreateGoal, onIncrementGoal }: GoalProgressProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("7");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    await onCreateGoal(title, parseInt(target) || 7);
    setTitle("");
    setTarget("7");
    setShowAdd(false);
    setCreating(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Prayer Goals
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdd(!showAdd)}
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-2"
          >
            <Input
              placeholder="e.g. Pray for 7 people this week"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl text-sm"
              maxLength={100}
            />
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                max="100"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="rounded-xl text-sm w-20"
                placeholder="Target"
              />
              <Button
                onClick={handleCreate}
                disabled={creating || !title.trim()}
                className="rounded-xl text-xs flex-1 bg-gradient-to-r from-primary to-primary/80"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create Goal"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {goals.length === 0 && !showAdd ? (
        <p className="text-xs text-muted-foreground text-center py-3">
          Set a gentle prayer goal to encourage one another.
        </p>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const isOwn = goal.user_id === userId;
            const isComplete = goal.current_count >= goal.target_count;
            return (
              <motion.div
                key={goal.id}
                layout
                className="flex items-center gap-3 p-2 rounded-xl bg-muted/20"
              >
                <ProgressRing current={goal.current_count} target={goal.target_count} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{goal.title}</p>
                  {isComplete && (
                    <p className="text-[10px] text-emerald-600">✨ Goal completed — praise God!</p>
                  )}
                </div>
                {isOwn && !isComplete && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onIncrementGoal(goal.id, goal.current_count)}
                    className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold hover:bg-primary/20 transition-colors"
                  >
                    +1
                  </motion.button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
