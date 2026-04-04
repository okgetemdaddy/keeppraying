import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog as Dialog, ResponsiveDialogContent as DialogContent, ResponsiveDialogHeader as DialogHeader, ResponsiveDialogTitle as DialogTitle, ResponsiveDialogDescription as DialogDescription,
} from "@/components/ui/responsive-dialog";
import {
  BookOpen, Search, Plus, Loader2, X, ChevronRight, Scroll,
} from "lucide-react";
import { renderWithVerseLinks } from "@/lib/renderWithVerseLinks";

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
  variant?: "light" | "dark";
}

// TODO: iPadOS Port - Bind Apple Pencil squeeze event here to trigger AI historical context popover
function VaultCard({
  prayer,
  isExpanded,
  onToggle,
  onSave,
  saving,
}: {
  prayer: ClassicalPrayer;
  isExpanded: boolean;
  onToggle: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    // TODO: iPadOS Port - Bind long-press for quick-save context menu
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="break-inside-avoid mb-4 rounded-2xl border border-border/60 bg-card overflow-hidden
        hover:shadow-lg hover:border-primary/30 hover:scale-[1.01] hover:ring-1 hover:ring-primary/20
        transition-all duration-300 ease-out"
    >
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-start gap-3"
      >
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Scroll className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight font-display">
            {prayer.title}
          </p>
          <p className="text-[11px] tracking-wider uppercase text-muted-foreground mt-1">
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
                <p className="text-[10px] text-muted-foreground italic">
                  Source: {prayer.source_reference}
                </p>
              )}

              <Button
                size="sm"
                className="btn-gold rounded-xl gap-1.5 w-full"
                onClick={onSave}
                disabled={saving}
              >
                {saving ? (
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
      const { data: existing } = await supabase.from("prayer_cards")
        .select("id")
        .eq("title", prayer.title)
        .eq("prayer_text", prayer.prayer_text)
        .limit(1);

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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-xl">
            <Scroll className="w-5 h-5 text-primary" />
            The Manuscript Vault
          </DialogTitle>
          <DialogDescription className="font-display italic text-muted-foreground">
            Timeless prayers from the saints and church fathers — save them to your board or use them in your War Room.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        {/* TODO: iPadOS Port - Support Scribble handwriting input for search */}
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

        {/* Masonry Grid */}
        <div className="flex-1 overflow-y-auto mt-3 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : prayers.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground font-display italic">
                {search ? "No prayers match your search." : "No classical prayers uploaded yet."}
              </p>
            </div>
          ) : (
            <div className="columns-1 md:columns-2 gap-4">
              {prayers.map((prayer) => (
                <VaultCard
                  key={prayer.id}
                  prayer={prayer}
                  isExpanded={expanded === prayer.id}
                  onToggle={() => setExpanded(expanded === prayer.id ? null : prayer.id)}
                  onSave={() => saveToBoard(prayer)}
                  saving={saving === prayer.id}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
