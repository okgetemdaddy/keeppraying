import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ResponsiveDialog as Dialog, ResponsiveDialogContent as DialogContent, ResponsiveDialogHeader as DialogHeader, ResponsiveDialogTitle as DialogTitle, ResponsiveDialogDescription as DialogDescription } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Wind } from "lucide-react";
import { motion } from "framer-motion";

interface AddBreathPrayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const MAX_CHARS = 200;

export default function AddBreathPrayerModal({ open, onOpenChange, onSuccess }: AddBreathPrayerModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<{ labels: string[]; verses: { ref: string; text: string }[] } | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
  const [selectedVerses, setSelectedVerses] = useState<Set<string>>(new Set());

  const reset = () => {
    setText("");
    setEnrichResult(null);
    setSelectedLabels(new Set());
    setSelectedVerses(new Set());
  };

  const handleSubmit = async () => {
    if (!user || !text.trim()) return;
    const trimmed = text.trim();

    // Validate: must be 1-2 sentences (rough check)
    const sentenceCount = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    if (sentenceCount > 3 || trimmed.length > MAX_CHARS) {
      toast({
        title: "Breath prayers are short",
        description: "Keep it to one or two sentences — a single breath of prayer.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: Moderate
      const { data: modResult, error: modError } = await supabase.functions.invoke("moderate-prayer", {
        body: { prayer_text: trimmed, title: "Breath Prayer" },
      });
      if (modError) throw modError;
      if (modResult && !modResult.approved) {
        toast({
          title: "Prayer not approved",
          description: modResult.reason || "Please revise your prayer.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Step 2: Save as private breath prayer
      const { data: card, error } = await supabase.from("prayer_cards").insert({
        prayer_text: trimmed,
        prayer_type: "breath" as any,
        status: "private",
        created_by: user.id,
        text_style: "scripture",
        labels: [],
      } as any).select("id").single();

      if (error) throw error;

      // Auto-save to board
      if (card?.id) {
        await supabase.from("user_saved_prayers").insert({
          user_id: user.id,
          prayer_id: card.id,
          position: 0,
        });
      }

      // Step 3: Auto-enrich
      setSubmitting(false);
      setEnriching(true);
      try {
        const { data: enrichData } = await supabase.functions.invoke("enrich-prayer", {
          body: { prayer_text: trimmed, cited_refs: [] },
        });
        if (enrichData && !enrichData.error) {
          setEnrichResult(enrichData);
          setSelectedLabels(new Set(enrichData.labels || []));
          setSelectedVerses(new Set((enrichData.verses || []).map((v: any) => v.ref)));
        } else {
          // Enrichment failed but prayer is saved
          toast({ title: "Breath prayer saved 🌬️" });
          reset();
          onOpenChange(false);
          onSuccess?.();
        }
      } catch {
        toast({ title: "Breath prayer saved 🌬️" });
        reset();
        onOpenChange(false);
        onSuccess?.();
      } finally {
        setEnriching(false);
      }

      // Store card ID for applying enrichment
      if (card?.id) {
        setCardId(card.id);
      }
    } catch (e) {
      toast({
        title: "Failed to save",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  const [cardId, setCardId] = useState<string | null>(null);

  const applyEnrichment = async () => {
    if (!cardId || !enrichResult) return;
    setSubmitting(true);
    try {
      const updates: Record<string, unknown> = {};
      if (selectedLabels.size > 0) updates.labels = [...selectedLabels];
      const verseLines = enrichResult.verses
        .filter(v => selectedVerses.has(v.ref))
        .map(v => `${v.ref} — "${v.text}"`)
        .join("\n");
      if (verseLines) updates.extended_prayer = verseLines;

      if (Object.keys(updates).length > 0) {
        await supabase.from("prayer_cards").update(updates).eq("id", cardId);
      }

      toast({ title: "Breath prayer enriched ✨🌬️" });
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast({ title: "Failed to apply enrichment", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const skipEnrichment = () => {
    toast({ title: "Breath prayer saved 🌬️" });
    reset();
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent
        className="w-full max-w-md border-0 shadow-2xl overflow-hidden"
        style={{
          borderRadius: "1.5rem",
          background: "linear-gradient(135deg, hsl(42 55% 99%) 0%, hsl(38 45% 97%) 100%)",
          boxShadow: "0 24px 60px -12px rgba(0,0,0,0.15), 0 0 0 1px hsl(42 40% 90%)",
        }}
      >
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-3">
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            >
              <Wind className="w-8 h-8" style={{ color: "hsl(42 75% 46%)" }} />
            </motion.div>
          </div>
          <DialogTitle className="font-display text-xl" style={{ color: "hsl(25 35% 14%)" }}>
            Breathe a Prayer
          </DialogTitle>
          <DialogDescription className="text-sm" style={{ color: "hsl(25 18% 52%)" }}>
            A one-line prayer — short enough to pray in a single breath.
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Write */}
        {!enrichResult && !enriching && (
          <div className="space-y-4 pt-2">
            <div className="relative">
              <textarea
                value={text}
                onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
                placeholder="Lord, breathe peace into this moment…"
                rows={3}
                className="w-full resize-none outline-none font-display italic text-center text-base leading-relaxed rounded-2xl transition-shadow"
                style={{
                  padding: "1.25rem",
                  background: "hsl(38 55% 99%)",
                  boxShadow: "inset 0 2px 12px hsl(42 75% 46% / 0.07), 0 0 0 1.5px hsl(38 22% 88%)",
                  color: "hsl(25 30% 18%)",
                }}
                onFocus={e => { e.target.style.boxShadow = "inset 0 2px 16px hsl(42 75% 46% / 0.10), 0 0 0 2px hsl(42 75% 55%)"; }}
                onBlur={e => { e.target.style.boxShadow = "inset 0 2px 12px hsl(42 75% 46% / 0.07), 0 0 0 1.5px hsl(38 22% 88%)"; }}
              />
              <span className="absolute bottom-2 right-3 text-[10px]" style={{ color: "hsl(25 18% 52%)" }}>
                {text.length}/{MAX_CHARS}
              </span>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || text.trim().length < 5}
              className="w-full rounded-xl gap-2"
              style={{
                background: "linear-gradient(135deg, hsl(42 85% 46%), hsl(35 82% 54%))",
                color: "white",
              }}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : (
                <><Wind className="w-4 h-4" /> Breathe This Prayer</>
              )}
            </Button>
          </div>
        )}

        {/* Enriching state */}
        {enriching && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: "hsl(42 75% 46%)" }} />
            <p className="text-sm italic" style={{ color: "hsl(25 18% 52%)" }}>
              Finding scripture for your breath…
            </p>
          </div>
        )}

        {/* Step 2: Review AI enrichment */}
        {enrichResult && (
          <div className="space-y-4 pt-2">
            {/* Preview the prayer */}
            <div
              className="text-center font-display italic text-sm p-3 rounded-xl"
              style={{ background: "hsl(42 60% 96%)", color: "hsl(25 30% 22%)" }}
            >
              "{text}"
            </div>

            {/* Labels */}
            {enrichResult.labels.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: "hsl(25 18% 52%)" }}>Labels</p>
                <div className="flex flex-wrap gap-1.5">
                  {enrichResult.labels.map(label => (
                    <button
                      key={label}
                      onClick={() => setSelectedLabels(prev => {
                        const next = new Set(prev);
                        next.has(label) ? next.delete(label) : next.add(label);
                        return next;
                      })}
                      className="text-xs px-2.5 py-1 rounded-full border transition-colors"
                      style={{
                        background: selectedLabels.has(label) ? "hsl(42 80% 92%)" : "transparent",
                        borderColor: selectedLabels.has(label) ? "hsl(42 75% 78%)" : "hsl(38 22% 88%)",
                        color: selectedLabels.has(label) ? "hsl(38 75% 32%)" : "hsl(25 18% 56%)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Verses */}
            {enrichResult.verses.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: "hsl(25 18% 52%)" }}>Scripture</p>
                <div className="space-y-1.5">
                  {enrichResult.verses.map(verse => (
                    <button
                      key={verse.ref}
                      onClick={() => setSelectedVerses(prev => {
                        const next = new Set(prev);
                        next.has(verse.ref) ? next.delete(verse.ref) : next.add(verse.ref);
                        return next;
                      })}
                      className="w-full text-left p-2.5 rounded-xl border text-xs transition-colors"
                      style={{
                        background: selectedVerses.has(verse.ref) ? "hsl(42 60% 96%)" : "transparent",
                        borderColor: selectedVerses.has(verse.ref) ? "hsl(42 50% 82%)" : "hsl(38 22% 90%)",
                      }}
                    >
                      <span className="font-semibold" style={{ color: "hsl(42 75% 40%)" }}>{verse.ref}</span>
                      <span className="italic ml-1.5" style={{ color: "hsl(25 18% 48%)" }}>"{verse.text}"</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 rounded-xl text-sm" onClick={skipEnrichment}>
                Skip
              </Button>
              <Button
                className="flex-1 rounded-xl text-sm gap-1.5"
                onClick={applyEnrichment}
                disabled={submitting}
                style={{
                  background: "linear-gradient(135deg, hsl(42 85% 46%), hsl(35 82% 54%))",
                  color: "white",
                }}
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Apply
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
