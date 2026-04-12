/**
 * PrayNowSheet — Unified prayer creation matching mockup #pray-sheet.
 * Three input modes: Type | Speak | Draw.
 * Uses CSS tokens (var(--kp-*)) for full theme support.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Drawer } from "vaul";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mic, MicOff, PenLine, Type, X, Send, Sparkles } from "lucide-react";
import { DrawCanvasFullscreen } from "@/components/DrawCanvasFullscreen";

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
  const [drawOpen, setDrawOpen] = useState(false);
  const [prayerText, setPrayerText] = useState("");
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Voice
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (open && mode === "type") setTimeout(() => textareaRef.current?.focus(), 300);
  }, [open, mode]);

  const toggleRecording = useCallback(() => {
    if (recording) { recognitionRef.current?.stop(); setRecording(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast({ title: "Speech recognition not supported in this browser", variant: "destructive" }); return; }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    let finalTranscript = transcript;
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + " ";
        else interim += event.results[i][0].transcript;
      }
      setTranscript(finalTranscript);
      setPrayerText(finalTranscript + interim);
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }, [recording, transcript, toast]);

  const handleSave = async () => {
    const text = prayerText.trim();
    if (!text || !user) return;
    setSaving(true);
    try {
      const { data: card, error } = await supabase.from("prayer_cards").insert({
        prayer_text: text, created_by: user.id, status: "private", source: "user", prayer_type: "personal",
      }).select("id").single();
      if (error) throw error;
      await supabase.from("user_saved_prayers").insert({ user_id: user.id, prayer_id: card.id, pinned: false, favorite: false });
      setEnriching(true);
      const enrichPromise = supabase.functions.invoke("enrich-prayer", { body: { prayer_text: text } });
      onOpenChange(false);
      setPrayerText(""); setTranscript(""); setMode("type");
      toast({ title: "Prayer saved 🙏", description: "Enriching with scripture in the background…" });
      onPrayerCreated?.();
      try {
        const { data: enrichData } = await enrichPromise;
        if (enrichData && card.id) {
          const updates: any = {};
          if (enrichData.labels?.length) updates.labels = enrichData.labels;
          if (enrichData.verses?.length) {
            const words = text.split(" ").slice(0, 6).join(" ");
            updates.title = words.length < text.length ? `${words}…` : words;
            updates.extended_prayer = JSON.stringify(enrichData.verses.map((v: any) => ({ ref: v.ref, text: v.text })));
          }
          if (Object.keys(updates).length > 0) await supabase.from("prayer_cards").update(updates).eq("id", card.id);
        }
      } catch {} finally { setEnriching(false); }
    } catch { toast({ title: "Failed to save prayer", variant: "destructive" }); } finally { setSaving(false); }
  };

  const handleClose = () => {
    if (recording) { recognitionRef.current?.stop(); setRecording(false); }
    onOpenChange(false);
  };

  const canSave = prayerText.trim().length > 5;

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
        <Drawer.Content
          className="flex flex-col rounded-t-[28px] fixed bottom-0 left-0 right-0 z-50 shadow-2xl"
          style={{ height: "94vh", backgroundColor: "var(--kp-bg-surface)", color: "var(--kp-text-body)" }}
        >
          {/* Handle + header */}
          <div className="px-5 pt-4 pb-2">
            <div className="mx-auto w-9 h-1 rounded-full mb-4" style={{ backgroundColor: "var(--kp-border-gold)" }} />
            <div className="flex items-center justify-between mb-4">
              <Drawer.Title className="text-lg font-bold" style={{ fontFamily: "var(--kp-font-display)", color: "var(--kp-text-primary)" }}>
                Pray Now
              </Drawer.Title>
              <button onClick={handleClose} className="p-2 rounded-xl active:scale-90 transition-all" style={{ color: "var(--kp-text-muted)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode tabs */}
            <div className="flex rounded-[var(--kp-radius-sm)] overflow-hidden mb-4" style={{ border: "1px solid var(--kp-border)" }}>
              {([
                { id: "type" as const, icon: Type, label: "Type" },
                { id: "speak" as const, icon: Mic, label: "Speak" },
                { id: "draw" as const, icon: PenLine, label: "Draw" },
              ]).map(tab => (
                <button key={tab.id} onClick={() => setMode(tab.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: mode === tab.id ? "rgba(180,140,50,0.12)" : "transparent",
                    color: mode === tab.id ? "var(--kp-gold)" : "var(--kp-text-muted)",
                  }}>
                  <tab.icon className="w-4 h-4" />{tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 px-5 pb-4 flex flex-col overflow-hidden">
            {mode === "type" && (
              <textarea ref={textareaRef} value={prayerText} onChange={e => setPrayerText(e.target.value)}
                placeholder="Lord…"
                className="flex-1 w-full resize-none bg-transparent border-none outline-none text-[16px] leading-[1.9]"
                style={{ fontFamily: "var(--kp-font-prayer)", color: "var(--kp-text-body)", caretColor: "var(--kp-gold)" }} />
            )}
            {mode === "speak" && (
              <div className="flex-1 flex flex-col items-center justify-center gap-6">
                {prayerText && (
                  <div className="w-full max-h-[40vh] overflow-auto px-2">
                    <p className="text-[15px] leading-[1.8] text-center" style={{ fontFamily: "var(--kp-font-prayer)", color: "var(--kp-text-body)" }}>{prayerText}</p>
                  </div>
                )}
                <motion.button onClick={toggleRecording}
                  className="w-[100px] h-[100px] rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: recording ? "rgba(248,113,113,0.2)" : "rgba(180,140,50,0.1)",
                    border: recording ? "2px solid rgba(248,113,113,0.4)" : "2px solid rgba(180,140,50,0.25)",
                  }}
                  animate={recording ? { scale: [1, 1.05, 1] } : {}}
                  transition={recording ? { duration: 1.5, repeat: Infinity } : {}}>
                  {recording ? <MicOff className="w-9 h-9" style={{ color: "var(--kp-red)" }} /> : <Mic className="w-9 h-9" style={{ color: "var(--kp-gold)" }} />}
                </motion.button>
                <p className="text-xs" style={{ color: "var(--kp-text-muted)" }}>
                  {recording ? "Listening… tap to stop" : "Tap to start speaking your prayer"}
                </p>
              </div>
            )}
            {mode === "draw" && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 rounded-[var(--kp-radius)]"
                style={{ backgroundColor: "var(--kp-bg-elevated)", border: "1px solid var(--kp-border)" }}>
                <PenLine className="w-12 h-12" style={{ color: "var(--kp-gold)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--kp-text-primary)" }}>Draw your prayer</p>
                <button
                  onClick={() => setDrawOpen(true)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.96]"
                  style={{ backgroundColor: "var(--kp-gold)", color: "var(--kp-bg-deep)" }}
                >
                  Open Canvas
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pb-6 pt-2" style={{ borderTop: "1px solid var(--kp-border)" }}>
            <button onClick={handleSave} disabled={!canSave || saving}
              className="w-full py-3.5 rounded-[var(--kp-radius)] font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: canSave ? "var(--kp-gold)" : "var(--kp-bg-elevated)",
                color: canSave ? "#1a1610" : "var(--kp-text-muted)",
                boxShadow: canSave ? "0 4px 20px -4px rgba(180,140,50,0.4)" : "none",
              }}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Send className="w-4 h-4" />Save Prayer</>}
            </button>
            {enriching && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-2 mt-3">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" style={{ color: "var(--kp-gold)" }} />
                <span className="text-[11px]" style={{ color: "var(--kp-text-muted)" }}>Enriching with scripture…</span>
              </motion.div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
