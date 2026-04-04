import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// iPadOS: Replace overlay with UITutorialOverlay or UIPageViewController walk-through
// using UICoachMarkView equivalents. Squeeze hint maps to UIPencilInteraction delegate.

const LS_KEY = "kr_gesture_hints_dismissed";

function getDismissCount(): number {
  try { return parseInt(localStorage.getItem(LS_KEY) ?? "0", 10) || 0; } catch { return 0; }
}

function setDismissCount(n: number) {
  try { localStorage.setItem(LS_KEY, String(n)); } catch {}
}

type Segment = "touch" | "pencil";

/* ── SVG Gesture Illustrations (64×64 viewBox, white strokes) ── */

const PanSVG = () => (
  <svg viewBox="0 0 64 64" className="w-16 h-16">
    <ellipse cx="24" cy="28" rx="5" ry="9" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <ellipse cx="38" cy="28" rx="5" ry="9" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M31 14 L31 8 M31 48 L31 54 M16 31 L10 31 M52 31 L46 31" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M31 5 L28 10 M31 5 L34 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M31 57 L28 52 M31 57 L34 52" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M7 31 L12 28 M7 31 L12 34" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M49 31 L44 28 M49 31 L44 34" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const PinchSVG = () => (
  <svg viewBox="0 0 64 64" className="w-16 h-16">
    <ellipse cx="20" cy="32" rx="5" ry="9" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <ellipse cx="44" cy="32" rx="5" ry="9" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M15 32 L8 32 M49 32 L56 32" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M11 29 L8 32 L11 35" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M53 29 L56 32 L53 35" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="26" y1="20" x2="38" y2="20" stroke="white" strokeWidth="1" strokeDasharray="2 2" />
    <line x1="26" y1="44" x2="38" y2="44" stroke="white" strokeWidth="1" strokeDasharray="2 2" />
  </svg>
);

const RotateSVG = () => (
  <svg viewBox="0 0 64 64" className="w-16 h-16">
    <ellipse cx="18" cy="32" rx="4" ry="7" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <ellipse cx="32" cy="28" rx="4" ry="7" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <ellipse cx="46" cy="32" rx="4" ry="7" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M48 16 A20 20 0 0 1 48 48" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M48 48 L44 44 M48 48 L52 44" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const TapSVG = () => (
  <svg viewBox="0 0 64 64" className="w-16 h-16">
    <ellipse cx="32" cy="28" rx="6" ry="10" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="32" cy="44" r="8" stroke="white" strokeWidth="1" strokeDasharray="3 2" fill="none" />
    <circle cx="32" cy="44" r="4" stroke="white" strokeWidth="1" fill="none" />
    <circle cx="32" cy="44" r="1.5" fill="white" />
  </svg>
);

const DrawSVG = () => (
  <svg viewBox="0 0 64 64" className="w-16 h-16">
    <line x1="12" y1="52" x2="44" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <polygon points="44,12 48,10 46,14" fill="white" />
    <path d="M16 48 Q24 36 32 40 Q40 44 48 32" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
  </svg>
);

const CircleSVG = () => (
  <svg viewBox="0 0 64 64" className="w-16 h-16">
    <rect x="20" y="28" width="24" height="8" rx="2" fill="rgba(255,255,255,0.15)" stroke="none" />
    <ellipse cx="32" cy="32" rx="18" ry="14" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 3" fill="none" />
  </svg>
);

const UnderlineSVG = () => (
  <svg viewBox="0 0 64 64" className="w-16 h-16">
    <line x1="12" y1="52" x2="36" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <polygon points="36,20 40,18 38,22" fill="white" />
    <rect x="14" y="38" width="36" height="6" rx="1" fill="rgba(255,255,255,0.15)" />
    <line x1="14" y1="48" x2="50" y2="48" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const EraseSVG = () => (
  <svg viewBox="0 0 64 64" className="w-16 h-16">
    <path d="M20 44 Q32 20 44 44" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" />
    <line x1="18" y1="18" x2="46" y2="46" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <line x1="46" y1="18" x2="18" y2="46" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const SqueezeSVG = () => (
  <svg viewBox="0 0 64 64" className="w-16 h-16">
    <rect x="28" y="8" width="8" height="48" rx="4" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.1)" />
    <path d="M24 28 L20 32 L24 36" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M40 28 L44 32 L40 36" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <circle cx="32" cy="32" r="2" fill="white" opacity="0.6" />
  </svg>
);

interface HintCard {
  svg: React.ReactNode;
  label: string;
  desc: string;
  badge?: string;
  position: string; // tailwind positioning
}

const TOUCH_HINTS: HintCard[] = [
  { svg: <PanSVG />, label: "Pan the canvas", desc: "Two fingers to scroll in any direction", position: "top-[10%] left-1/2 -translate-x-1/2" },
  { svg: <PinchSVG />, label: "Pinch to zoom", desc: "0.3× to 5× — text never reflows", position: "top-[40%] left-1/2 -translate-x-1/2" },
  { svg: <RotateSVG />, label: "Three fingers rotate", desc: "Free 360° — your paper, your angle", position: "top-[40%] right-[10%]" },
  { svg: <TapSVG />, label: "Tap a verse", desc: "Tap any word to look it up", position: "bottom-[18%] left-1/2 -translate-x-1/2" },
];

const PENCIL_HINTS: HintCard[] = [
  { svg: <DrawSVG />, label: "Draw to annotate", desc: "Pressure and tilt captured — full pro feel", position: "top-[10%] left-[15%]" },
  { svg: <CircleSVG />, label: "Circle a word", desc: "1–4 words: cross-reference blooms. 5+: select passage", position: "top-[10%] right-[15%]" },
  { svg: <UnderlineSVG />, label: "Underline to highlight", desc: "Stroke below text — choose your color", position: "top-[45%] left-[12%]" },
  { svg: <EraseSVG />, label: "Scratch to delete", desc: "Draw an X over ink or highlights to remove", position: "top-[45%] right-[12%]" },
  { svg: <SqueezeSVG />, label: "Squeeze for tools", desc: "Apple Pencil Pro: squeeze opens the pen toolkit", badge: "Apple Pencil Pro", position: "bottom-[22%] left-[15%]" },
];

interface GestureEducationOverlayProps {
  open: boolean;
  onDismiss: () => void;
  initialSegment?: Segment;
}

export function GestureEducationOverlay({ open, onDismiss, initialSegment = "touch" }: GestureEducationOverlayProps) {
  const [segment, setSegment] = useState<Segment>(initialSegment);

  useEffect(() => {
    if (open) setSegment(initialSegment);
  }, [open, initialSegment]);

  const handleGotIt = useCallback(() => {
    setDismissCount(getDismissCount() + 1);
    onDismiss();
  }, [onDismiss]);

  const handleNeverShow = useCallback(() => {
    setDismissCount(3);
    onDismiss();
  }, [onDismiss]);

  const hints = segment === "touch" ? TOUCH_HINTS : PENCIL_HINTS;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[200] flex flex-col"
          style={{
            background: "radial-gradient(ellipse at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%)",
          }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3 shrink-0">
            <span className="text-sm font-serif text-white/80 tracking-wide">
              KeepRead.ing Canvas
            </span>

            {/* Segmented control */}
            <div className="flex bg-white/10 backdrop-blur-sm rounded-full p-0.5">
              {(["touch", "pencil"] as Segment[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSegment(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    segment === s
                      ? "bg-white/20 text-white"
                      : "text-white/50 hover:text-white/70"
                  }`}
                >
                  {s === "touch" ? "Touch & Gestures" : "Apple Pencil"}
                </button>
              ))}
            </div>

            <button
              onClick={handleGotIt}
              className="text-xs text-white/60 hover:text-white transition-colors px-3 py-1.5 rounded-full border border-white/20"
            >
              Got it
            </button>
          </div>

          {/* Hint cards */}
          <div className="flex-1 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={segment}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                {hints.map((hint, i) => (
                  <motion.div
                    key={hint.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.15, duration: 0.3 }}
                    className={`absolute ${hint.position} max-w-[200px]`}
                  >
                    <div className="bg-black/40 backdrop-blur-sm rounded-xl p-3 text-center">
                      <div className="flex justify-center mb-1.5">{hint.svg}</div>
                      <p className="text-white text-xs font-semibold mb-0.5">{hint.label}</p>
                      <p className="text-white/70 text-[0.65rem] leading-snug">{hint.desc}</p>
                      {hint.badge && (
                        <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 text-[0.6rem] font-medium">
                          {hint.badge}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-5 py-3 shrink-0">
            <button
              onClick={handleNeverShow}
              className="text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              Don't show again
            </button>

            {/* Dot indicator */}
            <div className="flex gap-1.5">
              {(["touch", "pencil"] as Segment[]).map((s) => (
                <div
                  key={s}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    segment === s ? "bg-white" : "bg-white/30"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => {
                if (segment === "touch") setSegment("pencil");
                else handleGotIt();
              }}
              className="text-xs text-white/80 hover:text-white transition-colors font-medium"
            >
              {segment === "touch" ? "Next →" : "Done"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function shouldShowGestureOverlay(sessionCount: number): boolean {
  const dismissed = getDismissCount();
  if (dismissed >= 3) return false;
  if (sessionCount === 0) return true;
  return dismissed < 3;
}
