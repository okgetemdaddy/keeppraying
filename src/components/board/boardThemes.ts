export interface BoardTheme {
  id: string;
  name: string;
  emoji: string;
  /** CSS variables injected onto the board wrapper */
  vars: Record<string, string>;
  /** Tailwind gradient for the thumbnail swatch */
  swatch: string;
  /** Background CSS class or style string */
  bgClass: string;
  /** Particle / animation type */
  animationType: "particles" | "stars" | "leaves" | "rain" | "ripples" | "candle";
  /** Muted overlay tint (rgba) */
  overlay: string;
  /** Associated sound id */
  defaultSound: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: "golden-sunrise",
    name: "Golden Sunrise",
    emoji: "🌅",
    swatch: "from-amber-200 via-yellow-300 to-orange-200",
    bgClass: "bg-gradient-to-br from-[hsl(38,60%,94%)] via-[hsl(42,75%,90%)] to-[hsl(35,65%,88%)]",
    animationType: "particles",
    overlay: "rgba(255,200,100,0.04)",
    defaultSound: "worship-piano",
    vars: {
      "--board-card-bg": "hsl(38 55% 99% / 0.92)",
      "--board-card-border": "hsl(42 60% 82% / 0.7)",
      "--board-accent": "hsl(42 85% 46%)",
      "--board-accent-soft": "hsl(42 80% 92%)",
      "--board-text": "hsl(25 35% 14%)",
    },
  },
  {
    id: "candlelit-chapel",
    name: "Candlelit Chapel",
    emoji: "🕯️",
    swatch: "from-orange-900 via-amber-800 to-stone-900",
    bgClass: "bg-gradient-to-br from-[hsl(20,35%,10%)] via-[hsl(25,30%,12%)] to-[hsl(15,40%,8%)]",
    animationType: "candle",
    overlay: "rgba(255,120,30,0.06)",
    defaultSound: "fireplace",
    vars: {
      "--board-card-bg": "hsl(20 30% 14% / 0.90)",
      "--board-card-border": "hsl(35 40% 30% / 0.5)",
      "--board-accent": "hsl(35 85% 58%)",
      "--board-accent-soft": "hsl(35 50% 22%)",
      "--board-text": "hsl(38 28% 88%)",
    },
  },
  {
    id: "starry-night",
    name: "Starry Night Sky",
    emoji: "✨",
    swatch: "from-indigo-950 via-blue-900 to-slate-900",
    bgClass: "bg-gradient-to-b from-[hsl(230,50%,6%)] via-[hsl(225,45%,9%)] to-[hsl(220,40%,12%)]",
    animationType: "stars",
    overlay: "rgba(100,120,255,0.04)",
    defaultSound: "nature-stream",
    vars: {
      "--board-card-bg": "hsl(225 38% 12% / 0.88)",
      "--board-card-border": "hsl(230 40% 28% / 0.6)",
      "--board-accent": "hsl(210 80% 68%)",
      "--board-accent-soft": "hsl(225 40% 22%)",
      "--board-text": "hsl(220 28% 90%)",
    },
  },
  {
    id: "forest-glade",
    name: "Peaceful Forest Glade",
    emoji: "🌿",
    swatch: "from-green-900 via-emerald-800 to-green-700",
    bgClass: "bg-gradient-to-br from-[hsl(140,35%,10%)] via-[hsl(145,30%,13%)] to-[hsl(150,28%,16%)]",
    animationType: "leaves",
    overlay: "rgba(60,160,80,0.05)",
    defaultSound: "forest-birds",
    vars: {
      "--board-card-bg": "hsl(142 28% 14% / 0.90)",
      "--board-card-border": "hsl(145 30% 28% / 0.55)",
      "--board-accent": "hsl(142 55% 52%)",
      "--board-accent-soft": "hsl(145 28% 22%)",
      "--board-text": "hsl(140 18% 88%)",
    },
  },
  {
    id: "ocean-dawn",
    name: "Ocean Dawn",
    emoji: "🌊",
    swatch: "from-sky-300 via-cyan-200 to-blue-300",
    bgClass: "bg-gradient-to-b from-[hsl(195,60%,88%)] via-[hsl(200,55%,82%)] to-[hsl(210,50%,75%)]",
    animationType: "ripples",
    overlay: "rgba(100,180,220,0.05)",
    defaultSound: "ocean-waves",
    vars: {
      "--board-card-bg": "hsl(195 50% 97% / 0.90)",
      "--board-card-border": "hsl(200 45% 78% / 0.65)",
      "--board-accent": "hsl(200 70% 40%)",
      "--board-accent-soft": "hsl(200 55% 88%)",
      "--board-text": "hsl(210 35% 18%)",
    },
  },
  {
    id: "gentle-rain",
    name: "Gentle Rain Mist",
    emoji: "🌧️",
    swatch: "from-slate-400 via-gray-300 to-blue-200",
    bgClass: "bg-gradient-to-b from-[hsl(215,25%,22%)] via-[hsl(218,22%,28%)] to-[hsl(220,20%,32%)]",
    animationType: "rain",
    overlay: "rgba(140,160,200,0.06)",
    defaultSound: "soft-rain",
    vars: {
      "--board-card-bg": "hsl(215 22% 26% / 0.88)",
      "--board-card-border": "hsl(218 24% 40% / 0.55)",
      "--board-accent": "hsl(200 60% 72%)",
      "--board-accent-soft": "hsl(215 25% 35%)",
      "--board-text": "hsl(215 18% 88%)",
    },
  },
  {
    id: "holy-light",
    name: "Holy Light",
    emoji: "☀️",
    swatch: "from-white via-yellow-50 to-amber-100",
    bgClass: "bg-gradient-to-br from-[hsl(40,80%,98%)] via-[hsl(38,60%,96%)] to-[hsl(35,55%,93%)]",
    animationType: "particles",
    overlay: "rgba(255,230,150,0.08)",
    defaultSound: "worship-piano",
    vars: {
      "--board-card-bg": "hsl(40 70% 100% / 0.95)",
      "--board-card-border": "hsl(38 50% 88% / 0.8)",
      "--board-accent": "hsl(38 90% 44%)",
      "--board-accent-soft": "hsl(40 80% 92%)",
      "--board-text": "hsl(25 40% 12%)",
    },
  },
];

export const AMBIENT_SOUNDS = [
  { id: "soft-rain", label: "Soft Rain", emoji: "🌧️", src: "https://assets.mixkit.co/music/preview/mixkit-rain-and-thunder-762.mp3" },
  { id: "worship-piano", label: "Worship Piano", emoji: "🎹", src: "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3" },
  { id: "ocean-waves", label: "Ocean Waves", emoji: "🌊", src: "https://assets.mixkit.co/music/preview/mixkit-sea-waves-loop-1196.mp3" },
  { id: "forest-birds", label: "Forest & Birds", emoji: "🌿", src: "https://assets.mixkit.co/music/preview/mixkit-birds-in-the-morning-2762.mp3" },
  { id: "fireplace", label: "Crackling Fire", emoji: "🔥", src: "https://assets.mixkit.co/music/preview/mixkit-cozy-fire-loop-765.mp3" },
  { id: "nature-stream", label: "Nature Stream", emoji: "💧", src: "https://assets.mixkit.co/music/preview/mixkit-forest-stream-loop-744.mp3" },
];
