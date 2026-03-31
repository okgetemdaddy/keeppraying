import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getIdbCache, setIdbCache, cacheKeys } from "@/lib/localCache";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddPrayerModal from "@/components/AddPrayerModal";
import VerseLink from "@/components/VerseLink";
import { BoardCard } from "@/components/board/BoardCard";
import { PrayerViewerModal } from "@/components/board/PrayerViewerModal";


import { BOARD_THEMES } from "@/components/board/boardThemes";
import { useBoardPreferences } from "@/hooks/useBoardPreferences";
import { SiteNav } from "@/components/SiteNav";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Database } from "@/integrations/supabase/types";
import {
  PlusCircle, BookOpen, ListMusic, Heart,
  Pin, Loader2, Maximize2, Sparkles, ListPlus, Bird, Columns2, Square,
  ArrowUpDown, Filter, Users, Home, Wind, Church, Settings,
} from "lucide-react";

import { NotificationBell } from "@/components/NotificationBell";
import { PrayerWarriorsOnline } from "@/components/PrayerWarriorsOnline";
import { StreakCounter } from "@/components/StreakCounter";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { Link } from "react-router-dom";
import { PrayerCalendar } from "@/components/board/PrayerCalendar";
import { ClassicalPrayersLibrary } from "@/components/ClassicalPrayersLibrary";
import { PrayerStationHero } from "@/components/board/PrayerStationHero";
import { ThemeSanctuaryModal } from "@/components/board/ThemeSanctuaryModal";
import { AtmosphereCanvas } from "@/components/board/AtmosphereCanvas";
import { BoardVerseBunchesSection } from "@/components/board/BoardVerseBunchesSection";
import { BoardBibleAnnotations } from "@/components/board/BoardBibleAnnotations";
import { useSermonPlans } from "@/hooks/useSermonPlans";
import { PlanProgressCard } from "@/components/sermon/PlanProgressCard";
import { MyChurchSection } from "@/components/board/MyChurchSection";
import { SiteSettingsSheet } from "@/components/board/SiteSettingsSheet";
import { useBibleTextSize } from "@/hooks/useBibleTextSize";

type PrayerCard = Database['public']['Tables']['prayer_cards']['Row'];
type CardSize = "small" | "medium" | "large";
type SavedPrayer = Database['public']['Tables']['user_saved_prayers']['Row'] & {
  prayer_cards: PrayerCard | null;
  card_size?: CardSize;
};

type SortMode =
  | "newest"
  | "oldest"
  | "recently-updated"
  | "most-prayed"
  | "most-liked"
  | "needs-testimony"
  | "not-seen";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "recently-updated", label: "Recently updated" },
  { value: "most-prayed", label: "Most prayed" },
  { value: "most-liked", label: "Most liked" },
  { value: "needs-testimony", label: "Needs testimony" },
  { value: "not-seen", label: "Haven't seen in a while" },
];

type FilterMode = "all" | "pinned" | "favorites";

