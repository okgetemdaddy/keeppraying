import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { trashItem } from "@/hooks/useTrashBin";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import Comments from "@/components/Comments";
import AIEnrichPanel from "@/components/AIEnrichPanel";
import { TestifyBack } from "@/components/board/TestifyBack";
import { SermonApplicationPoints } from "@/components/board/SermonApplicationPoints";
import { TestimonyCardFace } from "@/components/board/TestimonyCardFace";
import { VoiceWaveformPlayer } from "@/components/board/VoiceWaveformPlayer";
import { renderWithVerseLinks } from "@/lib/renderWithVerseLinks";
import { FormattedText } from "@/lib/FormattedText";
import { DustParticles } from "@/components/board/DustParticles";
import { BarBtn } from "@/components/board/BarBtn";
import {
  type CardTheme,
  THEME_DARK,
  THEME_LIGHT,
  DARK_BACKGROUNDS,
  LIGHT_BACKGROUNDS,
  GOOGLE_FONTS,
  loadGoogleFont,
  PrayingHandsIcon,
  isLuminanceDark,
  buildCardTheme,
  PRAYER_CARD_STYLES,
} from "@/components/board/prayerCardTheme";
import type { Database } from "@/integrations/supabase/types";
import {
  Heart, Pin, ChevronDown, ChevronUp, Sparkles, Tag,
  Trash2, Globe, Lock, Loader2, Maximize2, Minimize2, Square,
  MoreHorizontal, Share2, Type, Shuffle, Check, ListPlus, Bird,
  SunDim, ImagePlus, ImageOff, Send, BookmarkX, AlertTriangle,
  ExternalLink, Volume2, BookOpen, MessageCircle, Palette,
  UserRoundCheck, X,
} from "lucide-react";
import { useTtsPlayer } from "@/hooks/useTtsPlayer";
import { TtsContemplationOverlay } from "@/components/TtsContemplationOverlay";
import TtsLoadingPopup from "@/components/TtsLoadingPopup";
import { SharePrayerModal } from "@/components/SharePrayerModal";
import { Slider } from "@/components/ui/slider";
import {
  ResponsiveDialog as Dialog, ResponsiveDialogContent as DialogContent, ResponsiveDialogHeader as DialogHeader, ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogDescription as DialogDescription, ResponsiveDialogFooter as DialogFooter,
} from "@/components/ui/responsive-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub,
  DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { useIsTouch } from "@/hooks/use-mobile";
import {
  ResponsiveSheet,
  ResponsiveSheetContent,
  ResponsiveSheetHeader,
  ResponsiveSheetTitle,
} from "@/components/ui/responsive-sheet";

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

/** 8 background-color presets from the design palette */
export const CARD_BG_PRESETS = [
  { name: "Warm Parchment",    bg: "#F8F1E3", text: "#2C2418" },
  { name: "Gentle Sage",       bg: "#E8F0E8", text: "#1F2C22" },
  { name: "Heavenly Sky",      bg: "#E0F0FA", text: "#132A4A" },
  { name: "Golden Sunrise",    bg: "#FAF0D8", text: "#3D2A0F" },
  { name: "Graceful Lavender", bg: "#F0E8FA", text: "#2C1F3D" },
  { name: "Soft Peach",        bg: "#FAE8E0", text: "#3D2A1F" },
  { name: "Light Olive",       bg: "#F0F5E8", text: "#263D26" },
  { name: "Pure Sand",         bg: "#F5F0E8", text: "#2C2418" },
];

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
  onOpenViewer?: (item: SavedPrayer & { card_size?: CardSize }) => void;
  captionModeTts?: boolean;
  captionModeRecorded?: boolean;
  defaultCardLayout?: string;
  ttsVoiceId?: string;
}

