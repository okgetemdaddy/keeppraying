import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Pin, Share2, Bird, Sparkles, Tag, Globe, Lock, Loader2, ListPlus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Comments from "@/components/Comments";
import { renderWithVerseLinks } from "@/lib/renderWithVerseLinks";
import type { Database } from "@/integrations/supabase/types";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PRAYER_FONTS } from "./BoardCard";

type PrayerCard = Database["public"]["Tables"]["prayer_cards"]["Row"];
type SavedPrayer = Database["public"]["Tables"]["user_saved_prayers"]["Row"] & {
  prayer_cards: PrayerCard | null;
};

const LABEL_PALETTE: Record<string, { bg: string; text: string }> = {
  healing:      { bg: "hsl(150 40% 88%)", text: "hsl(150 38% 26%)" },
  peace:        { bg: "hsl(210 55% 88%)", text: "hsl(210 55% 30%)" },
  faith:        { bg: "hsl(42 80% 92%)",  text: "hsl(38 75% 32%)" },
  forgiveness:  { bg: "hsl(280 35% 88%)", text: "hsl(280 40% 30%)" },
  intercession: { bg: "hsl(150 30% 88%)", text: "hsl(150 38% 28%)" },
};
const DEFAULT_LABEL = { bg: "hsl(42 80% 90%)", text: "hsl(38 75% 35%)" };

interface PrayerViewerModalProps {
  open: boolean;
  onClose: () => void;
  item: SavedPrayer;
  userId: string | undefined;
  onUpdate: (id: string, updates: Partial<SavedPrayer>) => void;
  onRemove: (id: string) => void;
  onRefresh: () => void;
  themeVars?: Record<string, string>;
  onAddToPlaylist?: (prayerId: string) => void;
}

