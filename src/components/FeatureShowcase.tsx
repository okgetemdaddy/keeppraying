import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";

/* ─── SVG Illustrations ──────────────────────────────────────────────── */

const PrayersSvg = () => (
  <svg viewBox="0 0 280 220" fill="none" className="w-full h-full">
    {/* Stacked prayer cards */}
    <motion.rect x="60" y="50" width="160" height="100" rx="12" fill="hsl(42 85% 46% / 0.12)" stroke="hsl(42 85% 46% / 0.4)" strokeWidth="1.5"
      initial={{ rotate: -3 }} animate={{ rotate: [-3, -1, -3] }} transition={{ duration: 4, repeat: Infinity }} />
    <motion.rect x="50" y="40" width="160" height="100" rx="12" fill="hsl(42 85% 46% / 0.18)" stroke="hsl(42 85% 46% / 0.5)" strokeWidth="1.5"
      initial={{ rotate: 2 }} animate={{ rotate: [2, 0, 2] }} transition={{ duration: 5, repeat: Infinity }} />
    <rect x="70" y="60" width="140" height="90" rx="12" fill="hsl(38 60% 97%)" stroke="hsl(42 75% 46% / 0.6)" strokeWidth="2" />
    {/* Text lines */}
    <rect x="85" y="78" width="80" height="4" rx="2" fill="hsl(42 75% 46% / 0.5)" />
    <rect x="85" y="90" width="110" height="3" rx="1.5" fill="hsl(25 35% 14% / 0.15)" />
    <rect x="85" y="99" width="95" height="3" rx="1.5" fill="hsl(25 35% 14% / 0.12)" />
    <rect x="85" y="108" width="60" height="3" rx="1.5" fill="hsl(25 35% 14% / 0.1)" />
    {/* Heart */}
    <motion.g animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }}>
      <path d="M170 125 c0-5 4-9 8-9 3 0 5 1.5 6 4 1-2.5 3-4 6-4 4 0 8 4 8 9 0 8-14 16-14 16s-14-8-14-16z" fill="hsl(0 72% 51% / 0.6)" />
    </motion.g>
    {/* Rising sparkle */}
    <motion.circle cx="140" cy="30" r="3" fill="hsl(42 85% 46% / 0.7)"
      animate={{ cy: [30, 15, 30], opacity: [0.7, 0.2, 0.7] }} transition={{ duration: 3, repeat: Infinity }} />
  </svg>
);

const BoardSvg = () => (
  <svg viewBox="0 0 280 220" fill="none" className="w-full h-full">
    {/* Dashboard frame */}
    <rect x="30" y="30" width="220" height="160" rx="14" fill="hsl(38 60% 97%)" stroke="hsl(150 38% 26% / 0.3)" strokeWidth="2" />
    {/* Grid cards */}
    <motion.rect x="45" y="50" width="60" height="55" rx="8" fill="hsl(42 85% 46% / 0.15)" stroke="hsl(42 75% 46% / 0.3)" strokeWidth="1"
      animate={{ y: [50, 47, 50] }} transition={{ duration: 3, repeat: Infinity }} />
    <motion.rect x="115" y="50" width="60" height="55" rx="8" fill="hsl(150 38% 26% / 0.12)" stroke="hsl(150 38% 26% / 0.3)" strokeWidth="1"
      animate={{ y: [50, 47, 50] }} transition={{ duration: 3, delay: 0.5, repeat: Infinity }} />
    <motion.rect x="185" y="50" width="50" height="55" rx="8" fill="hsl(210 55% 88% / 0.4)" stroke="hsl(210 55% 50% / 0.3)" strokeWidth="1"
      animate={{ y: [50, 47, 50] }} transition={{ duration: 3, delay: 1, repeat: Infinity }} />
    {/* Calendar strip */}
    <rect x="45" y="115" width="190" height="30" rx="6" fill="hsl(42 85% 46% / 0.08)" />
    {[0, 1, 2, 3, 4, 5, 6].map(i => (
      <rect key={i} x={55 + i * 26} y="121" width="18" height="18" rx="4" fill={i === 3 ? "hsl(42 75% 46% / 0.5)" : "hsl(25 35% 14% / 0.06)"} />
    ))}
    {/* Command center cross */}
    <motion.g animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 4, repeat: Infinity }}>
      <rect x="133" y="155" width="14" height="3" rx="1.5" fill="hsl(150 38% 26% / 0.5)" />
      <rect x="138.5" y="150" width="3" height="13" rx="1.5" fill="hsl(150 38% 26% / 0.5)" />
    </motion.g>
  </svg>
);

