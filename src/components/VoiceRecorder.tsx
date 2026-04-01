import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2, Sparkles, Check, ArrowLeft, Save, AudioLines, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface VoiceRecorderProps {
  variant?: "fab" | "inline" | "compact";
  dark?: boolean;
  autoStart?: boolean;
  onPrayerCreated?: (prayerId: string) => void;
  onClose?: () => void;
}

// Offline queue
const OFFLINE_KEY = "keeppraying_voice_queue";
function getOfflineQueue(): { text: string; timestamp: number }[] {
  try { return JSON.parse(localStorage.getItem(OFFLINE_KEY) || "[]"); } catch { return []; }
}
function addToOfflineQueue(text: string) {
  const queue = getOfflineQueue();
  queue.push({ text, timestamp: Date.now() });
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(queue));
}

type RecordingState = "idle" | "recording" | "results" | "refining" | "refined";

const SpeechRecognition =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export function VoiceRecorder({ variant = "fab", dark = false, autoStart = false, onPrayerCreated, onClose }: VoiceRecorderProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [state, setState] = useState<RecordingState>("idle");
  const [transcript, setTranscript] = useState("");
  const [originalTranscript, setOriginalTranscript] = useState("");
  const [editedTranscript, setEditedTranscript] = useState("");
  const [refined, setRefined] = useState<{ title: string; prayer_text: string; verses: string } | null>(null);
  const [viewingRefined, setViewingRefined] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  // Save tracking
  const [savedVoice, setSavedVoice] = useState(false);
  const [savedText, setSavedText] = useState(false);
  const [savedRefined, setSavedRefined] = useState(false);
  const [savingVoice, setSavingVoice] = useState(false);
  const [savingText, setSavingText] = useState(false);
  const [savingRefined, setSavingRefined] = useState(false);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const transcriptRef = useRef("");
  const stateRef = useRef<RecordingState>("idle");
  const micErrorTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);

  useEffect(() => { stateRef.current = state; }, [state]);

  // Process offline queue
  useEffect(() => {
    if (!user) return;
    const processOfflineQueue = async () => {
      const queue = getOfflineQueue();
      if (queue.length === 0) return;
      localStorage.removeItem(OFFLINE_KEY);
      for (const item of queue) {
        try { await refineAndSave(item.text); } catch { addToOfflineQueue(item.text); }
      }
    };
    processOfflineQueue();
    window.addEventListener("online", processOfflineQueue);
    return () => window.removeEventListener("online", processOfflineQueue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const startRecording = useCallback(() => {
    if (!SpeechRecognition) {
      toast({ title: "Voice not supported", description: "Your browser doesn't support speech recognition. Try Chrome or Edge.", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const combined = (finalTranscript + interim).trim();
      transcriptRef.current = combined;
      setTranscript(combined);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      const harmless = ["no-speech", "aborted", "network"];
      if (harmless.includes(event.error)) return;
      const micBlocked = ["audio-capture", "not-allowed"];
      if (micBlocked.includes(event.error)) {
        stopAllRecording();
        setState("idle");
        if (micErrorTimerRef.current) clearTimeout(micErrorTimerRef.current);
        setMicError("Please allow microphone access in your browser settings.");
        micErrorTimerRef.current = setTimeout(() => setMicError(null), 4000);
        return;
      }
      toast({ title: "Recording error", description: event.error, variant: "destructive" });
      handleStopRecording();
    };

    recognition.onend = () => {
      if (recognitionRef.current && stateRef.current === "recording") {
        try { recognition.start(); } catch { /* ignore */ }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState("recording");
    setTranscript("");
    setOriginalTranscript("");
    setEditedTranscript("");
    setRefined(null);
    setViewingRefined(false);
    setSavedVoice(false);
    setSavedText(false);
    setSavedRefined(false);
    transcriptRef.current = "";
    setElapsed(0);
    audioBlobRef.current = null;
    audioChunksRef.current = [];

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm",
      });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        audioBlobRef.current = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
    }).catch(() => { /* mic denied, speech recognition may still work */ });

    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    if (navigator.vibrate) navigator.vibrate(50);
  }, [toast]);

  const stopAllRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = undefined; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, []);

  const handleStopRecording = useCallback(() => {
    stopAllRecording();
    if (navigator.vibrate) navigator.vibrate([30, 50, 30]);

    const text = transcriptRef.current.trim();
    if (!text || text.length < 5) {
      setState("idle");
      toast({ title: "No speech detected", description: "Please try again and speak clearly." });
      return;
    }

    setOriginalTranscript(text);
    setEditedTranscript(text);
    setState("results");
  }, [stopAllRecording, toast]);

  const handleDone = useCallback(() => {
    stopAllRecording();
    setState("idle");
    setTranscript("");
    setOriginalTranscript("");
    setEditedTranscript("");
    setRefined(null);
    setViewingRefined(false);
    setSavedVoice(false);
    setSavedText(false);
    setSavedRefined(false);
    audioBlobRef.current = null;
    onClose?.();
  }, [stopAllRecording, onClose]);

  // Auto-start recording when mounted with autoStart prop
  useEffect(() => {
    if (autoStart && state === "idle") {
      startRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Save as Voice Prayer (audio + original transcript, no edits) ──
  const saveVoicePrayer = async () => {
    if (!user || savedVoice) return;
    setSavingVoice(true);
    try {
      const { data: card, error } = await supabase.from("prayer_cards").insert({
        title: null,
        prayer_text: originalTranscript,
        labels: ["voice-prayer"],
        status: "private",
        created_by: user.id,
      } as any).select("id").single();
      if (error) throw error;

      if (card?.id) {
        if (audioBlobRef.current) {
          const path = `voice_${card.id}.webm`;
          const { error: uploadErr } = await supabase.storage
            .from("prayer-audio")
            .upload(path, audioBlobRef.current, { upsert: true, contentType: "audio/webm" });
          if (!uploadErr) {
            const { data: urlData } = supabase.storage.from("prayer-audio").getPublicUrl(path);
            await supabase.from("prayer_cards")
              .update({ voice_audio_url: urlData.publicUrl } as any)
              .eq("id", card.id);
          }
        }
        await supabase.from("user_saved_prayers").insert({ user_id: user.id, prayer_id: card.id, position: 0 });
        onPrayerCreated?.(card.id);
      }

      setSavedVoice(true);
      toast({ title: "Voice prayer saved 🎙️" });
    } catch {
      toast({ title: "Failed to save voice prayer", variant: "destructive" });
    } finally {
      setSavingVoice(false);
    }
  };

  // ── Save as Text Prayer Card (edited transcript) ──
  const saveTextPrayer = async () => {
    if (!user || savedText) return;
    setSavingText(true);
    try {
      const { data: card, error } = await supabase.from("prayer_cards").insert({
        title: null,
        prayer_text: editedTranscript,
        labels: ["transcribed-prayer"],
        status: "private",
        created_by: user.id,
      } as any).select("id").single();
      if (error) throw error;

      if (card?.id) {
        await supabase.from("user_saved_prayers").insert({ user_id: user.id, prayer_id: card.id, position: 0 });
        onPrayerCreated?.(card.id);
      }

      setSavedText(true);
      toast({ title: "Prayer card saved 📝" });
    } catch {
      toast({ title: "Failed to save prayer card", variant: "destructive" });
    } finally {
      setSavingText(false);
    }
  };

  // ── Refine with PrayerAssist ──
  const triggerRefine = async () => {
    setState("refining");
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/refine-voice-prayer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: originalTranscript }),
      });
      if (!resp.ok) throw new Error("Refinement failed");
      const data = await resp.json();
      setRefined({
        title: data.title || "",
        prayer_text: data.prayer_text || originalTranscript,
        verses: data.verses || "",
      });
      setState("refined");
      setViewingRefined(true);
    } catch {
      if (!navigator.onLine) {
        addToOfflineQueue(originalTranscript);
        toast({ title: "Saved offline 📴", description: "Your prayer will be refined when you're back online." });
        setState("results");
        return;
      }
      toast({ title: "Refinement unavailable", description: "Try again later.", variant: "destructive" });
      setState("results");
    }
  };

  // ── Save refined prayer ──
  const saveRefinedPrayer = async () => {
    if (!user || !refined || savedRefined) return;
    setSavingRefined(true);
    try {
      const { data: card, error } = await supabase.from("prayer_cards").insert({
        title: refined.title || null,
        prayer_text: refined.prayer_text,
        extended_prayer: refined.verses || null,
        labels: ["voice-prayer", "ai-refined"],
        status: "private",
        created_by: user.id,
      } as any).select("id").single();
      if (error) throw error;

      if (card?.id) {
        await supabase.from("user_saved_prayers").insert({ user_id: user.id, prayer_id: card.id, position: 0 });
        onPrayerCreated?.(card.id);
      }

      setSavedRefined(true);
      toast({ title: "Refined prayer saved ✨" });
      // Slide back to results so user can still save other types
      setTimeout(() => {
        setViewingRefined(false);
        setState("results");
      }, 800);
    } catch {
      toast({ title: "Failed to save refined prayer", variant: "destructive" });
    } finally {
      setSavingRefined(false);
    }
  };

  // ── Offline queue background save ──
  const refineAndSave = async (text: string) => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/refine-voice-prayer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: text }),
    });
    const data = resp.ok ? await resp.json() : { prayer_text: text, title: "", verses: "" };
    if (!user) return;
    const { data: card } = await supabase.from("prayer_cards").insert({
      title: data.title || null,
      prayer_text: data.prayer_text || text,
      extended_prayer: data.verses || null,
      labels: ["voice-prayer"],
      status: "private",
      created_by: user.id,
    }).select("id").single();
    if (card?.id) {
      await supabase.from("user_saved_prayers").insert({ user_id: user.id, prayer_id: card.id, position: 0 });
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const baseColor = dark ? "text-white" : "text-foreground";
  const mutedColor = dark ? "text-white/60" : "text-muted-foreground";
  const bgPanel = dark
    ? "bg-zinc-900/95 backdrop-blur-2xl border-white/10"
    : "bg-card/98 backdrop-blur-2xl border-border";

  // ── Idle: just the mic button (skip if autoStart — will transition to recording) ──
  if (state === "idle" && !autoStart) {
    return (
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setMicError(null); startRecording(); }}
          className={`
            ${variant === "compact" ? "p-2 rounded-xl" : "p-3 rounded-2xl"}
            transition-all shadow-lg
            ${dark
              ? "bg-white/10 hover:bg-white/20 text-white border border-white/15"
              : "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
            }
          `}
          title="Record a prayer"
        >
          <Mic className={variant === "compact" ? "w-4 h-4" : "w-5 h-5"} />
        </motion.button>

        <AnimatePresence>
          {micError && (
            <motion.div
              key="mic-error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={`absolute top-full mt-3 left-1/2 -translate-x-1/2 z-[9999] w-56 rounded-xl px-3 py-2 text-xs shadow-2xl border ${
                dark
                  ? "bg-zinc-900 border-amber-500/30 text-white/90"
                  : "bg-card border-border text-foreground shadow-lg"
              }`}
            >
              <div className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 ${
                dark ? "bg-zinc-900 border-l border-t border-amber-500/30" : "bg-card border-l border-t border-border"
              }`} />
              <p className="font-medium mb-0.5 relative">🎙️ Mic not available</p>
              <p className={`relative ${dark ? "text-white/60" : "text-muted-foreground"}`}>{micError}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Full-screen centered overlay for all active states ──
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative w-full max-w-lg mx-4 rounded-3xl border shadow-2xl overflow-hidden ${bgPanel}`}
      >
        {/* ── Recording state ── */}
        <AnimatePresence mode="wait">
          {state === "recording" && (
            <motion.div
              key="recording"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -40 }}
              className="relative p-6 sm:p-8 flex flex-col items-center text-center"
            >
              {/* Subtle radial glow behind waveform */}
              <div className="absolute inset-0 pointer-events-none" style={{
                background: "radial-gradient(ellipse at 50% 30%, hsl(var(--gold) / 0.10) 0%, transparent 70%)"
              }} />

              {/* Listening label */}
              <p className="font-display text-xs uppercase tracking-[0.25em] text-muted-foreground mb-4 relative z-10">
                Listening…
              </p>

              {/* Animated waveform bars */}
              <div className="flex items-center justify-center gap-[5px] h-20 mb-3 relative z-10">
                {[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((delay, i) => (
                  <motion.div
                    key={i}
                    className="w-[5px] rounded-full"
                    style={{ background: "hsl(var(--gold))" }}
                    animate={{
                      height: ["16px", `${28 + Math.sin(i * 1.2) * 16}px`, "16px"],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.1,
                      repeat: Infinity,
                      delay,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>

              {/* Timer */}
              <p className="font-mono text-3xl font-light tracking-wide relative z-10"
                style={{
                  color: "hsl(var(--gold))",
                  textShadow: "0 0 18px hsl(var(--gold) / 0.3)",
                }}
              >
                {formatTime(elapsed)}
              </p>

              {/* Live transcript */}
              {transcript && (
                <div className={`mt-5 w-full rounded-2xl p-4 max-h-40 overflow-y-auto text-left border relative z-10 ${
                  dark
                    ? "bg-white/5 border-white/10"
                    : "bg-accent/40 border-border/60 backdrop-blur-sm"
                }`}>
                  <p className={`text-sm leading-relaxed font-sans ${mutedColor}`}>
                    {transcript}
                  </p>
                </div>
              )}

              {/* Stop button */}
              <div className="mt-6 flex flex-col items-center gap-2 relative z-10">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={handleStopRecording}
                  className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors"
                  style={{
                    background: "hsl(var(--gold-dark))",
                    boxShadow: "0 4px 20px hsl(var(--gold) / 0.35)",
                  }}
                >
                  {/* Square stop icon */}
                  <div className="w-5 h-5 rounded-[3px] bg-white" />
                </motion.button>
                <span className="text-[11px] text-muted-foreground">Tap to stop</span>
              </div>
            </motion.div>
          )}

          {/* ── Refining state ── */}
          {state === "refining" && (
            <motion.div
              key="refining"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 flex flex-col items-center gap-4 py-12"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-10 h-10 text-primary" />
              </motion.div>
              <p className={`text-lg font-semibold ${baseColor}`}>PrayerAssist is refining…</p>
              <p className={`text-sm text-center ${mutedColor}`}>
                Adding Scripture and polishing your heartfelt words
              </p>
            </motion.div>
          )}

          {/* ── Results state (with possible refined slide-over) ── */}
          {(state === "results" || state === "refined") && (
            <motion.div
              key="results-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative overflow-hidden"
            >
              <AnimatePresence mode="wait">
                {!viewingRefined ? (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="p-6 sm:p-8 space-y-5"
                  >
                    <p className={`text-xs uppercase tracking-widest font-semibold ${mutedColor}`}>
                      Your transcribed prayer
                    </p>

                    <Textarea
                      value={editedTranscript}
                      onChange={(e) => setEditedTranscript(e.target.value)}
                      className={`min-h-[120px] max-h-[200px] rounded-2xl text-base font-sans leading-relaxed resize-none ${
                        dark
                          ? "bg-white/5 border-white/10 text-white placeholder:text-white/30"
                          : "bg-muted/40 border-border text-foreground"
                      }`}
                      placeholder="Edit your prayer here…"
                    />

                    <div className="space-y-3">
                      {/* Save as Voice Prayer */}
                      <Button
                        onClick={saveVoicePrayer}
                        disabled={savingVoice || savedVoice}
                        className={`w-full rounded-2xl gap-2 h-11 justify-start ${
                          savedVoice
                            ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/20"
                            : dark
                              ? "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                              : ""
                        }`}
                        variant={savedVoice ? "ghost" : "outline"}
                      >
                        {savingVoice ? <Loader2 className="w-4 h-4 animate-spin" /> :
                          savedVoice ? <Check className="w-4 h-4" /> : <AudioLines className="w-4 h-4" />}
                        {savedVoice ? "Voice Prayer Saved" : "Save as Voice Prayer"}
                      </Button>

                      {/* Save as Prayer Card */}
                      <Button
                        onClick={saveTextPrayer}
                        disabled={savingText || savedText || !editedTranscript.trim()}
                        className={`w-full rounded-2xl gap-2 h-11 justify-start ${
                          savedText
                            ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/20"
                            : dark
                              ? "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                              : ""
                        }`}
                        variant={savedText ? "ghost" : "outline"}
                      >
                        {savingText ? <Loader2 className="w-4 h-4 animate-spin" /> :
                          savedText ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        {savedText ? "Prayer Card Saved" : "Save as Prayer Card"}
                      </Button>

                      {/* PrayerAssist Refine */}
                      <Button
                        onClick={triggerRefine}
                        disabled={savedRefined}
                        className={`w-full rounded-2xl gap-2 h-11 justify-start ${
                          savedRefined
                            ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/20"
                            : "bg-primary/90 hover:bg-primary text-primary-foreground"
                        }`}
                        variant={savedRefined ? "ghost" : "default"}
                      >
                        {savedRefined ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                        {savedRefined ? "Refined Prayer Saved" : "PrayerAssist refined your prayer →"}
                      </Button>
                    </div>

                    {/* I'm Done */}
                    <div className={`pt-3 border-t ${dark ? "border-white/10" : "border-border"}`}>
                      <Button
                        onClick={handleDone}
                        variant="ghost"
                        className={`w-full rounded-2xl h-10 text-sm ${mutedColor} hover:text-white`}
                      >
                        I'm Done
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  /* ── Refined prayer slide ── */
                  <motion.div
                    key="refined-view"
                    initial={{ opacity: 0, x: 60 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 60 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="p-6 sm:p-8 space-y-5"
                  >
                    <button
                      onClick={() => { setViewingRefined(false); setState("results"); }}
                      className={`flex items-center gap-1.5 text-sm ${mutedColor} hover:text-white transition-colors`}
                    >
                      <ArrowLeft className="w-4 h-4" /> Go Back
                    </button>

                    <p className={`text-xs uppercase tracking-widest font-semibold ${mutedColor}`}>
                      ✨ Your refined prayer
                    </p>

                    {refined && (
                      <div className={`rounded-2xl p-5 space-y-3 ${
                        dark ? "bg-white/5" : "bg-muted/40"
                      }`}>
                        {refined.title && (
                          <h3 className={`font-display text-xl font-semibold ${baseColor}`}>
                            {refined.title}
                          </h3>
                        )}
                        <p className={`text-base leading-relaxed ${baseColor}`}>
                          {refined.prayer_text}
                        </p>
                        {refined.verses && (
                          <p className={`text-sm italic pt-2 ${mutedColor}`}>
                            {refined.verses}
                          </p>
                        )}
                      </div>
                    )}

                    <Button
                      onClick={saveRefinedPrayer}
                      disabled={savingRefined || savedRefined}
                      className={`w-full rounded-2xl gap-2 h-12 text-base ${
                        savedRefined
                          ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-primary/90 hover:bg-primary text-primary-foreground"
                      }`}
                    >
                      {savingRefined ? <Loader2 className="w-5 h-5 animate-spin" /> :
                        savedRefined ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                      {savedRefined ? "Saved to Board ✨" : "Save to Board"}
                    </Button>

                    {/* I'm Done (always visible) */}
                    <div className={`pt-3 border-t ${dark ? "border-white/10" : "border-border"}`}>
                      <Button
                        onClick={handleDone}
                        variant="ghost"
                        className={`w-full rounded-2xl h-10 text-sm ${mutedColor} hover:text-white`}
                      >
                        I'm Done
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
