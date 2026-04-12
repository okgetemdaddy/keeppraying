/**
 * PrayerCardMobile — The canonical mobile prayer card for KeepPray.ing Phase 2.
 *
 * Built from mockup/index.html spec. Uses global CSS tokens (var(--kp-*)).
 * 3D flip via React state + framer-motion rotateY.
 * Dust particles, inner glow, lamp light, scripture toggle, full action bar.
 *
 * This is the ONE card to rule them all on mobile.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Drawer } from "vaul";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DustParticles } from "@/components/board/DustParticles";
import { TestifyBack } from "@/components/board/TestifyBack";
import { useTtsPlayer } from "@/hooks/useTtsPlayer";
import { TtsContemplationOverlay } from "@/components/TtsContemplationOverlay";
import TtsLoadingPopup from "@/components/TtsLoadingPopup";
import { Switch } from "@/components/ui/switch";
import {
  PrayingHandsIcon,
  GOOGLE_FONTS,
  loadGoogleFont,
} from "@/components/board/prayerCardTheme";
import type { Database } from "@/integrations/supabase/types";
import {
  MessageCircle, Share2, Volume2, UserRoundCheck, MoreHorizontal,
  Image as ImageIcon, Palette, StickyNote, UserPlus, Users, Lock,
  ChevronRight, ChevronDown, ChevronUp, Pin, BookOpen, Sparkles,
  Plus, Upload, X, Camera, Mic, PenLine, Type, Check, Eye, HandHeart,
  Bookmark, Heart,
} from "lucide-react";

type PrayerCardRow = Database["public"]["Tables"]["prayer_cards"]["Row"];

export interface MobileCardMeta {
  id: string;
  pinned?: boolean;
  favorite?: boolean;
  notes?: string | null;
  position?: number;
}

interface PrayerCardMobileProps {
  prayer: PrayerCardRow;
  meta?: MobileCardMeta;
  isOwner: boolean;
  userId?: string;
  onRefresh?: () => void;
  captionModeTts?: boolean;
  ttsVoiceId?: string;
  /** Start flipped (Answered filter) */
  initialFlipped?: boolean;
  /** Click to open Focus Mode */
  onFocusOpen?: () => void;
  /** Reduced glow when in Focus overlay */
  focused?: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export function PrayerCardMobile({
  prayer, meta, isOwner, userId,
  onRefresh, captionModeTts, ttsVoiceId,
  initialFlipped, onFocusOpen, focused,
}: PrayerCardMobileProps) {
  const { toast } = useToast();

  /* ── Core state ─────────────────────────────────────────────────────── */
  const [flipped, setFlipped] = useState(initialFlipped ?? false);
  const [isPublic, setIsPublic] = useState(prayer.status === "approved");
  const [prayed, setPrayed] = useState(false);
  const [prayedBounce, setPrayedBounce] = useState(false);
  const [scriptureOpen, setScriptureOpen] = useState(false);

  /* Drawers */
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalMode, setJournalMode] = useState<"type"|"speak"|"write">("type");
  const [photosOpen, setPhotosOpen] = useState(false);
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);

  /* Font */
  const [fontFamily, setFontFamily] = useState(prayer.text_style || "Cormorant Garamond");
  useEffect(() => { GOOGLE_FONTS.forEach(f => loadGoogleFont(f.name)); }, []);
  const fontType = GOOGLE_FONTS.find(f => f.name === fontFamily)?.type ?? "serif";

  /* ── Scripture data ─────────────────────────────────────────────────── */
  const scriptures = useMemo(() => {
    if (!prayer.extended_prayer) return [];
    try {
      const parsed = JSON.parse(prayer.extended_prayer);
      if (Array.isArray(parsed)) return parsed as { ref: string; text: string }[];
    } catch { /* not JSON — try line-delimited */ }
    return [];
  }, [prayer.extended_prayer]);

  /* ── TTS ─────────────────────────────────────────────────────────────── */
  const {
    ttsPlaying, ttsLoading, toggleTts, stopTts, pauseTts, resumeTts,
    playbackRate, changePlaybackRate, timedPhrases, audioRef,
  } = useTtsPlayer({ audioUrl: prayer.audio_url, cacheId: prayer.id, voiceId: ttsVoiceId });

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

  /* ── Prayed check ────────────────────────────────────────────────────── */
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

  /* Sync flipped state when filter changes */
  useEffect(() => {
    if (initialFlipped !== undefined) setFlipped(initialFlipped);
  }, [initialFlipped]);

  /* ── Mutations ──────────────────────────────────────────────────────── */
  const handlePrayed = useCallback(async () => {
    if (!userId) return;
    const next = !prayed;
    setPrayed(next);
    setPrayedBounce(true);
    setTimeout(() => setPrayedBounce(false), 400);
    if (next) {
      await supabase.from("prayed_actions").insert({ prayer_id: prayer.id, user_id: userId });
      await supabase.rpc("increment_prayed_count" as any, { prayer_card_id: prayer.id });
    } else {
      await supabase.from("prayed_actions").delete().eq("prayer_id", prayer.id).eq("user_id", userId);
    }
  }, [userId, prayed, prayer.id]);

  const handlePin = useCallback(async () => {
    if (!meta) return;
    const next = !meta.pinned;
    await supabase.from("user_saved_prayers").update({ pinned: next }).eq("id", meta.id);
    toast({ title: next ? "📌 Pinned to board" : "Unpinned" });
    onRefresh?.();
  }, [meta, toast, onRefresh]);

  const handlePrivacyToggle = useCallback(async () => {
    const next = isPublic ? "private" : "approved";
    setIsPublic(!isPublic);
    setPrivacyOpen(false);
    await supabase.from("prayer_cards").update({ status: next }).eq("id", prayer.id);
    toast({ title: isPublic ? "Prayer is now private" : "Prayer is now public" });
    onRefresh?.();
  }, [isPublic, prayer.id, toast, onRefresh]);

  const handleFontChange = useCallback(async (f: string) => {
    setFontFamily(f);
    await supabase.from("prayer_cards").update({ text_style: f }).eq("id", prayer.id);
  }, [prayer.id]);

  /* ── Drawer helpers ─────────────────────────────────────────────────── */
  const drawerCls = "flex flex-col rounded-t-[28px] fixed bottom-0 left-0 right-0 z-50 shadow-2xl";
  const drawerBg = { backgroundColor: "var(--kp-bg-surface)", color: "var(--kp-text-body)" };
  const handleBar = { backgroundColor: "var(--kp-border-gold)" };

  /* ── Bar Button ─────────────────────────────────────────────────────── */
  const BarBtn = ({ children, onClick, active, label }: { children: React.ReactNode; onClick?: () => void; active?: boolean; label?: string }) => (
    <button
      onClick={onClick}
      className="relative w-[38px] h-[38px] flex items-center justify-center rounded-[var(--kp-radius-sm)] transition-all duration-200 active:scale-[0.88]"
      style={{ color: active ? "var(--kp-gold)" : "var(--kp-gold-dim)" }}
      title={label}
    >
      {children}
    </button>
  );

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="w-full px-[14px] pb-4" style={{ perspective: "1200px" }}>
      {/* ── 3D Flip Container ─────────────────────────────────────────── */}
      <motion.div
        animate={{ rotateY: flipped ? -180 : 0 }}
        transition={{ duration: 0.65, type: "spring", stiffness: 80, damping: 18 }}
        className="relative w-full"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* ═══ FRONT FACE ═══════════════════════════════════════════════ */}
        <div
          className="relative rounded-[var(--kp-radius)] overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            background: "var(--kp-bg-card)",
            border: "1px solid var(--kp-border-gold)",
            boxShadow: `0 0 40px 4px var(--kp-gold-glow), 0 20px 60px -12px rgba(0,0,0,0.35)`,
            animation: "kp-card-breathe 6s ease-in-out infinite",
            pointerEvents: flipped ? "none" : "auto",
          }}
        >
          {/* Inner glow */}
          <div
            className="absolute inset-0 rounded-[var(--kp-radius)] pointer-events-none z-[1]"
            style={{ boxShadow: "inset 0 0 40px 8px rgba(180,140,50,0.04), inset 0 0 80px 16px rgba(160,120,40,0.03)" }}
          />
          {/* Lamp light */}
          <div
            className="absolute inset-0 rounded-[var(--kp-radius)] pointer-events-none z-[2]"
            style={{ background: "radial-gradient(ellipse 70% 35% at 50% -5%, rgba(220,190,120,0.12) 0%, rgba(200,170,100,0.04) 50%, transparent 100%)" }}
          />
          {/* Dust */}
          <DustParticles dustColor="rgba(210,185,120," />

          {/* ── Content ────────────────────────────────────────────────── */}
          <div className="relative z-[3] px-[22px] pt-5 pb-3">
            <div
              className="text-[9px] font-bold uppercase tracking-[0.22em] mb-1"
              style={{ color: "var(--kp-gold)" }}
            >
              KEEPPRAY.ING
            </div>
            <h3
              className="text-[17px] font-bold leading-[1.35] mb-0"
              style={{
                fontFamily: "var(--kp-font-display)",
                color: "var(--kp-text-primary)",
                cursor: "pointer",
              }}
              onClick={onFocusOpen}
            >
              {prayer.title || "Untitled Prayer"}
              {hasTestimony && (
                <span
                  className="inline-flex items-center gap-1 ml-2 px-2.5 py-0.5 rounded-[10px] text-[10px] font-bold uppercase tracking-[0.08em]"
                  style={{
                    background: "var(--kp-green-dim)",
                    color: "var(--kp-green)",
                  }}
                >
                  ✦ Answered
                </span>
              )}
            </h3>
            <p
              className="text-[15px] leading-[1.8] mt-3"
              style={{
                fontFamily: `"${fontFamily}", ${fontType === "serif" ? '"Georgia", serif' : '"Helvetica Neue", sans-serif'}`,
                color: "var(--kp-text-body)",
                cursor: "pointer",
              }}
              onClick={onFocusOpen}
            >
              {prayer.prayer_text}
            </p>
          </div>

          {/* ── Scripture Toggle ────────────────────────────────────────── */}
          {scriptures.length > 0 && (
            <div className="relative z-10">
              <button
                onClick={() => setScriptureOpen(v => !v)}
                className="w-full flex items-center justify-between px-[18px] py-2 transition-all active:scale-[0.99]"
                style={{
                  background: "linear-gradient(to top, rgba(20,18,13,0.95), rgba(30,26,20,0.6))",
                  borderTop: "1px solid rgba(180,140,50,0.08)",
                }}
              >
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" style={{ color: "var(--kp-gold)" }} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--kp-gold)" }}>
                    Scripture & Meditation
                  </span>
                  <span
                    className="text-[9px] px-[7px] py-0.5 rounded-[10px]"
                    style={{ background: "rgba(180,140,50,0.12)", color: "var(--kp-gold)" }}
                  >
                    {scriptures.length}
                  </span>
                </div>
                {scriptureOpen
                  ? <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--kp-gold-dim)" }} />
                  : <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--kp-gold-dim)" }} />
                }
              </button>

              <AnimatePresence>
                {scriptureOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className="overflow-hidden"
                    style={{ background: "linear-gradient(to top, rgba(20,18,13,0.95), rgba(30,26,20,0.6))" }}
                  >
                    <div className="px-[18px] pb-[14px]">
                      <div className="flex flex-wrap gap-1 mb-2 pt-2">
                        {scriptures.map(s => (
                          <span
                            key={s.ref}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-all hover:opacity-80 active:scale-95"
                            style={{
                              background: "rgba(180,140,50,0.08)",
                              border: "1px solid rgba(180,140,50,0.15)",
                              color: "var(--kp-gold)",
                            }}
                          >
                            📖 {s.ref}
                          </span>
                        ))}
                      </div>
                      {scriptures.map(s => (
                        <p
                          key={s.ref}
                          className="text-[11px] italic leading-relaxed mb-2 last:mb-0"
                          style={{
                            fontFamily: "var(--kp-font-prayer)",
                            color: "var(--kp-text-body)",
                          }}
                        >
                          <strong style={{ color: "var(--kp-gold)", fontStyle: "normal" }}>{s.ref}</strong>
                          {" — "}{s.text}
                        </p>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── Action Bar ──────────────────────────────────────────────── */}
          <div
            className="relative z-10 flex items-center justify-between px-2 py-1.5"
            style={{
              background: "linear-gradient(to top, rgba(20,18,13,0.95), rgba(30,26,20,0.6))",
              borderTop: "1px solid rgba(180,140,50,0.08)",
            }}
          >
            {/* Left group */}
            <div className="flex items-center">
              {/* Privacy dot */}
              <button
                onClick={() => setPrivacyOpen(true)}
                className="relative w-[38px] h-[38px] flex items-center justify-center rounded-[var(--kp-radius-sm)] active:scale-[0.88] transition-transform"
              >
                <div className="relative w-[9px] h-[9px]">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      backgroundColor: isPublic ? "var(--kp-green)" : "var(--kp-red)",
                      boxShadow: isPublic
                        ? "0 0 6px 2px rgba(52,211,153,0.4)"
                        : "0 0 6px 2px rgba(248,113,113,0.4)",
                    }}
                  />
                  <div
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{
                      backgroundColor: isPublic ? "var(--kp-green)" : "var(--kp-red)",
                      opacity: 0.25,
                      animationDuration: "2.5s",
                    }}
                  />
                </div>
              </button>

              {/* Prayed */}
              <BarBtn label="Prayed" active={prayed} onClick={handlePrayed}>
                <motion.div
                  animate={prayedBounce ? { scale: [1, 1.4, 1] } : {}}
                  transition={{ duration: 0.35 }}
                >
                  <PrayingHandsIcon className="w-[18px] h-[18px]" />
                </motion.div>
              </BarBtn>

              {/* Comments */}
              <BarBtn label="Comments" onClick={() => setCommentsOpen(true)}>
                <MessageCircle className="w-[18px] h-[18px]" />
              </BarBtn>
            </div>

            {/* Right group */}
            <div className="flex items-center">
              <BarBtn label="Pin" active={meta?.pinned} onClick={handlePin}>
                <Pin className="w-[18px] h-[18px]" />
              </BarBtn>
              <BarBtn label="Share" onClick={() => setShareOpen(true)}>
                <Share2 className="w-[18px] h-[18px]" />
              </BarBtn>
              <BarBtn label="Listen" active={ttsPlaying} onClick={() => ttsPlaying ? stopTts() : toggleTts(prayer.prayer_text)}>
                <Volume2 className="w-[18px] h-[18px]" />
              </BarBtn>
              <BarBtn label="Testify" onClick={() => setFlipped(true)}>
                <UserRoundCheck className="w-[18px] h-[18px]" />
              </BarBtn>
              <BarBtn label="More" onClick={() => setOptionsOpen(true)}>
                <MoreHorizontal className="w-[18px] h-[18px]" />
              </BarBtn>
            </div>
          </div>
        </div>

        {/* ═══ BACK FACE (Testimony) ═══════════════════════════════════ */}
        <div
          className="absolute inset-0 rounded-[var(--kp-radius)] overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            pointerEvents: flipped ? "auto" : "none",
            background: "linear-gradient(175deg, #1a2318 0%, #121a10 40%, #0d140a 100%)",
            border: "1px solid rgba(52,211,153,0.25)",
            boxShadow: "0 0 40px 4px rgba(52,211,153,0.12)",
          }}
        >
          <TestifyBack
            prayerId={prayer.id}
            prayerAuthorId={prayer.created_by}
            onFlipBack={() => setFlipped(false)}
          />
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════
          DRAWERS — All use CSS token theming
      ═══════════════════════════════════════════════════════════════ */}

      {/* Comments */}
      <Drawer.Root open={commentsOpen} onOpenChange={setCommentsOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <Drawer.Content className={drawerCls + " h-[70vh]"} style={drawerBg}>
            <div className="p-5 flex-1 overflow-hidden flex flex-col">
              <div className="mx-auto w-10 h-1 rounded-full mb-5" style={handleBar} />
              <div className="flex items-center justify-between mb-1">
                <Drawer.Title className="font-semibold text-[15px]" style={{ color: "var(--kp-text-primary)" }}>Comments</Drawer.Title>
                <button onClick={() => setCommentsOpen(false)} className="p-1.5 rounded-lg active:scale-90"><X className="w-4 h-4" style={{ color: "var(--kp-text-muted)" }} /></button>
              </div>
              <p className="text-xs mb-5" style={{ color: "var(--kp-text-muted)" }}>Private entries are only visible to you.</p>
              <div className="flex-1 overflow-auto space-y-3">
                <div className="p-4 rounded-2xl text-sm" style={{ background: "rgba(180,140,50,0.08)", border: "1px solid var(--kp-border)", color: "var(--kp-text-body)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-3 h-3" style={{ color: "var(--kp-gold)" }} />
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--kp-gold)" }}>Private</span>
                  </div>
                  No private comments yet. Start reflecting on this prayer.
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Write a comment…"
                  className="flex-1 rounded-full px-4 py-2.5 text-sm focus:outline-none transition-all"
                  style={{ backgroundColor: "var(--kp-bg-input)", border: "1px solid var(--kp-border)", color: "var(--kp-text-body)", caretColor: "var(--kp-gold)" }}
                />
                <button className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform" style={{ backgroundColor: "var(--kp-gold)", color: "#1a1610" }}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Options (More) */}
      <Drawer.Root open={optionsOpen} onOpenChange={setOptionsOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <Drawer.Content className={drawerCls} style={drawerBg}>
            <div className="p-5 overflow-y-auto">
              <div className="mx-auto w-10 h-1 rounded-full mb-5" style={handleBar} />

              {/* Prayer Circle CTA */}
              <button className="w-full flex items-center gap-3 p-3.5 rounded-2xl mb-4 text-left active:scale-[0.98] transition-all"
                style={{ backgroundColor: "var(--kp-green-dim)", border: "1px solid rgba(52,211,153,0.15)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(52,211,153,0.12)" }}>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-emerald-400 text-sm">Go to Prayer Circle</h4>
                  <p className="text-[11px] text-emerald-500/50 truncate">View or create a prayer circle</p>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-500/40" />
              </button>

              {/* Enrich */}
              <button
                onClick={() => { setOptionsOpen(false); setTimeout(() => setEnrichOpen(true), 200); }}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl mb-4 text-left active:scale-[0.98] transition-all"
                style={{ backgroundColor: "rgba(180,140,50,0.06)", border: "1px solid var(--kp-border)" }}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(180,140,50,0.1)" }}>
                  <Sparkles className="w-4 h-4" style={{ color: "var(--kp-gold)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm" style={{ color: "var(--kp-gold)" }}>Enrich with Scripture</h4>
                  <p className="text-[11px]" style={{ color: "var(--kp-text-muted)" }}>Discover verses that back up your prayer</p>
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: "var(--kp-text-muted)" }} />
              </button>

              {/* 2x2 grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: UserPlus, label: "Private Share", iconColor: "#6ee7b7", action: () => { setOptionsOpen(false); setTimeout(() => setShareOpen(true), 200); } },
                  { icon: StickyNote, label: "Journal Entry", iconColor: "#c9a84c", action: () => { setOptionsOpen(false); setTimeout(() => setJournalOpen(true), 200); } },
                  { icon: ImageIcon, label: "Add Photos", iconColor: "#7dd3fc", action: () => { setOptionsOpen(false); setTimeout(() => setPhotosOpen(true), 200); } },
                  { icon: Palette, label: "Change Theme", iconColor: "#c4b5fd", action: () => { setOptionsOpen(false); setTimeout(() => setThemePickerOpen(true), 200); } },
                  { icon: Type, label: "Change Font", iconColor: "#fbbf24", action: () => { setOptionsOpen(false); setTimeout(() => setFontPickerOpen(true), 200); } },
                ].map(({ icon: Icon, label, iconColor, action }) => (
                  <button key={label} onClick={action} className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl active:scale-95 transition-all"
                    style={{ backgroundColor: "var(--kp-bg-elevated)", border: "1px solid var(--kp-border)" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                      <Icon className="w-5 h-5" style={{ color: iconColor }} />
                    </div>
                    <span className="text-[13px] font-medium" style={{ color: "var(--kp-text-body)" }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Privacy */}
      <Drawer.Root open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <Drawer.Content className={drawerCls} style={drawerBg}>
            <div className="p-6 max-h-[85vh] overflow-auto">
              <div className="mx-auto w-10 h-1 rounded-full mb-6" style={handleBar} />
              <Drawer.Title className="text-xl font-medium mb-5 text-center leading-snug" style={{ fontFamily: "var(--kp-font-display)", color: "var(--kp-text-primary)" }}>
                {isPublic ? "Make your prayer private?" : "Make your prayer public for others to be edified?"}
              </Drawer.Title>

              {!isPublic && (
                <div className="space-y-3 mb-7">
                  <div className="p-4 rounded-2xl text-[13px] leading-relaxed" style={{ background: "rgba(180,140,50,0.08)", border: "1px solid rgba(180,140,50,0.15)", color: "var(--kp-text-body)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-3.5 h-3.5" style={{ color: "var(--kp-gold)" }} />
                      <strong className="text-xs uppercase tracking-wider" style={{ color: "var(--kp-gold)" }}>Privacy Note</strong>
                    </div>
                    Your personal faith journey remains entirely private. All private comments, Journal Entries, uploaded photos, and personal artifacts stay hidden.
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl" style={{ backgroundColor: "var(--kp-bg-elevated)", border: "1px solid var(--kp-border)" }}>
                    <div className="flex flex-col gap-0.5 pr-4">
                      <span className="font-medium text-sm" style={{ color: "var(--kp-text-primary)" }}>Post Anonymously</span>
                      <span className="text-[12px] leading-snug" style={{ color: "var(--kp-text-muted)" }}>Your profile name will be hidden.</span>
                    </div>
                    <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
                  </div>
                </div>
              )}

              {isPublic && (
                <div className="p-4 rounded-2xl text-[13px] leading-relaxed mb-7 text-center" style={{ backgroundColor: "var(--kp-bg-elevated)", border: "1px solid var(--kp-border)", color: "var(--kp-text-body)" }}>
                  Making this prayer private will hide it from the community. Only you will be able to see it.
                </div>
              )}

              <button
                onClick={handlePrivacyToggle}
                className="w-full py-3.5 rounded-2xl font-medium transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: isPublic ? "var(--kp-bg-elevated)" : "var(--kp-green)",
                  color: isPublic ? "var(--kp-text-body)" : "#1a1610",
                  boxShadow: isPublic ? "none" : "0 4px 16px -2px rgba(52,211,153,0.3)",
                }}
              >
                {isPublic ? "Make Private" : "Make Public"}
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Share */}
      <Drawer.Root open={shareOpen} onOpenChange={setShareOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
          <Drawer.Content className={drawerCls + " max-h-[85vh]"} style={drawerBg}>
            <div className="p-6 flex-1 overflow-auto">
              <div className="mx-auto w-10 h-1 rounded-full mb-6" style={handleBar} />
              <Drawer.Title className="text-xl font-medium mb-2 text-center" style={{ fontFamily: "var(--kp-font-display)", color: "var(--kp-text-primary)" }}>
                Share this Prayer
              </Drawer.Title>
              <div className="flex justify-center mb-6">
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: "var(--kp-bg-elevated)", border: "1px solid var(--kp-border)", color: "var(--kp-text-muted)" }}>
                  <Lock className="w-3 h-3" /> Encrypted & Private
                </span>
              </div>
              <div className="space-y-3 mb-7">
                <button className="w-full text-left p-5 rounded-2xl active:scale-[0.98] transition-all" style={{ backgroundColor: "var(--kp-bg-elevated)", border: "1px solid var(--kp-border)" }}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(52,211,153,0.1)" }}>
                      <UserPlus className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1 text-[14px]" style={{ color: "var(--kp-text-primary)" }}>Send to a Friend</h4>
                      <p className="text-[13px] leading-relaxed" style={{ color: "var(--kp-text-muted)" }}>Share one-on-one. They can comment, testify, and pray with you.</p>
                    </div>
                    <ChevronRight className="w-4 h-4 mt-1" style={{ color: "var(--kp-text-muted)" }} />
                  </div>
                </button>
                <button className="w-full text-left p-5 rounded-2xl active:scale-[0.98] transition-all" style={{ backgroundColor: "var(--kp-bg-elevated)", border: "1px solid var(--kp-border)" }}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(180,140,50,0.1)" }}>
                      <Users className="w-5 h-5" style={{ color: "var(--kp-gold)" }} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1 text-[14px]" style={{ color: "var(--kp-text-primary)" }}>Form a Prayer Circle</h4>
                      <p className="text-[13px] leading-relaxed" style={{ color: "var(--kp-text-muted)" }}>Send to 2+ people to form a Prayer Circle with mutual accountability.</p>
                    </div>
                    <ChevronRight className="w-4 h-4 mt-1" style={{ color: "var(--kp-text-muted)" }} />
                  </div>
                </button>
              </div>
              <div className="flex gap-3">
                <button className="flex-1 py-3.5 rounded-2xl font-medium active:scale-[0.98] transition-all" style={{ backgroundColor: "var(--kp-bg-elevated)", border: "1px solid var(--kp-border)", color: "var(--kp-text-body)" }}>
                  Copy Link
                </button>
                <button className="flex-1 py-3.5 rounded-2xl font-medium active:scale-[0.98] transition-all" style={{ backgroundColor: "var(--kp-gold)", color: "#1a1610", boxShadow: "0 4px 16px -2px rgba(180,140,50,0.25)" }}>
                  Share Now
                </button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Font Picker */}
      <Drawer.Root open={fontPickerOpen} onOpenChange={setFontPickerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-md" />
          <Drawer.Content className={drawerCls + " h-[75vh]"} style={drawerBg}>
            <div className="p-5 flex-1 overflow-hidden flex flex-col">
              <div className="mx-auto w-10 h-1 rounded-full mb-4" style={handleBar} />
              <Drawer.Title className="font-semibold mb-1 text-[15px]" style={{ color: "var(--kp-text-primary)" }}>Choose a Font</Drawer.Title>
              <p className="text-xs mb-4" style={{ color: "var(--kp-text-muted)" }}>Preview updates in real time.</p>
              <div className="flex-1 overflow-auto space-y-2" style={{ scrollbarWidth: "none" }}>
                {GOOGLE_FONTS.map(f => (
                  <button
                    key={f.name}
                    onClick={() => handleFontChange(f.name)}
                    className="w-full text-left p-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-between"
                    style={{
                      backgroundColor: fontFamily === f.name ? "rgba(180,140,50,0.12)" : "var(--kp-bg-elevated)",
                      border: fontFamily === f.name ? "1px solid var(--kp-border-gold)" : "1px solid var(--kp-border)",
                    }}
                  >
                    <div>
                      <p className="text-[16px] leading-snug mb-0.5" style={{ fontFamily: `"${f.name}", ${f.type}`, color: "var(--kp-text-primary)" }}>The Lord is my shepherd</p>
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--kp-text-muted)" }}>{f.name} · {f.category}</span>
                    </div>
                    {fontFamily === f.name && <Check className="w-5 h-5 flex-shrink-0 ml-3" style={{ color: "var(--kp-gold)" }} />}
                  </button>
                ))}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Journal */}
      <Drawer.Root open={journalOpen} onOpenChange={setJournalOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-md" />
          <Drawer.Content className={drawerCls + " h-[92vh]"} style={drawerBg}>
            <div className="p-5 flex-1 flex flex-col overflow-hidden">
              <div className="mx-auto w-10 h-1 rounded-full mb-4" style={handleBar} />
              <div className="flex items-center justify-between mb-4">
                <Drawer.Title className="font-semibold text-[15px]" style={{ color: "var(--kp-text-primary)" }}>Journal Entry</Drawer.Title>
                <span className="text-[10px] px-2 py-1 rounded-full font-medium" style={{ background: "rgba(180,140,50,0.12)", color: "var(--kp-gold)" }}>🔒 Private</span>
              </div>
              <div className="flex rounded-xl overflow-hidden mb-4" style={{ border: "1px solid var(--kp-border)" }}>
                {([
                  { mode: "type" as const, icon: Type, label: "Type" },
                  { mode: "speak" as const, icon: Mic, label: "Speak" },
                  { mode: "write" as const, icon: PenLine, label: "Write" },
                ]).map(({ mode: m, icon: Icon, label }) => (
                  <button key={m} onClick={() => setJournalMode(m)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all"
                    style={{ backgroundColor: journalMode === m ? "rgba(180,140,50,0.12)" : "transparent", color: journalMode === m ? "var(--kp-gold)" : "var(--kp-text-muted)" }}>
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                ))}
              </div>
              <div className="flex-1 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--kp-bg-elevated)", border: "1px solid var(--kp-border)" }}>
                {journalMode === "type" && (
                  <textarea placeholder="Write your thoughts, reflections, what God is showing you..." className="w-full h-full p-4 text-sm leading-relaxed resize-none focus:outline-none" style={{ backgroundColor: "transparent", color: "var(--kp-text-body)", caretColor: "var(--kp-gold)" }} />
                )}
                {journalMode === "speak" && (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(180,140,50,0.12)", border: "2px solid rgba(180,140,50,0.25)" }}>
                      <Mic className="w-8 h-8" style={{ color: "var(--kp-gold)" }} />
                    </div>
                    <p className="text-xs" style={{ color: "var(--kp-text-muted)" }}>Tap to start recording</p>
                  </div>
                )}
                {journalMode === "write" && (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <PenLine className="w-10 h-10" style={{ color: "var(--kp-text-muted)" }} />
                    <p className="text-xs" style={{ color: "var(--kp-text-muted)" }}>Handwriting canvas will load here</p>
                  </div>
                )}
              </div>
              <button className="w-full py-3.5 rounded-2xl font-medium mt-4 active:scale-[0.98] transition-all" style={{ backgroundColor: "var(--kp-gold)", color: "#1a1610", boxShadow: "0 4px 16px -2px rgba(180,140,50,0.3)" }}>
                Save Journal Entry
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Photos */}
      <Drawer.Root open={photosOpen} onOpenChange={setPhotosOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-md" />
          <Drawer.Content className={drawerCls + " h-[92vh]"} style={drawerBg}>
            <div className="p-5 flex-1 flex flex-col overflow-hidden">
              <div className="mx-auto w-10 h-1 rounded-full mb-4" style={handleBar} />
              <Drawer.Title className="font-semibold mb-1 text-[15px]" style={{ color: "var(--kp-text-primary)" }}>Add Photos</Drawer.Title>
              <p className="text-xs mb-5" style={{ color: "var(--kp-text-muted)" }}>Upload images to your prayer.</p>
              <div className="flex-1 rounded-2xl flex flex-col items-center justify-center gap-4" style={{ backgroundColor: "var(--kp-bg-elevated)", border: "2px dashed var(--kp-border)" }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(180,140,50,0.1)" }}>
                  <Upload className="w-7 h-7" style={{ color: "var(--kp-gold)" }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium mb-1" style={{ color: "var(--kp-text-primary)" }}>Tap to upload photos</p>
                  <p className="text-[11px]" style={{ color: "var(--kp-text-muted)" }}>JPG, PNG · Max 10 photos</p>
                </div>
                <div className="flex gap-3">
                  <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium active:scale-95" style={{ backgroundColor: "rgba(180,140,50,0.12)", color: "var(--kp-gold)" }}>
                    <Camera className="w-3.5 h-3.5" /> Camera
                  </button>
                  <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium active:scale-95" style={{ backgroundColor: "rgba(180,140,50,0.12)", color: "var(--kp-gold)" }}>
                    <ImageIcon className="w-3.5 h-3.5" /> Gallery
                  </button>
                </div>
              </div>
              <button className="w-full py-3.5 rounded-2xl font-medium mt-4 active:scale-[0.98] transition-all" style={{ backgroundColor: "var(--kp-gold)", color: "#1a1610" }}>
                Save Photos
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Enrich */}
      <Drawer.Root open={enrichOpen} onOpenChange={setEnrichOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-md" />
          <Drawer.Content className={drawerCls + " h-[85vh]"} style={drawerBg}>
            <div className="p-5 flex-1 flex flex-col overflow-hidden">
              <div className="mx-auto w-10 h-1 rounded-full mb-4" style={handleBar} />
              <Drawer.Title className="font-semibold mb-1 text-[15px]" style={{ color: "var(--kp-text-primary)" }}>Enrich with Scripture</Drawer.Title>
              <p className="text-xs italic mb-5" style={{ color: "var(--kp-gold)" }}>"God loves when you pray His word back to Him."</p>
              <div className="space-y-3 mb-5">
                <button className="w-full text-left p-4 rounded-2xl active:scale-[0.98] transition-all" style={{ backgroundColor: "rgba(180,140,50,0.06)", border: "1px solid rgba(180,140,50,0.15)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(180,140,50,0.12)" }}>
                      <Sparkles className="w-5 h-5" style={{ color: "var(--kp-gold)" }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-0.5" style={{ color: "var(--kp-gold)" }}>KeepPray.ing Prayer Assist</h4>
                      <p className="text-[11px]" style={{ color: "var(--kp-text-muted)" }}>Intelligently discover verses that back up your prayer</p>
                    </div>
                  </div>
                </button>
                <button className="w-full text-left p-4 rounded-2xl active:scale-[0.98] transition-all" style={{ backgroundColor: "var(--kp-bg-elevated)", border: "1px solid var(--kp-border)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                      <Plus className="w-5 h-5" style={{ color: "var(--kp-text-muted)" }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-0.5" style={{ color: "var(--kp-text-primary)" }}>Add Manually</h4>
                      <p className="text-[11px]" style={{ color: "var(--kp-text-muted)" }}>Search and add verses from the Bible</p>
                    </div>
                  </div>
                </button>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--kp-text-muted)" }}>Linked Verses ({scriptures.length})</p>
              <div className="flex-1 overflow-auto space-y-2" style={{ scrollbarWidth: "none" }}>
                {scriptures.map(s => (
                  <div key={s.ref} className="p-3 rounded-xl" style={{ backgroundColor: "var(--kp-bg-elevated)", border: "1px solid var(--kp-border)" }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold" style={{ color: "var(--kp-gold)" }}>📖 {s.ref}</span>
                      <button className="active:scale-90"><X className="w-3 h-3" style={{ color: "var(--kp-text-muted)" }} /></button>
                    </div>
                    <p className="text-[11px] leading-relaxed italic" style={{ fontFamily: "var(--kp-font-prayer)", color: "var(--kp-text-body)" }}>{s.text}</p>
                  </div>
                ))}
                {scriptures.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-xs" style={{ color: "var(--kp-text-muted)" }}>No verses linked yet. Use Prayer Assist to discover them.</p>
                  </div>
                )}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* TTS Overlays */}
      <TtsLoadingPopup visible={ttsLoading} />
      {ttsPlaying && captionModeTts && (
        <TtsContemplationOverlay
          playing={ttsPlaying}
          onStop={stopTts}
          onPause={pauseTts}
          onResume={resumeTts}
          text={prayer.prayer_text}
          playbackRate={playbackRate}
          onPlaybackRateChange={changePlaybackRate}
          timedPhrases={timedPhrases}
          audioRef={audioRef}
        />
      )}
    </div>
  );
}
