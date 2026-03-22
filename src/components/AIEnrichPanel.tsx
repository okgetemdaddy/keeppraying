import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles, Tag, BookOpen, Quote } from "lucide-react";
import VerseLink from "@/components/VerseLink";
import { VERSE_REGEX } from "@/lib/renderWithVerseLinks";

interface Verse {
  ref: string;
  text: string;
  cited_in_prayer?: boolean;
}

interface EnrichResult {
  tags: string[];
  verses: Verse[];
}

interface AIEnrichPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  prayerText: string;
  extendedPrayer?: string | null;
  existingTags?: string[];
  onApplied: () => void;
}

export default function AIEnrichPanel({
  open,
  onOpenChange,
  cardId,
  prayerText,
  extendedPrayer,
  existingTags = [],
  onApplied,
}: AIEnrichPanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnrichResult | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedVerses, setSelectedVerses] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  const fetchSuggestions = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-prayer", {
        body: { prayer_text: prayerText, extended_prayer: extendedPrayer },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setResult(data as EnrichResult);
      // Pre-select all by default
      setSelectedTags(new Set(data.tags));
      setSelectedVerses(new Set((data.verses as Verse[]).map(v => v.ref)));
    } catch (e) {
      toast({
        title: "Couldn't fetch suggestions",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applySelected = async () => {
    setApplying(true);
    try {
      const newTags = [...new Set([...existingTags, ...selectedTags])];
      const verseLines = result?.verses
        .filter(v => selectedVerses.has(v.ref))
        .map(v => `${v.ref} — "${v.text}"`)
        .join("\n") || "";

      const updates: Record<string, unknown> = { tags: newTags };
      if (verseLines) {
        updates.extended_prayer = verseLines;
      }

      const { error } = await supabase.from("prayer_cards").update(updates).eq("id", cardId);
      if (error) throw error;

      toast({ title: "Prayer enriched! ✨", description: "Tags and scripture have been applied." });
      onApplied();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Failed to apply",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  const toggleVerse = (ref: string) => {
    setSelectedVerses(prev => {
      const next = new Set(prev);
      next.has(ref) ? next.delete(ref) : next.add(ref);
      return next;
    });
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setResult(null);
      setSelectedTags(new Set());
      setSelectedVerses(new Set());
    }
    onOpenChange(val);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle className="font-display flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> AI Enrichment
          </SheetTitle>
          <SheetDescription>
            Let AI suggest relevant tags and scripture for your prayer. Review and select which to apply.
          </SheetDescription>
        </SheetHeader>

        {!result && !loading && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <Sparkles className="w-10 h-10 text-primary opacity-60" />
            <p className="text-sm text-muted-foreground">
              AI will analyse your prayer and suggest meaningful tags and Bible verses that relate to your prayer.
            </p>
            <Button onClick={fetchSuggestions} className="btn-gold rounded-xl gap-2">
              <Sparkles className="w-4 h-4" /> Get Suggestions
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analysing your prayer…</p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Tags */}
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                <Tag className="w-3.5 h-3.5" /> Suggested Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.tags.map(tag => (
                  <label
                    key={tag}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs cursor-pointer transition-colors select-none ${
                      selectedTags.has(tag)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={selectedTags.has(tag)}
                      onCheckedChange={() => toggleTag(tag)}
                      className="w-3 h-3"
                    />
                    #{tag}
                  </label>
                ))}
              </div>
            </div>

            {/* Verses */}
            {result.verses.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                  <BookOpen className="w-3.5 h-3.5" /> Suggested Scripture
                </h3>
                <div className="space-y-3">
                  {result.verses.map(verse => (
                    <label
                      key={verse.ref}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        selectedVerses.has(verse.ref)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <Checkbox
                        checked={selectedVerses.has(verse.ref)}
                        onCheckedChange={() => toggleVerse(verse.ref)}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="space-y-1 min-w-0">
                        <VerseLink reference={verse.ref} />
                        <p className="text-xs text-muted-foreground italic leading-relaxed">"{verse.text}"</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2 border-t border-border">
              <Button
                variant="outline"
                className="rounded-xl flex-1"
                onClick={fetchSuggestions}
                disabled={applying}
              >
                Regenerate
              </Button>
              <Button
                onClick={applySelected}
                disabled={applying || (selectedTags.size === 0 && selectedVerses.size === 0)}
                className="btn-gold rounded-xl flex-1 gap-2"
              >
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Apply Selected
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
