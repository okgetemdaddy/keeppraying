import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Volume2, VolumeX, SkipForward, SkipBack,
  Flame, Sun, Moon, Leaf, ChevronLeft, ChevronRight,
  Sparkles, SparklesIcon, Type, Settings2,
} from "lucide-react";
import VerseLink from "@/components/VerseLink";
import { renderWithVerseLinks } from "@/lib/renderWithVerseLinks";
import { SiteNav } from "@/components/SiteNav";
import { VoiceRecorder } from "@/components/VoiceRecorder";

// ── Tracks ────────────────────────────────────────────────────────────────────
const TRACKS = [
  { name: "Peaceful Piano",   url: "https://cdn.pixabay.com/audio/2024/11/12/audio_df5987b5e6.mp3" },
  { name: "Gentle Worship",   url: "https://cdn.pixabay.com/audio/2024/10/29/audio_f5fde4f4a5.mp3" },
  { name: "Morning Serenity", url: "https://cdn.pixabay.com/audio/2024/09/25/audio_3d26b3f5e9.mp3" },
  { name: "Sacred Still",     url: "https://cdn.pixabay.com/audio/2024/07/04/audio_93a55e1db9.mp3" },
  { name: "Heavenly Rest",    url: "https://cdn.pixabay.com/audio/2024/05/01/audio_54e7d9f128.mp3" },
];

// ── Themes ────────────────────────────────────────────────────────────────────
const THEMES = [
  { id: "night",      label: "Night Watch",   Icon: Moon,  bg: "hsl(220 60% 6%)",   bg2: "hsl(35 40% 12%)",  text: "hsl(38 28% 88%)",  accent: "hsl(42 78% 54%)",  muted: "hsl(38 14% 55%)" },
  { id: "candlelight",label: "Candlelight",   Icon: Flame, bg: "hsl(25 70% 8%)",    bg2: "hsl(30 60% 14%)",  text: "hsl(42 60% 88%)",  accent: "hsl(35 90% 58%)",  muted: "hsl(35 40% 55%)" },
  { id: "morning",    label: "Morning Light", Icon: Sun,   bg: "hsl(42 65% 92%)",   bg2: "hsl(38 55% 88%)",  text: "hsl(25 35% 18%)",  accent: "hsl(42 75% 40%)",  muted: "hsl(25 20% 50%)" },
  { id: "nature",     label: "Garden Prayer", Icon: Leaf,  bg: "hsl(140 55% 7%)",   bg2: "hsl(150 40% 12%)", text: "hsl(150 25% 88%)", accent: "hsl(120 45% 50%)", muted: "hsl(150 18% 55%)" },
] as const;

// ── Fonts ─────────────────────────────────────────────────────────────────────
const FONTS = [
  { id: "display",   label: "Playfair",    family: "'Playfair Display', Georgia, serif" },
  { id: "body",      label: "Inter",       family: "'Inter', system-ui, sans-serif" },
  { id: "georgia",   label: "Georgia",     family: "Georgia, 'Times New Roman', serif" },
  { id: "garamond",  label: "Garamond",    family: "'EB Garamond', Garamond, serif" },
  { id: "cinzel",    label: "Cinzel",      family: "'Cinzel', serif" },
] as const;

type FontId = typeof FONTS[number]["id"];

// ── Particle canvas background ────────────────────────────────────────────────
function ParticleCanvas({ accent, enabled }: { accent: string; enabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Parse accent color for particles
    const particles = Array.from({ length: 38 }, () => ({
      x:   Math.random() * window.innerWidth,
      y:   Math.random() * window.innerHeight,
      r:   Math.random() * 2.2 + 0.5,
      vy:  -(Math.random() * 0.35 + 0.1),
      vx:  (Math.random() - 0.5) * 0.18,
      o:   Math.random() * 0.45 + 0.08,
      flicker: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.flicker += 0.028;
        const alpha = p.o * (0.75 + 0.25 * Math.sin(p.flicker));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = accent.replace(")", ` / ${alpha})`).replace("hsl(", "hsla(");
        ctx.fill();
        p.y  += p.vy;
        p.x  += p.vx;
        if (p.y < -6) { p.y = canvas.height + 6; p.x = Math.random() * canvas.width; }
        if (p.x < -6) p.x = canvas.width  + 6;
        if (p.x > canvas.width  + 6) p.x = -6;
      });
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [enabled, accent]);

  if (!enabled) return null;
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.55 }}
      aria-hidden
    />
  );
}

