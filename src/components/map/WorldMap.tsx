import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { REGION_COORDS, type RegionData } from "@/hooks/usePrayerMapData";

// Simplified world map SVG path (mercator-style continents outline)
const WORLD_PATH =
  "M165,75 L170,65 175,60 185,58 195,62 200,55 210,50 220,48 235,50 245,55 250,52 260,48 270,50 280,55 285,60 290,58 295,55 300,50 310,48 320,52 330,55 335,60 340,65 345,62 350,58 355,55 360,58 365,62 370,65 375,70 370,80 365,85 360,90 355,95 350,100 340,105 330,100 320,95 315,100 310,108 305,115 300,120 295,125 290,130 280,135 270,130 265,125 260,120 255,115 250,118 245,125 240,130 235,128 230,122 225,118 220,115 215,120 210,125 205,130 200,128 195,122 190,115 185,110 180,105 175,100 170,95 168,90 165,85 163,80 165,75Z M380,60 L390,55 400,50 410,48 420,52 430,58 440,55 450,52 460,55 470,60 475,65 480,70 478,80 472,88 465,95 458,100 450,105 440,108 430,112 420,115 410,118 400,120 395,125 390,130 385,128 380,122 375,115 370,110 368,100 370,90 372,80 375,70 378,65 380,60Z M200,155 L210,150 220,148 230,152 240,158 250,162 255,168 250,175 245,180 238,185 230,188 220,190 212,188 205,182 200,175 198,168 200,160 200,155Z M425,140 L435,135 445,130 455,128 465,132 475,138 480,145 478,155 470,165 460,172 450,178 440,180 430,178 422,172 418,165 420,155 422,148 425,140Z M120,88 L130,82 140,78 150,80 155,85 152,92 148,98 142,102 135,100 128,96 122,92 120,88Z";

interface WorldMapProps {
  totalPrayers: number;
  todayPrayers: number;
  regionData: RegionData[];
}

export default function WorldMap({ totalPrayers, todayPrayers, regionData }: WorldMapProps) {
  const [hoveredSpot, setHoveredSpot] = useState<string | null>(null);

  // Build hotspots from real region data
  const maxCount = useMemo(() => Math.max(1, ...regionData.map((r) => r.count)), [regionData]);

  const hotspots = useMemo(() => {
    // Always show all known regions; those with data get real intensity, others get 0
    return Object.entries(REGION_COORDS).map(([region, coords]) => {
      const found = regionData.find((r) => r.region === region);
      const count = found?.count ?? 0;
      const intensity = maxCount > 0 ? Math.max(0.08, count / maxCount) : 0;
      return { ...coords, label: region, count, intensity };
    });
  }, [regionData, maxCount]);

  // Generate sparks from hotspots that have real data
  const activeHotspots = hotspots.filter((h) => h.count > 0);

  const hasData = regionData.length > 0;

  return (
    <div className="space-y-6">
      {!hasData && (
        <div className="text-center py-3">
          <p className="text-white/40 text-xs">
            No regional prayer data yet — prayers without a region are counted in global totals.
            As the community grows, the map will light up with real prayer activity.
          </p>
        </div>
      )}

      {/* Map container */}
      <div
        className="relative rounded-3xl overflow-hidden border border-white/10"
        style={{
          background:
            "radial-gradient(ellipse at center, hsl(220, 50%, 8%) 0%, hsl(220, 60%, 4%) 100%)",
        }}
      >
        <svg viewBox="80 30 420 180" className="w-full h-auto" style={{ minHeight: 280 }}>
          {/* Grid lines */}
          {Array.from({ length: 9 }, (_, i) => (
            <line
              key={`h${i}`}
              x1={80} y1={30 + i * 22.5} x2={500} y2={30 + i * 22.5}
              stroke="rgba(255,255,255,0.03)" strokeWidth={0.5}
            />
          ))}
          {Array.from({ length: 11 }, (_, i) => (
            <line
              key={`v${i}`}
              x1={80 + i * 42} y1={30} x2={80 + i * 42} y2={210}
              stroke="rgba(255,255,255,0.03)" strokeWidth={0.5}
            />
          ))}

          {/* Continent outlines */}
          <path d={WORLD_PATH} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth={0.8} />

          {/* Prayer intensity circles from real data */}
          {hotspots.map((spot) => (
            <g key={spot.label}>
              {spot.count > 0 && (
                <motion.circle
                  cx={spot.x} cy={spot.y}
                  r={12 * spot.intensity + 4}
                  fill={`hsla(42, 78%, 54%, ${spot.intensity * 0.15})`}
                  animate={{
                    r: [12 * spot.intensity + 4, 12 * spot.intensity + 8, 12 * spot.intensity + 4],
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{ duration: 3 + spot.intensity * 2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              <circle
                cx={spot.x} cy={spot.y}
                r={spot.count > 0 ? 3 * spot.intensity + 1.5 : 1.2}
                fill={spot.count > 0
                  ? `hsla(42, 78%, 54%, ${0.5 + spot.intensity * 0.4})`
                  : "hsla(42, 78%, 54%, 0.1)"}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredSpot(spot.label)}
                onMouseLeave={() => setHoveredSpot(null)}
                onClick={() => setHoveredSpot(hoveredSpot === spot.label ? null : spot.label)}
              />
              {hoveredSpot === spot.label && (
                <>
                  <rect
                    x={spot.x - 40} y={spot.y - 24} width={80} height={18} rx={4}
                    fill="rgba(0,0,0,0.75)"
                  />
                  <text x={spot.x} y={spot.y - 12} textAnchor="middle" fill="hsla(42, 78%, 70%, 0.9)" fontSize={7} fontWeight={600}>
                    {spot.label} · {spot.count}
                  </text>
                </>
              )}
            </g>
          ))}

          {/* Animated sparks from active regions */}
          {activeHotspots.map((spot, i) => (
            <motion.circle
              key={`spark-${spot.label}`}
              cx={spot.x + (i % 2 === 0 ? -5 : 5)}
              cy={spot.y}
              r={1}
              fill="hsla(42, 85%, 65%, 0.7)"
              animate={{ opacity: [0, 0.8, 0], cy: [spot.y, spot.y - 25] }}
              transition={{ duration: 3, delay: i * 0.7, repeat: Infinity, ease: "easeOut" }}
            />
          ))}
        </svg>

        {/* Overlay stats */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">
            Live prayer activity
          </p>
          <p className="text-[10px] text-white/30">
            ✦ {totalPrayers.toLocaleString()} prayers · {todayPrayers.toLocaleString()} today
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
          <div className="w-2 h-2 rounded-full" style={{ background: "hsla(42, 78%, 54%, 0.15)" }} />
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
