/**
 * PrayNowSheet — Unified prayer creation.
 * "Zero to prayer in one tap."
 *
 * Three input modes: Type | Speak | Draw (placeholder for draw).
 * No title required — AI generates one via enrich-prayer.
 * Default status: private.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Drawer } from "vaul";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mic, MicOff, PenLine, Type, X, Send, Sparkles } from "lucide-react";

interface PrayNowSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrayerCreated?: () => void;
}

type InputMode = "type" | "speak" | "draw";

export function PrayNowSheet({ open, onOpenChange, onPrayerCreated }: PrayNowSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<InputMode>("type");
  const [prayerText, setPrayerText] = useState("");
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Voice state ────────────────────────────────────────────────────────────
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (open && mode === "type") {
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [open, mode]);

  // ── Voice recording ────────────────────────────────────────────────────────
  const toggleRecording = useCallback(() => {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Speech recognition not supported in this browser", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = transcript;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript);
      setPrayerText(finalTranscript + interim);
    };

    recognition.onerror = () => {
      setRecording(false);
    };

    recognition.onend = () => {
      setRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }, [recording, transcript, toast]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const text = prayerText.trim();
    if (!text || !user) return;

    setSaving(true);
    try {
      // 1. Create prayer card
      const { data: card, error } = await supabase
        .from("prayer_cards")
        .insert({
          prayer_text: text,
          created_by: user.id,
          status: "private",
          source: "user",
          prayer_type: "personal",
        })
        .select("id")
        .single();

      if (error) throw error;

      // 2. Save to user's board
      await supabase
        .from("user_saved_prayers")
        .insert({
          user_id: user.id,
          prayer_id: card.id,
          pinned: false,
          favorite: false,
        });

      // 3. Background enrichment (non-blocking)
      setEnriching(true);
      const enrichPromise = supabase.functions.invoke("enrich-prayer", {
        body: { prayer_text: text },
      });

      // Close the sheet and notify
      onOpenChange(false);
      setPrayerText("");
      setTranscript("");
      setMode("type");
      toast({ title: "Prayer saved 🙏", description: "Enriching with scripture in the background…" });
      onPrayerCreated?.();

      // 4. Apply enrichment when it arrives
      try {
        const { data: enrichData } = await enrichPromise;
        if (enrichData && card.id) {
          const updates: any = {};
          if (enrichData.labels?.length) updates.labels = enrichData.labels;
          if (enrichData.verses?.length) {
            // Generate title from first few words
            const words = text.split(" ").slice(0, 6).join(" ");
            updates.title = words.length < text.length ? `${words}…` : words;
            // Build extended prayer from verse text
            updates.extended_prayer = enrichData.verses
              .map((v: any) => `${v.ref} — ${v.text}`)
              .join("\n");
          }
          if (Object.keys(updates).length > 0) {
            await supabase.from("prayer_cards").update(updates).eq("id", card.id);
          }
        }
      } catch {
        // Non-fatal — card is already saved
      } finally {
        setEnriching(false);
      }
    } catch (err) {
      toast({ title: "Failed to save prayer", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
    }
    onOpenChange(false);
  };

  const canSave = prayerText.trim().length > 5;

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
        <Drawer.Content
          className="flex flex-col rounded-t-[28px] fixed bottom-0 left-0 right-0 z-50 shadow-2xl"
          style={{
            height: "92vh",
            backgroundColor: "hsl(30 15% 8%)",
            color: "hsl(38 35% 78%)",
          }}
        >
          {/* Handle + header */}
          <div className="px-5 pt-4 pb-2">
            <div className="mx-auto w-10 h-1 rounded-full mb-4" style={{ backgroundColor: "rgba(180,140,50,0.25)" }} />
            <div className="flex items-center justify-between mb-4">
              <Drawer.Title className="font-display text-lg font-bold" style={{ color: "hsl(38 60% 85%)" }}>
                Pray Now
              </Drawer.Title>
              <button onClick={handleClose} className="p-2 rounded-xl transition-all active:scale-90 hover:bg-white/5">
                <X className="w-5 h-5" style={{ color: "hsl(38 30% 50%)" }} />
              </button>
            </div>

            {/* Mode tabs */}
            <div className="flex rounded-2xl overflow-hidden mb-4" style={{ border: "1px solid rgba(180,140,50,0.12)" }}>
              {([
                { id: "type" as const, icon: Type, label: "Type" },
                { id: "speak" as const, icon: Mic, label: "Speak" },
                { id: "draw" as const, icon: PenLine, label: "Draw" },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMode(tab.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: mode === tab.id ? "rgba(180,140,50,0.12)" : "transparent",
                    color: mode === tab.id ? "hsl(42 85% 65%)" : "hsl(38 20% 45%)",
                  }}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 px-5 pb-4 flex flex-col overflow-hidden">
            {/* TYPE mode */}
            {mode === "type" && (
              <textarea
                ref={textareaRef}
                value={prayerText}
                onChange={(e) => setPrayerText(e.target.value)}
                placeholder="Lord…"
                className="flex-1 w-full resize-none bg-transparent border-none outline-none text-[16px] leading-[1.9] tracking-[0.01em] placeholder:opacity-30"
                style={{
                  color: "hsl(38 35% 78%)",
                  fontFamily: '"Cormorant Garamond", "Georgia", serif',
                  caretColor: "hsl(42 85% 55%)",
                }}
              />
            )}

            {/* SPEAK mode */}
            {mode === "speak" && (
              <div className="flex-1 flex flex-col items-center justify-center gap-6">
                {/* Transcript display */}
                {prayerText && (
                  <div className="w-full max-h-[40vh] overflow-auto px-2">
                    <p
                      className="text-[15px] leading-[1.8] text-center"
                      style={{ fontFamily: '"Cormorant Garamond", serif', color: "hsl(38 35% 78%)" }}
                    >
                      {prayerText}
                    </p>
                  </div>
                )}

                {/* Mic button */}
                <motion.button
                  onClick={toggleRecording}
                  className="w-20 h-20 rounded-full flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: recording ? "rgba(248,113,113,0.2)" : "rgba(180,140,50,0.12)",
                    border: recording ? "2px solid rgba(248,113,113,0.4)" : "2px solid rgba(180,140,50,0.25)",
                  }}
                  animate={recording ? { scale: [1, 1.05, 1] } : {}}
                  transition={recording ? { duration: 1.5, repeat: Infinity } : {}}
                >
                  {recording ? (
                    <MicOff className="w-8 h-8 text-red-400" />
                  ) : (
                    <Mic className="w-8 h-8" style={{ color: "hsl(42 85% 55%)" }} />
                  )}
                </motion.button>

                <p className="text-xs" style={{ color: "hsl(38 20% 45%)" }}>
                  {recording ? "Listening… tap to stop" : "Tap to start speaking your prayer"}
                </p>
              </div>
            )}

            {/* DRAW mode (placeholder) */}
            {mode === "draw" && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <PenLine className="w-12 h-12 mx-auto" style={{ color: "hsl(38 20% 35%)" }} />
                  <p className="text-sm" style={{ color: "hsl(38 20% 45%)" }}>
                    Handwriting mode coming soon
                  </p>
                  <p className="text-xs" style={{ color: "hsl(38 15% 35%)" }}>
                    Use Type or Speak mode for now
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer — save button */}
          <div className="px-5 pb-6 pt-2" style={{ borderTop: "1px solid rgba(180,140,50,0.08)" }}>
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: canSave ? "hsl(42 85% 55%)" : "hsl(42 30% 25%)",
                color: "hsl(30 25% 10%)",
                boxShadow: canSave ? "0 4px 20px -4px rgba(180,140,50,0.4)" : "none",
              }}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Save Prayer
                </>
              )}
            </button>

            {enriching && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 mt-3"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" style={{ color: "hsl(42 85% 55%)" }} />
                <span className="text-[11px]" style={{ color: "hsl(38 20% 45%)" }}>
                  Enriching with scripture…
                </span>
              </motion.div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