const BreatheSvg = () => (
  <svg viewBox="0 0 280 220" fill="none" className="w-full h-full">
    <motion.circle cx="140" cy="110" r="60" stroke="hsl(150 38% 26% / 0.25)" strokeWidth="2" fill="none"
      animate={{ r: [55, 70, 55] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
    <motion.circle cx="140" cy="110" r="40" stroke="hsl(42 75% 46% / 0.35)" strokeWidth="1.5" fill="hsl(42 85% 46% / 0.06)"
      animate={{ r: [35, 50, 35] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
    <motion.circle cx="140" cy="110" r="20" fill="hsl(42 85% 46% / 0.15)"
      animate={{ r: [18, 28, 18] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
    {/* Center text hint */}
    <motion.text x="140" y="114" textAnchor="middle" fontSize="10" fill="hsl(150 38% 26% / 0.6)" fontFamily="serif"
      animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 6, repeat: Infinity }}>
      breathe
    </motion.text>
  </svg>
);

const AssistSvg = () => (
  <svg viewBox="0 0 280 220" fill="none" className="w-full h-full">
    {/* Chat bubble */}
    <rect x="50" y="40" width="180" height="120" rx="16" fill="hsl(38 60% 97%)" stroke="hsl(42 75% 46% / 0.4)" strokeWidth="2" />
    <polygon points="90,160 110,160 85,180" fill="hsl(38 60% 97%)" stroke="hsl(42 75% 46% / 0.4)" strokeWidth="2" strokeLinejoin="round" />
    <rect x="85" y="157" width="30" height="6" fill="hsl(38 60% 97%)" />
    {/* AI sparkle */}
    <motion.g animate={{ rotate: [0, 360] }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      style={{ transformOrigin: "200px 60px" }}>
      <path d="M200 48 l2 8 8 2 -8 2 -2 8 -2-8 -8-2 8-2z" fill="hsl(42 85% 46% / 0.7)" />
    </motion.g>
    {/* Typing dots */}
    {[0, 1, 2].map(i => (
      <motion.circle key={i} cx={120 + i * 16} cy="100" r="4" fill="hsl(42 75% 46% / 0.4)"
        animate={{ y: [0, -6, 0] }} transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }} />
    ))}
    {/* Text lines */}
    <rect x="75" y="60" width="100" height="4" rx="2" fill="hsl(25 35% 14% / 0.15)" />
    <rect x="75" y="72" width="130" height="3" rx="1.5" fill="hsl(25 35% 14% / 0.1)" />
  </svg>
);

const WarRoomSvg = () => (
  <svg viewBox="0 0 280 220" fill="none" className="w-full h-full">
    {/* Dark room */}
    <rect x="30" y="30" width="220" height="160" rx="14" fill="hsl(220 60% 6%)" />
    {/* Shield */}
    <motion.path d="M140 60 l40 15 v40 c0 30 -40 50 -40 50 s-40-20-40-50 v-40z"
      fill="hsl(42 85% 46% / 0.15)" stroke="hsl(42 85% 46% / 0.6)" strokeWidth="2"
      animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 3, repeat: Infinity }}
      style={{ transformOrigin: "140px 110px" }} />
    {/* Cross on shield */}
    <rect x="136" y="85" width="8" height="40" rx="2" fill="hsl(42 85% 46% / 0.5)" />
    <rect x="124" y="95" width="32" height="8" rx="2" fill="hsl(42 85% 46% / 0.5)" />
    {/* Flame particles */}
    {[0, 1, 2].map(i => (
      <motion.circle key={i} cx={100 + i * 40} cy="170" r="2" fill="hsl(35 82% 54% / 0.6)"
        animate={{ cy: [170, 150, 170], opacity: [0.6, 0, 0.6] }} transition={{ duration: 2.5, delay: i * 0.6, repeat: Infinity }} />
    ))}
  </svg>
);

const BibleSvg = () => (
  <svg viewBox="0 0 280 220" fill="none" className="w-full h-full">
    {/* Open book */}
    <motion.path d="M140 50 Q70 55 40 70 v110 Q70 165 140 170" fill="hsl(38 60% 97%)" stroke="hsl(150 38% 26% / 0.4)" strokeWidth="2"
      animate={{ d: ["M140 50 Q70 55 40 70 v110 Q70 165 140 170", "M140 50 Q75 58 45 72 v108 Q75 163 140 168", "M140 50 Q70 55 40 70 v110 Q70 165 140 170"] }}
      transition={{ duration: 4, repeat: Infinity }} />
    <motion.path d="M140 50 Q210 55 240 70 v110 Q210 165 140 170" fill="hsl(38 60% 97%)" stroke="hsl(150 38% 26% / 0.4)" strokeWidth="2"
      animate={{ d: ["M140 50 Q210 55 240 70 v110 Q210 165 140 170", "M140 50 Q205 58 235 72 v108 Q205 163 140 168", "M140 50 Q210 55 240 70 v110 Q210 165 140 170"] }}
      transition={{ duration: 4, repeat: Infinity }} />
    {/* Spine */}
    <line x1="140" y1="50" x2="140" y2="170" stroke="hsl(150 38% 26% / 0.25)" strokeWidth="1.5" />
    {/* Text lines left */}
    {[0, 1, 2, 3, 4].map(i => (
      <rect key={`l${i}`} x="60" y={80 + i * 14} width={55 - i * 5} height="3" rx="1.5" fill="hsl(25 35% 14% / 0.12)" />
    ))}
    {/* Highlight on right */}
    <motion.rect x="155" y="94" width="60" height="12" rx="3" fill="hsl(42 85% 46% / 0.2)"
      animate={{ opacity: [0.15, 0.35, 0.15] }} transition={{ duration: 3, repeat: Infinity }} />
    {[0, 1, 2, 3, 4].map(i => (
      <rect key={`r${i}`} x="158" y={80 + i * 14} width={50 - i * 4} height="3" rx="1.5" fill="hsl(25 35% 14% / 0.12)" />
    ))}
    {/* Cross bookmark */}
    <motion.g animate={{ y: [0, -3, 0] }} transition={{ duration: 3, repeat: Infinity }}>
      <rect x="137" y="35" width="6" height="20" rx="1" fill="hsl(0 72% 51% / 0.4)" />
    </motion.g>
  </svg>
);

const TestifySvg = () => (
  <svg viewBox="0 0 280 220" fill="none" className="w-full h-full">
    {/* Trophy / praise */}
    <motion.path d="M110 140 h60 l-8-30 h-44z" fill="hsl(42 85% 46% / 0.2)" stroke="hsl(42 85% 46% / 0.5)" strokeWidth="1.5"
      animate={{ y: [0, -3, 0] }} transition={{ duration: 3, repeat: Infinity }} />
    <rect x="130" y="140" width="20" height="20" rx="2" fill="hsl(42 85% 46% / 0.3)" />
    <rect x="115" y="158" width="50" height="8" rx="4" fill="hsl(42 85% 46% / 0.2)" />
    {/* Radiating lines */}
    {[0, 1, 2, 3, 4].map(i => {
      const angle = -90 + (i - 2) * 30;
      const rad = (angle * Math.PI) / 180;
      return (
        <motion.line key={i}
          x1={140 + Math.cos(rad) * 30} y1={95 + Math.sin(rad) * 30}
          x2={140 + Math.cos(rad) * 50} y2={95 + Math.sin(rad) * 50}
          stroke="hsl(42 85% 46% / 0.4)" strokeWidth="2" strokeLinecap="round"
          animate={{ opacity: [0.2, 0.7, 0.2] }} transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }} />
      );
    })}
    {/* Star */}
    <motion.path d="M140 65 l4 12 13 0 -10 8 4 12 -11-8 -11 8 4-12 -10-8 13 0z" fill="hsl(42 85% 46% / 0.5)"
      animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }} transition={{ duration: 4, repeat: Infinity }}
      style={{ transformOrigin: "140px 80px" }} />
  </svg>
);

