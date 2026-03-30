import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TtsLoadingPopupProps {
  visible: boolean;
}

type Phase = "msg1" | "gap" | "msg2";

const TtsLoadingPopup = ({ visible }: TtsLoadingPopupProps) => {
  const [phase, setPhase] = useState<Phase>("msg1");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    if (!visible) {
      clear();
      setPhase("msg1");
      return;
    }

    // Phase 1 visible immediately, fade out after 2s
    const t1 = setTimeout(() => setPhase("gap"), 2000);
    // Phase 2 fades in at 2.5s
    const t2 = setTimeout(() => setPhase("msg2"), 2500);
    timers.current = [t1, t2];

    return clear;
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 pointer-events-none z-50">
      <AnimatePresence mode="wait">
        {phase === "msg1" && (
          <motion.div
            key="msg1"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium
              bg-[hsl(35_30%_15%/0.85)] text-[hsl(42_60%_82%)] backdrop-blur-sm
              shadow-[0_4px_16px_hsl(35_40%_10%/0.35)]"
          >
            Some prayers take time to load
            {/* caret */}
            <span className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45
              bg-[hsl(35_30%_15%/0.85)]" />
          </motion.div>
        )}

        {phase === "msg2" && (
          <motion.div
            key="msg2"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium
              bg-[hsl(35_30%_15%/0.85)] text-[hsl(42_60%_82%)] backdrop-blur-sm
              shadow-[0_4px_16px_hsl(35_40%_10%/0.35)]"
          >
            Warming up the vocal cords…
            <span className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45
              bg-[hsl(35_30%_15%/0.85)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TtsLoadingPopup;
