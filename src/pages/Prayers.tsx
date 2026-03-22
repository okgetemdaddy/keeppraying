import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import AddPrayerModal from "@/components/AddPrayerModal";
import Comments from "@/components/Comments";
import VerseLink from "@/components/VerseLink";
import { renderWithVerseLinks } from "@/lib/renderWithVerseLinks";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Heart, Bookmark, Search, Plus, Sparkles, ExternalLink,
  Users, ShieldCheck, ToggleLeft, ToggleRight, X, ChevronDown, Tag, ChevronUp,
  Volume2, VolumeX, Loader2, Share2,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";

type PrayerCard = Database['public']['Tables']['prayer_cards']['Row'] & { source?: string };


// ─── Design tokens (tag colors by keyword) ───────────────────────────────────
const TAG_PALETTE: Record<string, { bg: string; text: string }> = {
  "lords-prayer":    { bg: "hsl(42 85% 90%)",  text: "hsl(38 75% 35%)" },
  "healing":         { bg: "hsl(150 40% 88%)", text: "hsl(150 38% 26%)" },
  "peace":           { bg: "hsl(210 55% 88%)", text: "hsl(210 55% 30%)" },
  "faith":           { bg: "hsl(42 80% 92%)",  text: "hsl(38 75% 32%)" },
  "morning-prayer":  { bg: "hsl(35 68% 88%)",  text: "hsl(35 65% 32%)" },
  "forgiveness":     { bg: "hsl(280 35% 88%)", text: "hsl(280 40% 30%)" },
  "intercession":    { bg: "hsl(150 30% 88%)", text: "hsl(150 38% 28%)" },
};
const DEFAULT_TAG = { bg: "hsl(42 80% 90%)", text: "hsl(38 75% 35%)" };

const TEXT_STYLE_CLASSES: Record<string, string> = {
  classic:       "font-body text-base",
  scripture:     "font-display text-base italic",
  peaceful:      "font-body text-base",
  bold:          "font-body text-base font-semibold",
  gentle:        "font-body text-sm leading-relaxed",
  strong:        "font-display text-lg font-bold",
  modern:        "font-body text-sm tracking-wide",
  compassionate: "font-display text-base",
  whisper:       "font-body text-sm italic",
  royal:         "font-display font-bold tracking-wider",
};

// ─── Animation variants ───────────────────────────────────────────────────────
const pageVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show:   { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
};
const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13 } },
};

// ─── Source badge ─────────────────────────────────────────────────────────────
function SourceBadge({ source, status }: { source?: string; status: string }) {
  if (status === "ai_generated") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium"
        style={{ background: "hsl(42 80% 92%)", borderColor: "hsl(42 75% 78%)", color: "hsl(38 75% 32%)" }}>
        <Sparkles className="w-2.5 h-2.5" />AI
      </span>
    );
  }
  if (source === "community") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium"
        style={{ background: "hsl(150 30% 90%)", borderColor: "hsl(150 28% 76%)", color: "hsl(150 38% 26%)" }}>
        <Users className="w-2.5 h-2.5" />Community
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium"
      style={{ background: "hsl(210 50% 92%)", borderColor: "hsl(210 45% 78%)", color: "hsl(210 50% 32%)" }}>
      <ShieldCheck className="w-2.5 h-2.5" />Curated
    </span>
  );
}

// ─── Prayer card item ─────────────────────────────────────────────────────────
const PRAYER_CHAR_LIMIT = 320;

// Inline praying hands SVG icon
function PrayingHandsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C12 2 9 5.5 9 9v4l-2 3v3h10v-3l-2-3V9c0-3.5-3-7-3-7z" />
      <path d="M9 13H7.5a1.5 1.5 0 0 0 0 3H9" />
      <path d="M15 13h1.5a1.5 1.5 0 0 1 0 3H15" />
      <line x1="9" y1="19" x2="15" y2="19" />
    </svg>
  );
}

