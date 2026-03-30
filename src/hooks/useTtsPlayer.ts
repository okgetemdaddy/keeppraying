import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCachedAudio, setCachedAudio } from "@/lib/audioCache";

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

/** Fetch a URL as a Blob, returning null on failure. */
async function fetchBlob(url: string): Promise<Blob | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.blob();
  } catch {
    return null;
  }
}

/** Try to load phrases JSON from Supabase Storage. */
async function fetchRemotePhrases(id: string): Promise<TimedPhrase[] | null> {
  try {
    const phrasesUrl = supabase.storage
      .from("prayer-audio")
      .getPublicUrl(`${id}_phrases.json`).data.publicUrl;
    const resp = await fetch(phrasesUrl);
    if (!resp.ok) return null;
    const data = await resp.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
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
    // Toggle off if already playing
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
      /* ─── 1) IndexedDB — instant local cache ─── */
      if (id) {
        const local = await getCachedAudio(id);
        if (local) {
          const url = URL.createObjectURL(local.blob);
          audio.src = url;
          audio.onended = () => { setTtsPlaying(false); URL.revokeObjectURL(url); };
          if (local.phrases) setTimedPhrases(local.phrases);
          await audio.play();
          setTtsPlaying(true);
          setTtsLoading(false);
          return;
        }
      }

      /* ─── 2) Pre-existing audioUrl prop ─── */
      if (options.audioUrl) {
        const blob = await fetchBlob(options.audioUrl);
        const phrases = id ? await fetchRemotePhrases(id) : null;
        if (phrases) setTimedPhrases(phrases);

        if (blob) {
          const url = URL.createObjectURL(blob);
          audio.src = url;
          audio.onended = () => { setTtsPlaying(false); URL.revokeObjectURL(url); };
          await audio.play();
          setTtsPlaying(true);
          setTtsLoading(false);
          // Background-save to IndexedDB
          if (id) void setCachedAudio(id, blob, phrases);
          return;
        }
        // If blob fetch failed, fall through to next layer
      }

      /* ─── 3) Supabase Storage (remote DB cache) ─── */
      if (id) {
        const cachedUrl = supabase.storage
          .from("prayer-audio")
          .getPublicUrl(`${id}.mp3`).data.publicUrl;
        const headResp = await fetch(cachedUrl, { method: "HEAD" });
        if (headResp.ok && headResp.headers.get("content-length") !== "0") {
          const blob = await fetchBlob(cachedUrl);
          const phrases = await fetchRemotePhrases(id);
          if (phrases) setTimedPhrases(phrases);

          if (blob) {
            const url = URL.createObjectURL(blob);
            audio.src = url;
            audio.onended = () => { setTtsPlaying(false); URL.revokeObjectURL(url); };
            await audio.play();
            setTtsPlaying(true);
            setTtsLoading(false);
            // Background-save to IndexedDB
            void setCachedAudio(id, blob, phrases);
            return;
          }
        }
      }

      /* ─── 4) Edge function — last resort, generate fresh ─── */
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

      // Phrases
      const phrases: TimedPhrase[] | null =
        data.timedPhrases && Array.isArray(data.timedPhrases) ? data.timedPhrases : null;
      if (phrases) setTimedPhrases(phrases);

      // Upload to Supabase Storage (source of truth)
      if (id) {
        const storagePath = `${id}.mp3`;
        await supabase.storage
          .from("prayer-audio")
          .upload(storagePath, blob, { contentType: "audio/mpeg", upsert: true });
        if (phrases) {
          const phrasesBlob = new Blob([JSON.stringify(phrases)], { type: "application/json" });
          await supabase.storage
            .from("prayer-audio")
            .upload(`${id}_phrases.json`, phrasesBlob, { contentType: "application/json", upsert: true });
        }
      }

      // Play
      const url = URL.createObjectURL(blob);
      audio.src = url;
      audio.onended = () => { setTtsPlaying(false); URL.revokeObjectURL(url); };
      await audio.play();
      setTtsPlaying(true);

      // Background-save to IndexedDB
      if (id) void setCachedAudio(id, blob, phrases);
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
