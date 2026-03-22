import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, Pause, Volume2, VolumeX, SkipForward, SkipBack, Flame, Sun, Moon, Leaf, ChevronLeft, ChevronRight } from "lucide-react";
import VerseLink from "@/components/VerseLink";
import { renderWithVerseLinks } from "@/lib/renderWithVerseLinks";

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
  const [muted, setMuted] = useState(false);
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
    audio.volume = muted ? 0 : volume;
    audio.src = TRACKS[trackIndex].url;
    audioRef.current = audio;
    if (playing) audio.play().catch(() => {});
    return () => { audio.pause(); audio.src = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIndex]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = muted ? 0 : volume; }, [volume, muted]);

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

      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10">
        <Link to="/" style={{ color: theme.text, opacity: 0.6 }} className="hover:opacity-100 transition-opacity p-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        {/* Verse — hidden on very small screens */}
        <p className="text-xs sm:text-sm font-display italic hidden sm:block text-center px-2" style={{ color: theme.muted }}>
          "Be still, and know that I am God." — <VerseLink reference="Psalm 46:10" text="Be still, and know that I am God." className="[&_.verse-text]:text-inherit" />
        </p>
        {/* Theme icons */}
        <div className="flex gap-0.5 sm:gap-1">
          {THEMES.map(t => {
            const Icon = t.Icon;
            return (
              <button key={t.id} onClick={() => setThemeId(t.id)} title={t.label}
                className="p-1.5 sm:p-2 rounded-lg transition-all touch-manipulation"
                style={{ color: theme.accent, opacity: themeId === t.id ? 1 : 0.4 }}>
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 max-w-2xl mx-auto w-full">
        <motion.div
          animate={{ scale: [1, 1.04, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-6 sm:mb-8"
          style={{ background: theme.accent, boxShadow: `0 0 40px ${theme.accent}88` }}
        >
          <Flame className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: "#fff" }} />
        </motion.div>

        {playlistMode && currentPrayer ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={prayerIndex}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-4 w-full max-w-lg px-2"
            >
              {currentPrayer.title && (
                <h2 className="font-display text-xl sm:text-2xl font-bold" style={{ color: theme.text }}>
                  {currentPrayer.title}
                </h2>
              )}
              <p className="font-display italic leading-relaxed text-base sm:text-lg" style={{ color: theme.text }}>
                {currentPrayer.prayer_text}
              </p>
              {currentPrayer.extended_prayer && (
                <p className="text-sm" style={{ color: theme.muted }}>{renderWithVerseLinks(currentPrayer.extended_prayer)}</p>
              )}
              <div className="flex items-center justify-center gap-6 pt-4">
                <button
                  onClick={() => setPrayerIndex(i => Math.max(0, i - 1))}
                  disabled={prayerIndex === 0}
                  className="p-2 transition-opacity disabled:opacity-20 touch-manipulation"
                  style={{ color: theme.accent, opacity: 0.8 }}
                >
                  <ChevronLeft className="w-7 h-7" />
                </button>
                <span className="text-sm tabular-nums" style={{ color: theme.muted }}>{prayerIndex + 1} / {activePrayers.length}</span>
                <button
                  onClick={() => setPrayerIndex(i => Math.min(activePrayers.length - 1, i + 1))}
                  disabled={prayerIndex === activePrayers.length - 1}
                  className="p-2 transition-opacity disabled:opacity-20 touch-manipulation"
                  style={{ color: theme.accent, opacity: 0.8 }}
                >
                  <ChevronRight className="w-7 h-7" />
                </button>
              </div>
              <button
                onClick={() => setPlaylistMode(false)}
                className="text-xs transition-opacity mt-2 px-3 py-1.5 rounded-full border border-white/10"
                style={{ color: theme.muted }}
              >
                Exit playlist
              </button>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="text-center space-y-5 sm:space-y-6 max-w-lg w-full px-2">
            <h1 className="font-display text-3xl sm:text-4xl font-bold" style={{ color: theme.text }}>KeepFight.ing</h1>
            <p className="font-display italic text-base sm:text-lg leading-relaxed" style={{ color: theme.muted }}>
              "The weapons we fight with are not the weapons of the world. On the contrary, they have divine power to demolish strongholds."
            </p>
            <p className="text-xs sm:text-sm" style={{ color: theme.muted, opacity: 0.6 }}>
              — <VerseLink reference="2 Corinthians 10:4" text="The weapons we fight with are not the weapons of the world." className="[&_.verse-text]:text-inherit opacity-70" />
            </p>

            {playlists.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm" style={{ color: theme.muted, opacity: 0.7 }}>Your prayer playlists:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {playlists.map(pl => (
                    <button
                      key={pl.id}
                      onClick={() => loadPlaylist(pl)}
                      className="px-4 py-2.5 rounded-xl text-sm border transition-all active:scale-95 touch-manipulation"
                      style={{ borderColor: theme.accent, color: theme.accent }}
                    >
                      ▶ {pl.name} ({pl.prayer_ids?.length || 0})
                    </button>
                  ))}
                </div>
              </div>
            )}
            {user && playlists.length === 0 && (
              <p className="text-xs sm:text-sm" style={{ color: theme.muted, opacity: 0.5 }}>
                Create playlists on your <Link to="/board" style={{ color: theme.accent }} className="underline">Prayer Board</Link> to use them here.
              </p>
            )}
            {!user && (
              <p className="text-xs sm:text-sm" style={{ color: theme.muted, opacity: 0.5 }}>
                <Link to="/auth" style={{ color: theme.accent }} className="underline">Sign in</Link> to load your prayer playlists.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Audio controls */}
      <div className="border-t px-4 sm:px-6 py-3 sm:py-4" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
        <div className="max-w-lg mx-auto">
          {/* Track name */}
          <p className="text-xs text-center mb-2 truncate" style={{ color: theme.muted }}>{TRACKS[trackIndex].name}</p>
          {/* Controls row */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <button onClick={prevTrack} className="p-2 opacity-60 hover:opacity-100 transition-opacity touch-manipulation" style={{ color: theme.text }}>
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 touch-manipulation"
              style={{ background: theme.accent, color: "#fff" }}
            >
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <button onClick={nextTrack} className="p-2 opacity-60 hover:opacity-100 transition-opacity touch-manipulation" style={{ color: theme.text }}>
              <SkipForward className="w-5 h-5" />
            </button>
            {/* Volume — full slider on desktop, mute toggle on mobile */}
            <div className="flex items-center gap-2 ml-2">
              <button onClick={() => setMuted(m => !m)} className="p-1.5 touch-manipulation opacity-60 hover:opacity-100 transition-opacity" style={{ color: theme.text }}>
                {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume}
                onChange={e => { setVolume(Number(e.target.value)); setMuted(false); }}
                className="w-20 sm:w-28 cursor-pointer accent-current h-1"
                style={{ accentColor: theme.accent }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
