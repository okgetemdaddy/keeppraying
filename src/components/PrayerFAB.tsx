import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Heart, HandHeart, X, Plus, Globe, Sparkles, Users, Home,
  Swords, Radio, BookOpen, HeartHandshake, LayoutDashboard
} from "lucide-react";

interface FABItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
}

interface PrayerFABProps {
  onAskCommunity: () => void;
  onAskTeam: () => void;
  extraItems?: FABItem[];
}

export function PrayerFAB({ onAskCommunity, onAskTeam, extraItems = [] }: PrayerFABProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const authGuard = (fn: () => void) => () => {
    if (!user) { navigate("/auth"); return; }
    fn();
  };

  const go = (path: string) => () => {
    navigate(path);
    setOpen(false);
  };

  const items: FABItem[] = [
    {
      id: "community",
      label: "Ask Community to Pray",
      icon: <Heart className="w-4 h-4" />,
      onClick: authGuard(() => { onAskCommunity(); setOpen(false); }),
      color: "hsl(150 38% 26%)",
    },
    {
      id: "ask-keeppraying",
      label: "Ask KeepPray.ing for a Prayer",
      icon: <HandHeart className="w-4 h-4" />,
      onClick: authGuard(() => { onAskTeam(); setOpen(false); }),
      color: "hsl(25 55% 42%)",
    },
    {
      id: "assistant",
      label: "PrayerAssist.ing",
      icon: <Sparkles className="w-4 h-4" />,
      onClick: go("/assistant"),
      color: "hsl(42 85% 46%)",
    },
    {
      id: "we-pray",
      label: "We Pray",
      icon: <Globe className="w-4 h-4" />,
      onClick: go("/we-pray"),
      color: "hsl(210 55% 45%)",
    },
    {
      id: "circles",
      label: "Circles",
      icon: <Users className="w-4 h-4" />,
      onClick: go("/circles"),
      color: "hsl(150 38% 32%)",
    },
    {
      id: "family",
      label: "Family Rooms",
      icon: <Home className="w-4 h-4" />,
      onClick: go("/family"),
      color: "hsl(25 60% 45%)",
    },
    {
      id: "war-room",
      label: "KeepFight.ing",
      icon: <Swords className="w-4 h-4" />,
      onClick: go("/war-room"),
      color: "hsl(0 45% 38%)",
    },
    {
      id: "sermon",
      label: "Sermon Mode",
      icon: <Radio className="w-4 h-4" />,
      onClick: go("/sermon-sync"),
      color: "hsl(260 40% 45%)",
    },
    {
      id: "grow",
      label: "KeepGrow.ing",
      icon: <BookOpen className="w-4 h-4" />,
      onClick: go("/blog"),
      color: "hsl(150 30% 40%)",
    },
    {
      id: "support",
      label: "Support Us",
      icon: <HeartHandshake className="w-4 h-4" />,
      onClick: go("/support"),
      color: "hsl(42 70% 42%)",
    },
    ...extraItems,
  ];

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[60] flex flex-col-reverse items-end gap-2.5">
      {/* Menu items */}
      <AnimatePresence>
        {open && items.map((item, i) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 16, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.88 }}
            transition={{ delay: i * 0.04, duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={item.onClick}
            className="flex items-center gap-2.5 group"
          >
            {/* Label pill */}
            <motion.span
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ delay: i * 0.04 + 0.06 }}
              className="px-3 py-1.5 rounded-xl text-xs font-medium shadow-lg whitespace-nowrap"
              style={{
                background: "hsl(38 60% 97%)",
                color: "hsl(25 35% 14%)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              {item.label}
            </motion.span>
            {/* Circle icon */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
              style={{
                background: item.color,
                color: "white",
                boxShadow: `0 3px 12px -3px ${item.color}80`,
              }}
            >
              {item.icon}
            </div>
          </motion.button>
        ))}
      </AnimatePresence>

      {/* Main FAB button — 2.5D */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileTap={{ scale: 0.92 }}
        className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl focus:outline-none"
        style={{
          background: "linear-gradient(145deg, hsl(42 85% 52%), hsl(35 82% 44%))",
          boxShadow: open
            ? "0 2px 8px -2px hsl(42 85% 46% / 0.4)"
            : "0 6px 24px -6px hsl(42 85% 46% / 0.55), 0 2px 6px -1px hsl(25 35% 14% / 0.12), inset 0 1px 0 0 hsl(42 85% 65% / 0.5)",
        }}
      >
        {/* 2.5D top highlight */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: "linear-gradient(180deg, hsl(42 80% 70% / 0.35) 0%, transparent 50%)",
          }}
        />
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {open ? (
            <X className="w-6 h-6 text-white relative z-10" />
          ) : (
            <Plus className="w-6 h-6 text-white relative z-10" />
          )}
        </motion.div>
      </motion.button>

      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[-1]"
            style={{ background: "hsl(25 35% 14% / 0.18)" }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