// ── Touch ripple ──────────────────────────────────────────────────────────────
interface Ripple { id: number; x: number; y: number; accent: string; }

function useRipples(enabled: boolean) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const counter = useRef(0);

  const addRipple = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!enabled) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pos = "touches" in e
      ? { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
      : { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
    const id = counter.current++;
    setRipples(prev => [...prev, { id, ...pos, accent: "" }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 700);
  }, [enabled]);

  return { ripples, addRipple };
}

// ── Settings panel (bottom-right drawer) ─────────────────────────────────────
function SettingsPanel({
  theme,
  animationsEnabled,
  touchEnabled,
  fontId,
  onAnimToggle,
  onTouchToggle,
  onFontChange,
}: {
  theme: typeof THEMES[number];
  animationsEnabled: boolean;
  touchEnabled: boolean;
  fontId: FontId;
  onAnimToggle: () => void;
  onTouchToggle: () => void;
  onFontChange: (id: FontId) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click-outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1.5 sm:p-2 rounded-lg transition-all touch-manipulation"
        style={{ color: theme.accent, opacity: open ? 1 : 0.5 }}
        title="Settings"
      >
        <Settings2 className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="absolute right-0 top-full mt-2 rounded-2xl border z-50 overflow-hidden"
            style={{
              minWidth: 220,
              background: `${theme.bg}ee`,
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              borderColor: `${theme.accent}30`,
              boxShadow: `0 8px 32px -8px ${theme.accent}40, 0 2px 8px -2px rgba(0,0,0,0.35)`,
            }}
          >
            {/* Toggles */}
            <div className="px-4 pt-4 pb-3 space-y-3">
              <p className="text-[10px] uppercase tracking-widest font-semibold opacity-40" style={{ color: theme.text }}>
                Display
              </p>

              {/* Animations toggle */}
              <label className="flex items-center justify-between cursor-pointer gap-4">
                <span className="text-sm flex items-center gap-2" style={{ color: theme.text }}>
                  <Sparkles className="w-3.5 h-3.5" style={{ color: theme.accent }} />
                  Background fx
                </span>
                <button
                  onClick={onAnimToggle}
                  className="relative w-9 h-5 rounded-full transition-all duration-300 flex-shrink-0"
                  style={{ background: animationsEnabled ? theme.accent : `${theme.text}22` }}
                  role="switch"
                  aria-checked={animationsEnabled}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300"
                    style={{ transform: animationsEnabled ? "translateX(16px)" : "translateX(0)" }}
                  />
                </button>
              </label>

              {/* Touch ripple toggle */}
              <label className="flex items-center justify-between cursor-pointer gap-4">
                <span className="text-sm flex items-center gap-2" style={{ color: theme.text }}>
                  <span className="text-base leading-none" style={{ color: theme.accent }}>✦</span>
                  Touch ripples
                </span>
                <button
                  onClick={onTouchToggle}
                  className="relative w-9 h-5 rounded-full transition-all duration-300 flex-shrink-0"
                  style={{ background: touchEnabled ? theme.accent : `${theme.text}22` }}
                  role="switch"
                  aria-checked={touchEnabled}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300"
                    style={{ transform: touchEnabled ? "translateX(16px)" : "translateX(0)" }}
                  />
                </button>
              </label>
            </div>

            <div className="border-t mx-2" style={{ borderColor: `${theme.accent}20` }} />

            {/* Font selector */}
            <div className="px-4 py-3 space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-semibold opacity-40" style={{ color: theme.text }}>
                Font
              </p>
              <div className="space-y-0.5">
                {FONTS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => onFontChange(f.id as FontId)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-sm"
                    style={{
                      fontFamily: f.family,
                      color: fontId === f.id ? theme.accent : theme.text,
                      background: fontId === f.id ? `${theme.accent}18` : "transparent",
                    }}
                  >
                    <span>{f.label}</span>
                    {fontId === f.id && <span className="text-[10px] opacity-60">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface PrayerForWarRoom { id: string; title: string | null; prayer_text: string; extended_prayer: string | null; }
interface Playlist { id: string; name: string; prayer_ids: string[] | null; }

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WarRoom() {
  const { user } = useAuth();

  const [themeId,           setThemeId]           = useState<string>("night");
  const [playing,           setPlaying]           = useState(false);
  const [volume,            setVolume]             = useState(0.4);
  const [muted,             setMuted]             = useState(false);
  const [trackIndex,        setTrackIndex]        = useState(0);
  const [playlists,         setPlaylists]         = useState<Playlist[]>([]);
  const [activePrayers,     setActivePrayers]     = useState<PrayerForWarRoom[]>([]);
  const [prayerIndex,       setPrayerIndex]       = useState(0);
  const [playlistMode,      setPlaylistMode]      = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [touchEnabled,      setTouchEnabled]      = useState(true);
  const [fontId,            setFontId]            = useState<FontId>("display");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const theme    = THEMES.find(t => t.id === themeId) || THEMES[0];
  const font     = FONTS.find(f => f.id === fontId) || FONTS[0];

  const { ripples, addRipple } = useRipples(touchEnabled);

  // ── Audio ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audio.loop   = true;
    audio.volume = muted ? 0 : volume;
    audio.src    = TRACKS[trackIndex].url;
    audioRef.current = audio;
    if (playing) audio.play().catch(() => {});
    return () => { audio.pause(); audio.src = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIndex]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = muted ? 0 : volume; }, [volume, muted]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().catch(() => {}); setPlaying(true); }
  };

  const nextTrack = () => setTrackIndex(i => (i + 1) % TRACKS.length);
  const prevTrack = () => setTrackIndex(i => (i - 1 + TRACKS.length) % TRACKS.length);

  // ── Playlists ──────────────────────────────────────────────────────────────
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
    <div
      className="relative min-h-screen flex flex-col overflow-hidden transition-all duration-700 select-none"
      style={{
        background: `linear-gradient(160deg, ${theme.bg} 0%, ${theme.bg2} 100%)`,
        color: theme.text,
        fontFamily: font.family,
      }}
      onTouchStart={addRipple}
      onMouseDown={addRipple}
    >
      {/* Particle canvas */}
      <ParticleCanvas accent={theme.accent} enabled={animationsEnabled} />

      {/* Touch ripples */}
      <AnimatePresence>
        {ripples.map(r => (
          <motion.span
            key={r.id}
            initial={{ scale: 0, opacity: 0.55 }}
            animate={{ scale: 7, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.68, ease: "easeOut" }}
            className="fixed pointer-events-none rounded-full z-50"
            style={{
              width: 48,
              height: 48,
              left: r.x - 24,
              top: r.y - 24,
              background: `radial-gradient(circle, ${theme.accent}55 0%, transparent 70%)`,
            }}
          />
        ))}
      </AnimatePresence>

      {/* Header */}
      <SiteNav
        dark
        rightSlot={
          <div className="flex items-center gap-0.5 sm:gap-1">
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
            {/* Settings panel */}
            <SettingsPanel
              theme={theme}
              animationsEnabled={animationsEnabled}
              touchEnabled={touchEnabled}
              fontId={fontId}
              onAnimToggle={() => setAnimationsEnabled(v => !v)}
              onTouchToggle={() => setTouchEnabled(v => !v)}
              onFontChange={setFontId}
            />
          </div>
        }
      />

      {/* Main content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 max-w-2xl mx-auto w-full">

        {/* Ambient glow orb */}
        <motion.div
          animate={animationsEnabled
            ? { scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }
            : { scale: 1, opacity: 1 }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-6 sm:mb-8"
          style={{ background: theme.accent, boxShadow: `0 0 50px ${theme.accent}90, 0 0 100px ${theme.accent}30` }}
        >
          <Flame className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
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
                <h2 className="text-xl sm:text-2xl font-bold" style={{ color: theme.text, fontFamily: font.family }}>
                  {currentPrayer.title}
                </h2>
              )}
              <p className="italic leading-relaxed text-base sm:text-lg" style={{ color: theme.text, fontFamily: font.family }}>
                {currentPrayer.prayer_text}
              </p>
              {currentPrayer.extended_prayer && (
                <p className="text-sm" style={{ color: theme.muted }}>{renderWithVerseLinks(currentPrayer.extended_prayer)}</p>
              )}
              <div className="flex items-center justify-center gap-6 pt-4">
                <button
                  onClick={() => setPrayerIndex(i => Math.max(0, i - 1))}
                  disabled={prayerIndex === 0}
                  className="p-2 transition-all disabled:opacity-20 touch-manipulation active:scale-90"
                  style={{ color: theme.accent }}
                >
                  <ChevronLeft className="w-7 h-7" />
                </button>
                <span className="text-sm tabular-nums" style={{ color: theme.muted }}>
                  {prayerIndex + 1} / {activePrayers.length}
                </span>
                <button
                  onClick={() => setPrayerIndex(i => Math.min(activePrayers.length - 1, i + 1))}
                  disabled={prayerIndex === activePrayers.length - 1}
                  className="p-2 transition-all disabled:opacity-20 touch-manipulation active:scale-90"
                  style={{ color: theme.accent }}
                >
                  <ChevronRight className="w-7 h-7" />
                </button>
              </div>
              <button
                onClick={() => setPlaylistMode(false)}
                className="text-xs transition-opacity mt-2 px-3 py-1.5 rounded-full border border-white/10 active:scale-95"
                style={{ color: theme.muted }}
              >
                Exit playlist
              </button>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="text-center space-y-5 sm:space-y-6 max-w-lg w-full px-2">
            <motion.h1
              key={fontId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-3xl sm:text-4xl font-bold"
              style={{ color: theme.text, fontFamily: font.family }}
            >
              KeepFight.ing
            </motion.h1>
            <p className="italic text-base sm:text-lg leading-relaxed" style={{ color: theme.muted, fontFamily: font.family }}>
              "The weapons we fight with are not the weapons of the world. On the contrary, they have divine power to demolish strongholds."
            </p>
            <p className="text-xs sm:text-sm" style={{ color: theme.muted, opacity: 0.6 }}>
              — <VerseLink reference="2 Corinthians 10:4" text="2 Corinthians 10:4" className="[&_.verse-text]:text-inherit opacity-70" />
            </p>

            {playlists.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm" style={{ color: theme.muted, opacity: 0.7 }}>Your prayer playlists:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {playlists.map(pl => (
                    <motion.button
                      key={pl.id}
                      onClick={() => loadPlaylist(pl)}
                      whileTap={animationsEnabled ? { scale: 0.93 } : {}}
                      className="px-4 py-2.5 rounded-xl text-sm border transition-all active:scale-95 touch-manipulation"
                      style={{ borderColor: theme.accent, color: theme.accent, fontFamily: font.family }}
                    >
                      ▶ {pl.name} ({pl.prayer_ids?.length || 0})
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
            {user && playlists.length === 0 && (
              <p className="text-xs sm:text-sm" style={{ color: theme.muted, opacity: 0.5 }}>
                Create playlists on your{" "}
                <Link to="/board" style={{ color: theme.accent }} className="underline">Prayer Board</Link>{" "}
                to use them here.
              </p>
            )}
            {!user && (
              <p className="text-xs sm:text-sm" style={{ color: theme.muted, opacity: 0.5 }}>
                <Link to="/auth" style={{ color: theme.accent }} className="underline">Sign in</Link>{" "}
                to load your prayer playlists.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Audio controls */}
      <div className="relative border-t px-4 sm:px-6 py-3 sm:py-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        {/* Subtle frosted tint on the bar */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `${theme.bg}99`, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
        />
        <div className="relative max-w-lg mx-auto">
          <p className="text-xs text-center mb-2 truncate" style={{ color: theme.muted }}>
            {TRACKS[trackIndex].name}
          </p>
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={prevTrack}
              className="p-2 opacity-60 hover:opacity-100 transition-all touch-manipulation active:scale-90"
              style={{ color: theme.text }}
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <motion.button
              onClick={togglePlay}
              whileTap={animationsEnabled ? { scale: 0.88 } : {}}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:brightness-110 active:scale-95 touch-manipulation"
              style={{
                background: theme.accent,
                color: "#fff",
                boxShadow: `0 0 24px ${theme.accent}60`,
              }}
            >
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </motion.button>

            <button
              onClick={nextTrack}
              className="p-2 opacity-60 hover:opacity-100 transition-all touch-manipulation active:scale-90"
              style={{ color: theme.text }}
            >
              <SkipForward className="w-5 h-5" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={() => setMuted(m => !m)}
                className="p-1.5 touch-manipulation opacity-60 hover:opacity-100 transition-all active:scale-90"
                style={{ color: theme.text }}
              >
                {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range" min={0} max={1} step={0.01}
                value={muted ? 0 : volume}
                onChange={e => { setVolume(Number(e.target.value)); setMuted(false); }}
                className="w-20 sm:w-28 cursor-pointer h-1"
                style={{ accentColor: theme.accent }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
