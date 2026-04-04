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

export function BibleEdgeTabs({ onSuggestionsClick, onIPadClick, showIPad, hidden }: Props) {
  const [activeTab, setActiveTab] = useState<TabId | null>(null);

  const iPadDismissed = localStorage.getItem("ipad_waitlist_dismissed") === "true";
  const visibleTabs = tabs.filter(
    (t) => t.id !== "ipad" || (showIPad && !iPadDismissed)
  );

  const handleClick = (id: TabId) => {
    setActiveTab(id);
    if (id === "suggestions") onSuggestionsClick();
    if (id === "ipad") onIPadClick();
    setTimeout(() => setActiveTab(null), 600);
  };

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
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
                  className={`relative flex items-center gap-2 px-4 py-1.5 text-[0.6rem] font-semibold tracking-wider rounded-full transition-colors duration-200 cursor-pointer whitespace-nowrap overflow-hidden ${
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

                  {/* Soft glimmer sweep for iPad tab */}
                  {tab.id === "ipad" && !isActive && (
                    <>
                      {/* Dimmed ambient fill — always visible */}
                      <div
                        className="absolute inset-0 z-[1] rounded-full pointer-events-none"
                        style={{ background: "rgba(251,191,36,0.06)" }}
                      />
                      {/* Sweep animation */}
                      <motion.div
                        className="absolute inset-0 z-[2] rounded-full pointer-events-none"
                        style={{
                          background: "linear-gradient(105deg, transparent 40%, rgba(251,191,36,0.15) 45%, rgba(251,191,36,0.25) 50%, rgba(251,191,36,0.15) 55%, transparent 60%)",
                          backgroundSize: "200% 100%",
                        }}
                        animate={{
                          backgroundPosition: ["200% 0%", "-200% 0%", "-200% 0%"],
                          opacity: [1, 1, 0],
                        }}
                        transition={{
                          duration: 43,
                          times: [0, 3 / 43, 3 / 43],
                          ease: "easeInOut",
                          repeat: Infinity,
                        }}
                      />
                    </>
                  )}

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
      )}
    </AnimatePresence>
  );
}