const SermonSyncSvg = () => (
  <svg viewBox="0 0 280 220" fill="none" className="w-full h-full">
    {/* Video frame */}
    <rect x="40" y="40" width="200" height="115" rx="10" fill="hsl(25 35% 14% / 0.06)" stroke="hsl(150 38% 26% / 0.3)" strokeWidth="1.5" />
    {/* Play button */}
    <motion.polygon points="125,85 125,110 155,97" fill="hsl(150 38% 26% / 0.4)"
      animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity }}
      style={{ transformOrigin: "140px 97px" }} />
    {/* Sync arrows */}
    <motion.g animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      style={{ transformOrigin: "140px 180px" }}>
      <path d="M125 180 a15 15 0 0 1 30 0" stroke="hsl(42 75% 46% / 0.5)" strokeWidth="2" fill="none" />
      <polygon points="155,178 160,183 155,188" fill="hsl(42 75% 46% / 0.5)" />
    </motion.g>
    {/* Notes */}
    <rect x="50" y="165" width="40" height="3" rx="1.5" fill="hsl(25 35% 14% / 0.12)" />
    <rect x="50" y="173" width="30" height="3" rx="1.5" fill="hsl(25 35% 14% / 0.08)" />
  </svg>
);

const CirclesSvg = () => (
  <svg viewBox="0 0 280 220" fill="none" className="w-full h-full">
    {/* Interlocking circles representing community */}
    <motion.circle cx="110" cy="100" r="40" stroke="hsl(42 75% 46% / 0.4)" strokeWidth="2" fill="hsl(42 85% 46% / 0.06)"
      animate={{ cx: [110, 115, 110] }} transition={{ duration: 4, repeat: Infinity }} />
    <motion.circle cx="170" cy="100" r="40" stroke="hsl(150 38% 26% / 0.4)" strokeWidth="2" fill="hsl(150 38% 26% / 0.06)"
      animate={{ cx: [170, 165, 170] }} transition={{ duration: 4, repeat: Infinity }} />
    <motion.circle cx="140" cy="140" r="40" stroke="hsl(0 72% 51% / 0.25)" strokeWidth="2" fill="hsl(0 72% 51% / 0.04)"
      animate={{ cy: [140, 135, 140] }} transition={{ duration: 4, repeat: Infinity }} />
    {/* People dots */}
    {[[110, 85], [170, 85], [140, 155]].map(([cx, cy], i) => (
      <motion.circle key={i} cx={cx} cy={cy} r="6" fill="hsl(42 85% 46% / 0.4)"
        animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }} />
    ))}
  </svg>
);

