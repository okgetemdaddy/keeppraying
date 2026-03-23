import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import AddPrayerModal from "@/components/AddPrayerModal";
import { BoardCard } from "@/components/board/BoardCard";
import { ThemeCanvas } from "@/components/board/ThemeCanvas";
import { ThemeSelector } from "@/components/board/ThemeSelector";
import { AmbientPlayer } from "@/components/board/AmbientPlayer";
import { BOARD_THEMES } from "@/components/board/boardThemes";
import { useBoardPreferences } from "@/hooks/useBoardPreferences";
import { SiteNav } from "@/components/SiteNav";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  rectSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Database } from "@/integrations/supabase/types";
import {
  PlusCircle, BookOpen, ListMusic, Heart,
  Pin, Loader2, LayoutGrid, Maximize2, Sparkles, ListPlus, Bird,
} from "lucide-react";
import { Link } from "react-router-dom";

type PrayerCard = Database['public']['Tables']['prayer_cards']['Row'];
type CardSize = "small" | "medium" | "large";
type SavedPrayer = Database['public']['Tables']['user_saved_prayers']['Row'] & {
  prayer_cards: PrayerCard | null;
  card_size?: CardSize;
};

// ── Sortable wrapper ──────────────────────────────────────────────────────────
function SortableBoardCard({
  item, userId, onUpdate, onRemove, onRefresh, themeVars, onAddToPlaylist,
}: {
  item: SavedPrayer;
  userId: string | undefined;
  onUpdate: (id: string, updates: Partial<SavedPrayer & { card_size: CardSize }>) => void;
  onRemove: (id: string) => void;
  onRefresh: () => void;
  themeVars: Record<string, string>;
  onAddToPlaylist: (prayerId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const size = (item.card_size as CardSize) || "medium";

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms cubic-bezier(0.2,0,0,1)",
    zIndex: isDragging ? 50 : undefined,
    gridColumn: size === "large" ? "span 2" : "span 1",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <BoardCard
        item={item}
        userId={userId}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onRefresh={onRefresh}
        themeVars={themeVars}
        onAddToPlaylist={onAddToPlaylist}
      />
    </div>
  );
}

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
      {card.tags && card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.tags.slice(0, 4).map(t => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary"># {t}</span>
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

  const [saved, setSaved] = useState<SavedPrayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [testifyOpen, setTestifyOpen] = useState(false);
  const [testifyBody, setTestifyBody] = useState("");
  const [testifySubmitting, setTestifySubmitting] = useState(false);
  const [testifyReject, setTestifyReject] = useState("");
  const testifyRef = useRef<HTMLTextAreaElement>(null);

  // Stats
  const [totalPrayed, setTotalPrayed] = useState(0);
  const [totalLiked, setTotalLiked] = useState(0);

  // Stats drawer
  const [statsDrawer, setStatsDrawer] = useState<"prayed" | "liked" | null>(null);
  const [drawerCards, setDrawerCards] = useState<PrayerCard[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Playlist builder
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savingPlaylist, setSavingPlaylist] = useState(false);

  const [immersive, setImmersive] = useState(false);

  const theme = BOARD_THEMES.find(t => t.id === prefs.theme) || BOARD_THEMES[0];
  const themeVars = theme.vars;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fetchSaved = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data }, { count: prayedCount }, { count: likedCount }] = await Promise.all([
      supabase
        .from("user_saved_prayers")
        .select("*, prayer_cards(*)")
        .eq("user_id", user.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("prayed_actions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    const sorted = (data || []).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (a.position || 0) - (b.position || 0);
    });
    setSaved(sorted as SavedPrayer[]);
    setTotalPrayed(prayedCount || 0);
    setTotalLiked(likedCount || 0);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  // Open stats drawer and load the relevant prayers
  const openStatsDrawer = async (type: "prayed" | "liked") => {
    if (!user) return;
    setStatsDrawer(type);
    setDrawerLoading(true);
    setDrawerCards([]);
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
          // Keep the order from prayed_actions
          const map = Object.fromEntries((cards || []).map(c => [c.id, c]));
          setDrawerCards(ids.map(id => map[id]).filter(Boolean));
        }
      } else {
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
      }
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSaved(prev => {
      const oldIndex = prev.findIndex(i => i.id === active.id);
      const newIndex = prev.findIndex(i => i.id === over.id);
      const newOrder = arrayMove(prev, oldIndex, newIndex);
      const updates = newOrder.map((item, index) => ({
        id: item.id, position: index,
        user_id: item.user_id, prayer_id: item.prayer_id, created_at: item.created_at,
      }));
      supabase.from("user_saved_prayers").upsert(updates).then(({ error }) => {
        if (error) console.error("Position update error:", error);
      });
      return newOrder;
    });
  };

  const updateItem = (id: string, updates: Partial<SavedPrayer & { card_size: CardSize }>) => {
    setSaved(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const removeItem = (id: string) => {
    setSaved(prev => prev.filter(i => i.id !== id));
    toast({ title: "Removed from board" });
  };

  const autoArrange = () => {
    setSaved(prev => {
      const pinned = prev.filter(p => p.pinned);
      const rest = prev.filter(p => !p.pinned);
      const newOrder = [...pinned, ...rest];
      const updates = newOrder.map((item, index) => ({
        id: item.id, position: index,
        user_id: item.user_id, prayer_id: item.prayer_id, created_at: item.created_at,
      }));
      supabase.from("user_saved_prayers").upsert(updates);
      return newOrder;
    });
    toast({ title: "Board arranged ✨" });
  };

  // Opens the playlist builder, optionally pre-selecting a prayer card ID
  const openPlaylist = (prayerId?: string) => {
    if (prayerId) {
      // Find the user_saved_prayers row whose prayer_id matches
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
    // Resolve prayer_ids from saved_prayer ids OR direct prayer_ids if from drawer
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

  const pinned = saved.filter(s => s.pinned);
  const unpinned = saved.filter(s => !s.pinned);
  const textColor = themeVars["--board-text"] || "rgba(255,255,255,0.85)";

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        ...Object.fromEntries(Object.entries(themeVars)),
        transition: "background 0.8s ease",
        background: theme.bgClass ? undefined : undefined,
      }}
      data-theme-bg
    >
      <div className={`absolute inset-0 ${theme.bgClass}`} />
      {/* Animated canvas background */}
      <ThemeCanvas theme={theme} enabled={prefs.animations_enabled} />
      {/* Overlay tint */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: theme.overlay }} />

      {/* Header */}
      <motion.div
        animate={{ opacity: immersive ? 0 : 1, y: immersive ? -64 : 0 }}
        transition={{ duration: 0.35 }}
        onMouseEnter={() => immersive && setImmersive(false)}
        className="sticky top-0 z-50"
      >
        <SiteNav
          dark
          rightSlot={
            <div className="flex items-center gap-1.5">
              <ThemeSelector
                currentTheme={prefs.theme}
                animationsEnabled={prefs.animations_enabled}
                onThemeChange={(id) => savePrefs({ theme: id })}
                onAnimationsToggle={(v) => savePrefs({ animations_enabled: v })}
              />
              {saved.length > 0 && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-xl gap-1.5 text-white/70 hover:text-white hover:bg-white/10 hidden sm:flex"
                    onClick={autoArrange}
                  >
                    <LayoutGrid className="w-4 h-4" /> Arrange
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-xl gap-1.5 text-white/70 hover:text-white hover:bg-white/10"
                    onClick={() => openPlaylist()}
                  >
                    <ListMusic className="w-4 h-4" />
                    <span className="hidden sm:inline">Playlist</span>
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl gap-1.5 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setTestifyOpen(true)}
              >
                <Feather className="w-4 h-4" />
                <span className="hidden sm:inline">Testify</span>
              </Button>
              <Button
                size="sm"
                className="btn-gold rounded-xl gap-1.5"
                onClick={() => setAddOpen(true)}
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Add Prayer</span>
              </Button>
              <button
                onClick={() => setImmersive(i => !i)}
                className="p-2 rounded-xl text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors hidden md:block"
                title="Immersive mode"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          }
        />
      </motion.div>

      {/* Main content */}
      <div className="relative container mx-auto px-4 py-8 pb-32 max-w-5xl">

        {/* ── Stats strip ───────────────────────────────────────────────── */}
        {!loading && (totalPrayed > 0 || totalLiked > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap items-center gap-2 mb-6"
          >
            {totalPrayed > 0 && (
              <button
                onClick={() => openStatsDrawer("prayed")}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  cursor: "pointer",
                }}
              >
                <span className="text-base">🙏</span>
                <span className="text-xs font-medium" style={{ color: textColor }}>
                  You've prayed <strong>{totalPrayed.toLocaleString()}</strong> {totalPrayed === 1 ? "time" : "times"}
                </span>
              </button>
            )}
            {totalLiked > 0 && (
              <button
                onClick={() => openStatsDrawer("liked")}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  cursor: "pointer",
                }}
              >
                <Heart className="w-4 h-4 fill-red-400 text-red-400" />
                <span className="text-xs font-medium" style={{ color: textColor }}>
                  <strong>{totalLiked.toLocaleString()}</strong> {totalLiked === 1 ? "prayer" : "prayers"} hearted
                </span>
              </button>
            )}
          </motion.div>
        )}

        {/* ── Board grid ────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl shimmer" />
            ))}
          </div>
        ) : saved.length === 0 ? (
          <EmptyBoard onAdd={() => setAddOpen(true)} themeVars={themeVars} />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="space-y-6">
              {pinned.length > 0 && (
                <section>
                  <p className="text-xs font-medium mb-3 flex items-center gap-1.5 text-white/50">
                    <Pin className="w-3 h-3" />Pinned
                  </p>
                  <SortableContext items={pinned.map(i => i.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pinned.map(item => (
                        <SortableBoardCard
                          key={item.id} item={item} userId={user?.id}
                          onUpdate={updateItem} onRemove={removeItem} onRefresh={fetchSaved}
                          themeVars={themeVars}
                          onAddToPlaylist={id => openPlaylist(id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </section>
              )}
              {unpinned.length > 0 && (
                <section>
                  {pinned.length > 0 && (
                    <p className="text-xs font-medium mb-3 text-white/50">All saved prayers</p>
                  )}
                  <SortableContext items={unpinned.map(i => i.id)} strategy={rectSortingStrategy}>
                    <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <AnimatePresence>
                        {unpinned.map(item => (
                          <SortableBoardCard
                            key={item.id} item={item} userId={user?.id}
                            onUpdate={updateItem} onRemove={removeItem} onRefresh={fetchSaved}
                            themeVars={themeVars}
                            onAddToPlaylist={id => openPlaylist(id)}
                          />
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  </SortableContext>
                </section>
              )}
            </div>
          </DndContext>
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

      {/* Ambient sound player */}
      <AmbientPlayer
        soundId={prefs.sound_id}
        volume={prefs.sound_volume}
        onChange={(updates) => savePrefs(updates as { sound_id?: string | null; sound_volume?: number })}
      />

      {/* ── Stats drawer (prayed / liked) ─────────────────────────────── */}
      <Sheet open={!!statsDrawer} onOpenChange={o => !o && setStatsDrawer(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="font-display flex items-center gap-2">
              {statsDrawer === "prayed"
                ? <><span className="text-xl">🙏</span> Prayers I've Prayed</>
                : <><Heart className="w-5 h-5 fill-red-400 text-red-400" /> Hearted Prayers</>}
            </SheetTitle>
            <SheetDescription>
              {statsDrawer === "prayed"
                ? "Every prayer you've marked as prayed."
                : "Prayers you've liked from the community."}
            </SheetDescription>
          </SheetHeader>

          {drawerLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
            </div>
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
                    // Use prayer_id directly since these may not be on the board
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
            {/* Saved board prayers */}
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
                        {item.prayer_cards.tags && item.prayer_cards.tags.length > 0 && (
                          <p className="text-xs text-muted-foreground truncate">
                            {item.prayer_cards.tags.slice(0, 3).map(t => `#${t}`).join(" ")}
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

      {/* ── Testify Sheet ──────────────────────────────────────────────── */}
      <Sheet open={testifyOpen} onOpenChange={o => { setTestifyOpen(o); if (!o) { setTestifyBody(""); setTestifyReject(""); } }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col gap-0 p-0">
          <div className="p-6 pb-4 border-b" style={{ borderColor: "hsl(38 22% 90%)" }}>
            <SheetHeader>
              <SheetTitle className="font-display text-2xl flex items-center gap-2">
                <Feather className="w-5 h-5" style={{ color: "hsl(42 75% 45%)" }} />
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
                : <><Feather className="w-4 h-4" />Share Testimony</>}
            </Button>

            <p className="text-xs text-center" style={{ color: "hsl(25 18% 62%)" }}>
              All testimonies are reviewed before publishing.
            </p>
          </div>
        </SheetContent>
      </Sheet>
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
          Your sacred space awaits
        </h2>
        <p className="text-sm max-w-xs mx-auto leading-relaxed" style={{ color: `${textColor}70` }}>
          "When you pray, go into your room…" — Matthew 6:6
        </p>
        <p className="text-xs max-w-sm mx-auto" style={{ color: `${textColor}50` }}>
          Write a prayer or save prayers from the collection to build your personal prayer board.
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
          className="rounded-xl gap-2 border-white/20 bg-white/10 text-white hover:bg-white/20"
          onClick={onAdd}
        >
          <PlusCircle className="w-4 h-4" /> Write a Prayer
        </Button>
      </div>
    </motion.div>
  );
}