/* ── inject global styles once ───────────────────────────────────────────── */
let stylesInjected = false;
function ensureStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const tag = document.createElement("style");
  tag.textContent = PRAYER_CARD_STYLES;
  document.head.appendChild(tag);
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
  onOpenViewer,
  captionModeTts = true,
  captionModeRecorded = true,
  defaultCardLayout = "standard",
  ttsVoiceId,
}: BoardCardProps) {
  const { toast } = useToast();
  const card = item.prayer_cards;
  const isTouch = useIsTouch();

  // Inject shared CSS keyframes once
  useEffect(() => ensureStyles(), []);

  // ── State ────────────────────────────────────────────────────────────────
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(item.notes || "");
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [scriptureOpen, setScriptureOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [prayed, setPrayed] = useState(false);
  const [prayedCount, setPrayedCount] = useState(0);
  const [prayAnim, setPrayAnim] = useState(false);
  const [prayedFloat, setPrayedFloat] = useState(false);
  const prayedCooldownRef = useRef(false);
  const [flipped, setFlipped] = useState(false);
  const lastTapRef = useRef(0);
  const [overlayOpacity, setOverlayOpacity] = useState(
    (item as any).overlay_opacity != null ? (item as any).overlay_opacity : 0.48
  );
  const [cardBgPreset, setCardBgPreset] = useState<{ bg: string; text: string } | null>(() => {
    const saved = (item as any).card_color;
    if (saved && typeof saved === 'object' && saved.bg && saved.text) {
      return { bg: saved.bg, text: saved.text };
    }
    return null;
  });
  const [hasTestimony, setHasTestimony] = useState(false);
  const [userTestimony, setUserTestimony] = useState<any>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isSharedRecipient, setIsSharedRecipient] = useState(false);
  const [duplicateDialog, setDuplicateDialog] = useState<{ matchId: string } | null>(null);
  const [disputeSending, setDisputeSending] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // ── Theme Bridge ─────────────────────────────────────────────────────────
  // Cards inherit the board theme by default.
  const theme: CardTheme = useMemo(() => {
    const isDarkBoard = isLuminanceDark(themeVars?.["--board-text"]);
    const baseTheme = isDarkBoard ? THEME_DARK : THEME_LIGHT;
    const backgrounds = isDarkBoard ? DARK_BACKGROUNDS : LIGHT_BACKGROUNDS;
    return {
      ...baseTheme,
      brandColor: themeVars?.["--board-accent"] || baseTheme.brandColor,
      cardBg: cardBgPreset?.bg || backgrounds[0].bg,
    } as CardTheme;
  }, [themeVars, cardBgPreset]);

  // TTS player
  const {
    ttsLoading, ttsPlaying, toggleTts, stopTts, pauseTts, resumeTts,
    timedPhrases, audioRef, playbackRate, changePlaybackRate,
  } = useTtsPlayer({ cacheId: card?.id ? `${card.id}_${ttsVoiceId || 'sal'}` : undefined, audioUrl: card?.audio_url, voiceId: ttsVoiceId });

  const handleListen = useCallback(() => {
    if (!card) return;
    const text = card.extended_prayer
      ? `${card.prayer_text}\n\n${card.extended_prayer}`
      : card.prayer_text;
    toggleTts(text);
  }, [card, toggleTts]);

  // Font picker state
  const [pendingFont, setPendingFont] = useState<string | null>(null);
  const [savingFont, setSavingFont] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);

  // Debounced save for overlay opacity
  const opacitySaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleOverlayOpacityChange = useCallback((v: number) => {
    setOverlayOpacity(v);
    if (!userId) return;
    if (opacitySaveRef.current) clearTimeout(opacitySaveRef.current);
    opacitySaveRef.current = setTimeout(() => {
      supabase
        .from("user_saved_prayers")
        .update({ overlay_opacity: v } as any)
        .eq("id", item.id)
        .then();
    }, 600);
  }, [userId, item.id]);

  const handleCardBgPresetChange = useCallback((preset: { bg: string; text: string } | null) => {
    setCardBgPreset(preset);
    if (!userId) return;
    supabase
      .from("user_saved_prayers")
      .update({ card_color: preset } as any)
      .eq("id", item.id)
      .then();
  }, [userId, item.id]);

  // Check if user has a testimony + prayed state for this prayer
  useEffect(() => {
    if (!userId || !item.prayer_cards?.id) return;
    supabase
      .from("testimonies")
      .select("id, body, title, verses, praise_count, created_at, user_id, answered_date")
      .eq("prayer_id", item.prayer_cards.id)
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setHasTestimony(true);
          setUserTestimony(data);
        }
      });
    supabase.from("prayed_actions").select("id").eq("prayer_id", item.prayer_cards.id).eq("user_id", userId).maybeSingle()
      .then(({ data }) => setPrayed(!!data));
    setPrayedCount(item.prayer_cards.prayed_count || 0);
  }, [userId, item.prayer_cards?.id]);

  // Check if this prayer was shared to the current user via secure link
  useEffect(() => {
    if (!userId || !item.prayer_cards?.id) return;
    if (item.prayer_cards.created_by === userId) return;
    supabase
      .from("prayer_shares")
      .select("id")
      .eq("prayer_id", item.prayer_cards.id)
      .eq("recipient_id", userId)
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setIsSharedRecipient(true);
      });
  }, [userId, item.prayer_cards?.id, item.prayer_cards?.created_by]);

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

  // Legacy colour references for compatibility
  const accentColor = themeVars?.["--board-accent"] || theme.brandColor;
  const textColor = themeVars?.["--board-text"] || theme.textColor;

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

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
        const { data: simData } = await supabase.rpc('check_prayer_similarity', {
          input_text: card.prayer_text,
        });
        if (simData && Array.isArray(simData) && simData.length > 0) {
          const best = simData[0] as { match_score: number; match_id: string; match_status: string };
          if (best.match_score > 0.55 && best.match_status === 'approved' && best.match_id !== card.id) {
            setDuplicateDialog({ matchId: best.match_id });
            setTogglingPublic(false);
            return;
          }
        }
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

  const handleDispute = async () => {
    if (!duplicateDialog || !userId) return;
    setDisputeSending(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .maybeSingle();
      await supabase.from("contact_submissions").insert({
        name: profile?.full_name || "User",
        email: profile?.email || "",
        message: `Prayer duplicate dispute: My prayer "${card.title || card.id}" was flagged as similar to existing public prayer ${duplicateDialog.matchId}. I believe this is unique and should be allowed to go public.`,
      });
      toast({ title: "Message sent to KeepPray.ing — we'll get back to you ASAP 🙏" });
      setDuplicateDialog(null);
    } catch {
      toast({ title: "Failed to send dispute", variant: "destructive" });
    } finally {
      setDisputeSending(false);
    }
  };

  const handlePrayed = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;
    if (prayedCooldownRef.current) return;
    prayedCooldownRef.current = true;
    setTimeout(() => { prayedCooldownRef.current = false; }, 3000);
    setPrayAnim(true); setTimeout(() => setPrayAnim(false), 400);
    if (prayed) {
      const { data: snap } = await supabase.from("prayed_actions").select("*").eq("prayer_id", card.id).eq("user_id", userId).maybeSingle();
      if (snap) await trashItem(userId, "prayed_action", snap.id, snap as any);
      await supabase.from("prayed_actions").delete().eq("prayer_id", card.id).eq("user_id", userId);
      setPrayed(false); setPrayedCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from("prayed_actions").insert({ prayer_id: card.id, user_id: userId });
      setPrayed(true); setPrayedCount(c => c + 1);
      setPrayedFloat(true); setTimeout(() => setPrayedFloat(false), 1200);
    }
  };

  // ── derived ──────────────────────────────────────────────────────────────────
  const bgUrl = card.background_url || null;

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ perspective: "1200px", willChange: "transform" }}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
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
        {/* ══════ FRONT FACE ══════════════════════════════════════════════ */}
        <motion.div
          animate={{ rotateY: flipped ? -180 : 0 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 100, damping: 18 }}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transformStyle: "preserve-3d",
          }}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Ambient glow (outer) */}
          <div
            className="absolute -inset-px rounded-3xl pointer-events-none z-0"
            style={{
              boxShadow: theme.borderGlow,
              animation: "pca-glow-pulse 4s ease-in-out infinite",
            }}
          />

          {/* Card body */}
          <div
            className="relative rounded-3xl flex flex-col overflow-hidden"
            style={{
              background: bgUrl ? undefined : theme.cardBg,
              border: theme.borderSolid,
              boxShadow: item.pinned
                ? `inset 3px 0 0 ${theme.brandColor}, 0 20px 60px -12px rgba(0,0,0,0.35), 0 8px 20px -8px rgba(0,0,0,0.25)`
                : "0 20px 60px -12px rgba(0,0,0,0.35), 0 8px 20px -8px rgba(0,0,0,0.25)",
            }}
          >
            {/* Background image layer */}
            {bgUrl && (
              <div className="absolute inset-0 rounded-3xl overflow-hidden">
                <img
                  src={bgUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to top, rgba(0,0,0,${1.0 * overlayOpacity}), rgba(0,0,0,${0.85 * overlayOpacity}), rgba(0,0,0,${0.7 * overlayOpacity}))`,
                  }}
                />
              </div>
            )}

            {/* Inner glow */}
            <div
              className="absolute inset-0 pointer-events-none rounded-3xl z-[1]"
              style={{ boxShadow: theme.innerGlow }}
            />

            {/* Overhead lamp light */}
            <div
              className="absolute inset-0 pointer-events-none rounded-3xl z-[2]"
              style={{ background: theme.lampLight }}
            />
            <div
              className="absolute inset-0 pointer-events-none rounded-3xl z-[2]"
              style={{ background: "linear-gradient(180deg, rgba(200,170,100,0.05) 0%, transparent 40%)" }}
            />

            {/* Dust particles — CSS only, IntersectionObserver gated */}
            <DustParticles dustColor={theme.dustColor} />

            {/* ── Content area ─────────────────────────────────────────────── */}
            <div className="relative z-10 px-5 pt-5 pb-3 flex flex-col gap-1" {...dragHandleProps}>
              {/* Brand text */}
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-0.5"
                style={{ color: theme.titleColor }}
              >
                KEEPPRAY.ING
              </span>

              {/* Title */}
              {card.title && (
                <h3
                  className="font-display font-bold text-sm md:text-base leading-snug mb-1"
                  style={{
                    color: bgUrl ? "rgba(255,255,255,0.95)" : theme.headingColor,
                    fontFamily: '"Playfair Display", "Georgia", serif',
                  }}
                >
                  {card.title}
                </h3>
              )}

              {/* Voice waveform player for voice-recorded prayers */}
              {(card as any).voice_audio_url && (
                <div className="my-2">
                  <VoiceWaveformPlayer
                    audioUrl={(card as any).voice_audio_url}
                    large={defaultCardLayout === "voice-visual"}
                    accentColor={theme.brandColor}
                    captionsEnabled={captionModeRecorded}
                    onPlay={captionModeRecorded ? () => {
                      const text = card.extended_prayer
                        ? `${card.prayer_text}\n\n${card.extended_prayer}`
                        : card.prayer_text;
                      toggleTts(text);
                      return true;
                    } : undefined}
                  />
                </div>
              )}

              {/* Prayer text */}
              {!(defaultCardLayout === "voice-visual" && (card as any).voice_audio_url) && (
                <div
                  className="select-none pca-hide-scrollbar"
                  onClick={(e) => {
                    const now = Date.now();
                    if (now - lastTapRef.current < 350) {
                      e.stopPropagation();
                      lastTapRef.current = 0;
                      setFlipped(true);
                      return;
                    }
                    lastTapRef.current = now;
                    setTimeout(() => {
                      if (lastTapRef.current !== 0 && Date.now() - lastTapRef.current >= 340) {
                        onOpenViewer?.(item);
                      }
                    }, 360);
                  }}
                >
                  <FormattedText
                    text={card.prayer_text}
                    truncateAt={PRAYER_CHAR_LIMIT}
                    className="leading-[1.8] text-[15px] tracking-[0.01em] cursor-pointer"
                    style={{
                      fontFamily: activeFontFamily
                        ? `"${activeFontFamily}", serif`
                        : '"Cormorant Garamond", "Georgia", serif',
                      color: bgUrl ? "rgba(255,255,255,0.92)" : theme.textColor,
                    }}
                  />
                  {isTruncated && (
                    <button
                      onClick={e => { e.stopPropagation(); onOpenViewer?.(item); }}
                      className="mt-1.5 text-xs font-semibold transition-colors"
                      style={{ color: theme.brandColor, opacity: 0.8 }}
                    >
                      See more…
                    </button>
                  )}
                </div>
              )}

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
                    <div
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
                      style={{ background: `${theme.brandColor}15`, border: `1px solid ${theme.brandColor}30` }}
                    >
                      <span className="text-[10px]" style={{ color: theme.iconDefault }}>Preview:</span>
                      <span className="text-xs flex-1" style={{ fontFamily: `"${pendingFont}", serif`, color: theme.headingColor }}>
                        {pendingFont}
                      </span>
                      <button
                        onClick={saveFont}
                        disabled={savingFont}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all"
                        style={{ background: theme.brandColor, color: theme.mode === "dark" ? "#1a1610" : "#fff" }}
                      >
                        {savingFont ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Check className="w-2.5 h-2.5" />}
                        Save
                      </button>
                      <button
                        onClick={cancelFont}
                        className="text-[10px] px-1.5 py-0.5 rounded-lg transition-opacity hover:opacity-70"
                        style={{ color: theme.iconDefault }}
                      >
                        ✕
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Collapsible chrome (labels, notes, etc.) ─────────────────── */}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  key="chrome"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden space-y-3 px-5 relative z-10"
                >
                  {/* Status badges */}
                  {(card.status === "ai_generated" || (isPrivate && isOwner) || card.status === "pending") && (
                    <div className="flex flex-wrap gap-1">
                      {card.status === "ai_generated" && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: `${theme.brandColor}20`, color: theme.brandColor }}
                        >
                          <Sparkles className="w-2.5 h-2.5" />✦ Prayer Assist
                        </span>
                      )}
                      {card.status === "pending" && isOwner && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: `${theme.textColor}10`, color: theme.iconDefault }}
                        >
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
                          className="text-xs font-semibold flex items-center gap-1 transition-colors"
                          style={{ color: theme.brandColor }}
                        >
                          <motion.div animate={{ rotate: scriptureOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </motion.div>
                          {scriptureOpen ? "Hide Scripture" : "Scripture"}
                        </button>
                      ) : <div />}
                      {card.labels && card.labels.length > 0 && (
                        <button
                          onClick={() => setLabelsOpen(v => !v)}
                          className="text-xs font-semibold flex items-center gap-1 transition-colors"
                          style={{ color: theme.brandColor }}
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
                        style={{ color: theme.textColor, opacity: 0.75 }}
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
                    <div className="pt-3 mt-1">
                      {editingNotes ? (
                        <div className="space-y-2">
                          <Textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Personal notes, reflection…"
                            rows={2}
                            className="min-h-[44px] border-none rounded-lg px-3 py-2 text-xs resize-none w-full"
                            style={{ backgroundColor: theme.drawerInputBg, color: theme.textColor }}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveNotes} className="rounded-xl h-7 text-xs" style={{ background: theme.brandColor, color: theme.mode === "dark" ? "#1a1610" : "#fff" }}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => { setEditingNotes(false); setNotes(item.notes || ""); }} className="rounded-xl h-7 text-xs">Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingNotes(true)}
                          className="min-h-[44px] w-full text-left rounded-lg px-3 py-2 text-xs transition-opacity hover:opacity-80"
                          style={{ backgroundColor: `${theme.textColor}08`, color: theme.textColor }}
                        >
                          {item.notes
                            ? <span className="italic" style={{ color: theme.textColor }}>"{item.notes}"</span>
                            : <span style={{ color: theme.iconDefault }}>+ Add notes…</span>}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Sermon Application Points */}
                  {card.labels?.includes("sermon-sync") && card.meditation_essay && userId && (
                    <SermonApplicationPoints
                      meditationEssay={card.meditation_essay}
                      userId={userId}
                      cardId={card.id}
                      accentColor={theme.brandColor}
                      textColor={theme.textColor}
                      onRefresh={onRefresh}
                    />
                  )}

                  {size === "large" && isPublic && (
                    <>
                      <button
                        onClick={() => setShowComments(s => !s)}
                        className="text-xs flex items-center gap-1 transition-opacity hover:opacity-80"
                        style={{ color: theme.iconDefault }}
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

            {/* ══════════════════════════════════════════════════════════════
                SCRIPTURE & MEDITATION STRIP (collapsible, above bottom bar)
            ══════════════════════════════════════════════════════════════ */}
            {card.extended_prayer && (
              <div className="relative z-20" style={{ borderTop: theme.barBorder }}>
                <button
                  onClick={() => setScriptureOpen(v => !v)}
                  className="w-full flex items-center justify-between px-5 py-2 transition-all active:scale-[0.99]"
                  style={{ background: theme.barBg }}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5" style={{ color: theme.brandColor }} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.brandColor }}>
                      Scripture &amp; Meditation
                    </span>
                  </div>
                  {scriptureOpen ? (
                    <ChevronDown className="w-3.5 h-3.5" style={{ color: theme.iconDefault }} />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5" style={{ color: theme.iconDefault }} />
                  )}
                </button>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                PREMIUM BOTTOM BAR — themed icon row matching PrayerCardAsset
            ══════════════════════════════════════════════════════════════ */}
            <div
              className="relative z-20 flex items-center justify-between px-2 py-1.5"
              style={{ background: theme.barBg, borderTop: theme.barBorder }}
            >
              {/* Left group */}
              <div className="flex items-center gap-0">
                {/* Privacy status dot */}
                {isOwner ? (
                  <button
                    onClick={() => handlePublicToggle(!isPublic)}
                    disabled={togglingPublic || card.status === "approved"}
                    className="p-2.5 rounded-xl transition-transform active:scale-90"
                    title={isPublic ? "Public" : "Private"}
                  >
                    {togglingPublic ? (
                      <Loader2 className="w-3 h-3 animate-spin" style={{ color: theme.iconDefault }} />
                    ) : (
                      <div className="relative w-2.5 h-2.5">
                        <div
                          className="absolute inset-0 rounded-full transition-colors duration-500"
                          style={{
                            backgroundColor: isPublic ? "#34d399" : "#f87171",
                            boxShadow: isPublic
                              ? "0 0 6px 2px rgba(52,211,153,0.5)"
                              : "0 0 5px 1px rgba(248,113,113,0.4)",
                          }}
                        />
                        <div
                          className="absolute inset-0 rounded-full animate-ping"
                          style={{
                            backgroundColor: isPublic ? "#34d399" : "#f87171",
                            opacity: 0.25,
                            animationDuration: "2.5s",
                          }}
                        />
                      </div>
                    )}
                  </button>
                ) : <div className="w-2" />}

                {/* Prayed */}
                <div className="relative">
                  <AnimatePresence>
                    {prayedFloat && (
                      <motion.span
                        key="prayed-float"
                        initial={{ opacity: 1, y: 0, x: "-50%" }}
                        animate={{ opacity: 0, y: -28 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.1, ease: "easeOut" }}
                        className="absolute left-1/2 bottom-full mb-1 text-xs font-semibold pointer-events-none select-none whitespace-nowrap"
                        style={{ color: theme.brandColor }}
                      >
                        🙏 Prayed
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <BarBtn theme={theme} label="Prayed" active={prayed} onClick={handlePrayed}>
                    <motion.div animate={prayAnim ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.35 }}>
                      <PrayingHandsIcon className="w-[18px] h-[18px]" />
                    </motion.div>
                  </BarBtn>
                </div>

                {/* Comments */}
                <BarBtn theme={theme} label="Comments" onClick={() => setShowComments(s => !s)}>
                  <MessageCircle className="w-[18px] h-[18px]" />
                </BarBtn>
              </div>

              {/* Right group */}
              <div className="flex items-center gap-0">
                {/* Pin */}
                <BarBtn theme={theme} label="Pin" active={item.pinned} onClick={togglePin}>
                  <Pin className="w-[16px] h-[16px]" />
                </BarBtn>

                {/* Share */}
                {!isSharedRecipient && (
                  <BarBtn theme={theme} label="Share" onClick={handleShare}>
                    <Share2 className="w-[16px] h-[16px]" />
                  </BarBtn>
                )}

                {/* Listen */}
                <div className="relative">
                  <TtsLoadingPopup visible={!!ttsLoading && !ttsPlaying} />
                  <BarBtn
                    theme={theme}
                    label="Listen"
                    active={ttsPlaying}
                    onClick={(e) => { e.stopPropagation(); handleListen(); }}
                  >
                    {ttsLoading ? (
                      <Loader2 className="w-[16px] h-[16px] animate-spin" />
                    ) : (
                      <Volume2 className={`w-[16px] h-[16px] ${ttsPlaying ? 'fill-current' : ''}`} />
                    )}
                  </BarBtn>
                </div>

                {/* Testify */}
                <BarBtn theme={theme} label={hasTestimony ? "Testimony" : "Testify"} onClick={() => setFlipped(true)}>
                  <UserRoundCheck className="w-[16px] h-[16px]" />
                </BarBtn>

                {/* More ••• — Responsive: DropdownMenu on desktop, Sheet on mobile */}
                {isTouch ? (
                  <BarBtn theme={theme} label="More" onClick={() => setMoreMenuOpen(true)}>
                    <MoreHorizontal className="w-[16px] h-[16px]" />
                  </BarBtn>
                ) : (
                  <MoreDropdown
                    item={item} card={card} theme={theme}
                    isOwner={isOwner} size={size} isSharedRecipient={isSharedRecipient}
                    bgUrl={bgUrl} overlayOpacity={overlayOpacity}
                    cardBgPreset={cardBgPreset}
                    onCardSize={setCardSize}
                    onEnrich={() => setEnrichOpen(true)}
                    onRemove={onRemove}
                    onPickFont={pickFont} onPickRandomFont={pickRandomFont}
                    currentFont={pendingFont ?? card.text_style}
                    onAddToPlaylist={onAddToPlaylist}
                    onOverlayOpacityChange={handleOverlayOpacityChange}
                    onCardBgPresetChange={handleCardBgPresetChange}
                    userId={userId} onRefresh={onRefresh}
                    onSharePrivately={() => setShareModalOpen(true)}
                  />
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ══════ BACK FACE — Testify ══════════════════════════════════════ */}
        <motion.div
          animate={{ rotateY: flipped ? 0 : 180 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 100, damping: 18 }}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            position: "absolute",
            inset: 0,
            borderRadius: "1.5rem",
            overflow: "hidden",
            background: theme.cardBg,
            border: theme.borderSolid,
            boxShadow: "0 20px 60px -12px rgba(0,0,0,0.35), 0 8px 20px -8px rgba(0,0,0,0.25)",
            minHeight: size === "large" ? 320 : size === "medium" ? 220 : 140,
          }}
        >
          {/* Inner glow on back face too */}
          <div
            className="absolute inset-0 pointer-events-none rounded-3xl z-[1]"
            style={{ boxShadow: theme.innerGlow }}
          />
          {flipped && hasTestimony && userTestimony ? (
            <TestimonyCardFace
              testimony={userTestimony}
              onFlipBack={() => setFlipped(false)}
              accentColor={theme.brandColor}
              textColor={theme.textColor}
              cardBg={theme.cardBg}
            />
          ) : flipped ? (
            <TestifyBack
              prayerId={card.id}
              prayerAuthorId={card.created_by}
              onFlipBack={() => setFlipped(false)}
              accentColor={theme.brandColor}
              textColor={theme.textColor}
              cardBg={theme.cardBg}
            />
          ) : null}
        </motion.div>
      </motion.div>

      {/* ── Mobile More Menu (ResponsiveSheet) ──────────────────────────── */}
      <MobileMoreSheet
        open={moreMenuOpen}
        onOpenChange={setMoreMenuOpen}
        item={item} card={card} theme={theme}
        isOwner={isOwner} size={size} isSharedRecipient={isSharedRecipient}
        bgUrl={bgUrl} overlayOpacity={overlayOpacity}
        cardBgPreset={cardBgPreset}
        onCardSize={setCardSize}
        onEnrich={() => setEnrichOpen(true)}
        onRemove={onRemove}
        onPickFont={pickFont} onPickRandomFont={pickRandomFont}
        currentFont={pendingFont ?? card.text_style}
        onAddToPlaylist={onAddToPlaylist}
        onOverlayOpacityChange={handleOverlayOpacityChange}
        onCardBgPresetChange={handleCardBgPresetChange}
        userId={userId} onRefresh={onRefresh}
        onSharePrivately={() => setShareModalOpen(true)}
        toggleFavorite={toggleFavorite}
        isFavorite={item.favorite}
      />

      {/* Auto Verses & Labels Panel */}
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

      {/* Share Prayer Modal */}
      <SharePrayerModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        prayerId={card.id}
        prayerTitle={card.title}
      />

      {/* Duplicate-to-public dialog */}
      <Dialog open={!!duplicateDialog} onOpenChange={(open) => { if (!open) setDuplicateDialog(null); }}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Similar prayer already exists
            </DialogTitle>
            <DialogDescription>
              A very similar prayer is already available in the community. To keep the prayer library meaningful, we can't publish duplicates — but you can keep this prayer on your private board.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                if (duplicateDialog) {
                  window.open(`/prayer/${duplicateDialog.matchId}`, '_blank');
                }
              }}
            >
              <ExternalLink className="w-4 h-4" />
              View Existing Prayer
            </Button>
            <Button
              variant="secondary"
              className="w-full gap-2"
              onClick={handleDispute}
              disabled={disputeSending}
            >
              {disputeSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Dispute This
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setDuplicateDialog(null)}
            >
              Got It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TTS Contemplation Overlay */}
      {captionModeTts && (
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
      )}
    </div>
  );
}

/*
 * ══════════════════════════════════════════════════════════════════════════════
 * MoreDropdown — Desktop ⋯ DropdownMenu (unchanged logic, themed styling)
 * ══════════════════════════════════════════════════════════════════════════════
 */
interface MoreMenuProps {
  item: SavedPrayer & { card_size?: CardSize };
  card: PrayerCard;
  theme: CardTheme;
  isOwner: boolean;
  size: CardSize;
  isSharedRecipient?: boolean;
  bgUrl: string | null;
  overlayOpacity: number;
  cardBgPreset: { bg: string; text: string } | null;
  onCardSize: (s: CardSize) => void;
  onEnrich: () => void;
  onRemove: (id: string) => void;
  onPickFont: (family: string) => void;
  onPickRandomFont: () => void;
  currentFont: string | null | undefined;
  onAddToPlaylist?: (prayerId: string) => void;
  onOverlayOpacityChange: (v: number) => void;
  onCardBgPresetChange: (p: { bg: string; text: string } | null) => void;
  userId?: string;
  onRefresh: () => void;
  onSharePrivately?: () => void;
}

function MoreDropdown({
  item, card, theme, isOwner, size, isSharedRecipient,
  bgUrl, overlayOpacity, cardBgPreset,
  onCardSize, onEnrich, onRemove, onPickFont, onPickRandomFont, currentFont,
  onAddToPlaylist, onOverlayOpacityChange, onCardBgPresetChange,
  userId, onRefresh, onSharePrivately,
}: MoreMenuProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId || !card) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("prayer-backgrounds")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage
        .from("prayer-backgrounds")
        .getPublicUrl(path);
      await supabase
        .from("prayer_cards")
        .update({ background_url: urlData.publicUrl })
        .eq("id", card.id);
      onRefresh();
      toast({ title: "Background image added ✨" });
    } catch {
      toast({ title: "Failed to upload image", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = async () => {
    try {
      await supabase.from("prayer_cards").update({ background_url: null }).eq("id", card.id);
      onRefresh();
      toast({ title: "Background image removed" });
    } catch {
      toast({ title: "Failed to remove image", variant: "destructive" });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="relative p-2.5 rounded-xl transition-all duration-200 active:scale-90 group opacity-50 hover:opacity-100"
            style={{ color: theme.iconDefault }}
            aria-label="More options"
          >
            <MoreHorizontal className="w-[16px] h-[16px]" />
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

          {/* Share Privately */}
          {onSharePrivately && !isSharedRecipient && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs gap-2" onClick={onSharePrivately}>
                <Send className="w-3.5 h-3.5" /> Share Privately
              </DropdownMenuItem>
            </>
          )}

          {/* Open Prayer Page */}
          <DropdownMenuItem
            className="text-xs gap-2"
            onClick={() => window.open(`/prayer/${card.id}`, '_blank')}
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open Prayer Page
          </DropdownMenuItem>

          {/* Add to playlist */}
          {onAddToPlaylist && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs gap-2" onClick={() => onAddToPlaylist(card.id)}>
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
                  <DropdownMenuItem className="text-xs gap-2 font-medium" onClick={onPickRandomFont}>
                    <Shuffle className="w-3.5 h-3.5" /> Random font 🎲
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {PRAYER_FONTS.map(font => (
                    <DropdownMenuItem key={font.family} className="text-xs gap-2" onClick={() => onPickFont(font.family)}>
                      <span style={{ fontFamily: `"${font.family}", serif`, flex: 1 }}>{font.label}</span>
                      {currentFont === font.family && <Check className="w-3 h-3 opacity-60" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs gap-2" onClick={onEnrich}>
                <Sparkles className="w-3.5 h-3.5" /> Enrich with Scripture
              </DropdownMenuItem>
            </>
          )}

          {/* Image transparency slider */}
          {bgUrl && (
            <>
              <DropdownMenuSeparator />
              <div className="px-3 py-2 space-y-1.5" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <SunDim className="w-3.5 h-3.5" />
                  <span>Image dimming</span>
                  <span className="ml-auto tabular-nums text-[10px]">{Math.round(overlayOpacity * 100)}%</span>
                </div>
                <Slider min={0} max={100} step={1} value={[Math.round(overlayOpacity * 100)]} onValueChange={([v]) => onOverlayOpacityChange(v / 100)} className="w-full" />
              </div>
            </>
          )}

          {/* Background color presets */}
          {!bgUrl && (
            <>
              <DropdownMenuSeparator />
              <div className="px-3 py-2 space-y-1.5" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                  <span className="w-3.5 h-3.5 flex items-center justify-center">🎨</span>
                  <span>Card color</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => onCardBgPresetChange(null)}
                    className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center"
                    style={{ borderColor: !cardBgPreset ? theme.brandColor : 'hsl(215 14% 80%)', background: 'white' }}
                    title="Default"
                  >
                    {!cardBgPreset && <Check className="w-3 h-3" style={{ color: theme.brandColor }} />}
                  </button>
                  {CARD_BG_PRESETS.map(preset => {
                    const isActive = cardBgPreset?.bg === preset.bg;
                    return (
                      <button
                        key={preset.name}
                        onClick={() => onCardBgPresetChange(preset)}
                        className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center"
                        style={{ background: preset.bg, borderColor: isActive ? preset.text : `${preset.text}30` }}
                        title={preset.name}
                      >
                        {isActive && <Check className="w-3 h-3" style={{ color: preset.text }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Upload / Remove Image */}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-xs gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
            {uploading ? "Uploading…" : bgUrl ? "Replace Image" : "Upload Image"}
          </DropdownMenuItem>
          {bgUrl && (
            <DropdownMenuItem className="text-xs gap-2" onClick={handleRemoveImage}>
              <ImageOff className="w-3.5 h-3.5" /> Remove Image
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={`text-xs gap-2 ${isSharedRecipient ? '' : 'text-destructive focus:text-destructive'}`}
            onClick={async () => {
              if (userId) {
                await trashItem(userId, "saved_prayer", item.id, item as any);
              }
              onRemove(item.id);
            }}
          >
            {isSharedRecipient ? (
              <><BookmarkX className="w-3.5 h-3.5" /> Unsave from board</>
            ) : (
              <><Trash2 className="w-3.5 h-3.5" /> Remove</>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />
    </>
  );
}

/*
 * ══════════════════════════════════════════════════════════════════════════════
 * MobileMoreSheet — Mobile/Tablet ⋯ bottom sheet via ResponsiveSheet
 * ══════════════════════════════════════════════════════════════════════════════
 */
interface MobileMoreSheetProps extends MoreMenuProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  toggleFavorite: () => void;
  isFavorite: boolean;
}

function MobileMoreSheet({
  open, onOpenChange,
  item, card, theme, isOwner, size, isSharedRecipient,
  bgUrl, overlayOpacity, cardBgPreset,
  onCardSize, onEnrich, onRemove, onPickFont, onPickRandomFont, currentFont,
  onAddToPlaylist, onOverlayOpacityChange, onCardBgPresetChange,
  userId, onRefresh, onSharePrivately,
  toggleFavorite, isFavorite,
}: MobileMoreSheetProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId || !card) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("prayer-backgrounds").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("prayer-backgrounds").getPublicUrl(path);
      await supabase.from("prayer_cards").update({ background_url: urlData.publicUrl }).eq("id", card.id);
      onRefresh();
      toast({ title: "Background image added ✨" });
      onOpenChange(false);
    } catch {
      toast({ title: "Failed to upload image", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = async () => {
    try {
      await supabase.from("prayer_cards").update({ background_url: null }).eq("id", card.id);
      onRefresh();
      toast({ title: "Background image removed" });
      onOpenChange(false);
    } catch {
      toast({ title: "Failed to remove image", variant: "destructive" });
    }
  };

  const SheetRow = ({ icon: Icon, label, onClick, active, destructive }: {
    icon: any; label: string; onClick: () => void; active?: boolean; destructive?: boolean;
  }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all active:scale-[0.98] text-left"
      style={{
        backgroundColor: active ? `${theme.brandColor}12` : theme.drawerCardBg,
        border: `1px solid ${active ? `${theme.brandColor}25` : theme.drawerBorder}`,
        color: destructive ? "#ef4444" : active ? theme.brandColor : theme.drawerText,
      }}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm font-medium">{label}</span>
      {active && <Check className="w-3.5 h-3.5 ml-auto" />}
    </button>
  );

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange}>
      <ResponsiveSheetContent className="max-h-[85vh]" style={{ backgroundColor: theme.drawerBg, color: theme.drawerText }}>
        <div className="p-5 overflow-y-auto pca-hide-scrollbar space-y-2">
          <ResponsiveSheetHeader className="px-0 pb-3">
            <ResponsiveSheetTitle style={{ color: theme.drawerText }}>Options</ResponsiveSheetTitle>
          </ResponsiveSheetHeader>

          {/* Favourite */}
          <SheetRow icon={Heart} label={isFavorite ? "Unfavourite" : "Favourite"} onClick={() => { toggleFavorite(); onOpenChange(false); }} active={isFavorite} />

          {/* Size */}
          <div className="flex gap-2">
            {(["small", "medium", "large"] as CardSize[]).map(s => (
              <button
                key={s}
                onClick={() => { onCardSize(s); onOpenChange(false); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium capitalize transition-all"
                style={{
                  backgroundColor: size === s ? `${theme.brandColor}18` : theme.drawerCardBg,
                  color: size === s ? theme.brandColor : theme.drawerMuted,
                  border: `1px solid ${size === s ? `${theme.brandColor}25` : theme.drawerBorder}`,
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Share Privately */}
          {onSharePrivately && !isSharedRecipient && (
            <SheetRow icon={Send} label="Share Privately" onClick={() => { onSharePrivately(); onOpenChange(false); }} />
          )}

          {/* Open Prayer Page */}
          <SheetRow icon={ExternalLink} label="Open Prayer Page" onClick={() => { window.open(`/prayer/${card.id}`, '_blank'); onOpenChange(false); }} />

          {/* Playlist */}
          {onAddToPlaylist && (
            <SheetRow icon={ListPlus} label="Add to Playlist" onClick={() => { onAddToPlaylist(card.id); onOpenChange(false); }} />
          )}

          {/* Enrich */}
          {isOwner && (
            <SheetRow icon={Sparkles} label="Enrich with Scripture" onClick={() => { onEnrich(); onOpenChange(false); }} />
          )}

          {/* Font */}
          {isOwner && (
            <SheetRow icon={Type} label="Change Font" onClick={() => {
              onOpenChange(false);
              // Open font picker via random for now — the full font picker drawer can be added later
              onPickRandomFont();
            }} />
          )}

          {/* Image dimming slider */}
          {bgUrl && (
            <div className="p-4 rounded-2xl space-y-2" style={{ backgroundColor: theme.drawerCardBg, border: `1px solid ${theme.drawerBorder}` }}>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: theme.drawerMuted }}>
                <SunDim className="w-3.5 h-3.5" />
                <span>Image dimming</span>
                <span className="ml-auto tabular-nums text-[10px]">{Math.round(overlayOpacity * 100)}%</span>
              </div>
              <Slider min={0} max={100} step={1} value={[Math.round(overlayOpacity * 100)]} onValueChange={([v]) => onOverlayOpacityChange(v / 100)} className="w-full" />
            </div>
          )}

          {/* Card colour presets */}
          {!bgUrl && (
            <div className="p-4 rounded-2xl space-y-2" style={{ backgroundColor: theme.drawerCardBg, border: `1px solid ${theme.drawerBorder}` }}>
              <div className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color: theme.drawerMuted }}>
                <Palette className="w-3.5 h-3.5" />
                <span>Card colour</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => onCardBgPresetChange(null)}
                  className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center"
                  style={{ borderColor: !cardBgPreset ? theme.brandColor : theme.drawerBorder, background: theme.mode === "dark" ? "#2a2318" : "white" }}
                >
                  {!cardBgPreset && <Check className="w-3 h-3" style={{ color: theme.brandColor }} />}
                </button>
                {CARD_BG_PRESETS.map(preset => {
                  const isActive = cardBgPreset?.bg === preset.bg;
                  return (
                    <button
                      key={preset.name}
                      onClick={() => onCardBgPresetChange(preset)}
                      className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center"
                      style={{ background: preset.bg, borderColor: isActive ? preset.text : `${preset.text}30` }}
                    >
                      {isActive && <Check className="w-3 h-3" style={{ color: preset.text }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upload / Remove Image */}
          <SheetRow
            icon={uploading ? Loader2 : ImagePlus}
            label={uploading ? "Uploading…" : bgUrl ? "Replace Image" : "Upload Image"}
            onClick={() => fileInputRef.current?.click()}
          />
          {bgUrl && (
            <SheetRow icon={ImageOff} label="Remove Image" onClick={handleRemoveImage} />
          )}

          {/* Remove */}
          <div className="pt-2">
            <SheetRow
              icon={isSharedRecipient ? BookmarkX : Trash2}
              label={isSharedRecipient ? "Unsave from board" : "Remove"}
              destructive={!isSharedRecipient}
              onClick={async () => {
                if (userId) await trashItem(userId, "saved_prayer", item.id, item as any);
                onRemove(item.id);
                onOpenChange(false);
              }}
            />
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />
      </ResponsiveSheetContent>
    </ResponsiveSheet>
  );
}