const FamilySvg = () => (
  <svg viewBox="0 0 280 220" fill="none" className="w-full h-full">
    {/* House shape */}
    <motion.path d="M140 40 L60 100 h20 v80 h120 v-80 h20z" fill="hsl(38 60% 97%)" stroke="hsl(150 38% 26% / 0.35)" strokeWidth="2"
      animate={{ y: [0, -3, 0] }} transition={{ duration: 5, repeat: Infinity }} />
    {/* Door */}
    <rect x="120" y="130" width="40" height="50" rx="6" fill="hsl(42 85% 46% / 0.2)" stroke="hsl(42 75% 46% / 0.4)" strokeWidth="1.5" />
    {/* Window with cross */}
    <rect x="90" y="110" width="22" height="22" rx="3" fill="hsl(210 55% 88% / 0.4)" stroke="hsl(150 38% 26% / 0.2)" strokeWidth="1" />
    <line x1="101" y1="110" x2="101" y2="132" stroke="hsl(150 38% 26% / 0.2)" strokeWidth="1" />
    <line x1="90" y1="121" x2="112" y2="121" stroke="hsl(150 38% 26% / 0.2)" strokeWidth="1" />
    {/* Heart above */}
    <motion.path d="M133 55 c0-5 3-8 7-8 2.5 0 4 1.5 5 3.5 1-2 2.5-3.5 5-3.5 4 0 7 3 7 8 0 7-12 14-12 14s-12-7-12-14z" fill="hsl(0 72% 51% / 0.4)"
      animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }}
      style={{ transformOrigin: "145px 58px" }} />
  </svg>
);

