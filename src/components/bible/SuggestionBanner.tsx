import React from "react";
import { Lightbulb } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  onClick: () => void;
}

export function SuggestionBanner({ onClick }: Props) {
  return (
    <motion.button
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.4, duration: 0.4 }}
      onClick={onClick}
      style={{ transform: "rotate(-90deg)", transformOrigin: "center center" }}
      className="absolute left-0 top-full z-20 flex items-center gap-1.5 rounded-b-xl border border-t-0 border-slate-600/50 bg-slate-800 dark:bg-slate-900 px-3 py-1.5 shadow-md hover:bg-slate-700 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
      title="Suggestions & Bug Reports"
    >
      <Lightbulb className="h-3.5 w-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
      <span className="text-[0.6rem] font-semibold tracking-wider text-slate-200 uppercase whitespace-nowrap">
        Suggestions
      </span>
    </motion.button>
  );
}
