import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Check } from "lucide-react";

interface VoiceAnnotationOverlayProps {
  active: boolean;
  onClose: () => void;
  onTranscriptComplete: (transcript: string, linkedVerse: number | null) => void;
  findNearestVerse?: () => number | null;
}

export function VoiceAnnotationOverlay({
  active,
  onClose,
  onTranscriptComplete,
  findNearestVerse,
}: VoiceAnnotationOverlayProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const recognitionRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  const startListening = useCallback(async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not supported");
      return;
    }

    try {
      // Start audio context for waveform visualization
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Audio level animation loop
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
        setAudioLevel(avg / 255);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch {
      // Microphone access denied — still allow speech recognition
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      if (finalText) setTranscript((prev) => prev + " " + finalText);
      setInterimTranscript(interimText);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    cancelAnimationFrame(animFrameRef.current);
    analyserRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleConfirm = useCallback(() => {
    const fullTranscript = (transcript + " " + interimTranscript).trim();
    if (!fullTranscript) {
      onClose();
      return;
    }
    const linkedVerse = findNearestVerse?.() ?? null;
    onTranscriptComplete(fullTranscript, linkedVerse);
    setTranscript("");
    setInterimTranscript("");
    stopListening();
    onClose();
  }, [transcript, interimTranscript, findNearestVerse, onTranscriptComplete, stopListening, onClose]);

  const handleCancel = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    stopListening();
    onClose();
  }, [stopListening, onClose]);

  // Auto-start on open
  useEffect(() => {
    if (active && !isListening) {
      startListening();
    }
  }, [active]);

  if (!active) return null;

  const displayText = (transcript + " " + interimTranscript).trim();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-md"
      >
        <div className="rounded-3xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Waveform indicator */}
          <div className="flex items-center justify-center gap-1 py-4 px-6">
            {Array.from({ length: 12 }).map((_, i) => {
              const height = isListening
                ? 8 + audioLevel * 32 * Math.sin((i / 12) * Math.PI) * (0.6 + Math.random() * 0.4)
                : 4;
              return (
                <motion.div
                  key={i}
                  animate={{ height }}
                  transition={{ duration: 0.1 }}
                  className="w-1 rounded-full bg-primary"
                  style={{ minHeight: 4 }}
                />
              );
            })}
          </div>

          {/* Status */}
          <div className="px-6 pb-2 text-center">
            <span className={`text-xs font-medium ${isListening ? "text-primary" : "text-muted-foreground"}`}>
              {isListening ? "Listening…" : "Microphone off"}
            </span>
          </div>

          {/* Transcript */}
          {displayText && (
            <div className="px-6 pb-3">
              <div className="rounded-xl bg-muted/40 p-3 max-h-24 overflow-y-auto">
                <p className="text-sm text-foreground leading-relaxed">{displayText}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center gap-3 px-6 pb-5">
            <button
              onClick={handleCancel}
              className="h-10 w-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <button
              onClick={isListening ? stopListening : startListening}
              className={`h-14 w-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isListening
                  ? "bg-destructive text-destructive-foreground animate-pulse"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>

            <button
              onClick={handleConfirm}
              disabled={!displayText}
              className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 hover:opacity-90 transition-all"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
