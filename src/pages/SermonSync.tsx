import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import VerseLink from "@/components/VerseLink";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SiteNav } from "@/components/SiteNav";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  BookOpen, Loader2, Sparkles, Check, ChevronDown, ChevronUp,
  Church, Youtube, ArrowRight, Heart, Plus, ExternalLink,
  Play, Crown, RefreshCw, Calendar, Clock,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

/* ─── Types ─── */
interface SermonPrayer {
  title: string;
  prayer_text: string;
  verses: string;
  labels: string[];
  timestamp_seconds?: number | null;
}

interface StandardResult {
  mode: "standard";
  sermonTitle: string;
  sermonNotes: string;
  prayers: SermonPrayer[];
}

interface PremiumSubtopic {
  title: string;
  explanation: string;
  illustration?: string | null;
  application_points?: string[];
  supporting_verses: string[];
  timestamp_seconds?: number | null;
}

interface DailyPrayer {
  day: string;
  prompt: string;
  verse: string;
}

interface PremiumResult {
  mode: "premium";
  sermonTitle: string;
  mainScripture: string;
  overallMessage: string;
  subtopics: PremiumSubtopic[];
  dailyPrayers: DailyPrayer[];
}

type SermonResult = StandardResult | PremiumResult;

/* ─── Helpers ─── */
const NOTIF_KEY = "sermon-prayer-notif-times";

function getNotifTimes(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || "{}"); }
  catch { return {}; }
}
function setNotifTime(day: string, time: string) {
  const t = getNotifTimes();
  t[day] = time;
  localStorage.setItem(NOTIF_KEY, JSON.stringify(t));
}

