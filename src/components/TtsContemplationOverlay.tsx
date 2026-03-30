import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
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

const MS_PER_WORD_AT_1X = 150;

/* ── helpers ─────────────────────────────────────────────── */

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
  const d = Math.abs(distance);
  if (d === 0) return 1;
  if (d === 1) return 0.85;
  if (d === 2) return 0.55;
  if (d === 3) return 0.35;
  if (d === 4) return 0.22;
  if (d === 5) return 0.14;
  if (d === 6) return 0.09;
  return 0.05;
}

function getLineGlow(distance: number): string {
  if (distance === 0) {
    return "0 0 24px hsla(42,60%,60%,0.6), 0 0 48px hsla(42,50%,50%,0.3)";
  }
  if (Math.abs(distance) === 1) {
    return "0 0 14px hsla(42,55%,55%,0.4)";
  }
  return "none";
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ── component ───────────────────────────────────────────── */

export function TtsContemplationOverlay({
  playing, onStop, onPause, onResume, text, playbackRate = 1, onPlaybackRateChange,
  timedPhrases, audioRef,
}: TtsContemplationOverlayProps) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const hasTimedPhrases = timedPhrases && timedPhrases.length > 0;

  const lines = useMemo(() => {
    if (hasTimedPhrases) return timedPhrases!.map(p => p.text);
    return text ? splitIntoLines(text) : [];
  }, [text, timedPhrases, hasTimedPhrases]);

  // Reset on play
  useEffect(() => {
    if (playing) {
      setCurrentLineIndex(0);
      setPaused(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [playing]);

  // ── Unified poll: sync line index + currentTime/duration ──
  useEffect(() => {
    if (!playing) return;

    const poll = () => {
      const audio = audioRef?.current;
      if (audio) {
        if (!isSeeking) setCurrentTime(audio.currentTime);
        if (audio.duration && isFinite(audio.duration)) setDuration(audio.duration);
      }

      if (hasTimedPhrases && audio) {
        const t = audio.currentTime;
        const phrases = timedPhrases!;
        let idx = 0;
        for (let i = phrases.length - 1; i >= 0; i--) {
          if (phrases[i].start <= t) { idx = i; break; }
        }
        setCurrentLineIndex(idx);
      }
    };

    const interval = setInterval(poll, 80);
    return () => clearInterval(interval);
  }, [playing, hasTimedPhrases, timedPhrases, audioRef, isSeeking]);

  // ── Fallback: word-count timer (no timedPhrases) ──
  useEffect(() => {
    if (!playing || paused || lines.length === 0 || hasTimedPhrases) return;
    const totalWords = lines.reduce((sum, l) => sum + l.split(/\s+/).length, 0);
    const totalMs = (totalWords * MS_PER_WORD_AT_1X) / playbackRate;
    const msPerLine = totalMs / lines.length;
    const interval = setInterval(() => {
      setCurrentLineIndex(prev => (prev >= lines.length - 1 ? prev : prev + 1));
    }, msPerLine);
    return () => clearInterval(interval);
  }, [playing, paused, lines, playbackRate, hasTimedPhrases]);

  // ── Scroll the active line into the center of the viewport ──
  useEffect(() => {
    const el = lineRefs.current[currentLineIndex];
    if (el && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const containerH = container.clientHeight;
      const elTop = el.offsetTop;
      const elH = el.offsetHeight;
      const targetScroll = elTop - containerH / 2 + elH / 2;
      container.scrollTo({ top: targetScroll, behavior: "smooth" });
    }
  }, [currentLineIndex]);

  const handleTogglePause = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (paused) { setPaused(false); onResume?.(); }
    else { setPaused(true); onPause?.(); }
  }, [paused, onPause, onResume]);

  const handleSeek = useCallback((val: number[]) => {
    const v = val[0];
    setCurrentTime(v);
    if (audioRef?.current) audioRef.current.currentTime = v;
  }, [audioRef]);

  const IconComponent = paused ? Play : Pause;

  const sliderGoldClass =
    "[&_[data-radix-slider-track]]:bg-[hsla(42,30%,30%,0.4)] [&_[data-radix-slider-track]]:h-1.5 " +
    "[&_[data-radix-slider-range]]:bg-[hsla(42,55%,55%,0.7)] " +
    "[&_[data-radix-slider-thumb]]:border-[hsla(42,50%,55%,0.6)] [&_[data-radix-slider-thumb]]:bg-[hsla(42,40%,80%,0.95)] " +
    "[&_[data-radix-slider-thumb]]:w-4 [&_[data-radix-slider-thumb]]:h-4";

  const overlay = (
    <AnimatePresence>
      {playing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex flex-col"
          style={{
            background: "radial-gradient(ellipse at center, hsla(30,15%,8%,0.92) 0%, hsla(30,10%,4%,0.97) 100%)",
          }}
          onClick={onStop}
        >
          {/* ── Subtle pulse rings (background decoration) ── */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 0 }}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border"
                style={{
                  borderColor: `hsla(42, 60%, 55%, ${0.12 - i * 0.03})`,
                  width: 200 + i * 120,
                  height: 200 + i * 120,
                }}
                animate={paused ? { scale: 1, opacity: 0.06 } : {
                  scale: [1, 1.15 + i * 0.05, 1],
                  opacity: [0.15 - i * 0.04, 0.04, 0.15 - i * 0.04],
                }}
                transition={paused ? { duration: 0.6 } : {
                  duration: 4 + i * 0.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.7,
                }}
              />
            ))}
          </div>

          {/* ── Captions — the hero area ── */}
          {lines.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="relative flex-1 min-h-0 w-full max-w-[640px] mx-auto px-5 pt-10"
              style={{ zIndex: 1 }}
            >
              <div
                ref={scrollContainerRef}
                className="h-full overflow-hidden"
                style={{
                  maskImage: "linear-gradient(transparent 0%, black 10%, black 90%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(transparent 0%, black 10%, black 90%, transparent 100%)",
                }}
              >
                <div className="py-[40vh]">
                  {lines.map((line, i) => {
                    const distance = i - currentLineIndex;
                    const opacity = getLineOpacity(distance);
                    const glow = getLineGlow(distance);
                    const isCenter = Math.abs(distance) <= 1;

                    return (
                      <motion.p
                        key={i}
                        ref={(el) => { lineRefs.current[i] = el; }}
                        animate={{ opacity }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="text-center select-none py-1.5"
                        style={{
                          fontFamily: "'Inter', system-ui, sans-serif",
                          fontSize: isCenter ? "18px" : "16px",
                          lineHeight: "1.6",
                          color: "hsla(42,40%,90%,1)",
                          letterSpacing: "0.01em",
                          textShadow: glow,
                          fontWeight: distance === 0 ? 500 : 400,
                        }}
                      >
                        {line}
                      </motion.p>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Bottom controls area ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="relative w-full max-w-[640px] mx-auto px-6 flex flex-col gap-3 shrink-0"
            style={{ zIndex: 2, paddingBottom: "max(env(safe-area-inset-bottom, 24px), 32px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Audio scrubber */}
            {duration > 0 && (
              <div className="flex flex-col gap-1">
                <Slider
                  min={0}
                  max={duration}
                  step={0.5}
                  value={[currentTime]}
                  onValueChange={handleSeek}
                  onPointerDown={() => setIsSeeking(true)}
                  onPointerUp={() => setIsSeeking(false)}
                  className={`w-full ${sliderGoldClass}`}
                />
                <div className="flex justify-between w-full px-0.5">
                  <span className="text-[11px] tabular-nums select-none" style={{ color: "hsla(42,40%,65%,0.7)" }}>
                    {formatTime(currentTime)}
                  </span>
                  <span className="text-[11px] tabular-nums select-none" style={{ color: "hsla(42,40%,65%,0.7)" }}>
                    {formatTime(duration)}
                  </span>
                </div>
              </div>
            )}

            {/* Play/Pause + Speed row */}
            <div className="flex items-center gap-4">
              <motion.button
                onClick={handleTogglePause}
                className="flex items-center justify-center w-14 h-14 rounded-full shrink-0"
                style={{
                  background: "radial-gradient(circle, hsla(42,50%,50%,0.25) 0%, hsla(42,40%,30%,0.1) 100%)",
                  border: "2px solid hsla(42,50%,55%,0.45)",
                  backdropFilter: "blur(6px)",
                }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
              >
                <IconComponent className="w-6 h-6" style={{ color: "hsla(42,60%,70%,0.95)" }} />
              </motion.button>

              <div className="flex-1 flex items-center gap-3">
                <Slider
                  min={0.5}
                  max={2}
                  step={0.25}
                  value={[playbackRate]}
                  onValueChange={([v]) => onPlaybackRateChange?.(v)}
                  className={`flex-1 ${sliderGoldClass}`}
                />
                <span
                  className="text-xs font-semibold tracking-wider uppercase select-none w-9 text-center shrink-0"
                  style={{ color: "hsla(42,50%,65%,0.7)" }}
                >
                  {RATE_LABELS[playbackRate] ?? `${playbackRate}×`}
                </span>
              </div>
            </div>

            {/* Stop button */}
            <motion.button
              onClick={onStop}
              className="w-full py-2.5 rounded-full text-[13px] font-semibold tracking-[0.12em] uppercase select-none"
              style={{
                background: "hsla(42,30%,25%,0.2)",
                border: "1px solid hsla(42,40%,50%,0.25)",
                color: "hsla(42,40%,65%,0.7)",
              }}
              whileTap={{ scale: 0.97 }}
            >
              Stop &amp; Close
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
