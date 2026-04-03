import React from "react";
import { Tablet } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  onClick: () => void;
}

export function IPadWaitlistBanner({ onClick }: Props) {
  const dismissed = localStorage.getItem("ipad_waitlist_dismissed") === "true";
  if (dismissed) return null;

  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.2, duration: 0.4 }}
      onClick={onClick}
      className="absolute -left-12 top-24 z-20 flex flex-col items-center gap-1.5 rounded-l-xl border border-r-0 border-amber-300/50 bg-amber-50/90 dark:bg-amber-950/60 dark:border-amber-700/40 px-1.5 py-3 shadow-md hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer group"
      title="Native iPad App — Coming Soon"
    >
      <Tablet className="h-4 w-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
      <span
        className="text-[0.6rem] font-semibold tracking-wider text-amber-700 dark:text-amber-300 uppercase"
        style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
      >
        iPad App
      </span>
    </motion.button>
  );
}
