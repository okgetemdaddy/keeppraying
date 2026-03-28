import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import Comments from "@/components/Comments";
import AIEnrichPanel from "@/components/AIEnrichPanel";
import { TestifyBack } from "@/components/board/TestifyBack";
import { renderWithVerseLinks } from "@/lib/renderWithVerseLinks";
import type { Database } from "@/integrations/supabase/types";
import {
  Heart, Pin, ChevronDown, ChevronUp, Sparkles, Tag,
  Trash2, Globe, Lock, Loader2, Maximize2, Minimize2, Square,
  MoreHorizontal, Share2, Type, Shuffle, Check, ListPlus, Bird,
  SunDim,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub,
  DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

type PrayerCard = Database['public']['Tables']['prayer_cards']['Row'];
type SavedPrayer = Database['public']['Tables']['user_saved_prayers']['Row'] & {
  prayer_cards: PrayerCard | null;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const PRAYER_CHAR_LIMIT = 320;

// ── Google Fonts curated for prayer/devotional reading ───────────────────────
export const PRAYER_FONTS: { label: string; family: string; url: string }[] = [
  { label: "Playfair Display",  family: "Playfair Display",  url: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap" },
  { label: "Lora",              family: "Lora",              url: "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&display=swap" },
  { label: "Cormorant Garamond",family: "Cormorant Garamond",url: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap" },
  { label: "EB Garamond",       family: "EB Garamond",       url: "https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&display=swap" },
  { label: "Crimson Text",      family: "Crimson Text",      url: "https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap" },
  { label: "Libre Baskerville", family: "Libre Baskerville", url: "https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" },
  { label: "Cinzel",            family: "Cinzel",            url: "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap" },
  { label: "Spectral",          family: "Spectral",          url: "https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,600;1,400&display=swap" },
  { label: "GFS Didot",         family: "GFS Didot",         url: "https://fonts.googleapis.com/css2?family=GFS+Didot&display=swap" },
  { label: "Josefin Slab",      family: "Josefin Slab",      url: "https://fonts.googleapis.com/css2?family=Josefin+Slab:ital,wght@0,400;0,600;1,400&display=swap" },
  { label: "Sorts Mill Goudy",  family: "Sorts Mill Goudy",  url: "https://fonts.googleapis.com/css2?family=Sorts+Mill+Goudy:ital@0;1&display=swap" },
  { label: "Inter",             family: "Inter",             url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" },
];

// Lazy-load a Google Font link tag if not already present
function loadFont(url: string) {
  if (document.querySelector(`link[href="${url}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);
}

const LABEL_PALETTE: Record<string, { bg: string; text: string }> = {
  "healing":        { bg: "hsl(150 40% 88%)", text: "hsl(150 38% 26%)" },
  "peace":          { bg: "hsl(210 55% 88%)", text: "hsl(210 55% 30%)" },
  "faith":          { bg: "hsl(42 80% 92%)",  text: "hsl(38 75% 32%)" },
  "forgiveness":    { bg: "hsl(280 35% 88%)", text: "hsl(280 40% 30%)" },
  "intercession":   { bg: "hsl(150 30% 88%)", text: "hsl(150 38% 28%)" },
};
const DEFAULT_LABEL = { bg: "hsl(42 80% 90%)", text: "hsl(38 75% 35%)" };

type CardSize = "small" | "medium" | "large";

interface BoardCardProps {
  item: SavedPrayer & { card_size?: CardSize };
  userId: string | undefined;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
  onUpdate: (id: string, updates: Partial<SavedPrayer & { card_size: CardSize }>) => void;
  onRemove: (id: string) => void;
  onRefresh: () => void;
  themeVars?: Record<string, string>;
  onAddToPlaylist?: (prayerId: string) => void;
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
  onAddToPlaylist,
}: BoardCardProps) {
  const { toast } = useToast();
  const card = item.prayer_cards;
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(item.notes || "");
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [scriptureOpen, setScriptureOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.48);

  // Font picker state
  const [pendingFont, setPendingFont] = useState<string | null>(null);
  const [savingFont, setSavingFont] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);

  if (!card) return null;

  const isOwner = !!(userId && card.created_by === userId);
  const isPrivate = card.status === "private";
  const isPublic = card.status === "approved";
  const size: CardSize = (item as { card_size?: CardSize }).card_size || "medium";
  const isTruncated = card.prayer_text.length > PRAYER_CHAR_LIMIT;

  // Active font: pendingFont (preview) > card's text_style as a font family > default
  const activeFontFamily = pendingFont
    ?? PRAYER_FONTS.find(f => f.family === card.text_style)?.family
    ?? null;

  // Theme colours
  const accentColor = themeVars?.["--board-accent"]     || "hsl(42 75% 40%)";
  const cardBg      = themeVars?.["--board-card-bg"]     || "hsl(var(--card) / 0.97)";
  const cardBorder  = themeVars?.["--board-card-border"] || "hsl(var(--border) / 0.7)";
  const textColor   = themeVars?.["--board-text"]        || "hsl(25 35% 14%)";
  const subtleText  = `${textColor}80`;

  // ── actions ─────────────────────────────────────────────────────────────────

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

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/prayer/${card.id}`;
    navigator.clipboard.writeText(url).then(() => toast({ title: "Link copied! 🔗" }));
  };

  const pickFont = (family: string) => {
    const font = PRAYER_FONTS.find(f => f.family === family);
    if (font) loadFont(font.url);
    setPendingFont(family);
  };

  const pickRandomFont = () => {
    const others = PRAYER_FONTS.filter(f => f.family !== (pendingFont ?? card.text_style));
    const pick = others[Math.floor(Math.random() * others.length)];
    loadFont(pick.url);
    setPendingFont(pick.family);
  };

  const saveFont = async () => {
    if (!pendingFont || !isOwner) return;
    setSavingFont(true);
    try {
      await supabase.from("prayer_cards").update({ text_style: pendingFont }).eq("id", card.id);
      onRefresh();
      setPendingFont(null);
      toast({ title: "Font saved ✨" });
    } catch {
      toast({ title: "Could not save font", variant: "destructive" });
    } finally {
      setSavingFont(false);
    }
  };

  const cancelFont = () => setPendingFont(null);

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

  // ── derived ──────────────────────────────────────────────────────────────────
  const actionsInFooter = size !== "large";

  // ── render ───────────────────────────────────────────────────────────────────
  const bgUrl = card.background_url || null;

  return (
    <div style={{ perspective: "1200px", willChange: "transform" }}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: flipped ? undefined : 1, scale: flipped ? undefined : 1, y: flipped ? undefined : 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 4 }}
        transition={{ layout: { type: "spring", stiffness: 300, damping: 28 }, default: { duration: 0.25 } }}
        style={{
          opacity: isDragging ? 0.45 : 1,
          transformStyle: "preserve-3d",
          position: "relative",
          minHeight: size === "large" ? 320 : size === "medium" ? 220 : 140,
        }}
        className="relative"
      >
        {/* ── FRONT face ───────────────────────────────────────────────── */}
        <motion.div
          animate={{ rotateY: flipped ? -180 : 0 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 100, damping: 18 }}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            background: bgUrl ? undefined : cardBg,
            borderColor: cardBorder,
            color: bgUrl ? "rgba(255,255,255,0.92)" : textColor,
            backdropFilter: "blur(16px) saturate(1.6)",
            WebkitBackdropFilter: "blur(16px) saturate(1.6)",
            boxShadow: item.pinned
              ? `inset 3px 0 0 ${accentColor}, 0 4px 24px -8px rgba(0,0,0,0.16)`
              : "0 2px 16px -4px rgba(0,0,0,0.10)",
          }}
          whileHover={flipped ? {} : { y: -3, boxShadow: `0 20px 56px -12px ${accentColor}30, 0 4px 18px -4px rgba(0,0,0,0.12)` }}
          className="relative rounded-2xl border overflow-hidden"
        >
      {/* Background image */}
      {bgUrl && (
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <img
            src={bgUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlayOpacity})` }} />
        </div>
      )}

      {/* Glass sheen (only for non-bg cards) */}
      {!bgUrl && (
        <div className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.24) 0%, transparent 52%)" }} />
      )}

      <div className="relative p-4 flex flex-col gap-3">

        {/* ── Drag handle + content ────────────────────────────────────── */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {card.title && (
              <h3 className="font-display font-semibold text-sm leading-snug mb-1" style={{ color: bgUrl ? "rgba(255,255,255,0.95)" : textColor }}>
                {card.title}
              </h3>
            )}

            {/* Prayer text — with optional custom font */}
            <div className="select-none">
              <p
                className="leading-relaxed text-sm cursor-pointer"
                style={{
                  color: bgUrl ? "rgba(255,255,255,0.80)" : subtleText,
                  fontFamily: activeFontFamily ? `"${activeFontFamily}", serif` : undefined,
                }}
                onClick={() => setCollapsed(v => !v)}
              >
                {isTruncated && !expanded
                  ? card.prayer_text.slice(0, PRAYER_CHAR_LIMIT).trimEnd() + "…"
                  : card.prayer_text}
              </p>
              {isTruncated && (
                <button
                  onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                  className="mt-1 text-xs font-medium transition-colors"
                  style={{ color: accentColor }}
                >
                  {expanded ? "See less" : "See more…"}
                </button>
              )}
            </div>

            {/* Font preview banner */}
            <AnimatePresence>
              {pendingFont && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden mt-2"
                >
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
                    style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
                    <span className="text-[10px]" style={{ color: `${textColor}60` }}>
                      Preview:
                    </span>
                    <span className="text-xs flex-1" style={{ fontFamily: `"${pendingFont}", serif`, color: textColor }}>
                      {pendingFont}
                    </span>
                    <button
                      onClick={saveFont}
                      disabled={savingFont}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all"
                      style={{ background: accentColor, color: "white" }}
                    >
                      {savingFont ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Check className="w-2.5 h-2.5" />}
                      Save
                    </button>
                    <button
                      onClick={cancelFont}
                      className="text-[10px] px-1.5 py-0.5 rounded-lg transition-opacity hover:opacity-70"
                      style={{ color: `${textColor}50` }}
                    >
                      ✕
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Top-right actions — large cards only */}
          {!actionsInFooter && (
            <div className="flex items-center gap-1 shrink-0">
              <ActionButtons
                item={item} accentColor={accentColor} textColor={textColor}
                onFavorite={toggleFavorite} onPin={togglePin} onShare={handleShare}
                onCardSize={setCardSize} onEnrich={() => setEnrichOpen(true)}
                onRemove={onRemove} isOwner={isOwner} size={size}
                onPickFont={pickFont} onPickRandomFont={pickRandomFont}
                currentFont={pendingFont ?? card.text_style}
                onAddToPlaylist={onAddToPlaylist}
                hasBgImage={!!bgUrl}
                overlayOpacity={overlayOpacity}
                onOverlayOpacityChange={setOverlayOpacity}
              />
            </div>
          )}
        </div>

        {/* ── Collapsible chrome ────────────────────────────────────────── */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="chrome"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden space-y-3"
            >
              {/* Status badges */}
              {(card.status === "ai_generated" || (isPrivate && isOwner) || card.status === "pending") && (
                <div className="flex flex-wrap gap-1">
                  {card.status === "ai_generated" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: `${accentColor}20`, color: accentColor }}>
                      <Sparkles className="w-2.5 h-2.5" />AI
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

              {/* Scripture / Labels toggles */}
              {size !== "small" && (
                <div className="flex items-center justify-between gap-2">
                  {card.extended_prayer ? (
                    <button
                      onClick={() => setScriptureOpen(v => !v)}
                      className="text-xs font-medium flex items-center gap-1 transition-colors"
                      style={{ color: accentColor }}
                    >
                      <motion.div animate={{ rotate: scriptureOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </motion.div>
                      {scriptureOpen ? "Hide scripture" : "Show scripture"}
                    </button>
                  ) : <div />}
                  {card.labels && card.labels.length > 0 && (
                    <button
                      onClick={() => setLabelsOpen(v => !v)}
                      className="text-xs font-medium flex items-center gap-1 transition-colors"
                      style={{ color: accentColor }}
                    >
                      <Tag className="w-3 h-3" />
                      {labelsOpen ? "Hide labels" : "Labels"}
                      <motion.div animate={{ rotate: labelsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-3 h-3" />
                      </motion.div>
                    </button>
                  )}
                </div>
              )}

              {/* Scripture accordion */}
              <AnimatePresence>
                {scriptureOpen && card.extended_prayer && (
                  <motion.p
                    key="scripture"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                    className="font-display italic text-xs leading-relaxed overflow-hidden"
                    style={{ color: `${textColor}75` }}
                  >
                    {renderWithVerseLinks(card.extended_prayer)}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Labels accordion */}
              <AnimatePresence>
                {labelsOpen && card.labels && card.labels.length > 0 && (
                  <motion.div
                    key="labels"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                    className="flex flex-wrap gap-1.5 overflow-hidden"
                  >
                    {card.labels.map(tag => {
                      const palette = LABEL_PALETTE[tag] || DEFAULT_LABEL;
                      return (
                        <span key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ background: palette.bg, color: palette.text }}>
                          #{tag}
                        </span>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

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
                      style={{ color: `${textColor}45` }}
                    >
                      {item.notes
                        ? <span className="italic">"{item.notes}"</span>
                        : <span>+ Add notes…</span>}
                    </button>
                  )}
                </div>
              )}

              {/* Comments — large + PUBLIC cards only */}
              {size === "large" && isPublic && (
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer row (small + medium) ───────────────────────────────── */}
        {actionsInFooter && (
          <div
            className="flex items-center justify-between gap-2 pt-2 border-t"
            style={{ borderColor: `${textColor}12` }}
          >
            {/* Visibility toggle */}
            {isOwner ? (
              <div className="flex items-center gap-1.5">
                {togglingPublic ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: `${textColor}60` }} />
                ) : isPrivate ? (
                  <Lock className="w-3.5 h-3.5" style={{ color: `${textColor}50` }} />
                ) : (
                  <Globe className="w-3.5 h-3.5" style={{ color: accentColor }} />
                )}
                <span className="text-xs" style={{ color: `${textColor}55` }}>
                  {isPrivate ? "Private" : card.status === "pending" ? "In review" : "Public"}
                </span>
                <Switch
                  checked={!isPrivate}
                  onCheckedChange={handlePublicToggle}
                  disabled={togglingPublic || card.status === "approved"}
                  className="scale-75 origin-left"
                />
              </div>
            ) : <div />}

            {/* Action buttons */}
            <div className="flex items-center gap-0.5">
              {isPublic && (
                <button
                  onClick={() => setFlipped(true)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-accent/40"
                  style={{ color: accentColor }}
                  title="Share your testimony"
                >
                  <Bird className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Testify</span>
                </button>
              )}
              <ActionButtons
                item={item} accentColor={accentColor} textColor={textColor}
                onFavorite={toggleFavorite} onPin={togglePin} onShare={handleShare}
                onCardSize={setCardSize} onEnrich={() => setEnrichOpen(true)}
                onRemove={onRemove} isOwner={isOwner} size={size}
                onPickFont={pickFont} onPickRandomFont={pickRandomFont}
                currentFont={pendingFont ?? card.text_style}
                onAddToPlaylist={onAddToPlaylist}
              />
            </div>
          </div>
        )}

        {/* ── Large card: visibility toggle + testify ──────────────────── */}
        {!actionsInFooter && (
          <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: `${textColor}12` }}>
            {isOwner && (
              <>
                {togglingPublic ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: `${textColor}60` }} />
                ) : isPrivate ? (
                  <Lock className="w-3.5 h-3.5" style={{ color: `${textColor}50` }} />
                ) : (
                  <Globe className="w-3.5 h-3.5" style={{ color: accentColor }} />
                )}
                <span className="text-xs" style={{ color: `${textColor}55` }}>
                  {isPrivate ? "Private" : card.status === "pending" ? "In review" : "Public"}
                </span>
                <Switch
                  checked={!isPrivate}
                  onCheckedChange={handlePublicToggle}
                  disabled={togglingPublic || card.status === "approved"}
                  className="scale-75 origin-left"
                />
              </>
            )}
            <div className="flex-1" />
            {isPublic && (
              <button
                onClick={() => setFlipped(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                style={{ background: `${accentColor}15`, color: accentColor }}
                title="Share your testimony"
              >
                <Bird className="w-3.5 h-3.5" />
                Testify 🕊️
              </button>
            )}
          </div>
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
          existingLabels={card.labels || []}
          onApplied={onRefresh}
        />
      )}
        </motion.div>{/* end front face */}

        {/* ── BACK face — TestifyBack ──────────────────────────────────── */}
        <motion.div
          animate={{ rotateY: flipped ? 0 : 180 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 100, damping: 18 }}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            position: "absolute",
            inset: 0,
            borderRadius: "1rem",
            overflow: "hidden",
            background: cardBg,
            borderColor: cardBorder,
            border: `1px solid ${cardBorder}`,
            backdropFilter: "blur(16px) saturate(1.6)",
            WebkitBackdropFilter: "blur(16px) saturate(1.6)",
            boxShadow: "0 4px 24px -8px rgba(0,0,0,0.16)",
            minHeight: size === "large" ? 320 : size === "medium" ? 220 : 140,
          }}
        >
          {flipped && (
            <TestifyBack
              prayerId={card.id}
              prayerAuthorId={card.created_by}
              onFlipBack={() => setFlipped(false)}
              accentColor={accentColor}
              textColor={textColor}
              cardBg={cardBg}
            />
          )}
        </motion.div>
      </motion.div>{/* end layout motion.div */}
    </div>
  );
}

// ── Shared action buttons ────────────────────────────────────────────────────
interface ActionButtonsProps {
  item: SavedPrayer & { card_size?: CardSize };
  accentColor: string;
  textColor: string;
  onFavorite: () => void;
  onPin: () => void;
  onShare: (e: React.MouseEvent) => void;
  onCardSize: (s: CardSize) => void;
  onEnrich: () => void;
  onRemove: (id: string) => void;
  isOwner: boolean;
  size: CardSize;
  onPickFont: (family: string) => void;
  onPickRandomFont: () => void;
  currentFont: string | null | undefined;
  onAddToPlaylist?: (prayerId: string) => void;
}

function ActionButtons({
  item, accentColor, textColor,
  onFavorite, onPin, onShare, onCardSize, onEnrich, onRemove, isOwner, size,
  onPickFont, onPickRandomFont, currentFont, onAddToPlaylist,
}: ActionButtonsProps) {
  return (
    <>
      <button
        onClick={onFavorite}
        className="p-1.5 rounded-lg transition-colors hover:bg-accent/40"
        style={{ color: item.favorite ? "hsl(0 72% 51%)" : `${textColor}55` }}
        aria-label="Favourite"
      >
        <Heart className={`w-3.5 h-3.5 ${item.favorite ? "fill-current" : ""}`} />
      </button>

      <button
        onClick={onPin}
        className="p-1.5 rounded-lg transition-colors hover:bg-accent/40"
        style={{ color: item.pinned ? accentColor : `${textColor}55` }}
        aria-label="Pin"
      >
        <Pin className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={onShare}
        className="p-1.5 rounded-lg transition-colors hover:bg-accent/40"
        style={{ color: `${textColor}55` }}
        aria-label="Share"
      >
        <Share2 className="w-3.5 h-3.5" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-1.5 rounded-lg transition-colors hover:bg-accent/40"
            style={{ color: `${textColor}55` }}
            aria-label="More options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 rounded-xl">

          {/* Size */}
          <DropdownMenuItem className="text-xs gap-2" onClick={() => onCardSize("small")}>
            <Minimize2 className="w-3.5 h-3.5" /> Small {size === "small" && "✓"}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs gap-2" onClick={() => onCardSize("medium")}>
            <Square className="w-3.5 h-3.5" /> Medium {size === "medium" && "✓"}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs gap-2" onClick={() => onCardSize("large")}>
            <Maximize2 className="w-3.5 h-3.5" /> Large {size === "large" && "✓"}
          </DropdownMenuItem>

          {/* Add to playlist */}
          {onAddToPlaylist && item.prayer_cards && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-xs gap-2"
                onClick={() => onAddToPlaylist(item.prayer_cards!.id)}
              >
                <ListPlus className="w-3.5 h-3.5" /> Add to Playlist
              </DropdownMenuItem>
            </>
          )}

          {/* Font picker — owner only */}
          {isOwner && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs gap-2">
                  <Type className="w-3.5 h-3.5" /> Font
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-52 rounded-xl max-h-72 overflow-y-auto">
                  <DropdownMenuItem
                    className="text-xs gap-2 font-medium"
                    onClick={onPickRandomFont}
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    Random font 🎲
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {PRAYER_FONTS.map(font => (
                    <DropdownMenuItem
                      key={font.family}
                      className="text-xs gap-2"
                      onClick={() => onPickFont(font.family)}
                    >
                      <span style={{ fontFamily: `"${font.family}", serif`, flex: 1 }}>
                        {font.label}
                      </span>
                      {currentFont === font.family && <Check className="w-3 h-3 opacity-60" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs gap-2" onClick={onEnrich}>
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
    </>
  );
}
