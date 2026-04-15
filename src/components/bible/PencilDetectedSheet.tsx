import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

const sheetSpring = { type: "spring" as const, damping: 30, stiffness: 300, mass: 0.8 };

const FEATURES = [
  { icon: "✦", label: "Focused Passages", desc: "Lock into a verse range with zero distractions" },
  { icon: "✦", label: "Pressure-Sensitive Ink", desc: "Write and annotate with natural pen strokes" },
  { icon: "✦", label: "Premium Art Tools", desc: "Layered canvas for visual Bible study", soon: true },
];

interface PencilDetectedSheetProps {
  open: boolean;
  onTryStudyMode: () => void;
  onDismiss: () => void;
}

export function PencilDetectedSheet({ open, onTryStudyMode, onDismiss }: PencilDetectedSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="pencil-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          <motion.div
            key="pencil-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={sheetSpring}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-3xl bg-card border-t border-border shadow-2xl"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-6 pb-8 space-y-5">
              {/* Pencil tip illustration */}
              <div className="flex justify-center pt-2">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M30 6L42 18L18 42H6V30L30 6Z"
                    className="stroke-amber-600 dark:stroke-amber-400"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <path
                    d="M24 12L36 24"
                    className="stroke-amber-600/50 dark:stroke-amber-400/50"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Headline */}
              <div className="text-center space-y-2">
                <h2
                  className="text-xl text-amber-700 dark:text-amber-300 font-normal"
                  style={{ fontFamily: "'EB Garamond', serif" }}
                >
                  Apple Pencil Detected
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Unlock a focused study experience designed for your iPad and Apple Pencil.
                </p>
              </div>

              {/* Feature list */}
              <div className="space-y-3 pt-1">
                {FEATURES.map((f) => (
                  <div key={f.label} className="flex items-start gap-3">
                    <span className="text-amber-600 dark:text-amber-400 text-sm mt-0.5 shrink-0">
                      {f.icon}
                    </span>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-foreground">
                        {f.label}
                        {f.soon && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Soon
                          </span>
                        )}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1 h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium"
                  onClick={onTryStudyMode}
                >
                  Try iPad Study Mode
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-11 rounded-xl font-medium"
                  onClick={onDismiss}
                >
                  Maybe Later
                </Button>
              </div>

              {/* Fine print */}
              <p className="text-center text-[11px] text-muted-foreground/60 pt-1">
                Access Study Mode anytime from the pen icon in the toolbar
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
