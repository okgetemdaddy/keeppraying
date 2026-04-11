import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { Drawer } from "vaul";
import { TestimonyCanvasAsset } from "./TestimonyCanvasAsset";
import {
  MessageCircle,
  Share2,
  Volume2,
  UserRoundCheck,
  MoreHorizontal,
  Image as ImageIcon,
  Palette,
  StickyNote,
  UserPlus,
  Users,
  Lock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Eye,
  HandHeart,
  Type,
  Check,
  Pin,
  Heart,
  BookOpen,
  Sparkles,
  Plus,
  Upload,
  X,
  Camera,
  Mic,
  PenLine,
} from "lucide-react";

/* ─── Google Fonts ─────────────────────────────────────────────────────────── */
const GOOGLE_FONTS = [
  // Serif
  { name: "Cormorant Garamond", category: "Devotional", type: "serif" },
  { name: "Playfair Display", category: "Classic", type: "serif" },
  { name: "Lora", category: "Elegant", type: "serif" },
  { name: "EB Garamond", category: "Timeless", type: "serif" },
  { name: "Crimson Pro", category: "Modern Serif", type: "serif" },
  { name: "Libre Baskerville", category: "Traditional", type: "serif" },
  // Sans-Serif
  { name: "Inter", category: "Modern", type: "sans-serif" },
  { name: "Nunito", category: "Friendly", type: "sans-serif" },
  { name: "Open Sans", category: "Universal", type: "sans-serif" },
  { name: "Raleway", category: "Refined", type: "sans-serif" },
  { name: "Outfit", category: "Contemporary", type: "sans-serif" },
  { name: "DM Sans", category: "Clean", type: "sans-serif" },
] as const;