export function PrayerViewerModal({
  open,
  onClose,
  item,
  userId,
  onUpdate,
  onRemove,
  onRefresh,
  themeVars,
  onAddToPlaylist,
}: PrayerViewerModalProps) {
  const { toast } = useToast();
  const card = item.prayer_cards;

  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(item.notes || "");
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Sync notes when item changes
  useEffect(() => {
    setNotes(item.notes || "");
    setEditingNotes(false);
  }, [item.notes, item.id]);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!card) return null;

  const isOwner = !!(userId && card.created_by === userId);
  const isPrivate = card.status === "private";
  const isPublic = card.status === "approved";
  const bgUrl = card.background_url || null;

  const accentColor = themeVars?.["--board-accent"] || "hsl(42 75% 40%)";

  const activeFontFamily =
    PRAYER_FONTS.find((f) => f.family === card.text_style)?.family ?? null;

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  // ── Actions ──
  const toggleFavorite = async () => {
    const newVal = !item.favorite;
    await supabase.from("user_saved_prayers").update({ favorite: newVal }).eq("id", item.id);
    onUpdate(item.id, { favorite: newVal });
  };

  const togglePin = async () => {
    const newVal = !item.pinned;
    await supabase.from("user_saved_prayers").update({ pinned: newVal }).eq("id", item.id);
    onUpdate(item.id, { pinned: newVal });
  };

  const handleShare = () => {
    const url = `${window.location.origin}/prayer/${card.id}`;
    navigator.clipboard.writeText(url).then(() => toast({ title: "Link copied! 🔗" }));
  };

  const saveNotes = async () => {
    await supabase.from("user_saved_prayers").update({ notes }).eq("id", item.id);
    onUpdate(item.id, { notes });
    setEditingNotes(false);
    toast({ title: "Notes saved" });
  };

  const handlePublicToggle = async (makePublic: boolean) => {
    if (!isOwner) return;
    setTogglingPublic(true);
    try {
      if (makePublic) {
        const modResp = await fetch(`${SUPABASE_URL}/functions/v1/moderate-prayer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ prayer_text: card.prayer_text, title: card.title }),
        });
        if (modResp.ok) {
          const modResult = await modResp.json();
          if (!modResult.approved) {
            toast({ title: "Cannot make public", description: modResult.reason || "Didn't meet guidelines.", variant: "destructive" });
            setTogglingPublic(false);
            return;
          }
        }
        await supabase.from("prayer_cards").update({ status: "pending" }).eq("id", card.id);
        toast({ title: "Submitted for community review 🙏" });
      } else {
        await supabase.from("prayer_cards").update({ status: "private" }).eq("id", card.id);
        toast({ title: "Prayer set to private" });
      }
      onRefresh();
    } catch {
      toast({ title: "Failed to update visibility", variant: "destructive" });
    } finally {
      setTogglingPublic(false);
    }
  };

  const hasImage = !!bgUrl;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="prayer-viewer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-0 md:p-6"
          onClick={onClose}
        >
          <motion.div
            key="prayer-viewer-container"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
            className="bg-white w-full h-full md:h-auto md:max-h-[85vh] md:max-w-2xl md:rounded-3xl shadow-2xl overflow-y-auto flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background image */}
            {hasImage && (
              <div className="absolute inset-0 md:rounded-3xl overflow-hidden">
                <img
                  src={bgUrl!}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40" />
              </div>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors z-10 bg-white/80"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className={`relative flex-1 p-6 md:p-10 ${hasImage ? "text-white" : ""}`}>
              {/* Title */}
              {card.title && (
                <h2 className={`text-lg md:text-xl font-semibold mb-4 ${hasImage ? "text-white" : "text-slate-900"}`}>
                  {card.title}
                </h2>
              )}

              {/* Prayer text */}
              <p
                className={`text-base md:text-lg leading-relaxed font-medium mb-8 ${hasImage ? "text-white" : "text-slate-800"}`}
                style={{
                  fontFamily: activeFontFamily ? `"${activeFontFamily}", serif` : undefined,
                }}
              >
                {card.prayer_text}
              </p>

              {/* Extended prayer / scripture */}
              {card.extended_prayer && (
                <div className="mb-6">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${hasImage ? "text-white/70" : "text-slate-500"}`}>
                    Scripture & Meditation
                  </h3>
                  <p
                    className={`text-sm md:text-base leading-relaxed italic ${hasImage ? "text-white/85" : "text-slate-600"}`}
                  >
                    {renderWithVerseLinks(card.extended_prayer)}
                  </p>
                </div>
              )}

              {/* Meditation essay */}
              {card.meditation_essay && (
                <div className="mb-6">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${hasImage ? "text-white/70" : "text-slate-500"}`}>
                    Meditation
                  </h3>
                  <p className={`text-sm md:text-base leading-relaxed ${hasImage ? "text-white/85" : "text-slate-600"}`}>
                    {card.meditation_essay}
                  </p>
                </div>
              )}

              {/* Labels */}
              {card.labels && card.labels.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {card.labels.map((tag) => {
                    const palette = LABEL_PALETTE[tag] || DEFAULT_LABEL;
                    return (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={hasImage ? { background: "rgba(255,255,255,0.2)", color: "white" } : { background: palette.bg, color: palette.text }}
                      >
                        <Tag className="w-3 h-3" />#{tag}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Status badges */}
              {(card.status === "ai_generated" || card.status === "pending") && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {card.status === "ai_generated" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: `${accentColor}20`, color: accentColor }}>
                      <Sparkles className="w-3 h-3" />AI Generated
                    </span>
                  )}
                  {card.status === "pending" && isOwner && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-slate-500 bg-slate-100">
                      In review
                    </span>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="mb-6">
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${hasImage ? "text-white/70" : "text-slate-500"}`}>
                  Personal Notes
                </h3>
                {editingNotes ? (
                  <div className="space-y-2">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Personal notes, reflection…"
                      rows={3}
                      className="min-h-[44px] bg-slate-50 border-none text-slate-600 placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm resize-none w-full"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveNotes} className="rounded-xl h-8 text-xs">
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditingNotes(false); setNotes(item.notes || ""); }}
                        className="rounded-xl h-8 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingNotes(true)}
                    className={`min-h-[44px] w-full text-left rounded-lg px-3 py-2 text-sm transition-opacity hover:opacity-80 ${
                      hasImage
                        ? "bg-white/10 text-white/80 placeholder:text-white/50"
                        : "bg-slate-50 border-none text-slate-600 placeholder:text-slate-400"
                    }`}
                  >
                    {item.notes ? (
                      <span className="italic">"{item.notes}"</span>
                    ) : (
                      <span className={hasImage ? "text-white/50" : "text-slate-400"}>+ Add notes…</span>
                    )}
                  </button>
                )}
              </div>

              {/* Comments for public prayers */}
              {isPublic && (
                <div className="mb-6">
                  <button
                    onClick={() => setShowComments((s) => !s)}
                    className={`text-xs font-semibold underline decoration-amber-400 decoration-2 underline-offset-4 md:hover:decoration-amber-500 transition-colors ${hasImage ? "text-white" : "text-slate-900"}`}
                  >
                    {showComments ? "Hide comments" : "Show comments"}
                  </button>
                  {showComments && (
                    <div className="mt-3">
                      <Comments prayerId={card.id} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sticky action footer */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-100 p-4 flex items-center justify-between mt-auto">
              <div className="flex items-center gap-1">
                {/* Favorite */}
                <button
                  onClick={toggleFavorite}
                  className="p-2 rounded-lg transition-colors hover:bg-slate-100"
                  style={{ color: item.favorite ? "hsl(0 72% 51%)" : "hsl(215 14% 60%)" }}
                  aria-label="Favourite"
                >
                  <Heart className={`w-5 h-5 ${item.favorite ? "fill-current" : ""}`} />
                </button>

                {/* Pin */}
                <button
                  onClick={togglePin}
                  className="p-2 rounded-lg transition-colors hover:bg-slate-100"
                  style={{ color: item.pinned ? accentColor : "hsl(215 14% 60%)" }}
                  aria-label="Pin"
                >
                  <Pin className="w-5 h-5" />
                </button>

                {/* Share */}
                <button
                  onClick={handleShare}
                  className="p-2 rounded-lg transition-colors hover:bg-slate-100 text-slate-400"
                  aria-label="Share"
                >
                  <Share2 className="w-5 h-5" />
                </button>

                {/* Add to playlist */}
                {onAddToPlaylist && (
                  <button
                    onClick={() => onAddToPlaylist(card.id)}
                    className="p-2 rounded-lg transition-colors hover:bg-slate-100 text-slate-400"
                    aria-label="Add to playlist"
                  >
                    <ListPlus className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Testify */}
                {isPublic && (
                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105 bg-amber-50 text-amber-700"
                    title="Share your testimony"
                  >
                    <Bird className="w-4 h-4" />
                    Testify
                  </button>
                )}

                {/* Visibility toggle */}
                {isOwner && (
                  <div className="flex items-center gap-1.5">
                    {togglingPublic ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    ) : isPrivate ? (
                      <Lock className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Globe className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="text-xs text-slate-500 hidden sm:inline">
                      {isPrivate ? "Private" : card.status === "pending" ? "Review" : "Public"}
                    </span>
                    <Switch
                      checked={!isPrivate}
                      onCheckedChange={handlePublicToggle}
                      disabled={togglingPublic || card.status === "approved"}
                      className="scale-75 origin-left"
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
