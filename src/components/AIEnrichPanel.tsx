import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ResponsiveSheet as Sheet, ResponsiveSheetContent as SheetContent, ResponsiveSheetHeader as SheetHeader, ResponsiveSheetTitle as SheetTitle, ResponsiveSheetDescription as SheetDescription } from "@/components/ui/responsive-sheet";
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
  labels: string[];
  verses: Verse[];
}

interface AIEnrichPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  prayerText: string;
  extendedPrayer?: string | null;
  existingLabels?: string[];
  onApplied: () => void;
}

/** Extract all scripture references explicitly written in the prayer text */
function extractCitedRefs(text: string): string[] {
  const refs: string[] = [];
  const regex = new RegExp(VERSE_REGEX.source, VERSE_REGEX.flags);
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    refs.push(match[0]);
  }
  return [...new Set(refs)];
}

export default function AIEnrichPanel({
  open,
  onOpenChange,
  cardId,
  prayerText,
  extendedPrayer,
  existingLabels = [],
  onApplied,
}: AIEnrichPanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnrichResult | null>(null);
  const [selectedLabels, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedVerses, setSelectedVerses] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  // Pre-compute cited refs from the prayer text
  const citedRefs = useMemo(() => extractCitedRefs(prayerText), [prayerText]);

  const fetchSuggestions = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-prayer", {
        body: {
          prayer_text: prayerText,
          extended_prayer: extendedPrayer,
          cited_refs: citedRefs,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setResult(data as EnrichResult);
      setSelectedTags(new Set(data.labels));
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
      const newTags = [...new Set([...existingLabels, ...selectedLabels])];
      const verseLines = result?.verses
        .filter(v => selectedVerses.has(v.ref))
        .map(v => `${v.ref} — "${v.text}"`)
        .join("\n") || "";

      const updates: Record<string, unknown> = { labels: newTags };
      if (verseLines) {
        updates.extended_prayer = verseLines;
      }

      const { error } = await supabase.from("prayer_cards").update(updates).eq("id", cardId);
      if (error) throw error;

      toast({ title: "Prayer enriched! ✨", description: "Labels and scripture have been applied." });
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

  const toggleLabel = (tag: string) => {
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

  const citedVerses = result?.verses.filter(v => v.cited_in_prayer) ?? [];
  const suggestedVerses = result?.verses.filter(v => !v.cited_in_prayer) ?? [];

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle className="font-display flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Auto Verses & Labels
          </SheetTitle>
          <SheetDescription>
            Your prayer is read deeply — surfacing scripture you cited and verses that match what you're praying about.
          </SheetDescription>
        </SheetHeader>

        {!result && !loading && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <Sparkles className="w-10 h-10 text-primary opacity-60" />
            {citedRefs.length > 0 && (
              <div className="w-full text-left p-3 rounded-xl bg-muted/50 border border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Quote className="w-3 h-3" /> Found in your prayer
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {citedRefs.map(ref => (
                    <span key={ref} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Your prayer's substance will be read and supporting scripture suggested — including any verses you've already cited.
            </p>
            <Button onClick={fetchSuggestions} className="btn-gold rounded-xl gap-2">
              <Sparkles className="w-4 h-4" /> Get Suggestions
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Reading your prayer deeply…</p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Labels */}
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                <Tag className="w-3.5 h-3.5" /> Suggested Labels
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.labels.map(tag => (
                  <label
                    key={tag}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs cursor-pointer transition-colors select-none ${
                      selectedLabels.has(tag)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={selectedLabels.has(tag)}
                      onCheckedChange={() => toggleLabel(tag)}
                      className="w-3 h-3"
                    />
                    #{tag}
                  </label>
                ))}
              </div>
            </div>

            {/* Verses cited in the prayer */}
            {citedVerses.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                  <Quote className="w-3.5 h-3.5 text-primary" /> Cited in Your Prayer
                </h3>
                <div className="space-y-2">
                  {citedVerses.map(verse => (
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

            {/* Additional suggested verses */}
            {suggestedVerses.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                  <BookOpen className="w-3.5 h-3.5" /> Supporting Scripture
                </h3>
                <div className="space-y-2">
                  {suggestedVerses.map(verse => (
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
                disabled={applying || (selectedLabels.size === 0 && selectedVerses.size === 0)}
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
