import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ShieldCheck, Clock, ChevronDown } from "lucide-react";
import { useStandby } from "@/hooks/useStandby";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const DURATION_OPTIONS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "Until I turn off", minutes: 0 },
];

interface StandbyToggleProps {
  /** Compact mode for header bars */
  compact?: boolean;
  /** Dark theme (for Board header) */
  dark?: boolean;
}

export function StandbyToggle({ compact = false, dark = false }: StandbyToggleProps) {
  const { user } = useAuth();
  const { isOnStandby, expiresAt, loading, toggleStandby } = useStandby();
  const { toast } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!user) return null;

  const handleToggle = () => {
    if (isOnStandby) {
      toggleStandby();
      toast({ title: "Standby mode off", description: "You won't receive urgent prayer alerts." });
    } else {
      setPickerOpen(v => !v);
    }
  };

  const selectDuration = (minutes: number) => {
    setPickerOpen(false);
    toggleStandby(minutes || undefined);
    const label = minutes ? `${minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`}` : "indefinitely";
    toast({
      title: "🙏 You're on standby!",
      description: `Available to pray ${label}. You'll be notified of urgent requests.`,
    });
  };

  const timeLeft = expiresAt
    ? Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000))
    : null;

  if (compact) {
    return (
      <div className="relative">
        <motion.button
          onClick={handleToggle}
          disabled={loading}
          whileTap={{ scale: 0.92 }}
          className={`relative flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm ${
            isOnStandby
              ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
              : "bg-white/60 backdrop-blur-sm text-slate-700 border border-slate-300/80 hover:bg-white"
          }`}
        >
          {isOnStandby ? (
            <>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </motion.div>
              <span className="hidden sm:inline">On Standby</span>
              {timeLeft !== null && timeLeft > 0 && (
                <span className="text-[10px] opacity-70">{timeLeft}m</span>
              )}
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 text-slate-700" />
              <span className="hidden sm:inline">Standby</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-700" />
            </>
          )}

          {/* Pulse ring when active */}
          {isOnStandby && (
            <motion.span
              className="absolute inset-0 rounded-full border border-emerald-400"
              animate={{ opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
          )}
          )}
        </motion.button>

        {/* Duration picker dropdown */}
        <AnimatePresence>
          {pickerOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-2 right-0 z-50 rounded-2xl border shadow-lg overflow-hidden"
              style={{
                background: dark ? "hsl(220 30% 12%)" : "hsl(0 0% 100%)",
                borderColor: dark ? "hsl(220 20% 20%)" : "hsl(38 22% 88%)",
                minWidth: 180,
              }}
            >
              <div className="p-2 space-y-0.5">
                <p className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-semibold opacity-40"
                  style={{ color: dark ? "hsl(38 28% 80%)" : "hsl(25 18% 40%)" }}>
                  How long?
                </p>
                {DURATION_OPTIONS.map(opt => (
                  <button
                    key={opt.minutes}
                    onClick={() => selectDuration(opt.minutes)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      color: dark ? "hsl(38 28% 85%)" : "hsl(25 28% 28%)",
                      background: "transparent",
                    }}
                    onMouseEnter={e => {
                      (e.target as HTMLElement).style.background = dark
                        ? "rgba(255,255,255,0.06)"
                        : "hsl(42 80% 96%)";
                    }}
                    onMouseLeave={e => {
                      (e.target as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <Clock className="w-3.5 h-3.5 opacity-50" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full-size toggle (for profile or dedicated section)
  return (
    <div className="relative">
      <motion.button
        onClick={handleToggle}
        disabled={loading}
        whileTap={{ scale: 0.95 }}
        className="relative flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-medium transition-all"
        style={{
          background: isOnStandby ? "hsl(150 40% 92%)" : "hsl(38 60% 97%)",
          color: isOnStandby ? "hsl(150 45% 28%)" : "hsl(25 18% 45%)",
          border: `2px solid ${isOnStandby ? "hsl(150 38% 65%)" : "hsl(38 22% 88%)"}`,
          boxShadow: isOnStandby ? "0 4px 20px -4px hsl(150 45% 45% / 0.2)" : "none",
        }}
      >
        {isOnStandby ? (
          <ShieldCheck className="w-5 h-5" />
        ) : (
          <Shield className="w-5 h-5" />
        )}
        <span>{isOnStandby ? "On Standby — Available to Pray" : "Go On Standby"}</span>
        {!isOnStandby && <ChevronDown className="w-4 h-4 opacity-50" />}
        {timeLeft !== null && timeLeft > 0 && (
          <span className="text-xs opacity-60 ml-1">({timeLeft}m left)</span>
        )}
      </motion.button>

      {/* Duration picker */}
      <AnimatePresence>
        {pickerOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 z-50 rounded-2xl border shadow-xl overflow-hidden"
            style={{
              background: "hsl(0 0% 100%)",
              borderColor: "hsl(38 22% 88%)",
              minWidth: 200,
            }}
          >
            <div className="p-2 space-y-0.5">
              <p className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-semibold"
                style={{ color: "hsl(25 18% 60%)" }}>
                How long will you pray?
              </p>
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.minutes}
                  onClick={() => selectDuration(opt.minutes)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-accent/50 transition-all"
                  style={{ color: "hsl(25 28% 28%)" }}
                >
                  <Clock className="w-4 h-4 opacity-40" />
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
