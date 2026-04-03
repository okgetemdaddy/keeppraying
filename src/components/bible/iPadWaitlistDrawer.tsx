import React, { useState } from "react";
import { X, Tablet, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveSheet,
  ResponsiveSheetContent,
  ResponsiveSheetHeader,
  ResponsiveSheetTitle,
  ResponsiveSheetDescription,
} from "@/components/ui/responsive-sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/* ── Inline SVG Illustrations ── */

const COPPER = "#d4a574";
const COPPER_DIM = "#b8956a";
const COPPER_GLOW = "rgba(212,165,116,0.3)";
const COPPER_FAINT = "rgba(212,165,116,0.15)";
const LINE_COLOR = "rgba(255,255,255,0.08)";
const TEXT_FAINT = "rgba(255,255,255,0.15)";

function PenTipIllustration() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
      {/* Faint text lines */}
      <rect x="8" y="18" width="64" height="2" rx="1" fill={LINE_COLOR} />
      <rect x="8" y="26" width="64" height="2" rx="1" fill={LINE_COLOR} />
      <rect x="8" y="34" width="50" height="2" rx="1" fill={LINE_COLOR} />
      <rect x="8" y="42" width="64" height="2" rx="1" fill={LINE_COLOR} />
      {/* Highlight bar */}
      <rect x="14" y="24" width="36" height="6" rx="2" fill={COPPER_GLOW} />
      <rect x="14" y="24" width="36" height="6" rx="2" stroke={COPPER} strokeWidth="0.5" fill="none" />
      {/* Pencil */}
      <g transform="translate(52,8) rotate(25)">
        <rect x="0" y="0" width="4" height="32" rx="1" fill="rgba(255,255,255,0.12)" />
        <rect x="0" y="0" width="4" height="32" rx="1" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" fill="none" />
        <polygon points="0,32 4,32 2,38" fill={COPPER} />
      </g>
      {/* Small text labels */}
      <text x="16" y="29" fontSize="4" fill={COPPER} fontFamily="serif" opacity="0.8">heavens and the earth</text>
    </svg>
  );
}

function InfiniteCanvasIllustration() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
      {/* Page */}
      <rect x="12" y="10" width="48" height="56" rx="3" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      {/* Text lines */}
      {[18, 24, 30, 36, 42, 48].map((y) => (
        <rect key={y} x="18" y={y} width={y % 12 === 0 ? 36 : 28} height="1.5" rx="0.75" fill={TEXT_FAINT} />
      ))}
      {/* Handwritten scribble in margin */}
      <path d="M52 22 Q56 20 58 24 Q60 28 56 30" stroke={COPPER_DIM} strokeWidth="0.8" fill="none" opacity="0.6" />
      {/* Expansion arrows */}
      <path d="M64 38 L72 38" stroke={COPPER} strokeWidth="1" markerEnd="url(#arrowR)" />
      <path d="M36 70 L36 76" stroke={COPPER} strokeWidth="1" markerEnd="url(#arrowD)" />
      <defs>
        <marker id="arrowR" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
          <path d="M0,0 L4,2 L0,4" fill={COPPER} />
        </marker>
        <marker id="arrowD" markerWidth="4" markerHeight="4" refX="2" refY="3" orient="auto">
          <path d="M0,0 L2,4 L4,0" fill={COPPER} />
        </marker>
      </defs>
      {/* Dashed expansion zones */}
      <rect x="62" y="10" width="12" height="56" rx="2" stroke={COPPER_FAINT} strokeWidth="0.5" strokeDasharray="2 2" fill="none" />
      <rect x="12" y="68" width="48" height="8" rx="2" stroke={COPPER_FAINT} strokeWidth="0.5" strokeDasharray="2 2" fill="none" />
    </svg>
  );
}

function SplitScreenIllustration() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
      {/* Left pane */}
      <rect x="6" y="12" width="32" height="56" rx="3" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      {/* Right pane */}
      <rect x="42" y="12" width="32" height="56" rx="3" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      {/* Labels */}
      <text x="16" y="21" fontSize="5" fill={COPPER} fontWeight="bold" fontFamily="sans-serif">ESV</text>
      <text x="52" y="21" fontSize="5" fill={COPPER} fontWeight="bold" fontFamily="sans-serif">NIV</text>
      {/* Divider */}
      <line x1="40" y1="14" x2="40" y2="66" stroke={COPPER_GLOW} strokeWidth="0.5" />
      {/* Text lines left */}
      {[28, 33, 38, 43, 48, 53].map((y) => (
        <rect key={`l${y}`} x="10" y={y} width={y % 10 === 3 ? 20 : 24} height="1.5" rx="0.75" fill={TEXT_FAINT} />
      ))}
      {/* Text lines right */}
      {[28, 33, 38, 43, 48, 53].map((y) => (
        <rect key={`r${y}`} x="46" y={y} width={y % 10 === 8 ? 22 : 24} height="1.5" rx="0.75" fill={TEXT_FAINT} />
      ))}
    </svg>
  );
}

