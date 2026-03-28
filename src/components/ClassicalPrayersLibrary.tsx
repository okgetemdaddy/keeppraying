import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  BookOpen, Search, Plus, Loader2, X, ChevronRight, Scroll,
} from "lucide-react";

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

interface ClassicalPrayersLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Styling variant for themed backgrounds */
  variant?: "light" | "dark";
}

export function ClassicalPrayersLibrary({ open, onOpenChange, variant = "light" }: ClassicalPrayersLibraryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prayers, setPrayers] = useState<ClassicalPrayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    loadPrayers();
  }, [open]);

  const loadPrayers = async (q = "") => {
    setLoading(true);
    let query = supabase.from("classical_prayers").select("*").order("author", { ascending: true });
    if (q.trim()) {
      query = query.or(`title.ilike.%${q}%,author.ilike.%${q}%,prayer_text.ilike.%${q}%`);
    }
    const { data } = await query;
    setPrayers((data as ClassicalPrayer[]) || []);
    setLoading(false);
  };

  const handleSearch = (q: string) => {
    setSearch(q);
    loadPrayers(q);
  };

  const saveToBoard = async (prayer: ClassicalPrayer) => {
    if (!user) {
      toast({ title: "Sign in to save prayers", variant: "destructive" });
      return;
    }
    setSaving(prayer.id);
    try {
      // Check if this classical prayer is already a prayer_card
      const { data: existing } = await supabase.from("prayer_cards")
        .select("id")
        .eq("title", prayer.title)
        .eq("prayer_text", prayer.prayer_text)
        .limit(1);

      let prayerCardId: string;

      if (existing && existing.length > 0) {
        prayerCardId = existing[0].id;
      } else {
        // Create a new prayer_card from the classical prayer
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

      // Save to user's board
      const { error: saveErr } = await supabase.from("user_saved_prayers").insert({
        user_id: user.id,
        prayer_id: prayerCardId,
      });

      if (saveErr) {
        if (saveErr.code === "23505") {
          toast({ title: "Already on your board" });
        } else {
          throw saveErr;
        }
      } else {
        toast({ title: "Saved to your board 🙏", description: `"${prayer.title}" by ${prayer.author}` });
      }
    } catch (err) {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-xl">
            <Scroll className="w-5 h-5 text-primary" />
            Classical Prayers
          </DialogTitle>
          <DialogDescription>
            Timeless prayers from the saints and church fathers — save them to your board or use them in your War Room.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by title, author, or text…"
            className="pl-9 rounded-xl"
          />
          {search && (
            <button onClick={() => handleSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2 mt-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : prayers.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">
                {search ? "No prayers match your search." : "No classical prayers uploaded yet."}
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {prayers.map((prayer, i) => {
                const isExpanded = expanded === prayer.id;
                return (
                  <motion.div
                    key={prayer.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="prayer-card rounded-2xl overflow-hidden"
                  >
                    <button
                      onClick={() => setExpanded(isExpanded ? null : prayer.id)}
                      className="w-full text-left px-4 py-3 flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Scroll className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight">{prayer.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {prayer.author}
                          {prayer.author_era && <span className="opacity-60"> · {prayer.author_era}</span>}
                        </p>
                      </div>
                      <ChevronRight
                        className="w-4 h-4 text-muted-foreground/40 mt-1 transition-transform flex-shrink-0"
                        style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                      />
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-3">
                            <div className="rounded-xl bg-muted/50 p-3">
                              <p className="text-sm font-display italic leading-relaxed text-foreground whitespace-pre-line">
                                {prayer.prayer_text}
                              </p>
                            </div>

                            {prayer.extended_text && (
                              <div className="rounded-xl bg-muted/30 p-3">
                                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Extended</p>
                                <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                                  {prayer.extended_text}
                                </p>
                              </div>
                            )}

                            {prayer.labels && prayer.labels.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {prayer.labels.map(l => (
                                  <span key={l} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{l}</span>
                                ))}
                              </div>
                            )}

                            {prayer.source_reference && (
                              <p className="text-[10px] text-muted-foreground italic">
                                Source: {prayer.source_reference}
                              </p>
                            )}

                            <Button
                              size="sm"
                              className="btn-gold rounded-xl gap-1.5 w-full"
                              onClick={() => saveToBoard(prayer)}
                              disabled={saving === prayer.id}
                            >
                              {saving === prayer.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
