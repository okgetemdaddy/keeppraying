import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { MapPin, Shield, Lock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { REGION_COORDS } from "@/hooks/usePrayerMapData";

interface RadarNode {
  angle: number;
  dist: number;
  type: "prayer" | "standby" | "group";
  label: string;
  count?: number;
}

// Map lat/lng to nearest region
function getNearestRegion(lat: number, lng: number): string {
  // Approximate lat/lng for each region center
  const regionLatLng: Record<string, { lat: number; lng: number }> = {
    "North America": { lat: 40, lng: -100 },
    "South America": { lat: -15, lng: -60 },
    "Europe": { lat: 50, lng: 10 },
    "Africa": { lat: 5, lng: 20 },
    "Middle East": { lat: 30, lng: 45 },
    "Central Asia": { lat: 45, lng: 65 },
    "East Asia": { lat: 35, lng: 115 },
    "South Asia": { lat: 20, lng: 78 },
    "Southeast Asia": { lat: 5, lng: 110 },
    "Oceania": { lat: -25, lng: 135 },
    "Caribbean": { lat: 18, lng: -72 },
    "Russia": { lat: 60, lng: 90 },
  };
  let nearest = "North America";
  let minDist = Infinity;
  for (const [name, coords] of Object.entries(regionLatLng)) {
    const d = Math.sqrt((lat - coords.lat) ** 2 + (lng - coords.lng) ** 2);
    if (d < minDist) { minDist = d; nearest = name; }
  }
  return nearest;
}

export default function LocalRadar() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [userRegion, setUserRegion] = useState<string | null>(null);
  const [nodes, setNodes] = useState<RadarNode[]>([]);
  const [nearbyPrayerCount, setNearbyPrayerCount] = useState(0);
  const [standbyCount, setStandbyCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);

  // Request geolocation once
  useEffect(() => {
    if (!navigator.geolocation) {
      setPermissionDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        setUserRegion(getNearestRegion(loc.lat, loc.lng));
      },
      () => setPermissionDenied(true),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  const fetchRadarData = useCallback(async () => {
    // Fetch real aggregate data, filtering by user's region if available
    const [prayedRes, standbyRes, groupRes, familyRes, regionPrayerRes] = await Promise.all([
      supabase
        .from("prayed_actions")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from("prayer_standby")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("prayer_groups")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("family_rooms")
        .select("id", { count: "exact", head: true }),
      // Region-specific prayers
      userRegion
        ? supabase
            .from("prayer_cards")
            .select("id", { count: "exact", head: true })
            .eq("region", userRegion)
        : Promise.resolve({ count: 0 } as any),
    ]);

    const prayedCount = prayedRes.count ?? 0;
    const warriors = standbyRes.count ?? 0;
    const groups = groupRes.count ?? 0;
    const families = familyRes.count ?? 0;
    const regionPrayers = regionPrayerRes?.count ?? 0;

    // If user has a region, weight the nearby prayer count
    setNearbyPrayerCount(userRegion ? regionPrayers + prayedCount : prayedCount);
    setStandbyCount(warriors);
    setGroupCount(groups + families);

    // Build radar nodes from real data
    const radarNodes: RadarNode[] = [];

    // Prayer activity nodes — spread based on real count
    const prayerNodes = Math.min(prayedCount, 8);
    for (let i = 0; i < prayerNodes; i++) {
      radarNodes.push({
        angle: (360 / Math.max(prayerNodes, 1)) * i + (i * 17) % 30,
        dist: 0.25 + ((i * 37) % 60) / 100,
        type: "prayer",
        label: `Prayer activity`,
        count: Math.ceil(prayedCount / Math.max(prayerNodes, 1)),
      });
    }

    // Standby warrior nodes
    const standbyNodes = Math.min(warriors, 5);
    for (let i = 0; i < standbyNodes; i++) {
      radarNodes.push({
        angle: 45 + (360 / Math.max(standbyNodes, 1)) * i,
        dist: 0.35 + ((i * 23) % 40) / 100,
        type: "standby",
        label: "Prayer warrior on standby",
      });
    }

    // Group/family nodes
    const totalGroups = groups + families;
    const groupNodes = Math.min(totalGroups, 4);
    for (let i = 0; i < groupNodes; i++) {
      radarNodes.push({
        angle: 90 + (360 / Math.max(groupNodes, 1)) * i,
        dist: 0.5 + ((i * 31) % 35) / 100,
        type: "group",
        label: i < groups ? "Prayer group" : "Family room",
      });
    }

    setNodes(radarNodes);
  }, []);

  useEffect(() => {
    fetchRadarData();

    // Realtime subscriptions
    const ch1 = supabase
      .channel("radar-prayed")
      .on("postgres_changes", { event: "*", schema: "public", table: "prayed_actions" }, () => fetchRadarData())
      .subscribe();
    const ch2 = supabase
      .channel("radar-standby")
      .on("postgres_changes", { event: "*", schema: "public", table: "prayer_standby" }, () => fetchRadarData())
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [fetchRadarData]);

  const radarSize = 320;
  const center = radarSize / 2;

  const nodeColors = {
    prayer: "hsla(42, 78%, 54%, 0.7)",
    standby: "hsla(150, 55%, 50%, 0.7)",
    group: "hsla(280, 50%, 60%, 0.6)",
  };

  const showFallback = permissionDenied || !location;

  return (
    <div className="space-y-6">
      {/* Real-time stats bar */}
      <div className="flex justify-center gap-6 text-center">
        <div>
          <span className="text-xl font-bold" style={{ color: "hsl(42, 78%, 60%)" }}>
            {nearbyPrayerCount}
          </span>
          <p className="text-white/40 text-[10px]">prayers (24h)</p>
        </div>
        <div>
          <span className="text-xl font-bold text-green-400">{standbyCount}</span>
          <p className="text-white/40 text-[10px]">warriors online</p>
        </div>
        <div>
          <span className="text-xl font-bold text-purple-400">{groupCount}</span>
          <p className="text-white/40 text-[10px]">groups active</p>
        </div>
      </div>

      {/* Radar visualization */}
      <div className="flex justify-center">
        <div
          className="relative rounded-full border border-white/10"
          style={{
            width: radarSize, height: radarSize,
            background: "radial-gradient(circle, hsla(220,50%,12%,1) 0%, hsla(220,60%,4%,1) 100%)",
          }}
        >
          {/* Concentric rings */}
          {[0.25, 0.5, 0.75, 1].map((r) => (
            <div
              key={r}
              className="absolute rounded-full border border-white/5"
              style={{
                width: radarSize * r, height: radarSize * r,
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
                width: 2, height: center, top: 0, left: center - 1,
                background: "linear-gradient(to bottom, transparent, hsla(42, 78%, 54%, 0.4))",
                transformOrigin: "bottom center",
              }}
            />
          </motion.div>

          {/* Center dot (you) */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 10, height: 10, top: center - 5, left: center - 5,
              background: "hsla(42, 78%, 54%, 0.9)",
              boxShadow: "0 0 12px hsla(42, 78%, 54%, 0.6)",
            }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          {/* Real data nodes */}
          {nodes.map((node, i) => {
            const rad = (node.angle * Math.PI) / 180;
            const x = center + Math.cos(rad) * (center * node.dist) - 6;
            const y = center + Math.sin(rad) * (center * node.dist) - 6;

            return (
              <motion.div
                key={`${node.type}-${i}`}
                className="absolute rounded-full cursor-pointer group"
                style={{
                  width: 12, height: 12, top: y, left: x,
                  background: nodeColors[node.type],
                  boxShadow: `0 0 8px ${nodeColors[node.type]}`,
                }}
                animate={
                  node.type === "group"
                    ? { scale: [1, 1.4, 1], opacity: [0.5, 0.8, 0.5] }
                    : { scale: [1, 1.2, 1] }
                }
                transition={{ duration: 2 + i * 0.3, repeat: Infinity }}
                title={node.label}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-lg bg-black/80 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {node.type === "standby" && <Shield className="w-2.5 h-2.5 inline mr-1" />}
                  {node.type === "group" && <Users className="w-2.5 h-2.5 inline mr-1" />}
                  {node.label}
                  {node.count ? ` (${node.count})` : ""}
                </div>
              </motion.div>
            );
          })}

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white/20 text-xs text-center px-8">
                No prayer activity detected yet.<br />Be the first to pray!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-white/40">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: nodeColors.prayer }} />
          <span>Prayer activity</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-3 h-3 text-green-400/70" />
          <span>Standby warrior</span>
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            className="w-3 h-3 rounded-full"
            style={{ background: nodeColors.group }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span>Prayer group / Family room</span>
        </div>
      </div>

      {/* Location status */}
      <div className="text-center">
        {showFallback ? (
          <p className="text-white/30 text-xs flex items-center justify-center gap-1.5">
            <MapPin className="w-3 h-3" />
            {permissionDenied
              ? "Location not available — showing global prayer activity from live data"
              : "Detecting your area…"}
          </p>
        ) : (
          <p className="text-white/30 text-xs flex items-center justify-center gap-1.5">
            <MapPin className="w-3 h-3 text-green-400/60" />
            Showing live prayer activity · All locations anonymized
          </p>
        )}
      </div>

      {/* Privacy note */}
      <div className="text-center rounded-2xl border border-white/5 bg-white/[0.03] p-4">
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
