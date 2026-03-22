import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Check } from "lucide-react";
import { BOARD_THEMES, type BoardTheme } from "./boardThemes";

interface ThemeSelectorProps {
  currentTheme: string;
  animationsEnabled: boolean;
  onThemeChange: (id: string) => void;
  onAnimationsToggle: (v: boolean) => void;
}

export function ThemeSelector({
  currentTheme,
  animationsEnabled,
  onThemeChange,
  onAnimationsToggle,
}: ThemeSelectorProps) {
  const [open, setOpen] = useState(false);
  const active = BOARD_THEMES.find(t => t.id === currentTheme) || BOARD_THEMES[0];

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium backdrop-blur-xl border border-white/20 shadow-lg transition-all"
        style={{ background: "rgba(0,0,0,0.30)", color: "rgba(255,255,255,0.85)" }}
        aria-label="Change theme"
      >
        <Palette className="w-3.5 h-3.5" />
        <span className="hidden sm:inline text-xs">{active.emoji} {active.name}</span>
        <span className="sm:hidden text-base">{active.emoji}</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="absolute right-0 top-10 z-50 w-72 rounded-2xl border border-white/10 backdrop-blur-2xl shadow-2xl p-3"
              style={{ background: "rgba(10,10,18,0.88)" }}
            >
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2.5 px-1">
                Choose Theme
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {BOARD_THEMES.map(theme => (
                  <ThemeCard
                    key={theme.id}
                    theme={theme}
                    active={currentTheme === theme.id}
                    onSelect={() => { onThemeChange(theme.id); setOpen(false); }}
                  />
                ))}
              </div>

              {/* Animations toggle */}
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between px-1">
                <span className="text-xs text-white/55">Animations</span>
                <button
                  onClick={() => onAnimationsToggle(!animationsEnabled)}
                  className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                    animationsEnabled ? "bg-white/25" : "bg-white/10"
                  }`}
                >
                  <motion.span
                    animate={{ x: animationsEnabled ? 18 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 block w-4 h-4 rounded-full bg-white/80 shadow"
                  />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ThemeCard({ theme, active, onSelect }: { theme: BoardTheme; active: boolean; onSelect: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onSelect}
      className={`relative flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all border ${
        active
          ? "border-white/30 bg-white/15"
          : "border-white/8 bg-white/5 hover:bg-white/10"
      }`}
    >
      {/* Swatch */}
      <span className={`w-6 h-6 rounded-lg bg-gradient-to-br ${theme.swatch} shrink-0`} />
      <span className="text-xs text-white/80 leading-tight line-clamp-2">{theme.name}</span>
      {active && (
        <span className="absolute top-1.5 right-1.5">
          <Check className="w-3 h-3 text-white/80" />
        </span>
      )}
    </motion.button>
  );
}
