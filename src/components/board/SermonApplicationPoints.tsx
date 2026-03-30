import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Target, Sparkles, PenLine, BookOpen, PartyPopper,
  ChevronDown, ChevronUp, Loader2, Check,
} from "lucide-react";

interface AppPoint {
  point: string;
  subtopic: string;
}

interface SermonAppMeta {
  application_points: AppPoint[];
  videoId?: string;
  sermonTitle?: string;
}

type ApplyAction = "generate" | "write" | "existing" | "walking";

interface SermonApplicationPointsProps {
  meditationEssay: string;
  userId: string;
  accentColor: string;
  textColor: string;
  onRefresh: () => void;
}

export function SermonApplicationPoints({
  meditationEssay,
  userId,
  accentColor,
  textColor,
  onRefresh,
}: SermonApplicationPointsProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const [activeAction, setActiveAction] = useState<ApplyAction | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedPrayer, setGeneratedPrayer] = useState("");
  const [userPrayer, setUserPrayer] = useState("");
  const [completedPoints, setCompletedPoints] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem("sermon-app-completed");
      return new Set(saved ? JSON.parse(saved) : []);
    } catch { return new Set(); }
  });

  let meta: SermonAppMeta;
  try {
    meta = JSON.parse(meditationEssay);
  } catch {
    return null;
  }

  if (!meta.application_points?.length) return null;

  const markCompleted = useCallback((idx: number) => {
    setCompletedPoints((prev) => {
      const next = new Set(prev);
      next.add(idx);
      localStorage.setItem("sermon-app-completed", JSON.stringify([...next]));
      return next;
    });
    setActivePoint(null);
    setActiveAction(null);
  }, []);

  const handleGenerate = async (point: AppPoint) => {
    setGenerating(true);
    try {
      const resp = await supabase.functions.invoke("sermon-generate-prayer", {
        body: {
          prompt: `Help me pray to apply this truth in my life: "${point.point}" (from the subtopic: "${point.subtopic}")`,
          day: "Application",
          sermonTitle: meta.sermonTitle || "Sermon",
        },
      });
      if (resp.error) throw resp.error;
      setGeneratedPrayer(resp.data.prayer);
    } catch {
      toast({ title: "Generation failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const savePrayerToBoard = async (text: string, pointIdx: number) => {
    if (!text.trim()) return;
    try {
      const point = meta.application_points[pointIdx];
      const { data: card, error } = await supabase
        .from("prayer_cards")
        .insert({
          title: `Apply It: ${point.subtopic}`,
          prayer_text: text,
          labels: ["sermon-sync", "application-prayer"],
          created_by: userId,
          status: "approved",
          source: "community",
        })
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("user_saved_prayers").insert({
        user_id: userId,
        prayer_id: card.id,
      });
      markCompleted(pointIdx);
      toast({ title: "Prayer saved! 🙏", description: "Application prayer added to your Board." });
      setGeneratedPrayer("");
      setUserPrayer("");
      onRefresh();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  };

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold transition-colors hover:opacity-80 w-full"
        style={{ color: accentColor }}
      >
        <Target className="w-3.5 h-3.5" />
        Apply It ({meta.application_points.length})
        {expanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-2">
              {meta.application_points.map((ap, idx) => {
                const isCompleted = completedPoints.has(idx);
                const isActive = activePoint === idx;

                return (
                  <div key={idx} className="rounded-xl p-2.5 transition-colors"
                    style={{ background: isCompleted ? `${accentColor}08` : `${textColor}04` }}>
                    <div className="flex items-start gap-2">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold transition-colors"
                        style={{
                          background: isCompleted ? accentColor : `${accentColor}15`,
                          color: isCompleted ? "white" : accentColor,
                        }}
                      >
                        {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-relaxed" style={{ color: `${textColor}90` }}>{ap.point}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: `${textColor}40` }}>from: {ap.subtopic}</p>

                        {!isCompleted && !isActive && (
                          <button
                            onClick={() => { setActivePoint(idx); setActiveAction(null); setGeneratedPrayer(""); setUserPrayer(""); }}
                            className="mt-1.5 text-[11px] font-semibold transition-colors hover:opacity-80"
                            style={{ color: accentColor }}
                          >
                            Pray to apply this →
                          </button>
                        )}

                        {/* Action selection */}
                        <AnimatePresence>
                          {isActive && !activeAction && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden mt-2 space-y-1.5"
                            >
                              <button
                                onClick={() => { setActiveAction("generate"); handleGenerate(ap); }}
                                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-90"
                                style={{ background: `${accentColor}12`, color: accentColor }}
                              >
                                <Sparkles className="w-3.5 h-3.5" /> Generate a prayer
                              </button>
                              <button
                                onClick={() => setActiveAction("write")}
                                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                                style={{ background: `${textColor}06`, color: `${textColor}80` }}
                              >
                                <PenLine className="w-3.5 h-3.5" /> Write my own prayer
                              </button>
                              <button
                                onClick={() => { markCompleted(idx); toast({ title: "🙌 Praise God!", description: "Keep walking it out!" }); }}
                                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                                style={{ background: `${textColor}06`, color: `${textColor}80` }}
                              >
                                <PartyPopper className="w-3.5 h-3.5" /> Already walking it out — praise God!
                              </button>
                              <button
                                onClick={() => { setActivePoint(null); setActiveAction(null); }}
                                className="text-[10px] w-full text-center py-1 transition-colors"
                                style={{ color: `${textColor}40` }}
                              >
                                Cancel
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Generate prayer flow */}
                        <AnimatePresence>
                          {isActive && activeAction === "generate" && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden mt-2 space-y-2"
                            >
                              {generating ? (
                                <div className="flex items-center gap-2 py-3 justify-center text-xs" style={{ color: `${textColor}50` }}>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Writing prayer…
                                </div>
                              ) : generatedPrayer ? (
                                <>
                                  <Textarea
                                    value={generatedPrayer}
                                    onChange={(e) => setGeneratedPrayer(e.target.value)}
                                    className="min-h-[80px] text-xs rounded-lg bg-slate-50 border-none resize-none"
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => savePrayerToBoard(generatedPrayer, idx)}
                                      className="rounded-lg h-7 text-xs gap-1 flex-1"
                                      style={{ background: accentColor, color: "white" }}>
                                      <Check className="w-3 h-3" /> Save to Board
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleGenerate(ap)}
                                      className="rounded-lg h-7 text-xs">
                                      Regenerate
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => { setActivePoint(null); setActiveAction(null); }}
                                      className="rounded-lg h-7 text-xs">
                                      Cancel
                                    </Button>
                                  </div>
                                </>
                              ) : null}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Write own prayer flow */}
                        <AnimatePresence>
                          {isActive && activeAction === "write" && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden mt-2 space-y-2"
                            >
                              <Textarea
                                value={userPrayer}
                                onChange={(e) => setUserPrayer(e.target.value)}
                                placeholder="Lord, help me to apply this truth…"
                                className="min-h-[80px] text-xs rounded-lg bg-slate-50 border-none resize-none"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => savePrayerToBoard(userPrayer, idx)}
                                  disabled={!userPrayer.trim()}
                                  className="rounded-lg h-7 text-xs gap-1 flex-1"
                                  style={{ background: accentColor, color: "white" }}>
                                  <Check className="w-3 h-3" /> Save to Board
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setActivePoint(null); setActiveAction(null); }}
                                  className="rounded-lg h-7 text-xs">
                                  Cancel
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
