/**
 * PrayerCard — The ONE canonical prayer card component for KeepPray.ing.
 *
 * Reset to match PrayerCardAsset.tsx (design lab) EXACTLY.
 * Real Supabase data wired in; every drawer, every animation, every button
 * copied verbatim from the design lab truth.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { Drawer } from "vaul";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TestifyBack } from "@/components/board/TestifyBack";
import { TestimonyCardFace } from "@/components/board/TestimonyCardFace";
import { DustParticles } from "@/components/board/DustParticles";
import { useTtsPlayer } from "@/hooks/useTtsPlayer";
import { TtsContemplationOverlay } from "@/components/TtsContemplationOverlay";
import TtsLoadingPopup from "@/components/TtsLoadingPopup";
import {
  type CardTheme,
  THEME_DARK,
  DARK_BACKGROUNDS,
  LIGHT_BACKGROUNDS,
  GOOGLE_FONTS,
  loadGoogleFont,
  PrayingHandsIcon,
  PRAYER_CARD_STYLES,
} from "@/components/board/prayerCardTheme";
import type { Database } from "@/integrations/supabase/types";
import {
  MessageCircle, Share2, Volume2, UserRoundCheck, MoreHorizontal,
  Image as ImageIcon, Palette, StickyNote, UserPlus, Users, Lock,
  ChevronRight, ChevronDown, ChevronUp, Bookmark, Eye, HandHeart,
  Type, Check, Pin, Heart, BookOpen, Sparkles, Plus, Upload, X,
  Camera, Mic, PenLine,
} from "lucide-react";

type PrayerCardRow = Database["public"]["Tables"]["prayer_cards"]["Row"];

export type PrayerCardVariant = "full" | "compact" | "preview" | "shared" | "embed";

export type PrayerAction =
  | "prayed" | "share" | "pin" | "favorite" | "delete"
  | "enrich" | "testify" | "listen" | "comment" | "save_to_board";

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

/* ── Inject global styles once ───────────────────────────────────────────── */
let stylesInjected = false;
function ensureStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const tag = document.createElement("style");
  tag.textContent = PRAYER_CARD_STYLES;
  document.head.appendChild(tag);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export function PrayerCard({
  prayer, savedMeta, variant, isOwner, userId,
  themeOverride, themeVars, onAction, onRefresh,
  captionModeTts, ttsVoiceId,
}: PrayerCardProps) {
  const { toast } = useToast();

  /* ── Styles injection ────────────────────────────────────────────────── */
  useEffect(() => { ensureStyles(); }, []);

  /* ── State ────────────────────────────────────────────────────────────── */
  const [flipped, setFlipped] = useState(false);
  const [isPublic, setIsPublic] = useState(prayer.status === "approved");
  const [prayed, setPrayed] = useState(false);
  const [prayedBounce, setPrayedBounce] = useState(false);

  /* Theme state — default dark, bg index 0 */
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [bgIndex, setBgIndex] = useState(0);
  const [themePickerOpen, setThemePickerOpen] = useState(false);

  const themeBase = themeMode === "dark" ? THEME_DARK : (await import("@/components/board/prayerCardTheme")).THEME_LIGHT;
  const backgrounds = themeMode === "dark" ? DARK_BACKGROUNDS : LIGHT_BACKGROUNDS;
  const theme: CardTheme = { ...themeBase, cardBg: backgrounds[bgIndex].bg } as CardTheme;

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [fontFamily, setFontFamily] = useState(prayer.text_style || "Cormorant Garamond");
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalMode, setJournalMode] = useState<"type" | "speak" | "write">("type");
  const [photosOpen, setPhotosOpen] = useState(false);
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [scriptureExpanded, setScriptureExpanded] = useState(false);

  /* ── Load fonts ──────────────────────────────────────────────────────── */
  useEffect(() => {
    GOOGLE_FONTS.forEach((f) => loadGoogleFont(f.name));
  }, []);

  const fontType = GOOGLE_FONTS.find((f) => f.name === fontFamily)?.type ?? "serif";

  /* ── Scripture data from prayer ───────────────────────────────────────── */
  const scriptures = useMemo(() => {
    if (!prayer.extended_prayer) return [];
    try {
      const parsed = JSON.parse(prayer.extended_prayer);
      if (Array.isArray(parsed)) return parsed as { ref: string; text: string }[];
    } catch { /* not JSON */ }
    return [];
  }, [prayer.extended_prayer]);

  /* ── TTS ──────────────────────────────────────────────────────────────── */
  const { isPlaying, isLoading: ttsLoading, play, stop } = useTtsPlayer({
    prayerText: prayer.prayer_text,
    prayerTitle: prayer.title || "Prayer",
    voiceId: ttsVoiceId,
    captionMode: captionModeTts,
  });

  /* ── Testimony check ─────────────────────────────────────────────────── */
  const [hasTestimony, setHasTestimony] = useState(false);
  useEffect(() => {
    if (!userId || !prayer.id) return;
    supabase
      .from("testimonies" as any)
      .select("id")
      .eq("prayer_id", prayer.id)
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => { if (data) setHasTestimony(true); });
  }, [userId, prayer.id]);

  /* ── Prayed check on mount ───────────────────────────────────────────── */
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("prayed_actions")
      .select("id")
      .eq("prayer_id", prayer.id)
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => { if (data) setPrayed(true); });
  }, [userId, prayer.id]);

  /* ── Mutations ───────────────────────────────────────────────────────── */
  const handlePrayed = useCallback(async () => {
    if (!userId) return;
    const newState = !prayed;
    setPrayed(newState);
    setPrayedBounce(true);
    setTimeout(() => setPrayedBounce(false), 400);

    if (newState) {
      await supabase.from("prayed_actions").insert({ prayer_id: prayer.id, user_id: userId });
      await supabase.rpc("increment_prayed_count" as any, { prayer_card_id: prayer.id });
    } else {
      await supabase.from("prayed_actions").delete().eq("prayer_id", prayer.id).eq("user_id", userId);
    }
    onAction?.("prayed", newState);
  }, [userId, prayed, prayer.id, onAction]);

  const handlePin = useCallback(async () => {
    if (!savedMeta) return;
    const newPinned = !savedMeta.pinned;
    await supabase.from("user_saved_prayers").update({ pinned: newPinned }).eq("id", savedMeta.id);
    toast({ title: newPinned ? "Pinned to board" : "Unpinned" });
    onRefresh?.();
    onAction?.("pin", newPinned);
  }, [savedMeta, toast, onRefresh, onAction]);

  const handlePrivacyToggle = useCallback(async () => {
    const newStatus = isPublic ? "private" : "approved";
    setIsPublic(!isPublic);
    setPrivacyOpen(false);
    await supabase.from("prayer_cards").update({ status: newStatus }).eq("id", prayer.id);
    toast({ title: isPublic ? "Prayer is now private" : "Prayer is now public" });
    onRefresh?.();
  }, [isPublic, prayer.id, toast, onRefresh]);

  const handleFontChange = useCallback(async (newFont: string) => {
    setFontFamily(newFont);
    await supabase.from("prayer_cards").update({ text_style: newFont }).eq("id", prayer.id);
  }, [prayer.id]);

  /* ── Themed helpers (inline, matching PrayerCardAsset exactly) ────────── */
  const BarBtn = ({ children, onClick, active, label }: { children: React.ReactNode; onClick?: () => void; active?: boolean; label?: string }) => (
    <button
      onClick={onClick}
      className="relative p-2.5 rounded-xl transition-all duration-200 active:scale-90 group"
      style={{ color: active ? theme.iconActive : theme.iconDefault }}
      title={label}
    >
      {children}
    </button>
  );

  const drawerContentCls = "flex flex-col rounded-t-[28px] fixed bottom-0 left-0 right-0 z-50 shadow-2xl";
  const drawerStyle = { backgroundColor: theme.drawerBg, color: theme.drawerText };
  const handleStyle = { backgroundColor: theme.drawerHandle };

  /* ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div
      style={{ perspective: "1200px", animation: "pca-breathe 6s ease-in-out infinite" }}
      className="w-full max-w-[420px] aspect-[9/16] max-h-[calc(100vh-3rem)] mx-auto select-none touch-manipulation"
    >
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
            {/* Inner glow */}
            <div className="absolute inset-0 pointer-events-none rounded-3xl z-[1]" style={{ boxShadow: theme.innerGlow }} />

            {/* Overhead lamp light */}
            <div className="absolute inset-0 pointer-events-none rounded-3xl" style={{ background: theme.lampLight }} />
            <div className="absolute inset-0 pointer-events-none rounded-3xl" style={{ background: "linear-gradient(180deg, rgba(200,170,100,0.05) 0%, transparent 40%)" }} />

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
                {prayer.title || "Untitled Prayer"}
              </h2>
              <div className="flex-1 overflow-hidden relative">
                <div className="pca-hide-scrollbar h-full">
                  <p
                    className="text-[15px] leading-[1.8] tracking-[0.01em]"
                    style={{ fontFamily: `"${fontFamily}", ${fontType === "serif" ? '"Georgia", serif' : '"Helvetica Neue", sans-serif'}`, color: theme.textColor }}
                  >
                    {prayer.prayer_text}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Scripture & Meditation (collapsible) ──────────────────── */}
            {scriptures.length > 0 && (
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
                      {scriptures.length}
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
                          {scriptures.map((s) => (
                            <button
                              key={s.ref}
                              onClick={() => { if (window.confirm(`Open ${s.ref} on KeepRead.ing for further study and meditation?`)) { /* navigate to KeepRead.ing */ } }}
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
                        {scriptures.map((s) => (
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
            )}

            {/* ── Bottom bar 10% ───────────────────────────────────────────── */}
            <div className="relative z-20 flex items-center justify-between px-2 py-1.5" style={{ background: theme.barBg, borderTop: theme.barBorder }}>
              <div className="flex items-center gap-0">
                {/* Privacy dot */}
                <button onClick={() => setPrivacyOpen(true)} className="p-2.5 rounded-xl transition-transform active:scale-90" title={isPublic ? "Public" : "Private"}>
                  <div className="relative w-2.5 h-2.5">
                    <div className="absolute inset-0 rounded-full transition-colors duration-500" style={{ backgroundColor: isPublic ? "#34d399" : "#f87171", boxShadow: isPublic ? "0 0 6px 2px rgba(52,211,153,0.5)" : "0 0 5px 1px rgba(248,113,113,0.4)" }} />
                    <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: isPublic ? "#34d399" : "#f87171", opacity: 0.25, animationDuration: "2.5s" }} />
                  </div>
                </button>

                {/* Prayed */}
                <BarBtn label="Prayed" active={prayed} onClick={handlePrayed}>
                  <motion.div animate={prayedBounce ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.35 }}>
                    <PrayingHandsIcon className="w-[18px] h-[18px]" />
                  </motion.div>
                </BarBtn>

                {/* Comments */}
                <BarBtn label="Comments" onClick={() => setCommentsOpen(true)}>
                  <MessageCircle className="w-[18px] h-[18px]" />
                </BarBtn>
              </div>

              <div className="flex items-center gap-0">
                {/* Pin */}
                <BarBtn label="Pin to Board" active={savedMeta?.pinned} onClick={handlePin}>
                  <Pin className="w-[16px] h-[16px]" />
                </BarBtn>

                {/* Share */}
                <BarBtn label="Share" onClick={() => setShareOpen(true)}>
                  <Share2 className="w-[16px] h-[16px]" />
                </BarBtn>

                {/* Listen (TTS) */}
                <BarBtn label="Listen" active={isPlaying} onClick={() => { isPlaying ? stop() : play(); }}>
                  <Volume2 className="w-[16px] h-[16px]" />
                </BarBtn>

                {/* Testify */}
                <BarBtn label="Testify" onClick={() => setFlipped(true)}>
                  <UserRoundCheck className="w-[16px] h-[16px]" />
                </BarBtn>

                {/* More */}
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
            {hasTestimony ? (
              <TestimonyCardFace prayerCard={prayer} onFlipBack={() => setFlipped(false)} />
            ) : (
              <TestifyBack prayerId={prayer.id} userId={userId} onFlipBack={() => setFlipped(false)} onTestimonyCreated={() => { setHasTestimony(true); onRefresh?.(); }} />
            )}
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          THEMED DRAWERS — copied verbatim from PrayerCardAsset
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
                  No private comments yet. Start reflecting on this prayer.
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

              {/* Go to Prayer Circle */}
              <button className="w-full flex items-center gap-3 p-3.5 rounded-2xl mb-4 text-left group active:scale-[0.98] transition-all" style={{ backgroundColor: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(52,211,153,0.12)" }}>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-emerald-400 text-sm leading-tight">Go to Prayer Circle</h4>
                  <p className="text-[11px] text-emerald-500/50 truncate">View or create a prayer circle</p>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-500/40 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Save to Prayer Room */}
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

              {/* Enrich with Scripture */}
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

              {/* 2x2 grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: UserPlus, label: "Private Share", iconColor: "#6ee7b7", action: () => { setOptionsOpen(false); setTimeout(() => setShareOpen(true), 200); } },
                  { icon: StickyNote, label: "Journal Entry", iconColor: "#c9a84c", action: () => { setOptionsOpen(false); setTimeout(() => setJournalOpen(true), 200); } },
                  { icon: ImageIcon, label: "Add Photos", iconColor: "#7dd3fc", action: () => { setOptionsOpen(false); setTimeout(() => setPhotosOpen(true), 200); } },
                  { icon: Palette, label: "Change Theme", iconColor: "#c4b5fd", action: () => { setOptionsOpen(false); setTimeout(() => setThemePickerOpen(true), 200); } },
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
                    onClick={() => handleFontChange(f.name)}
                    className="w-full text-left p-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-between"
                    style={{
                      backgroundColor: fontFamily === f.name ? "rgba(180,140,50,0.12)" : theme.drawerCardBg,
                      border: fontFamily === f.name ? "1px solid rgba(180,140,50,0.25)" : `1px solid ${theme.drawerBorder}`,
                    }}
                  >
                    <div>
                      <p className="text-[16px] leading-snug mb-0.5" style={{ fontFamily: `"${f.name}", ${f.type}`, color: theme.drawerText }}>
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
                    <div className="w-full aspect-[3/4] rounded-xl" style={{ background: b.bg, border: "1px solid rgba(128,128,128,0.1)" }} />
                    <span className="text-[10px] font-medium" style={{ color: bgIndex === i ? theme.brandColor : theme.drawerMuted }}>
                      {b.name}
                    </span>
                  </button>
                ))}
              </div>

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
                  <div className="p-4 rounded-2xl text-[13px] leading-relaxed" style={{ backgroundColor: "rgba(180,140,50,0.08)", border: "1px solid rgba(180,140,50,0.15)", color: theme.drawerText }}>
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
                onClick={handlePrivacyToggle}
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
                Linked Verses ({scriptures.length})
              </p>
              <div className="flex-1 overflow-auto pca-hide-scrollbar space-y-2">
                {scriptures.map((s) => (
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
                {scriptures.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-xs" style={{ color: theme.drawerMuted }}>No verses linked yet. Use Prayer Assist to discover them.</p>
                  </div>
                )}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* ── TTS Overlays ──────────────────────────────────────────────── */}
      {ttsLoading && <TtsLoadingPopup />}
      {isPlaying && captionModeTts && (
        <TtsContemplationOverlay
          prayerText={prayer.prayer_text}
          onClose={stop}
        />
      )}
    </div>
  );
}
