/**
 * PrayerCard — The ONE canonical prayer card component for KeepPray.ing.
 *
 * Replaces: BoardCard, PrayerViewerModal, DrawerPrayerCard, PrayerCardLink,
 *           PrayerCard3D, PrayerDraftCard, PrayerCardAsset (production use).
 *
 * Variants:
 *   "full"    — Board card with all features (flip, drawers, all actions)
 *   "compact" — Search results / explore feed (title + 2 lines + action bar)
 *   "preview" — Tooltip/popover preview (title + 3 lines, no actions)
 *   "shared"  — Shared prayer landing (read-only + Save CTA)
 *   "embed"   — Inside PrayerAssist chat or circle thread
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { trashItem } from "@/hooks/useTrashBin";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Drawer } from "vaul";
import Comments from "@/components/Comments";
import AIEnrichPanel from "@/components/AIEnrichPanel";
import { TestifyBack } from "@/components/board/TestifyBack";
import { TestimonyCardFace } from "@/components/board/TestimonyCardFace";
import { VoiceWaveformPlayer } from "@/components/board/VoiceWaveformPlayer";
import { renderWithVerseLinks } from "@/lib/renderWithVerseLinks";
import { FormattedText } from "@/lib/FormattedText";
import { DustParticles } from "@/components/board/DustParticles";
import { BarBtn } from "@/components/board/BarBtn";
import { SharePrayerModal } from "@/components/SharePrayerModal";
import {
  type CardTheme,
  THEME_DARK,
  THEME_LIGHT,
  DARK_BACKGROUNDS,
  LIGHT_BACKGROUNDS,
  GOOGLE_FONTS,
  loadGoogleFont,
  PrayingHandsIcon,
  isLuminanceDark,
  buildCardTheme,
  PRAYER_CARD_STYLES,
} from "@/components/board/prayerCardTheme";
import { useTtsPlayer } from "@/hooks/useTtsPlayer";
import { TtsContemplationOverlay } from "@/components/TtsContemplationOverlay";
import TtsLoadingPopup from "@/components/TtsLoadingPopup";
import type { Database } from "@/integrations/supabase/types";
import {
  Heart, Pin, ChevronDown, ChevronUp, ChevronRight, Sparkles, Tag,
  Trash2, Globe, Lock, Loader2, MoreHorizontal, Share2, Type, Check,
  Volume2, BookOpen, MessageCircle, Palette, UserRoundCheck, X,
  Eye, HandHeart, Bookmark, Users, StickyNote, ImageIcon, UserPlus,
  Mic, PenLine, Camera, Plus, Upload,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsTouch } from "@/hooks/use-mobile";

type PrayerCardRow = Database["public"]["Tables"]["prayer_cards"]["Row"];

export type PrayerCardVariant = "full" | "compact" | "preview" | "shared" | "embed";

export type PrayerAction =
  | "prayed"
  | "share"
  | "pin"
  | "favorite"
  | "delete"
  | "enrich"
  | "testify"
  | "listen"
  | "comment"
  | "save_to_board";

export interface SavedMeta {
  id: string;
  pinned?: boolean;
  favorite?: boolean;
  notes?: string | null;
  position?: number;
  overlay_opacity?: number;
  card_color?: { bg: string; text: string } | null;
}

export interface PrayerCardProps {
  prayer: PrayerCardRow;
  savedMeta?: SavedMeta;
  variant: PrayerCardVariant;
  isOwner: boolean;
  userId?: string;
  themeOverride?: CardTheme;
  themeVars?: Record<string, string>;
  onAction?: (action: PrayerAction, payload?: any) => void;
  onRefresh?: () => void;
  captionModeTts?: boolean;
  ttsVoiceId?: string;
}

const PRAYER_CHAR_LIMIT = 320;

/* ── Inject global styles once ───────────────────────────────────────────── */
let stylesInjected = false;
function ensureStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const tag = document.createElement("style");
  tag.textContent = PRAYER_CARD_STYLES;
  document.head.appendChild(tag);
}

