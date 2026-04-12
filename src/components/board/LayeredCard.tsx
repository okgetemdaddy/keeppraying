/**
 * LayeredCard — Condensed card for the layered stack view.
 * Shows brand, title (with answered badge), 2-line prayer clamp, and mini action bar.
 * Clicking opens Focus Mode.
 */

import type { Database } from "@/integrations/supabase/types";
import { Pin, Share2, Volume2, MoreHorizontal } from "lucide-react";
import { PrayingHandsIcon } from "@/components/board/prayerCardTheme";

type PrayerCardRow = Database["public"]["Tables"]["prayer_cards"]["Row"];

interface LayeredCardProps {
  prayer: PrayerCardRow;
  hasTestimony?: boolean;
  pinned?: boolean;
  isPublic?: boolean;
  onClick?: () => void;
}

export function LayeredCard({ prayer, hasTestimony, pinned, isPublic, onClick }: LayeredCardProps) {
  return (
    <div
      className="relative rounded-[var(--kp-radius)] overflow-hidden cursor-pointer transition-all duration-200 active:scale-[0.98]"
      style={{ marginBottom: -42, zIndex: 1 }}
      onClick={onClick}
    >
      <div
        className="relative rounded-[var(--kp-radius)] overflow-hidden"
        style={{
          border: "1px solid var(--kp-border-gold)",
          background: "var(--kp-bg-card)",
        }}
      >
        {/* Inner glow */}
        <div className="absolute inset-0 rounded-[var(--kp-radius)] pointer-events-none z-[1]"
          style={{ boxShadow: "inset 0 0 30px 6px rgba(180,140,50,0.03)" }} />
        {/* Lamp light */}
        <div className="absolute inset-0 rounded-[var(--kp-radius)] pointer-events-none z-[2]"
          style={{ background: "radial-gradient(ellipse 70% 35% at 50% -5%, rgba(220,190,120,0.08) 0%, transparent 60%)" }} />

        {/* Content */}
        <div className="relative z-[3]">
          <div className="text-[8px] font-bold uppercase tracking-[0.22em] px-[18px] pt-[14px]" style={{ color: "var(--kp-gold)" }}>
            KEEPPRAY.ING
          </div>
          <h4
            className="text-[15px] font-bold leading-[1.3] px-[18px] pt-1 flex items-center gap-1.5"
            style={{ fontFamily: "var(--kp-font-display)", color: "var(--kp-text-primary)" }}
          >
            {prayer.title || "Untitled Prayer"}
            {hasTestimony && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[10px] text-[9px] font-bold uppercase tracking-[0.08em]"
                style={{ background: "var(--kp-green-dim)", color: "var(--kp-green)" }}
              >
                ✦ Answered
              </span>
            )}
          </h4>
          <p
            className="text-[13px] leading-[1.7] px-[18px] pt-1.5 pb-[14px]"
            style={{
              fontFamily: "var(--kp-font-prayer)",
              color: "var(--kp-text-body)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {prayer.prayer_text}
          </p>
        </div>

        {/* Mini bar */}
        <div
          className="relative z-[3] flex items-center justify-between px-2 py-1"
          style={{
            background: "linear-gradient(to top, rgba(20,18,13,0.95), rgba(30,26,20,0.5))",
            borderTop: "1px solid rgba(180,140,50,0.06)",
          }}
        >
          <div className="flex items-center">
            <button className="w-8 h-8 flex items-center justify-center" onClick={e => e.stopPropagation()}>
              <div className="w-[7px] h-[7px] rounded-full" style={{
                backgroundColor: isPublic ? "var(--kp-green)" : "var(--kp-red)",
                boxShadow: isPublic ? "0 0 4px rgba(52,211,153,0.4)" : "0 0 4px rgba(248,113,113,0.4)",
              }} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center" style={{ color: "var(--kp-gold-dim)" }} onClick={e => e.stopPropagation()}>
              <PrayingHandsIcon className="w-[15px] h-[15px]" />
            </button>
          </div>
          <div className="flex items-center">
            <button className="w-8 h-8 flex items-center justify-center" style={{ color: pinned ? "var(--kp-gold)" : "var(--kp-gold-dim)" }} onClick={e => e.stopPropagation()}>
              <Pin className="w-[15px] h-[15px]" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center" style={{ color: "var(--kp-gold-dim)" }} onClick={e => e.stopPropagation()}>
              <Share2 className="w-[15px] h-[15px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
