import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import VerseLink from "@/components/VerseLink";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { SiteNav } from "@/components/SiteNav";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BookOpen, Loader2, Sparkles, Check, ChevronDown, ChevronUp,
  Church, Youtube, ArrowRight, Heart, Plus, ExternalLink,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface SermonPrayer {
  title: string;
  prayer_text: string;
  verses: string;
  labels: string[];
}

interface SermonResult {
  sermonTitle: string;
  sermonNotes: string;
  prayers: SermonPrayer[];
}

export default function SermonSync() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SermonResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [notesOpen, setNotesOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isValidYouTube = (u: string) =>
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(u);

  const extractVideoId = (u: string) => {
    const m = u.match(/(?:v=|youtu\.be\/|\/embed\/|\/v\/)([a-zA-Z0-9_-]{11})/);
    return m?.[1] || "";
  };

  const handleSync = async () => {
    if (!url.trim() || !isValidYouTube(url)) {
      toast({ title: "Invalid URL", description: "Please paste a valid YouTube sermon link.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    setSelected(new Set());
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/sermon-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl: url }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Sync failed");
      }
      const data: SermonResult = await resp.json();
      setResult(data);
      // Auto-select all prayers
      setSelected(new Set(data.prayers.map((_, i) => i)));
      if (navigator.vibrate) navigator.vibrate(30);
    } catch (e: unknown) {
      toast({ title: "Sermon sync failed", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const togglePrayer = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const saveSelected = async () => {
    if (!user || !result) return;
    const prayersToSave = result.prayers.filter((_, i) => selected.has(i));
    if (prayersToSave.length === 0) {
      toast({ title: "No prayers selected", description: "Select at least one prayer prompt to save." });
      return;
    }
    setSaving(true);
    try {
      for (const p of prayersToSave) {
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

  const videoId = url ? extractVideoId(url) : "";

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
          <div className="flex gap-3">
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 rounded-xl"
              onKeyDown={e => { if (e.key === "Enter") handleSync(); }}
            />
            <Button
              onClick={handleSync}
              disabled={loading || !url.trim()}
              className="btn-gold rounded-xl gap-2 px-6"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? "Analyzing…" : "Sync"}
            </Button>
          </div>

          {/* Video preview */}
          {videoId && !loading && !result && (
            <div className="rounded-xl overflow-hidden border border-border aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
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
              <p className="verse-text text-sm">Meditating on the Word…</p>
              <p className="text-xs text-muted-foreground">Extracting prayer prompts and sermon notes</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Sermon title */}
              <div className="text-center">
                <h2 className="font-display text-xl font-bold text-foreground">{result.sermonTitle}</h2>
                {videoId && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors"
                  >
                    Watch on YouTube <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Sermon Notes */}
              <div className="prayer-card rounded-2xl overflow-hidden">
                <button
                  onClick={() => setNotesOpen(v => !v)}
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
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {result.sermonNotes}
                        </ReactMarkdown>
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
                    onClick={() => togglePrayer(i)}
                    className={`prayer-card rounded-2xl p-4 cursor-pointer transition-all border-2 ${
                      selected.has(i)
                        ? "border-primary/40 bg-primary/5"
                        : "border-transparent hover:border-muted"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors ${
                        selected.has(i)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {selected.has(i) ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-foreground">{prayer.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{prayer.prayer_text}</p>
                        {prayer.verses && (
                          <p className="text-xs text-primary mt-2 font-medium">📖 {prayer.verses}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {prayer.labels.map(l => (
                            <span key={l} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{l}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Save to Board */}
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
                  <Button
                    variant="ghost"
                    onClick={() => { setResult(null); setUrl(""); }}
                    className="rounded-xl text-muted-foreground"
                  >
                    Try another sermon
                  </Button>
                </motion.div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">Sign in to save prayers to your Board</p>
                  <Link to="/auth">
                    <Button className="btn-gold rounded-xl gap-2">
                      Sign In <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state scripture */}
        {!loading && !result && (
          <p className="verse-text text-sm text-center pt-4">
            "Your word is a lamp for my feet, a light on my path." — <VerseLink reference="Psalm 119:105" />
          </p>
        )}
      </div>
    </div>
  );
}
