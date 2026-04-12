/**
 * FocusMode — Fullscreen single-prayer view matching mockup #focus-mode.
 *
 * Renders on top of everything. Header with back button + title.
 * Scrollable body with full prayer text, scripture section.
 * Bottom bar with full action buttons.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTtsPlayer } from "@/hooks/useTtsPlayer";
import { DustParticles } from "@/components/board/DustParticles";
import { PrayingHandsIcon } from "@/components/board/prayerCardTheme";
import type { Database } from "@/integrations/supabase/types";
import {
  ArrowLeft, MessageCircle, Share2, Volume2, UserRoundCheck,
  MoreHorizontal, Pin, BookOpen, X,
} from "lucide-react";

type PrayerCardRow = Database["public"]["Tables"]["prayer_cards"]["Row"];

interface FocusModeProps {
  prayer: PrayerCardRow;
  userId?: string;
  isOwner: boolean;
  onClose: () => void;
  onFlip?: () => void;
  ttsVoiceId?: string;
  pinned?: boolean;
  savedId?: string;
  onRefresh?: () => void;
}

export function FocusMode({
  prayer, userId, isOwner, onClose, onFlip,
  ttsVoiceId, pinned, savedId, onRefresh,
}: FocusModeProps) {
  const { toast } = useToast();
  const [prayed, setPrayed] = useState(false);
  const [prayedBounce, setPrayedBounce] = useState(false);
  const [isPublic, setIsPublic] = useState(prayer.status === "approved");

  const { ttsPlaying, toggleTts, stopTts } = useTtsPlayer({
    audioUrl: prayer.audio_url,
    cacheId: prayer.id,
    voiceId: ttsVoiceId,
  });

  const scriptures = useMemo(() => {
    if (!prayer.extended_prayer) return [];
    try {
      const parsed = JSON.parse(prayer.extended_prayer);
      if (Array.isArray(parsed)) return parsed as { ref: string; text: string }[];
    } catch {}
    return [];
  }, [prayer.extended_prayer]);

  useEffect(() => {
    if (!userId) return;
    supabase.from("prayed_actions").select("id").eq("prayer_id", prayer.id).eq("user_id", userId).maybeSingle()
      .then(({ data }) => { if (data) setPrayed(true); });
  }, [userId, prayer.id]);

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
    if (!savedId) return;
    const next = !pinned;
    await supabase.from("user_saved_prayers").update({ pinned: next }).eq("id", savedId);
    toast({ title: next ? "📌 Pinned" : "Unpinned" });
    onRefresh?.();
  }, [savedId, pinned, toast, onRefresh]);

  const BarBtn = ({ children, onClick, active, label }: { children: React.ReactNode; onClick?: () => void; active?: boolean; label?: string }) => (
    <button
      onClick={onClick}
      className="w-[42px] h-[42px] flex items-center justify-center rounded-[var(--kp-radius-sm)] transition-all active:scale-[0.88]"
      style={{ color: active ? "var(--kp-gold)" : "var(--kp-gold-dim)" }}
      title={label}
    >
      {children}
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed inset-0 z-[180] flex flex-col overflow-hidden"
      style={{ background: "var(--kp-bg-deep)" }}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header
        className="flex items-center gap-3 px-4 py-3.5 flex-shrink-0"
        style={{
          borderBottom: "1px solid var(--kp-border)",
          background: "var(--kp-bg-surface)",
        }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{ background: "rgba(180,140,50,0.08)", border: "1px solid var(--kp-border)" }}
        >
          <ArrowLeft className="w-[18px] h-[18px]" style={{ color: "var(--kp-gold)" }} />
        </button>
        <h1
          className="flex-1 text-[15px] font-semibold truncate"
          style={{ fontFamily: "var(--kp-font-display)", color: "var(--kp-text-primary)" }}
        >
          {prayer.title || "Untitled Prayer"}
        </h1>
      </header>

      {/* ── Scrollable body ─────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain px-[18px] py-5"
        style={{ WebkitOverflowScrolling: "touch", background: "var(--kp-bg-deep)" }}
      >
        <div
          className="text-[9px] font-bold uppercase tracking-[0.22em] mb-1.5"
          style={{ color: "var(--kp-gold)" }}
        >
          KEEPPRAY.ING
        </div>
        <h2
          className="text-[22px] font-bold leading-[1.35] mb-4"
          style={{ fontFamily: "var(--kp-font-display)", color: "var(--kp-text-primary)" }}
        >
          {prayer.title || "Untitled Prayer"}
        </h2>
        <p
          className="text-[18px] leading-[2] mb-6"
          style={{ fontFamily: "var(--kp-font-prayer)", color: "var(--kp-text-body)" }}
        >
          {prayer.prayer_text}
        </p>

        {/* Scripture section */}
        {scriptures.length > 0 && (
          <div
            className="p-4 rounded-[var(--kp-radius-sm)] mb-5"
            style={{ background: "rgba(180,140,50,0.04)", border: "1px solid var(--kp-border)" }}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <BookOpen className="w-3.5 h-3.5" style={{ color: "var(--kp-gold)" }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--kp-gold)" }}>
                Scripture & Meditation
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {scriptures.map(s => (
                <span key={s.ref} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                  style={{ background: "rgba(180,140,50,0.08)", border: "1px solid rgba(180,140,50,0.15)", color: "var(--kp-gold)" }}>
                  📖 {s.ref}
                </span>
              ))}
            </div>
            {scriptures.map(s => (
              <p key={s.ref} className="text-[13px] italic leading-relaxed mb-2 last:mb-0"
                style={{ fontFamily: "var(--kp-font-prayer)", color: "var(--kp-text-body)" }}>
                <strong style={{ color: "var(--kp-gold)", fontStyle: "normal" }}>{s.ref}</strong>
                {" — "}{s.text}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom action bar ───────────────────────────────────────── */}
      <div
        className="flex items-center justify-around px-1 py-2 flex-shrink-0"
        style={{
          background: "var(--kp-bg-surface)",
          borderTop: "1px solid var(--kp-border)",
        }}
      >
        {/* Privacy */}
        <BarBtn label={isPublic ? "Public" : "Private"}>
          <div className="relative w-[9px] h-[9px]">
            <div className="absolute inset-0 rounded-full" style={{
              backgroundColor: isPublic ? "var(--kp-green)" : "var(--kp-red)",
              boxShadow: isPublic ? "0 0 6px 2px rgba(52,211,153,0.4)" : "0 0 6px 2px rgba(248,113,113,0.4)",
            }} />
          </div>
        </BarBtn>

        <BarBtn label="Prayed" active={prayed} onClick={handlePrayed}>
          <motion.div animate={prayedBounce ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.35 }}>
            <PrayingHandsIcon className="w-5 h-5" />
          </motion.div>
        </BarBtn>

        <BarBtn label="Comments">
          <MessageCircle className="w-5 h-5" />
        </BarBtn>

        <BarBtn label="Pin" active={pinned} onClick={handlePin}>
          <Pin className="w-5 h-5" />
        </BarBtn>

        <BarBtn label="Share">
          <Share2 className="w-5 h-5" />
        </BarBtn>

        <BarBtn label="Listen" active={ttsPlaying} onClick={() => ttsPlaying ? stopTts() : toggleTts(prayer.prayer_text)}>
          <Volume2 className="w-5 h-5" />
        </BarBtn>

        <BarBtn label="Testify" onClick={onFlip}>
          <UserRoundCheck className="w-5 h-5" />
        </BarBtn>

        <BarBtn label="More">
          <MoreHorizontal className="w-5 h-5" />
        </BarBtn>
      </div>
    </motion.div>
  );
}
