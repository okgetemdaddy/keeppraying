import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TtsLoadingPopupProps {
  visible: boolean;
}

const MESSAGES: { text: string; duration: number }[] = [
  { text: "Some prayers take time to load", duration: 4000 },
  { text: "Clearing throat… 🤭", duration: 4000 },
  { text: "Warming up the vocal cords…", duration: 4000 },
  { text: "This will be 1,000× faster next time 🚀", duration: 8000 },
  { text: "God bless your heart 💛", duration: 3000 },
  { text: "It will be worth it ✝️", duration: 4000 },
];

const TtsLoadingPopup = ({ visible }: TtsLoadingPopupProps) => {
  const [msgIndex, setMsgIndex] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    if (!visible) {
      clear();
      setMsgIndex(0);
      return;
    }

    let elapsed = 0;
    for (let i = 0; i < MESSAGES.length - 1; i++) {
      elapsed += MESSAGES[i].duration;
      const nextIdx = i + 1;
      timers.current.push(setTimeout(() => setMsgIndex(nextIdx), elapsed));
    }

    return clear;
  }, [visible]);

  if (!visible) return null;

  const current = MESSAGES[msgIndex];

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 pointer-events-none z-50">
      <AnimatePresence mode="wait">
        <motion.div
          key={msgIndex}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium
            bg-[hsl(35_30%_15%/0.85)] text-[hsl(42_60%_82%)] backdrop-blur-sm
            shadow-[0_4px_16px_hsl(35_40%_10%/0.35)]"
        >
          {current.text}
          <span className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45
            bg-[hsl(35_30%_15%/0.85)]" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default TtsLoadingPopup;