export default function SermonSync() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<"standard" | "premium" | null>(null);
  const [result, setResult] = useState<SermonResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [notesOpen, setNotesOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openSubtopics, setOpenSubtopics] = useState<Set<number>>(new Set());
  const [generatedPrayers, setGeneratedPrayers] = useState<Record<string, string>>({});
  const [generatingDay, setGeneratingDay] = useState<string | null>(null);
  const [videoId, setVideoId] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isValidYouTube = (u: string) =>
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(u);

  const extractVideoId = (u: string) => {
    const m = u.match(/(?:v=|youtu\.be\/|\/embed\/|\/v\/)([a-zA-Z0-9_-]{11})/);
    return m?.[1] || "";
  };

  const jumpToTimestamp = useCallback((seconds: number) => {
    const vid = videoId || extractVideoId(url);
    if (!vid) return;
    window.open(`https://www.youtube.com/watch?v=${vid}&t=${seconds}s`, "_blank");
  }, [videoId, url]);

  const handleSync = async (mode: "standard" | "premium") => {
    if (!url.trim() || !isValidYouTube(url)) {
      toast({ title: "Invalid URL", description: "Please paste a valid YouTube sermon link.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to use Sermon Mode.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setLoadingMode(mode);
    setResult(null);
    setSelected(new Set());
    setOpenSubtopics(new Set());
    setGeneratedPrayers({});

    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("No active session");

      // Step 1: Fetch transcript
      const transcriptResp = await supabase.functions.invoke("youtube-transcript", {
        body: { youtubeUrl: url },
      });

      if (transcriptResp.error) throw new Error(transcriptResp.error.message || "Transcript fetch failed");
      const transcript = transcriptResp.data;
      setVideoId(transcript.videoId);

      // Step 2: Analyze
      const syncResp = await supabase.functions.invoke("sermon-sync", {
        body: {
          transcript: transcript.fullText,
          rawSegments: transcript.raw,
          videoTitle: transcript.videoTitle,
          videoId: transcript.videoId,
          mode,
        },
      });

      if (syncResp.error) throw new Error(syncResp.error.message || "Analysis failed");
      const data = syncResp.data as SermonResult;
      setResult(data);

      // Auto-select all for standard mode
      if (data.mode === "standard") {
        setSelected(new Set(data.prayers.map((_, i) => i)));
      }
      if (navigator.vibrate) navigator.vibrate(30);
    } catch (e: unknown) {
      toast({
        title: "Sermon sync failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingMode(null);
    }
  };

  const togglePrayer = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const toggleSubtopic = (idx: number) => {
    setOpenSubtopics((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const generateDayPrayer = async (day: string, prompt: string) => {
    if (!result || !user) return;
    setGeneratingDay(day);
    try {
      const resp = await supabase.functions.invoke("sermon-generate-prayer", {
        body: { prompt, day, sermonTitle: result.sermonTitle },
      });
      if (resp.error) throw resp.error;
      setGeneratedPrayers((prev) => ({ ...prev, [day]: resp.data.prayer }));
    } catch {
      toast({ title: "Generation failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setGeneratingDay(null);
    }
  };

  const saveStandardSelected = async () => {
    if (!user || !result || result.mode !== "standard") return;
    const prayersToSave = result.prayers.filter((_, i) => selected.has(i));
    if (prayersToSave.length === 0) {
      toast({ title: "No prayers selected", description: "Select at least one prayer prompt to save." });
      return;
    }
    setSaving(true);
    try {
      for (const p of prayersToSave) {
        const metadata: Record<string, unknown> = {};
        if (videoId) metadata.videoId = videoId;
        if (p.timestamp_seconds != null) metadata.timestamp_seconds = p.timestamp_seconds;

        const { data: card, error: cardErr } = await supabase
          .from("prayer_cards")
          .insert({
            title: p.title,
            prayer_text: p.prayer_text + (p.verses ? `\n\n📖 ${p.verses}` : ""),
            labels: [...p.labels, "sermon-sync"],
            created_by: user.id,
            status: "approved",
            source: "community",
          })
          .select("id")
          .single();
        if (cardErr) throw cardErr;
        await supabase.from("user_saved_prayers").insert({
          user_id: user.id,
          prayer_id: card.id,
        });
      }
      if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
      toast({ title: "Prayers saved! 🙏", description: `${prayersToSave.length} prayer${prayersToSave.length > 1 ? "s" : ""} added to your Board.` });
      navigate("/board");
    } catch (e: unknown) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const savePremiumPrayers = async () => {
    if (!user || !result || result.mode !== "premium") return;
    const entries = Object.entries(generatedPrayers).filter(([, v]) => v.trim());
    if (entries.length === 0) {
      toast({ title: "No prayers generated", description: "Generate at least one daily prayer to save." });
      return;
    }
    setSaving(true);
    try {
      for (const [day, prayer] of entries) {
        const dayPrayer = (result as PremiumResult).dailyPrayers.find((d) => d.day === day);
        // Collect all application points from subtopics for this sermon
        const allAppPoints = (result as PremiumResult).subtopics
          .flatMap((s) => (s.application_points || []).map((ap) => ({ point: ap, subtopic: s.title })));
        const appMetadata = JSON.stringify({
          application_points: allAppPoints,
          videoId,
          sermonTitle: result.sermonTitle,
        });

        const { data: card, error: cardErr } = await supabase
          .from("prayer_cards")
          .insert({
            title: `${day} — ${result.sermonTitle}`,
            prayer_text: prayer + (dayPrayer?.verse ? `\n\n📖 ${dayPrayer.verse}` : ""),
            labels: ["sermon-sync", "daily-prayer", `sermon-${day.toLowerCase()}`],
            created_by: user.id,
            status: "approved",
            source: "community",
            meditation_essay: appMetadata,
          })
          .select("id")
          .single();
        if (cardErr) throw cardErr;
        await supabase.from("user_saved_prayers").insert({
          user_id: user.id,
          prayer_id: card.id,
        });
      }
      if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
      toast({ title: "Prayers saved! 🙏", description: `${entries.length} daily prayer${entries.length > 1 ? "s" : ""} added to your Board.` });
      navigate("/board");
    } catch (e: unknown) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const previewVideoId = url ? extractVideoId(url) : "";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />

      <div className="flex-1 container mx-auto px-4 py-8 max-w-3xl space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-gold flex items-center justify-center mx-auto shadow-gold">
            <Church className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Sermon Mode</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Paste your church's sermon link and let PrayerAssist extract prayer prompts and sermon notes — so the Word keeps working in your prayer life all week.
          </p>
          <Link to="/support#ai-stance" className="inline-block text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors">
            Our Stance on AI
          </Link>
        </motion.div>

        {/* YouTube input */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="prayer-card p-6 rounded-2xl space-y-4"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Youtube className="w-4 h-4 text-red-500" />
            Paste a YouTube sermon link
          </div>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="rounded-xl"
            onKeyDown={(e) => { if (e.key === "Enter") handleSync("standard"); }}
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => handleSync("standard")}
              disabled={loading || !url.trim()}
              className="btn-gold rounded-xl gap-2 flex-1"
            >
              {loadingMode === "standard" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loadingMode === "standard" ? "Analyzing…" : "Sync"}
            </Button>
            <Button
              onClick={() => handleSync("premium")}
              disabled={loading || !url.trim()}
              className="rounded-xl gap-2 flex-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-white hover:from-amber-600 hover:via-yellow-500 hover:to-amber-600 shadow-lg"
            >
              {loadingMode === "premium" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
              {loadingMode === "premium" ? "Deep Analyzing…" : "Premium Sync"}
            </Button>
          </div>

          {/* Video preview */}
          {previewVideoId && !loading && !result && (
            <div className="rounded-xl overflow-hidden border border-border aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${previewVideoId}`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Sermon preview"
              />
            </div>
          )}
        </motion.div>

        {/* Loading state */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 space-y-4"
            >
              <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
              <p className="verse-text text-sm">
                {loadingMode === "premium" ? "Deep-diving into the Word…" : "Meditating on the Word…"}
              </p>
              <p className="text-xs text-muted-foreground">
                {loadingMode === "premium"
                  ? "Extracting subtopics, illustrations, and daily prayer prompts"
                  : "Extracting prayer prompts and sermon notes"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Standard Results */}
        <AnimatePresence>
          {result && result.mode === "standard" && (
            <StandardResultView
              result={result}
              url={url}
              videoId={videoId}
              selected={selected}
              notesOpen={notesOpen}
              setNotesOpen={setNotesOpen}
              togglePrayer={togglePrayer}
              jumpToTimestamp={jumpToTimestamp}
              saveSelected={saveStandardSelected}
              saving={saving}
              user={user}
              onReset={() => { setResult(null); setUrl(""); }}
            />
          )}
        </AnimatePresence>

        {/* Premium Results */}
        <AnimatePresence>
          {result && result.mode === "premium" && (
            <PremiumResultView
              result={result}
              url={url}
              videoId={videoId}
              openSubtopics={openSubtopics}
              toggleSubtopic={toggleSubtopic}
              jumpToTimestamp={jumpToTimestamp}
              generatedPrayers={generatedPrayers}
              setGeneratedPrayers={setGeneratedPrayers}
              generatingDay={generatingDay}
              generateDayPrayer={generateDayPrayer}
              savePremiumPrayers={savePremiumPrayers}
              saving={saving}
              user={user}
              onReset={() => { setResult(null); setUrl(""); }}
            />
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!loading && !result && (
          <p className="verse-text text-sm text-center pt-4">
            "Your word is a lamp for my feet, a light on my path." — <VerseLink reference="Psalm 119:105" />
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Standard Result Component ─── */
function StandardResultView({
  result, url, videoId, selected, notesOpen, setNotesOpen,
  togglePrayer, jumpToTimestamp, saveSelected, saving, user, onReset,
}: {
  result: StandardResult;
  url: string;
  videoId: string;
  selected: Set<number>;
  notesOpen: boolean;
  setNotesOpen: (v: boolean) => void;
  togglePrayer: (i: number) => void;
  jumpToTimestamp: (s: number) => void;
  saveSelected: () => void;
  saving: boolean;
  user: unknown;
  onReset: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Title */}
      <div className="text-center">
        <h2 className="font-display text-xl font-bold text-foreground">{result.sermonTitle}</h2>
        {videoId && (
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors">
            Watch on YouTube <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Sermon Notes */}
      <div className="prayer-card rounded-2xl overflow-hidden">
        <button
          onClick={() => setNotesOpen(!notesOpen)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2 font-medium text-foreground">
            <BookOpen className="w-4 h-4 text-primary" />
            Sermon Notes
          </div>
          {notesOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        <AnimatePresence>
          {notesOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 prose prose-sm max-w-none text-foreground [&_li]:text-foreground/80 [&_strong]:text-foreground">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.sermonNotes}</ReactMarkdown>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Prayer Prompts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" />
            Prayer Prompts
          </h3>
          <span className="text-xs text-muted-foreground">
            {selected.size} of {result.prayers.length} selected
          </span>
        </div>

        {result.prayers.map((prayer, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`prayer-card rounded-2xl p-4 cursor-pointer transition-all border-2 ${
              selected.has(i) ? "border-primary/40 bg-primary/5" : "border-transparent hover:border-muted"
            }`}
          >
            <div className="flex items-start gap-3" onClick={() => togglePrayer(i)}>
              <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors ${
                selected.has(i) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {selected.has(i) ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm text-foreground">{prayer.title}</h4>
                  {prayer.timestamp_seconds != null && (
                    <button
                      onClick={(e) => { e.stopPropagation(); jumpToTimestamp(prayer.timestamp_seconds!); }}
                      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors flex-shrink-0"
                    >
                      <Play className="w-2.5 h-2.5" /> Jump to
                    </button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{prayer.prayer_text}</p>
                {prayer.verses && (
                  <p className="text-xs text-primary mt-2 font-medium">📖 {prayer.verses}</p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {prayer.labels.map((l) => (
                    <span key={l} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{l}</span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Save */}
      {user ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-3 items-center justify-center pt-4"
        >
          <Button
            onClick={saveSelected}
            disabled={saving || selected.size === 0}
            className="btn-gold rounded-xl gap-2 px-8 h-12 text-base"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Save {selected.size} Prayer{selected.size !== 1 ? "s" : ""} to My Board
          </Button>
          <Button variant="ghost" onClick={onReset} className="rounded-xl text-muted-foreground">
            Try another sermon
          </Button>
        </motion.div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">Sign in to save prayers to your Board</p>
          <Link to="/auth">
            <Button className="btn-gold rounded-xl gap-2">Sign In <ArrowRight className="w-4 h-4" /></Button>
          </Link>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Premium Result Component ─── */
function PremiumResultView({
  result, url, videoId, openSubtopics, toggleSubtopic, jumpToTimestamp,
  generatedPrayers, setGeneratedPrayers, generatingDay, generateDayPrayer,
  savePremiumPrayers, saving, user, onReset,
}: {
  result: PremiumResult;
  url: string;
  videoId: string;
  openSubtopics: Set<number>;
  toggleSubtopic: (i: number) => void;
  jumpToTimestamp: (s: number) => void;
  generatedPrayers: Record<string, string>;
  setGeneratedPrayers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  generatingDay: string | null;
  generateDayPrayer: (day: string, prompt: string) => void;
  savePremiumPrayers: () => void;
  saving: boolean;
  user: unknown;
  onReset: () => void;
}) {
  const notifTimes = getNotifTimes();
  const TIMES = ["Morning", "Afternoon", "Night"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium">
          <Crown className="w-3 h-3" /> Premium Sync
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">{result.sermonTitle}</h2>
        {result.mainScripture && (
          <p className="text-sm font-medium text-primary">
            <VerseLink reference={result.mainScripture} />
          </p>
        )}
        {videoId && (
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            Watch on YouTube <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Overall message */}
      <div className="prayer-card rounded-2xl p-5">
        <p className="text-sm text-foreground leading-relaxed">{result.overallMessage}</p>
      </div>

      {/* Subtopic Cards (Sermon Notes) */}
      <div className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          Sermon Notes
        </h3>

        {result.subtopics.map((sub, i) => (
          <Collapsible key={i} open={openSubtopics.has(i)} onOpenChange={() => toggleSubtopic(i)}>
            <div className="prayer-card rounded-2xl overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 font-semibold">
                      {i + 1}
                    </span>
                    <h4 className="font-semibold text-sm text-foreground truncate">{sub.title}</h4>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {sub.timestamp_seconds != null && (
                      <button
                        onClick={(e) => { e.stopPropagation(); jumpToTimestamp(sub.timestamp_seconds!); }}
                        className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
                      >
                        <Play className="w-2.5 h-2.5" /> Jump to
                      </button>
                    )}
                    {openSubtopics.has(i) ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-sm text-foreground/80 leading-relaxed">{sub.explanation}</p>

                  {/* Illustration - only if present */}
                  {sub.illustration && (
                    <div className="bg-muted/40 rounded-xl p-3 border-l-2 border-primary/30">
                      <p className="text-xs font-medium text-muted-foreground mb-1">💡 Illustration</p>
                      <p className="text-sm text-foreground/70 italic">{sub.illustration}</p>
                    </div>
                  )}

                  {/* Application Points */}
                  {sub.application_points && sub.application_points.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">🎯 Apply It</p>
                      {sub.application_points.map((ap, apIdx) => (
                        <div key={apIdx} className="flex items-start gap-2 pl-1">
                          <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{apIdx + 1}</span>
                          <p className="text-sm text-foreground/75 leading-relaxed">{ap}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Supporting verses */}
                  {sub.supporting_verses?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {sub.supporting_verses.map((v) => (
                        <span key={v} className="text-xs">
                          📖 <VerseLink reference={v} />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>

      {/* Daily Prayer Prompts */}
      <div className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Daily Prayer Prompts
        </h3>
        <p className="text-xs text-muted-foreground">
          Six prayers for the week ahead, inspired by this sermon.
        </p>

        {result.dailyPrayers.map((dp) => (
          <motion.div
            key={dp.day}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="prayer-card rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">{dp.day}</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <select
                  value={notifTimes[dp.day] || "Morning"}
                  onChange={(e) => setNotifTime(dp.day, e.target.value)}
                  className="text-[10px] bg-transparent text-muted-foreground border-none focus:ring-0 cursor-pointer"
                >
                  {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <p className="text-sm text-foreground/80 leading-relaxed">{dp.prompt}</p>
            <p className="text-xs text-primary font-medium">📖 <VerseLink reference={dp.verse} /></p>

            {/* Generated prayer area */}
            {generatedPrayers[dp.day] ? (
              <div className="space-y-2">
                <Textarea
                  value={generatedPrayers[dp.day]}
                  onChange={(e) => setGeneratedPrayers((prev) => ({ ...prev, [dp.day]: e.target.value }))}
                  className="min-h-[100px] text-sm rounded-xl bg-muted/30"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => generateDayPrayer(dp.day, dp.prompt)}
                  disabled={generatingDay === dp.day}
                  className="text-xs gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${generatingDay === dp.day ? "animate-spin" : ""}`} />
                  Regenerate
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateDayPrayer(dp.day, dp.prompt)}
                disabled={generatingDay === dp.day}
                className="rounded-xl gap-2 text-xs w-full"
              >
                {generatingDay === dp.day ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                {generatingDay === dp.day ? "Writing prayer…" : "Generate Prayer"}
              </Button>
            )}
          </motion.div>
        ))}
      </div>

      {/* Save */}
      {user ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-3 items-center justify-center pt-4"
        >
          <Button
            onClick={savePremiumPrayers}
            disabled={saving || Object.keys(generatedPrayers).length === 0}
            className="rounded-xl gap-2 px-8 h-12 text-base bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-white hover:from-amber-600 hover:via-yellow-500 hover:to-amber-600 shadow-lg"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Save {Object.keys(generatedPrayers).length} Prayer{Object.keys(generatedPrayers).length !== 1 ? "s" : ""} to My Board
          </Button>
          <Button variant="ghost" onClick={onReset} className="rounded-xl text-muted-foreground">
            Try another sermon
          </Button>
        </motion.div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">Sign in to save prayers to your Board</p>
          <Link to="/auth">
            <Button className="btn-gold rounded-xl gap-2">Sign In <ArrowRight className="w-4 h-4" /></Button>
          </Link>
        </div>
      )}
    </motion.div>
  );
}
