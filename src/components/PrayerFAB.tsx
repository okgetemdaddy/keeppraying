import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Heart, HandHeart, X, Plus } from "lucide-react";

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

  const items: FABItem[] = [
    {
      id: "community",
      label: "Ask the Community to Pray for Me",
      icon: <Heart className="w-4.5 h-4.5" />,
      onClick: () => {
        if (!user) { navigate("/auth"); return; }
        onAskCommunity();
        setOpen(false);
      },
      color: "hsl(150 38% 26%)",
    },
    {
      id: "team",
      label: "Ask KeepPray.ing to Create a Prayer for Me",
      icon: <HandHeart className="w-4.5 h-4.5" />,
      onClick: () => {
        if (!user) { navigate("/auth"); return; }
        onAskTeam();
        setOpen(false);
      },
      color: "hsl(42 85% 46%)",
    },
    ...extraItems,
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col-reverse items-end gap-3">
      {/* Menu items */}
      <AnimatePresence>
        {open && items.map((item, i) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.85 }}
            transition={{ delay: i * 0.06, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={item.onClick}
            className="flex items-center gap-3 group"
          >
            {/* Label pill */}
            <motion.span
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ delay: i * 0.06 + 0.08 }}
              className="px-3.5 py-2 rounded-xl text-xs font-medium shadow-lg whitespace-nowrap max-w-[260px]"
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
              className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
              style={{
                background: item.color,
                color: "white",
                boxShadow: `0 4px 16px -4px ${item.color}80`,
              }}
            >
              {item.icon}
            </div>
          </motion.button>
        ))}
      </AnimatePresence>

      {/* Main FAB button — 2.5D style */}
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
            style={{ background: "hsl(25 35% 14% / 0.15)" }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