function loadGoogleFont(fontName: string) {
  const id = `gfont-${fontName.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

/* ─── SVG praying hands ────────────────────────────────────────────────────── */
function PrayingHandsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C12 2 9 5.5 9 9v4l-2 3v3h10v-3l-2-3V9c0-3.5-3-7-3-7z" />
      <path d="M9 13H7.5a1.5 1.5 0 0 0 0 3H9" />
      <path d="M15 13h1.5a1.5 1.5 0 0 1 0 3H15" />
      <line x1="9" y1="19" x2="15" y2="19" />
    </svg>
  );
}

/** SVG raised praise hands */
function PraiseHandsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 11V4a1 1 0 0 1 2 0v3" />
      <path d="M5 13V6a1 1 0 0 1 2 0v5" />
      <path d="M9 12V6a1 1 0 0 1 2 0v6" />
      <path d="M15 11V4a1 1 0 0 0-2 0v3" />
      <path d="M19 13V6a1 1 0 0 0-2 0v5" />
      <path d="M13 12V6a1 1 0 0 0-2 0v6" />
      <path d="M5 13a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4" />
      <path d="M9 17v3" />
      <path d="M15 17v3" />
    </svg>
  );
}

/* ─── Theme system ─────────────────────────────────────────────────────────── */
type CardTheme = {
  mode: "light" | "dark";
  name: string;
  cardBg: string;
  textColor: string;
  titleColor: string;
  headingColor: string;
  brandColor: string;
  borderGlow: string;
  borderSolid: string;
  barBg: string;
  barBorder: string;
  iconDefault: string;
  iconActive: string;
  drawerBg: string;
  drawerText: string;
  drawerMuted: string;
  drawerCardBg: string;
  drawerBorder: string;
  drawerHandle: string;
  drawerInputBg: string;
  drawerBtnPrimary: string;
  drawerBtnSecondary: string;
  dustColor: string;
  innerGlow: string;
  lampLight: string;
};

/* Background presets per mode */
const DARK_BACKGROUNDS = [
  { name: "Deep Brown", bg: "linear-gradient(175deg, #2a2318 0%, #1a1610 40%, #15120d 100%)" },
  { name: "Charcoal", bg: "linear-gradient(175deg, #252528 0%, #1a1a1e 40%, #131315 100%)" },
  { name: "Navy", bg: "linear-gradient(175deg, #1e2230 0%, #151820 40%, #0e1118 100%)" },
];

const LIGHT_BACKGROUNDS = [
  { name: "Ivory", bg: "linear-gradient(175deg, #faf6f0 0%, #f5f0e6 40%, #ede7db 100%)" },
  { name: "Pure White", bg: "linear-gradient(175deg, #ffffff 0%, #fafafa 40%, #f5f5f5 100%)" },
  { name: "Warm Beige", bg: "linear-gradient(175deg, #f0ebe0 0%, #e8e0d2 40%, #ddd5c5 100%)" },
];

const THEME_DARK: Omit<CardTheme, "cardBg"> = {
  mode: "dark",
  name: "Provision",
  textColor: "#c8b898",
  titleColor: "#c9a84c",
  headingColor: "#f0e8d8",
  brandColor: "#c9a84c",
  borderGlow: "0 0 40px 4px rgba(180,140,50,0.18), 0 0 80px 8px rgba(160,120,40,0.10), 0 0 120px 16px rgba(140,100,30,0.05)",
  borderSolid: "1px solid rgba(180,140,50,0.25)",
  barBg: "linear-gradient(to top, rgba(20,18,13,0.95), rgba(30,26,20,0.6))",
  barBorder: "1px solid rgba(180,140,50,0.08)",
  iconDefault: "#6b5f4d",
  iconActive: "#c9a84c",
  drawerBg: "#1a1610",
  drawerText: "#c8b898",
  drawerMuted: "#6b5f4d",
  drawerCardBg: "#221e16",
  drawerBorder: "rgba(180,140,50,0.12)",
  drawerHandle: "rgba(180,140,50,0.25)",
  drawerInputBg: "#2a2318",
  drawerBtnPrimary: "#c9a84c",
  drawerBtnSecondary: "#2a2318",
  dustColor: "rgba(210,185,120,",
  innerGlow: "inset 0 0 40px 8px rgba(180,140,50,0.04), inset 0 0 80px 16px rgba(160,120,40,0.03)",
  lampLight: "radial-gradient(ellipse 70% 35% at 50% -5%, rgba(220,190,120,0.12) 0%, rgba(200,170,100,0.04) 50%, transparent 100%)",
};

const THEME_LIGHT: Omit<CardTheme, "cardBg"> = {
  mode: "light",
  name: "Grace",
  textColor: "#4a4035",
  titleColor: "#b8942f",
  headingColor: "#2c2419",
  brandColor: "#b8942f",
  borderGlow: "0 0 30px 4px rgba(200,170,80,0.08), 0 0 60px 8px rgba(180,150,60,0.05)",
  borderSolid: "1px solid rgba(180,150,60,0.18)",
  barBg: "linear-gradient(to top, rgba(250,245,235,0.98), rgba(245,240,230,0.8))",
  barBorder: "1px solid rgba(180,150,60,0.10)",
  iconDefault: "#9a8d7a",
  iconActive: "#b8942f",
  drawerBg: "#faf6f0",
  drawerText: "#4a4035",
  drawerMuted: "#9a8d7a",
  drawerCardBg: "#f0ebe0",
  drawerBorder: "rgba(180,150,60,0.12)",
  drawerHandle: "rgba(180,150,60,0.3)",
  drawerInputBg: "#f5f0e6",
  drawerBtnPrimary: "#b8942f",
  drawerBtnSecondary: "#f0ebe0",
  dustColor: "rgba(180,150,60,",
  innerGlow: "inset 0 0 40px 8px rgba(200,170,80,0.03), inset 0 0 80px 16px rgba(180,150,60,0.02)",
  lampLight: "radial-gradient(ellipse 70% 35% at 50% -5%, rgba(200,170,80,0.06) 0%, rgba(180,150,60,0.02) 50%, transparent 100%)",
};

/* ─── Dust particles (pre-generated for perf) ──────────────────────────────── */
function DustParticles({ dustColor }: { dustColor: string }) {
  const particles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: `${8 + Math.random() * 84}%`,
      size: 1.5 + Math.random() * 2.5,
      duration: 5 + Math.random() * 8,
      delay: Math.random() * 6,
      opacity: 0.15 + Math.random() * 0.35,
      yStart: 10 + Math.random() * 60,
      drift: -15 + Math.random() * 30,
    })),
    []
  );

  return (
    <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-[5]">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            top: `${p.yStart}%`,
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, ${dustColor}${p.opacity}), transparent)`,
          }}
          animate={{
            y: [0, -40, -20, -55, -10],
            x: [0, p.drift * 0.5, p.drift, p.drift * 0.3, 0],
            opacity: [0, p.opacity, p.opacity * 0.6, p.opacity, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

const STYLES = `
@keyframes pca-glow-pulse {
  0%, 100% { opacity: 0.65; }
  50%      { opacity: 1; }
}
@keyframes pca-breathe {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.004); }
}
.pca-hide-scrollbar { overflow-y: auto; -ms-overflow-style: none; scrollbar-width: none; }
.pca-hide-scrollbar::-webkit-scrollbar { display: none; }
`;

/* ═══════════════════════════════════════════════════════════════════════════ */
export function PrayerCardAsset() {
  const [flipped, setFlipped] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [prayed, setPrayed] = useState(false);
  const [prayedBounce, setPrayedBounce] = useState(false);

  /* Theme state */
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [bgIndex, setBgIndex] = useState(0);
  const [themePickerOpen, setThemePickerOpen] = useState(false);

  const themeBase = themeMode === "dark" ? THEME_DARK : THEME_LIGHT;
  const backgrounds = themeMode === "dark" ? DARK_BACKGROUNDS : LIGHT_BACKGROUNDS;
  const theme: CardTheme = { ...themeBase, cardBg: backgrounds[bgIndex].bg } as CardTheme;

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [fontFamily, setFontFamily] = useState("Cormorant Garamond");
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalMode, setJournalMode] = useState<"type" | "speak" | "write">("type");
  const [photosOpen, setPhotosOpen] = useState(false);
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [scriptureExpanded, setScriptureExpanded] = useState(false);

  /* Load selected + preview fonts */
  useEffect(() => {
    GOOGLE_FONTS.forEach((f) => loadGoogleFont(f.name));
  }, []);

  const fontType = GOOGLE_FONTS.find((f) => f.name === fontFamily)?.type ?? "serif";

  const prayerText =
    "Lord, grant me the serenity to accept the things I cannot change, the courage to change the things I can, and the wisdom to know the difference. Let your light shine upon my path every single day.";

  /*
    @LOVABLE: SCRIPTURE & MEDITATION
    Service: Loaded via KeepPray.ing Prayer Assist endpoint or supabase.from('prayer_verses').select('*').eq('prayer_id', prayer_id)
    - These verses are discovered by KeepPray.ing Prayer Assist or manually added to support the prayer.
    - Verse references are "verselinks" — auto-transformed on the site to interactive links.
    - Clicking a verselink should prompt: "Open [reference] on KeepRead.ing for further study and meditation?"
    - If confirmed, navigate to KeepRead.ing Bible reader at the verse.
    - Soft limit: 10 verses, but every applicable verse if possible.
  */
  const MOCK_SCRIPTURES = [
    { ref: "Isaiah 41:10", text: '"Fear not, for I am with you... I will uphold you with my righteous hand."' },
    { ref: "2 Timothy 1:7", text: '"For God has not given us a spirit of fear, but of power and of love and of a sound mind."' },
    { ref: "Philippians 4:6-7", text: '"Do not be anxious about anything, but in everything by prayer... let your requests be made known to God."' },
    { ref: "Psalm 27:1", text: '"The Lord is my light and my salvation; whom shall I fear?"' },
    { ref: "1 John 4:18", text: '"There is no fear in love, but perfect love casts out fear."' },
  ];

  /* ─── Themed bar button ──────────────────────────────────────────────────── */
  const BarBtn = ({
    children, onClick, active, label,
  }: { children: React.ReactNode; onClick?: () => void; active?: boolean; label?: string }) => (
    <button
      onClick={onClick}
      className="relative p-2.5 rounded-xl transition-all duration-200 active:scale-90 group"
      style={{ color: active ? theme.iconActive : theme.iconDefault }}
      title={label}
    >
      {children}
    </button>
  );

  /* ─── Themed drawer wrapper ──────────────────────────────────────────────── */
  const drawerContentCls = "flex flex-col rounded-t-[28px] fixed bottom-0 left-0 right-0 z-50 shadow-2xl";
  const drawerStyle = { backgroundColor: theme.drawerBg, color: theme.drawerText };
  const handleStyle = { backgroundColor: theme.drawerHandle };

  return (
    <div
      style={{ perspective: "1200px", animation: "pca-breathe 6s ease-in-out infinite" }}
      className="w-full max-w-[420px] aspect-[9/16] max-h-[calc(100vh-3rem)] mx-auto select-none touch-manipulation"
    >
      <style>{STYLES}</style>

      {/* ── 3-D flip ─────────────────────────────────────────────────────── */}
      <motion.div
        animate={{ rotateY: flipped ? -180 : 0 }}
        transition={{ duration: 0.65, type: "spring", stiffness: 80, damping: 18 }}
        className="w-full h-full relative"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* ═══ FRONT FACE ═══════════════════════════════════════════════════ */}
        <div className="absolute inset-0 rounded-3xl" style={{ backfaceVisibility: "hidden", pointerEvents: flipped ? "none" : "auto" }}>

          {/* Ambient glow (outer) */}
          <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ boxShadow: theme.borderGlow, animation: "pca-glow-pulse 4s ease-in-out infinite" }} />

          {/* Card body */}
          <div
            className="absolute inset-0 rounded-3xl flex flex-col overflow-hidden"
            style={{ background: theme.cardBg, border: theme.borderSolid, boxShadow: "0 20px 60px -12px rgba(0,0,0,0.35), 0 8px 20px -8px rgba(0,0,0,0.25)" }}
          >
            {/* Inner glow — bleeds inward from edges */}
            <div
              className="absolute inset-0 pointer-events-none rounded-3xl z-[1]"
              style={{
                boxShadow: theme.innerGlow,
              }}
            />

            {/* Overhead lamp light — faint from top */}
            <div
              className="absolute inset-0 pointer-events-none rounded-3xl"
              style={{
                background: theme.lampLight,
              }}
            />
            {/* Secondary gradient falloff */}
            <div
              className="absolute inset-0 pointer-events-none rounded-3xl"
              style={{
                background: "linear-gradient(180deg, rgba(200,170,100,0.05) 0%, transparent 40%)",
              }}
            />

            {/* Dust particles */}
            <DustParticles dustColor={theme.dustColor} />

            {/* ── Content 90% ──────────────────────────────────────────────── */}
            <div className="flex-1 px-6 pt-7 pb-3 flex flex-col relative z-10">

              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-1.5" style={{ color: theme.titleColor }}>
                KEEPPRAY.ING
              </span>
              <h2
                className="text-lg font-bold mb-3 leading-snug"
                style={{ color: theme.headingColor, fontFamily: '"Playfair Display", "Georgia", serif' }}
              >
                A Prayer for Provision
              </h2>
              <div
                className="flex-1 overflow-hidden relative"
              >
                <div className="pca-hide-scrollbar h-full">
                  <p
                    className="text-[15px] leading-[1.8] tracking-[0.01em]"
                    style={{ fontFamily: `"${fontFamily}", ${fontType === "serif" ? '"Georgia", serif' : '"Helvetica Neue", sans-serif'}`, color: theme.textColor }}
                  >
                    {prayerText}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Scripture & Meditation (collapsible) ──────────────────── */}
            <div className="relative z-20" style={{ borderTop: theme.barBorder }}>
              <button
                onClick={() => setScriptureExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-2 transition-all active:scale-[0.99]"
                style={{ background: theme.barBg }}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5" style={{ color: theme.brandColor }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.brandColor }}>
                    Scripture &amp; Meditation
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${theme.brandColor}15`, color: theme.brandColor }}>
                    {MOCK_SCRIPTURES.length}
                  </span>
                </div>
                {scriptureExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" style={{ color: theme.iconDefault }} />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" style={{ color: theme.iconDefault }} />
                )}
              </button>

              <AnimatePresence>
                {scriptureExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                    style={{ background: theme.barBg }}
                  >
                    <div className="px-5 pb-3 pca-hide-scrollbar" style={{ maxHeight: "50vh", overflowY: "auto" }}>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {/*
                          @LOVABLE: VERSELINK — Each verse reference is a "verselink".
                          Verselinks are auto-transformed on the site into interactive links.
                          On click: prompt user "Open [ref] on KeepRead.ing for further study and meditation?"
                          If confirmed: navigate to KeepRead.ing Bible reader at the specific verse.
                        */}
                        {MOCK_SCRIPTURES.map((s) => (
                          <button
                            key={s.ref}
                            onClick={() => { if (window.confirm(`Open ${s.ref} on KeepRead.ing for further study and meditation?`)) { /* @LOVABLE: navigate to KeepRead.ing verse reader */ } }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all active:scale-95"
                            style={{
                              backgroundColor: `${theme.brandColor}12`,
                              border: `1px solid ${theme.brandColor}25`,
                              color: theme.brandColor,
                            }}
                            title={s.text}
                          >
                            📖 {s.ref}
                          </button>
                        ))}
                      </div>
                      {MOCK_SCRIPTURES.map((s) => (
                        <div key={s.ref} className="mb-2 last:mb-0">
                          <p
                            className="text-[11px] leading-relaxed italic"
                            style={{ color: theme.textColor, fontFamily: '"Cormorant Garamond", serif' }}
                          >
                            <strong style={{ color: theme.brandColor, fontStyle: "normal" }}>{s.ref}</strong>
                            {" — "}{s.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Bottom bar 10% ───────────────────────────────────────────── */}
            <div className="relative z-20 flex items-center justify-between px-2 py-1.5" style={{ background: theme.barBg, borderTop: theme.barBorder }}>
              <div className="flex items-center gap-0">
                {/*
                  @LOVABLE: PRIVACY TOGGLE (PUBLIC/PRIVATE)
                  Service: supabase.from('prayers').update({ is_public, is_anonymous }).eq('id', prayer_id)
                  - Status light: Red = Private, Green = Public.
                  - When public: prayer text visible on community board. Private data (journal, photos, notes) stays hidden.
                  - Anonymous toggle: hides profile name on public board.
                  - All public comments and testimonies appear on THIS same card.
                */}
                <button onClick={() => setPrivacyOpen(true)} className="p-2.5 rounded-xl transition-transform active:scale-90" title={isPublic ? "Public" : "Private"}>
                  <div className="relative w-2.5 h-2.5">
                    <div className="absolute inset-0 rounded-full transition-colors duration-500" style={{ backgroundColor: isPublic ? "#34d399" : "#f87171", boxShadow: isPublic ? "0 0 6px 2px rgba(52,211,153,0.5)" : "0 0 5px 1px rgba(248,113,113,0.4)" }} />
                    <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: isPublic ? "#34d399" : "#f87171", opacity: 0.25, animationDuration: "2.5s" }} />
                  </div>
                </button>

                {/*
                  @LOVABLE: PRAYED BUTTON
                  Service: supabase.from('prayer_interactions').upsert({ user_id, prayer_id, type: 'prayed', prayed_at })
                  - Toggles "prayed" status for this prayer.
                  - Counts how many times the user has prayed this prayer.
                  - Shows bounce animation on toggle.
                */}
                <BarBtn label="Prayed" active={prayed} onClick={() => { setPrayed(p => !p); setPrayedBounce(true); setTimeout(() => setPrayedBounce(false), 400); }}>
                  <motion.div animate={prayedBounce ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.35 }}>
                    <PrayingHandsIcon className="w-[18px] h-[18px]" />
                  </motion.div>
                </BarBtn>

                {/*
                  @LOVABLE: COMMENTS DRAWER
                  Service: supabase.from('prayer_comments').select('*').eq('prayer_id', prayer_id)
                  - Opens threaded comments for this prayer.
                  - Private comments (only visible to owner) vs public comments.
                  - Real-time subscription via supabase.channel('comments').on('INSERT', ...)
                */}
                <BarBtn label="Comments" onClick={() => setCommentsOpen(true)}>
                  <MessageCircle className="w-[18px] h-[18px]" />
                </BarBtn>
              </div>

              <div className="flex items-center gap-0">
                {/*
                  @LOVABLE: PIN TO BOARD
                  Service: supabase.from('board_pins').upsert({ user_id, prayer_id, pinned_at })
                  - Pins this prayer card to the user's personal prayer board.
                  - Should toggle pinned/unpinned state.
                  - Pinned prayers appear on the user's board wall.
                  - Pinned state persists across sessions.
                */}
                <BarBtn label="Pin to Board" onClick={() => {}}>
                  <Pin className="w-[16px] h-[16px]" />
                </BarBtn>

                {/*
                  @LOVABLE: SHARE PRAYER
                  Service: Encrypted sharing via supabase edge function.
                  - Opens share drawer with two options:
                    1. Send to Friend (1:1 encrypted share)
                    2. Form Prayer Circle (2+ people, leader controls visibility)
                  - Creates share_link record: supabase.from('prayer_shares').insert({ prayer_id, shared_with, encrypted_content })
                  - When sent to 2+ people, auto-creates prayer_circle record.
                  - Circle leader can toggle member visibility (for accountability).
                  - If more prayers sent to same person, prompt: "Add to existing circle or create new?"
                */}
                <BarBtn label="Share" onClick={() => setShareOpen(true)}>
                  <Share2 className="w-[16px] h-[16px]" />
                </BarBtn>

                {/*
                  @LOVABLE: TEXT-TO-SPEECH / READ ALOUD
                  Service: Web Speech API (window.speechSynthesis) or cloud TTS.
                  - Reads the prayer text aloud using device TTS engine.
                  - Should support play/pause/stop controls.
                  - Optional: Use a cloud TTS API (Google, Azure) for higher quality voices.
                  - Store user's preferred voice/speed in user_preferences table.
                */}
                <BarBtn label="Listen">
                  <Volume2 className="w-[16px] h-[16px]" />
                </BarBtn>

                {/*
                  @LOVABLE: FLIP TO TESTIMONY SIDE
                  Service: supabase.from('testimonies').select('*').eq('prayer_id', prayer_id)
                  - Flips card to show testimony side.
                  - Loads all testimonies for this prayer from the database.
                  - Each testimony has: author, text, created_at, praises count.
                  - Users can post new testimonies (type, speak-to-text, or handwrite).
                */}
                <BarBtn label="Testify" onClick={() => setFlipped(true)}>
                  <UserRoundCheck className="w-[16px] h-[16px]" />
                </BarBtn>
                <BarBtn label="More" onClick={() => setOptionsOpen(true)}>
                  <MoreHorizontal className="w-[16px] h-[16px]" />
                </BarBtn>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ BACK FACE ═══════════════════════════════════════════════════ */}
        <div
          className="absolute inset-0 rounded-3xl overflow-hidden"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", pointerEvents: flipped ? "auto" : "none", boxShadow: "0 20px 60px -12px rgba(0,0,0,0.35), 0 8px 20px -8px rgba(0,0,0,0.25)" }}
        >
          <div className="absolute inset-0 rounded-3xl overflow-hidden" style={{ border: theme.borderSolid }}>
            <TestimonyCanvasAsset onFlipBack={() => setFlipped(false)} />
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          THEMED DRAWERS
      ═══════════════════════════════════════════════════════════════════ */}

      {/* ── Comments ───────────────────────────────────────────────────── */}
      <Drawer.Root open={commentsOpen} onOpenChange={setCommentsOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <Drawer.Content className={drawerContentCls + " h-[70vh]"} style={drawerStyle}>
            <div className="p-5 flex-1 overflow-hidden flex flex-col">
              <div className="mx-auto w-10 h-1 rounded-full mb-5" style={handleStyle} />
              <Drawer.Title className="font-semibold mb-1 px-1 text-[15px]" style={{ color: theme.drawerText }}>
                Comments
              </Drawer.Title>
              <p className="text-xs mb-5 px-1" style={{ color: theme.drawerMuted }}>
                Private entries are only visible to you.
              </p>

              <div className="flex-1 overflow-auto px-1 space-y-3">
                <div className="p-4 rounded-2xl text-sm" style={{ backgroundColor: "rgba(180,140,50,0.08)", border: `1px solid ${theme.drawerBorder}`, color: theme.drawerText }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-3 h-3" style={{ color: theme.brandColor }} />
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.brandColor }}>Private</span>
                  </div>
                  I really need to focus on the &lsquo;courage&rsquo; part this week. Lord, help me to be brave.
                </div>

                <div className="p-4 rounded-2xl text-sm" style={{ backgroundColor: theme.drawerCardBg, border: `1px solid ${theme.drawerBorder}`, color: theme.drawerText }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-[10px] font-bold text-white">J</div>
                    <span className="text-xs font-medium" style={{ color: theme.drawerText }}>John D.</span>
                    <span className="text-[10px] ml-auto" style={{ color: theme.drawerMuted }}>2h ago</span>
                  </div>
                  Praying with you on this 🙏
                </div>

                <div className="p-4 rounded-2xl text-sm" style={{ backgroundColor: theme.drawerCardBg, border: `1px solid ${theme.drawerBorder}`, color: theme.drawerText }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-[10px] font-bold text-white">S</div>
                    <span className="text-xs font-medium" style={{ color: theme.drawerText }}>Sarah M.</span>
                    <span className="text-[10px] ml-auto" style={{ color: theme.drawerMuted }}>5h ago</span>
                  </div>
                  Amen! This resonates so deeply with me right now.
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 px-1">
                <input type="text" placeholder="Write a comment…" className="flex-1 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-all" style={{ backgroundColor: theme.drawerInputBg, border: `1px solid ${theme.drawerBorder}`, color: theme.drawerText, caretColor: theme.brandColor }} />
                <button className="w-10 h-10 rounded-full flex items-center justify-center transition-colors active:scale-90" style={{ backgroundColor: theme.drawerBtnPrimary, color: "#1a1610" }}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* ── Options (3-dot) ─────────────────────────────────────────────── */}
      <Drawer.Root open={optionsOpen} onOpenChange={setOptionsOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <Drawer.Content className={drawerContentCls} style={drawerStyle}>
            <div className="p-5 overflow-y-auto">
              <div className="mx-auto w-10 h-1 rounded-full mb-5" style={handleStyle} />

              {/*
                @LOVABLE: GO TO PRAYER CIRCLE
                Service: supabase.from('prayer_circles').select('*, members(*)').eq('id', circle_id)
                - Navigates to the prayer circle view.
                - Shows all circle members, their comments, testimonies, and shared Journal Entries.
                - Circle leader can toggle member visibility for accountability.
                - Only visible if this prayer belongs to an active prayer circle.
              */}
              <button className="w-full flex items-center gap-3 p-3.5 rounded-2xl mb-4 text-left group active:scale-[0.98] transition-all" style={{ backgroundColor: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(52,211,153,0.12)" }}>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-emerald-400 text-sm leading-tight">Go to Prayer Circle</h4>
                  <p className="text-[11px] text-emerald-500/50 truncate">John, Sarah &amp; 2 others</p>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-500/40 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/*
                @LOVABLE: SAVE TO PRAYER ROOM
                Service: supabase.from('prayer_room').upsert({ user_id, prayer_id, saved_at })
                - Saves this prayer to the user's personal "Prayer Room" collection.
                - Prayer Room is a dedicated space for prayers the user wants to revisit.
                - Different from Board: Room = devotional/revisit, Board = display/wall.
                - Toggle: if already saved, this becomes "Remove from Prayer Room".
              */}
              <button className="w-full flex items-center gap-3 p-3.5 rounded-2xl mb-4 text-left group active:scale-[0.98] transition-all" style={{ backgroundColor: "rgba(180,140,50,0.06)", border: `1px solid ${theme.drawerBorder}` }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(180,140,50,0.1)" }}>
                  <Heart className="w-4 h-4" style={{ color: theme.brandColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm leading-tight" style={{ color: theme.drawerText }}>Save to Prayer Room</h4>
                  <p className="text-[11px] truncate" style={{ color: theme.drawerMuted }}>Keep this prayer in your devotional space</p>
                </div>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" style={{ color: theme.drawerMuted }} />
              </button>

              {/*
                @LOVABLE: ENRICH WITH SCRIPTURE
                Service: POST to KeepPray.ing Prayer Assist endpoint with prayer text.
                - Prayer Assist reads the prayer and returns matching Bible verses.
                - Two modes:
                  1. KeepPray.ing Prayer Assist: Intelligently discovers verses that back up the prayer.
                     POST /api/prayer-assist/enrich { prayer_text } → returns array of { reference, text, relevance_score }
                  2. Manual: User searches and adds verses from KeepRead.ing Bible reader.
                     supabase.from('prayer_verses').insert({ prayer_id, verse_ref, verse_text, source: 'manual' })
                - Soft limit: 10 verses, but includes every applicable verse.
                - "God loves when you pray His word back to Him."
                - Verse references become "verselinks" that prompt navigation to KeepRead.ing.
              */}
              <button
                onClick={() => { setOptionsOpen(false); setTimeout(() => setEnrichOpen(true), 200); }}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl mb-4 text-left group active:scale-[0.98] transition-all"
                style={{ backgroundColor: `${theme.brandColor}0a`, border: `1px solid ${theme.brandColor}20` }}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${theme.brandColor}15` }}>
                  <Sparkles className="w-4 h-4" style={{ color: theme.brandColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm leading-tight" style={{ color: theme.brandColor }}>Enrich with Scripture</h4>
                  <p className="text-[11px] truncate" style={{ color: theme.drawerMuted }}>Discover verses that back up your prayer</p>
                </div>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" style={{ color: theme.drawerMuted }} />
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  /*
                    @LOVABLE: PRIVATE SHARE
                    Service: Same as Share drawer — encrypted share to selected contacts.
                    Opens share drawer. See Share drawer @LOVABLE notes for full implementation.
                  */
                  { icon: UserPlus, label: "Private Share", iconColor: "#6ee7b7", action: () => { setOptionsOpen(false); setTimeout(() => setShareOpen(true), 200); } },
                  /*
                    @LOVABLE: JOURNAL ENTRY — FULL SCREEN
                    Service: supabase.from('journal_entries').insert({ user_id, prayer_id, content, type, created_at })
                    - Opens full-screen drawer with type/speak/write input modes.
                    - Journal entries are always PRIVATE (never public).
                    - Saved to user's main journal log on Prayer Room board.
                    - Supports text, voice memo (recorded audio), and handwriting.
                    - Stored per-prayer and per-user.
                  */
                  { icon: StickyNote, label: "Journal Entry", iconColor: "#c9a84c", action: () => { setOptionsOpen(false); setTimeout(() => setJournalOpen(true), 200); } },
                  /*
                    @LOVABLE: ADD PHOTOS — FULL SCREEN UPLOAD
                    Service: supabase.storage.from('prayer-photos').upload(filepath, file)
                    Then: supabase.from('prayer_photos').insert({ prayer_id, user_id, storage_path, caption })
                    - Opens full-screen drawer with image upload area.
                    - Supports camera capture or gallery pick.
                    - Shows image previews with caption input per photo.
                    - Photos are private by default, viewable only by owner and prayer circle members.
                    - Max 10 photos per prayer, compressed before upload.
                    - Can be set as prayer card background image.
                  */
                  { icon: ImageIcon, label: "Add Photos", iconColor: "#7dd3fc", action: () => { setOptionsOpen(false); setTimeout(() => setPhotosOpen(true), 200); } },
                  /*
                    @LOVABLE: CHANGE THEME
                    Service: supabase.from('prayer_settings').upsert({ prayer_id, theme_mode, bg_index })
                    - Opens theme picker drawer (light/dark mode + 3 backgrounds each).
                    - Theme is saved per-prayer so each card can have its own look.
                    - Persists across sessions and syncs across devices.
                  */
                  { icon: Palette, label: "Change Theme", iconColor: "#c4b5fd", action: () => { setOptionsOpen(false); setTimeout(() => setThemePickerOpen(true), 200); } },
                  /*
                    @LOVABLE: CHANGE FONT
                    Service: supabase.from('prayer_settings').upsert({ prayer_id, font_family })
                    - Opens font picker drawer with 12 Google Fonts (6 serif, 6 sans-serif).
                    - Font choice is saved per-prayer.
                    - Fonts are loaded dynamically from Google Fonts CDN.
                  */
                  { icon: Type, label: "Change Font", iconColor: "#fbbf24", action: () => { setOptionsOpen(false); setTimeout(() => setFontPickerOpen(true), 200); } },
                ].map(({ icon: Icon, label, iconColor, action }: any) => (
                  <button key={label} onClick={action} className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl transition-all active:scale-95" style={{ backgroundColor: theme.drawerCardBg, border: `1px solid ${theme.drawerBorder}` }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                      <Icon className="w-5 h-5" style={{ color: iconColor }} />
                    </div>
                    <span className="text-[13px] font-medium" style={{ color: theme.drawerText }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* ── Font Picker ────────────────────────────────────────────────── */}
      <Drawer.Root open={fontPickerOpen} onOpenChange={setFontPickerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-md" />
          <Drawer.Content className={drawerContentCls + " h-[75vh]"} style={drawerStyle}>
            <div className="p-5 flex-1 overflow-hidden flex flex-col">
              <div className="mx-auto w-10 h-1 rounded-full mb-4" style={handleStyle} />
              <Drawer.Title className="font-semibold mb-1 px-1 text-[15px]" style={{ color: theme.drawerText }}>
                Choose a Font
              </Drawer.Title>
              <p className="text-xs mb-4 px-1" style={{ color: theme.drawerMuted }}>
                Preview updates in real time behind the drawer.
              </p>

              <div className="flex-1 overflow-auto space-y-2 px-1 pca-hide-scrollbar">
                {GOOGLE_FONTS.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => setFontFamily(f.name)}
                    className="w-full text-left p-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-between"
                    style={{
                      backgroundColor: fontFamily === f.name ? "rgba(180,140,50,0.12)" : theme.drawerCardBg,
                      border: fontFamily === f.name ? "1px solid rgba(180,140,50,0.25)" : `1px solid ${theme.drawerBorder}`,
                    }}
                  >
                    <div>
                      <p
                        className="text-[16px] leading-snug mb-0.5"
                        style={{ fontFamily: `"${f.name}", ${f.type}`, color: theme.drawerText }}
                      >
                        The Lord is my shepherd
                      </p>
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: theme.drawerMuted }}>
                        {f.name} · {f.category} · {f.type}
                      </span>
                    </div>
                    {fontFamily === f.name && (
                      <Check className="w-5 h-5 flex-shrink-0 ml-3" style={{ color: theme.brandColor }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* ── Theme Picker ──────────────────────────────────────────────── */}
      <Drawer.Root open={themePickerOpen} onOpenChange={setThemePickerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-md" />
          <Drawer.Content className={drawerContentCls} style={drawerStyle}>
            <div className="p-5 overflow-y-auto pca-hide-scrollbar">
              <div className="mx-auto w-10 h-1 rounded-full mb-4" style={handleStyle} />
              <Drawer.Title className="font-semibold mb-1 px-1 text-[15px]" style={{ color: theme.drawerText }}>
                Card Theme
              </Drawer.Title>
              <p className="text-xs mb-5 px-1" style={{ color: theme.drawerMuted }}>
                Choose a mode and background for your prayer card.
              </p>

              {/* Mode toggle */}
              <div className="flex rounded-2xl overflow-hidden mb-5" style={{ border: `1px solid ${theme.drawerBorder}` }}>
                {(["dark", "light"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setThemeMode(m); setBgIndex(0); }}
                    className="flex-1 py-3 text-sm font-semibold capitalize transition-all"
                    style={{
                      backgroundColor: themeMode === m ? (m === "dark" ? "#2a2318" : "#f0ebe0") : "transparent",
                      color: themeMode === m ? (m === "dark" ? "#c9a84c" : "#b8942f") : theme.drawerMuted,
                    }}
                  >
                    {m === "dark" ? "🌙 Dark" : "☀️ Light"}
                  </button>
                ))}
              </div>

              {/* Background presets */}
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: theme.drawerMuted }}>
                Background
              </p>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {backgrounds.map((b, i) => (
                  <button
                    key={b.name}
                    onClick={() => setBgIndex(i)}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all active:scale-95"
                    style={{
                      backgroundColor: theme.drawerCardBg,
                      border: bgIndex === i ? `2px solid ${theme.brandColor}` : `1px solid ${theme.drawerBorder}`,
                    }}
                  >
                    <div
                      className="w-full aspect-[3/4] rounded-xl"
                      style={{ background: b.bg, border: "1px solid rgba(128,128,128,0.1)" }}
                    />
                    <span className="text-[10px] font-medium" style={{ color: bgIndex === i ? theme.brandColor : theme.drawerMuted }}>
                      {b.name}
                    </span>
                  </button>
                ))}
              </div>

              {/* Preview note */}
              <p className="text-[10px] text-center italic" style={{ color: theme.drawerMuted }}>
                Theme is saved with your prayer card.
              </p>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* ── Privacy ─────────────────────────────────────────────────────── */}
      <Drawer.Root open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <Drawer.Content className={drawerContentCls} style={drawerStyle}>
            <div className="p-6 max-h-[85vh] overflow-auto">
              <div className="mx-auto w-10 h-1 rounded-full mb-6" style={handleStyle} />

              <Drawer.Title className="text-xl font-display font-medium mb-5 text-center leading-snug" style={{ color: theme.drawerText }}>
                {isPublic ? "Make your prayer private?" : "Make your prayer public for others to be edified?"}
              </Drawer.Title>

              {!isPublic && (
                <div className="space-y-3 mb-7">
                  <div className="p-4 rounded-2xl text-[13px] leading-relaxed" style={{ backgroundColor: "rgba(180,140,50,0.08)", border: `1px solid rgba(180,140,50,0.15)`, color: theme.drawerText }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-3.5 h-3.5" style={{ color: theme.brandColor }} />
                      <strong className="text-xs uppercase tracking-wider" style={{ color: theme.brandColor }}>Privacy Note</strong>
                    </div>
                    Your personal faith journey remains entirely private. All private comments, Journal Entries, uploaded photos, and personal artifacts stay hidden.
                  </div>

                  <div className="p-4 rounded-2xl text-[13px] leading-relaxed" style={{ backgroundColor: theme.drawerCardBg, border: `1px solid ${theme.drawerBorder}`, color: theme.drawerText }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-3.5 h-3.5" style={{ color: theme.drawerMuted }} />
                      <strong className="text-xs uppercase tracking-wider" style={{ color: theme.drawerText }}>What becomes public</strong>
                    </div>
                    <p className="mb-3">Only the prayer text itself is made public. Others can:</p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {[
                        { icon: MessageCircle, text: "Comment" },
                        { icon: HandHeart, text: "Pray for you" },
                        { icon: Bookmark, text: "Save to board" },
                        { icon: Share2, text: "Share it" },
                        { icon: Volume2, text: "Read aloud" },
                        { icon: UserRoundCheck, text: "Testify" },
                      ].map(({ icon: Icon, text }) => (
                        <div key={text} className="flex items-center gap-2 text-[12px]" style={{ color: theme.drawerMuted }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: theme.drawerMuted }} />
                          {text}
                        </div>
                      ))}
                    </div>
                    <span className="block text-[12px] font-medium rounded-lg px-3 py-2" style={{ color: theme.brandColor, backgroundColor: "rgba(180,140,50,0.08)" }}>
                      All public comments and testimonies stay right on this same card — no need to visit a separate page.
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl" style={{ backgroundColor: theme.drawerCardBg, border: `1px solid ${theme.drawerBorder}` }}>
                    <div className="flex flex-col gap-0.5 pr-4">
                      <span className="font-medium text-sm" style={{ color: theme.drawerText }}>Post Anonymously</span>
                      <span className="text-[12px] leading-snug" style={{ color: theme.drawerMuted }}>Your profile name will be hidden on the public board.</span>
                    </div>
                    <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
                  </div>
                </div>
              )}

              {isPublic && (
                <div className="p-4 rounded-2xl text-[13px] leading-relaxed mb-7 text-center" style={{ backgroundColor: theme.drawerCardBg, border: `1px solid ${theme.drawerBorder}`, color: theme.drawerText }}>
                  Making this prayer private will hide it from the community. Only you will be able to see it.
                </div>
              )}

              <button
                onClick={() => { setIsPublic(!isPublic); setPrivacyOpen(false); }}
                className="w-full py-3.5 rounded-2xl font-medium transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: isPublic ? "#3a3228" : "#34d399",
                  color: isPublic ? theme.drawerText : "#1a1610",
                  boxShadow: isPublic ? "none" : "0 4px 16px -2px rgba(52,211,153,0.3)",
                }}
              >
                {isPublic ? "Make Private" : "Make Public"}
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* ── Share ───────────────────────────────────────────────────────── */}
      <Drawer.Root open={shareOpen} onOpenChange={setShareOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <Drawer.Content className={drawerContentCls + " max-h-[85vh]"} style={drawerStyle}>
            <div className="p-6 flex-1 overflow-auto">
              <div className="mx-auto w-10 h-1 rounded-full mb-6" style={handleStyle} />

              <Drawer.Title className="text-xl font-display font-medium mb-2 text-center" style={{ color: theme.drawerText }}>
                Share this Prayer
              </Drawer.Title>
              <div className="flex justify-center mb-6">
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: theme.drawerCardBg, border: `1px solid ${theme.drawerBorder}`, color: theme.drawerMuted }}>
                  <Lock className="w-3 h-3" /> Encrypted &amp; Private
                </span>
              </div>

              <div className="space-y-3 mb-7">
                <button className="w-full text-left p-5 rounded-2xl transition-all active:scale-[0.98]" style={{ backgroundColor: theme.drawerCardBg, border: `1px solid ${theme.drawerBorder}` }}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(52,211,153,0.1)" }}>
                      <UserPlus className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1 text-[14px]" style={{ color: theme.drawerText }}>Send to a Friend</h4>
                      <p className="text-[13px] leading-relaxed" style={{ color: theme.drawerMuted }}>
                        Share one-on-one. They can comment, write Journal Entries, and testify with you privately.
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 mt-1" style={{ color: theme.drawerMuted }} />
                  </div>
                </button>

                <button className="w-full text-left p-5 rounded-2xl transition-all active:scale-[0.98]" style={{ backgroundColor: theme.drawerCardBg, border: `1px solid ${theme.drawerBorder}` }}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(180,140,50,0.1)" }}>
                      <Users className="w-5 h-5" style={{ color: theme.brandColor }} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1 text-[14px]" style={{ color: theme.drawerText }}>Form a Prayer Circle</h4>
                      <p className="text-[13px] leading-relaxed mb-3" style={{ color: theme.drawerMuted }}>
                        Send to two or more people to form a <strong style={{ color: theme.drawerText }}>Prayer Circle</strong>. As the leader, you choose if members see each other or remain private for 1-on-1 accountability.
                      </p>
                      <div className="rounded-xl p-3 flex flex-col gap-1.5" style={{ backgroundColor: "rgba(180,140,50,0.06)", border: `1px solid ${theme.drawerBorder}` }}>
                        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.brandColor }}>Circle members can:</span>
                        <ul className="text-[12px] space-y-1 ml-0.5" style={{ color: theme.drawerMuted }}>
                          {["Comment & testify together", "Upload photos & artifacts", "Write Journal Entries", "Provide mutual accountability"].map(t => (
                            <li key={t} className="flex items-center gap-2">
                              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: theme.brandColor }} />
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 mt-1" style={{ color: theme.drawerMuted }} />
                  </div>
                </button>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 py-3.5 rounded-2xl font-medium transition-colors active:scale-[0.98]" style={{ backgroundColor: theme.drawerCardBg, border: `1px solid ${theme.drawerBorder}`, color: theme.drawerText }}>
                  Copy Link
                </button>
                <button className="flex-1 py-3.5 rounded-2xl font-medium transition-colors active:scale-[0.98]" style={{ backgroundColor: theme.drawerBtnPrimary, color: "#1a1610", boxShadow: "0 4px 16px -2px rgba(180,140,50,0.25)" }}>
                  Share Now
                </button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* ── Journal Entry (Full Screen) ────────────────────────────────── */}
      <Drawer.Root open={journalOpen} onOpenChange={setJournalOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-md" />
          <Drawer.Content className={drawerContentCls + " h-[92vh]"} style={drawerStyle}>
            <div className="p-5 flex-1 flex flex-col overflow-hidden">
              <div className="mx-auto w-10 h-1 rounded-full mb-4" style={handleStyle} />
              <div className="flex items-center justify-between mb-4">
                <Drawer.Title className="font-semibold text-[15px]" style={{ color: theme.drawerText }}>
                  Journal Entry
                </Drawer.Title>
                <span className="text-[10px] px-2 py-1 rounded-full font-medium" style={{ backgroundColor: `${theme.brandColor}15`, color: theme.brandColor }}>
                  🔒 Private
                </span>
              </div>

              {/*
                @LOVABLE: JOURNAL ENTRY — saved to user's main journal log on Prayer Room board.
                supabase.from('journal_entries').insert({ user_id, prayer_id, content, type: journalMode, created_at })
                - 'type' mode: Rich text entry saved as HTML/markdown.
                - 'speak' mode: Audio recording via MediaRecorder API → upload to storage → optional transcription.
                - 'write' mode: Handwriting canvas (same as TestimonyCanvasAsset write mode).
                - All journal entries are ALWAYS private, never public.
              */}
              <div className="flex rounded-xl overflow-hidden mb-4" style={{ border: `1px solid ${theme.drawerBorder}` }}>
                {([
                  { mode: "type" as const, icon: Type, label: "Type" },
                  { mode: "speak" as const, icon: Mic, label: "Speak" },
                  { mode: "write" as const, icon: PenLine, label: "Write" },
                ]).map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => setJournalMode(mode)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all"
                    style={{
                      backgroundColor: journalMode === mode ? `${theme.brandColor}18` : "transparent",
                      color: journalMode === mode ? theme.brandColor : theme.drawerMuted,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex-1 rounded-2xl overflow-hidden" style={{ backgroundColor: theme.drawerCardBg, border: `1px solid ${theme.drawerBorder}` }}>
                {journalMode === "type" && (
                  <textarea
                    placeholder="Write your thoughts, reflections, what God is showing you..."
                    className="w-full h-full p-4 text-sm leading-relaxed resize-none focus:outline-none"
                    style={{ backgroundColor: "transparent", color: theme.drawerText, caretColor: theme.brandColor }}
                  />
                )}
                {journalMode === "speak" && (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: `${theme.brandColor}15`, border: `2px solid ${theme.brandColor}30` }}>
                      <Mic className="w-8 h-8" style={{ color: theme.brandColor }} />
                    </div>
                    <p className="text-xs" style={{ color: theme.drawerMuted }}>Tap to start recording</p>
                  </div>
                )}
                {journalMode === "write" && (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <PenLine className="w-10 h-10" style={{ color: theme.drawerMuted }} />
                    <p className="text-xs" style={{ color: theme.drawerMuted }}>Handwriting canvas will load here</p>
                  </div>
                )}
              </div>

              <button
                className="w-full py-3.5 rounded-2xl font-medium mt-4 transition-all active:scale-[0.98]"
                style={{ backgroundColor: theme.drawerBtnPrimary, color: "#1a1610", boxShadow: `0 4px 16px -2px ${theme.brandColor}40` }}
              >
                Save Journal Entry
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* ── Add Photos (Full Screen) ───────────────────────────────────── */}
      <Drawer.Root open={photosOpen} onOpenChange={setPhotosOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-md" />
          <Drawer.Content className={drawerContentCls + " h-[92vh]"} style={drawerStyle}>
            <div className="p-5 flex-1 flex flex-col overflow-hidden">
              <div className="mx-auto w-10 h-1 rounded-full mb-4" style={handleStyle} />
              <Drawer.Title className="font-semibold mb-1 text-[15px]" style={{ color: theme.drawerText }}>
                Add Photos
              </Drawer.Title>
              <p className="text-xs mb-5" style={{ color: theme.drawerMuted }}>
                Upload images to your prayer. You can set one as the card background.
              </p>

              {/*
                @LOVABLE: PHOTO UPLOAD
                - Use <input type="file" accept="image/*" multiple> or camera capture.
                - Show preview thumbnails with caption input for each photo.
                - Compress images client-side before upload (max 2MB each).
                - Upload to: supabase.storage.from('prayer-photos').upload(path, file)
                - Store metadata: supabase.from('prayer_photos').insert({ prayer_id, user_id, storage_path, caption, is_background })
                - If 'is_background' is true, the image is used as the prayer card background.
              */}
              <div
                className="flex-1 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all"
                style={{ backgroundColor: theme.drawerCardBg, border: `2px dashed ${theme.drawerBorder}` }}
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${theme.brandColor}10` }}>
                  <Upload className="w-7 h-7" style={{ color: theme.brandColor }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium mb-1" style={{ color: theme.drawerText }}>Tap to upload photos</p>
                  <p className="text-[11px]" style={{ color: theme.drawerMuted }}>JPG, PNG · Max 10 photos</p>
                </div>
                <div className="flex gap-3">
                  <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium active:scale-95 transition-all" style={{ backgroundColor: `${theme.brandColor}15`, color: theme.brandColor }}>
                    <Camera className="w-3.5 h-3.5" /> Camera
                  </button>
                  <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium active:scale-95 transition-all" style={{ backgroundColor: `${theme.brandColor}15`, color: theme.brandColor }}>
                    <ImageIcon className="w-3.5 h-3.5" /> Gallery
                  </button>
                </div>
              </div>

              {/* Preview area (shown when photos selected) */}
              <div className="mt-3 pca-hide-scrollbar" style={{ maxHeight: "120px", overflowY: "auto" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.drawerMuted }}>
                  Uploaded photos will appear here with caption fields
                </p>
              </div>

              <button
                className="w-full py-3.5 rounded-2xl font-medium mt-3 transition-all active:scale-[0.98]"
                style={{ backgroundColor: theme.drawerBtnPrimary, color: "#1a1610", boxShadow: `0 4px 16px -2px ${theme.brandColor}40` }}
              >
                Save Photos
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* ── Enrich with Scripture ───────────────────────────────────────── */}
      <Drawer.Root open={enrichOpen} onOpenChange={setEnrichOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-md" />
          <Drawer.Content className={drawerContentCls + " h-[85vh]"} style={drawerStyle}>
            <div className="p-5 flex-1 flex flex-col overflow-hidden">
              <div className="mx-auto w-10 h-1 rounded-full mb-4" style={handleStyle} />
              <Drawer.Title className="font-semibold mb-1 text-[15px]" style={{ color: theme.drawerText }}>
                Enrich with Scripture
              </Drawer.Title>
              <p className="text-xs italic mb-5" style={{ color: theme.brandColor }}>
                "God loves when you pray His word back to Him."
              </p>

              {/*
                @LOVABLE: ENRICH WITH SCRIPTURE
                Two modes:
                1. KeepPray.ing Prayer Assist: POST /api/prayer-assist/enrich { prayer_text }
                   - Prayer Assist reads the prayer and returns matching Bible verses.
                   - Returns: [{ reference, text, relevance_score, book, chapter, verse }]
                   - Soft limit: 10 verses, but includes every applicable verse.
                   - Rendered as verse cards with reference badges (verselinks) + full text.
                2. Manual Add: Opens KeepRead.ing Bible search.
                   - User searches for verses by keyword, reference, or book.
                   - supabase.from('prayer_verses').insert({ prayer_id, verse_ref, verse_text, source: 'manual' })
                   - Verse references become verselinks — clicking prompts navigation to KeepRead.ing.
              */}
              <div className="space-y-3 mb-5">
                <button className="w-full text-left p-4 rounded-2xl transition-all active:scale-[0.98]" style={{ backgroundColor: `${theme.brandColor}0a`, border: `1px solid ${theme.brandColor}20` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${theme.brandColor}15` }}>
                      <Sparkles className="w-5 h-5" style={{ color: theme.brandColor }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-0.5" style={{ color: theme.brandColor }}>KeepPray.ing Prayer Assist</h4>
                      <p className="text-[11px]" style={{ color: theme.drawerMuted }}>
                        Intelligently discover verses that back up your prayer
                      </p>
                    </div>
                  </div>
                </button>

                <button className="w-full text-left p-4 rounded-2xl transition-all active:scale-[0.98]" style={{ backgroundColor: theme.drawerCardBg, border: `1px solid ${theme.drawerBorder}` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                      <Plus className="w-5 h-5" style={{ color: theme.drawerMuted }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-0.5" style={{ color: theme.drawerText }}>Add Manually</h4>
                      <p className="text-[11px]" style={{ color: theme.drawerMuted }}>
                        Search and add verses from the Bible
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Current verses */}
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: theme.drawerMuted }}>
                Linked Verses ({MOCK_SCRIPTURES.length})
              </p>
              <div className="flex-1 overflow-auto pca-hide-scrollbar space-y-2">
                {MOCK_SCRIPTURES.map((s) => (
                  <div key={s.ref} className="p-3 rounded-xl" style={{ backgroundColor: theme.drawerCardBg, border: `1px solid ${theme.drawerBorder}` }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold" style={{ color: theme.brandColor }}>📖 {s.ref}</span>
                      <button className="active:scale-90 transition-transform">
                        <X className="w-3 h-3" style={{ color: theme.drawerMuted }} />
                      </button>
                    </div>
                    <p className="text-[11px] leading-relaxed italic" style={{ color: theme.drawerText, fontFamily: '"Cormorant Garamond", serif' }}>
                      {s.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
