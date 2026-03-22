import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Play, Pause, ChevronUp, Music } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { AMBIENT_SOUNDS } from "./boardThemes";
import { useAmbientAudio } from "./useAmbientAudio";

interface AmbientPlayerProps {
  soundId: string | null;
  volume: number;
  onChange: (updates: { sound_id?: string | null; sound_volume?: number }) => void;
}

export function AmbientPlayer({ soundId, volume, onChange }: AmbientPlayerProps) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  useAmbientAudio(soundId, muted ? 0 : volume, playing);

  const effectiveVolume = muted ? 0 : volume;
  const currentSound = AMBIENT_SOUNDS.find(s => s.id === soundId);

  const handleSoundSelect = (id: string) => {
    onChange({ sound_id: id });
    setPlaying(true);
  };

  return (
    <div className="fixed bottom-5 right-4 z-50 flex flex-col items-end gap-2 select-none">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl p-3 w-52"
            style={{ background: "rgba(20,20,28,0.82)" }}
          >
            {/* Sound list */}
            <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest mb-2 px-1">Soundscape</p>
            <div className="space-y-0.5">
              {AMBIENT_SOUNDS.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSoundSelect(s.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-sm transition-all ${
                    soundId === s.id
                      ? "bg-white/15 text-white"
                      : "text-white/60 hover:bg-white/8 hover:text-white/80"
                  }`}
                >
                  <span className="text-base leading-none">{s.emoji}</span>
                  <span className="text-xs">{s.label}</span>
                  {soundId === s.id && playing && (
                    <span className="ml-auto flex gap-0.5">
                      {[0,1,2].map(i => (
                        <motion.span
                          key={i}
                          className="block w-0.5 bg-current rounded-full"
                          animate={{ height: ["4px","12px","4px"] }}
                          transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                        />
                      ))}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Volume */}
            <div className="mt-3 px-1 flex items-center gap-2">
              <button onClick={() => setMuted(m => !m)} className="text-white/50 hover:text-white/90 transition-colors shrink-0">
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <Slider
                min={0} max={1} step={0.01}
                value={[effectiveVolume]}
                onValueChange={([v]) => onChange({ sound_volume: v })}
                className="flex-1 [&_.bg-primary]:bg-white/70 [&_.bg-secondary]:bg-white/20"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileTap={{ scale: 0.92 }}
        className="relative w-11 h-11 rounded-full flex items-center justify-center shadow-xl border border-white/10 backdrop-blur-xl transition-all"
        style={{ background: "rgba(20,20,28,0.80)" }}
        aria-label="Ambient sound controls"
      >
        <Music className="w-4 h-4 text-white/70" />
        {playing && soundId && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border border-black/30 animate-pulse" />
        )}
      </motion.button>

      {/* Play/pause pill — visible when a sound is selected */}
      {soundId && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setPlaying(p => !p)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-xl border border-white/10 shadow-lg transition-all"
          style={{ background: "rgba(20,20,28,0.75)", color: "rgba(255,255,255,0.75)" }}
        >
          {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {currentSound?.emoji} {playing ? "Pause" : "Play"}
        </motion.button>
      )}
    </div>
  );
}
