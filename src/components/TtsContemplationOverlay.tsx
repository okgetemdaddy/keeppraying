import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { Slider } from "@/components/ui/slider";

export interface TimedPhrase {
  text: string;
  start: number;
}

interface TtsContemplationOverlayProps {
  playing: boolean;
  onStop: () => void;
  onPause?: () => void;
  onResume?: () => void;
  text?: string;
  playbackRate?: number;
  onPlaybackRateChange?: (rate: number) => void;
  timedPhrases?: TimedPhrase[] | null;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}

const RATE_LABELS: Record<number, string> = {
  0.5: "0.5×", 0.75: "0.75×", 1: "1×", 1.25: "1.25×", 1.5: "1.5×", 1.75: "1.75×", 2: "2×",
};

const LINE_HEIGHT = 30;
const VISIBLE_LINES = 6;
const MS_PER_WORD_AT_1X = 150;

function splitIntoLines(text: string): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const lines: string[] = [];
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/);
    if (words.length <= 12) {
      lines.push(sentence.trim());
    } else {
      for (let i = 0; i < words.length; i += 10) {
        lines.push(words.slice(i, i + 10).join(" "));
      }
    }
  }
  return lines;
}

function getLineOpacity(distance: number): number {
  if (distance === 0) return 0.95;
  if (distance === -1) return 0.45;
  if (distance <= -2) return 0.15;
  if (distance === 1) return 0.6;
  if (distance === 2) return 0.35;
  return 0.15;
}

export function TtsContemplationOverlay({
  playing, onStop, onPause, onResume, text, playbackRate = 1, onPlaybackRateChange,
  timedPhrases, audioRef,
}: TtsContemplationOverlayProps) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const hasTimedPhrases = timedPhrases && timedPhrases.length > 0;

  // Use timed phrases as lines when available, otherwise fall back to text splitting
  const lines = useMemo(() => {
    if (hasTimedPhrases) return timedPhrases!.map(p => p.text);
    return text ? splitIntoLines(text) : [];
  }, [text, timedPhrases, hasTimedPhrases]);

  // Reset on play
  useEffect(() => {
    if (playing) {
      setCurrentLineIndex(0);
      setPaused(false);
    }
  }, [playing]);

  // ── Timeupdate-driven sync (when timedPhrases available) ────────────────────
  useEffect(() => {
    if (!playing || !hasTimedPhrases || !audioRef?.current) return;

    const audio = audioRef.current;
    const phrases = timedPhrases!;

    const handleTimeUpdate = () => {
      const t = audio.currentTime;
      // Find the last phrase whose start <= currentTime
      let idx = 0;
      for (let i = phrases.length - 1; i >= 0; i--) {
        if (phrases[i].start <= t) {
          idx = i;
          break;
        }
      }
      setCurrentLineIndex(idx);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => audio.removeEventListener("timeupdate", handleTimeUpdate);
  }, [playing, hasTimedPhrases, timedPhrases, audioRef]);

  // ── Fallback: word-count interval timer (no timedPhrases) ───────────────────
  useEffect(() => {
    if (!playing || paused || lines.length === 0 || hasTimedPhrases) return;

    const totalWords = lines.reduce((sum, l) => sum + l.split(/\s+/).length, 0);
    const totalMs = (totalWords * MS_PER_WORD_AT_1X) / playbackRate;
    const msPerLine = totalMs / lines.length;

    const interval = setInterval(() => {
      setCurrentLineIndex((prev) => {
        if (prev >= lines.length - 1) return prev;
        return prev + 1;
      });
    }, msPerLine);

    return () => clearInterval(interval);
  }, [playing, paused, lines, playbackRate, hasTimedPhrases]);

  const handleTogglePause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (paused) {
      setPaused(false);
      onResume?.();
    } else {
      setPaused(true);
      onPause?.();
    }
  }, [paused, onPause, onResume]);

  const IconComponent = paused ? Play : Pause;

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
          {/* Concentric pulse rings — freeze when paused */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border"
              style={{
                borderColor: `hsla(42, 60%, 55%, ${0.25 - i * 0.07})`,
                width: 120 + i * 80,
                height: 120 + i * 80,
              }}
              animate={paused ? { scale: 1, opacity: 0.12 } : {
                scale: [1, 1.3 + i * 0.1, 1],
                opacity: [0.4 - i * 0.1, 0.08, 0.4 - i * 0.1],
              }}
              transition={paused ? { duration: 0.6 } : {
                duration: 3 + i * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.6,
              }}
            />
          ))}

          {/* Central pause/play toggle button */}
          <motion.button
            onClick={handleTogglePause}
            className="relative z-10 flex items-center justify-center w-20 h-20 rounded-full"
            style={{
              background: "radial-gradient(circle, hsla(42,50%,50%,0.2) 0%, hsla(42,40%,30%,0.08) 100%)",
              border: "1.5px solid hsla(42,50%,55%,0.35)",
              backdropFilter: "blur(8px)",
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            animate={{
              boxShadow: paused
                ? "0 0 20px hsla(42,50%,50%,0.1)"
                : [
                    "0 0 20px hsla(42,50%,50%,0.15)",
                    "0 0 40px hsla(42,50%,50%,0.25)",
                    "0 0 20px hsla(42,50%,50%,0.15)",
                  ],
            }}
            transition={paused ? { duration: 0.3 } : { duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <IconComponent className="w-7 h-7" style={{ color: "hsla(42,60%,70%,0.9)" }} />
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

          {/* Teleprompter captions */}
          {lines.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="relative z-10 mt-10 w-full max-w-[600px] px-6"
              onClick={(e) => e.stopPropagation()}
              style={{
                height: LINE_HEIGHT * 3,
                overflow: "hidden",
                maskImage: "linear-gradient(transparent 0%, black 12%, black 88%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(transparent 0%, black 12%, black 88%, transparent 100%)",
              }}
            >
              <motion.div
                animate={{ y: -currentLineIndex * LINE_HEIGHT }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              >
                {lines.map((line, i) => {
                  const distance = i - currentLineIndex;
                  const opacity = getLineOpacity(distance);
                  const isCurrent = distance === 0;

                  return (
                    <motion.p
                      key={i}
                      animate={{
                        opacity,
                        scale: isCurrent ? 1.02 : 1,
                      }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                      className="text-center select-none"
                      style={{
                        fontFamily: "'Inter', system-ui, sans-serif",
                        fontSize: "17px",
                        lineHeight: `${LINE_HEIGHT}px`,
                        color: "hsla(42,40%,90%,1)",
                        letterSpacing: "0.01em",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {line}
                    </motion.p>
                  );
                })}
              </motion.div>
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
