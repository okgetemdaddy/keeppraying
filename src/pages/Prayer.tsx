import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Comments from "@/components/Comments";
import type { Database } from "@/integrations/supabase/types";
import {
  ArrowLeft, Heart, Bookmark, Share2, Sparkles, Loader2,
  ChevronDown, Tag, Volume2, VolumeX, ListPlus, Users, ShieldCheck, Bird,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import VerseLink from "@/components/VerseLink";
import TtsLoadingPopup from "@/components/TtsLoadingPopup";
import { renderWithVerseLinks } from "@/lib/renderWithVerseLinks";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TestifyBack } from "@/components/board/TestifyBack";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SiteNav } from "@/components/SiteNav";
import { PRAYER_FONTS } from "@/components/board/BoardCard";
import { TtsContemplationOverlay } from "@/components/TtsContemplationOverlay";

type PrayerCard = Database['public']['Tables']['prayer_cards']['Row'];

// ── Inline praying hands SVG (matches Prayers.tsx) ────────────────────────────
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

// ── Tag palette (matches Prayers.tsx) ─────────────────────────────────────────
const LABEL_PALETTE: Record<string, { bg: string; text: string }> = {
  "healing":        { bg: "hsl(150 40% 88%)", text: "hsl(150 38% 26%)" },
  "peace":          { bg: "hsl(210 55% 88%)", text: "hsl(210 55% 30%)" },
  "faith":          { bg: "hsl(42 80% 92%)",  text: "hsl(38 75% 32%)" },
  "forgiveness":    { bg: "hsl(280 35% 88%)", text: "hsl(280 40% 30%)" },
  "intercession":   { bg: "hsl(150 30% 88%)", text: "hsl(150 38% 28%)" },
};
const DEFAULT_LABEL = { bg: "hsl(42 80% 90%)", text: "hsl(38 75% 35%)" };

