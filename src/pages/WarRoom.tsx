import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, Pause, Volume2, SkipForward, SkipBack, Flame, Sun, Moon, Leaf, ChevronLeft, ChevronRight } from "lucide-react";

const TRACKS = [
  { name: "Peaceful Piano", url: "https://cdn.pixabay.com/audio/2024/11/12/audio_df5987b5e6.mp3" },
  { name: "Gentle Worship", url: "https://cdn.pixabay.com/audio/2024/10/29/audio_f5fde4f4a5.mp3" },
  { name: "Morning Serenity", url: "https://cdn.pixabay.com/audio/2024/09/25/audio_3d26b3f5e9.mp3" },
  { name: "Sacred Still", url: "https://cdn.pixabay.com/audio/2024/07/04/audio_93a55e1db9.mp3" },
  { name: "Heavenly Rest", url: "https://cdn.pixabay.com/audio/2024/05/01/audio_54e7d9f128.mp3" },
];

const THEMES = [
  { id: "night", label: "Night Watch", Icon: Moon, bg: "hsl(220 60% 6%)", bg2: "hsl(35 40% 12%)", text: "hsl(38 28% 88%)", accent: "hsl(42 78% 54%)", muted: "hsl(38 14% 55%)" },
  { id: "candlelight", label: "Candlelight", Icon: Flame, bg: "hsl(25 70% 8%)", bg2: "hsl(30 60% 14%)", text: "hsl(42 60% 88%)", accent: "hsl(35 90% 58%)", muted: "hsl(35 40% 55%)" },
  { id: "morning", label: "Morning Light", Icon: Sun, bg: "hsl(42 65% 92%)", bg2: "hsl(38 55% 88%)", text: "hsl(25 35% 18%)", accent: "hsl(42 75% 40%)", muted: "hsl(25 20% 50%)" },
  { id: "nature", label: "Garden Prayer", Icon: Leaf, bg: "hsl(140 55% 7%)", bg2: "hsl(150 40% 12%)", text: "hsl(150 25% 88%)", accent: "hsl(120 45% 50%)", muted: "hsl(150 18% 55%)" },
] as const;

interface PrayerForWarRoom { id: string; title: string | null; prayer_text: string; extended_prayer: string | null; }
interface Playlist { id: string; name: string; prayer_ids: string[] | null; }

