import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RegionData {
  region: string;
  count: number;
}

// Map regions to SVG coordinates on a simplified world map
export const REGION_COORDS: Record<string, { x: number; y: number }> = {
  "North America": { x: 160, y: 85 },
  "South America": { x: 200, y: 140 },
  "Europe": { x: 270, y: 68 },
  "Africa": { x: 280, y: 120 },
  "Middle East": { x: 310, y: 90 },
  "Central Asia": { x: 340, y: 75 },
  "East Asia": { x: 390, y: 80 },
  "South Asia": { x: 350, y: 100 },
  "Southeast Asia": { x: 385, y: 110 },
  "Oceania": { x: 430, y: 145 },
  "Caribbean": { x: 180, y: 105 },
  "Russia": { x: 330, y: 58 },
};

export function usePrayerMapData() {
  const [totalPrayers, setTotalPrayers] = useState(0);
  const [todayPrayers, setTodayPrayers] = useState(0);
  const [warriorsOnline, setWarriorsOnline] = useState(0);
  const [regionData, setRegionData] = useState<RegionData[]>([]);
  const [recentPrayerCount, setRecentPrayerCount] = useState(0);

  const fetchStats = useCallback(async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalRes, todayRes, standbyRes, regionRes] = await Promise.all([
      supabase.from("prayed_actions").select("*", { count: "exact", head: true }),
      supabase
        .from("prayed_actions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayStart.toISOString()),
      supabase
        .from("prayer_standby")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("prayer_cards")
        .select("region")
        .not("region", "is", null),
    ]);

    setTotalPrayers(totalRes.count ?? 0);
    setTodayPrayers(todayRes.count ?? 0);
    setWarriorsOnline(standbyRes.count ?? 0);

    // Aggregate regions client-side
    if (regionRes.data) {
      const counts: Record<string, number> = {};
      regionRes.data.forEach((row: any) => {
        if (row.region) {
          counts[row.region] = (counts[row.region] || 0) + 1;
        }
      });
      const arr = Object.entries(counts).map(([region, count]) => ({ region, count }));
      setRegionData(arr);
      setRecentPrayerCount(regionRes.data.length);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    // Realtime: prayed_actions changes
    const prayedChannel = supabase
      .channel("pray-map-prayed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prayed_actions" },
        () => fetchStats()
      )
      .subscribe();

    // Realtime: standby changes
    const standbyChannel = supabase
      .channel("pray-map-standby")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prayer_standby" },
        () => fetchStats()
      )
      .subscribe();

    // Realtime: new prayer cards (may have region)
    const cardsChannel = supabase
      .channel("pray-map-cards")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "prayer_cards" },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(prayedChannel);
      supabase.removeChannel(standbyChannel);
      supabase.removeChannel(cardsChannel);
    };
  }, [fetchStats]);

  return { totalPrayers, todayPrayers, warriorsOnline, regionData, recentPrayerCount };
}
