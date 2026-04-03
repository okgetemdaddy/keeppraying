import React from "react";
import { Tablet } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  onClick: () => void;
  hidden?: boolean;
}

export function IPadWaitlistBanner({ onClick }: Props) {
  const dismissed = localStorage.getItem("ipad_waitlist_dismissed") === "true";
  if (dismissed) return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.4 }}
      onClick={onClick}
      style={{ transform: "rotate(-90deg)", transformOrigin: "center center" }}
      className="absolute left-[20%] top-full z-20 flex items-center gap-1.5 rounded-b-xl border border-t-0 border-amber-300/50 bg-amber-50/90 dark:bg-amber-950/60 dark:border-amber-700/40 px-3 py-1.5 shadow-md hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer group"
      title="Native iPad App — Coming Soon"
    >
      <Tablet className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
      <span className="text-[0.6rem] font-semibold tracking-wider text-amber-700 dark:text-amber-300 uppercase whitespace-nowrap">
        iPad App
      </span>
    </motion.button>
  );
}
