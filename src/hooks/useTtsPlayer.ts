import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TimedPhrase {
  text: string;
  start: number;
}

interface UseTtsPlayerOptions {
  /** Storage cache key prefix — defaults to the text hash if not provided */
  cacheId?: string;
  /** Pre-existing audio URL (e.g. prayer_cards.audio_url) */
  audioUrl?: string | null;
}

export function useTtsPlayer(options: UseTtsPlayerOptions = {}) {
  const { toast } = useToast();
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [timedPhrases, setTimedPhrases] = useState<TimedPhrase[] | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopTts = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setTtsPlaying(false);
  }, []);

  const pauseTts = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
  }, []);

  const resumeTts = useCallback(() => {
    if (audioRef.current) audioRef.current.play();
  }, []);

  const changePlaybackRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, []);

  const toggleTts = useCallback(async (text: string, cacheId?: string) => {
    if (ttsPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setTtsPlaying(false);
      return;
    }
    if (ttsLoading || !text) return;
    setTtsLoading(true);

    const audio = new Audio();
    audioRef.current = audio;
    audio.playbackRate = playbackRate;
    audio.onended = () => setTtsPlaying(false);
    audio.onerror = () => setTtsPlaying(false);

    const id = cacheId || options.cacheId;

    try {
      // Check for cached audio via audioUrl prop
      if (options.audioUrl) {
        audio.src = options.audioUrl;
        // Try loading cached phrases JSON
        if (id) {
          try {
            const phrasesUrl = supabase.storage
              .from("prayer-audio")
              .getPublicUrl(`${id}_phrases.json`).data.publicUrl;
            const phrasesResp = await fetch(phrasesUrl);
            if (phrasesResp.ok) {
              const phrases = await phrasesResp.json();
              if (Array.isArray(phrases)) setTimedPhrases(phrases);
            }
          } catch { /* no cached phrases */ }
        }
        await audio.play();
        setTtsPlaying(true);
        setTtsLoading(false);
        return;
      }

      // Check if cached in storage by id
      if (id) {
        try {
          const cachedUrl = supabase.storage
            .from("prayer-audio")
            .getPublicUrl(`${id}.mp3`).data.publicUrl;
          const headResp = await fetch(cachedUrl, { method: "HEAD" });
          if (headResp.ok && headResp.headers.get("content-length") !== "0") {
            audio.src = cachedUrl;
            // Try loading cached phrases
            try {
              const phrasesUrl = supabase.storage
                .from("prayer-audio")
                .getPublicUrl(`${id}_phrases.json`).data.publicUrl;
              const phrasesResp = await fetch(phrasesUrl);
              if (phrasesResp.ok) {
                const phrases = await phrasesResp.json();
                if (Array.isArray(phrases)) setTimedPhrases(phrases);
              }
            } catch { /* no cached phrases */ }
            await audio.play();
            setTtsPlaying(true);
            setTtsLoading(false);
            return;
          }
        } catch { /* not cached, generate fresh */ }
      }

      // Generate fresh audio via edge function
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prayer-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text }),
        }
      );
      if (!resp.ok) throw new Error("Could not generate speech");
      const data = await resp.json();

      // Decode base64 audio to blob
      const binaryStr = atob(data.audio);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const blob = new Blob([bytes], { type: "audio/mpeg" });

      // Set timed phrases if available
      if (data.timedPhrases && Array.isArray(data.timedPhrases)) {
        setTimedPhrases(data.timedPhrases);
      }

      // Cache audio + phrases to storage
      if (id) {
        const storagePath = `${id}.mp3`;
        await supabase.storage
          .from("prayer-audio")
          .upload(storagePath, blob, { contentType: "audio/mpeg", upsert: true });
        // Cache phrases JSON
        if (data.timedPhrases) {
          const phrasesBlob = new Blob([JSON.stringify(data.timedPhrases)], { type: "application/json" });
          await supabase.storage
            .from("prayer-audio")
            .upload(`${id}_phrases.json`, phrasesBlob, { contentType: "application/json", upsert: true });
        }
      }

      const url = URL.createObjectURL(blob);
      audio.src = url;
      audio.onended = () => { setTtsPlaying(false); URL.revokeObjectURL(url); };
      await audio.play();
      setTtsPlaying(true);
    } catch {
      toast({ title: "Could not read aloud", variant: "destructive" });
    } finally {
      setTtsLoading(false);
    }
  }, [ttsPlaying, ttsLoading, playbackRate, options.audioUrl, options.cacheId, toast]);

  return {
    ttsLoading,
    ttsPlaying,
    playbackRate,
    timedPhrases,
    audioRef,
    toggleTts,
    stopTts,
    pauseTts,
    resumeTts,
    changePlaybackRate,
    setTimedPhrases,
  };
}
