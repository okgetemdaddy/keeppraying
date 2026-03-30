import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Pin, Share2, Bird, Sparkles, Tag, Globe, Lock, Loader2, ListPlus, ArrowLeft, Volume2 } from "lucide-react";
import { FormattedText } from "@/lib/FormattedText";
import { TestifyBack } from "./TestifyBack";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Comments from "@/components/Comments";
import { renderWithVerseLinks } from "@/lib/renderWithVerseLinks";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PRAYER_FONTS } from "./BoardCard";
import { useTtsPlayer } from "@/hooks/useTtsPlayer";
import { TtsContemplationOverlay } from "@/components/TtsContemplationOverlay";

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

const THEATER_GLOW_STYLE = `
@keyframes theater-glow {
  0%, 100% {
    box-shadow:
      0 0 20px 4px hsla(42, 85%, 46%, 0.3),
      0 0 60px 8px hsla(42, 85%, 46%, 0.1),
      inset 0 0 0 1px hsla(42, 85%, 46%, 0.15);
  }
  33% {
    box-shadow:
      0 0 24px 6px hsla(35, 68%, 85%, 0.4),
      0 0 60px 8px hsla(150, 38%, 26%, 0.1),
      inset 0 0 0 1px hsla(35, 68%, 85%, 0.2);
  }
  66% {
    box-shadow:
      0 0 20px 4px hsla(150, 38%, 26%, 0.25),
      0 0 60px 8px hsla(42, 85%, 46%, 0.1),
      inset 0 0 0 1px hsla(150, 38%, 26%, 0.12);
  }
}
`;

