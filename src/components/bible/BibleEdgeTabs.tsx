import React, { useState } from "react";
import { Lightbulb, Tablet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onSuggestionsClick: () => void;
  onIPadClick: () => void;
  showIPad: boolean;
  hidden?: boolean;
}

const tabs = [
  { id: "suggestions", label: "SUGGESTIONS", icon: <Lightbulb className="h-3.5 w-3.5" /> },
  { id: "ipad", label: "IPAD APP", icon: <Tablet className="h-3.5 w-3.5" /> },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function BibleEdgeTabs({ onSuggestionsClick, onIPadClick, showIPad }: Props) {
  const [activeTab, setActiveTab] = useState<TabId | null>(null);

  const iPadDismissed = localStorage.getItem("ipad_waitlist_dismissed") === "true";
  const visibleTabs = tabs.filter(
    (t) => t.id !== "ipad" || (showIPad && !iPadDismissed)
  );

  const handleClick = (id: TabId) => {
    setActiveTab(id);
    if (id === "suggestions") onSuggestionsClick();
    if (id === "ipad") onIPadClick();
    // Reset active state after a brief moment
    setTimeout(() => setActiveTab(null), 600);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.4 }}
      style={{ transform: "rotate(-90deg)", transformOrigin: "left top" }}
      className="absolute left-0 top-full z-20"
    >
      <div className="inline-flex items-center p-1 bg-slate-900/50 dark:bg-slate-950/50 rounded-b-2xl rounded-t-none overflow-hidden border border-slate-700/50 border-t-0">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              onClick={() => handleClick(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-1.5 text-[0.6rem] font-semibold tracking-wider rounded-full transition-colors duration-200 cursor-pointer whitespace-nowrap ${
                isActive
                  ? "text-amber-200"
                  : "text-slate-300 hover:text-slate-100"
              }`}
            >
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="bibleEdgeTab"
                    className="absolute inset-0 border border-amber-500/30 bg-amber-900/20 rounded-full z-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </AnimatePresence>

              <span className="relative z-10 flex items-center gap-1.5">
                <span className={isActive ? "text-amber-400" : "text-amber-400/70"}>
                  {tab.icon}
                </span>
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
