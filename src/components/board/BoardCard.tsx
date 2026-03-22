import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import Comments from "@/components/Comments";
import AIEnrichPanel from "@/components/AIEnrichPanel";
import { renderWithVerseLinks } from "@/lib/renderWithVerseLinks";
import type { Database } from "@/integrations/supabase/types";
import {
  GripVertical, Heart, Pin, ChevronDown, ChevronUp, Sparkles,
  Trash2, Globe, Lock, Loader2, Maximize2, Minimize2, Square,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PrayerCard = Database['public']['Tables']['prayer_cards']['Row'];
type SavedPrayer = Database['public']['Tables']['user_saved_prayers']['Row'] & {
  prayer_cards: PrayerCard | null;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const TEXT_STYLE_CLASSES: Record<string, string> = {
  classic: "font-body text-base",
  scripture: "font-display text-base italic",
  peaceful: "font-body text-base",
  bold: "font-body text-base font-semibold",
  gentle: "font-body text-sm leading-relaxed",
  strong: "font-display text-lg font-bold",
  modern: "font-body text-sm tracking-wide",
  compassionate: "font-display text-base",
  whisper: "font-body text-sm italic",
  royal: "font-display font-bold tracking-wider",
};

type CardSize = "small" | "medium" | "large";

interface BoardCardProps {
  item: SavedPrayer & { card_size?: CardSize };
  userId: string | undefined;
  isDragging: boolean;
  dragHandleProps?: Record<string, unknown>;
  onUpdate: (id: string, updates: Partial<SavedPrayer & { card_size: CardSize }>) => void;
  onRemove: (id: string) => void;
  onRefresh: () => void;
  themeVars?: Record<string, string>;
}

export function BoardCard({
  item,
  userId,
  isDragging,
  dragHandleProps,
  onUpdate,
  onRemove,
  onRefresh,
  themeVars,
}: BoardCardProps) {
  const { toast } = useToast();
  const card = item.prayer_cards;
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(item.notes || "");
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);

  if (!card) return null;

  const textClass = TEXT_STYLE_CLASSES[card.text_style || "classic"] || TEXT_STYLE_CLASSES.classic;
  const isOwner = !!(userId && card.created_by === userId);
  const isPrivate = card.status === "private";
  const size: CardSize = (item as { card_size?: CardSize }).card_size || "medium";

  const accentColor = themeVars?.["--board-accent"] || "hsl(var(--primary))";

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

  const setCardSize = async (s: CardSize) => {
    await supabase.from("user_saved_prayers").update({ card_size: s } as { card_size: string }).eq("id", item.id);
    onUpdate(item.id, { card_size: s } as Partial<SavedPrayer & { card_size: CardSize }>);
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
        const { error } = await supabase.from("prayer_cards").update({ status: "pending" }).eq("id", card.id);
        if (error) throw error;
        toast({ title: "Submitted for community review 🙏" });
      } else {
        const { error } = await supabase.from("prayer_cards").update({ status: "private" }).eq("id", card.id);
        if (error) throw error;
        toast({ title: "Prayer set to private" });
      }
      onRefresh();
    } catch {
      toast({ title: "Failed to update visibility", variant: "destructive" });
    } finally {
      setTogglingPublic(false);
    }
  };

  const cardBg = themeVars?.["--board-card-bg"] || "hsl(var(--card) / 0.92)";
  const cardBorder = themeVars?.["--board-card-border"] || "hsl(var(--border) / 0.7)";
  const textColor = themeVars?.["--board-text"] || "hsl(var(--foreground))";

  const textLineClamp = size === "small" ? "line-clamp-2" : size === "medium" ? "line-clamp-4" : "";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: 4 }}
      whileHover={{ y: -2, boxShadow: `0 16px 48px -12px ${accentColor}35, 0 4px 16px -4px rgba(0,0,0,0.15)` }}
      transition={{ layout: { type: "spring", stiffness: 300, damping: 28 }, default: { duration: 0.25 } }}
      style={{
        background: cardBg,
        borderColor: cardBorder,
        color: textColor,
        opacity: isDragging ? 0.45 : 1,
        backdropFilter: "blur(14px) saturate(1.5)",
        WebkitBackdropFilter: "blur(14px) saturate(1.5)",
        boxShadow: item.pinned
          ? `inset 2px 0 0 ${accentColor}, 0 4px 24px -8px rgba(0,0,0,0.18)`
          : "0 2px 14px -4px rgba(0,0,0,0.14)",
        willChange: "transform",
      }}
      className="relative rounded-2xl border overflow-hidden select-none"
    >
      {/* Subtle glass sheen */}
      <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{
        background: "linear-gradient(145deg, rgba(255,255,255,0.22) 0%, transparent 55%)"
      }} />

      <div className="relative p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start gap-2">
          {/* Drag handle */}
          <button
            {...dragHandleProps}
            className="mt-1 opacity-40 hover:opacity-80 transition-opacity cursor-grab active:cursor-grabbing touch-none"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" style={{ color: textColor }} />
          </button>

          <div className="flex-1 min-w-0">
            {card.title && (
              <h3 className="font-display font-semibold mb-0.5 text-sm leading-snug" style={{ color: textColor }}>
                {card.title}
              </h3>
            )}
            <p className={`${textClass} leading-relaxed text-sm ${textLineClamp}`} style={{ color: textColor }}>
              {card.prayer_text}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={toggleFavorite}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: item.favorite ? "#ef4444" : `${textColor}70` }}
              aria-label="Favourite"
            >
              <Heart className={`w-4 h-4 ${item.favorite ? "fill-current" : ""}`} />
            </button>
            <button
              onClick={togglePin}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: item.pinned ? accentColor : `${textColor}70` }}
              aria-label="Pin"
            >
              <Pin className="w-4 h-4" />
            </button>

            {/* More menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-lg transition-colors" style={{ color: `${textColor}70` }} aria-label="More options">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-xl">
                <DropdownMenuItem className="text-xs gap-2" onClick={() => setCardSize("small")}>
                  <Minimize2 className="w-3.5 h-3.5" /> Small {size === "small" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs gap-2" onClick={() => setCardSize("medium")}>
                  <Square className="w-3.5 h-3.5" /> Medium {size === "medium" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs gap-2" onClick={() => setCardSize("large")}>
                  <Maximize2 className="w-3.5 h-3.5" /> Large {size === "large" && "✓"}
                </DropdownMenuItem>
                {isOwner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-xs gap-2" onClick={() => setEnrichOpen(true)}>
                      <Sparkles className="w-3.5 h-3.5" /> AI Enrich
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-xs gap-2 text-destructive focus:text-destructive"
                  onClick={() => { onRemove(item.id); supabase.from("user_saved_prayers").delete().eq("id", item.id); }}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tags */}
        {((card.tags && card.tags.length > 0) || card.status === "ai_generated" || (isPrivate && isOwner)) && (
          <div className="flex flex-wrap gap-1">
            {card.tags?.map(tag => (
              <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: `${accentColor}22`, color: accentColor }}>
                #{tag}
              </span>
            ))}
            {card.status === "ai_generated" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: `${accentColor}22`, color: accentColor }}>
                <Sparkles className="w-2.5 h-2.5" />AI
              </span>
            )}
            {isPrivate && isOwner && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: `${textColor}14`, color: `${textColor}80` }}>
                <Lock className="w-2.5 h-2.5" />Private
              </span>
            )}
            {card.status === "pending" && isOwner && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: `${textColor}10`, color: `${textColor}60` }}>
                In review
              </span>
            )}
          </div>
        )}

        {/* Scripture expand */}
        {card.extended_prayer && size !== "small" && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs flex items-center gap-1 transition-opacity hover:opacity-80"
              style={{ color: accentColor }}
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? "Hide scripture" : "Show scripture"}
            </button>
            {expanded && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="font-display italic text-xs leading-relaxed"
                style={{ color: `${textColor}80` }}
              >
                {renderWithVerseLinks(card.extended_prayer)}
              </motion.p>
            )}
          </>
        )}

        {/* Owner: public toggle */}
        {isOwner && size !== "small" && (
          <div className="flex items-center justify-between gap-3 pt-2 border-t" style={{ borderColor: `${textColor}12` }}>
            <div className="flex items-center gap-1.5">
              {togglingPublic ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: `${textColor}60` }} />
              ) : isPrivate ? (
                <Lock className="w-3.5 h-3.5" style={{ color: `${textColor}55` }} />
              ) : (
                <Globe className="w-3.5 h-3.5" style={{ color: accentColor }} />
              )}
              <span className="text-xs" style={{ color: `${textColor}60` }}>
                {isPrivate ? "Private" : card.status === "pending" ? "In review" : "Public"}
              </span>
              <Switch
                checked={!isPrivate}
                onCheckedChange={handlePublicToggle}
                disabled={togglingPublic || card.status === "approved"}
                className="scale-75 origin-left"
              />
            </div>
          </div>
        )}

        {/* Notes */}
        {size !== "small" && (
          <div className="pt-2 border-t" style={{ borderColor: `${textColor}10` }}>
            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Personal notes, reflection…"
                  rows={2}
                  className="text-xs rounded-xl resize-none bg-transparent border-border"
                  style={{ color: textColor }}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveNotes} className="btn-gold rounded-xl h-7 text-xs">Save</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingNotes(false); setNotes(item.notes || ""); }} className="rounded-xl h-7 text-xs">Cancel</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditingNotes(true)}
                className="text-xs w-full text-left transition-opacity hover:opacity-80"
                style={{ color: `${textColor}50` }}
              >
                {item.notes
                  ? <span className="italic">"{item.notes}"</span>
                  : <span>+ Add notes…</span>}
              </button>
            )}
          </div>
        )}

        {/* Comments toggle for large */}
        {size === "large" && (
          <>
            <button
              onClick={() => setShowComments(s => !s)}
              className="text-xs flex items-center gap-1 transition-opacity hover:opacity-80"
              style={{ color: `${textColor}50` }}
            >
              {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showComments ? "Hide comments" : "Comments"}
            </button>
            {showComments && <Comments prayerId={card.id} />}
          </>
        )}
      </div>

      {/* AI Enrich Panel */}
      {isOwner && (
        <AIEnrichPanel
          open={enrichOpen}
          onOpenChange={setEnrichOpen}
          cardId={card.id}
          prayerText={card.prayer_text}
          extendedPrayer={card.extended_prayer}
          existingTags={card.tags || []}
          onApplied={onRefresh}
        />
      )}
    </motion.div>
  );
}
