import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Menu, X, Palette, Shield, Users, Home,
  PlusCircle, ListMusic, BookOpen, Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BoardMobileMenuProps {
  onAddPrayer: () => void;
  onPlaylist: () => void;
  onClassical: () => void;
  hasPrayers: boolean;
}

const MENU_ITEMS = [
  { id: "circles", label: "Circles", icon: Users, href: "/circles", state: { from: "board" } },
  { id: "family", label: "Family Rooms", icon: Home, href: "/family", state: { from: "board" } },
] as const;

export function BoardMobileMenu({
  onAddPrayer,
  onPlaylist,
  onClassical,
  hasPrayers,
}: BoardMobileMenuProps) {
  const [open, setOpen] = useState(false);

  // Unrolled mat animation — items cascade in with a gentle bounce
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.06,
        delayChildren: 0.12,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        when: "afterChildren",
        staggerChildren: 0.03,
        staggerDirection: -1,
        duration: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -24, scaleY: 0.7, rotateX: -15 },
    visible: {
      opacity: 1,
      y: 0,
      scaleY: 1,
      rotateX: 0,
      transition: {
        type: "spring" as const,
        stiffness: 320,
        damping: 22,
        mass: 0.8,
      },
    },
    exit: {
      opacity: 0,
      y: -16,
      scaleY: 0.85,
      transition: { duration: 0.15 },
    },
  };

  // Ripple "landing" effect
  const rippleVariants = {
    hidden: { scale: 0, opacity: 0.5 },
    visible: {
      scale: 2.5,
      opacity: 0,
      transition: { duration: 0.7, ease: "easeOut" as const, delay: 0.25 },
    },
  };

  return (
    <>
      {/* Hamburger button */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={() => setOpen(true)}
        className="p-2.5 rounded-xl transition-colors"
        style={{ color: "rgba(255,255,255,0.85)" }}
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" strokeWidth={2.5} />
      </motion.button>

      {/* Full-screen overlay menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Blurred + dimmed backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/80"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />

            {/* Landing ripple */}
            <motion.div
              className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, hsl(42 85% 46% / 0.15) 0%, transparent 70%)" }}
              variants={rippleVariants}
              initial="hidden"
              animate="visible"
            />

            {/* Menu content */}
            <div className="relative z-10 flex flex-col h-full">
              {/* Top bar — close button */}
              <div className="flex items-center justify-between px-5 h-14">
                <span className="font-display text-xl font-bold">
                  <span className="text-white">Keep</span>
                  <span className="nav-pray-glow">Pray</span>
                  <span className="text-white">.ing</span>
                </span>
                <motion.button
                  whileTap={{ scale: 0.85, rotate: 90 }}
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-xl text-white/70 hover:text-white transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>

              {/* Menu items */}
              <motion.div
                className="flex-1 flex flex-col items-center justify-center gap-2 px-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {/* Add Prayer */}
                <motion.button
                  variants={itemVariants}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { setOpen(false); onAddPrayer(); }}
                  className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-left transition-colors"
                  style={{
                    background: "linear-gradient(135deg, hsl(42 85% 46% / 0.2) 0%, hsl(42 85% 46% / 0.08) 100%)",
                    border: "1px solid hsl(42 85% 46% / 0.25)",
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(42 85% 46% / 0.2)" }}>
                    <PlusCircle className="w-5 h-5" style={{ color: "hsl(42 85% 60%)" }} />
                  </div>
                  <span className="text-base font-medium text-white">Add Prayer</span>
                </motion.button>

                {/* Playlist */}
                {hasPrayers && (
                  <motion.button
                    variants={itemVariants}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => { setOpen(false); onPlaylist(); }}
                    className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-left transition-colors"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/8">
                      <ListMusic className="w-5 h-5 text-white/70" />
                    </div>
                    <span className="text-base font-medium text-white/85">Create Playlist</span>
                  </motion.button>
                )}

                {/* Classical Prayers */}
                <motion.button
                  variants={itemVariants}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { setOpen(false); onClassical(); }}
                  className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-left transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/8">
                    <BookOpen className="w-5 h-5 text-white/70" />
                  </div>
                  <span className="text-base font-medium text-white/85">Classical Prayers</span>
                </motion.button>

                {/* Divider */}
                <motion.div variants={itemVariants} className="w-full h-px my-1" style={{ background: "rgba(255,255,255,0.08)" }} />

                {/* Circles */}
                {MENU_ITEMS.map((item) => (
                  <motion.div key={item.id} variants={itemVariants} className="w-full">
                    <Link
                      to={item.href}
                      state={item.state}
                      onClick={() => setOpen(false)}
                      className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-colors"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/8">
                        <item.icon className="w-5 h-5 text-white/70" />
                      </div>
                      <span className="text-base font-medium text-white/85">{item.label}</span>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>

              {/* Bottom safe area */}
              <div className="pb-8" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
