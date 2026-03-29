import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Sparkles, X, Globe, Lock, BookOpen } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface Verse {
  ref: string;
  text: string;
  selected: boolean;
}

interface TestimonyEnrichModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testimonyBody: string;
  prayerId: string | null;
  onSuccess: () => void;
}

export function TestimonyEnrichModal({
  open,
  onOpenChange,
  testimonyBody,
  prayerId,
  onSuccess,
}: TestimonyEnrichModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [enriched, setEnriched] = useState(false);
  const [title, setTitle] = useState("");
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const enrich = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/enrich-testimony`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ testimony_body: testimonyBody }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          toast({ title: "Rate limited", description: "Please wait a moment and try again.", variant: "destructive" });
        } else if (resp.status === 402) {
          toast({ title: "AI credits exhausted", description: "Please add funds to continue.", variant: "destructive" });
        } else {
          toast({ title: "AI enrichment failed", description: err.error || "Please try again.", variant: "destructive" });
        }
        return;
      }

      const data = await resp.json();
      setTitle(data.title || "");
      setVerses((data.verses || []).map((v: { ref: string; text: string }) => ({ ...v, selected: true })));
      setEnriched(true);
    } catch {
      toast({ title: "Failed to enrich testimony", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      // Moderate first
      try {
        const modResp = await fetch(`${SUPABASE_URL}/functions/v1/moderate-testimony`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ testimony_body: testimonyBody }),
        });
        if (modResp.ok) {
          const modResult = await modResp.json();
          if (!modResult.approved) {
            toast({ title: "Testimony not accepted", description: modResult.reason || "Please revise.", variant: "destructive" });
            setSubmitting(false);
            return;
          }
        }
      } catch { /* fail open */ }

      const selectedVerses = verses.filter(v => v.selected).map(({ ref, text }) => ({ ref, text }));

      const { error } = await supabase.from("testimonies").insert({
        prayer_id: prayerId,
        user_id: user.id,
        body: testimonyBody,
        title: title.trim() || null,
        verses: selectedVerses,
        is_public: isPublic,
        flagged: false,
      } as any);

      if (error) throw error;

      toast({ title: "Testimony shared! 🙌 Glory to God!" });
      onOpenChange(false);
      onSuccess();

      // Reset state
      setEnriched(false);
      setTitle("");
      setVerses([]);
      setIsPublic(false);
    } catch (err) {
      toast({
        title: "Failed to share testimony",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setEnriched(false);
      setTitle("");
      setVerses([]);
      setIsPublic(false);
      setLoading(false);
    }
    onOpenChange(v);
  };

  // Auto-enrich when opening
  const handleAfterOpen = () => {
    if (open && !enriched && !loading) {
      enrich();
    }
  };

  // Trigger enrichment on mount/open
  if (open && !enriched && !loading) {
    setTimeout(handleAfterOpen, 100);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: "hsl(42 75% 45%)" }} />
            Enrich Your Testimony
          </DialogTitle>
          <DialogDescription>
            AI has suggested a title and Bible verses. Edit as you see fit.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(42 75% 45%)" }} />
            <p className="text-sm font-medium" style={{ color: "hsl(25 18% 50%)" }}>
              AI is reading your testimony and finding the right words…
            </p>
          </div>
        ) : enriched ? (
          <div className="space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-xs font-semibold" style={{ color: "hsl(25 35% 14%)" }}>
                Title
              </label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value.slice(0, 80))}
                placeholder="Give your testimony a title…"
                className="rounded-xl text-sm"
              />
            </div>

            {/* Verses */}
            {verses.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold" style={{ color: "hsl(25 35% 14%)" }}>
                  Suggested Bible Verses
                </label>
                <div className="space-y-2">
                  {verses.map((verse, i) => (
                    <motion.div
                      key={verse.ref}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: verse.selected ? 1 : 0.5, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-3 p-3 rounded-xl border transition-all"
                      style={{
                        borderColor: verse.selected ? "hsl(42 75% 55% / 0.4)" : "hsl(38 22% 88%)",
                        background: verse.selected ? "hsl(42 80% 97%)" : "hsl(var(--card))",
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold" style={{ color: "hsl(42 75% 40%)" }}>
                          <BookOpen className="w-3 h-3 inline mr-1" />
                          {verse.ref}
                        </p>
                        <p className="text-xs leading-relaxed mt-1 font-display italic" style={{ color: "hsl(25 28% 28%)" }}>
                          "{verse.text}"
                        </p>
                      </div>
                      <button
                        onClick={() => setVerses(prev => prev.map((v, j) => j === i ? { ...v, selected: !v.selected } : v))}
                        className="p-1 rounded-lg transition-all hover:bg-accent/40 flex-shrink-0"
                        style={{ color: verse.selected ? "hsl(0 72% 51%)" : "hsl(25 18% 70%)" }}
                        title={verse.selected ? "Remove verse" : "Add verse back"}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Public/Private toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: "hsl(38 22% 88%)", background: "hsl(var(--card))" }}>
              <div className="flex items-center gap-3">
                {isPublic ? (
                  <Globe className="w-4 h-4" style={{ color: "hsl(42 75% 45%)" }} />
                ) : (
                  <Lock className="w-4 h-4" style={{ color: "hsl(25 18% 50%)" }} />
                )}
                <div>
                  <p className="text-sm font-semibold" style={{ color: "hsl(25 35% 14%)" }}>
                    {isPublic ? "Public" : "Private"}
                  </p>
                  <p className="text-[11px]" style={{ color: "hsl(25 18% 56%)" }}>
                    {isPublic
                      ? "Your testimony will appear on the Testify page for others to see."
                      : "Only visible on your prayer board. You can make it public later."}
                  </p>
                </div>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-12 rounded-2xl text-base gap-2.5 btn-gold"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sharing…</>
              ) : (
                <>🙌 Share Testimony</>
              )}
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: "hsl(25 18% 50%)" }}>Something went wrong. Please close and try again.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