function OCRIllustration() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
      {/* Search bar */}
      <rect x="10" y="10" width="60" height="12" rx="6" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      <circle cx="18" cy="16" r="3" stroke={COPPER_DIM} strokeWidth="0.8" fill="none" />
      <line x1="20" y1="18" x2="22" y2="20" stroke={COPPER_DIM} strokeWidth="0.8" />
      <text x="26" y="18" fontSize="4" fill="rgba(255,255,255,0.25)" fontFamily="sans-serif">Search notes...</text>
      {/* Handwritten text */}
      <text x="14" y="40" fontSize="6" fill={COPPER_DIM} fontFamily="cursive" opacity="0.7" fontStyle="italic">Deep wisdom</text>
      <path d="M14 42 Q30 44 50 42" stroke={COPPER_FAINT} strokeWidth="0.5" fill="none" />
      {/* Arrow */}
      <path d="M40 46 L40 54" stroke={COPPER} strokeWidth="0.8" markerEnd="url(#ocrArrow)" />
      <defs>
        <marker id="ocrArrow" markerWidth="4" markerHeight="4" refX="2" refY="3" orient="auto">
          <path d="M0,0 L2,4 L4,0" fill={COPPER} />
        </marker>
      </defs>
      {/* Typed result */}
      <rect x="16" y="58" width="48" height="10" rx="3" fill="rgba(255,255,255,0.04)" stroke={COPPER_GLOW} strokeWidth="0.5" />
      <text x="22" y="65" fontSize="5" fill="rgba(255,255,255,0.5)" fontFamily="sans-serif">Deep wisdom</text>
    </svg>
  );
}

function CrossRefIllustration() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
      {/* Main page */}
      <rect x="8" y="8" width="46" height="64" rx="3" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      {/* Text lines */}
      {[18, 24, 30, 36, 42, 48, 54].map((y) => (
        <rect key={y} x="14" y={y} width={y === 30 ? 20 : 34} height="1.5" rx="0.75" fill={TEXT_FAINT} />
      ))}
      {/* Highlighted reference */}
      <rect x="14" y="29" width="20" height="4" rx="1" fill={COPPER_GLOW} />
      {/* Floating popup */}
      <g>
        <rect x="36" y="22" width="38" height="28" rx="4" fill="rgba(30,28,24,0.95)" stroke={COPPER_DIM} strokeWidth="0.5" />
        <text x="42" y="32" fontSize="4" fill={COPPER} fontWeight="bold" fontFamily="sans-serif">Gen 1:1</text>
        <rect x="42" y="36" width="26" height="1.2" rx="0.6" fill={TEXT_FAINT} />
        <rect x="42" y="40" width="22" height="1.2" rx="0.6" fill={TEXT_FAINT} />
        <rect x="42" y="44" width="18" height="1.2" rx="0.6" fill={TEXT_FAINT} />
      </g>
      {/* Connection line */}
      <path d="M34 31 Q38 28 40 30" stroke={COPPER_FAINT} strokeWidth="0.5" strokeDasharray="2 1" fill="none" />
    </svg>
  );
}

function CrossHeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      {/* Heart */}
      <path
        d="M16 28 C10 22 4 17 4 11.5 C4 7.36 7.36 4 11.5 4 C13.5 4 15.3 5 16 6.5 C16.7 5 18.5 4 20.5 4 C24.64 4 28 7.36 28 11.5 C28 17 22 22 16 28Z"
        fill="rgba(212,165,116,0.15)"
        stroke={COPPER}
        strokeWidth="1"
      />
      {/* Cross */}
      <rect x="14.5" y="9" width="3" height="14" rx="0.5" fill={COPPER} opacity="0.7" />
      <rect x="11" y="12.5" width="10" height="3" rx="0.5" fill={COPPER} opacity="0.7" />
    </svg>
  );
}

/* ── Feature Data ── */

const FEATURES = [
  {
    Illustration: PenTipIllustration,
    title: "Individual Word Selection and Granular Highlighting",
    desc: "Highlight precise words and partial phrases, not just entire verses, for truly inductive study. No more forced block highlighting.",
  },
  {
    Illustration: InfiniteCanvasIllustration,
    title: "Infinite Margin Space",
    desc: "A canvas that dynamically expands horizontally and vertically for notes, reflections, and hand-drawn diagrams, keeping insights alongside the text.",
  },
  {
    Illustration: SplitScreenIllustration,
    title: "True Multi-Translation Split-Screen",
    desc: "Compare different versions side-by-side with independent scrolling and seamless annotation for detailed comparative analysis.",
  },
  {
    Illustration: OCRIllustration,
    title: "Searchable Handwriting (OCR)",
    desc: "Search all your handwritten notes globally, bridging the tactile feel of analog with digital search utility.",
  },
  {
    Illustration: CrossRefIllustration,
    title: "Seamless Cross-Referencing",
    desc: "Instantly view referenced texts in non-disruptive floating pop-ups and gestures, without navigating away from the current page.",
  },
];