/** Theater-mode cinematic prayer reader */
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
  const [testifying, setTestifying] = useState(false);

  useEffect(() => {
    setNotes(item.notes || "");
    setEditingNotes(false);
    setTestifying(false);
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
  const hasImage = !!bgUrl;

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

  return (
    <>
      <style>{THEATER_GLOW_STYLE}</style>
      <AnimatePresence>
        {open && (
          <motion.div
            key="prayer-viewer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-0 md:p-6"
            onClick={onClose}
          >
            <motion.div
              key="prayer-viewer-theater"
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ duration: 0.4, type: "spring", stiffness: 260, damping: 28 }}
              className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-2xl overflow-y-auto flex flex-col relative"
              style={{
                background: hasImage ? undefined : "white",
                animation: "theater-glow 6s ease-in-out infinite",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Background image */}
              {hasImage && (
                <div className="absolute inset-0 md:rounded-2xl overflow-hidden">
                  <img
                    src={bgUrl!}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40" />
                </div>
              )}

              {/* White background for non-image cards */}
              {!hasImage && (
                <div className="absolute inset-0 md:rounded-2xl bg-white" />
              )}

              {/* Close button — large, prominent */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors z-20 bg-white shadow-md"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* ── Content ── */}
              <div className={`relative flex-1 p-8 md:p-12 ${hasImage ? "text-white" : ""}`}>
                {testifying ? (
                  <div className="min-h-[300px]">
                    <button
                      onClick={() => setTestifying(false)}
                      className={`flex items-center gap-1.5 text-sm font-medium mb-6 transition-colors ${hasImage ? "text-white/70 hover:text-white" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to prayer
                    </button>
                    <TestifyBack
                      prayerId={card.id}
                      prayerAuthorId={card.created_by}
                      onFlipBack={() => setTestifying(false)}
                      accentColor={accentColor}
                      textColor={hasImage ? "white" : undefined}
                      cardBg={hasImage ? "rgba(255,255,255,0.08)" : undefined}
                    />
                  </div>
                ) : (
                  <>
                {/* Title */}
                {card.title && (
                  <h2 className={`text-xl md:text-2xl font-semibold mb-6 leading-tight ${hasImage ? "text-white" : "text-slate-900"}`}
                    style={{ fontFamily: '"Playfair Display", serif' }}
                  >
                    {card.title}
                  </h2>
                )}

                {/* Prayer text — optimized for reading */}
                <FormattedText
                  text={card.prayer_text}
                  className={`text-base md:text-lg leading-[1.85] font-medium mb-8 selection:bg-amber-100 selection:text-slate-900 ${hasImage ? "text-white" : "text-slate-800"}`}
                  style={{
                    fontFamily: activeFontFamily ? `"${activeFontFamily}", serif` : '"Lora", serif',
                  }}
                  indent
                />

                {/* See less… — closes modal */}
                <button
                  onClick={onClose}
                  className={`text-sm font-semibold transition-colors ${hasImage ? "text-white/60 hover:text-white/90" : "text-slate-400 hover:text-slate-600"}`}
                >
                  See less…
                </button>

                {/* Extended prayer / scripture */}
                {card.extended_prayer && (
                  <div className="mt-8 mb-6">
                    <h3 className={`text-xs font-semibold uppercase tracking-widest mb-3 ${hasImage ? "text-white/60" : "text-slate-400"}`}>
                      Scripture & Meditation
                    </h3>
                    <p
                      className={`text-sm md:text-base leading-[1.8] italic selection:bg-amber-100 selection:text-slate-900 ${hasImage ? "text-white/85" : "text-slate-600"}`}
                      style={{ fontFamily: '"Lora", serif' }}
                    >
                      {renderWithVerseLinks(card.extended_prayer)}
                    </p>
                  </div>
                )}

                {/* Meditation essay */}
                {card.meditation_essay && (
                  <div className="mb-6">
                    <h3 className={`text-xs font-semibold uppercase tracking-widest mb-3 ${hasImage ? "text-white/60" : "text-slate-400"}`}>
                      Meditation
                    </h3>
                    <p className={`text-sm md:text-base leading-[1.8] selection:bg-amber-100 selection:text-slate-900 ${hasImage ? "text-white/85" : "text-slate-600"}`}>
                      {card.meditation_essay}
                    </p>
                  </div>
                )}

                {/* Labels */}
                {card.labels && card.labels.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6 mt-6">
                    {card.labels.map((tag) => {
                      const palette = LABEL_PALETTE[tag] || DEFAULT_LABEL;
                      return (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium"
                          style={hasImage ? { background: "rgba(255,255,255,0.15)", color: "white" } : { background: palette.bg, color: palette.text }}
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
                <div className="mb-6 mt-8">
                  <h3 className={`text-xs font-semibold uppercase tracking-widest mb-3 ${hasImage ? "text-white/60" : "text-slate-400"}`}>
                    Personal Notes
                  </h3>
                  {editingNotes ? (
                    <div className="space-y-3">
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Personal notes, reflection…"
                        rows={3}
                        className="min-h-[52px] bg-slate-50 border-none text-slate-600 placeholder:text-slate-400 rounded-xl px-4 py-3 text-sm resize-none w-full focus:ring-2 focus:ring-amber-200"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveNotes} className="rounded-xl h-8 text-xs bg-slate-900 text-white hover:bg-slate-800">
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
                      className={`min-h-[52px] w-full text-left rounded-xl px-4 py-3 text-sm transition-all ${
                        hasImage
                          ? "bg-white/10 text-white/80 hover:bg-white/15"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {item.notes ? (
                        <span className="italic">"{item.notes}"</span>
                      ) : (
                        <span className={hasImage ? "text-white/40" : "text-slate-400"}>+ Add notes…</span>
                      )}
                    </button>
                  )}
                </div>

                {/* Comments for public prayers */}
                {isPublic && (
                  <div className="mb-6">
                    <button
                      onClick={() => setShowComments((s) => !s)}
                      className={`text-xs font-semibold transition-colors ${hasImage ? "text-white/70 hover:text-white" : "text-slate-500 hover:text-slate-700"}`}
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
                  </>
                )}
              </div>

              {/* ── Sticky action footer ── */}
              <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex items-center justify-between mt-auto z-10">
                <div className="flex items-center gap-1">
                  {/* Favorite */}
                  <button
                    onClick={toggleFavorite}
                    className="p-2.5 rounded-xl transition-colors hover:bg-slate-100"
                    style={{ color: item.favorite ? "hsl(0 72% 51%)" : "hsl(215 14% 60%)" }}
                    aria-label="Favourite"
                  >
                    <Heart className={`w-5 h-5 ${item.favorite ? "fill-current" : ""}`} />
                  </button>

                  {/* Pin */}
                  <button
                    onClick={togglePin}
                    className="p-2.5 rounded-xl transition-colors hover:bg-slate-100"
                    style={{ color: item.pinned ? accentColor : "hsl(215 14% 60%)" }}
                    aria-label="Pin"
                  >
                    <Pin className="w-5 h-5" />
                  </button>

                  {/* Share */}
                  <button
                    onClick={handleShare}
                    className="p-2.5 rounded-xl transition-colors hover:bg-slate-100 text-slate-400"
                    aria-label="Share"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>

                  {/* Add to playlist */}
                  {onAddToPlaylist && (
                    <button
                      onClick={() => onAddToPlaylist(card.id)}
                      className="p-2.5 rounded-xl transition-colors hover:bg-slate-100 text-slate-400"
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
                      onClick={() => setTestifying(true)}
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
    </>
  );
}