// ── Source badge ──────────────────────────────────────────────────────────────
function SourceBadge({ source, status }: { source?: string | null; status: string }) {
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

function loadFont(url: string) {
  if (document.querySelector(`link[href="${url}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet"; link.href = url;
  document.head.appendChild(link);
}

export default function Prayer() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [card, setCard] = useState<PrayerCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [prayed, setPrayed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [prayedCount, setPrayedCount] = useState(0);
  const [likeAnim, setLikeAnim] = useState(false);
  const [prayAnim, setPrayAnim] = useState(false);
  const [prayedFloat, setPrayedFloat] = useState(false);

  // Scripture / labels accordion
  const [scriptureOpen, setScriptureOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);

  // TTS
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [timedPhrases, setTimedPhrases] = useState<{ text: string; start: number }[] | null>(null);

  // Testify
  const [testifyOpen, setTestifyOpen] = useState(false);
  const [testimonyCount, setTestimonyCount] = useState(0);

  // Playlist
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [userPlaylists, setUserPlaylists] = useState<{ id: string; name: string; prayer_ids: string[] | null }[]>([]);
  const [savingPlaylist, setSavingPlaylist] = useState(false);

  // Font
  const activeFontFamily = card?.text_style
    ? PRAYER_FONTS.find(f => f.family === card.text_style)?.family ?? null
    : null;

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data } = await supabase.from("prayer_cards").select("*").eq("id", id).single();
      setCard(data);
      if (data) {
        document.title = `${data.title || data.prayer_text.slice(0, 50)}… | KeepPray.ing`;
        setLikesCount(data.likes_count);
        setPrayedCount(data.prayed_count);
        // Pre-load the font if set
        const font = PRAYER_FONTS.find(f => f.family === data.text_style);
        if (font) loadFont(font.url);
        // Increment views
        await supabase.from("prayer_cards").update({ views: (data.views || 0) + 1 }).eq("id", id);
      }
      setLoading(false);
    };
    load();
    return () => { document.title = "KeepPray.ing"; };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    supabase.from("testimonies").select("id", { count: "exact", head: true }).eq("prayer_id", id)
      .then(({ count }) => setTestimonyCount(count || 0));
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    const check = async () => {
      const [{ data: like }, { data: pray }, { data: save }] = await Promise.all([
        supabase.from("likes").select("id").eq("prayer_id", id).eq("user_id", user.id).maybeSingle(),
        supabase.from("prayed_actions").select("id").eq("prayer_id", id).eq("user_id", user.id).maybeSingle(),
        supabase.from("user_saved_prayers").select("id").eq("prayer_id", id).eq("user_id", user.id).maybeSingle(),
      ]);
      setLiked(!!like); setPrayed(!!pray); setSaved(!!save);
    };
    check();
  }, [user, id]);

  // Load user playlists for the "Add to Playlist" dialog
  useEffect(() => {
    if (!user) return;
    supabase.from("prayer_playlists").select("id,name,prayer_ids").eq("user_id", user.id)
      .then(({ data }) => setUserPlaylists((data || []) as { id: string; name: string; prayer_ids: string[] | null }[]));
  }, [user]);

  // ── Actions ───────────────────────────────────────────────────────────────────
  const toggleLike = async () => {
    if (!user) { toast({ title: "Sign in to like prayers" }); return; }
    setLikeAnim(true); setTimeout(() => setLikeAnim(false), 400);
    if (liked) {
      await supabase.from("likes").delete().eq("prayer_id", id!).eq("user_id", user.id);
      setLiked(false); setLikesCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from("likes").insert({ prayer_id: id!, user_id: user.id });
      setLiked(true); setLikesCount(c => c + 1);
    }
  };

  const prayedCooldownRef = useRef(false);
  const togglePrayed = async () => {
    if (!user) { toast({ title: "Sign in to track prayers" }); return; }
    if (prayedCooldownRef.current) return;
    prayedCooldownRef.current = true;
    setTimeout(() => { prayedCooldownRef.current = false; }, 3000);
    setPrayAnim(true); setTimeout(() => setPrayAnim(false), 400);
    if (prayed) {
      await supabase.from("prayed_actions").delete().eq("prayer_id", id!).eq("user_id", user.id);
      setPrayed(false); setPrayedCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from("prayed_actions").insert({ prayer_id: id!, user_id: user.id });
      setPrayed(true); setPrayedCount(c => c + 1);
      setPrayedFloat(true); setTimeout(() => setPrayedFloat(false), 1200);
      toast({ title: "Prayer recorded 🙏" });
    }
  };

  const toggleSave = async () => {
    if (!user) { toast({ title: "Sign in to save prayers" }); return; }
    if (saved) {
      await supabase.from("user_saved_prayers").delete().eq("prayer_id", id!).eq("user_id", user.id);
      setSaved(false);
    } else {
      await supabase.from("user_saved_prayers").insert({ prayer_id: id!, user_id: user.id });
      setSaved(true); toast({ title: "Saved to your board 📌" });
    }
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: card?.title || "A Prayer", url });
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied! 🔗", description: "Share this prayer with someone who needs it." });
    }
  };

  const toggleTts = async () => {
    if (ttsPlaying && audioRef.current) {
      audioRef.current.pause(); audioRef.current.currentTime = 0;
      setTtsPlaying(false); return;
    }
    if (ttsLoading || !card) return;
    setTtsLoading(true);

    const audio = new Audio();
    audioRef.current = audio;
    audio.onended = () => setTtsPlaying(false);
    audio.onerror = () => setTtsPlaying(false);

    try {
      // Check for cached audio
      if ((card as any).audio_url) {
        audio.src = (card as any).audio_url;
        // Try loading cached phrases JSON
        try {
          const phrasesUrl = supabase.storage.from("prayer-audio").getPublicUrl(`${card.id}_phrases.json`).data.publicUrl;
          const phrasesResp = await fetch(phrasesUrl);
          if (phrasesResp.ok) {
            const phrases = await phrasesResp.json();
            if (Array.isArray(phrases)) setTimedPhrases(phrases);
          }
        } catch { /* no cached phrases, use fallback */ }
        await audio.play();
        setTtsPlaying(true);
        setTtsLoading(false);
        return;
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prayer-tts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ text: card.prayer_text }),
        }
      );
      if (!resp.ok) throw new Error("Could not generate speech");
      const data = await resp.json();

      // Decode base64 audio to blob
      const binaryStr = atob(data.audio);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const blob = new Blob([bytes], { type: "audio/mpeg" });

      // Set timed phrases if available
      if (data.timedPhrases && Array.isArray(data.timedPhrases)) {
        setTimedPhrases(data.timedPhrases);
      }

      // Cache audio + phrases to storage
      const storagePath = `${card.id}.mp3`;
      const { error: uploadErr } = await supabase.storage
        .from("prayer-audio")
        .upload(storagePath, blob, { contentType: "audio/mpeg", upsert: true });
      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage.from("prayer-audio").getPublicUrl(storagePath);
        await supabase.from("prayer_cards").update({ audio_url: publicUrl } as any).eq("id", card.id);
      }
      // Cache phrases JSON
      if (data.timedPhrases) {
        const phrasesBlob = new Blob([JSON.stringify(data.timedPhrases)], { type: "application/json" });
        await supabase.storage.from("prayer-audio").upload(`${card.id}_phrases.json`, phrasesBlob, { contentType: "application/json", upsert: true });
      }

      const url = URL.createObjectURL(blob);
      audio.src = url;
      audio.onended = () => { setTtsPlaying(false); URL.revokeObjectURL(url); };
      await audio.play();
      setTtsPlaying(true);
    } catch {
      toast({ title: "Could not read prayer", variant: "destructive" });
    } finally {
      setTtsLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: string | "new") => {
    if (!user || !card) return;
    setSavingPlaylist(true);
    try {
      if (playlistId === "new") {
        if (!playlistName.trim()) return;
        await supabase.from("prayer_playlists").insert({ user_id: user.id, name: playlistName.trim(), prayer_ids: [card.id] });
        toast({ title: `Playlist "${playlistName}" created! 🎵` });
        setPlaylistName("");
        // refresh
        const { data } = await supabase.from("prayer_playlists").select("id,name,prayer_ids").eq("user_id", user.id);
        setUserPlaylists((data || []) as { id: string; name: string; prayer_ids: string[] | null }[]);
      } else {
        const pl = userPlaylists.find(p => p.id === playlistId);
        if (!pl) return;
        const existing = pl.prayer_ids || [];
        if (existing.includes(card.id)) { toast({ title: "Already in this playlist" }); return; }
        await supabase.from("prayer_playlists").update({ prayer_ids: [...existing, card.id] }).eq("id", playlistId);
        toast({ title: `Added to "${pl.name}" 🎵` });
      }
      setPlaylistOpen(false);
    } catch {
      toast({ title: "Could not update playlist", variant: "destructive" });
    } finally {
      setSavingPlaylist(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!card) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground font-display italic">Prayer not found.</p>
      <Link to="/prayers"><Button className="btn-gold rounded-xl">Browse Prayers</Button></Link>
    </div>
  );

  const textFontFamily = activeFontFamily ? `"${activeFontFamily}", serif` : undefined;

  return (
    <div className="min-h-screen bg-background">
      <TtsContemplationOverlay
        playing={ttsPlaying}
        onStop={() => {
          if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
          setTtsPlaying(false);
        }}
        onPause={() => { if (audioRef.current) audioRef.current.pause(); }}
        onResume={() => { if (audioRef.current) audioRef.current.play(); }}
        text={card?.prayer_text}
        playbackRate={playbackRate}
        onPlaybackRateChange={(r) => {
          setPlaybackRate(r);
          if (audioRef.current) audioRef.current.playbackRate = r;
        }}
        timedPhrases={timedPhrases}
        audioRef={audioRef}
      />
      {/* Background */}
      {card.background_url && (
        <div className="fixed inset-0 z-0">
          <img
            src={card.background_url}
            alt=""
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.65) 100%)" }} />
        </div>
      )}

      <div className="relative z-10">
        <SiteNav />

        <div className="container mx-auto px-4 py-10 max-w-2xl">
          {/* Back */}
          <Link to="/prayers" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm mb-6">
            <ArrowLeft className="w-4 h-4" />Back to Prayers
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="prayer-card-premium flex flex-col overflow-hidden"
          >
            <div className="flex flex-col flex-1 p-6 sm:p-8">

              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  {card.title && (
                    <h1 className="font-display text-2xl sm:text-3xl font-bold leading-snug"
                      style={{ color: "hsl(25 35% 14%)" }}>
                      {card.title}
                    </h1>
                  )}
                </div>
                <SourceBadge source={card.source} status={card.status} />
              </div>

              {/* Prayer text */}
              <p
                className="leading-[1.85] text-base sm:text-lg"
                style={{
                  color: "hsl(25 28% 28%)",
                  fontFamily: textFontFamily,
                  whiteSpace: "pre-wrap",
                }}
              >
                {card.prayer_text}
              </p>

              {/* Scripture / Labels row + accordions */}
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
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
                  {card.labels && card.labels.length > 0 && (
                    <button
                      onClick={() => setLabelsOpen(v => !v)}
                      className="text-xs font-medium flex items-center gap-1 transition-colors"
                      style={{ color: "hsl(42 75% 40%)" }}
                    >
                      <Tag className="w-3 h-3" />
                      {labelsOpen ? "Hide labels" : "Labels"}
                      <motion.div animate={{ rotate: labelsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-3 h-3" />
                      </motion.div>
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {scriptureOpen && card.extended_prayer && (
                    <motion.div
                      key="scripture"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <blockquote className="border-l-2 border-primary/50 pl-4 verse-text text-sm leading-relaxed">
                        {renderWithVerseLinks(card.extended_prayer)}
                      </blockquote>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {labelsOpen && card.labels && card.labels.length > 0 && (
                    <motion.div
                      key="labels"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
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
              </div>

              {/* ── Action row ──────────────────────────────────────────────── */}
              <div className="flex items-center gap-0.5 pt-4 mt-4 border-t" style={{ borderColor: "hsl(38 22% 90%)" }}>
                {/* Like */}
                <motion.button
                  onClick={toggleLike}
                  animate={likeAnim ? { scale: [1, 1.4, 1] } : {}}
                  transition={{ duration: 0.35 }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-accent/60"
                  style={{ color: liked ? "hsl(0 72% 51%)" : "hsl(25 18% 56%)" }}
                  title="Like"
                >
                  <Heart className={`w-4 h-4 transition-all ${liked ? "fill-current scale-110" : ""}`} />
                  <span>{likesCount}</span>
                </motion.button>

                {/* Prayed */}
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
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-accent/60"
                    style={{ color: prayed ? "hsl(42 75% 40%)" : "hsl(25 18% 56%)" }}
                    title="I prayed this"
                  >
                    <PrayingHandsIcon className="w-4 h-4" />
                    <span>{prayedCount} prayed</span>
                  </motion.button>
                </div>

                <div className="flex-1" />

                {/* Listen */}
                <div className="relative">
                  <TtsLoadingPopup visible={ttsLoading && !ttsPlaying} />
                  <motion.button
                    onClick={toggleTts}
                    whileTap={{ scale: 0.85 }}
                    title={ttsPlaying ? "Stop reading" : "Listen to prayer"}
                    className="p-2 rounded-xl transition-all hover:bg-accent/60"
                    style={{ color: ttsPlaying ? "hsl(42 75% 40%)" : "hsl(25 18% 56%)" }}
                  >
                    {ttsLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : ttsPlaying ? (
                      <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}>
                        <VolumeX className="w-4 h-4" />
                      </motion.div>
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </motion.button>
                </div>

                {/* Add to playlist */}
                <motion.button
                  onClick={() => {
                    if (!user) { toast({ title: "Sign in to use playlists" }); return; }
                    setPlaylistOpen(true);
                  }}
                  whileTap={{ scale: 0.85 }}
                  title="Add to playlist"
                  className="p-2 rounded-xl transition-all hover:bg-accent/60"
                  style={{ color: "hsl(25 18% 56%)" }}
                >
                  <ListPlus className="w-4 h-4" />
                </motion.button>

                {/* Share */}
                <motion.button
                  onClick={share}
                  whileTap={{ scale: 0.85 }}
                  title="Share"
                  className="p-2 rounded-xl transition-all hover:bg-accent/60"
                  style={{ color: "hsl(25 18% 56%)" }}
                >
                  <Share2 className="w-4 h-4" />
                </motion.button>

                {/* Save */}
                <motion.button
                  onClick={toggleSave}
                  whileTap={{ scale: 0.85 }}
                  title={saved ? "Saved" : "Save to board"}
                  className="p-2 rounded-xl transition-all hover:bg-accent/60"
                  style={{ color: saved ? "hsl(42 75% 40%)" : "hsl(25 18% 56%)" }}
                >
                  <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
                </motion.button>

                {/* Testify */}
                <motion.button
                  onClick={() => setTestifyOpen(true)}
                  whileTap={{ scale: 0.85 }}
                  title="Share testimony"
                  className="flex items-center gap-1 p-2 rounded-xl transition-all hover:bg-accent/60"
                  style={{ color: testimonyCount > 0 ? "hsl(42 75% 40%)" : "hsl(25 18% 56%)" }}
                >
                  <Bird className="w-4 h-4" />
                  {testimonyCount > 0 && <span className="text-xs">{testimonyCount}</span>}
                </motion.button>
              </div>

              {/* Comments */}
              <div className="mt-4">
                <Comments prayerId={card.id} uploaderId={card.source === "community" ? (card.created_by ?? null) : null} />
              </div>
            </div>
          </motion.div>

          <div className="text-center mt-8">
            <p className="verse-text text-sm mb-4 flex items-center justify-center gap-1">
              "Pray without ceasing." — <VerseLink reference="1 Thessalonians 5:17" text="Pray without ceasing." />
            </p>
            <Link to="/prayers"><Button variant="outline" className="rounded-xl">Browse More Prayers</Button></Link>
          </div>
        </div>
      </div>

      {/* ── Testify Sheet ──────────────────────────────────────────────────────── */}
      <Sheet open={testifyOpen} onOpenChange={setTestifyOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Testify</SheetTitle>
          </SheetHeader>
          <TestifyBack
            prayerId={card.id}
            prayerAuthorId={card.created_by}
            onFlipBack={() => setTestifyOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* ── Add to Playlist Dialog ─────────────────────────────────────────────── */}
      <Dialog open={playlistOpen} onOpenChange={setPlaylistOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Add to Playlist</DialogTitle>
            <DialogDescription>Choose an existing playlist or create a new one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            {userPlaylists.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {userPlaylists.map(pl => (
                  <button
                    key={pl.id}
                    onClick={() => handleAddToPlaylist(pl.id)}
                    disabled={savingPlaylist}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium border hover:bg-accent transition-colors"
                    style={{ borderColor: "hsl(38 22% 88%)" }}
                  >
                    🎵 {pl.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({pl.prayer_ids?.length || 0} prayers)
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Input
                placeholder="New playlist name…"
                value={playlistName}
                onChange={e => setPlaylistName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddToPlaylist("new")}
                className="rounded-xl flex-1"
              />
              <Button
                onClick={() => handleAddToPlaylist("new")}
                disabled={!playlistName.trim() || savingPlaylist}
                className="btn-gold rounded-xl shrink-0"
              >
                {savingPlaylist ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