const WorldSvg = () => (
  <svg viewBox="0 0 280 220" fill="none" className="w-full h-full">
    {/* Globe */}
    <circle cx="140" cy="110" r="70" stroke="hsl(150 38% 26% / 0.3)" strokeWidth="1.5" fill="hsl(150 38% 26% / 0.04)" />
    <ellipse cx="140" cy="110" rx="70" ry="30" stroke="hsl(150 38% 26% / 0.15)" strokeWidth="1" fill="none" />
    <ellipse cx="140" cy="110" rx="30" ry="70" stroke="hsl(150 38% 26% / 0.15)" strokeWidth="1" fill="none" />
    <line x1="70" y1="110" x2="210" y2="110" stroke="hsl(150 38% 26% / 0.1)" strokeWidth="1" />
    <line x1="140" y1="40" x2="140" y2="180" stroke="hsl(150 38% 26% / 0.1)" strokeWidth="1" />
    {/* Pulsing prayer dots around globe */}
    {[[100, 80], [175, 95], [120, 140], [165, 130], [90, 115]].map(([cx, cy], i) => (
      <motion.circle key={i} cx={cx} cy={cy} r="4" fill="hsl(42 85% 46% / 0.6)"
        animate={{ r: [3, 6, 3], opacity: [0.7, 0.2, 0.7] }} transition={{ duration: 2.5, delay: i * 0.5, repeat: Infinity }} />
    ))}
  </svg>
);

