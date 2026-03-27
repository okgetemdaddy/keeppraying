import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Shield, Lock } from "lucide-react";

// Simulated radar data — in production this would come from anonymized geolocation
function useLocalRadarData() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setPermissionDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setPermissionDenied(true),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  return { location, permissionDenied };
}

// Simulated nearby prayer nodes
const SIMULATED_NODES = [
  { angle: 30, dist: 0.3, type: "public" as const, label: "Prayer group nearby" },
  { angle: 110, dist: 0.55, type: "verified" as const, label: "Verified church node" },
  { angle: 200, dist: 0.7, type: "private" as const, label: "Private prayer circle" },
  { angle: 280, dist: 0.45, type: "public" as const, label: "Community prayers" },
  { angle: 350, dist: 0.85, type: "verified" as const, label: "Verified node" },
];

export default function LocalRadar() {
  const { location, permissionDenied } = useLocalRadarData();

  const radarSize = 320;
  const center = radarSize / 2;

  return (
    <div className="space-y-6">
      {/* Radar visualization */}
      <div className="flex justify-center">
        <div
          className="relative rounded-full border border-white/10"
          style={{
            width: radarSize,
            height: radarSize,
            background: "radial-gradient(circle, hsla(220,50%,12%,1) 0%, hsla(220,60%,4%,1) 100%)",
          }}
        >
          {/* Concentric rings */}
          {[0.25, 0.5, 0.75, 1].map((r) => (
            <div
              key={r}
              className="absolute rounded-full border border-white/5"
              style={{
                width: radarSize * r,
                height: radarSize * r,
                top: center - (radarSize * r) / 2,
                left: center - (radarSize * r) / 2,
              }}
            />
          ))}

          {/* Crosshairs */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/5" />
          <div className="absolute left-0 right-0 top-1/2 h-px bg-white/5" />

          {/* Sweeping radar line */}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          >
            <div
              className="absolute"
              style={{
                width: 2,
                height: center,
                top: 0,
                left: center - 1,
                background: "linear-gradient(to bottom, transparent, hsla(42, 78%, 54%, 0.4))",
                transformOrigin: "bottom center",
              }}
            />
          </motion.div>

          {/* Center dot (you) */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 10,
              height: 10,
              top: center - 5,
              left: center - 5,
              background: "hsla(42, 78%, 54%, 0.9)",
              boxShadow: "0 0 12px hsla(42, 78%, 54%, 0.6)",
            }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          {/* Prayer nodes */}
          {SIMULATED_NODES.map((node, i) => {
            const rad = (node.angle * Math.PI) / 180;
            const x = center + Math.cos(rad) * (center * node.dist) - 6;
            const y = center + Math.sin(rad) * (center * node.dist) - 6;

            const colors = {
              public: "hsla(42, 78%, 54%, 0.7)",
              verified: "hsla(120, 50%, 50%, 0.7)",
              private: "hsla(280, 50%, 60%, 0.5)",
            };

            return (
              <motion.div
                key={i}
                className="absolute rounded-full cursor-pointer group"
                style={{
                  width: 12,
                  height: 12,
                  top: y,
                  left: x,
                  background: colors[node.type],
                  boxShadow: `0 0 8px ${colors[node.type]}`,
                }}
                animate={
                  node.type === "private"
                    ? { scale: [1, 1.4, 1], opacity: [0.5, 0.8, 0.5] }
                    : { scale: [1, 1.2, 1] }
                }
                transition={{ duration: 2 + i * 0.5, repeat: Infinity }}
                title={node.label}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-lg bg-black/80 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {node.type === "verified" && <Shield className="w-2.5 h-2.5 inline mr-1" />}
                  {node.type === "private" && <Lock className="w-2.5 h-2.5 inline mr-1" />}
                  {node.label}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-white/40">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: "hsla(42, 78%, 54%, 0.7)" }} />
          <span>Prayer activity</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-3 h-3 text-green-400/70" />
          <span>Verified node</span>
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            className="w-3 h-3 rounded-full"
            style={{ background: "hsla(280, 50%, 60%, 0.5)" }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span>Private circle</span>
        </div>
      </div>

      {/* Location status */}
      <div className="text-center">
        {permissionDenied ? (
          <p className="text-white/30 text-xs flex items-center justify-center gap-1.5">
            <MapPin className="w-3 h-3" />
            Enable location to see prayers near you (showing demo data)
          </p>
        ) : location ? (
          <p className="text-white/30 text-xs flex items-center justify-center gap-1.5">
            <MapPin className="w-3 h-3 text-green-400/60" />
            Showing prayer activity near you · All locations anonymized
          </p>
        ) : (
          <p className="text-white/30 text-xs">Detecting your area…</p>
        )}
      </div>

      {/* Privacy note */}
      <div className="text-center rounded-2xl border border-white/5 bg-white/3 p-4">
        <Lock className="w-4 h-4 mx-auto mb-2 text-white/30" />
        <p className="text-white/40 text-xs leading-relaxed max-w-md mx-auto">
          Your exact location is <strong className="text-white/60">never stored or shared</strong>. 
          The radar shows anonymized, area-level prayer intensity only.
          All data is protected by our privacy commitment.
        </p>
      </div>
    </div>
  );
}
