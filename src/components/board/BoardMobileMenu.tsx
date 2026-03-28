import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Menu, X, Users, Home, PlusCircle, ListMusic, BookOpen, Mic } from "lucide-react";
import { ThemeSelector } from "./ThemeSelector";
import { StandbyToggle } from "@/components/StandbyToggle";

interface BoardMobileMenuProps {
  prefs: { theme: string; animations_enabled: boolean };
  savePrefs: (u: Record<string, unknown>) => void;
  hasPrayers: boolean;
  onAddPrayer: () => void;
  onOpenPlaylist: () => void;
  onOpenClassical: () => void;
  onVoiceRecord: () => void;
}

const menuItems = [
  { id: "circles", label: "Circles", icon: Users, href: "/circles" },
  { id: "family", label: "Family", icon: Home, href: "/family" },
];

const actionItems = [
  { id: "add", label: "Add Prayer", icon: PlusCircle, action: "addPrayer" },
  { id: "playlist", label: "Add Playlist", icon: ListMusic, action: "openPlaylist", needsPrayers: true },
  { id: "classical", label: "Classical Prayers", icon: BookOpen, action: "openClassical" },
  { id: "voice", label: "Voice Prayer", icon: Mic, action: "voiceRecord" },
] as const;

export function BoardMobileMenu({
  prefs,
  savePrefs,
  hasPrayers,
  onAddPrayer,
  onOpenPlaylist,
  onOpenClassical,
  onVoiceRecord,
}: BoardMobileMenuProps) {
  const [open, setOpen] = useState(false);

  const handleAction = (action: string) => {
    setOpen(false);
    setTimeout(() => {
      if (action === "addPrayer") onAddPrayer();
      if (action === "openPlaylist") onOpenPlaylist();
      if (action === "openClassical") onOpenClassical();
      if (action === "voiceRecord") onVoiceRecord();
    }, 150);
  };

  return (
    <>
      {/* Hamburger trigger */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        className="md:hidden p-2 rounded-xl text-white/80 hover:bg-white/10 transition-colors"
        aria-label="Open board menu"
      >
        <Menu className="w-6 h-6" />
      </motion.button>

      {/* Full-screen overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Blurred backdrop */}
            <motion.div
              className="absolute inset-0"
              style={{ background: "rgba(8, 6, 18, 0.88)", backdropFilter: "blur(32px)" }}
              onClick={() => setOpen(false)}
            />

            {/* Mat content — unrolls from top */}
            <motion.div
              className="relative z-10 flex flex-col min-h-screen px-6 pt-6 pb-10"
              initial={{ scaleY: 0, originY: 0 }}
              animate={{ scaleY: 1 }}
              exit={{ scaleY: 0 }}
              transition={{ type: "spring", stiffness: 180, damping: 22 }}
              style={{ transformOrigin: "top center" }}
            >
              {/* Close button */}
              <div className="flex justify-end mb-8">
                <motion.button
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>

              {/* Theme & Standby row */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, type: "spring", stiffness: 260, damping: 20 }}
                className="flex items-center gap-3 mb-8"
              >
                <ThemeSelector
                  currentTheme={prefs.theme}
                  animationsEnabled={prefs.animations_enabled}
                  onThemeChange={(id) => { savePrefs({ theme: id }); }}
                  onAnimationsToggle={(v) => { savePrefs({ animations_enabled: v }); }}
                />
                <StandbyToggle compact dark />
              </motion.div>

              {/* Divider */}
              <div className="border-t border-white/8 mb-6" />

              {/* Navigation links */}
              {menuItems.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05, type: "spring", stiffness: 260, damping: 20 }}
                >
                  <Link
                    to={item.href}
                    state={{ from: "board" }}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-4 px-4 py-4 rounded-2xl text-white/80 hover:text-white hover:bg-white/8 transition-all"
                  >
                    <item.icon className="w-5 h-5 text-white/50" />
                    <span className="text-base font-medium">{item.label}</span>
                  </Link>
                </motion.div>
              ))}

              {/* Divider */}
              <div className="border-t border-white/8 my-4" />

              {/* Action items */}
              {actionItems.map((item, i) => {
                if (item.needsPrayers && !hasPrayers) return null;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.2 + i * 0.05,
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                    }}
                  >
                    <button
                      onClick={() => handleAction(item.action)}
                      className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-white/80 hover:text-white hover:bg-white/8 transition-all text-left"
                    >
                      <item.icon className={`w-5 h-5 ${item.id === "add" ? "text-amber-400/80" : "text-white/50"}`} />
                      <span className="text-base font-medium">{item.label}</span>
                    </button>
                  </motion.div>
                );
              })}

              {/* Ripple landing effect */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.15, 0] }}
                transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                style={{
                  background: "radial-gradient(ellipse at center bottom, rgba(255,215,0,0.12), transparent 70%)",
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
