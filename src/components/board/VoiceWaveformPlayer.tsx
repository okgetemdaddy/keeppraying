import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Pause } from "lucide-react";

interface VoiceWaveformPlayerProps {
  audioUrl: string;
  large?: boolean;
  onPlay?: () => boolean | void;
  accentColor?: string;
  captionsEnabled?: boolean;
}

const BAR_COUNT = 40;
const BAR_COUNT_LARGE = 60;

// Static grey for unplayed, gradient orange for played
const GREY = "#9ca3af";

function orangeForIndex(i: number, total: number): string {
  // gradient from hsl(30,90%,50%) to hsl(42,85%,55%)
  const t = total > 1 ? i / (total - 1) : 0;
  const h = 30 + t * 12;
  const s = 90 - t * 5;
  const l = 50 + t * 5;
  return `hsl(${h} ${s}% ${l}%)`;
}

export function VoiceWaveformPlayer({
  audioUrl,
  large = false,
  onPlay,
  accentColor = "hsl(42 75% 40%)",
  captionsEnabled,
}: VoiceWaveformPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bars, setBars] = useState<number[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const barCount = large ? BAR_COUNT_LARGE : BAR_COUNT;

  // Generate static waveform bars on mount (seeded from URL)
  useEffect(() => {
    const seed = audioUrl.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const staticBars: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const v = Math.sin(seed + i * 0.7) * 0.3 + 0.5 + Math.sin(i * 1.3) * 0.2;
      staticBars.push(Math.max(0.15, Math.min(1, v)));
    }
    setBars(staticBars);
  }, [audioUrl, barCount]);

  const setupAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.crossOrigin = "anonymous";
      audioRef.current.preload = "metadata";
    }
    return audioRef.current;
  }, [audioUrl]);

  // Track progress
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => {
      setProgress(audio.currentTime / (audio.duration || 1));
    };
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, [audioRef.current]);

  const togglePlay = () => {
    const audio = setupAudio();

    if (!playing) {
      if (onPlay) {
        const intercepted = onPlay();
        if (intercepted === true) return;
      }
      audio.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    audio.currentTime = x * audio.duration;
    setProgress(x);
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const height = large ? "h-28" : "h-12";

  return (
    <div className={`flex items-center gap-2 w-full ${large ? "px-1" : ""}`}>
      {/* Play/Pause button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={togglePlay}
        className="shrink-0 rounded-full flex items-center justify-center transition-colors"
        style={{
          width: large ? 44 : 36,
          height: large ? 44 : 36,
          background: `${accentColor}20`,
          color: accentColor,
        }}
      >
        {playing ? <Pause className={large ? "w-5 h-5" : "w-4 h-4"} /> : <Play className={`${large ? "w-5 h-5" : "w-4 h-4"} ml-0.5`} />}
      </motion.button>




      {/* Waveform area */}
      <div className="flex-1 min-w-0">
        <div
          className={`relative ${height} flex items-end gap-[1.5px] cursor-pointer rounded-lg overflow-hidden`}
          onClick={handleSeek}
          style={{ background: large ? "transparent" : `${accentColor}08` }}
        >
          {bars.map((h, i) => {
            const isPlayed = i / barCount <= progress;
            return (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${Math.max(8, h * 100)}%`,
                  background: isPlayed ? orangeForIndex(i, barCount) : GREY,
                  opacity: isPlayed ? 1 : 0.45,
                  transition: "background 0.15s ease, opacity 0.15s ease",
                }}
              />
            );
          })}
        </div>

        {/* Time display */}
        <div className="flex justify-between mt-0.5">
          <span className="text-[10px] text-muted-foreground">
            {fmt(progress * duration)}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {fmt(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
