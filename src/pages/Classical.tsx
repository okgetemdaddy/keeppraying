import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteNav } from "@/components/SiteNav";
import {
  BookOpen, Search, Plus, Loader2, X, ChevronRight, Scroll, Sparkles,
} from "lucide-react";
import { renderWithVerseLinks } from "@/lib/renderWithVerseLinks";
import { cn } from "@/lib/utils";

interface ClassicalPrayer {
  id: string;
  title: string;
  author: string;
  author_era: string | null;
  prayer_text: string;
  extended_text: string | null;
  labels: string[] | null;
  source_reference: string | null;
}

const ERA_CHIPS = ["Early Church", "Medieval", "Reformation", "Modern"] as const;

export default function Classical() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prayers, setPrayers] = useState<ClassicalPrayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedEra, setSelectedEra] = useState<string | null>(null);

  useEffect(() => {
    loadPrayers();
  }, []);

  const loadPrayers = async (era?: string | null) => {
    setLoading(true);
    setInterpretation(null);
    let query = supabase.from("classical_prayers").select("*").order("author", { ascending: true });
    if (era) {
      query = query.eq("author_era", era);
    }
    const { data } = await query;
    setPrayers((data as ClassicalPrayer[]) || []);
    setLoading(false);
  };

  const handleEraFilter = (era: string) => {
    const next = selectedEra === era ? null : era;
    setSelectedEra(next);
    setSearch("");
    loadPrayers(next);
  };

  const handleSemanticSearch = useCallback(async () => {
    if (!search.trim()) {
      loadPrayers(selectedEra);
      return;
    }
    setSearching(true);
    setInterpretation(null);
    try {
      const { data, error } = await supabase.functions.invoke("classical-search", {
        body: { query: search, era: selectedEra, labels: [] },
      });
      if (error) throw error;
      if (data?.results) {
        setPrayers(data.results);
        setInterpretation(data.interpretation || null);
      }
    } catch {
      // Fallback to basic ilike search
      let query = supabase.from("classical_prayers").select("*").order("author", { ascending: true });
      query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,prayer_text.ilike.%${search}%`);
      if (selectedEra) query = query.eq("author_era", selectedEra);
      const { data } = await query;
      setPrayers((data as ClassicalPrayer[]) || []);
    } finally {
      setSearching(false);
    }
  }, [search, selectedEra]);

  const saveToBoard = async (prayer: ClassicalPrayer) => {
    if (!user) {
      toast({ title: "Sign in to save prayers", variant: "destructive" });
      return;
    }
    setSaving(prayer.id);
    try {
      const { data: existing } = await supabase.from("prayer_cards")
        .select("id").eq("title", prayer.title).eq("prayer_text", prayer.prayer_text).limit(1);

      let prayerCardId: string;
      if (existing && existing.length > 0) {
        prayerCardId = existing[0].id;
      } else {
        const { data: newCard, error } = await supabase.from("prayer_cards").insert({
          title: `${prayer.title} — ${prayer.author}`,
          prayer_text: prayer.prayer_text,
          extended_prayer: prayer.extended_text || null,
          labels: prayer.labels || ["classical-prayer"],
          source: "admin",
          status: "approved",
          prayer_type: "standard",
          created_by: user.id,
        }).select("id").single();
        if (error) throw error;
        prayerCardId = newCard.id;
      }

      const { error: saveErr } = await supabase.from("user_saved_prayers").insert({
        user_id: user.id, prayer_id: prayerCardId,
      });
      if (saveErr) {
        if (saveErr.code === "23505") toast({ title: "Already on your board" });
        else throw saveErr;
      } else {
        toast({ title: "Saved to your board 🙏", description: `"${prayer.title}" by ${prayer.author}` });
      }
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-12 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Scroll className="w-10 h-10 text-primary mx-auto mb-4" />
            <h1 className="font-display text-4xl md:text-5xl text-foreground tracking-tight mb-3">
              The Manuscript Vault
            </h1>
            <p className="font-display italic text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
              A sacred archive of prayers from the saints, church fathers, and reformers — 
              spanning two millennia of communion with God.
            </p>
          </motion.div>

          {/* Semantic Search */}
          {/* TODO: iPadOS Port - Support Scribble handwriting input for search */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-8 max-w-lg mx-auto"
          >
            <form
              onSubmit={(e) => { e.preventDefault(); handleSemanticSearch(); }}
              className="relative"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by author, theme, or Scripture…"
                className="pl-10 pr-20 h-12 rounded-2xl text-base font-display"
              />
              {search && (
                <button type="button" onClick={() => { setSearch(""); loadPrayers(selectedEra); }} className="absolute right-14 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={searching}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl gap-1"
              >
                {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Search
              </Button>
            </form>
          </motion.div>

          {/* Era Filter Chips */}
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {ERA_CHIPS.map(era => (
              <button
                key={era}
                onClick={() => handleEraFilter(era)}
                className={cn(
                  "text-xs px-3.5 py-1.5 rounded-full border transition-all duration-200 font-medium",
                  selectedEra === era
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {era}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* AI Interpretation Banner */}
      <AnimatePresence>
        {interpretation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-primary/20 bg-primary/5"
          >
            <div className="max-w-4xl mx-auto px-4 py-3 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground font-display italic">{interpretation}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Grid */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading || searching ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : prayers.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground font-display italic">
              {search ? "No prayers match your search." : "The vault awaits its first manuscripts."}
            </p>
          </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-2 gap-5">
            <AnimatePresence>
              {prayers.map((prayer) => {
                const isExpanded2 = expanded === prayer.id;
                return (
                  // TODO: iPadOS Port - Bind Apple Pencil squeeze event here to trigger AI historical context popover
                  // TODO: iPadOS Port - Bind long-press for quick-save context menu
                  <motion.div
                    key={prayer.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="break-inside-avoid mb-5 rounded-2xl border border-border/60 bg-card overflow-hidden
                      hover:shadow-lg hover:border-primary/30 hover:scale-[1.005] hover:ring-1 hover:ring-primary/20
                      transition-all duration-300 ease-out"
                  >
                    <button
                      onClick={() => setExpanded(isExpanded2 ? null : prayer.id)}
                      className="w-full text-left px-5 py-4 flex items-start gap-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Scroll className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight font-display">{prayer.title}</p>
                        <p className="text-[11px] tracking-wider uppercase text-muted-foreground mt-1">
                          {prayer.author}
                          {prayer.author_era && <span className="opacity-60"> · {prayer.author_era}</span>}
                        </p>
                        {/* Preview snippet when collapsed */}
                        {!isExpanded2 && (
                          <p className="text-xs text-muted-foreground/70 mt-2 line-clamp-2 font-display italic leading-relaxed">
                            {prayer.prayer_text.slice(0, 120)}…
                          </p>
                        )}
                      </div>
                      <ChevronRight
                        className="w-4 h-4 text-muted-foreground/40 mt-1 transition-transform flex-shrink-0"
                        style={{ transform: isExpanded2 ? "rotate(90deg)" : "rotate(0deg)" }}
                      />
                    </button>

                    <AnimatePresence>
                      {isExpanded2 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 space-y-3">
                            <div className="rounded-xl bg-muted/50 p-4">
                              <p className="font-display italic leading-loose text-[15px] text-foreground whitespace-pre-line first-letter:text-4xl first-letter:font-display first-letter:float-left first-letter:mr-2 first-letter:leading-none first-letter:text-primary">
                                {renderWithVerseLinks(prayer.prayer_text)}
                              </p>
                            </div>

                            {prayer.extended_text && (
                              <div className="rounded-xl bg-muted/30 p-4">
                                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Extended</p>
                                <p className="font-display italic text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                                  {renderWithVerseLinks(prayer.extended_text)}
                                </p>
                              </div>
                            )}

                            {prayer.labels && prayer.labels.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {prayer.labels.map(l => (
                                  <span key={l} className="text-[10px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{l}</span>
                                ))}
                              </div>
                            )}

                            {prayer.source_reference && (
                              <p className="text-[10px] text-muted-foreground italic">Source: {prayer.source_reference}</p>
                            )}

                            <Button
                              size="sm"
                              className="btn-gold rounded-xl gap-1.5 w-full"
                              onClick={() => saveToBoard(prayer)}
                              disabled={saving === prayer.id}
                            >
                              {saving === prayer.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                              Save to My Board
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
