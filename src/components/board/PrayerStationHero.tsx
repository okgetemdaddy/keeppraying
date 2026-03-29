import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StandbyToggle } from "@/components/StandbyToggle";
import {
  PlusCircle, Users, Home, ListMusic, BookOpen, Wind, Search, X, Lamp,
} from "lucide-react";

/* ── Incense smoke keyframes (pure CSS) ────────────────────────────────────── */
const smokeStyles = `
@keyframes incense-rise-1 {
  0%   { transform: translateY(0) translateX(0) scaleX(1); opacity: 0; }
  10%  { opacity: 0.18; }
  50%  { transform: translateY(-45vh) translateX(12px) scaleX(1.3); opacity: 0.10; }
  100% { transform: translateY(-90vh) translateX(-8px) scaleX(0.6); opacity: 0; }
}
@keyframes incense-rise-2 {
  0%   { transform: translateY(0) translateX(0) scaleX(1); opacity: 0; }
  12%  { opacity: 0.14; }
  55%  { transform: translateY(-50vh) translateX(-14px) scaleX(1.4); opacity: 0.08; }
  100% { transform: translateY(-95vh) translateX(6px) scaleX(0.5); opacity: 0; }
}
@keyframes incense-rise-3 {
  0%   { transform: translateY(0) translateX(0) scaleX(1); opacity: 0; }
  8%   { opacity: 0.12; }
  48%  { transform: translateY(-40vh) translateX(8px) scaleX(1.2); opacity: 0.06; }
  100% { transform: translateY(-85vh) translateX(-10px) scaleX(0.7); opacity: 0; }
}
`;

interface PrayerStationHeroProps {
  firstName: string;
  onAddPrayer: () => void;
  onPlaylist: () => void;
  onClassical: () => void;
  hasPrayers: boolean;
  isMobile: boolean;
  /* Search */
  searchQuery: string;
  onSearchChange: (q: string) => void;
  /* Theme Sanctuary */
  onOpenThemeSanctuary: () => void;
}

export function PrayerStationHero({
  firstName,
  onAddPrayer,
  onPlaylist,
  onClassical,
  hasPrayers,
  isMobile,
  searchQuery,
  onSearchChange,
  onOpenThemeSanctuary,
}: PrayerStationHeroProps) {
  const { user } = useAuth();
  const [welcomeMsg, setWelcomeMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.functions.invoke("daily-welcome", {
          body: {},
        });
        if (!cancelled && data?.message) {
          setWelcomeMsg(data.message);
        }
      } catch {
        // silent — hero still works without message
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  const actions = useMemo(() => {
    const items = [
      { id: "add", label: "Add Prayer", icon: PlusCircle, onClick: onAddPrayer, highlight: true },
      { id: "circles", label: "Circles", icon: Users, href: "/circles", state: { from: "board" } },
      { id: "family", label: "Family", icon: Home, href: "/family", state: { from: "board" } },
      { id: "breathe", label: "Breathe", icon: Wind, href: "/breathe" },
      { id: "classical", label: "Classical", icon: BookOpen, onClick: onClassical },
    ];
    if (hasPrayers) {
      items.splice(1, 0, { id: "playlist", label: "Playlist", icon: ListMusic, onClick: onPlaylist, highlight: false } as any);
    }
    return items;
  }, [onAddPrayer, onPlaylist, onClassical, hasPrayers]);

  return (
    <>
      <style>{smokeStyles}</style>
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, hsl(215 28% 12%) 0%, hsl(220 25% 8%) 100%)",
        }}
      >
        {/* Incense smoke tendrils */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="absolute bottom-0 rounded-full"
              style={{
                left: `${15 + i * 14}%`,
                width: `${2 + (i % 2)}px`,
                height: "60vh",
                background: `linear-gradient(to top, rgba(255,255,255,0.12), rgba(255,255,255,0.03), transparent)`,
                filter: "blur(6px)",
                animation: `incense-rise-${((i - 1) % 3) + 1} ${12 + i * 2}s ease-in-out infinite`,
                animationDelay: `${i * 1.5}s`,
              }}
            />
          ))}
        </div>

        {/* Theme picker — top right */}
        <div className="absolute top-3 right-3 z-20">
          <ThemeSelector
            currentTheme={currentTheme}
            animationsEnabled={animationsEnabled}
            onThemeChange={onThemeChange}
            onAnimationsToggle={onAnimationsToggle}
          />
        </div>

        <div className={`relative z-10 ${isMobile ? "px-5 pt-5 pb-4" : "container mx-auto px-6 pt-8 pb-6"}`}>
          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`font-display font-bold text-white ${isMobile ? "text-2xl pr-12" : "text-3xl"}`}
          >
            {firstName}'s Prayer Station
          </motion.h1>

          {/* Standby toggle with label */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-3 flex items-center gap-3"
          >
            <StandbyToggle compact dark />
            <span className="text-xs leading-tight" style={{ color: "rgba(255,255,255,0.50)", maxWidth: 260 }}>
              Are you available to pray for live prayer requests today?
            </span>
          </motion.div>

          {/* Daily welcome message */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: welcomeMsg ? 1 : 0.4 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`mt-3 leading-relaxed ${isMobile ? "text-sm" : "text-base"}`}
            style={{ color: "rgba(255,255,255,0.65)", maxWidth: 520 }}
          >
            {welcomeMsg || "The Lord is near to all who call on Him…"}
          </motion.p>

          {/* Action buttons — 2 rows × 3 columns */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className={`mt-4 ${isMobile ? "grid grid-cols-3 gap-2" : "flex flex-wrap gap-2"}`}
          >
            {actions.map((action) => {
              const Icon = action.icon;
              const isHighlight = (action as any).highlight;
              const inner = (
                <div
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium transition-all active:scale-95 ${isMobile ? "w-full" : "px-4"}`}
                  style={
                    isHighlight
                      ? { background: "hsl(42 85% 46%)", color: "hsl(220 25% 10%)" }
                      : { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {action.label}
                </div>
              );

              if ((action as any).href) {
                return (
                  <Link key={action.id} to={(action as any).href} state={(action as any).state}>
                    {inner}
                  </Link>
                );
              }
              return (
                <button key={action.id} onClick={(action as any).onClick} className={isMobile ? "w-full" : ""}>
                  {inner}
                </button>
              );
            })}
          </motion.div>

          {/* Search bar — bottom of hero */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.45 }}
            className="mt-4"
          >
            <div
              className="relative flex items-center rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(12px)",
              }}
            >
              <Search className="w-4 h-4 ml-4 shrink-0" style={{ color: "rgba(255,255,255,0.35)" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="Search your prayers, groups, events..."
                className="flex-1 bg-transparent border-0 outline-none px-3 py-3 text-sm placeholder:text-white/40"
                style={{ color: "rgba(255,255,255,0.85)" }}
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="p-2 mr-1 rounded-full transition-colors hover:bg-white/10"
                >
                  <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.45)" }} />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
