import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import AddPrayerModal from "@/components/AddPrayerModal";
import Comments from "@/components/Comments";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Database } from "@/integrations/supabase/types";
import {
  GripVertical, Heart, Bookmark, Pin, ChevronDown, ChevronUp, PlusCircle,
  BookOpen, Loader2, ListMusic, Sparkles, Trash2, ArrowLeft,
} from "lucide-react";

type PrayerCard = Database['public']['Tables']['prayer_cards']['Row'];
type SavedPrayer = Database['public']['Tables']['user_saved_prayers']['Row'] & {
  prayer_cards: PrayerCard | null;
};

const TEXT_STYLE_CLASSES: Record<string, string> = {
  classic: "font-body text-base",
  scripture: "font-display text-base italic",
  peaceful: "font-body text-base text-muted-foreground",
  bold: "font-body text-base font-semibold",
  gentle: "font-body text-sm leading-relaxed",
  strong: "font-display text-lg font-bold",
  modern: "font-body text-sm tracking-wide",
  compassionate: "font-display text-base",
  whisper: "font-body text-sm text-muted-foreground italic",
  royal: "font-display font-bold tracking-wider",
};

function SortableCard({ item, onUpdate, onRemove }: {
  item: SavedPrayer;
  onUpdate: (id: string, updates: Partial<SavedPrayer>) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(item.notes || "");
  const card = item.prayer_cards;
  const { toast } = useToast();

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  if (!card) return null;

  const textClass = TEXT_STYLE_CLASSES[card.text_style || "classic"] || TEXT_STYLE_CLASSES.classic;

  const saveNotes = async () => {
    await supabase.from("user_saved_prayers").update({ notes }).eq("id", item.id);
    onUpdate(item.id, { notes });
    setEditingNotes(false);
    toast({ title: "Notes saved" });
  };

  const togglePin = async () => {
    const newVal = !item.pinned;
    await supabase.from("user_saved_prayers").update({ pinned: newVal }).eq("id", item.id);
    onUpdate(item.id, { pinned: newVal });
  };

  const toggleFavorite = async () => {
    const newVal = !item.favorite;
    await supabase.from("user_saved_prayers").update({ favorite: newVal }).eq("id", item.id);
    onUpdate(item.id, { favorite: newVal });
  };

  return (
    <div ref={setNodeRef} style={style} className={`prayer-card p-4 space-y-3 ${item.pinned ? "border-l-2 border-primary" : ""}`}>
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none">
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          {card.title && <h3 className="font-display font-semibold text-foreground mb-1">{card.title}</h3>}
          <p className={`${textClass} text-foreground leading-relaxed text-sm line-clamp-3`}>{card.prayer_text}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={toggleFavorite} className={`p-1.5 rounded-lg transition-colors ${item.favorite ? "text-red-500" : "text-muted-foreground hover:text-foreground"}`}>
            <Heart className={`w-4 h-4 ${item.favorite ? "fill-current" : ""}`} />
          </button>
          <button onClick={togglePin} className={`p-1.5 rounded-lg transition-colors ${item.pinned ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <Pin className="w-4 h-4" />
          </button>
          <button onClick={() => { onRemove(item.id); supabase.from("user_saved_prayers").delete().eq("id", item.id); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {card.tags?.map(tag => <span key={tag} className="tag-pill text-xs">#{tag}</span>)}
        {card.status === "ai_generated" && <span className="tag-pill"><Sparkles className="w-2.5 h-2.5" />AI</span>}
      </div>

      {card.extended_prayer && (
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-primary hover:underline flex items-center gap-1">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Hide scripture" : "Show scripture"}
        </button>
      )}
      {expanded && card.extended_prayer && <p className="verse-text text-xs">{renderWithVerseLinks(card.extended_prayer)}</p>}

      {/* Notes */}
      <div className="border-t border-border pt-2">
        {editingNotes ? (
          <div className="space-y-2">
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Personal notes, reflection…" rows={2} className="text-xs rounded-xl resize-none" />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveNotes} className="btn-gold rounded-xl h-7 text-xs">Save</Button>
              <Button size="sm" variant="outline" onClick={() => { setEditingNotes(false); setNotes(item.notes || ""); }} className="rounded-xl h-7 text-xs">Cancel</Button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditingNotes(true)} className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left">
            {item.notes ? <span className="italic">"{item.notes}"</span> : <span className="opacity-60">+ Add personal notes…</span>}
          </button>
        )}
      </div>

      <Comments prayerId={card.id} />
    </div>
  );
}

export default function Board() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saved, setSaved] = useState<SavedPrayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savingPlaylist, setSavingPlaylist] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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
    // Sort: pinned first
    const sorted = (data || []).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (a.position || 0) - (b.position || 0);
    });
    setSaved(sorted as SavedPrayer[]);
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
      // Update positions in DB
      const updates = newOrder.map((item, index) => ({ id: item.id, position: index, user_id: item.user_id, prayer_id: item.prayer_id, created_at: item.created_at }));
      supabase.from("user_saved_prayers").upsert(updates).then(({ error }) => {
        if (error) console.error("Position update error:", error);
      });
      return newOrder;
    });
  };

  const updateItem = (id: string, updates: Partial<SavedPrayer>) => {
    setSaved(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const removeItem = (id: string) => {
    setSaved(prev => prev.filter(i => i.id !== id));
    toast({ title: "Removed from board" });
  };

  const savePlaylist = async () => {
    if (!playlistName.trim() || selectedIds.length === 0 || !user) return;
    setSavingPlaylist(true);
    const { error } = await supabase.from("prayer_playlists").insert({
      user_id: user.id,
      name: playlistName.trim(),
      prayer_ids: selectedIds,
    });
    if (error) { toast({ title: "Failed to save playlist", variant: "destructive" }); }
    else {
      toast({ title: `Playlist "${playlistName}" saved! 🎵` });
      setPlaylistOpen(false);
      setPlaylistName("");
      setSelectedIds([]);
    }
    setSavingPlaylist(false);
  };

  const pinned = saved.filter(s => s.pinned);
  const unpinned = saved.filter(s => !s.pinned);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
            <span className="font-display font-bold text-xl text-foreground">My Prayer Board</span>
          </div>
          <div className="flex items-center gap-2">
            {saved.length > 0 && (
              <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={() => setPlaylistOpen(true)}>
                <ListMusic className="w-4 h-4" />Playlist
              </Button>
            )}
            <Button size="sm" className="btn-gold rounded-xl gap-1.5" onClick={() => setAddOpen(true)}>
              <PlusCircle className="w-4 h-4" />Add Prayer
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 rounded-2xl shimmer" />)}
          </div>
        ) : saved.length === 0 ? (
          <div className="text-center py-20 space-y-5">
            <BookOpen className="w-14 h-14 text-primary mx-auto opacity-60" />
            <div>
              <h2 className="font-display text-2xl font-bold mb-2">Your board is empty</h2>
              <p className="text-muted-foreground text-sm">Save prayers from the collection to build your personal prayer board.</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Link to="/prayers"><Button className="btn-gold rounded-xl gap-2">Browse Prayers</Button></Link>
              <Button variant="outline" className="rounded-xl gap-2" onClick={() => setAddOpen(true)}>
                <PlusCircle className="w-4 h-4" />Add Your Own
              </Button>
            </div>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="space-y-4">
              {pinned.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Pin className="w-3 h-3" />Pinned</p>
                  <SortableContext items={pinned.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    {pinned.map(item => (
                      <SortableCard key={item.id} item={item} onUpdate={updateItem} onRemove={removeItem} />
                    ))}
                  </SortableContext>
                </div>
              )}
              {unpinned.length > 0 && (
                <div>
                  {pinned.length > 0 && <p className="text-xs text-muted-foreground mb-2">All saved prayers</p>}
                  <SortableContext items={unpinned.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4">
                      {unpinned.map(item => (
                        <SortableCard key={item.id} item={item} onUpdate={updateItem} onRemove={removeItem} />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              )}
            </div>
          </DndContext>
        )}
      </div>

      {/* Playlist builder dialog */}
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
                  <input type="checkbox" className="mt-0.5" checked={selectedIds.includes(item.id)} onChange={e => {
                    setSelectedIds(prev => e.target.checked ? [...prev, item.id] : prev.filter(id => id !== item.id));
                  }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.prayer_cards.title || item.prayer_cards.prayer_text.slice(0, 40) + "…"}</p>
                  </div>
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
