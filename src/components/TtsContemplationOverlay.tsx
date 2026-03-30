import { motion, AnimatePresence } from "framer-motion";
import { Pause } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TtsContemplationOverlayProps {
  playing: boolean;
  onStop: () => void;
  text?: string;
  playbackRate?: number;
  onPlaybackRateChange?: (rate: number) => void;
}

const RATE_LABELS: Record<number, string> = {
  0.5: "0.5×", 0.75: "0.75×", 1: "1×", 1.25: "1.25×", 1.5: "1.5×", 1.75: "1.75×", 2: "2×",
};

export function TtsContemplationOverlay({
  playing, onStop, text, playbackRate = 1, onPlaybackRateChange,
}: TtsContemplationOverlayProps) {
  return (
    <AnimatePresence>
      {playing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
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

          {/* Speed slider */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="relative z-10 mt-8 flex flex-col items-center gap-2 w-56"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="text-xs font-semibold tracking-widest uppercase select-none"
              style={{ color: "hsla(42,50%,65%,0.7)", fontFamily: "'Inter', system-ui, sans-serif" }}
            >
              {RATE_LABELS[playbackRate] ?? `${playbackRate}×`}
            </span>
            <Slider
              min={0.5}
              max={2}
              step={0.25}
              value={[playbackRate]}
              onValueChange={([v]) => onPlaybackRateChange?.(v)}
              className="w-full [&_[data-radix-slider-track]]:bg-[hsla(42,30%,30%,0.4)] [&_[data-radix-slider-track]]:h-1.5 [&_[data-radix-slider-range]]:bg-[hsla(42,55%,55%,0.7)] [&_[data-radix-slider-thumb]]:border-[hsla(42,50%,55%,0.6)] [&_[data-radix-slider-thumb]]:bg-[hsla(42,40%,80%,0.95)] [&_[data-radix-slider-thumb]]:w-4 [&_[data-radix-slider-thumb]]:h-4"
            />
            <div className="flex justify-between w-full px-0.5">
              <span className="text-[10px] select-none" style={{ color: "hsla(42,30%,55%,0.45)" }}>0.5×</span>
              <span className="text-[10px] select-none" style={{ color: "hsla(42,30%,55%,0.45)" }}>2×</span>
            </div>
          </motion.div>

          {/* Captions */}
          {text && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="relative z-10 mt-10 w-full max-w-[600px] px-6"
              onClick={(e) => e.stopPropagation()}
            >
              <ScrollArea className="max-h-[30vh]">
                <p
                  className="text-center whitespace-pre-line select-none"
                  style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: "17px",
                    lineHeight: 1.75,
                    color: "hsla(42,40%,90%,0.82)",
                    letterSpacing: "0.01em",
                  }}
                >
                  {text}
                </p>
              </ScrollArea>
            </motion.div>
          )}

          {/* "Tap anywhere" hint */}
          <motion.p
            className="absolute text-xs font-medium tracking-[0.2em] uppercase select-none"
            style={{
              color: "hsla(42,40%,65%,0.5)",
              fontFamily: "'Inter', system-ui, sans-serif",
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
