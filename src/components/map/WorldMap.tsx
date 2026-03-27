import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

// Simplified world map SVG path (mercator-style continents outline)
const WORLD_PATH = "M165,75 L170,65 175,60 185,58 195,62 200,55 210,50 220,48 235,50 245,55 250,52 260,48 270,50 280,55 285,60 290,58 295,55 300,50 310,48 320,52 330,55 335,60 340,65 345,62 350,58 355,55 360,58 365,62 370,65 375,70 370,80 365,85 360,90 355,95 350,100 340,105 330,100 320,95 315,100 310,108 305,115 300,120 295,125 290,130 280,135 270,130 265,125 260,120 255,115 250,118 245,125 240,130 235,128 230,122 225,118 220,115 215,120 210,125 205,130 200,128 195,122 190,115 185,110 180,105 175,100 170,95 168,90 165,85 163,80 165,75Z M380,60 L390,55 400,50 410,48 420,52 430,58 440,55 450,52 460,55 470,60 475,65 480,70 478,80 472,88 465,95 458,100 450,105 440,108 430,112 420,115 410,118 400,120 395,125 390,130 385,128 380,122 375,115 370,110 368,100 370,90 372,80 375,70 378,65 380,60Z M200,155 L210,150 220,148 230,152 240,158 250,162 255,168 250,175 245,180 238,185 230,188 220,190 212,188 205,182 200,175 198,168 200,160 200,155Z M425,140 L435,135 445,130 455,128 465,132 475,138 480,145 478,155 470,165 460,172 450,178 440,180 430,178 422,172 418,165 420,155 422,148 425,140Z M120,88 L130,82 140,78 150,80 155,85 152,92 148,98 142,102 135,100 128,96 122,92 120,88Z";

// Prayer activity hotspots (simulated from real regions)
const HOTSPOTS = [
  { x: 220, y: 70, label: "Europe", intensity: 0.8 },
  { x: 160, y: 85, label: "North America", intensity: 0.9 },
  { x: 195, y: 155, label: "Africa", intensity: 0.7 },
  { x: 310, y: 95, label: "Middle East", intensity: 0.6 },
  { x: 380, y: 75, label: "East Asia", intensity: 0.5 },
  { x: 350, y: 65, label: "Central Asia", intensity: 0.4 },
  { x: 440, y: 140, label: "Oceania", intensity: 0.3 },
  { x: 200, y: 130, label: "South America", intensity: 0.65 },
  { x: 270, y: 60, label: "Russia", intensity: 0.35 },
  { x: 345, y: 90, label: "India", intensity: 0.55 },
  { x: 130, y: 90, label: "Caribbean", intensity: 0.45 },
  { x: 410, y: 60, label: "Japan", intensity: 0.4 },
];

// Generate random prayer "sparks" that animate upward
function useAnimatedSparks(count: number) {
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number; delay: number }[]>([]);

  useEffect(() => {
    const initial = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: HOTSPOTS[i % HOTSPOTS.length].x + (Math.random() - 0.5) * 30,
      y: HOTSPOTS[i % HOTSPOTS.length].y + (Math.random() - 0.5) * 20,
      delay: Math.random() * 5,
    }));
    setSparks(initial);

    const interval = setInterval(() => {
      setSparks((prev) =>
        prev.map((s) => ({
          ...s,
          x: HOTSPOTS[s.id % HOTSPOTS.length].x + (Math.random() - 0.5) * 30,
          y: HOTSPOTS[s.id % HOTSPOTS.length].y + (Math.random() - 0.5) * 20,
          delay: Math.random() * 2,
        }))
      );
    }, 6000);

    return () => clearInterval(interval);
  }, [count]);

  return sparks;
}

interface WorldMapProps {
  prayerCount: number;
}

export default function WorldMap({ prayerCount }: WorldMapProps) {
  const sparks = useAnimatedSparks(18);
  const [hoveredSpot, setHoveredSpot] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Map container */}
      <div
        className="relative rounded-3xl overflow-hidden border border-white/10"
        style={{
          background: "radial-gradient(ellipse at center, hsl(220, 50%, 8%) 0%, hsl(220, 60%, 4%) 100%)",
        }}
      >
        <svg
          viewBox="80 30 420 180"
          className="w-full h-auto"
          style={{ minHeight: 280 }}
        >
          {/* Grid lines */}
          {Array.from({ length: 9 }, (_, i) => (
            <line
              key={`h${i}`}
              x1={80}
              y1={30 + i * 22.5}
              x2={500}
              y2={30 + i * 22.5}
              stroke="rgba(255,255,255,0.03)"
              strokeWidth={0.5}
            />
          ))}
          {Array.from({ length: 11 }, (_, i) => (
            <line
              key={`v${i}`}
              x1={80 + i * 42}
              y1={30}
              x2={80 + i * 42}
              y2={210}
              stroke="rgba(255,255,255,0.03)"
              strokeWidth={0.5}
            />
          ))}

          {/* Continent outlines */}
          <path
            d={WORLD_PATH}
            fill="rgba(255,255,255,0.04)"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={0.8}
          />

          {/* Prayer intensity circles (hotspots) */}
          {HOTSPOTS.map((spot) => (
            <g key={spot.label}>
              {/* Outer glow */}
              <motion.circle
                cx={spot.x}
                cy={spot.y}
                r={12 * spot.intensity + 4}
                fill={`hsla(42, 78%, 54%, ${spot.intensity * 0.12})`}
                animate={{
                  r: [12 * spot.intensity + 4, 12 * spot.intensity + 8, 12 * spot.intensity + 4],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{ duration: 3 + spot.intensity * 2, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* Core dot */}
              <circle
                cx={spot.x}
                cy={spot.y}
                r={3 * spot.intensity + 1.5}
                fill={`hsla(42, 78%, 54%, ${0.5 + spot.intensity * 0.4})`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredSpot(spot.label)}
                onMouseLeave={() => setHoveredSpot(null)}
              />
              {/* Label on hover */}
              {hoveredSpot === spot.label && (
                <text
                  x={spot.x}
                  y={spot.y - 12}
                  textAnchor="middle"
                  fill="hsla(42, 78%, 70%, 0.9)"
                  fontSize={7}
                  fontWeight={600}
                >
                  {spot.label}
                </text>
              )}
            </g>
          ))}

          {/* Animated prayer sparks rising upward */}
          {sparks.map((spark) => (
            <motion.circle
              key={spark.id}
              cx={spark.x}
              cy={spark.y}
              r={1}
              fill="hsla(42, 85%, 65%, 0.7)"
              initial={{ opacity: 0, cy: spark.y }}
              animate={{
                opacity: [0, 0.8, 0],
                cy: [spark.y, spark.y - 25],
              }}
              transition={{
                duration: 3,
                delay: spark.delay,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          ))}
        </svg>

        {/* Overlay text */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">
            Live prayer activity
          </p>
          <p className="text-[10px] text-white/30">
            ✦ {prayerCount.toLocaleString()} prayers and counting
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-white/40">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: "hsla(42, 78%, 54%, 0.8)" }} />
          <span>High prayer activity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsla(42, 78%, 54%, 0.4)" }} />
          <span>Moderate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: "hsla(42, 78%, 54%, 0.2)" }} />
          <span>Growing</span>
        </div>
      </div>

      {/* Encouragement */}
      <div className="text-center py-4">
        <p className="text-white/50 text-sm italic font-display">
          "If my people, who are called by my name, will humble themselves and pray…
          I will heal their land."
        </p>
        <p className="text-white/30 text-xs mt-1">— 2 Chronicles 7:14</p>
      </div>
    </div>
  );
}
