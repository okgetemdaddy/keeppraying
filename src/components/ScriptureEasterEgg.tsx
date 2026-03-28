import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK_SAYINGS = [
  "God answers prayer",
  "God is listening",
  "He bottles every tear — Psalm 56:8",
  "Prayer works",
  "You are never praying alone",
];

/** Interval range in ms (show every 45–90 seconds) */
const MIN_INTERVAL = 45_000;
const MAX_INTERVAL = 90_000;
const DISPLAY_DURATION = 6_000;

export default function ScriptureEasterEgg() {
  const [sayings, setSayings] = useState<string[]>(FALLBACK_SAYINGS);
  const [current, setCurrent] = useState<string | null>(null);

  // Fetch sayings once
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("keeppraying_sayings")
        .select("text")
        .eq("is_active", true);
      if (data && data.length > 0) {
        setSayings(data.map((d: any) => d.text));
      }
    })();
  }, []);

  const showRandom = useCallback(() => {
    const pick = sayings[Math.floor(Math.random() * sayings.length)];
    setCurrent(pick);
    setTimeout(() => setCurrent(null), DISPLAY_DURATION);
  }, [sayings]);

  useEffect(() => {
    // Show first one after a short initial delay
    const initialTimeout = setTimeout(showRandom, 12_000);

    const interval = setInterval(() => {
      showRandom();
    }, MIN_INTERVAL + Math.random() * (MAX_INTERVAL - MIN_INTERVAL));

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [showRandom]);

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
        >
          <div className="px-5 py-2.5 rounded-2xl bg-card/90 backdrop-blur-md border border-primary/15 shadow-prayer">
            <p className="font-display text-sm italic text-primary/80 whitespace-nowrap">
              ✨ {current}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