/* ── Main Drawer ── */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IPadWaitlistDrawer({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email");
      return;
    }
    setLoading(true);
    setError("");
    const { error: dbError } = await supabase
      .from("waitlist_signups" as any)
      .insert({ email: trimmed, platform: "ipados", user_id: user?.id ?? null } as any);

    setLoading(false);
    if (dbError) {
      if (dbError.code === "23505") {
        setSubmitted(true);
        localStorage.setItem("ipad_waitlist_dismissed", "true");
      } else {
        setError("Something went wrong. Please try again.");
      }
      return;
    }
    setSubmitted(true);
    localStorage.setItem("ipad_waitlist_dismissed", "true");
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => { setSubmitted(false); setEmail(""); setError(""); }, 300);
  };

  return (
    <ResponsiveSheet open={open} onOpenChange={handleClose}>
      <ResponsiveSheetContent
        side="left"
        className="w-[88vw] sm:w-[440px] p-0 overflow-y-auto bg-black/60 backdrop-blur-[24px] backdrop-brightness-[0.8] border-r border-white/10"
      >
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4 text-white/50" />
        </button>

        <div className="px-6 pt-8 pb-10 space-y-6">
          {/* Header */}
          <ResponsiveSheetHeader className="p-0 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-900/40">
                <Tablet className="h-6 w-6 text-amber-500/90" />
              </div>
              <div className="flex-1 min-w-0">
                <ResponsiveSheetTitle className="text-base font-bold tracking-tight text-white leading-snug">
                  Waitlist Open: Experience KeepRead.ing Reimagined for iPad
                </ResponsiveSheetTitle>
              </div>
            </div>
            <ResponsiveSheetDescription className="text-xs text-white/50 leading-relaxed">
              An experience reimagined from the ground up for deep biblical study and profound reflection on iPad hardware. A truly native, powerful tool is coming. Be among the first.
            </ResponsiveSheetDescription>
          </ResponsiveSheetHeader>

          {/* Feature Cards */}
          <div className="space-y-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex items-start gap-3 rounded-xl bg-white/[0.06] border border-white/[0.08] p-3"
              >
                <div className="w-[72px] h-[72px] shrink-0 rounded-xl bg-white/[0.04] overflow-hidden">
                  <f.Illustration />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-semibold text-white/90 leading-tight">{f.title}</p>
                  <p className="text-xs text-white/45 leading-relaxed mt-1">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Signup / Spot Secured */}
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="secured"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-amber-500/20 bg-white/[0.04] p-5 text-center space-y-3"
              >
                <p className="text-lg font-bold text-white font-serif">Spot Secured.</p>
                <p className="text-xs text-white/50 leading-relaxed">
                  We are thrilled to welcome you. Your place is reserved. May this platform be a profound blessing to your journey into the Word. Seek wisdom and find deeper connection. Blessings on your study.
                </p>
                <CrossHeartIcon className="h-8 w-8 mx-auto" />
              </motion.div>
            ) : (
              <motion.div key="form" exit={{ opacity: 0 }} className="space-y-2">
                <p className="text-xs font-medium text-white/70">Get notified when it launches</p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    className="flex-1 h-10 text-sm bg-white/5 border-none text-white placeholder:text-white/30 focus-visible:ring-amber-500/30"
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    size="icon"
                    className="h-10 w-10 bg-amber-700/40 hover:bg-amber-600/50 text-amber-200 rounded-lg shrink-0"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}

/** Compact inline waitlist input for the Bible Sleeve */
export function SleeveWaitlistInput() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(
    () => localStorage.getItem("ipad_waitlist_dismissed") === "true"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Valid email required");
      return;
    }
    setLoading(true);
    setError("");
    const { error: dbError } = await supabase
      .from("waitlist_signups" as any)
      .insert({ email: trimmed, platform: "ipados", user_id: user?.id ?? null } as any);
    setLoading(false);
    if (dbError && dbError.code !== "23505") {
      setError("Try again later");
      return;
    }
    setSubmitted(true);
    localStorage.setItem("ipad_waitlist_dismissed", "true");
  };

  if (submitted) {
    return (
      <div className="rounded-lg border border-amber-200/60 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2.5 text-center">
        <p className="text-xs text-muted-foreground">
          🕊️ You're on the iPad waitlist. God bless your journey.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Tablet className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-[0.65rem] font-medium text-foreground leading-tight">Native iPad App — Coming Soon</span>
      </div>
      <div className="flex gap-1.5">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          className="flex-1 h-8 text-xs"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <Button
          onClick={handleSubmit}
          disabled={loading}
          size="icon"
          className="h-8 w-8 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-md shrink-0"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      {error && <p className="text-[0.65rem] text-destructive">{error}</p>}
    </div>
  );
}