function PrayerCardItem({ card, userId }: { card: PrayerCard; userId: string | null }) {
  const [liked, setLiked] = useState(false);
  const [prayed, setPrayed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [scriptureOpen, setScriptureOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [likesCount, setLikesCount] = useState(card.likes_count);
  const [prayedCount, setPrayedCount] = useState(card.prayed_count);
  const [likeAnim, setLikeAnim] = useState(false);
  const [prayAnim, setPrayAnim] = useState(false);
  const [prayedFloat, setPrayedFloat] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const isTruncated = card.prayer_text.length > PRAYER_CHAR_LIMIT;

  useEffect(() => {
    if (!userId) return;
    const checkInteractions = async () => {
      const [{ data: like }, { data: pray }, { data: save }] = await Promise.all([
        supabase.from("likes").select("id").eq("prayer_id", card.id).eq("user_id", userId).maybeSingle(),
        supabase.from("prayed_actions").select("id").eq("prayer_id", card.id).eq("user_id", userId).maybeSingle(),
        supabase.from("user_saved_prayers").select("id").eq("prayer_id", card.id).eq("user_id", userId).maybeSingle(),
      ]);
      setLiked(!!like); setPrayed(!!pray); setSaved(!!save);
    };
    checkInteractions();
  }, [card.id, userId]);

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) { toast({ title: "Sign in to like prayers" }); return; }
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 400);
    if (liked) {
      await supabase.from("likes").delete().eq("prayer_id", card.id).eq("user_id", userId);
      setLiked(false); setLikesCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from("likes").insert({ prayer_id: card.id, user_id: userId });
      setLiked(true); setLikesCount(c => c + 1);
    }
  };

  const togglePrayed = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) { toast({ title: "Sign in to track prayers" }); return; }
    setPrayAnim(true);
    setTimeout(() => setPrayAnim(false), 400);
    if (prayed) {
      await supabase.from("prayed_actions").delete().eq("prayer_id", card.id).eq("user_id", userId);
      setPrayed(false); setPrayedCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from("prayed_actions").insert({ prayer_id: card.id, user_id: userId });
      setPrayed(true); setPrayedCount(c => c + 1);
      setPrayedFloat(true);
      setTimeout(() => setPrayedFloat(false), 1200);
    }
  };

  const toggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) { toast({ title: "Sign in to save prayers" }); return; }
    if (saved) {
      await supabase.from("user_saved_prayers").delete().eq("prayer_id", card.id).eq("user_id", userId);
      setSaved(false);
    } else {
      await supabase.from("user_saved_prayers").insert({ prayer_id: card.id, user_id: userId });
      setSaved(true);
      toast({ title: "Saved to your board 📌" });
    }
  };

  const toggleTts = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // If already playing, stop
    if (ttsPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setTtsPlaying(false);
      return;
    }
    if (ttsLoading) return;
    setTtsLoading(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prayer-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: card.prayer_text }),
        }
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Could not generate speech");
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setTtsPlaying(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setTtsPlaying(false); };
      await audio.play();
      setTtsPlaying(true);
    } catch (err) {
      toast({
        title: "Could not read prayer",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setTtsLoading(false);
    }
  };

  const textClass = TEXT_STYLE_CLASSES[card.text_style || "classic"] || TEXT_STYLE_CLASSES.classic;

  return (
    <motion.div
      variants={cardVariants}
      whileHover={collapsed ? {} : { y: -6, scale: 1.015 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="prayer-card-premium group flex flex-col overflow-hidden"
      style={{ willChange: "transform" }}
    >
      {/* Glass inner */}
      <div className="flex flex-col flex-1 p-5">

        {/* Header — always visible */}
        <div className="flex items-start justify-between gap-2 mb-3.5">
          <div className="flex-1 min-w-0">
            {card.title && (
              <h3 className="font-display font-semibold text-base sm:text-lg leading-tight line-clamp-2"
                style={{ color: "hsl(25 35% 14%)" }}>
                {card.title}
              </h3>
            )}
          </div>
          <SourceBadge source={(card as PrayerCard).source} status={card.status} />
        </div>

        {/* Prayer text — truncated with See more, click to collapse chrome */}
        <div className="select-none">
          <p
            className={`${textClass} leading-relaxed cursor-pointer`}
            style={{ color: "hsl(25 28% 28%)" }}
            onClick={() => setCollapsed(v => !v)}
          >
            {isTruncated && !expanded
              ? card.prayer_text.slice(0, PRAYER_CHAR_LIMIT).trimEnd() + "…"
              : card.prayer_text}
          </p>
          {isTruncated && (
            <button
              onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
              className="mt-1.5 text-xs font-medium transition-colors"
              style={{ color: "hsl(42 75% 40%)" }}
            >
              {expanded ? "See less" : "See more…"}
            </button>
          )}
        </div>

        {/* Collapsible chrome: scripture / tags / actions / comments */}
        <AnimatePresence initial={false}>
          {!collapsed ? (
            <motion.div
              key="chrome"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-3.5 mt-3.5">

                {/* Bottom-row toggles: scripture ←→ tags */}
                <div className="flex items-center justify-between gap-2">
                  {/* Show scripture (left) */}
                  {card.extended_prayer ? (
                    <button
                      onClick={() => setScriptureOpen(v => !v)}
                      className="text-xs font-medium flex items-center gap-1 transition-colors"
                      style={{ color: "hsl(42 75% 40%)" }}
                    >
                      <motion.div animate={{ rotate: scriptureOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </motion.div>
                      {scriptureOpen ? "Hide scripture" : "Show scripture"}
                    </button>
                  ) : <div />}

                  {/* Show tags (right) */}
                  {card.tags && card.tags.length > 0 && (
                    <button
                      onClick={() => setTagsOpen(v => !v)}
                      className="text-xs font-medium flex items-center gap-1 transition-colors"
                      style={{ color: "hsl(42 75% 40%)" }}
                    >
                      <Tag className="w-3 h-3" />
                      {tagsOpen ? "Hide tags" : "Tags"}
                      <motion.div animate={{ rotate: tagsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-3 h-3" />
                      </motion.div>
                    </button>
                  )}
                </div>

                {/* Scripture accordion */}
                <AnimatePresence>
                  {scriptureOpen && card.extended_prayer && (
                    <motion.p
                      key="scripture"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="verse-text text-sm overflow-hidden leading-relaxed"
                    >
                      {renderWithVerseLinks(card.extended_prayer)}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Tags accordion */}
                <AnimatePresence>
                  {tagsOpen && card.tags && card.tags.length > 0 && (
                    <motion.div
                      key="tags"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-wrap gap-1.5 overflow-hidden"
                    >
                      {card.tags.map(tag => {
                        const palette = TAG_PALETTE[tag] || DEFAULT_TAG;
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

                {/* Action row */}
                <div className="flex items-center gap-0.5 pt-2 border-t" style={{ borderColor: "hsl(38 22% 90%)" }}>
                  <motion.button
                    onClick={toggleLike}
                    animate={likeAnim ? { scale: [1, 1.4, 1] } : {}}
                    transition={{ duration: 0.35 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-accent/60"
                    style={{ color: liked ? "hsl(0 72% 51%)" : "hsl(25 18% 56%)" }}
                  >
                    <Heart className={`w-3.5 h-3.5 transition-all ${liked ? "fill-current scale-110" : ""}`} />
                    <span>{likesCount}</span>
                  </motion.button>

                  <div className="relative">
                    <AnimatePresence>
                      {prayedFloat && (
                        <motion.span
                          key="prayed-float"
                          initial={{ opacity: 1, y: 0, x: "-50%" }}
                          animate={{ opacity: 0, y: -32 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1.1, ease: "easeOut" }}
                          className="absolute left-1/2 bottom-full mb-1 text-xs font-semibold pointer-events-none select-none whitespace-nowrap"
                          style={{ color: "hsl(42 75% 40%)" }}
                        >
                          🙏 Prayed
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <motion.button
                      onClick={togglePrayed}
                      animate={prayAnim ? { scale: [1, 1.35, 1] } : {}}
                      transition={{ duration: 0.35 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-accent/60"
                      style={{ color: prayed ? "hsl(42 75% 40%)" : "hsl(25 18% 56%)" }}
                      title="I prayed this"
                    >
                      <PrayingHandsIcon className={`w-3.5 h-3.5 ${prayed ? "fill-none stroke-current" : ""}`} />
                      <span>{prayedCount}</span>
                    </motion.button>
                  </div>

                  <div className="flex-1" />

                  {/* Listen button */}
                  <motion.button
                    onClick={toggleTts}
                    whileTap={{ scale: 0.85 }}
                    title={ttsPlaying ? "Stop reading" : "Listen to prayer"}
                    className="p-1.5 rounded-lg transition-all hover:bg-accent/60 relative"
                    style={{ color: ttsPlaying ? "hsl(42 75% 40%)" : "hsl(25 18% 56%)" }}
                  >
                    {ttsLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : ttsPlaying ? (
                      <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <VolumeX className="w-3.5 h-3.5" />
                      </motion.div>
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </motion.button>

                  {/* Share button */}
                  <motion.button
                    onClick={e => {
                      e.stopPropagation();
                      const url = `${window.location.origin}/prayer/${card.id}`;
                      navigator.clipboard.writeText(url).then(() => {
                        toast({ title: "Link copied! 🔗" });
                      });
                    }}
                    whileTap={{ scale: 0.85 }}
                    title="Share prayer"
                    className="p-1.5 rounded-lg transition-all hover:bg-accent/60"
                    style={{ color: "hsl(25 18% 56%)" }}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </motion.button>

                  <Link
                    to={`/prayer/${card.id}`}
                    onClick={e => e.stopPropagation()}
                    className="p-1.5 rounded-lg transition-all hover:bg-accent/60"
                    style={{ color: "hsl(25 18% 56%)" }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>

                  <motion.button
                    onClick={toggleSave}
                    whileTap={{ scale: 0.85 }}
                    className="p-1.5 rounded-lg transition-all hover:bg-accent/60"
                    style={{ color: saved ? "hsl(42 75% 40%)" : "hsl(25 18% 56%)" }}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-current" : ""}`} />
                  </motion.button>
                </div>

                {/* Comments */}
                <Comments prayerId={card.id} uploaderId={card.source === "community" ? (card.created_by ?? null) : null} />
              </div>
            </motion.div>
          ) : (
            /* Collapsed state — bouncing up arrow tap target */
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex justify-center items-end cursor-pointer mt-3 pb-1"
              style={{ minHeight: 32 }}
              onClick={() => setCollapsed(false)}
            >
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <ChevronUp className="w-5 h-5" style={{ color: "hsl(42 75% 55%)" }} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="prayer-card-premium p-5 space-y-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="h-5 w-2/3 rounded-lg shimmer" />
        <div className="h-4 w-14 rounded-full shimmer" />
      </div>
      <div className="space-y-2">
        <div className="h-3.5 w-full rounded shimmer" />
        <div className="h-3.5 w-5/6 rounded shimmer" />
        <div className="h-3.5 w-4/5 rounded shimmer" />
        <div className="h-3.5 w-3/4 rounded shimmer" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-5 w-14 rounded-full shimmer" />
        <div className="h-5 w-16 rounded-full shimmer" />
      </div>
      <div className="flex gap-2 pt-2 border-t border-border">
        <div className="h-7 w-14 rounded-lg shimmer" />
        <div className="h-7 w-14 rounded-lg shimmer" />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const POPULAR_TAGS = ["daily-prayer", "peace", "faith", "morning-prayer", "healing", "forgiveness", "lords-prayer", "intercession"];

export default function Prayers() {
  const [cards, setCards] = useState<PrayerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [showCommunity, setShowCommunity] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);

  // Pick up ?q= from homepage search
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  const fetchPrayers = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("prayer_cards")
      .select("*")
      .in("status", ["approved", "ai_generated"])
      .order("likes_count", { ascending: false });

    if (!showCommunity) q = q.eq("source", "admin");
    if (activeTag) q = q.contains("tags", [activeTag]);
    if (search) q = q.textSearch("prayer_text", search, { type: "websearch" });

    const { data } = await q.limit(50);
    setCards((data as PrayerCard[]) || []);
    setLoading(false);
  }, [search, activeTag, showCommunity]);

  useEffect(() => { fetchPrayers(); }, [fetchPrayers]);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, hsl(38 60% 97%) 0%, hsl(42 55% 96%) 35%, hsl(38 50% 98%) 100%)" }}>

      {/* ── Sticky nav ────────────────────────────────────────────────── */}
      <SiteNav
        rightSlot={
          user ? (
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5 text-xs hidden sm:flex" onClick={() => setAddOpen(true)}>
              <Plus className="w-3.5 h-3.5" />Add Prayer
            </Button>
          ) : undefined
        }
      />

      {/* ── Hero intro section ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-14 pb-10 sm:pt-20 sm:pb-14">
        {/* Background orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{ background: "hsl(42 85% 68% / 0.12)" }} />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{ background: "hsl(150 40% 46% / 0.07)" }} />

        <motion.div
          initial="hidden" animate="show" variants={heroStagger}
          className="container mx-auto px-4 max-w-3xl text-center space-y-5 relative"
        >
          <motion.p variants={fadeUp}
            className="text-xs tracking-[0.3em] uppercase font-medium"
            style={{ color: "hsl(42 75% 45%)" }}>
            Prayer Collections
          </motion.p>

          <motion.h1 variants={fadeUp}
            className="font-display font-bold text-4xl sm:text-5xl md:text-6xl leading-tight"
            style={{ color: "hsl(25 35% 14%)" }}>
            Discover Prayers That
            <br />
            <span style={{
              background: "linear-gradient(135deg, hsl(42 85% 42%), hsl(35 82% 54%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}>
              Strengthen Your Faith
            </span>
          </motion.h1>

          <motion.blockquote variants={fadeUp}
            className="font-display italic text-base sm:text-lg leading-relaxed max-w-xl mx-auto breathe"
            style={{ color: "hsl(25 28% 42%)" }}>
            "Do not be anxious about anything, but in every situation, by prayer and petition,
            with thanksgiving, present your requests to God. And the peace of God, which transcends
            all understanding, will guard your hearts."
          </motion.blockquote>

          <motion.p variants={fadeUp} className="text-xs font-medium" style={{ color: "hsl(42 65% 50%)" }}>
            — {renderWithVerseLinks("Philippians 4:6-7")}
          </motion.p>

          {/* Decorative divider */}
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 py-1">
            <div className="h-px w-16 rounded-full" style={{ background: "linear-gradient(to right, transparent, hsl(42 75% 60%))" }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(42 75% 55%)" }} />
            <div className="h-px w-16 rounded-full" style={{ background: "linear-gradient(to left, transparent, hsl(42 75% 60%))" }} />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Search + Filters ───────────────────────────────────────────── */}
      <section className="sticky top-16 z-30 py-4 border-b"
        style={{ borderColor: "hsl(38 22% 90%)", background: "hsl(38 55% 97% / 0.95)", backdropFilter: "blur(12px)" }}>
        <div className="container mx-auto px-4 max-w-4xl space-y-3">

          {/* Search bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 pointer-events-none z-10"
                style={{ color: "hsl(25 18% 56%)" }} />
              <Input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search prayers…"
                className="pl-10 pr-4 h-10 rounded-2xl border-2 text-sm transition-all duration-200 focus-visible:ring-0"
                style={{
                  borderColor: search ? "hsl(42 75% 55%)" : "hsl(38 22% 86%)",
                  background: "hsl(38 60% 99%)",
                  boxShadow: search ? "0 0 0 3px hsl(42 75% 55% / 0.12)" : undefined
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full transition-colors hover:bg-muted"
                >
                  <X className="w-3.5 h-3.5" style={{ color: "hsl(25 18% 56%)" }} />
                </button>
              )}
            </div>

            {/* Community toggle */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowCommunity(v => !v)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border-2 text-sm font-medium transition-all flex-shrink-0"
              style={{
                borderColor: showCommunity ? "hsl(150 38% 46%)" : "hsl(38 22% 86%)",
                background: showCommunity ? "hsl(150 30% 94%)" : "hsl(38 60% 99%)",
                color: showCommunity ? "hsl(150 38% 28%)" : "hsl(25 18% 50%)",
                boxShadow: showCommunity ? "0 0 0 3px hsl(150 38% 46% / 0.12)" : undefined
              }}
              title={showCommunity ? "Showing all prayers" : "Curated only"}
            >
              <motion.div animate={{ rotate: showCommunity ? 0 : 0 }}>
                {showCommunity ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              </motion.div>
              <span className="hidden sm:inline">Community</span>
              <Users className="w-3.5 h-3.5 sm:hidden" />
            </motion.button>
          </div>

          {/* Tag chips */}
          <div className="flex flex-wrap gap-1.5">
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => setActiveTag("")}
              className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
              style={!activeTag ? {
                background: "hsl(42 85% 46%)",
                borderColor: "hsl(42 85% 40%)",
                color: "hsl(0 0% 100%)",
                boxShadow: "0 2px 10px -2px hsl(42 85% 46% / 0.4)"
              } : {
                background: "hsl(38 60% 99%)",
                borderColor: "hsl(38 22% 86%)",
                color: "hsl(25 18% 50%)"
              }}
            >
              All
            </motion.button>
            {POPULAR_TAGS.map(tag => {
              const active = activeTag === tag;
              const pal = TAG_PALETTE[tag] || DEFAULT_TAG;
              return (
                <motion.button
                  key={tag}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => setActiveTag(active ? "" : tag)}
                  className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
                  style={active ? {
                    background: "hsl(42 85% 46%)",
                    borderColor: "hsl(42 85% 40%)",
                    color: "hsl(0 0% 100%)",
                    boxShadow: "0 2px 10px -2px hsl(42 85% 46% / 0.4)"
                  } : {
                    background: pal.bg,
                    borderColor: "transparent",
                    color: pal.text
                  }}
                >
                  #{tag}
                </motion.button>
              );
            })}
          </div>

          {/* Source legend pills */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "hsl(25 18% 56%)" }}>
              <ShieldCheck className="w-3 h-3" style={{ color: "hsl(210 50% 50%)" }} />Curated
            </span>
            {showCommunity && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: "hsl(25 18% 56%)" }}>
                <Users className="w-3 h-3" style={{ color: "hsl(150 38% 34%)" }} />Community
              </span>
            )}
            <span className="flex items-center gap-1 text-[11px]" style={{ color: "hsl(25 18% 56%)" }}>
              <Sparkles className="w-3 h-3" style={{ color: "hsl(42 75% 45%)" }} />AI-generated
            </span>
          </div>
        </div>
      </section>

      {/* ── Card grid ─────────────────────────────────────────────────── */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTag}-${showCommunity}-${search}`}
              initial="hidden"
              animate="show"
              variants={pageVariants}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {cards.map(card => (
                <PrayerCardItem key={card.id} card={card} userId={user?.id ?? null} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Empty state */}
        {!loading && cards.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 space-y-8"
          >
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
              style={{ background: "hsl(42 80% 92%)" }}>
              <Search className="w-7 h-7" style={{ color: "hsl(42 75% 45%)" }} />
            </div>
            <div className="space-y-2">
              <p className="font-display text-lg font-semibold" style={{ color: "hsl(25 35% 20%)" }}>
                No prayers found
              </p>
              <p className="text-sm" style={{ color: "hsl(25 18% 56%)" }}>
                {showCommunity
                  ? "Try adjusting your search or tag filters."
                  : "No curated prayers found. Try enabling Community prayers or clearing filters."}
              </p>
            </div>
            <Link to="/assistant">
              <Button className="btn-gold rounded-xl gap-2">
                <Sparkles className="w-4 h-4" />Try PrayerAssist.ing
              </Button>
            </Link>
          </motion.div>
        )}
      </main>

      <AddPrayerModal open={addOpen} onOpenChange={setAddOpen} onSuccess={fetchPrayers} />
    </div>
  );
}