/* ── Label palette ───────────────────────────────────────────────────────── */
const LABEL_PALETTE: Record<string, { bg: string; text: string }> = {
  healing:      { bg: "hsl(150 40% 88%)", text: "hsl(150 38% 26%)" },
  peace:        { bg: "hsl(210 55% 88%)", text: "hsl(210 55% 30%)" },
  faith:        { bg: "hsl(42 80% 92%)",  text: "hsl(38 75% 32%)" },
  forgiveness:  { bg: "hsl(280 35% 88%)", text: "hsl(280 40% 30%)" },
  intercession: { bg: "hsl(150 30% 88%)", text: "hsl(150 38% 28%)" },
  provision:    { bg: "hsl(42 70% 90%)",  text: "hsl(38 65% 30%)" },
  guidance:     { bg: "hsl(220 45% 90%)", text: "hsl(220 50% 30%)" },
  gratitude:    { bg: "hsl(30 60% 90%)",  text: "hsl(30 55% 30%)" },
};
const DEFAULT_LABEL = { bg: "hsl(42 80% 90%)", text: "hsl(38 75% 35%)" };

/* ═══════════════════════════════════════════════════════════════════════════ */
export function PrayerCard({
  prayer,
  savedMeta,
  variant,
  isOwner,
  userId,
  themeOverride,
  themeVars,
  onAction,
  onRefresh,
  captionModeTts = true,
  ttsVoiceId,
}: PrayerCardProps) {
  const { toast } = useToast();
  const isTouch = useIsTouch();

  useEffect(() => ensureStyles(), []);

  // ── Theme ──────────────────────────────────────────────────────────────────
  const theme: CardTheme = useMemo(() => {
    if (themeOverride) return themeOverride;
    return buildCardTheme(themeVars, savedMeta?.card_color?.bg);
  }, [themeOverride, themeVars, savedMeta?.card_color?.bg]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [flipped, setFlipped] = useState(false);
  const [prayed, setPrayed] = useState(false);
  const [prayedCount, setPrayedCount] = useState(prayer.prayed_count || 0);
  const [prayAnim, setPrayAnim] = useState(false);
  const [prayedFloat, setPrayedFloat] = useState(false);
  const prayedCooldownRef = useRef(false);
  const [showComments, setShowComments] = useState(false);
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [scriptureOpen, setScriptureOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(savedMeta?.notes || "");
  const [hasTestimony, setHasTestimony] = useState(false);
  const [userTestimony, setUserTestimony] = useState<any>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const lastTapRef = useRef(0);

  // TTS
  const {
    ttsLoading, ttsPlaying, toggleTts, stopTts, pauseTts, resumeTts,
    timedPhrases, audioRef, playbackRate, changePlaybackRate,
  } = useTtsPlayer({
    cacheId: `${prayer.id}_${ttsVoiceId || "sal"}`,
    audioUrl: prayer.audio_url,
    voiceId: ttsVoiceId,
  });

  const handleListen = useCallback(() => {
    const text = prayer.extended_prayer
      ? `${prayer.prayer_text}\n\n${prayer.extended_prayer}`
      : prayer.prayer_text;
    toggleTts(text);
  }, [prayer, toggleTts]);

  // Load prayed state & testimony
  useEffect(() => {
    if (!userId || !prayer.id) return;
    supabase
      .from("testimonies")
      .select("id, body, title, verses, praise_count, created_at, user_id, answered_date")
      .eq("prayer_id", prayer.id)
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) { setHasTestimony(true); setUserTestimony(data); }
      });
    supabase
      .from("prayed_actions")
      .select("id")
      .eq("prayer_id", prayer.id)
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => setPrayed(!!data));
  }, [userId, prayer.id]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handlePrayed = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;
    if (prayedCooldownRef.current) return;
    prayedCooldownRef.current = true;
    setTimeout(() => { prayedCooldownRef.current = false; }, 3000);
    setPrayAnim(true);
    setTimeout(() => setPrayAnim(false), 400);
    if (prayed) {
      const { data: snap } = await supabase
        .from("prayed_actions")
        .select("*")
        .eq("prayer_id", prayer.id)
        .eq("user_id", userId)
        .maybeSingle();
      if (snap) await trashItem(userId, "prayed_action", snap.id, snap as any);
      await supabase.from("prayed_actions").delete().eq("prayer_id", prayer.id).eq("user_id", userId);
      setPrayed(false);
      setPrayedCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("prayed_actions").insert({ prayer_id: prayer.id, user_id: userId });
      setPrayed(true);
      setPrayedCount((c) => c + 1);
      setPrayedFloat(true);
      setTimeout(() => setPrayedFloat(false), 1200);
    }
    onAction?.("prayed");
  };

  const handlePin = async () => {
    if (!savedMeta || !userId) return;
    const newVal = !savedMeta.pinned;
    await supabase.from("user_saved_prayers").update({ pinned: newVal }).eq("id", savedMeta.id);
    onAction?.("pin", newVal);
    onRefresh?.();
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("prayer_shares")
        .insert({
          prayer_id: prayer.id,
          sender_id: userId,
          recipient_id: null,
          status: "pending",
        } as any)
        .select("token")
        .single();
      if (error) throw error;
      const link = `${window.location.origin}/shared-prayer/${(data as any).token}`;
      await navigator.clipboard.writeText(link);
      toast({ title: "Secure link copied! 🔗" });
    } catch {
      const url = `${window.location.origin}/prayer/${prayer.id}`;
      navigator.clipboard.writeText(url).then(() => toast({ title: "Link copied! 🔗" }));
    }
    onAction?.("share");
  };

  const handleDelete = async () => {
    if (!savedMeta || !userId) return;
    const snap = { ...savedMeta };
    await trashItem(userId, "user_saved_prayer", savedMeta.id, snap as any);
    await supabase.from("user_saved_prayers").delete().eq("id", savedMeta.id);
    onAction?.("delete", savedMeta.id);
    onRefresh?.();
    toast({ title: "Prayer removed from board" });
  };

  const saveNotes = async () => {
    if (!savedMeta) return;
    await supabase.from("user_saved_prayers").update({ notes }).eq("id", savedMeta.id);
    setEditingNotes(false);
    onRefresh?.();
    toast({ title: "Notes saved" });
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const isPrivate = prayer.status === "private";
  const isPublic = prayer.status === "approved";
  const isTruncated = prayer.prayer_text.length > PRAYER_CHAR_LIMIT;
  const bgUrl = prayer.background_url || null;
  const activeFontFamily = prayer.text_style || "Cormorant Garamond";
  const overlayOpacity = savedMeta?.overlay_opacity ?? 0.48;

  // Drawer theming
  const drawerContentCls = "flex flex-col rounded-t-[28px] fixed bottom-0 left-0 right-0 z-50 shadow-2xl";
  const drawerStyle = { backgroundColor: theme.drawerBg, color: theme.drawerText };
  const handleStyle = { backgroundColor: theme.drawerHandle };

  // ══════════════════════════════════════════════════════════════════════════
  // PREVIEW variant — minimal, no interactions
  // ══════════════════════════════════════════════════════════════════════════
  if (variant === "preview") {
    return (
      <div
        className="rounded-2xl p-4 space-y-1.5"
        style={{ background: theme.cardBg, border: theme.borderSolid }}
      >
        {prayer.title && (
          <h4 className="font-display font-bold text-sm leading-snug" style={{ color: theme.headingColor }}>
            {prayer.title}
          </h4>
        )}
        <p className="text-xs leading-relaxed line-clamp-3" style={{ color: theme.textColor }}>
          {prayer.prayer_text}
        </p>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COMPACT variant — title + 2 lines + mini action bar
  // ══════════════════════════════════════════════════════════════════════════
  if (variant === "compact" || variant === "embed") {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: theme.cardBg, border: theme.borderSolid, boxShadow: "0 4px 20px -4px rgba(0,0,0,0.15)" }}
      >
        <div className="p-4 space-y-1.5">
          {prayer.title && (
            <h4 className="font-display font-bold text-sm leading-snug" style={{ color: theme.headingColor }}>
              {prayer.title}
            </h4>
          )}
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: theme.textColor, fontFamily: `"${activeFontFamily}", serif` }}>
            {prayer.prayer_text}
          </p>
          {prayer.labels && prayer.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {prayer.labels.slice(0, 3).map((tag) => {
                const p = LABEL_PALETTE[tag] || DEFAULT_LABEL;
                return (
                  <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: p.bg, color: p.text }}>
                    #{tag}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-2 py-1" style={{ background: theme.barBg, borderTop: theme.barBorder }}>
          <div className="flex items-center">
            <BarBtn theme={theme} label="Prayed" active={prayed} onClick={handlePrayed}>
              <PrayingHandsIcon className="w-4 h-4" />
            </BarBtn>
            <BarBtn theme={theme} label="Listen" onClick={(e) => { e.stopPropagation(); handleListen(); }}>
              <Volume2 className="w-4 h-4" />
            </BarBtn>
          </div>
          <div className="flex items-center">
            <BarBtn theme={theme} label="Share" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
            </BarBtn>
            {variant === "embed" && (
              <BarBtn theme={theme} label="Open" onClick={() => window.open(`/prayer/${prayer.id}`, "_blank")}>
                <BookOpen className="w-4 h-4" />
              </BarBtn>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SHARED variant — full card + CTA, read-only
  // ══════════════════════════════════════════════════════════════════════════
  if (variant === "shared") {
    return (
      <div style={{ perspective: "1200px" }} className="w-full max-w-[460px] mx-auto">
        <div
          className="rounded-3xl overflow-hidden"
          style={{ background: theme.cardBg, border: theme.borderSolid, boxShadow: "0 20px 60px -12px rgba(0,0,0,0.35)" }}
        >
          <div className="absolute inset-0 pointer-events-none rounded-3xl z-[1]" style={{ boxShadow: theme.innerGlow }} />
          <div className="absolute inset-0 pointer-events-none rounded-3xl" style={{ background: theme.lampLight }} />
          <DustParticles dustColor={theme.dustColor} />

          <div className="relative z-10 px-6 pt-7 pb-4 flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-1.5" style={{ color: theme.titleColor }}>
              KEEPPRAY.ING
            </span>
            {prayer.title && (
              <h2 className="text-lg font-bold mb-3 leading-snug" style={{ color: theme.headingColor, fontFamily: '"Playfair Display", serif' }}>
                {prayer.title}
              </h2>
            )}
            <p className="text-[15px] leading-[1.8] tracking-[0.01em]" style={{ fontFamily: `"${activeFontFamily}", serif`, color: theme.textColor }}>
              {prayer.prayer_text}
            </p>
          </div>

          <div className="px-6 pb-6 relative z-10">
            <Button
              className="w-full rounded-2xl py-3 font-semibold transition-all active:scale-[0.98]"
              style={{ backgroundColor: theme.brandColor, color: theme.mode === "dark" ? "#1a1610" : "#fff" }}
              onClick={() => onAction?.("save_to_board")}
            >
              Save to My Board
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FULL variant — premium board card with all features
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ perspective: "1200px", willChange: "transform" }}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 4 }}
        transition={{ layout: { type: "spring", stiffness: 300, damping: 28 }, default: { duration: 0.25 } }}
        style={{ transformStyle: "preserve-3d", position: "relative" }}
        className="relative"
      >
        {/* ═══ FRONT FACE ══════════════════════════════════════════════════ */}
        <motion.div
          animate={{ rotateY: flipped ? -180 : 0 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 100, damping: 18 }}
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transformStyle: "preserve-3d" }}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Ambient glow */}
          <div
            className="absolute -inset-px rounded-3xl pointer-events-none z-0"
            style={{ boxShadow: theme.borderGlow, animation: "pca-glow-pulse 4s ease-in-out infinite" }}
          />

          {/* Card body */}
          <div
            className="relative rounded-3xl flex flex-col overflow-hidden"
            style={{
              background: bgUrl ? undefined : theme.cardBg,
              border: theme.borderSolid,
              boxShadow: savedMeta?.pinned
                ? `inset 3px 0 0 ${theme.brandColor}, 0 20px 60px -12px rgba(0,0,0,0.35)`
                : "0 20px 60px -12px rgba(0,0,0,0.35)",
            }}
          >
            {/* Background image layer */}
            {bgUrl && (
              <div className="absolute inset-0 rounded-3xl overflow-hidden">
                <img src={bgUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(0,0,0,${overlayOpacity}), rgba(0,0,0,${0.7 * overlayOpacity}))` }} />
              </div>
            )}

            {/* Inner glow */}
            <div className="absolute inset-0 pointer-events-none rounded-3xl z-[1]" style={{ boxShadow: theme.innerGlow }} />
            {/* Lamp light */}
            <div className="absolute inset-0 pointer-events-none rounded-3xl z-[2]" style={{ background: theme.lampLight }} />
            <div className="absolute inset-0 pointer-events-none rounded-3xl z-[2]" style={{ background: "linear-gradient(180deg, rgba(200,170,100,0.05) 0%, transparent 40%)" }} />
            {/* Dust */}
            <DustParticles dustColor={theme.dustColor} />

            {/* ── Content ─────────────────────────────────────────────────── */}
            <div className="relative z-10 px-5 pt-5 pb-3 flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-0.5" style={{ color: theme.titleColor }}>
                KEEPPRAY.ING
              </span>

              {prayer.title && (
                <h3
                  className="font-display font-bold text-sm md:text-base leading-snug mb-1"
                  style={{ color: bgUrl ? "rgba(255,255,255,0.95)" : theme.headingColor, fontFamily: '"Playfair Display", serif' }}
                >
                  {prayer.title}
                </h3>
              )}

              {/* Voice waveform */}
              {prayer.voice_audio_url && (
                <div className="my-2">
                  <VoiceWaveformPlayer audioUrl={prayer.voice_audio_url} accentColor={theme.brandColor} />
                </div>
              )}

              {/* Prayer text */}
              <div
                className="select-none pca-hide-scrollbar"
                onClick={() => {
                  const now = Date.now();
                  if (now - lastTapRef.current < 350) {
                    lastTapRef.current = 0;
                    setFlipped(true);
                    return;
                  }
                  lastTapRef.current = now;
                }}
              >
                <FormattedText
                  text={prayer.prayer_text}
                  truncateAt={PRAYER_CHAR_LIMIT}
                  className="leading-[1.8] text-[15px] tracking-[0.01em] cursor-pointer"
                  style={{
                    fontFamily: `"${activeFontFamily}", serif`,
                    color: bgUrl ? "rgba(255,255,255,0.92)" : theme.textColor,
                  }}
                />
              </div>

              {/* Labels */}
              {prayer.labels && prayer.labels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {prayer.labels.map((tag) => {
                    const p = LABEL_PALETTE[tag] || DEFAULT_LABEL;
                    return (
                      <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: p.bg, color: p.text }}>
                        #{tag}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Notes (owner only) */}
              {isOwner && savedMeta && variant === "full" && (
                <div className="pt-2 mt-1">
                  {editingNotes ? (
                    <div className="space-y-2">
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Personal notes, reflection…"
                        rows={2}
                        className="min-h-[44px] border-none rounded-lg px-3 py-2 text-xs resize-none w-full"
                        style={{ backgroundColor: theme.drawerInputBg, color: theme.textColor }}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveNotes} className="rounded-xl h-7 text-xs" style={{ background: theme.brandColor, color: theme.mode === "dark" ? "#1a1610" : "#fff" }}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setEditingNotes(false); setNotes(savedMeta?.notes || ""); }} className="rounded-xl h-7 text-xs">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingNotes(true)}
                      className="min-h-[36px] w-full text-left rounded-lg px-3 py-2 text-xs transition-opacity hover:opacity-80"
                      style={{ backgroundColor: `${theme.textColor}08`, color: theme.textColor }}
                    >
                      {savedMeta?.notes
                        ? <span className="italic" style={{ color: theme.textColor }}>"{savedMeta.notes}"</span>
                        : <span style={{ color: theme.iconDefault }}>+ Add notes…</span>}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── Scripture strip ─────────────────────────────────────────── */}
            {prayer.extended_prayer && (
              <div className="relative z-20" style={{ borderTop: theme.barBorder }}>
                <button
                  onClick={() => setScriptureOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-5 py-2 transition-all active:scale-[0.99]"
                  style={{ background: theme.barBg }}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5" style={{ color: theme.brandColor }} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.brandColor }}>
                      Scripture & Meditation
                    </span>
                  </div>
                  {scriptureOpen ? <ChevronDown className="w-3.5 h-3.5" style={{ color: theme.iconDefault }} /> : <ChevronUp className="w-3.5 h-3.5" style={{ color: theme.iconDefault }} />}
                </button>
                <AnimatePresence>
                  {scriptureOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                      style={{ background: theme.barBg }}
                    >
                      <div className="px-5 pb-3 pca-hide-scrollbar" style={{ maxHeight: "40vh", overflowY: "auto" }}>
                        <p className="font-display italic text-xs leading-relaxed" style={{ color: theme.textColor, opacity: 0.75 }}>
                          {renderWithVerseLinks(prayer.extended_prayer)}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── Bottom bar ─────────────────────────────────────────────── */}
            <div className="relative z-20 flex items-center justify-between px-2 py-1.5" style={{ background: theme.barBg, borderTop: theme.barBorder }}>
              {/* Left group */}
              <div className="flex items-center gap-0">
                {/* Privacy dot (owner only) */}
                {isOwner && (
                  <button className="p-2.5 rounded-xl transition-transform active:scale-90" title={isPublic ? "Public" : "Private"}>
                    <div className="relative w-2.5 h-2.5">
                      <div className="absolute inset-0 rounded-full transition-colors duration-500" style={{
                        backgroundColor: isPublic ? "#34d399" : "#f87171",
                        boxShadow: isPublic ? "0 0 6px 2px rgba(52,211,153,0.5)" : "0 0 5px 1px rgba(248,113,113,0.4)",
                      }} />
                      <div className="absolute inset-0 rounded-full animate-ping" style={{
                        backgroundColor: isPublic ? "#34d399" : "#f87171",
                        opacity: 0.25,
                        animationDuration: "2.5s",
                      }} />
                    </div>
                  </button>
                )}

                {/* Prayed */}
                <div className="relative">
                  <AnimatePresence>
                    {prayedFloat && (
                      <motion.span
                        key="prayed-float"
                        initial={{ opacity: 1, y: 0, x: "-50%" }}
                        animate={{ opacity: 0, y: -28 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.1, ease: "easeOut" }}
                        className="absolute left-1/2 bottom-full mb-1 text-xs font-semibold pointer-events-none select-none whitespace-nowrap"
                        style={{ color: theme.brandColor }}
                      >
                        🙏 Prayed
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <BarBtn theme={theme} label="Prayed" active={prayed} onClick={handlePrayed}>
                    <motion.div animate={prayAnim ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.35 }}>
                      <PrayingHandsIcon className="w-[18px] h-[18px]" />
                    </motion.div>
                  </BarBtn>
                </div>

                {/* Comments */}
                <BarBtn theme={theme} label="Comments" onClick={() => setShowComments((s) => !s)}>
                  <MessageCircle className="w-[18px] h-[18px]" />
                </BarBtn>
              </div>

              {/* Right group */}
              <div className="flex items-center gap-0">
                {/* Pin */}
                {savedMeta && (
                  <BarBtn theme={theme} label="Pin" active={savedMeta.pinned} onClick={handlePin}>
                    <Pin className="w-[16px] h-[16px]" />
                  </BarBtn>
                )}

                {/* Share */}
                <BarBtn theme={theme} label="Share" onClick={handleShare}>
                  <Share2 className="w-[16px] h-[16px]" />
                </BarBtn>

                {/* Listen */}
                <div className="relative">
                  <TtsLoadingPopup visible={!!ttsLoading && !ttsPlaying} />
                  <BarBtn theme={theme} label="Listen" active={ttsPlaying} onClick={(e) => { e.stopPropagation(); handleListen(); }}>
                    {ttsLoading ? <Loader2 className="w-[16px] h-[16px] animate-spin" /> : <Volume2 className={`w-[16px] h-[16px] ${ttsPlaying ? "fill-current" : ""}`} />}
                  </BarBtn>
                </div>

                {/* Testify */}
                <BarBtn theme={theme} label={hasTestimony ? "Testimony" : "Testify"} onClick={() => setFlipped(true)}>
                  <UserRoundCheck className="w-[16px] h-[16px]" />
                </BarBtn>

                {/* More */}
                {isOwner && (
                  isTouch ? (
                    <BarBtn theme={theme} label="More" onClick={() => setMoreMenuOpen(true)}>
                      <MoreHorizontal className="w-[16px] h-[16px]" />
                    </BarBtn>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="relative p-2.5 rounded-xl transition-all duration-200 active:scale-90 group opacity-50 hover:opacity-100" style={{ color: theme.iconDefault }}>
                          <MoreHorizontal className="w-[16px] h-[16px]" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl">
                        <DropdownMenuItem className="text-xs gap-2" onClick={() => setEnrichOpen(true)}>
                          <Sparkles className="w-3.5 h-3.5" /> Enrich with Scripture
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2" onClick={() => setShareModalOpen(true)}>
                          <Share2 className="w-3.5 h-3.5" /> Share Privately
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-xs gap-2 text-destructive" onClick={handleDelete}>
                          <Trash2 className="w-3.5 h-3.5" /> Remove from Board
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══ BACK FACE — Testify ═══════════════════════════════════════ */}
        <motion.div
          animate={{ rotateY: flipped ? 0 : 180 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 100, damping: 18 }}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            position: "absolute",
            inset: 0,
            borderRadius: "1.5rem",
            overflow: "hidden",
            background: theme.cardBg,
            border: theme.borderSolid,
            boxShadow: "0 20px 60px -12px rgba(0,0,0,0.35)",
            minHeight: 220,
          }}
        >
          <div className="absolute inset-0 pointer-events-none rounded-3xl z-[1]" style={{ boxShadow: theme.innerGlow }} />
          {flipped && hasTestimony && userTestimony ? (
            <TestimonyCardFace
              testimony={userTestimony}
              onFlipBack={() => setFlipped(false)}
              accentColor={theme.brandColor}
              textColor={theme.textColor}
              cardBg={theme.cardBg}
            />
          ) : flipped ? (
            <TestifyBack
              prayerId={prayer.id}
              prayerAuthorId={prayer.created_by}
              onFlipBack={() => setFlipped(false)}
              accentColor={theme.brandColor}
              textColor={theme.textColor}
              cardBg={theme.cardBg}
            />
          ) : null}
        </motion.div>
      </motion.div>

      {/* ── Mobile More Sheet (touch) ──────────────────────────────────── */}
      <Drawer.Root open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <Drawer.Content className={drawerContentCls} style={drawerStyle}>
            <div className="p-5 overflow-y-auto">
              <div className="mx-auto w-10 h-1 rounded-full mb-5" style={handleStyle} />
              <div className="space-y-2">
                <button onClick={() => { setMoreMenuOpen(false); setTimeout(() => setEnrichOpen(true), 200); }} className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left active:scale-[0.98] transition-all" style={{ backgroundColor: `${theme.brandColor}0a`, border: `1px solid ${theme.brandColor}20` }}>
                  <Sparkles className="w-5 h-5" style={{ color: theme.brandColor }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: theme.brandColor }}>Enrich with Scripture</p>
                    <p className="text-[11px]" style={{ color: theme.drawerMuted }}>Discover verses that back up your prayer</p>
                  </div>
                </button>
                <button onClick={() => { setMoreMenuOpen(false); setTimeout(() => setShareModalOpen(true), 200); }} className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left active:scale-[0.98] transition-all" style={{ backgroundColor: theme.drawerCardBg, border: `1px solid ${theme.drawerBorder}` }}>
                  <UserPlus className="w-5 h-5" style={{ color: "#6ee7b7" }} />
                  <p className="text-sm font-medium" style={{ color: theme.drawerText }}>Share Privately</p>
                </button>
                <button onClick={() => { setMoreMenuOpen(false); handleDelete(); }} className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left active:scale-[0.98] transition-all" style={{ backgroundColor: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.12)" }}>
                  <Trash2 className="w-5 h-5 text-red-400" />
                  <p className="text-sm font-medium text-red-400">Remove from Board</p>
                </button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* ── Comments sheet ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-2"
          >
            <Comments prayerId={prayer.id} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI Enrich Panel ─────────────────────────────────────────────── */}
      {isOwner && (
        <AIEnrichPanel
          open={enrichOpen}
          onOpenChange={setEnrichOpen}
          cardId={prayer.id}
          prayerText={prayer.prayer_text}
          extendedPrayer={prayer.extended_prayer}
          existingLabels={prayer.labels || []}
          onApplied={() => onRefresh?.()}
        />
      )}

      {/* ── Share Modal ─────────────────────────────────────────────────── */}
      <SharePrayerModal open={shareModalOpen} onOpenChange={setShareModalOpen} prayerId={prayer.id} prayerTitle={prayer.title} />

      {/* ── TTS Contemplation Overlay ───────────────────────────────────── */}
      {captionModeTts && (
        <TtsContemplationOverlay
          playing={ttsPlaying}
          onStop={stopTts}
          onPause={pauseTts}
          onResume={resumeTts}
          text={prayer.extended_prayer ? `${prayer.prayer_text}\n\n${prayer.extended_prayer}` : prayer.prayer_text}
          playbackRate={playbackRate}
          onPlaybackRateChange={changePlaybackRate}
          timedPhrases={timedPhrases}
          audioRef={audioRef}
        />
      )}
    </div>
  );
}
