import React, { forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SessionLingerToastProps {
  visible: boolean;
  onResume: () => void;
  onEndSession: () => void;
}

// iPadOS: Maps to a custom UIAlertController presented over the scene with UIBlurEffect.

const SessionLingerToast = forwardRef<HTMLDivElement, SessionLingerToastProps>(
  ({ visible, onResume, onEndSession }, ref) => {
    return (
      <AnimatePresence>
        {visible && (
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-4 rounded-full bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 px-6 py-3 shadow-2xl"
          >
            <span className="text-sm text-zinc-200 whitespace-nowrap">
              Are you still studying?
            </span>
            <button
              onClick={onResume}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors whitespace-nowrap"
            >
              Resume
            </button>
            <button
              onClick={onEndSession}
              className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap"
            >
              End Session
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

SessionLingerToast.displayName = "SessionLingerToast";
export { SessionLingerToast };
export type { SessionLingerToastProps };