// ── Mini prayer card used inside the stats drawer ─────────────────────────────
function DrawerPrayerCard({
  card,
  onAddToPlaylist,
}: {
  card: PrayerCard;
  onAddToPlaylist: (id: string) => void;
}) {
  return (
    <div className="prayer-card p-4 space-y-2">
      {card.title && <h4 className="font-display font-semibold text-sm leading-snug">{card.title}</h4>}
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{card.prayer_text}</p>
      {card.labels && card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.labels.slice(0, 4).map(t => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{t}</span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl h-7 text-xs gap-1.5 flex-1"
          onClick={() => onAddToPlaylist(card.id)}
        >
          <ListPlus className="w-3.5 h-3.5" /> Add to Playlist
        </Button>
        <Link to={`/prayer/${card.id}`}>
          <Button
            size="sm"
            className="btn-gold rounded-xl h-7 text-xs gap-1.5"
          >
            Go to Prayer →
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── Main Board component ──────────────────────────────────────────────────────
export default function Board() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { prefs, savePrefs, loaded: prefsLoaded } = useBoardPreferences();
  const isMobile = useIsMobile();
  const { plans: sermonPlans, memberships: sermonMemberships, updateMemberToggles, markDayComplete } = useSermonPlans();
  const { size: bibleTextSize, setTextSize: setBibleTextSize, MIN_SIZE: bibleMin, MAX_SIZE: bibleMax } = useBibleTextSize();

  // Stale-while-revalidate: show cached board instantly
  const [saved, setSaved] = useState<SavedPrayer[]>([]);
  const [loading, setLoading] = useState(true);
  const boardCacheInitialized = useRef(false);

  // Hydrate from IndexedDB on mount (non-blocking)
  useEffect(() => {
    if (!user || boardCacheInitialized.current) return;
    boardCacheInitialized.current = true;
    (async () => {
      const cached = await getIdbCache<SavedPrayer[]>(cacheKeys.savedPrayers(user.id));
      if (cached && cached.length > 0) {
        setSaved(cached);
        setLoading(false);
      }
    })();
  }, [user]);
  const [addOpen, setAddOpen] = useState(false);
  const [testifyOpen, setTestifyOpen] = useState(false);
  const [testifyBody, setTestifyBody] = useState("");
  const [testifySubmitting, setTestifySubmitting] = useState(false);
  const [testifyReject, setTestifyReject] = useState("");
  const testifyRef = useRef<HTMLTextAreaElement>(null);

  // Layout & sorting
  const [mobileLayout, setMobileLayout] = useState<"two-col" | "one-col">("two-col");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Stats
  const [totalPrayed, setTotalPrayed] = useState(0);
  const [totalLiked, setTotalLiked] = useState(0);
  const [totalTestimonies, setTotalTestimonies] = useState(0);

  // Stats drawer
  const [statsDrawer, setStatsDrawer] = useState<"prayed" | "liked" | "testified" | null>(null);
  const [drawerCards, setDrawerCards] = useState<PrayerCard[]>([]);
  const [drawerTestimonies, setDrawerTestimonies] = useState<any[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Playlist builder
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savingPlaylist, setSavingPlaylist] = useState(false);

  const [immersive, setImmersive] = useState(false);
  const [classicalOpen, setClassicalOpen] = useState(false);
  const [viewerItem, setViewerItem] = useState<SavedPrayer | null>(null);
  const [themeSanctuaryOpen, setThemeSanctuaryOpen] = useState(false);
  const [siteSettingsOpen, setSiteSettingsOpen] = useState(false);

  // Auto-hide nav on scroll
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      if (y > 60 && y > lastScrollY.current) {
        setNavVisible(false);
      } else {
        setNavVisible(true);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const theme = BOARD_THEMES.find(t => t.id === prefs.theme) || BOARD_THEMES[0];
  const themeVars = theme.vars;

  // Extract first name
  const firstName = useMemo(() => {
    const fullName = user?.user_metadata?.full_name as string | undefined;
    if (fullName) return fullName.split(" ")[0];
    return "Your";
  }, [user]);

  const fetchSaved = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data }, { count: prayedCount }, { count: likedCount }, { count: testiCount }] = await Promise.all([
      supabase
        .from("user_saved_prayers")
        .select("*, prayer_cards(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("prayed_actions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("testimonies")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    const freshSaved = (data || []) as SavedPrayer[];
    setSaved(freshSaved);
    setTotalPrayed(prayedCount || 0);
    setTotalLiked(likedCount || 0);
    setTotalTestimonies(testiCount || 0);
    setLoading(false);
    // Write-through to IndexedDB
    void setIdbCache(cacheKeys.savedPrayers(user.id), freshSaved);
  }, [user]);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  // Sorted, filtered & searched items
  const displayedItems = useMemo(() => {
    let items = [...saved];

    // Filter
    if (filterMode === "pinned") items = items.filter(i => i.pinned);
    if (filterMode === "favorites") items = items.filter(i => i.favorite);

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => {
        const card = i.prayer_cards;
        if (!card) return false;
        return (
          (card.title && card.title.toLowerCase().includes(q)) ||
          card.prayer_text.toLowerCase().includes(q) ||
          (card.labels && card.labels.some(l => l.toLowerCase().includes(q)))
        );
      });
    }

    // Sort
    items.sort((a, b) => {
      const ca = a.prayer_cards;
      const cb = b.prayer_cards;
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      switch (sortMode) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "recently-updated":
          return new Date(cb?.updated_at || b.created_at).getTime() - new Date(ca?.updated_at || a.created_at).getTime();
        case "most-prayed":
          return (cb?.prayed_count || 0) - (ca?.prayed_count || 0);
        case "most-liked":
          return (cb?.likes_count || 0) - (ca?.likes_count || 0);
        case "needs-testimony":
          return (ca?.prayed_count || 0) - (cb?.prayed_count || 0);
        case "not-seen":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return 0;
      }
    });

    return items;
  }, [saved, sortMode, filterMode, searchQuery]);

  // Open stats drawer and load the relevant prayers
  const openStatsDrawer = async (type: "prayed" | "liked" | "testified") => {
    if (!user) return;
    setStatsDrawer(type);
    setDrawerLoading(true);
    setDrawerCards([]);
    setDrawerTestimonies([]);
    try {
      if (type === "prayed") {
        const { data } = await supabase
          .from("prayed_actions")
          .select("prayer_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);
        const ids = (data || []).map(r => r.prayer_id);
        if (ids.length > 0) {
          const { data: cards } = await supabase
            .from("prayer_cards")
            .select("*")
            .in("id", ids);
          const map = Object.fromEntries((cards || []).map(c => [c.id, c]));
          setDrawerCards(ids.map(id => map[id]).filter(Boolean));
        }
      } else if (type === "liked") {
        const { data } = await supabase
          .from("likes")
          .select("prayer_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);
        const ids = (data || []).map(r => r.prayer_id);
        if (ids.length > 0) {
          const { data: cards } = await supabase
            .from("prayer_cards")
            .select("*")
            .in("id", ids);
          const map = Object.fromEntries((cards || []).map(c => [c.id, c]));
          setDrawerCards(ids.map(id => map[id]).filter(Boolean));
        }
      } else if (type === "testified") {
        const { data: testis } = await supabase
          .from("testimonies")
          .select("*, testimony_updates(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);
        setDrawerTestimonies(testis || []);
      }
    } finally {
      setDrawerLoading(false);
    }
  };

  const updateItem = (id: string, updates: Partial<SavedPrayer & { card_size: CardSize }>) => {
    setSaved(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const removeItem = (id: string) => {
    setSaved(prev => prev.filter(i => i.id !== id));
    toast({ title: "Removed from board" });
  };

  const openPlaylist = (prayerId?: string) => {
    if (prayerId) {
      const match = saved.find(s => s.prayer_cards?.id === prayerId || s.prayer_id === prayerId);
      setSelectedIds(match ? [match.id] : []);
    } else {
      setSelectedIds([]);
    }
    setPlaylistName("");
    setPlaylistOpen(true);
  };

  const savePlaylist = async () => {
    if (!playlistName.trim() || selectedIds.length === 0 || !user) return;
    setSavingPlaylist(true);
    const prayerIds = selectedIds.map(id => {
      const s = saved.find(s => s.id === id);
      return s ? s.prayer_id : id;
    });
    const { error } = await supabase.from("prayer_playlists").insert({
      user_id: user.id, name: playlistName.trim(), prayer_ids: prayerIds,
    });
    if (error) { toast({ title: "Failed to save playlist", variant: "destructive" }); }
    else {
      toast({ title: `Playlist "${playlistName}" saved! 🎵` });
      setPlaylistOpen(false); setPlaylistName(""); setSelectedIds([]);
    }
    setSavingPlaylist(false);
  };

  useEffect(() => {
    if (!user && prefsLoaded) navigate("/auth", { replace: true });
  }, [user, prefsLoaded, navigate]);

  if (!user) return null;

  const textColor = themeVars["--board-text"] || "rgba(255,255,255,0.85)";

  return (
    <div
      ref={scrollContainerRef}
      className="relative min-h-screen overflow-hidden"
      style={{
        ...Object.fromEntries(Object.entries(themeVars)),
        transition: "background 0.8s ease",
      }}
      data-theme-bg
    >
      <div className={`absolute inset-0 ${theme.bgClass}`} />
      <AtmosphereCanvas
        atmosphereId={prefs.atmosphere_id || "warm-parchment"}
        enabled={prefs.animations_enabled}
      />

      {/* Header — auto-hides on scroll down */}
      <motion.div
        animate={{
          opacity: immersive ? 0 : navVisible ? 1 : 0,
          y: immersive ? -64 : navVisible ? 0 : -64,
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onMouseEnter={() => immersive && setImmersive(false)}
        className="sticky top-0 z-50"
      >
        {isMobile ? (
          <nav
            className="h-14 flex items-center justify-between px-4"
            style={{
              background: "rgba(0,0,0,0.25)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <Link to="/" className="font-display text-xl font-bold">
              <span className="text-white">Keep</span>
              <span className="nav-pray-glow">Pray</span>
              <span className="text-white">.ing</span>
            </Link>
            <div className="flex items-center gap-1">
              <NotificationBell dark scrolled={false} />
            </div>
          </nav>
        ) : (
          <SiteNav dark />
        )}

      </motion.div>

      {/* Hero Section */}
      <PrayerStationHero
        firstName={firstName}
        onAddPrayer={() => setAddOpen(true)}
        onPlaylist={() => openPlaylist()}
        onClassical={() => setClassicalOpen(true)}
        hasPrayers={saved.length > 0}
        isMobile={isMobile}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenThemeSanctuary={() => setThemeSanctuaryOpen(true)}
      />

      {/* Main content */}
      <div className={`relative container mx-auto px-4 ${isMobile ? "py-4" : "py-8"} pb-32 max-w-5xl`}>

        {/* ── Active Sermon Prayer Plans ──────────────────────── */}
        {sermonPlans.length > 0 && (
          <div className="mb-6 space-y-3">
            <h3 className="text-sm font-display font-bold flex items-center gap-2" style={{ color: textColor }}>
              <Church className="w-4 h-4" /> Week of Prayer
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sermonPlans.map((plan) => {
                const mem = sermonMemberships.find((m) => m.plan_id === plan.id);
                if (!mem) return null;
                return (
                  <PlanProgressCard
                    key={plan.id}
                    plan={plan}
                    membership={mem}
                    onToggle={updateMemberToggles}
                    onMarkDay={markDayComplete}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ── Sort / Filter / Layout controls ──────────────────────── */}
        {!loading && saved.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {/* Sort */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5" style={{ color: `${textColor}60` }} />
              <Select value={sortMode} onValueChange={v => setSortMode(v as SortMode)}>
                <SelectTrigger
                  className="h-8 rounded-xl text-xs border-0 gap-1.5 min-w-[140px]"
                  style={{ background: "rgba(255,255,255,0.10)", color: textColor }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-1 rounded-xl p-0.5" style={{ background: "rgba(255,255,255,0.08)" }}>
              {(["all", "pinned", "favorites"] as FilterMode[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterMode(f)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                  style={{
                    background: filterMode === f ? "rgba(255,255,255,0.18)" : "transparent",
                    color: filterMode === f ? textColor : `${textColor}55`,
                  }}
                >
                  {f === "all" ? "All" : f === "pinned" ? "📌 Pinned" : "❤️ Favorites"}
                </button>
              ))}
            </div>

            {/* Mobile layout toggle */}
            {isMobile && (
              <div className="flex items-center gap-1 rounded-xl p-0.5 ml-auto" style={{ background: "rgba(255,255,255,0.08)" }}>
                <button
                  onClick={() => setMobileLayout("one-col")}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: mobileLayout === "one-col" ? "rgba(255,255,255,0.18)" : "transparent",
                    color: mobileLayout === "one-col" ? textColor : `${textColor}55`,
                  }}
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setMobileLayout("two-col")}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: mobileLayout === "two-col" ? "rgba(255,255,255,0.18)" : "transparent",
                    color: mobileLayout === "two-col" ? textColor : `${textColor}55`,
                  }}
                >
                  <Columns2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Prayer Warriors Online + Streak ────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <PrayerWarriorsOnline className="backdrop-blur-sm" />
          <StreakCounter textColor={textColor} />
        </div>

        {/* ── Stats strip ───────────────────────────────────────────────── */}
        {!loading && (totalPrayed > 0 || totalLiked > 0 || totalTestimonies > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap items-center gap-3 mb-6"
          >
            {totalPrayed > 0 && (
              <button
                onClick={() => openStatsDrawer("prayed")}
                className="bg-white border border-slate-100 rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="bg-slate-50 p-2 rounded-full text-base flex items-center justify-center">🙏</span>
                <span className="text-sm font-medium text-slate-700">
                  You've prayed <strong className="text-slate-900">{totalPrayed.toLocaleString()}</strong> {totalPrayed === 1 ? "time" : "times"}
                </span>
              </button>
            )}
            {totalLiked > 0 && (
              <button
                onClick={() => openStatsDrawer("liked")}
                className="bg-white border border-slate-100 rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="bg-slate-50 p-2 rounded-full flex items-center justify-center">
                  <Heart className="w-4 h-4 fill-red-400 text-red-400" />
                </span>
                <span className="text-sm font-medium text-slate-700">
                  <strong className="text-slate-900">{totalLiked.toLocaleString()}</strong> {totalLiked === 1 ? "prayer" : "prayers"} hearted
                </span>
              </button>
            )}
            {totalTestimonies > 0 && (
              <button
                onClick={() => openStatsDrawer("testified")}
                className="bg-white border border-slate-100 rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="bg-slate-50 p-2 rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                </span>
                <span className="text-sm font-medium text-slate-700">
                  Testified <strong className="text-slate-900">{totalTestimonies.toLocaleString()}</strong> {totalTestimonies === 1 ? "time" : "times"}
                </span>
              </button>
            )}
          </motion.div>
        )}

        {/* ── My Church Section ──────────────────────────────────── */}
        <MyChurchSection textColor={textColor} />

        {/* ── Bible Annotations (highlights, notes, bookmarks) ───── */}
        <BoardBibleAnnotations textColor={textColor} />

        {/* ── Verse Bunches ─────────────────────────────────────────── */}
        <BoardVerseBunchesSection textColor={textColor} />

        {/* ── Interactive Calendar ─────────────────────────────────────── */}
        <PrayerCalendar
          textColor={textColor}
          accentColor={themeVars["--board-accent"]}
          boardPrefs={prefs}
          onUpdateCalendarColor={(updates) => savePrefs(updates)}
        />

        {/* ── Board grid ────────────────────────────────────────────────── */}
        {loading ? (
          <div className={isMobile && mobileLayout === "two-col" ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-6"}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl shimmer" />
            ))}
          </div>
        ) : displayedItems.length === 0 && (filterMode !== "all" || searchQuery) ? (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: `${textColor}60` }}>
              {searchQuery ? `No results for "${searchQuery}"` : `No ${filterMode} prayers. Try switching to "All".`}
            </p>
          </div>
        ) : displayedItems.length === 0 ? (
          <EmptyBoard onAdd={() => setAddOpen(true)} themeVars={themeVars} />
        ) : (
          <motion.div
            layout
            className={
              isMobile && mobileLayout === "two-col"
                ? "grid grid-cols-2 gap-3"
                : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-6"
            }
          >
            <AnimatePresence>
              {displayedItems.map(item => {
                const size = (item.card_size as CardSize) || "medium";
                return (
                  <div
                    key={item.id}
                    style={{ gridColumn: size === "large" ? "span 2" : "span 1" }}
                  >
                    <BoardCard
                      item={item}
                      userId={user?.id}
                      isDragging={false}
                      onUpdate={updateItem}
                      onRemove={removeItem}
                      onRefresh={fetchSaved}
                      themeVars={themeVars}
                      onAddToPlaylist={id => openPlaylist(id)}
                      onOpenViewer={(itm) => setViewerItem(itm as SavedPrayer)}
                    />
                  </div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* FAB */}
      {saved.length > 0 && (
        <motion.button
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          onClick={() => setAddOpen(true)}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 md:hidden z-40 btn-gold flex items-center gap-2 px-5 py-3 rounded-full shadow-2xl text-sm font-medium"
        >
          <PlusCircle className="w-4 h-4" /> Add Prayer
        </motion.button>
      )}

      {/* ── Stats drawer (prayed / liked / testified) ────────────────── */}
      <Sheet open={!!statsDrawer} onOpenChange={o => !o && setStatsDrawer(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="font-display flex items-center gap-2">
              {statsDrawer === "prayed"
                ? <><span className="text-xl">🙏</span> Prayers I've Prayed</>
                : statsDrawer === "liked"
                ? <><Heart className="w-5 h-5 fill-red-400 text-red-400" /> Hearted Prayers</>
                : <><Sparkles className="w-5 h-5 text-violet-500" /> My Testimonies</>}
            </SheetTitle>
            <SheetDescription>
              {statsDrawer === "prayed"
                ? "Every prayer you've marked as prayed."
                : statsDrawer === "liked"
                ? "Prayers you've liked from the community."
                : "Your testimonies of God's faithfulness."}
            </SheetDescription>
          </SheetHeader>

          {drawerLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
            </div>
          ) : statsDrawer === "testified" ? (
            drawerTestimonies.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No testimonies yet. Flip a prayer card to testify!</p>
            ) : (
              <div className="space-y-3">
                {drawerTestimonies.map((testi: any) => (
                  <div key={testi.id} className="prayer-card p-4 space-y-2">
                    {testi.title && <h4 className="font-display font-semibold text-sm leading-snug">{testi.title}</h4>}
                    {testi.answered_date && (
                      <p className="text-[10px] text-muted-foreground">
                        Answered: {new Date(testi.answered_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{testi.body}</p>
                    {testi.testimony_updates && testi.testimony_updates.length > 0 && (
                      <div className="border-t border-border/50 pt-2 mt-2 space-y-1.5">
                        <p className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider">Faith Journey Updates</p>
                        {testi.testimony_updates
                          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .slice(0, 3)
                          .map((upd: any) => (
                          <div key={upd.id} className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground/70">
                              {new Date(upd.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                            {" — "}
                            <span className="line-clamp-2">{upd.body}</span>
                          </div>
                        ))}
                        {testi.testimony_updates.length > 3 && (
                          <p className="text-[10px] text-primary">+{testi.testimony_updates.length - 3} more updates</p>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Link to={`/testimony/${testi.id}`}>
                        <Button size="sm" className="btn-gold rounded-xl h-7 text-xs gap-1.5">
                          View Testimony →
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : drawerCards.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Nothing here yet.</p>
          ) : (
            <div className="space-y-3">
              {drawerCards.map(card => (
                <DrawerPrayerCard
                  key={card.id}
                  card={card}
                  onAddToPlaylist={prayerId => {
                    setStatsDrawer(null);
                    setSelectedIds([prayerId]);
                    setPlaylistName("");
                    setPlaylistOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Playlist builder dialog ───────────────────────────────────── */}
      <Dialog open={playlistOpen} onOpenChange={setPlaylistOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <ListMusic className="w-5 h-5 text-primary" /> Create Playlist
            </DialogTitle>
            <DialogDescription>
              Name your playlist and choose which prayers to include.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Playlist name…"
              value={playlistName}
              onChange={e => setPlaylistName(e.target.value)}
              className="rounded-xl"
            />
            {saved.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">From your board</p>
                <div className="space-y-2">
                  {saved.map(item => item.prayer_cards && (
                    <label
                      key={item.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        selectedIds.includes(item.id) ? "border-primary bg-accent" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-primary"
                        checked={selectedIds.includes(item.id)}
                        onChange={e => setSelectedIds(prev =>
                          e.target.checked ? [...prev, item.id] : prev.filter(id => id !== item.id)
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.prayer_cards.title || item.prayer_cards.prayer_text.slice(0, 50) + "…"}
                        </p>
                        {item.prayer_cards.labels && item.prayer_cards.labels.length > 0 && (
                          <p className="text-xs text-muted-foreground truncate">
                            {item.prayer_cards.labels.slice(0, 3).join(", ")}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <Button
              onClick={savePlaylist}
              disabled={!playlistName.trim() || selectedIds.length === 0 || savingPlaylist}
              className="btn-gold rounded-xl w-full gap-2"
            >
              {savingPlaylist
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ListMusic className="w-4 h-4" />}
              Save Playlist ({selectedIds.length} {selectedIds.length === 1 ? "prayer" : "prayers"})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddPrayerModal open={addOpen} onOpenChange={setAddOpen} onSuccess={fetchSaved} />
      <ClassicalPrayersLibrary open={classicalOpen} onOpenChange={setClassicalOpen} />

      {/* ── Theme Sanctuary Modal ──────────────────────────────────── */}
      <ThemeSanctuaryModal
        isOpen={themeSanctuaryOpen}
        onOpenChange={setThemeSanctuaryOpen}
        currentPreset={prefs.theme_preset}
        currentBg={prefs.theme_bg}
        currentText={prefs.theme_text}
        currentAccent={prefs.theme_accent}
        currentScope={prefs.theme_scope}
        currentAtmosphereId={prefs.atmosphere_id}
        onApply={(data) => savePrefs(data)}
        onAtmosphereChange={(id) => savePrefs({ atmosphere_id: id })}
      />

      {/* ── Testify Sheet ──────────────────────────────────────────────── */}
      <Sheet open={testifyOpen} onOpenChange={o => { setTestifyOpen(o); if (!o) { setTestifyBody(""); setTestifyReject(""); } }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col gap-0 p-0">
          <div className="p-6 pb-4 border-b" style={{ borderColor: "hsl(38 22% 90%)" }}>
            <SheetHeader>
              <SheetTitle className="font-display text-2xl flex items-center gap-2">
                <Bird className="w-5 h-5" style={{ color: "hsl(42 75% 45%)" }} />
                Share a Testimony
              </SheetTitle>
              <SheetDescription className="text-sm leading-relaxed">
                Tell the story of how God moved. This doesn't have to be connected to any prayer — just share what He did.
              </SheetDescription>
            </SheetHeader>
          </div>

          <div className="flex-1 p-6 space-y-5">
            <div className="relative">
              <div
                className="absolute top-2 right-3 font-display font-bold leading-none pointer-events-none select-none"
                style={{ fontSize: "4rem", color: "hsl(42 80% 60% / 0.12)" }}
                aria-hidden
              >
                "
              </div>
              <textarea
                ref={testifyRef}
                value={testifyBody}
                onChange={e => {
                  setTestifyBody(e.target.value);
                  const el = testifyRef.current;
                  if (el) { el.style.height = "auto"; el.style.height = Math.max(220, el.scrollHeight) + "px"; }
                }}
                placeholder="Lord answered my prayer when…"
                maxLength={4000}
                rows={8}
                className="w-full resize-none outline-none rounded-2xl font-display text-base leading-[1.85] transition-shadow"
                style={{
                  minHeight: 220,
                  padding: "1.25rem 1.25rem",
                  background: "hsl(42 55% 99%)",
                  boxShadow: "inset 0 2px 14px hsl(42 75% 46% / 0.07), 0 0 0 1.5px hsl(38 22% 88%)",
                  color: "hsl(25 30% 18%)",
                }}
                onFocus={e => { e.target.style.boxShadow = "inset 0 2px 16px hsl(42 75% 46% / 0.10), 0 0 0 2px hsl(42 75% 55%)"; }}
                onBlur={e => { e.target.style.boxShadow = "inset 0 2px 14px hsl(42 75% 46% / 0.07), 0 0 0 1.5px hsl(38 22% 88%)"; }}
              />
              <span
                className="absolute bottom-3 right-4 text-[11px] pointer-events-none"
                style={{ color: testifyBody.length > 3800 ? "hsl(0 72% 51%)" : "hsl(25 18% 66%)" }}
              >
                {testifyBody.length}/4000
              </span>
            </div>

            {testifyReject && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm rounded-xl px-4 py-3"
                style={{ background: "hsl(0 72% 97%)", color: "hsl(0 72% 40%)", border: "1px solid hsl(0 72% 88%)" }}
              >
                {testifyReject}
              </motion.div>
            )}

            <Button
              onClick={async () => {
                if (!user || testifyBody.trim().length < 10) return;
                setTestifySubmitting(true);
                setTestifyReject("");
                try {
                  const { data: modData } = await supabase.functions.invoke("moderate-testimony", {
                    body: { text: testifyBody.trim() },
                  });
                  if (modData && !modData.approved) {
                    setTestifyReject(modData.reason || "Your testimony couldn't be posted at this time.");
                    setTestifySubmitting(false);
                    return;
                  }
                  const { error } = await supabase.from("testimonies").insert({
                    user_id: user.id,
                    body: testifyBody.trim(),
                    prayer_id: null,
                  });
                  if (error) throw error;
                  toast({ title: "Your testimony has been shared 🕊️", description: "Thank you for sharing what God has done!" });
                  setTestifyBody("");
                  setTestifyOpen(false);
                } catch {
                  toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
                } finally {
                  setTestifySubmitting(false);
                }
              }}
              disabled={testifySubmitting || testifyBody.trim().length < 10}
              className="w-full h-12 rounded-2xl text-base gap-2.5 btn-gold"
            >
              {testifySubmitting
                ? <><Loader2 className="w-4 h-4 animate-spin" />Reviewing…</>
                : <><Bird className="w-4 h-4" />Share Testimony</>}
            </Button>

            <p className="text-xs text-center" style={{ color: "hsl(25 18% 62%)" }}>
              All testimonies are reviewed before publishing.
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Top-level Prayer Viewer Modal (outside transformed cards) ── */}
      {viewerItem && (
        <PrayerViewerModal
          open={!!viewerItem}
          onClose={() => setViewerItem(null)}
          item={viewerItem}
          userId={user?.id}
          onUpdate={(id, updates) => {
            updateItem(id, updates as Partial<SavedPrayer & { card_size: CardSize }>);
            setViewerItem(prev => prev ? { ...prev, ...updates } as SavedPrayer : null);
          }}
          onRemove={(id) => {
            removeItem(id);
            setViewerItem(null);
          }}
          onRefresh={() => {
            fetchSaved();
            setViewerItem(null);
          }}
          themeVars={themeVars}
          onAddToPlaylist={id => openPlaylist(id)}
        />
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyBoard({ onAdd, themeVars }: { onAdd: () => void; themeVars: Record<string, string> }) {
  const textColor = themeVars["--board-text"] || "hsl(var(--foreground))";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-col items-center justify-center text-center py-24 px-6 space-y-6"
    >
      <motion.div
        animate={{ y: [0, -8, 0], opacity: [0.5, 0.8, 0.5] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
      >
        <BookOpen className="w-16 h-16 mx-auto" style={{ color: themeVars["--board-accent"] || "hsl(var(--primary))", opacity: 0.6 }} />
      </motion.div>
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-bold" style={{ color: textColor }}>
          Your Prayer Station awaits
        </h2>
        <p className="text-sm max-w-xs mx-auto leading-relaxed" style={{ color: `${textColor}70` }}>
          "When you pray, go into your room…" — <VerseLink reference="Matthew 6:6" className="[&_.verse-text]:text-white/60 [&>span]:bg-white/10 [&>span]:border-white/20" />
        </p>
        <p className="text-xs max-w-sm mx-auto" style={{ color: `${textColor}50` }}>
          Write a prayer or save prayers from the collection to build your personal Prayer Station.
        </p>
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link to="/prayers">
          <Button className="rounded-xl gap-2" style={{ background: themeVars["--board-accent"] || "" }}>
            <Sparkles className="w-4 h-4" /> Browse Prayers
          </Button>
        </Link>
        <Button
          variant="outline"
          className="rounded-xl gap-2"
          onClick={onAdd}
          style={{ borderColor: `${textColor}30`, color: textColor }}
        >
          <PlusCircle className="w-4 h-4" /> Write a Prayer
        </Button>
      </div>
      <Link to="/support#ai-stance" className="inline-block mt-6 text-xs hover:underline transition-colors" style={{ color: `${textColor}50` }}>
        Our Stance on AI
      </Link>
    </motion.div>
  );
}
