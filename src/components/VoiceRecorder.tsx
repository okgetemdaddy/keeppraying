import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2, X, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface VoiceRecorderProps {
  /** Visual variant */
  variant?: "fab" | "inline" | "compact";
  /** Dark mode (for Board/WarRoom overlays) */
  dark?: boolean;
  /** Called after prayer card is created */
  onPrayerCreated?: (prayerId: string) => void;
}

// Offline queue stored in localStorage
const OFFLINE_KEY = "keeppraying_voice_queue";

function getOfflineQueue(): { text: string; timestamp: number }[] {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_KEY) || "[]");
  } catch {
    return [];
  }
}

function addToOfflineQueue(text: string) {
  const queue = getOfflineQueue();
  queue.push({ text, timestamp: Date.now() });
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(queue));
}

type RecordingState = "idle" | "recording" | "transcribing" | "refining" | "preview";

// Check for SpeechRecognition support
const SpeechRecognition =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export function VoiceRecorder({ variant = "fab", dark = false, onPrayerCreated }: VoiceRecorderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [state, setState] = useState<RecordingState>("idle");
  const [transcript, setTranscript] = useState("");
  const [refined, setRefined] = useState<{ title: string; prayer_text: string; verses: string } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const micErrorTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const transcriptRef = useRef("");
  const stateRef = useRef<RecordingState>("idle");

  // Keep stateRef in sync
  useEffect(() => { stateRef.current = state; }, [state]);

  // MediaRecorder for actual audio capture
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);

  // Process offline queue on mount + listen for reconnect
  useEffect(() => {
    if (!user) return;

    const processOfflineQueue = async () => {
      const queue = getOfflineQueue();
      if (queue.length === 0) return;
      localStorage.removeItem(OFFLINE_KEY);
      for (const item of queue) {
        try {
          await refineAndSave(item.text);
        } catch {
          addToOfflineQueue(item.text);
        }
      }
    };

    processOfflineQueue();
    window.addEventListener("online", processOfflineQueue);
    return () => window.removeEventListener("online", processOfflineQueue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const startRecording = useCallback(() => {
    if (!SpeechRecognition) {
      toast({
        title: "Voice not supported",
        description: "Your browser doesn't support speech recognition. Try Chrome or Edge.",
        variant: "destructive",
      });
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
        toast({
          title: "Microphone not available",
          description: "Please allow microphone access in your browser settings and try again.",
        });
        cancel();
        return;
      }

      toast({ title: "Recording error", description: event.error, variant: "destructive" });
      stopRecording();
    };

    recognition.onend = () => {
      // Auto-restart if still in recording state (use ref to avoid stale closure)
      if (recognitionRef.current && stateRef.current === "recording") {
        try { recognition.start(); } catch { /* ignore */ }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState("recording");
    setTranscript("");
    setRefined(null);
    transcriptRef.current = "";
    setElapsed(0);
    audioBlobRef.current = null;
    audioChunksRef.current = [];

    // Start MediaRecorder in parallel
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm" });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        audioBlobRef.current = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
    }).catch(() => {
      // If mic access denied, we still have speech recognition
    });

    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50);
  }, [toast, state]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (navigator.vibrate) navigator.vibrate([30, 50, 30]);

    const text = transcriptRef.current.trim();
    if (!text || text.length < 5) {
      setState("idle");
      toast({ title: "No speech detected", description: "Please try again and speak clearly." });
      return;
    }

    setState("refining");
    refineTranscript(text);
  }, []);

  const refineTranscript = async (text: string) => {
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/refine-voice-prayer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });

      if (!resp.ok) {
        throw new Error("Refinement failed");
      }

      const data = await resp.json();
      setRefined({
        title: data.title || "",
        prayer_text: data.prayer_text || text,
        verses: data.verses || "",
      });
      setState("preview");
    } catch {
      // Offline fallback — save raw text
      if (!navigator.onLine) {
        addToOfflineQueue(text);
        toast({
          title: "Saved offline 📴",
          description: "Your prayer will be refined and saved when you're back online.",
        });
        setState("idle");
        return;
      }
      // Use raw text as fallback
      setRefined({
        title: "",
        prayer_text: text,
        verses: "",
      });
      setState("preview");
      toast({
        title: "Using your raw words",
        description: "AI refinement wasn't available, but your heartfelt words are perfect as they are.",
      });
    }
  };

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
      await supabase.from("user_saved_prayers").insert({
        user_id: user.id,
        prayer_id: card.id,
        position: 0,
      });
    }
  };

  const savePrayer = async () => {
    if (!user || !refined) return;
    setSaving(true);
    try {
      const { data: card, error } = await supabase.from("prayer_cards").insert({
        title: refined.title || null,
        prayer_text: refined.prayer_text,
        extended_prayer: refined.verses || null,
        labels: ["voice-prayer"],
        status: "private",
        created_by: user.id,
      } as any).select("id").single();

      if (error) throw error;

      if (card?.id) {
        // Upload voice audio blob if available
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

        await supabase.from("user_saved_prayers").insert({
          user_id: user.id,
          prayer_id: card.id,
          position: 0,
        });
        onPrayerCreated?.(card.id);
      }

      toast({ title: "Prayer saved to your board 🙏" });
      setState("idle");
      setRefined(null);
      setTranscript("");
      audioBlobRef.current = null;
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setState("idle");
    setTranscript("");
    setRefined(null);
    audioBlobRef.current = null;
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const baseColor = dark ? "text-white" : "text-foreground";
  const mutedColor = dark ? "text-white/60" : "text-muted-foreground";
  const bgPanel = dark ? "bg-black/60 backdrop-blur-xl border-white/10" : "bg-card/95 backdrop-blur-xl border-border";

  // ── FAB button (default) ──
  if (state === "idle") {
    return (
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={startRecording}
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
    );
  }

  // ── Recording / Refining / Preview overlay ──
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className={`fixed inset-x-4 bottom-24 sm:bottom-8 sm:right-8 sm:left-auto sm:w-[420px] z-[60] rounded-3xl border p-5 shadow-2xl ${bgPanel}`}
      >
        {/* Close button */}
        <button
          onClick={cancel}
          className={`absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 transition-colors ${mutedColor}`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* ── Recording state ── */}
        {state === "recording" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center"
              >
                <div className="w-4 h-4 rounded-full bg-red-500" />
              </motion.div>
              <div>
                <p className={`text-sm font-semibold ${baseColor}`}>Listening…</p>
                <p className={`text-xs ${mutedColor}`}>{formatTime(elapsed)}</p>
              </div>
            </div>

            {transcript && (
              <p className={`text-sm leading-relaxed max-h-32 overflow-y-auto ${mutedColor}`}>
                {transcript}
              </p>
            )}

            <Button
              onClick={stopRecording}
              className="w-full rounded-xl gap-2"
              variant="destructive"
            >
              <MicOff className="w-4 h-4" /> Stop & Refine
            </Button>
          </div>
        )}

        {/* ── Refining state ── */}
        {state === "refining" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-8 h-8 text-primary" />
            </motion.div>
            <p className={`text-sm font-medium ${baseColor}`}>Refining your prayer…</p>
            <p className={`text-xs ${mutedColor}`}>Adding verses and polishing your words</p>
          </div>
        )}

        {/* ── Preview state ── */}
        {state === "preview" && refined && (
          <div className="space-y-4">
            <div>
              <p className={`text-xs uppercase tracking-wider font-semibold mb-2 ${mutedColor}`}>
                ✨ Your refined prayer
              </p>
              {refined.title && (
                <h3 className={`font-display text-lg font-semibold mb-1 ${baseColor}`}>
                  {refined.title}
                </h3>
              )}
              <p className={`text-sm leading-relaxed max-h-40 overflow-y-auto ${baseColor}`}>
                {refined.prayer_text}
              </p>
              {refined.verses && (
                <p className={`text-xs mt-2 italic ${mutedColor}`}>
                  {refined.verses}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={savePrayer}
                disabled={saving}
                className="flex-1 rounded-xl gap-2 btn-gold"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save to Board
              </Button>
              <Button
                onClick={cancel}
                variant="ghost"
                className={`rounded-xl ${mutedColor}`}
              >
                Discard
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