export default function WarRoom() {
  const { user } = useAuth();
  const [themeId, setThemeId] = useState<string>("night");
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePrayers, setActivePrayers] = useState<PrayerForWarRoom[]>([]);
  const [prayerIndex, setPrayerIndex] = useState(0);
  const [playlistMode, setPlaylistMode] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];

  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.volume = volume;
    audio.src = TRACKS[trackIndex].url;
    audioRef.current = audio;
    if (playing) audio.play().catch(() => {});
    return () => { audio.pause(); audio.src = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIndex]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); } else { audio.play().catch(() => {}); setPlaying(true); }
  };

  const nextTrack = () => setTrackIndex(i => (i + 1) % TRACKS.length);
  const prevTrack = () => setTrackIndex(i => (i - 1 + TRACKS.length) % TRACKS.length);

  useEffect(() => {
    if (!user) return;
    supabase.from("prayer_playlists").select("*").eq("user_id", user.id).then(({ data }) => setPlaylists(data || []));
  }, [user]);

  const loadPlaylist = async (playlist: Playlist) => {
    if (!playlist.prayer_ids?.length) return;
    const { data } = await supabase.from("prayer_cards").select("id, title, prayer_text, extended_prayer").in("id", playlist.prayer_ids);
    setActivePrayers((data as PrayerForWarRoom[]) || []);
    setPrayerIndex(0);
    setPlaylistMode(true);
  };

  const currentPrayer = activePrayers[prayerIndex];

  return (
    <div className="min-h-screen flex flex-col transition-all duration-700" style={{ background: `linear-gradient(160deg, ${theme.bg} 0%, ${theme.bg2} 100%)`, color: theme.text }}>
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <Link to="/" style={{ color: theme.text, opacity: 0.6 }} className="hover:opacity-100 transition-opacity"><ArrowLeft className="w-5 h-5" /></Link>
        <p className="text-sm font-display italic" style={{ color: theme.muted }}>"Be still, and know that I am God." — Psalm 46:10</p>
        <div className="flex gap-1">
          {THEMES.map(t => {
            const Icon = t.Icon;
            return (
              <button key={t.id} onClick={() => setThemeId(t.id)} title={t.label} className="p-2 rounded-lg transition-all" style={{ color: theme.accent, opacity: themeId === t.id ? 1 : 0.4 }}>
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-2xl mx-auto w-full">
        <motion.div animate={{ scale: [1, 1.04, 1], opacity: [0.9, 1, 0.9] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 rounded-full flex items-center justify-center mb-8"
          style={{ background: theme.accent, boxShadow: `0 0 40px ${theme.accent}88` }}>
          <Flame className="w-8 h-8" style={{ color: "#fff" }} />
        </motion.div>

        {playlistMode && currentPrayer ? (
          <AnimatePresence mode="wait">
            <motion.div key={prayerIndex} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.6 }} className="text-center space-y-4 max-w-lg">
              {currentPrayer.title && <h2 className="font-display text-2xl font-bold" style={{ color: theme.text }}>{currentPrayer.title}</h2>}
              <p className="font-display italic leading-relaxed text-lg" style={{ color: theme.text }}>{currentPrayer.prayer_text}</p>
              {currentPrayer.extended_prayer && <p className="text-sm" style={{ color: theme.muted }}>{currentPrayer.extended_prayer}</p>}
              <div className="flex items-center justify-center gap-4 pt-4">
                <button onClick={() => setPrayerIndex(i => Math.max(0, i - 1))} disabled={prayerIndex === 0} className="transition-opacity disabled:opacity-20" style={{ color: theme.accent, opacity: 0.8 }}><ChevronLeft className="w-6 h-6" /></button>
                <span className="text-sm" style={{ color: theme.muted }}>{prayerIndex + 1} / {activePrayers.length}</span>
                <button onClick={() => setPrayerIndex(i => Math.min(activePrayers.length - 1, i + 1))} disabled={prayerIndex === activePrayers.length - 1} className="transition-opacity disabled:opacity-20" style={{ color: theme.accent, opacity: 0.8 }}><ChevronRight className="w-6 h-6" /></button>
              </div>
              <button onClick={() => setPlaylistMode(false)} className="text-xs transition-opacity" style={{ color: theme.muted, opacity: 0.5 }}>Exit playlist mode</button>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="text-center space-y-6 max-w-lg">
            <h1 className="font-display text-4xl font-bold" style={{ color: theme.text }}>The War Room</h1>
            <p className="font-display italic text-lg" style={{ color: theme.muted }}>"The weapons we fight with are not the weapons of the world. On the contrary, they have divine power to demolish strongholds."</p>
            <p className="text-sm" style={{ color: theme.muted, opacity: 0.6 }}>— 2 Corinthians 10:4</p>
            {playlists.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm" style={{ color: theme.muted, opacity: 0.7 }}>Your prayer playlists:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {playlists.map(pl => (
                    <button key={pl.id} onClick={() => loadPlaylist(pl)} className="px-4 py-2 rounded-xl text-sm border transition-all hover:scale-105" style={{ borderColor: theme.accent, color: theme.accent }}>
                      ▶ {pl.name} ({pl.prayer_ids?.length || 0})
                    </button>
                  ))}
                </div>
              </div>
            )}
            {user && playlists.length === 0 && <p className="text-xs" style={{ color: theme.muted, opacity: 0.5 }}>Create playlists on your <Link to="/board" style={{ color: theme.accent }}>Prayer Board</Link> to use them here.</p>}
            {!user && <p className="text-xs" style={{ color: theme.muted, opacity: 0.5 }}><Link to="/auth" style={{ color: theme.accent }}>Sign in</Link> to load your prayer playlists.</p>}
          </div>
        )}
      </div>

      <div className="border-t px-6 py-4" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <button onClick={prevTrack} className="opacity-60 hover:opacity-100 transition-opacity" style={{ color: theme.text }}><SkipBack className="w-4 h-4" /></button>
          <button onClick={togglePlay} className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: theme.accent, color: "#fff" }}>
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button onClick={nextTrack} className="opacity-60 hover:opacity-100 transition-opacity" style={{ color: theme.text }}><SkipForward className="w-4 h-4" /></button>
          <div className="flex-1 min-w-0"><p className="text-xs truncate" style={{ color: theme.muted }}>{TRACKS[trackIndex].name}</p></div>
          <Volume2 className="w-4 h-4 opacity-50 flex-shrink-0" style={{ color: theme.text }} />
          <input type="range" min={0} max={1} step={0.01} value={volume} onChange={e => setVolume(Number(e.target.value))} className="w-20 cursor-pointer" />
        </div>
      </div>
    </div>
  );
}

