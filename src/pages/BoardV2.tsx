/**
 * BoardV2 — "Your Prayer Space"
 * Cards-first, minimal chrome, full-width mobile, 2-col desktop.
 *
 * Data layer: same as Board.tsx (fetchSaved + IDB cache).
 * Card component: PrayerCard variant="full" (canonical).
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
import { PrayNowSheet } from "@/components/PrayNowSheet";
import { NotificationBell } from "@/components/NotificationBell";
import { BOARD_THEMES } from "@/components/board/boardThemes";
import { buildCardTheme } from "@/components/board/prayerCardTheme";
import type { Database } from "@/integrations/supabase/types";
import {
  Search, Settings, Flame, Plus, Filter, Loader2, BookOpen,
} from "lucide-react";
import { useSayingsCycle } from "@/hooks/useSayingsCycle";

type PrayerCardRow = Database["public"]["Tables"]["prayer_cards"]["Row"];
type SavedPrayer = Database["public"]["Tables"]["user_saved_prayers"]["Row"] & {
  prayer_cards: PrayerCardRow | null;
};

type FilterMode = "all" | "pinned" | "shared" | "answered";
type SortMode = "newest" | "most-prayed" | "oldest";

const FILTER_CHIPS: { id: FilterMode; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pinned", label: "Pinned" },
  { id: "shared", label: "Shared" },
  { id: "answered", label: "Answered" },
];

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: "newest", label: "Recent" },
  { id: "most-prayed", label: "Most Prayed" },
  { id: "oldest", label: "Oldest" },
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
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const boardCacheInit = useRef(false);

  // Theme
  const theme = BOARD_THEMES.find((t) => t.id === prefs.theme) || BOARD_THEMES[0];
  const themeVars = theme.vars;

  // ── First name ──────────────────────────────────────────────────────────
  const firstName = useMemo(() => {
    const full = user?.user_metadata?.full_name as string | undefined;
    return full ? full.split(" ")[0] : "Friend";
  }, [user]);

  // ── Greeting ───────────────────────────────────────────────────────────
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // ── Data layer (stale-while-revalidate) ─────────────────────────────────
  useEffect(() => {
    if (!user || boardCacheInit.current) return;
    boardCacheInit.current = true;
    (async () => {
      const cached = await getIdbCache<SavedPrayer[]>(cacheKeys.savedPrayers(user.id));
      if (cached?.length) {
        setSaved(cached);
        setLoading(false);
      }
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

  // ── Filter + Sort ──────────────────────────────────────────────────────
  const displayedItems = useMemo(() => {
    let items = saved.filter((s) => s.prayer_cards);

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((s) => {
        const c = s.prayer_cards!;
        return (
          c.prayer_text.toLowerCase().includes(q) ||
          c.title?.toLowerCase().includes(q) ||
          c.labels?.some((l) => l.toLowerCase().includes(q))
        );
      });
    }

    // Filter
    if (filterMode === "pinned") items = items.filter((s) => s.pinned);
    if (filterMode === "shared") items = items.filter((s) => s.prayer_cards!.status === "approved");
    // "answered" would filter by testimony existence — simplified for now

    // Sort
    if (sortMode === "newest") items.sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (sortMode === "oldest") items.sort((a, b) => a.created_at.localeCompare(b.created_at));
    if (sortMode === "most-prayed") items.sort((a, b) => (b.prayer_cards?.prayed_count || 0) - (a.prayer_cards?.prayed_count || 0));

    return items;
  }, [saved, filterMode, sortMode, searchQuery]);

  const activeCount = saved.filter((s) => s.prayer_cards).length;

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div
      className="min-h-screen"
      style={{
        background: themeVars["--board-bg"] || "hsl(30 15% 8%)",
        color: themeVars["--board-text"] || "hsl(38 35% 78%)",
      }}
    >
      {/* Desktop nav */}
      {!isMobile && <SiteNav dark />}

      <div className="max-w-3xl mx-auto px-4 pb-28">
        {/* ── Compact Header ─────────────────────────────────────────────── */}
        <header className="pt-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600/80 to-amber-800/80 flex items-center justify-center text-white text-sm font-bold shadow-lg">
              {firstName[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <h1 className="font-display text-base font-semibold leading-tight" style={{ color: themeVars["--board-text"] || "hsl(38 60% 85%)" }}>
                {greeting}, {firstName}
              </h1>
              {currentSaying && (
                <p className="text-[11px] italic mt-0.5" style={{ color: themeVars["--board-accent"] || "hsl(42 85% 55%)", opacity: 0.7 }}>
                  ✦ {currentSaying}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Streak badge */}
            {currentStreak > 0 && (
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: "rgba(180,140,50,0.12)",
                  color: "hsl(42 85% 55%)",
                  border: "1px solid rgba(180,140,50,0.2)",
                }}
              >
                <Flame className="w-3.5 h-3.5" />
                {currentStreak}
              </div>
            )}

            {/* Search toggle */}
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className="p-2 rounded-xl transition-all active:scale-90"
              style={{ color: "hsl(38 30% 50%)" }}
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <NotificationBell dark scrolled={false} />
          </div>
        </header>

        {/* ── Search bar (collapsible) ────────────────────────────────────── */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mb-3"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prayers…"
                autoFocus
                className="w-full rounded-2xl px-4 py-3 text-sm focus:outline-none transition-all"
                style={{
                  backgroundColor: "rgba(180,140,50,0.06)",
                  border: "1px solid rgba(180,140,50,0.12)",
                  color: "hsl(38 35% 78%)",
                  caretColor: "hsl(42 85% 55%)",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stats bar ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-4">
          <span className="text-xs font-medium" style={{ color: "hsl(38 20% 50%)" }}>
            {activeCount} prayer{activeCount !== 1 ? "s" : ""} on your board
          </span>
        </div>

        {/* ── Filter chips ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pca-hide-scrollbar">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setFilterMode(chip.id)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95"
              style={{
                backgroundColor: filterMode === chip.id ? "rgba(180,140,50,0.15)" : "rgba(255,255,255,0.04)",
                color: filterMode === chip.id ? "hsl(42 85% 60%)" : "hsl(38 20% 50%)",
                border: filterMode === chip.id ? "1px solid rgba(180,140,50,0.25)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {chip.label}
            </button>
          ))}

          {/* Sort */}
          <div className="ml-auto flex items-center gap-1">
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSortMode(s.id)}
                className="px-2 py-1 rounded-lg text-[10px] font-medium transition-all"
                style={{
                  color: sortMode === s.id ? "hsl(42 85% 60%)" : "hsl(38 15% 40%)",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Prayer Cards ───────────────────────────────────────────────── */}
        {loading && saved.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "hsl(42 85% 55%)" }} />
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <BookOpen className="w-12 h-12 mx-auto" style={{ color: "hsl(38 20% 30%)" }} />
            <p className="text-sm" style={{ color: "hsl(38 20% 45%)" }}>
              {searchQuery ? "No prayers match your search" : "Your prayer board is empty"}
            </p>
            <button
              onClick={() => setPrayNowOpen(true)}
              className="px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
              style={{
                backgroundColor: "hsl(42 85% 55%)",
                color: "hsl(30 25% 10%)",
              }}
            >
              Write Your First Prayer
            </button>
          </div>
        ) : (
          <div className={isMobile ? "space-y-4" : "grid grid-cols-2 gap-4"}>
            {displayedItems.map((item) => {
              const card = item.prayer_cards!;
              const meta: SavedMeta = {
                id: item.id,
                pinned: item.pinned,
                favorite: item.favorite,
                notes: item.notes,
                position: item.position,
                overlay_opacity: (item as any).overlay_opacity,
                card_color: (item as any).card_color,
              };

              return (
                <PrayerCard
                  key={item.id}
                  prayer={card}
                  savedMeta={meta}
                  variant="full"
                  isOwner={!!(user && card.created_by === user.id)}
                  userId={user?.id}
                  themeVars={themeVars}
                  onRefresh={fetchSaved}
                  captionModeTts={prefs.caption_mode_tts}
                  ttsVoiceId={prefs.tts_voice_id}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Floating + button ────────────────────────────────────────────── */}
      <motion.button
        onClick={() => setPrayNowOpen(true)}
        className="fixed z-40 flex items-center justify-center rounded-full shadow-2xl"
        style={{
          bottom: isMobile ? "5.5rem" : "2rem",
          right: "1.5rem",
          width: 56,
          height: 56,
          backgroundColor: "hsl(42 85% 55%)",
          color: "hsl(30 25% 10%)",
          boxShadow: "0 8px 32px -4px rgba(180,140,50,0.4)",
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </motion.button>

      {/* ── PrayNow Sheet ────────────────────────────────────────────────── */}
      <PrayNowSheet
        open={prayNowOpen}
        onOpenChange={setPrayNowOpen}
        onPrayerCreated={fetchSaved}
      />
    </div>
  );
}
