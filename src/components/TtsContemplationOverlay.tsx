import { motion, AnimatePresence } from "framer-motion";
import { Pause } from "lucide-react";

interface TtsContemplationOverlayProps {
  playing: boolean;
  onStop: () => void;
}

/**
 * A sacred contemplation overlay shown while a prayer or testimony
 * is being read aloud. Features concentric pulse rings radiating
 * outward from a central stop button — inviting the user to be
 * still and listen.
 */
export function TtsContemplationOverlay({ playing, onStop }: TtsContemplationOverlayProps) {
  return (
    <AnimatePresence>
      {playing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: "radial-gradient(ellipse at center, hsla(30,15%,8%,0.88) 0%, hsla(30,10%,4%,0.94) 100%)" }}
          onClick={onStop}
        >
          {/* Concentric pulse rings */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border"
              style={{
                borderColor: `hsla(42, 60%, 55%, ${0.25 - i * 0.07})`,
                width: 120 + i * 80,
                height: 120 + i * 80,
              }}
              animate={{
                scale: [1, 1.3 + i * 0.1, 1],
                opacity: [0.4 - i * 0.1, 0.08, 0.4 - i * 0.1],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.6,
              }}
            />
          ))}

          {/* Central stop button */}
          <motion.button
            onClick={(e) => { e.stopPropagation(); onStop(); }}
            className="relative z-10 flex items-center justify-center w-20 h-20 rounded-full"
            style={{
              background: "radial-gradient(circle, hsla(42,50%,50%,0.2) 0%, hsla(42,40%,30%,0.08) 100%)",
              border: "1.5px solid hsla(42,50%,55%,0.35)",
              backdropFilter: "blur(8px)",
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            animate={{
              boxShadow: [
                "0 0 20px hsla(42,50%,50%,0.15)",
                "0 0 40px hsla(42,50%,50%,0.25)",
                "0 0 20px hsla(42,50%,50%,0.15)",
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Pause className="w-7 h-7" style={{ color: "hsla(42,60%,70%,0.9)" }} />
          </motion.button>

          {/* "Be still" text */}
          <motion.p
            className="absolute text-xs font-medium tracking-[0.2em] uppercase select-none"
            style={{
              color: "hsla(42,40%,65%,0.5)",
              bottom: "max(env(safe-area-inset-bottom, 24px), 40px)",
            }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            Tap anywhere to stop
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
