import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Pin, Share2, Bird, Sparkles, Tag, Globe, Lock, Loader2, ListPlus, ArrowLeft, Volume2, MoreVertical, SunDim, Check, Palette, ExternalLink, ImageIcon, Type } from "lucide-react";
import { FormattedText } from "@/lib/FormattedText";
import { TestifyBack } from "./TestifyBack";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import Comments from "@/components/Comments";
import { renderWithVerseLinks } from "@/lib/renderWithVerseLinks";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PRAYER_FONTS, CARD_BG_PRESETS } from "./BoardCard";
import { useTtsPlayer } from "@/hooks/useTtsPlayer";
import { TtsContemplationOverlay } from "@/components/TtsContemplationOverlay";
import { PrayedButton } from "@/components/PrayedButton";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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

/** Helper: hex → "r, g, b" */
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  return `${parseInt(h.substring(0, 2), 16)}, ${parseInt(h.substring(2, 4), 16)}, ${parseInt(h.substring(4, 6), 16)}`;
}

/** Theater-mode cinematic prayer reader — now with floating inner card */
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

  // Creator card styling state
  const [cardOpacity, setCardOpacity] = useState(100);
  const [backdropDim, setBackdropDim] = useState(80);
  const [imageBrightness, setImageBrightness] = useState(100);
  const [textShade, setTextShade] = useState(100); // 0=black, 100=white
  const [cardBgPreset, setCardBgPreset] = useState<{ bg: string; text: string } | null>(null);

  // TTS
  const {
    ttsLoading, ttsPlaying, toggleTts, stopTts, pauseTts, resumeTts,
    timedPhrases, audioRef, playbackRate, changePlaybackRate,
  } = useTtsPlayer({ cacheId: card?.id, audioUrl: card?.audio_url });

  const handleListen = useCallback(() => {
    if (!card) return;
    const text = card.extended_prayer
      ? `${card.prayer_text}\n\n${card.extended_prayer}`
      : card.prayer_text;
    toggleTts(text, card.id);
  }, [card, toggleTts]);

  useEffect(() => {
    setNotes(item.notes || "");
    setEditingNotes(false);
    setTestifying(false);
  }, [item.notes, item.id]);

  // Initialize creator card styling from DB
  useEffect(() => {
    if (!card) return;
    const rawOpacity = (card as any).card_opacity;
    if (rawOpacity != null) setCardOpacity(Math.round(rawOpacity * 100));
    else setCardOpacity(100);
    const rawColor = (card as any).card_color;
    if (rawColor && typeof rawColor === "object" && "bg" in rawColor) {
      setCardBgPreset(rawColor as { bg: string; text: string });
    } else {
      setCardBgPreset(null);
    }
  }, [card?.id]);

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

  // Compute card background style (same logic as Prayer.tsx)
  const cardBgStyle = (() => {
    const rgb = hexToRgb(cardBgPreset?.bg ?? "#F8F1E3");
    const alpha = cardOpacity / 100;
    if (!cardBgPreset && cardOpacity === 100) return {};
    return { background: `rgba(${rgb}, ${alpha})` };
  })();

  // Text color for the card
  const cardTextColor = cardBgPreset?.text ?? "hsl(25 35% 14%)";

  // ── Creator styling handlers ──
  const opacityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleOpacityChange = (val: number[]) => {
    const v = val[0];
    setCardOpacity(v);
    if (opacityTimerRef.current) clearTimeout(opacityTimerRef.current);
    opacityTimerRef.current = setTimeout(() => {
      if (!card.id) return;
      supabase.from("prayer_cards").update({ card_opacity: v / 100 } as any).eq("id", card.id).then();
    }, 400);
  };

  const handleColorChange = (preset: { bg: string; text: string } | null) => {
    setCardBgPreset(preset);
    if (!card.id) return;
    supabase.from("prayer_cards").update({ card_color: preset } as any).eq("id", card.id).then();
  };

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

  const handleShare = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("prayer_shares")
        .insert({
          prayer_id: card.id,
          sender_id: userId,
          recipient_id: null,
          status: "pending",
        } as any)
        .select("token")
        .single();
      if (error) throw error;
      const link = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-prayer-preview?token=${(data as any).token}`;
      await navigator.clipboard.writeText(link);
      toast({ title: "Secure link copied! 🔗" });
    } catch {
      const url = `${window.location.origin}/prayer/${card.id}`;
      navigator.clipboard.writeText(url).then(() => toast({ title: "Link copied! 🔗" }));
    }
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
      <TtsContemplationOverlay
        playing={ttsPlaying}
        onStop={stopTts}
        onPause={pauseTts}
        onResume={resumeTts}
        text={card ? (card.extended_prayer ? `${card.prayer_text}\n\n${card.extended_prayer}` : card.prayer_text) : ""}
        playbackRate={playbackRate}
        onPlaybackRateChange={changePlaybackRate}
        timedPhrases={timedPhrases}
        audioRef={audioRef}
      />
      <AnimatePresence>
        {open && (
          <motion.div
            key="prayer-viewer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-4 md:p-6"
            style={{ background: `rgba(0, 0, 0, ${backdropDim / 100})` }}
            onClick={onClose}
          >
            {/* ── Floating prayer card inside dark theater ── */}
            <motion.div
              key="prayer-viewer-card"
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ duration: 0.4, type: "spring", stiffness: 260, damping: 28 }}
              className="prayer-card-premium w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col relative"
              style={{
                ...cardBgStyle,
                animation: "theater-glow 6s ease-in-out infinite",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Card-level background image (inside card, NOT full-screen) */}
              {hasImage && (
                <div className="absolute inset-0 rounded-[1.25rem] overflow-hidden">
                  <img
                    src={bgUrl!}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{ filter: `brightness(${imageBrightness / 100})` }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
                </div>
              )}

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full transition-colors z-20 bg-white/90 shadow-md hover:bg-white"
                style={{ color: "hsl(215 14% 34%)" }}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* ── Card content ── */}
              <div className="relative flex-1 p-6 md:p-10">
                {testifying ? (
                  <div className="min-h-[300px]">
                    <button
                      onClick={() => setTestifying(false)}
                      className={`flex items-center gap-1.5 text-sm font-medium mb-6 transition-colors ${hasImage ? "text-white/70 hover:text-white" : "hover:opacity-70"}`}
                      style={{ color: hasImage ? undefined : cardTextColor }}
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
                    {/* Header: Title + Owner three-dot menu */}
                    <div className="flex items-start justify-between gap-3 mb-6 pr-10">
                      <div className="flex-1 min-w-0">
                        {card.title && (
                          <h2
                            className="text-xl md:text-2xl font-semibold leading-tight"
                            style={{
                              color: hasImage ? "white" : cardTextColor,
                              fontFamily: '"Playfair Display", serif',
                            }}
                          >
                            {card.title}
                          </h2>
                        )}
                      </div>

                      {/* Owner three-dot settings menu */}
                      {isOwner && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="p-1.5 rounded-lg transition-colors"
                              style={{
                                color: hasImage ? "white" : cardTextColor,
                                background: hasImage ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.05)",
                              }}
                              title="Card settings"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64 p-3 rounded-xl">
                            <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-semibold">
                              <SunDim className="w-3.5 h-3.5" /> Background Dimmer
                            </DropdownMenuLabel>
                            <div className="px-1 py-2">
                              <Slider
                                value={[backdropDim]}
                                onValueChange={(val) => setBackdropDim(val[0])}
                                min={20}
                                max={100}
                                step={1}
                                className="w-full"
                              />
                              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                <span>Light</span>
                                <span>{backdropDim}%</span>
                                <span>Dark</span>
                              </div>
                            </div>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-semibold">
                              <Palette className="w-3.5 h-3.5" /> Card Color
                            </DropdownMenuLabel>
                            <div className="flex flex-wrap gap-1.5 px-1 py-2">
                              <button
                                onClick={() => handleColorChange(null)}
                                className="w-7 h-7 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110"
                                style={{ background: "#F8F1E3", borderColor: !cardBgPreset ? "hsl(42 75% 40%)" : "hsl(38 22% 85%)" }}
                                title="Default"
                              >
                                {!cardBgPreset && <Check className="w-3 h-3" style={{ color: "#2C2418" }} />}
                              </button>
                              {CARD_BG_PRESETS.map((preset) => {
                                const isActive = cardBgPreset?.bg === preset.bg;
                                return (
                                  <button
                                    key={preset.name}
                                    onClick={() => handleColorChange({ bg: preset.bg, text: preset.text })}
                                    className="w-7 h-7 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110"
                                    style={{ background: preset.bg, borderColor: isActive ? "hsl(42 75% 40%)" : "hsl(38 22% 85%)" }}
                                    title={preset.name}
                                  >
                                    {isActive && <Check className="w-3 h-3" style={{ color: preset.text }} />}
                                  </button>
                                );
                              })}
                            </div>
                            <DropdownMenuSeparator />
                            {/* Open Prayer Page */}
                            <button
                              onClick={() => window.open(`/prayer/${card.id}`, '_blank')}
                              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-md transition-colors hover:bg-accent"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Open Prayer Page
                            </button>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {/* Prayer text */}
                    <FormattedText
                      text={card.prayer_text}
                      className="text-base md:text-lg leading-[1.85] font-medium mb-8 selection:bg-amber-100 selection:text-slate-900"
                      style={{
                        color: hasImage ? "white" : cardTextColor,
                        fontFamily: activeFontFamily ? `"${activeFontFamily}", serif` : '"Lora", serif',
                      }}
                      indent
                    />

                    {/* See less… */}
                    <button
                      onClick={onClose}
                      className="text-sm font-semibold transition-colors"
                      style={{ color: hasImage ? "rgba(255,255,255,0.5)" : `${cardTextColor}80` }}
                    >
                      See less…
                    </button>

                    {/* Extended prayer / scripture */}
                    {card.extended_prayer && (
                      <div className="mt-8 mb-6">
                        <h3
                          className="text-xs font-semibold uppercase tracking-widest mb-3"
                          style={{ color: hasImage ? "rgba(255,255,255,0.5)" : `${cardTextColor}80` }}
                        >
                          Scripture & Meditation
                        </h3>
                        <p
                          className="text-sm md:text-base leading-[1.8] italic selection:bg-amber-100 selection:text-slate-900"
                          style={{
                            color: hasImage ? "rgba(255,255,255,0.85)" : cardTextColor,
                            fontFamily: '"Lora", serif',
                          }}
                        >
                          {renderWithVerseLinks(card.extended_prayer)}
                        </p>
                      </div>
                    )}

                    {/* Meditation essay */}
                    {card.meditation_essay && (
                      <div className="mb-6">
                        <h3
                          className="text-xs font-semibold uppercase tracking-widest mb-3"
                          style={{ color: hasImage ? "rgba(255,255,255,0.5)" : `${cardTextColor}80` }}
                        >
                          Meditation
                        </h3>
                        <p
                          className="text-sm md:text-base leading-[1.8] selection:bg-amber-100 selection:text-slate-900"
                          style={{ color: hasImage ? "rgba(255,255,255,0.85)" : cardTextColor }}
                        >
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
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ background: "hsl(215 14% 93%)", color: "hsl(215 14% 45%)" }}>
                            In review
                          </span>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    <div className="mb-6 mt-8">
                      <h3
                        className="text-xs font-semibold uppercase tracking-widest mb-3"
                        style={{ color: hasImage ? "rgba(255,255,255,0.5)" : `${cardTextColor}80` }}
                      >
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
                          className="min-h-[52px] w-full text-left rounded-xl px-4 py-3 text-sm transition-all"
                          style={{
                            background: hasImage ? "rgba(255,255,255,0.1)" : "hsl(215 14% 96%)",
                            color: hasImage ? "rgba(255,255,255,0.8)" : cardTextColor,
                          }}
                        >
                          {item.notes ? (
                            <span className="italic">"{item.notes}"</span>
                          ) : (
                            <span style={{ opacity: 0.5 }}>+ Add notes…</span>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Comments for public prayers */}
                    {isPublic && (
                      <div className="mb-6">
                        <button
                          onClick={() => setShowComments((s) => !s)}
                          className="text-xs font-semibold transition-colors"
                          style={{ color: hasImage ? "rgba(255,255,255,0.6)" : `${cardTextColor}80` }}
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
              <div
                className="sticky bottom-0 border-t p-4 flex items-center justify-between mt-auto z-10 rounded-b-[1.25rem]"
                style={{
                  background: hasImage ? "rgba(0,0,0,0.6)" : "white",
                  borderColor: hasImage ? "rgba(255,255,255,0.1)" : "hsl(215 14% 93%)",
                  backdropFilter: hasImage ? "blur(12px)" : undefined,
                }}
              >
                <div className="flex items-center gap-1">
                  <PrayedButton prayerId={card.id} userId={userId} accentColor={accentColor} initialCount={card.prayed_count} />

                  <button
                    onClick={toggleFavorite}
                    className="p-2.5 rounded-xl transition-colors"
                    style={{ color: item.favorite ? "hsl(0 72% 51%)" : hasImage ? "rgba(255,255,255,0.6)" : "hsl(215 14% 60%)" }}
                    aria-label="Favourite"
                  >
                    <Heart className={`w-5 h-5 ${item.favorite ? "fill-current" : ""}`} />
                  </button>

                  <button
                    onClick={togglePin}
                    className="p-2.5 rounded-xl transition-colors"
                    style={{ color: item.pinned ? accentColor : hasImage ? "rgba(255,255,255,0.6)" : "hsl(215 14% 60%)" }}
                    aria-label="Pin"
                  >
                    <Pin className="w-5 h-5" />
                  </button>

                  <button
                    onClick={handleShare}
                    className="p-2.5 rounded-xl transition-colors"
                    style={{ color: hasImage ? "rgba(255,255,255,0.6)" : "hsl(215 14% 60%)" }}
                    aria-label="Share"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleListen(); }}
                    className="p-2.5 rounded-xl transition-colors"
                    style={{ color: ttsPlaying ? accentColor : hasImage ? "rgba(255,255,255,0.6)" : "hsl(215 14% 60%)" }}
                    aria-label="Listen"
                  >
                    {ttsLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Volume2 className={`w-5 h-5 ${ttsPlaying ? 'fill-current' : ''}`} />
                    )}
                  </button>

                  {onAddToPlaylist && (
                    <button
                      onClick={() => onAddToPlaylist(card.id)}
                      className="p-2.5 rounded-xl transition-colors"
                      style={{ color: hasImage ? "rgba(255,255,255,0.6)" : "hsl(215 14% 60%)" }}
                      aria-label="Add to playlist"
                    >
                      <ListPlus className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {isPublic && (
                    <button
                      onClick={() => setTestifying(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                      style={{
                        background: hasImage ? "rgba(255,255,255,0.15)" : "hsl(42 80% 95%)",
                        color: hasImage ? "white" : "hsl(38 75% 32%)",
                      }}
                      title="Share your testimony"
                    >
                      <Bird className="w-4 h-4" />
                      Testify
                    </button>
                  )}

                  {isOwner && (
                    <div className="flex items-center gap-1.5">
                      {togglingPublic ? (
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: hasImage ? "rgba(255,255,255,0.5)" : "hsl(215 14% 60%)" }} />
                      ) : isPrivate ? (
                        <Lock className="w-4 h-4" style={{ color: hasImage ? "rgba(255,255,255,0.5)" : "hsl(215 14% 60%)" }} />
                      ) : (
                        <Globe className="w-4 h-4" style={{ color: hasImage ? "rgba(255,255,255,0.6)" : "hsl(215 14% 50%)" }} />
                      )}
                      <span className="text-xs hidden sm:inline" style={{ color: hasImage ? "rgba(255,255,255,0.6)" : "hsl(215 14% 50%)" }}>
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
