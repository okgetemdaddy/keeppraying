import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  PlusCircle, BookOpen, ListMusic,
  Pin, Loader2, LayoutGrid, Maximize2, Sparkles, Link as LinkIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

type PrayerCard = Database['public']['Tables']['prayer_cards']['Row'];
type CardSize = "small" | "medium" | "large";
type SavedPrayer = Database['public']['Tables']['user_saved_prayers']['Row'] & {
  prayer_cards: PrayerCard | null;
  card_size?: CardSize;
};

// Sortable wrapper that passes drag handle + theme vars down to BoardCard
function SortableBoardCard({
  item,
  userId,
  onUpdate,
  onRemove,
  onRefresh,
  themeVars,
}: {
  item: SavedPrayer;
  userId: string | undefined;
  onUpdate: (id: string, updates: Partial<SavedPrayer & { card_size: CardSize }>) => void;
  onRemove: (id: string) => void;
  onRefresh: () => void;
  themeVars: Record<string, string>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const size = item.card_size || "medium";

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms cubic-bezier(0.2,0,0,1)",
    zIndex: isDragging ? 50 : undefined,
    gridColumn: size === "large" ? "span 2" : size === "small" ? "span 1" : "span 1",
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
      />
    </div>
  );
}

export default function Board() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { prefs, savePrefs, loaded: prefsLoaded } = useBoardPreferences();

  const [saved, setSaved] = useState<SavedPrayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savingPlaylist, setSavingPlaylist] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [totalPrayed, setTotalPrayed] = useState(0);

  const theme = BOARD_THEMES.find(t => t.id === prefs.theme) || BOARD_THEMES[0];

  // Apply theme CSS variables on the board element
  const themeVars = theme.vars;

  // Sensors — include TouchSensor for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fetchSaved = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("user_saved_prayers")
      .select("*, prayer_cards(*)")
      .eq("user_id", user.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

    const sorted = (data || []).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (a.position || 0) - (b.position || 0);
    });
    setSaved(sorted as SavedPrayer[]);

    // Fetch total prayers prayed by this user
    const { count } = await supabase
      .from("prayed_actions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    setTotalPrayed(count || 0);

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

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

  const savePlaylist = async () => {
    if (!playlistName.trim() || selectedIds.length === 0 || !user) return;
    setSavingPlaylist(true);
    const { error } = await supabase.from("prayer_playlists").insert({
      user_id: user.id, name: playlistName.trim(), prayer_ids: selectedIds,
    });
    if (error) { toast({ title: "Failed to save playlist", variant: "destructive" }); }
    else {
      toast({ title: `Playlist "${playlistName}" saved! 🎵` });
      setPlaylistOpen(false); setPlaylistName(""); setSelectedIds([]);
    }
    setSavingPlaylist(false);
  };

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!user && prefsLoaded) navigate("/auth", { replace: true });
  }, [user, prefsLoaded, navigate]);

  if (!user) return null;

  const pinned = saved.filter(s => s.pinned);
  const unpinned = saved.filter(s => !s.pinned);

  const bgTransitionStyle = {
    transition: "background 0.8s ease",
  };

  return (
    <div
      className={`relative min-h-screen overflow-hidden ${theme.bgClass}`}
      style={{ ...bgTransitionStyle, ...Object.fromEntries(Object.entries(themeVars)) }}
    >
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
                    onClick={() => setPlaylistOpen(true)}
                  >
                    <ListMusic className="w-4 h-4" />
                    <span className="hidden sm:inline">Playlist</span>
                  </Button>
                </>
              )}
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
              {/* Pinned section */}
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
                        />
                      ))}
                    </div>
                  </SortableContext>
                </section>
              )}

              {/* All saved */}
              {unpinned.length > 0 && (
                <section>
                  {pinned.length > 0 && (
                    <p className="text-xs font-medium mb-3 text-white/50">All saved prayers</p>
                  )}
                  <SortableContext items={unpinned.map(i => i.id)} strategy={rectSortingStrategy}>
                    <motion.div
                      layout
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    >
                      <AnimatePresence>
                        {unpinned.map(item => (
                          <SortableBoardCard
                            key={item.id} item={item} userId={user?.id}
                            onUpdate={updateItem} onRemove={removeItem} onRefresh={fetchSaved}
                            themeVars={themeVars}
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

      {/* Floating Add Prayer FAB (mobile) */}
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

      {/* Playlist builder */}
      <Dialog open={playlistOpen} onOpenChange={setPlaylistOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Create Playlist</DialogTitle>
            <DialogDescription>Select prayers to group into a playlist for the War Room.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Playlist name…" value={playlistName} onChange={e => setPlaylistName(e.target.value)} className="rounded-xl" />
            <div className="space-y-2">
              {saved.map(item => item.prayer_cards && (
                <label key={item.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedIds.includes(item.id) ? "border-primary bg-accent" : "border-border hover:bg-muted/50"}`}>
                  <input type="checkbox" className="mt-0.5" checked={selectedIds.includes(item.id)}
                    onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, item.id] : prev.filter(id => id !== item.id))} />
                  <p className="text-sm font-medium truncate">{item.prayer_cards.title || item.prayer_cards.prayer_text.slice(0, 40) + "…"}</p>
                </label>
              ))}
            </div>
            <Button onClick={savePlaylist} disabled={!playlistName.trim() || selectedIds.length === 0 || savingPlaylist} className="btn-gold rounded-xl w-full gap-2">
              {savingPlaylist ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListMusic className="w-4 h-4" />}
              Save Playlist ({selectedIds.length} prayers)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddPrayerModal open={addOpen} onOpenChange={setAddOpen} onSuccess={fetchSaved} />
    </div>
  );
}

// Empty state component
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