const BlogSvg = () => (
  <svg viewBox="0 0 280 220" fill="none" className="w-full h-full">
    {/* Article card */}
    <rect x="50" y="40" width="180" height="140" rx="12" fill="hsl(38 60% 97%)" stroke="hsl(42 75% 46% / 0.3)" strokeWidth="1.5" />
    {/* Image placeholder */}
    <rect x="65" y="55" width="150" height="50" rx="6" fill="hsl(42 85% 46% / 0.1)" />
    <motion.path d="M120 75 l15 20 h-30z" fill="hsl(150 38% 26% / 0.15)"
      animate={{ y: [0, -2, 0] }} transition={{ duration: 3, repeat: Infinity }} />
    <circle cx="155" cy="70" r="6" fill="hsl(42 85% 46% / 0.2)" />
    {/* Text lines */}
    <rect x="65" y="115" width="120" height="5" rx="2.5" fill="hsl(25 35% 14% / 0.18)" />
    <rect x="65" y="126" width="150" height="3" rx="1.5" fill="hsl(25 35% 14% / 0.1)" />
    <rect x="65" y="135" width="130" height="3" rx="1.5" fill="hsl(25 35% 14% / 0.08)" />
    <rect x="65" y="144" width="80" height="3" rx="1.5" fill="hsl(25 35% 14% / 0.06)" />
    {/* Pen nib */}
    <motion.g animate={{ rotate: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}
      style={{ transformOrigin: "210px 160px" }}>
      <rect x="205" y="145" width="6" height="25" rx="2" fill="hsl(42 75% 46% / 0.4)" transform="rotate(-20, 208, 157)" />
    </motion.g>
  </svg>
);

const GamesSvg = () => (
  <svg viewBox="0 0 280 220" fill="none" className="w-full h-full">
    {/* Quiz card */}
    <rect x="50" y="40" width="180" height="140" rx="14" fill="hsl(38 60% 97%)" stroke="hsl(210 55% 50% / 0.3)" strokeWidth="1.5" />
    {/* Question mark */}
    <motion.text x="140" y="100" textAnchor="middle" fontSize="48" fontFamily="serif" fill="hsl(42 85% 46% / 0.3)"
      animate={{ scale: [1, 1.05, 1], rotate: [0, 3, 0] }} transition={{ duration: 3, repeat: Infinity }}
      style={{ transformOrigin: "140px 85px" }}>
      ?
    </motion.text>
    {/* Answer options */}
    {[0, 1, 2].map(i => (
      <motion.rect key={i} x="75" y={115 + i * 18} width="130" height="13" rx="6.5"
        fill={i === 1 ? "hsl(150 38% 26% / 0.15)" : "hsl(25 35% 14% / 0.05)"}
        stroke={i === 1 ? "hsl(150 38% 26% / 0.35)" : "hsl(25 35% 14% / 0.1)"} strokeWidth="1"
        animate={i === 1 ? { scale: [1, 1.02, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ transformOrigin: "140px " + (121.5 + i * 18) + "px" }} />
    ))}
    {/* Confetti dots */}
    {[[70, 50], [200, 55], [90, 45], [190, 48]].map(([cx, cy], i) => (
      <motion.circle key={i} cx={cx} cy={cy} r="3"
        fill={["hsl(42 85% 46% / 0.5)", "hsl(150 38% 26% / 0.4)", "hsl(0 72% 51% / 0.3)", "hsl(210 55% 50% / 0.4)"][i]}
        animate={{ cy: [cy, cy - 10, cy], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2.5, delay: i * 0.4, repeat: Infinity }} />
    ))}
  </svg>
);

/* ─── Feature Data ────────────────────────────────────────────────────── */

const FEATURES = [
  {
    id: "prayers",
    title: "Community Prayers",
    headline: "Prayers",
    body: "Browse, share, and join a living wall of prayer. Like, comment on, and pray over prayers from believers around the world — or share your own.",
    href: "/prayers",
    Svg: PrayersSvg,
    accent: "hsl(42 85% 46%)",
  },
  {
    id: "board",
    title: "Prayer Board",
    headline: "Your Central Faith Command Center",
    body: "Organize your prayer life on a beautiful, customizable board. Pin favorites, track answered prayers, set themes, and let your faith journey unfold visually.",
    href: "/board",
    Svg: BoardSvg,
    accent: "hsl(150 38% 26%)",
  },
  {
    id: "breathe",
    title: "Breathe",
    headline: "Inhale His Word. Exhale Your Prayer.",
    body: "Guided breath prayers that sync Scripture with your breathing. Slow down, center your soul, and let the Holy Spirit lead you into stillness.",
    href: "/breathe",
    Svg: BreatheSvg,
    accent: "hsl(150 38% 36%)",
  },
  {
    id: "assist",
    title: "PrayerAssist",
    headline: "Your PrayerAssist-Powered Companion",
    body: "Need help crafting a prayer? Exploring a passage? PrayerAssist walks with you — guided by Scripture, always pointing you to Jesus.",
    href: "/assistant",
    Svg: AssistSvg,
    accent: "hsl(42 75% 46%)",
  },
  {
    id: "warroom",
    title: "War Room",
    headline: "Enter the Battle in Prayer",
    body: "An immersive, distraction-free prayer environment. Full-screen focus mode with ambient sounds, armor of God themes, and spiritual warfare prompts.",
    href: "/war-room",
    Svg: WarRoomSvg,
    accent: "hsl(220 50% 20%)",
  },
  {
    id: "bible",
    title: "Bible Reader",
    headline: "Read. Highlight. Grow.",
    body: "A beautiful Scripture reader with highlighting, notes, bookmarks, verse bunches, and cross-translation annotations. The Word, your way.",
    href: "/bible",
    Svg: BibleSvg,
    accent: "hsl(150 38% 26%)",
  },
  {
    id: "testify",
    title: "Testify",
    headline: "Celebrate What God Has Done",
    body: "Share your testimonies of answered prayer, praise God publicly, and encourage the body of Christ with stories of His faithfulness.",
    href: "/testify",
    Svg: TestifySvg,
    accent: "hsl(42 85% 46%)",
  },
  {
    id: "sermon",
    title: "SermonSync",
    headline: "From Sermon to Prayer in Seconds",
    body: "Paste a YouTube sermon link and get prayer points, application steps, and a 7-day prayer plan you can share with your group.",
    href: "/sermon-sync",
    Svg: SermonSyncSvg,
    accent: "hsl(150 32% 36%)",
  },
  {
    id: "circles",
    title: "Accountability Circles",
    headline: "Grow Together in Faith",
    body: "Form small accountability groups, share prayers, assign homework, and encourage one another with weekly check-ins and AI-generated encouragements.",
    href: "/circles",
    Svg: CirclesSvg,
    accent: "hsl(42 75% 46%)",
  },
  {
    id: "family",
    title: "Family Rooms",
    headline: "Pray as One Family",
    body: "Create private, child-friendly prayer rooms for your family. Share prayers, do homework together, and build a legacy of faith across generations.",
    href: "/family",
    Svg: FamilySvg,
    accent: "hsl(150 38% 26%)",
  },
  {
    id: "world",
    title: "Prayer Warriors",
    headline: "Warriors Covering the Globe in Prayer",
    body: "An interactive world map showing where prayer warriors are interceding. Tap a region, pray for the nations, and see the global body of Christ rising together.",
    href: "/prayer-warriors",
    Svg: WorldSvg,
    accent: "hsl(210 55% 50%)",
  },
  {
    id: "blog",
    title: "KeepGrow.ing Blog",
    headline: "Devotionals & Articles for the Journey",
    body: "Spirit-led articles, devotionals, and faith resources to nourish your walk. Written for real Christians navigating real life.",
    href: "/blog",
    Svg: BlogSvg,
    accent: "hsl(35 65% 50%)",
  },
  {
    id: "games",
    title: "Bible Games",
    headline: "Learn the Word — Have Fun Doing It",
    body: "Bible trivia, quizzes, and interactive challenges to sharpen your Scripture knowledge. Great for families, small groups, and personal study.",
    href: "/games",
    Svg: GamesSvg,
    accent: "hsl(210 55% 50%)",
  },
];

/* ─── Feature Card ────────────────────────────────────────────────────── */

function FeatureBlock({ feature, index }: { feature: typeof FEATURES[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const isEven = index % 2 === 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="group"
    >
      <Link to={feature.href} className="block">
        <div className={`flex flex-col ${isEven ? "md:flex-row" : "md:flex-row-reverse"} items-center gap-6 md:gap-12 p-6 sm:p-8 rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-card/50 border border-border/50 hover:border-border`}>
          {/* SVG side */}
          <motion.div
            className="w-full md:w-5/12 flex-shrink-0"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className="aspect-[14/11] max-w-[320px] mx-auto">
              <feature.Svg />
            </div>
          </motion.div>

          {/* Text side */}
          <div className="flex-1 space-y-3 text-center md:text-left">
            <motion.span
              className="inline-block text-xs font-bold tracking-widest uppercase opacity-60"
              style={{ color: feature.accent }}
              initial={{ opacity: 0, x: isEven ? -20 : 20 }}
              animate={isInView ? { opacity: 0.6, x: 0 } : {}}
              transition={{ delay: 0.2 }}
            >
              {feature.title}
            </motion.span>

            <motion.h3
              className="text-xl sm:text-2xl font-display font-bold text-foreground leading-tight"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.25 }}
            >
              {feature.headline}
            </motion.h3>

            <motion.p
              className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-lg"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.3 }}
            >
              {feature.body}
            </motion.p>

            <motion.div
              className="flex items-center gap-2 text-sm font-semibold justify-center md:justify-start group-hover:gap-3 transition-all"
              style={{ color: feature.accent }}
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.35 }}
            >
              Explore <ArrowRight className="w-4 h-4" />
            </motion.div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}


/* ─── Main Component ──────────────────────────────────────────────────── */

export default function FeatureShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = sectionRefs.current.indexOf(entry.target as HTMLDivElement);
            if (idx >= 0) setActiveIndex(idx);
          }
        });
      },
      { rootMargin: "-40% 0px -40% 0px" }
    );

    sectionRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: "radial-gradient(ellipse at 20% 30%, hsl(42 85% 46% / 0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, hsl(150 38% 26% / 0.05) 0%, transparent 50%)"
      }} />

      <div className="container mx-auto px-4 max-w-5xl relative">
        {/* Section Header */}
        <motion.div
          className="text-center mb-14 sm:mb-20 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
            Discover Your Sacred Tools
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
            Every feature is crafted to draw you closer to God. Tap any card to begin.
          </p>
        </motion.div>

        {/* Feature list */}
        <div className="space-y-8 sm:space-y-12">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.id}
              id={`feature-${feature.id}`}
              ref={(el) => { sectionRefs.current[i] = el; }}
            >
              <FeatureBlock feature={feature} index={i} />
            </div>
          ))}
        </div>
      </div>

      
    </section>
  );
}
