/**
 * BoardV2 — "Your Prayer Space"
 * Cards-first, minimal chrome, full-width mobile, 2-col desktop.
 * Phase 2: PrayerCardMobile + LayeredCard + FocusMode.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getIdbCache, setIdbCache, cacheKeys } from "@/lib/localCache";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useBoardPreferences } from "@/hooks/useBoardPreferences";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStreak } from "@/hooks/useStreak";
import { SiteNav } from "@/components/SiteNav";
import { PrayerCard, type SavedMeta } from "@/components/board/PrayerCard";
import { PrayerCardMobile } from "@/components/board/PrayerCardMobile";
import { PrayNowSheet } from "@/components/PrayNowSheet";
import { NotificationBell } from "@/components/NotificationBell";
import { BOARD_THEMES } from "@/components/board/boardThemes";
import { buildCardTheme } from "@/components/board/prayerCardTheme";
import type { Database } from "@/integrations/supabase/types";
import {
  Search, Flame, Plus, Loader2, BookOpen, X,
} from "lucide-react";
import { useSayingsCycle } from "@/hooks/useSayingsCycle";

type PrayerCardRow = Database["public"]["Tables"]["prayer_cards"]["Row"];
type SavedPrayer = Database["public"]["Tables"]["user_saved_prayers"]["Row"] & {
  prayer_cards: PrayerCardRow | null;
};

type FilterMode = "all" | "pinned" | "shared" | "answered";
type LayoutMode = "cards" | "layered";

const FILTER_CHIPS: { id: FilterMode; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pinned", label: "Pinned" },
  { id: "shared", label: "Shared" },
  { id: "answered", label: "Answered" },
];

export default function BoardV2() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { prefs, loaded: prefsLoaded } = useBoardPreferences();
  const { streak } = useStreak();
  const currentStreak = streak.currentStreak;
  const { currentSaying } = useSayingsCycle();

  const [saved, setSaved] = useState<SavedPrayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [prayNowOpen, setPrayNowOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const [testimonyPrayerIds, setTestimonyPrayerIds] = useState<Set<string>>(new Set());
  const [layout, setLayout] = useState<LayoutMode>("cards");
  const [frontCardId, setFrontCardId] = useState<string | null>(null);
  const boardCacheInit = useRef(false);

  // Theme (desktop)
  const theme = BOARD_THEMES.find((t) => t.id === prefs.theme) || BOARD_THEMES[0];
  const themeVars = theme.vars;

  const firstName = useMemo(() => {
    const full = user?.user_metadata?.full_name as string | undefined;
    return full ? full.split(" ")[0] : "Friend";
  }, [user]);

  // ── Data layer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || boardCacheInit.current) return;
    boardCacheInit.current = true;
    (async () => {
      const cached = await getIdbCache<SavedPrayer[]>(cacheKeys.savedPrayers(user.id));
      if (cached?.length) { setSaved(cached); setLoading(false); }
    })();
  }, [user]);

  const fetchSaved = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("user_saved_prayers")
      .select("*, prayer_cards(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const fresh = (data || []) as SavedPrayer[];
    setSaved(fresh);
    setLoading(false);
    void setIdbCache(cacheKeys.savedPrayers(user.id), fresh);
  }, [user]);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("testimonies" as any).select("prayer_id").eq("user_id", user.id);
      if (data) setTestimonyPrayerIds(new Set(data.map((t: any) => t.prayer_id).filter(Boolean)));
    })();
  }, [user]);

  // ── Filter ──────────────────────────────────────────────────────────────
  const displayedItems = useMemo(() => {
    let items = saved.filter((s) => s.prayer_cards);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((s) => {
        const c = s.prayer_cards!;
        return c.prayer_text.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q);
      });
    }
    if (filterMode === "pinned") items = items.filter((s) => s.pinned);
    if (filterMode === "shared") items = items.filter((s) => s.prayer_cards!.status === "approved");
    if (filterMode === "answered") items = items.filter((s) => testimonyPrayerIds.has(s.prayer_cards!.id));
    // Pinned always first
    items.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.created_at.localeCompare(a.created_at);
    });
    return items;
  }, [saved, filterMode, searchQuery, testimonyPrayerIds]);

  const activeCount = saved.filter((s) => s.prayer_cards).length;

  const focusedItem = focusedCardId ? displayedItems.find((i) => i.prayer_cards?.id === focusedCardId) : null;

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen" style={{
      background: isMobile ? "var(--kp-bg-deep)" : (themeVars["--board-bg"] || "hsl(30 15% 8%)"),
      color: isMobile ? "var(--kp-text-body)" : (themeVars["--board-text"] || "hsl(38 35% 78%)"),
    }}>
      {!isMobile && <SiteNav dark />}

      <div className={isMobile ? "pb-4" : "max-w-5xl mx-auto px-4 pb-8"}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between flex-shrink-0 sticky top-0 z-20"
          style={{ padding: "14px 18px 10px", background: isMobile ? "linear-gradient(to bottom, var(--kp-bg-deep) 60%, transparent)" : undefined }}>
          <div className="flex items-center gap-3">
            <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[13px] font-bold"
              style={{ background: "linear-gradient(135deg, var(--kp-gold) 0%, #8b7230 100%)", color: "#1a1610" }}>
              {firstName[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <small className="text-[10px] uppercase tracking-[0.12em] block" style={{ color: "var(--kp-text-muted)" }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long" })} {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"}
              </small>
              <h2 className="text-[16px] font-semibold leading-tight" style={{ color: "var(--kp-text-primary)" }}>
                Peace be with you, {firstName}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setSearchOpen(v => !v)} className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(180,140,50,0.06)", border: "1px solid var(--kp-border)" }}>
              <Search className="w-[18px] h-[18px]" style={{ color: "var(--kp-gold-dim)" }} />
            </button>
            <NotificationBell dark scrolled={false} />
          </div>
        </header>

        {/* Search */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden mb-3">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search prayers…" autoFocus
                className="w-full px-4 py-3 text-sm focus:outline-none" style={{ borderRadius: "var(--kp-radius-sm)", backgroundColor: "var(--kp-bg-input)", border: "1px solid var(--kp-border)", color: "var(--kp-text-body)", caretColor: "var(--kp-gold)" }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Daily verse */}
        {currentSaying && (
          <div className="px-[18px] pb-3" style={{ fontFamily: "var(--kp-font-prayer)", fontSize: 13, fontStyle: "italic", color: "var(--kp-gold-dim)", lineHeight: 1.6 }}>
            ✦ {currentSaying}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 px-[18px] pb-3.5">
          {currentStreak > 0 && (
            <div className="flex items-center gap-[5px] px-3 py-[5px] rounded-[20px] text-xs font-semibold"
              style={{ background: "rgba(180,140,50,0.06)", border: "1px solid var(--kp-border)", color: "var(--kp-text-body)" }}>
              <Flame className="w-3.5 h-3.5" style={{ color: "var(--kp-gold)" }} /> {currentStreak} day streak
            </div>
          )}
          <div className="flex items-center gap-[5px] px-3 py-[5px] rounded-[20px] text-xs font-semibold"
            style={{ background: "rgba(180,140,50,0.06)", border: "1px solid var(--kp-border)", color: "var(--kp-text-body)" }}>
            🙏 {activeCount} active
          </div>
        </div>

        {/* Filter chips + Layout toggle */}
        <div className="flex items-center justify-between px-[18px] pb-4">
          <div className="flex items-center gap-2 overflow-x-auto flex-1">
            {FILTER_CHIPS.map(chip => (
              <button key={chip.id} onClick={() => setFilterMode(chip.id)}
                className="px-4 py-1.5 rounded-[20px] text-xs font-semibold whitespace-nowrap transition-all active:scale-95"
                style={{
                  backgroundColor: filterMode === chip.id ? "rgba(180,140,50,0.15)" : "rgba(180,140,50,0.06)",
                  color: filterMode === chip.id ? "var(--kp-gold)" : "var(--kp-text-muted)",
                  border: filterMode === chip.id ? "1px solid var(--kp-border-gold)" : "1px solid var(--kp-border)",
                }}>
                {chip.label}
              </button>
            ))}
          </div>

          {/* Layout toggle */}
          {isMobile && (
            <div className="flex items-center gap-0.5 p-[3px] rounded-[10px] ml-2" style={{ background: "rgba(180,140,50,0.06)", border: "1px solid var(--kp-border)" }}>
              <button onClick={() => setLayout("cards")} className="w-[30px] h-[26px] rounded-[7px] flex items-center justify-center transition-all"
                style={{ background: layout === "cards" ? "rgba(180,140,50,0.15)" : "transparent", color: layout === "cards" ? "var(--kp-gold)" : "var(--kp-text-muted)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="8" rx="2"/><rect x="3" y="13" width="18" height="8" rx="2"/></svg>
              </button>
              <button onClick={() => setLayout("layered")} className="w-[30px] h-[26px] rounded-[7px] flex items-center justify-center transition-all"
                style={{ background: layout === "layered" ? "rgba(180,140,50,0.15)" : "transparent", color: layout === "layered" ? "var(--kp-gold)" : "var(--kp-text-muted)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="2" width="18" height="6" rx="2"/><rect x="3" y="9" width="18" height="6" rx="2"/><rect x="3" y="16" width="18" height="6" rx="2"/></svg>
              </button>
            </div>
          )}
        </div>

        {/* ── Cards ──────────────────────────────────────────────────── */}
        {loading && saved.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--kp-gold)" }} />
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <BookOpen className="w-12 h-12 mx-auto" style={{ color: "var(--kp-gold-dim)" }} />
            <p className="text-sm" style={{ color: "var(--kp-text-muted)" }}>
              {searchQuery ? "No prayers match your search" : filterMode === "answered" ? "No answered prayers yet — keep praying!" : "Your prayer board is empty"}
            </p>
            {!searchQuery && filterMode === "all" && (
              <button onClick={() => setPrayNowOpen(true)} className="px-5 py-2.5 rounded-2xl text-sm font-semibold active:scale-95 transition-all"
                style={{ backgroundColor: "var(--kp-gold)", color: "#1a1610" }}>
                Write Your First Prayer
              </button>
            )}
          </div>
        ) : isMobile && layout === "layered" ? (
          /* ── Layered View ──────────────────────────────────────────── */
          <div className="px-0 pb-4">
            {displayedItems.map((item, i) => {
              const card = item.prayer_cards!;
              const isFront = frontCardId === card.id;
              return (
                <div
                  key={item.id}
                  style={{ zIndex: isFront ? 100 : i + 1, position: "relative", transition: "z-index 0s", marginBottom: isFront ? 0 : -42 }}
                  onClick={() => {
                    if (isFront) {
                      setFocusedCardId(card.id);
                    } else {
                      setFrontCardId(card.id);
                    }
                  }}
                >
                  <PrayerCardMobile
                    prayer={card}
                    variant="compact"
                    meta={{ id: item.id, pinned: item.pinned, favorite: item.favorite, notes: item.notes, position: item.position }}
                    isOwner={!!(user && card.created_by === user.id)}
                    userId={user?.id}
                    onRefresh={fetchSaved}
                    captionModeTts={prefs.caption_mode_tts}
                    ttsVoiceId={prefs.tts_voice_id}
                    initialFlipped={filterMode === "answered"}
                  />
                </div>
              );
            })}
            {/* Spacer for last card */}
            <div style={{ height: 48 }} />
          </div>
        ) : isMobile ? (
          /* ── Full Cards View (Mobile) ──────────────────────────────── */
          <div className="flex flex-col">
            {displayedItems.map((item) => {
              const card = item.prayer_cards!;
              return (
                <PrayerCardMobile
                  key={item.id}
                  prayer={card}
                  meta={{ id: item.id, pinned: item.pinned, favorite: item.favorite, notes: item.notes, position: item.position }}
                  isOwner={!!(user && card.created_by === user.id)}
                  userId={user?.id}
                  onRefresh={fetchSaved}
                  captionModeTts={prefs.caption_mode_tts}
                  ttsVoiceId={prefs.tts_voice_id}
                  initialFlipped={filterMode === "answered"}
                  onFocusOpen={() => setFocusedCardId(card.id)}
                />
              );
            })}
          </div>
        ) : (
          /* ── Desktop (legacy PrayerCard) ───────────────────────────── */
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
            {displayedItems.map((item) => {
              const card = item.prayer_cards!;
              const meta: SavedMeta = { id: item.id, pinned: item.pinned, favorite: item.favorite, notes: item.notes, position: item.position };
              return (
                <PrayerCard key={item.id} prayer={card} savedMeta={meta} variant="full"
                  isOwner={!!(user && card.created_by === user.id)} userId={user?.id}
                  themeVars={themeVars} onRefresh={fetchSaved}
                  captionModeTts={prefs.caption_mode_tts} ttsVoiceId={prefs.tts_voice_id}
                  initialFlipped={filterMode === "answered"} onCardClick={() => setFocusedCardId(card.id)} />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Focus Mode ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {isMobile && focusedItem && (
          <FocusMode
            prayer={focusedItem.prayer_cards!}
            userId={user?.id}
            isOwner={!!(user && focusedItem.prayer_cards!.created_by === user.id)}
            onClose={() => setFocusedCardId(null)}
            ttsVoiceId={prefs.tts_voice_id}
            pinned={focusedItem.pinned}
            savedId={focusedItem.id}
            onRefresh={fetchSaved}
          />
        )}
      </AnimatePresence>

      {/* Desktop focus overlay (unchanged) */}
      <AnimatePresence>
        {!isMobile && focusedItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
            onClick={() => setFocusedCardId(null)}>
            <button className="absolute top-4 right-4 p-2 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
              onClick={() => setFocusedCardId(null)}>
              <X className="w-5 h-5" />
            </button>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }} onClick={e => e.stopPropagation()}>
              <PrayerCard prayer={focusedItem.prayer_cards!}
                savedMeta={{ id: focusedItem.id, pinned: focusedItem.pinned, favorite: focusedItem.favorite, notes: focusedItem.notes, position: focusedItem.position }}
                variant="full" isOwner={!!(user && focusedItem.prayer_cards!.created_by === user.id)} userId={user?.id}
                themeVars={themeVars} onRefresh={() => { fetchSaved(); setFocusedCardId(null); }}
                captionModeTts={prefs.caption_mode_tts} ttsVoiceId={prefs.tts_voice_id} focused initialFlipped={filterMode === "answered"} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop FAB + Sheet */}
      {!isMobile && (
        <>
          <motion.button onClick={() => setPrayNowOpen(true)} className="fixed z-40 flex items-center justify-center rounded-full shadow-2xl"
            style={{ bottom: "2rem", right: "1.5rem", width: 56, height: 56, backgroundColor: "var(--kp-gold)", color: "#1a1610", boxShadow: "0 8px 32px -4px rgba(180,140,50,0.4)" }}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}>
            <Plus className="w-6 h-6" strokeWidth={2.5} />
          </motion.button>
          <PrayNowSheet open={prayNowOpen} onOpenChange={setPrayNowOpen} onPrayerCreated={fetchSaved} />
        </>
      )}
    </div>
  );
}
